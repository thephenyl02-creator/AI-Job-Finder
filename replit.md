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

## External Dependencies

- **Database**: PostgreSQL
- **AI Services**: OpenAI API
- **Authentication**: Replit OIDC provider
- **Payments**: Stripe (for subscriptions)
- **UI Components**: shadcn/ui (built on Radix UI)