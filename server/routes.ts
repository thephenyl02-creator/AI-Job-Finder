import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, optionalAuth } from "./replit_integrations/auth";
import { SKILLS_SYNONYM_MAP, toTitleCase, normalizeSkill } from "./lib/skills-normalization";
import rateLimit from "express-rate-limit";
import { apiKeys } from "@shared/schema";


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
import { rewriteBulletsForJob } from "./lib/resume-rewrite";
import { resumeRewriteRuns } from "@shared/schema";
import crypto from "crypto";
import {
  scrapeAllLawFirms,
  scrapeSingleCompany,
  scrapeAllLawFirmsWithAI,
  scrapeSingleJobUrl,
  validateJobUrl,
  scrapeBulkUrls,
  discoverJobLinksFromUrl,
  isValidJobUrl,
} from "./lib/law-firm-scraper";
import { LAW_FIRMS_AND_COMPANIES } from "./lib/law-firms-list";
import { categorizeJob } from "./lib/job-categorizer";
import { extractStructuredDescription, validateStructuredDescription } from "./lib/description-extractor";
import { matchNewJobsAgainstAlerts } from "./lib/alert-matcher";
import { sendEmail, buildEmailTemplate, buildDigestContent, buildWelcomeEmailContent, buildProUpgradeEmailContent } from "./lib/email-service";
import { generateDiagnosticReport, computeAIIntensity, computeTransitionDifficulty, computeJobFitScore, batchComputeJobFits, computeJDRequirement } from "./lib/diagnostic-engine";
import { diagnosticReports, jobFitResults } from "@shared/schema";

async function extractStructuredDescriptionBackground(jobId: number, description: string, company: string, title: string) {
  try {
    const structured = await extractStructuredDescription(description, company, title);
    await storage.updateJob(jobId, { structuredDescription: structured } as any);
    console.log(`[Auto-Extract] Structured description extracted for job ${jobId}: ${title}`);
  } catch (err: any) {
    console.error(`[Auto-Extract] Failed for job ${jobId}:`, err.message);
  }
}
import { parseJobFile, parseMultipleJobsFromText } from "./lib/job-file-parser";
import { parseDescription as parseDescriptionDeterministic } from "./lib/description-parser";
import { runQAChecks, checkDuplicate } from "./lib/job-qa";
import { enforceJobDefaults } from "./lib/job-defaults";
import { generateJobHash } from "./lib/job-hash";
import { generateMarketIntelligencePDF } from "./lib/market-intelligence-pdf";
import { generateMarketIntelligenceDocx } from "./lib/market-intelligence-docx";
import { db } from "./db";
import { jobs, users, resumes, resumeEditorVersions } from "@shared/schema";
import { eq, and, sql, desc, asc, count, or, inArray, isNull, gte } from "drizzle-orm";
import { JOB_TAXONOMY, CATEGORY_TO_TRACK, getTrackForCategory } from "@shared/schema";
import {
  startScheduler,
  stopScheduler,
  isSchedulerRunning,
  runScheduledScrape,
  validateJobLinks,
  startContinuousValidation,
  stopContinuousValidation,
  getValidationStatus,
  enrichShortDescriptions,
} from "./lib/scheduled-scraper";
import { getLogFiles, readLogFile, getRecentLogs, runStartupCleanup } from "./lib/logger";
import { runDataCleanup } from "./lib/data-cleanup";
import { getSalaryBenchmarks, estimateSalary } from "./lib/salary-estimator";
import { scrapeYCCompanies } from "./lib/yc-scraper";
import { startEventScheduler, runEventDiscovery, getEventScraperStatus, checkUrlExists } from "./lib/event-scraper";

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
  const isAdmin = await storage.isUserAdmin(userId);
  if (isAdmin) {
    return next();
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

import { clearMarketIntelligenceCache, getMarketIntelligenceCache, setMarketIntelligenceCache, clearDataQualityCache, getDataQualityCache, setDataQualityCache, clearAllStatsCaches, getCanonicalStats, setCanonicalStats, getDisplayStats, setDisplayStats, clearDisplayStats, forceRefreshDisplayStats } from "./lib/mi-cache";
import { getQualityThresholds, isGenericBusinessRole, isBackOfficeTitle } from "./workers/enrichment-worker";
import { hasNegativeAiSignal } from "./lib/job-quality-patterns";
export { clearMarketIntelligenceCache, clearAllStatsCaches } from "./lib/mi-cache";

function addAttribution(data: any, userEmail?: string) {
  return {
    ...data,
    _attribution: {
      source: "lawjobs.co",
      license: "Proprietary — citation required",
      generatedFor: userEmail || "public-preview",
    },
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  app.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  app.use("/api/", (req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });

  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: (req: any) => req.user ? 300 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down.", retryAfter: 60 },
    keyGenerator: (req: any) => req.user?.id || req.ip || "unknown",
    validate: false,
  });
  app.use("/api/", globalLimiter);

  const intelligenceLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: (req: any) => req.user ? 60 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Rate limit exceeded for intelligence endpoints.", retryAfter: 60 },
    keyGenerator: (req: any) => req.user?.id || req.ip || "unknown",
    validate: false,
  });

  const jobsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: (req: any) => req.user ? 120 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Rate limit exceeded. Please slow down.", retryAfter: 60 },
    keyGenerator: (req: any) => req.user?.id || req.ip || "unknown",
    validate: false,
  });

  const publicApiPaths = new Set([
    "/api/stats", "/api/stats/social-proof", "/api/market-pulse",
    "/api/job-density", "/api/track", "/api/events", "/api/company-logo",
  ]);
  const publicApiPrefixes = ["/api/auth/", "/api/stats/", "/api/jobs", "/api/public/", "/api/quiz", "/api/search/", "/api/resume/anonymous", "/api/share/", "/api/companies"];

  async function apiKeyGuard(req: any, res: any, next: any) {
    if (req.user) return next();
    if (publicApiPaths.has(req.path)) return next();
    if (publicApiPrefixes.some(p => req.path.startsWith(p))) return next();
    if (req.path === "/api/market-intelligence") return next();
    if (req.path === "/api/company-logo" || req.path === "/company-logo") return next();

    const apiKey = req.headers["x-api-key"];
    if (apiKey) {
      const [keyRow] = await db.select().from(apiKeys).where(and(eq(apiKeys.key, apiKey), eq(apiKeys.isActive, true))).limit(1);
      if (keyRow) {
        await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, keyRow.id));
        return next();
      }
      return res.status(403).json({ error: "Invalid API key. Contact admin@lawjobs.co for API access." });
    }

    const origin = req.headers.origin || "";
    const referer = req.headers.referer || "";
    const isFromApp = origin.includes("lawjobs.co") || origin.includes("localhost") || origin.includes("replit") ||
                      referer.includes("lawjobs.co") || referer.includes("localhost") || referer.includes("replit");
    const hasCookie = req.headers.cookie && req.headers.cookie.includes("connect.sid");
    const acceptsHtml = (req.headers.accept || "").includes("text/html");

    if (isFromApp || hasCookie || acceptsHtml) return next();

    const ua = (req.headers["user-agent"] || "").toLowerCase();
    const isSocialCrawler = ua.includes("linkedinbot") || ua.includes("facebookexternalhit") ||
                            ua.includes("twitterbot") || ua.includes("slackbot") || ua.includes("whatsapp") ||
                            ua.includes("telegrambot") || ua.includes("discordbot");
    if (isSocialCrawler) return next();

    const isBotLike = !ua || ua.includes("curl") || ua.includes("wget") || ua.includes("python") ||
                      ua.includes("httpie") || ua.includes("postman") || ua.includes("insomnia") ||
                      ua.includes("bot") || ua.includes("spider") || ua.includes("scraper");

    if (isBotLike) {
      return res.status(403).json({
        error: "API access requires authorization. Contact admin@lawjobs.co for API access.",
        docs: "https://lawjobs.co/api-access",
      });
    }

    next();
  }

  app.use("/api/", apiKeyGuard);

  await storage.seedJobs();
  await storage.seedJobCategories();
  await storage.seedEvents();

  const deactivated = await storage.deactivatePastEvents();
  if (deactivated > 0) console.log(`Deactivated ${deactivated} past events`);

  setInterval(async () => {
    try {
      const count = await storage.deactivatePastEvents();
      if (count > 0) console.log(`Scheduled: Deactivated ${count} past events`);
    } catch (err) {
      console.error("Event deactivation error:", err);
    }
  }, 6 * 60 * 60 * 1000);

  (async () => {
    try {
      const result = await db.execute(sql`
        UPDATE jobs SET career_track = CASE role_category
          ${sql.join(
            Object.entries(CATEGORY_TO_TRACK).map(([cat, track]) =>
              sql`WHEN ${cat} THEN ${track}`
            ),
            sql` `
          )}
          ELSE 'Lawyer-Led'
        END
        WHERE career_track IS NULL AND role_category IS NOT NULL AND is_published = true
      `);
      const updated = (result as any).rowCount || 0;
      if (updated > 0) {
        console.log(`Track backfill: assigned career_track to ${updated} published jobs`);
      }
    } catch (err) {
      console.error("Track backfill error:", err);
    }
  })();

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

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(
      `User-agent: *\nAllow: /\nSitemap: ${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://legal-tech-careers.replit.app"}/sitemap.xml\n`
    );
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const jobs = await storage.getActiveJobs();
      const base = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://legal-tech-careers.replit.app";
      const staticPages = [
        { loc: "/", priority: "1.0", changefreq: "daily" },
        { loc: "/jobs", priority: "0.9", changefreq: "daily" },
        { loc: "/opportunity-map", priority: "0.7", changefreq: "weekly" },
        { loc: "/events", priority: "0.6", changefreq: "weekly" },
        { loc: "/about", priority: "0.4", changefreq: "monthly" },
        { loc: "/pricing", priority: "0.5", changefreq: "monthly" },
      ];
      const urls = staticPages.map(p =>
        `<url><loc>${base}${p.loc}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
      );
      for (const job of jobs.slice(0, 2000)) {
        const lastmod = job.lastCheckedAt || job.firstSeenAt || new Date().toISOString();
        urls.push(`<url><loc>${base}/jobs/${job.id}</loc><lastmod>${new Date(lastmod).toISOString().split("T")[0]}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`);
      }
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
      res.type("application/xml").send(xml);
    } catch (err) {
      console.error("Sitemap generation error:", err);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Public stats endpoint (no auth required)
  app.get("/api/stats", async (req, res) => {
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

      const cachedDQ = getDataQualityCache();
      const stableDisplay = getDisplayStats();
      const statsCanonical = stableDisplay || getCanonicalStats();
      let totalJobs: number;
      let uniqueCompanies: number;
      let uniqueCategories: number;
      let entryLevelJobs: number;
      let categoryCounts: Record<string, number> = {};

      if (cachedDQ) {
        totalJobs = statsCanonical ? statsCanonical.totalJobs : cachedDQ.curation.activeInventory;
        uniqueCompanies = statsCanonical ? statsCanonical.totalCompanies : cachedDQ.curation.uniqueCompanies;
        uniqueCategories = cachedDQ.market.categoryDistribution?.length || 0;
        entryLevelJobs = Math.round((cachedDQ.market.entryAccessiblePct / 100) * totalJobs);
        for (const cat of cachedDQ.market.categoryDistribution || []) {
          categoryCounts[cat.name] = cat.count;
        }
      } else {
        const jobs = await storage.getActiveJobs();
        totalJobs = statsCanonical ? statsCanonical.totalJobs : jobs.length;
        uniqueCompanies = statsCanonical ? statsCanonical.totalCompanies : new Set(jobs.map(j => j.company)).size;
        uniqueCategories = new Set(jobs.map(j => j.roleCategory).filter(Boolean)).size;
        entryLevelJobs = jobs.filter(j => ["Entry", "Junior", "Associate", "Intern", "Fellowship", "Mid"].includes(j.seniorityLevel || "")).length;
        for (const job of jobs) {
          if (job.roleCategory) {
            categoryCounts[job.roleCategory] = (categoryCounts[job.roleCategory] || 0) + 1;
          }
        }
        if (!statsCanonical) {
          const compCount = new Set(jobs.map(j => j.company)).size;
          const countryCount = new Set(jobs.map(j => j.countryCode).filter(c => c && c !== 'WW' && c !== 'UN')).size;
          setCanonicalStats(jobs.length, compCount, countryCount);
          setDisplayStats(jobs.length, compCount, countryCount);
        }
      }

      const catSum = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
      if (catSum > 0 && catSum !== totalJobs) {
        const entries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
        let scaled: Record<string, number> = {};
        let allocated = 0;
        for (const [cat, cnt] of entries) {
          scaled[cat] = Math.max(1, Math.floor((cnt / catSum) * totalJobs));
          allocated += scaled[cat];
        }
        let remainder = totalJobs - allocated;
        const fractionals = entries.map(([cat, cnt]) => ({ cat, frac: ((cnt / catSum) * totalJobs) - Math.floor((cnt / catSum) * totalJobs) })).sort((a, b) => b.frac - a.frac);
        for (const { cat } of fractionals) {
          if (remainder <= 0) break;
          scaled[cat]++;
          remainder--;
        }
        categoryCounts = scaled;
      }

      const allEvents = await storage.getEvents();
      const upcomingEvents = allEvents.filter(e => new Date(e.startDate) >= new Date()).length;
      const [{ total: totalUsersCount }] = await db.select({ total: count() }).from(users);
      res.json({
        totalJobs,
        totalCompanies: uniqueCompanies,
        totalCategories: uniqueCategories,
        entryLevelJobs,
        totalEvents: allEvents.length,
        upcomingEvents,
        categoryCounts,
        totalUsers: Number(totalUsersCount),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const logoCache = new Map<string, { data: Buffer; contentType: string; fetchedAt: number; is404?: boolean }>();
  const LOGO_TTL = 7 * 24 * 60 * 60 * 1000;
  const LOGO_404_TTL = 60 * 60 * 1000;

  app.get("/api/company-logo", async (req, res) => {
    try {
      const domain = req.query.domain as string;
      if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) {
        return res.status(400).send("Invalid domain");
      }

      const cached = logoCache.get(domain);
      if (cached) {
        const ttl = cached.is404 ? LOGO_404_TTL : LOGO_TTL;
        if (Date.now() - cached.fetchedAt < ttl) {
          if (cached.is404) return res.status(404).send("Not found");
          res.setHeader("Content-Type", cached.contentType);
          res.setHeader("Cache-Control", "public, max-age=604800, immutable");
          return res.send(cached.data);
        }
      }

      let buffer: Buffer | null = null;
      let contentType = "image/png";

      try {
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        const response = await fetch(faviconUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          buffer = Buffer.from(await response.arrayBuffer());
          contentType = response.headers.get("Content-Type") || "image/png";
        }
      } catch {}

      if (!buffer) {
        try {
          const directUrl = `https://${domain}/favicon.ico`;
          const directResponse = await fetch(directUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(5000),
            redirect: "follow",
          });
          if (directResponse.ok) {
            const ct = directResponse.headers.get("Content-Type") || "";
            if (ct.includes("image") || ct.includes("icon") || ct.includes("octet-stream")) {
              buffer = Buffer.from(await directResponse.arrayBuffer());
              contentType = ct.includes("icon") ? "image/x-icon" : ct || "image/x-icon";
            }
          }
        } catch {}
      }

      if (!buffer) {
        logoCache.set(domain, { data: Buffer.alloc(0), contentType: "", fetchedAt: Date.now(), is404: true });
        return res.status(404).send("Not found");
      }

      logoCache.set(domain, { data: buffer, contentType, fetchedAt: Date.now() });

      if (logoCache.size > 500) {
        const oldest = [...logoCache.entries()].sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
        for (let i = 0; i < 100; i++) logoCache.delete(oldest[i][0]);
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      res.send(buffer);
    } catch (error) {
      res.status(404).send("Not found");
    }
  });

  app.get("/api/companies", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const search = (req.query.search as string) || undefined;
      const result = await storage.getCompanyDirectory(page, search);
      res.json(result);
    } catch (error) {
      console.error("Error fetching company directory:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.get("/api/companies/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const profile = await storage.getCompanyProfile(slug);
      if (!profile) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching company profile:", error);
      res.status(500).json({ error: "Failed to fetch company profile" });
    }
  });

  app.get("/api/stats/data-quality", async (_req, res) => {
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      const cachedDQ = getDataQualityCache();
      if (cachedDQ) {
        return res.json(cachedDQ);
      }

      const allJobs = await db.select({
        id: jobs.id,
        isPublished: jobs.isPublished,
        isActive: jobs.isActive,
        jobStatus: jobs.jobStatus,
        pipelineStatus: jobs.pipelineStatus,
        qualityScore: jobs.qualityScore,
        legalRelevanceScore: jobs.legalRelevanceScore,
        reviewReasonCode: jobs.reviewReasonCode,
        roleCategory: jobs.roleCategory,
        seniorityLevel: jobs.seniorityLevel,
        careerTrack: jobs.careerTrack,
        countryCode: jobs.countryCode,
        locationRegion: jobs.locationRegion,
        company: jobs.company,
        source: jobs.source,
        salaryMin: jobs.salaryMin,
      }).from(jobs);

      const pipelinePassed = allJobs.filter(j => j.pipelineStatus === 'ready');
      const activeInventory = allJobs.filter(j => j.isPublished && j.isActive && j.pipelineStatus === 'ready' && j.jobStatus === 'open');
      const rejected = allJobs.filter(j => j.pipelineStatus === 'rejected');
      const inReview = allJobs.filter(j => j.pipelineStatus === 'review');

      const qualityScores = activeInventory.filter(j => j.qualityScore !== null).map(j => j.qualityScore as number);
      const relevanceScores = activeInventory.filter(j => j.legalRelevanceScore !== null).map(j => j.legalRelevanceScore as number);
      const avgQuality = qualityScores.length ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length * 10) / 10 : 0;
      const avgRelevance = relevanceScores.length ? Math.round(relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length * 10) / 10 : 0;

      const qualityTiers = {
        excellent: qualityScores.filter(s => s >= 90).length,
        veryGood: qualityScores.filter(s => s >= 80 && s < 90).length,
        good: qualityScores.filter(s => s >= 70 && s < 80).length,
        adequate: qualityScores.filter(s => s < 70).length,
      };

      const reasonCounts: Record<string, number> = {};
      for (const j of rejected) {
        if (j.reviewReasonCode) {
          reasonCounts[j.reviewReasonCode] = (reasonCounts[j.reviewReasonCode] || 0) + 1;
        }
      }
      const REASON_LABELS: Record<string, string> = {
        LOW_RELEVANCE: "Low Legal Tech Relevance",
        IRRELEVANT_TITLE: "Non-Legal-Tech Title",
        AUDIT_LOW_RELEVANCE: "Failed Quality Audit",
        GENERIC_BUSINESS_ROLE: "Generic Business Role",
        AUDIT_TITLE_REJECT: "Title Screened Out",
        GARBAGE_DESCRIPTION: "Poor Description Quality",
        LOW_RELEVANCE_SCORE: "Below Relevance Threshold",
        AUDIT_COMPANY_REJECT: "Non-Legal-Tech Company",
        AI_FLAGGED_IRRELEVANT: "Flagged as Irrelevant",
        NEAR_DUPLICATE: "Near Duplicate",
      };
      const rejectionBreakdown = Object.entries(reasonCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([code, count]) => ({
          reason: REASON_LABELS[code] || code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          count,
        }));

      const categoryDistribution: Record<string, number> = {};
      for (const j of activeInventory) {
        if (j.roleCategory) {
          categoryDistribution[j.roleCategory] = (categoryDistribution[j.roleCategory] || 0) + 1;
        }
      }

      const trackDistribution: Record<string, number> = {};
      for (const j of activeInventory) {
        if (j.careerTrack) {
          trackDistribution[j.careerTrack] = (trackDistribution[j.careerTrack] || 0) + 1;
        }
      }

      let uniqueCompanies: number;
      let uniqueCountries: number;
      const uniqueSources = new Set(activeInventory.map(j => j.source).filter(Boolean)).size;
      const uniqueRegions = new Set(activeInventory.map(j => j.locationRegion).filter(Boolean)).size;

      const existingDisplay = getDisplayStats();
      const existingCanonical = existingDisplay || getCanonicalStats();
      if (existingCanonical) {
        uniqueCompanies = existingCanonical.totalCompanies;
        uniqueCountries = existingCanonical.totalCountries;
      } else {
        uniqueCompanies = new Set(activeInventory.map(j => j.company)).size;
        uniqueCountries = new Set(activeInventory.map(j => j.countryCode).filter(c => c && c !== 'WW' && c !== 'UN')).size;
        setCanonicalStats(activeInventory.length, uniqueCompanies, uniqueCountries);
        setDisplayStats(activeInventory.length, uniqueCompanies, uniqueCountries);
      }

      const entryLevel = activeInventory.filter(j => ['Entry', 'Junior', 'Associate', 'Intern', 'Fellowship', 'Mid'].includes(j.seniorityLevel || '')).length;
      const entryAccessiblePct = activeInventory.length ? Math.round((entryLevel / activeInventory.length) * 100) : 0;
      const withSalary = activeInventory.filter(j => j.salaryMin !== null).length;
      const salaryTransparencyPct = activeInventory.length ? Math.round((withSalary / activeInventory.length) * 100) : 0;

      const relevanceDist: Record<number, number> = {};
      for (const s of relevanceScores) {
        relevanceDist[s] = (relevanceDist[s] || 0) + 1;
      }

      const total = allJobs.length || 1;
      const publishedPct = Math.round((pipelinePassed.length / total) * 100);
      const rejectedPct = Math.round((rejected.length / total) * 100);
      const inReviewPct = Math.round((inReview.length / total) * 100);
      const displayStatsCount = getDisplayStats();
      const canonicalCount = displayStatsCount ? displayStatsCount.totalJobs : (existingCanonical ? existingCanonical.totalJobs : activeInventory.length);
      const activeLen = canonicalCount || 1;

      const result = {
        curation: {
          totalScreened: allJobs.length,
          totalPublished: pipelinePassed.length,
          passRate: publishedPct,
          totalRejected: rejected.length,
          rejectedPct,
          totalInReview: inReview.length,
          inReviewPct,
          filterCategories: 17,
          uniqueCompanies,
          uniqueSources,
          activeInventory: canonicalCount,
        },
        quality: {
          avgQualityScore: avgQuality,
          avgRelevanceScore: avgRelevance,
          qualityTiers,
          relevanceDistribution: relevanceDist,
          totalWithQualityScore: qualityScores.length,
        },
        rejectionBreakdown,
        market: {
          categoryDistribution: Object.entries(categoryDistribution)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count, percentage: Math.round((count / activeLen) * 100) })),
          trackDistribution: Object.entries(trackDistribution)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count, percentage: Math.round((count / activeLen) * 100) })),
          entryAccessiblePct,
          salaryTransparencyPct,
          uniqueCountries,
          uniqueRegions,
        },
        generatedAt: new Date().toISOString(),
      };

      setDataQualityCache(result);
      res.json(result);
    } catch (error) {
      console.error("Error fetching data quality stats:", error);
      res.status(500).json({ error: "Failed to fetch data quality stats" });
    }
  });

  app.get("/api/meta/refresh", async (_req, res) => {
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [verified24h] = await db.select({ total: count() }).from(jobs)
        .where(and(
          eq(jobs.isPublished, true),
          eq(jobs.isActive, true),
          eq(jobs.pipelineStatus, 'ready'),
          eq(jobs.jobStatus, 'open'),
          sql`${jobs.lastCheckedAt} >= ${oneDayAgo}`
        ));

      const [added7d] = await db.select({ total: count() }).from(jobs)
        .where(and(
          eq(jobs.isPublished, true),
          eq(jobs.isActive, true),
          eq(jobs.pipelineStatus, 'ready'),
          eq(jobs.jobStatus, 'open'),
          sql`${jobs.firstSeenAt} >= ${sevenDaysAgo}`
        ));

      const [lastScrape] = await db.select({ latest: sql`MAX(${jobs.lastCheckedAt})` }).from(jobs)
        .where(and(eq(jobs.isPublished, true), eq(jobs.isActive, true), eq(jobs.pipelineStatus, 'ready'), eq(jobs.jobStatus, 'open')));

      res.json({
        lastScrapeRunAt: lastScrape?.latest || null,
        jobsVerifiedLast24h: Number(verified24h?.total || 0),
        jobsAddedLast7d: Number(added7d?.total || 0),
      });
    } catch (error) {
      console.error("Error fetching refresh meta:", error);
      res.status(500).json({ error: "Failed to fetch refresh stats" });
    }
  });

  app.get("/api/stats/social-proof", async (_req, res) => {
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      const [{ total: totalUsersCount }] = await db.select({ total: count() }).from(users);
      const [{ total: diagnosticsCount }] = await db.select({ total: count() }).from(diagnosticReports);

      const spDisplay = getDisplayStats();
      const spCanonical = spDisplay || getCanonicalStats();
      let jobsCurated: number;
      let companiesTracked: number;
      if (spCanonical) {
        jobsCurated = spCanonical.totalJobs;
        companiesTracked = spCanonical.totalCompanies;
      } else {
        const cachedDQ = getDataQualityCache();
        if (cachedDQ) {
          jobsCurated = cachedDQ.curation.activeInventory;
          companiesTracked = cachedDQ.curation.uniqueCompanies;
        } else {
          const activeJobs = await storage.getActiveJobs();
          jobsCurated = activeJobs.length;
          companiesTracked = new Set(activeJobs.map(j => j.company)).size;
          const countryCount = new Set(activeJobs.map(j => j.countryCode).filter(c => c && c !== 'WW' && c !== 'UN')).size;
          setCanonicalStats(jobsCurated, companiesTracked, countryCount);
          setDisplayStats(jobsCurated, companiesTracked, countryCount);
        }
      }

      res.json({
        diagnosticsRun: Number(diagnosticsCount),
        totalUsers: Number(totalUsersCount),
        jobsCurated,
        companiesTracked,
      });
    } catch (error) {
      console.error("Error fetching social proof:", error);
      res.status(500).json({ error: "Failed to fetch social proof" });
    }
  });

  app.post("/api/admin/api-keys", isAuthenticated, async (req: any, res) => {
    const user = req.user as any;
    if (!user?.isAdmin) return res.status(403).json({ error: "Admin access required" });
    const { label } = req.body;
    if (!label) return res.status(400).json({ error: "Label is required" });
    const key = crypto.randomBytes(32).toString("hex");
    await db.insert(apiKeys).values({ key, label, createdBy: user.email });
    res.json({ key, label, message: "API key created. Store it securely — it won't be shown again." });
  });

  app.get("/api/admin/api-keys", isAuthenticated, async (req: any, res) => {
    const user = req.user as any;
    if (!user?.isAdmin) return res.status(403).json({ error: "Admin access required" });
    const keys = await db.select({
      id: apiKeys.id,
      label: apiKeys.label,
      createdBy: apiKeys.createdBy,
      isActive: apiKeys.isActive,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      keyPreview: sql<string>`'...' || RIGHT(${apiKeys.key}, 8)`,
    }).from(apiKeys).orderBy(desc(apiKeys.createdAt));
    res.json(keys);
  });

  app.patch("/api/admin/api-keys/:id", isAuthenticated, async (req: any, res) => {
    const user = req.user as any;
    if (!user?.isAdmin) return res.status(403).json({ error: "Admin access required" });
    const id = parseInt(req.params.id);
    const { isActive } = req.body;
    await db.update(apiKeys).set({ isActive }).where(eq(apiKeys.id, id));
    res.json({ success: true });
  });

  app.get("/api/stats/historical", optionalAuth, async (_req: any, res) => {
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      const allJobs = await db.select({
        id: jobs.id,
        isActive: jobs.isActive,
        isPublished: jobs.isPublished,
        jobStatus: jobs.jobStatus,
        roleCategory: jobs.roleCategory,
        firstSeenAt: jobs.firstSeenAt,
        publishedAt: jobs.publishedAt,
        closedAt: jobs.closedAt,
        company: jobs.company,
        workMode: jobs.workMode,
        keySkills: jobs.keySkills,
        seniorityLevel: jobs.seniorityLevel,
        countryCode: jobs.countryCode,
        countryName: jobs.countryName,
      }).from(jobs).where(
        and(
          eq(jobs.isPublished, true),
          eq(jobs.isActive, true),
          eq(jobs.pipelineStatus, 'ready'),
          eq(jobs.jobStatus, 'open'),
        )
      );

      const [{ total: totalScreenedCount }] = await db.select({ total: count() }).from(jobs);

      const histDisplay = getDisplayStats();
      const histCanonical = histDisplay || getCanonicalStats();
      const cachedDQ = getDataQualityCache();
      const totalTracked = histCanonical ? histCanonical.totalJobs : (cachedDQ ? cachedDQ.curation.activeInventory : allJobs.length);
      const totalActive = totalTracked;
      const totalArchived = 0;

      const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const jobsByMonth: Record<string, number> = {};
      const publishedByMonth: Record<string, number> = {};
      const archivedByMonth: Record<string, number> = {};
      const categoryByMonth: Record<string, Record<string, number>> = {};
      const companyByMonth: Record<string, Record<string, number>> = {};
      const workModeByMonth: Record<string, Record<string, number>> = {};
      const skillsByMonth: Record<string, Record<string, number>> = {};
      const seniorityByMonth: Record<string, Record<string, number>> = {};
      const geographyByMonth: Record<string, Record<string, number>> = {};

      for (const job of allJobs) {
        const seen = job.firstSeenAt;
        if (!seen) continue;
        const key = monthKey(seen);

        jobsByMonth[key] = (jobsByMonth[key] || 0) + 1;

        if (job.roleCategory) {
          if (!categoryByMonth[key]) categoryByMonth[key] = {};
          categoryByMonth[key][job.roleCategory] = (categoryByMonth[key][job.roleCategory] || 0) + 1;
        }

        if (job.company) {
          if (!companyByMonth[key]) companyByMonth[key] = {};
          companyByMonth[key][job.company] = (companyByMonth[key][job.company] || 0) + 1;
        }

        if (job.workMode) {
          if (!workModeByMonth[key]) workModeByMonth[key] = {};
          workModeByMonth[key][job.workMode] = (workModeByMonth[key][job.workMode] || 0) + 1;
        }

        if (job.keySkills && Array.isArray(job.keySkills)) {
          if (!skillsByMonth[key]) skillsByMonth[key] = {};
          for (const skill of job.keySkills.slice(0, 5)) {
            const raw = skill.toLowerCase().trim();
            if (!raw) continue;
            const normalized = SKILLS_SYNONYM_MAP[raw] || raw;
            const display = toTitleCase(normalized);
            skillsByMonth[key][display] = (skillsByMonth[key][display] || 0) + 1;
          }
        }

        if (job.seniorityLevel) {
          if (!seniorityByMonth[key]) seniorityByMonth[key] = {};
          seniorityByMonth[key][job.seniorityLevel] = (seniorityByMonth[key][job.seniorityLevel] || 0) + 1;
        }

        if (job.countryName) {
          if (!geographyByMonth[key]) geographyByMonth[key] = {};
          geographyByMonth[key][job.countryName] = (geographyByMonth[key][job.countryName] || 0) + 1;
        }
      }

      for (const job of allJobs) {
        if (job.publishedAt) {
          const key = monthKey(job.publishedAt);
          publishedByMonth[key] = (publishedByMonth[key] || 0) + 1;
        }
        if (job.closedAt) {
          const key = monthKey(job.closedAt);
          archivedByMonth[key] = (archivedByMonth[key] || 0) + 1;
        }
      }

      const topCompanyByMonth: Record<string, { name: string; count: number }[]> = {};
      for (const [month, companies] of Object.entries(companyByMonth)) {
        topCompanyByMonth[month] = Object.entries(companies)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));
      }

      const topSkillsByMonth: Record<string, { name: string; count: number }[]> = {};
      for (const [month, skills] of Object.entries(skillsByMonth)) {
        topSkillsByMonth[month] = Object.entries(skills)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));
      }

      const topGeographyByMonth: Record<string, { name: string; count: number }[]> = {};
      for (const [month, countries] of Object.entries(geographyByMonth)) {
        topGeographyByMonth[month] = Object.entries(countries)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));
      }

      let userIsPro = false;
      const userId = (_req as any).user?.id;
      if (userId) {
        const isAdmin = await storage.isUserAdmin(userId);
        if (isAdmin) {
          userIsPro = true;
        } else {
          const subData = await storage.getUserSubscription(userId);
          if (subData?.subscriptionTier === "pro" && subData?.subscriptionStatus === "active") {
            userIsPro = true;
          }
        }
      }

      const limitMonths = <T,>(data: Record<string, T>, limit: number): Record<string, T> => {
        const keys = Object.keys(data).sort();
        const recent = keys.slice(-limit);
        const result: Record<string, T> = {};
        for (const k of recent) result[k] = data[k];
        return result;
      };

      const monthLimit = userIsPro ? Infinity : 2;
      const jbm = monthLimit === Infinity ? jobsByMonth : limitMonths(jobsByMonth, monthLimit);
      const pbm = monthLimit === Infinity ? publishedByMonth : limitMonths(publishedByMonth, monthLimit);
      const abm = monthLimit === Infinity ? archivedByMonth : limitMonths(archivedByMonth, monthLimit);
      const cbm = monthLimit === Infinity ? categoryByMonth : limitMonths(categoryByMonth, monthLimit);
      const wbm = monthLimit === Infinity ? workModeByMonth : limitMonths(workModeByMonth, monthLimit);
      const sbm = monthLimit === Infinity ? seniorityByMonth : limitMonths(seniorityByMonth, monthLimit);
      const tcbm = monthLimit === Infinity ? topCompanyByMonth : limitMonths(topCompanyByMonth, monthLimit);
      const tsbm = monthLimit === Infinity ? topSkillsByMonth : limitMonths(topSkillsByMonth, monthLimit);
      const tgbm = monthLimit === Infinity ? topGeographyByMonth : limitMonths(topGeographyByMonth, monthLimit);

      res.json({
        totalTracked,
        totalEverScreened: Number(totalScreenedCount),
        totalActive,
        totalArchived,
        jobsByMonth: jbm,
        publishedByMonth: pbm,
        archivedByMonth: abm,
        categoryByMonth: cbm,
        workModeByMonth: wbm,
        seniorityByMonth: sbm,
        companyTrends: tcbm,
        skillTrends: tsbm,
        geographyTrends: tgbm,
        limited: !userIsPro,
      });
    } catch (error) {
      console.error("Error fetching historical stats:", error);
      res.status(500).json({ error: "Failed to fetch historical stats" });
    }
  });

  app.get("/api/salary-ranges", async (_req, res) => {
    try {
      const benchmarks = await getSalaryBenchmarks();
      res.json({ benchmarks, _attribution: "Legal Tech Careers" });
    } catch (error: any) {
      console.error("Error fetching salary ranges:", error);
      res.status(500).json({ error: "Failed to fetch salary ranges" });
    }
  });

  app.get("/api/market-pulse", optionalAuth, async (req: any, res) => {
    try {
      let topCategory: string | undefined;
      if (req.user?.id) {
        const latestDiag = await db.select().from(diagnosticReports)
          .where(eq(diagnosticReports.userId, req.user.id))
          .orderBy(desc(diagnosticReports.createdAt))
          .limit(1);
        if (latestDiag.length > 0 && latestDiag[0].reportJson) {
          const report = latestDiag[0].reportJson as any;
          const topPath = report?.careerPaths?.[0];
          if (topPath?.title) {
            topCategory = topPath.title;
          }
        }
      }
      const pulse = await storage.getMarketPulse(topCategory);
      const pulseDisplay = getDisplayStats();
      const pulseCanonical = pulseDisplay || getCanonicalStats();
      if (pulseCanonical) {
        pulse.totalJobs = pulseCanonical.totalJobs;
      } else {
        const cachedDQ = getDataQualityCache();
        if (cachedDQ) {
          pulse.totalJobs = cachedDQ.curation.activeInventory;
        }
      }
      const wmsSum = pulse.workModeSplit.remote + pulse.workModeSplit.hybrid + pulse.workModeSplit.onsite;
      if (wmsSum > 0 && wmsSum !== pulse.totalJobs) {
        const raw = [
          { key: 'remote' as const, val: pulse.workModeSplit.remote },
          { key: 'hybrid' as const, val: pulse.workModeSplit.hybrid },
          { key: 'onsite' as const, val: pulse.workModeSplit.onsite },
        ].sort((a, b) => b.val - a.val);
        const result: Record<string, number> = {};
        let allocated = 0;
        for (const { key, val } of raw) {
          result[key] = Math.max(0, Math.floor((val / wmsSum) * pulse.totalJobs));
          allocated += result[key];
        }
        let remainder = pulse.totalJobs - allocated;
        const byFrac = raw.map(({ key, val }) => ({ key, frac: ((val / wmsSum) * pulse.totalJobs) - Math.floor((val / wmsSum) * pulse.totalJobs) })).sort((a, b) => b.frac - a.frac);
        for (const { key } of byFrac) {
          if (remainder <= 0) break;
          result[key]++;
          remainder--;
        }
        pulse.workModeSplit = { remote: result.remote, hybrid: result.hybrid, onsite: result.onsite };
      }
      res.json(pulse);
    } catch (error) {
      console.error("Error fetching market pulse:", error);
      res.status(500).json({ error: "Failed to fetch market pulse" });
    }
  });

  const VALID_ANON_EVENTS = ["landing_cta_click", "quiz_completion", "anon_diagnostic_upload", "landing_page_view", "pricing_page_view", "report_download"];
  app.post("/api/track", async (req, res) => {
    try {
      const { eventType, metadata } = req.body;
      if (!eventType || !VALID_ANON_EVENTS.includes(eventType)) {
        return res.status(400).json({ error: "Invalid event type" });
      }
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
      const hashedIp = crypto.createHash("sha256").update(ip + (process.env.SESSION_SECRET || "salt")).digest("hex").slice(0, 16);
      await storage.trackAnonymousEvent(eventType, hashedIp, metadata || null);
      res.json({ ok: true });
    } catch (error) {
      console.error("Track event error:", error);
      res.status(500).json({ error: "Failed to track event" });
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

      const shuffled = [...jobs];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const seenCompanies = new Set<string>();
      const seenCategories = new Set<string>();
      const featured: typeof jobs = [];

      for (const job of shuffled) {
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
        for (const job of shuffled) {
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
        locationType: j.locationType || (j.isRemote ? 'remote' : 'onsite'),
        roleCategory: j.roleCategory,
        seniorityLevel: j.seniorityLevel,
      })));
    } catch (error) {
      console.error("Error fetching featured jobs:", error);
      res.status(500).json({ error: "Failed to fetch featured jobs" });
    }
  });

  app.get("/api/public/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid job ID" });
      const job = await storage.getPublicJob(id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      res.json(job);
    } catch (error) {
      console.error("Error fetching public job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  app.post("/api/jobs/:id/report", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id as string);
      if (isNaN(jobId)) return res.status(400).json({ error: "Invalid job ID" });
      const job = await storage.getPublicJob(jobId);
      if (!job) return res.status(404).json({ error: "Job not found" });
      const schema = z.object({
        reportType: z.enum(["broken_link", "duplicate", "wrong_category", "outdated", "spam"]),
        details: z.string().max(1000).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid report data" });
      const userId = (req as any).user?.id || null;
      const report = await storage.createJobReport({
        jobId,
        reporterUserId: userId,
        reportType: parsed.data.reportType,
        details: parsed.data.details || null,
        status: "new",
      });
      res.json(report);
    } catch (error) {
      console.error("Error creating job report:", error);
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  app.get("/api/admin/reports", isAuthenticated, async (req: any, res) => {
    try {
      const isAdmin = await storage.isUserAdmin(req.user.id);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
      const status = req.query.status as string | undefined;
      const reports = await storage.getJobReports(status);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.patch("/api/admin/reports/:id", isAuthenticated, async (req: any, res) => {
    try {
      const isAdmin = await storage.isUserAdmin(req.user.id);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid report ID" });
      const schema = z.object({
        status: z.enum(["new", "reviewed", "resolved"]),
        adminNotes: z.string().max(2000).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
      const updated = await storage.updateJobReportStatus(id, parsed.data.status, parsed.data.adminNotes);
      if (!updated) return res.status(404).json({ error: "Report not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: "Failed to update report" });
    }
  });

  app.get("/api/jobs", jobsLimiter, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1')));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'))));
      const filters: { category?: string; location?: string; locationType?: string; search?: string; seniority?: string; sort?: string; region?: string; country?: string; workMode?: string; track?: string } = {};
      if (req.query.category) filters.category = String(req.query.category);
      if (req.query.location) filters.location = String(req.query.location);
      if (req.query.locationType) filters.locationType = String(req.query.locationType);
      if (req.query.search) filters.search = String(req.query.search);
      if (req.query.seniority) filters.seniority = String(req.query.seniority);
      if (req.query.region) filters.region = String(req.query.region);
      if (req.query.country) filters.country = String(req.query.country);
      if (req.query.workMode) filters.workMode = String(req.query.workMode);
      if (req.query.track) filters.track = String(req.query.track);
      if (req.query.sort && ['newest', 'salary', 'company'].includes(String(req.query.sort))) {
        filters.sort = String(req.query.sort);
      }

      const result = await storage.getPublishedJobsPaginated(page, limit, filters);
      const hasFilters = filters.category || filters.location || filters.locationType || filters.search || filters.seniority || filters.region || filters.country || (filters.workMode && filters.workMode !== 'all') || filters.track;
      const jobsDisplay = getDisplayStats();
      const jobsCanonical = jobsDisplay || getCanonicalStats();
      if (!hasFilters) {
        if (jobsCanonical) {
          result.total = jobsCanonical.totalJobs;
          result.totalPages = Math.ceil(result.total / limit);
        }
      }
      const response: any = result;
      if (jobsCanonical) {
        response.stabilizedTotal = jobsCanonical.totalJobs;
      }
      res.json(response);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  const socialSignalsCache = new Map<string, { data: Record<number, { viewCount: number; savedCount: number }>; expiresAt: number }>();
  const SOCIAL_SIGNALS_TTL = 30 * 60 * 1000;

  app.get("/api/jobs/social-signals", isAuthenticated, async (req: any, res) => {
    try {
      const idsParam = req.query.ids as string;
      if (!idsParam) {
        return res.status(400).json({ error: "Missing ids parameter" });
      }
      const jobIds = idsParam.split(",").map(Number).filter(n => !isNaN(n) && n > 0).slice(0, 50);
      if (jobIds.length === 0) {
        return res.json({ signals: {} });
      }

      const cacheKey = jobIds.sort((a, b) => a - b).join(",");
      const cached = socialSignalsCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        res.set("Cache-Control", "private, max-age=1800");
        return res.json({ signals: cached.data });
      }

      const signals = await storage.getJobSocialSignals(jobIds);
      socialSignalsCache.set(cacheKey, { data: signals, expiresAt: Date.now() + SOCIAL_SIGNALS_TTL });

      if (socialSignalsCache.size > 200) {
        const now = Date.now();
        const keys = Array.from(socialSignalsCache.keys());
        for (const key of keys) {
          const val = socialSignalsCache.get(key);
          if (val && val.expiresAt < now) socialSignalsCache.delete(key);
        }
      }

      res.set("Cache-Control", "private, max-age=1800");
      res.json({ signals });
    } catch (error) {
      console.error("Error fetching social signals:", error);
      res.status(500).json({ error: "Failed to fetch social signals" });
    }
  });

  app.get("/api/jobs/locations", async (req, res) => {
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

  app.get("/api/job-density", async (req, res) => {
    try {
      const conditions: any[] = [
        eq(jobs.isActive, true),
        eq(jobs.isPublished, true),
        eq(jobs.pipelineStatus, 'ready'),
        eq(jobs.jobStatus, 'open'),
      ];

      const allMatchingJobs = await db.select({
        countryCode: jobs.countryCode,
        countryName: jobs.countryName,
        workMode: jobs.workMode,
        roleCategory: jobs.roleCategory,
        company: jobs.company,
      }).from(jobs).where(and(...conditions));

      const byCountry: Record<string, { countryCode: string; countryName: string; jobCount: number; categories: Record<string, number> }> = {};
      const categoryCount: Record<string, number> = {};
      const companyCount: Record<string, number> = {};
      let remoteCount = 0;

      for (const job of allMatchingJobs) {
        const cc = job.countryCode || 'UN';
        const cn = job.countryName || 'Unknown';

        if (!byCountry[cc]) {
          byCountry[cc] = { countryCode: cc, countryName: cn, jobCount: 0, categories: {} };
        }
        byCountry[cc].jobCount++;

        if (job.roleCategory) {
          byCountry[cc].categories[job.roleCategory] = (byCountry[cc].categories[job.roleCategory] || 0) + 1;
          categoryCount[job.roleCategory] = (categoryCount[job.roleCategory] || 0) + 1;
        }

        if (job.company) {
          companyCount[job.company] = (companyCount[job.company] || 0) + 1;
        }

        if (job.workMode === 'remote' || cc === 'WW') {
          remoteCount++;
        }
      }

      const countriesData = Object.values(byCountry)
        .map(c => ({
          countryCode: c.countryCode,
          countryName: c.countryName,
          jobCount: c.jobCount,
          topCategories: Object.entries(c.categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name]) => name),
        }))
        .sort((a, b) => b.jobCount - a.jobCount);

      const topCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      const topCompaniesRaw = Object.entries(companyCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

      const COMPANY_DOMAINS: Record<string, string> = {
        'Harvey AI': 'harvey.ai',
        'Anthropic': 'anthropic.com',
        'Thomson Reuters': 'thomsonreuters.com',
        'Rocket Lawyer': 'rocketlawyer.com',
        'Eve Legal': 'eve.legal',
        'McDermott Will & Emery': 'mwe.com',
        'LexisNexis': 'lexisnexis.com',
        'NetDocuments': 'netdocuments.com',
        'Axiom': 'axiomlaw.com',
        'Legora': 'legora.com',
        'Celonis': 'celonis.com',
        'Everlaw': 'everlaw.com',
        'Exiger': 'exiger.com',
        'Clio': 'clio.com',
        'Appian': 'appian.com',
        'Mitratech': 'mitratech.com',
        'PandaDoc': 'pandadoc.com',
        'Filevine': 'filevine.com',
        'Factor': 'factor.law',
        'Factor (Axiom)': 'factor.law',
        'Conga': 'conga.com',
        'Ironclad': 'ironcladapp.com',
        'SimpleLegal': 'simplelegal.com',
        'Brightflag': 'brightflag.com',
        'Onit': 'onit.com',
        'Spellbook': 'spellbook.legal',
        'Lawhive': 'lawhive.co.uk',
        'LogicGate': 'logicgate.com',
        'Epiq Global': 'epiqglobal.com',
        'Palantir': 'palantir.com',
        'Hebbia': 'hebbia.ai',
        'Wolters Kluwer': 'wolterskluwer.com',
        'OneTrust': 'onetrust.com',
        'OneSpan': 'onespan.com',
        'MarqVision': 'marqvision.com',
        'DISCO': 'csdisco.com',
        'Checkbox': 'checkbox.ai',
        'ACLU': 'aclu.org',
        'Hyperproof': 'hyperproof.io',
        'SAI360': 'sai360.com',
        'Kodex': 'kodex.com',
        'Cooley': 'cooley.com',
        'Aderant': 'aderant.com',
        'Agiloft': 'agiloft.com',
        'Alston & Bird': 'alston.com',
        'DLA Piper': 'dlapiper.com',
        'Dennemeyer': 'dennemeyer.com',
        'Gibson Dunn': 'gibsondunn.com',
        'Goodwin Procter': 'goodwinlaw.com',
        'Greenberg Traurig': 'gtlaw.com',
        'Holland & Knight': 'hklaw.com',
        'Litify': 'litify.com',
        'Skadden': 'skadden.com',
        'ABBYY': 'abbyy.com',
        'Qualia': 'qualia.com',
        'Snapdocs': 'snapdocs.com',
        'Canopy': 'canopytax.com',
        'Osano': 'osano.com',
        'Ethyca': 'ethyca.com',
        'Skyflow': 'skyflow.com',
        'DataGrail': 'datagrail.io',
        'Immuta': 'immuta.com',
        'Thoropass': 'thoropass.com',
        'AuditBoard': 'auditboard.com',
        'Collibra': 'collibra.com',
        'Paradigm AI': 'paradigm.ai',
      };

      const topCompanies = topCompaniesRaw.map(([name, count]) => {
        const domain = COMPANY_DOMAINS[name] || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`;
        const logo = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        return { name, count, logo };
      });

      const densityDisplay = getDisplayStats();
      const densityCanonical = densityDisplay || getCanonicalStats();
      const totalJobsCount = densityCanonical ? densityCanonical.totalJobs : allMatchingJobs.length;
      const countriesCountVal = densityCanonical ? densityCanonical.totalCountries : countriesData.filter(c => c.countryCode !== 'WW' && c.countryCode !== 'UN').length;
      res.json({
        totalJobs: totalJobsCount,
        countriesCount: countriesCountVal,
        remoteShare: allMatchingJobs.length > 0 ? Math.round((remoteCount / allMatchingJobs.length) * 100) : 0,
        byCountry: countriesData,
        topCategories,
        topCompanies,
      });
    } catch (error) {
      console.error("Error fetching job density:", error);
      res.status(500).json({ error: "Failed to fetch job density" });
    }
  });

  app.get("/api/jobs/:id", optionalAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }
      const job = await storage.getPublicJob(id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      const user = req.user as any;
      if (!user) {
        const truncatedDesc = job.description
          ? job.description.substring(0, 150) + (job.description.length > 150 ? "..." : "")
          : "";
        return res.json({
          id: job.id,
          title: job.title,
          company: job.company,
          companyLogo: job.companyLogo,
          location: job.location,
          locationType: job.locationType,
          isRemote: job.isRemote,
          workMode: (job as any).workMode,
          roleCategory: job.roleCategory,
          seniorityLevel: job.seniorityLevel,
          postedDate: job.postedDate,
          careerTrack: (job as any).careerTrack,
          description: truncatedDesc,
          restricted: true,
        });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  app.get("/api/jobs/:id/readiness", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const jobId = parseInt(req.params.id as string);
      if (isNaN(jobId)) return res.status(400).json({ error: "Invalid job ID" });

      const job = await storage.getJob(jobId);
      if (!job || !job.keySkills || job.keySkills.length === 0) {
        return res.json({ scores: [] });
      }

      const userResumes = await storage.getUserResumes(userId);
      if (!userResumes || userResumes.length === 0) {
        return res.json({ scores: [] });
      }

      const { computeReadinessScores } = await import("./lib/resume-matcher");
      const scores = computeReadinessScores(
        job.keySkills,
        userResumes.map((r: any) => ({ id: r.id, label: r.label, isPrimary: r.isPrimary, extractedData: r.extractedData })),
      );
      res.json({ scores });
    } catch (error) {
      console.error("Error computing readiness:", error);
      res.status(500).json({ error: "Failed to compute readiness" });
    }
  });

  // Track apply button clicks for analytics
  app.post("/api/jobs/:id/apply-click", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.trackApplyClick(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking apply click:", error);
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // ============ Events Routes ============

  app.get("/api/events", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.eventType) filters.eventType = String(req.query.eventType);
      if (req.query.attendanceType) filters.attendanceType = String(req.query.attendanceType);
      if (req.query.isFree === "true") filters.isFree = true;
      if (req.query.topic) filters.topic = String(req.query.topic);
      if (req.query.upcoming === "true") filters.upcoming = true;

      const eventsList = await storage.getEvents(filters);
      res.json(eventsList);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/events/featured", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : 6;
      const featuredEvents = await storage.getFeaturedEvents(limit);
      res.json(featuredEvents);
    } catch (error) {
      console.error("Error fetching featured events:", error);
      res.status(500).json({ error: "Failed to fetch featured events" });
    }
  });

  app.get("/api/events/stats", async (req, res) => {
    try {
      const allEvents = await storage.getEvents();
      const upcoming = allEvents.filter(e => new Date(e.startDate) >= new Date());
      const types = new Set(allEvents.map(e => e.eventType));
      const organizers = new Set(allEvents.map(e => e.organizer));
      res.json({
        totalEvents: allEvents.length,
        upcomingEvents: upcoming.length,
        eventTypes: types.size,
        organizers: organizers.size,
      });
    } catch (error) {
      console.error("Error fetching event stats:", error);
      res.status(500).json({ error: "Failed to fetch event stats" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const event = await storage.getEvent(id);
      if (!event) return res.status(404).json({ error: "Event not found" });
      if (!event.isActive || event.linkStatus !== 'verified') {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  app.post("/api/events/:id/register-click", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.trackRegistrationClick(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking registration click:", error);
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  app.post("/api/admin/events", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!(await storage.isUserAdmin(user?.id))) return res.status(403).json({ error: "Admin access required" });

      const regUrl = req.body.registrationUrl;
      if (regUrl && typeof regUrl === 'string' && regUrl.startsWith('http')) {
        const { ok } = await checkUrlExists(regUrl);
        if (ok) {
          req.body.linkStatus = 'verified';
        } else {
          req.body.linkStatus = 'broken';
          req.body.isActive = false;
        }
      } else {
        req.body.linkStatus = 'unchecked';
      }
      req.body.linkLastChecked = new Date();

      const event = await storage.createEvent(req.body);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.patch("/api/admin/events/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!(await storage.isUserAdmin(user?.id))) return res.status(403).json({ error: "Admin access required" });
      const id = parseInt(req.params.id as string);

      const regUrl = req.body.registrationUrl;
      if (regUrl && typeof regUrl === 'string' && regUrl.startsWith('http')) {
        const { ok } = await checkUrlExists(regUrl);
        req.body.linkStatus = ok ? 'verified' : 'broken';
        if (!ok) req.body.isActive = false;
        req.body.linkLastChecked = new Date();
      }

      const updated = await storage.updateEvent(id, req.body);
      if (!updated) return res.status(404).json({ error: "Event not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.delete("/api/admin/events/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!(await storage.isUserAdmin(user?.id))) return res.status(403).json({ error: "Admin access required" });
      const id = parseInt(req.params.id as string);
      await storage.deleteEvent(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  app.post("/api/admin/events/refresh", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!(await storage.isUserAdmin(user?.id))) return res.status(403).json({ error: "Admin access required" });
      res.status(400).json({ error: "AI event discovery is disabled. Events are manually curated only." });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh events" });
    }
  });

  app.get("/api/admin/events/scraper-status", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!(await storage.isUserAdmin(user?.id))) return res.status(403).json({ error: "Admin access required" });
      res.json(getEventScraperStatus());
    } catch (error) {
      res.status(500).json({ error: "Failed to get event scraper status" });
    }
  });

  app.get("/api/admin/events", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!(await storage.isUserAdmin(user?.id))) return res.status(403).json({ error: "Admin access required" });
      const allEvents = await storage.getAllEventsAdmin();
      res.json(allEvents);
    } catch (error) {
      console.error("Error fetching admin events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/admin/events/ai-extract", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!(await storage.isUserAdmin(user?.id))) return res.status(403).json({ error: "Admin access required" });

      const { title, url, description: rawDesc } = req.body;
      if (!title && !url && !rawDesc) return res.status(400).json({ error: "Provide at least a title, URL, or description" });

      const openai = (await import('./lib/openai-client')).getOpenAIClient();

      const prompt = `Extract structured event information from the following input. Fill in as many fields as possible based on what you can infer. If you cannot determine a field, use null.

Input:
${title ? `Title: ${title}` : ''}
${url ? `URL: ${url}` : ''}
${rawDesc ? `Description: ${rawDesc}` : ''}

Return a JSON object with these fields:
{
  "title": "Full event title",
  "organizer": "Organization hosting the event",
  "eventType": "conference|seminar|webinar|workshop|cle|networking|hackathon|panel",
  "startDate": "YYYY-MM-DD or null if unknown",
  "endDate": "YYYY-MM-DD or null",
  "location": "City, Country or Online",
  "attendanceType": "in-person|virtual|hybrid",
  "description": "2-3 sentence description of the event",
  "registrationUrl": "URL for registration",
  "cost": "Price range or Free or TBD",
  "isFree": true/false,
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "cleCredits": "CLE credits info or null"
}

Return ONLY the JSON object, no other text.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a legal technology events expert. Extract and structure event information accurately. Today is ' + new Date().toISOString().split('T')[0] },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return res.status(500).json({ error: "Empty AI response" });

      const extracted = JSON.parse(content);
      res.json(extracted);
    } catch (error) {
      console.error("Error extracting event info:", error);
      res.status(500).json({ error: "Failed to extract event information" });
    }
  });

  app.post("/api/admin/events/validate-links", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!(await storage.isUserAdmin(user?.id))) return res.status(403).json({ error: "Admin access required" });

      const { runEventLinkValidationNow, getEventLinkValidationStatus } = await import("./lib/event-link-validator");
      const result = await runEventLinkValidationNow();
      const status = getEventLinkValidationStatus();
      res.json({ ...result, validatorStatus: status });
    } catch (error) {
      console.error("Error validating links:", error);
      res.status(500).json({ error: "Failed to validate links" });
    }
  });

  app.post("/api/admin/events/deactivate-past", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!(await storage.isUserAdmin(user?.id))) return res.status(403).json({ error: "Admin access required" });
      const count = await storage.deactivatePastEvents();
      res.json({ deactivated: count });
    } catch (error) {
      console.error("Error deactivating past events:", error);
      res.status(500).json({ error: "Failed to deactivate past events" });
    }
  });

  // ============ End Events Routes ============

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

      if (persona?.seniorityInterest?.length) {
        const seniority = persona.seniorityInterest[0];
        if (!personalized.some(s => s.label.toLowerCase().includes(seniority.toLowerCase()))) {
          personalized.push({ label: `${seniority} Level`, query: `${seniority} level legal tech positions` });
        }
      }

      const remaining = defaultSuggestions.filter(s => !usedLabels.has(s.label.toLowerCase()));
      while (personalized.length < 4 && remaining.length > 0) {
        personalized.push(remaining.shift()!);
      }

      res.json({ suggestions: personalized.slice(0, 4), personalized: true });
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
          max_tokens: 2048,
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

  app.post("/api/search/semantic", async (req, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== "string" || text.trim().length < 50) {
        return res.status(400).json({ error: "Please provide more text to analyze (at least 50 characters)." });
      }

      const jobs = await storage.getActiveJobs();
      if (jobs.length === 0) {
        return res.json({ profileSummary: "No jobs available to match against.", matches: [] });
      }

      const extractionPrompt = `You are a career profile analyzer for a legal tech careers platform. Analyze the following text (which could be a resume, career summary, LinkedIn bio, or freeform description) and extract a structured career profile.

Return ONLY valid JSON in this format:
{
  "profileSummary": "A 1-2 sentence summary of who this person is and what they're looking for (written in second person, e.g. 'You have 5+ years in compliance...')",
  "skills": ["skill1", "skill2"],
  "experienceLevel": "entry|mid|senior|lead|director",
  "interests": ["area1", "area2"],
  "preferredWorkStyle": "remote|hybrid|onsite|flexible",
  "searchQuery": "A concise search query (under 30 words) that captures what kind of role this person should be looking for"
}`;

      let profileResponse;
      try {
        profileResponse = await getOpenAIClient().chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: extractionPrompt },
            { role: "user", content: text.substring(0, 8000) },
          ],
          response_format: { type: "json_object" },
          max_tokens: 512,
        });
      } catch (aiError) {
        console.error("AI profile extraction failed:", aiError);
        return res.status(500).json({ error: "Could not analyze your text. Please try again." });
      }

      const profileContent = profileResponse.choices[0]?.message?.content;
      if (!profileContent) {
        return res.status(500).json({ error: "Could not analyze your text. Please try again." });
      }

      let profile: { profileSummary: string; skills: string[]; experienceLevel: string; interests: string[]; preferredWorkStyle: string; searchQuery: string };
      try {
        profile = JSON.parse(profileContent);
      } catch {
        return res.status(500).json({ error: "Could not parse profile. Please try again." });
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
        category: job.roleCategory,
        description: job.description.substring(0, 200),
      }));

      const matchPrompt = `You are a job matching assistant. Match the following candidate profile against job listings.

Candidate profile:
- Summary: ${profile.profileSummary}
- Skills: ${profile.skills?.join(", ") || "Not specified"}
- Experience level: ${profile.experienceLevel || "Not specified"}
- Interests: ${profile.interests?.join(", ") || "Not specified"}
- Work style preference: ${profile.preferredWorkStyle || "flexible"}

For each job, score from 0-100 based on how well it matches this profile. Consider skills alignment, experience level fit, interest overlap, and work style match.

Return ONLY valid JSON:
{
  "matches": [
    {"index": 0, "score": 85, "reason": "Strong match for your compliance background and remote preference"}
  ]
}

Only include jobs scoring above 40. Sort by score descending. Max 15 results.`;

      let matchResponse;
      try {
        matchResponse = await getOpenAIClient().chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: matchPrompt },
            { role: "user", content: `Available jobs:\n${JSON.stringify(jobSummaries, null, 2)}` },
          ],
          response_format: { type: "json_object" },
          max_tokens: 2048,
        });
      } catch (aiError) {
        console.error("AI job matching failed:", aiError);
        return res.status(500).json({ error: "Matching failed. Please try again." });
      }

      const matchContent = matchResponse.choices[0]?.message?.content;
      if (!matchContent) {
        return res.json({ profileSummary: profile.profileSummary, matches: [] });
      }

      let matchResults: { matches: Array<{ index: number; score: number; reason: string }> };
      try {
        matchResults = JSON.parse(matchContent);
      } catch {
        return res.json({ profileSummary: profile.profileSummary, matches: [] });
      }

      const scoredJobs = matchResults.matches
        .filter(match => match.index >= 0 && match.index < jobs.length)
        .map(match => ({
          ...jobs[match.index],
          matchScore: match.score,
          matchReason: match.reason,
        }))
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      const currentUser = req.user as any;
      if (currentUser?.id) {
        storage.logActivity({
          userId: currentUser.id,
          eventType: "search",
          metadata: { type: "semantic", resultCount: scoredJobs.length },
        }).catch(console.error);
      }

      res.json({
        profileSummary: profile.profileSummary,
        matches: scoredJobs,
      });
    } catch (error) {
      console.error("Error in semantic search:", error);
      res.status(500).json({ error: "Search failed. Please try again." });
    }
  });

  // Guided search - analyze query and generate clarifying questions
  // Free users get 5 guided searches total (server-side enforced), Pro users get unlimited
  app.post("/api/search/analyze", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      const user = req.user as any;
      const userId = user?.id;
      const FREE_GUIDED_LIMIT = 5;

      if (userId) {
        const userIsAdmin = await storage.isUserAdmin(userId);
        const subData = await storage.getUserSubscription(userId);
        const isPro = userIsAdmin || (subData?.subscriptionTier === "pro" && subData?.subscriptionStatus === "active");
        if (!isPro) {
          const guidedCount = await storage.getGuidedSearchCount(userId);
          if (guidedCount >= FREE_GUIDED_LIMIT) {
            return res.status(403).json({
              error: `You've used all ${FREE_GUIDED_LIMIT} free guided searches. Upgrade to Pro for unlimited guided search.`,
              upgradeUrl: "/pricing",
              limitReached: true,
              limit: FREE_GUIDED_LIMIT,
              current: guidedCount,
            });
          }
        }
      }

      // Get user's resume data if available for personalization
      let userContext = "";
      if (userId) {
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
        max_tokens: 1024,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "Failed to analyze query" });
      }

      const analysisResult = JSON.parse(content);

      if (userId) {
        try {
          await storage.logActivity({
            userId,
            eventType: "guided_search",
            pagePath: "/jobs",
            metadata: { query },
          });
        } catch {}
      }

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
  // Free users get limited guided searches (enforced on /api/search/analyze), Pro users get unlimited
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
        max_tokens: 2048,
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
  app.post("/api/resume/anonymous-match", upload.single("resume"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file provided" });

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

      const allJobs = await storage.getActiveJobs();
      if (allJobs.length === 0) return res.json({ matches: [], parsedData });

      const matches = await batchMatchResume(
        parsedData as ResumeExtractedData,
        allJobs
      );

      res.json({ matches, parsedData });
    } catch (error: any) {
      console.error("Anonymous resume match error:", error);
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
  app.post("/api/resume/ats-review", isAuthenticated, requirePro, async (req, res) => {
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
        const resume = await storage.getResumeWithText(resumeId, userId);
        if (!resume) return res.status(404).json({ error: "Resume not found" });
        resumeText = resume.resumeText ?? undefined;
        extractedData = resume.extractedData as ResumeExtractedData;
      } else {
        const primaryResume = await storage.getPrimaryResume(userId);
        if (primaryResume) {
          const fullResume = await storage.getResumeWithText(primaryResume.id, userId);
          if (fullResume?.resumeText) {
            resumeText = fullResume.resumeText;
            extractedData = fullResume.extractedData as ResumeExtractedData;
          }
        }
        if (!resumeText) {
          const userData = await storage.getUserResumeWithText(userId);
          if (!userData?.resumeText) {
            return res.status(400).json({ error: "No resume uploaded. Please upload a resume first." });
          }
          resumeText = userData.resumeText;
          extractedData = userData.extractedData as ResumeExtractedData;
        }
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
        max_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "Failed to generate ATS review" });
      }

      const review = JSON.parse(content);
      res.json(review);
    } catch (error: any) {
      console.error("ATS review error:", error?.message || error, error?.response?.data || "");
      const msg = error?.message?.includes("model") ? "AI model temporarily unavailable" : "Failed to generate ATS review. Please try again.";
      res.status(500).json({ error: msg });
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

  app.post("/api/resume/extract-bullets", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const schema = z.object({
        resumeId: z.number().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

      let resume;
      if (parsed.data.resumeId) {
        resume = await storage.getResumeById(parsed.data.resumeId, userId);
      } else {
        resume = await storage.getPrimaryResume(userId);
      }
      if (!resume) return res.status(404).json({ error: "No resume found. Please upload a resume first." });

      const extracted = resume.extractedData as any;
      if (!extracted?.experience || !Array.isArray(extracted.experience) || extracted.experience.length === 0) {
        return res.status(400).json({ error: "Your resume doesn't have extractable experience entries. Try using manual entry instead." });
      }

      const bullets: Array<{ text: string; source: string; experienceIndex: number }> = [];
      for (let i = 0; i < extracted.experience.length; i++) {
        const exp = extracted.experience[i];
        if (!exp.description) continue;
        const lines = exp.description.split(/[\n•·\-–—]/).map((l: string) => l.trim()).filter((l: string) => l.length >= 15);
        const source = `${exp.title || "Role"} at ${exp.company || "Company"}`;
        for (const line of lines) {
          bullets.push({ text: line, source, experienceIndex: i });
        }
      }

      if (bullets.length === 0) {
        return res.status(400).json({ error: "No bullet points could be extracted from your resume experience." });
      }

      res.json({
        bullets,
        resumeId: resume.id,
        resumeLabel: (resume as any).label || resume.filename || "Primary Resume",
      });
    } catch (error: any) {
      console.error("Error extracting bullets:", error);
      res.status(500).json({ error: "Failed to extract resume bullets" });
    }
  });

  app.post("/api/resume/rewrite-for-job", isAuthenticated, requirePro, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const schema = z.object({
        jobId: z.number(),
        bullets: z.array(z.string().min(5).max(500)).min(1).max(10),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

      const { jobId, bullets } = parsed.data;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { db } = await import("./db");
      const { gte, eq, and } = await import("drizzle-orm");
      const todayRuns = await db.select().from(resumeRewriteRuns)
        .where(and(eq(resumeRewriteRuns.userId, userId), gte(resumeRewriteRuns.createdAt, today)));
      if (todayRuns.length >= 5) {
        return res.status(429).json({ error: "Daily limit reached", message: "Pro users can rewrite up to 5 times per day. Try again tomorrow.", remaining: 0 });
      }

      const job = await storage.getJob(jobId);
      if (!job) return res.status(404).json({ error: "Job not found" });
      if (!job.structuredDescription) return res.status(400).json({ error: "This job does not have structured description data yet" });

      const sd = job.structuredDescription as any;
      const inputHash = crypto.createHash("md5").update(JSON.stringify({ bullets, jobId })).digest("hex");

      const result = await rewriteBulletsForJob({
        bullets,
        jobTitle: job.title,
        company: job.company,
        structuredDescription: sd,
      });

      await db.insert(resumeRewriteRuns).values({
        userId,
        jobId,
        inputHash,
        outputJson: result,
        status: "success",
      });

      const remaining = 5 - todayRuns.length - 1;
      res.json({ ...result, remaining: Math.max(0, remaining) });
    } catch (error: any) {
      console.error("Error in resume rewrite:", error);
      try {
        const { db } = await import("./db");
        const user = req.user as any;
        await db.insert(resumeRewriteRuns).values({
          userId: user?.id || "unknown",
          jobId: req.body?.jobId || 0,
          status: "error",
          errorMessage: error?.message || "Unknown error",
        });
      } catch (logErr) { /* ignore logging errors */ }
      res.status(500).json({ error: "Failed to rewrite resume bullets" });
    }
  });

  app.get("/api/career-intelligence", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const persona = await storage.getUserPersona(userId);
      if (!persona?.careerIntelligence) {
        return res.json({ cached: false, data: null });
      }

      const userResumes = await storage.getUserResumes(userId);
      const primaryResume = userResumes.find((r: any) => r.isPrimary) || userResumes[0];
      let resumeChanged = false;
      if (primaryResume?.extractedData) {
        const currentHash = crypto.createHash("sha256").update(JSON.stringify(primaryResume.extractedData)).digest("hex").slice(0, 16);
        resumeChanged = persona.careerIntelligenceResumeHash !== currentHash;
      }

      const allJobs = await storage.getActiveJobs();
      const categoryCounts: Record<string, number> = {};
      for (const job of allJobs) {
        if (job.roleCategory) {
          categoryCounts[job.roleCategory] = (categoryCounts[job.roleCategory] || 0) + 1;
        }
      }
      const intelligence = persona.careerIntelligence as any;
      if (intelligence.recommendedPaths) {
        intelligence.recommendedPaths = intelligence.recommendedPaths.map((p: any) => ({
          ...p,
          jobCount: categoryCounts[p.path] || 0,
        }));
      }

      res.json({
        cached: true,
        resumeChanged,
        generatedAt: persona.careerIntelligenceGeneratedAt,
        data: intelligence,
      });
    } catch (error) {
      console.error("Error loading career intelligence:", error);
      res.status(500).json({ error: "Failed to load career intelligence" });
    }
  });

  app.get("/api/personalized-insights", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const persona = await storage.getUserPersona(userId);
      if (!persona) {
        return res.json({ hasInsights: false });
      }

      const lastActive = persona.lastActiveAt;
      let newJobCount = 0;
      let topCategoryNewJobs = 0;
      let topCategory: string | null = null;

      const intel = persona.careerIntelligence as any;
      if (intel?.recommendedPaths?.length) {
        const highFitPath = intel.recommendedPaths.find((p: any) => p.fit === "high") || intel.recommendedPaths[0];
        topCategory = highFitPath?.path || null;
      }

      if (lastActive) {
        const allActiveJobs = await storage.getActiveJobs();
        const newJobs = allActiveJobs.filter(j => j.postedDate && new Date(j.postedDate) > new Date(lastActive));
        newJobCount = newJobs.length;
        if (topCategory) {
          topCategoryNewJobs = newJobs.filter(j => j.roleCategory === topCategory).length;
        }
      }

      await storage.upsertUserPersona(userId, { lastActiveAt: new Date() });

      res.json({
        hasInsights: true,
        newJobCount,
        topCategory,
        topCategoryNewJobs,
        totalJobViews: persona.totalJobViews || 0,
        totalApplyClicks: persona.totalApplyClicks || 0,
      });
    } catch (error) {
      console.error("Error loading personalized insights:", error);
      res.status(500).json({ error: "Failed to load insights" });
    }
  });

  app.get("/api/journey-state", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const [resumes, persona, editorVersions] = await Promise.all([
        storage.getUserResumes(userId),
        storage.getUserPersona(userId),
        db.select({ id: resumeEditorVersions.id }).from(resumeEditorVersions).where(eq(resumeEditorVersions.userId, userId)).limit(1),
      ]);

      const hasResume = resumes.length > 0;
      const hasCareerIntelligence = !!persona?.careerIntelligence;
      const hasViewedJobs = (persona?.totalJobViews || 0) > 0;
      const hasTailoredResume = editorVersions.length > 0;
      const hasApplied = (persona?.totalApplyClicks || 0) > 0;

      res.json({
        profile: hasResume,
        path: hasCareerIntelligence,
        jobs: hasViewedJobs,
        tailor: hasTailoredResume,
        apply: hasApplied,
      });
    } catch (error) {
      console.error("Error loading journey state:", error);
      res.status(500).json({ error: "Failed to load journey state" });
    }
  });

  app.post("/api/career-path-advisor", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      if (req.body.jobId || req.body.jobs) {
        return res.status(400).json({
          error: "Career Path Advisor does not accept job IDs. This feature provides career-level guidance only — not job-specific advice. Use Alignment Strategy for job-specific positioning."
        });
      }

      const userResumes = await storage.getUserResumes(userId);
      const primaryResume = userResumes.find((r: any) => r.isPrimary) || userResumes[0];
      if (!primaryResume || !primaryResume.extractedData) {
        return res.status(400).json({ error: "No parsed resume found. Please upload a resume first." });
      }

      const resumeData = primaryResume.extractedData as any;

      const resumeParts: string[] = [];
      if (resumeData.summary) resumeParts.push(`Summary: ${resumeData.summary}`);
      if (resumeData.experience?.length) {
        const expLines = resumeData.experience.slice(0, 8).map(
          (e: any) => `- ${e.title} at ${e.company} (${e.duration}): ${e.description?.slice(0, 250) || ""}`
        );
        resumeParts.push(`Experience:\n${expLines.join("\n")}`);
      }
      if (resumeData.skills?.length) resumeParts.push(`Skills: ${resumeData.skills.join(", ")}`);
      if (resumeData.education?.length) {
        const eduLines = resumeData.education.map((e: any) => `- ${e.degree}, ${e.institution} (${e.year})`);
        resumeParts.push(`Education:\n${eduLines.join("\n")}`);
      }
      if (resumeData.totalYearsExperience) resumeParts.push(`Total Years Experience: ${resumeData.totalYearsExperience}`);

      const resumeSignal = resumeParts.join("\n\n");

      const allJobs = await storage.getActiveJobs();
      const categories = Array.from(new Set(allJobs.map(j => j.roleCategory).filter(Boolean)));
      const topCompanies = Array.from(new Set(allJobs.map(j => j.company))).slice(0, 20);

      const systemPrompt = `You are a career path advisor for legal professionals exploring transitions into legal technology. You provide 6–24 month career direction — NOT job-specific resume edits.

STRICT RULES:
- You must NOT mention specific job postings, match scores, or fit percentages.
- You must NOT suggest resume rewrites, bullet point changes, or section reordering.
- You must NOT say "for this role" or "for this job" — there is no specific job in context.
- Focus on career trajectory, skill development, and stepping-stone roles.
- Be honest about gaps and realistic about timelines.
- Keep advice practical and grounded — no generic motivational fluff.

Available legal tech categories in the market: ${categories.join(", ")}
Top hiring companies: ${topCompanies.join(", ")}`;

      const userPrompt = `Candidate Resume:
${resumeSignal}

Based on this candidate's background, provide career path guidance for transitioning into legal technology. Return a JSON object with exactly this shape:
{
  "recommendedPaths": [
    { "path": "Category name (must match one of the available categories listed above)", "why": "1-2 sentence explanation of why this path suits this candidate", "fit": "high" | "medium" | "low" }
  ],
  "strengths": [
    { "label": "Skill or experience area (3-5 words)", "evidence": "Brief quote or reference from their resume" }
  ],
  "gaps": [
    { "label": "Missing skill or experience (3-5 words)", "suggestion": "How to close this gap in 1 sentence" }
  ],
  "transitionSteps": ["3-6 concrete steps the candidate should take over the next 6-24 months"],
  "suggestedSteppingStoneRoles": ["3-6 specific job titles that would be realistic next steps"],
  "learningPlan": ["3-5 practical learning items — courses, certifications, skills to develop"],
  "confidenceNotes": ["2-3 honest observations about what's strong and what's missing in the candidate's profile for legal tech"]
}

Rules:
- Provide 3-5 recommended paths. Be specific to this candidate's actual experience — do not give generic advice.
- Provide exactly 3 strengths grounded in resume evidence.
- Provide exactly 3 gaps with actionable suggestions.
- Each path's "fit" must be "high", "medium", or "low" based on how well the candidate's background aligns.
- Path names MUST match available categories listed above (e.g., "Legal Operations", "Legal Engineering", "Compliance & Privacy").`;

      const { getOpenAIClient } = await import("./lib/openai-client");
      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from AI");

      const parsed = JSON.parse(content);

      if (!parsed.recommendedPaths || !Array.isArray(parsed.recommendedPaths)) {
        throw new Error("Invalid AI response format");
      }

      const categoryCounts: Record<string, number> = {};
      for (const job of allJobs) {
        if (job.roleCategory) {
          categoryCounts[job.roleCategory] = (categoryCounts[job.roleCategory] || 0) + 1;
        }
      }

      const enrichedPaths = (parsed.recommendedPaths || []).map((p: any) => ({
        path: p.path,
        why: p.why,
        fit: p.fit || "medium",
        jobCount: categoryCounts[p.path] || 0,
      }));

      const responseData = {
        recommendedPaths: enrichedPaths,
        strengths: (parsed.strengths || []).slice(0, 3),
        gaps: (parsed.gaps || []).slice(0, 3),
        transitionSteps: parsed.transitionSteps || [],
        suggestedSteppingStoneRoles: parsed.suggestedSteppingStoneRoles || [],
        learningPlan: parsed.learningPlan || [],
        confidenceNotes: parsed.confidenceNotes || [],
      };

      const resumeHash = crypto.createHash("sha256").update(JSON.stringify(primaryResume.extractedData)).digest("hex").slice(0, 16);
      try {
        await storage.upsertUserPersona(userId, {
          careerIntelligence: responseData as any,
          careerIntelligenceResumeHash: resumeHash,
          careerIntelligenceGeneratedAt: new Date(),
        });
      } catch (persistErr) {
        console.error("Failed to persist career intelligence (non-blocking):", persistErr);
      }

      res.json(responseData);
    } catch (error: any) {
      console.error("Error in career path advisor:", error);
      res.status(500).json({ error: "Failed to generate career path advice" });
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

  app.get("/api/resumes/tailored-versions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const allVersions = await db.select({
        id: resumeEditorVersions.id,
        resumeId: resumeEditorVersions.resumeId,
        jobId: resumeEditorVersions.jobId,
        versionNumber: resumeEditorVersions.versionNumber,
        updatedAt: resumeEditorVersions.updatedAt,
        improvementsApplied: resumeEditorVersions.improvementsApplied,
      }).from(resumeEditorVersions)
        .where(eq(resumeEditorVersions.userId, userId))
        .orderBy(desc(resumeEditorVersions.updatedAt));

      const seen = new Set<string>();
      const versions = allVersions.filter(v => {
        const key = `${v.resumeId}-${v.jobId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 20);

      const jobIds = Array.from(new Set(versions.map(v => v.jobId).filter(Boolean)));
      const jobMap = new Map<number, { title: string; company: string }>();
      for (const jid of jobIds) {
        const job = await storage.getJob(jid);
        if (job) jobMap.set(jid, { title: job.title, company: job.company });
      }

      const result = versions.map(v => ({
        ...v,
        jobTitle: jobMap.get(v.jobId)?.title || "Unknown Role",
        jobCompany: jobMap.get(v.jobId)?.company || "Unknown Company",
        label: `Tailored for ${jobMap.get(v.jobId)?.title || "Unknown Role"} at ${jobMap.get(v.jobId)?.company || "Unknown Company"}`,
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching tailored versions:", error);
      res.status(500).json({ error: "Failed to fetch tailored versions" });
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
      const userIsAdmin = await storage.isUserAdmin(userId);
      const subData = await storage.getUserSubscription(userId);
      const isProUser = userIsAdmin || (subData?.subscriptionTier === "pro" && subData?.subscriptionStatus === "active");
      const maxResumes = isProUser ? 5 : 1;
      if (existing.length >= maxResumes) {
        if (!isProUser) {
          return res.status(403).json({
            error: "Free accounts are limited to 1 resume. Upgrade to Pro to manage up to 5 resumes.",
            upgradeUrl: "/pricing",
            limitReached: true,
            limit: 1,
            current: existing.length,
          });
        }
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

  app.post("/api/admin/users/:id/toggle-admin", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const targetUserId = req.params.id as string;
      const currentUser = req.user as any;
      if (targetUserId === currentUser.id) {
        return res.status(400).json({ error: "Cannot change your own admin status" });
      }
      const isCurrentlyAdmin = await storage.isUserAdmin(targetUserId);
      await storage.setUserAdmin(targetUserId, !isCurrentlyAdmin);
      res.json({ success: true, isAdmin: !isCurrentlyAdmin });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users/:id/toggle-pro", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const targetUserId = req.params.id as string;
      const subData = await storage.getUserSubscription(targetUserId);
      const isPro = subData?.subscriptionTier === "pro" && subData?.subscriptionStatus === "active";
      if (isPro) {
        await storage.updateUserSubscription(targetUserId, {
          subscriptionTier: "free",
          subscriptionStatus: "inactive",
        });
      } else {
        await storage.updateUserSubscription(targetUserId, {
          subscriptionTier: "pro",
          subscriptionStatus: "active",
        });
      }
      const newSub = await storage.getUserSubscription(targetUserId);
      res.json({ success: true, tier: newSub?.subscriptionTier || "free", status: newSub?.subscriptionStatus || "inactive" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const search = req.query.search ? String(req.query.search) : undefined;
      const tier = req.query.tier ? String(req.query.tier) : "all";
      const page = Math.max(1, parseInt(String(req.query.page || "1")));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"))));

      const conditions: any[] = [];

      if (search) {
        const term = `%${search.toLowerCase()}%`;
        conditions.push(
          sql`(${users.email} ILIKE ${term} OR ${users.firstName} ILIKE ${term} OR ${users.lastName} ILIKE ${term})`
        );
      }

      if (tier === "pro") {
        conditions.push(eq(users.subscriptionTier, "pro"));
      } else if (tier === "free") {
        conditions.push(
          sql`(${users.subscriptionTier} != 'pro' OR ${users.subscriptionTier} IS NULL)`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [{ total: totalCount }] = await db
        .select({ total: count() })
        .from(users)
        .where(whereClause);
      const total = Number(totalCount);
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;

      const userList = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          subscriptionTier: users.subscriptionTier,
          subscriptionStatus: users.subscriptionStatus,
          stripeCustomerId: users.stripeCustomerId,
          stripeSubscriptionId: users.stripeSubscriptionId,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      res.json({ users: userList, total, page, totalPages });
    } catch (error: any) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/users/:id/payment-history", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const targetUserId = req.params.id as string;
      const [user] = await db
        .select({
          stripeCustomerId: users.stripeCustomerId,
          stripeSubscriptionId: users.stripeSubscriptionId,
        })
        .from(users)
        .where(eq(users.id, targetUserId));

      if (!user?.stripeCustomerId) {
        return res.json({ payments: [], subscription: null, message: "No Stripe customer found" });
      }

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const [invoices, charges, subscriptions] = await Promise.all([
        stripe.invoices.list({ customer: user.stripeCustomerId, limit: 50 }),
        stripe.charges.list({ customer: user.stripeCustomerId, limit: 50 }),
        stripe.subscriptions.list({ customer: user.stripeCustomerId, limit: 1, status: "all" as any }),
      ]);

      const payments = charges.data.map((charge: any) => ({
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        created: charge.created,
        description: charge.description || charge.statement_descriptor || null,
        invoiceUrl: null as string | null,
        receiptUrl: charge.receipt_url || null,
      }));

      for (const inv of invoices.data) {
        const existing = payments.find((p: any) => p.id === (inv as any).charge);
        if (existing) {
          existing.invoiceUrl = inv.hosted_invoice_url || null;
          if (!existing.description && inv.description) {
            existing.description = inv.description;
          }
        } else {
          payments.push({
            id: inv.id,
            amount: inv.amount_paid || 0,
            currency: inv.currency,
            status: inv.status || "unknown",
            created: inv.created,
            description: inv.description || null,
            invoiceUrl: inv.hosted_invoice_url || null,
            receiptUrl: null,
          });
        }
      }

      let subscription = null;
      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0] as any;
        subscription = {
          id: sub.id,
          status: sub.status,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          plan: sub.items?.data?.[0]?.price
            ? {
                interval: sub.items.data[0].price.recurring?.interval || null,
                amount: sub.items.data[0].price.unit_amount || 0,
              }
            : null,
        };
      }

      res.json({ payments, subscription });
    } catch (error: any) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/subscription-stats", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const [{ total: totalUsers }] = await db.select({ total: count() }).from(users);
      const [{ total: proUsers }] = await db
        .select({ total: count() })
        .from(users)
        .where(eq(users.subscriptionTier, "pro"));

      const totalUsersNum = Number(totalUsers);
      const proUsersNum = Number(proUsers);
      const freeUsers = totalUsersNum - proUsersNum;

      let monthlyRevenue = 0;
      let recentCharges = 0;
      let chargeBreakdown: Array<{ id: string; amount: number; currency: string; created: number; customerEmail: string | null; description: string | null; status: string }> = [];
      let isLiveMode = true;

      try {
        const { getUncachableStripeClient } = await import("./stripeClient");
        const stripe = await getUncachableStripeClient();
        const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
        const chargesResult = await stripe.charges.list({
          limit: 100,
          created: { gte: thirtyDaysAgo },
        });
        for (const charge of chargesResult.data) {
          if (charge.livemode === false) {
            isLiveMode = false;
          }
          if (charge.status === "succeeded") {
            monthlyRevenue += charge.amount;
            recentCharges++;
            chargeBreakdown.push({
              id: charge.id,
              amount: charge.amount,
              currency: charge.currency,
              created: charge.created,
              customerEmail: charge.billing_details?.email || charge.receipt_email || null,
              description: charge.description,
              status: charge.status,
            });
          }
        }
      } catch (stripeErr: any) {
        console.error("Stripe not available for subscription stats:", stripeErr.message);
      }

      res.json({
        totalUsers: totalUsersNum,
        proUsers: proUsersNum,
        freeUsers,
        monthlyRevenue,
        recentCharges,
        chargeBreakdown,
        isLiveMode,
      });
    } catch (error: any) {
      console.error("Error fetching subscription stats:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== ADMIN: FIRM SOURCES ==========
  app.get("/api/admin/sources", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const { firmSources } = await import("@shared/schema");
      const { LAW_FIRMS_AND_COMPANIES } = await import("./lib/law-firms-list");
      const dbSources = await db.select().from(firmSources).orderBy(firmSources.firmName);
      const dbByName = new Map(dbSources.map(s => [s.firmName.toLowerCase(), s]));

      const merged: any[] = [];
      LAW_FIRMS_AND_COMPANIES.forEach((firm, idx) => {
        const existing = dbByName.get(firm.name.toLowerCase());
        if (existing) {
          merged.push(existing);
          dbByName.delete(firm.name.toLowerCase());
        } else {
          let atsType = 'unknown';
          let fetchMode = 'manual';
          const atsConfig: Record<string, string> = {};
          if (firm.greenhouseId) { atsType = 'greenhouse'; fetchMode = 'api'; atsConfig.boardToken = firm.greenhouseId; }
          else if (firm.leverPostingsUrl) { atsType = 'lever'; fetchMode = 'api'; atsConfig.company = firm.leverPostingsUrl; }
          else if (firm.workday) { atsType = 'workday'; fetchMode = 'api'; const w = Array.isArray(firm.workday) ? firm.workday[0] : firm.workday; atsConfig.company = w.company; atsConfig.instance = w.instance; atsConfig.site = w.site; }
          else if (firm.ultipro) { atsType = 'ultipro'; fetchMode = 'api'; atsConfig.companyCode = firm.ultipro.companyCode; atsConfig.boardId = firm.ultipro.boardId; }
          else if (firm.ashbyUrl) { atsType = 'ashby'; fetchMode = 'api'; atsConfig.orgSlug = firm.ashbyUrl; }
          else if (firm.icims) { atsType = 'icims'; fetchMode = 'api'; atsConfig.customerId = firm.icims; }
          else if (firm.smartrecruitersId) { atsType = 'smartrecruiters'; fetchMode = 'api'; atsConfig.company = firm.smartrecruitersId; }
          else if (firm.workableId) { atsType = 'workable'; fetchMode = 'api'; atsConfig.subdomain = firm.workableId; }
          else if (firm.bamboohrId) { atsType = 'bamboohr'; fetchMode = 'api'; atsConfig.subdomain = firm.bamboohrId; }
          else if (firm.rippling) { atsType = 'rippling'; fetchMode = 'api'; atsConfig.companyId = firm.rippling; }

          merged.push({
            id: -(idx + 1),
            firmName: firm.name,
            careerUrl: firm.careerUrl,
            discoveredPortalUrl: null,
            atsType,
            fetchMode,
            status: atsType !== 'unknown' ? 'needs_review' : 'classification_only',
            atsConfig: Object.keys(atsConfig).length > 0 ? atsConfig : null,
            lastSuccessAt: null,
            lastErrorMessage: null,
            jobCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: null,
          });
        }
      });
      for (const remaining of dbByName.values()) {
        merged.push(remaining);
      }
      merged.sort((a, b) => (a.firmName || '').localeCompare(b.firmName || ''));
      res.json(merged);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/sources/:id/discover", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const id = parseInt(req.params.id);
      const discoverSchema = z.object({ url: z.string().url("Must be a valid URL") });
      const parsed = discoverSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
      const { url } = parsed.data;

      const { detectATSFromUrl, validateATSConfig } = await import("./lib/ats-detector");
      const { firmSources } = await import("@shared/schema");
      const detection = detectATSFromUrl(url);

      let validation = null;
      if (detection.atsType !== "unknown") {
        validation = await validateATSConfig(detection.atsType, detection.config);
      }

      const updateData: Record<string, any> = {
        discoveredPortalUrl: url,
        atsType: detection.atsType,
        updatedAt: new Date(),
      };

      if (detection.atsType !== "unknown" && validation?.valid) {
        updateData.fetchMode = "ats_api";
        updateData.status = "active";
        updateData.atsConfig = detection.config;
        updateData.lastErrorMessage = null;
        updateData.jobCount = validation.jobCount > 0 ? validation.jobCount : 0;
      } else if (detection.atsType !== "unknown" && !validation?.valid) {
        updateData.fetchMode = "needs_setup";
        updateData.status = "needs_review";
        updateData.atsConfig = detection.config;
        updateData.lastErrorMessage = validation?.error || "ATS detected but validation failed";
      } else {
        updateData.fetchMode = "manual_html";
        updateData.status = "needs_review";
        updateData.lastErrorMessage = "No standard ATS detected. Use HTML import.";
      }

      await db.update(firmSources).set(updateData).where(eq(firmSources.id, id));
      res.json({ ...detection, validation });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/sources/:id/parse-html", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const id = parseInt(req.params.id);
      const parseHtmlSchema = z.object({ html: z.string().min(10, "HTML content is too short"), confirm: z.boolean().optional() });
      const parsed = parseHtmlSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
      const { html, confirm } = parsed.data;

      const { firmSources } = await import("@shared/schema");
      const [source] = await db.select().from(firmSources).where(eq(firmSources.id, id));
      if (!source) return res.status(404).json({ error: "Source not found" });

      const { parseJobsFromHTML } = await import("./lib/html-job-parser");
      const parsedJobs = parseJobsFromHTML(html, source.firmName, source.careerUrl);

      if (!confirm) {
        return res.json({ jobs: parsedJobs, count: parsedJobs.length });
      }

      let imported = 0;
      for (const pj of parsedJobs) {
        const jobHash = `manual_${source.firmName.replace(/\s+/g, '_')}_${Buffer.from(pj.title + pj.applyUrl).toString('base64').substring(0, 20)}`;
        const existing = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.externalId, jobHash)).limit(1);
        if (existing.length > 0) continue;

        await db.insert(jobs).values({
          title: pj.title,
          company: source.firmName,
          location: pj.location || "Not specified",
          description: pj.department ? `Department: ${pj.department}` : "Imported via HTML paste - pending enrichment",
          applyUrl: pj.applyUrl,
          source: "manual_html",
          externalId: jobHash,
          isActive: true,
          isPublished: false,
          pipelineStatus: "raw",
        } as any);
        imported++;
      }

      await db.update(firmSources).set({
        fetchMode: "manual_html",
        status: "active",
        lastSuccessAt: new Date(),
        jobCount: parsedJobs.length,
        lastErrorMessage: null,
        updatedAt: new Date(),
      }).where(eq(firmSources.id, id));

      res.json({ imported, total: parsedJobs.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/sources/:id/test-scrape", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const id = parseInt(req.params.id);
      const { firmSources } = await import("@shared/schema");
      const [source] = await db.select().from(firmSources).where(eq(firmSources.id, id));
      if (!source) return res.status(404).json({ error: "Source not found" });

      if (source.fetchMode !== "ats_api" || !source.atsConfig) {
        return res.status(400).json({ error: "Source must have a configured ATS for test scraping" });
      }

      const config = source.atsConfig as Record<string, string>;
      let scrapedJobs: any[] = [];

      switch (source.atsType) {
        case "greenhouse":
          scrapedJobs = await (await import("./lib/law-firm-scraper")).scrapeGreenhouse(config.boardId, source.firmName);
          break;
        case "lever":
          scrapedJobs = await (await import("./lib/law-firm-scraper")).scrapeLever(`https://api.lever.co/v0/postings/${config.company}`, source.firmName);
          break;
        case "workday":
          scrapedJobs = await (await import("./lib/law-firm-scraper")).scrapeWorkday({ company: config.company, instance: config.instance, site: config.site }, source.firmName);
          break;
        case "icims":
          scrapedJobs = await (await import("./lib/law-firm-scraper")).scrapeICIMS(config.slug, source.firmName);
          break;
        case "ashby":
          const ashbyUrl = `https://api.ashbyhq.com/posting-api/job-board/${config.company}`;
          scrapedJobs = await (await import("./lib/law-firm-scraper")).scrapeAshby(ashbyUrl, source.firmName);
          break;
        case "smartrecruiters":
          scrapedJobs = await (await import("./lib/law-firm-scraper")).scrapeSmartRecruiters(config.company, source.firmName);
          break;
        case "bamboohr":
          scrapedJobs = await (await import("./lib/law-firm-scraper")).scrapeBambooHR(config.company, source.firmName);
          break;
        case "rippling":
          scrapedJobs = await (await import("./lib/law-firm-scraper")).scrapeRippling(config.company, source.firmName);
          break;
        case "workable":
          scrapedJobs = await (await import("./lib/law-firm-scraper")).scrapeWorkable(config.company, source.firmName);
          break;
      }

      await db.update(firmSources).set({
        lastSuccessAt: new Date(),
        jobCount: scrapedJobs.length,
        lastErrorMessage: null,
        updatedAt: new Date(),
      }).where(eq(firmSources.id, id));

      res.json({
        jobCount: scrapedJobs.length,
        sampleTitles: scrapedJobs.slice(0, 10).map((j: any) => j.title),
      });
    } catch (error: any) {
      const { firmSources } = await import("@shared/schema");
      await db.update(firmSources).set({
        lastErrorMessage: error.message?.substring(0, 500),
        updatedAt: new Date(),
      }).where(eq(firmSources.id, parseInt(req.params.id)));
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/sources/:id", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const id = parseInt(req.params.id);
      const patchSchema = z.object({
        status: z.enum(["active", "needs_review", "classification_only"]).optional(),
        fetchMode: z.enum(["ats_api", "manual_html", "needs_setup"]).optional(),
        atsType: z.string().max(50).optional(),
      });
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
      const { status, fetchMode, atsType } = parsed.data;
      const { firmSources } = await import("@shared/schema");
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (fetchMode) updateData.fetchMode = fetchMode;
      if (atsType) updateData.atsType = atsType;
      await db.update(firmSources).set(updateData).where(eq(firmSources.id, id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/sources/auto-detect", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const { detectATSFromUrl, detectEmbeddedATS, validateATSConfig } = await import("./lib/ats-detector");
      const { firmSources } = await import("@shared/schema");

      const existingSources = await db.select({ firmName: firmSources.firmName }).from(firmSources);
      const existingNames = new Set(existingSources.map(s => s.firmName.toLowerCase()));

      const unconfigured = LAW_FIRMS_AND_COMPANIES.filter(f => {
        if (existingNames.has(f.name.toLowerCase())) return false;
        if (f.greenhouseId || f.leverPostingsUrl || f.ashbyUrl || f.workday || f.rippling || f.icims || f.workableId || f.smartrecruitersId || f.bamboohrId || (f as any).ultipro) return false;
        return true;
      });

      const detected: any[] = [];
      const blocked: any[] = [];
      const noAts: any[] = [];
      const errors: any[] = [];
      const BATCH_SIZE = 3;
      const DELAY_MS = 2000;

      for (let i = 0; i < unconfigured.length; i += BATCH_SIZE) {
        const batch = unconfigured.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(async (firm) => {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 15000);
              let response;
              try {
                response = await fetch(firm.careerUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                  },
                  redirect: 'follow',
                  signal: controller.signal,
                });
              } finally {
                clearTimeout(timeout);
              }

              const html = await response.text();
              const finalUrl = response.url;

              const isCfBlocked = response.status === 403 ||
                html.includes('cf-browser-verification') ||
                html.includes('__cf_chl') ||
                html.includes('challenge-platform') ||
                html.includes('Just a moment...');

              if (isCfBlocked) {
                blocked.push({ name: firm.name, careerUrl: firm.careerUrl, reason: 'cloudflare' });
                return;
              }

              let detection = detectATSFromUrl(finalUrl);
              const needsBetterMatch = detection.atsType === 'unknown' ||
                (detection.atsType === 'workday' && !detection.config.site);
              if (needsBetterMatch) {
                const embedded = detectEmbeddedATS(html);
                if (embedded && (embedded.atsType !== detection.atsType || Object.keys(embedded.config).length > Object.keys(detection.config).length)) {
                  detection = embedded;
                }
              }

              if (detection.atsType !== 'unknown') {
                let validation = null;
                if (detection.scrapeSupported !== false && Object.keys(detection.config).length > 0) {
                  try { validation = await validateATSConfig(detection.atsType, detection.config); } catch {}
                }
                detected.push({
                  name: firm.name,
                  careerUrl: firm.careerUrl,
                  type: firm.type,
                  atsType: detection.atsType,
                  config: detection.config,
                  confidence: detection.confidence,
                  evidence: detection.evidence,
                  scrapeSupported: detection.scrapeSupported !== false,
                  jobCount: validation?.valid ? validation.jobCount : 0,
                  validated: validation?.valid || false,
                });

                if (detection.scrapeSupported !== false && validation?.valid) {
                  await db.insert(firmSources).values({
                    firmName: firm.name,
                    careerUrl: firm.careerUrl,
                    discoveredPortalUrl: finalUrl,
                    atsType: detection.atsType,
                    fetchMode: 'ats_api',
                    status: 'needs_review',
                    atsConfig: detection.config,
                    jobCount: validation.jobCount > 0 ? validation.jobCount : 0,
                  }).onConflictDoNothing();
                }
              } else {
                noAts.push({ name: firm.name, careerUrl: firm.careerUrl });
              }
            } catch (err: any) {
              if (err.name === 'AbortError') {
                errors.push({ name: firm.name, careerUrl: firm.careerUrl, error: 'Timeout (15s)' });
              } else {
                errors.push({ name: firm.name, careerUrl: firm.careerUrl, error: err.message?.substring(0, 200) });
              }
            }
          })
        );

        if (i + BATCH_SIZE < unconfigured.length) {
          await new Promise(r => setTimeout(r, DELAY_MS));
        }
      }

      res.json({
        scanned: unconfigured.length,
        detected,
        blocked,
        noAts,
        errors,
        summary: {
          detected: detected.length,
          blocked: blocked.length,
          noAts: noAts.length,
          errors: errors.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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
  const scraperStatus: {
    isRunning: boolean;
    type: string | null;
    startedAt: string | null;
    companiesTotal: number;
    companiesProcessed: number;
    currentCompany: string | null;
    result: { message: string; inserted: number; updated: number; totalScraped: number; stats?: any[] } | null;
    error: string | null;
    completedAt: string | null;
  } = {
    isRunning: false,
    type: null,
    startedAt: null,
    companiesTotal: 0,
    companiesProcessed: 0,
    currentCompany: null,
    result: null,
    error: null,
    completedAt: null,
  };

  app.get("/api/admin/scraper/status", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    res.json(scraperStatus);
  });

  async function runScrapeInBackground(type: string, scrapeFn: () => Promise<{ jobs: any[]; stats: any[] }>) {
    if (scraperStatus.isRunning) return;
    scraperStatus.isRunning = true;
    scraperStatus.type = type;
    scraperStatus.startedAt = new Date().toISOString();
    scraperStatus.companiesTotal = 0;
    scraperStatus.companiesProcessed = 0;
    scraperStatus.currentCompany = null;
    scraperStatus.result = null;
    scraperStatus.error = null;
    scraperStatus.completedAt = null;

    try {
      console.log(`[Scraper] Starting background ${type} scrape...`);
      const { jobs: scrapedJobs, stats } = await scrapeFn();

      scraperStatus.companiesTotal = stats.length;
      scraperStatus.companiesProcessed = stats.length;
      scraperStatus.currentCompany = null;

      if (scrapedJobs.length === 0) {
        scraperStatus.result = { message: `${type} scraping completed but no jobs found`, inserted: 0, updated: 0, totalScraped: 0, stats };
      } else {
        const { inserted, updated, newJobs } = await storage.bulkUpsertJobs(scrapedJobs);
        if (newJobs.length > 0) {
          matchNewJobsAgainstAlerts(newJobs).catch(err => console.error("Alert matching error:", err));
        }
        scraperStatus.result = {
          message: `${type} scraping completed. Found ${scrapedJobs.length} jobs. Inserted ${inserted} new, updated ${updated} existing.`,
          inserted,
          updated,
          totalScraped: scrapedJobs.length,
          stats,
        };
      }
      console.log(`[Scraper] Background ${type} scrape complete:`, scraperStatus.result.message);
    } catch (error: any) {
      console.error(`[Scraper] Background ${type} scrape failed:`, error);
      scraperStatus.error = error.message || "Unknown error";
    } finally {
      scraperStatus.isRunning = false;
      scraperStatus.completedAt = new Date().toISOString();
    }
  }

  app.post("/api/admin/scraper/run", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    if (scraperStatus.isRunning) {
      return res.status(409).json({ error: "A scrape is already in progress", status: scraperStatus });
    }
    runScrapeInBackground("Quick Scrape", scrapeAllLawFirms);
    res.json({ success: true, message: "Scraping started in background. Check status for progress." });
  });

  app.post("/api/admin/scraper/run-with-ai", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    if (scraperStatus.isRunning) {
      return res.status(409).json({ error: "A scrape is already in progress", status: scraperStatus });
    }
    runScrapeInBackground("AI Scrape", scrapeAllLawFirmsWithAI);
    res.json({ success: true, message: "AI scraping started in background. Check status for progress." });
  });

  app.post("/api/admin/scraper/yc", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    if (scraperStatus.isRunning) {
      return res.status(409).json({ error: "A scrape is already in progress", status: scraperStatus });
    }
    runScrapeInBackground("YC Companies", scrapeYCCompanies);
    res.json({ success: true, message: "YC scraping started in background. Check status for progress." });
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
      
      if (!isValidJobUrl(url)) {
        return res.status(400).json({ error: "This URL does not appear to be a job posting. It may be a blog post, news article, or generic career portal." });
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

  app.post("/api/admin/scraper/bulk-urls", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { urls } = req.body;
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: "An array of URLs is required" });
      }
      if (urls.length > 50) {
        return res.status(400).json({ error: "Maximum 50 URLs at a time" });
      }

      const validUrls = urls.filter((u: string) => {
        try { new URL(u.trim()); return isValidJobUrl(u.trim()); } catch { return false; }
      });

      console.log(`[Bulk Scraper] Processing ${validUrls.length} URLs...`);

      const { results, summary } = await scrapeBulkUrls(validUrls);

      let inserted = 0;
      let updated = 0;
      const savedJobs: any[] = [];

      for (const result of results) {
        if (!result.job) continue;
        try {
          let existing = await storage.getJobByExternalId(result.job.externalId!);
          if (!existing && result.job.applyUrl) {
            existing = await storage.getJobByApplyUrl(result.job.applyUrl);
          }
          if (existing) {
            await storage.updateJob(existing.id, result.job);
            updated++;
            savedJobs.push({ ...result.job, id: existing.id, status: 'updated' });
          } else {
            const jobWithPipeline = {
              ...result.job,
              pipelineStatus: 'raw',
              isPublished: false,
            };
            const saved = await storage.createJob(jobWithPipeline);
            inserted++;
            savedJobs.push({ ...saved, status: 'created' });
            if (!saved.structuredDescription && saved.description) {
              extractStructuredDescriptionBackground(saved.id, saved.description, saved.company, saved.title).catch(() => {});
            }
          }
        } catch (e: any) {
          console.error(`[Bulk Scraper] Error saving job from ${result.url}:`, e.message);
        }
      }

      res.json({
        success: true,
        summary: { ...summary, inserted, updated },
        results: results.map(r => ({
          url: r.url,
          success: !!r.job,
          title: r.job?.title,
          company: r.job?.company,
          error: r.error,
        })),
      });
    } catch (error: any) {
      console.error("Error bulk scraping:", error);
      res.status(500).json({ error: error.message || "Failed to bulk scrape URLs" });
    }
  });

  app.post("/api/admin/scraper/discover", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL is required" });
      }
      try { new URL(url); } catch { return res.status(400).json({ error: "Invalid URL format" }); }

      console.log(`[Discovery] Analyzing ${url} for job links...`);
      const discovery = await discoverJobLinksFromUrl(url);

      res.json({
        success: true,
        url,
        isListing: discovery.isListing,
        linksFound: discovery.links.length,
        links: discovery.links.slice(0, 50),
        embeddedATS: discovery.embeddedATS,
      });
    } catch (error: any) {
      console.error("Error discovering links:", error);
      res.status(500).json({ error: error.message || "Failed to discover job links" });
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

      if (!isValidJobUrl(url)) {
        return res.status(400).json({ error: "This URL does not appear to be a job posting." });
      }

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
          locationType: job.locationType || (job.isRemote ? 'remote' : 'onsite'),
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

  app.get("/api/admin/standardization-queue", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const status = req.query.status as string | undefined;
      const allJobs = status
        ? await storage.getJobsForStandardization(status)
        : await storage.getJobsForStandardization();

      const counts = {
        missing: 0,
        generated: 0,
        edited: 0,
        approved: 0,
        published: 0,
        total: allJobs.length,
      };

      for (const job of allJobs) {
        const s = (job.structuredStatus || "missing") as string;
        if (s in counts) counts[s as keyof typeof counts]++;
        if (job.isPublished) counts.published++;
      }

      res.json({ jobs: allJobs, counts });
    } catch (error) {
      console.error("Error fetching standardization queue:", error);
      res.status(500).json({ error: "Failed to fetch standardization queue" });
    }
  });

  app.post("/api/admin/jobs/bulk-publish", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const forceOverride = req.body?.forceOverride === true;
      const DANGEROUS_REVIEW_CODES = ['BROKEN_APPLY_LINK', 'AUDIT_TITLE_REJECT', 'AUDIT_COMPANY_REJECT', 'HARD_REJECT', 'NON_ENGLISH', 'GARBAGE_DESCRIPTION', 'GENERIC_APPLY_URL', 'LOW_QUALITY_SCRAPE', 'ARTICLE_TITLE', 'AUDIT_DUPLICATE'];
      const approvedJobs = await storage.getJobsForStandardization("approved");
      let published = 0;
      let skipped = 0;
      for (const job of approvedJobs) {
        if (!job.isPublished) {
          if (!forceOverride) {
            if (job.qualityScore !== null && job.qualityScore < 80) { skipped++; continue; }
            if (job.reviewReasonCode && DANGEROUS_REVIEW_CODES.includes(job.reviewReasonCode)) { skipped++; continue; }
            const desc = (job.description || '').trim();
            if (desc.length < 100 || desc.includes('Skip to main content')) { skipped++; continue; }
          }
          await storage.publishJob(job.id);
          published++;
        }
      }
      clearAllStatsCaches();
      clearDisplayStats();
      res.json({ published, skipped, total: approvedJobs.length });
    } catch (error) {
      console.error("Error bulk publishing:", error);
      res.status(500).json({ error: "Failed to bulk publish" });
    }
  });

  app.get("/api/diagnostics/jobs/:id", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const jobId = parseInt(req.params.id as string);
      if (isNaN(jobId)) return res.status(400).json({ error: "Invalid job ID" });

      const now = new Date().toISOString();
      const job = await storage.getJob(jobId);

      if (!job) {
        return res.json({
          jobId,
          publiclyVisible: false,
          notLiveReasons: ["NOT_FOUND"],
          recommendedFixes: ["This job ID does not exist in the database."],
          checks: {
            exists: false, isPublished: false, isActive: false,
            pipelineStatus: null, jobStatus: null,
            source: null,
          },
          publicRule: "isPublished && isActive && pipelineStatus==='ready' && jobStatus==='open'",
          now,
        });
      }

      const { isJobLive, getNotLiveReasons } = await import('./lib/job-visibility');
      const live = isJobLive(job);
      const notLiveReasons = live ? [] : getNotLiveReasons(job);
      const recommendedFixes: string[] = [];

      if (notLiveReasons.includes('NOT_PUBLISHED')) {
        recommendedFixes.push("Use Publish button to set this job live.");
      }
      if (notLiveReasons.includes('INACTIVE')) {
        recommendedFixes.push("Job is inactive. Publishing will also set isActive=true.");
      }
      if (notLiveReasons.includes('PIPELINE_NOT_READY')) {
        recommendedFixes.push(`Pipeline status is '${job.pipelineStatus}'. Publishing will set it to 'ready', or use repair-visibility.`);
      }
      if (notLiveReasons.includes('JOB_NOT_OPEN')) {
        recommendedFixes.push(`Job status is '${job.jobStatus}'. Publishing will set it to 'open'. Check reviewReasonCode: ${job.reviewReasonCode || 'none'}.`);
      }

      res.json({
        jobId,
        publiclyVisible: live,
        isPublished: !!job.isPublished,
        isLive: live,
        notLiveReasons,
        recommendedFixes,
        checks: {
          exists: true,
          isPublished: !!job.isPublished,
          isActive: !!job.isActive,
          pipelineStatus: job.pipelineStatus || null,
          jobStatus: job.jobStatus || null,
          reviewReasonCode: job.reviewReasonCode || null,
          source: job.source || null,
        },
        publicRule: "isPublished && isActive && pipelineStatus==='ready' && jobStatus==='open'",
        now,
      });
    } catch (error) {
      console.error("Error running job diagnostics:", error);
      res.status(500).json({ error: "Failed to run diagnostics" });
    }
  });

  app.post("/api/admin/jobs/:id/generate-structured", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const id = parseInt(req.params.id as string);
      const job = await storage.getJob(id);
      if (!job) return res.status(404).json({ error: "Job not found" });

      const structured = await extractStructuredDescription(
        job.description || "",
        job.company,
        job.title
      );

      const validation = validateStructuredDescription(structured);

      const updated = await storage.updateStructuredStatus(id, "generated", structured);

      res.json({ job: updated, validation });
    } catch (error) {
      console.error("Error generating structured description:", error);
      res.status(500).json({ error: "Failed to generate structured description" });
    }
  });

  app.post("/api/admin/jobs/:id/validate-structured", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const id = parseInt(req.params.id as string);
      const job = await storage.getJob(id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      if (!job.structuredDescription) {
        return res.json({ valid: false, issues: ["No structured description exists"] });
      }

      const validation = validateStructuredDescription(job.structuredDescription as any);
      res.json(validation);
    } catch (error) {
      console.error("Error validating structured description:", error);
      res.status(500).json({ error: "Failed to validate" });
    }
  });

  app.post("/api/admin/jobs/:id/approve", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const id = parseInt(req.params.id as string);
      const job = await storage.getJob(id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      if (!job.structuredDescription) {
        return res.status(400).json({ error: "Job has no structured description to approve" });
      }

      const validation = validateStructuredDescription(job.structuredDescription as any);
      if (!validation.valid) {
        return res.status(400).json({ error: "Structured description does not pass quality checks", issues: validation.issues });
      }

      const updated = await storage.updateStructuredStatus(id, "approved");
      res.json({ job: updated });
    } catch (error) {
      console.error("Error approving job:", error);
      res.status(500).json({ error: "Failed to approve job" });
    }
  });

  app.post("/api/admin/jobs/:id/publish", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const id = parseInt(req.params.id as string);
      const job = await storage.getJob(id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      if (job.structuredStatus !== "approved") {
        return res.status(400).json({ error: "Job must be approved before publishing" });
      }

      const forceOverride = req.body?.forceOverride === true;
      if (!forceOverride) {
        const DANGEROUS_REVIEW_CODES = ['BROKEN_APPLY_LINK', 'AUDIT_TITLE_REJECT', 'AUDIT_COMPANY_REJECT', 'HARD_REJECT', 'NON_ENGLISH', 'GARBAGE_DESCRIPTION', 'GENERIC_APPLY_URL', 'LOW_QUALITY_SCRAPE', 'ARTICLE_TITLE', 'AUDIT_DUPLICATE'];
        if (job.qualityScore !== null && job.qualityScore < 80) {
          return res.status(400).json({ error: `Quality score is ${job.qualityScore} (below 80). Set forceOverride=true to publish anyway.`, warning: 'LOW_QUALITY_SCORE' });
        }
        if (job.reviewReasonCode && DANGEROUS_REVIEW_CODES.includes(job.reviewReasonCode)) {
          return res.status(400).json({ error: `Job has review reason code '${job.reviewReasonCode}'. Set forceOverride=true to publish anyway.`, warning: 'DANGEROUS_REVIEW_CODE' });
        }
        const desc = (job.description || '').trim();
        if (desc.length < 100 || desc.includes('Skip to main content')) {
          return res.status(400).json({ error: 'Job description is too short or contains scraper artifacts. Set forceOverride=true to publish anyway.', warning: 'BAD_DESCRIPTION' });
        }
      }

      const updated = await storage.publishJob(id);
      clearAllStatsCaches();
      clearDisplayStats();
      res.json({ job: updated });
    } catch (error) {
      console.error("Error publishing job:", error);
      res.status(500).json({ error: "Failed to publish job" });
    }
  });

  app.post("/api/admin/jobs/:id/unpublish", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const id = parseInt(req.params.id as string);
      const updated = await storage.unpublishJob(id);
      if (!updated) return res.status(404).json({ error: "Job not found" });
      clearAllStatsCaches();
      clearDisplayStats();
      res.json({ job: updated });
    } catch (error) {
      console.error("Error unpublishing job:", error);
      res.status(500).json({ error: "Failed to unpublish job" });
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
        companyLogo: companySlug ? `https://www.google.com/s2/favicons?domain=${companySlug}.com&sz=128` : null,
        location: jobData.location || "Not specified",
        isRemote: Boolean(jobData.isRemote),
        locationType: jobData.locationType || (jobData.isRemote ? 'remote' : 'onsite'),
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
        for (const j of newJobs) {
          if (!j.structuredDescription && j.description) {
            extractStructuredDescriptionBackground(j.id, j.description, j.company, j.title).catch(() => {});
          }
        }
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

  // === NORMALIZATION + QA ENDPOINTS ===

  app.post("/api/admin/jobs/normalize", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { title, company, location, originalUrl, originalDescription } = req.body;
      const rawText = originalDescription || '';

      if (!rawText && !originalUrl) {
        return res.status(400).json({ error: "Provide either a description or a URL" });
      }

      let descriptionText = rawText;

      if (originalUrl && !rawText) {
        try {
          const scraped = await scrapeSingleJobUrl(originalUrl, false);
          if (scraped) {
            descriptionText = scraped.description || '';
            const merged = {
              title: title || scraped.title || '',
              company: company || scraped.company || '',
              location: location || scraped.location || '',
              description: descriptionText,
              applyUrl: originalUrl,
            };
            const parsed = parseDescriptionDeterministic(descriptionText, merged.title, merged.company);
            const qaResult = runQAChecks({
              title: merged.title,
              company: merged.company,
              location: merged.location,
              description: descriptionText,
              roleCategory: scraped.roleCategory || '',
              keySkills: parsed.coreSkills,
              aiSummary: parsed.summary,
              structuredDescription: {
                summary: parsed.summary,
                aboutCompany: '',
                responsibilities: parsed.responsibilities,
                minimumQualifications: parsed.minimumQualifications,
                preferredQualifications: parsed.preferredQualifications,
                skillsRequired: parsed.coreSkills,
                seniority: '',
                legalTechCategory: '',
              } as any,
            } as any);

            return res.json({
              normalized: {
                title: merged.title,
                company: merged.company,
                location: merged.location,
                summary: parsed.summary,
                responsibilities: parsed.responsibilities,
                minimumQualifications: parsed.minimumQualifications,
                preferredQualifications: parsed.preferredQualifications,
                coreSkills: parsed.coreSkills,
                compensation: parsed.compensation,
                originalUrl,
                originalDescription: descriptionText,
                roleCategory: scraped.roleCategory || '',
                seniorityLevel: scraped.seniorityLevel || '',
              },
              qa: qaResult,
            });
          }
        } catch (err: any) {
          console.error("[Normalize] URL scrape failed:", err.message);
        }
      }

      const parsed = parseDescriptionDeterministic(descriptionText, title || '', company || '');
      const qaResult = runQAChecks({
        title: title || '',
        company: company || '',
        location: location || '',
        description: descriptionText,
        roleCategory: '',
        keySkills: parsed.coreSkills,
        aiSummary: parsed.summary,
        structuredDescription: {
          summary: parsed.summary,
          aboutCompany: '',
          responsibilities: parsed.responsibilities,
          minimumQualifications: parsed.minimumQualifications,
          preferredQualifications: parsed.preferredQualifications,
          skillsRequired: parsed.coreSkills,
          seniority: '',
          legalTechCategory: '',
        } as any,
      } as any);

      res.json({
        normalized: {
          title: title || '',
          company: company || '',
          location: location || '',
          summary: parsed.summary,
          responsibilities: parsed.responsibilities,
          minimumQualifications: parsed.minimumQualifications,
          preferredQualifications: parsed.preferredQualifications,
          coreSkills: parsed.coreSkills,
          compensation: parsed.compensation,
          originalUrl: originalUrl || '',
          originalDescription: descriptionText,
          roleCategory: '',
          seniorityLevel: '',
        },
        qa: qaResult,
      });
    } catch (error: any) {
      console.error("[Normalize] Error:", error);
      res.status(500).json({ error: error.message || "Normalization failed" });
    }
  });

  app.post("/api/admin/jobs/create-draft", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const body = req.body;
      if (!body.title || !body.company) {
        return res.status(400).json({ error: "Title and company are required" });
      }

      const defaults = enforceJobDefaults({
        title: body.title,
        company: body.company,
        location: body.location || 'Not specified',
        isRemote: Boolean(body.isRemote),
        locationType: body.locationType || (body.isRemote ? 'remote' : 'unknown'),
        description: body.originalDescription || body.description || `${body.title} at ${body.company}`,
        applyUrl: body.originalUrl || body.applyUrl || '#',
        isActive: true,
        isPublished: false,
        pipelineStatus: 'raw',
        source: body.source || 'admin-manual',
        externalId: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        roleCategory: body.roleCategory || null,
        seniorityLevel: body.seniorityLevel || null,
        keySkills: body.coreSkills || [],
        aiSummary: body.summary || '',
        structuredDescription: {
          summary: body.summary || '',
          aboutCompany: body.aboutCompany || '',
          responsibilities: body.responsibilities || [],
          minimumQualifications: body.minimumQualifications || [],
          preferredQualifications: body.preferredQualifications || [],
          skillsRequired: body.coreSkills || [],
          seniority: body.seniorityLevel || '',
          legalTechCategory: body.roleCategory || '',
        },
        structuredStatus: 'generated',
      }) as any;

      defaults.jobHash = generateJobHash(defaults.company, defaults.title, defaults.location, defaults.applyUrl);

      const isDup = await checkDuplicate(defaults.jobHash);
      if (isDup) {
        return res.status(409).json({ error: "A similar job already exists (duplicate detected)" });
      }

      const qaResult = runQAChecks(defaults);
      defaults.qaStatus = qaResult.qaStatus;
      defaults.qaErrors = qaResult.errors;
      defaults.qaWarnings = qaResult.warnings;
      defaults.lawyerFirstScore = qaResult.lawyerFirstScore;
      defaults.qaExcludeReason = qaResult.excludeReason;
      defaults.qaCheckedAt = new Date();

      const { inserted, newJobs } = await storage.bulkUpsertJobs([defaults]);

      res.json({
        success: true,
        message: "Draft created",
        jobId: newJobs.length > 0 ? newJobs[0].id : null,
        inserted,
        qa: qaResult,
      });
    } catch (error: any) {
      console.error("[Create Draft] Error:", error);
      res.status(500).json({ error: error.message || "Failed to create draft" });
    }
  });

  app.post("/api/admin/jobs/:id/qa-check", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const id = parseInt(req.params.id as string);
      const job = await storage.getJob(id);
      if (!job) return res.status(404).json({ error: "Job not found" });

      const qaResult = runQAChecks(job);

      await storage.updateJob(id, {
        qaStatus: qaResult.qaStatus,
        qaErrors: qaResult.errors,
        qaWarnings: qaResult.warnings,
        lawyerFirstScore: qaResult.lawyerFirstScore,
        qaExcludeReason: qaResult.excludeReason,
        qaCheckedAt: new Date(),
      } as any);

      res.json({ jobId: id, ...qaResult });
    } catch (error: any) {
      console.error("[QA Check] Error:", error);
      res.status(500).json({ error: "QA check failed" });
    }
  });

  app.post("/api/admin/jobs/:id/qa-publish", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const id = parseInt(req.params.id as string);
      const forceOverride = req.body?.forceOverride === true;
      const job = await storage.getJob(id);
      if (!job) return res.status(404).json({ error: "Job not found" });

      const qaResult = runQAChecks(job);

      if (qaResult.errors.length > 0 && !forceOverride) {
        return res.status(400).json({
          error: "Job failed QA checks",
          qaStatus: qaResult.qaStatus,
          errors: qaResult.errors,
          warnings: qaResult.warnings,
          lawyerFirstScore: qaResult.lawyerFirstScore,
        });
      }

      if (qaResult.qaStatus === 'needs_review' && !forceOverride) {
        return res.status(400).json({
          error: "Job needs review before publishing (low lawyer relevance score)",
          qaStatus: qaResult.qaStatus,
          errors: qaResult.errors,
          warnings: qaResult.warnings,
          lawyerFirstScore: qaResult.lawyerFirstScore,
        });
      }

      const updated = await storage.updateJob(id, {
        isPublished: true,
        pipelineStatus: 'ready',
        structuredStatus: job.structuredStatus === 'missing' ? 'generated' : job.structuredStatus,
        legalRelevanceScore: qaResult.lawyerFirstScore,
        qaStatus: qaResult.qaStatus,
        qaErrors: qaResult.errors,
        qaWarnings: qaResult.warnings,
        lawyerFirstScore: qaResult.lawyerFirstScore,
        qaExcludeReason: qaResult.excludeReason,
        qaCheckedAt: new Date(),
      } as any);

      clearAllStatsCaches();
      clearDisplayStats();
      res.json({
        success: true,
        job: updated,
        qa: qaResult,
      });
    } catch (error: any) {
      console.error("[QA Publish] Error:", error);
      res.status(500).json({ error: "Failed to publish job" });
    }
  });

  app.post("/api/admin/jobs/bulk-import", isAuthenticated, adminUpload.single("file"), async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      let jobsData: any[] = [];

      if (req.file) {
        const content = req.file.buffer.toString('utf-8');
        const ext = (req.file.originalname || '').toLowerCase();

        if (ext.endsWith('.json')) {
          const parsed = JSON.parse(content);
          jobsData = Array.isArray(parsed) ? parsed : [parsed];
        } else if (ext.endsWith('.csv')) {
          const lines = content.split('\n').filter((l: string) => l.trim());
          if (lines.length < 2) {
            return res.status(400).json({ error: "CSV must have headers and at least one row" });
          }
          const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''));
            const row: any = {};
            headers.forEach((h: string, idx: number) => { row[h] = vals[idx] || ''; });
            jobsData.push(row);
          }
        } else {
          return res.status(400).json({ error: "Upload a .json or .csv file" });
        }
      } else if (req.body.jobs && Array.isArray(req.body.jobs)) {
        jobsData = req.body.jobs;
      } else {
        return res.status(400).json({ error: "Provide a file upload or a jobs array in the body" });
      }

      if (jobsData.length > 200) {
        return res.status(400).json({ error: "Maximum 200 jobs per import" });
      }

      const results: Array<{
        index: number;
        title: string;
        company: string;
        status: 'created' | 'duplicate' | 'failed';
        qaStatus?: string;
        errors?: any[];
        warnings?: any[];
        lawyerFirstScore?: number;
        jobId?: number;
        error?: string;
      }> = [];

      for (let i = 0; i < jobsData.length; i++) {
        const raw = jobsData[i];
        try {
          const title = (raw.title || '').trim();
          const company = (raw.company || '').trim();
          const location = (raw.location || 'Not specified').trim();
          const description = (raw.originalDescription || raw.description || '').trim();
          const applyUrl = (raw.originalUrl || raw.applyUrl || raw.apply_url || '#').trim();

          if (!title || !company) {
            results.push({ index: i, title, company, status: 'failed', error: 'Title and company required' });
            continue;
          }

          const hash = generateJobHash(company, title, location, applyUrl);
          const isDup = await checkDuplicate(hash);
          if (isDup) {
            results.push({ index: i, title, company, status: 'duplicate', error: 'Duplicate job' });
            continue;
          }

          const parsed = parseDescriptionDeterministic(description, title, company);
          const jobForQA = {
            title, company, location, description,
            roleCategory: raw.roleCategory || '',
            keySkills: parsed.coreSkills,
            aiSummary: parsed.summary,
            structuredDescription: {
              summary: parsed.summary,
              aboutCompany: '',
              responsibilities: parsed.responsibilities,
              minimumQualifications: parsed.minimumQualifications,
              preferredQualifications: parsed.preferredQualifications,
              skillsRequired: parsed.coreSkills,
              seniority: '',
              legalTechCategory: '',
            },
          } as any;

          const qaResult = runQAChecks(jobForQA);

          const insertData = enforceJobDefaults({
            title,
            company,
            location,
            isRemote: Boolean(raw.isRemote),
            locationType: raw.isRemote ? 'remote' : 'unknown',
            description: description || `${title} at ${company}`,
            applyUrl,
            isActive: true,
            isPublished: false,
            pipelineStatus: 'raw',
            source: raw.source || 'bulk-import',
            externalId: raw.sourceId || `import_${Date.now()}_${i}`,
            roleCategory: raw.roleCategory || '',
            seniorityLevel: raw.seniorityLevel || '',
            keySkills: parsed.coreSkills,
            aiSummary: parsed.summary,
            jobHash: hash,
            legalRelevanceScore: qaResult.lawyerFirstScore,
            structuredDescription: jobForQA.structuredDescription,
            structuredStatus: 'generated',
            qaStatus: qaResult.qaStatus,
            qaErrors: qaResult.errors,
            qaWarnings: qaResult.warnings,
            lawyerFirstScore: qaResult.lawyerFirstScore,
            qaExcludeReason: qaResult.excludeReason,
            qaCheckedAt: new Date(),
          }) as any;

          const { newJobs } = await storage.bulkUpsertJobs([insertData]);
          const jobId = newJobs.length > 0 ? newJobs[0].id : undefined;

          results.push({
            index: i,
            title,
            company,
            status: 'created',
            qaStatus: qaResult.qaStatus,
            errors: qaResult.errors,
            warnings: qaResult.warnings,
            lawyerFirstScore: qaResult.lawyerFirstScore,
            jobId,
          });
        } catch (err: any) {
          results.push({
            index: i,
            title: raw.title || '',
            company: raw.company || '',
            status: 'failed',
            error: err.message || 'Unknown error',
          });
        }
      }

      const created = results.filter(r => r.status === 'created').length;
      const duplicates = results.filter(r => r.status === 'duplicate').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const passed = results.filter(r => r.qaStatus === 'passed').length;
      const needsReview = results.filter(r => r.qaStatus === 'needs_review').length;
      const qaFailed = results.filter(r => r.qaStatus === 'failed').length;

      res.json({
        success: true,
        summary: { total: jobsData.length, created, duplicates, failed, passed, needsReview, qaFailed },
        results,
      });
    } catch (error: any) {
      console.error("[Bulk Import] Error:", error);
      res.status(500).json({ error: error.message || "Bulk import failed" });
    }
  });

  app.get("/api/admin/jobs/review-queue", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const filter = (req.query.filter as string) || 'all';
      const allJobs = await db.select().from(jobs)
        .where(
          and(
            eq(jobs.isActive, true),
            eq(jobs.isPublished, false),
          )
        )
        .orderBy(jobs.id)
        .limit(200);

      const withQA = allJobs.map(job => {
        const qa = job.qaStatus
          ? {
              qaStatus: job.qaStatus as string,
              errors: (job.qaErrors as any[]) || [],
              warnings: (job.qaWarnings as any[]) || [],
              lawyerFirstScore: job.lawyerFirstScore ?? 0,
              excludeReason: job.qaExcludeReason || null,
            }
          : runQAChecks(job);
        return { ...job, qa };
      });

      let filtered = withQA;
      if (filter === 'passed') {
        filtered = withQA.filter(j => j.qa.qaStatus === 'passed');
      } else if (filter === 'needs_review') {
        filtered = withQA.filter(j => j.qa.qaStatus === 'needs_review');
      } else if (filter === 'failed') {
        filtered = withQA.filter(j => j.qa.qaStatus === 'failed');
      }

      res.json({
        total: filtered.length,
        jobs: filtered.map(j => ({
          id: j.id,
          title: j.title,
          company: j.company,
          location: j.location,
          roleCategory: j.roleCategory,
          source: j.source,
          pipelineStatus: j.pipelineStatus,
          qualityScore: j.qualityScore,
          legalRelevanceScore: j.legalRelevanceScore,
          relevanceConfidence: j.relevanceConfidence,
          reviewReasonCode: j.reviewReasonCode,
          structuredStatus: j.structuredStatus,
          qa: j.qa,
          createdAt: j.postedDate,
        })),
      });
    } catch (error: any) {
      console.error("[Review Queue] Error:", error);
      res.status(500).json({ error: "Failed to load review queue" });
    }
  });

  app.post("/api/admin/requeue-unenriched", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const candidates = await db.select({ id: jobs.id, title: jobs.title, company: jobs.company })
        .from(jobs)
        .where(and(
          or(eq(jobs.pipelineStatus, 'rejected'), eq(jobs.pipelineStatus, 'failed')),
          eq(jobs.isActive, true),
          isNull(jobs.qualityScore),
        ));

      if (candidates.length === 0) {
        return res.json({ requeued: 0, message: "No un-enriched jobs found" });
      }

      const ids = candidates.map(c => c.id);
      await db.update(jobs)
        .set({ pipelineStatus: 'raw', enrichmentRetries: 0 } as any)
        .where(inArray(jobs.id, ids));

      console.log(`[Admin] Re-queued ${ids.length} un-enriched jobs for processing`);
      res.json({ requeued: ids.length, jobs: candidates.slice(0, 20) });
    } catch (error: any) {
      console.error("[Admin] Requeue unenriched error:", error);
      res.status(500).json({ error: "Failed to requeue jobs" });
    }
  });

  app.post("/api/admin/bulk-approve-review", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const minQuality = Number(req.body.minQuality) || 7;
      const minRelevance = Number(req.body.minRelevance) || 6;

      const candidates = await db.select().from(jobs).where(and(
        eq(jobs.pipelineStatus, 'review'),
        eq(jobs.isActive, true),
        gte(jobs.qualityScore, minQuality),
        gte(jobs.legalRelevanceScore, minRelevance),
      ));

      let approved = 0;
      let published = 0;
      let skipped = 0;
      const publishedJobs: Array<{ id: number; title: string; company: string }> = [];

      for (const job of candidates) {
        const hasUrl = job.applyUrl && job.applyUrl.trim() !== '';
        if (!hasUrl || !job.roleCategory) { skipped++; continue; }
        if (isGenericBusinessRole(job.title) && (job.legalRelevanceScore ?? 0) < 8) { skipped++; continue; }
        if (hasNegativeAiSignal(job.aiSummary)) { skipped++; continue; }
        if (isBackOfficeTitle(job.title)) { skipped++; continue; }

        const dup = await storage.findLiveJobDuplicate(job.title, job.company, job.location, job.id);
        if (dup) { skipped++; continue; }

        await db.update(jobs)
          .set({ pipelineStatus: 'ready', reviewStatus: 'approved' } as any)
          .where(eq(jobs.id, job.id));
        approved++;

        await storage.updateJobWorkerFields(job.id, { isPublished: true, reviewReasonCode: null });
        publishedJobs.push({ id: job.id, title: job.title, company: job.company });
        published++;
      }

      if (published > 0) { clearAllStatsCaches(); clearDisplayStats(); }
      console.log(`[Admin] Bulk approve review: ${approved} approved, ${published} published, ${skipped} skipped`);
      res.json({ approved, published, skipped, total: candidates.length, publishedJobs: publishedJobs.slice(0, 50) });
    } catch (error: any) {
      console.error("[Admin] Bulk approve review error:", error);
      res.status(500).json({ error: "Failed to bulk approve" });
    }
  });

  app.post("/api/admin/data-cleanup", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const result = await runDataCleanup(true);
      res.json({
        success: true,
        message: "Data cleanup completed",
        results: result,
      });
    } catch (error: any) {
      console.error("Error running data cleanup:", error);
      res.status(500).json({ error: "Failed to run data cleanup" });
    }
  });

  app.post("/api/admin/jobs/publish-all-eligible", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const candidates = await db.select().from(jobs).where(
        and(
          eq(jobs.pipelineStatus, 'ready'),
          eq(jobs.isPublished, false),
          eq(jobs.isActive, true),
          eq(jobs.jobStatus, 'open')
        )
      );

      let published = 0;
      let skipped = 0;
      const publishedJobs: Array<{ id: number; title: string; company: string }> = [];

      for (const job of candidates) {
        const thresholds = getQualityThresholds(job.company);
        const relevance = job.legalRelevanceScore ?? 0;
        const quality = job.qualityScore ?? 0;
        const confidence = job.relevanceConfidence ?? 0;

        const passesGate = quality >= thresholds.qualityThreshold
          && relevance >= thresholds.minRelevance
          && confidence >= thresholds.minConfidence
          && job.roleCategory !== null
          && job.applyUrl && job.applyUrl.trim() !== ''
          && !(isGenericBusinessRole(job.title) && relevance < 8);

        if (!passesGate) { skipped++; continue; }

        const dup = await storage.findLiveJobDuplicate(job.title, job.company, job.location, job.id);
        if (dup) { skipped++; continue; }

        await storage.updateJobWorkerFields(job.id, { isPublished: true, reviewReasonCode: null });
        publishedJobs.push({ id: job.id, title: job.title, company: job.company });
        published++;
      }

      console.log(`[Admin] Publish All Eligible: ${published} published, ${skipped} skipped out of ${candidates.length} candidates`);
      if (published > 0) { clearAllStatsCaches(); clearDisplayStats(); }
      res.json({ published, skipped, total: candidates.length, publishedJobs: publishedJobs.slice(0, 50) });
    } catch (error: any) {
      console.error("[Admin] Publish All Eligible error:", error);
      res.status(500).json({ error: "Failed to publish eligible jobs" });
    }
  });

  app.post("/api/admin/jobs/bulk-qa-publish", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { jobIds } = req.body;
      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({ error: "Provide an array of job IDs" });
      }

      const results: Array<{ id: number; status: 'published' | 'failed'; error?: string }> = [];

      for (const id of jobIds.slice(0, 100)) {
        try {
          const job = await storage.getJob(id);
          if (!job) {
            results.push({ id, status: 'failed', error: 'Job not found' });
            continue;
          }

          const qaResult = runQAChecks(job);
          if (qaResult.errors.length > 0) {
            results.push({ id, status: 'failed', error: `QA failed: ${qaResult.errors.map(e => e.message).join(', ')}` });
            continue;
          }

          await storage.updateJob(id, {
            isPublished: true,
            pipelineStatus: 'ready',
            legalRelevanceScore: qaResult.lawyerFirstScore,
            qaStatus: qaResult.qaStatus,
            qaErrors: qaResult.errors,
            qaWarnings: qaResult.warnings,
            lawyerFirstScore: qaResult.lawyerFirstScore,
            qaExcludeReason: qaResult.excludeReason,
            qaCheckedAt: new Date(),
          } as any);

          results.push({ id, status: 'published' });
        } catch (err: any) {
          results.push({ id, status: 'failed', error: err.message });
        }
      }

      const published = results.filter(r => r.status === 'published').length;
      if (published > 0) { clearAllStatsCaches(); clearDisplayStats(); }
      res.json({ success: true, published, total: results.length, results });
    } catch (error: any) {
      console.error("[Bulk QA Publish] Error:", error);
      res.status(500).json({ error: "Bulk publish failed" });
    }
  });

  app.post("/api/admin/jobs/quick-add", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { urls } = req.body;
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: "Provide an array of URLs" });
      }

      if (urls.length > 20) {
        return res.status(400).json({ error: "Maximum 20 URLs at a time" });
      }

      const validUrls: string[] = [];
      const results: Array<{ url: string; status: 'added' | 'updated' | 'failed' | 'skipped'; title?: string; company?: string; error?: string }> = [];
      for (const raw of urls) {
        const u = String(raw).trim();
        if (!u) continue;
        try {
          const parsed = new URL(u);
          if (['http:', 'https:'].includes(parsed.protocol)) {
            validUrls.push(u);
          } else {
            results.push({ url: u, status: 'skipped', error: 'Not a valid HTTP/HTTPS URL' });
          }
        } catch {
          results.push({ url: u, status: 'skipped', error: 'Invalid URL format' });
        }
      }

      if (validUrls.length === 0) {
        return res.status(400).json({ error: "No valid URLs found", results });
      }

      for (const url of validUrls) {
        try {
          if (!isValidJobUrl(url)) {
            results.push({ url, status: 'skipped', error: 'URL does not appear to be a job posting' });
            continue;
          }
          console.log(`[Quick Add] Processing: ${url}`);
          const job = await scrapeSingleJobUrl(url);
          if (!job) {
            results.push({ url, status: 'failed', error: 'Could not extract job details' });
            continue;
          }

          const companySlug = (job.company || '').toLowerCase().replace(/[^a-z0-9]/g, "");
          const insertData: any = {
            title: job.title?.substring(0, 255),
            company: job.company?.substring(0, 255),
            companyLogo: companySlug ? `https://www.google.com/s2/favicons?domain=${companySlug}.com&sz=128` : null,
            location: job.location || null,
            isRemote: Boolean(job.isRemote),
            locationType: job.locationType || (job.isRemote ? 'remote' : 'onsite'),
            salaryMin: job.salaryMin ? Number(job.salaryMin) : null,
            salaryMax: job.salaryMax ? Number(job.salaryMax) : null,
            experienceMin: job.experienceMin ? Number(job.experienceMin) : null,
            experienceMax: job.experienceMax ? Number(job.experienceMax) : null,
            roleType: job.roleType || null,
            description: job.description || `${job.title} at ${job.company}`,
            requirements: null,
            applyUrl: job.applyUrl || url,
            isActive: true,
            externalId: job.externalId || `quick_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            source: job.source || "quick-add",
            roleCategory: job.roleCategory || null,
            roleSubcategory: job.roleSubcategory || null,
            seniorityLevel: job.seniorityLevel || null,
            keySkills: job.keySkills || null,
            aiSummary: job.aiSummary || null,
            matchKeywords: job.matchKeywords || null,
            pipelineStatus: 'raw',
            isPublished: false,
          };

          const { inserted, updated, newJobs } = await storage.bulkUpsertJobs([insertData]);
          if (newJobs.length > 0) {
            matchNewJobsAgainstAlerts(newJobs).catch(err => console.error("Alert matching error:", err));
            for (const j of newJobs) {
              if (!j.structuredDescription && j.description) {
                extractStructuredDescriptionBackground(j.id, j.description, j.company, j.title).catch(() => {});
              }
            }
          }

          results.push({
            url,
            status: inserted > 0 ? 'added' : 'updated',
            title: job.title || undefined,
            company: job.company || undefined,
          });
        } catch (err: any) {
          console.error(`[Quick Add] Error processing ${url}:`, err.message);
          results.push({ url, status: 'failed', error: err.message || 'Unknown error' });
        }
      }

      const added = results.filter(r => r.status === 'added').length;
      const updated = results.filter(r => r.status === 'updated').length;
      const failed = results.filter(r => r.status === 'failed').length;

      res.json({
        success: true,
        summary: { total: validUrls.length, added, updated, failed },
        results,
      });
    } catch (error: any) {
      console.error("[Quick Add] Error:", error);
      res.status(500).json({ error: error.message || "Failed to process URLs" });
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
      const reviewStatus = req.query.reviewStatus as string;
      const showArchived = req.query.showArchived === "true";

      let filtered = allJobs;

      if (!showArchived) {
        filtered = filtered.filter(j =>
          j.jobStatus !== 'archived' && j.pipelineStatus !== 'archived'
        );
      }

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
      if (reviewStatus) {
        if (reviewStatus === "unscored") {
          filtered = filtered.filter(j => j.legalRelevanceScore === null || j.legalRelevanceScore === undefined);
        } else {
          filtered = filtered.filter(j => j.reviewStatus === reviewStatus);
        }
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
        "title", "company", "location", "isRemote", "locationType", "salaryMin", "salaryMax",
        "roleType", "description", "requirements", "applyUrl", "isActive",
        "roleCategory", "roleSubcategory", "seniorityLevel", "keySkills", "aiSummary",
        "legalRelevanceScore", "reviewStatus", "structuredDescription",
        "experienceMin", "experienceMax", "experienceText",
        "isPublished", "pipelineStatus", "jobStatus",
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

      if (updates.isPublished === true) {
        const existingJob = await storage.getJob(id);
        if (existingJob) {
          const relevance = updates.legalRelevanceScore ?? existingJob.legalRelevanceScore ?? 0;
          const category = updates.roleCategory ?? existingJob.roleCategory;
          if (relevance < 6) {
            return res.status(400).json({ error: `Cannot publish: relevance score ${relevance} is below minimum (6). Update the relevance score first.` });
          }
          if (!category) {
            return res.status(400).json({ error: "Cannot publish: role category is required. Assign a category first." });
          }
        }
      }

      const user = req.user as any;
      updates.manuallyEdited = true;
      updates.editedBy = user?.id || null;
      updates.editedAt = new Date();

      const updated = await storage.updateJob(id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (updates.description && !updates.structuredDescription) {
        extractStructuredDescriptionBackground(id, updated.description, updated.company, updated.title).catch(() => {});
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

      const now = new Date();
      await storage.updateJobWorkerFields(id, {
        isActive: false,
        isPublished: false,
        jobStatus: 'archived',
        pipelineStatus: 'archived',
        deactivatedAt: now,
        closedAt: now,
        statusChangedAt: now,
      });
      clearAllStatsCaches();
      clearDisplayStats();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error archiving job:", error);
      res.status(500).json({ error: "Failed to archive job" });
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

      const [categorization, structured] = await Promise.all([
        categorizeJob(job.title, job.description, job.company),
        extractStructuredDescription(job.description, job.company, job.title),
      ]);
      const updateData: any = {
        roleCategory: categorization.category,
        roleSubcategory: categorization.subcategory,
        seniorityLevel: categorization.seniorityLevel,
        keySkills: categorization.keySkills,
        aiSummary: categorization.aiSummary,
        matchKeywords: categorization.matchKeywords,
        aiResponsibilities: categorization.aiResponsibilities || null,
        aiQualifications: categorization.aiQualifications || null,
        aiNiceToHaves: categorization.aiNiceToHaves || null,
        legalRelevanceScore: categorization.legalRelevanceScore,
        reviewStatus: categorization.reviewStatus,
        structuredDescription: structured,
      };
      if (categorization.reviewStatus === "rejected") {
        updateData.isActive = false;
      }
      const updated = await storage.updateJob(id, updateData);

      res.json({ success: true, job: updated, categorization });
    } catch (error: any) {
      console.error("Error recategorizing job:", error);
      res.status(500).json({ error: "Failed to recategorize job" });
    }
  });

  let structuredBackfillRunning = false;
  app.post("/api/admin/jobs/backfill-structured", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    if (structuredBackfillRunning) {
      return res.json({ message: "Backfill already in progress" });
    }
    structuredBackfillRunning = true;
    const batchSize = parseInt(req.query.batchSize as string) || 5;
    const limit = parseInt(req.query.limit as string) || 999;
    try {
      const allJobs = await storage.getJobs();
      const needsStructuring = allJobs.filter(j => !j.structuredDescription && j.description).slice(0, limit);
      res.json({ message: `Starting backfill for ${needsStructuring.length} jobs`, total: needsStructuring.length });

      let done = 0;
      let errors = 0;
      for (let i = 0; i < needsStructuring.length; i += batchSize) {
        const batch = needsStructuring.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (job) => {
            try {
              const structured = await extractStructuredDescription(job.description, job.company, job.title);
              await storage.updateJob(job.id, { structuredDescription: structured } as any);
              done++;
              if (done % 10 === 0) {
                console.log(`Structured backfill: ${done}/${needsStructuring.length} jobs processed`);
              }
            } catch (err: any) {
              errors++;
              console.error(`Structured backfill error for job ${job.id}:`, err.message);
            }
          })
        );
        if (i + batchSize < needsStructuring.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
      console.log(`Structured backfill complete: ${done} processed, ${errors} errors`);
    } catch (err) {
      console.error("Structured backfill error:", err);
    } finally {
      structuredBackfillRunning = false;
    }
  });

  app.get("/api/admin/jobs/backfill-status", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    const allJobs = await storage.getJobs();
    const total = allJobs.length;
    const structured = allJobs.filter(j => j.structuredDescription).length;
    res.json({ total, structured, remaining: total - structured, running: structuredBackfillRunning });
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
      let rejected = 0;
      const batchSize = 5;
      for (let i = 0; i < needsCategorization.length; i += batchSize) {
        const batch = needsCategorization.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (job) => {
            try {
              const result = await categorizeJob(job.title, job.description, job.company);
              const updateData: any = {
                roleCategory: result.category,
                roleSubcategory: result.subcategory,
                seniorityLevel: result.seniorityLevel,
                keySkills: result.keySkills,
                aiSummary: result.aiSummary,
                matchKeywords: result.matchKeywords,
                aiResponsibilities: result.aiResponsibilities || null,
                aiQualifications: result.aiQualifications || null,
                aiNiceToHaves: result.aiNiceToHaves || null,
                legalRelevanceScore: result.legalRelevanceScore,
                reviewStatus: result.reviewStatus,
              };
              if (result.reviewStatus === "rejected") {
                updateData.isActive = false;
                rejected++;
              }
              await storage.updateJob(job.id, updateData);
              done++;
              if (done % 10 === 0) {
                console.log(`Categorized ${done}/${needsCategorization.length} jobs (${rejected} rejected)`);
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
      console.log(`Finished re-categorizing ${done}/${needsCategorization.length} jobs (${rejected} rejected as irrelevant)`);
    } catch (error: any) {
      console.error("Error re-categorizing jobs:", error);
    }
  });

  app.post("/api/admin/scan-relevance", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const allJobs = await storage.getActiveJobs();
      const unscored = allJobs.filter(j => j.legalRelevanceScore === null || j.legalRelevanceScore === undefined);
      
      const batchLimit = req.body.limit ? Math.min(parseInt(req.body.limit), allJobs.length) : allJobs.length;
      const toProcess = unscored.slice(0, batchLimit);

      console.log(`Scanning ${toProcess.length} jobs for legal relevance (${unscored.length} total unscored)...`);
      res.json({
        success: true,
        message: `Scanning ${toProcess.length} jobs for legal relevance in background...`,
        total: unscored.length,
        processing: toProcess.length,
      });

      let done = 0;
      let approved = 0;
      let needsReview = 0;
      let rejected = 0;
      const batchSize = 5;
      for (let i = 0; i < toProcess.length; i += batchSize) {
        const batch = toProcess.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (job) => {
            try {
              const result = await categorizeJob(job.title, job.description, job.company);
              const updateData: any = {
                legalRelevanceScore: result.legalRelevanceScore,
                reviewStatus: result.reviewStatus,
              };
              if (!job.roleCategory || job.roleCategory === '') {
                updateData.roleCategory = result.category;
                updateData.roleSubcategory = result.subcategory;
                updateData.seniorityLevel = result.seniorityLevel;
                updateData.keySkills = result.keySkills;
                updateData.aiSummary = result.aiSummary;
                updateData.matchKeywords = result.matchKeywords;
                updateData.aiResponsibilities = result.aiResponsibilities || null;
                updateData.aiQualifications = result.aiQualifications || null;
                updateData.aiNiceToHaves = result.aiNiceToHaves || null;
              }
              if (result.reviewStatus === "rejected") {
                updateData.isActive = false;
                rejected++;
              } else if (result.reviewStatus === "approved") {
                approved++;
              } else {
                needsReview++;
              }
              await storage.updateJob(job.id, updateData);
              done++;
              if (done % 10 === 0) {
                console.log(`Scanned ${done}/${toProcess.length}: ${approved} approved, ${needsReview} needs review, ${rejected} rejected`);
              }
            } catch (err: any) {
              console.error(`Failed to scan job ${job.id} (${job.title}):`, err.message);
            }
          })
        );
        if (i + batchSize < toProcess.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      console.log(`Relevance scan complete: ${done} processed — ${approved} approved, ${needsReview} needs review, ${rejected} rejected`);
    } catch (error: any) {
      console.error("Error scanning relevance:", error);
    }
  });

  app.get("/api/admin/relevance-stats", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const allJobs = await storage.getJobs();
      const active = allJobs.filter(j => j.isActive);
      const stats = {
        totalJobs: allJobs.length,
        activeJobs: active.length,
        scored: active.filter(j => j.legalRelevanceScore !== null).length,
        unscored: active.filter(j => j.legalRelevanceScore === null).length,
        approved: allJobs.filter(j => j.reviewStatus === 'approved').length,
        needsReview: allJobs.filter(j => j.reviewStatus === 'needs_review').length,
        rejected: allJobs.filter(j => j.reviewStatus === 'rejected').length,
        byScore: {
          high: active.filter(j => j.legalRelevanceScore && j.legalRelevanceScore >= 7).length,
          medium: active.filter(j => j.legalRelevanceScore && j.legalRelevanceScore >= 4 && j.legalRelevanceScore < 7).length,
          low: active.filter(j => j.legalRelevanceScore && j.legalRelevanceScore < 4).length,
        }
      };
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get relevance stats" });
    }
  });

  app.post("/api/admin/jobs/:id/review", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid job ID" });
      
      const { action } = req.body;
      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
      }
      
      const updateData: any = {
        reviewStatus: action === 'approve' ? 'approved' : 'rejected',
        manuallyEdited: true,
        editedAt: new Date(),
      };
      if (req.user && (req.user as any).id) {
        updateData.editedBy = (req.user as any).id;
      }
      if (action === 'reject') {
        updateData.isActive = false;
      } else if (action === 'approve') {
        updateData.isActive = true;
      }
      
      const updated = await storage.updateJob(id, updateData);
      if (!updated) return res.status(404).json({ error: "Job not found" });
      
      res.json({ success: true, job: updated });
    } catch (error: any) {
      console.error("Error reviewing job:", error);
      res.status(500).json({ error: "Failed to review job" });
    }
  });

  app.post("/api/admin/enrich-structured", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const allJobs = await storage.getActiveJobs();
      const needsEnrichment = allJobs.filter(
        (j) => j.roleCategory && (!j.aiResponsibilities || j.aiResponsibilities.length === 0)
      );

      const batchLimit = req.body.limit ? Math.min(parseInt(req.body.limit), 100) : 50;
      const toProcess = needsEnrichment.slice(0, batchLimit);

      console.log(`Enriching ${toProcess.length} of ${needsEnrichment.length} jobs needing structured data...`);
      res.json({
        success: true,
        message: `Enriching ${toProcess.length} jobs in background (${needsEnrichment.length} total need enrichment)...`,
        total: needsEnrichment.length,
        processing: toProcess.length,
      });

      let done = 0;
      const batchSize = 3;
      for (let i = 0; i < toProcess.length; i += batchSize) {
        const batch = toProcess.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (job) => {
            try {
              const result = await categorizeJob(job.title, job.description, job.company);
              const structuredUpdate: Record<string, any> = {};
              if (result.aiResponsibilities && result.aiResponsibilities.length > 0) {
                structuredUpdate.aiResponsibilities = result.aiResponsibilities;
              }
              if (result.aiQualifications && result.aiQualifications.length > 0) {
                structuredUpdate.aiQualifications = result.aiQualifications;
              }
              if (result.aiNiceToHaves && result.aiNiceToHaves.length > 0) {
                structuredUpdate.aiNiceToHaves = result.aiNiceToHaves;
              }
              if (!job.aiSummary && result.aiSummary) {
                structuredUpdate.aiSummary = result.aiSummary;
              }
              if (Object.keys(structuredUpdate).length > 0) {
                await storage.updateJob(job.id, structuredUpdate);
              }
              done++;
              if (done % 5 === 0) {
                console.log(`Enriched ${done}/${toProcess.length} jobs`);
              }
            } catch (err) {
              console.error(`Failed to enrich job ${job.id} (${job.title}):`, err);
            }
          })
        );
        if (i + batchSize < toProcess.length) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
      console.log(`Finished enriching ${done}/${toProcess.length} jobs with structured data`);
    } catch (error: any) {
      console.error("Error enriching jobs:", error);
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

  app.get("/api/admin/pipeline-stats", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const stats = await storage.getPipelineStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching pipeline stats:", error);
      res.status(500).json({ error: "Failed to fetch pipeline stats" });
    }
  });

  app.post("/api/admin/backfill-countries", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { backfillCountryCodes } = await import("./scripts/backfill-countries");
      const result = await backfillCountryCodes();
      res.json(result);
    } catch (error: any) {
      console.error("Country backfill error:", error);
      res.status(500).json({ error: error.message });
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

  app.post("/api/admin/scraper/enrich-descriptions", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const enriched = await enrichShortDescriptions();
      res.json({ success: true, enriched, message: `Enriched ${enriched} jobs with full descriptions` });
    } catch (error: any) {
      console.error("Description enrichment error:", error);
      res.status(500).json({ error: "Failed to enrich descriptions", details: error.message });
    }
  });

  // Get scrape run history
  app.get("/api/admin/scraper/runs", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const runs = await storage.getScrapeRuns(limit);
      res.json(runs);
    } catch (error) {
      console.error("Error getting scrape runs:", error);
      res.status(500).json({ error: "Failed to get scrape runs" });
    }
  });

  app.get("/api/admin/scraper/runs/:runId/sources", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const runId = parseInt(req.params.runId);
      if (isNaN(runId)) return res.status(400).json({ error: "Invalid run ID" });
      const sources = await storage.getRunSourcesByRunId(runId);
      res.json(sources);
    } catch (error) {
      console.error("Error getting run sources:", error);
      res.status(500).json({ error: "Failed to get run sources" });
    }
  });

  app.get("/api/admin/scraper/source-health", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const lastNRuns = parseInt(req.query.runs as string) || 30;
      const rates = await storage.getSourceSuccessRates(lastNRuns);
      res.json(rates);
    } catch (error) {
      console.error("Error getting source health:", error);
      res.status(500).json({ error: "Failed to get source health" });
    }
  });

  app.get("/api/admin/scraper/rejections", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const rejections = await storage.getRecentRejections(limit);
      res.json(rejections);
    } catch (error) {
      console.error("Error getting rejections:", error);
      res.status(500).json({ error: "Failed to get rejections" });
    }
  });

  app.get("/api/admin/scraper/rejection-reasons", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const days = parseInt(req.query.days as string) || 7;
      const reasons = await storage.getTopRejectionReasons(days);
      res.json(reasons);
    } catch (error) {
      console.error("Error getting rejection reasons:", error);
      res.status(500).json({ error: "Failed to get rejection reasons" });
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
      runScheduledScrape('manual').catch(err => console.error('Background scrape failed:', err));
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
      const userId = req.user!.id;
      const days = parseInt(req.query.days as string) || 30;
      const [data, recentlyViewed, newSinceLastVisit, briefing, dashAdminCheck, subData] = await Promise.all([
        storage.getUserDashboard(userId, Math.min(days, 90)),
        storage.getRecentlyViewedJobs(userId, 8),
        storage.getNewJobsSinceLastVisit(userId),
        storage.getDailyBriefing(userId),
        storage.isUserAdmin(userId),
        storage.getUserSubscription(userId),
      ]);
      const isPro = dashAdminCheck || (subData?.subscriptionTier === "pro" && subData?.subscriptionStatus === "active");
      res.json({ ...data, isPro, recentlyViewed, newSinceLastVisit, briefing });
    } catch (error) {
      console.error("Error fetching user dashboard:", error);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  app.get("/api/user/email-preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      let prefs = await storage.getEmailPreferences(userId);
      if (!prefs) {
        prefs = await storage.upsertEmailPreferences(userId, {});
      }
      res.json(prefs);
    } catch (error) {
      console.error("Error fetching email preferences:", error);
      res.status(500).json({ error: "Failed to fetch email preferences" });
    }
  });

  app.patch("/api/user/email-preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { weeklyDigest, alertEmails } = req.body;
      const updateData: any = {};
      if (typeof weeklyDigest === "boolean") updateData.weeklyDigest = weeklyDigest;
      if (typeof alertEmails === "boolean") updateData.alertEmails = alertEmails;
      const prefs = await storage.upsertEmailPreferences(userId, updateData);
      res.json(prefs);
    } catch (error) {
      console.error("Error updating email preferences:", error);
      res.status(500).json({ error: "Failed to update email preferences" });
    }
  });

  app.get("/api/unsubscribe/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const prefs = await storage.getEmailPreferenceByUnsubscribeToken(token);
      if (!prefs) {
        return res.status(404).send(`<!DOCTYPE html><html><head><title>Not Found</title></head><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f4f6f8"><div style="text-align:center;padding:40px;background:white;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><h1 style="color:#1e293b">Link Not Found</h1><p style="color:#64748b">This unsubscribe link is invalid or expired.</p></div></body></html>`);
      }
      await storage.upsertEmailPreferences(prefs.userId, { weeklyDigest: false });
      res.send(`<!DOCTYPE html><html><head><title>Unsubscribed</title></head><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f4f6f8"><div style="text-align:center;padding:40px;background:white;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><h1 style="color:#1e293b">Unsubscribed</h1><p style="color:#64748b">You've been unsubscribed from weekly digest emails.</p><p style="color:#94a3b8;font-size:14px">You can re-enable emails anytime from your dashboard.</p></div></body></html>`);
    } catch (error) {
      console.error("Unsubscribe error:", error);
      res.status(500).send("Something went wrong");
    }
  });

  app.get("/api/usage/limits", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userIsAdmin = await storage.isUserAdmin(userId);
      const subData = await storage.getUserSubscription(userId);
      const isPro = userIsAdmin || (subData?.subscriptionTier === "pro" && subData?.subscriptionStatus === "active");
      const dailyChatCount = await storage.getDailyAssistantChatCount(userId);
      const savedJobCount = await storage.getSavedJobCount(userId);
      const guidedSearchCount = await storage.getGuidedSearchCount(userId);
      res.json({
        isPro,
        chat: { used: dailyChatCount, limit: isPro ? null : 5, resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString() },
        savedJobs: { used: savedJobCount, limit: isPro ? null : 10 },
        guidedSearch: { used: guidedSearchCount, limit: isPro ? null : 5 },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage limits" });
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

  app.get("/api/admin/analytics/anonymous-funnel", isAuthenticated, async (req, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const days = parseInt(req.query.days as string) || 30;
      const funnel = await storage.getAnonymousFunnel(days);
      res.json(funnel);
    } catch (error) {
      console.error("Anonymous funnel error:", error);
      res.status(500).json({ error: "Failed to fetch anonymous funnel" });
    }
  });

  app.get("/api/admin/email-preview/:type", isAuthenticated, async (req: any, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const { type } = req.params;
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "https://lawjobs.co";
      let html = "";

      if (type === "digest-free" || type === "digest-pro") {
        const isPro = type === "digest-pro";
        const content = buildDigestContent({
          greeting: "Hi Alex,",
          newJobsCount: 12,
          topJobs: [
            { id: 1, title: "Legal Product Manager", company: "Clio", category: "Legal Product Management" },
            { id: 2, title: "Legal Operations Analyst", company: "Harvey AI", category: "Legal Operations" },
            ...(isPro ? [
              { id: 3, title: "Contracts Platform Lead", company: "Ironclad", category: "Contract Technology" },
              { id: 4, title: "Legal AI Engineer", company: "Anthropic", category: "Legal AI & Machine Learning" },
              { id: 5, title: "Legal Tech Consultant", company: "Deloitte", category: "Legal Consulting & Advisory" },
            ] : []),
          ],
          pipelineSummary: "Your pipeline: 3 applied, 1 interviewing",
          marketPulse: { totalJobs: 364, trendingSkill: "Legal Technology" },
          isPro,
        });
        html = buildEmailTemplate(content, `${baseUrl}/api/unsubscribe/preview-token`);
      } else if (type === "welcome") {
        const content = buildWelcomeEmailContent("Alex");
        html = buildEmailTemplate(content);
      } else if (type === "pro-upgrade") {
        const content = buildProUpgradeEmailContent("Alex");
        html = buildEmailTemplate(content);
      } else {
        return res.status(400).json({ error: "Invalid type. Use: digest-free, digest-pro, welcome, pro-upgrade" });
      }

      res.set("Content-Type", "text/html");
      res.send(html);
    } catch (error: any) {
      console.error("Email preview error:", error);
      res.status(500).json({ error: "Failed to generate email preview" });
    }
  });

  app.post("/api/admin/email-test-send", isAuthenticated, async (req: any, res) => {
    if (!(await isAdminCheck(req))) return res.status(403).json({ error: "Admin access required" });
    try {
      const user = req.user as any;
      if (!user?.email) return res.status(400).json({ error: "No email on your account" });

      const { type } = req.body;
      if (!type || !["digest-free", "digest-pro", "welcome", "pro-upgrade"].includes(type)) {
        return res.status(400).json({ error: "Invalid type. Use: digest-free, digest-pro, welcome, pro-upgrade" });
      }

      const firstName = user.firstName || "Admin";
      let subject = "";
      let html = "";

      if (type === "digest-free" || type === "digest-pro") {
        const isPro = type === "digest-pro";
        const baseUrl = process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : "https://lawjobs.co";
        const content = buildDigestContent({
          greeting: `Hi ${firstName},`,
          newJobsCount: 12,
          topJobs: [
            { id: 1, title: "Legal Product Manager", company: "Clio", category: "Legal Product Management" },
            { id: 2, title: "Legal Operations Analyst", company: "Harvey AI", category: "Legal Operations" },
            ...(isPro ? [
              { id: 3, title: "Contracts Platform Lead", company: "Ironclad", category: "Contract Technology" },
              { id: 4, title: "Legal AI Engineer", company: "Anthropic", category: "Legal AI & Machine Learning" },
              { id: 5, title: "Legal Tech Consultant", company: "Deloitte", category: "Legal Consulting & Advisory" },
            ] : []),
          ],
          pipelineSummary: "Your pipeline: 3 applied, 1 interviewing",
          marketPulse: { totalJobs: 364, trendingSkill: "Legal Technology" },
          isPro,
        });
        subject = `[TEST] 12 new legal tech roles this week`;
        html = buildEmailTemplate(content, `${baseUrl}/api/unsubscribe/preview-token`);
      } else if (type === "welcome") {
        const content = buildWelcomeEmailContent(firstName);
        subject = "[TEST] Welcome to Legal Tech Careers";
        html = buildEmailTemplate(content);
      } else if (type === "pro-upgrade") {
        const content = buildProUpgradeEmailContent(firstName);
        subject = "[TEST] Welcome to Pro — your upgrade is active";
        html = buildEmailTemplate(content);
      }

      const success = await sendEmail(user.email, subject, html);
      res.json({ success, message: success ? `Test email sent to ${user.email}` : "Failed to send email" });
    } catch (error: any) {
      console.error("Email test send error:", error);
      res.status(500).json({ error: "Failed to send test email" });
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
        max_tokens: 4000,
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
    } catch (error: any) {
      console.error("Career advisor error:", error?.message || error, error?.response?.data || "");
      const msg = error?.message?.includes("model") ? "AI model temporarily unavailable" : "Failed to analyze career options. Please try again.";
      res.status(500).json({ error: msg });
    }
  });

  // ===== Market Analytics (accessible to all authenticated users for soft paywall) =====
  app.get("/api/analytics/market", isAuthenticated, async (req, res) => {
    try {
      const allJobs = await storage.getActiveJobs();

      const totalJobs = allJobs.length;
      if (totalJobs === 0) {
        return res.json({
          overview: { totalJobs: 0, totalCompanies: 0, totalCategories: 0, remoteJobs: 0, hybridJobs: 0, onsiteJobs: 0, hybridOrOnsite: 0, remotePercentage: 0, avgSalaryMin: null, avgSalaryMax: null, totalViews: 0, totalApplyClicks: 0 },
          categoryBreakdown: [], seniorityBreakdown: [], topSkills: [], topCompanies: [], topSubcategories: [], experienceRanges: { entry: 0, mid: 0, senior: 0, expert: 0 },
        });
      }

      const companies = new Set(allJobs.map((j) => j.company));
      const totalCompanies = companies.size;
      const remoteJobs = allJobs.filter((j) => j.locationType === 'remote' || (!j.locationType && j.isRemote)).length;
      const hybridJobs = allJobs.filter((j) => j.locationType === 'hybrid').length;
      const onsiteJobs = allJobs.filter((j) => j.locationType === 'onsite' || (!j.locationType && !j.isRemote)).length;
      const hybridOrOnsite = totalJobs - remoteJobs;

      const MAX_REASONABLE_SALARY = 400000;
      const jobsWithSalaryMin = allJobs.filter((j) => j.salaryMin && j.salaryMin > 0 && j.salaryMin <= MAX_REASONABLE_SALARY);
      const jobsWithSalaryMax = allJobs.filter((j) => j.salaryMax && j.salaryMax > 0 && j.salaryMax <= MAX_REASONABLE_SALARY);

      const median = (arr: number[]) => {
        if (arr.length === 0) return null;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
      };

      const medianSalaryMin = median(jobsWithSalaryMin.map(j => j.salaryMin!));
      const medianSalaryMax = median(jobsWithSalaryMax.map(j => j.salaryMax!));
      const avgSalaryMin = jobsWithSalaryMin.length > 0
        ? Math.round(jobsWithSalaryMin.reduce((s, j) => s + j.salaryMin!, 0) / jobsWithSalaryMin.length)
        : null;
      const avgSalaryMax = jobsWithSalaryMax.length > 0
        ? Math.round(jobsWithSalaryMax.reduce((s, j) => s + j.salaryMax!, 0) / jobsWithSalaryMax.length)
        : null;
      const jobsWithSalary = jobsWithSalaryMin.length;
      const jobsWithoutSalary = totalJobs - allJobs.filter((j) => (j.salaryMin && j.salaryMin > 0) || (j.salaryMax && j.salaryMax > 0)).length;

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

      const jobsWithExperience = allJobs.filter((j) => j.experienceMin != null && j.experienceMin >= 0);
      const experienceRanges = {
        entry: jobsWithExperience.filter((j) => j.experienceMin! <= 2).length,
        mid: jobsWithExperience.filter((j) => j.experienceMin! >= 3 && j.experienceMin! <= 5).length,
        senior: jobsWithExperience.filter((j) => j.experienceMin! >= 6 && j.experienceMin! <= 9).length,
        expert: jobsWithExperience.filter((j) => j.experienceMin! >= 10).length,
        unspecified: allJobs.length - jobsWithExperience.length,
      };

      res.json({
        overview: {
          totalJobs,
          totalCompanies,
          totalCategories: categoryBreakdown.length,
          remoteJobs,
          hybridJobs,
          onsiteJobs,
          hybridOrOnsite,
          remotePercentage: Math.round((remoteJobs / totalJobs) * 100),
          hybridPercentage: Math.round((hybridJobs / totalJobs) * 100),
          onsitePercentage: Math.round((onsiteJobs / totalJobs) * 100),
          avgSalaryMin,
          avgSalaryMax,
          medianSalaryMin,
          medianSalaryMax,
          jobsWithSalary,
          jobsWithoutSalary,
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
      const entryLevelCount = allJobs.filter((j) => ["Entry", "Junior", "Associate", "Intern", "Fellowship", "Mid"].includes(j.seniorityLevel || "")).length;

      const facts = `LEGAL TECH JOB MARKET DATA (from ${totalJobs} active listings):

OVERVIEW:
- ${totalJobs} active positions across ${companies.size} companies
- ${remoteJobs} remote positions (${Math.round((remoteJobs / totalJobs) * 100)}% of all jobs)
- ${entryLevelCount} entry-level positions (includes ${internFellowshipCount} internships & fellowships)
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
        model: "gpt-4o",
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

      const chatAdminCheck = await storage.isUserAdmin(userId);
      const subData = await storage.getUserSubscription(userId);
      const isPro = chatAdminCheck || (subData?.subscriptionTier === "pro" && subData?.subscriptionStatus === "active");
      const FREE_DAILY_CHAT_LIMIT = 5;
      if (!isPro) {
        const dailyCount = await storage.getDailyAssistantChatCount(userId);
        if (dailyCount >= FREE_DAILY_CHAT_LIMIT) {
          return res.status(403).json({
            error: `You've used all ${FREE_DAILY_CHAT_LIMIT} free messages today. Upgrade to Pro for unlimited conversations.`,
            upgradeUrl: "/pricing",
            limitReached: true,
            limit: FREE_DAILY_CHAT_LIMIT,
            current: dailyCount,
            resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
          });
        }
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

      const systemPrompt = `You are a friendly and knowledgeable role explainer for Legal Tech Careers, a job platform for legal professionals exploring technology careers. Your role is to help users understand job listings and role requirements in plain English.

ROLE BOUNDARIES — STRICTLY ENFORCED:
You are a "Role Explainer" ONLY. You explain what a job is, what it requires, and what day-to-day work looks like.

You MUST NOT:
- Suggest resume edits, rewrites, or bullet point changes
- Tell the user what to emphasize, reorder, or highlight in their resume
- Provide match scores or fit percentages
- Recommend career paths, long-term transitions, or stepping-stone roles
- Output rewritten bullet text of any kind

If the user asks questions like "What should I highlight in my application?", "How should I rewrite my resume?", or "What should I emphasize?", you MUST redirect:
"That's a great question — but it falls under **Alignment Strategy**, which gives you structured guidance on positioning your resume for this role. You can find it in the 'Improve Your Application' section below. Here, I can explain what this role requires so you understand it clearly."
Then provide the role requirement explanation (not application advice).

You MAY:
- Explain responsibilities and day-to-day work
- Translate technical requirements into plain language
- Define terms, acronyms, and industry jargon
- Describe what the role typically expects (general requirements)
- Give examples of what "success in the role" looks like (non-resume-specific)
- Explain which parts of legal experience are typically useful for a given type of role (general mapping, not resume coaching)

FORMATTING GUIDELINES:
- Use plain, everyday language. Avoid jargon. If you must use a technical term, explain it simply in parentheses.
- Be warm but concise. Keep responses focused and helpful.
- Never mention that you are an AI or use phrases like "AI-powered".
- When discussing a specific job, break down what the role actually involves day-to-day.
- If the user asks about something you don't have data for, say so honestly rather than guessing.
- Format responses with short paragraphs. Use **bold** for emphasis on key points.
- When listing items, use bullet points (- item) for readability.
${personaContext ? `\nYou have access to this user's behavioral profile from their activity on the platform. Use it to personalize your responses:
- Reference their interests and activity patterns naturally, don't list them back robotically.
- Mention relevant job listings that match their interests when helpful.
- Tailor language to their career stage (e.g., more detailed explanations for early-career, more nuanced for senior).
- If they've been exploring specific companies or categories, proactively mention relevant opportunities.
- Never say "based on your profile" or "your data shows." Instead, weave personalization naturally: "Since you've been looking at compliance roles..." or "Given your interest in remote positions..."` : ""}
${jobContext ? "\nThe user is currently looking at a specific job posting. Use the job details below to answer their questions about this role." : ""}
${resumeContext ? "\nThe user has uploaded their resume. Use their background to provide context, but do NOT give resume editing advice — only explain the role requirements." : ""}
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
        model: "gpt-4o",
        messages,
        temperature: 0.6,
        max_tokens: 1200,
      });

      const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

      if (userId) {
        storage.logActivity({
          userId,
          eventType: 'assistant_chat',
          entityType: 'chat',
          metadata: { context: context?.pageContext || 'general' },
        }).catch(() => {});
      }

      res.json({ reply });
    } catch (error) {
      console.error("Assistant chat error:", error);
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

      const allEvents: any[] = [];
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
        allEvents.push(...events.slice(0, 20));
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
        allEvents.push(req.body);
      }

      for (const evt of allEvents) {
        const jobId = evt.entityId ? Number(evt.entityId) : null;
        if (jobId && !isNaN(jobId)) {
          if (evt.eventType === "job_view") {
            storage.trackJobView(jobId).catch(() => {});
          } else if (evt.eventType === "apply_click") {
            storage.trackApplyClick(jobId).catch(() => {});
            storage.getApplicationByUserAndJob(userId, jobId).then(existing => {
              if (!existing) {
                storage.createJobApplication({
                  userId,
                  jobId,
                  status: "applied",
                  notes: null,
                  appliedDate: new Date(),
                }).catch(err => console.error("Auto-track application error:", err));
              }
            }).catch(() => {});
          }
        }
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
      const products = await stripe.products.list({ active: true, limit: 100 });
      const proProduct = products.data.find(p => p.name === 'Legal Tech Careers Pro');
      if (!proProduct) {
        return res.json({ prices: [] });
      }
      const prices = await stripe.prices.list({ product: proProduct.id, active: true });
      res.json({
        product: {
          id: proProduct.id,
          name: proProduct.name,
          description: proProduct.description,
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
        const userEmail = user?.email || user?.claims?.email;
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
      console.error("Checkout session error:", error?.message, error?.type, error?.statusCode);
      const message = error?.type === 'StripeInvalidRequestError'
        ? `Stripe error: ${error.message}`
        : "Failed to create checkout session";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/stripe/confirm-checkout", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const subData = await storage.getUserSubscription(userId);
      if (!subData?.stripeCustomerId) {
        return res.json({ status: "no_customer" });
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: subData.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        await storage.updateUserSubscription(userId, {
          stripeSubscriptionId: sub.id,
          subscriptionTier: "pro",
          subscriptionStatus: "active",
        });
        return res.json({ status: "active", tier: "pro" });
      }

      return res.json({ status: subData.subscriptionStatus || "inactive", tier: subData.subscriptionTier || "free" });
    } catch (error: any) {
      console.error("Confirm checkout error:", error?.message);
      res.status(500).json({ error: "Failed to confirm checkout status" });
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

      const isAdmin = await storage.isUserAdmin(userId);
      if (isAdmin) {
        return res.json({ tier: "pro", status: "active", currentPeriodEnd: null, adminOverride: true });
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
        max_tokens: 2000,
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
  app.post("/api/built-resumes/:id/ats-review", isAuthenticated, requirePro, async (req, res) => {
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
        max_tokens: 3000,
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
        max_tokens: 3000,
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
        max_tokens: 3000,
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

  // --- Job Applications / Pipeline ---

  app.get("/api/applications/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const apps = await storage.getUserApplications(userId);
      const stats: Record<string, number> = { applied: 0, interviewing: 0, offer: 0, rejected: 0 };
      for (const app of apps) {
        const s = app.status || "applied";
        stats[s] = (stats[s] || 0) + 1;
      }
      res.json(stats);
    } catch (error) {
      console.error("Application stats error:", error);
      res.status(500).json({ error: "Failed to get application stats" });
    }
  });

  app.get("/api/applications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const apps = await storage.getUserApplications(userId);
      res.json(apps);
    } catch (error) {
      console.error("Get applications error:", error);
      res.status(500).json({ error: "Failed to get applications" });
    }
  });

  app.post("/api/applications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { jobId, status, notes } = req.body;
      if (!jobId) return res.status(400).json({ error: "jobId is required" });
      const existing = await storage.getApplicationByUserAndJob(userId, Number(jobId));
      if (existing) return res.status(409).json({ error: "Application already exists", application: existing });
      const app = await storage.createJobApplication({
        userId,
        jobId: Number(jobId),
        status: status || "applied",
        notes: notes || null,
        appliedDate: new Date(),
      });
      res.json(app);
    } catch (error) {
      console.error("Create application error:", error);
      res.status(500).json({ error: "Failed to create application" });
    }
  });

  app.patch("/api/applications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const { status, notes, appliedDate } = req.body;
      const allowedStatuses = ["saved", "applied", "interviewing", "offer", "rejected"];
      if (status !== undefined && !allowedStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status. Allowed: " + allowedStatuses.join(", ") });
      }
      const data: any = {};
      if (status !== undefined) data.status = status;
      if (notes !== undefined) data.notes = notes;
      if (appliedDate !== undefined) data.appliedDate = new Date(appliedDate);
      const updated = await storage.updateJobApplication(id, userId, data);
      if (!updated) return res.status(404).json({ error: "Application not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update application error:", error);
      res.status(500).json({ error: "Failed to update application" });
    }
  });

  app.delete("/api/applications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      await storage.deleteJobApplication(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete application error:", error);
      res.status(500).json({ error: "Failed to delete application" });
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
      const savedAdminCheck = await storage.isUserAdmin(userId);
      const subData = await storage.getUserSubscription(userId);
      const isPro = savedAdminCheck || (subData?.subscriptionTier === "pro" && subData?.subscriptionStatus === "active");
      if (!isPro) {
        const savedCount = await storage.getSavedJobCount(userId);
        if (savedCount >= 10) {
          return res.status(403).json({
            error: "Free accounts can save up to 10 jobs. Upgrade to Pro for unlimited saves.",
            upgradeUrl: "/pricing",
            limitReached: true,
            limit: 10,
            current: savedCount,
          });
        }
      }
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
  app.post("/api/jobs/:id/tailor-click", async (req: any, res) => {
    res.json({ ok: true });
  });

  app.get("/api/jobs/:id/similar", async (req: any, res) => {
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

  app.post("/api/admin/jobs/repair-visibility", isAuthenticated, async (req: any, res) => {
    if (!(await isAdminCheck(req))) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const { isJobLive } = await import('./lib/job-visibility');
      const allPublished = await storage.getJobsByPipelineStatus('published');
      const notLive = allPublished.filter(j => j.isPublished && !isJobLive(j));
      const updatedIds: number[] = [];
      for (const job of notLive) {
        await storage.updateJobPipeline(job.id, {
          isActive: true,
          pipelineStatus: 'ready',
          jobStatus: 'open',
        });
        updatedIds.push(job.id);
      }
      const allReady = await storage.getJobsByPipelineStatus('ready');
      const readyNotLive = allReady.filter(j => j.isPublished && !isJobLive(j));
      for (const job of readyNotLive) {
        if (!updatedIds.includes(job.id)) {
          await storage.updateJobPipeline(job.id, {
            isActive: true,
            pipelineStatus: 'ready',
            jobStatus: 'open',
          });
          updatedIds.push(job.id);
        }
      }
      res.json({ updatedCount: updatedIds.length, updatedIds });
    } catch (error) {
      console.error("Error repairing visibility:", error);
      res.status(500).json({ error: "Failed to repair visibility" });
    }
  });

  // ── Resume Editor API ──────────────────────────────────────
  const { runOrchestrator, generateDocx, generatePdf, generateApplyPack } = await import("./lib/agents/orchestrator");

  app.get("/api/resume/:resumeId/editor", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const resumeId = parseInt(req.params.resumeId);
      const jobId = parseInt(req.query.jobId as string);

      if (isNaN(resumeId) || isNaN(jobId)) {
        return res.status(400).json({ error: "Valid resumeId and jobId are required" });
      }

      const resume = await db.select().from(resumes).where(
        and(eq(resumes.id, resumeId), eq(resumes.userId, userId))
      ).limit(1);

      if (resume.length === 0) {
        return res.status(404).json({ error: "Resume not found" });
      }

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const existing = await db.select().from(resumeEditorVersions).where(
        and(
          eq(resumeEditorVersions.userId, userId),
          eq(resumeEditorVersions.resumeId, resumeId),
          eq(resumeEditorVersions.jobId, jobId)
        )
      ).orderBy(desc(resumeEditorVersions.versionNumber)).limit(1);

      const existingVersion = existing.length > 0 ? existing[0] : null;

      let careerContext = null;
      try {
        const persona = await storage.getUserPersona(userId);
        if (persona?.careerIntelligence) {
          const intel = persona.careerIntelligence as any;
          if (intel.strengths?.length || intel.gaps?.length) {
            careerContext = {
              strengths: intel.strengths || [],
              gaps: intel.gaps || [],
            };
          }
        }
      } catch (err) {
        console.error("Non-blocking: failed to load career context for editor:", err);
      }

      const result = await runOrchestrator({
        resumeExtractedData: resume[0].extractedData,
        resumeText: resume[0].resumeText || undefined,
        existingVersion,
        jobId,
        jobTitle: job.title,
        jobCompany: job.company,
        jobDescription: job.description,
        jobRequirements: job.requirements || undefined,
        careerContext,
      });

      if (!existingVersion) {
        await db.insert(resumeEditorVersions).values({
          userId,
          resumeId,
          jobId,
          mode: "rewrite",
          versionNumber: 1,
          sections: result.sections as any,
          requirementMapping: result.jobRequirements as any,
          toConfirmItems: result.toConfirmItems as any,
          readyToApply: result.readyToApply,
          improvementsApplied: result.counts.improvementsApplied,
          needsConfirmationCount: result.counts.needsConfirmation,
          missingRequirementsCount: result.counts.missingRequirements,
          lastAgentRunAt: new Date(),
        });
      }

      res.json({
        sections: result.sections,
        jobRequirements: result.jobRequirements,
        toConfirmItems: result.toConfirmItems,
        readyToApply: result.readyToApply,
        counts: result.counts,
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
          description: job.description,
          requirements: job.requirements,
        },
        versionNumber: existingVersion?.versionNumber || 1,
      });
    } catch (error) {
      console.error("Error loading resume editor:", error);
      res.status(500).json({ error: "Failed to load resume editor" });
    }
  });

  app.post("/api/resume/:resumeId/editor/save", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const resumeId = parseInt(req.params.resumeId);
      const { sections, jobId, versionNumber } = req.body;

      if (isNaN(resumeId) || !sections || !jobId || isNaN(parseInt(jobId))) {
        return res.status(400).json({ error: "Valid resumeId, sections, and jobId are required" });
      }

      const resumeCheck = await db.select({ id: resumes.id }).from(resumes).where(
        and(eq(resumes.id, resumeId), eq(resumes.userId, userId))
      ).limit(1);
      if (resumeCheck.length === 0) {
        return res.status(404).json({ error: "Resume not found" });
      }

      const existing = await db.select().from(resumeEditorVersions).where(
        and(
          eq(resumeEditorVersions.userId, userId),
          eq(resumeEditorVersions.resumeId, resumeId),
          eq(resumeEditorVersions.jobId, jobId)
        )
      ).orderBy(desc(resumeEditorVersions.versionNumber)).limit(1);

      if (existing.length > 0 && versionNumber && existing[0].versionNumber > versionNumber) {
        return res.status(409).json({
          error: "Version conflict",
          message: "This resume has been modified in another tab. Please refresh to get the latest version.",
          serverVersion: existing[0].versionNumber,
        });
      }

      const newVersion = (existing.length > 0 ? existing[0].versionNumber : 0) + 1;

      const changedCount = sections.changedCount || 0;
      let ungrounded = 0;
      if (sections.summaryGrounded === false && !sections.summaryReverted) ungrounded++;
      for (const exp of (sections.experience || [])) {
        for (const b of (exp.bullets || [])) {
          if (b.grounded === false && !b.reverted) ungrounded++;
        }
      }
      const existingMapping = existing.length > 0 ? (existing[0].requirementMapping as any[]) || [] : [];
      const missingReqs = Array.isArray(existingMapping) ? existingMapping.filter((r: any) => r.coverage === "missing").length : 0;

      if (existing.length > 0) {
        await db.update(resumeEditorVersions)
          .set({
            sections: sections as any,
            versionNumber: newVersion,
            improvementsApplied: changedCount,
            needsConfirmationCount: ungrounded,
            missingRequirementsCount: missingReqs,
            updatedAt: new Date(),
          })
          .where(eq(resumeEditorVersions.id, existing[0].id));
      } else {
        await db.insert(resumeEditorVersions).values({
          userId,
          resumeId,
          jobId,
          mode: "rewrite",
          versionNumber: newVersion,
          sections: sections as any,
          requirementMapping: existingMapping as any,
          improvementsApplied: changedCount,
          needsConfirmationCount: ungrounded,
          missingRequirementsCount: missingReqs,
          lastAgentRunAt: new Date(),
        });
      }

      res.json({
        saved: true,
        versionNumber: newVersion,
      });
    } catch (error) {
      console.error("Error saving resume editor:", error);
      res.status(500).json({ error: "Failed to save. Your edits are preserved locally." });
    }
  });

  app.get("/api/resume/:resumeId/export/docx", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const resumeId = parseInt(req.params.resumeId);
      const jobId = parseInt(req.query.jobId as string);

      if (isNaN(resumeId) || isNaN(jobId)) {
        return res.status(400).json({ error: "Valid resumeId and jobId are required" });
      }

      const existing = await db.select().from(resumeEditorVersions).where(
        and(
          eq(resumeEditorVersions.userId, userId),
          eq(resumeEditorVersions.resumeId, resumeId),
          eq(resumeEditorVersions.jobId, jobId)
        )
      ).orderBy(desc(resumeEditorVersions.versionNumber)).limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: "No saved version found. Please save your resume first." });
      }

      const sections = existing[0].sections as any;
      const buffer = await generateDocx(sections);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      const safeName = (sections.contact?.fullName || "Resume").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}.docx"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting DOCX:", error);
      res.status(500).json({ error: "Failed to generate DOCX. Please try again." });
    }
  });

  app.get("/api/resume/:resumeId/export/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const resumeId = parseInt(req.params.resumeId);
      const jobId = parseInt(req.query.jobId as string);

      if (isNaN(resumeId) || isNaN(jobId)) {
        return res.status(400).json({ error: "Valid resumeId and jobId are required" });
      }

      const existing = await db.select().from(resumeEditorVersions).where(
        and(
          eq(resumeEditorVersions.userId, userId),
          eq(resumeEditorVersions.resumeId, resumeId),
          eq(resumeEditorVersions.jobId, jobId)
        )
      ).orderBy(desc(resumeEditorVersions.versionNumber)).limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: "No saved version found. Please save your resume first." });
      }

      const sections = existing[0].sections as any;
      const buffer = await generatePdf(sections);

      res.setHeader("Content-Type", "application/pdf");
      const safeName = (sections.contact?.fullName || "Resume").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF. Please try again." });
    }
  });

  app.get("/api/resume/:resumeId/export/apply-pack", isAuthenticated, requirePro, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const resumeId = parseInt(req.params.resumeId);
      const jobId = parseInt(req.query.jobId as string);

      if (isNaN(resumeId) || isNaN(jobId)) {
        return res.status(400).json({ error: "Valid resumeId and jobId are required" });
      }

      const existing = await db.select().from(resumeEditorVersions).where(
        and(
          eq(resumeEditorVersions.userId, userId),
          eq(resumeEditorVersions.resumeId, resumeId),
          eq(resumeEditorVersions.jobId, jobId)
        )
      ).orderBy(desc(resumeEditorVersions.versionNumber)).limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: "No saved version found." });
      }

      const sections = existing[0].sections as any;
      const job = await storage.getJob(jobId);
      if (!job) return res.status(404).json({ error: "Job not found" });

      const buffer = await generateApplyPack(sections, job.title, job.company);

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="Apply_Pack_${job.company}.zip"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting apply pack:", error);
      res.status(500).json({ error: "Failed to generate apply pack. Please try again." });
    }
  });

  // ============ DIAGNOSTIC REPORT ENDPOINTS ============

  app.post("/api/diagnostic/run", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { resumeId, targetPath } = req.body;

      const userResumes = await storage.getUserResumes(userId);
      const resume = resumeId
        ? userResumes.find((r: any) => r.id === resumeId)
        : userResumes.find((r: any) => r.isPrimary) || userResumes[0];

      if (!resume || !resume.extractedData) {
        return res.status(400).json({ error: "No parsed resume found. Please upload a resume first." });
      }

      const resumeData = resume.extractedData as ResumeExtractedData;
      const resumeHash = crypto.createHash("md5").update(JSON.stringify(resumeData)).digest("hex");

      const existing = await db.select().from(diagnosticReports)
        .where(and(
          eq(diagnosticReports.userId, userId),
          eq(diagnosticReports.resumeId, resume.id),
          eq(diagnosticReports.resumeHash, resumeHash),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].reportJson) {
        return res.json({
          report: existing[0].reportJson,
          cached: true,
          reportId: existing[0].id,
        });
      }

      const allJobs = await storage.getPublishedJobs();
      const report = await generateDiagnosticReport(resumeData, allJobs, targetPath);

      const [saved] = await db.insert(diagnosticReports).values({
        userId,
        resumeId: resume.id,
        resumeHash: resumeHash,
        overallReadinessScore: report.overallReadinessScore,
        topPaths: report.topPaths as any,
        readinessSummary: report.readinessLadder as any,
        skillClusters: report.skillClusters as any,
        transitionPlan: report.transitionPlan as any,
        brutalHonesty: report.brutalHonesty as any,
        reportJson: report as any,
      }).returning();

      res.json({
        report,
        cached: false,
        reportId: saved.id,
      });
    } catch (error: any) {
      console.error("Error generating diagnostic:", error);
      res.status(500).json({ error: error.message || "Failed to generate diagnostic report" });
    }
  });

  app.get("/api/diagnostic/latest", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const [latest] = await db.select().from(diagnosticReports)
        .where(eq(diagnosticReports.userId, userId))
        .orderBy(desc(diagnosticReports.createdAt))
        .limit(1);

      if (!latest || !latest.reportJson) {
        return res.json({ report: null });
      }

      const [resumeExists] = await db.select({ id: resumes.id }).from(resumes)
        .where(eq(resumes.id, latest.resumeId))
        .limit(1);
      if (!resumeExists) {
        return res.json({ report: null });
      }

      res.json({
        report: latest.reportJson,
        reportId: latest.id,
        createdAt: latest.createdAt,
        overallReadinessScore: latest.overallReadinessScore,
      });
    } catch (error: any) {
      console.error("Error fetching diagnostic:", error);
      res.status(500).json({ error: "Failed to fetch diagnostic" });
    }
  });

  app.get("/api/career-progress", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const reports = await db.select({
        id: diagnosticReports.id,
        overallReadinessScore: diagnosticReports.overallReadinessScore,
        topPaths: diagnosticReports.topPaths,
        createdAt: diagnosticReports.createdAt,
      }).from(diagnosticReports)
        .where(eq(diagnosticReports.userId, userId))
        .orderBy(asc(diagnosticReports.createdAt));

      if (reports.length === 0) {
        return res.json({ history: [], totalReports: 0, daysSinceLastDiagnostic: null });
      }

      const history = reports
        .filter(r => r.overallReadinessScore != null)
        .map(r => {
          const paths = r.topPaths as any[] | null;
          const topPath = paths?.[0];
          const topPathName = topPath?.title || topPath?.pathName || null;
          return {
            score: r.overallReadinessScore!,
            date: r.createdAt,
            topPath: topPathName,
          };
        });

      const lastReport = reports[reports.length - 1];
      const lastDate = lastReport.createdAt ? new Date(lastReport.createdAt) : new Date();
      const daysSinceLastDiagnostic = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      res.json({
        history,
        totalReports: reports.length,
        daysSinceLastDiagnostic,
      });
    } catch (error: any) {
      console.error("Error fetching career progress:", error);
      res.status(500).json({ error: "Failed to fetch career progress" });
    }
  });

  const diagnosticPreviewRateLimit = new Map<string, { count: number; resetAt: number }>();

  app.post("/api/diagnostic/preview", upload.single("resume"), async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      const entry = diagnosticPreviewRateLimit.get(ip);
      if (entry && now < entry.resetAt) {
        if (entry.count >= 3) {
          return res.status(429).json({ error: "Rate limit exceeded. You can run up to 3 preview diagnostics per hour." });
        }
        entry.count++;
      } else {
        diagnosticPreviewRateLimit.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded. Please upload a PDF or DOCX resume." });
      }

      const mime = req.file.mimetype;
      let resumeText: string;
      if (mime === "application/pdf") {
        resumeText = await extractTextFromPDF(req.file.buffer);
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mime === "application/msword"
      ) {
        resumeText = await extractTextFromDOCX(req.file.buffer);
      } else {
        return res.status(400).json({ error: "Invalid file type. Please upload a PDF or DOCX file." });
      }

      if (!resumeText || resumeText.trim().length < 50) {
        return res.status(400).json({ error: "Could not extract enough text from the file. Please ensure the resume contains readable text." });
      }

      const extractedData = await parseResumeWithAI(resumeText);
      const allJobs = await storage.getPublishedJobs();
      const report = await generateDiagnosticReport(extractedData, allJobs);

      const topPath = report.topPaths?.[0]
        ? { name: report.topPaths[0].name, confidence: report.topPaths[0].confidence }
        : null;

      const skills = (extractedData.skills || []).slice(0, 3);

      const totalMatched =
        (report.readinessLadder?.ready?.length || 0) +
        (report.readinessLadder?.nearReady?.length || 0) +
        (report.readinessLadder?.stretch?.length || 0);

      res.json({
        score: report.overallReadinessScore || 0,
        topPath,
        skills,
        totalMatched,
      });
    } catch (error: any) {
      console.error("Error in diagnostic preview:", error);
      if (error instanceof InvalidPDFError) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || "Failed to generate diagnostic preview" });
    }
  });

  app.get("/api/diagnostic/percentile", async (req, res) => {
    try {
      const score = parseInt(req.query.score as string);
      if (isNaN(score) || score < 0 || score > 100) {
        return res.status(400).json({ error: "Invalid score" });
      }

      const allScores = await db
        .select({ score: diagnosticReports.overallReadinessScore })
        .from(diagnosticReports)
        .where(sql`${diagnosticReports.overallReadinessScore} IS NOT NULL`);

      const totalDiagnostics = allScores.length;

      if (totalDiagnostics < 5) {
        return res.json({ percentile: null, totalAssessments: totalDiagnostics });
      }

      const belowCount = allScores.filter(r => (r.score || 0) < score).length;
      const percentile = Math.round((belowCount / totalDiagnostics) * 100);

      res.json({ percentile, totalAssessments: totalDiagnostics });
    } catch (error: any) {
      console.error("Error computing percentile:", error);
      res.status(500).json({ error: "Failed to compute percentile" });
    }
  });

  app.post("/api/jobs/fit/batch", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { resumeId, jobIds } = req.body;
      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({ error: "jobIds array required" });
      }

      const userResumes = await storage.getUserResumes(userId);
      const resume = resumeId
        ? userResumes.find((r: any) => r.id === resumeId)
        : userResumes.find((r: any) => r.isPrimary) || userResumes[0];

      if (!resume || !resume.extractedData) {
        return res.status(400).json({ error: "No parsed resume found." });
      }

      const resumeData = resume.extractedData as ResumeExtractedData;

      const cachedResults = await db.select().from(jobFitResults)
        .where(and(
          eq(jobFitResults.userId, userId),
          eq(jobFitResults.resumeId, resume.id),
        ));

      const cachedMap = new Map(cachedResults.map(r => [r.jobId, r]));
      const uncachedJobIds = jobIds.filter((id: number) => !cachedMap.has(id));

      let newResults: any[] = [];
      if (uncachedJobIds.length > 0) {
        const jobsToScore = await Promise.all(
          uncachedJobIds.slice(0, 20).map((id: number) => storage.getJob(id))
        );
        const validJobs = jobsToScore.filter(Boolean) as Job[];

        if (validJobs.length > 0) {
          const batchResults = await batchComputeJobFits(resumeData, validJobs);

          for (const result of batchResults) {
            try {
              await db.insert(jobFitResults).values({
                userId,
                resumeId: resume.id,
                jobId: result.jobId,
                fitScore: result.fitScore,
                skillsMatch: result.skillsMatch,
                experienceMatch: result.experienceMatch,
                domainMatch: result.domainMatch,
                seniorityMatch: result.seniorityMatch,
                strengths: result.strengths as any,
                gaps: result.gaps as any,
                oneLineReason: result.oneLineReason,
                aiIntensity: result.aiIntensity,
                transitionDifficulty: result.transitionDifficulty,
              });
            } catch (e) {
              console.error(`Failed to cache fit result for job ${result.jobId}:`, e);
            }
          }
          newResults = batchResults;
        }
      }

      const allResults = jobIds.map((id: number) => {
        const cached = cachedMap.get(id);
        if (cached) {
          return {
            jobId: id,
            fitScore: cached.fitScore,
            skillsMatch: cached.skillsMatch,
            experienceMatch: cached.experienceMatch,
            domainMatch: cached.domainMatch,
            seniorityMatch: cached.seniorityMatch,
            strengths: cached.strengths,
            gaps: cached.gaps,
            oneLineReason: cached.oneLineReason,
            aiIntensity: cached.aiIntensity,
            transitionDifficulty: cached.transitionDifficulty,
            cached: true,
          };
        }
        const fresh = newResults.find((r: any) => r.jobId === id);
        if (fresh) return { ...fresh, cached: false };
        return null;
      }).filter(Boolean);

      res.json({ results: allResults });
    } catch (error: any) {
      console.error("Error computing batch fits:", error);
      res.status(500).json({ error: error.message || "Failed to compute fit scores" });
    }
  });

  app.get("/api/user/fit-scores", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const userResumes = await storage.getUserResumes(userId);
      const resume = userResumes.find((r: any) => r.isPrimary) || userResumes[0];
      if (!resume) return res.json({ scores: {} });

      const jobIdsParam = req.query.jobIds as string | undefined;
      let filterJobIds: number[] | null = null;
      if (jobIdsParam) {
        filterJobIds = jobIdsParam.split(",").map(Number).filter(n => !isNaN(n)).slice(0, 25);
        if (filterJobIds.length === 0) return res.json({ scores: {} });
      }

      const conditions = [
        eq(jobFitResults.userId, userId),
        eq(jobFitResults.resumeId, resume.id),
      ];
      if (filterJobIds) {
        conditions.push(inArray(jobFitResults.jobId, filterJobIds));
      }

      const results = await db.select({
        jobId: jobFitResults.jobId,
        fitScore: jobFitResults.fitScore,
        aiIntensity: jobFitResults.aiIntensity,
        transitionDifficulty: jobFitResults.transitionDifficulty,
        oneLineReason: jobFitResults.oneLineReason,
      }).from(jobFitResults)
        .where(and(...conditions));

      const scores: Record<number, any> = {};
      for (const r of results) {
        scores[r.jobId] = r;
      }

      res.json({ scores });
    } catch (error: any) {
      console.error("Error fetching fit scores:", error);
      res.status(500).json({ error: "Failed to fetch fit scores" });
    }
  });

  app.get("/api/jobs/:id/fit", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const jobId = parseInt(req.params.id as string);
      if (isNaN(jobId)) return res.status(400).json({ error: "Invalid job ID" });

      const userResumes = await storage.getUserResumes(userId);
      const resume = userResumes.find((r: any) => r.isPrimary) || userResumes[0];

      if (!resume || !resume.extractedData) {
        return res.status(400).json({ error: "No parsed resume found." });
      }

      const [cached] = await db.select().from(jobFitResults)
        .where(and(
          eq(jobFitResults.userId, userId),
          eq(jobFitResults.resumeId, resume.id),
          eq(jobFitResults.jobId, jobId),
        ))
        .limit(1);

      if (cached) {
        return res.json({
          ...cached,
          cached: true,
        });
      }

      const job = await storage.getJob(jobId);
      if (!job) return res.status(404).json({ error: "Job not found" });

      const result = await computeJobFitScore(resume.extractedData as ResumeExtractedData, job);

      await db.insert(jobFitResults).values({
        userId,
        resumeId: resume.id,
        jobId,
        fitScore: result.fitScore,
        skillsMatch: result.skillsMatch,
        experienceMatch: result.experienceMatch,
        domainMatch: result.domainMatch,
        seniorityMatch: result.seniorityMatch,
        strengths: result.strengths as any,
        gaps: result.gaps as any,
        evidence: result.evidence as any,
        recommendedEdits: result.recommendedEdits as any,
        oneLineReason: result.oneLineReason,
        aiIntensity: computeAIIntensity(job),
        transitionDifficulty: computeTransitionDifficulty(job),
      });

      res.json({
        ...result,
        aiIntensity: computeAIIntensity(job),
        transitionDifficulty: computeTransitionDifficulty(job),
        cached: false,
      });
    } catch (error: any) {
      console.error("Error computing fit:", error);
      res.status(500).json({ error: error.message || "Failed to compute fit score" });
    }
  });

  app.get("/api/insights/market-demand", async (_req, res) => {
    try {
      const allJobs = await storage.getPublishedJobs();
      const skillDemand: Record<string, number> = {};
      for (const job of allJobs) {
        for (const skill of (job.keySkills || [])) {
          const s = skill.toLowerCase().trim();
          skillDemand[s] = (skillDemand[s] || 0) + 1;
        }
      }
      const topSkills = Object.entries(skillDemand)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([skill, count]) => ({ skill, count }));

      const categoryCounts: Record<string, number> = {};
      for (const job of allJobs) {
        if (job.roleCategory) {
          categoryCounts[job.roleCategory] = (categoryCounts[job.roleCategory] || 0) + 1;
        }
      }

      const workModeCounts: Record<string, number> = { remote: 0, hybrid: 0, onsite: 0 };
      for (const job of allJobs) {
        const mode = (job.locationType || job.workMode || "onsite").toLowerCase();
        if (mode.includes("remote")) workModeCounts.remote++;
        else if (mode.includes("hybrid")) workModeCounts.hybrid++;
        else workModeCounts.onsite++;
      }

      const demandCanonical = getCanonicalStats();
      res.json({
        topSkills,
        categoryCounts: Object.entries(categoryCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        workModeCounts,
        totalJobs: demandCanonical ? demandCanonical.totalJobs : allJobs.length,
      });
    } catch (error: any) {
      console.error("Error computing market demand:", error);
      res.status(500).json({ error: "Failed to compute market demand" });
    }
  });

  app.get("/api/market-intelligence", intelligenceLimiter, optionalAuth, async (_req: any, res) => {
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      const user = _req.user as any;
      const userId = user?.id;
      let isPro = false;
      if (userId) {
        const isAdmin = await storage.isUserAdmin(userId);
        if (isAdmin) isPro = true;
        else {
          const subData = await storage.getUserSubscription(userId);
          isPro = subData?.subscriptionTier === "pro" && subData?.subscriptionStatus === "active";
        }
      }

      const cachedData = getMarketIntelligenceCache();
      if (cachedData) {
        if (!isPro) {
          return res.json(addAttribution({
            overview: cachedData.overview,
            careerPaths: cachedData.careerPaths?.map((p: any) => ({ name: p.name, jobCount: p.jobCount })),
            generatedAt: cachedData.generatedAt,
            restricted: true,
          }, user?.email));
        }
        return res.json(addAttribution(cachedData, user?.email));
      }

      const allJobs = await storage.getPublishedJobs();
      const companies = new Set(allJobs.map(j => j.company));
      const countries = new Set(allJobs.map(j => j.countryCode).filter(c => c && c !== 'WW' && c !== 'UN'));
      setCanonicalStats(allJobs.length, companies.size, countries.size);
      setDisplayStats(allJobs.length, companies.size, countries.size);
      const miDisplay = getDisplayStats() || getCanonicalStats();
      let totalJobs: number;
      if (miDisplay) {
        totalJobs = miDisplay.totalJobs;
      } else {
        totalJobs = allJobs.length;
      }
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const newThisWeek = allJobs.filter(j => j.firstSeenAt && new Date(j.firstSeenAt) > oneWeekAgo);

      const remoteJobs = allJobs.filter(j => j.locationType === 'remote' || (!j.locationType && j.isRemote));
      const hybridJobs = allJobs.filter(j => j.locationType === 'hybrid');
      const onsiteJobs = allJobs.filter(j => j.locationType === 'onsite' || (!j.locationType && !j.isRemote));

      const MAX_SALARY = 400000;
      const jobsWithSalMin = allJobs.filter(j => j.salaryMin && j.salaryMin > 0 && j.salaryMin <= MAX_SALARY);
      const jobsWithSalMax = allJobs.filter(j => j.salaryMax && j.salaryMax > 0 && j.salaryMax <= MAX_SALARY);
      const median = (arr: number[]) => {
        if (!arr.length) return null;
        const s = [...arr].sort((a, b) => a - b);
        const m = Math.floor(s.length / 2);
        return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
      };

      const skillMap: Record<string, number> = {};
      const categoryMap: Record<string, number> = {};
      const categoryNewMap: Record<string, number> = {};
      const seniorityMap: Record<string, number> = {};
      const companyMap: Record<string, number> = {};
      const countryMap: Record<string, { name: string; count: number }> = {};
      const salarySamples: Record<string, { mins: number[]; maxes: number[] }> = {};
      let aiLow = 0, aiMed = 0, aiHigh = 0;
      const aiByCategory: Record<string, { low: number; med: number; high: number }> = {};

      const KNOWN_LEGAL_TOOLS = new Set([
        "relativity", "ironclad", "imanage", "docusign", "kira", "luminance", "agiloft",
        "netdocuments", "clio", "legaltracker", "highq", "brainspace", "disco", "logikcull",
        "cocounsel", "harvey", "diligent", "contractpodai", "juro", "precisely", "checkbox",
        "evisort", "linksquares", "simplelegal", "brightflag", "onit", "mitratech", "litera",
        "salesforce", "servicenow", "power bi", "tableau", "jira", "confluence", "slack",
        "microsoft 365", "sharepoint", "teams", "workday", "sap", "oracle", "zuora",
        "hubspot", "marketo", "zendesk", "intercom", "notion", "asana", "monday.com",
        "smartsheet", "lexisnexis", "westlaw", "bloomberg law", "practical law",
        "lex machina", "ravel law", "casetext", "ross intelligence", "everlaw",
        "nuix", "zylab", "concordance", "ringtail", "reveal", "exterro",
        "wolters kluwer", "thomson reuters", "aderant", "elite 3e", "prolaw",
        "contract express", "hotdocs", "neota logic", "thoughtriver",
        "seal software", "icertis", "sirion", "cobblestone", "concord",
        "legal tracker", "anaqua", "ipfolio", "clarivate", "dennemeyer",
        "opus 2", "court manager", "tyler technologies", "efile",
        "onelegal", "docketbird", "pacermonitor",
        "openai", "anthropic", "google cloud", "aws", "azure",
        "python", "sql", "javascript", "typescript", "r",
        "terraform", "docker", "kubernetes",
      ]);
      const toolsByCategoryMap: Record<string, Record<string, number>> = {};

      const newThisWeekIds = new Set(newThisWeek.map(j => j.id));

      const hardSkillMap: Record<string, number> = {};
      const softSkillMap: Record<string, number> = {};

      for (const job of allJobs) {
        const skillsForMap = (job.hardSkills && job.hardSkills.length > 0)
          ? [...(job.hardSkills || []), ...(job.softSkills || [])]
          : (job.keySkills || []);
        for (const skill of skillsForMap) {
          let s = skill.toLowerCase().trim();
          if (!s) continue;
          s = SKILLS_SYNONYM_MAP[s] || s;
          skillMap[s] = (skillMap[s] || 0) + 1;
        }
        if (job.hardSkills && job.hardSkills.length > 0) {
          for (const skill of job.hardSkills) {
            let s = skill.toLowerCase().trim();
            if (!s) continue;
            s = SKILLS_SYNONYM_MAP[s] || s;
            hardSkillMap[s] = (hardSkillMap[s] || 0) + 1;
          }
          for (const skill of (job.softSkills || [])) {
            let s = skill.toLowerCase().trim();
            if (!s) continue;
            s = SKILLS_SYNONYM_MAP[s] || s;
            softSkillMap[s] = (softSkillMap[s] || 0) + 1;
          }
        }
        if (job.roleCategory) {
          categoryMap[job.roleCategory] = (categoryMap[job.roleCategory] || 0) + 1;
          if (newThisWeekIds.has(job.id)) {
            categoryNewMap[job.roleCategory] = (categoryNewMap[job.roleCategory] || 0) + 1;
          }
        }
        if (job.seniorityLevel) {
          seniorityMap[job.seniorityLevel] = (seniorityMap[job.seniorityLevel] || 0) + 1;
        }
        companyMap[job.company] = (companyMap[job.company] || 0) + 1;
        if (job.countryCode && job.countryCode !== 'UN' && job.countryCode !== 'WW') {
          if (!countryMap[job.countryCode]) countryMap[job.countryCode] = { name: job.countryName || job.countryCode, count: 0 };
          countryMap[job.countryCode].count++;
        }
        if (job.roleCategory) {
          if (!salarySamples[job.roleCategory]) salarySamples[job.roleCategory] = { mins: [], maxes: [] };
          if (job.salaryMin && job.salaryMin > 0 && job.salaryMin <= MAX_SALARY) salarySamples[job.roleCategory].mins.push(job.salaryMin);
          if (job.salaryMax && job.salaryMax > 0 && job.salaryMax <= MAX_SALARY) salarySamples[job.roleCategory].maxes.push(job.salaryMax);
        }
        const ai = computeAIIntensity(job);
        if (ai === 'Low') aiLow++;
        else if (ai === 'Med') aiMed++;
        else aiHigh++;
        if (job.roleCategory) {
          if (!aiByCategory[job.roleCategory]) aiByCategory[job.roleCategory] = { low: 0, med: 0, high: 0 };
          if (ai === 'Low') aiByCategory[job.roleCategory].low++;
          else if (ai === 'Med') aiByCategory[job.roleCategory].med++;
          else aiByCategory[job.roleCategory].high++;
        }
        if (job.roleCategory && job.hardSkills && job.hardSkills.length > 0) {
          if (!toolsByCategoryMap[job.roleCategory]) toolsByCategoryMap[job.roleCategory] = {};
          for (const skill of job.hardSkills) {
            const s = skill.toLowerCase().trim();
            if (!s) continue;
            if (KNOWN_LEGAL_TOOLS.has(s)) {
              const display = toTitleCase(s);
              toolsByCategoryMap[job.roleCategory][display] = (toolsByCategoryMap[job.roleCategory][display] || 0) + 1;
            }
          }
        }
      }

      const skillsDemand = Object.entries(skillMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([skill, count]) => ({ skill: toTitleCase(skill), count }));

      const careerPaths = Object.entries(categoryMap)
        .map(([name, jobCount]) => ({
          name,
          jobCount,
          percentage: Math.round((jobCount / totalJobs) * 100),
          newThisWeek: categoryNewMap[name] || 0,
        }))
        .sort((a, b) => b.jobCount - a.jobCount);

      const salaryByPath = Object.entries(salarySamples)
        .filter(([, s]) => s.mins.length >= 3)
        .map(([name, s]) => ({
          name,
          medianMin: median(s.mins),
          medianMax: median(s.maxes),
          sampleSize: s.mins.length,
        }))
        .sort((a, b) => (b.medianMax || 0) - (a.medianMax || 0));

      const SENIORITY_ORDER = ["Intern", "Fellowship", "Entry", "Junior", "Associate", "Mid", "Senior", "Lead", "Director", "VP", "C-Level"];
      const seniorityDistribution = SENIORITY_ORDER
        .filter(level => seniorityMap[level])
        .map(level => ({ level, count: seniorityMap[level] || 0 }));
      for (const [level, count] of Object.entries(seniorityMap)) {
        if (!SENIORITY_ORDER.includes(level)) seniorityDistribution.push({ level, count });
      }

      const topCompanies = Object.entries(companyMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([company, jobCount]) => ({ company, jobCount }));

      const geography = Object.entries(countryMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15)
        .map(([code, { name, count }]) => ({ countryCode: code, countryName: name, jobCount: count }));

      let communityBenchmarks: any = null;
      try {
        const allScores = await db.select({
          score: diagnosticReports.overallReadinessScore,
          topPaths: diagnosticReports.topPaths,
          skillClusters: diagnosticReports.skillClusters,
        }).from(diagnosticReports);

        if (allScores.length >= 5) {
          const scores = allScores.map(s => s.score || 0).filter(s => s > 0);
          const avgReadiness = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
          const buckets = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
          for (const s of scores) {
            if (s <= 25) buckets['0-25']++;
            else if (s <= 50) buckets['26-50']++;
            else if (s <= 75) buckets['51-75']++;
            else buckets['76-100']++;
          }

          const gapMap: Record<string, number> = {};
          const pathPopularity: Record<string, number> = {};
          for (const row of allScores) {
            const clusters = row.skillClusters as any[];
            if (clusters) {
              for (const c of clusters) {
                if (c.score !== undefined && c.score < 40 && c.name) {
                  gapMap[c.name] = (gapMap[c.name] || 0) + 1;
                }
              }
            }
            const paths = row.topPaths as any[];
            if (paths && paths[0]?.name) {
              pathPopularity[paths[0].name] = (pathPopularity[paths[0].name] || 0) + 1;
            }
          }

          communityBenchmarks = {
            totalAssessments: allScores.length,
            avgReadiness,
            readinessDistribution: Object.entries(buckets).map(([bucket, count]) => ({ bucket, count })),
            topSkillGaps: Object.entries(gapMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([skill, count]) => ({ skill, count })),
            topCareerPaths: Object.entries(pathPopularity).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ path: name, count })),
          };
        }
      } catch (e) {}

      const result = {
        overview: {
          totalJobs,
          totalCompanies: miDisplay ? miDisplay.totalCompanies : companies.size,
          countriesCount: miDisplay ? miDisplay.totalCountries : countries.size,
          remotePercentage: totalJobs ? Math.round((remoteJobs.length / totalJobs) * 100) : 0,
          newJobsThisWeek: newThisWeek.length,
          avgSalaryMin: jobsWithSalMin.length ? Math.round(jobsWithSalMin.reduce((s, j) => s + j.salaryMin!, 0) / jobsWithSalMin.length) : null,
          avgSalaryMax: jobsWithSalMax.length ? Math.round(jobsWithSalMax.reduce((s, j) => s + j.salaryMax!, 0) / jobsWithSalMax.length) : null,
          medianSalaryMin: median(jobsWithSalMin.map(j => j.salaryMin!)),
          medianSalaryMax: median(jobsWithSalMax.map(j => j.salaryMax!)),
          jobsWithSalary: jobsWithSalMin.length,
        },
        skillsDemand,
        hardSkillsDemand: Object.entries(hardSkillMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([skill, count]) => ({ skill: toTitleCase(skill), count })),
        softSkillsDemand: Object.entries(softSkillMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([skill, count]) => ({ skill: toTitleCase(skill), count })),
        careerPaths,
        salaryByPath,
        workMode: {
          remote: { count: remoteJobs.length, percentage: totalJobs ? Math.round((remoteJobs.length / totalJobs) * 100) : 0 },
          hybrid: { count: hybridJobs.length, percentage: totalJobs ? Math.round((hybridJobs.length / totalJobs) * 100) : 0 },
          onsite: { count: onsiteJobs.length, percentage: totalJobs ? Math.round((onsiteJobs.length / totalJobs) * 100) : 0 },
        },
        aiIntensity: {
          low: { count: aiLow, percentage: totalJobs ? Math.round((aiLow / totalJobs) * 100) : 0 },
          medium: { count: aiMed, percentage: totalJobs ? Math.round((aiMed / totalJobs) * 100) : 0 },
          high: { count: aiHigh, percentage: totalJobs ? Math.round((aiHigh / totalJobs) * 100) : 0 },
        },
        aiIntensityByCategory: Object.entries(aiByCategory)
          .map(([category, counts]) => {
            const total = counts.low + counts.med + counts.high;
            return {
              category,
              low: counts.low,
              med: counts.med,
              high: counts.high,
              total,
              highPct: total ? Math.round((counts.high / total) * 100) : 0,
              medPct: total ? Math.round((counts.med / total) * 100) : 0,
              lowPct: total ? Math.round((counts.low / total) * 100) : 0,
            };
          })
          .sort((a, b) => b.highPct - a.highPct),
        toolsByCategory: Object.entries(toolsByCategoryMap)
          .filter(([, tools]) => Object.values(tools).reduce((s, c) => s + c, 0) >= 3)
          .map(([category, tools]) => ({
            category,
            tools: Object.entries(tools)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([tool, count]) => ({ tool, count })),
          }))
          .sort((a, b) => b.tools.reduce((s, t) => s + t.count, 0) - a.tools.reduce((s, t) => s + t.count, 0)),
        seniorityDistribution,
        topCompanies,
        geography,
        communityBenchmarks,
        generatedAt: new Date().toISOString(),
      };

      setMarketIntelligenceCache(result);

      if (!isPro) {
        return res.json(addAttribution({
          overview: result.overview,
          careerPaths: result.careerPaths?.map((p: any) => ({ name: p.name, jobCount: p.jobCount })),
          generatedAt: result.generatedAt,
          restricted: true,
        }, user?.email));
      }
      res.json(addAttribution(result, user?.email));
    } catch (error: any) {
      console.error("Error computing market intelligence:", error);
      res.status(500).json({ error: "Failed to compute market intelligence" });
    }
  });

  let transitionCache: { data: any; timestamp: number } | null = null;
  const TRANSITION_CACHE_TTL = 300000;

  const LEGAL_SKILLS = new Set([
    "legal technology", "legal tech", "legal research", "contract drafting",
    "contract management", "regulatory compliance", "due diligence",
    "litigation", "ediscovery", "e-discovery", "legal writing", "legal analysis",
    "risk management", "intellectual property", "ip management", "privacy",
    "data privacy", "gdpr", "legal operations", "matter management",
    "legal billing", "outside counsel", "corporate governance", "mergers",
    "acquisitions", "legal counsel", "legal advice", "law", "legal",
    "policy", "dispute resolution", "arbitration", "mediation",
    "contract negotiation", "stakeholder management", "client management",
    "legal project management",
    "knowledge management", "document review", "contract review",
    "legal strategy", "corporate law", "employment law", "commercial law",
    "stakeholder communication", "project management", "requirements gathering",
    "process documentation", "vendor management", "vendor evaluation and selection",
    "cross-functional collaboration", "presentation skills",
    "analytical writing", "regulatory analysis", "policy analysis",
    "case management", "investigation", "audit",
    "training delivery", "training program development", "change management",
    "rfp writing and evaluation", "executive briefing and reporting",
    "legal-to-technical requirements translation", "client-facing presentations",
    "analytical problem solving", "legal pricing",
    "contract lifecycle management", "legal hold procedures",
    "regulatory change management", "legal design",
    "legal workflow automation", "legal spend management",
    "outside counsel management", "legal risk assessment",
    "cross-functional stakeholder management",
  ]);

  function isLegalSkill(skill: string): boolean {
    const lower = skill.toLowerCase().trim();
    if (LEGAL_SKILLS.has(lower)) return true;
    for (const ls of Array.from(LEGAL_SKILLS)) {
      if (lower.includes(ls) || ls.includes(lower)) return true;
    }
    return false;
  }

  app.get("/api/market-intelligence/transition", intelligenceLimiter, isAuthenticated, requirePro, async (_req: any, res) => {
    try {
      if (transitionCache && Date.now() - transitionCache.timestamp < TRANSITION_CACHE_TTL) {
        return res.json(transitionCache.data);
      }

      const allJobs = await storage.getPublishedJobs();
      const totalJobs = allJobs.length;

      const trackData: Record<string, {
        jobCount: number;
        relevanceScores: number[];
        transitionFriendly: number;
        experienceMins: number[];
        skillMap: Record<string, number>;
        hardSkillMap: Record<string, number>;
        softSkillMap: Record<string, number>;
        countryMap: Record<string, number>;
        categories: Record<string, {
          jobCount: number;
          transitionFriendly: number;
          entryMidCount: number;
          experienceMins: number[];
          relevanceScores: number[];
        }>;
      }> = {
        "Lawyer-Led": { jobCount: 0, relevanceScores: [], transitionFriendly: 0, experienceMins: [], skillMap: {}, hardSkillMap: {}, softSkillMap: {}, countryMap: {}, categories: {} },
        "Technical": { jobCount: 0, relevanceScores: [], transitionFriendly: 0, experienceMins: [], skillMap: {}, hardSkillMap: {}, softSkillMap: {}, countryMap: {}, categories: {} },
        "Ecosystem": { jobCount: 0, relevanceScores: [], transitionFriendly: 0, experienceMins: [], skillMap: {}, hardSkillMap: {}, softSkillMap: {}, countryMap: {}, categories: {} },
      };

      const companyTransitionMap: Record<string, { count: number; tracks: Set<string> }> = {};
      const countryTrackMap: Record<string, { name: string; tracks: Record<string, number>; transitionFriendly: number; total: number }> = {};

      let totalTransitionFriendly = 0;
      let totalExperienceSum = 0;
      let totalExperienceCount = 0;

      for (const job of allJobs) {
        const track = job.careerTrack || "Lawyer-Led";
        const td = trackData[track];
        if (!td) continue;

        td.jobCount++;

        if (job.legalRelevanceScore) td.relevanceScores.push(job.legalRelevanceScore);

        let isTF = false;
        try {
          const sd = typeof job.structuredDescription === 'string'
            ? JSON.parse(job.structuredDescription)
            : job.structuredDescription;
          if (sd?.lawyerTransitionFriendly === true) isTF = true;
        } catch {}
        if (isTF) {
          td.transitionFriendly++;
          totalTransitionFriendly++;
        }

        if (job.experienceMin && job.experienceMin > 0) {
          td.experienceMins.push(job.experienceMin);
          totalExperienceSum += job.experienceMin;
          totalExperienceCount++;
        }

        const skillsToUse = (job.hardSkills && job.hardSkills.length > 0)
          ? [...(job.hardSkills || []), ...(job.softSkills || [])]
          : (job.keySkills || []);
        for (const skill of skillsToUse) {
          const s = skill.toLowerCase().trim();
          if (!s) continue;
          const normalized = SKILLS_SYNONYM_MAP[s] || s;
          td.skillMap[normalized] = (td.skillMap[normalized] || 0) + 1;
        }

        if (job.hardSkills && job.hardSkills.length > 0) {
          for (const skill of job.hardSkills) {
            const s = skill.toLowerCase().trim();
            if (!s) continue;
            const normalized = SKILLS_SYNONYM_MAP[s] || s;
            td.hardSkillMap[normalized] = (td.hardSkillMap[normalized] || 0) + 1;
          }
          for (const skill of (job.softSkills || [])) {
            const s = skill.toLowerCase().trim();
            if (!s) continue;
            const normalized = SKILLS_SYNONYM_MAP[s] || s;
            td.softSkillMap[normalized] = (td.softSkillMap[normalized] || 0) + 1;
          }
        }

        if (job.countryCode && job.countryCode !== 'UN' && job.countryCode !== 'WW') {
          td.countryMap[job.countryCode] = (td.countryMap[job.countryCode] || 0) + 1;

          if (!countryTrackMap[job.countryCode]) {
            countryTrackMap[job.countryCode] = {
              name: job.countryName || job.countryCode,
              tracks: {},
              transitionFriendly: 0,
              total: 0,
            };
          }
          countryTrackMap[job.countryCode].total++;
          countryTrackMap[job.countryCode].tracks[track] = (countryTrackMap[job.countryCode].tracks[track] || 0) + 1;
          if (isTF) countryTrackMap[job.countryCode].transitionFriendly++;
        }

        if (job.roleCategory) {
          if (!td.categories[job.roleCategory]) {
            td.categories[job.roleCategory] = { jobCount: 0, transitionFriendly: 0, entryMidCount: 0, experienceMins: [], relevanceScores: [] };
          }
          const cat = td.categories[job.roleCategory];
          cat.jobCount++;
          if (isTF) cat.transitionFriendly++;
          const seniority = (job.seniorityLevel || '').toLowerCase();
          if (['entry', 'junior', 'mid', 'intern', 'associate', 'fellowship'].includes(seniority)) {
            cat.entryMidCount++;
          }
          if (job.experienceMin && job.experienceMin > 0) cat.experienceMins.push(job.experienceMin);
          if (job.legalRelevanceScore) cat.relevanceScores.push(job.legalRelevanceScore);
        }

        if (isTF) {
          if (!companyTransitionMap[job.company]) {
            companyTransitionMap[job.company] = { count: 0, tracks: new Set() };
          }
          companyTransitionMap[job.company].count++;
          companyTransitionMap[job.company].tracks.add(track);
        }
      }

      const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

      const trackSummary = Object.entries(trackData).map(([name, td]) => {
        const topSkills = Object.entries(td.skillMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([skill, count]) => ({ skill: toTitleCase(skill), count }));

        const topCountries = Object.entries(td.countryMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([code, count]) => ({ code, count }));

        return {
          track: name,
          jobCount: td.jobCount,
          percentage: totalJobs ? Math.round((td.jobCount / totalJobs) * 100) : 0,
          avgRelevance: avg(td.relevanceScores),
          transitionFriendly: td.transitionFriendly,
          transitionFriendlyPct: td.jobCount ? Math.round((td.transitionFriendly / td.jobCount) * 100) : 0,
          avgExperience: avg(td.experienceMins),
          topSkills,
          topCountries,
        };
      });

      const entryCorridor = Object.entries(
        Object.entries(trackData).reduce<Record<string, { track: string; jobCount: number; transitionFriendly: number; entryMidCount: number; experienceMins: number[]; relevanceScores: number[] }>>((acc, [trackName, td]) => {
          for (const [catName, cat] of Object.entries(td.categories)) {
            if (!acc[catName]) {
              acc[catName] = { track: trackName, jobCount: 0, transitionFriendly: 0, entryMidCount: 0, experienceMins: [], relevanceScores: [] };
            }
            acc[catName].jobCount += cat.jobCount;
            acc[catName].transitionFriendly += cat.transitionFriendly;
            acc[catName].entryMidCount += cat.entryMidCount;
            acc[catName].experienceMins.push(...cat.experienceMins);
            acc[catName].relevanceScores.push(...cat.relevanceScores);
          }
          return acc;
        }, {})
      ).map(([name, cat]) => {
        const entryMidPct = cat.jobCount ? (cat.entryMidCount / cat.jobCount) * 100 : 0;
        const tfPct = cat.jobCount ? (cat.transitionFriendly / cat.jobCount) * 100 : 0;
        const avgExp = avg(cat.experienceMins);
        const avgRel = avg(cat.relevanceScores);

        const expScore = Math.max(0, 100 - (avgExp * 10));
        const accessibilityScore = Math.round(
          (entryMidPct * 0.25) + (tfPct * 0.30) + (expScore * 0.20) + (avgRel * 2.5)
        );

        return {
          category: name,
          track: cat.track,
          jobCount: cat.jobCount,
          accessibilityScore: Math.min(100, Math.max(0, accessibilityScore)),
          transitionFriendly: cat.transitionFriendly,
          avgExperience: avgExp,
          entryMidPct: Math.round(entryMidPct),
        };
      }).sort((a, b) => b.accessibilityScore - a.accessibilityScore);

      const skillBridge: Record<string, { youHave: { skill: string; count: number }[]; toBuild: { skill: string; count: number }[] }> = {};
      for (const [trackName, td] of Object.entries(trackData)) {
        const sorted = Object.entries(td.skillMap).sort((a, b) => b[1] - a[1]);
        const youHave = sorted
          .filter(([s]) => isLegalSkill(s))
          .slice(0, 8)
          .map(([skill, count]) => ({ skill: toTitleCase(skill), count }));
        const toBuild = sorted
          .filter(([s]) => !isLegalSkill(s))
          .slice(0, 8)
          .map(([skill, count]) => ({ skill: toTitleCase(skill), count }));
        skillBridge[trackName] = { youHave, toBuild };
      }

      const transitionEmployers = Object.entries(companyTransitionMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([company, data]) => ({
          company,
          transitionFriendlyCount: data.count,
          tracks: Array.from(data.tracks),
        }));

      const regionalIntelligence = Object.entries(countryTrackMap)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 15)
        .map(([code, data]) => ({
          countryCode: code,
          countryName: data.name,
          total: data.total,
          tracks: data.tracks,
          dominantTrack: Object.entries(data.tracks).sort((a, b) => b[1] - a[1])[0]?.[0] || "Lawyer-Led",
          transitionFriendly: data.transitionFriendly,
          transitionFriendlyPct: data.total ? Math.round((data.transitionFriendly / data.total) * 100) : 0,
        }));

      const result = {
        totalJobs,
        totalTransitionFriendly,
        transitionFriendlyPct: totalJobs ? Math.round((totalTransitionFriendly / totalJobs) * 100) : 0,
        avgExperience: totalExperienceCount ? Math.round((totalExperienceSum / totalExperienceCount) * 10) / 10 : 0,
        trackSummary,
        entryCorridor,
        skillBridge,
        transitionEmployers,
        regionalIntelligence,
        generatedAt: new Date().toISOString(),
      };

      transitionCache = { data: result, timestamp: Date.now() };
      const user = _req.user as any;
      res.json(addAttribution(result, user?.email));
    } catch (error: any) {
      console.error("Error computing transition intelligence:", error);
      res.status(500).json({ error: "Failed to compute transition intelligence" });
    }
  });

  app.post("/api/admin/backfill-skills", async (req, res) => {
    if (!req.user || !(req.user as any)?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const batchSize = 10;
    const delayMs = 2000;
    let processed = 0;
    let failed = 0;
    let total = 0;

    try {
      const allJobs = await storage.getPublishedJobs();
      const jobsToBackfill = allJobs.filter(j => !j.hardSkills || j.hardSkills.length === 0);
      total = jobsToBackfill.length;

      res.json({
        message: `Backfill started for ${total} jobs. Processing in batches of ${batchSize}.`,
        total,
      });

      (async () => {
        for (let i = 0; i < jobsToBackfill.length; i += batchSize) {
          const batch = jobsToBackfill.slice(i, i + batchSize);
          for (const job of batch) {
            try {
              const { categorizeJob } = await import("./lib/job-categorizer");
              const result = await categorizeJob(job.title, job.description || "", job.company);
              const { normalizeSkill, toTitleCase } = await import("./lib/skills-normalization");
              const normArr = (arr: string[]) => {
                const seen = new Set<string>();
                return arr.map(s => toTitleCase(normalizeSkill(s))).filter(s => {
                  const k = s.toLowerCase();
                  if (seen.has(k)) return false;
                  seen.add(k);
                  return true;
                });
              };
              await db.update(jobs)
                .set({
                  hardSkills: normArr(result.hardSkills),
                  softSkills: normArr(result.softSkills),
                  keySkills: normArr(result.keySkills),
                })
                .where(eq(jobs.id, job.id));
              processed++;
              console.log(`[Backfill] ${processed}/${total} — ${job.title} at ${job.company}: ${result.hardSkills.length} hard, ${result.softSkills.length} soft`);
            } catch (err: any) {
              failed++;
              console.error(`[Backfill] Failed for job ${job.id}: ${err.message?.slice(0, 80)}`);
            }
          }
          if (i + batchSize < jobsToBackfill.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
        console.log(`[Backfill] Complete: ${processed} processed, ${failed} failed out of ${total}`);
        transitionCache = null;
      })();
    } catch (error: any) {
      console.error("Backfill error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to start backfill" });
      }
    }
  });

  async function getMarketDataForReport() {
    let miData: any = getMarketIntelligenceCache();
    if (!miData) {
      const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/market-intelligence`);
      if (response.ok) {
        miData = await response.json();
      } else {
        miData = getMarketIntelligenceCache();
      }
    }
    if (!miData) return null;
    const result: any = {
      overview: {
        ...miData.overview,
        totalCountries: miData.overview.countriesCount || miData.overview.totalCountries || 0,
      },
      skillsDemand: miData.skillsDemand || [],
      careerPaths: miData.careerPaths || [],
      salaryByPath: miData.salaryByPath || [],
      workMode: {
        remote: miData.workMode?.remote?.count ?? miData.workMode?.remote ?? 0,
        hybrid: miData.workMode?.hybrid?.count ?? miData.workMode?.hybrid ?? 0,
        onsite: miData.workMode?.onsite?.count ?? miData.workMode?.onsite ?? 0,
      },
      aiIntensity: {
        low: miData.aiIntensity?.low?.count ?? miData.aiIntensity?.low ?? 0,
        medium: miData.aiIntensity?.medium?.count ?? miData.aiIntensity?.medium ?? 0,
        high: miData.aiIntensity?.high?.count ?? miData.aiIntensity?.high ?? 0,
      },
      aiIntensityByCategory: miData.aiIntensityByCategory || [],
      seniorityDistribution: miData.seniorityDistribution || [],
      topCompanies: miData.topCompanies || [],
      geography: miData.geography || [],
      dataQuality: getDataQualityCache() || null,
    };

    if (!result.dataQuality) {
      try {
        const dqResponse = await fetch(`http://localhost:${process.env.PORT || 5000}/api/stats/data-quality`, {
          headers: { "User-Agent": "Mozilla/5.0 Internal" },
        });
        if (dqResponse.ok) {
          result.dataQuality = await dqResponse.json();
        }
      } catch {}
    }

    return result;
  }

  app.get("/api/market-intelligence/report", isAuthenticated, requirePro, async (req, res) => {
    try {
      const period = (req.query.period as string) || "monthly";
      if (!["weekly", "monthly", "annual"].includes(period)) {
        return res.status(400).json({ error: "Invalid period. Use weekly, monthly, or annual." });
      }

      const pdfData = await getMarketDataForReport();
      if (!pdfData) return res.status(500).json({ error: "Could not load market data" });

      const allJobsForHistory = await db.select({
        firstSeenAt: jobs.firstSeenAt,
        publishedAt: jobs.publishedAt,
        roleCategory: jobs.roleCategory,
        workMode: jobs.workMode,
        keySkills: jobs.keySkills,
      }).from(jobs).where(
        and(
          eq(jobs.isPublished, true),
          eq(jobs.isActive, true),
          eq(jobs.pipelineStatus, 'ready'),
          eq(jobs.jobStatus, 'open'),
        )
      );

      const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const jbm: Record<string, number> = {};
      const pbm: Record<string, number> = {};
      const cbm: Record<string, Record<string, number>> = {};
      const wmbm: Record<string, Record<string, number>> = {};
      const sbm: Record<string, Record<string, number>> = {};

      for (const j of allJobsForHistory) {
        if (!j.firstSeenAt) continue;
        const k = monthKey(j.firstSeenAt);
        jbm[k] = (jbm[k] || 0) + 1;
        if (j.roleCategory) { cbm[k] = cbm[k] || {}; cbm[k][j.roleCategory] = (cbm[k][j.roleCategory] || 0) + 1; }
        if (j.workMode) { wmbm[k] = wmbm[k] || {}; wmbm[k][j.workMode] = (wmbm[k][j.workMode] || 0) + 1; }
        if (j.keySkills && Array.isArray(j.keySkills)) {
          sbm[k] = sbm[k] || {};
          for (const s of j.keySkills.slice(0, 5)) { const n = s.trim(); if (n) sbm[k][n] = (sbm[k][n] || 0) + 1; }
        }
      }
      for (const j of allJobsForHistory) {
        if (j.publishedAt) { const k = monthKey(j.publishedAt); pbm[k] = (pbm[k] || 0) + 1; }
      }
      const st: Record<string, { name: string; count: number }[]> = {};
      for (const [m, skills] of Object.entries(sbm)) {
        st[m] = Object.entries(skills).sort(([,a],[,b]) => b - a).slice(0, 10).map(([name, count]) => ({ name, count }));
      }

      (pdfData as any).historicalTrends = {
        totalEverScraped: allJobsForHistory.length,
        totalTracked: allJobsForHistory.length,
        jobsByMonth: jbm,
        publishedByMonth: pbm,
        categoryByMonth: cbm,
        workModeByMonth: wmbm,
        skillTrends: st,
      };

      try {
        const transitionRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/market-intelligence/transition`);
        if (transitionRes.ok) {
          const transitionData = await transitionRes.json();
          (pdfData as any).transitionIntelligence = {
            totalTransitionFriendly: transitionData.totalTransitionFriendly,
            transitionFriendlyPct: transitionData.transitionFriendlyPct,
            avgExperience: transitionData.avgExperience,
            trackSummary: transitionData.trackSummary,
            entryCorridor: transitionData.entryCorridor,
            skillBridge: transitionData.skillBridge,
            transitionEmployers: transitionData.transitionEmployers,
          };
        }
      } catch (e) {
        console.error("Failed to fetch transition data for PDF:", e);
      }

      const periodLabels: Record<string, string> = { weekly: "Weekly_Briefing", monthly: "Monthly_Report", annual: "Annual_Report" };
      const filename = `LegalTechCareers_${periodLabels[period]}_${new Date().toISOString().split("T")[0]}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const reportSiteUrl = "lawjobs.co";
      const pdfDoc = generateMarketIntelligencePDF(pdfData, period, reportSiteUrl);
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error: any) {
      console.error("Error generating PDF report:", error);
      res.status(500).json({ error: "Failed to generate PDF report" });
    }
  });

  app.get("/api/admin/market-intelligence/docx", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const isAdmin = await storage.isUserAdmin(user.id);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const period = (req.query.period as string) || "monthly";
      if (!["weekly", "monthly", "annual"].includes(period)) {
        return res.status(400).json({ error: "Invalid period." });
      }

      const pdfData = await getMarketDataForReport();
      if (!pdfData) return res.status(500).json({ error: "Could not load market data" });

      const docxSiteUrl = "lawjobs.co";
      const buffer = await generateMarketIntelligenceDocx(pdfData, period, docxSiteUrl);
      const periodLabels: Record<string, string> = { weekly: "Weekly_Briefing", monthly: "Monthly_Report", annual: "Annual_Report" };
      const filename = `LegalTechCareers_${periodLabels[period]}_DRAFT_${new Date().toISOString().split("T")[0]}.docx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error: any) {
      console.error("Error generating DOCX report:", error);
      res.status(500).json({ error: "Failed to generate Word report" });
    }
  });


  app.get("/api/health/db", async (_req, res) => {
    try {
      const dbUrl = process.env.DATABASE_URL || '';
      let dbHost = 'unknown';
      let dbName = 'unknown';
      try {
        const url = new URL(dbUrl);
        dbHost = url.hostname;
        dbName = url.pathname.replace('/', '');
      } catch {}
      res.json({
        env: process.env.NODE_ENV || 'development',
        dbHost,
        dbName,
        serverTime: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ error: "Health check failed" });
    }
  });

  const quizRateLimit = new Map<string, { count: number; resetAt: number }>();

  app.post("/api/quiz/result", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      const entry = quizRateLimit.get(ip);
      if (entry && now < entry.resetAt) {
        if (entry.count >= 10) {
          return res.status(429).json({ error: "Rate limit exceeded. You can take up to 10 quizzes per hour." });
        }
        entry.count++;
      } else {
        quizRateLimit.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
      }

      const quizSchema = z.object({
        currentRole: z.enum([
          "practicing_attorney",
          "in_house_counsel",
          "legal_ops",
          "non_legal",
          "student",
        ]),
        interest: z.enum([
          "improving_teams",
          "building_products",
          "data_analytics",
          "compliance_risk",
          "business_dev",
        ]),
        techLevel: z.enum([
          "basic",
          "legal_tech",
          "light_scripting",
          "technical",
        ]),
        careerStage: z.enum([
          "early",
          "mid",
          "senior",
          "executive",
        ]),
      });

      const parsed = quizSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid quiz answers", details: parsed.error.flatten() });
      }

      const { currentRole, interest, techLevel, careerStage } = parsed.data;

      const weights: Record<string, number> = {};
      const taxonomyKeys = Object.keys(JOB_TAXONOMY) as Array<keyof typeof JOB_TAXONOMY>;
      for (const key of taxonomyKeys) {
        weights[key] = 0;
      }

      const interestMap: Record<string, Record<string, number>> = {
        improving_teams: {
          "Legal Operations": 5,
          "Legal Consulting & Advisory": 4,
          "Knowledge Management": 3,
          "Contract Management": 2,
        },
        building_products: {
          "Legal Product Management": 5,
          "Legal Engineering": 4,
          "Legal AI & Analytics": 3,
          "Knowledge Management": 2,
        },
        data_analytics: {
          "Legal AI & Analytics": 5,
          "Knowledge Management": 4,
          "Legal Engineering": 3,
          "Legal Operations": 2,
        },
        compliance_risk: {
          "Compliance & Privacy": 5,
          "Contract Management": 4,
          "In-House Counsel": 3,
          "Policy & Access to Justice": 2,
        },
        business_dev: {
          "Legal Sales & Client Solutions": 5,
          "Legal Consulting & Advisory": 4,
          "Legal Product Management": 2,
          "In-House Counsel": 1,
        },
      };

      const roleMap: Record<string, Record<string, number>> = {
        practicing_attorney: {
          "In-House Counsel": 4,
          "Compliance & Privacy": 3,
          "Litigation & eDiscovery": 3,
          "Legal Consulting & Advisory": 2,
          "Contract Management": 2,
        },
        in_house_counsel: {
          "In-House Counsel": 3,
          "Legal Operations": 3,
          "Compliance & Privacy": 3,
          "Contract Management": 2,
          "Legal Product Management": 2,
        },
        legal_ops: {
          "Legal Operations": 4,
          "Legal Engineering": 3,
          "Contract Management": 3,
          "Knowledge Management": 2,
          "Legal AI & Analytics": 2,
        },
        non_legal: {
          "Legal AI & Analytics": 3,
          "Legal Engineering": 3,
          "Legal Product Management": 3,
          "Legal Sales & Client Solutions": 3,
          "Legal Consulting & Advisory": 2,
        },
        student: {
          "Legal Operations": 3,
          "In-House Counsel": 2,
          "Compliance & Privacy": 2,
          "Contract Management": 2,
          "Knowledge Management": 2,
          "Policy & Access to Justice": 2,
        },
      };

      const techMap: Record<string, Record<string, number>> = {
        basic: {
          "Legal Operations": 2,
          "In-House Counsel": 2,
          "Legal Consulting & Advisory": 2,
          "Compliance & Privacy": 1,
        },
        legal_tech: {
          "Legal Operations": 3,
          "Contract Management": 2,
          "Litigation & eDiscovery": 2,
          "Knowledge Management": 2,
        },
        light_scripting: {
          "Legal Engineering": 3,
          "Legal AI & Analytics": 2,
          "Legal Product Management": 2,
          "Knowledge Management": 2,
        },
        technical: {
          "Legal Engineering": 4,
          "Legal AI & Analytics": 4,
          "Legal Product Management": 3,
          "Intellectual Property & Innovation": 1,
        },
      };

      for (const [cat, w] of Object.entries(interestMap[interest] || {})) {
        weights[cat] = (weights[cat] || 0) + w;
      }
      for (const [cat, w] of Object.entries(roleMap[currentRole] || {})) {
        weights[cat] = (weights[cat] || 0) + w;
      }
      for (const [cat, w] of Object.entries(techMap[techLevel] || {})) {
        weights[cat] = (weights[cat] || 0) + w;
      }

      const sorted = Object.entries(weights)
        .filter(([, w]) => w > 0)
        .sort((a, b) => b[1] - a[1]);

      const maxWeight = sorted[0]?.[1] || 1;
      const topPaths = sorted.slice(0, 2).map(([name, weight]) => ({
        name,
        description: (JOB_TAXONOMY as any)[name]?.description || "",
        confidence: Math.round((weight / maxWeight) * 100),
      }));

      const allJobs = await storage.getPublishedJobs();
      const categoryCounts: Record<string, number> = {};
      for (const job of allJobs) {
        if (job.roleCategory) {
          categoryCounts[job.roleCategory] = (categoryCounts[job.roleCategory] || 0) + 1;
        }
      }

      const pathsWithCounts = topPaths.map((p) => ({
        ...p,
        jobCount: categoryCounts[p.name] || 0,
      }));

      const totalMatchedRoles = pathsWithCounts.reduce((sum, p) => sum + p.jobCount, 0);

      let transitionDifficulty: "Easy" | "Moderate" | "Challenging";
      const techScore = { basic: 0, legal_tech: 1, light_scripting: 2, technical: 3 }[techLevel];
      const interestTechGap: Record<string, number> = {
        improving_teams: 1,
        building_products: 2,
        data_analytics: 2,
        compliance_risk: 1,
        business_dev: 1,
      };
      const gap = (interestTechGap[interest] || 1) - techScore;
      const roleBonus = ["legal_ops", "in_house_counsel"].includes(currentRole) ? -1 : 0;
      const diffScore = gap + roleBonus;

      if (diffScore <= 0) {
        transitionDifficulty = "Easy";
      } else if (diffScore === 1) {
        transitionDifficulty = "Moderate";
      } else {
        transitionDifficulty = "Challenging";
      }

      res.json({
        paths: pathsWithCounts,
        transitionDifficulty,
        totalMatchedRoles,
      });
    } catch (error) {
      console.error("Error processing quiz:", error);
      res.status(500).json({ error: "Failed to process quiz" });
    }
  });

  app.get("/api/share/readiness-card.svg", async (req, res) => {
    const score = Math.min(100, Math.max(0, parseInt(String(req.query.score || "0"))));
    const path = String(req.query.path || "Legal Tech");
    const fitLabel = score >= 75 ? "Strong Fit" : score >= 50 ? "Good Fit" : score >= 25 ? "Emerging Fit" : "Early Explorer";

    const scoreColor = score >= 70 ? "#34d399" : score >= 45 ? "#fbbf24" : "#f87171";
    const barWidth = Math.round((score / 100) * 480);

    const safePath = path.slice(0, 100);
    const escapedPath = safePath.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="${scoreColor}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" rx="0"/>
  <rect x="60" y="60" width="1080" height="510" rx="24" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <text x="120" y="140" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="18" font-weight="500">LEGAL TECH CAREER READINESS</text>
  <line x1="120" y1="160" x2="400" y2="160" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>

  <text x="120" y="290" fill="url(#scoreGrad)" font-family="system-ui, sans-serif" font-size="144" font-weight="700">${score}</text>
  <text x="${score >= 10 ? (score >= 100 ? 420 : 340) : 230}" y="290" fill="#475569" font-family="system-ui, sans-serif" font-size="48" font-weight="300">/100</text>

  <text x="120" y="340" fill="${scoreColor}" font-family="system-ui, sans-serif" font-size="28" font-weight="600">${fitLabel}</text>

  <rect x="120" y="380" width="480" height="8" rx="4" fill="rgba(255,255,255,0.08)"/>
  <rect x="120" y="380" width="${barWidth}" height="8" rx="4" fill="url(#barGrad)"/>

  <text x="120" y="440" fill="#64748b" font-family="system-ui, sans-serif" font-size="16" font-weight="400">Top career path</text>
  <text x="120" y="470" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="24" font-weight="600">${escapedPath}</text>

  <line x1="120" y1="500" x2="1080" y2="500" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>

  <text x="120" y="540" fill="#3b82f6" font-family="system-ui, sans-serif" font-size="20" font-weight="600">lawjobs.co</text>
  <text x="308" y="540" fill="#475569" font-family="system-ui, sans-serif" font-size="20" font-weight="400"> — Career intelligence for legal tech</text>

  <rect x="820" y="510" width="260" height="48" rx="8" fill="#3b82f6"/>
  <text x="950" y="541" fill="#ffffff" font-family="system-ui, sans-serif" font-size="18" font-weight="600" text-anchor="middle">Check Your Fit Free</text>
</svg>`);
  });

  app.post("/api/admin/refresh-display-stats", isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin) return res.status(403).json({ error: "Admin access required" });
      const allJobs = await storage.getPublishedJobs();
      const companies = new Set(allJobs.map((j: any) => j.company));
      const countries = new Set(allJobs.map((j: any) => j.countryCode).filter((c: any) => c && c !== 'WW' && c !== 'UN'));
      forceRefreshDisplayStats(allJobs.length, companies.size, countries.size);
      clearAllStatsCaches();
      res.json({
        success: true,
        stats: { totalJobs: allJobs.length, totalCompanies: companies.size, totalCountries: countries.size },
      });
    } catch (error) {
      console.error("Error refreshing display stats:", error);
      res.status(500).json({ error: "Failed to refresh display stats" });
    }
  });

  app.get("/share/readiness", async (req, res) => {
    const score = parseInt(String(req.query.score || "0"));
    const path = String(req.query.path || "Legal Tech");
    const clampedScore = Math.min(100, Math.max(0, score));
    const fitLabel = clampedScore >= 75 ? "Strong Fit" : clampedScore >= 50 ? "Good Fit" : clampedScore >= 25 ? "Emerging Fit" : "Early Explorer";
    const ogUrl = `https://lawjobs.co/share/readiness?score=${clampedScore}&path=${encodeURIComponent(path)}`;
    const ogImage = `https://lawjobs.co/api/share/readiness-card.svg?score=${clampedScore}&path=${encodeURIComponent(path)}`;

    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>My Legal Tech Readiness: ${clampedScore}/100 — ${fitLabel} | lawjobs.co</title>
<meta name="description" content="I scored ${clampedScore}/100 on the Legal Tech Career Readiness Assessment. My top path: ${path}. Check yours free at lawjobs.co">
<meta property="og:type" content="website">
<meta property="og:title" content="Legal Tech Readiness: ${clampedScore}/100 — ${fitLabel}">
<meta property="og:description" content="Top career path: ${path}. Assessed by lawjobs.co — the career intelligence platform for lawyers moving into legal tech. Check your fit free.">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${ogUrl}">
<meta property="og:site_name" content="lawjobs.co">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Legal Tech Readiness: ${clampedScore}/100 — ${fitLabel}">
<meta name="twitter:description" content="Top career path: ${path}. Check yours free at lawjobs.co">
<meta name="twitter:image" content="${ogImage}">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
body{margin:0;font-family:'DM Sans',system-ui,sans-serif;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:48px;text-align:center;max-width:480px;width:90%}
.score{font-size:72px;font-weight:700;background:linear-gradient(135deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1}
.label{font-size:18px;color:#94a3b8;margin:8px 0 24px}
.path{font-size:14px;color:#cbd5e1;margin:4px 0}
.path strong{color:#fff}
.brand{margin-top:32px;font-size:13px;color:#64748b}
.brand a{color:#60a5fa;text-decoration:none}
.cta{display:inline-block;margin-top:20px;padding:12px 28px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;transition:background 0.2s}
.cta:hover{background:#2563eb}
</style>
</head>
<body>
<div class="card">
<div class="score">${clampedScore}</div>
<div class="label">${fitLabel}</div>
<p class="path">Top career path: <strong>${path}</strong></p>
<a class="cta" href="https://lawjobs.co/diagnostic">Check Your Fit Free</a>
<p class="brand">Assessed by <a href="https://lawjobs.co">lawjobs.co</a> — Career intelligence for legal tech</p>
</div>
</body>
</html>`);
  });

  runStartupCleanup();
  startScheduler();

  setTimeout(async () => {
    try {
      const result = await runDataCleanup();
      if (!result.skipped) {
        console.log(`[DataCleanup] Startup cleanup results:`, JSON.stringify(result));
      }
    } catch (err: any) {
      console.error('[DataCleanup] Startup cleanup failed:', err.message);
    }
  }, 5000);

  return httpServer;
}
