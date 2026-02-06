import { db } from "./db";
import { jobs, users, userPreferences, jobCategories, jobSubmissions, jobAlerts, notifications, resumes, builtResumes, userActivities, userPersonas, savedJobs, jobApplications, type Job, type InsertJob, type User, type UserPreferences, type InsertUserPreferences, type ResumeExtractedData, type JobCategory, type JobSubmission, type InsertJobSubmission, type JobAlert, type InsertJobAlert, type Notification, type InsertNotification, type Resume, type InsertResume, type BuiltResume, type InsertBuiltResume, type UserActivity, type InsertUserActivity, type UserPersona, type InsertUserPersona, type SavedJob, type InsertSavedJob, type JobApplication, type InsertJobApplication, type JobApplicationWithJob, JOB_TAXONOMY } from "@shared/schema";
import { eq, desc, and, sql, inArray, lt, gte, count } from "drizzle-orm";

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
  bulkUpsertJobs(jobsList: InsertJob[]): Promise<{ inserted: number; updated: number; newJobs: Job[] }>;
  trackApplyClick(jobId: number): Promise<void>;
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
}

class DatabaseStorage implements IStorage {
  async getJobs(): Promise<Job[]> {
    return db.select().from(jobs).orderBy(desc(jobs.postedDate));
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined> {
    const [updatedJob] = await db
      .update(jobs)
      .set(job)
      .where(eq(jobs.id, id))
      .returning();
    return updatedJob;
  }

  async deleteJob(id: number): Promise<void> {
    await db.delete(jobs).where(eq(jobs.id, id));
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
      .where(eq(jobs.isActive, true))
      .orderBy(desc(jobs.postedDate));
  }

  async getJobByExternalId(externalId: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.externalId, externalId));
    return job;
  }

  async upsertJobByExternalId(job: InsertJob): Promise<{ job: Job; isNew: boolean }> {
    if (!job.externalId) {
      const newJob = await this.createJob(job);
      return { job: newJob, isNew: true };
    }

    const existing = await this.getJobByExternalId(job.externalId);
    if (existing) {
      const [updatedJob] = await db
        .update(jobs)
        .set({ ...job, isActive: true })
        .where(eq(jobs.externalId, job.externalId))
        .returning();
      return { job: updatedJob, isNew: false };
    } else {
      const [newJob] = await db.insert(jobs).values(job).returning();
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

    const uniqueSearchTerms = [...new Set(recentSearches.map(s => s.query))].slice(0, 5);

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
        action: "/search",
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

    const conditions = [
      sql`${jobs.id} != ${jobId}`,
      eq(jobs.isActive, true),
    ];

    if (job.roleCategory) {
      conditions.push(eq(jobs.roleCategory, job.roleCategory));
    }

    let results = await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.postedDate))
      .limit(limit);

    if (results.length < limit) {
      const excludeIds = [jobId, ...results.map(r => r.id)];
      const fallback = await db
        .select()
        .from(jobs)
        .where(and(
          sql`${jobs.id} NOT IN (${sql.join(excludeIds.map(id => sql`${id}`), sql`, `)})`,
          eq(jobs.isActive, true),
          job.seniorityLevel ? eq(jobs.seniorityLevel, job.seniorityLevel) : sql`true`,
        ))
        .orderBy(desc(jobs.postedDate))
        .limit(limit - results.length);
      results = [...results, ...fallback];
    }

    return results;
  }
}

export const storage = new DatabaseStorage();
