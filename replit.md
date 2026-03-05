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
- **Capabilities**: Powers Guided Search, Job Categorization, Resume Parsing, Resume-Job Comparison, Conversational Assistant, ATS Resume Review, AI-assisted resume builder, Market Insights Q&A, Career Diagnostic Engine, and per-job fit scoring.
- **Skill Extraction**: AI categorizes `hardSkills` and `softSkills`.
- **Categorization Boundaries**: Explicit rules prevent over-bucketing into Legal Operations and Legal Consulting.

### Payments & Subscription
- **Model**: Freemium SaaS with "Free" and "Pro" tiers.
- **Management**: Stripe Checkout, Billing Portal, and webhooks.

### Role Track Classification
- **System**: Three role tracks (Lawyer-Led / Technical / Ecosystem) classify every job, mapped from 13 job categories.

### Analytics & Tracking
- **User Activity**: Tracks authenticated user actions and anonymous events.
- **Cache Management**: Extensive caching with specific TTLs and invalidation strategies for various statistical data to ensure performance and data consistency.

### Job Curation Pipeline
- **Process**: A two-layer pipeline (ingestion → AI enrichment → trust gate → published inventory) ensures quality, deduplication, and link validation.
- **Quality Gates**: Company-type-aware thresholds and AI negative signal filters ensure high data quality.
- **Scrapers**: Supports various ATS platforms (Greenhouse, Lever, Ashby, Workday, etc.) with multi-region capabilities and ATS auto-detection.
- **Global Coverage**: Gathers data from 400+ companies across US, UK, EU, APAC.
- **Automation & QA**: Scheduled workers manage ingestion, scoring, deduplication, and validation, supported by an admin review queue and dashboard.

### Core Features
- **Landing Page**: Highlights career intelligence.
- **Career Command Center Dashboard**: Personalized dashboard for authenticated users.
- **Smart Search**: AI-powered natural language job search.
- **Resume Management & Editing**: Upload, parse, and AI-assisted editing of resumes.
- **Job Matching**: AI-driven resume-job comparison and fit scoring.
- **Career Guidance**: Market insights, conversational assistant, and personalized recommendations.
- **Career Diagnostic Engine**: Skill clustering, readiness scoring, and transition planning.
- **Market Intelligence Page**: Bloomberg-style terminal for market data.
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

### Free Tier Limits
- **Feature Restrictions**: Limits on guided searches, chat messages, saved jobs, diagnostic report details, and market insights access to drive Pro conversions.

### Conversion Engine
- **Strategic CTAs**: Signup gates, view-count soft gates, Pro upgrade banners, and post-diagnostic upsells.
- **Social Proof**: Displays real data counters.
- **Shareable Content**: Generates branded SVG image cards for social media sharing.

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **Authentication**: Google OAuth 2.0
- **Payments**: Stripe
- **UI Components**: shadcn/ui (built on Radix UI)