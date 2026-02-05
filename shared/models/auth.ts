import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, text, integer, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  resumeText: text("resume_text"),
  resumeFilename: varchar("resume_filename", { length: 255 }),
  extractedData: jsonb("extracted_data"),
  lastSearchQuery: text("last_search_query"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User preferences for auto-save search criteria
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  rolePreferences: text("role_preferences").array(),
  locationPreferences: text("location_preferences").array(),
  remoteOnly: boolean("remote_only").default(false),
  experienceYears: integer("experience_years"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  updatedAt: true,
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

// Resume extracted data type
export interface ResumeExtractedData {
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  totalYearsExperience?: number;
  skills?: string[];
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  preferredRoles?: string[];
  preferredLocations?: string[];
  desiredSalary?: { min: number; max: number };
  isOpenToRemote?: boolean;
  legalBackground?: boolean;
  techBackground?: boolean;
}
