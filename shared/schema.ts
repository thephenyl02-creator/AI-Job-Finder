import { sql } from "drizzle-orm";
import { pgTable, serial, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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
  "Legal AI Jobs": {
    icon: "Brain",
    subcategories: [
      "Legal AI Engineer",
      "NLP Engineer (Legal)",
      "Knowledge Engineer",
      "Legal Data Scientist",
      "AI Product Manager (Legal)",
      "Prompt Engineer (Legal AI)",
      "AI Researcher (Law + ML)",
    ],
  },
  "Legal Tech Startup Roles": {
    icon: "Scale",
    subcategories: [
      "Product Manager (LegalTech)",
      "Solutions Engineer",
      "Legal Operations Manager",
      "Legal Tech Consultant",
      "Customer Success (Legal SaaS)",
      "Sales Engineer (LegalTech)",
      "Growth / Partnerships (LegalTech)",
    ],
  },
  "Law Firm Tech & Innovation": {
    icon: "Building2",
    subcategories: [
      "Legal Innovation Manager",
      "Practice Technology Lead",
      "Knowledge Management Lawyer",
      "Litigation Technology Specialist",
      "eDiscovery / Analytics Manager",
      "AI & Automation Counsel",
      "Research Technology Attorney",
    ],
  },
} as const;

export type JobCategoryName = keyof typeof JOB_TAXONOMY;
