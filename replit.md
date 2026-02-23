# Legal Tech Careers - For Lawyers Interested in Technology

## Overview

Legal Tech Careers is a freemium SaaS job search platform tailored for legal professionals targeting the legal technology industry. It aims to be the leading resource for connecting legal talent with innovative legal tech companies, offering features like guided search, resume analysis, job comparison, and strategic career guidance. The platform's vision is to fill a critical niche in the legal employment market by providing specialized tools and insights for this rapidly growing sector.

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
- **Company Coverage**: 236 companies tracked across 5 categories (38 startups, 22 companies, 95 tech-legal, 70 biglaw, 11 ALSPs). ATS integrations: 74 Greenhouse, 37 Lever, 22 Ashby, 89 Workday, 2 Workable, 6 SmartRecruiters, 5 iCIMS, 1 BambooHR. All companies have verified ATS configurations.
- **Scrapers**: Utilizes various APIs (Greenhouse, Lever, Ashby, Workday CXS) and generic HTML scrapers for broad job coverage across global regions.
- **Automation**: Scheduled scrapers, enrichment workers, and reliability workers manage job ingestion, quality scoring, deduplication, and link validation.
- **Quality Assurance**: A comprehensive QA validation system with persisted results and an admin review queue ensures high data integrity. Dashboard market alignment query filters by both `is_active` AND `is_published` for accurate counts.
- **Country Normalization**: Deterministic ISO-2 country code extraction for global job location accuracy. All published jobs have valid country codes (no "Unknown").
- **Featured Jobs**: Randomized selection using Fisher-Yates shuffle with diversity filters (unique companies, varied categories).
- **Admin Tools**: Features for importing, drafting, and publishing jobs, with robust security measures for admin routes.

### Core Features
- **Smart Search**: AI-powered natural language job search.
- **Resume Management & Editing**: Upload, parse, manage multiple resumes, and an AI-powered resume editor for tailoring resumes to specific jobs with real-time ATS scoring.
- **Job Matching**: AI-driven comparison of resumes against job postings, providing match scores and gap analysis.
- **Career Guidance**: Market insights dashboard, conversational assistant, and a career intelligence panel with personalized path recommendations.
- **Career Diagnostic Engine**: Full diagnostic page (/diagnostic) with skill clustering (7 categories), readiness scoring, transition difficulty gauge, readiness ladder (Ready/Near-Ready/Stretch tiers), top career paths, 30-day transition plan, and Recharts visualizations (radar, bar, gauge charts). Auto-routes from resume upload.
- **Per-Job Fit Scoring**: AI-computed fit scores (skills/experience/domain/seniority breakdown), AI intensity, and transition difficulty cached per resume-job pair. Displayed as badges on job cards.
- **Career Intelligence Header**: On /jobs page, shows readiness score + top path + skill chips when diagnostic exists, or prompts to run diagnostic / upload resume.
- **Job Alerts & Notifications**: Users receive alerts for new matching jobs.
- **Opportunity Map**: An interactive global map displaying job density by country, with memoized rendering for smooth hover/zoom/pan interactions.
- **SEO**: Dynamic meta tags, `JobPosting` JSON-LD, and an XML sitemap for enhanced search visibility.
- **Pro Feature Gates**: Backend and frontend implement checks to gate Pro features, with upgrade prompts for Free users.

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **Authentication**: Google OAuth 2.0
- **Payments**: Stripe
- **UI Components**: shadcn/ui (built on Radix UI)