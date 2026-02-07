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
- **Unified Smart Search**: AI-powered natural language job search with guided queries.
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
- **Client-Side Normalization**: `job-detail.tsx` contains `normalizeFlatText()` which fixes remaining flat-text descriptions at render time (ALL-CAPS heading detection, inline bullet splitting, sentence-boundary paragraphing).
- **Autopilot Pipeline**: The scheduled scraper (`runScheduledScrape`) runs a 7-phase pipeline: (1) Scrape sources with retry, (2) Smart upsert to DB, (3) Stale job detection, (4) AI categorization of uncategorized jobs, (5) Alert matching for new jobs, (6) Link validation, (7) Run recording to `scrape_runs` table.
- **Scrape Run Tracking**: `scrape_runs` table records every run with timestamps, duration, counts (found/inserted/updated/categorized/alerts), source details, errors, and trigger source (scheduler/manual).
- **Admin Dashboard**: `/admin/scraper` page shows real-time scraper status, run history, health metrics, source breakdown, cumulative stats, and manual controls (start/stop/run-now).

## External Dependencies

- **Database**: PostgreSQL (any provider - local, Neon, Supabase, AWS RDS, etc.)
- **AI Services**: OpenAI API (standard `OPENAI_API_KEY`)
- **Authentication**: Custom email/password + optional Google OAuth 2.0
- **Payments**: Stripe (standard SDK with `STRIPE_SECRET_KEY`)
- **UI Components**: shadcn/ui (built on Radix UI)