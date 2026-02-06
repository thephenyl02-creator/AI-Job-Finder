import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";


declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
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
import { parseJobFile, parseMultipleJobsFromText } from "./lib/job-file-parser";
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
import { scrapeYCCompanies } from "./lib/yc-scraper";

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

const adminUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/html",
      "application/xhtml+xml",
      "text/plain",
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith(".html") || file.originalname.endsWith(".htm")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Supported: PDF, DOCX, HTML, TXT."));
    }
  },
});

import { getOpenAIClient } from "./lib/openai-client";

async function requirePro(req: any, res: any, next: any) {
  const user = req.user as any;
  const userId = user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const subData = await storage.getUserSubscription(userId);
  if (subData?.subscriptionTier === "pro" && subData?.subscriptionStatus === "active") {
    return next();
  }
  return res.status(403).json({
    error: "Pro subscription required",
    upgradeUrl: "/pricing",
    requiredTier: "pro",
  });
}

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
      const entryLevelJobs = jobs.filter(j => ["Entry", "Junior", "Associate", "Intern", "Fellowship"].includes(j.seniorityLevel || "")).length;
      res.json({
        totalJobs: jobs.length,
        totalCompanies: uniqueCompanies,
        totalCategories: uniqueCategories,
        entryLevelJobs,
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

  app.get("/api/featured-jobs", async (req, res) => {
    try {
      const jobs = await storage.getActiveJobs();
      const seenCompanies = new Set<string>();
      const seenCategories = new Set<string>();
      const featured: typeof jobs = [];

      for (const job of jobs) {
        if (featured.length >= 6) break;
        const company = (job.company || "").toLowerCase();
        const category = (job.roleCategory || "").toLowerCase();
        if (seenCompanies.has(company)) continue;
        if (seenCategories.has(category) && featured.length > 2) continue;
        seenCompanies.add(company);
        if (category) seenCategories.add(category);
        featured.push(job);
      }

      if (featured.length < 6) {
        for (const job of jobs) {
          if (featured.length >= 6) break;
          if (featured.some(f => f.id === job.id)) continue;
          const company = (job.company || "").toLowerCase();
          if (seenCompanies.has(company)) continue;
          seenCompanies.add(company);
          featured.push(job);
        }
      }

      res.json(featured.map(j => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        isRemote: j.isRemote,
        roleCategory: j.roleCategory,
        seniorityLevel: j.seniorityLevel,
      })));
    } catch (error) {
      console.error("Error fetching featured jobs:", error);
      res.status(500).json({ error: "Failed to fetch featured jobs" });
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

  app.get("/api/jobs/locations", isAuthenticated, async (req, res) => {
    try {
      const allJobs = await storage.getActiveJobs();
      const locationMap: Record<string, number> = {};
      for (const job of allJobs) {
        if (job.location && job.location.trim()) {
          const loc = job.location.trim();
          locationMap[loc] = (locationMap[loc] || 0) + 1;
        }
      }
      const locations = Object.entries(locationMap)
        .sort((a, b) => b[1] - a[1])
        .map(([location, count]) => ({ location, count }));
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.get("/api/jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }
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

  app.get("/api/search/suggestions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;

      const defaultSuggestions = [
        { label: "Compliance & Risk", query: "compliance or risk management role" },
        { label: "Remote Roles", query: "remote legal tech position" },
        { label: "Student / Intern", query: "internship or fellowship in legal tech" },
        { label: "Legal AI", query: "legal AI company, any role" },
        { label: "Operations", query: "legal operations at a growing company" },
      ];

      if (!userId) {
        return res.json({ suggestions: defaultSuggestions, personalized: false });
      }

      const [persona, primaryResume] = await Promise.all([
        storage.getUserPersona(userId).catch(() => null),
        storage.getPrimaryResume(userId).catch(() => null),
      ]);

      const extractedData = primaryResume?.extractedData as any;
      const hasPersona = persona && (persona.topCategories?.length || persona.topSkills?.length);
      const hasResume = extractedData && (extractedData.skills?.length || extractedData.experience?.length);

      if (!hasPersona && !hasResume) {
        return res.json({ suggestions: defaultSuggestions, personalized: false });
      }

      const personalized: { label: string; query: string }[] = [];
      const usedLabels = new Set<string>();

      if (extractedData?.skills?.length) {
        const topSkills = extractedData.skills.slice(0, 3);
        const skillQuery = topSkills.join(", ");
        personalized.push({ label: `Your Skills`, query: `roles requiring ${skillQuery}` });
        usedLabels.add("skills");
      }

      if (persona?.topCategories?.length) {
        const topCat = persona.topCategories[0];
        personalized.push({ label: topCat, query: `${topCat} roles` });
        usedLabels.add(topCat);
      }

      if (persona?.remotePreference === "strong" || persona?.remotePreference === "moderate") {
        personalized.push({ label: "Remote Roles", query: "remote legal tech position" });
        usedLabels.add("remote");
      }

      if (extractedData?.experience?.length) {
        const recentRole = extractedData.experience[0];
        const roleTitle = typeof recentRole === "string" ? recentRole : recentRole.title || recentRole.role;
        if (roleTitle) {
          personalized.push({ label: `Similar to ${roleTitle.slice(0, 25)}`, query: `roles similar to ${roleTitle}` });
          usedLabels.add("experience");
        }
      }

      if (persona?.seniorityInterest?.length) {
        const seniority = persona.seniorityInterest[0];
        if (!personalized.some(s => s.label.toLowerCase().includes(seniority.toLowerCase()))) {
          personalized.push({ label: `${seniority} Level`, query: `${seniority} level legal tech positions` });
        }
      }

      const remaining = defaultSuggestions.filter(s => !usedLabels.has(s.label.toLowerCase()));
      while (personalized.length < 5 && remaining.length > 0) {
        personalized.push(remaining.shift()!);
      }

      res.json({ suggestions: personalized.slice(0, 5), personalized: true });
    } catch (error) {
      console.error("Search suggestions error:", error);
      res.json({
        suggestions: [
          { label: "Compliance & Risk", query: "compliance or risk management role" },
          { label: "Remote Roles", query: "remote legal tech position" },
          { label: "Student / Intern", query: "internship or fellowship in legal tech" },
          { label: "Legal AI", query: "legal AI company, any role" },
          { label: "Operations", query: "legal operations at a growing company" },
        ],
        personalized: false,
      });
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

      // Build user context from resume + persona for personalized results
      const currentUser = req.user as any;
      let userContext = "";
      if (currentUser?.id) {
        try {
          const [resumeInfo, persona, prefs] = await Promise.all([
            storage.getUserResume(currentUser.id),
            storage.getUserPersona(currentUser.id),
            storage.getUserPreferences(currentUser.id),
          ]);
          const contextParts: string[] = [];
          if (resumeInfo?.extractedData) {
            const rd = resumeInfo.extractedData;
            if (rd.skills?.length) contextParts.push(`Skills: ${rd.skills.slice(0, 10).join(", ")}`);
            if (rd.totalYearsExperience) contextParts.push(`Experience: ${rd.totalYearsExperience} years`);
            if (rd.preferredRoles?.length) contextParts.push(`Target roles: ${rd.preferredRoles.join(", ")}`);
            if (rd.legalBackground) contextParts.push("Has legal background");
            if (rd.techBackground) contextParts.push("Has tech background");
          }
          if (persona) {
            const p = persona as any;
            if (p.topCategories?.length) contextParts.push(`Interested in: ${p.topCategories.slice(0, 3).join(", ")}`);
            if (p.careerStage) contextParts.push(`Career stage: ${p.careerStage}`);
          }
          if (prefs) {
            if (prefs.locationPreferences?.length) contextParts.push(`Preferred locations: ${(prefs.locationPreferences as string[]).join(", ")}`);
            if (prefs.remoteOnly) contextParts.push("Prefers remote work");
          }
          if (contextParts.length > 0) {
            userContext = `\n\nUser profile context (use to boost relevance):\n${contextParts.join("\n")}`;
          }
        } catch {}
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

      const systemPrompt = `You are a job matching assistant for a legal tech careers platform. Analyze the user's job search query and score each job based on how well it matches their criteria.

For each job, provide:
1. A match score from 0-100 (100 = perfect match)
2. A brief reason explaining why this job matches or doesn't match

Consider factors like:
- Role type and responsibilities
- Experience level requirements
- Salary expectations
- Location and remote work preferences
- Industry and company focus
${userContext ? "- The user's profile context (skills, experience, preferences) to provide better, more personalized matches" : ""}

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
        response = await getOpenAIClient().chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { 
              role: "user", 
              content: `User search query: "${query}"${userContext}\n\nAvailable jobs:\n${JSON.stringify(jobSummaries, null, 2)}` 
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

      // Save last search query and log activity for learning
      if (currentUser?.id) {
        storage.updateUserLastSearch(currentUser.id, query).catch(console.error);
        storage.logActivity({
          userId: currentUser.id,
          eventType: "search",
          metadata: { query, resultCount: scoredJobs.length },
        }).catch(console.error);
      }

      res.json(scoredJobs);
    } catch (error) {
      console.error("Error in semantic search:", error);
      res.status(500).json({ error: "Search failed. Please try again." });
    }
  });

  // Guided search - analyze query and generate clarifying questions
  // Available to all authenticated users (free users get limited trials, tracked client-side)
  app.post("/api/search/analyze", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      // Get user's resume data if available for personalization
      const user = req.user as any;
      let userContext = "";
      if (user?.id) {
        const userData = await storage.getUserResume(user.id);
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

      const response = await getOpenAIClient().chat.completions.create({
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
  // Available to all authenticated users (free users get limited trials, tracked client-side)
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
      if (user?.id) {
        const userData = await storage.getUserResume(user.id);
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

      const response = await getOpenAIClient().chat.completions.create({
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
      if (user?.id) {
        storage.updateUserLastSearch(user.id, `${originalQuery} (refined)`).catch(console.error);
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
      const userId = user?.id;
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
      const userId = user?.id;
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
      const userId = user?.id;
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

  // ATS Resume Review - analyze resume for ATS friendliness
  app.post("/api/resume/ats-review", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let resumeText: string | undefined;
      let extractedData: ResumeExtractedData | undefined;

      const { resumeId } = req.body;
      if (resumeId) {
        const userResumes = await storage.getUserResumes(userId);
        const resume = userResumes.find((r: any) => r.id === resumeId);
        if (!resume) return res.status(404).json({ error: "Resume not found" });
        resumeText = resume.resumeText ?? undefined;
        extractedData = resume.extractedData as ResumeExtractedData;
      } else {
        const userData = await storage.getUserResumeWithText(userId);
        if (!userData?.resumeText) {
          return res.status(400).json({ error: "No resume uploaded. Please upload a resume first." });
        }
        resumeText = userData.resumeText;
        extractedData = userData.extractedData as ResumeExtractedData;
      }

      if (!resumeText || resumeText.trim().length < 50) {
        return res.status(400).json({ error: "Resume text is too short to analyze." });
      }

      const skillsSummary = extractedData?.skills?.join(", ") || "Not extracted";
      const experienceSummary = extractedData?.experience?.map(e => `${e.title} at ${e.company}`).join("; ") || "Not extracted";

      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert resume reviewer specializing in ATS (Applicant Tracking System) optimization for legal tech careers. Analyze the resume and provide a comprehensive ATS-friendliness audit.

Return valid JSON with this exact structure:
{
  "overallScore": <number 0-100>,
  "verdict": "<one-sentence summary of ATS readiness>",
  "sections": [
    {
      "name": "<section name>",
      "score": <number 0-100>,
      "status": "good" | "needs_work" | "missing",
      "findings": ["<specific finding>"],
      "suggestions": ["<actionable suggestion>"]
    }
  ],
  "keywordAnalysis": {
    "strongKeywords": ["<keyword that ATS systems will pick up>"],
    "missingKeywords": ["<important legal tech keywords missing>"],
    "advice": "<keyword optimization advice>"
  },
  "formatting": {
    "issues": ["<formatting issue that could cause ATS problems>"],
    "tips": ["<formatting tip>"]
  },
  "topPriorities": [
    {
      "priority": "<what to fix>",
      "impact": "high" | "medium" | "low",
      "howToFix": "<specific actionable steps>"
    }
  ]
}

Sections to evaluate:
1. Contact Information - is it clearly structured?
2. Professional Summary - does it exist and use relevant keywords?
3. Work Experience - is it properly formatted with measurable achievements?
4. Skills Section - are hard/technical skills clearly listed?
5. Education - is it present and properly formatted?
6. Keywords & Terminology - does it use legal tech industry terms?
7. Overall Structure - is the format ATS-parseable?

Be specific and actionable. Focus on legal tech industry keywords and ATS best practices.`
          },
          {
            role: "user",
            content: `Analyze this resume for ATS friendliness:\n\nExtracted Skills: ${skillsSummary}\nExperience: ${experienceSummary}\n\nFull Resume Text:\n${resumeText.substring(0, 8000)}`
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "Failed to generate ATS review" });
      }

      const review = JSON.parse(content);
      res.json(review);
    } catch (error: any) {
      console.error("ATS review error:", error);
      res.status(500).json({ error: "Failed to generate ATS review. Please try again." });
    }
  });

  // Batch match resume against all jobs
  app.post("/api/resume/match-jobs", isAuthenticated, requirePro, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
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
  app.post("/api/resume/tweak/:jobId", isAuthenticated, requirePro, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
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
      const userId = user?.id as string;
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

  // ==========================================
  // MULTI-RESUME MANAGEMENT
  // ==========================================

  app.get("/api/resumes", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      await storage.migrateUserResumeToResumes(userId);
      const userResumes = await storage.getUserResumes(userId);
      res.json(userResumes);
    } catch (error) {
      console.error("Error fetching resumes:", error);
      res.status(500).json({ error: "Failed to fetch resumes" });
    }
  });

  app.post("/api/resumes/upload", isAuthenticated, upload.single("resume"), async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file provided" });

      const label = req.body.label || file.originalname.replace(/\.[^/.]+$/, "");

      let resumeText: string;
      if (file.mimetype === "application/pdf") {
        resumeText = await extractTextFromPDF(file.buffer);
      } else {
        resumeText = await extractTextFromDOCX(file.buffer);
      }

      if (!resumeText || resumeText.trim().length < 50) {
        return res.status(400).json({ error: "Could not extract text from file. Please ensure your resume contains readable text." });
      }

      const parsedData = await parseResumeWithAI(resumeText);

      const existing = await storage.getUserResumes(userId);
      if (existing.length >= 5) {
        return res.status(400).json({ error: "Maximum of 5 resumes allowed. Please delete one first." });
      }

      const resume = await storage.createResume({
        userId,
        label,
        filename: file.originalname,
        resumeText,
        extractedData: parsedData,
        isPrimary: existing.length === 0,
      });

      res.json({
        success: true,
        resume: { ...resume, resumeText: null },
        parsedData,
      });
    } catch (error: any) {
      console.error("Resume upload error:", error);
      if (error instanceof InvalidPDFError) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to process resume. Please try a different file." });
    }
  });

  app.patch("/api/resumes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid resume ID" });
      const { label } = req.body;
      if (!label || typeof label !== "string") return res.status(400).json({ error: "Label is required" });
      const updated = await storage.updateResumeLabel(id, userId, label);
      if (!updated) return res.status(404).json({ error: "Resume not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating resume:", error);
      res.status(500).json({ error: "Failed to update resume" });
    }
  });

  app.post("/api/resumes/:id/set-primary", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid resume ID" });
      await storage.setPrimaryResume(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting primary resume:", error);
      res.status(500).json({ error: "Failed to set primary resume" });
    }
  });

  app.delete("/api/resumes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid resume ID" });
      await storage.deleteResume(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting resume:", error);
      res.status(500).json({ error: "Failed to delete resume" });
    }
  });

  app.post("/api/resumes/:id/match-jobs", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid resume ID" });

      const resume = await storage.getResumeById(id, userId);
      if (!resume?.extractedData || Object.keys(resume.extractedData as object).length === 0) {
        return res.status(400).json({ error: "Resume has no extracted data" });
      }

      const allJobs = await storage.getActiveJobs();
      if (allJobs.length === 0) return res.json({ matches: [] });

      const matches = await batchMatchResume(
        resume.extractedData as ResumeExtractedData,
        allJobs
      );

      res.json({ resumeId: id, label: resume.label, matches });
    } catch (error) {
      console.error("Error matching resume against jobs:", error);
      res.status(500).json({ error: "Failed to match resume against jobs" });
    }
  });

  app.post("/api/resumes/match-all", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const userResumes = await storage.getUserResumes(userId);
      if (userResumes.length === 0) return res.json({ results: [] });

      const allJobs = await storage.getActiveJobs();
      if (allJobs.length === 0) return res.json({ results: userResumes.map(r => ({ resumeId: r.id, label: r.label, matches: [] })) });

      const results = [];
      for (const resume of userResumes) {
        const fullResume = await storage.getResumeById(resume.id, userId);
        if (!fullResume?.extractedData || Object.keys(fullResume.extractedData as object).length === 0) {
          results.push({ resumeId: resume.id, label: resume.label, matches: [] });
          continue;
        }
        const matches = await batchMatchResume(
          fullResume.extractedData as ResumeExtractedData,
          allJobs
        );
        results.push({ resumeId: resume.id, label: resume.label, matches });
      }

      res.json({ results });
    } catch (error) {
      console.error("Error matching all resumes:", error);
      res.status(500).json({ error: "Failed to match resumes against jobs" });
    }
  });

  // User preferences endpoints
  app.get("/api/preferences", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
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
      const userId = user?.id;
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
    const userId = user?.id;
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

  app.post("/api/admin/scraper/yc", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      console.log("Starting YC legal tech companies scraper...");

      const { jobs: scrapedJobs, stats } = await scrapeYCCompanies();

      if (scrapedJobs.length === 0) {
        return res.json({
          success: true,
          message: "YC scraping completed but no jobs found",
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
        message: `YC scraping completed. Found ${scrapedJobs.length} jobs from ${stats.filter(s => s.status === 'success').length} companies. Inserted ${inserted} new, updated ${updated} existing.`,
        stats,
        inserted,
        updated,
        totalScraped: scrapedJobs.length,
      });
    } catch (error) {
      console.error("Error running YC scraper:", error);
      res.status(500).json({ error: "Failed to run YC scraper" });
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
          isRemote: job.isRemote,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          roleCategory: job.roleCategory,
          roleSubcategory: job.roleSubcategory,
          seniorityLevel: job.seniorityLevel,
          keySkills: job.keySkills,
          aiSummary: job.aiSummary,
          description: job.description?.substring(0, 300),
        },
        inserted,
        updated,
      });
    } catch (error: any) {
      console.error("Error scraping URL:", error);
      res.status(500).json({ error: error.message || "Failed to scrape URL" });
    }
  });

  app.post("/api/admin/jobs/parse-text", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string' || text.trim().length < 20) {
        return res.status(400).json({ error: "Please paste at least a few lines of job posting text." });
      }

      const buffer = Buffer.from(text.trim(), 'utf-8');
      const jobData = await parseJobFile(buffer, 'text/plain', 'pasted-text.txt');

      res.json({
        success: true,
        parsed: {
          title: jobData.title,
          company: jobData.company,
          location: jobData.location,
          isRemote: jobData.isRemote,
          salaryMin: jobData.salaryMin,
          salaryMax: jobData.salaryMax,
          roleCategory: jobData.roleCategory,
          roleSubcategory: jobData.roleSubcategory,
          seniorityLevel: jobData.seniorityLevel,
          keySkills: jobData.keySkills,
          aiSummary: jobData.aiSummary,
          description: jobData.description,
          applyUrl: jobData.applyUrl,
          source: "upload",
        },
      });
    } catch (error: any) {
      console.error("Error parsing pasted text:", error);
      res.status(500).json({ error: error.message || "Failed to parse job text" });
    }
  });

  app.post("/api/admin/jobs/smart-input", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { input } = req.body;
      if (!input || typeof input !== 'string' || input.trim().length < 10) {
        return res.status(400).json({ error: "Please provide a URL or job posting text." });
      }

      const trimmed = input.trim();

      let isUrl = false;
      try {
        const parsed = new URL(trimmed);
        isUrl = ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        isUrl = false;
      }

      if (isUrl) {
        console.log(`[Smart Input] Detected URL: ${trimmed}`);
        const job = await scrapeSingleJobUrl(trimmed, true);
        if (!job) {
          return res.status(400).json({
            success: false,
            inputType: 'url',
            error: "Could not extract job details from this URL. Try pasting the job description text instead.",
            trace: null,
          });
        }

        const trace = (job as any)._trace || null;

        return res.json({
          success: true,
          inputType: 'url',
          count: 1,
          trace,
          jobs: [{
            title: job.title,
            company: job.company,
            location: job.location,
            isRemote: job.isRemote,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            roleCategory: job.roleCategory,
            roleSubcategory: job.roleSubcategory,
            seniorityLevel: job.seniorityLevel,
            keySkills: job.keySkills,
            aiSummary: job.aiSummary,
            description: job.description,
            applyUrl: job.applyUrl,
            source: job.source,
            externalId: job.externalId,
          }],
        });
      }

      console.log(`[Smart Input] Detected text input (${trimmed.length} chars)`);
      const jobs = await parseMultipleJobsFromText(trimmed);

      return res.json({
        success: true,
        inputType: 'text',
        count: jobs.length,
        jobs: jobs.map(job => ({
          title: job.title,
          company: job.company,
          location: job.location,
          isRemote: job.isRemote,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          roleCategory: job.roleCategory,
          roleSubcategory: job.roleSubcategory,
          seniorityLevel: job.seniorityLevel,
          keySkills: job.keySkills,
          aiSummary: job.aiSummary,
          description: job.description,
          applyUrl: job.applyUrl,
          source: job.source || "paste",
          externalId: job.externalId,
        })),
      });
    } catch (error: any) {
      console.error("[Smart Input] Error:", error);
      res.status(500).json({ error: error.message || "Failed to process input" });
    }
  });

  app.post("/api/admin/jobs/preview-file", isAuthenticated, adminUpload.single("file"), async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const jobData = await parseJobFile(file.buffer, file.mimetype, file.originalname);

      res.json({
        success: true,
        parsed: {
          title: jobData.title,
          company: jobData.company,
          location: jobData.location,
          isRemote: jobData.isRemote,
          salaryMin: jobData.salaryMin,
          salaryMax: jobData.salaryMax,
          roleCategory: jobData.roleCategory,
          roleSubcategory: jobData.roleSubcategory,
          seniorityLevel: jobData.seniorityLevel,
          keySkills: jobData.keySkills,
          aiSummary: jobData.aiSummary,
          description: jobData.description,
          applyUrl: jobData.applyUrl,
          source: "upload",
        },
      });
    } catch (error: any) {
      console.error("Error previewing file:", error);
      res.status(500).json({ error: error.message || "Failed to parse file" });
    }
  });

  app.post("/api/admin/jobs/preview-url", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL is required" });
      }
      try { new URL(url); } catch { return res.status(400).json({ error: "Invalid URL format" }); }

      const job = await scrapeSingleJobUrl(url);
      if (!job) {
        return res.status(400).json({ success: false, error: "Could not extract job details from this URL." });
      }

      res.json({
        success: true,
        parsed: {
          title: job.title,
          company: job.company,
          location: job.location,
          isRemote: job.isRemote,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          roleCategory: job.roleCategory,
          roleSubcategory: job.roleSubcategory,
          seniorityLevel: job.seniorityLevel,
          keySkills: job.keySkills,
          aiSummary: job.aiSummary,
          description: job.description,
          applyUrl: job.applyUrl,
          source: job.source,
          externalId: job.externalId,
        },
      });
    } catch (error: any) {
      console.error("Error previewing URL:", error);
      res.status(500).json({ error: error.message || "Failed to preview URL" });
    }
  });

  app.post("/api/admin/jobs/confirm", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const jobData = req.body;
      if (!jobData.title || !jobData.company) {
        return res.status(400).json({ error: "Title and company are required" });
      }

      const companySlug = jobData.company.toLowerCase().replace(/[^a-z0-9]/g, "");

      const insertData: any = {
        title: jobData.title?.substring(0, 255),
        company: jobData.company?.substring(0, 255),
        companyLogo: companySlug ? `https://logo.clearbit.com/${companySlug}.com` : null,
        location: jobData.location || "Not specified",
        isRemote: Boolean(jobData.isRemote),
        salaryMin: jobData.salaryMin ? Number(jobData.salaryMin) : null,
        salaryMax: jobData.salaryMax ? Number(jobData.salaryMax) : null,
        experienceMin: jobData.experienceMin ? Number(jobData.experienceMin) : null,
        experienceMax: jobData.experienceMax ? Number(jobData.experienceMax) : null,
        roleType: jobData.roleType || null,
        description: jobData.description || `${jobData.title} at ${jobData.company}`,
        requirements: null,
        applyUrl: jobData.applyUrl || "#",
        isActive: true,
        externalId: jobData.externalId || `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        source: jobData.source || "admin",
        roleCategory: jobData.roleCategory || null,
        roleSubcategory: jobData.roleSubcategory || null,
        seniorityLevel: jobData.seniorityLevel || null,
        keySkills: jobData.keySkills || null,
        aiSummary: jobData.aiSummary || null,
        matchKeywords: jobData.matchKeywords || null,
      };

      const { inserted, updated, newJobs } = await storage.bulkUpsertJobs([insertData]);

      if (newJobs.length > 0) {
        matchNewJobsAgainstAlerts(newJobs).catch(err => console.error("Alert matching error:", err));
      }

      res.json({
        success: true,
        message: inserted > 0 ? "Job added successfully" : "Job updated successfully",
        inserted,
        updated,
      });
    } catch (error: any) {
      console.error("Error confirming job:", error);
      res.status(500).json({ error: error.message || "Failed to save job" });
    }
  });

  app.post("/api/admin/scraper/upload", isAuthenticated, adminUpload.array("files", 10), async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const results: { filename: string; success: boolean; job?: { title: string; company: string; category?: string | null }; error?: string }[] = [];

      for (const file of files) {
        try {
          const jobData = await parseJobFile(file.buffer, file.mimetype, file.originalname);
          const { inserted, updated, newJobs } = await storage.bulkUpsertJobs([jobData]);

          if (newJobs.length > 0) {
            matchNewJobsAgainstAlerts(newJobs).catch(err => console.error("Alert matching error:", err));
          }

          results.push({
            filename: file.originalname,
            success: true,
            job: { title: jobData.title, company: jobData.company, category: jobData.roleCategory },
          });
        } catch (fileErr: any) {
          console.error(`Error processing file ${file.originalname}:`, fileErr);
          results.push({
            filename: file.originalname,
            success: false,
            error: fileErr.message || "Failed to process file",
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      res.json({
        success: successCount > 0,
        message: `Processed ${successCount}/${files.length} files successfully`,
        results,
      });
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({ error: error.message || "Failed to process uploaded files" });
    }
  });

  app.get("/api/admin/jobs", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const allJobs = await storage.getJobs();
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const search = (req.query.search as string || "").toLowerCase();
      const category = req.query.category as string;
      const source = req.query.source as string;
      const active = req.query.active as string;
      const seniority = req.query.seniority as string;

      let filtered = allJobs;
      if (search) {
        filtered = filtered.filter(j =>
          j.title.toLowerCase().includes(search) ||
          j.company.toLowerCase().includes(search) ||
          (j.location || "").toLowerCase().includes(search)
        );
      }
      if (category) {
        filtered = filtered.filter(j => j.roleCategory === category);
      }
      if (source) {
        filtered = filtered.filter(j => j.source === source);
      }
      if (active === "true") {
        filtered = filtered.filter(j => j.isActive);
      } else if (active === "false") {
        filtered = filtered.filter(j => !j.isActive);
      }
      if (seniority) {
        filtered = filtered.filter(j => j.seniorityLevel === seniority);
      }

      const total = filtered.length;
      const start = (page - 1) * limit;
      const paged = filtered.slice(start, start + limit);

      res.json({ jobs: paged, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error: any) {
      console.error("Error fetching admin jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.patch("/api/admin/jobs/:id", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid job ID" });

      const allowedFields = [
        "title", "company", "location", "isRemote", "salaryMin", "salaryMax",
        "roleType", "description", "requirements", "applyUrl", "isActive",
        "roleCategory", "roleSubcategory", "seniorityLevel",
      ];
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const updated = await storage.updateJob(id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.json({ success: true, job: updated });
    } catch (error: any) {
      console.error("Error updating job:", error);
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  app.delete("/api/admin/jobs/:id", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid job ID" });

      await storage.deleteJob(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting job:", error);
      res.status(500).json({ error: "Failed to delete job" });
    }
  });

  app.post("/api/admin/jobs/:id/recategorize", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid job ID" });

      const job = await storage.getJob(id);
      if (!job) return res.status(404).json({ error: "Job not found" });

      const categorization = await categorizeJob(job.title, job.description, job.company);
      const updated = await storage.updateJob(id, {
        roleCategory: categorization.category,
        roleSubcategory: categorization.subcategory,
        seniorityLevel: categorization.seniorityLevel,
        keySkills: categorization.keySkills,
        aiSummary: categorization.aiSummary,
        matchKeywords: categorization.matchKeywords,
      });

      res.json({ success: true, job: updated, categorization });
    } catch (error: any) {
      console.error("Error recategorizing job:", error);
      res.status(500).json({ error: "Failed to recategorize job" });
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

  // Parse uploaded job file to extract fields (for Post a Job form auto-fill)
  app.post("/api/parse-job-file", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { parseJobFile } = await import("./lib/job-file-parser");
      const parsedJob = await parseJobFile(file.buffer, file.mimetype, file.originalname);

      res.json({
        success: true,
        data: {
          title: parsedJob.title || "",
          company: parsedJob.company || "",
          location: parsedJob.location || "",
          isRemote: parsedJob.isRemote || false,
          salaryRange: parsedJob.salaryMin && parsedJob.salaryMax
            ? `$${(parsedJob.salaryMin / 1000).toFixed(0)}K - $${(parsedJob.salaryMax / 1000).toFixed(0)}K`
            : "",
          description: parsedJob.description || "",
          applyUrl: parsedJob.applyUrl || "",
        },
      });
    } catch (error: any) {
      console.error("Job file parse error:", error);
      res.status(500).json({ error: error.message || "Failed to parse job file" });
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
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const alerts = await storage.getUserAlerts(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", isAuthenticated, requirePro, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const id = parseInt(req.params.id as string);
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
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const id = parseInt(req.params.id as string);
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
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
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const id = parseInt(req.params.id as string);
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
      const userId = (req.user as any)?.id;
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

  // --- User Dashboard ---
  app.get("/api/dashboard", isAuthenticated, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await storage.getUserDashboard(req.user!.id, Math.min(days, 90));
      res.json(data);
    } catch (error) {
      console.error("Error fetching user dashboard:", error);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  // --- Admin Analytics ---

  app.get("/api/admin/analytics/kpis", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const kpis = await storage.getAnalyticsKpis();
      res.json(kpis);
    } catch (error) {
      console.error("Analytics KPIs error:", error);
      res.status(500).json({ error: "Failed to fetch KPIs" });
    }
  });

  app.get("/api/admin/analytics/engagement", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const days = parseInt(req.query.days as string) || 30;
      const engagement = await storage.getAnalyticsEngagement(days);
      res.json(engagement);
    } catch (error) {
      console.error("Analytics engagement error:", error);
      res.status(500).json({ error: "Failed to fetch engagement data" });
    }
  });

  app.get("/api/admin/analytics/features", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const features = await storage.getAnalyticsFeatureAdoption();
      res.json(features);
    } catch (error) {
      console.error("Analytics features error:", error);
      res.status(500).json({ error: "Failed to fetch feature adoption data" });
    }
  });

  app.get("/api/admin/analytics/cohorts", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const cohorts = await storage.getAnalyticsUserCohorts();
      res.json(cohorts);
    } catch (error) {
      console.error("Analytics cohorts error:", error);
      res.status(500).json({ error: "Failed to fetch cohort data" });
    }
  });

  app.get("/api/admin/analytics/top-content", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const content = await storage.getAnalyticsTopContent();
      res.json(content);
    } catch (error) {
      console.error("Analytics top content error:", error);
      res.status(500).json({ error: "Failed to fetch top content data" });
    }
  });

  app.get("/api/admin/analytics/users", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const userList = await storage.getAnalyticsUserList();
      res.json(userList);
    } catch (error) {
      console.error("Analytics users error:", error);
      res.status(500).json({ error: "Failed to fetch user analytics" });
    }
  });

  app.get("/api/admin/analytics/funnel", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const funnel = await storage.getAnalyticsFunnel();
      res.json(funnel);
    } catch (error) {
      console.error("Analytics funnel error:", error);
      res.status(500).json({ error: "Failed to fetch funnel data" });
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

      const completion = await getOpenAIClient().chat.completions.create({
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

  app.post("/api/career-advisor/compare", isAuthenticated, requirePro, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
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

      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini",
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

  // ===== Market Analytics (accessible to all authenticated users for soft paywall) =====
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

  // ===== Conversational Market Insights (Pro only) =====
  app.post("/api/insights/query", isAuthenticated, requirePro, async (req, res) => {
    try {
      const { question } = req.body;
      if (!question || typeof question !== "string" || question.trim().length < 3) {
        return res.status(400).json({ error: "Please provide a question." });
      }

      const allJobs = await storage.getActiveJobs();
      const totalJobs = allJobs.length;

      if (totalJobs === 0) {
        return res.json({
          answer: "There are currently no active job listings in the database. Check back soon as new positions are added regularly.",
          citations: [],
        });
      }

      const companies = new Set(allJobs.map((j) => j.company));
      const remoteJobs = allJobs.filter((j) => j.isRemote).length;

      const categoryMap: Record<string, number> = {};
      const seniorityMap: Record<string, number> = {};
      const skillMap: Record<string, number> = {};
      const companyMap: Record<string, number> = {};
      const subcategoryMap: Record<string, number> = {};
      const salaryJobs: { title: string; company: string; min: number; max: number; category: string }[] = [];
      const locationMap: Record<string, number> = {};

      for (const job of allJobs) {
        if (job.roleCategory) categoryMap[job.roleCategory] = (categoryMap[job.roleCategory] || 0) + 1;
        if (job.seniorityLevel) seniorityMap[job.seniorityLevel] = (seniorityMap[job.seniorityLevel] || 0) + 1;
        if (job.keySkills) {
          for (const skill of job.keySkills) skillMap[skill] = (skillMap[skill] || 0) + 1;
        }
        companyMap[job.company] = (companyMap[job.company] || 0) + 1;
        if (job.roleSubcategory) subcategoryMap[job.roleSubcategory] = (subcategoryMap[job.roleSubcategory] || 0) + 1;
        if (job.salaryMin && job.salaryMax && job.salaryMin > 0) {
          salaryJobs.push({ title: job.title, company: job.company, min: job.salaryMin, max: job.salaryMax, category: job.roleCategory || "Unknown" });
        }
        if (job.location) locationMap[job.location] = (locationMap[job.location] || 0) + 1;
      }

      const topCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const topSkills = Object.entries(skillMap).sort((a, b) => b[1] - a[1]).slice(0, 20);
      const topCompanies = Object.entries(companyMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
      const topLocations = Object.entries(locationMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const seniorityBreakdown = Object.entries(seniorityMap).sort((a, b) => b[1] - a[1]);
      const topSubcategories = Object.entries(subcategoryMap).sort((a, b) => b[1] - a[1]).slice(0, 15);

      const avgSalaryMin = salaryJobs.length > 0 ? Math.round(salaryJobs.reduce((s, j) => s + j.min, 0) / salaryJobs.length) : null;
      const avgSalaryMax = salaryJobs.length > 0 ? Math.round(salaryJobs.reduce((s, j) => s + j.max, 0) / salaryJobs.length) : null;

      const salaryByCategory: Record<string, { total: number; count: number }> = {};
      for (const sj of salaryJobs) {
        if (!salaryByCategory[sj.category]) salaryByCategory[sj.category] = { total: 0, count: 0 };
        salaryByCategory[sj.category].total += (sj.min + sj.max) / 2;
        salaryByCategory[sj.category].count += 1;
      }
      const avgSalaryByCategory = Object.entries(salaryByCategory)
        .map(([cat, d]) => ({ category: cat, avgSalary: Math.round(d.total / d.count), sampleSize: d.count }))
        .sort((a, b) => b.avgSalary - a.avgSalary);

      const internFellowshipCount = allJobs.filter((j) => ["Intern", "Fellowship"].includes(j.seniorityLevel || "")).length;
      const entryLevelCount = allJobs.filter((j) => ["Entry", "Junior", "Associate", "Intern", "Fellowship"].includes(j.seniorityLevel || "")).length;

      const facts = `LEGAL TECH JOB MARKET DATA (from ${totalJobs} active listings):

OVERVIEW:
- ${totalJobs} active positions across ${companies.size} companies
- ${remoteJobs} remote positions (${Math.round((remoteJobs / totalJobs) * 100)}% of all jobs)
- ${entryLevelCount} entry-level/student positions (includes ${internFellowshipCount} internships & fellowships)
${avgSalaryMin && avgSalaryMax ? `- Average salary range: $${avgSalaryMin.toLocaleString()} - $${avgSalaryMax.toLocaleString()} (from ${salaryJobs.length} jobs with salary data)` : "- Limited salary data available"}

CATEGORIES (by number of listings):
${topCategories.map(([name, count]) => `- ${name}: ${count} positions (${Math.round((count / totalJobs) * 100)}%)`).join("\n")}

SENIORITY DISTRIBUTION:
${seniorityBreakdown.map(([level, count]) => `- ${level}: ${count} positions (${Math.round((count / totalJobs) * 100)}%)`).join("\n")}

TOP SKILLS IN DEMAND:
${topSkills.map(([skill, count]) => `- ${skill}: mentioned in ${count} listings`).join("\n")}

TOP EMPLOYERS:
${topCompanies.map(([company, count]) => `- ${company}: ${count} open positions`).join("\n")}

TOP SPECIALIZATIONS:
${topSubcategories.map(([name, count]) => `- ${name}: ${count} positions`).join("\n")}

${avgSalaryByCategory.length > 0 ? `SALARY BY CATEGORY (average midpoint):
${avgSalaryByCategory.map((s) => `- ${s.category}: ~$${s.avgSalary.toLocaleString()} avg (${s.sampleSize} jobs with salary data)`).join("\n")}` : ""}

TOP LOCATIONS:
${topLocations.map(([loc, count]) => `- ${loc}: ${count} positions`).join("\n")}

SAMPLE JOB TITLES (for context):
${allJobs.slice(0, 20).map((j) => `- "${j.title}" at ${j.company} [${j.roleCategory || "Uncategorized"}]${j.seniorityLevel ? ` (${j.seniorityLevel})` : ""}`).join("\n")}`;

      const systemPrompt = `You are a legal tech job market analyst. You answer questions about the legal technology employment market using ONLY the data provided below. Be specific, cite numbers, and reference the source data. When you make a claim, include the data point in parentheses.

Format your response in clear paragraphs. Use bold (**text**) for key findings. If the data doesn't contain enough information to answer the question, say so honestly.

Do not mention that you are an AI or use phrases like "AI-powered". Speak naturally as a market analyst would.

After your analysis, list 2-4 key data points you referenced as "Sources" - each should be a specific fact from the data (e.g., "45 active listings in Legal AI & Machine Learning").`;

      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `DATA:\n${facts}\n\nQUESTION: ${question.trim()}` },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      });

      const responseText = completion.choices[0]?.message?.content || "Unable to generate analysis.";

      const sourcesMatch = responseText.match(/(?:Sources|SOURCES|Data Sources|References)[:\s]*\n?([\s\S]*?)$/i);
      let answer = responseText;
      const citations: string[] = [];

      if (sourcesMatch) {
        answer = responseText.slice(0, sourcesMatch.index).trim();
        const sourcesBlock = sourcesMatch[1];
        const sourceLines = sourcesBlock.split("\n").filter((l: string) => l.trim().startsWith("-") || l.trim().match(/^\d+\./));
        for (const line of sourceLines) {
          const cleaned = line.replace(/^[\s\-\d.]+/, "").trim();
          if (cleaned.length > 5) citations.push(cleaned);
        }
      }

      res.json({ answer, citations });
    } catch (error) {
      console.error("Insights query error:", error);
      res.status(500).json({ error: "Failed to analyze market data" });
    }
  });

  // =============================================
  // Assistant Chat API
  // =============================================

  app.post("/api/assistant/chat", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      const { message, history, context } = req.body;

      if (!message || typeof message !== "string" || message.trim().length < 2) {
        return res.status(400).json({ error: "Please provide a message." });
      }

      const conversationHistory: { role: "user" | "assistant"; content: string }[] = Array.isArray(history)
        ? history.slice(-8).map((h: any) => ({
            role: h.role === "assistant" ? "assistant" as const : "user" as const,
            content: String(h.content).slice(0, 2000),
          }))
        : [];

      let jobContext = "";
      let resumeContext = "";
      let platformContext = "";
      let personaContext = "";

      if (context?.jobId) {
        const job = await storage.getJob(Number(context.jobId));
        if (job) {
          const salaryInfo = job.salaryMin || job.salaryMax
            ? `Salary: ${job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : ""}${job.salaryMin && job.salaryMax ? " - " : ""}${job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : ""}`
            : "Salary: Not disclosed";
          jobContext = `
CURRENT JOB BEING DISCUSSED:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || "Not specified"}
${job.isRemote ? "Remote: Yes" : ""}
${salaryInfo}
Seniority: ${job.seniorityLevel || "Not specified"}
Category: ${job.roleCategory || "Not specified"}
${job.roleSubcategory ? `Specialization: ${job.roleSubcategory}` : ""}
${job.keySkills?.length ? `Key Skills: ${job.keySkills.join(", ")}` : ""}

Summary: ${job.aiSummary || "No summary available"}

Full Description:
${(job.description || "").slice(0, 3000)}

${job.requirements ? `Requirements:\n${job.requirements.slice(0, 1500)}` : ""}`;
        }
      }

      if (userId) {
        const primaryResume = await storage.getPrimaryResume(userId);
        if (primaryResume) {
          const extracted = primaryResume.extractedData as any;
          resumeContext = `
USER'S RESUME INFORMATION:
${extracted?.skills?.length ? `Skills: ${extracted.skills.join(", ")}` : ""}
${extracted?.experience ? `Experience: ${JSON.stringify(extracted.experience).slice(0, 800)}` : ""}
${extracted?.education ? `Education: ${JSON.stringify(extracted.education).slice(0, 400)}` : ""}
${extracted?.yearsOfExperience ? `Years of Experience: ${extracted.yearsOfExperience}` : ""}
${primaryResume.resumeText ? `Resume Summary (first 1500 chars):\n${primaryResume.resumeText.slice(0, 1500)}` : ""}`;
        }
      }

      if (userId) {
        const persona = await storage.getUserPersona(userId);
        if (persona && ((persona.totalJobViews ?? 0) > 0 || (persona.totalSearches ?? 0) > 0)) {
          const parts: string[] = [];
          if (persona.personaSummary) parts.push(`Profile: ${persona.personaSummary}`);
          if (persona.topCategories?.length) parts.push(`Top interests: ${(persona.topCategories as string[]).join(", ")}`);
          if (persona.topSkills?.length) parts.push(`Key skills: ${(persona.topSkills as string[]).slice(0, 8).join(", ")}`);
          if (persona.preferredLocations?.length) parts.push(`Location preferences: ${(persona.preferredLocations as string[]).join(", ")}`);
          if (persona.seniorityInterest?.length) parts.push(`Seniority interest: ${(persona.seniorityInterest as string[]).join(", ")}`);
          if (persona.remotePreference && persona.remotePreference !== "unknown") parts.push(`Remote preference: ${persona.remotePreference}`);
          if (persona.careerStage && persona.careerStage !== "exploring") parts.push(`Career stage: ${persona.careerStage}`);
          if (persona.searchPatterns?.length) parts.push(`Recent searches: ${(persona.searchPatterns as string[]).slice(-5).join(", ")}`);
          if (persona.viewedCompanies?.length) parts.push(`Companies explored: ${(persona.viewedCompanies as string[]).slice(0, 5).join(", ")}`);
          parts.push(`Activity: ${persona.totalJobViews} jobs viewed, ${persona.totalSearches} searches, ${persona.totalApplyClicks} applications`);

          personaContext = `
USER BEHAVIORAL PROFILE (based on their activity on this platform):
${parts.join("\n")}`;
        }
      }

      const allJobs = await storage.getActiveJobs();
      const jobSummaries = allJobs.slice(0, 30).map(j => {
        const sal = j.salaryMin ? `$${Math.round(j.salaryMin/1000)}K${j.salaryMax ? `-$${Math.round(j.salaryMax/1000)}K` : "+"}` : "";
        return `- "${j.title}" at ${j.company} (${j.location || "Location N/A"}) ${sal} [${j.roleCategory || ""}] ${j.seniorityLevel || ""}`;
      }).join("\n");

      platformContext = `
PLATFORM CONTEXT:
Legal Tech Careers is a job platform connecting legal professionals with opportunities in legal technology. There are currently ${allJobs.length} active job listings across ${new Set(allJobs.map(j => j.company)).size} companies.

SAMPLE OF AVAILABLE JOBS:
${jobSummaries}`;

      const systemPrompt = `You are a friendly and knowledgeable career assistant for Legal Tech Careers, a job platform for legal professionals exploring technology careers. Your role is to help users understand job listings, evaluate their fit, and navigate their career transition.

IMPORTANT GUIDELINES:
- Use plain, everyday language. Avoid jargon. If you must use a technical term, explain it simply in parentheses.
- Be warm but concise. Keep responses focused and helpful.
- Never mention that you are an AI or use phrases like "AI-powered".
- When discussing a specific job, break down what the role actually involves day-to-day.
- When comparing the user's resume to a job, be honest but constructive. Highlight strengths first, then gaps, then actionable steps.
- If the user asks about something you don't have data for, say so honestly rather than guessing.
- Format responses with short paragraphs. Use **bold** for emphasis on key points.
- When listing items, use bullet points (- item) for readability.
${personaContext ? `\nYou have access to this user's behavioral profile from their activity on the platform. Use it to personalize your responses:
- Reference their interests and activity patterns naturally, don't list them back robotically.
- Suggest jobs and career paths that align with their demonstrated interests.
- Tailor language to their career stage (e.g., more detailed explanations for early-career, strategic guidance for senior).
- If they've been exploring specific companies or categories, proactively mention relevant opportunities.
- Never say "based on your profile" or "your data shows." Instead, weave personalization naturally: "Since you've been looking at compliance roles..." or "Given your interest in remote positions..."` : ""}
${jobContext ? "\nThe user is currently looking at a specific job posting. Use the job details below to answer their questions about this role." : ""}
${resumeContext ? "\nThe user has uploaded their resume. Use their background to personalize advice and evaluate job fit." : ""}
${jobContext}
${resumeContext}
${personaContext}
${platformContext}`;

      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message.trim() },
      ];

      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.6,
        max_tokens: 1200,
      });

      const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

      res.json({ reply });
    } catch (error) {
      console.error("Assistant chat error:", error);
      res.status(500).json({ error: "Failed to process your question. Please try again." });
    }
  });

  app.post("/api/match/discuss", isAuthenticated, requirePro, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      const { message, history, matchContext } = req.body;

      if (!message || typeof message !== "string" || message.trim().length < 2) {
        return res.status(400).json({ error: "Please provide a message." });
      }

      if (!matchContext?.jobId) {
        return res.status(400).json({ error: "Match context required." });
      }

      const conversationHistory: { role: "user" | "assistant"; content: string }[] = Array.isArray(history)
        ? history.slice(-8).map((h: any) => ({
            role: h.role === "assistant" ? "assistant" as const : "user" as const,
            content: String(h.content).slice(0, 2000),
          }))
        : [];

      const job = await storage.getJob(Number(matchContext.jobId));
      if (!job) {
        return res.status(404).json({ error: "Job not found." });
      }

      let resumeContext = "";
      if (userId) {
        const primaryResume = await storage.getPrimaryResume(userId);
        if (primaryResume) {
          const extracted = primaryResume.extractedData as any;
          resumeContext = `
USER'S RESUME:
${extracted?.skills?.length ? `Skills: ${extracted.skills.join(", ")}` : ""}
${extracted?.experience ? `Experience: ${JSON.stringify(extracted.experience).slice(0, 1200)}` : ""}
${extracted?.education ? `Education: ${JSON.stringify(extracted.education).slice(0, 500)}` : ""}
${extracted?.yearsOfExperience ? `Years of Experience: ${extracted.yearsOfExperience}` : ""}
${primaryResume.resumeText ? `Full Resume:\n${primaryResume.resumeText.slice(0, 2000)}` : ""}`;
        }
      }

      const salaryInfo = job.salaryMin || job.salaryMax
        ? `Salary: ${job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : ""}${job.salaryMin && job.salaryMax ? " - " : ""}${job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : ""}`
        : "Salary: Not disclosed";

      const matchDetails = `
MATCH ANALYSIS RESULTS:
Match Score: ${matchContext.matchScore}%
Tweak Needed: ${matchContext.tweakPercentage}%
Verdict: ${matchContext.brutalVerdict}
${matchContext.matchHighlights?.length ? `Strengths: ${matchContext.matchHighlights.join("; ")}` : ""}
${matchContext.gapSummary ? `Gaps: ${matchContext.gapSummary}` : ""}
${matchContext.topMissingSkills?.length ? `Missing Skills: ${matchContext.topMissingSkills.join(", ")}` : ""}`;

      const jobDetails = `
JOB DETAILS:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || "Not specified"}
${job.isRemote ? "Remote: Yes" : ""}
${salaryInfo}
Seniority: ${job.seniorityLevel || "Not specified"}
Category: ${job.roleCategory || "Not specified"}
${job.roleSubcategory ? `Specialization: ${job.roleSubcategory}` : ""}
${job.keySkills?.length ? `Key Skills: ${job.keySkills.join(", ")}` : ""}
Summary: ${job.aiSummary || "No summary available"}
Description:
${(job.description || "").slice(0, 3000)}
${job.requirements ? `Requirements:\n${job.requirements.slice(0, 1500)}` : ""}`;

      const systemPrompt = `You are a career advisor helping a legal professional understand how well they match with a specific job opportunity. You have their resume, the full job details, and the match analysis results.

YOUR ROLE:
- Help the user understand their match with this specific job
- Explain what parts of their background align well and what gaps exist
- Give honest, actionable advice on whether to apply and how to position themselves
- Suggest specific ways to strengthen their application
- Answer any questions about the role, company, or what the job involves day-to-day

GUIDELINES:
- Be direct and honest but constructive. Don't sugarcoat, but always offer a path forward
- Use plain language. If you use a technical term, explain it
- Keep responses focused and practical. Short paragraphs, bullet points for lists
- Reference specific details from their resume and the job posting
- Never say "based on the data" or "according to the analysis" - speak naturally as a knowledgeable advisor
- Use **bold** for key points. Use - for bullet points
- If the user asks something you don't have data for, say so honestly

${resumeContext}

${jobDetails}

${matchDetails}`;

      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message.trim() },
      ];

      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.6,
        max_tokens: 1200,
      });

      const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";
      res.json({ reply });
    } catch (error) {
      console.error("Match discussion error:", error);
      res.status(500).json({ error: "Failed to process your question. Please try again." });
    }
  });

  // =============================================
  // User Activity & Persona Routes
  // =============================================

  app.post("/api/activities", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const { events } = req.body;

      if (Array.isArray(events) && events.length > 0) {
        const activities = events.slice(0, 20).map((e: any) => ({
          userId,
          eventType: String(e.eventType || "unknown").slice(0, 50),
          entityType: e.entityType ? String(e.entityType).slice(0, 50) : null,
          entityId: e.entityId ? String(e.entityId).slice(0, 255) : null,
          metadata: e.metadata || null,
          pagePath: e.pagePath ? String(e.pagePath).slice(0, 500) : null,
          sessionId: e.sessionId ? String(e.sessionId).slice(0, 255) : null,
        }));
        await storage.logActivities(activities);
      } else if (req.body.eventType) {
        await storage.logActivity({
          userId,
          eventType: String(req.body.eventType).slice(0, 50),
          entityType: req.body.entityType ? String(req.body.entityType).slice(0, 50) : null,
          entityId: req.body.entityId ? String(req.body.entityId).slice(0, 255) : null,
          metadata: req.body.metadata || null,
          pagePath: req.body.pagePath ? String(req.body.pagePath).slice(0, 500) : null,
          sessionId: req.body.sessionId ? String(req.body.sessionId).slice(0, 255) : null,
        });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error("Activity log error:", error);
      res.status(500).json({ error: "Failed to log activity" });
    }
  });

  app.get("/api/persona", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      let persona = await storage.getUserPersona(userId);

      const shouldRecompute = !persona || !persona.updatedAt ||
        (Date.now() - new Date(persona.updatedAt).getTime()) > 10 * 60 * 1000;

      if (shouldRecompute) {
        persona = (await recomputePersona(userId)) ?? undefined;
      }

      res.json(persona ?? {
        userId,
        topCategories: [],
        topSkills: [],
        preferredLocations: [],
        remotePreference: "unknown",
        seniorityInterest: [],
        careerStage: "exploring",
        engagementLevel: "new",
        searchPatterns: [],
        viewedCompanies: [],
        personaSummary: null,
        totalJobViews: 0,
        totalSearches: 0,
        totalApplyClicks: 0,
      });
    } catch (error) {
      console.error("Persona fetch error:", error);
      res.status(500).json({ error: "Failed to fetch persona" });
    }
  });

  async function recomputePersona(userId: string) {
    try {
      const recentActivities = await storage.getUserRecentActivities(userId, 200);
      const counts = await storage.getUserActivityCounts(userId);

      const categoryCounter: Record<string, number> = {};
      const locationCounter: Record<string, number> = {};
      const companyCounter: Record<string, number> = {};
      const seniorityCounter: Record<string, number> = {};
      const searchTerms: string[] = [];
      let remoteViews = 0;
      let totalViews = 0;

      const allJobs = await storage.getActiveJobs();
      const jobMap = new Map(allJobs.map(j => [j.id, j]));

      for (const activity of recentActivities) {
        const meta = activity.metadata as any;

        if (activity.eventType === "job_view" && activity.entityId) {
          totalViews++;
          const job = jobMap.get(Number(activity.entityId));
          if (job) {
            if (job.roleCategory) categoryCounter[job.roleCategory] = (categoryCounter[job.roleCategory] || 0) + 1;
            if (job.location) locationCounter[job.location.split(",")[0].trim()] = (locationCounter[job.location.split(",")[0].trim()] || 0) + 1;
            if (job.company) companyCounter[job.company] = (companyCounter[job.company] || 0) + 1;
            if (job.seniorityLevel) seniorityCounter[job.seniorityLevel] = (seniorityCounter[job.seniorityLevel] || 0) + 1;
            if (job.isRemote) remoteViews++;
          }
        }

        if (activity.eventType === "apply_click" && activity.entityId) {
          const job = jobMap.get(Number(activity.entityId));
          if (job) {
            if (job.roleCategory) categoryCounter[job.roleCategory] = (categoryCounter[job.roleCategory] || 0) + 3;
            if (job.company) companyCounter[job.company] = (companyCounter[job.company] || 0) + 3;
            if (job.seniorityLevel) seniorityCounter[job.seniorityLevel] = (seniorityCounter[job.seniorityLevel] || 0) + 2;
          }
        }

        if (activity.eventType === "search" && meta?.query) {
          searchTerms.push(String(meta.query));
        }

        if (activity.eventType === "filter_change" && meta) {
          if (meta.category) categoryCounter[meta.category] = (categoryCounter[meta.category] || 0) + 2;
          if (meta.location) locationCounter[meta.location] = (locationCounter[meta.location] || 0) + 2;
          if (meta.seniority) seniorityCounter[meta.seniority] = (seniorityCounter[meta.seniority] || 0) + 2;
        }
      }

      const topN = (obj: Record<string, number>, n: number) =>
        Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

      const topCategories = topN(categoryCounter, 5);
      const preferredLocations = topN(locationCounter, 5);
      const viewedCompanies = topN(companyCounter, 10);
      const seniorityInterest = topN(seniorityCounter, 3);
      const uniqueSearches = Array.from(new Set(searchTerms)).slice(-10);

      const remotePreference = totalViews > 3
        ? (remoteViews / totalViews > 0.6 ? "strong" : remoteViews / totalViews > 0.3 ? "moderate" : "low")
        : "unknown";

      const totalEvents = recentActivities.length;
      const engagementLevel = totalEvents > 50 ? "power_user" :
        totalEvents > 20 ? "active" :
        totalEvents > 5 ? "exploring" : "new";

      let careerStage = "exploring";
      const primaryResume = await storage.getPrimaryResume(userId);
      if (primaryResume) {
        const extracted = primaryResume.extractedData as any;
        const years = extracted?.yearsOfExperience;
        if (years !== undefined) {
          careerStage = years <= 2 ? "early_career" :
            years <= 7 ? "mid_career" :
            years <= 15 ? "senior" : "executive";
        }
      }

      const topSkills: string[] = [];
      if (primaryResume) {
        const extracted = primaryResume.extractedData as any;
        if (extracted?.skills) topSkills.push(...extracted.skills.slice(0, 10));
      }

      const summaryParts: string[] = [];
      if (careerStage !== "exploring") {
        const stageMap: Record<string, string> = { early_career: "Early-career", mid_career: "Mid-career", senior: "Senior", executive: "Executive-level" };
        summaryParts.push(stageMap[careerStage] || "");
      }
      summaryParts.push("legal professional");
      if (topCategories.length > 0) summaryParts.push(`interested in ${topCategories.slice(0, 2).join(" and ")}`);
      if (preferredLocations.length > 0) summaryParts.push(`preferring ${preferredLocations.slice(0, 2).join("/")} roles`);
      if (remotePreference === "strong") summaryParts.push("with a strong preference for remote work");
      const personaSummary = summaryParts.join(", ").replace(/,\s*,/g, ",");

      const persona = await storage.upsertUserPersona(userId, {
        topCategories,
        topSkills,
        preferredLocations,
        remotePreference,
        seniorityInterest,
        careerStage,
        engagementLevel,
        searchPatterns: uniqueSearches,
        viewedCompanies,
        personaSummary,
        totalJobViews: counts.jobViews,
        totalSearches: counts.searches,
        totalApplyClicks: counts.applyClicks,
        lastActiveAt: new Date(),
      });

      return persona;
    } catch (error) {
      console.error("Persona recompute error:", error);
      return null;
    }
  }

  // =============================================
  // Stripe Subscription Routes
  // =============================================

  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      console.error("Error getting publishable key:", error);
      res.status(500).json({ error: "Failed to get Stripe key" });
    }
  });

  app.get("/api/stripe/prices", async (req, res) => {
    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const products = await stripe.products.search({ query: "name:'Legal Tech Careers Pro'" });
      if (products.data.length === 0) {
        return res.json({ prices: [] });
      }
      const prices = await stripe.prices.list({ product: products.data[0].id, active: true });
      res.json({
        product: {
          id: products.data[0].id,
          name: products.data[0].name,
          description: products.data[0].description,
        },
        prices: prices.data.map(p => ({
          id: p.id,
          amount: p.unit_amount,
          currency: p.currency,
          interval: p.recurring?.interval,
          metadata: p.metadata,
        })),
      });
    } catch (error) {
      console.error("Error fetching prices:", error);
      res.status(500).json({ error: "Failed to fetch prices" });
    }
  });

  app.post("/api/stripe/create-checkout-session", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const subData = await storage.getUserSubscription(userId);
      let customerId = subData?.stripeCustomerId;

      if (!customerId) {
        const userEmail = user?.claims?.email;
        const customer = await stripe.customers.create({
          email: userEmail || undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.updateUserSubscription(userId, { stripeCustomerId: customerId });
      }

      const baseUrl = process.env.APP_URL || `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/pricing?success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: { userId },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout session error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/create-portal-session", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const subData = await storage.getUserSubscription(userId);
      if (!subData?.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const baseUrl = process.env.APP_URL || `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: subData.stripeCustomerId,
        return_url: `${baseUrl}/pricing`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Portal session error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  app.get("/api/stripe/subscription", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const subData = await storage.getUserSubscription(userId);
      if (!subData) {
        return res.json({ tier: "free", status: "inactive" });
      }

      let currentPeriodEnd: number | null = null;
      if (subData.stripeSubscriptionId) {
        try {
          const { getUncachableStripeClient } = await import("./stripeClient");
          const stripe = await getUncachableStripeClient();
          const sub = await stripe.subscriptions.retrieve(subData.stripeSubscriptionId);
          currentPeriodEnd = (sub as any).current_period_end;
        } catch (e) {}
      }

      res.json({
        tier: subData.subscriptionTier || "free",
        status: subData.subscriptionStatus || "inactive",
        currentPeriodEnd,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  app.post("/api/stripe/sync-subscription", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const subData = await storage.getUserSubscription(userId);
      if (!subData?.stripeCustomerId) {
        return res.json({ tier: "free", status: "inactive" });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const subscriptions = await stripe.subscriptions.list({
        customer: subData.stripeCustomerId,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const activeSub = subscriptions.data[0];
        await storage.updateUserSubscription(userId, {
          stripeSubscriptionId: activeSub.id,
          subscriptionTier: "pro",
          subscriptionStatus: "active",
        });
        return res.json({ tier: "pro", status: "active" });
      }

      const canceledSubs = await stripe.subscriptions.list({
        customer: subData.stripeCustomerId,
        status: 'canceled',
        limit: 1,
      });

      if (canceledSubs.data.length > 0) {
        await storage.updateUserSubscription(userId, {
          subscriptionTier: "free",
          subscriptionStatus: "canceled",
        });
        return res.json({ tier: "free", status: "canceled" });
      }

      await storage.updateUserSubscription(userId, {
        subscriptionTier: "free",
        subscriptionStatus: "inactive",
      });
      res.json({ tier: "free", status: "inactive" });
    } catch (error) {
      console.error("Error syncing subscription:", error);
      res.status(500).json({ error: "Failed to sync subscription" });
    }
  });

  // ==================== RESUME BUILDER ROUTES ====================

  // Get all built resumes for user
  app.get("/api/built-resumes", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const resumes = await storage.getUserBuiltResumes(userId);
      res.json(resumes);
    } catch (error) {
      console.error("Error fetching built resumes:", error);
      res.status(500).json({ error: "Failed to fetch resumes" });
    }
  });

  // Get single built resume
  app.get("/api/built-resumes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id as string);
      const resume = await storage.getBuiltResumeById(id, userId);
      if (!resume) return res.status(404).json({ error: "Resume not found" });
      res.json(resume);
    } catch (error) {
      console.error("Error fetching built resume:", error);
      res.status(500).json({ error: "Failed to fetch resume" });
    }
  });

  // Create new built resume
  app.post("/api/built-resumes", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { title, sections, templateId, targetJobId } = req.body;
      if (!title || !sections) return res.status(400).json({ error: "Title and sections are required" });
      const resume = await storage.createBuiltResume({
        userId,
        title,
        sections,
        templateId: templateId || "professional",
        targetJobId: targetJobId || null,
        isPrimary: false,
        atsScore: null,
        atsAnalysis: null,
      });
      res.json(resume);
    } catch (error) {
      console.error("Error creating built resume:", error);
      res.status(500).json({ error: "Failed to create resume" });
    }
  });

  // Update built resume
  app.patch("/api/built-resumes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id as string);
      const updated = await storage.updateBuiltResume(id, userId, req.body);
      if (!updated) return res.status(404).json({ error: "Resume not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating built resume:", error);
      res.status(500).json({ error: "Failed to update resume" });
    }
  });

  // Delete built resume
  app.delete("/api/built-resumes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id as string);
      await storage.deleteBuiltResume(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting built resume:", error);
      res.status(500).json({ error: "Failed to delete resume" });
    }
  });

  // AI-assisted section writing
  app.post("/api/built-resumes/ai-assist", isAuthenticated, requirePro, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { section, currentContent, targetJobTitle, targetJobDescription, resumeContext } = req.body;
      if (!section) return res.status(400).json({ error: "Section is required" });


      const jobContext = targetJobTitle ? `\nTarget Job: ${targetJobTitle}\nJob Description: ${(targetJobDescription || "").substring(0, 2000)}` : "";
      const existingContext = resumeContext ? `\nExisting Resume Context: ${JSON.stringify(resumeContext).substring(0, 2000)}` : "";

      const prompts: Record<string, string> = {
        summary: `Write a powerful 3-4 sentence professional summary for a legal technology professional. ${currentContent ? `Current summary to improve: "${currentContent}"` : "Write from scratch."} Focus on: quantifiable achievements, legal tech expertise, and ATS-friendly keywords. Be specific and impactful, avoiding generic language.${jobContext}${existingContext}
Return JSON: { "suggestion": "<the improved summary text>", "tips": ["<tip1>", "<tip2>", "<tip3>"] }`,
        experience_bullets: `Generate 4-5 strong resume bullet points for this role. ${currentContent ? `Current role: ${currentContent}` : ""}
Rules: Start each with a powerful action verb. Include metrics/numbers where possible. Use legal tech industry keywords. Make them ATS-friendly.${jobContext}${existingContext}
Return JSON: { "bullets": ["<bullet1>", "<bullet2>", ...], "tips": ["<tip1>", "<tip2>"] }`,
        skills: `Suggest relevant skills for a legal tech professional's resume, organized by category.${currentContent ? ` Current skills: ${currentContent}` : ""}
Focus on ATS-critical skills that legal tech employers search for. Include both technical and legal domain skills.${jobContext}${existingContext}
Return JSON: { "technical": ["<skill>", ...], "legal": ["<skill>", ...], "soft": ["<skill>", ...], "tips": ["<tip1>", "<tip2>"] }`,
        keywords: `Analyze this job and suggest critical ATS keywords the resume must include.${jobContext}
Return JSON: { "mustHave": ["<keyword>", ...], "niceToHave": ["<keyword>", ...], "industryTerms": ["<keyword>", ...], "tips": ["<tip1>", "<tip2>"] }`,
      };

      const prompt = prompts[section] || `Improve this resume section "${section}" for a legal tech professional. Current: ${currentContent || "empty"}.${jobContext}${existingContext}
Return JSON: { "suggestion": "<improved content>", "tips": ["<tip>"] }`;

      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert legal tech resume writer and career coach. Provide specific, actionable advice optimized for ATS systems. Always return valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return res.status(500).json({ error: "AI generation failed" });
      res.json(JSON.parse(content));
    } catch (error) {
      console.error("AI assist error:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // Job-specific ATS review for built resume
  app.post("/api/built-resumes/:id/ats-review", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id as string);
      const builtResume = await storage.getBuiltResumeById(id, userId);
      if (!builtResume) return res.status(404).json({ error: "Resume not found" });

      const sections = builtResume.sections as any;
      const { jobId } = req.body;
      let jobContext = "";
      let jobData: Job | undefined;

      if (jobId) {
        jobData = await storage.getJob(parseInt(jobId));
        if (jobData) {
          jobContext = `\n\nTARGET JOB (score resume against this specific job):\nTitle: ${jobData.title}\nCompany: ${jobData.company}\nDescription: ${(jobData.description || "").substring(0, 3000)}\nKey Skills: ${(jobData.keySkills || []).join(", ")}\nRequirements: ${(jobData.requirements || "").substring(0, 1500)}`;
        }
      }

      const resumeText = [
        sections.contact?.fullName,
        sections.contact?.email,
        sections.contact?.phone,
        sections.contact?.location,
        sections.summary,
        ...(sections.experience || []).map((e: any) => `${e.title} at ${e.company}: ${(e.bullets || []).join(". ")}`),
        ...(sections.education || []).map((e: any) => `${e.degree} in ${e.field} from ${e.institution}`),
        `Technical: ${(sections.skills?.technical || []).join(", ")}`,
        `Legal: ${(sections.skills?.legal || []).join(", ")}`,
        `Soft Skills: ${(sections.skills?.soft || []).join(", ")}`,
        ...(sections.certifications || []).map((c: any) => `${c.name} - ${c.issuer}`),
      ].filter(Boolean).join("\n");


      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert ATS resume analyst for legal tech careers. ${jobData ? "Score this resume SPECIFICALLY against the target job posting." : "Provide a general ATS audit."} 

Return valid JSON:
{
  "overallScore": <0-100>,
  "verdict": "<one-line verdict>",
  ${jobData ? `"jobFitScore": <0-100>,
  "jobFitVerdict": "<how well resume fits this specific job>",
  "missingJobKeywords": ["<critical keywords from job not in resume>"],
  "matchedJobKeywords": ["<keywords matching between resume and job>"],` : ""}
  "sectionScores": {
    "contact": { "score": <0-100>, "issues": ["<issue>"], "fixes": ["<fix>"] },
    "summary": { "score": <0-100>, "issues": ["<issue>"], "fixes": ["<fix>"] },
    "experience": { "score": <0-100>, "issues": ["<issue>"], "fixes": ["<fix>"] },
    "skills": { "score": <0-100>, "issues": ["<issue>"], "fixes": ["<fix>"] },
    "education": { "score": <0-100>, "issues": ["<issue>"], "fixes": ["<fix>"] }
  },
  "quickFixes": [
    { "section": "<section>", "issue": "<what's wrong>", "fix": "<exact text to add/change>", "impact": "high"|"medium"|"low" }
  ],
  "keywordAnalysis": {
    "strong": ["<keyword present>"],
    "missing": ["<keyword to add>"],
    "suggestions": ["<where to add missing keywords>"]
  },
  "scoreBreakdown": {
    "formatting": <0-25>,
    "keywords": <0-25>,
    "content": <0-25>,
    "relevance": <0-25>
  }
}`
          },
          {
            role: "user",
            content: `Analyze this resume:\n\n${resumeText.substring(0, 6000)}${jobContext}`
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return res.status(500).json({ error: "ATS review failed" });
      const analysis = JSON.parse(content);

      await storage.updateBuiltResume(id, userId, {
        atsScore: analysis.overallScore,
        atsAnalysis: analysis,
      });

      res.json(analysis);
    } catch (error) {
      console.error("Built resume ATS review error:", error);
      res.status(500).json({ error: "Failed to generate ATS review" });
    }
  });

  // Import uploaded resume into resume builder
  app.post("/api/built-resumes/import-from-upload", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { resumeId } = req.body;

      let resumeText: string | null = null;
      let extractedData: ResumeExtractedData | null = null;
      let label = "Imported Resume";

      if (resumeId) {
        const resume = await storage.getResumeWithText(parseInt(resumeId), userId);
        if (!resume) return res.status(404).json({ error: "Resume not found" });
        resumeText = resume.resumeText;
        extractedData = resume.extractedData as ResumeExtractedData;
        label = resume.label || "Imported Resume";
      } else {
        const primaryResume = await storage.getPrimaryResume(userId);
        if (!primaryResume?.resumeText) return res.status(400).json({ error: "No resume to import" });
        resumeText = primaryResume.resumeText;
        extractedData = primaryResume.extractedData as ResumeExtractedData;
      }


      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Parse this resume into structured sections. Return valid JSON:
{
  "contact": { "fullName": "", "email": "", "phone": "", "location": "", "linkedin": "", "website": "" },
  "summary": "<professional summary text>",
  "experience": [{ "id": "<unique>", "title": "", "company": "", "location": "", "startDate": "", "endDate": "", "current": false, "bullets": [""] }],
  "education": [{ "id": "<unique>", "institution": "", "degree": "", "field": "", "graduationDate": "", "honors": "" }],
  "skills": { "technical": [""], "legal": [""], "soft": [""] },
  "certifications": [{ "id": "<unique>", "name": "", "issuer": "", "date": "" }]
}
Extract as much as possible. Use IDs like "exp-1", "edu-1", "cert-1". If a section is empty, use empty arrays/strings.`
          },
          {
            role: "user",
            content: `Parse this resume:\n\nExtracted Data: ${JSON.stringify(extractedData || {}).substring(0, 3000)}\n\nFull Text:\n${(resumeText || "").substring(0, 6000)}`
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return res.status(500).json({ error: "Failed to parse resume" });
      const sections = JSON.parse(content);

      const builtResume = await storage.createBuiltResume({
        userId,
        title: label,
        sections,
        templateId: "professional",
        targetJobId: null,
        isPrimary: false,
        atsScore: null,
        atsAnalysis: null,
      });

      res.json(builtResume);
    } catch (error) {
      console.error("Import resume error:", error);
      res.status(500).json({ error: "Failed to import resume" });
    }
  });

  // Optimize resume for a specific job
  app.post("/api/built-resumes/:id/optimize-for-job", isAuthenticated, requirePro, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const id = parseInt(req.params.id as string);
      const builtResume = await storage.getBuiltResumeById(id, userId);
      if (!builtResume) return res.status(404).json({ error: "Resume not found" });

      const { jobId } = req.body;
      if (!jobId) return res.status(400).json({ error: "Job ID is required" });

      const job = await storage.getJob(parseInt(jobId));
      if (!job) return res.status(404).json({ error: "Job not found" });

      const sections = builtResume.sections as any;


      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert resume optimizer for legal tech careers. Given a resume and a target job, provide specific optimizations to tailor the resume for this job. Return valid JSON:
{
  "optimizedSummary": "<rewritten summary targeting this job>",
  "keywordInjections": [
    { "section": "summary"|"experience"|"skills", "keyword": "<keyword>", "context": "<how to naturally include it>" }
  ],
  "bulletRewrites": [
    { "experienceIndex": <0-based>, "bulletIndex": <0-based>, "original": "<current bullet>", "optimized": "<rewritten bullet for this job>" }
  ],
  "missingSkills": { "technical": ["<skill to add>"], "legal": ["<skill to add>"] },
  "overallAdvice": "<strategic advice for this specific application>",
  "estimatedScoreBoost": <estimated ATS score improvement 0-30>
}`
          },
          {
            role: "user",
            content: `Resume:\n${JSON.stringify(sections).substring(0, 4000)}\n\nTarget Job:\nTitle: ${job.title}\nCompany: ${job.company}\nDescription: ${(job.description || "").substring(0, 3000)}\nSkills: ${(job.keySkills || []).join(", ")}\nRequirements: ${(job.requirements || "").substring(0, 1500)}`
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return res.status(500).json({ error: "Optimization failed" });
      const optimizations = JSON.parse(content);

      await storage.updateBuiltResume(id, userId, { targetJobId: parseInt(jobId) });
      res.json(optimizations);
    } catch (error) {
      console.error("Optimize for job error:", error);
      res.status(500).json({ error: "Failed to optimize resume" });
    }
  });

  // --- Saved Jobs ---

  app.get("/api/saved-jobs", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    try {
      const savedJobsList = await storage.getUserSavedJobs(userId);
      res.json(savedJobsList);
    } catch (error) {
      console.error("Get saved jobs error:", error);
      res.status(500).json({ error: "Failed to get saved jobs" });
    }
  });

  app.get("/api/saved-jobs/ids", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    try {
      const ids = await storage.getUserSavedJobIds(userId);
      res.json(ids);
    } catch (error) {
      console.error("Get saved job IDs error:", error);
      res.status(500).json({ error: "Failed to get saved job IDs" });
    }
  });

  app.get("/api/saved-jobs/expiring", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    try {
      const expiring = await storage.getExpiringSavedJobs(userId, 21);
      res.json(expiring);
    } catch (error) {
      console.error("Get expiring saved jobs error:", error);
      res.status(500).json({ error: "Failed to get expiring saved jobs" });
    }
  });

  app.post("/api/saved-jobs/:jobId", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ error: "Invalid job ID" });
    try {
      const job = await storage.getJob(jobId);
      if (!job) return res.status(404).json({ error: "Job not found" });
      const saved = await storage.saveJob(userId, jobId, req.body?.notes);
      res.json(saved);
    } catch (error) {
      console.error("Save job error:", error);
      res.status(500).json({ error: "Failed to save job" });
    }
  });

  app.delete("/api/saved-jobs/:jobId", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.status(400).json({ error: "Invalid job ID" });
    try {
      await storage.unsaveJob(userId, jobId);
      res.json({ success: true });
    } catch (error) {
      console.error("Unsave job error:", error);
      res.status(500).json({ error: "Failed to unsave job" });
    }
  });

  app.post("/api/saved-jobs/:id/dismiss-reminder", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const savedJobId = parseInt(req.params.id);
    if (isNaN(savedJobId)) return res.status(400).json({ error: "Invalid ID" });
    try {
      await storage.markReminderShown(savedJobId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Dismiss reminder error:", error);
      res.status(500).json({ error: "Failed to dismiss reminder" });
    }
  });

  // Similar Jobs
  app.get("/api/jobs/:id/similar", isAuthenticated, async (req: any, res) => {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) return res.status(400).json({ error: "Invalid job ID" });
    try {
      const similar = await storage.getSimilarJobs(jobId, 4);
      res.json(similar);
    } catch (error) {
      console.error("Similar jobs error:", error);
      res.status(500).json({ error: "Failed to get similar jobs" });
    }
  });

  // Onboarding completion
  app.post("/api/onboarding/complete", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { currentRole, targetRoleTypes, experienceLevel, locationPreferences, remoteOnly } = req.body;
    try {
      const prefs = await storage.upsertUserPreferences(userId, {
        userId,
        currentRole: currentRole || null,
        targetRoleTypes: targetRoleTypes || null,
        experienceLevel: experienceLevel || null,
        locationPreferences: locationPreferences || null,
        remoteOnly: remoteOnly || false,
        onboardingCompleted: true,
      });

      // Seed persona with onboarding data
      const personaData: any = {};
      if (targetRoleTypes?.length) {
        const categoryMap: Record<string, string> = {};
        const taxonomy = (await import("@shared/schema")).JOB_TAXONOMY;
        for (const [cat, val] of Object.entries(taxonomy)) {
          for (const sub of (val as any).subcategories || []) {
            categoryMap[sub.toLowerCase()] = cat;
          }
        }
        const categories = targetRoleTypes
          .map((r: string) => {
            for (const [cat] of Object.entries(taxonomy)) {
              if (cat.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(cat.toLowerCase())) return cat;
            }
            return null;
          })
          .filter(Boolean);
        if (categories.length) personaData.topCategories = categories;
      }
      if (experienceLevel) {
        personaData.careerStage = experienceLevel;
      }
      if (locationPreferences?.length) {
        personaData.preferredLocations = locationPreferences;
      }
      if (remoteOnly) {
        personaData.remotePreference = "remote";
      }
      if (Object.keys(personaData).length) {
        personaData.userId = userId;
        await storage.upsertUserPersona(userId, personaData);
      }

      res.json({ success: true, preferences: prefs });
    } catch (error) {
      console.error("Onboarding completion error:", error);
      res.status(500).json({ error: "Failed to save onboarding" });
    }
  });

  app.get("/api/onboarding/status", isAuthenticated, async (req: any, res) => {
    try {
      const prefs = await storage.getUserPreferences(req.user.id);
      res.json({ completed: prefs?.onboardingCompleted || false });
    } catch (error) {
      res.json({ completed: false });
    }
  });

  // Run startup cleanup and start the scheduler when the server starts
  runStartupCleanup();
  startScheduler();

  return httpServer;
}
