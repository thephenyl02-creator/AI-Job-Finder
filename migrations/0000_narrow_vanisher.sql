CREATE TABLE "anonymous_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"hashed_ip" varchar(64) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(64) NOT NULL,
	"label" varchar(255) NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "built_resumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"template_id" varchar(50) DEFAULT 'professional',
	"target_job_id" integer,
	"sections" jsonb NOT NULL,
	"ats_score" integer,
	"ats_analysis" jsonb,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "company_intel" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"summary" text,
	"product" text,
	"funding_stage" varchar(100),
	"recent_news" text[],
	"growth_signals" text[],
	"citations" text[],
	"fetched_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "company_intel_company_name_unique" UNIQUE("company_name")
);
--> statement-breakpoint
CREATE TABLE "diagnostic_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"resume_id" integer NOT NULL,
	"resume_hash" varchar(64),
	"overall_readiness_score" integer,
	"top_paths" jsonb,
	"readiness_summary" jsonb,
	"skill_clusters" jsonb,
	"transition_plan" jsonb,
	"brutal_honesty" jsonb,
	"report_json" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "email_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"weekly_digest" boolean DEFAULT true NOT NULL,
	"alert_emails" boolean DEFAULT true NOT NULL,
	"unsubscribe_token" varchar(255),
	"last_digest_sent_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "email_preferences_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "email_preferences_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"organizer" varchar(255) NOT NULL,
	"organizer_logo" varchar(500),
	"event_type" varchar(50) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"location" varchar(255),
	"attendance_type" varchar(50) DEFAULT 'in-person' NOT NULL,
	"virtual_url" varchar(500),
	"description" text NOT NULL,
	"registration_url" varchar(500) NOT NULL,
	"cost" varchar(100),
	"is_free" boolean DEFAULT false,
	"topics" text[],
	"speakers" jsonb,
	"cle_credits" varchar(100),
	"is_active" boolean DEFAULT true,
	"is_featured" boolean DEFAULT false,
	"external_id" varchar(255),
	"source" varchar(50),
	"view_count" integer DEFAULT 0,
	"registration_click_count" integer DEFAULT 0,
	"link_status" varchar(20) DEFAULT 'unchecked',
	"link_last_checked" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "firm_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_name" varchar(255) NOT NULL,
	"career_url" varchar(500) NOT NULL,
	"discovered_portal_url" varchar(500),
	"ats_type" varchar(50) DEFAULT 'unknown',
	"fetch_mode" varchar(50) DEFAULT 'needs_setup',
	"status" varchar(50) DEFAULT 'needs_review',
	"ats_config" jsonb,
	"last_success_at" timestamp,
	"last_error_message" text,
	"job_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "job_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"categories" text[],
	"keywords" text[],
	"seniority_levels" text[],
	"is_remote_only" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"job_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'saved' NOT NULL,
	"notes" text,
	"applied_date" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "job_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_name" varchar(100) NOT NULL,
	"category_icon" varchar(10),
	"subcategories" text[],
	"description" text,
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "job_categories_category_name_unique" UNIQUE("category_name")
);
--> statement-breakpoint
CREATE TABLE "job_fit_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"resume_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"fit_score" integer,
	"skills_match" integer,
	"experience_match" integer,
	"domain_match" integer,
	"seniority_match" integer,
	"strengths" jsonb,
	"gaps" jsonb,
	"evidence" jsonb,
	"recommended_edits" jsonb,
	"ai_intensity" varchar(10),
	"transition_difficulty" varchar(10),
	"one_line_reason" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "job_rejections" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer,
	"source_name" varchar(255),
	"external_id" varchar(500),
	"title" varchar(500),
	"company" varchar(255),
	"reason_code" varchar(50) NOT NULL,
	"reason_message" text,
	"phase" varchar(30) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"reporter_user_id" varchar(255),
	"report_type" varchar(50) NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"admin_notes" text,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "job_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"company" varchar(255) NOT NULL,
	"company_website" varchar(500),
	"location" varchar(255),
	"is_remote" boolean DEFAULT false,
	"salary_range" varchar(100),
	"description" text NOT NULL,
	"apply_url" varchar(500) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"submitted_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"status" varchar(50) DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"company" varchar(255) NOT NULL,
	"company_logo" varchar(500),
	"location" varchar(255),
	"is_remote" boolean DEFAULT false,
	"location_type" varchar(20),
	"location_region" varchar(50),
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" varchar(3),
	"experience_min" integer,
	"experience_max" integer,
	"role_type" varchar(100),
	"description" text NOT NULL,
	"requirements" text,
	"apply_url" varchar(500) NOT NULL,
	"posted_date" timestamp DEFAULT CURRENT_TIMESTAMP,
	"is_active" boolean DEFAULT true,
	"external_id" varchar(255),
	"source" varchar(50),
	"ai_summary" text,
	"key_skills" text[],
	"hard_skills" text[],
	"soft_skills" text[],
	"role_category" varchar(100),
	"role_subcategory" varchar(100),
	"seniority_level" varchar(50),
	"match_keywords" text[],
	"ai_responsibilities" text[],
	"ai_qualifications" text[],
	"ai_nice_to_haves" text[],
	"view_count" integer DEFAULT 0,
	"apply_click_count" integer DEFAULT 0,
	"last_scraped_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"manually_edited" boolean DEFAULT false,
	"edited_by" text,
	"edited_at" timestamp,
	"legal_relevance_score" integer,
	"review_status" varchar(20),
	"description_formatted" boolean DEFAULT false,
	"structured_description" jsonb,
	"is_published" boolean DEFAULT false,
	"structured_status" varchar(20) DEFAULT 'missing',
	"structured_updated_at" timestamp,
	"source_name" varchar(100),
	"source_domain" varchar(255),
	"source_url" varchar(1000),
	"last_checked_at" timestamp,
	"link_fail_count" integer DEFAULT 0,
	"enrichment_retries" integer DEFAULT 0,
	"job_status" varchar(20) DEFAULT 'open',
	"closed_reason" varchar(50),
	"closed_at" timestamp,
	"pipeline_status" varchar(20) DEFAULT 'raw',
	"quality_score" integer,
	"relevance_confidence" integer,
	"review_reason_code" varchar(50),
	"experience_text" varchar(255),
	"secondary_tags" text[],
	"career_track" varchar(100),
	"job_hash" varchar(64),
	"first_seen_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"last_seen_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"last_enriched_at" timestamp,
	"why_this_fits_lawyers" text,
	"qa_status" varchar(20),
	"qa_errors" jsonb,
	"qa_warnings" jsonb,
	"lawyer_first_score" integer,
	"qa_exclude_reason" varchar(255),
	"qa_checked_at" timestamp,
	"country_code" varchar(5),
	"country_name" varchar(100),
	"work_mode" varchar(10),
	"status_changed_at" timestamp,
	"deactivated_at" timestamp,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"alert_id" integer,
	"job_id" integer,
	"title" varchar(255) NOT NULL,
	"message" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "published_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(500) NOT NULL,
	"period" varchar(20) NOT NULL,
	"file_data" "bytea" NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_size" integer NOT NULL,
	"published_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"published_by" varchar(255),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "report_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"report_slug" varchar(100) NOT NULL,
	"downloaded_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"source" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "resume_editor_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"resume_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"mode" varchar(20) DEFAULT 'my' NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"sections" jsonb NOT NULL,
	"suggestions" jsonb,
	"requirement_mapping" jsonb,
	"to_confirm_items" jsonb,
	"ready_to_apply" varchar(20) DEFAULT 'not_yet',
	"improvements_applied" integer DEFAULT 0,
	"needs_confirmation_count" integer DEFAULT 0,
	"missing_requirements_count" integer DEFAULT 0,
	"last_agent_run_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "resume_rewrite_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"job_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"input_hash" text,
	"output_json" jsonb,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"label" varchar(255) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"resume_text" text,
	"extracted_data" jsonb,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"job_id" integer NOT NULL,
	"saved_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"reminder_shown" boolean DEFAULT false,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "scrape_run_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"source_name" varchar(255) NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'success' NOT NULL,
	"jobs_found" integer DEFAULT 0,
	"jobs_filtered" integer DEFAULT 0,
	"jobs_inserted" integer DEFAULT 0,
	"jobs_updated" integer DEFAULT 0,
	"jobs_rejected" integer DEFAULT 0,
	"duration_ms" integer DEFAULT 0,
	"error_code" varchar(100),
	"error_message" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"total_found" integer DEFAULT 0,
	"inserted" integer DEFAULT 0,
	"updated" integer DEFAULT 0,
	"stale_deactivated" integer DEFAULT 0,
	"categorized" integer DEFAULT 0,
	"alerts_triggered" integer DEFAULT 0,
	"broken_links" integer DEFAULT 0,
	"sources_succeeded" integer DEFAULT 0,
	"sources_failed" integer DEFAULT 0,
	"source_details" jsonb,
	"errors" text[],
	"triggered_by" varchar(20) DEFAULT 'scheduler'
);
--> statement-breakpoint
CREATE TABLE "user_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" varchar(255),
	"metadata" jsonb,
	"page_path" varchar(500),
	"session_id" varchar(255),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "user_personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"top_categories" text[],
	"top_skills" text[],
	"preferred_locations" text[],
	"remote_preference" varchar(20),
	"seniority_interest" text[],
	"career_stage" varchar(50),
	"engagement_level" varchar(20),
	"search_patterns" text[],
	"viewed_companies" text[],
	"persona_summary" text,
	"total_job_views" integer DEFAULT 0,
	"total_searches" integer DEFAULT 0,
	"total_apply_clicks" integer DEFAULT 0,
	"last_active_at" timestamp,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"career_intelligence" jsonb,
	"career_intelligence_resume_hash" varchar(64),
	"career_intelligence_generated_at" timestamp,
	CONSTRAINT "user_personas_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"role_preferences" text[],
	"location_preferences" text[],
	"remote_only" boolean DEFAULT false,
	"experience_years" integer,
	"salary_min" integer,
	"salary_max" integer,
	"onboarding_completed" boolean DEFAULT false,
	"current_role" varchar(100),
	"target_role_types" text[],
	"experience_level" varchar(50),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"password" varchar(255),
	"google_id" varchar(255),
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"resume_text" text,
	"resume_filename" varchar(255),
	"extracted_data" jsonb,
	"last_search_query" text,
	"is_admin" boolean DEFAULT false,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"subscription_tier" varchar(50) DEFAULT 'free',
	"subscription_status" varchar(50) DEFAULT 'inactive',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");