import { storage } from '../storage';
import https from 'https';
import http from 'http';
import { URL } from 'url';

interface LinkCheckResult {
  eventId: number;
  url: string;
  status: number;
  ok: boolean;
}

const LINK_CHECK_INTERVAL_MS = 60 * 60 * 1000;
let intervalId: NodeJS.Timeout | null = null;
let isRunning = false;

function checkUrl(url: string): Promise<{ status: number; ok: boolean }> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const mod = parsed.protocol === 'https:' ? https : http;
      const req = mod.request(
        parsed,
        {
          method: 'HEAD',
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        },
        (r) => {
          r.resume();
          const code = r.statusCode || 0;
          if (code >= 300 && code < 400 && r.headers.location) {
            resolve({ status: code, ok: true });
          } else {
            resolve({ status: code, ok: code >= 200 && code < 400 });
          }
        }
      );
      req.on('error', () => resolve({ status: 0, ok: false }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 0, ok: false });
      });
      req.end();
    } catch {
      resolve({ status: 0, ok: false });
    }
  });
}

async function validateEventLinks(): Promise<{ checked: number; verified: number; broken: number }> {
  if (isRunning) return { checked: 0, verified: 0, broken: 0 };
  isRunning = true;

  try {
    const eventsToCheck = await storage.getEventsNeedingLinkCheck(24);
    if (eventsToCheck.length === 0) {
      return { checked: 0, verified: 0, broken: 0 };
    }

    console.log(`[EventLinkValidator] Checking ${eventsToCheck.length} event links...`);

    let verified = 0;
    let broken = 0;

    for (let i = 0; i < eventsToCheck.length; i += 3) {
      const batch = eventsToCheck.slice(i, i + 3);
      const results = await Promise.all(
        batch.map(async (event): Promise<LinkCheckResult> => {
          if (!event.registrationUrl) {
            return { eventId: event.id, url: '', status: 0, ok: false };
          }
          const result = await checkUrl(event.registrationUrl);
          return { eventId: event.id, url: event.registrationUrl, ...result };
        })
      );

      for (const result of results) {
        if (result.ok || result.status === 403) {
          await storage.updateEventLinkStatus(result.eventId, 'verified');
          verified++;
        } else {
          await storage.updateEventLinkStatus(result.eventId, 'broken');
          broken++;
          console.log(`[EventLinkValidator] Broken link: event ${result.eventId} -> ${result.url} (status: ${result.status})`);
        }
      }

      if (i + 3 < eventsToCheck.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log(`[EventLinkValidator] Done: ${eventsToCheck.length} checked, ${verified} verified, ${broken} broken`);
    return { checked: eventsToCheck.length, verified, broken };
  } catch (error) {
    console.error('[EventLinkValidator] Error:', error);
    return { checked: 0, verified: 0, broken: 0 };
  } finally {
    isRunning = false;
  }
}

export function startEventLinkValidation() {
  if (intervalId) return;

  console.log('[EventLinkValidator] Starting automatic link validation (every hour, 24h expiry)');

  setTimeout(() => {
    validateEventLinks().catch(console.error);
  }, 10000);

  intervalId = setInterval(() => {
    validateEventLinks().catch(console.error);
  }, LINK_CHECK_INTERVAL_MS);
}

export function stopEventLinkValidation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export async function runEventLinkValidationNow() {
  return validateEventLinks();
}

export function getEventLinkValidationStatus() {
  return { isRunning, intervalActive: !!intervalId };
}
