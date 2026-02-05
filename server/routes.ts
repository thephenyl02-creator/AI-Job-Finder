import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import OpenAI from "openai";
import type { Job, JobWithScore, ResumeExtractedData, InsertJobSubmission } from "@shared/schema";
import { insertJobSubmissionSchema } from "@shared/schema";
import multer from "multer";
import {
  extractTextFromPDF,
  extractTextFromDOCX,
  parseResumeWithAI,
  generateSearchQueryFromResume,
} from "./lib/resume-parser";
import {
  scrapeAllLawFirms,
  scrapeSingleCompany,
  scrapeAllLawFirmsWithAI,
} from "./lib/law-firm-scraper";
import { LAW_FIRMS_AND_COMPANIES } from "./lib/law-firms-list";
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
    } catch (error) {
      console.error("Resume upload error:", error);
      res.status(500).json({ error: "Failed to process resume" });
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

  // Simple admin check - you can customize this allowlist
  const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];
  
  const isAdmin = (req: any): boolean => {
    const user = req.user as any;
    const email = user?.claims?.email;
    // Allow if ADMIN_EMAILS not configured (dev mode) or email is in allowlist
    return ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(email);
  };

  // Admin: Get list of companies that can be scraped
  app.get("/api/admin/scraper/companies", isAuthenticated, (req, res) => {
    if (!isAdmin(req)) {
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
    if (!isAdmin(req)) {
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

      const { inserted, updated } = await storage.bulkUpsertJobs(scrapedJobs);
      
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
    if (!isAdmin(req)) {
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

      const { inserted, updated } = await storage.bulkUpsertJobs(scrapedJobs);
      
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

  // Admin: Scrape single company
  app.post("/api/admin/scraper/company/:name", isAuthenticated, async (req, res) => {
    if (!isAdmin(req)) {
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

      const { inserted, updated } = await storage.bulkUpsertJobs(scrapedJobs);
      
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
    if (!isAdmin(req)) {
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
  // MONITORING & SCHEDULER ENDPOINTS
  // ==========================================

  // Get scheduler status and job statistics
  app.get("/api/admin/monitoring", isAuthenticated, async (req, res) => {
    if (!isAdmin(req)) {
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
    if (!isAdmin(req)) {
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
    if (!isAdmin(req)) {
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
    if (!isAdmin(req)) {
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
    if (!isAdmin(req)) {
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
    if (!isAdmin(req)) {
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
    if (!isAdmin(req)) {
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

  // Run startup cleanup and start the scheduler when the server starts
  runStartupCleanup();
  startScheduler();

  return httpServer;
}
