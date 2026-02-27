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
- **Scrapers**: Utilizes various APIs and generic HTML scrapers for broad job coverage.
- **Automation**: Scheduled workers manage ingestion, scoring, deduplication, and validation.
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

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **Authentication**: Google OAuth 2.0
- **Payments**: Stripe
- **UI Components**: shadcn/ui (built on Radix UI)