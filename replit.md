# Legal Tech Careers - For Lawyers Interested in Technology

## Overview

A freemium SaaS job search platform for legal technology careers, built specifically for attorneys, paralegals, and legal professionals. The platform's core purpose is to connect legal talent with opportunities at companies building the future of legal technology through guided search, resume analysis, job comparison tools, and strategic career guidance. Its vision is to become the leading platform for legal professionals transitioning into or advancing within the legal tech industry.

## User Preferences

- Preferred communication style: Simple, everyday language
- Design preferences: Clean, minimal, professional. No "AI-Powered" language - keep it approachable for non-technical lawyers
- Color palette: Deep navy/slate (authoritative, trustworthy)
- Typography: Playfair Display serif for headings (elegant, legal feel), DM Sans for body (clean, modern)

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite build tool)
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Theme**: Light/dark mode with deep navy/slate palette
- **Typography**: Playfair Display (serif headings), DM Sans (body), JetBrains Mono (code)

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ES modules)
- **API Design**: RESTful endpoints
- **Build**: Custom esbuild for server, Vite for client

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: Located in `shared/schema.ts`, including tables for jobs, users, sessions, user preferences, job alerts, notifications, and resumes.
- **Migrations**: Drizzle Kit

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL-backed sessions using `connect-pg-simple`
- **Implementation**: Passport.js with custom Replit OIDC strategy

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations)
- **Features**: Guided Search (multi-step, clarifying questions, semantic search), Job Categorization (taxonomy classification, skill extraction, summaries), Resume Parsing, Resume-Job Comparison, and Conversational Assistant.

### Payments & Subscription (Stripe)
- **Provider**: Stripe (via Replit Stripe Integration)
- **Model**: Freemium SaaS with Free and Pro tiers
- **Plans**: Pro Monthly ($5/mo), Pro Yearly ($30/yr, save $30)
- **Stripe Product**: "Legal Tech Careers Pro" with monthly and yearly price objects
- **Webhook**: Handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed` events
- **Schema Fields**: `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionTier` (free/pro), `subscriptionStatus` (active/canceled/past_due/inactive) on users table
- **Backend Middleware**: `requirePro` middleware gates premium API endpoints, returning 403 for free users
- **Frontend Hook**: `useSubscription()` hook provides `isPro`, `tier`, `status`, `isLoading` for component-level gating
- **Key Files**: `server/stripeClient.ts`, `server/webhookHandlers.ts`, `client/src/hooks/use-subscription.ts`, `client/src/components/upgrade-prompt.tsx`, `client/src/pages/pricing.tsx`

### Subscription Tiers

**Free Tier:**
- Browse all job listings
- Basic keyword search
- View job details & apply links
- Submit job postings
- Upload 1 resume

**Pro Tier ($5/mo or $30/yr):**
- Everything in Free
- Resume matching & tweaks (AI-powered)
- Career Advisor comparisons
- Market insights & analytics with conversational Q&A
- Job alerts & notifications
- Multi-resume management (up to 5)
- Guided search with AI refinement

### Core Features
- **Unified Smart Search**: The Jobs page (`/jobs`) features an integrated AI-powered search bar that replaces the basic text filter. Users type natural language queries (e.g., "remote compliance role, 3+ years") and get AI-scored results. Includes guided search flow with clarifying questions inline on the same page. Free users get one guided search trial per session (tracked via sessionStorage), then guided search requires Pro. Quick search (skip questions) is always available. The `/search` page still exists as an alternative entry point. Search suggestion chips shown when search bar is empty. Smart empty state with clear-filters and search suggestions when 0 results found.
- **Job Categorization**: AI-powered classification of job postings into a 3-tier taxonomy (13 primary categories, 80+ subcategories) using `gpt-4o-mini`, extracting seniority, skills, and summaries.
- **Resume Upload**: Supports PDF, DOCX (max 5MB), extracts skills and experience, generates auto-search queries. Includes validation for PDF files.
- **Multi-Resume Management**: Pro users can upload up to 5 labeled resumes (e.g., "Litigation Tech Focus", "Compliance Resume") at /resumes. Each resume is independently parsed and stored with a label, filename, extracted skills, and primary designation. Supports set-primary, rename, and delete operations. Existing single-resume data auto-migrates to the resumes table. Free users limited to 1 resume.
- **Multi-Resume Match Dashboard**: Matches all uploaded resumes against available jobs simultaneously. Shows: (1) resume stat cards with avg score and strong match count, (2) "Best Resume per Job" view highlighting jobs matched by multiple resumes as strong signals, (3) "By Resume" tab to drill into each resume's top matches. Each job card shows cross-resume score comparison with expandable details. Pro-only feature.
- **Resume-Job Comparison**: Compares uploaded resumes against job postings, providing a match score, skill/experience/location/salary/seniority matches, gap analysis, and recommendations. Pro-only feature.
- **Resume Match & Tweak**: Auto-matches resumes against active jobs in a two-stage process (batch match and detailed tweaker). Provides brutal verdicts, tweak percentages, and suggested resume edits for specific jobs. Pro-only feature.
- **Career Advisor**: AI-powered strategic guidance for comparing 2-3 job opportunities. Allows various input methods for job descriptions (select from platform, URL, text, file upload). Provides analysis on overall fit, pros, cons, transferable skills, growth potential, work type, transition difficulty, and personalized insights based on an uploaded resume. Pro-only feature with upgrade prompt for free users.
- **Job Scraper (Admin)**: Scrapes jobs from various legal tech sources and ATS integrations (Greenhouse, Lever, HTML). Includes deduplication, access control via `is_admin` flag, and an admin UI.
- **Admin File Upload**: Upload job files (PDF, HTML, DOCX, TXT) which are automatically parsed with AI, categorized, and stored as job listings. Multi-file upload supported (up to 10 files, 10MB each). Uses `server/lib/job-file-parser.ts` for text extraction and OpenAI for structured job data extraction.
- **Admin Job Management**: Full CRUD management of all job listings. Search/filter by text, category, source, and active status. Edit job details (title, company, location, salary, description, etc.), toggle active/inactive, re-categorize with AI, and delete. Paginated list view with inline edit dialog.
- **Scheduled Scraping & Monitoring**: Automated daily scraping, log management (rotation, cleanup), link validation, and an admin dashboard for monitoring and control.
- **Job Alerts & Notifications**: Users can create named alerts based on criteria (categories, keywords, seniority, remote). New matching jobs trigger in-app notifications with an unread count badge and a notification bell in the header. Pro-only feature with upgrade prompt for free users.
- **Market Insights**: Analytics dashboard with job market trends, category breakdowns, salary data, and hiring activity. Includes a conversational Q&A interface where users can ask natural language questions about the legal tech job market and get data-backed answers with cited sources (powered by OpenAI + platform job data). Pro-only feature with upgrade prompt for free users.
- **Pricing Page**: Displays Free vs Pro comparison with monthly/yearly toggle. Integrates with Stripe Checkout for subscription purchases and Stripe Billing Portal for management.
- **Conversational Assistant**: Floating chat widget available on all authenticated pages. Context-aware: detects current job page, user resume data, and behavioral persona. Provides plain-language explanations of job postings, career guidance, and resume-based recommendations. Uses GPT-4o-mini with temperature 0.6. Persona-aware suggestion chips dynamically change based on user interests, locations explored, and companies viewed. Key files: `client/src/components/assistant-widget.tsx`, `server/routes.ts` (POST /api/assistant/chat).
- **Discuss This Match**: Conversational feature on resume-job match results. Each matched job card has a "Discuss This Match" button that opens a Sheet-based chat panel pre-loaded with the user's resume, full job details, and match analysis (score, gaps, strengths, missing skills). Users can ask questions like "Why did I get this score?", "Should I apply?", "How do I close the gaps?" with context-aware suggestion chips. Uses dedicated endpoint `POST /api/match/discuss` (Pro-only). Key files: `client/src/components/resume-matches.tsx`, `server/routes.ts`.
- **User Memory & Persona System**: Tracks user activities (page views, searches, filter changes, job views, apply clicks, resume uploads, alert creation, comparison starts) across all pages. Builds behavioral personas with recency-weighted scoring (apply clicks 3x, filter changes 2x, views 1x). Persona includes top categories, skills, preferred locations, remote preference, seniority interest, career stage, engagement level, search patterns, and viewed companies. Persona is recomputed every 10 minutes and injected into assistant chat context for personalized responses. Key files: `shared/schema.ts` (user_activities, user_personas tables), `server/routes.ts` (POST /api/activities, GET /api/persona), `client/src/hooks/use-activity-tracker.ts`, `client/src/hooks/use-persona.ts`.
- **Location-Based Filtering**: Searchable location dropdown on the jobs page with job counts per location, "Remote Only" option, and click-outside/Escape handling. Backend normalizes locations by extracting city names. Key files: `client/src/pages/jobs.tsx`.

### API Routes (Stripe/Subscription)
- `GET /api/stripe/prices` - Fetch Pro plan pricing (public)
- `GET /api/stripe/publishable-key` - Fetch Stripe publishable key (public)
- `POST /api/stripe/create-checkout-session` - Create Stripe Checkout session (authenticated)
- `POST /api/stripe/create-portal-session` - Create Stripe Billing Portal session (authenticated)
- `GET /api/stripe/subscription` - Get current user's subscription status (authenticated)
- `POST /api/stripe/sync-subscription` - Sync subscription from Stripe (authenticated)
- `POST /api/stripe/webhook` - Handle Stripe webhook events (raw body)

### Project Structure
- `client/`: Frontend React application (components, pages, hooks, lib)
- `server/`: Backend Express application (replit_integrations)
- `shared/`: Shared types and database schema (schema.ts, models/)

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **Authentication**: Replit OIDC provider
- **Payments**: Stripe (subscription billing, Checkout, Billing Portal)
- **UI Components**: shadcn/ui (built on Radix UI)
