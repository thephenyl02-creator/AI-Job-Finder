# Legal Tech Careers - For Lawyers Interested in Technology

## Overview

Legal Tech Careers is a freemium SaaS job search platform designed for legal professionals seeking careers in legal technology. It connects legal talent with opportunities at innovating legal tech companies, offering features like guided search, resume analysis, job comparison, and strategic career guidance. The platform aims to be the leading resource for legal professionals transitioning into or advancing within the legal tech industry, focusing on business vision, market potential, and project ambitions to fill a niche in the legal employment market.

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
- **Schema**: Centralized, covering jobs, users, sessions, user preferences, job alerts, notifications, and resumes.

### Authentication
- **Methods**: Custom email/password and Google OAuth 2.0.
- **Session Management**: PostgreSQL-backed sessions.

### AI Integration
- **Provider**: OpenAI API
- **Capabilities**: Guided Search, Job Categorization, Resume Parsing, Resume-Job Comparison, Conversational Assistant, ATS Resume Review, AI-assisted resume builder, and Market Insights Q&A.

### Payments & Subscription
- **Provider**: Stripe
- **Model**: Freemium SaaS with "Free" and "Pro" tiers, offering enhanced AI features, multi-resume management, job alerts, and market insights for Pro users.
- **Management**: Stripe Checkout, Billing Portal, and webhooks.

### Job Curation Pipeline
- **Two-Layer Pipeline**: Raw ingestion → AI enrichment → trust gate → published inventory
- **Pipeline Statuses**: `raw` (newly scraped) → `enriching` (being processed) → `ready` (passed quality gate) or `rejected` (failed quality gate)
- **Batch Scrapers**: Greenhouse API, Lever API, Ashby API, Workday CXS API, and generic HTML career page scrapers
- **Workday CXS Scraper**: Uses public POST `{company}.{instance}.myworkdayjobs.com/wday/cxs/{company}/{site}/jobs` with pagination and individual job detail fetching for full descriptions. Config via `workday` field in `LawFirmConfig`.
- **Enrichment Worker** (every 5 min): Processes 25 raw jobs - cleans descriptions, extracts experience requirements, categorizes with AI, computes quality scores, auto-publishes jobs scoring 80+ with 50+ relevance confidence
- **Reliability Worker** (every 6 hours): Validates apply links for published jobs, unpublishes broken links and stale jobs (45+ days unseen)
- **Trust Gate**: Public API only shows jobs with `pipelineStatus='ready'`, `isPublished=true`, `jobStatus='open'`, `isActive=true`
- **Quality Score** (0-100): Based on category (20pts), structured description completeness (40pts), experience data (15pts), valid apply URL (10pts), description length (5pts), seniority (5pts), legal relevance (5pts)
- **Re-enrichment**: When a job's description changes on re-scrape, pipeline status resets to 'raw' for re-processing
- **Deduplication**: `jobHash` field prevents duplicate ingestion based on company + title + location + applyUrl
- **API**: Paginated `/api/jobs` endpoint with server-side filtering (category, seniority, location, search)
- **Admin**: `/api/admin/pipeline-stats` shows pipeline health metrics

### Core Features
- **Unified Smart Search**: AI-powered natural language job search with guided queries.
- **Job Categorization**: AI-driven classification into a 3-tier taxonomy.
- **Resume Management**: Upload, parse, and manage multiple resumes.
- **Resume-Job Matching**: AI comparison of resumes against job postings, providing match scores, gap analysis, and recommendations.
- **Job Alerts & Notifications**: Users receive alerts for new matching jobs.
- **Market Insights**: Analytics dashboard with conversational Q&A on job market trends.
- **Conversational Assistant**: Context-aware chat widget for explanations and guidance.
- **User Memory & Persona System**: Tracks user activity for personalized AI interactions.
- **Resume Builder**: Structured resume creation with real-time ATS scoring and AI assistance.
- **Saved Jobs**: Bookmark jobs for later, with expiry reminders.
- **User Dashboard**: Dynamic analytics showing job search activity, trends, and personalized recommendations.
- **Admin Analytics**: Comprehensive dashboard with KPIs, engagement metrics, and user management.
- **Guided Next Step Widget**: Provides a single best action based on user state on job detail pages.
- **Public Job Detail Pages**: Viewable without authentication.
- **Structured Job Descriptions**: AI-extracted and validated job descriptions for quality and consistency, with an admin workflow for approval.
- **Unified Job Comparison**: Consolidated comparison flow on the browse page with quick compare (all users) and deep AI analysis (Pro users).
- **Resume Strategy**: AI-powered recommendations for resume alignment against job postings.
- **Rewrite Selected Lines**: AI-powered bullet point rewriting for Pro users to align resume experience with job posting language.
- **Trust & Freshness**: Source attribution, URL canonicalization, last checked timestamps, job status tracking, and user reporting for job quality.
- **Events Autopilot**: AI-driven discovery and management of legal tech events from global regions.

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **Authentication**: Google OAuth 2.0
- **Payments**: Stripe
- **UI Components**: shadcn/ui (built on Radix UI)