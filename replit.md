# Legal Tech Careers - For Lawyers Interested in Technology

## Overview

A premium job search platform for legal technology careers, built specifically for attorneys, paralegals, and legal professionals. Features guided search with clarifying questions, resume analysis, job comparison tools, and strategic career guidance. The platform connects legal talent with opportunities at companies building the future of legal technology.

## User Preferences

- Preferred communication style: Simple, everyday language
- Design preferences: Clean, minimal, professional. No "AI-Powered" language - keep it approachable for non-technical lawyers
- Color palette: Deep navy/slate (authoritative, trustworthy) - not warm terracotta
- Typography: Playfair Display serif for headings (elegant, legal feel), DM Sans for body (clean, modern)

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight React router)
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Theme**: Light/dark mode with deep navy/slate palette (primary: 222 47% 20%)
- **Typography**: Playfair Display (serif headings), DM Sans (body), JetBrains Mono (code)

### Page Structure
- **Search Page (/)**: Guided search interface with natural language queries
- **Jobs Page (/jobs)**: All jobs displayed in tabular format with filtering
- **Career Advisor (/career-advisor)**: Career comparison tool for legal professionals
- **Admin Page (/admin)**: Admin-only job scraping controls
- **Landing Page**: Unauthenticated users see clean marketing/sign-in page
- **About Page (/about)**: Platform information and mission
- **Post Job (/post-job)**: Job submission form

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api/` prefix
- **Build**: Custom build script using esbuild for server bundling and Vite for client

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` - contains jobs, users (with resume fields), sessions, user_preferences tables
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Implementation**: Passport.js with custom Replit OIDC strategy in `server/replit_integrations/auth/`

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations)
- **Features**: 
  - **Guided Search (Smart Search)**: Multi-step search that asks clarifying questions to pinpoint exactly what users need
  - Semantic job search with natural language queries
  - Match scoring with explanations for job-candidate fit
  - Resume parsing and skill extraction from PDF/DOCX uploads
  - Auto-generated search queries from resume data
  - **Job Categorization**: Automatic classification into 3-tier taxonomy with AI summaries
- **Configuration**: Uses `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables

### Guided Search
- **Route**: Search page (/) for authenticated users
- **Two Search Modes**:
  1. **Guided Search**: Interactive flow that analyzes query, asks 2-4 clarifying questions, returns curated matches (75%+ score only)
  2. **Quick Search**: Traditional semantic search, faster but less precise
- **Question Generation**: AI generates role-specific questions about seniority, work preferences, skills, salary expectations
- **Precision Matching**: Only returns jobs scoring 75%+ match, with detailed reasons for each match
- **API Endpoints**:
  - POST `/api/search/analyze` - Analyzes query and generates clarifying questions
  - POST `/api/search/refined` - Uses answers to perform precision search
- **Implementation**: `client/src/pages/search.tsx`, endpoints in `server/routes.ts`

### Job Categorization (AI-Powered)
- **Taxonomy**: 13 primary categories with 80+ subcategories for comprehensive legal tech coverage
  - Legal AI & Machine Learning: AI/ML engineers, data scientists, NLP specialists
  - Legal Product & Innovation: Product managers, innovation leaders, UX designers
  - Legal Knowledge Engineering: Knowledge managers, research engineers, taxonomy specialists
  - Legal Operations: Legal ops managers, process improvement, vendor management
  - Contract Technology: CLM specialists, contract automation, smart contracts
  - Compliance & RegTech: Regulatory tech, compliance automation, privacy
  - Litigation & eDiscovery: eDiscovery, litigation support, trial analytics
  - Legal Consulting & Strategy: Consultants, advisors, AI governance
  - Legal Education & Training: Learning technology, curriculum design
  - Legal Publishing & Content: Editorial tech, content platforms
  - Courts & Public Legal Systems: Court tech, access to justice
  - Legal Research & Academia: Academic researchers, computational law
  - Emerging LegalTech Roles: AI auditors, safety specialists, new roles
- **AI Extraction**: Uses gpt-4o-mini to analyze job postings and extract:
  - Category and subcategory classification
  - Seniority level (Entry/Mid/Senior/Lead/Director/VP)
  - Key skills (up to 8)
  - AI-generated job summary (1-3 sentences)
  - Match keywords for improved search
- **Implementation**: `server/lib/job-categorizer.ts`
- **Fallback**: Keyword-based classification if AI fails

### Resume Upload
- **Supported Formats**: PDF, DOCX (max 5MB)
- **Processing**: pdf-parse v2 for PDFs (using class-based API), mammoth for DOCX
- **PDF Validation**: Header validation to detect invalid/corrupted files with user-friendly error messages
- **AI Extraction**: Extracts skills, experience, preferred roles, salary expectations
- **Auto-search**: Generates natural language search query from resume data

### Resume-Job Comparison
- **Compare Button**: Available in Jobs table view (/jobs) for each job listing
- **Requirements**: User must upload a valid resume first (button disabled otherwise)
- **AI Analysis**: Compares resume against job posting using OpenAI
- **Comparison Sections**:
  - Overall match score (0-100%)
  - Skills match with status (match/partial/missing) and explanations
  - Experience match (years required vs actual)
  - Location match (including remote preferences)
  - Salary match (expected vs offered)
  - Seniority match (level comparison)
  - Gap analysis (skill gaps identified)
  - Recommendations (actionable advice)
- **Implementation**: `server/lib/resume-job-comparison.ts`, `client/src/components/job-comparison.tsx`

### Resume Match & Tweak (Brutally Honest)
- **Auto-matching**: After resume upload, automatically matches resume against all active jobs
- **Two-stage process**:
  1. **Batch Match** (POST `/api/resume/match-jobs`): Pre-filters jobs by skill/category overlap (top 30), then AI ranks top 10 with brutal honesty
  2. **Resume Tweaker** (POST `/api/resume/tweak/:jobId`): Deep analysis for a specific job with line-by-line alignment and resume editing suggestions
- **Batch Match Results** show for each job:
  - Match score (0-100%, harsh scoring - 100 is nearly impossible)
  - Tweak percentage (how much resume needs changing)
  - Brutal verdict (direct, no-BS assessment)
  - Match highlights (what's working)
  - Gap summary and top missing skills
- **Resume Tweaker** (slide-out panel) shows:
  - Requirements alignment: each job requirement mapped to resume evidence (match/partial/missing)
  - Suggested resume edits: before/after text changes with impact ratings (high/medium/low)
  - Skills to consider: realistic vs. needs-development classification
  - Overall strategy and honest warnings
- **Pre-filter algorithm**: Scores jobs by skill word overlap, role title match, legal/tech background alignment, experience range fit, and remote preference
- **UI**: Integrated into Search page (/), appears below search bar when resume is uploaded
- **Implementation**: `server/lib/resume-matcher.ts`, `client/src/components/resume-matches.tsx`

### Career Advisor (AI-Powered)
- **Route**: `/career-advisor` (requires authentication)
- **Purpose**: Strategic career guidance for legal professionals comparing 2-3 job opportunities
- **Features**:
  - Compare 2-3 job descriptions side-by-side
  - **Five input methods for job descriptions**:
    1. **Select from Jobs page**: Select 2-3 jobs on the Jobs page (/jobs) using checkboxes, then click "Compare Selected" to navigate to Career Advisor with pre-populated jobs
    2. **Paste URL**: Paste a job posting URL and automatically extract title and description using AI
    3. **Paste text**: Manually enter job title and description
    4. **Drag-and-drop file upload**: Upload PDF/DOCX job posting files directly
    5. **Browse from Portal**: Select jobs directly from the platform's job database via slide-in panel
  - **Jobs Page Selection**: Checkboxes on each job row/card (max 3), floating action bar shows selection count and "Compare Selected" button
  - **Portal Job Picker**: Slide-in panel with search, category grouping (by roleSubcategory), and collapsible sections
  - **AI Analysis for Each Job**:
    - Overall fit summary for legal professionals
    - Pros (advantages for someone with legal experience)
    - Cons (challenges and gaps to address)
    - Transferable skills from legal practice
    - Skills to develop for success
    - Legal tech career growth potential (1-2yr, 3-5yr, 5-10yr trajectories + AI impact)
    - Work type (structured vs ambiguous)
    - Transition difficulty with explanation
  - Personalized fit analysis when resume is uploaded (strengths, gaps, interview risks, resume positioning)
  - Strategic recommendations: best fit now, best long-term in legal tech/AI, biggest career shift
- **API**: 
  - POST `/api/career-advisor/parse-job-url` - Fetch and parse job posting from URL using AI extraction
  - POST `/api/career-advisor/parse-job-file` - Extract text from uploaded job posting files
  - POST `/api/career-advisor/compare` - Compare jobs with Zod validation
- **Implementation**: `client/src/pages/career-advisor.tsx`, API endpoint in `server/routes.ts`

### Job Scraper (Admin Feature)
- **Sources**: Legal AI startups (Harvey, CoCounsel, etc.), Legal tech companies (Clio, Relativity, etc.)
- **ATS Integrations**: Greenhouse API, Lever API, generic HTML scraping fallback
- **Deduplication**: Uses externalId field to avoid duplicate jobs on re-scraping
- **Access Control**: Database-based via `is_admin` column in users table
  - Grant admin: `UPDATE users SET is_admin = true WHERE email = 'user@example.com';`
  - Revoke admin: `UPDATE users SET is_admin = false WHERE email = 'user@example.com';`
  - View admins: `SELECT * FROM users WHERE is_admin = true;`
- **Admin UI**: Available at /admin route for admin users only (non-admins see Access Denied)

### Scheduled Scraping & Monitoring
- **Scheduler**: Runs automatically every 24 hours on server start
- **File Logging**: Logs stored in `/logs` directory with format `scraper-YYYY-MM-DD.log`
- **Auto-cleanup**: Logs older than 7 days are automatically deleted on startup
- **Link Validation**: Samples 50 jobs to check if apply URLs are still valid (HEAD requests)
- **Monitoring Dashboard**: Admin UI shows scheduler status, job statistics by source, recent logs, and log files
- **Scheduler Controls**: Start/stop/run-now buttons in admin dashboard
- **Implementation**: `server/lib/logger.ts`, `server/lib/scheduled-scraper.ts`

### Project Structure
```
client/           # Frontend React application
  src/
    components/   # UI components including shadcn/ui
    pages/        # Route pages (landing, home, admin, not-found)
    hooks/        # Custom React hooks
    lib/          # Utilities and query client
server/           # Backend Express application
  replit_integrations/  # Replit-specific integrations (auth, chat, audio, image)
shared/           # Shared types and database schema
  schema.ts       # Main Drizzle schema exports
  models/         # Domain-specific models (auth, chat)
```

## External Dependencies

### Database
- PostgreSQL database (requires `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe database operations

### AI Services
- OpenAI API for semantic search and job matching
- Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Authentication
- Replit OIDC provider for user authentication
- Session secret via `SESSION_SECRET` environment variable
- Issuer URL defaults to `https://replit.com/oidc`

### UI Components
- shadcn/ui component library built on Radix UI primitives
- Full suite of accessible, customizable components