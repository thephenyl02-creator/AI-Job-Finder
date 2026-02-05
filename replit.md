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
- **Configuration**: Uses `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables

### Resume Upload
- **Supported Formats**: PDF, DOCX (max 5MB)
- **Processing**: pdf-parse for PDFs, mammoth for DOCX
- **AI Extraction**: Extracts skills, experience, preferred roles, salary expectations
- **Auto-search**: Generates natural language search query from resume data

### Project Structure
```
client/           # Frontend React application
  src/
    components/   # UI components including shadcn/ui
    pages/        # Route pages (landing, home, not-found)
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