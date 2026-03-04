# Legal Tech Careers - For Lawyers Interested in Technology

## Overview

Legal Tech Careers is a career intelligence platform designed for legal professionals transitioning into legal technology. It provides diagnostic career guidance, leverages resume data for market analysis, and offers specialized market intelligence. The platform aims to be a personalized career command center, helping users navigate and succeed in the legal tech industry. Its core vision is to be the leading resource for career advancement and market understanding in legal technology.

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
- **Mobile**: Fully optimized for 375px baseline. Comprehensive truncation audit ensures every `truncate` class has a `title` tooltip. Touch targets meet 44px minimum on key interactive elements. Charts have responsive sizing (smaller containers on mobile). Badge overflow shows "+N more" indicators on mobile to prevent excessive card height.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **API Design**: RESTful

### Data Storage
- **Database**: PostgreSQL (separate instances for dev and production)
- **ORM**: Drizzle ORM

### Authentication
- **Methods**: Custom email/password and Google OAuth 2.0.
- **Session Management**: PostgreSQL-backed sessions.

### AI Integration
- **Capabilities**: Powers Guided Search, Job Categorization, Resume Parsing, Resume-Job Comparison, Conversational Assistant, ATS Resume Review, AI-assisted resume builder, Market Insights Q&A, Career Diagnostic Engine, and per-job fit scoring.
- **Skill Extraction**: AI categorizes `hardSkills` and `softSkills`.
- **Categorization Boundaries**: Explicit rules prevent over-bucketing into Legal Operations and Legal Consulting.

### Payments & Subscription
- **Model**: Freemium SaaS with "Free" and "Pro" tiers.
- **Management**: Stripe Checkout, Billing Portal, and webhooks.

### Role Track Classification
- **System**: Three role tracks (Lawyer-Led / Technical / Ecosystem) classify every job.
- **Mapping**: 13 job categories map to these 3 tracks.

### Analytics & Tracking
- **Authenticated**: Tracks user activities like page views, searches, saves, exports, and upgrades.
- **Anonymous**: Tracks unauthenticated events.

### Job Archiving & Historical Data
- **Permanent Archive**: Archived jobs (`jobStatus='archived'`) cannot be resurrected.
- **Canonical Active-Inventory Filter**: All endpoints displaying active job counts use `isPublished=true, isActive=true, pipelineStatus='ready', jobStatus='open'`.
- **Data Quality Dual Filters**: `/api/stats/data-quality` uses `pipelinePassed` (`pipelineStatus='ready'`) for curation pipeline stats (totalPublished, passRate) and `activeInventory` (canonical 4-filter) for quality scores and market benchmarks (track distribution, companies, countries, entry-to-mid level, salary transparency).
- **Entry-to-Mid Level**: Standardized across platform as `["Entry", "Junior", "Associate", "Intern", "Fellowship", "Mid"]`. Label is "entry-to-mid level" everywhere (MI page, trust page, PDF/DOCX reports, insights endpoint). Frontend falls back to `dataQuality.market.entryAccessiblePct` when seniorityDistribution is restricted (non-Pro).
- **Historical Endpoint**: Returns `totalActive` (not `totalPublished`) to avoid naming collision with data-quality's `totalPublished` (which means pipeline-passed).
- **Country Counts**: Excludes `WW` and `UN` codes everywhere (stats, MI, transition, data-quality, job-density).
- **Cache-Control**: Stats/analytics endpoints set `Cache-Control: no-cache, no-store, must-revalidate`.
- **Unified Stats Caching**: All stats endpoints (`/api/stats`, `/api/stats/data-quality`, `/api/market-intelligence`, `/api/market-pulse`, `/api/stats/social-proof`, `/api/stats/historical`, `/api/stats/job-density`, `/api/insights/market-demand`) share caches in `server/lib/mi-cache.ts`. `clearAllStatsCaches()` invalidates MI cache, DQ cache, and canonical stats together and is called from ALL job mutation paths: routes, data-cleanup, scheduled-scraper, enrichment-worker, reliability-worker.
- **Canonical Stats Snapshot**: `server/lib/mi-cache.ts` stores a single `canonicalStats` object (totalJobs, totalCompanies, totalCountries) with 1hr TTL. Whichever endpoint first computes from SQL sets the snapshot; all other endpoints use that same snapshot. `setCanonicalStats()` is guarded — only the first caller within a TTL window wins, preventing different endpoints from overwriting each other. The MI page frontend also overrides `dataQuality.curation.activeInventory` with `overview.totalJobs` to guarantee the header and curation panel always show the same number.
- **Display Stats Stabilization**: `displayStats` has a 12hr TTL and ratchet-up logic — numbers only increase within the TTL window, never decrease. All public surfaces (landing, MI overview, social proof, jobs) use `displayStats`. Admin can force-refresh via `POST /api/admin/refresh-display-stats` (bypasses ratchet). `forceRefreshDisplayStats()` in mi-cache.ts resets to exact DB counts.

### Skill Normalization
- **SKILLS_SYNONYM_MAP**: Normalizes skill variants.
- **Backfill**: Populates `hard_skills` and `soft_skills` via AI re-categorization.

### Job Curation Pipeline
- **Process**: Two-layer pipeline (ingestion → AI enrichment → trust gate → published inventory) ensures quality, deduplication, and link validation.
- **Company-Type-Aware Quality Gate**: Different thresholds based on company classification (`legal-tech-startup`, `law-firm`, `general-tech`).
- **Title and Role Filters**: Back-office titles and generic business roles are filtered or require higher relevance scores.
- **AI Negative Signal Filter**: Identifies and queues jobs with negative AI signals.
- **Uniform Publishing Gate**: All paths to `isPublished=true` enforce company-type-aware thresholds.
- **Storage-Level Publish Guard**: Enforces relevance ≥ 6 and assigned `roleCategory`.
- **Startup Data Cleanup**: Runs once per version at server startup to unpublish low-relevance jobs, etc.
- **Admin Data Cleanup**: On-demand cleanup via an admin endpoint.
- **Public Job Access**: `getPublicJob` enforces `jobStatus='open'`.
- **Scrapers**: Supports various ATS platforms (Greenhouse, Lever, Ashby, Workday, iCIMS, SmartRecruiters, Workable, BambooHR, Rippling, YC).
- **Automation**: Scheduled workers manage ingestion, scoring, deduplication, and validation.
- **Quality Assurance**: Admin review queue for data integrity.
- **Admin Dashboard**: Provides an overview of scraper runs, source health, and rejection reasons.

### Core Features
- **Landing Page**: Highlights career intelligence and "Check Your Fit" CTA.
- **Career Command Center Dashboard**: Personalized home page for authenticated users.
- **Smart Search**: AI-powered natural language job search.
- **Resume Management & Editing**: Upload, parse, manage multiple resumes, AI editor for tailoring and ATS scoring.
- **Job Matching**: AI-driven resume-job comparison, fit scores, gap analysis.
- **Career Guidance**: Market insights, conversational assistant, personalized path recommendations.
- **Career Diagnostic Engine**: Skill clustering, readiness scoring, transition planning, visualizations.
- **Career Fit Quiz**: Recommends career paths.
- **Market Intelligence Page**: Bloomberg-style terminal with data on market pulse, benchmarks, skills, salary trends, etc.
- **Data Quality & Market Benchmarks Section**: Publicly visible section on curation pipeline stats and market benchmarks.
- **Transition Intelligence API**: Computes lawyer-specific career data.
- **Trust & Methodology Page**: Public page explaining curation process and data integrity.
- **Verified Source Badges**: Job cards show badges for known ATS sources.
- **Platform Freshness**: Displays `lastScrapeRunAt`, `jobsVerifiedLast24h`, `jobsAddedLast7d`.
- **Market Evolution (Free Tier)**: Trend charts with limited history for free users, full history for Pro.
- **Pro Feature Gates**: Backend and frontend checks to gate premium features.

### Data Moat & API Security
- **Rate Limiting**: Tiered limits for unauthenticated and authenticated users.
- **API Key Guard**: Blocks programmatic access without an admin-issued API key.
- **Intelligence Data Restriction**: Aggregate counts for non-Pro users, detailed data requires Pro.
- **Job Detail Truncation**: Unauthenticated users see truncated job descriptions.
- **Attribution Watermarking**: All intelligence API responses include `_attribution`.
- **Anti-Indexing**: `X-Robots-Tag: noindex, nofollow` on API responses.

### Free Tier Limits
- **Smart Search**: 5 guided searches (lifetime).
- **Chat Messages**: 5 per day (resets at midnight).
- **Saved Jobs**: 10 jobs.
- **Diagnostic**: Full role matches visible (titles, companies, fit scores). Strengths/Blockers Pro-only. Weeks 1-2 of 30-day plan visible, Weeks 3-4 locked.
- **Insights Page**: Stat cards + category chart visible. Salary, seniority, skills, employers, AI chat blurred behind ProGate.
- **Alerts Page**: Example alert cards shown. Creating alerts requires Pro.
- **Dashboard**: "New This Week" job cards shown for free users above blurred Pro sections.

### Conversion Engine
- **Job Signup Gate**: Truncated job details for unauthenticated users with signup CTA.
- **View-Count Soft Gate**: Dialog prompts signup after 5 job views.
- **Pro Upgrade Banner**: Persistent banner for free authenticated users.
- **Post-Diagnostic Pro Upsell**: Blurred preview with "Unlock Full Report" CTA.
- **Social Proof Counters**: Displays real data on various pages.
- **LinkedIn Share Cards**: Generates branded SVG image cards via `/api/share/readiness-card.svg` with OG meta tags on `/share/readiness`. Card shows score, fit label, top path, and CTA. Social media crawlers (LinkedIn, Facebook, Twitter, Slack, Discord) are whitelisted in the API guard.

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **Authentication**: Google OAuth 2.0
- **Payments**: Stripe
- **UI Components**: shadcn/ui (built on Radix UI)