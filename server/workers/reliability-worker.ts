import { storage } from '../storage';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const STALENESS_DAYS = 45;
const RELIABILITY_INTERVAL_MS = 6 * 60 * 60 * 1000;
let intervalId: NodeJS.Timeout | null = null;

function checkApplyUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const mod = parsed.protocol === 'https:' ? https : http;
      const req = mod.request(parsed, {
        method: 'HEAD',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      }, (r) => {
        r.resume();
        const code = r.statusCode || 0;
        resolve(code >= 200 && code < 400 || code === 403);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

async function runStaleJobCleanup(): Promise<number> {
  const staleJobs = await storage.getStalePublishedJobs(STALENESS_DAYS);
  if (staleJobs.length === 0) return 0;

  console.log(`[Reliability] Found ${staleJobs.length} stale published jobs (not seen in ${STALENESS_DAYS}+ days)`);

  for (const job of staleJobs) {
    await storage.updateJobPipeline(job.id, {
      isPublished: false,
      reviewReasonCode: 'STALE_LISTING',
    });
  }

  console.log(`[Reliability] Unpublished ${staleJobs.length} stale jobs`);
  return staleJobs.length;
}

async function runApplyLinkValidation(): Promise<{ checked: number; broken: number }> {
  const publishedJobs = await storage.getPublishedJobsForLinkCheck();
  if (publishedJobs.length === 0) return { checked: 0, broken: 0 };

  const sample = publishedJobs.slice(0, 50);
  console.log(`[Reliability] Checking apply links for ${sample.length} published jobs...`);

  let broken = 0;
  for (let i = 0; i < sample.length; i += 5) {
    const batch = sample.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (job) => {
        const ok = await checkApplyUrl(job.applyUrl);
        return { job, ok };
      })
    );

    for (const { job, ok } of results) {
      if (!ok) {
        await storage.updateJobPipeline(job.id, {
          isPublished: false,
          reviewReasonCode: 'BROKEN_APPLY_LINK',
          lastCheckedAt: new Date(),
        });
        broken++;
        console.log(`[Reliability] Broken apply link: job ${job.id} "${job.title}" -> ${job.applyUrl}`);
      } else {
        await storage.updateJobPipeline(job.id, {
          lastCheckedAt: new Date(),
        });
      }
    }

    if (i + 5 < sample.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (broken > 0) {
    console.log(`[Reliability] Found ${broken} broken apply links out of ${sample.length} checked`);
  }
  return { checked: sample.length, broken };
}

async function runReliabilityChecks() {
  console.log('[Reliability] Starting reliability checks...');
  const stale = await runStaleJobCleanup();
  const links = await runApplyLinkValidation();
  console.log(`[Reliability] Complete. Stale unpublished: ${stale}. Links checked: ${links.checked}, broken: ${links.broken}`);
}

export function startReliabilityWorker() {
  if (intervalId) return;
  console.log('[Reliability] Starting reliability worker (every 6 hours)');

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
