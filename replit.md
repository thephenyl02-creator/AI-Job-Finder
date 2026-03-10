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
- **Mobile**: Fully optimized for 375px baseline with comprehensive truncation, accessible touch targets, and responsive charting.

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

### AI Integration
- **Models**: Three high-impact features use `gpt-4o`: Career Diagnostic Engine, Conversational Chat, and Market Insights Q&A. Everything else (search, resume parsing, resume builder, job categorization, description extraction, scraping) uses `gpt-4o-mini` for cost efficiency.
- **Capabilities**: Powers Guided Search, Job Categorization, Resume Parsing, Resume-Job Comparison, Conversational Assistant, ATS Resume Review, AI-assisted resume builder, Market Insights Q&A, Career Diagnostic Engine, and per-job fit scoring.
- **Skill Extraction**: AI categorizes `hardSkills` and `softSkills`. The `WORKER_SAFE_KEYS` allowlist in `storage.ts` must include both fields for persistence.
- **Categorization Boundaries**: Explicit rules prevent over-bucketing into Legal Operations and Legal Consulting. Appian/Celonis generic roles (no legal mention in description) have `legalRelevanceScore` reduced to 5 to prevent auto-publishing by the audit worker.

### Payments & Subscription
- **Model**: Freemium SaaS with "Free" and "Pro" tiers.
- **Management**: Stripe Checkout, Billing Portal, and webhooks.

### Role Track Classification
- **System**: Three role tracks (Lawyer-Led / Technical / Ecosystem) classify every job, mapped from 13 job categories.

### Analytics & Tracking
- **User Activity**: Tracks authenticated user actions and anonymous events. Job views are tracked via `entity_id` column in `user_activities` (not in metadata JSON). The `getRecentlyViewedJobs` query joins on `entity_id::int = j.id`. Streak calculations use `created_at` column.
- **Cache Management**: Extensive caching with specific TTLs and invalidation strategies for various statistical data to ensure performance and data consistency.
- **Display Stats Persistence**: `displayStats` (24hr TTL, ratchet-up-only logic) is persisted to `platform_settings` DB table, surviving deployments. Loaded on startup via `loadDisplayStatsFromDB()`. All public-facing endpoints (`/api/stats`, `/api/stats/social-proof`, `/api/job-density`, `/api/stats/data-quality`, `/api/jobs`, `/api/market-pulse`) use displayStats for consistent counts.
- **Publish Guard**: Company-type-aware relevance thresholds (startup≥6, general-tech≥7, law-firm≥8) via `server/lib/quality-thresholds.ts`.
- **Stuck-Job Recovery**: Retry cap of 3 via `enrichmentRetries` column; permanently failed jobs get `pipelineStatus='failed'`.
- **Link Validation**: Two validation systems exist: (1) Reliability worker (every 6h) with two-strike rule and reason codes, (2) Continuous validator in `scheduled-scraper.ts` also using two-strike logic. Both use proper User-Agent headers and treat 403 as alive (ATS platforms often block bots). 403 responses in reliability worker are inspected for dead-link signals (small body, "not found" phrases); two consecutive soft failures unpublish.
- **Audit Worker Scoping**: The `runLiveJobAudit()` worker (every 4h) applies hard checks (title/company reject, duplicates) to ALL published jobs, but soft quality checks (generic role, AI signals, relevance/quality scores) ONLY to jobs published within the last 7 days. Admin-approved jobs are fully skipped. This prevents a "death spiral" of marginal jobs being repeatedly re-audited and eventually unpublished. Cleanup version `v6_recover_overculled_jobs` recovers previously over-culled jobs.

### Job Curation Pipeline
- **Process**: A two-layer pipeline (ingestion → AI enrichment → trust gate → published inventory) ensures quality, deduplication, and link validation.
- **Quality Gates**: Company-type-aware thresholds and AI negative signal filters ensure high data quality.
- **Scrapers**: Supports various ATS platforms (Greenhouse, Lever, Ashby, Workday, iCIMS, UltiPro, ViRecruit, SmartRecruiters, BambooHR, Rippling, Workable, etc.) with multi-region capabilities and ATS auto-detection. iCIMS scraper uses `in_iframe=1` for search + paginated deep-scrape of job descriptions. UltiPro uses POST API (`LoadSearchResults`) + HTML detail page fallback. ViRecruit parses ASP.NET WebForms grid rows. Companies with multiple ATS sources (e.g., Husch Blackwell has both UltiPro + ViRecruit) merge results with title-based deduplication. Expanded keyword coverage for Legal Transformation, Legal Innovation, Legal Project Management, Legal Data & Analytics, Legal Automation, Legal Workflow, AI Governance, emerging AI + Legal roles, and counsel-specific titles (Product Counsel, Technology Counsel, Commercial Counsel).
- **Global Coverage**: Gathers data from 410+ companies across US, UK, EU, APAC.
- **Automation & QA**: Scheduled workers manage ingestion, scoring, deduplication, and validation, supported by an admin review queue and dashboard.

### Core Features
- **Landing Page**: 3-section design inspired by Claude.ai. Section 1: Hero with headline, CTA, trust signals, live intelligence ticker (cycles real data from `/api/market-pulse`, `/api/stats`, `/api/job-density` every 3s), and a floating animated composition showing the user journey (5 panels: resume parsing → readiness score → job matches → tailor notification → apply badge, sequentially animated via IntersectionObserver, plays once and holds). Section 2: Company marquee (15s normal, 30s reduced-motion) + career path floating badges on dotted grid. Section 3: Final CTA with journey step icons (Profile → Path → Jobs → Tailor → Apply). Removed: social proof strip, stats strip, How It Works walkthrough, standalone career paths, global coverage section, Free vs Pro comparison.
- **Company Logo System**: All company logos use the shared `CompanyLogo` component (`client/src/components/company-logo.tsx`) with three sizes: `xs` (20px, inline), `sm` (36-40px, cards/marquee), `md` (40-48px, job cards). Server-side favicon proxy (`/api/company-logo?domain=X`) uses a two-tier fallback: Google Favicon API first, then direct `/favicon.ico` fetch. Caches successes for 1 week and 404 failures for 1 hour. Frontend `COMPANY_DOMAINS` map ensures accurate domain resolution for 460+ known companies (covering all firms in `law-firms-list.ts` plus production-only companies). Fallback shows colored initials with smooth opacity transition when favicon loads.
- **Career Command Center Dashboard**: Personalized dashboard for authenticated users.
- **Smart Search**: AI-powered natural language job search.
- **Resume Management & Editing**: Upload, parse, and AI-assisted editing of resumes.
- **Job Matching**: AI-driven resume-job comparison and fit scoring.
- **Career Guidance**: Market insights, conversational assistant, and personalized recommendations.
- **Career Diagnostic Engine**: Skill clustering, readiness scoring, and transition planning.
- **Career Progress Card**: Dashboard card showing readiness score history (sparkline for 2+ reports), retake prompts after 30 days, and score delta tracking. Uses existing `diagnostic_reports` table via `/api/career-progress` endpoint.
- **Company Intelligence Pages**: Public, SEO-optimized company directory (`/companies`) and individual profile pages (`/companies/:slug`). Directory shows companies with 3+ active listings, paginated and searchable. Profiles aggregate job categories, seniority distribution, top skills, work mode, and active listings with a conversion CTA to the diagnostic. Includes Schema.org JSON-LD structured data (`Organization` + `JobPosting`) for SEO.
- **Market Intelligence Page**: Bloomberg-style terminal for market data. Includes AI Intensity by Career Path (stacked bars showing Low/Med/High per category), Category Growth Trends (line chart from `categoryByMonth` historical data), and Tools by Career Path (Pro-gated grid showing top 5 legal tech tools per category from `KNOWN_LEGAL_TOOLS` set matched against `hardSkills` with `keySkills` fallback). Salary stats require both `salary_min` AND `salary_max` to be present (prevents min>max anomalies). "New this week" metric uses progressive fallback: 7d → 14d → 30d window. Geography treats `WW` country code as "Global / Remote" instead of excluding it.
- **Data Quality & Market Benchmarks**: Public section on curation process and data integrity.

### Engagement Features
- **Job Tracking**: Recently viewed jobs, "New Since Last Visit" notifications, and a Smart Daily Briefing.
- **Application Pipeline Tracker**: Comprehensive tool for managing job applications.
- **Peer Activity Signals**: Displays view and save counts for jobs.
- **Email Digests**: Personalized weekly digests and alert emails with branded templates.

### Data Moat & API Security
- **Access Control**: Tiered rate limiting, API key guard, and intelligence data restrictions for non-Pro users.
- **Data Truncation**: Unauthenticated users see truncated job descriptions.
- **Attribution**: All intelligence API responses include `_attribution`.
- **Anti-Indexing**: API responses are marked `noindex, nofollow`.
- **Security Headers**: X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, Permissions-Policy, HSTS (production only).

### Free Tier Limits
- **Feature Restrictions**: Limits on guided searches, chat messages, saved jobs, diagnostic report details, and market insights access to drive Pro conversions.

### Conversion Engine
- **Strategic CTAs**: Signup gates, view-count soft gates, Pro upgrade banners, and post-diagnostic upsells.
- **Diagnostic Free Tier Tightening**: Free users see readiness score but NOT career path names (locked with icon). Skill gap teasers show top 2 gaps. Urgency CTA shows "X new this week" from market pulse data. Salary teaser shows range for top path without revealing path name.
- **Post-Diagnostic Engagement**: "While you're here" section below ProGate offers 3 free actions (browse roles, save roles, explore market trends) to keep users engaged even without upgrading.
- **Salary Estimation**: `server/lib/salary-estimator.ts` calculates median salary benchmarks by category/seniority. API endpoint `/api/salary-ranges` serves aggregated data. Jobs missing real salary show "~$Xk–$Yk est." badges on job cards and detail pages.
- **Social Proof**: Displays real data counters.
- **Shareable Content**: Generates branded SVG image cards for social media sharing.

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **Authentication**: Google OAuth 2.0
- **Payments**: Stripe
- **UI Components**: shadcn/ui (built on Radix UI)