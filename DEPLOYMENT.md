# Legal Tech Careers - Self-Hosting Deployment Guide

Complete step-by-step instructions for deploying Legal Tech Careers on your own server, domain, and database - fully independent of Replit.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Install](#2-clone--install)
3. [Database Setup](#3-database-setup)
4. [Environment Variables](#4-environment-variables)
5. [Stripe Setup (Payments)](#5-stripe-setup-payments)
6. [OpenAI Setup (AI Features)](#6-openai-setup-ai-features)
7. [Google OAuth Setup (Optional)](#7-google-oauth-setup-optional)
8. [Build & Run](#8-build--run)
9. [Job Scraper & Scheduler](#9-job-scraper--scheduler)
10. [Reverse Proxy & Domain](#10-reverse-proxy--domain)
11. [Running Scraper Scripts Manually](#11-running-scraper-scripts-manually)
12. [Process Management (PM2)](#12-process-management-pm2)
13. [Updating & Maintenance](#13-updating--maintenance)
14. [Architecture Reference](#14-architecture-reference)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Prerequisites

- **Node.js** v20 or higher
- **npm** v9 or higher
- **PostgreSQL** 14+ (local install, managed service like Neon/Supabase/AWS RDS, or Docker)
- **A domain** with DNS configured (for production)
- **Stripe account** (for subscriptions/payments)
- **OpenAI API key** (for AI features - search, resume parsing, categorization)
- **Google Cloud project** (optional, for Google sign-in)

---

## 2. Clone & Install

```bash
# Clone the repository
git clone <your-repo-url> legal-tech-careers
cd legal-tech-careers

# Install dependencies
npm install
```

---

## 3. Database Setup

The app uses PostgreSQL with Drizzle ORM.

### Option A: Local PostgreSQL

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE legaltechcareers;
CREATE USER ltcuser WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE legaltechcareers TO ltcuser;
\q
```

Your connection string: `postgresql://ltcuser:your_secure_password@localhost:5432/legaltechcareers`

### Option B: Docker PostgreSQL

```bash
docker run -d \
  --name ltc-postgres \
  -e POSTGRES_DB=legaltechcareers \
  -e POSTGRES_USER=ltcuser \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  postgres:16
```

Your connection string: `postgresql://ltcuser:your_secure_password@localhost:5432/legaltechcareers`

### Option C: Managed Database (Neon, Supabase, AWS RDS)

Use the connection string provided by your service. It typically looks like:
`postgresql://user:password@host:port/database?sslmode=require`

### Push the Schema

Once you have a database, push the schema:

```bash
export DATABASE_URL="postgresql://ltcuser:your_secure_password@localhost:5432/legaltechcareers"
npm run db:push
```

This creates all tables: users, jobs, sessions, resumes, saved_jobs, job_alerts, notifications, user_activities, user_personas, built_resumes, job_categories, job_submissions.

---

## 4. Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env   # if .env.example exists, otherwise create manually
```

Here is every environment variable the app uses:

```env
# =============================================
# REQUIRED
# =============================================

# PostgreSQL connection string (from Step 3)
DATABASE_URL=postgresql://ltcuser:your_secure_password@localhost:5432/legaltechcareers

# Session secret - generate a random string (at least 32 characters)
# Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your_random_session_secret_here

# Your app's public URL (used for Stripe redirects, webhooks, etc.)
# Include the protocol, no trailing slash
APP_URL=https://yourdomain.com

# OpenAI API key (see Section 6)
OPENAI_API_KEY=sk-your-openai-api-key

# Stripe keys (see Section 5)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret

# =============================================
# OPTIONAL
# =============================================

# OpenAI base URL (only needed if using a proxy or Azure OpenAI)
# Leave unset to use the default OpenAI API endpoint
# OPENAI_BASE_URL=https://api.openai.com/v1

# Google OAuth (optional - enables "Sign in with Google")
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret

# Server port (defaults to 5000)
# PORT=5000

# Node environment
NODE_ENV=production
```

### Where Each Variable Is Used

| Variable | Used In | Purpose |
|---|---|---|
| `DATABASE_URL` | `server/db.ts`, `drizzle.config.ts` | PostgreSQL connection |
| `SESSION_SECRET` | `server/replit_integrations/auth/replitAuth.ts` | Encrypts session cookies |
| `APP_URL` | `server/routes.ts` | Stripe checkout/portal redirect URLs |
| `OPENAI_API_KEY` | `server/routes.ts`, `server/lib/resume-parser.ts`, `server/lib/job-categorizer.ts`, `server/lib/resume-matcher.ts`, `server/lib/resume-job-comparison.ts`, `server/lib/job-file-parser.ts`, `server/replit_integrations/chat/routes.ts` | All AI features |
| `OPENAI_BASE_URL` | Same files as above | Custom OpenAI endpoint (optional) |
| `STRIPE_SECRET_KEY` | `server/stripeClient.ts` | Stripe API calls |
| `STRIPE_PUBLISHABLE_KEY` | `server/stripeClient.ts` | Sent to frontend for Stripe.js |
| `STRIPE_WEBHOOK_SECRET` | `server/webhookHandlers.ts` | Validates Stripe webhook signatures |
| `GOOGLE_CLIENT_ID` | `server/replit_integrations/auth/replitAuth.ts` | Google OAuth login |
| `GOOGLE_CLIENT_SECRET` | `server/replit_integrations/auth/replitAuth.ts` | Google OAuth login |
| `PORT` | `server/index.ts` | Server listen port (default: 5000) |

---

## 5. Stripe Setup (Payments)

Stripe handles Pro subscriptions ($5/month or $30/year).

### 5a. Get Your API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers > API Keys**
3. Copy the **Publishable key** (`pk_live_...` or `pk_test_...`)
4. Copy the **Secret key** (`sk_live_...` or `sk_test_...`)
5. Paste them into your `.env` file as `STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`

> Use test keys (`pk_test_...`, `sk_test_...`) for development and live keys for production.

### 5b. Create Products & Prices

Run the seed script to create the Pro subscription product in Stripe:

```bash
npx tsx server/scripts/seed-stripe-products.ts
```

This creates:
- Product: "Legal Tech Careers Pro"
- Monthly price: $5/month
- Yearly price: $30/year

The script is safe to run multiple times - it will skip if the product already exists.

### 5c. Set Up Webhooks

Stripe webhooks notify your app when a subscription is created, updated, or canceled.

1. Go to **Stripe Dashboard > Developers > Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/stripe/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy the **Signing secret** (`whsec_...`)
7. Paste it into your `.env` as `STRIPE_WEBHOOK_SECRET`

### 5d. Test Webhooks Locally (Development)

For local development, use the Stripe CLI:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

This will give you a temporary webhook signing secret for local testing.

---

## 6. OpenAI Setup (AI Features)

All AI features (search, resume parsing, job categorization, career advisor, market insights, conversational assistant) use the OpenAI API.

### Get Your API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to **API Keys**
3. Create a new key
4. Copy it and paste into your `.env` as `OPENAI_API_KEY`

### Which Model Is Used

The app primarily uses `gpt-4o-mini` for most features and `gpt-4o` for some advanced features. Make sure your OpenAI account has access to these models.

### Cost Estimates

- Resume parsing: ~$0.01 per resume
- Job categorization: ~$0.005 per job
- Search queries: ~$0.01 per search
- Average monthly cost for a small deployment: $5-20 depending on usage

### Using Azure OpenAI or Other Providers

If you want to use Azure OpenAI or another compatible provider, set `OPENAI_BASE_URL` to the provider's endpoint URL.

---

## 7. Google OAuth Setup (Optional)

This enables "Sign in with Google" on the login page. The app also supports email/password registration without Google OAuth.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Set Application type to **Web application**
6. Add authorized redirect URIs:
   - `https://yourdomain.com/api/auth/google/callback`
   - `http://localhost:5000/api/auth/google/callback` (for development)
7. Copy the **Client ID** and **Client Secret**
8. Paste into your `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

If you don't configure Google OAuth, the login page will simply not show the "Continue with Google" button. Email/password auth always works.

---

## 8. Build & Run

### Development

```bash
# Load env vars (if using .env file, you may need dotenv-cli)
npm install -g dotenv-cli

# Run in development mode (hot reload)
dotenv npm run dev
```

The app will start at `http://localhost:5000`.

### Production Build

```bash
# Build the application
dotenv npm run build

# Start in production mode
dotenv npm run start
```

This builds:
- Frontend: React app compiled to `dist/public/`
- Backend: Server bundled to `dist/index.cjs`

The production server serves both the API and the static frontend from port 5000.

---

## 9. Job Scraper & Scheduler

The job scraper automatically collects job postings from legal tech companies. It runs as part of the main application process.

### How It Works

- **Scheduler**: A `setInterval` timer runs every 24 hours inside the Node.js process
- **Sources**: Greenhouse API, Lever API, Ashby API, and generic career page scraping
- **Companies**: Configured in `server/lib/law-firms-list.ts` and `server/lib/scheduled-scraper.ts`
- **Categorization**: Each scraped job is categorized by AI (OpenAI) into role categories, seniority levels, and key skills
- **Storage**: Jobs are stored in the PostgreSQL `jobs` table via `bulkUpsertJobs`
- **Link Validation**: Periodically checks if job apply URLs are still valid and deactivates broken ones

### Scheduler Behavior

The scheduler starts automatically when the server starts. It:
1. Runs an initial scrape shortly after server boot
2. Then runs every 24 hours
3. Scrapes from all configured sources (Greenhouse, Lever, etc.)
4. Categorizes new jobs using OpenAI
5. Deactivates jobs with broken links

### Adding New Companies to Scrape

Edit `server/lib/law-firms-list.ts` to add new companies:

```typescript
{
  name: 'Company Name',
  careerUrl: 'https://company.com/careers',
  atsType: 'greenhouse',  // or 'lever', 'ashby', 'generic'
  atsId: 'company-slug',  // The ID used in the ATS API
  companyType: 'legaltech',
}
```

### Scraper Scripts (Manual)

You can run scrapers manually:

```bash
# Run the main scraper
dotenv npx tsx server/scripts/run-scraper.ts

# Run the fast scraper (Greenhouse/Lever APIs only)
dotenv npx tsx server/scripts/fast-scrape.ts

# Run YC companies scraper
dotenv npx tsx server/scripts/run-yc-scraper.ts

# Deep-scrape metadata (location, salary for existing jobs)
dotenv npx tsx server/scripts/deep-scrape-metadata.ts

# Refetch job descriptions
dotenv npx tsx server/scripts/refetch-descriptions.ts
```

### Running Scraper on a Cron (Alternative)

If you prefer system-level cron instead of the built-in scheduler:

```bash
# Edit crontab
crontab -e

# Run scraper every day at 3 AM
0 3 * * * cd /path/to/legal-tech-careers && /usr/bin/node -e "require('dotenv').config(); require('./dist/index.cjs')" 2>&1 >> /var/log/ltc-scraper.log

# Or using the script directly
0 3 * * * cd /path/to/legal-tech-careers && dotenv npx tsx server/scripts/fast-scrape.ts >> /var/log/ltc-scraper.log 2>&1
```

---

## 10. Reverse Proxy & Domain

In production, put the app behind a reverse proxy (Nginx or Caddy) for SSL, caching, and security.

### Option A: Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Get a free SSL certificate:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Option B: Caddy (simpler, auto-SSL)

```
yourdomain.com {
    reverse_proxy localhost:5000
}
```

Caddy automatically handles SSL certificates.

---

## 11. Running Scraper Scripts Manually

Here's a quick reference for all available scripts:

| Script | Command | Purpose |
|---|---|---|
| Main Scraper | `dotenv npx tsx server/scripts/run-scraper.ts` | Scrapes all configured companies |
| Fast Scraper | `dotenv npx tsx server/scripts/fast-scrape.ts` | Quick scrape from Greenhouse/Lever APIs |
| YC Scraper | `dotenv npx tsx server/scripts/run-yc-scraper.ts` | Scrapes YC legaltech companies |
| Metadata Scraper | `dotenv npx tsx server/scripts/deep-scrape-metadata.ts` | Enriches jobs with location/salary |
| Description Refetch | `dotenv npx tsx server/scripts/refetch-descriptions.ts` | Re-downloads job descriptions |
| Quick Scrape | `dotenv npx tsx server/scripts/quick-scrape.ts` | Lightweight quick scrape |
| Stripe Seed | `dotenv npx tsx server/scripts/seed-stripe-products.ts` | Creates Stripe products/prices |

All scripts need the `DATABASE_URL` and `OPENAI_API_KEY` environment variables set.

---

## 12. Process Management (PM2)

For production, use PM2 to keep the app running, auto-restart on crashes, and manage logs:

```bash
# Install PM2
npm install -g pm2

# Start the app
pm2 start dist/index.cjs --name legal-tech-careers \
  --env-file .env

# Or if using dotenv
pm2 start ecosystem.config.js
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'legal-tech-careers',
    script: 'dist/index.cjs',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    env_file: '.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
```

Useful PM2 commands:

```bash
pm2 status                    # Check app status
pm2 logs legal-tech-careers   # View logs
pm2 restart legal-tech-careers  # Restart app
pm2 save                      # Save current process list
pm2 startup                   # Auto-start on server boot
```

---

## 13. Updating & Maintenance

### Updating the Code

```bash
git pull origin main
npm install
npm run build
pm2 restart legal-tech-careers
```

### Database Migrations

After schema changes:

```bash
dotenv npm run db:push
```

This safely syncs the Drizzle schema to your database without data loss.

### Backup Your Database

```bash
# Full backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20260206.sql
```

---

## 14. Architecture Reference

```
legal-tech-careers/
  client/                    # React frontend (Vite)
    src/
      components/            # Reusable UI components
      pages/                 # Page components (routes)
      hooks/                 # Custom React hooks
      lib/                   # Utility functions
  server/                    # Express backend
    lib/                     # Core business logic
      scheduled-scraper.ts   # Auto-scraping scheduler (24h interval)
      law-firm-scraper.ts    # Scraper implementations (Greenhouse, Lever, etc.)
      law-firms-list.ts      # Company list to scrape
      job-categorizer.ts     # AI job categorization
      resume-parser.ts       # AI resume parsing
      resume-matcher.ts      # AI resume-job matching
      resume-job-comparison.ts # Detailed resume-job comparison
      logger.ts              # Scraper logging
    scripts/                 # One-off scripts (scrapers, seed data)
    replit_integrations/     # Auth, chat, audio, image handlers
      auth/                  # Authentication (email/password + Google OAuth)
    routes.ts                # All API routes
    storage.ts               # Database operations (CRUD)
    db.ts                    # Database connection
    stripeClient.ts          # Stripe SDK initialization
    webhookHandlers.ts       # Stripe webhook processing
    index.ts                 # Server entry point
  shared/
    schema.ts                # Database schema (Drizzle ORM) + types
  dist/                      # Production build output
    public/                  # Compiled frontend assets
    index.cjs                # Compiled server bundle
```

### Key API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/register` | POST | No | Register with email/password |
| `/api/auth/login` | POST | No | Login |
| `/api/auth/user` | GET | Yes | Get current user |
| `/api/jobs` | GET | Yes | List all jobs |
| `/api/jobs/:id` | GET | Yes | Get job details |
| `/api/search` | POST | Yes | Quick search |
| `/api/search/analyze` | POST | Yes | AI-guided search (Pro) |
| `/api/resume/upload` | POST | Yes | Upload resume |
| `/api/resume/compare/:jobId` | GET | Yes | Compare resume to job (Pro) |
| `/api/dashboard` | GET | Yes | User analytics dashboard |
| `/api/stripe/create-checkout-session` | POST | Yes | Start Pro subscription |
| `/api/stripe/webhook` | POST | No | Stripe webhook handler |
| `/api/admin/scraper/run` | POST | Admin | Trigger manual scrape |

---

## 15. Troubleshooting

### App won't start

- **Missing DATABASE_URL**: Ensure your PostgreSQL connection string is correct and the database is running
- **Missing OPENAI_API_KEY**: The app requires this to initialize. Get one from platform.openai.com
- **Missing SESSION_SECRET**: Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **Port already in use**: Change the `PORT` env var or stop the conflicting process

### Database errors

- **"relation does not exist"**: Run `npm run db:push` to create tables
- **Connection refused**: Check PostgreSQL is running and the connection string is correct
- **SSL required**: Add `?sslmode=require` to your connection string for managed databases

### Stripe not working

- **Webhook errors**: Make sure `STRIPE_WEBHOOK_SECRET` matches the signing secret from your Stripe dashboard
- **No products/prices**: Run `dotenv npx tsx server/scripts/seed-stripe-products.ts`
- **Checkout redirects to wrong URL**: Check that `APP_URL` in your `.env` matches your actual domain

### Scraper not finding jobs

- **No OpenAI key**: Categorization requires `OPENAI_API_KEY`
- **Rate limited**: The scraper has built-in delays; if you hit API limits, increase `VALIDATION_DELAY_MS` in `server/lib/scheduled-scraper.ts`
- **Company removed from source**: Check the company's careers page is still active

### Google sign-in not showing

- **Missing env vars**: Both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must be set
- **Wrong redirect URI**: The redirect URI in Google Console must exactly match `https://yourdomain.com/api/auth/google/callback`

---

## Quick Start Checklist

1. [ ] PostgreSQL database created and running
2. [ ] `DATABASE_URL` set in `.env`
3. [ ] `npm run db:push` completed (tables created)
4. [ ] `SESSION_SECRET` generated and set
5. [ ] `OPENAI_API_KEY` set
6. [ ] `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` set
7. [ ] Stripe products seeded (`npx tsx server/scripts/seed-stripe-products.ts`)
8. [ ] Stripe webhook configured and `STRIPE_WEBHOOK_SECRET` set
9. [ ] `APP_URL` set to your domain
10. [ ] `npm run build` completed
11. [ ] App started with `npm run start`
12. [ ] Reverse proxy (Nginx/Caddy) configured with SSL
13. [ ] PM2 set up for process management
14. [ ] (Optional) Google OAuth configured
15. [ ] (Optional) Cron job set up for scraper
