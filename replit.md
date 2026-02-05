# Legal AI Careers

## Overview

A minimal, elegant job search platform for legal technology careers with AI-powered semantic search. Users can search for jobs using natural language queries, and the system uses OpenAI to match and score job listings based on semantic understanding of the query.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight React router)
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Theme**: Light/dark mode support with custom warm terracotta color palette

### Page Structure
- **Search Page (/)**: Dedicated search interface with AI-powered semantic search
- **Jobs Page (/jobs)**: All jobs displayed in tabular format with filtering
- **Admin Page (/admin)**: Admin-only job scraping controls
- **Landing Page**: Unauthenticated users see marketing/sign-in page

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
  - Semantic job search with natural language queries
  - Match scoring with explanations for job-candidate fit
  - Resume parsing and skill extraction from PDF/DOCX uploads
  - Auto-generated search queries from resume data
  - **Job Categorization**: Automatic classification into 3-tier taxonomy with AI summaries
- **Configuration**: Uses `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables

### Job Categorization (AI-Powered)
- **Taxonomy**: 3 primary categories with 21 subcategories
  - Legal AI Jobs (7 subcategories): AI Product Manager, Legal AI Engineer, AI Researcher, etc.
  - Legal Tech Startup Roles (7 subcategories): Product Manager, Solutions Engineer, Sales Engineer, etc.
  - Law Firm Tech & Innovation (7 subcategories): Legal Innovation Director, eDiscovery Manager, etc.
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
- **Processing**: pdf-parse for PDFs, mammoth for DOCX
- **AI Extraction**: Extracts skills, experience, preferred roles, salary expectations
- **Auto-search**: Generates natural language search query from resume data

### Job Scraper (Admin Feature)
- **Sources**: Legal AI startups (Harvey, CoCounsel, etc.), Legal tech companies (Clio, Relativity, etc.)
- **ATS Integrations**: Greenhouse API, Lever API, generic HTML scraping fallback
- **Deduplication**: Uses externalId field to avoid duplicate jobs on re-scraping
- **Access Control**: Admin-only via ADMIN_EMAILS environment variable (comma-separated)
- **Admin UI**: Available at /admin route for authenticated users

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