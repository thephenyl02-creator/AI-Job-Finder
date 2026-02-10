# Legal Tech Careers - For Lawyers Interested in Technology

## Overview

A freemium SaaS job search platform specifically designed for legal professionals (attorneys, paralegals, etc.) seeking careers in legal technology. Its primary goal is to connect legal talent with opportunities at companies innovating in legal tech, offering features like guided search, resume analysis, job comparison tools, and strategic career guidance. The platform aims to be the leading resource for legal professionals transitioning into or advancing within the legal tech industry.

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
- **Schema**: Centralized in `shared/schema.ts`, covering jobs, users, sessions, user preferences, job alerts, notifications, and resumes.

### Authentication
- **Methods**: Custom email/password and Google OAuth 2.0.
- **Session Management**: PostgreSQL-backed sessions.

### AI Integration
- **Provider**: OpenAI API
- **Capabilities**: Guided Search (multi-step, clarifying questions, semantic search), Job Categorization (taxonomy, skill extraction, summaries), Resume Parsing, Resume-Job Comparison, Conversational Assistant, ATS Resume Review, AI-assisted resume builder, and Market Insights Q&A.

### Payments & Subscription
- **Provider**: Stripe
- **Model**: Freemium SaaS with "Free" and "Pro" tiers. Pro offers enhanced AI features, multi-resume management, job alerts, and market insights.
- **Management**: Stripe Checkout for purchases, Stripe Billing Portal for subscription management, and webhooks for status updates.

### Core Features
- **Unified Smart Search**: AI-powered natural language job search with guided queries (7 free trials server-enforced, unlimited for Pro).
- **Job Categorization**: AI-driven classification of job postings into a 3-tier taxonomy.
- **Resume Management**: Upload, parse, and manage multiple resumes (Pro-only for multiple).
- **Resume-Job Matching**: AI comparison of resumes against job postings, providing match scores, gap analysis, and recommendations (Pro-only).
- **Career Advisor**: AI-powered guidance for comparing job opportunities (Pro-only).
- **Job Alerts & Notifications**: Users receive alerts for new matching jobs (Pro-only).
- **Market Insights**: Analytics dashboard with conversational Q&A on job market trends (Pro-only).
- **Conversational Assistant**: Context-aware chat widget offering explanations, guidance, and recommendations.
- **User Memory & Persona System**: Tracks user activity to build behavioral personas for personalized AI interactions.
- **Resume Builder**: Structured resume creation with real-time ATS scoring and AI assistance (Pro-only for advanced features).
- **Saved Jobs**: Bookmark jobs for later, with expiry reminders on login for older postings to encourage timely applications.
- **User Dashboard** (`/dashboard`): Dynamic analytics showing job search activity metrics, daily activity trends, streak tracking, top categories/companies explored, search readiness score, market alignment, career profile, and personalized next-step recommendations.
- **Admin Analytics** (`/admin/analytics`): Comprehensive admin dashboard with KPIs, engagement metrics, feature adoption, user cohorts, top content, user list, and conversion funnel.
- **Guided Next Step Widget**: `NextStepCard` component on job detail pages dynamically shows the single best next action based on user state: Sign In (logged out), Upload Resume (no resume), View Alignment Strategy (free with match), Rewrite Selected Lines (Pro with match), or stretch-role messaging (match <35%). Reduces decision fatigue by guiding users through the Browse → Upload → Match → Strategy → Rewrite pipeline.
- **Legal Pages**: Terms of Service (`/terms`) and Privacy Policy (`/privacy`) with footer links on landing page.

## Deployment

- **Self-hosting guide**: See `DEPLOYMENT.md` for complete step-by-step instructions
- **Environment template**: See `.env.example` for all required variables
- **Extraction-ready**: The codebase is fully portable - no Replit-specific dependencies required for production
- **Key env vars**: `DATABASE_URL`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `SESSION_SECRET`, `APP_URL`

### Scraper Architecture
- **Shared Utilities**: `server/lib/html-utils.ts` contains the single canonical `stripHtml()` and `isRelevantRole()` functions used by all scrapers.
- **Smart Upsert**: `upsertJobByExternalId` preserves AI-enriched fields (roleCategory, keySkills, aiSummary, etc.) on re-scrape and rejects description updates that are empty or significantly shorter than existing content.
- **Stale Job Detection**: After scheduled scrapes, jobs from scraped sources that no longer appear in API results are automatically deactivated.
- **Lever Description Fix**: Lever scrapers use HTML description (with paragraphs/lists) instead of `descriptionPlain` (flat text) for better formatting.
- **Freshness Tracking**: `lastScrapedAt` timestamp on jobs tracks when each job was last refreshed by a scraper.
- **Description Cleaning**: `fixMissingSentenceSpaces()` in `html-utils.ts` fixes jammed sentences (e.g., "work.Our" → "work. Our") at the storage layer, so all paths through `createJob`/`updateJob`/`upsertJobByExternalId` are covered. Client-side `normalizeFlatText()` in `job-detail.tsx` serves as an additional safety net.
- **Client-Side Normalization**: `job-detail.tsx` contains `normalizeFlatText()` which fixes remaining flat-text descriptions at render time (ALL-CAPS heading detection, inline bullet splitting, sentence-boundary paragraphing).
- **Autopilot Pipeline**: The scheduled scraper (`runScheduledScrape`) runs a 7-phase pipeline: (1) Scrape sources with retry, (2) Smart upsert to DB, (3) Stale job detection, (4) AI categorization of uncategorized jobs, (5) Alert matching for new jobs, (6) Link validation, (7) Run recording to `scrape_runs` table.
- **Scrape Run Tracking**: `scrape_runs` table records every run with timestamps, duration, counts (found/inserted/updated/categorized/alerts), source details, errors, and trigger source (scheduler/manual).
- **Admin Dashboard**: `/admin/scraper` page shows real-time scraper status, run history, health metrics, source breakdown, cumulative stats, and manual controls (start/stop/run-now).

### Structured Job Descriptions & Quality Gate
- **AI Extraction**: `server/lib/description-extractor.ts` uses GPT-4o-mini to parse raw job descriptions into a uniform JSON format: summary (max 350 chars), aboutCompany, responsibilities, minimumQualifications, preferredQualifications, skillsRequired, seniority, legalTechCategory, aiRelevanceScore, lawyerTransitionFriendly, lawyerTransitionNotes.
- **Quality Gate**: Jobs must have complete structured descriptions and be explicitly approved before becoming visible to users. Three new DB columns: `isPublished` (boolean), `structuredStatus` (missing|generated|edited|approved), `structuredUpdatedAt`.
- **Validation**: `validateStructuredDescription()` enforces minimum thresholds: summary present, 4+ responsibilities, 3+ min qualifications, 6+ skills, seniority & category set.
- **Publishing Workflow**: missing → generated (AI) → edited (admin optional) → approved (passes validation) → published (visible to users).
- **Admin Standardization Queue**: `AdminStandardizationQueue` component (`client/src/components/admin-standardization-queue.tsx`) provides generate/approve/publish/unpublish buttons per job, quality checklist, status filter counters, and bulk publish.
- **API Endpoints**: `GET /api/admin/standardization-queue`, `POST /api/admin/jobs/:id/generate-structured`, `POST /api/admin/jobs/:id/validate-structured`, `POST /api/admin/jobs/:id/approve`, `POST /api/admin/jobs/:id/publish`, `POST /api/admin/jobs/:id/unpublish`, `POST /api/admin/jobs/bulk-publish`.
- **Frontend Gating**: `/api/jobs` only returns published jobs. Job detail page shows "Being Standardized" message for unpublished jobs.
- **Data Storage**: `structuredDescription` JSONB column on jobs table (type `StructuredDescription` in schema).
- **Rendering**: `StructuredDescriptionView` component displays summary, 5 sections with icons, metadata badges (seniority, category, AI relevance, lawyer-friendly), and lawyer transition notes. Falls back to raw description if unavailable.
- **Admin Editing**: Admin edit dialog includes a collapsible "Structured Sections" panel where admins can edit each section individually (one item per line for list fields).

### Unified Job Comparison
- **Single Flow**: Job comparison is consolidated into the browse page (`/jobs`). Users select jobs with checkboxes, then open a side-by-side comparison table.
- **Quick Compare**: Available to all users - side-by-side table showing company, location, salary, level, legal fit, and key skills.
- **Deep Analysis (Pro)**: Pro users can click "Deep Analysis" to get AI-powered career analysis including overall strategy, best fit now/long-term/biggest shift recommendations, transition difficulty, pros/cons, transferable skills, and resume fit scoring.
- **Career Advisor**: The standalone `/career-advisor` page has been removed. Its API endpoint (`/api/career-advisor/compare`) is reused by the unified comparison flow.

### Resume Strategy (All Users)
- **Purpose**: AI-powered structured recommendations analyzing a user's resume against a specific job posting. Provides strategic guidance on what to emphasize, reorder, and add specificity — without rewriting any content.
- **Backend**: `server/lib/resume-strategy.ts` uses `computeStrategy()` with GPT-4o-mini to generate topStrengths, keyGaps, reorderSuggestions, emphasisSuggestions, and addSpecificityPrompts.
- **API Endpoint**: `POST /api/resume/strategy-for-job` with auth gating, primary resume lookup, and job structured description validation.
- **Frontend**: `ResumeStrategyDialog` component accessible from the "Improve your application" section on job detail page. Shows 5 categorized sections with icons and numbered items.

### Rewrite Selected Lines (Pro)
- **Purpose**: AI-powered bullet point rewriting that reframes existing resume experience to match a specific job posting's language and keywords, while preserving truthful experience. Trust line: "We rewrite for alignment, not exaggeration."
- **Backend**: `server/lib/resume-rewrite.ts` extracts job signals from structured descriptions and sends them with user bullets to GPT-4o-mini. Preserves already-aligned bullets unchanged with explanation.
- **API Endpoint**: `POST /api/resume/rewrite-for-job` with Pro gating, Zod validation (1-10 bullets, 5-500 chars each), 5/day rate limit per user.
- **Tracking**: `resume_rewrite_runs` table logs every run with userId, jobId, input hash, output JSON, status, and error messages.
- **Frontend**: `ResumeRewriteDialog` component accessible from the "Improve your application" section on job detail page. Shows original vs rewritten bullets with matched keywords, improvement notes, suggested skills, and overall tips. Includes copy-to-clipboard and trust line.
- **UX Flow**: Job detail page shows two-card "Improve your application" section only after resume upload + match results exist. Strategy card (Compass icon) and Rewrite card (PenLine icon, Pro-gated) are visually distinct with separate messaging. Upload CTA shown for users without resumes.

### Events Autopilot
- **Event Discovery Pipeline**: `server/lib/event-scraper.ts` uses OpenAI to discover real legal tech events from 5 global regions: North America, Europe, Asia-Pacific, Global Virtual, and Middle East/Africa/Latin America.
- **Scheduling**: Runs automatically every 7 days on startup (30s delay for initial run). Uses `startEventScheduler()` from `event-scraper.ts`.
- **Deduplication**: Events are upserted by `externalId` (MD5 hash of title+organizer+date) via `upsertEventByExternalId` in storage.
- **Auto-cleanup**: Past events are automatically deactivated after each discovery run.
- **Admin Controls**: `POST /api/admin/events/refresh` triggers manual discovery. `GET /api/admin/events/scraper-status` shows scheduler status.

## External Dependencies

- **Database**: PostgreSQL (any provider - local, Neon, Supabase, AWS RDS, etc.)
- **AI Services**: OpenAI API (standard `OPENAI_API_KEY`)
- **Authentication**: Custom email/password + optional Google OAuth 2.0
- **Payments**: Stripe (standard SDK with `STRIPE_SECRET_KEY`)
- **UI Components**: shadcn/ui (built on Radix UI)