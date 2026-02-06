import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import OpenAI from "openai";
import { z } from "zod";
import type { Job, JobWithScore, ResumeExtractedData, InsertJobSubmission, InsertJobAlert, InsertNotification } from "@shared/schema";
import { insertJobSubmissionSchema, insertJobAlertSchema } from "@shared/schema";
import multer from "multer";
import {
  extractTextFromPDF,
  extractTextFromDOCX,
  parseResumeWithAI,
  generateSearchQueryFromResume,
  InvalidPDFError,
} from "./lib/resume-parser";
import { compareResumeToJob } from "./lib/resume-job-comparison";
import { batchMatchResume, generateResumeTweaks } from "./lib/resume-matcher";
import {
  scrapeAllLawFirms,
  scrapeSingleCompany,
  scrapeAllLawFirmsWithAI,
  scrapeSingleJobUrl,
  validateJobUrl,
} from "./lib/law-firm-scraper";
import { LAW_FIRMS_AND_COMPANIES } from "./lib/law-firms-list";
import { categorizeJob } from "./lib/job-categorizer";
import { matchNewJobsAgainstAlerts } from "./lib/alert-matcher";
import { JOB_TAXONOMY } from "@shared/schema";
import {
  startScheduler,
  stopScheduler,
  isSchedulerRunning,
  runScheduledScrape,
  validateJobLinks,
  startContinuousValidation,
  stopContinuousValidation,
  getValidationStatus,
} from "./lib/scheduled-scraper";
import { getLogFiles, readLogFile, getRecentLogs, runStartupCleanup } from "./lib/logger";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Please upload PDF or DOCX."));
    }
  },
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  await storage.seedJobs();
  await storage.seedJobCategories();

  // Background re-categorization of jobs with invalid/old category names
  (async () => {
    try {
      const allJobs = await storage.getActiveJobs();
      const validCategories = Object.keys(JOB_TAXONOMY);
      const needsCategorization = allJobs.filter(
        (j) => !j.roleCategory || !validCategories.includes(j.roleCategory)
      );
      if (needsCategorization.length === 0) {
        console.log("All jobs already categorized correctly.");
        return;
      }
      console.log(`Background: Re-categorizing ${needsCategorization.length} jobs...`);
      let done = 0;
      const batchSize = 5;
      for (let i = 0; i < needsCategorization.length; i += batchSize) {
        const batch = needsCategorization.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (job) => {
            try {
              const result = await categorizeJob(job.title, job.description, job.company);
              await storage.updateJob(job.id, {
                roleCategory: result.category,
                roleSubcategory: result.subcategory,
                seniorityLevel: result.seniorityLevel,
                keySkills: result.keySkills,
                aiSummary: result.aiSummary,
                matchKeywords: result.matchKeywords,
              });
              done++;
              if (done % 20 === 0) {
                console.log(`Background: Categorized ${done}/${needsCategorization.length} jobs`);
              }
            } catch (err: any) {
              console.error(`Failed to categorize job ${job.id}:`, err.message);
            }
          })
        );
        if (i + batchSize < needsCategorization.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      console.log(`Background: Finished re-categorizing ${done}/${needsCategorization.length} jobs`);
    } catch (err) {
      console.error("Background re-categorization error:", err);
    }
  })();

  // Public stats endpoint (no auth required)
  app.get("/api/stats", async (req, res) => {
    try {
      const jobs = await storage.getActiveJobs();
      const uniqueCompanies = new Set(jobs.map(j => j.company)).size;
      const uniqueCategories = new Set(jobs.map(j => j.roleCategory).filter(Boolean)).size;
      res.json({
        totalJobs: jobs.length,
        totalCompanies: uniqueCompanies,
        totalCategories: uniqueCategories,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/job-categories", async (req, res) => {
    try {
      const categories = await storage.getJobCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching job categories:", error);
      res.status(500).json({ error: "Failed to fetch job categories" });
    }
  });

  app.get("/api/jobs", isAuthenticated, async (req, res) => {
    try {
      const jobs = await storage.getActiveJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  // Track apply button clicks for analytics
  app.post("/api/jobs/:id/apply-click", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.trackApplyClick(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking apply click:", error);
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  app.post("/api/search", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      const jobs = await storage.getActiveJobs();

      if (jobs.length === 0) {
        return res.json([]);
      }

      const jobSummaries = jobs.map((job, index) => ({
        index,
        title: job.title,
        company: job.company,
        location: job.location,
        isRemote: job.isRemote,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        experienceMin: job.experienceMin,
        experienceMax: job.experienceMax,
        roleType: job.roleType,
        description: job.description.substring(0, 200),
      }));

      const systemPrompt = `You are a job matching assistant. Analyze the user's job search query and score each job based on how well it matches their criteria.

For each job, provide:
1. A match score from 0-100 (100 = perfect match)
2. A brief reason explaining why this job matches or doesn't match

Consider factors like:
- Role type and responsibilities
- Experience level requirements
- Salary expectations
- Location and remote work preferences
- Industry and company focus

Return ONLY valid JSON in this exact format:
{
  "matches": [
    {"index": 0, "score": 85, "reason": "Great match for your product management experience and remote preference"},
    {"index": 1, "score": 60, "reason": "Role type matches but experience level is higher than preferred"}
  ]
}

Only include jobs with a score above 40. Sort by score descending.`;

      let response;
      try {
        response = await openai.chat.completions.create({
          model: "gpt-5-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { 
              role: "user", 
              content: `User search query: "${query}"\n\nAvailable jobs:\n${JSON.stringify(jobSummaries, null, 2)}` 
            },
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 2048,
        });
      } catch (aiError) {
        console.error("AI search failed, returning keyword-based results:", aiError);
        const queryLower = query.toLowerCase();
        const filteredJobs = jobs
          .filter(job => 
            job.title.toLowerCase().includes(queryLower) ||
            job.description.toLowerCase().includes(queryLower) ||
            job.company.toLowerCase().includes(queryLower) ||
            (job.roleType && job.roleType.toLowerCase().includes(queryLower))
          )
          .slice(0, 10)
          .map(job => ({ ...job, matchScore: 70, matchReason: "Matches your search keywords" }));
        return res.json(filteredJobs.length > 0 ? filteredJobs : jobs.slice(0, 5).map(job => ({ ...job, matchScore: 50, matchReason: "Suggested based on your search" })));
      }

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.json(jobs.slice(0, 5).map(job => ({ ...job, matchScore: 50, matchReason: "Based on your search criteria" })));
      }

      let matchResults: { matches: Array<{ index: number; score: number; reason: string }> };
      try {
        matchResults = JSON.parse(content);
      } catch {
        console.error("Failed to parse AI response:", content);
        return res.json(jobs.slice(0, 5).map(job => ({ ...job, matchScore: 50, matchReason: "Based on your search criteria" })));
      }

      const scoredJobs: JobWithScore[] = matchResults.matches
        .filter(match => match.index >= 0 && match.index < jobs.length)
        .map(match => ({
          ...jobs[match.index],
          matchScore: match.score,
          matchReason: match.reason,
        }))
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      // Save last search query for user
      const user = req.user as any;
      if (user?.claims?.sub) {
        storage.updateUserLastSearch(user.claims.sub, query).catch(console.error);
      }

      res.json(scoredJobs);
    } catch (error) {
      console.error("Error in semantic search:", error);
      res.status(500).json({ error: "Search failed. Please try again." });
    }
  });

  // Guided search - analyze query and generate clarifying questions
  app.post("/api/search/analyze", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      // Get user's resume data if available for personalization
      const user = req.user as any;
      let userContext = "";
      if (user?.claims?.sub) {
        const userData = await storage.getUserResume(user.claims.sub);
        if (userData?.extractedData) {
          const skills = userData.extractedData.skills?.join(", ") || "";
          const experience = userData.extractedData.experience || "";
          if (skills || experience) {
            userContext = `\nUser background: ${skills} ${experience}`;
          }
        }
      }

      const systemPrompt = `You are an expert legal tech career advisor. Analyze the user's job search query and generate 2-4 smart clarifying questions to help pinpoint exactly what they're looking for.

Your questions should help understand:
- Their ideal role type and responsibilities
- Experience level and career stage
- Work preferences (remote, location, company size)
- Salary expectations (if not clear)
- Specific skills or areas they want to use or develop

Generate questions that are:
1. Specific and actionable (not generic)
2. Have 3-5 predefined answer options each
3. Directly relevant to their query
4. Quick to answer (single select)

Return ONLY valid JSON in this format:
{
  "refinedIntent": "Brief summary of what the user seems to be looking for",
  "questions": [
    {
      "id": "q1",
      "question": "What seniority level are you targeting?",
      "options": [
        {"value": "entry", "label": "Entry level / New grad"},
        {"value": "mid", "label": "Mid-level (2-5 years)"},
        {"value": "senior", "label": "Senior (5+ years)"},
        {"value": "lead", "label": "Lead / Director"}
      ]
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Search query: "${query}"${userContext}` },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1024,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "Failed to analyze query" });
      }

      const analysisResult = JSON.parse(content);
      res.json({
        originalQuery: query,
        ...analysisResult,
      });
    } catch (error) {
      console.error("Error analyzing search query:", error);
      res.status(500).json({ error: "Failed to analyze query" });
    }
  });

  // Refined search - use answers to curate precise results
  app.post("/api/search/refined", isAuthenticated, async (req, res) => {
    try {
      const { originalQuery, answers, refinedIntent } = req.body;
      
      if (!originalQuery) {
        return res.status(400).json({ error: "Original query is required" });
      }

      const jobs = await storage.getActiveJobs();
      if (jobs.length === 0) {
        return res.json([]);
      }

      // Get user's resume data for better matching
      const user = req.user as any;
      let userContext = "";
      if (user?.claims?.sub) {
        const userData = await storage.getUserResume(user.claims.sub);
        if (userData?.extractedData) {
          const skills = userData.extractedData.skills?.join(", ") || "not provided";
          const experience = userData.extractedData.experience || "not provided";
          userContext = `\nCandidate background: Skills: ${skills}. Experience: ${experience}.`;
        }
      }

      const jobSummaries = jobs.map((job, index) => ({
        index,
        title: job.title,
        company: job.company,
        location: job.location,
        isRemote: job.isRemote,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        seniorityLevel: job.seniorityLevel,
        roleCategory: job.roleCategory,
        roleSubcategory: job.roleSubcategory,
        keySkills: job.keySkills,
        description: job.description.substring(0, 300),
      }));

      const answersText = Object.entries(answers || {})
        .map(([question, answer]) => `${question}: ${answer}`)
        .join("\n");

      const systemPrompt = `You are an expert legal tech job matching assistant. The user has refined their search with specific preferences. Score ONLY the jobs that PRECISELY match their criteria.

Be VERY selective - only include jobs that are genuinely excellent matches (score 75+).

Scoring criteria:
- 90-100: Perfect match - hits all or almost all preferences
- 80-89: Excellent match - hits most key preferences
- 75-79: Strong match - hits several important preferences
- Below 75: Do not include

For each matched job provide:
1. A match score (75-100 only)
2. A concise, specific reason explaining why this is a great fit
3. Any minor gaps or considerations

Return ONLY valid JSON:
{
  "matches": [
    {
      "index": 0,
      "score": 92,
      "reason": "Perfect fit: Senior product role at AI legal tech company, fully remote, matches your contract law background",
      "considerations": "Salary range slightly below your target"
    }
  ],
  "searchSummary": "Found X highly-matched roles focusing on [key criteria]"
}

Sort by score descending. Include maximum 15 jobs.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Original query: "${originalQuery}"
Intent: ${refinedIntent || "Not specified"}

User's refined preferences:
${answersText || "No additional preferences specified"}
${userContext}

Available jobs:
${JSON.stringify(jobSummaries, null, 2)}` 
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.json({ jobs: [], searchSummary: "No results found" });
      }

      let matchResults: { 
        matches: Array<{ index: number; score: number; reason: string; considerations?: string }>;
        searchSummary: string;
      };
      try {
        matchResults = JSON.parse(content);
      } catch {
        console.error("Failed to parse refined search response:", content);
        return res.json({ jobs: [], searchSummary: "Search error occurred" });
      }

      const scoredJobs: JobWithScore[] = matchResults.matches
        .filter(match => match.index >= 0 && match.index < jobs.length && match.score >= 75)
        .map(match => ({
          ...jobs[match.index],
          matchScore: match.score,
          matchReason: match.reason,
        }))
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      // Save refined search for user
      if (user?.claims?.sub) {
        storage.updateUserLastSearch(user.claims.sub, `${originalQuery} (refined)`).catch(console.error);
      }

      res.json({
        jobs: scoredJobs,
        searchSummary: matchResults.searchSummary || `Found ${scoredJobs.length} curated matches`,
      });
    } catch (error) {
      console.error("Error in refined search:", error);
      res.status(500).json({ error: "Refined search failed" });
    }
  });

  // Resume upload endpoint
  app.post("/api/resume/upload", isAuthenticated, upload.single("resume"), async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Extract text based on file type
      let resumeText: string;
      if (file.mimetype === "application/pdf") {
        resumeText = await extractTextFromPDF(file.buffer);
      } else {
        resumeText = await extractTextFromDOCX(file.buffer);
      }

      if (!resumeText || resumeText.trim().length < 50) {
        return res.status(400).json({ error: "Could not extract text from file. Please ensure your resume contains readable text." });
      }

      // Parse resume with AI
      const parsedData = await parseResumeWithAI(resumeText);

      // Generate search query from resume
      const searchQuery = await generateSearchQueryFromResume(parsedData);

      // Save to database
      await storage.updateUserResume(userId, resumeText, file.originalname, parsedData);

      res.json({
        success: true,
        parsedData,
        searchQuery,
        message: "Resume uploaded and parsed successfully",
      });
    } catch (error: any) {
      console.error("Resume upload error:", error);
      if (error instanceof InvalidPDFError) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to process resume. Please try a different file." });
    }
  });

  // Get user's resume data
  app.get("/api/resume", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const resumeData = await storage.getUserResume(userId);

      if (!resumeData || !resumeData.resumeFilename) {
        return res.json({ hasResume: false });
      }

      res.json({
        hasResume: true,
        filename: resumeData.resumeFilename,
        extractedData: resumeData.extractedData,
      });
    } catch (error) {
      console.error("Error fetching resume:", error);
      res.status(500).json({ error: "Failed to fetch resume data" });
    }
  });

  // Delete user's resume
  app.delete("/api/resume", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await storage.updateUserResume(userId, "", "", {} as ResumeExtractedData);
      res.json({ success: true, message: "Resume deleted" });
    } catch (error) {
      console.error("Error deleting resume:", error);
      res.status(500).json({ error: "Failed to delete resume" });
    }
  });

  // Batch match resume against all jobs
  app.post("/api/resume/match-jobs", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const resumeData = await storage.getUserResume(userId);
      if (!resumeData?.extractedData || Object.keys(resumeData.extractedData).length === 0) {
        return res.status(400).json({ error: "No resume uploaded" });
      }

      const allJobs = await storage.getActiveJobs();
      if (allJobs.length === 0) {
        return res.json({ matches: [] });
      }

      const matches = await batchMatchResume(
        resumeData.extractedData as ResumeExtractedData,
        allJobs
      );

      res.json({ matches });
    } catch (error) {
      console.error("Error batch matching resume:", error);
      res.status(500).json({ error: "Failed to match resume against jobs" });
    }
  });

  // Generate resume tweaks for a specific job
  app.post("/api/resume/tweak/:jobId", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const jobIdParam = req.params.jobId as string;
      const jobId = parseInt(jobIdParam);
      if (isNaN(jobId)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      const resumeData = await storage.getUserResumeWithText(userId);
      if (!resumeData?.extractedData || Object.keys(resumeData.extractedData).length === 0) {
        return res.status(400).json({ error: "No resume uploaded" });
      }

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const tweaks = await generateResumeTweaks(
        resumeData.extractedData as ResumeExtractedData,
        resumeData.resumeText || "",
        job
      );

      res.json(tweaks);
    } catch (error) {
      console.error("Error generating resume tweaks:", error);
      res.status(500).json({ error: "Failed to generate resume tweaks" });
    }
  });

  // Compare resume to job (like iPhone comparison)
  app.post("/api/compare/:jobId", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const jobIdParam = req.params.jobId as string;
      const jobId = parseInt(jobIdParam);
      if (isNaN(jobId)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }

      // Get user's resume data
      const resumeData = await storage.getUserResume(userId);
      if (!resumeData?.extractedData || Object.keys(resumeData.extractedData).length === 0) {
        return res.status(400).json({ 
          error: "No resume uploaded",
          message: "Please upload your resume first to compare against jobs"
        });
      }

      // Get the job
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Run the comparison
      const comparison = await compareResumeToJob(
        resumeData.extractedData as ResumeExtractedData,
        job
      );

      res.json(comparison);
    } catch (error) {
      console.error("Error comparing resume to job:", error);
      res.status(500).json({ error: "Failed to compare resume to job" });
    }
  });

  // User preferences endpoints
  app.get("/api/preferences", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences || {});
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.put("/api/preferences", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const preferences = await storage.upsertUserPreferences(userId, req.body);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // Check admin status from database
  const isAdminCheck = async (req: any): Promise<boolean> => {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) return false;
    return storage.isUserAdmin(userId);
  };

  // Check if current user is admin
  app.get("/api/auth/is-admin", isAuthenticated, async (req, res) => {
    const adminStatus = await isAdminCheck(req);
    res.json({ isAdmin: adminStatus });
  });

  // Admin: Get list of companies that can be scraped
  app.get("/api/admin/scraper/companies", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    const companies = LAW_FIRMS_AND_COMPANIES.map(f => ({
      name: f.name,
      type: f.type,
      careerUrl: f.careerUrl,
      hasApi: !!(f.greenhouseId || f.leverPostingsUrl),
    }));
    res.json(companies);
  });

  // Admin: Scrape all companies
  app.post("/api/admin/scraper/run", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      console.log("Starting job scraper...");
      
      const { jobs: scrapedJobs, stats } = await scrapeAllLawFirms();
      
      if (scrapedJobs.length === 0) {
        return res.json({
          success: true,
          message: "Scraping completed but no jobs found",
          stats,
          inserted: 0,
          updated: 0,
        });
      }

      const { inserted, updated, newJobs } = await storage.bulkUpsertJobs(scrapedJobs);
      if (newJobs.length > 0) {
        matchNewJobsAgainstAlerts(newJobs).catch(err => console.error("Alert matching error:", err));
      }
      
      res.json({
        success: true,
        message: `Scraping completed. Inserted ${inserted} new jobs, updated ${updated} existing jobs.`,
        stats,
        inserted,
        updated,
        totalScraped: scrapedJobs.length,
      });
    } catch (error) {
      console.error("Error running scraper:", error);
      res.status(500).json({ error: "Failed to run scraper" });
    }
  });

  // Admin: Scrape all companies with AI categorization
  app.post("/api/admin/scraper/run-with-ai", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      console.log("Starting AI-powered job scraper...");
      
      const { jobs: scrapedJobs, stats } = await scrapeAllLawFirmsWithAI();
      
      if (scrapedJobs.length === 0) {
        return res.json({
          success: true,
          message: "Scraping completed but no jobs found",
          stats,
          inserted: 0,
          updated: 0,
        });
      }

      const { inserted, updated, newJobs } = await storage.bulkUpsertJobs(scrapedJobs);
      if (newJobs.length > 0) {
        matchNewJobsAgainstAlerts(newJobs).catch(err => console.error("Alert matching error:", err));
      }
      
      res.json({
        success: true,
        message: `AI scraping completed. Inserted ${inserted} new jobs, updated ${updated} existing jobs.`,
        stats,
        inserted,
        updated,
        totalScraped: scrapedJobs.length,
      });
    } catch (error) {
      console.error("Error running AI scraper:", error);
      res.status(500).json({ error: "Failed to run AI scraper" });
    }
  });

  // Admin: Scrape a single job URL
  app.post("/api/admin/scraper/url", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL is required" });
      }
      
      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }
      
      console.log(`Scraping job from URL: ${url}`);
      
      const job = await scrapeSingleJobUrl(url);
      
      if (!job) {
        return res.status(400).json({ 
          success: false,
          error: "Could not extract job details from this URL. The page may not be a job posting." 
        });
      }
      
      const { inserted, updated, newJobs } = await storage.bulkUpsertJobs([job]);
      if (newJobs.length > 0) {
        matchNewJobsAgainstAlerts(newJobs).catch(err => console.error("Alert matching error:", err));
      }
      
      res.json({
        success: true,
        message: inserted > 0 ? "Job added successfully" : "Job updated successfully",
        job: {
          title: job.title,
          company: job.company,
          location: job.location,
        },
        inserted,
        updated,
      });
    } catch (error: any) {
      console.error("Error scraping URL:", error);
      res.status(500).json({ error: error.message || "Failed to scrape URL" });
    }
  });

  // Validate a job URL (public endpoint for job submission validation)
  app.post("/api/validate-url", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ valid: false, error: "URL is required" });
      }
      
      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ valid: false, error: "Invalid URL format" });
      }
      
      const result = await validateJobUrl(url);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ valid: false, error: error.message });
    }
  });

  // Admin: Scrape single company
  app.post("/api/admin/scraper/company/:name", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const companyName = decodeURIComponent(req.params.name as string);
      console.log(`Scraping jobs from ${companyName}...`);
      
      const scrapedJobs = await scrapeSingleCompany(companyName);
      
      if (scrapedJobs.length === 0) {
        return res.json({
          success: true,
          message: `No jobs found at ${companyName}`,
          inserted: 0,
          updated: 0,
        });
      }

      const { inserted, updated, newJobs } = await storage.bulkUpsertJobs(scrapedJobs);
      if (newJobs.length > 0) {
        matchNewJobsAgainstAlerts(newJobs).catch(err => console.error("Alert matching error:", err));
      }
      
      res.json({
        success: true,
        message: `Found ${scrapedJobs.length} jobs at ${companyName}. Inserted ${inserted}, updated ${updated}.`,
        inserted,
        updated,
        totalScraped: scrapedJobs.length,
      });
    } catch (error: any) {
      console.error("Error scraping company:", error);
      res.status(500).json({ error: error.message || "Failed to scrape company" });
    }
  });

  // Batch re-categorize all jobs
  app.post("/api/admin/recategorize", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const allJobs = await storage.getActiveJobs();
      const validCategories = Object.keys(JOB_TAXONOMY);
      const needsCategorization = allJobs.filter(
        (j) => !j.roleCategory || !validCategories.includes(j.roleCategory)
      );

      console.log(`Re-categorizing ${needsCategorization.length} of ${allJobs.length} jobs...`);
      res.json({
        success: true,
        message: `Re-categorizing ${needsCategorization.length} jobs in background...`,
        total: needsCategorization.length,
      });

      let done = 0;
      const batchSize = 5;
      for (let i = 0; i < needsCategorization.length; i += batchSize) {
        const batch = needsCategorization.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (job) => {
            try {
              const result = await categorizeJob(job.title, job.description, job.company);
              await storage.updateJob(job.id, {
                roleCategory: result.category,
                roleSubcategory: result.subcategory,
                seniorityLevel: result.seniorityLevel,
                keySkills: result.keySkills,
                aiSummary: result.aiSummary,
                matchKeywords: result.matchKeywords,
              });
              done++;
              if (done % 10 === 0) {
                console.log(`Categorized ${done}/${needsCategorization.length} jobs`);
              }
            } catch (err) {
              console.error(`Failed to categorize job ${job.id} (${job.title}):`, err);
            }
          })
        );
        if (i + batchSize < needsCategorization.length) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      console.log(`Finished re-categorizing ${done}/${needsCategorization.length} jobs`);
    } catch (error: any) {
      console.error("Error re-categorizing jobs:", error);
    }
  });

  // Job Submissions (Post a Job)
  app.post("/api/job-submissions", async (req, res) => {
    try {
      const parsed = insertJobSubmissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid submission data", details: parsed.error.issues });
      }
      
      const submission = await storage.createJobSubmission(parsed.data);
      res.json({ success: true, id: submission.id });
    } catch (error) {
      console.error("Error creating job submission:", error);
      res.status(500).json({ error: "Failed to submit job" });
    }
  });

  // Admin: Get job submissions
  app.get("/api/admin/job-submissions", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const submissions = await storage.getJobSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // ==========================================
  // JOB ALERTS & NOTIFICATIONS
  // ==========================================

  app.get("/api/alerts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const alerts = await storage.getUserAlerts(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const parsed = insertJobAlertSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid alert data", details: parsed.error.issues });
      }
      const alert = await storage.createJobAlert(parsed.data);
      res.json(alert);
    } catch (error) {
      console.error("Error creating alert:", error);
      res.status(500).json({ error: "Failed to create alert" });
    }
  });

  app.patch("/api/alerts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid alert ID" });
      const updated = await storage.updateJobAlert(id, userId, req.body);
      if (!updated) return res.status(404).json({ error: "Alert not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating alert:", error);
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  app.delete("/api/alerts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid alert ID" });
      await storage.deleteJobAlert(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting alert:", error);
      res.status(500).json({ error: "Failed to delete alert" });
    }
  });

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const notifs = await storage.getUserNotifications(userId, 50);
      res.json(notifs);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid notification ID" });
      await storage.markNotificationRead(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ error: "Failed to mark read" });
    }
  });

  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all read:", error);
      res.status(500).json({ error: "Failed to mark all read" });
    }
  });

  // ==========================================
  // MONITORING & SCHEDULER ENDPOINTS
  // ==========================================

  // Get scheduler status and job statistics
  app.get("/api/admin/monitoring", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const activeJobs = await storage.getActiveJobs();
      const logFiles = getLogFiles();
      const recentLogs = getRecentLogs(20);
      
      const jobsBySource: Record<string, number> = {};
      for (const job of activeJobs) {
        const source = job.source || 'unknown';
        jobsBySource[source] = (jobsBySource[source] || 0) + 1;
      }
      
      res.json({
        scheduler: {
          running: isSchedulerRunning(),
          nextRun: isSchedulerRunning() ? 'In approximately 24 hours' : 'Not scheduled',
        },
        jobs: {
          total: activeJobs.length,
          bySource: jobsBySource,
        },
        logs: {
          files: logFiles,
          recent: recentLogs,
        },
      });
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
      res.status(500).json({ error: "Failed to fetch monitoring data" });
    }
  });

  // Get specific log file content
  app.get("/api/admin/logs/:filename", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const filename = req.params.filename as string;
      if (!filename.match(/^scraper-\d{4}-\d{2}-\d{2}\.log$/)) {
        return res.status(400).json({ error: "Invalid log filename" });
      }
      
      const content = readLogFile(filename);
      if (content === null) {
        return res.status(404).json({ error: "Log file not found" });
      }
      
      res.json({ filename, content });
    } catch (error) {
      console.error("Error reading log file:", error);
      res.status(500).json({ error: "Failed to read log file" });
    }
  });

  // Start/stop scheduler
  app.post("/api/admin/scheduler/:action", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    const action = req.params.action as string;
    
    if (action === 'start') {
      startScheduler();
      res.json({ success: true, message: 'Scheduler started', running: true });
    } else if (action === 'stop') {
      stopScheduler();
      res.json({ success: true, message: 'Scheduler stopped', running: false });
    } else if (action === 'run-now') {
      res.json({ success: true, message: 'Scrape started in background' });
      runScheduledScrape().catch(err => console.error('Background scrape failed:', err));
    } else {
      res.status(400).json({ error: 'Invalid action. Use start, stop, or run-now' });
    }
  });

  // Get validation status
  app.get("/api/admin/validation-status", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const status = getValidationStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting validation status:", error);
      res.status(500).json({ error: "Failed to get validation status" });
    }
  });

  // Start continuous validation
  app.post("/api/admin/validate-links/start", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const status = getValidationStatus();
      if (status.isRunning) {
        return res.json({
          success: false,
          message: "Validation already in progress",
          ...status,
        });
      }
      
      // Start validation in background
      res.json({
        success: true,
        message: "Continuous validation started. Jobs will be checked one at a time with 10-second delays.",
      });
      
      // Run in background
      startContinuousValidation().catch(err => 
        console.error('Continuous validation failed:', err)
      );
    } catch (error) {
      console.error("Error starting validation:", error);
      res.status(500).json({ error: "Failed to start validation" });
    }
  });

  // Stop continuous validation
  app.post("/api/admin/validate-links/stop", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      stopContinuousValidation();
      res.json({
        success: true,
        message: "Validation stopping...",
      });
    } catch (error) {
      console.error("Error stopping validation:", error);
      res.status(500).json({ error: "Failed to stop validation" });
    }
  });

  // Legacy quick validate (for backward compatibility)
  app.post("/api/admin/validate-links", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const jobs = await storage.getActiveJobs();
      const results = await validateJobLinks(jobs);
      res.json({
        success: true,
        ...results,
        message: `Quick check: ${results.valid + results.broken} links checked, ${results.valid} valid, ${results.broken} broken`,
      });
    } catch (error) {
      console.error("Error validating links:", error);
      res.status(500).json({ error: "Failed to validate links" });
    }
  });

  // Career Advisor - Parse job posting file (PDF/DOCX)
  app.post("/api/career-advisor/parse-job-file", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      let text = "";

      if (file.mimetype === "application/pdf") {
        try {
          text = await extractTextFromPDF(file.buffer);
        } catch (pdfError: any) {
          if (pdfError instanceof InvalidPDFError) {
            return res.status(400).json({ error: pdfError.message });
          }
          throw pdfError;
        }
      } else if (
        file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        text = await extractTextFromDOCX(file.buffer);
      } else {
        return res.status(400).json({ error: "Unsupported file type. Please upload PDF or DOCX." });
      }

      if (!text || text.trim().length < 50) {
        return res.status(400).json({ error: "Could not extract sufficient text from the file." });
      }

      // Try to extract title from first line or use filename
      const lines = text.split("\n").filter((l) => l.trim());
      let title = "";
      if (lines.length > 0 && lines[0].length < 100) {
        title = lines[0].trim();
      }

      res.json({ text: text.trim(), title });
    } catch (error) {
      console.error("Error parsing job file:", error);
      res.status(500).json({ error: "Failed to parse job file" });
    }
  });

  // Career Advisor - Parse job posting URL
  app.post("/api/career-advisor/parse-job-url", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL is required" });
      }

      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        return res.status(400).json({ error: "Please enter a valid URL (starting with http:// or https://)" });
      }

      // Fetch the URL content
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      let response;
      try {
        response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
      } catch (fetchError: any) {
        if (fetchError.name === "AbortError") {
          return res.status(408).json({ error: "Request timed out. The website took too long to respond." });
        }
        return res.status(502).json({ error: "Could not fetch the URL. Please check if the link is accessible." });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        return res.status(502).json({ error: `Could not access the page (status ${response.status}). The job posting may be private or removed.` });
      }

      const html = await response.text();
      
      // Extract text content and job details using AI
      // Remove script, style, and other non-content tags
      const cleanHtml = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[\s\S]*?<\/footer>/gi, "")
        .replace(/<header[\s\S]*?<\/header>/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanHtml.length < 100) {
        return res.status(400).json({ error: "Could not extract sufficient content from this page. Try pasting the job description directly." });
      }

      // Use OpenAI to extract job title and description from the page content
      const openai = getOpenAIClient();
      const extractionPrompt = `Extract the job posting information from this webpage content. Look for:
1. Job title (the specific position name)
2. Company name (if available)
3. Job description (the main body including responsibilities, requirements, qualifications)

Webpage content (truncated):
${cleanHtml.substring(0, 12000)}

Return a JSON object with:
{
  "title": "Job title - Company Name" or just "Job title" if no company,
  "description": "The full job description text including responsibilities, requirements, and qualifications. Make it comprehensive.",
  "success": true
}

If this doesn't appear to be a job posting, return:
{
  "title": "",
  "description": "",
  "success": false,
  "error": "This page doesn't appear to be a job posting"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a job posting parser. Extract job information from webpage content accurately." },
          { role: "user", content: extractionPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(502).json({ error: "Failed to parse the job posting content" });
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        return res.status(502).json({ error: "Failed to parse job information from the page" });
      }

      if (!parsed.success || !parsed.description || parsed.description.length < 50) {
        return res.status(400).json({ 
          error: parsed.error || "Could not extract a valid job posting from this URL. Try pasting the description directly." 
        });
      }

      res.json({ 
        title: parsed.title || "", 
        text: parsed.description,
        sourceUrl: url
      });
    } catch (error) {
      console.error("Error parsing job URL:", error);
      res.status(500).json({ error: "Failed to parse job URL" });
    }
  });

  // Career Advisor - Compare multiple jobs for career guidance
  const careerAdvisorJobSchema = z.object({
    id: z.string(),
    title: z.string().default(""),
    description: z.string().min(50, "Job description must be at least 50 characters"),
  });
  const careerAdvisorRequestSchema = z.object({
    jobs: z.array(careerAdvisorJobSchema).min(2, "At least 2 jobs required").max(3, "Maximum 3 jobs allowed"),
    includeResume: z.boolean().default(false),
  });

  app.post("/api/career-advisor/compare", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parseResult = careerAdvisorRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.flatten().fieldErrors 
        });
      }
      const { jobs, includeResume } = parseResult.data;

      let resumeContext = "";
      if (includeResume) {
        const resumeData = await storage.getUserResume(userId);
        if (resumeData?.extractedData && Object.keys(resumeData.extractedData).length > 0) {
          resumeContext = `
CANDIDATE RESUME DATA:
${JSON.stringify(resumeData.extractedData, null, 2)}
`;
        }
      }

      const jobDescriptions = jobs.map((j, i) => `
JOB ${i + 1}: ${j.title || `Position ${i + 1}`}
${j.description}
`).join("\n---\n");

      const systemPrompt = `You are a senior career advisor with 20+ years of experience helping lawyers transition into legal technology and AI careers. Your role is NOT to do ATS keyword matching, but to provide deep, actionable career guidance specifically for legal professionals moving into legal tech.

Analyze the provided job opportunities and ${resumeContext ? "the candidate's resume" : "provide general analysis"}.

Focus on:
1. How legal expertise translates to each role
2. Day-to-day reality vs. job description promises  
3. Growth trajectories in legal technology and AI
4. Practical pros and cons for someone with a legal background
5. Specific skills to develop for success in each role

Return a JSON response with this exact structure:
{
  "jobs": [
    {
      "jobTitle": "The job title",
      "overallFitSummary": "2-3 sentence summary of how well this role fits a legal professional's background",
      "pros": ["4-5 key advantages of this role for someone with legal experience"],
      "cons": ["3-4 potential challenges or gaps the candidate may face"],
      "transferableSkills": ["4-6 specific skills from legal practice that transfer well to this role"],
      "skillsToDevelop": ["3-5 specific skills or experience the candidate needs to develop"],
      "legalTechGrowthPotential": {
        "shortTerm": "Where this role leads in 1-2 years",
        "mediumTerm": "Typical progression in 3-5 years",
        "longTerm": "Ceiling potential and senior roles (5-10 years)",
        "aiOpportunities": "How AI trends will impact this career path"
      },
      "mainResponsibilities": ["3-5 key responsibilities"],
      "requiredSkills": ["5-8 skills with focus on must-haves vs nice-to-haves"],
      "workType": {
        "structured": 0-100,
        "ambiguous": 0-100,
        "description": "Brief description of the work style"
      },
      "transitionDifficulty": {
        "level": "Easy|Moderate|Challenging|Difficult",
        "explanation": "Why this difficulty level for a legal professional"
      },
      "whoSucceeds": ["3-4 traits of lawyers who thrive in this role"]${resumeContext ? `,
      "fitAnalysis": {
        "overallFit": 0-100,
        "strengths": ["3-4 candidate strengths for this role based on resume"],
        "gaps": ["2-3 gaps between resume and role requirements"],
        "resumePositioning": ["2-3 ways to position resume for this role"],
        "interviewRisks": ["2-3 potential tough questions to prepare for"]
      }` : ""}
    }
  ],
  "recommendation": {
    "bestFitNow": {
      "jobTitle": "The best immediate fit",
      "reason": "Why this is the best fit right now based on current skills"
    },
    "bestLongTerm": {
      "jobTitle": "The best for career growth in legal tech/AI",
      "reason": "Why this offers the best long-term trajectory in legal technology"
    },
    "biggestShift": {
      "jobTitle": "The role requiring most career change",
      "reason": "What makes this the biggest shift and what's needed to succeed"
    }
  },
  "overallStrategy": "3-4 sentences of strategic career advice for a legal professional considering these roles, with specific action items"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Compare these job opportunities:\n\n${jobDescriptions}${resumeContext ? `\n\n${resumeContext}` : ""}`,
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(502).json({ error: "No response from AI service" });
      }

      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        console.error("Failed to parse AI response:", content.substring(0, 500));
        return res.status(502).json({ error: "Invalid response format from AI service" });
      }

      res.json(result);
    } catch (error) {
      console.error("Career advisor error:", error);
      res.status(500).json({ error: "Failed to analyze career options" });
    }
  });

  // ===== Market Analytics (public for authenticated users) =====
  app.get("/api/analytics/market", isAuthenticated, async (req, res) => {
    try {
      const allJobs = await storage.getActiveJobs();

      const totalJobs = allJobs.length;
      if (totalJobs === 0) {
        return res.json({
          overview: { totalJobs: 0, totalCompanies: 0, totalCategories: 0, remoteJobs: 0, hybridOrOnsite: 0, remotePercentage: 0, avgSalaryMin: null, avgSalaryMax: null, totalViews: 0, totalApplyClicks: 0 },
          categoryBreakdown: [], seniorityBreakdown: [], topSkills: [], topCompanies: [], topSubcategories: [], experienceRanges: { entry: 0, mid: 0, senior: 0, expert: 0 },
        });
      }

      const companies = new Set(allJobs.map((j) => j.company));
      const totalCompanies = companies.size;
      const remoteJobs = allJobs.filter((j) => j.isRemote).length;
      const hybridOrOnsite = totalJobs - remoteJobs;

      const jobsWithSalaryMin = allJobs.filter((j) => j.salaryMin && j.salaryMin > 0);
      const jobsWithSalaryMax = allJobs.filter((j) => j.salaryMax && j.salaryMax > 0);
      const avgSalaryMin = jobsWithSalaryMin.length > 0
        ? Math.round(jobsWithSalaryMin.reduce((s, j) => s + j.salaryMin!, 0) / jobsWithSalaryMin.length)
        : null;
      const avgSalaryMax = jobsWithSalaryMax.length > 0
        ? Math.round(jobsWithSalaryMax.reduce((s, j) => s + j.salaryMax!, 0) / jobsWithSalaryMax.length)
        : null;

      const categoryMap: Record<string, number> = {};
      const seniorityMap: Record<string, number> = {};
      const skillMap: Record<string, number> = {};
      const companyMap: Record<string, number> = {};
      const subcategoryMap: Record<string, number> = {};
      let totalViews = 0;
      let totalApplyClicks = 0;

      for (const job of allJobs) {
        if (job.roleCategory) {
          categoryMap[job.roleCategory] = (categoryMap[job.roleCategory] || 0) + 1;
        }
        if (job.seniorityLevel) {
          seniorityMap[job.seniorityLevel] = (seniorityMap[job.seniorityLevel] || 0) + 1;
        }
        if (job.keySkills) {
          for (const skill of job.keySkills) {
            skillMap[skill] = (skillMap[skill] || 0) + 1;
          }
        }
        companyMap[job.company] = (companyMap[job.company] || 0) + 1;
        if (job.roleSubcategory) {
          subcategoryMap[job.roleSubcategory] = (subcategoryMap[job.roleSubcategory] || 0) + 1;
        }
        totalViews += job.viewCount || 0;
        totalApplyClicks += job.applyClickCount || 0;
      }

      const categoryBreakdown = Object.entries(categoryMap)
        .map(([name, count]) => ({ name, count, percentage: Math.round((count / totalJobs) * 100) }))
        .sort((a, b) => b.count - a.count);

      const seniorityBreakdown = Object.entries(seniorityMap)
        .map(([level, count]) => ({ level, count, percentage: Math.round((count / totalJobs) * 100) }))
        .sort((a, b) => b.count - a.count);

      const topSkills = Object.entries(skillMap)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      const topCompanies = Object.entries(companyMap)
        .map(([company, jobCount]) => ({ company, jobCount }))
        .sort((a, b) => b.jobCount - a.jobCount);

      const topSubcategories = Object.entries(subcategoryMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const experienceRanges = {
        entry: allJobs.filter((j) => (j.experienceMin || 0) <= 2).length,
        mid: allJobs.filter((j) => (j.experienceMin || 0) >= 3 && (j.experienceMin || 0) <= 5).length,
        senior: allJobs.filter((j) => (j.experienceMin || 0) >= 6 && (j.experienceMin || 0) <= 9).length,
        expert: allJobs.filter((j) => (j.experienceMin || 0) >= 10).length,
      };

      res.json({
        overview: {
          totalJobs,
          totalCompanies,
          totalCategories: categoryBreakdown.length,
          remoteJobs,
          hybridOrOnsite,
          remotePercentage: Math.round((remoteJobs / totalJobs) * 100),
          avgSalaryMin,
          avgSalaryMax,
          totalViews,
          totalApplyClicks,
        },
        categoryBreakdown,
        seniorityBreakdown,
        topSkills,
        topCompanies,
        topSubcategories,
        experienceRanges,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to generate analytics" });
    }
  });

  // Run startup cleanup and start the scheduler when the server starts
  runStartupCleanup();
  startScheduler();

  return httpServer;
}
