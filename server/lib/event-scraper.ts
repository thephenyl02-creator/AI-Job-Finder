import { storage } from '../storage';
import type { InsertEvent } from '../../shared/schema';
import { getOpenAIClient } from './openai-client';
import { logInfo, logWarn, logError, logSuccess } from './logger';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const EVENT_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

interface EventScraperState {
  isRunning: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  intervalId: NodeJS.Timeout | null;
  lastResult: {
    discovered: number;
    inserted: number;
    updated: number;
    deactivated: number;
    errors: string[];
  } | null;
}

const scraperState: EventScraperState = {
  isRunning: false,
  lastRunAt: null,
  nextRunAt: null,
  intervalId: null,
  lastResult: null,
};

export function getEventScraperStatus() {
  return {
    isRunning: scraperState.isRunning,
    lastRunAt: scraperState.lastRunAt?.toISOString() || null,
    nextRunAt: scraperState.nextRunAt?.toISOString() || null,
    lastResult: scraperState.lastResult,
  };
}

function generateExternalId(title: string, organizer: string, startDate: string): string {
  const raw = `${title.toLowerCase().trim()}|${organizer.toLowerCase().trim()}|${startDate}`;
  return 'evt_' + crypto.createHash('md5').update(raw).digest('hex').slice(0, 16);
}

const REGION_QUERIES = [
  {
    region: "North America",
    prompt: `Find 8-10 real, upcoming legal technology events in the United States and Canada for the next 12 months. Include major conferences (ILTACON, Legalweek, CLOC), CLE programs, webinars, workshops, and networking events. Focus on legal tech, legal operations, AI in law, eDiscovery, contract management, and legal innovation.`,
  },
  {
    region: "Europe",
    prompt: `Find 6-8 real, upcoming legal technology events in Europe (UK, Germany, France, Netherlands, Nordics, etc.) for the next 12 months. Include conferences like Legal Geek, Legal Innovation & Tech Fest, European Legal Tech Association events, The Law Society events, and legal AI summits. Cover legal tech, regulatory technology (RegTech), GDPR compliance tech, and legal innovation.`,
  },
  {
    region: "Asia-Pacific",
    prompt: `Find 4-6 real, upcoming legal technology events in the Asia-Pacific region (Singapore, Australia, Japan, Hong Kong, India) for the next 12 months. Include conferences like Singapore LegalTech, ALITA events, Asia Legal Tech Forum, and law society tech events. Cover legal tech adoption, cross-border legal technology, and legal AI in Asian markets.`,
  },
  {
    region: "Global Virtual",
    prompt: `Find 5-7 real, upcoming virtual/online legal technology events, webinars, and CLE programs accessible worldwide for the next 12 months. Include events from organizations like ABA, IBA (International Bar Association), World Justice Forum, global legal tech summits, and online CLE providers. Focus on AI in law, legal innovation, access to justice technology, and legal tech careers.`,
  },
  {
    region: "Middle East, Africa & Latin America",
    prompt: `Find 3-5 real, upcoming legal technology events in the Middle East (Dubai, UAE, Saudi Arabia), Africa (South Africa, Kenya, Nigeria), and Latin America (Brazil, Mexico, Colombia) for the next 12 months. Include events like DIFC Innovation events, Africa Legal Tech Festival, legal innovation summits, and bar association technology programs in these regions.`,
  },
];

const SYSTEM_PROMPT = `You are a legal technology events researcher. Your job is to provide REAL, VERIFIABLE legal technology events that are happening or will happen. 

CRITICAL RULES:
1. Only include events that actually exist from known, real organizations
2. Use realistic dates for the upcoming 12 months from today
3. DO NOT invent or guess registration URLs — leave registrationUrl as null. URLs will be verified separately.
4. Be accurate about locations, costs, and event types
5. If you're not sure an event exists, DO NOT include it
6. Include a mix of event types: conferences, webinars, workshops, CLEs, hackathons, networking events
7. For each event, indicate if it's typically featured/major (isFeatured: true) or smaller/niche (isFeatured: false)
8. Include the organizer's well-known website domain if you know it (e.g. "americanbar.org"), in the "organizerDomain" field

Return a JSON object with an "events" key containing an array. Each event MUST have this exact structure:
{
  "title": "Full Event Name",
  "organizer": "Organization Name",
  "organizerDomain": "example.org",
  "eventType": "conference|seminar|webinar|workshop|cle|networking|hackathon|panel",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "location": "City, Country" or "Online",
  "attendanceType": "in-person|virtual|hybrid",
  "description": "2-3 sentence description of the event, its focus, and why it matters for legal tech professionals.",
  "registrationUrl": null,
  "cost": "$X - $Y" or "Free" or "TBD",
  "isFree": true/false,
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "cleCredits": "X CLE credits" or null,
  "isFeatured": true/false
}

Today's date is: ${new Date().toISOString().split('T')[0]}
Return ONLY the JSON object.`;

export function checkUrlExists(url: string): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const mod = parsed.protocol === 'https:' ? https : http;
      const req = mod.request(parsed, {
        method: 'HEAD',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,*/*',
        },
      }, (r) => {
        r.resume();
        const code = r.statusCode || 0;
        if (code >= 300 && code < 400 && r.headers.location) {
          const nextUrl = new URL(r.headers.location, url).toString();
          checkUrlExists(nextUrl).then(resolve).catch(() => resolve({ ok: false, status: 0 }));
          return;
        }
        resolve({ ok: code >= 200 && code < 400 || code === 403, status: code });
      });
      req.on('error', () => resolve({ ok: false, status: 0 }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0 }); });
      req.end();
    } catch {
      resolve({ ok: false, status: 0 });
    }
  });
}

const KNOWN_EVENT_URLS: Record<string, string> = {
  'iltacon': 'https://www.iltacon.org/',
  'legalweek': 'https://www.legalweek.com/',
  'cloc': 'https://cloc.org/events/',
  'legal geek': 'https://www.legalgeek.co/',
  'techshow': 'https://www.techshow.com/',
  'clio cloud conference': 'https://www.clio.com/conference/',
  'relativity fest': 'https://relativityfest.com/',
  'american bar association': 'https://www.americanbar.org/events/',
  'international bar association': 'https://www.ibanet.org/conferences',
  'law society': 'https://www.lawsociety.org.uk/events',
  'singapore legaltech': 'https://www.singaporelegaltechforum.com/',
};

function fetchPageContent(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const mod = parsed.protocol === 'https:' ? https : http;
      const req = mod.request(parsed, {
        method: 'GET',
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,*/*',
        },
      }, (r) => {
        if (r.statusCode && r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          fetchPageContent(new URL(r.headers.location, url).toString()).then(resolve);
          return;
        }
        if (!r.statusCode || r.statusCode >= 400) {
          r.resume();
          resolve(null);
          return;
        }
        let body = '';
        r.setEncoding('utf8');
        r.on('data', (c) => { body += c; if (body.length > 50000) r.destroy(); });
        r.on('end', () => {
          const text = body
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .toLowerCase()
            .trim();
          resolve(text.length > 50 ? text : null);
        });
        r.on('error', () => resolve(null));
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.end();
    } catch {
      resolve(null);
    }
  });
}

function eventMentionedOnPage(pageContent: string, eventTitle: string, organizer: string): boolean {
  const lc = pageContent.toLowerCase();
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'will', 'about']);
  const titleWords = eventTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  const matchedWords = titleWords.filter(w => lc.includes(w));
  const titleMatchRatio = titleWords.length > 0 ? matchedWords.length / titleWords.length : 0;

  if (titleMatchRatio >= 0.6 && matchedWords.length >= 2) return true;

  const orgWords = organizer.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  const orgMatched = orgWords.filter(w => lc.includes(w));
  const orgMatchRatio = orgWords.length > 0 ? orgMatched.length / orgWords.length : 0;

  return titleMatchRatio >= 0.5 && orgMatchRatio >= 0.5;
}

async function findVerifiedEventUrl(event: { title: string; organizer: string; organizerDomain?: string; startDate: string }): Promise<string | null> {
  const titleLower = event.title.toLowerCase();
  const orgLower = event.organizer.toLowerCase();

  for (const [key, url] of Object.entries(KNOWN_EVENT_URLS)) {
    if (titleLower.includes(key) || orgLower.includes(key)) {
      const { ok } = await checkUrlExists(url);
      if (ok) {
        logInfo('EVENTS', `Known event URL matched for "${event.title}": ${url}`);
        return url;
      }
    }
  }

  if (event.organizerDomain) {
    const orgUrl = `https://${event.organizerDomain}`;
    const pageContent = await fetchPageContent(orgUrl);
    if (pageContent && eventMentionedOnPage(pageContent, event.title, event.organizer)) {
      logInfo('EVENTS', `Event mentioned on organizer site for "${event.title}": ${orgUrl}`);
      return orgUrl;
    }

    const eventsUrl = `https://${event.organizerDomain}/events`;
    const eventsContent = await fetchPageContent(eventsUrl);
    if (eventsContent && eventMentionedOnPage(eventsContent, event.title, event.organizer)) {
      logInfo('EVENTS', `Event found on organizer /events page for "${event.title}": ${eventsUrl}`);
      return eventsUrl;
    }

    const { ok } = await checkUrlExists(orgUrl);
    if (ok) {
      logInfo('EVENTS', `Using verified organizer homepage for "${event.title}": ${orgUrl}`);
      return orgUrl;
    }
  }

  logWarn('EVENTS', `No verified URL found for "${event.title}" by ${event.organizer}`);
  return null;
}

async function discoverEventsForRegion(regionQuery: typeof REGION_QUERIES[0]): Promise<InsertEvent[]> {
  const openai = getOpenAIClient();
  
  try {
    logInfo('EVENTS', `Discovering events for: ${regionQuery.region}`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: regionQuery.prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logWarn('EVENTS', `Empty response for ${regionQuery.region}`);
      return [];
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      logError('EVENTS', `Failed to parse JSON for ${regionQuery.region}`);
      return [];
    }

    const rawEvents = Array.isArray(parsed) ? parsed : (parsed.events || parsed.data || []);
    if (!Array.isArray(rawEvents)) {
      logWarn('EVENTS', `No events array found for ${regionQuery.region}`);
      return [];
    }

    const validEvents: InsertEvent[] = [];
    const now = new Date();

    for (const raw of rawEvents) {
      if (!raw.title || !raw.organizer || !raw.startDate) continue;

      const startDate = new Date(raw.startDate);
      if (isNaN(startDate.getTime())) continue;
      if (startDate < now && !raw.endDate) continue;

      const endDate = raw.endDate ? new Date(raw.endDate) : null;
      if (endDate && isNaN(endDate.getTime())) continue;
      if (endDate && endDate < now) continue;

      const validTypes = ['conference', 'seminar', 'webinar', 'workshop', 'cle', 'networking', 'hackathon', 'panel'];
      const eventType = validTypes.includes(raw.eventType) ? raw.eventType : 'conference';

      const validAttendance = ['in-person', 'virtual', 'hybrid'];
      const attendanceType = validAttendance.includes(raw.attendanceType) ? raw.attendanceType : 'in-person';

      const verifiedUrl = await findVerifiedEventUrl({
        title: raw.title,
        organizer: raw.organizer,
        organizerDomain: raw.organizerDomain || null,
        startDate: raw.startDate,
      });

      validEvents.push({
        title: String(raw.title).slice(0, 500),
        organizer: String(raw.organizer).slice(0, 255),
        eventType,
        startDate,
        endDate,
        location: raw.location ? String(raw.location).slice(0, 255) : (attendanceType === 'virtual' ? 'Online' : 'TBD'),
        attendanceType,
        description: String(raw.description || '').slice(0, 2000),
        registrationUrl: verifiedUrl || '',
        cost: raw.cost ? String(raw.cost).slice(0, 100) : 'TBD',
        isFree: Boolean(raw.isFree),
        topics: Array.isArray(raw.topics) ? raw.topics.map((t: any) => String(t)) : [],
        speakers: null,
        cleCredits: raw.cleCredits ? String(raw.cleCredits) : null,
        isFeatured: Boolean(raw.isFeatured),
        isActive: !!verifiedUrl,
        externalId: generateExternalId(raw.title, raw.organizer, raw.startDate),
        source: `ai_discovery_${regionQuery.region.toLowerCase().replace(/[^a-z]/g, '_')}`,
      });
    }

    logInfo('EVENTS', `${regionQuery.region}: ${rawEvents.length} raw -> ${validEvents.length} valid events (${validEvents.filter(e => e.isActive).length} with verified URLs)`);
    return validEvents;
  } catch (error: any) {
    logError('EVENTS', `Failed to discover events for ${regionQuery.region}`, { error: error.message });
    return [];
  }
}

export async function runEventDiscovery(): Promise<{
  discovered: number;
  inserted: number;
  updated: number;
  deactivated: number;
  errors: string[];
}> {
  logWarn('EVENTS', 'AI event discovery is disabled — events must be added manually through admin tools with verified URLs');
  return { discovered: 0, inserted: 0, updated: 0, deactivated: 0, errors: ['AI event discovery is disabled. Add events manually via admin panel.'] };
}

export function startEventScheduler() {
  logWarn('EVENTS', 'Event scheduler is disabled — AI event discovery has been turned off');
}

export function stopEventScheduler() {
  if (scraperState.intervalId) {
    clearInterval(scraperState.intervalId);
    scraperState.intervalId = null;
    scraperState.nextRunAt = null;
    logInfo('EVENTS', 'Event scheduler stopped');
  }
}
