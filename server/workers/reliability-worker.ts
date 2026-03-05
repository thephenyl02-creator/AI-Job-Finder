import { storage } from '../storage';
import { clearAllStatsCaches } from '../lib/mi-cache';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const STALENESS_DAYS = 45;
const RELIABILITY_INTERVAL_MS = 6 * 60 * 60 * 1000;
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

const DEAD_LINK_PHRASES = [
  /page\s*(not|no longer)\s*found/i,
  /no longer (available|accepting|active)/i,
  /position\s*(has been|was)\s*(filled|closed|removed)/i,
  /this job (has been|was) (removed|closed|filled)/i,
  /job\s*(not|no longer)\s*(found|available|exists)/i,
  /listing\s*(has been|was)\s*(removed|expired)/i,
  /404/,
  /we couldn'?t find/i,
  /does not exist/i,
];

function checkApplyUrl(url: string, maxRedirects = 5): Promise<{ ok: boolean; finalCode: number; finalUrl: string; softFail403: boolean }> {
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
          const code = r.statusCode || 0;

          if ((code === 301 || code === 302 || code === 307 || code === 308) && r.headers.location && remaining > 0) {
            r.resume();
            const nextUrl = new URL(r.headers.location, targetUrl).toString();
            followUrl(nextUrl, remaining - 1);
            return;
          }

          if (code === 403) {
            const chunks: Buffer[] = [];
            r.on('data', (chunk: Buffer) => chunks.push(chunk));
            r.on('end', () => {
              const body = Buffer.concat(chunks).toString('utf-8');
              const isSmallBody = body.length < 500;
              const hasDeadSignal = DEAD_LINK_PHRASES.some(p => p.test(body));
              const softFail403 = isSmallBody || hasDeadSignal;
              resolve({ ok: !softFail403, finalCode: code, finalUrl: targetUrl, softFail403 });
            });
            r.on('error', () => resolve({ ok: true, finalCode: code, finalUrl: targetUrl, softFail403: false }));
            return;
          }

          r.resume();
          const ok = code >= 200 && code < 400;
          resolve({ ok, finalCode: code, finalUrl: targetUrl, softFail403: false });
        });
        req.on('error', () => resolve({ ok: false, finalCode: 0, finalUrl: targetUrl, softFail403: false }));
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, finalCode: 0, finalUrl: targetUrl, softFail403: false }); });
        req.end();
      } catch {
        resolve({ ok: false, finalCode: 0, finalUrl: targetUrl, softFail403: false });
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
    const now = new Date();
    await storage.updateJobWorkerFields(job.id, {
      jobStatus: 'closed',
      closedAt: now,
      statusChangedAt: now,
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
      const now = new Date();
      await storage.updateJobWorkerFields(job.id, {
        isPublished: false,
        jobStatus: 'closed',
        closedAt: now,
        statusChangedAt: now,
        deactivatedAt: now,
        reviewReasonCode: 'NON_JOB_URL',
        lastCheckedAt: now,
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

  const batchSize = Math.min(200, publishedJobs.length);
  for (let i = publishedJobs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [publishedJobs[i], publishedJobs[j]] = [publishedJobs[j], publishedJobs[i]];
  }
  const sample = publishedJobs.slice(0, batchSize);
  console.log(`[Reliability] Checking apply links for ${sample.length}/${publishedJobs.length} published jobs...`);

  let broken = 0;
  for (let i = 0; i < sample.length; i += 10) {
    const batch = sample.slice(i, i + 10);
    const results = await Promise.all(
      batch.map(async (job) => {
        const result = await checkApplyUrl(job.applyUrl);
        return { job, ...result };
      })
    );

    for (const { job, ok, finalCode, softFail403 } of results) {
      if (!ok) {
        const failCount = (job as any).linkFailCount || 0;

        if (failCount >= 1) {
          const now = new Date();
          await storage.updateJobWorkerFields(job.id, {
            isPublished: false,
            jobStatus: 'closed',
            closedAt: now,
            statusChangedAt: now,
            deactivatedAt: now,
            reviewReasonCode: softFail403 ? 'DEAD_403_LINK' : 'BROKEN_APPLY_LINK',
            lastCheckedAt: now,
          });
          broken++;
          console.log(`[Reliability] Broken apply link confirmed (HTTP ${finalCode}${softFail403 ? ' soft-fail 403' : ''}, fails: ${failCount + 1}), unpublishing job ${job.id} "${job.title}" -> ${job.applyUrl}`);
        } else {
          await storage.updateJobWorkerFields(job.id, {
            lastCheckedAt: new Date(),
            linkFailCount: 1,
          });
          console.log(`[Reliability] First link failure for job ${job.id} "${job.title}" (HTTP ${finalCode}${softFail403 ? ' soft-fail 403' : ''}) — will re-check next cycle`);
        }
      } else {
        await storage.updateJobWorkerFields(job.id, {
          lastCheckedAt: new Date(),
          linkFailCount: 0,
        });
      }
    }

    if (i + 10 < sample.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (broken > 0) {
    console.log(`[Reliability] Found ${broken} broken apply links (confirmed on 2nd check) out of ${sample.length} checked`);
  }
  return { checked: sample.length, broken };
}

async function runReliabilityChecks() {
  console.log('[Reliability] Starting reliability checks...');
  const nonJob = await runNonJobUrlCleanup();
  const stale = await runStaleJobCleanup();
  const links = await runApplyLinkValidation();
  console.log(`[Reliability] Complete. Non-job removed: ${nonJob}. Stale closed: ${stale}. Links checked: ${links.checked}, broken: ${links.broken}`);
  if (nonJob > 0 || stale > 0 || links.broken > 0) {
    clearAllStatsCaches();
    console.log(`[Reliability] Market intelligence cache cleared`);
  }
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
