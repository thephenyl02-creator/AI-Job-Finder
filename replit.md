# Legal Tech Careers - For Lawyers Interested in Technology

## Overview

Legal Tech Careers is a career intelligence platform for legal professionals transitioning into legal technology. It's positioned as a career intelligence hub (not a job board) — the diagnostic system drives Pro conversions, the resume data creates a defensible moat, and market intelligence differentiates from generic job boards. The logged-in experience is a personalized career command center, not another job aggregator.

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
- **Provider**: OpenAI API
- **Capabilities**: Powers Guided Search, Job Categorization, Resume Parsing, Resume-Job Comparison, Conversational Assistant, ATS Resume Review, AI-assisted resume builder, Market Insights Q&A, Career Diagnostic Engine (skill clustering, readiness scoring, transition planning), and per-job fit scoring.

### Payments & Subscription
- **Provider**: Stripe
- **Model**: Freemium SaaS with "Free" and "Pro" tiers, offering enhanced AI features, multi-resume management, job alerts, and market insights for Pro users.
- **Management**: Stripe Checkout, Billing Portal, and webhooks.

### Job Curation Pipeline
- **Process**: A two-layer pipeline (raw ingestion → AI enrichment → trust gate → published inventory) ensures job quality.
- **Company Coverage**: 441 companies tracked across 5 categories (77 startups, 24 companies, 153 tech-legal, 176 biglaw, 11 ALSPs). ATS integrations: 99 Greenhouse, 56 Lever, 31 Ashby, 60 Workday, 3 Workable, 7 SmartRecruiters, 8 iCIMS. Global coverage: US, UK, Europe (DACH, Nordics, Iberia, France, Benelux, Switzerland), Asia-Pacific (India, Japan, Singapore, Australia, South Korea, China), Middle East (UAE), Africa (South Africa, Ghana), Latin America (Brazil). Workday scraper optimized with title pre-filtering (filters by relevance before fetching descriptions) and batch detail fetching (5 concurrent) for 10x throughput improvement. Scraper reliability: per-company circuit breakers (not per-ATS), batch processing (10 concurrent companies), 20-minute global timeout, proper error logging.
- **Scrapers**: Utilizes various APIs (Greenhouse, Lever, Ashby, Workday CXS) and generic HTML scrapers for broad job coverage across global regions.
- **Automation**: Scheduled scrapers, enrichment workers, and reliability workers manage job ingestion, quality scoring, deduplication, and link validation.
- **Quality Assurance**: A comprehensive QA validation system with persisted results and an admin review queue ensures high data integrity. Dashboard market alignment query filters by both `is_active` AND `is_published` for accurate counts.
- **Country Normalization**: Deterministic ISO-2 country code extraction for global job location accuracy. All published jobs have valid country codes (no "Unknown").
- **Featured Jobs**: Randomized selection using Fisher-Yates shuffle with diversity filters (unique companies, varied categories).
- **Admin Tools**: Features for importing, drafting, and publishing jobs, with robust security measures for admin routes.

### Core Features
- **Landing Page**: Leads with career intelligence positioning, not job browsing. Hero headline: "Where do you fit in legal tech?" with diagnostic preview card (readiness score ring, skill bars, role badges) as the primary visual. Primary CTA is "Check Your Fit" (diagnostic), jobs demoted to subtle secondary link. Sections: value strip → stats bar → how it works (Upload → Report → Land Role) → career paths → global map → Pro features.
- **Career Command Center Dashboard** (`/dashboard`): Authenticated users' home page (redirected from `/`). Sections: (1) Career Snapshot with readiness ring, top career path + confidence, quick stats; (2) "This Week" action feed derived from diagnostic transition plan with current week's tasks, time estimates, skill gap labels, new matching roles count, and top ready job recommendation; (3) Sidebar with saved jobs, alerts, quick links; (4) Market Pulse grid with real-time stats. Pro gating on weeks 2-4 actions and extended market intelligence.
- **Market Pulse API** (`/api/market-pulse`): Returns newJobsThisWeek, topHiringCompanies, trendingSkill, workModeSplit, totalJobs, salaryInsight. Efficiently aggregates published job data. If authenticated user has diagnostic, returns salary insight for their top career path.
- **Smart Search**: AI-powered natural language job search.
- **Resume Management & Editing**: Upload, parse, manage multiple resumes, and an AI-powered resume editor for tailoring resumes to specific jobs with real-time ATS scoring. Editor features: inline contentEditable editing, AI change tracking with revert/unrevert, move up/down reordering for experience entries and bullet points, delete buttons for all entry types (experience/education/certifications), word count indicator with ideal range guidance, contextual empty state messages, section-level help tooltips, undo/redo with keyboard shortcuts, PDF/DOCX/Apply Pack export.
- **Job Matching**: AI-driven comparison of resumes against job postings, providing match scores and gap analysis.
- **Career Guidance**: Market insights dashboard, conversational assistant, and a career intelligence panel with personalized path recommendations.
- **Career Diagnostic Engine**: Full diagnostic page (/diagnostic) with skill clustering (7 categories), readiness scoring, transition difficulty gauge, readiness ladder (Ready/Near-Ready/Stretch tiers), top career paths, 30-day transition plan, and Recharts visualizations (radar, bar, gauge charts). Auto-routes from resume upload. **Career Path Flow Visualization**: Visual flow diagram showing user's current role → matched career paths → sample roles, with SVG curve connectors, confidence-weighted line thickness, skill gap labels on connectors, and Pro gating (paths 2-3 blurred for free users). Responsive: horizontal flow on desktop, vertical stack on mobile. **Anonymous preview mode**: Unauthenticated visitors can upload a resume and see a gated teaser (readiness score, top career path, key skills, matched role count) without signing up. Full report gated behind free account creation. IP-based rate limiting (3 previews/hour). LinkedIn share button on diagnostic results for organic distribution. **Percentile benchmarking**: Shows "You scored higher than X% of lawyers" when 5+ assessments exist. **Preview persistence**: Anonymous preview results saved to localStorage, displayed to newly logged-in users without a resume. **Inline upload**: Logged-in users without a resume see an inline drag-drop upload zone (no redirect to /resumes).
- **Career Fit Quiz**: Lightweight 4-question quiz (/quiz) as low-friction alternative to resume upload. Questions: current role, interests, tech comfort, career stage. Deterministic weight matrix scoring (no AI calls) recommends top 2 career paths with real job counts from published inventory. Cross-linked from landing page hero and diagnostic upload zone. Funnels users toward full diagnostic via resume upload CTA. **Quiz-to-upload bridge**: Results page includes a "Quiz Estimate vs Resume-Verified" comparison table showing confidence badges (~60% quiz vs 95%+ resume) with locked items (readiness score, skill gaps, job matches) to drive resume uploads.
- **Per-Job Fit Scoring**: AI-computed fit scores (skills/experience/domain/seniority breakdown), AI intensity, and transition difficulty cached per resume-job pair. Displayed as badges on job cards.
- **Career Intelligence Header**: On /jobs page, shows readiness score + top path + skill chips when diagnostic exists, or prompts to run diagnostic / upload resume.
- **Job Alerts & Notifications**: Users receive alerts for new matching jobs.
- **Opportunity Map**: An interactive global map displaying job density by country, with memoized rendering for smooth hover/zoom/pan interactions.
- **SEO**: Dynamic meta tags, `JobPosting` JSON-LD, and an XML sitemap for enhanced search visibility.
- **Career Command Center Dashboard** visual redesign: Premium visual polish with hero metric cards row (Readiness Score ring, Active Jobs count, Top Path, Activity Streak) with strong tinted backgrounds (0.08/0.15 opacity), colored left border accents, icons in colored circle backgrounds, text-4xl numbers. "This Week" action plan with gradient progress bar, filled colored step circles, percentage labels. Market Pulse as mini cards with proportional fill bars, colored icon backgrounds, hover effects. Enhanced sidebar with colored engagement badge, mini activity progress bars, colored quick links. Typography: larger section headings (text-lg), serif font for dashboard title, stronger weight contrast throughout. Dark mode and responsive design preserved.
- **Market Intelligence Page** (`/market-intelligence`): Bloomberg-style living data report aggregating all published job data. Public page (SEO-friendly). Redesigned with colorful metric cards (tinted backgrounds), download report dropdown (weekly/monthly/annual PDF), salary range visualization bars, card-based companies/geography with rank badges. Sections: key stats cards, skills demand (Recharts bar chart with multi-color bars), career paths grid with colored accent strips, salary insights with visual range bars (Pro-gated beyond top 3), work mode donut chart with center total label, AI intensity bars, seniority landscape chart, top hiring companies, geography breakdown, community pulse (Pro-gated, only renders with 5+ diagnostics). All numbers from `/api/market-intelligence` endpoint with 1-hour in-memory cache (`marketIntelligenceCache` in routes.ts, TTL `MI_CACHE_TTL = 3600000`). Recharts charts use CSS variables `--chart-1` through `--chart-5`.
- **Market Intelligence PDF Reports** (`/api/market-intelligence/report`): Public endpoint. Bloomberg Law / McKinsey-quality PDF reports generated via `pdfkit` (`server/lib/market-intelligence-pdf.ts`). Three periods: `?period=weekly|monthly|annual`. Features: navy cover page with live stats, numbered sections with navy rules, 2x3 executive summary stat boxes, horizontal bar charts for skills/seniority, professional tables with alternating rows for career paths and salary data, work mode + AI intensity visualization, ranked company/geography lists, methodology back page. Tight spacing with no dead whitespace. All data from market intelligence cache. Returns `Content-Type: application/pdf` with `Content-Disposition: attachment`.
- **Market Intelligence API** (`/api/market-intelligence`): Public endpoint. Returns overview stats, skillsDemand (top 15, with synonym merging and title-case formatting), careerPaths with newThisWeek, salaryByPath (median min/max, 3+ sample threshold), workMode split, aiIntensity (Low/Med/High using `computeAIIntensity`), seniorityDistribution, topCompanies (top 10), geography (top 15 countries), and communityBenchmarks (when 5+ diagnostics exist). Cached in-memory for 1 hour. **Skills synonym merging**: Maps duplicates to canonical names (e.g. "legal tech" → "legal technology", "customer engagement" → "client engagement"). **Title-case formatting**: Proper casing with acronym handling (AI, ML, API, CRM, etc.).
- **Pro Feature Gates**: Backend and frontend implement checks to gate Pro features, with upgrade prompts for Free users.

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **Authentication**: Google OAuth 2.0
- **Payments**: Stripe
- **UI Components**: shadcn/ui (built on Radix UI)