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
  locationType: varchar("location_type", { length: 20 }),
  locationRegion: varchar("location_region", { length: 50 }),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: varchar("salary_currency", { length: 3 }),
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
  aiResponsibilities: text("ai_responsibilities").array(),
  aiQualifications: text("ai_qualifications").array(),
  aiNiceToHaves: text("ai_nice_to_haves").array(),
  viewCount: integer("view_count").default(0),
  applyClickCount: integer("apply_click_count").default(0),
  lastScrapedAt: timestamp("last_scraped_at").default(sql`CURRENT_TIMESTAMP`),
  manuallyEdited: boolean("manually_edited").default(false),
  editedBy: text("edited_by"),
  editedAt: timestamp("edited_at"),
  legalRelevanceScore: integer("legal_relevance_score"),
  reviewStatus: varchar("review_status", { length: 20 }),
  descriptionFormatted: boolean("description_formatted").default(false),
  structuredDescription: jsonb("structured_description"),
  isPublished: boolean("is_published").default(false),
  structuredStatus: varchar("structured_status", { length: 20 }).default("missing"),
  structuredUpdatedAt: timestamp("structured_updated_at"),
  sourceName: varchar("source_name", { length: 100 }),
  sourceDomain: varchar("source_domain", { length: 255 }),
  sourceUrl: varchar("source_url", { length: 1000 }),
  lastCheckedAt: timestamp("last_checked_at"),
  linkFailCount: integer("link_fail_count").default(0),
  jobStatus: varchar("job_status", { length: 20 }).default("open"),
  closedReason: varchar("closed_reason", { length: 50 }),
  closedAt: timestamp("closed_at"),
  pipelineStatus: varchar("pipeline_status", { length: 20 }).default("raw"),
  qualityScore: integer("quality_score"),
  relevanceConfidence: integer("relevance_confidence"),
  reviewReasonCode: varchar("review_reason_code", { length: 50 }),
  experienceText: varchar("experience_text", { length: 255 }),
  secondaryTags: text("secondary_tags").array(),
  careerTrack: varchar("career_track", { length: 100 }),
  jobHash: varchar("job_hash", { length: 64 }),
  firstSeenAt: timestamp("first_seen_at").default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: timestamp("last_seen_at").default(sql`CURRENT_TIMESTAMP`),
  lastEnrichedAt: timestamp("last_enriched_at"),
  whyThisFitsLawyers: text("why_this_fits_lawyers"),
  qaStatus: varchar("qa_status", { length: 20 }),
  qaErrors: jsonb("qa_errors"),
  qaWarnings: jsonb("qa_warnings"),
  lawyerFirstScore: integer("lawyer_first_score"),
  qaExcludeReason: varchar("qa_exclude_reason", { length: 255 }),
  qaCheckedAt: timestamp("qa_checked_at"),
});

export const jobCategories = pgTable("job_categories", {
  id: serial("id").primaryKey(),
  categoryName: varchar("category_name", { length: 100 }).notNull().unique(),
  categoryIcon: varchar("category_icon", { length: 10 }),
  subcategories: text("subcategories").array(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
});

export const scrapeRuns = pgTable("scrape_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  totalFound: integer("total_found").default(0),
  inserted: integer("inserted").default(0),
  updated: integer("updated").default(0),
  staleDeactivated: integer("stale_deactivated").default(0),
  categorized: integer("categorized").default(0),
  alertsTriggered: integer("alerts_triggered").default(0),
  brokenLinks: integer("broken_links").default(0),
  sourcesSucceeded: integer("sources_succeeded").default(0),
  sourcesFailed: integer("sources_failed").default(0),
  sourceDetails: jsonb("source_details"),
  errors: text("errors").array(),
  triggeredBy: varchar("triggered_by", { length: 20 }).default("scheduler"),
});

export type ScrapeRun = typeof scrapeRuns.$inferSelect;
export type InsertScrapeRun = typeof scrapeRuns.$inferInsert;

export const companyIntel = pgTable("company_intel", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull().unique(),
  summary: text("summary"),
  product: text("product"),
  fundingStage: varchar("funding_stage", { length: 100 }),
  recentNews: text("recent_news").array(),
  growthSignals: text("growth_signals").array(),
  citations: text("citations").array(),
  fetchedAt: timestamp("fetched_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type CompanyIntel = typeof companyIntel.$inferSelect;
export type InsertCompanyIntel = typeof companyIntel.$inferInsert;

export const PIPELINE_STATUSES = ["raw", "enriching", "ready", "rejected"] as const;
export type PipelineStatus = typeof PIPELINE_STATUSES[number];

export const REVIEW_REASON_CODES = [
  "LOW_QUALITY_SCORE",
  "MISSING_EXPERIENCE",
  "MISSING_CATEGORY",
  "MISSING_SUMMARY",
  "LOW_RELEVANCE",
  "BROKEN_APPLY_LINK",
  "STALE_LISTING",
  "MANUAL_REVIEW",
] as const;
export type ReviewReasonCode = typeof REVIEW_REASON_CODES[number];

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  postedDate: true,
  viewCount: true,
  applyClickCount: true,
  lastScrapedAt: true,
  qualityScore: true,
  relevanceConfidence: true,
  lastEnrichedAt: true,
  firstSeenAt: true,
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
  "Legal Engineering": {
    icon: "Wrench",
    shortName: "Engineering",
    description: "Building and configuring legal tech products using legal expertise",
    subcategories: [
      "Legal Engineer",
      "Legal Solutions Engineer",
      "Legal Automation Engineer",
      "Legal Workflow Engineer",
      "Legal Systems Designer",
      "Legal Technology Architect",
    ],
  },
  "Legal Operations": {
    icon: "Settings",
    shortName: "Ops",
    description: "Process optimization, legal project management, and tech implementation",
    subcategories: [
      "Legal Operations Manager",
      "Legal Operations Analyst",
      "Legal Project Manager",
      "Legal Process Improvement Specialist",
      "Legal Technology Implementation Manager",
      "Legal Spend Manager",
      "Legal Vendor Manager",
    ],
  },
  "Compliance & Privacy": {
    icon: "Shield",
    shortName: "Compliance",
    description: "Regulatory tech, data privacy, risk management, and policy compliance",
    subcategories: [
      "Compliance Counsel",
      "Privacy Counsel",
      "Compliance Manager",
      "GRC Analyst",
      "Trade Compliance Counsel",
      "Regulatory Technology Specialist",
      "Data Privacy Officer",
    ],
  },
  "Contract Management": {
    icon: "FileText",
    shortName: "Contracts",
    description: "CLM platforms, contract lifecycle, and contract technology",
    subcategories: [
      "Contracts Counsel",
      "Contracts Manager",
      "Contract Analyst",
      "CLM Specialist",
      "Contract Automation Specialist",
      "ISDA Negotiator",
    ],
  },
  "Litigation & eDiscovery": {
    icon: "Scale",
    shortName: "Litigation",
    description: "Litigation tech, eDiscovery platforms, and case management",
    subcategories: [
      "eDiscovery Project Manager",
      "eDiscovery Counsel",
      "Litigation Technology Specialist",
      "Appellate Specialist",
      "Case Management Specialist",
      "Litigation Analytics Specialist",
    ],
  },
  "Legal AI & Analytics": {
    icon: "Brain",
    shortName: "AI & Analytics",
    description: "AI and data roles requiring legal domain knowledge",
    subcategories: [
      "Legal AI Product Manager",
      "Legal AI Solutions Engineer",
      "Legal Data Scientist",
      "Legal AI Researcher",
      "Legal NLP Specialist",
      "AI Safety Counsel",
    ],
  },
  "Legal Product Management": {
    icon: "Lightbulb",
    shortName: "Product",
    description: "Product roles for legal software requiring legal domain expertise",
    subcategories: [
      "Legal Product Manager",
      "Product Counsel",
      "Legal Solutions Director",
      "Legal Platform Manager",
      "Legal UX Designer",
      "Head of Legal Innovation",
    ],
  },
  "In-House Counsel": {
    icon: "Briefcase",
    shortName: "In-House",
    description: "Attorney, counsel, and legal advisory roles at legal tech companies",
    subcategories: [
      "General Counsel",
      "Commercial Counsel",
      "Corporate Counsel",
      "Employment Counsel",
      "IP Counsel",
      "Legal Director",
      "Staff Attorney",
    ],
  },
  "Legal Consulting & Advisory": {
    icon: "TrendingUp",
    shortName: "Consulting",
    description: "Helping firms and companies adopt legal tech, legal solution design",
    subcategories: [
      "LegalTech Consultant",
      "Legal Innovation Consultant",
      "Legal AI Governance Consultant",
      "Legal Technology Strategy Advisor",
      "Legal Process Consultant",
      "Client Solutions Specialist",
    ],
  },
  "Knowledge Management": {
    icon: "BookOpen",
    shortName: "Knowledge",
    description: "Legal research, knowledge systems, and legal information management",
    subcategories: [
      "Legal Knowledge Manager",
      "Knowledge Counsel",
      "Legal Research Engineer",
      "Legal Taxonomy Specialist",
      "Legal Information Architect",
      "Editorial Manager",
    ],
  },
  "Policy & Access to Justice": {
    icon: "Landmark",
    shortName: "Policy",
    description: "Courts tech, legal aid, public interest, and legal policy innovation",
    subcategories: [
      "Legal Policy Advisor",
      "Court Technology Advisor",
      "Access to Justice Lead",
      "Digital Justice Specialist",
      "Legal Aid Technology Manager",
      "Policy Manager",
    ],
  },
  "Intellectual Property & Innovation": {
    icon: "Microscope",
    shortName: "IP",
    description: "IP tech, patent and trademark platforms, and brand protection technology",
    subcategories: [
      "Trademark Attorney",
      "IP Specialist",
      "Patent Technology Specialist",
      "IP Legal Specialist",
      "Brand Protection Legal Specialist",
    ],
  },
  "Legal Sales & Client Solutions": {
    icon: "Target",
    shortName: "Client Solutions",
    description: "Business development roles requiring legal expertise to sell legal tech",
    subcategories: [
      "Legal Solutions Consultant",
      "Engagement Manager",
      "Legal Account Director",
      "Client Solutions Manager",
      "Legal Business Development",
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

export const savedJobs = pgTable("saved_jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  jobId: integer("job_id").notNull(),
  savedAt: timestamp("saved_at").default(sql`CURRENT_TIMESTAMP`),
  reminderShown: boolean("reminder_shown").default(false),
  notes: text("notes"),
});

export const insertSavedJobSchema = createInsertSchema(savedJobs).omit({
  id: true,
  savedAt: true,
});

export type SavedJob = typeof savedJobs.$inferSelect;
export type InsertSavedJob = z.infer<typeof insertSavedJobSchema>;

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

export const EVENT_TYPES = ["conference", "seminar", "webinar", "workshop", "cle", "networking", "hackathon", "panel"] as const;
export type EventType = typeof EVENT_TYPES[number];

export const ATTENDANCE_TYPES = ["in-person", "virtual", "hybrid"] as const;
export type AttendanceType = typeof ATTENDANCE_TYPES[number];

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  organizer: varchar("organizer", { length: 255 }).notNull(),
  organizerLogo: varchar("organizer_logo", { length: 500 }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  location: varchar("location", { length: 255 }),
  attendanceType: varchar("attendance_type", { length: 50 }).notNull().default("in-person"),
  virtualUrl: varchar("virtual_url", { length: 500 }),
  description: text("description").notNull(),
  registrationUrl: varchar("registration_url", { length: 500 }).notNull(),
  cost: varchar("cost", { length: 100 }),
  isFree: boolean("is_free").default(false),
  topics: text("topics").array(),
  speakers: jsonb("speakers"),
  cleCredits: varchar("cle_credits", { length: 100 }),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  externalId: varchar("external_id", { length: 255 }),
  source: varchar("source", { length: 50 }),
  viewCount: integer("view_count").default(0),
  registrationClickCount: integer("registration_click_count").default(0),
  linkStatus: varchar("link_status", { length: 20 }).default("unchecked"),
  linkLastChecked: timestamp("link_last_checked"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  viewCount: true,
  registrationClickCount: true,
  linkStatus: true,
  linkLastChecked: true,
  createdAt: true,
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export interface EventSpeaker {
  name: string;
  title?: string;
  organization?: string;
}

export const APPLICATION_STATUSES = ["saved", "applied", "interviewing", "offer", "rejected"] as const;
export type ApplicationStatus = typeof APPLICATION_STATUSES[number];

export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  jobId: integer("job_id").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("saved"),
  notes: text("notes"),
  appliedDate: timestamp("applied_date"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;

export type JobApplicationWithJob = JobApplication & { job: Job };

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

export interface StructuredDescription {
  summary: string;
  aboutCompany: string;
  responsibilities: string[];
  minimumQualifications: string[];
  preferredQualifications: string[];
  skillsRequired: string[];
  seniority: string;
  legalTechCategory: string;
  aiRelevanceScore?: string;
  lawyerTransitionFriendly?: boolean;
  lawyerTransitionNotes?: string[];
}

export type StructuredStatus = "missing" | "generated" | "edited" | "approved";

export const resumeRewriteRuns = pgTable("resume_rewrite_runs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  jobId: integer("job_id").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  inputHash: text("input_hash"),
  outputJson: jsonb("output_json"),
  status: varchar("status", { length: 20 }).notNull().default("success"),
  errorMessage: text("error_message"),
});

export type ResumeRewriteRun = typeof resumeRewriteRuns.$inferSelect;

export const REPORT_TYPES = ["broken_link", "duplicate", "wrong_category", "outdated", "spam"] as const;
export type ReportType = typeof REPORT_TYPES[number];

export const REPORT_STATUSES = ["new", "reviewed", "resolved"] as const;
export type ReportStatus = typeof REPORT_STATUSES[number];

export const jobReports = pgTable("job_reports", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  reporterUserId: varchar("reporter_user_id", { length: 255 }),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  adminNotes: text("admin_notes"),
  resolvedAt: timestamp("resolved_at"),
});

export const insertJobReportSchema = createInsertSchema(jobReports).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export type JobReport = typeof jobReports.$inferSelect;
export type InsertJobReport = z.infer<typeof insertJobReportSchema>;
