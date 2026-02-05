import { db } from "./db";
import { jobs, type Job, type InsertJob } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<void>;
  getActiveJobs(): Promise<Job[]>;
  seedJobs(): Promise<void>;
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

  async getActiveJobs(): Promise<Job[]> {
    return db
      .select()
      .from(jobs)
      .where(eq(jobs.isActive, true))
      .orderBy(desc(jobs.postedDate));
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
      },
      {
        title: "Legal Engineer",
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
      },
      {
        title: "Full Stack Engineer",
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
      },
      {
        title: "Business Development Manager",
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
      },
      {
        title: "Legal Content Writer",
        company: "Clio",
        companyLogo: "https://logo.clearbit.com/clio.com",
        location: "Vancouver, BC",
        isRemote: true,
        salaryMin: 70000,
        salaryMax: 100000,
        experienceMin: 2,
        experienceMax: 4,
        roleType: "Content",
        description: "Create educational content for lawyers. Write blog posts, guides, and webinars about legal technology and practice management. Help attorneys understand how technology can transform their practice.",
        requirements: "2+ years content writing experience, legal knowledge a plus, excellent writing skills",
        applyUrl: "https://clio.com/careers",
        isActive: true,
      },
    ];

    await db.insert(jobs).values(seedData);
    console.log("Seeded database with sample jobs");
  }
}

export const storage = new DatabaseStorage();
