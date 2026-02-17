# Legal Tech Careers - For Lawyers Interested in Technology

## Overview

Legal Tech Careers is a freemium SaaS job search platform designed for legal professionals seeking careers in legal technology. It connects legal talent with opportunities at innovating legal tech companies, offering features like guided search, resume analysis, job comparison, and strategic career guidance. The platform aims to be the leading resource for legal professionals transitioning into or advancing within the legal tech industry, focusing on business vision, market potential, and project ambitions to fill a niche in the legal employment market.

## User Preferences

- Preferred communication style: Simple, everyday language
- Design preferences: Clean, minimal, professional. No "AI-Powered" language - keep it approachable for non-technical lawyers
- Color palette: Deep navy/slate (authoritative, trustworthy)
- Typography: Playfair Display serif for headings (elegant, legal feel), DM Sans for body (clean, modern)

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **Styling**: Tailwind CSS with shadcn/ui components (New York style)
- **Theme**: Light/dark mode with a deep navy/slate palette
- **Typography**: Playfair Display (serif headings), DM Sans (body), JetBrains Mono (code)

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **API Design**: RESTful

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Schema**: Centralized, covering jobs, users, sessions, user preferences, job alerts, notifications, and resumes.

### Authentication
- **Methods**: Custom email/password and Google OAuth 2.0.
- **Session Management**: PostgreSQL-backed sessions.

### AI Integration
- **Provider**: OpenAI API
- **Capabilities**: Guided Search, Job Categorization, Resume Parsing, Resume-Job Comparison, Conversational Assistant, ATS Resume Review, AI-assisted resume builder, and Market Insights Q&A.

### Payments & Subscription
- **Provider**: Stripe
- **Configuration**: Uses STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY env vars (preferred), with Replit connector API as fallback. stripeClient.ts handles credential resolution.
- **Product**: "Legal Tech Careers Pro" (prod_TyWsTNJehZTvN8) with monthly ($5, price_1T0Zoa2OnsezISMFIbUjUGoB) and yearly ($30, price_1T0Zob2OnsezISMFgEV5XjCo) prices.
- **Model**: Freemium SaaS with "Free" and "Pro" tiers, offering enhanced AI features, multi-resume management, job alerts, and market insights for Pro users.
- **Management**: Stripe Checkout, Billing Portal, and webhooks.

### Job Curation Pipeline
- **Two-Layer Pipeline**: Raw ingestion → AI enrichment → trust gate → published inventory
- **Pipeline Statuses**: `raw` (newly scraped) → `enriching` (being processed) → `ready` (passed quality gate) or `rejected` (failed quality gate)
- **Batch Scrapers**: Greenhouse API, Lever API, Ashby API, Workday CXS API, and generic HTML career page scrapers
- **Workday CXS Scraper**: Uses public POST `{company}.{instance}.myworkdayjobs.com/wday/cxs/{company}/{site}/jobs` with pagination and individual job detail fetching for full descriptions. Config via `workday` field in `LawFirmConfig`.
- **Global Coverage**: 200+ companies across US, UK, Europe, Asia-Pacific, Canada, Middle East, Africa, and Latin America including legal AI startups, established legal tech companies, AmLaw 200 firms, Magic Circle firms, major international firms, and ALSPs
- **ATS Coverage**: 20 Greenhouse, 8 Lever, 3 Ashby, 3 Workday CXS (Thomson Reuters, Wolters Kluwer, LexisNexis), rest use generic career page scraping
- **Scheduled Scraper** (every 12 hours): Runs `scrapeAllLawFirms()` from `law-firm-scraper.ts` covering all 200+ companies. Includes scrape lock, job validation, 500-job cap, 30% company success threshold for stale detection. On startup, triggers initial scrape if fewer than 100 published jobs exist.
- **Enrichment Worker** (every 2 min): Processes 25 raw jobs - cleans descriptions, extracts experience requirements, categorizes with AI, computes quality scores, auto-publishes jobs scoring 65+ with relevanceConfidence ≥40% and legalRelevanceScore ≥5
- **Reliability Worker** (every 6 hours): Validates apply links for 200 published jobs per cycle with grace period (2 consecutive failures before unpublishing via `linkFailCount`). Also unpublishes stale jobs (45+ days unseen).
- **Title Filter**: Company-type-aware — legal tech startups (`startup`/`tech-legal`) use blocklist-only approach (blocks pure engineering, HR, IT, finance) and lets AI enrichment evaluate everything else. General companies keep strict legal-only filtering.
- **Trust Gate**: Public API only shows jobs with `pipelineStatus='ready'`, `isPublished=true`, `jobStatus='open'`, `isActive=true`
- **Quality Score** (0-100): Based on category (15pts), structured description completeness (38pts: responsibilities 10, skills 8, qualifications 8, transition notes 6, company desc 6), relevance (15pts), apply URL (10pts), raw description length (8pts), experience data (5pts), seniority (5pts), AI summary quality (3pts)
- **Audit Worker** (every 4 hours): Checks published jobs against quality gates, skips jobs with pipelineStatus 'raw' or 'enriching' to avoid interfering with re-enrichment
- **Re-enrichment**: When a job's description changes on re-scrape, pipeline status resets to 'raw' for re-processing
- **Deduplication**: `jobHash` field prevents exact duplicates (company + title + location + applyUrl). `generateFuzzyJobHash` (company + normalized title) catches near-duplicates during enrichment (e.g., "Sr. Analyst" vs "Senior Analyst"). Normalized titles expand abbreviations and strip location/seniority suffixes.
- **API**: Paginated `/api/jobs` endpoint with server-side filtering (category, seniority, location, search)
- **Admin**: `/api/admin/pipeline-stats` shows pipeline health metrics
- **QA Validation System**: Comprehensive publish-blocking QA with persisted results (qaStatus, qaErrors, qaWarnings, lawyerFirstScore, qaExcludeReason, qaCheckedAt columns). Error codes: E_TITLE_MISSING, E_COMPANY_MISSING, E_SUMMARY_SHORT, E_SKILLS_TOO_FEW, E_ROLECATEGORY_EMPTY, E_ENGINEERING_ONLY, E_MINQ_EMPTY. Statuses: passed/needs_review/failed. Lawyer-first scoring (0-100) from title/description keywords.
- **Description Parser**: Deterministic text parser (server/lib/description-parser.ts) extracting summary, responsibilities, qualifications, preferred, skills from raw descriptions using heading/bullet detection.
- **Job Defaults Enforcer**: server/lib/job-defaults.ts ensures all array fields default to [] and string fields to '' to prevent null rendering.
- **Admin Import**: POST /api/admin/jobs/create-draft, POST /api/admin/jobs/bulk-import (CSV/JSON), POST /api/admin/jobs/:id/qa-publish, POST /api/admin/jobs/:id/qa-check, POST /api/admin/jobs/bulk-qa-publish
- **Admin Review Queue**: GET /api/admin/jobs/review-queue with filter param (all/passed/needs_review/failed), uses persisted QA data with fallback to on-the-fly computation
- **Backfill Script**: server/scripts/backfill-qa.ts - backfills defaults, structured descriptions, and QA results for existing published jobs

### Core Features
- **Unified Smart Search**: AI-powered natural language job search with guided queries.
- **Job Categorization**: AI-driven classification into a 3-tier taxonomy.
- **Resume Management**: Upload, parse, and manage multiple resumes.
- **Resume-Job Matching**: AI comparison of resumes against job postings, providing match scores, gap analysis, and recommendations.
- **Job Alerts & Notifications**: Users receive alerts for new matching jobs.
- **Market Insights**: Analytics dashboard with conversational Q&A on job market trends.
- **Conversational Assistant**: Context-aware chat widget for explanations and guidance.
- **User Memory & Persona System**: Tracks user activity for personalized AI interactions.
- **Resume Builder**: Structured resume creation with real-time ATS scoring and AI assistance.
- **Saved Jobs**: Bookmark jobs for later, with expiry reminders.
- **User Dashboard**: Dynamic analytics showing job search activity, trends, and personalized recommendations.
- **Admin Analytics**: Comprehensive dashboard with KPIs, engagement metrics, and user management.
- **Guided Next Step Widget**: Provides a single best action based on user state on job detail pages.
- **Public Job Detail Pages**: Viewable without authentication.
- **Structured Job Descriptions**: AI-extracted and validated job descriptions for quality and consistency, with an admin workflow for approval.
- **Unified Job Comparison**: Consolidated comparison flow on the browse page with quick compare (all users) and deep AI analysis (Pro users).
- **Resume Strategy**: AI-powered recommendations for resume alignment against job postings.
- **Tailor My Resume**: Enhanced AI-powered resume tailoring for Pro users. Auto-extracts bullet points from uploaded resumes with checkbox selection, or manual entry fallback. Rewrites bullets to align with job posting language and keywords.
- **Trust & Freshness**: Source attribution, URL canonicalization, last checked timestamps, job status tracking, and user reporting for job quality.
- **Events Autopilot**: AI-driven discovery of legal tech events from global regions. URLs are verified through: (1) curated known-event URL database, (2) organizer website content matching, (3) HTTP validation. Events without verified URLs are saved but set inactive. Event link validator runs hourly to re-check links.
- **Admin Security**: All admin routes use `isAdminCheck` middleware or inline `storage.isUserAdmin()`. Frontend admin routes use `AdminRoute` component checking `isAdmin` from auth hook, redirecting non-admins to /jobs.
- **Pro Feature Gates**: Backend uses `requirePro` middleware on: ATS review, resume match/tweak/rewrite, job alerts (create), career advisor compare, market insights Q&A, match discussion, resume builder AI/ATS/optimize. Frontend checks `isPro`/`isFree` with upgrade prompts.

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **Authentication**: Google OAuth 2.0
- **Payments**: Stripe
- **UI Components**: shadcn/ui (built on Radix UI)