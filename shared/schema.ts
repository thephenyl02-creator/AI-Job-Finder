import { sql } from "drizzle-orm";
import { pgTable, serial, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/chat";

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  companyLogo: varchar("company_logo", { length: 500 }),
  location: varchar("location", { length: 255 }),
  isRemote: boolean("is_remote").default(false),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  experienceMin: integer("experience_min"),
  experienceMax: integer("experience_max"),
  roleType: varchar("role_type", { length: 100 }),
  description: text("description").notNull(),
  requirements: text("requirements"),
  applyUrl: varchar("apply_url", { length: 500 }).notNull(),
  postedDate: timestamp("posted_date").default(sql`CURRENT_TIMESTAMP`),
  isActive: boolean("is_active").default(true),
  externalId: varchar("external_id", { length: 255 }),
  source: varchar("source", { length: 50 }),
  aiSummary: text("ai_summary"),
  keySkills: text("key_skills").array(),
  roleCategory: varchar("role_category", { length: 100 }),
  roleSubcategory: varchar("role_subcategory", { length: 100 }),
  seniorityLevel: varchar("seniority_level", { length: 50 }),
  matchKeywords: text("match_keywords").array(),
  viewCount: integer("view_count").default(0),
  applyClickCount: integer("apply_click_count").default(0),
});

export const jobCategories = pgTable("job_categories", {
  id: serial("id").primaryKey(),
  categoryName: varchar("category_name", { length: 100 }).notNull().unique(),
  categoryIcon: varchar("category_icon", { length: 10 }),
  subcategories: text("subcategories").array(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  postedDate: true,
  viewCount: true,
  applyClickCount: true,
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export interface JobWithScore extends Job {
  matchScore?: number;
  matchReason?: string;
}

export const insertJobCategorySchema = createInsertSchema(jobCategories).omit({
  id: true,
});

export type JobCategory = typeof jobCategories.$inferSelect;
export type InsertJobCategory = z.infer<typeof insertJobCategorySchema>;

export const JOB_TAXONOMY = {
  "Legal AI & Machine Learning": {
    icon: "Brain",
    shortName: "AI & ML",
    description: "AI product roles, ML engineering, NLP, and legal analytics",
    subcategories: [
      "AI Product Manager",
      "Legal AI Engineer",
      "Legal NLP Specialist",
      "Legal Data Scientist",
      "Legal AI Researcher",
      "Prompt Engineer (Legal)",
      "Legal ML Specialist",
      "Legal AI Evaluation Specialist",
      "Legal Dataset Curator",
    ],
  },
  "Legal Product & Innovation": {
    icon: "Lightbulb",
    shortName: "Product",
    description: "Product management, innovation leadership, and digital transformation",
    subcategories: [
      "Legal Product Manager",
      "Head of Legal Innovation",
      "Legal Digital Transformation Lead",
      "Legal UX Designer",
      "Legal Workflow Designer",
      "Legal Solutions Manager",
      "Legal Platform Manager",
    ],
  },
  "Legal Knowledge Engineering": {
    icon: "BookOpen",
    shortName: "Knowledge",
    description: "Knowledge management, research systems, and information architecture",
    subcategories: [
      "Legal Knowledge Manager",
      "Knowledge Counsel",
      "Legal Information Architect",
      "Legal Taxonomy Specialist",
      "Legal Research Engineer",
      "Legal RAG Architect",
      "Legal Ontology Specialist",
    ],
  },
  "Legal Operations": {
    icon: "Settings",
    shortName: "Ops",
    description: "Legal ops management, process optimization, and vendor management",
    subcategories: [
      "Legal Operations Manager",
      "Legal Operations Analyst",
      "Legal Project Manager",
      "Legal Process Improvement Specialist",
      "Legal Vendor Manager",
      "Legal Systems Administrator",
      "Legal Technology Implementation Manager",
    ],
  },
  "Contract Technology": {
    icon: "FileText",
    shortName: "Contracts",
    description: "CLM systems, contract automation, and transaction technology",
    subcategories: [
      "Contract Automation Specialist",
      "CLM Implementation Consultant",
      "Contract Intelligence Analyst",
      "Contract Data Specialist",
      "Smart Contract Analyst",
      "Deal Technology Specialist",
      "Transaction Automation Manager",
    ],
  },
  "Compliance & RegTech": {
    icon: "Shield",
    shortName: "Compliance",
    description: "Regulatory technology, compliance automation, and risk management",
    subcategories: [
      "Compliance Technology Counsel",
      "Regulatory Technology Product Manager",
      "Compliance Automation Specialist",
      "Regulatory Intelligence Analyst",
      "Privacy Technology Counsel",
      "AML/KYC Technology Counsel",
      "Compliance Analytics Specialist",
    ],
  },
  "Litigation & eDiscovery": {
    icon: "Scale",
    shortName: "Litigation",
    description: "Litigation technology, eDiscovery, and trial analytics",
    subcategories: [
      "Litigation Technology Specialist",
      "eDiscovery Counsel",
      "eDiscovery Project Manager",
      "Litigation Analytics Specialist",
      "Digital Evidence Specialist",
      "Case Strategy Analyst",
      "Jury Analytics Specialist",
    ],
  },
  "Legal Consulting & Strategy": {
    icon: "TrendingUp",
    shortName: "Consulting",
    description: "LegalTech consulting, AI governance, and strategic advisory",
    subcategories: [
      "LegalTech Consultant",
      "Legal Innovation Consultant",
      "Legal AI Governance Consultant",
      "Legal Technology Strategy Advisor",
      "Legal Process Consultant",
      "AI Adoption Consultant (Legal)",
      "Responsible AI Advisor",
    ],
  },
  "Legal Education & Training": {
    icon: "GraduationCap",
    shortName: "Education",
    description: "Legal learning technology and professional development",
    subcategories: [
      "Legal Learning Technology Specialist",
      "AI Curriculum Designer (Law)",
      "Legal Skills Technology Director",
      "Legal Training Innovation Manager",
      "Legal Career Analytics Specialist",
    ],
  },
  "Legal Publishing & Content": {
    icon: "Newspaper",
    shortName: "Publishing",
    description: "Legal publishing technology and content platforms",
    subcategories: [
      "Legal Editorial Technologist",
      "Legal Content Strategist",
      "Legal Information Product Manager",
      "Legal Content Structuring Specialist",
      "Legal Annotation Specialist",
    ],
  },
  "Courts & Public Legal Systems": {
    icon: "Landmark",
    shortName: "Government",
    description: "Court technology, access to justice, and public legal systems",
    subcategories: [
      "Court Technology Advisor",
      "Digital Justice Systems Specialist",
      "Access to Justice Technology Lead",
      "Legal Policy Technology Advisor",
      "Judicial Technology Analyst",
    ],
  },
  "Legal Research & Academia": {
    icon: "Microscope",
    shortName: "Research",
    description: "Computational law research and academic roles",
    subcategories: [
      "Legal Informatics Researcher",
      "AI & Law Researcher",
      "Computational Law Scientist",
      "Legal Empirical Researcher",
      "Algorithmic Fairness Researcher",
    ],
  },
  "Emerging LegalTech Roles": {
    icon: "Sparkles",
    shortName: "Emerging",
    description: "Next-generation and fast-growing legal technology roles",
    subcategories: [
      "Legal AI Auditor",
      "Legal AI Safety Specialist",
      "Legal Automation Architect",
      "Legal Knowledge Graph Architect",
      "Legal AI Explainability Specialist",
      "Legal Decision Modeling Specialist",
      "Legal Systems Designer",
    ],
  },
} as const;

export type JobCategoryName = keyof typeof JOB_TAXONOMY;

export const jobSubmissions = pgTable("job_submissions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  companyWebsite: varchar("company_website", { length: 500 }),
  location: varchar("location", { length: 255 }),
  isRemote: boolean("is_remote").default(false),
  salaryRange: varchar("salary_range", { length: 100 }),
  description: text("description").notNull(),
  applyUrl: varchar("apply_url", { length: 500 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  submittedAt: timestamp("submitted_at").default(sql`CURRENT_TIMESTAMP`),
  status: varchar("status", { length: 50 }).default("pending"),
});

export const insertJobSubmissionSchema = createInsertSchema(jobSubmissions).omit({
  id: true,
  submittedAt: true,
  status: true,
});

export type JobSubmission = typeof jobSubmissions.$inferSelect;
export type InsertJobSubmission = z.infer<typeof insertJobSubmissionSchema>;

export const jobAlerts = pgTable("job_alerts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  categories: text("categories").array(),
  keywords: text("keywords").array(),
  seniorityLevels: text("seniority_levels").array(),
  isRemoteOnly: boolean("is_remote_only").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertJobAlertSchema = createInsertSchema(jobAlerts).omit({
  id: true,
  createdAt: true,
});

export type JobAlert = typeof jobAlerts.$inferSelect;
export type InsertJobAlert = z.infer<typeof insertJobAlertSchema>;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  alertId: integer("alert_id"),
  jobId: integer("job_id"),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const resumes = pgTable("resumes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  resumeText: text("resume_text"),
  extractedData: jsonb("extracted_data"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertResumeSchema = createInsertSchema(resumes).omit({
  id: true,
  createdAt: true,
});

export type Resume = typeof resumes.$inferSelect;
export type InsertResume = z.infer<typeof insertResumeSchema>;

export const userActivities = pgTable("user_activities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: varchar("entity_id", { length: 255 }),
  metadata: jsonb("metadata"),
  pagePath: varchar("page_path", { length: 500 }),
  sessionId: varchar("session_id", { length: 255 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertUserActivitySchema = createInsertSchema(userActivities).omit({
  id: true,
  createdAt: true,
});

export type UserActivity = typeof userActivities.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;

export const userPersonas = pgTable("user_personas", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  topCategories: text("top_categories").array(),
  topSkills: text("top_skills").array(),
  preferredLocations: text("preferred_locations").array(),
  remotePreference: varchar("remote_preference", { length: 20 }),
  seniorityInterest: text("seniority_interest").array(),
  careerStage: varchar("career_stage", { length: 50 }),
  engagementLevel: varchar("engagement_level", { length: 20 }),
  searchPatterns: text("search_patterns").array(),
  viewedCompanies: text("viewed_companies").array(),
  personaSummary: text("persona_summary"),
  totalJobViews: integer("total_job_views").default(0),
  totalSearches: integer("total_searches").default(0),
  totalApplyClicks: integer("total_apply_clicks").default(0),
  lastActiveAt: timestamp("last_active_at"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertUserPersonaSchema = createInsertSchema(userPersonas).omit({
  id: true,
  updatedAt: true,
});

export type UserPersona = typeof userPersonas.$inferSelect;
export type InsertUserPersona = z.infer<typeof insertUserPersonaSchema>;

export const builtResumes = pgTable("built_resumes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  templateId: varchar("template_id", { length: 50 }).default("professional"),
  targetJobId: integer("target_job_id"),
  sections: jsonb("sections").notNull(),
  atsScore: integer("ats_score"),
  atsAnalysis: jsonb("ats_analysis"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertBuiltResumeSchema = createInsertSchema(builtResumes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BuiltResume = typeof builtResumes.$inferSelect;
export type InsertBuiltResume = z.infer<typeof insertBuiltResumeSchema>;

export interface ResumeSections {
  contact: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    website?: string;
  };
  summary: string;
  experience: Array<{
    id: string;
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
  }>;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string;
    graduationDate: string;
    honors?: string;
  }>;
  skills: {
    technical: string[];
    legal: string[];
    soft: string[];
  };
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
  }>;
}
