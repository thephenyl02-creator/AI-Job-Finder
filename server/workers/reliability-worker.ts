import { storage } from '../storage';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const STALENESS_DAYS = 45;
const RELIABILITY_INTERVAL_MS = 3 * 60 * 60 * 1000;
let intervalId: NodeJS.Timeout | null = null;

const NON_JOB_URL_PATTERNS = [
  /\/news\//i,
  /\/blog\//i,
  /\/press-release/i,
  /\/articles?\//i,
  /\/insights?\//i,
  /\/resources?\//i,
  /\/whitepaper/i,
  /\/webinar/i,
  /\/events?\//i,
  /\/about\/?$/i,
  /\/contact\/?$/i,
];

const GENERIC_PORTAL_PATTERNS = [
  /\/jobs\/intro\?/i,
  /\/jobs\/?(\?.*)?$/i,
  /\/careers\/?(\?.*)?$/i,
  /\/openings\/?$/i,
];

function isNonJobUrl(url: string): boolean {
  return NON_JOB_URL_PATTERNS.some(p => p.test(url));
}

function isGenericPortalUrl(url: string): boolean {
  return GENERIC_PORTAL_PATTERNS.some(p => p.test(url));
}

function checkApplyUrl(url: string, maxRedirects = 5): Promise<{ ok: boolean; finalCode: number; finalUrl: string }> {
  return new Promise((resolve) => {
    function followUrl(targetUrl: string, remaining: number) {
      try {
        const parsed = new URL(targetUrl);
        const mod = parsed.protocol === 'https:' ? https : http;
        const req = mod.request(parsed, {
          method: 'GET',
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        }, (r) => {
          r.resume();
          const code = r.statusCode || 0;

          if ((code === 301 || code === 302 || code === 307 || code === 308) && r.headers.location && remaining > 0) {
            const nextUrl = new URL(r.headers.location, targetUrl).toString();
            followUrl(nextUrl, remaining - 1);
            return;
          }

          const ok = code >= 200 && code < 400 || code === 403;
          resolve({ ok, finalCode: code, finalUrl: targetUrl });
        });
        req.on('error', () => resolve({ ok: false, finalCode: 0, finalUrl: targetUrl }));
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, finalCode: 0, finalUrl: targetUrl }); });
        req.end();
      } catch {
        resolve({ ok: false, finalCode: 0, finalUrl: targetUrl });
      }
    }

    followUrl(url, maxRedirects);
  });
}

async function runStaleJobCleanup(): Promise<number> {
  const staleJobs = await storage.getStalePublishedJobs(STALENESS_DAYS);
  if (staleJobs.length === 0) return 0;

  console.log(`[Reliability] Found ${staleJobs.length} stale published jobs (not seen in ${STALENESS_DAYS}+ days)`);

  for (const job of staleJobs) {
    await storage.updateJobWorkerFields(job.id, {
      jobStatus: 'closed',
      reviewReasonCode: 'STALE_LISTING',
    });
  }

  console.log(`[Reliability] Closed ${staleJobs.length} stale jobs (jobStatus='closed')`);
  return staleJobs.length;
}

async function runNonJobUrlCleanup(): Promise<number> {
  const publishedJobs = await storage.getPublishedJobsForLinkCheck();
  let removed = 0;

  for (const job of publishedJobs) {
    if (isNonJobUrl(job.applyUrl) || isGenericPortalUrl(job.applyUrl)) {
      await storage.updateJobWorkerFields(job.id, {
        isPublished: false,
        jobStatus: 'closed',
        reviewReasonCode: 'NON_JOB_URL',
        lastCheckedAt: new Date(),
      });
      removed++;
      console.log(`[Reliability] Non-job URL detected, unpublishing job ${job.id} "${job.title}" -> ${job.applyUrl}`);
    }
  }

  if (removed > 0) {
    console.log(`[Reliability] Removed ${removed} non-job URLs (news articles, generic portals)`);
  }
  return removed;
}

async function runApplyLinkValidation(): Promise<{ checked: number; broken: number }> {
  const publishedJobs = await storage.getPublishedJobsForLinkCheck();
  if (publishedJobs.length === 0) return { checked: 0, broken: 0 };

  const sample = publishedJobs.slice(0, 100);
  console.log(`[Reliability] Checking apply links for ${sample.length} published jobs...`);

  let broken = 0;
  for (let i = 0; i < sample.length; i += 5) {
    const batch = sample.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (job) => {
        const result = await checkApplyUrl(job.applyUrl);
        return { job, ...result };
      })
    );

    for (const { job, ok, finalCode, finalUrl } of results) {
      if (!ok) {
        await storage.updateJobWorkerFields(job.id, {
          isPublished: false,
          jobStatus: 'closed',
          reviewReasonCode: 'BROKEN_APPLY_LINK',
          lastCheckedAt: new Date(),
        });
        broken++;
        console.log(`[Reliability] Broken apply link (HTTP ${finalCode}), unpublishing job ${job.id} "${job.title}" -> ${job.applyUrl}`);
      } else {
        await storage.updateJobWorkerFields(job.id, {
          lastCheckedAt: new Date(),
        });
      }
    }

    if (i + 5 < sample.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  if (broken > 0) {
    console.log(`[Reliability] Found ${broken} broken apply links out of ${sample.length} checked`);
  }
  return { checked: sample.length, broken };
}

async function runReliabilityChecks() {
  console.log('[Reliability] Starting reliability checks...');
  const nonJob = await runNonJobUrlCleanup();
  const stale = await runStaleJobCleanup();
  const links = await runApplyLinkValidation();
  console.log(`[Reliability] Complete. Non-job removed: ${nonJob}. Stale closed: ${stale}. Links checked: ${links.checked}, broken: ${links.broken}`);
}

export function startReliabilityWorker() {
  if (intervalId) return;
  console.log('[Reliability] Starting reliability worker (every 3 hours)');

  setTimeout(() => {
    runReliabilityChecks().catch(console.error);
  }, 60000);

  intervalId = setInterval(() => {
    runReliabilityChecks().catch(console.error);
  }, RELIABILITY_INTERVAL_MS);
}

export function stopReliabilityWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export async function runReliabilityNow() {
  return runReliabilityChecks();
}
