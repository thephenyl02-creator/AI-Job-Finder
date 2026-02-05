import { db } from "./db";
import { jobs, users, userPreferences, jobCategories, type Job, type InsertJob, type User, type UserPreferences, type InsertUserPreferences, type ResumeExtractedData, type JobCategory, JOB_TAXONOMY } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

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
  bulkUpsertJobs(jobsList: InsertJob[]): Promise<{ inserted: number; updated: number }>;
  trackApplyClick(jobId: number): Promise<void>;
  // User Resume
  updateUserResume(userId: string, resumeText: string, filename: string, extractedData: ResumeExtractedData): Promise<void>;
  getUserResume(userId: string): Promise<{ resumeFilename: string | null; extractedData: ResumeExtractedData | null } | null>;
  updateUserLastSearch(userId: string, query: string): Promise<void>;
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | null>;
  upsertUserPreferences(userId: string, prefs: Partial<InsertUserPreferences>): Promise<UserPreferences>;
  // Job Categories
  getJobCategories(): Promise<JobCategory[]>;
  seedJobCategories(): Promise<void>;
  getJobsByCategory(category: string): Promise<Job[]>;
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

  async bulkUpsertJobs(jobsList: InsertJob[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const job of jobsList) {
      const result = await this.upsertJobByExternalId(job);
      if (result.isNew) {
        inserted++;
      } else {
        updated++;
      }
    }

    return { inserted, updated };
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
}

export const storage = new DatabaseStorage();
