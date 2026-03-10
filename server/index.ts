import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startEventLinkValidation } from "./lib/event-link-validator";
import { startEnrichmentWorker, recoverStuckReadyJobs } from "./workers/enrichment-worker";
import { startReliabilityWorker } from "./workers/reliability-worker";
import { loadDisplayStatsFromDB } from "./lib/mi-cache";
import { runScheduledScrape } from "./lib/scheduled-scraper";
import { storage } from "./storage";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';

const app = express();
const httpServer = createServer(app);

async function scrapeNewATSCompanies() {
  const { LAW_FIRMS_AND_COMPANIES } = await import('./lib/law-firms-list');
  const { scrapeSingleCompany } = await import('./lib/law-firm-scraper');

  const atsCompanies = LAW_FIRMS_AND_COMPANIES.filter(
    f => f.icims || f.ultipro || f.virecruit
  );

  if (atsCompanies.length === 0) return;

  const { pool } = await import('./db');
  const { rows } = await pool.query('SELECT LOWER(company) as name FROM jobs GROUP BY LOWER(company)');
  const companiesWithJobs = new Set(rows.map((r: any) => r.name));

  const newCompanies = atsCompanies.filter(
    f => !companiesWithJobs.has(f.name.toLowerCase())
  );

  if (newCompanies.length === 0) {
    console.log('[New ATS Scrape] All ATS companies already have jobs in DB');
    return;
  }

  console.log(`[New ATS Scrape] Found ${newCompanies.length} ATS companies with 0 jobs: ${newCompanies.map(f => f.name).join(', ')}`);

  await new Promise(resolve => setTimeout(resolve, 30000));

  let totalInserted = 0;
  for (const firm of newCompanies) {
    try {
      console.log(`[New ATS Scrape] Scraping ${firm.name}...`);
      const jobs = await scrapeSingleCompany(firm.name);
      if (jobs.length > 0) {
        const { inserted } = await storage.bulkUpsertJobs(jobs);
        totalInserted += inserted;
        console.log(`[New ATS Scrape] ${firm.name}: ${jobs.length} scraped, ${inserted} inserted`);
      } else {
        console.log(`[New ATS Scrape] ${firm.name}: 0 jobs found`);
      }
    } catch (err: any) {
      console.error(`[New ATS Scrape] ${firm.name} failed: ${err.message}`);
    }
  }

  console.log(`[New ATS Scrape] Complete: ${totalInserted} new jobs inserted from ${newCompanies.length} companies`);
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      const { processWebhook } = await import('./webhookHandlers');
      await processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);

      (async () => {
        try {
          const databaseUrl = process.env.DATABASE_URL;
          if (databaseUrl) {
            log('Initializing Stripe schema...');
            await runMigrations({ databaseUrl });
            log('Stripe schema ready');

            try {
              const stripeSync = await getStripeSync();

              const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
              const { webhook } = await stripeSync.findOrCreateManagedWebhook(
                `${webhookBaseUrl}/api/stripe/webhook`
              );
              log(`Stripe webhook configured: ${webhook.url}`);

              stripeSync.syncBackfill()
                .then(() => log('Stripe data synced'))
                .catch((err: any) => log(`Stripe sync skipped: ${err.message}`));
            } catch (syncErr: any) {
              log(`Stripe sync/webhook setup skipped: ${syncErr.message}`);
              log('Core Stripe checkout will still work via direct API calls');
            }
          }
        } catch (err: any) {
          console.error('Stripe init error (non-fatal):', err.message);
        }
      })();

      loadDisplayStatsFromDB().then(() => {
        startEventLinkValidation();
        startEnrichmentWorker();
        startReliabilityWorker();
      }).catch(err => {
        console.error('[DisplayStats] Load failed, starting workers anyway:', err.message);
        startEventLinkValidation();
        startEnrichmentWorker();
        startReliabilityWorker();
      });

      setTimeout(async () => {
        try {
          const result = await recoverStuckReadyJobs();
          if (result.promoted > 0) {
            log(`Recovery: ${result.promoted} stuck jobs published`);
          }
        } catch (err: any) {
          console.error('[Recovery] Failed:', err.message);
        }
      }, 30000);

      setTimeout(async () => {
        try {
          const { backfillCountryCodes } = await import('./scripts/backfill-countries');
          const result = await backfillCountryCodes();
          if (result.updated > 0) {
            log(`Country backfill: ${result.updated} jobs updated`);
          }
        } catch (err: any) {
          console.error('[Country Backfill] Startup backfill failed:', err.message);
        }

        try {
          const published = await storage.getPublishedJobs();
          if (published.length < 100) {
            log(`Only ${published.length} published jobs found — triggering initial full scrape`);
            runScheduledScrape('startup-initial').catch(err => {
              console.error('[Startup Scrape] Failed:', err.message);
            });
          } else {
            log(`${published.length} published jobs found — skipping initial scrape`);
            scrapeNewATSCompanies().catch(err => {
              console.error('[New ATS Scrape] Failed:', err.message);
            });
          }
        } catch (err: any) {
          console.error('[Startup Scrape] Check failed:', err.message);
        }
      }, 10000);
    },
  );
})();
