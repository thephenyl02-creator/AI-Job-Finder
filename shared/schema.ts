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
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  postedDate: true,
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export interface JobWithScore extends Job {
  matchScore?: number;
  matchReason?: string;
}
