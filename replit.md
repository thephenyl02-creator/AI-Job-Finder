# Legal Tech Careers - For Lawyers Interested in Technology

## Overview

Legal Tech Careers is a career intelligence platform designed for legal professionals transitioning into legal technology. It functions as a career intelligence hub, providing personalized insights and tools rather than just a job board. Its core purpose is to offer diagnostic career guidance, leverage resume data for market analysis, and differentiate itself through specialized market intelligence. The platform aims to be a personalized career command center for logged-in users, helping them navigate and succeed in the legal tech industry. The project's vision is to be the go-to resource for career advancement in legal technology, offering a robust ecosystem for professional growth and market understanding.

## User Preferences

- Preferred communication style: Simple, everyday language
- Design preferences: Clean, minimal, professional. No "AI-Powered" language - keep it approachable for non-technical lawyers
- Color palette: Deep navy/slate base (authoritative, trustworthy) — navy `--primary` is the brand color throughout, matching the logo identity. No separate brand accent color.
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

### Authentication
- **Methods**: Custom email/password and Google OAuth 2.0.
- **Session Management**: PostgreSQL-backed sessions.
- **Unified Auth Response**: A single endpoint `/api/auth/user` provides comprehensive user state, including `isAdmin`, `subscriptionTier`, and `isPro`.

### AI Integration
- **Capabilities**: Powers Guided Search, Job Categorization, Resume Parsing, Resume-Job Comparison, Conversational Assistant, ATS Resume Review, AI-assisted resume builder, Market Insights Q&A, Career Diagnostic Engine (skill clustering, readiness scoring, transition planning), and per-job fit scoring.

### Payments & Subscription
- **Model**: Freemium SaaS with "Free" and "Pro" tiers, offering enhanced AI features, multi-resume management, job alerts, and market insights for Pro users.
- **Management**: Stripe Checkout, Billing Portal, and webhooks.

### Role Track Classification
- **System**: Three role tracks (Lawyer-Led / Technical / Ecosystem) classify every job by relevance to lawyers.
- **Mapping**: 13 job categories map to 3 tracks. Lawyer-Led (Legal Ops, Compliance, Contracts, Product Mgmt, In-House, Consulting, Knowledge Mgmt, Policy, IP), Technical (Engineering, AI & Analytics, Litigation), Ecosystem (Sales & Client Solutions).
- **Constants**: `ROLE_TRACKS`, `CATEGORY_TO_TRACK`, `getTrackForCategory()` in `shared/schema.ts`.
- **Pipeline**: Enrichment worker auto-assigns `careerTrack` after categorization. Backfill runs on startup for any jobs with NULL `career_track`.
- **UI**: Category badges are color-coded by track (navy = Lawyer-Led, blue = Technical, teal = Ecosystem). Track filter pills on jobs page (desktop pills + mobile dropdown).
- **API**: `/api/jobs?track=Lawyer-Led` filters by track.

### Analytics & Tracking
- **Authenticated**: `useActivityTracker` hook → `POST /api/activities` → `user_activities` table. Tracks page views, searches, saves, exports, diagnostics, upgrades across all major pages.
- **Anonymous**: `POST /api/track` → `anonymous_events` table. Whitelisted events: `landing_page_view`, `pricing_page_view`, `landing_cta_click`, `quiz_completion`, `anon_diagnostic_upload`.
- **Coverage**: All user-facing pages fire `page_view` on mount. Key conversion events: `upgrade_click`, `job_save`, `job_card_click`, `diagnostic_complete`, `diagnostic_share`, `quiz_complete`, `mi_report_download`, `resume_export`, `map_country_click`.

### Job Archiving & Historical Data
- **Soft Archive**: Admin "delete" sets `jobStatus='archived'`, `isActive=false`, `isPublished=false` with timestamps — no data destruction.
- **Timestamps**: `statusChangedAt` (any state change), `deactivatedAt` (when deactivated), `publishedAt` (when published), `closedAt` (when closed/archived). Set automatically by storage layer, reliability worker, and deactivation logic.
- **Historical API**: `GET /api/stats/historical` returns `totalEverScraped`, `totalPublished`, `totalArchived`, `jobsByMonth`, `categoryByMonth`.

### Job Curation Pipeline
- **Process**: A two-layer pipeline (raw ingestion → AI enrichment → trust gate → published inventory) ensures job quality, deduplication, and link validation.
- **Scrapers**: Utilizes various APIs (Greenhouse, Lever, Ashby, Workday CXS) and generic HTML scrapers for broad job coverage across global regions.
- **Automation**: Scheduled scrapers, enrichment workers, and reliability workers manage job ingestion, quality scoring, deduplication, and link validation.
- **Quality Assurance**: A comprehensive QA validation system with persisted results and an admin review queue ensures high data integrity.

### Core Features
- **Landing Page**: Focused on career intelligence positioning, featuring a diagnostic preview and "Check Your Fit" as the primary call to action.
- **Career Command Center Dashboard**: Personalized home page for authenticated users, displaying a career snapshot, weekly action feed, saved jobs, and market pulse.
- **Market Pulse API**: Aggregates and provides real-time market statistics based on published job data.
- **Smart Search**: AI-powered natural language job search.
- **Resume Management & Editing**: Allows users to upload, parse, manage multiple resumes, and use an AI-powered editor for job tailoring and real-time ATS scoring.
- **Job Matching**: AI-driven comparison of resumes against job postings, providing match scores and gap analysis.
- **Career Guidance**: Includes a market insights dashboard, conversational assistant, and personalized path recommendations.
- **Career Diagnostic Engine**: Provides skill clustering, readiness scoring, transition planning, and career path visualizations. It offers an anonymous preview mode and percentile benchmarking. Uses the standard site theme (light/dark) with data-dense layout utilities (`.diag-metric` for monospaced numbers, `.diag-label` for uppercase labels, `.diag-section-title` for section headers, `.diag-divider` for gradient rules). Cards use shadcn `Card` components with colored left accent borders.
- **Career Fit Quiz**: A lightweight alternative to resume upload, recommending career paths based on a 4-question quiz, funneling users towards the full diagnostic.
- **Per-Job Fit Scoring**: AI-computed fit scores (skills/experience/domain/seniority breakdown) displayed on job cards.
- **Career Intelligence Header**: On job pages, displays readiness score and top path or prompts diagnostic/resume upload.
- **Job Alerts & Notifications**: Users receive alerts for new matching jobs.
- **Events**: A curated listing of real, verified legal tech events.
- **Opportunity Map**: An interactive global map displaying job density by country.
- **SEO**: Dynamic meta tags, `JobPosting` JSON-LD, and an XML sitemap.
- **Market Intelligence Page**: A public, Bloomberg-style data report aggregating published job data, with various metrics, charts, and downloadable PDF reports. Pro users download PDF reports generated on-the-fly from live market data via `GET /api/market-intelligence/report?period=weekly|monthly|annual`. Admin can also download editable Word (.docx) drafts for reference via `GET /api/admin/market-intelligence/docx`. Free/anonymous users see an upgrade prompt linking to `/pricing`. The page data itself remains publicly viewable. OG meta tags set dynamically for LinkedIn sharing.
- **Pro Feature Gates**: Backend and frontend checks to gate premium features, with upgrade prompts for Free users.

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **Authentication**: Google OAuth 2.0
- **Payments**: Stripe
- **UI Components**: shadcn/ui (built on Radix UI)