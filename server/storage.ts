import { db } from "./db";
import { jobs, users, userPreferences, jobCategories, jobSubmissions, jobAlerts, notifications, resumes, builtResumes, userActivities, userPersonas, savedJobs, jobApplications, events, scrapeRuns, jobReports, type Job, type InsertJob, type User, type UserPreferences, type InsertUserPreferences, type ResumeExtractedData, type JobCategory, type JobSubmission, type InsertJobSubmission, type JobAlert, type InsertJobAlert, type Notification, type InsertNotification, type Resume, type InsertResume, type BuiltResume, type InsertBuiltResume, type UserActivity, type InsertUserActivity, type UserPersona, type InsertUserPersona, type SavedJob, type InsertSavedJob, type JobApplication, type InsertJobApplication, type JobApplicationWithJob, type Event, type InsertEvent, type ScrapeRun, type InsertScrapeRun, type JobReport, type InsertJobReport, JOB_TAXONOMY } from "@shared/schema";
import { eq, desc, asc, and, sql, inArray, lt, gte, count } from "drizzle-orm";
import { cleanJobDescription } from "./lib/description-cleaner";
import { deriveSourceInfo } from "./lib/url-utils";
import { generateJobHash } from "./lib/job-hash";

export interface IStorage {
  // Jobs
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<void>;
  getActiveJobs(): Promise<Job[]>;
  seedJobs(): Promise<void>;
  upsertJobByExternalId(job: InsertJob): Promise<{ job: Job; isNew: boolean }>;
  getJobByExternalId(externalId: string): Promise<Job | undefined>;
  getJobByApplyUrl(applyUrl: string): Promise<Job | undefined>;
  bulkUpsertJobs(jobsList: InsertJob[]): Promise<{ inserted: number; updated: number; newJobs: Job[] }>;
  deactivateStaleJobs(scrapedExternalIds: Set<string>, sources: string[], scrapedCompanies?: Set<string>): Promise<number>;
  trackJobView(jobId: number): Promise<void>;
  trackApplyClick(jobId: number): Promise<void>;
  getPublishedJobs(): Promise<Job[]>;
  getPublishedJobsPaginated(page: number, limit: number, filters?: { category?: string; location?: string; locationType?: string; search?: string; seniority?: string; sort?: string }): Promise<{ jobs: Job[]; total: number; page: number; totalPages: number }>;
  getJobsForStandardization(status?: string): Promise<Job[]>;
  publishJob(id: number): Promise<Job | undefined>;
  unpublishJob(id: number): Promise<Job | undefined>;
  updateStructuredStatus(id: number, status: string, structuredDescription?: any): Promise<Job | undefined>;
  // User Resume
  updateUserResume(userId: string, resumeText: string, filename: string, extractedData: ResumeExtractedData): Promise<void>;
  getUserResume(userId: string): Promise<{ resumeFilename: string | null; extractedData: ResumeExtractedData | null } | null>;
  getUserResumeWithText(userId: string): Promise<{ resumeFilename: string | null; resumeText: string | null; extractedData: ResumeExtractedData | null } | null>;
  updateUserLastSearch(userId: string, query: string): Promise<void>;
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | null>;
  upsertUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences>;
  // User Admin
  isUserAdmin(userId: string): Promise<boolean>;
  setUserAdmin(userId: string, isAdmin: boolean): Promise<void>;
  // Job Categories
  getJobCategories(): Promise<JobCategory[]>;
  seedJobCategories(): Promise<void>;
  getJobsByCategory(category: string): Promise<Job[]>;
  // Job Submissions
  createJobSubmission(submission: InsertJobSubmission): Promise<JobSubmission>;
  getJobSubmissions(): Promise<JobSubmission[]>;
  // Job Alerts
  createJobAlert(alert: InsertJobAlert): Promise<JobAlert>;
  getUserAlerts(userId: string): Promise<JobAlert[]>;
  getActiveAlerts(): Promise<JobAlert[]>;
  updateJobAlert(id: number, userId: string, data: Partial<InsertJobAlert>): Promise<JobAlert | undefined>;
  deleteJobAlert(id: number, userId: string): Promise<void>;
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  createNotifications(notificationsList: InsertNotification[]): Promise<void>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationRead(id: number, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  cleanOldNotifications(daysOld: number): Promise<void>;
  // Resumes
  createResume(resume: InsertResume): Promise<Resume>;
  getUserResumes(userId: string): Promise<Resume[]>;
  getResumeById(id: number, userId: string): Promise<Resume | undefined>;
  getResumeWithText(id: number, userId: string): Promise<Resume | undefined>;
  updateResumeLabel(id: number, userId: string, label: string): Promise<Resume | undefined>;
  deleteResume(id: number, userId: string): Promise<void>;
  setPrimaryResume(id: number, userId: string): Promise<void>;
  getPrimaryResume(userId: string): Promise<Resume | undefined>;
  migrateUserResumeToResumes(userId: string): Promise<void>;
  // Subscriptions
  updateUserSubscription(userId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string; subscriptionTier?: string; subscriptionStatus?: string }): Promise<void>;
  getUserSubscription(userId: string): Promise<{ subscriptionTier: string | null; subscriptionStatus: string | null; stripeCustomerId: string | null; stripeSubscriptionId: string | null } | null>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  // User Activities
  logActivity(activity: InsertUserActivity): Promise<UserActivity>;
  logActivities(activities: InsertUserActivity[]): Promise<void>;
  getUserRecentActivities(userId: string, limit?: number): Promise<UserActivity[]>;
  getUserActivityCounts(userId: string): Promise<{ jobViews: number; searches: number; applyClicks: number }>;
  // User Personas
  getUserPersona(userId: string): Promise<UserPersona | undefined>;
  upsertUserPersona(userId: string, data: Partial<InsertUserPersona>): Promise<UserPersona>;
  // Built Resumes
  createBuiltResume(resume: InsertBuiltResume): Promise<BuiltResume>;
  getUserBuiltResumes(userId: string): Promise<BuiltResume[]>;
  getBuiltResumeById(id: number, userId: string): Promise<BuiltResume | undefined>;
  updateBuiltResume(id: number, userId: string, data: Partial<InsertBuiltResume>): Promise<BuiltResume | undefined>;
  deleteBuiltResume(id: number, userId: string): Promise<void>;
  // Events
  getEvents(filters?: { eventType?: string; attendanceType?: string; isFree?: boolean; topic?: string; upcoming?: boolean }): Promise<Event[]>;
  getAllEventsAdmin(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<void>;
  updateEventLinkStatus(id: number, status: string): Promise<void>;
  getEventsNeedingLinkCheck(maxAgeHours?: number): Promise<Event[]>;
  upsertEventByExternalId(event: InsertEvent): Promise<{ event: Event; isNew: boolean }>;
  bulkUpsertEvents(eventsList: InsertEvent[]): Promise<{ inserted: number; updated: number }>;
  getFeaturedEvents(limit?: number): Promise<Event[]>;
  trackEventView(eventId: number): Promise<void>;
  trackRegistrationClick(eventId: number): Promise<void>;
  seedEvents(): Promise<void>;
  // Admin Analytics
  getAnalyticsKpis(): Promise<any>;
  getAnalyticsEngagement(days?: number): Promise<any>;
  getAnalyticsFeatureAdoption(): Promise<any>;
  getAnalyticsUserCohorts(): Promise<any>;
  getAnalyticsTopContent(): Promise<any>;
  getAnalyticsUserList(): Promise<any>;
  getAnalyticsFunnel(): Promise<any>;
  // User Dashboard
  getUserDashboard(userId: string, days?: number): Promise<any>;
  // Saved Jobs
  saveJob(userId: string, jobId: number, notes?: string): Promise<SavedJob>;
  unsaveJob(userId: string, jobId: number): Promise<void>;
  getUserSavedJobs(userId: string): Promise<(SavedJob & { job: Job })[]>;
  isJobSaved(userId: string, jobId: number): Promise<boolean>;
  getUserSavedJobIds(userId: string): Promise<number[]>;
  getExpiringSavedJobs(userId: string, daysThreshold: number): Promise<(SavedJob & { job: Job })[]>;
  markReminderShown(savedJobId: number, userId: string): Promise<void>;
  // Job Applications
  createJobApplication(app: InsertJobApplication): Promise<JobApplication>;
  getUserApplications(userId: string): Promise<JobApplicationWithJob[]>;
  updateJobApplication(id: number, userId: string, data: Partial<InsertJobApplication>): Promise<JobApplication | undefined>;
  deleteJobApplication(id: number, userId: string): Promise<void>;
  getApplicationByUserAndJob(userId: string, jobId: number): Promise<JobApplication | undefined>;
  // Similar Jobs
  getSimilarJobs(jobId: number, limit?: number): Promise<Job[]>;
  // Usage limits
  getSavedJobCount(userId: string): Promise<number>;
  getDailyAssistantChatCount(userId: string): Promise<number>;
  getGuidedSearchCount(userId: string): Promise<number>;
  deactivatePastEvents(): Promise<number>;
  // Scrape Runs
  createScrapeRun(run: InsertScrapeRun): Promise<ScrapeRun>;
  updateScrapeRun(id: number, data: Partial<InsertScrapeRun>): Promise<ScrapeRun | undefined>;
  getScrapeRuns(limit?: number): Promise<ScrapeRun[]>;
  getLatestScrapeRun(): Promise<ScrapeRun | undefined>;
  // Pipeline / Enrichment
  getJobsForEnrichment(limit?: number): Promise<Job[]>;
  findLiveJobDuplicate(title: string, company: string, location: string | null, excludeId: number): Promise<Job | undefined>;
  getLiveJobs(): Promise<Job[]>;
  updateJobPipeline(id: number, data: Record<string, any>): Promise<Job | undefined>;
  updateJobWorkerFields(id: number, data: Record<string, any>): Promise<Job | undefined>;
  getJobsByPipelineStatus(status: string): Promise<Job[]>;
  getStalePublishedJobs(days: number): Promise<Job[]>;
  getPublishedJobsForLinkCheck(): Promise<Job[]>;
  getPipelineStats(): Promise<{ raw: number; enriching: number; ready: number; rejected: number; published: number }>;
  // Job Reports
  createJobReport(report: InsertJobReport): Promise<JobReport>;
  getJobReports(status?: string): Promise<(JobReport & { jobTitle?: string; jobCompany?: string })[]>;
  getReportCountForJob(jobId: number): Promise<number>;
  updateJobReportStatus(id: number, status: string, adminNotes?: string): Promise<JobReport | undefined>;
  getPublicJob(id: number): Promise<Job | undefined>;
}

class DatabaseStorage implements IStorage {
  async getJobs(): Promise<Job[]> {
    return db.select().from(jobs).orderBy(desc(jobs.postedDate));
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  private sanitizeJobFields(job: InsertJob | Partial<InsertJob>): typeof job {
    const result = { ...job };
    if (result.title) result.title = result.title.trim();
    if (result.company) result.company = result.company.trim();
    if (result.location) result.location = result.location.trim();
    if (result.description) {
      result.description = cleanJobDescription(result.description);
      result.descriptionFormatted = true;
    }
    if (result.requirements) {
      result.requirements = cleanJobDescription(result.requirements);
    }
    return result;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const cleaned = this.sanitizeJobFields(job);
    if (cleaned.applyUrl && !cleaned.sourceDomain) {
      const sourceInfo = deriveSourceInfo(cleaned.applyUrl as string, cleaned.source as string | null);
      if (sourceInfo.sourceDomain) (cleaned as any).sourceDomain = sourceInfo.sourceDomain;
      if (sourceInfo.sourceName) (cleaned as any).sourceName = sourceInfo.sourceName;
      if (sourceInfo.sourceUrl) (cleaned as any).sourceUrl = sourceInfo.sourceUrl;
    }
    const [newJob] = await db.insert(jobs).values(cleaned as InsertJob).returning();
    return newJob;
  }

  async updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined> {
    const cleaned = this.sanitizeJobFields(job);
    const [updatedJob] = await db
      .update(jobs)
      .set(cleaned)
      .where(eq(jobs.id, id))
      .returning();
    return updatedJob;
  }

  async deleteJob(id: number): Promise<void> {
    await db.delete(jobs).where(eq(jobs.id, id));
  }

  async trackJobView(jobId: number): Promise<void> {
    await db
      .update(jobs)
      .set({ viewCount: sql`${jobs.viewCount} + 1` })
      .where(eq(jobs.id, jobId));
  }

  async trackApplyClick(jobId: number): Promise<void> {
    await db
      .update(jobs)
      .set({ applyClickCount: sql`${jobs.applyClickCount} + 1` })
      .where(eq(jobs.id, jobId));
  }

  async getActiveJobs(): Promise<Job[]> {
    return db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.isActive, true),
        eq(jobs.isPublished, true),
        eq(jobs.pipelineStatus, 'ready'),
        eq(jobs.jobStatus, 'open'),
      ))
      .orderBy(desc(jobs.postedDate));
  }

  async getPublishedJobs(): Promise<Job[]> {
    return db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.isActive, true),
        eq(jobs.isPublished, true),
        eq(jobs.pipelineStatus, 'ready'),
        eq(jobs.jobStatus, 'open'),
      ))
      .orderBy(desc(jobs.postedDate));
  }

  async getPublishedJobsPaginated(
    page: number = 1,
    limit: number = 20,
    filters?: { category?: string; location?: string; locationType?: string; search?: string; seniority?: string; sort?: string }
  ): Promise<{ jobs: Job[]; total: number; page: number; totalPages: number }> {
    const conditions: any[] = [
      eq(jobs.isActive, true),
      eq(jobs.isPublished, true),
      eq(jobs.pipelineStatus, 'ready'),
      eq(jobs.jobStatus, 'open'),
    ];

    if (filters?.category) {
      conditions.push(eq(jobs.roleCategory, filters.category));
    }
    if (filters?.seniority) {
      const seniorityMap: Record<string, string[]> = {
        student: ['Intern', 'Fellowship'],
        entry: ['Entry', 'Junior', 'Associate'],
        mid: ['Mid'],
        senior: ['Senior', 'Lead', 'Director', 'VP', 'Principal', 'Staff'],
      };
      const patterns = seniorityMap[filters.seniority];
      if (patterns) {
        const orClauses = patterns.map(p => {
          const term = '%' + p.toLowerCase() + '%';
          return sql`(lower(${jobs.seniorityLevel}) LIKE ${term} OR lower(${jobs.title}) LIKE ${term})`;
        });
        conditions.push(sql`(${sql.join(orClauses, sql` OR `)})`);
      }
    }
    if (filters?.locationType) {
      if (filters.locationType === 'remote') {
        conditions.push(sql`(${jobs.locationType} = 'remote' OR ${jobs.isRemote} = true OR lower(${jobs.location}) LIKE '%remote%')`);
      } else if (filters.locationType === 'hybrid') {
        conditions.push(eq(jobs.locationType, 'hybrid'));
      } else if (filters.locationType === 'onsite') {
        conditions.push(eq(jobs.locationType, 'onsite'));
      }
    }
    if (filters?.location && filters.location !== 'remote' && filters.location !== 'hybrid' && filters.location !== 'onsite') {
      conditions.push(sql`lower(${jobs.location}) LIKE ${'%' + filters.location.toLowerCase() + '%'}`);
    }
    if (filters?.search) {
      const term = '%' + filters.search.toLowerCase() + '%';
      conditions.push(sql`(lower(${jobs.title}) LIKE ${term} OR lower(${jobs.company}) LIKE ${term})`);
    }

    const whereClause = and(...conditions);
    const [{ total: totalCount }] = await db.select({ total: count() }).from(jobs).where(whereClause);
    const total = Number(totalCount);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    let orderByClause;
    switch (filters?.sort) {
      case 'salary':
        orderByClause = [sql`${jobs.salaryMax} DESC NULLS LAST`, sql`${jobs.salaryMin} DESC NULLS LAST`, desc(jobs.postedDate)];
        break;
      case 'company':
        orderByClause = [asc(jobs.company), desc(jobs.postedDate)];
        break;
      case 'newest':
      default:
        orderByClause = [desc(jobs.postedDate)];
        break;
    }

    const results = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        company: jobs.company,
        location: jobs.location,
        isRemote: jobs.isRemote,
        locationType: jobs.locationType,
        roleCategory: jobs.roleCategory,
        seniorityLevel: jobs.seniorityLevel,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        postedDate: jobs.postedDate,
        applyUrl: jobs.applyUrl,
        source: jobs.source,
        isActive: jobs.isActive,
        isPublished: jobs.isPublished,
        pipelineStatus: jobs.pipelineStatus,
        jobStatus: jobs.jobStatus,
        lastSeenAt: jobs.lastSeenAt,
        experienceText: jobs.experienceText,
        aiSummary: jobs.aiSummary,
        keySkills: jobs.keySkills,
        legalRelevanceScore: jobs.legalRelevanceScore,
        companyLogo: jobs.companyLogo,
      })
      .from(jobs)
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(limit)
      .offset(offset);

    return { jobs: results as any, total, page, totalPages };
  }

  async getJobsForStandardization(status?: string): Promise<Job[]> {
    const conditions = [eq(jobs.isActive, true)];
    if (status) {
      conditions.push(eq(jobs.structuredStatus, status));
    }
    return db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.postedDate));
  }

  async publishJob(id: number): Promise<Job | undefined> {
    const [updated] = await db
      .update(jobs)
      .set({
        isPublished: true,
        isActive: true,
        pipelineStatus: 'ready',
        jobStatus: 'open',
      })
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  }

  async unpublishJob(id: number): Promise<Job | undefined> {
    const [updated] = await db
      .update(jobs)
      .set({ isPublished: false })
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  }

  async updateStructuredStatus(id: number, status: string, structuredDescription?: any): Promise<Job | undefined> {
    const updateData: any = {
      structuredStatus: status,
      structuredUpdatedAt: new Date(),
    };
    if (structuredDescription !== undefined) {
      updateData.structuredDescription = structuredDescription;
    }
    const [updated] = await db
      .update(jobs)
      .set(updateData)
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  }

  async getJobByExternalId(externalId: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.externalId, externalId));
    return job;
  }

  async getJobByApplyUrl(applyUrl: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.applyUrl, applyUrl));
    return job;
  }

  async upsertJobByExternalId(job: InsertJob): Promise<{ job: Job; isNew: boolean }> {
    if (!job.externalId) {
      const newJob = await this.createJob(job);
      return { job: newJob, isNew: true };
    }

    const existing = await this.getJobByExternalId(job.externalId);
    if (existing) {
      const aiFields = ['roleCategory', 'roleSubcategory', 'seniorityLevel', 'keySkills', 'aiSummary', 'matchKeywords', 'aiResponsibilities', 'aiQualifications', 'aiNiceToHaves'] as const;
      const updateData: Record<string, any> = {
        title: (job.title || '').trim(),
        company: (job.company || '').trim(),
        companyLogo: job.companyLogo,
        location: (job.location || '').trim(),
        isRemote: job.isRemote,
        locationType: job.locationType,
        applyUrl: job.applyUrl,
        source: job.source,
        externalId: job.externalId,
        isActive: true,
        lastScrapedAt: new Date(),
        lastSeenAt: new Date(),
      };

      if (!existing.jobHash) {
        updateData.jobHash = generateJobHash(
          (job.company || '').trim(), (job.title || '').trim(),
          (job.location || '').trim(), job.applyUrl
        );
      }

      if (job.salaryMin) updateData.salaryMin = job.salaryMin;
      if (job.salaryMax) updateData.salaryMax = job.salaryMax;

      const newDesc = job.description ? cleanJobDescription(job.description) : '';
      const existingDesc = existing.description || '';
      const descriptionChanged = newDesc.length >= existingDesc.length * 0.5 && newDesc.length >= 50 && newDesc !== existingDesc;
      if (descriptionChanged) {
        updateData.description = newDesc;
        updateData.descriptionFormatted = true;
        const PERMANENT_REJECTION_CODES = ['AUDIT_TITLE_REJECT', 'AUDIT_COMPANY_REJECT', 'HARD_REJECT', 'NON_ENGLISH', 'GARBAGE_DESCRIPTION', 'AUDIT_DUPLICATE'];
        if (existing.pipelineStatus === 'ready') {
          updateData.pipelineStatus = 'raw';
        } else if (existing.pipelineStatus === 'rejected') {
          const isPermanent = existing.reviewReasonCode && PERMANENT_REJECTION_CODES.includes(existing.reviewReasonCode);
          if (!isPermanent) {
            updateData.pipelineStatus = 'raw';
          }
        }
      }

      for (const field of aiFields) {
        const newVal = job[field];
        const existingVal = existing[field];
        if (newVal && (!existingVal || (Array.isArray(existingVal) && existingVal.length === 0))) {
          updateData[field] = newVal;
        }
      }

      const [updatedJob] = await db
        .update(jobs)
        .set(updateData)
        .where(eq(jobs.externalId, job.externalId))
        .returning();
      return { job: updatedJob, isNew: false };
    } else {
      const normalizedTitle = (job.title || '').trim().toLowerCase();
      const normalizedCompany = (job.company || '').trim().toLowerCase();
      if (normalizedTitle && normalizedCompany) {
        const [titleCompanyDupe] = await db.select().from(jobs).where(
          and(
            sql`lower(trim(${jobs.title})) = ${normalizedTitle}`,
            sql`lower(trim(${jobs.company})) = ${normalizedCompany}`,
            eq(jobs.isActive, true),
          )
        ).limit(1);
        if (titleCompanyDupe) {
          const updateData: Record<string, any> = {
            lastScrapedAt: new Date(),
            isActive: true,
          };
          if (job.salaryMin && !titleCompanyDupe.salaryMin) updateData.salaryMin = job.salaryMin;
          if (job.salaryMax && !titleCompanyDupe.salaryMax) updateData.salaryMax = job.salaryMax;
          const newDesc = job.description ? cleanJobDescription(job.description) : '';
          const existingDesc = titleCompanyDupe.description || '';
          if (newDesc.length > existingDesc.length) {
            updateData.description = newDesc;
          }
          const [updatedJob] = await db
            .update(jobs)
            .set(updateData)
            .where(eq(jobs.id, titleCompanyDupe.id))
            .returning();
          return { job: updatedJob, isNew: false };
        }
      }

      const hash = generateJobHash(
        (job.company || '').trim(), (job.title || '').trim(),
        (job.location || '').trim(), job.applyUrl
      );
      const [newJob] = await db.insert(jobs).values({
        ...job,
        lastScrapedAt: new Date(),
        lastSeenAt: new Date(),
        firstSeenAt: new Date(),
        jobHash: hash,
        pipelineStatus: 'raw',
        isPublished: false,
      } as any).returning();
      return { job: newJob, isNew: true };
    }
  }

  async bulkUpsertJobs(jobsList: InsertJob[]): Promise<{ inserted: number; updated: number; newJobs: Job[] }> {
    let inserted = 0;
    let updated = 0;
    const newJobs: Job[] = [];

    for (const job of jobsList) {
      const result = await this.upsertJobByExternalId(job);
      if (result.isNew) {
        inserted++;
        newJobs.push(result.job);
      } else {
        updated++;
      }
    }

    return { inserted, updated, newJobs };
  }

  async deactivateStaleJobs(scrapedExternalIds: Set<string>, sources: string[], scrapedCompanies?: Set<string>): Promise<number> {
    if (scrapedExternalIds.size === 0 || sources.length === 0) return 0;

    const activeJobs = await db.select({
      id: jobs.id,
      externalId: jobs.externalId,
      source: jobs.source,
      company: jobs.company,
      pipelineStatus: jobs.pipelineStatus,
      isPublished: jobs.isPublished,
      lastEnrichedAt: jobs.lastEnrichedAt,
    })
      .from(jobs)
      .where(eq(jobs.isActive, true));

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const normalizeCompany = (name: string) => name.toLowerCase().trim();
    const normalizedScrapedCompanies = scrapedCompanies 
      ? new Set(Array.from(scrapedCompanies).map(normalizeCompany))
      : null;

    let deactivated = 0;
    for (const job of activeJobs) {
      if (!job.externalId || !job.source) continue;
      if (!sources.includes(job.source)) continue;
      if (job.pipelineStatus === 'raw') continue;
      if (job.isPublished && job.lastEnrichedAt && job.lastEnrichedAt > twentyFourHoursAgo) continue;
      if (normalizedScrapedCompanies && job.company && !normalizedScrapedCompanies.has(normalizeCompany(job.company))) continue;
      if (!scrapedExternalIds.has(job.externalId)) {
        await db.update(jobs)
          .set({ isActive: false })
          .where(eq(jobs.id, job.id));
        deactivated++;
      }
    }
    return deactivated;
  }

  async seedJobs(): Promise<void> {
    const existingJobs = await db.select().from(jobs).limit(1);
    if (existingJobs.length > 0) {
      console.log("Jobs already seeded, skipping...");
      return;
    }

    const seedData: InsertJob[] = [
      {
        title: "Senior Product Manager",
        company: "Harvey AI",
        companyLogo: "https://logo.clearbit.com/harvey.ai",
        location: "San Francisco, CA",
        isRemote: true,
        salaryMin: 150000,
        salaryMax: 200000,
        experienceMin: 5,
        experienceMax: 8,
        roleType: "Product Management",
        description: "Lead product development for our AI-powered legal research platform. Work with engineers and legal experts to build tools that transform how lawyers work. You'll own the product roadmap for our core search and research features.",
        requirements: "5+ years product management experience, experience with AI/ML products, legal tech experience preferred",
        applyUrl: "https://harvey.ai/careers",
        isActive: true,
        roleCategory: "Legal AI Jobs",
        roleSubcategory: "AI Product Manager (Legal)",
        seniorityLevel: "Senior",
        keySkills: ["Product Management", "AI/ML", "Legal Tech", "Roadmapping", "User Research"],
        aiSummary: "Lead product strategy for Harvey's AI-powered legal research tools. They're looking for experienced PMs who understand AI products and can collaborate with legal experts. Join a fast-growing startup transforming how lawyers work.",
        matchKeywords: ["product manager", "ai", "legal", "roadmap", "strategy"],
      },
      {
        title: "Legal AI Engineer",
        company: "CoCounsel",
        companyLogo: "https://logo.clearbit.com/casetext.com",
        location: "Remote",
        isRemote: true,
        salaryMin: 120000,
        salaryMax: 160000,
        experienceMin: 3,
        experienceMax: 6,
        roleType: "Engineering",
        description: "Build the future of legal AI. Design and implement features that help lawyers draft documents, research cases, and automate workflows. Join a team that's revolutionizing how legal work gets done.",
        requirements: "3+ years software engineering experience, Python or TypeScript, interest in legal tech",
        applyUrl: "https://casetext.com/careers",
        isActive: true,
        roleCategory: "Legal AI Jobs",
        roleSubcategory: "Legal AI Engineer",
        seniorityLevel: "Mid",
        keySkills: ["Python", "TypeScript", "NLP", "Machine Learning", "Legal Tech"],
        aiSummary: "Build AI features for CoCounsel's legal document drafting and research platform. Looking for engineers with Python/TypeScript skills and interest in legal applications. Opportunity to work on cutting-edge LLM integrations.",
        matchKeywords: ["engineer", "ai", "legal", "python", "typescript", "nlp"],
      },
      {
        title: "AI Research Scientist",
        company: "EvenUp",
        companyLogo: "https://logo.clearbit.com/evenuplaw.com",
        location: "San Francisco, CA",
        isRemote: false,
        salaryMin: 180000,
        salaryMax: 220000,
        experienceMin: 4,
        experienceMax: 10,
        roleType: "Research",
        description: "Develop cutting-edge ML models for legal document analysis. PhD in CS/ML preferred. Work on NLP, computer vision, and generative AI to extract insights from millions of legal documents.",
        requirements: "PhD in CS/ML or equivalent, experience with NLP, publications in top venues preferred",
        applyUrl: "https://evenuplaw.com/careers",
        isActive: true,
        roleCategory: "Legal AI Jobs",
        roleSubcategory: "AI Researcher (Law + ML)",
        seniorityLevel: "Senior",
        keySkills: ["Machine Learning", "NLP", "Computer Vision", "PyTorch", "Research"],
        aiSummary: "Research and develop ML models for analyzing millions of legal documents at EvenUp. PhD preferred with NLP expertise. High-impact role advancing the state of legal AI technology.",
        matchKeywords: ["research", "scientist", "ml", "phd", "nlp", "ai"],
      },
      {
        title: "Product Designer",
        company: "Robin AI",
        companyLogo: "https://logo.clearbit.com/robinai.com",
        location: "London, UK",
        isRemote: true,
        salaryMin: 90000,
        salaryMax: 130000,
        experienceMin: 3,
        experienceMax: 7,
        roleType: "Design",
        description: "Design beautiful, intuitive interfaces for contract review and negotiation tools. Work closely with lawyers to understand workflows and create experiences that simplify complex legal processes.",
        requirements: "3+ years product design experience, Figma expertise, experience with complex workflows",
        applyUrl: "https://robinai.com/careers",
        isActive: true,
        roleCategory: "Legal Tech Startup Roles",
        roleSubcategory: "Product Manager (LegalTech)",
        seniorityLevel: "Mid",
        keySkills: ["Product Design", "Figma", "UX Research", "Contract Workflows"],
        aiSummary: "Design intuitive interfaces for Robin AI's contract review tools. Work closely with lawyers to understand complex legal workflows. Remote-friendly role based in London.",
        matchKeywords: ["design", "product", "figma", "ux", "contract"],
      },
      {
        title: "Legal Operations Manager",
        company: "Ironclad",
        companyLogo: "https://logo.clearbit.com/ironcladapp.com",
        location: "Remote",
        isRemote: true,
        salaryMin: 110000,
        salaryMax: 150000,
        experienceMin: 5,
        experienceMax: 8,
        roleType: "Operations",
        description: "Help scale our legal tech platform. Work with customers to optimize their contract workflows and drive adoption. You'll be the bridge between product and customer success.",
        requirements: "5+ years legal operations or customer success experience, contract management experience",
        applyUrl: "https://ironcladapp.com/careers",
        isActive: true,
        roleCategory: "Legal Tech Startup Roles",
        roleSubcategory: "Legal Operations Manager",
        seniorityLevel: "Senior",
        keySkills: ["Legal Operations", "Contract Management", "Customer Success", "Process Optimization"],
        aiSummary: "Scale Ironclad's contract management platform by optimizing customer workflows. Bridge product and customer success teams. Fully remote with strong legal ops experience required.",
        matchKeywords: ["operations", "legal ops", "contract", "customer success"],
      },
      {
        title: "Solutions Engineer",
        company: "Lexion",
        companyLogo: "https://logo.clearbit.com/lexion.ai",
        location: "Seattle, WA",
        isRemote: true,
        salaryMin: 130000,
        salaryMax: 180000,
        experienceMin: 2,
        experienceMax: 5,
        roleType: "Engineering",
        description: "Build features across our contract management platform. React, Node.js, Python. Work on AI-powered contract analysis and help lawyers manage their agreements more efficiently.",
        requirements: "2+ years full stack experience, React and Node.js, Python a plus",
        applyUrl: "https://lexion.ai/careers",
        isActive: true,
        roleCategory: "Legal Tech Startup Roles",
        roleSubcategory: "Solutions Engineer",
        seniorityLevel: "Mid",
        keySkills: ["React", "Node.js", "Python", "Full Stack", "APIs"],
        aiSummary: "Build full-stack features for Lexion's AI-powered contract platform. Work with React, Node.js, and Python. Great opportunity for engineers interested in legal tech.",
        matchKeywords: ["solutions", "engineer", "react", "nodejs", "python"],
      },
      {
        title: "Sales Engineer (LegalTech)",
        company: "vLex",
        companyLogo: "https://logo.clearbit.com/vlex.com",
        location: "Miami, FL",
        isRemote: false,
        salaryMin: 100000,
        salaryMax: 140000,
        experienceMin: 4,
        experienceMax: 7,
        roleType: "Sales",
        description: "Drive growth of our legal research platform. Build relationships with law firms and corporate legal departments. Identify opportunities and close enterprise deals.",
        requirements: "4+ years B2B sales experience, legal industry experience preferred, strong communication skills",
        applyUrl: "https://vlex.com/careers",
        isActive: true,
        roleCategory: "Legal Tech Startup Roles",
        roleSubcategory: "Sales Engineer (LegalTech)",
        seniorityLevel: "Mid",
        keySkills: ["B2B Sales", "Enterprise Sales", "Legal Industry", "Relationship Building"],
        aiSummary: "Drive enterprise sales for vLex's legal research platform in Miami. Build relationships with law firms and corporate legal teams. Legal industry experience is a plus.",
        matchKeywords: ["sales", "business development", "enterprise", "legal"],
      },
      {
        title: "Machine Learning Engineer",
        company: "DISCO",
        companyLogo: "https://logo.clearbit.com/csdisco.com",
        location: "Austin, TX",
        isRemote: true,
        salaryMin: 140000,
        salaryMax: 190000,
        experienceMin: 3,
        experienceMax: 6,
        roleType: "Engineering",
        description: "Build ML models for eDiscovery. Work on document classification, entity extraction, and legal hold automation. Help legal teams find the needle in the haystack.",
        requirements: "3+ years ML engineering experience, Python, experience with text classification",
        applyUrl: "https://csdisco.com/careers",
        isActive: true,
        roleCategory: "Legal AI Jobs",
        roleSubcategory: "Legal AI Engineer",
        seniorityLevel: "Mid",
        keySkills: ["Machine Learning", "Python", "Text Classification", "NLP", "eDiscovery"],
        aiSummary: "Build ML models for DISCO's eDiscovery platform in Austin. Work on document classification and entity extraction. Help legal teams find critical evidence efficiently.",
        matchKeywords: ["ml", "machine learning", "ediscovery", "classification", "nlp"],
      },
      {
        title: "Customer Success Manager",
        company: "Relativity",
        companyLogo: "https://logo.clearbit.com/relativity.com",
        location: "Chicago, IL",
        isRemote: false,
        salaryMin: 80000,
        salaryMax: 120000,
        experienceMin: 2,
        experienceMax: 5,
        roleType: "Customer Success",
        description: "Help legal teams succeed with our eDiscovery platform. Train users, troubleshoot issues, drive renewals. Be the voice of the customer and advocate for their success.",
        requirements: "2+ years customer success experience, legal tech or SaaS experience preferred",
        applyUrl: "https://relativity.com/careers",
        isActive: true,
        roleCategory: "Legal Tech Startup Roles",
        roleSubcategory: "Customer Success (Legal SaaS)",
        seniorityLevel: "Mid",
        keySkills: ["Customer Success", "SaaS", "Training", "Account Management"],
        aiSummary: "Drive customer success for Relativity's eDiscovery platform in Chicago. Train legal teams, troubleshoot issues, and drive renewals. Be the voice of the customer.",
        matchKeywords: ["customer success", "saas", "legal", "training", "retention"],
      },
      {
        title: "eDiscovery Analytics Manager",
        company: "Clio",
        companyLogo: "https://logo.clearbit.com/clio.com",
        location: "Vancouver, BC",
        isRemote: true,
        salaryMin: 90000,
        salaryMax: 130000,
        experienceMin: 3,
        experienceMax: 6,
        roleType: "Analytics",
        description: "Lead eDiscovery and analytics initiatives for law firm clients. Work with litigation teams to implement technology solutions and train users on best practices.",
        requirements: "3+ years eDiscovery experience, Relativity certification preferred, strong analytical skills",
        applyUrl: "https://clio.com/careers",
        isActive: true,
        roleCategory: "Law Firm Tech & Innovation",
        roleSubcategory: "eDiscovery / Analytics Manager",
        seniorityLevel: "Mid",
        keySkills: ["eDiscovery", "Relativity", "Litigation Support", "Analytics", "Training"],
        aiSummary: "Lead eDiscovery initiatives at Clio, working with litigation teams on technology solutions. Relativity certification preferred. Remote role based in Vancouver.",
        matchKeywords: ["ediscovery", "analytics", "litigation", "relativity", "legal"],
      },
      {
        title: "Product Counsel",
        company: "Notion",
        companyLogo: "https://logo.clearbit.com/notion.so",
        location: "San Francisco, CA",
        isRemote: false,
        locationType: "hybrid",
        salaryMin: 180000,
        salaryMax: 240000,
        experienceMin: 6,
        experienceMax: 10,
        roleType: "Legal",
        description: "Advise product and engineering teams on legal risks related to new features, AI integration, and data practices. Draft and negotiate commercial agreements, partner with privacy and compliance teams, and help shape product roadmaps with a legal lens. This role sits at the intersection of law, technology, and product strategy.",
        requirements: "JD and active bar membership, 6+ years of experience in technology transactions, product counseling, or in-house at a tech company. Familiarity with AI/ML regulations, data privacy frameworks (GDPR, CCPA), and platform liability issues.",
        applyUrl: "https://www.notion.com/careers",
        isActive: true,
        roleCategory: "Legal Product Management",
        roleSubcategory: "Product Counsel",
        seniorityLevel: "Senior",
        keySkills: ["Product Counseling", "Technology Transactions", "AI Regulations", "Data Privacy", "Commercial Agreements"],
        aiSummary: "Advise Notion's product and engineering teams on legal considerations for new features and AI integration. A hybrid role in SF for experienced tech lawyers who want to shape product strategy through a legal lens.",
        matchKeywords: ["product counsel", "legal", "technology", "privacy", "ai", "in-house"],
      },
      {
        title: "Product Attorney",
        company: "Anthropic",
        companyLogo: "https://logo.clearbit.com/anthropic.com",
        location: "San Francisco, CA",
        isRemote: false,
        locationType: "onsite",
        salaryMin: 200000,
        salaryMax: 280000,
        experienceMin: 5,
        experienceMax: 9,
        roleType: "Legal",
        description: "Provide legal guidance on AI safety, product launches, and regulatory compliance for cutting-edge AI products. Work directly with researchers and engineers to navigate novel legal questions around AI governance, intellectual property, and responsible deployment. Help build internal policies and frameworks for safe AI development.",
        requirements: "JD and active bar membership, 5+ years of legal experience in tech, IP, or AI policy. Experience advising on product development, open-source licensing, or AI governance strongly preferred.",
        applyUrl: "https://job-boards.greenhouse.io/anthropic/jobs/5074045008",
        isActive: true,
        roleCategory: "Legal AI & Analytics",
        roleSubcategory: "AI Safety Counsel",
        seniorityLevel: "Senior",
        keySkills: ["AI Governance", "Product Law", "Intellectual Property", "AI Safety", "Regulatory Compliance"],
        aiSummary: "Guide legal strategy for Anthropic's AI products, working at the frontier of AI safety and governance. Ideal for attorneys passionate about responsible AI who want to shape the future of AI regulation from inside a leading lab.",
        matchKeywords: ["product attorney", "ai", "governance", "ip", "safety", "compliance"],
      },
      {
        title: "Product Associate (Legal Tech)",
        company: "Everlaw",
        companyLogo: "https://logo.clearbit.com/everlaw.com",
        location: "Oakland, CA",
        isRemote: true,
        locationType: "remote",
        salaryMin: 100000,
        salaryMax: 140000,
        experienceMin: 1,
        experienceMax: 4,
        roleType: "Product Management",
        description: "Support product strategy and execution for Everlaw's litigation platform. Conduct user research with legal professionals, analyze usage data, write product specs, and collaborate with engineering to deliver features that transform how legal teams handle discovery and case preparation. Great entry point for lawyers transitioning into product roles.",
        requirements: "1-4 years of experience in legal practice, legal operations, or product management. Strong analytical skills, comfort with data, and genuine interest in how technology can improve legal workflows.",
        applyUrl: "https://www.everlaw.com/careers/",
        isActive: true,
        roleCategory: "Legal Product Management",
        roleSubcategory: "Legal Product Manager",
        seniorityLevel: "Entry",
        keySkills: ["Product Management", "User Research", "Data Analysis", "Legal Workflows", "eDiscovery"],
        aiSummary: "Join Everlaw as a Product Associate to help build the next generation of litigation technology. A great entry point for lawyers or legal professionals looking to move into product management in legal tech. Fully remote.",
        matchKeywords: ["product associate", "legal tech", "product management", "ediscovery", "entry"],
      },
      {
        title: "Privacy Counsel",
        company: "OneTrust",
        companyLogo: "https://logo.clearbit.com/onetrust.com",
        location: "Atlanta, GA",
        isRemote: true,
        locationType: "remote",
        salaryMin: 160000,
        salaryMax: 220000,
        experienceMin: 4,
        experienceMax: 8,
        roleType: "Legal",
        description: "Serve as in-house privacy counsel supporting product development, customer negotiations, and regulatory strategy. Advise on global data protection laws including GDPR, CCPA/CPRA, and emerging AI privacy regulations. Partner with engineering to build privacy-by-design into products and conduct data protection impact assessments.",
        requirements: "JD and active bar membership, 4+ years of privacy law experience. CIPP/E or CIPP/US certification preferred. Experience with privacy technology platforms, DPIAs, and vendor privacy assessments.",
        applyUrl: "https://job-boards.greenhouse.io/onetrust/jobs/7017034",
        isActive: true,
        roleCategory: "Compliance & Privacy",
        roleSubcategory: "Privacy Counsel",
        seniorityLevel: "Mid",
        keySkills: ["Privacy Law", "GDPR", "CCPA", "Data Protection", "CIPP", "Privacy Engineering"],
        aiSummary: "Join OneTrust as Privacy Counsel to advise on global data protection laws and help build privacy into industry-leading technology products. Ideal for privacy attorneys who want to work at the intersection of law and tech. Fully remote.",
        matchKeywords: ["privacy counsel", "gdpr", "ccpa", "data protection", "privacy", "compliance"],
      },
    ];

    await db.insert(jobs).values(seedData);
    console.log("Seeded database with sample jobs");
  }

  // User Resume methods
  async updateUserResume(userId: string, resumeText: string, filename: string, extractedData: ResumeExtractedData): Promise<void> {
    await db
      .update(users)
      .set({
        resumeText,
        resumeFilename: filename,
        extractedData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserResume(userId: string): Promise<{ resumeFilename: string | null; extractedData: ResumeExtractedData | null } | null> {
    const [user] = await db
      .select({
        resumeFilename: users.resumeFilename,
        extractedData: users.extractedData,
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) return null;
    return {
      resumeFilename: user.resumeFilename,
      extractedData: user.extractedData as ResumeExtractedData | null,
    };
  }

  async getUserResumeWithText(userId: string): Promise<{ resumeFilename: string | null; resumeText: string | null; extractedData: ResumeExtractedData | null } | null> {
    const [user] = await db
      .select({
        resumeFilename: users.resumeFilename,
        resumeText: users.resumeText,
        extractedData: users.extractedData,
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) return null;
    return {
      resumeFilename: user.resumeFilename,
      resumeText: user.resumeText,
      extractedData: user.extractedData as ResumeExtractedData | null,
    };
  }

  async updateUserLastSearch(userId: string, query: string): Promise<void> {
    await db
      .update(users)
      .set({ lastSearchQuery: query, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return prefs || null;
  }

  async upsertUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const existing = await this.getUserPreferences(userId);
    
    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({ ...prefs, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userPreferences)
        .values({ userId, ...prefs })
        .returning();
      return created;
    }
  }

  // User Admin methods
  async isUserAdmin(userId: string): Promise<boolean> {
    const [user] = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId));
    return user?.isAdmin ?? false;
  }

  async setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isAdmin, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Job Categories methods
  async getJobCategories(): Promise<JobCategory[]> {
    return db.select().from(jobCategories).orderBy(jobCategories.sortOrder);
  }

  async seedJobCategories(): Promise<void> {
    const existing = await db.select().from(jobCategories).limit(1);
    if (existing.length > 0) {
      return;
    }

    const categories = Object.entries(JOB_TAXONOMY).map(([name, data], index) => ({
      categoryName: name,
      categoryIcon: data.icon,
      subcategories: [...data.subcategories],
      sortOrder: index + 1,
    }));

    await db.insert(jobCategories).values(categories);
    console.log("Seeded job categories");
  }

  async getJobsByCategory(category: string): Promise<Job[]> {
    return db
      .select()
      .from(jobs)
      .where(and(eq(jobs.roleCategory, category), eq(jobs.isActive, true)))
      .orderBy(desc(jobs.postedDate));
  }

  async createJobSubmission(submission: InsertJobSubmission): Promise<JobSubmission> {
    const [newSubmission] = await db.insert(jobSubmissions).values(submission).returning();
    return newSubmission;
  }

  async getJobSubmissions(): Promise<JobSubmission[]> {
    return db.select().from(jobSubmissions).orderBy(desc(jobSubmissions.submittedAt));
  }

  async createJobAlert(alert: InsertJobAlert): Promise<JobAlert> {
    const [newAlert] = await db.insert(jobAlerts).values(alert).returning();
    return newAlert;
  }

  async getUserAlerts(userId: string): Promise<JobAlert[]> {
    return db.select().from(jobAlerts).where(eq(jobAlerts.userId, userId)).orderBy(desc(jobAlerts.createdAt));
  }

  async getActiveAlerts(): Promise<JobAlert[]> {
    return db.select().from(jobAlerts).where(eq(jobAlerts.isActive, true));
  }

  async updateJobAlert(id: number, userId: string, data: Partial<InsertJobAlert>): Promise<JobAlert | undefined> {
    const [updated] = await db
      .update(jobAlerts)
      .set(data)
      .where(and(eq(jobAlerts.id, id), eq(jobAlerts.userId, userId)))
      .returning();
    return updated;
  }

  async deleteJobAlert(id: number, userId: string): Promise<void> {
    await db.delete(jobAlerts).where(and(eq(jobAlerts.id, id), eq(jobAlerts.userId, userId)));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotif] = await db.insert(notifications).values(notification).returning();
    return newNotif;
  }

  async createNotifications(notificationsList: InsertNotification[]): Promise<void> {
    if (notificationsList.length === 0) return;
    await db.insert(notifications).values(notificationsList);
  }

  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result[0]?.count || 0;
  }

  async markNotificationRead(id: number, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async cleanOldNotifications(daysOld: number): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    await db.delete(notifications).where(lt(notifications.createdAt, cutoff));
  }

  async createResume(resume: InsertResume): Promise<Resume> {
    const existing = await this.getUserResumes(resume.userId);
    if (existing.length === 0) {
      resume.isPrimary = true;
    }
    const [created] = await db.insert(resumes).values(resume).returning();
    return created;
  }

  async getUserResumes(userId: string): Promise<Resume[]> {
    return db
      .select({
        id: resumes.id,
        userId: resumes.userId,
        label: resumes.label,
        filename: resumes.filename,
        resumeText: sql<string | null>`null`,
        extractedData: resumes.extractedData,
        isPrimary: resumes.isPrimary,
        createdAt: resumes.createdAt,
      })
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.isPrimary), desc(resumes.createdAt));
  }

  async getResumeById(id: number, userId: string): Promise<Resume | undefined> {
    const [resume] = await db
      .select({
        id: resumes.id,
        userId: resumes.userId,
        label: resumes.label,
        filename: resumes.filename,
        resumeText: sql<string | null>`null`,
        extractedData: resumes.extractedData,
        isPrimary: resumes.isPrimary,
        createdAt: resumes.createdAt,
      })
      .from(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
    return resume ?? undefined;
  }

  async getResumeWithText(id: number, userId: string): Promise<Resume | undefined> {
    const [resume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
    return resume ?? undefined;
  }

  async updateResumeLabel(id: number, userId: string, label: string): Promise<Resume | undefined> {
    const [updated] = await db
      .update(resumes)
      .set({ label })
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .returning();
    return updated ?? undefined;
  }

  async deleteResume(id: number, userId: string): Promise<void> {
    const resume = await this.getResumeById(id, userId);
    await db.delete(resumes).where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
    if (resume?.isPrimary) {
      const remaining = await this.getUserResumes(userId);
      if (remaining.length > 0) {
        await this.setPrimaryResume(remaining[0].id, userId);
      }
    }
  }

  async setPrimaryResume(id: number, userId: string): Promise<void> {
    await db
      .update(resumes)
      .set({ isPrimary: false })
      .where(eq(resumes.userId, userId));
    await db
      .update(resumes)
      .set({ isPrimary: true })
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
  }

  async getPrimaryResume(userId: string): Promise<Resume | undefined> {
    const [resume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.userId, userId), eq(resumes.isPrimary, true)));
    return resume ?? undefined;
  }

  async migrateUserResumeToResumes(userId: string): Promise<void> {
    const existingResumes = await this.getUserResumes(userId);
    if (existingResumes.length > 0) return;

    const userData = await this.getUserResumeWithText(userId);
    if (!userData?.resumeFilename || !userData.resumeText) return;

    await this.createResume({
      userId,
      label: "My Resume",
      filename: userData.resumeFilename,
      resumeText: userData.resumeText,
      extractedData: userData.extractedData,
      isPrimary: true,
    });
  }

  async updateUserSubscription(userId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string; subscriptionTier?: string; subscriptionStatus?: string }): Promise<void> {
    await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async getUserSubscription(userId: string): Promise<{ subscriptionTier: string | null; subscriptionStatus: string | null; stripeCustomerId: string | null; stripeSubscriptionId: string | null } | null> {
    const [user] = await db.select({
      subscriptionTier: users.subscriptionTier,
      subscriptionStatus: users.subscriptionStatus,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
    }).from(users).where(eq(users.id, userId));
    return user || null;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  async logActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const [result] = await db.insert(userActivities).values(activity).returning();
    return result;
  }

  async logActivities(activities: InsertUserActivity[]): Promise<void> {
    if (activities.length === 0) return;
    await db.insert(userActivities).values(activities);
  }

  async getUserRecentActivities(userId: string, limit = 50): Promise<UserActivity[]> {
    return db.select().from(userActivities)
      .where(eq(userActivities.userId, userId))
      .orderBy(desc(userActivities.createdAt))
      .limit(limit);
  }

  async getUserActivityCounts(userId: string): Promise<{ jobViews: number; searches: number; applyClicks: number }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const results = await db.select({
      eventType: userActivities.eventType,
      cnt: count(),
    }).from(userActivities)
      .where(and(
        eq(userActivities.userId, userId),
        gte(userActivities.createdAt, thirtyDaysAgo),
      ))
      .groupBy(userActivities.eventType);

    const counts = { jobViews: 0, searches: 0, applyClicks: 0 };
    for (const r of results) {
      if (r.eventType === "job_view") counts.jobViews = Number(r.cnt);
      if (r.eventType === "search") counts.searches = Number(r.cnt);
      if (r.eventType === "apply_click") counts.applyClicks = Number(r.cnt);
    }
    return counts;
  }

  async getUserPersona(userId: string): Promise<UserPersona | undefined> {
    const [persona] = await db.select().from(userPersonas).where(eq(userPersonas.userId, userId));
    return persona;
  }

  async upsertUserPersona(userId: string, data: Partial<InsertUserPersona>): Promise<UserPersona> {
    const existing = await this.getUserPersona(userId);
    if (existing) {
      const [updated] = await db.update(userPersonas)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userPersonas.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userPersonas)
      .values({ userId, ...data, updatedAt: new Date() })
      .returning();
    return created;
  }

  async createBuiltResume(resume: InsertBuiltResume): Promise<BuiltResume> {
    const [created] = await db.insert(builtResumes).values(resume).returning();
    return created;
  }

  async getUserBuiltResumes(userId: string): Promise<BuiltResume[]> {
    return db.select().from(builtResumes)
      .where(eq(builtResumes.userId, userId))
      .orderBy(desc(builtResumes.updatedAt));
  }

  async getBuiltResumeById(id: number, userId: string): Promise<BuiltResume | undefined> {
    const [resume] = await db.select().from(builtResumes)
      .where(and(eq(builtResumes.id, id), eq(builtResumes.userId, userId)));
    return resume;
  }

  async updateBuiltResume(id: number, userId: string, data: Partial<InsertBuiltResume>): Promise<BuiltResume | undefined> {
    const [updated] = await db.update(builtResumes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(builtResumes.id, id), eq(builtResumes.userId, userId)))
      .returning();
    return updated;
  }

  async deleteBuiltResume(id: number, userId: string): Promise<void> {
    await db.delete(builtResumes)
      .where(and(eq(builtResumes.id, id), eq(builtResumes.userId, userId)));
  }

  async saveJob(userId: string, jobId: number, notes?: string): Promise<SavedJob> {
    const existing = await db.select().from(savedJobs)
      .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(savedJobs)
      .values({ userId, jobId, notes: notes || null, reminderShown: false })
      .returning();
    return created;
  }

  async unsaveJob(userId: string, jobId: number): Promise<void> {
    await db.delete(savedJobs)
      .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
  }

  async getUserSavedJobs(userId: string): Promise<(SavedJob & { job: Job })[]> {
    const rows = await db.select()
      .from(savedJobs)
      .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
      .where(eq(savedJobs.userId, userId))
      .orderBy(desc(savedJobs.savedAt));
    return rows.map(r => ({ ...r.saved_jobs, job: r.jobs }));
  }

  async isJobSaved(userId: string, jobId: number): Promise<boolean> {
    const rows = await db.select({ id: savedJobs.id }).from(savedJobs)
      .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
    return rows.length > 0;
  }

  async getUserSavedJobIds(userId: string): Promise<number[]> {
    const rows = await db.select({ jobId: savedJobs.jobId }).from(savedJobs)
      .where(eq(savedJobs.userId, userId));
    return rows.map(r => r.jobId);
  }

  async getExpiringSavedJobs(userId: string, daysThreshold: number): Promise<(SavedJob & { job: Job })[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
    const rows = await db.select()
      .from(savedJobs)
      .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
      .where(and(
        eq(savedJobs.userId, userId),
        eq(savedJobs.reminderShown, false),
        lt(jobs.postedDate, cutoffDate),
        eq(jobs.isActive, true),
      ))
      .orderBy(jobs.postedDate);
    return rows.map(r => ({ ...r.saved_jobs, job: r.jobs }));
  }

  async markReminderShown(savedJobId: number, userId: string): Promise<void> {
    await db.update(savedJobs)
      .set({ reminderShown: true })
      .where(and(eq(savedJobs.id, savedJobId), eq(savedJobs.userId, userId)));
  }

  async getAnalyticsKpis(): Promise<{
    totalUsers: number;
    activeUsersLast7d: number;
    activeUsersLast30d: number;
    proUsers: number;
    freeUsers: number;
    conversionRate: number;
    totalJobs: number;
    activeJobs: number;
    totalResumes: number;
    totalSavedJobs: number;
    totalPageViews: number;
    totalSearches: number;
    totalJobViews: number;
    totalApplyClicks: number;
  }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [userStats] = await db.select({
      totalUsers: count(),
      proUsers: sql<number>`count(case when ${users.subscriptionTier} = 'pro' and ${users.subscriptionStatus} = 'active' then 1 end)`,
    }).from(users);

    const [activeUsers7d] = await db.select({
      cnt: sql<number>`count(distinct ${userActivities.userId})`,
    }).from(userActivities).where(gte(userActivities.createdAt, sevenDaysAgo));

    const [activeUsers30d] = await db.select({
      cnt: sql<number>`count(distinct ${userActivities.userId})`,
    }).from(userActivities).where(gte(userActivities.createdAt, thirtyDaysAgo));

    const [jobStats] = await db.select({
      totalJobs: count(),
      activeJobs: sql<number>`count(case when ${jobs.isActive} = true then 1 end)`,
    }).from(jobs);

    const [resumeCount] = await db.select({ cnt: count() }).from(resumes);
    const [savedCount] = await db.select({ cnt: count() }).from(savedJobs);

    const eventCounts = await db.select({
      eventType: userActivities.eventType,
      cnt: count(),
    }).from(userActivities).groupBy(userActivities.eventType);

    const eventMap: Record<string, number> = {};
    for (const e of eventCounts) {
      eventMap[e.eventType] = Number(e.cnt);
    }

    const totalUsers = Number(userStats.totalUsers);
    const proUsers = Number(userStats.proUsers);

    return {
      totalUsers,
      activeUsersLast7d: Number(activeUsers7d.cnt),
      activeUsersLast30d: Number(activeUsers30d.cnt),
      proUsers,
      freeUsers: totalUsers - proUsers,
      conversionRate: totalUsers > 0 ? Math.round((proUsers / totalUsers) * 10000) / 100 : 0,
      totalJobs: Number(jobStats.totalJobs),
      activeJobs: Number(jobStats.activeJobs),
      totalResumes: Number(resumeCount.cnt),
      totalSavedJobs: Number(savedCount.cnt),
      totalPageViews: eventMap["page_view"] || 0,
      totalSearches: eventMap["search"] || 0,
      totalJobViews: eventMap["job_view"] || 0,
      totalApplyClicks: eventMap["apply_click"] || 0,
    };
  }

  async getAnalyticsEngagement(days: number = 30): Promise<{
    dailyActiveUsers: { date: string; count: number }[];
    pageViewsByPage: { page: string; views: number; uniqueUsers: number }[];
    eventBreakdown: { eventType: string; count: number; uniqueUsers: number }[];
    activityTimeline: { date: string; pageViews: number; jobViews: number; searches: number; applyClicks: number }[];
  }> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const dailyActive = await db.select({
      date: sql<string>`date_trunc('day', ${userActivities.createdAt})::date::text`,
      count: sql<number>`count(distinct ${userActivities.userId})`,
    }).from(userActivities)
      .where(gte(userActivities.createdAt, cutoff))
      .groupBy(sql`date_trunc('day', ${userActivities.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${userActivities.createdAt})::date`);

    const pageViews = await db.select({
      page: userActivities.pagePath,
      views: count(),
      uniqueUsers: sql<number>`count(distinct ${userActivities.userId})`,
    }).from(userActivities)
      .where(and(
        eq(userActivities.eventType, "page_view"),
        gte(userActivities.createdAt, cutoff),
      ))
      .groupBy(userActivities.pagePath)
      .orderBy(desc(count()));

    const eventBreakdown = await db.select({
      eventType: userActivities.eventType,
      count: count(),
      uniqueUsers: sql<number>`count(distinct ${userActivities.userId})`,
    }).from(userActivities)
      .where(gte(userActivities.createdAt, cutoff))
      .groupBy(userActivities.eventType)
      .orderBy(desc(count()));

    const timeline = await db.select({
      date: sql<string>`date_trunc('day', ${userActivities.createdAt})::date::text`,
      pageViews: sql<number>`count(case when ${userActivities.eventType} = 'page_view' then 1 end)`,
      jobViews: sql<number>`count(case when ${userActivities.eventType} = 'job_view' then 1 end)`,
      searches: sql<number>`count(case when ${userActivities.eventType} = 'search' then 1 end)`,
      applyClicks: sql<number>`count(case when ${userActivities.eventType} = 'apply_click' then 1 end)`,
    }).from(userActivities)
      .where(gte(userActivities.createdAt, cutoff))
      .groupBy(sql`date_trunc('day', ${userActivities.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${userActivities.createdAt})::date`);

    return {
      dailyActiveUsers: dailyActive.map(d => ({ date: d.date, count: Number(d.count) })),
      pageViewsByPage: pageViews.map(p => ({ page: p.page || "unknown", views: Number(p.views), uniqueUsers: Number(p.uniqueUsers) })),
      eventBreakdown: eventBreakdown.map(e => ({ eventType: e.eventType, count: Number(e.count), uniqueUsers: Number(e.uniqueUsers) })),
      activityTimeline: timeline.map(t => ({
        date: t.date,
        pageViews: Number(t.pageViews),
        jobViews: Number(t.jobViews),
        searches: Number(t.searches),
        applyClicks: Number(t.applyClicks),
      })),
    };
  }

  async getAnalyticsFeatureAdoption(): Promise<{
    resumeUploads: number;
    builtResumes: number;
    savedJobsUsers: number;
    totalSavedJobs: number;
    alertsCreated: number;
    alertsActiveUsers: number;
    careerAdvisorViews: number;
    insightsViews: number;
    resumeBuilderViews: number;
  }> {
    const [resumeCount] = await db.select({ cnt: count() }).from(resumes);
    const [builtResumeCount] = await db.select({ cnt: count() }).from(builtResumes);
    
    const [savedJobsStats] = await db.select({
      uniqueUsers: sql<number>`count(distinct ${savedJobs.userId})`,
      totalSaved: count(),
    }).from(savedJobs);

    const [alertsStats] = await db.select({
      total: count(),
      uniqueUsers: sql<number>`count(distinct ${jobAlerts.userId})`,
    }).from(jobAlerts);

    const featurePageViews = await db.select({
      page: userActivities.pagePath,
      views: count(),
    }).from(userActivities)
      .where(and(
        eq(userActivities.eventType, "page_view"),
        sql`${userActivities.pagePath} in ('/career-advisor', '/insights', '/resume-builder')`,
      ))
      .groupBy(userActivities.pagePath);

    const pageViewMap: Record<string, number> = {};
    for (const p of featurePageViews) {
      if (p.page) pageViewMap[p.page] = Number(p.views);
    }

    return {
      resumeUploads: Number(resumeCount.cnt),
      builtResumes: Number(builtResumeCount.cnt),
      savedJobsUsers: Number(savedJobsStats.uniqueUsers),
      totalSavedJobs: Number(savedJobsStats.totalSaved),
      alertsCreated: Number(alertsStats.total),
      alertsActiveUsers: Number(alertsStats.uniqueUsers),
      careerAdvisorViews: pageViewMap["/career-advisor"] || 0,
      insightsViews: pageViewMap["/insights"] || 0,
      resumeBuilderViews: pageViewMap["/resume-builder"] || 0,
    };
  }

  async getAnalyticsUserCohorts(): Promise<{
    signupsByDay: { date: string; count: number }[];
    subscriptionBreakdown: { tier: string; status: string; count: number }[];
    authMethodBreakdown: { method: string; count: number }[];
    usersWithResume: number;
    usersWithSearch: number;
  }> {
    const signups = await db.select({
      date: sql<string>`date_trunc('day', ${users.createdAt})::date::text`,
      count: count(),
    }).from(users)
      .groupBy(sql`date_trunc('day', ${users.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${users.createdAt})::date`);

    const subscriptions = await db.select({
      tier: users.subscriptionTier,
      status: users.subscriptionStatus,
      count: count(),
    }).from(users)
      .groupBy(users.subscriptionTier, users.subscriptionStatus);

    const [authMethods] = await db.select({
      googleUsers: sql<number>`count(case when ${users.googleId} is not null then 1 end)`,
      emailUsers: sql<number>`count(case when ${users.password} is not null and ${users.googleId} is null then 1 end)`,
      bothUsers: sql<number>`count(case when ${users.password} is not null and ${users.googleId} is not null then 1 end)`,
    }).from(users);

    const [resumeStats] = await db.select({
      withResume: sql<number>`count(case when ${users.resumeText} is not null then 1 end)`,
      withSearch: sql<number>`count(case when ${users.lastSearchQuery} is not null then 1 end)`,
    }).from(users);

    return {
      signupsByDay: signups.map(s => ({ date: s.date, count: Number(s.count) })),
      subscriptionBreakdown: subscriptions.map(s => ({
        tier: s.tier || "free",
        status: s.status || "inactive",
        count: Number(s.count),
      })),
      authMethodBreakdown: [
        { method: "Google Only", count: Number(authMethods.googleUsers) },
        { method: "Email Only", count: Number(authMethods.emailUsers) },
        { method: "Both", count: Number(authMethods.bothUsers) },
      ],
      usersWithResume: Number(resumeStats.withResume),
      usersWithSearch: Number(resumeStats.withSearch),
    };
  }

  async getAnalyticsTopContent(): Promise<{
    topSearchTerms: { term: string; count: number }[];
    topViewedJobs: { id: number; title: string; company: string; viewCount: number; applyClicks: number }[];
    topAppliedJobs: { id: number; title: string; company: string; applyClicks: number; viewCount: number }[];
    topCategories: { category: string; count: number }[];
    topCompanies: { company: string; jobCount: number; totalViews: number }[];
  }> {
    const searchActivities = await db.select({
      metadata: userActivities.metadata,
    }).from(userActivities)
      .where(eq(userActivities.eventType, "search"))
      .orderBy(desc(userActivities.createdAt))
      .limit(500);

    const termCounter: Record<string, number> = {};
    for (const a of searchActivities) {
      const meta = a.metadata as any;
      const query = meta?.query || meta?.searchQuery;
      if (query && typeof query === "string") {
        const term = query.toLowerCase().trim();
        termCounter[term] = (termCounter[term] || 0) + 1;
      }
    }
    const topSearchTerms = Object.entries(termCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([term, count]) => ({ term, count }));

    const topViewed = await db.select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      viewCount: jobs.viewCount,
      applyClicks: jobs.applyClickCount,
    }).from(jobs)
      .where(eq(jobs.isActive, true))
      .orderBy(desc(jobs.viewCount))
      .limit(20);

    const topApplied = await db.select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      applyClicks: jobs.applyClickCount,
      viewCount: jobs.viewCount,
    }).from(jobs)
      .where(and(eq(jobs.isActive, true), sql`${jobs.applyClickCount} > 0`))
      .orderBy(desc(jobs.applyClickCount))
      .limit(20);

    const categories = await db.select({
      category: jobs.roleCategory,
      count: count(),
    }).from(jobs)
      .where(and(eq(jobs.isActive, true), sql`${jobs.roleCategory} is not null`))
      .groupBy(jobs.roleCategory)
      .orderBy(desc(count()));

    const companies = await db.select({
      company: jobs.company,
      jobCount: count(),
      totalViews: sql<number>`coalesce(sum(${jobs.viewCount}), 0)`,
    }).from(jobs)
      .where(eq(jobs.isActive, true))
      .groupBy(jobs.company)
      .orderBy(desc(count()))
      .limit(20);

    return {
      topSearchTerms,
      topViewedJobs: topViewed.map(j => ({
        id: j.id,
        title: j.title,
        company: j.company,
        viewCount: Number(j.viewCount) || 0,
        applyClicks: Number(j.applyClicks) || 0,
      })),
      topAppliedJobs: topApplied.map(j => ({
        id: j.id,
        title: j.title,
        company: j.company,
        applyClicks: Number(j.applyClicks) || 0,
        viewCount: Number(j.viewCount) || 0,
      })),
      topCategories: categories.map(c => ({ category: c.category || "Uncategorized", count: Number(c.count) })),
      topCompanies: companies.map(c => ({
        company: c.company,
        jobCount: Number(c.jobCount),
        totalViews: Number(c.totalViews),
      })),
    };
  }

  async getAnalyticsUserList(): Promise<{
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    subscriptionTier: string | null;
    subscriptionStatus: string | null;
    isAdmin: boolean;
    createdAt: Date | null;
    lastActiveAt: string | null;
    totalJobViews: number;
    totalSearches: number;
    totalApplyClicks: number;
    totalPageViews: number;
    savedJobsCount: number;
    resumeCount: number;
  }[]> {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      subscriptionTier: users.subscriptionTier,
      subscriptionStatus: users.subscriptionStatus,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));

    const userActivityStats = await db.select({
      userId: userActivities.userId,
      eventType: userActivities.eventType,
      cnt: count(),
      lastActive: sql<string>`max(${userActivities.createdAt})::text`,
    }).from(userActivities)
      .groupBy(userActivities.userId, userActivities.eventType);

    const savedJobsCounts = await db.select({
      userId: savedJobs.userId,
      cnt: count(),
    }).from(savedJobs).groupBy(savedJobs.userId);

    const resumeCounts = await db.select({
      userId: resumes.userId,
      cnt: count(),
    }).from(resumes).groupBy(resumes.userId);

    const activityMap: Record<string, { jobViews: number; searches: number; applyClicks: number; pageViews: number; lastActive: string | null }> = {};
    for (const s of userActivityStats) {
      if (!activityMap[s.userId]) {
        activityMap[s.userId] = { jobViews: 0, searches: 0, applyClicks: 0, pageViews: 0, lastActive: null };
      }
      const entry = activityMap[s.userId];
      if (s.eventType === "job_view") entry.jobViews = Number(s.cnt);
      if (s.eventType === "search") entry.searches = Number(s.cnt);
      if (s.eventType === "apply_click") entry.applyClicks = Number(s.cnt);
      if (s.eventType === "page_view") entry.pageViews = Number(s.cnt);
      if (s.lastActive && (!entry.lastActive || s.lastActive > entry.lastActive)) {
        entry.lastActive = s.lastActive;
      }
    }

    const savedMap: Record<string, number> = {};
    for (const s of savedJobsCounts) savedMap[s.userId] = Number(s.cnt);
    const resumeMap: Record<string, number> = {};
    for (const r of resumeCounts) resumeMap[r.userId] = Number(r.cnt);

    return allUsers.map(u => {
      const activity = activityMap[u.id] || { jobViews: 0, searches: 0, applyClicks: 0, pageViews: 0, lastActive: null };
      return {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        subscriptionTier: u.subscriptionTier,
        subscriptionStatus: u.subscriptionStatus,
        isAdmin: u.isAdmin ?? false,
        createdAt: u.createdAt,
        lastActiveAt: activity.lastActive,
        totalJobViews: activity.jobViews,
        totalSearches: activity.searches,
        totalApplyClicks: activity.applyClicks,
        totalPageViews: activity.pageViews,
        savedJobsCount: savedMap[u.id] || 0,
        resumeCount: resumeMap[u.id] || 0,
      };
    });
  }

  async getAnalyticsFunnel(): Promise<{
    totalUsers: number;
    usersWhoSearched: number;
    usersWhoViewedJob: number;
    usersWhoApplied: number;
    usersWhoSavedJob: number;
    usersWhoUploadedResume: number;
    usersWhoBuiltResume: number;
    usersWhoPurchasedPro: number;
  }> {
    const [totals] = await db.select({ cnt: count() }).from(users);

    const funnelSteps = await db.select({
      eventType: userActivities.eventType,
      uniqueUsers: sql<number>`count(distinct ${userActivities.userId})`,
    }).from(userActivities)
      .where(sql`${userActivities.eventType} in ('search', 'job_view', 'apply_click')`)
      .groupBy(userActivities.eventType);

    const funnelMap: Record<string, number> = {};
    for (const f of funnelSteps) funnelMap[f.eventType] = Number(f.uniqueUsers);

    const [savedUsers] = await db.select({
      cnt: sql<number>`count(distinct ${savedJobs.userId})`,
    }).from(savedJobs);

    const [resumeUsers] = await db.select({
      cnt: sql<number>`count(distinct ${resumes.userId})`,
    }).from(resumes);

    const [builtResumeUsers] = await db.select({
      cnt: sql<number>`count(distinct ${builtResumes.userId})`,
    }).from(builtResumes);

    const [proUsers] = await db.select({
      cnt: sql<number>`count(*)`,
    }).from(users).where(and(
      eq(users.subscriptionTier, "pro"),
      eq(users.subscriptionStatus, "active"),
    ));

    return {
      totalUsers: Number(totals.cnt),
      usersWhoSearched: funnelMap["search"] || 0,
      usersWhoViewedJob: funnelMap["job_view"] || 0,
      usersWhoApplied: funnelMap["apply_click"] || 0,
      usersWhoSavedJob: Number(savedUsers.cnt),
      usersWhoUploadedResume: Number(resumeUsers.cnt),
      usersWhoBuiltResume: Number(builtResumeUsers.cnt),
      usersWhoPurchasedPro: Number(proUsers.cnt),
    };
  }

  async getUserDashboard(userId: string, days: number = 30): Promise<any> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const activityCounts = await db.select({
      eventType: userActivities.eventType,
      cnt: sql<number>`count(*)`,
    }).from(userActivities)
      .where(and(eq(userActivities.userId, userId), gte(userActivities.createdAt, cutoff)))
      .groupBy(userActivities.eventType);

    const activityMap: Record<string, number> = {};
    for (const a of activityCounts) activityMap[a.eventType] = Number(a.cnt);

    const dailyActivity = await db.select({
      date: sql<string>`date_trunc('day', ${userActivities.createdAt})::date::text`,
      cnt: sql<number>`count(*)`,
      types: sql<string>`string_agg(distinct ${userActivities.eventType}, ',')`,
    }).from(userActivities)
      .where(and(eq(userActivities.userId, userId), gte(userActivities.createdAt, cutoff)))
      .groupBy(sql`date_trunc('day', ${userActivities.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${userActivities.createdAt})::date`);

    const allTimeCounts = await db.select({
      eventType: userActivities.eventType,
      cnt: sql<number>`count(*)`,
    }).from(userActivities)
      .where(eq(userActivities.userId, userId))
      .groupBy(userActivities.eventType);

    const allTimeMap: Record<string, number> = {};
    for (const a of allTimeCounts) allTimeMap[a.eventType] = Number(a.cnt);

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeDaysArr = dailyActivity.map(d => d.date);
    const activeDays = new Set(activeDaysArr);
    for (let i = 0; i < days; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      if (activeDays.has(dateStr)) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    const topViewedCategories = await db.select({
      category: sql<string>`${userActivities.metadata}->>'roleCategory'`,
      cnt: sql<number>`count(*)`,
    }).from(userActivities)
      .where(and(
        eq(userActivities.userId, userId),
        eq(userActivities.eventType, 'job_view'),
        sql`${userActivities.metadata}->>'roleCategory' is not null`,
      ))
      .groupBy(sql`${userActivities.metadata}->>'roleCategory'`)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    const recentSearches = await db.select({
      query: sql<string>`${userActivities.metadata}->>'query'`,
      createdAt: userActivities.createdAt,
    }).from(userActivities)
      .where(and(
        eq(userActivities.userId, userId),
        eq(userActivities.eventType, 'search'),
        sql`${userActivities.metadata}->>'query' is not null`,
      ))
      .orderBy(desc(userActivities.createdAt))
      .limit(10);

    const uniqueSearchTerms = Array.from(new Set(recentSearches.map(s => s.query))).slice(0, 5);

    const topViewedCompanies = await db.select({
      company: sql<string>`${userActivities.metadata}->>'company'`,
      cnt: sql<number>`count(*)`,
    }).from(userActivities)
      .where(and(
        eq(userActivities.userId, userId),
        eq(userActivities.eventType, 'job_view'),
        sql`${userActivities.metadata}->>'company' is not null`,
      ))
      .groupBy(sql`${userActivities.metadata}->>'company'`)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    const userSavedJobsList = await db.select({ cnt: count() }).from(savedJobs).where(eq(savedJobs.userId, userId));
    const savedJobsCount = Number(userSavedJobsList[0]?.cnt || 0);

    const expiringSoonCount = await db.select({ cnt: count() }).from(savedJobs)
      .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
      .where(and(
        eq(savedJobs.userId, userId),
        lt(savedJobs.savedAt, new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
        eq(savedJobs.reminderShown, false),
      ));

    const userResumesList = await db.select({ cnt: count() }).from(resumes).where(eq(resumes.userId, userId));
    const resumeCount = Number(userResumesList[0]?.cnt || 0);

    const builtResumesList = await db.select({ cnt: count() }).from(builtResumes).where(eq(builtResumes.userId, userId));
    const builtResumeCount = Number(builtResumesList[0]?.cnt || 0);

    const alertsList = await db.select({ cnt: count() }).from(jobAlerts)
      .where(and(eq(jobAlerts.userId, userId), eq(jobAlerts.isActive, true)));
    const activeAlertsCount = Number(alertsList[0]?.cnt || 0);

    const persona = await db.select().from(userPersonas).where(eq(userPersonas.userId, userId)).limit(1);
    const userPersona = persona[0] || null;

    const topCats = topViewedCategories.map(c => c.category).filter(Boolean);
    let marketAlignment: { category: string; availableJobs: number }[] = [];
    if (topCats.length > 0) {
      const rawAlignment = await db.select({
        category: jobs.roleCategory,
        availableJobs: sql<number>`count(*)`,
      }).from(jobs)
        .where(and(
          eq(jobs.isActive, true),
          inArray(jobs.roleCategory, topCats),
        ))
        .groupBy(jobs.roleCategory);
      marketAlignment = rawAlignment.filter(m => m.category !== null) as { category: string; availableJobs: number }[];
    }

    const [totalActiveJobs] = await db.select({ cnt: count() }).from(jobs).where(eq(jobs.isActive, true));

    const recommendations: { type: string; title: string; description: string; action: string; priority: number }[] = [];

    if (resumeCount === 0 && builtResumeCount === 0) {
      recommendations.push({
        type: "resume",
        title: "Upload your resume",
        description: "Get personalized job matches and see how your skills align with opportunities.",
        action: "/resumes",
        priority: 1,
      });
    }

    if (activeAlertsCount === 0) {
      recommendations.push({
        type: "alerts",
        title: "Set up job alerts",
        description: "Get notified when new jobs match your interests so you never miss an opportunity.",
        action: "/alerts",
        priority: 2,
      });
    }

    if ((allTimeMap["apply_click"] || 0) === 0 && (allTimeMap["job_view"] || 0) > 3) {
      recommendations.push({
        type: "apply",
        title: "Start applying",
        description: "You've been exploring jobs. Take the next step and apply to roles that interest you.",
        action: "/jobs",
        priority: 3,
      });
    }

    if (savedJobsCount === 0 && (allTimeMap["job_view"] || 0) > 0) {
      recommendations.push({
        type: "save",
        title: "Save jobs you like",
        description: "Bookmark interesting opportunities to compare them later and track deadlines.",
        action: "/jobs",
        priority: 4,
      });
    }

    if ((activityMap["search"] || 0) === 0 && (activityMap["job_view"] || 0) < 3) {
      recommendations.push({
        type: "explore",
        title: "Explore opportunities",
        description: "Search for legal tech roles that match your background and interests.",
        action: "/jobs",
        priority: 5,
      });
    }

    if (currentStreak >= 3) {
      recommendations.push({
        type: "streak",
        title: `${currentStreak}-day streak!`,
        description: "You're on a roll. Keep the momentum going with your job search.",
        action: "/jobs",
        priority: 10,
      });
    }

    recommendations.sort((a, b) => a.priority - b.priority);

    return {
      activityMetrics: {
        period: {
          jobViews: activityMap["job_view"] || 0,
          searches: activityMap["search"] || 0,
          applyClicks: activityMap["apply_click"] || 0,
          pageViews: activityMap["page_view"] || 0,
          filterChanges: activityMap["filter_change"] || 0,
        },
        allTime: {
          jobViews: allTimeMap["job_view"] || 0,
          searches: allTimeMap["search"] || 0,
          applyClicks: allTimeMap["apply_click"] || 0,
        },
        currentStreak,
        activeDaysInPeriod: activeDays.size,
      },
      dailyActivity: dailyActivity.map(d => ({
        date: d.date,
        count: Number(d.cnt),
        types: d.types,
      })),
      patterns: {
        topCategories: topViewedCategories.filter(c => c.category).map(c => ({ name: c.category, count: Number(c.cnt) })),
        topCompanies: topViewedCompanies.filter(c => c.company).map(c => ({ name: c.company, count: Number(c.cnt) })),
        recentSearches: uniqueSearchTerms,
      },
      readiness: {
        hasResume: resumeCount > 0,
        resumeCount,
        hasBuiltResume: builtResumeCount > 0,
        builtResumeCount,
        hasActiveAlerts: activeAlertsCount > 0,
        activeAlertsCount,
        hasPersona: !!userPersona,
        savedJobsCount,
        expiringSoonCount: Number(expiringSoonCount[0]?.cnt || 0),
        score: Math.min(100, (
          (resumeCount > 0 ? 25 : 0) +
          (activeAlertsCount > 0 ? 20 : 0) +
          (savedJobsCount > 0 ? 15 : 0) +
          ((allTimeMap["search"] || 0) > 0 ? 15 : 0) +
          ((allTimeMap["apply_click"] || 0) > 0 ? 25 : 0)
        )),
      },
      marketAlignment: marketAlignment.map(m => ({
        category: m.category,
        availableJobs: Number(m.availableJobs),
      })),
      totalActiveJobs: Number(totalActiveJobs.cnt),
      persona: userPersona ? {
        topCategories: userPersona.topCategories,
        topSkills: userPersona.topSkills,
        careerStage: userPersona.careerStage,
        engagementLevel: userPersona.engagementLevel,
        summary: userPersona.personaSummary,
      } : null,
      recommendations: recommendations.slice(0, 4),
    };
  }

  async createJobApplication(app: InsertJobApplication): Promise<JobApplication> {
    const [result] = await db.insert(jobApplications).values(app).returning();
    return result;
  }

  async getUserApplications(userId: string): Promise<JobApplicationWithJob[]> {
    const results = await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.userId, userId))
      .orderBy(desc(jobApplications.updatedAt));

    const jobIds = results.map(r => r.jobId);
    if (jobIds.length === 0) return [];

    const jobsList = await db.select().from(jobs).where(inArray(jobs.id, jobIds));
    const jobMap = new Map(jobsList.map(j => [j.id, j]));

    return results
      .filter(r => jobMap.has(r.jobId))
      .map(r => ({ ...r, job: jobMap.get(r.jobId)! }));
  }

  async updateJobApplication(id: number, userId: string, data: Partial<InsertJobApplication>): Promise<JobApplication | undefined> {
    const [result] = await db
      .update(jobApplications)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(jobApplications.id, id), eq(jobApplications.userId, userId)))
      .returning();
    return result;
  }

  async deleteJobApplication(id: number, userId: string): Promise<void> {
    await db.delete(jobApplications).where(
      and(eq(jobApplications.id, id), eq(jobApplications.userId, userId))
    );
  }

  async getApplicationByUserAndJob(userId: string, jobId: number): Promise<JobApplication | undefined> {
    const [result] = await db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.userId, userId), eq(jobApplications.jobId, jobId)));
    return result;
  }

  async getSimilarJobs(jobId: number, limit: number = 4): Promise<Job[]> {
    const job = await this.getJob(jobId);
    if (!job) return [];

    const jobSkills = job.keySkills || [];

    const trustGate = [
      sql`${jobs.id} != ${jobId}`,
      eq(jobs.isActive, true),
      eq(jobs.isPublished, true),
      eq(jobs.pipelineStatus, 'ready'),
      eq(jobs.jobStatus, 'open'),
    ];

    if (job.roleCategory) {
      const sameCategoryJobs = await db
        .select()
        .from(jobs)
        .where(and(
          ...trustGate,
          eq(jobs.roleCategory, job.roleCategory),
        ))
        .orderBy(desc(jobs.postedDate))
        .limit(limit * 3);

      if (sameCategoryJobs.length > 0 && jobSkills.length > 0) {
        const scored = sameCategoryJobs.map(sj => {
          const sjSkills = (sj.keySkills || []).map(s => s.toLowerCase());
          const overlap = jobSkills.filter(s => sjSkills.includes(s.toLowerCase())).length;
          const subcategoryMatch = sj.roleSubcategory === job.roleSubcategory ? 2 : 0;
          const seniorityMatch = sj.seniorityLevel === job.seniorityLevel ? 1 : 0;
          return { job: sj, score: overlap + subcategoryMatch + seniorityMatch };
        });
        scored.sort((a, b) => b.score - a.score);
        const results = scored.slice(0, limit).map(s => s.job);
        if (results.length >= limit) return results;

        const excludeIds = [jobId, ...results.map(r => r.id)];
        const fallback = await db
          .select()
          .from(jobs)
          .where(and(
            sql`${jobs.id} NOT IN (${sql.join(excludeIds.map(id => sql`${id}`), sql`, `)})`,
            ...trustGate,
          ))
          .orderBy(desc(jobs.postedDate))
          .limit(limit - results.length);
        return [...results, ...fallback];
      }

      if (sameCategoryJobs.length > 0) {
        return sameCategoryJobs.slice(0, limit);
      }
    }

    const fallback = await db
      .select()
      .from(jobs)
      .where(and(
        ...trustGate,
      ))
      .orderBy(desc(jobs.postedDate))
      .limit(limit);
    return fallback;
  }

  async getEvents(filters?: { eventType?: string; attendanceType?: string; isFree?: boolean; topic?: string; upcoming?: boolean }): Promise<Event[]> {
    const conditions: any[] = [
      eq(events.isActive, true),
      sql`(${events.linkStatus} IS NULL OR ${events.linkStatus} != 'broken')`,
    ];

    if (filters?.eventType) {
      conditions.push(eq(events.eventType, filters.eventType));
    }
    if (filters?.attendanceType) {
      conditions.push(eq(events.attendanceType, filters.attendanceType));
    }
    if (filters?.isFree !== undefined) {
      conditions.push(eq(events.isFree, filters.isFree));
    }
    if (filters?.upcoming) {
      conditions.push(gte(events.startDate, new Date()));
    }
    if (filters?.topic) {
      conditions.push(sql`${filters.topic} = ANY(${events.topics})`);
    }

    return db
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(events.startDate);
  }

  async getAllEventsAdmin(): Promise<Event[]> {
    return db
      .select()
      .from(events)
      .orderBy(desc(events.startDate));
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updated] = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return updated;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async updateEventLinkStatus(id: number, status: string): Promise<void> {
    await db.update(events).set({
      linkStatus: status,
      linkLastChecked: new Date(),
    } as any).where(eq(events.id, id));
  }

  async getEventsNeedingLinkCheck(maxAgeHours: number = 24): Promise<Event[]> {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    return db
      .select()
      .from(events)
      .where(
        and(
          eq(events.isActive, true),
          sql`(${events.linkLastChecked} IS NULL OR ${events.linkLastChecked} < ${cutoff})`
        )
      )
      .orderBy(events.linkLastChecked);
  }

  async upsertEventByExternalId(event: InsertEvent): Promise<{ event: Event; isNew: boolean }> {
    if (!event.externalId) {
      const created = await this.createEvent(event);
      return { event: created, isNew: true };
    }

    const [existing] = await db.select().from(events).where(eq(events.externalId, event.externalId));
    if (existing) {
      const [updated] = await db.update(events).set({
        title: event.title,
        organizer: event.organizer,
        organizerLogo: event.organizerLogo,
        eventType: event.eventType,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        attendanceType: event.attendanceType,
        virtualUrl: event.virtualUrl,
        description: event.description,
        registrationUrl: event.registrationUrl,
        cost: event.cost,
        isFree: event.isFree,
        topics: event.topics,
        speakers: event.speakers,
        cleCredits: event.cleCredits,
        isActive: true,
        isFeatured: event.isFeatured ?? existing.isFeatured,
        source: event.source,
      }).where(eq(events.externalId, event.externalId)).returning();
      return { event: updated, isNew: false };
    }

    const created = await this.createEvent(event);
    return { event: created, isNew: true };
  }

  async bulkUpsertEvents(eventsList: InsertEvent[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;
    for (const event of eventsList) {
      const result = await this.upsertEventByExternalId(event);
      if (result.isNew) inserted++;
      else updated++;
    }
    return { inserted, updated };
  }

  async getFeaturedEvents(limit: number = 6): Promise<Event[]> {
    return db
      .select()
      .from(events)
      .where(and(
        eq(events.isActive, true),
        gte(events.startDate, new Date()),
      ))
      .orderBy(events.isFeatured, events.startDate)
      .limit(limit);
  }

  async trackEventView(eventId: number): Promise<void> {
    await db
      .update(events)
      .set({ viewCount: sql`${events.viewCount} + 1` })
      .where(eq(events.id, eventId));
  }

  async trackRegistrationClick(eventId: number): Promise<void> {
    await db
      .update(events)
      .set({ registrationClickCount: sql`${events.registrationClickCount} + 1` })
      .where(eq(events.id, eventId));
  }

  async seedEvents(): Promise<void> {
    const existingEvents = await db.select({ id: events.id }).from(events).limit(1);
    if (existingEvents.length > 0) {
      console.log("Events already seeded, skipping...");
      return;
    }

    const now = new Date();
    const seedData: InsertEvent[] = [
      {
        title: "ILTACON 2026 - International Legal Technology Association Conference",
        organizer: "ILTA",
        eventType: "conference",
        startDate: new Date(now.getFullYear(), 7, 10),
        endDate: new Date(now.getFullYear(), 7, 13),
        location: "Nashville, TN",
        attendanceType: "hybrid",
        description: "The premier peer-to-peer educational conference for legal technology professionals. ILTACON brings together thousands of legal professionals, technologists, and solution providers for four days of networking, learning, and innovation in legal technology.",
        registrationUrl: "https://www.iltacon.org",
        cost: "$1,895 - $2,495",
        isFree: false,
        topics: ["Legal Technology", "AI in Law", "Knowledge Management", "Cybersecurity", "Cloud Computing"],
        speakers: [{ name: "Various Industry Leaders", title: "Multiple Sessions", organization: "ILTA" }],
        cleCredits: "Up to 15 CLE credits",
        isFeatured: true,
        isActive: true,
      },
      {
        title: "Legalweek 2026",
        organizer: "ALM",
        eventType: "conference",
        startDate: new Date(now.getFullYear(), 2, 9),
        endDate: new Date(now.getFullYear(), 2, 12),
        location: "New York, NY",
        attendanceType: "in-person",
        description: "Legalweek is the largest and most important legal technology event, connecting the legal ecosystem through thought leadership, networking, and business development. Featuring LegalTech, The CIO Forum, and LawFirm Leaders.",
        registrationUrl: "https://www.legalweek.com",
        cost: "$2,099 - $3,299",
        isFree: false,
        topics: ["eDiscovery", "Legal Operations", "AI & Machine Learning", "Contract Management", "Practice Management"],
        speakers: [{ name: "Industry Executives", title: "Keynotes & Panels", organization: "Various" }],
        cleCredits: "CLE credits available",
        isFeatured: true,
        isActive: true,
      },
      {
        title: "CLOC Global Institute 2026",
        organizer: "CLOC",
        eventType: "conference",
        startDate: new Date(now.getFullYear(), 4, 5),
        endDate: new Date(now.getFullYear(), 4, 8),
        location: "Las Vegas, NV",
        attendanceType: "in-person",
        description: "The Corporate Legal Operations Consortium's annual event bringing together legal operations professionals to share best practices, drive innovation, and build community. Focuses on operational excellence, technology adoption, and strategic leadership.",
        registrationUrl: "https://cloc.org/institutes",
        cost: "$1,500 - $2,200",
        isFree: false,
        topics: ["Legal Operations", "Technology Strategy", "Vendor Management", "Change Management", "Data Analytics"],
        speakers: [{ name: "Legal Operations Leaders", title: "Industry Experts", organization: "CLOC" }],
        cleCredits: "Select sessions eligible",
        isFeatured: true,
        isActive: true,
      },
      {
        title: "AI & the Future of Legal Practice - ABA Webinar Series",
        organizer: "American Bar Association",
        eventType: "webinar",
        startDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
        location: "Online",
        attendanceType: "virtual",
        description: "A monthly webinar series exploring how artificial intelligence is transforming legal practice. Each session features practicing attorneys and technologists discussing real-world applications, ethical considerations, and practical implementation strategies.",
        registrationUrl: "https://www.americanbar.org/groups/departments_offices/legal_technology_resources/",
        cost: "Free for ABA members",
        isFree: false,
        topics: ["AI Ethics", "Legal AI Tools", "Practice Automation", "Regulatory Compliance"],
        speakers: [{ name: "ABA Tech Panel", title: "Monthly Rotating Speakers", organization: "ABA" }],
        cleCredits: "1.5 CLE credits per session",
        isFeatured: false,
        isActive: true,
      },
      {
        title: "Stanford CodeX FutureLaw Conference",
        organizer: "Stanford CodeX Center",
        eventType: "conference",
        startDate: new Date(now.getFullYear(), 3, 22),
        endDate: new Date(now.getFullYear(), 3, 23),
        location: "Stanford, CA",
        attendanceType: "hybrid",
        description: "FutureLaw brings together the brightest minds in computational law, legal technology, and innovation. Hosted by Stanford's CodeX center, this conference showcases cutting-edge research and startups reshaping the legal industry.",
        registrationUrl: "https://law.stanford.edu/codex-the-stanford-center-for-legal-informatics/",
        cost: "$500 - $750",
        isFree: false,
        topics: ["Computational Law", "Legal Startups", "Access to Justice", "Blockchain & Law", "Legal AI Research"],
        speakers: [{ name: "Roland Vogl", title: "Executive Director", organization: "Stanford CodeX" }],
        cleCredits: "CLE credits pending approval",
        isFeatured: true,
        isActive: true,
      },
      {
        title: "Legal Hackers Global Summit",
        organizer: "Legal Hackers",
        eventType: "hackathon",
        startDate: new Date(now.getFullYear(), 5, 14),
        endDate: new Date(now.getFullYear(), 5, 16),
        location: "Washington, DC",
        attendanceType: "hybrid",
        description: "A gathering of lawyers, technologists, and creative thinkers solving legal challenges through technology and design. Includes workshops, hackathon competitions, and networking with the global Legal Hackers community.",
        registrationUrl: "https://legalhackers.org",
        cost: "$150 - $300",
        isFree: false,
        topics: ["Access to Justice", "Legal Design", "Open Source Law", "Civic Tech", "Legal Innovation"],
        speakers: [{ name: "Phil Weiss", title: "Co-Founder", organization: "Legal Hackers" }],
        cleCredits: "Select sessions eligible",
        isFeatured: false,
        isActive: true,
      },
      {
        title: "Practical Guide to Contract Lifecycle Management",
        organizer: "Practising Law Institute",
        eventType: "cle",
        startDate: new Date(now.getFullYear(), now.getMonth() + 2, 8),
        endDate: new Date(now.getFullYear(), now.getMonth() + 2, 8),
        location: "Online",
        attendanceType: "virtual",
        description: "An intensive CLE program covering the full contract lifecycle, from drafting and negotiation through AI-assisted review and analytics. Learn to leverage CLM platforms, set up automated workflows, and measure contract performance.",
        registrationUrl: "https://www.pli.edu",
        cost: "$350",
        isFree: false,
        topics: ["Contract Management", "Legal Automation", "CLM Platforms", "Contract Analytics"],
        speakers: [{ name: "PLI Faculty", title: "CLM Experts", organization: "PLI" }],
        cleCredits: "6.5 CLE credits (NY, CA approved)",
        isFeatured: false,
        isActive: true,
      },
      {
        title: "Legal Innovation & Tech Fest",
        organizer: "Liquid Legal Institute",
        eventType: "conference",
        startDate: new Date(now.getFullYear(), 8, 18),
        endDate: new Date(now.getFullYear(), 8, 19),
        location: "Frankfurt, Germany",
        attendanceType: "hybrid",
        description: "Europe's leading legal technology festival, bringing together corporate legal departments, law firms, and legal tech startups. Features hands-on workshops, demo sessions, and strategic panels on digital transformation in legal.",
        registrationUrl: "https://www.liquid-legal-institute.com",
        cost: "EUR 800 - EUR 1,200",
        isFree: false,
        topics: ["Digital Transformation", "Legal Tech Startups", "Corporate Legal", "EU Regulation", "Legal Design"],
        speakers: [{ name: "European Legal Tech Leaders", title: "Various", organization: "LLI" }],
        cleCredits: null,
        isFeatured: true,
        isActive: true,
      },
      {
        title: "Introduction to Legal Prompt Engineering",
        organizer: "Georgetown Law CLE",
        eventType: "workshop",
        startDate: new Date(now.getFullYear(), now.getMonth() + 1, 22),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 22),
        location: "Online",
        attendanceType: "virtual",
        description: "A hands-on workshop teaching lawyers how to effectively use generative AI tools in legal practice. Covers prompt engineering techniques, ethical guardrails, output verification, and integrating AI into existing workflows.",
        registrationUrl: "https://www.law.georgetown.edu/continuing-legal-education/",
        cost: "$175",
        isFree: false,
        topics: ["Prompt Engineering", "Generative AI", "Legal Ethics", "AI Tools for Lawyers"],
        speakers: [{ name: "Georgetown Faculty", title: "AI & Law Experts", organization: "Georgetown Law" }],
        cleCredits: "3 CLE credits",
        isFeatured: false,
        isActive: true,
      },
      {
        title: "Legal Tech Careers Networking Mixer",
        organizer: "Legal Tech Careers",
        eventType: "networking",
        startDate: new Date(now.getFullYear(), now.getMonth() + 1, 5),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 5),
        location: "Online",
        attendanceType: "virtual",
        description: "A casual virtual networking event for legal professionals exploring careers in legal technology. Connect with hiring managers, career changers who've made the transition, and mentors in the legal tech space. Includes breakout rooms by interest area.",
        registrationUrl: "#",
        cost: "Free",
        isFree: true,
        topics: ["Career Transition", "Networking", "Legal Tech Careers", "Mentorship"],
        speakers: [{ name: "Legal Tech Professionals", title: "Panel & Networking", organization: "Various" }],
        cleCredits: null,
        isFeatured: false,
        isActive: true,
      },
      {
        title: "eDiscovery & Information Governance Symposium",
        organizer: "The Sedona Conference",
        eventType: "seminar",
        startDate: new Date(now.getFullYear(), 9, 7),
        endDate: new Date(now.getFullYear(), 9, 9),
        location: "Scottsdale, AZ",
        attendanceType: "in-person",
        description: "An advanced seminar bringing together judges, lawyers, and technologists to address cutting-edge issues in electronic discovery and information governance. Features dialogue-based sessions and working group presentations.",
        registrationUrl: "https://thesedonaconference.org",
        cost: "$1,200 - $1,800",
        isFree: false,
        topics: ["eDiscovery", "Information Governance", "Data Privacy", "ESI Protocol", "Cross-border Discovery"],
        speakers: [{ name: "Sedona Faculty", title: "Judges & Practitioners", organization: "The Sedona Conference" }],
        cleCredits: "Up to 12 CLE credits",
        isFeatured: false,
        isActive: true,
      },
      {
        title: "Legal Tech Open Source Contributor Day",
        organizer: "Free Law Project",
        eventType: "hackathon",
        startDate: new Date(now.getFullYear(), now.getMonth() + 2, 20),
        endDate: new Date(now.getFullYear(), now.getMonth() + 2, 20),
        location: "Online",
        attendanceType: "virtual",
        description: "A day-long event where developers and legal professionals collaborate on open-source legal tech projects. Perfect for lawyers looking to build coding skills or developers wanting to apply their skills to access-to-justice challenges.",
        registrationUrl: "https://free.law",
        cost: "Free",
        isFree: true,
        topics: ["Open Source", "Access to Justice", "Court Data", "Legal APIs", "Community Building"],
        speakers: [{ name: "Mike Lissner", title: "Executive Director", organization: "Free Law Project" }],
        cleCredits: null,
        isFeatured: false,
        isActive: true,
      },
    ];

    await db.insert(events).values(seedData);
    console.log(`Seeded ${seedData.length} events`);
  }

  async getSavedJobCount(userId: string): Promise<number> {
    const [result] = await db.select({ cnt: count() }).from(savedJobs).where(eq(savedJobs.userId, userId));
    return result?.cnt || 0;
  }

  async getDailyAssistantChatCount(userId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [result] = await db.select({ cnt: count() }).from(userActivities)
      .where(and(
        eq(userActivities.userId, userId),
        eq(userActivities.eventType, 'assistant_chat'),
        gte(userActivities.createdAt, todayStart)
      ));
    return result?.cnt || 0;
  }

  async getGuidedSearchCount(userId: string): Promise<number> {
    const [result] = await db.select({ cnt: count() }).from(userActivities)
      .where(and(
        eq(userActivities.userId, userId),
        eq(userActivities.eventType, 'guided_search')
      ));
    return result?.cnt || 0;
  }

  async deactivatePastEvents(): Promise<number> {
    const now = new Date();
    const result = await db.update(events)
      .set({ isActive: false })
      .where(and(
        eq(events.isActive, true),
        lt(events.endDate, now)
      ));
    return result.rowCount || 0;
  }

  async createScrapeRun(run: InsertScrapeRun): Promise<ScrapeRun> {
    const [created] = await db.insert(scrapeRuns).values(run).returning();
    return created;
  }

  async updateScrapeRun(id: number, data: Partial<InsertScrapeRun>): Promise<ScrapeRun | undefined> {
    const [updated] = await db.update(scrapeRuns)
      .set(data)
      .where(eq(scrapeRuns.id, id))
      .returning();
    return updated;
  }

  async getScrapeRuns(limit: number = 50): Promise<ScrapeRun[]> {
    return db.select().from(scrapeRuns).orderBy(desc(scrapeRuns.startedAt)).limit(limit);
  }

  async getLatestScrapeRun(): Promise<ScrapeRun | undefined> {
    const [run] = await db.select().from(scrapeRuns).orderBy(desc(scrapeRuns.startedAt)).limit(1);
    return run;
  }

  async createJobReport(report: InsertJobReport): Promise<JobReport> {
    const [newReport] = await db.insert(jobReports).values(report).returning();
    return newReport;
  }

  async getJobReports(status?: string): Promise<(JobReport & { jobTitle?: string; jobCompany?: string })[]> {
    const conditions: any[] = [];
    if (status) {
      conditions.push(eq(jobReports.status, status));
    }
    const reports = conditions.length > 0
      ? await db.select().from(jobReports).where(and(...conditions)).orderBy(desc(jobReports.createdAt))
      : await db.select().from(jobReports).orderBy(desc(jobReports.createdAt));

    const enriched = await Promise.all(
      reports.map(async (report) => {
        const job = await this.getJob(report.jobId);
        return { ...report, jobTitle: job?.title, jobCompany: job?.company };
      })
    );
    return enriched;
  }

  async getReportCountForJob(jobId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(jobReports)
      .where(eq(jobReports.jobId, jobId));
    return result?.count || 0;
  }

  async updateJobReportStatus(id: number, status: string, adminNotes?: string): Promise<JobReport | undefined> {
    const updateData: any = { status };
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (status === "resolved") updateData.resolvedAt = new Date();
    const [updated] = await db
      .update(jobReports)
      .set(updateData)
      .where(eq(jobReports.id, id))
      .returning();
    return updated;
  }

  async getPublicJob(id: number): Promise<Job | undefined> {
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.id, id),
        eq(jobs.isActive, true),
        eq(jobs.isPublished, true),
        eq(jobs.pipelineStatus, 'ready'),
      ));
    return job;
  }

  async getJobsForEnrichment(limit: number = 25): Promise<Job[]> {
    return db
      .select()
      .from(jobs)
      .where(and(eq(jobs.isActive, true), eq(jobs.pipelineStatus, 'raw')))
      .orderBy(desc(jobs.postedDate))
      .limit(limit);
  }

  async getLiveJobs(): Promise<Job[]> {
    return db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.isPublished, true),
          eq(jobs.isActive, true),
          eq(jobs.pipelineStatus, 'ready'),
          eq(jobs.jobStatus, 'open')
        )
      );
  }

  async findLiveJobDuplicate(title: string, company: string, location: string | null, excludeId: number): Promise<Job | undefined> {
    const { normalizeTitle, normalizeLocation } = await import('./lib/job-normalization');
    const normTitle = normalizeTitle(title);
    const normLoc = normalizeLocation(location);
    
    const candidates = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.company, company),
          eq(jobs.isPublished, true),
          eq(jobs.isActive, true),
          eq(jobs.pipelineStatus, 'ready'),
          eq(jobs.jobStatus, 'open'),
          sql`${jobs.id} != ${excludeId}`
        )
      );
    
    return candidates.find(j => 
      normalizeTitle(j.title) === normTitle && 
      normalizeLocation(j.location) === normLoc
    );
  }

  async updateJobPipeline(id: number, data: Record<string, any>): Promise<Job | undefined> {
    const [updated] = await db
      .update(jobs)
      .set(data)
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  }

  async updateJobWorkerFields(id: number, data: Record<string, any>): Promise<Job | undefined> {
    const WORKER_SAFE_KEYS = new Set([
      'pipelineStatus', 'structuredDescription', 'structuredStatus', 'structuredUpdatedAt',
      'qualityScore', 'relevanceConfidence', 'reviewReasonCode', 'reviewStatusNote',
      'lastSeenAt', 'lastCheckedAt', 'lastEnrichedAt', 'applyUrlStatus',
      'roleCategory', 'roleSubcategory', 'roleFocus', 'seniorityLevel',
      'legalRelevanceScore', 'legalRelevanceReasoning', 'aiSummary',
      'cleanedDescription', 'experienceMin', 'experienceMax', 'experienceText',
      'salaryMin', 'salaryMax', 'salaryCurrency',
      'jobStatus', 'isActive', 'isPublished',
      'title', 'description', 'descriptionFormatted', 'jobHash',
      'keySkills', 'matchKeywords', 'aiResponsibilities', 'aiQualifications', 'aiNiceToHaves',
      'isRemote', 'locationType', 'reviewStatus',
    ]);
    const safeData: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (WORKER_SAFE_KEYS.has(key)) {
        safeData[key] = val;
      }
    }
    if (Object.keys(safeData).length === 0) return undefined;
    const [updated] = await db
      .update(jobs)
      .set(safeData)
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  }

  async getJobsByPipelineStatus(status: string): Promise<Job[]> {
    if (status === 'published') {
      return db
        .select()
        .from(jobs)
        .where(and(eq(jobs.isActive, true), eq(jobs.pipelineStatus, 'ready'), eq(jobs.isPublished, true)))
        .orderBy(desc(jobs.postedDate));
    }
    return db
      .select()
      .from(jobs)
      .where(and(eq(jobs.isActive, true), eq(jobs.pipelineStatus, status)))
      .orderBy(desc(jobs.postedDate));
  }

  async getStalePublishedJobs(days: number): Promise<Job[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.isActive, true),
        eq(jobs.isPublished, true),
        lt(jobs.lastSeenAt, cutoff)
      ));
  }

  async getPublishedJobsForLinkCheck(): Promise<Job[]> {
    return db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.isActive, true),
        eq(jobs.isPublished, true),
        eq(jobs.pipelineStatus, 'ready'),
      ))
      .orderBy(desc(jobs.lastCheckedAt));
  }

  async getPipelineStats(): Promise<{ raw: number; enriching: number; ready: number; rejected: number; published: number }> {
    const results = await db
      .select({
        status: jobs.pipelineStatus,
        isPublished: jobs.isPublished,
        cnt: count(),
      })
      .from(jobs)
      .where(eq(jobs.isActive, true))
      .groupBy(jobs.pipelineStatus, jobs.isPublished);

    const stats = { raw: 0, enriching: 0, ready: 0, rejected: 0, published: 0 };
    for (const row of results) {
      const s = row.status || 'raw';
      if (s === 'ready' && row.isPublished) {
        stats.published += Number(row.cnt);
      } else if (s in stats) {
        (stats as any)[s] += Number(row.cnt);
      }
    }
    return stats;
  }
}

export const storage = new DatabaseStorage();
