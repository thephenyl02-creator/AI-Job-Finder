# Legal Tech Careers - For Lawyers Interested in Technology

## Overview

Legal Tech Careers is a career intelligence platform designed for legal professionals transitioning into legal technology. It serves as a comprehensive hub for diagnostic career guidance, leveraging resume data for market analysis, and offering specialized market intelligence. The platform aims to be a personalized career command center, helping users navigate and succeed in the legal tech industry. Its core vision is to be the leading resource for career advancement and market understanding in legal technology.

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
- **Mobile**: Fully optimized for 375px baseline. All pages use `sm:` (640px+) Tailwind prefix for desktop upgrades. Touch targets min 44px. No horizontal overflow on any page.

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
- **Unified Auth Response**: `/api/auth/user` endpoint provides user state including `isAdmin`, `subscriptionTier`, and `isPro`.

### AI Integration
- **Capabilities**: Powers Guided Search, Job Categorization, Resume Parsing, Resume-Job Comparison, Conversational Assistant, ATS Resume Review, AI-assisted resume builder, Market Insights Q&A, Career Diagnostic Engine (skill clustering, readiness scoring, transition planning), and per-job fit scoring.
- **Skill Extraction**: AI categorizes `hardSkills` (specific tools/platforms) and `softSkills` (specific professional applications).
- **Categorization Boundaries**: Explicit rules prevent over-bucketing into Legal Operations and Legal Consulting.

### Payments & Subscription
- **Model**: Freemium SaaS with "Free" and "Pro" tiers.
- **Management**: Stripe Checkout, Billing Portal, and webhooks.

### Role Track Classification
- **System**: Three role tracks (Lawyer-Led / Technical / Ecosystem) classify every job.
- **Mapping**: 13 job categories map to these 3 tracks.
- **UI**: Category badges are color-coded by track. Track filter pills on jobs page.

### Analytics & Tracking
- **Authenticated**: Tracks user activities like page views, searches, saves, exports, and upgrades.
- **Anonymous**: Tracks unauthenticated events such as landing page views and quiz completions.

### Job Archiving & Historical Data
- **Soft Archive**: Jobs are soft-deleted by setting `jobStatus='archived'` and related flags.
- **Historical API**: `GET /api/stats/historical` provides aggregated historical job data, including monthly breakdowns.
- **Market Evolution UI**: Displays job volume and skill trajectory over time using Recharts.

### Skill Normalization
- **SKILLS_SYNONYM_MAP**: Normalizes skill variants for consistent data analysis.
- **Backfill**: Populates `hard_skills` and `soft_skills` arrays via AI re-categorization for enhanced Market Intelligence.

### Job Curation Pipeline
- **Process**: A two-layer pipeline (ingestion → AI enrichment → trust gate → published inventory) ensures quality, deduplication, and link validation.
- **Company-Type-Aware Quality Gate**: Different thresholds based on company classification:
  - `legal-tech-startup` (startup/alsp/tech-legal types): minRelevance=6, qualityThreshold=35 — most roles are relevant
  - `law-firm` (biglaw type): minRelevance=8, qualityThreshold=40 — only legal tech/innovation roles
  - `general-tech` (company type): minRelevance=7, qualityThreshold=40 — only legal-product-connected roles
- **Back-Office Title Filter**: Titles like "Procurement", "Payroll", "Receptionist", "SEM Specialist" go to review queue regardless of company, unless they have legal title signals.
- **No Auto-Boost**: AI relevance scores stand as-is. Previously, legal tech company jobs were auto-boosted to score 6.
- **Scrapers**: Greenhouse, Lever, Ashby, Workday, iCIMS (JSON API + RSS fallback), SmartRecruiters, Workable, BambooHR, Rippling, YC auto-discovery.
- **Automation**: Scheduled workers manage ingestion, scoring, deduplication, and validation. Live job audit runs every 4 hours with same company-type thresholds.
- **Quality Assurance**: A QA validation system with an admin review queue maintains data integrity.
- **Admin Dashboard**: Provides an overview of scraper runs, source health, and rejection reasons.

### Core Features
- **Landing Page**: Highlights career intelligence and a "Check Your Fit" call to action.
- **Career Command Center Dashboard**: Personalized home page for authenticated users with career snapshot, action feed, saved jobs, and market pulse.
- **Smart Search**: AI-powered natural language job search.
- **Resume Management & Editing**: Upload, parse, manage multiple resumes, and use an AI-powered editor for tailoring and ATS scoring.
- **Job Matching**: AI-driven comparison of resumes against job postings, providing fit scores and gap analysis.
- **Career Guidance**: Market insights dashboard, conversational assistant, and personalized path recommendations.
- **Career Diagnostic Engine**: Offers skill clustering, readiness scoring, transition planning, and career path visualizations.
- **Career Fit Quiz**: Recommends career paths based on a short quiz.
- **Market Intelligence Page**: A Bloomberg-style career intelligence terminal with data-dense panels on market pulse, skill bridging, entry corridors, skills in demand, salary trends, work mode, AI intensity, seniority, companies, geography, and transition-friendly employers.
- **Transition Intelligence API**: Computes lawyer-specific career data including track summaries, entry corridors, skill bridge, and regional intelligence.
- **Pro Feature Gates**: Backend and frontend checks to gate premium features for Pro users.

### Data Moat & API Security
- **Rate Limiting**: `express-rate-limit` with tiered limits — Global: 100/min unauth, 300/min auth. Intelligence: 10/min unauth, 60/min auth. Jobs: 30/min unauth, 120/min auth.
- **API Key Guard**: Blocks programmatic/bot access to `/api/` without admin-issued API key. Browser users pass freely. Admin manages keys via `/api/admin/api-keys`.
- **API Keys Table**: `api_keys` (key, label, createdBy, createdAt, isActive, lastUsedAt) for external API consumers.
- **Intelligence Data Restriction**: `/api/market-intelligence` returns only aggregate counts for non-Pro users. `/api/market-intelligence/transition` requires Pro authentication.
- **Job Detail Truncation**: Unauthenticated users get title, company, location, work mode + first 150 chars of description. Full details require login.
- **Attribution Watermarking**: All intelligence API responses include `_attribution` field with source, license, and user email. PDF reports have proprietary footer watermarks.
- **Anti-Indexing**: `X-Robots-Tag: noindex, nofollow` on all `/api/` responses.

### Conversion Engine
- **Job Signup Gate**: Unauthenticated job detail page shows truncated info + Card with "Sign up free to see full details" CTA.
- **View-Count Soft Gate**: After 5 job views without auth, Dialog prompts signup. Dismissable but re-triggers on subsequent views.
- **Pro Upgrade Banner**: Slim persistent banner for free authenticated users in header. Dismissable via localStorage, reappears after 3 days.
- **Post-Diagnostic Pro Upsell**: Blurred preview section showing mock skill clusters, career paths, transition plan, and market demand with "Unlock Full Report — $5/mo" CTA.
- **Social Proof Counters**: Real data from `/api/stats/social-proof` displayed on landing, pricing, quiz, and MI pages.
- **LinkedIn Share Cards**: `/share/readiness` endpoint generates branded HTML with OG meta tags for LinkedIn preview cards showing readiness score and career path.

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **Authentication**: Google OAuth 2.0
- **Payments**: Stripe
- **UI Components**: shadcn/ui (built on Radix UI)