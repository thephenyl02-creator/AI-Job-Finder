import { storage } from '../storage';
import type { InsertEvent } from '../../shared/schema';
import { getOpenAIClient } from './openai-client';
import { logInfo, logWarn, logError, logSuccess } from './logger';
import crypto from 'crypto';

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
1. Only include events that actually exist from known organizations
2. Use realistic dates for the upcoming 12 months from today
3. Provide actual registration URLs when known, or the organizer's main website
4. Be accurate about locations, costs, and event types
5. If you're not sure an event exists, DO NOT include it
6. Include a mix of event types: conferences, webinars, workshops, CLEs, hackathons, networking events
7. For each event, indicate if it's typically featured/major (isFeatured: true) or smaller/niche (isFeatured: false)

Return a JSON array of events. Each event MUST have this exact structure:
{
  "title": "Full Event Name",
  "organizer": "Organization Name",
  "eventType": "conference|seminar|webinar|workshop|cle|networking|hackathon|panel",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "location": "City, Country" or "Online",
  "attendanceType": "in-person|virtual|hybrid",
  "description": "2-3 sentence description of the event, its focus, and why it matters for legal tech professionals.",
  "registrationUrl": "https://...",
  "cost": "$X - $Y" or "Free" or "TBD",
  "isFree": true/false,
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "cleCredits": "X CLE credits" or null,
  "isFeatured": true/false
}

Today's date is: ${new Date().toISOString().split('T')[0]}
Return ONLY the JSON array, no other text.`;

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
      if (!raw.title || !raw.organizer || !raw.startDate || !raw.registrationUrl) continue;

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

      validEvents.push({
        title: String(raw.title).slice(0, 500),
        organizer: String(raw.organizer).slice(0, 255),
        eventType,
        startDate,
        endDate,
        location: raw.location ? String(raw.location).slice(0, 255) : (attendanceType === 'virtual' ? 'Online' : 'TBD'),
        attendanceType,
        description: String(raw.description || '').slice(0, 2000),
        registrationUrl: String(raw.registrationUrl).slice(0, 500),
        cost: raw.cost ? String(raw.cost).slice(0, 100) : 'TBD',
        isFree: Boolean(raw.isFree),
        topics: Array.isArray(raw.topics) ? raw.topics.map((t: any) => String(t)) : [],
        speakers: null,
        cleCredits: raw.cleCredits ? String(raw.cleCredits) : null,
        isFeatured: Boolean(raw.isFeatured),
        isActive: true,
        externalId: generateExternalId(raw.title, raw.organizer, raw.startDate),
        source: `ai_discovery_${regionQuery.region.toLowerCase().replace(/[^a-z]/g, '_')}`,
      });
    }

    logInfo('EVENTS', `${regionQuery.region}: ${rawEvents.length} raw -> ${validEvents.length} valid events`);
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
  if (scraperState.isRunning) {
    logWarn('EVENTS', 'Event discovery already running, skipping');
    return { discovered: 0, inserted: 0, updated: 0, deactivated: 0, errors: ['Already running'] };
  }

  scraperState.isRunning = true;
  const errors: string[] = [];
  let totalDiscovered = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalDeactivated = 0;

  try {
    logInfo('EVENTS', '=== Starting Global Event Discovery ===');

    for (const regionQuery of REGION_QUERIES) {
      try {
        const events = await discoverEventsForRegion(regionQuery);
        totalDiscovered += events.length;

        if (events.length > 0) {
          const { inserted, updated } = await storage.bulkUpsertEvents(events);
          totalInserted += inserted;
          totalUpdated += updated;
          logSuccess('EVENTS', `${regionQuery.region}: +${inserted} new, ~${updated} updated`);
        }
      } catch (error: any) {
        const msg = `${regionQuery.region}: ${error.message}`;
        errors.push(msg);
        logError('EVENTS', msg);
      }
    }

    totalDeactivated = await storage.deactivatePastEvents();
    if (totalDeactivated > 0) {
      logInfo('EVENTS', `Deactivated ${totalDeactivated} past events`);
    }

    logSuccess('EVENTS', `=== Event Discovery Complete: ${totalDiscovered} found, +${totalInserted} new, ~${totalUpdated} updated, -${totalDeactivated} deactivated ===`);
  } catch (error: any) {
    errors.push(error.message);
    logError('EVENTS', `Fatal error in event discovery: ${error.message}`);
  } finally {
    scraperState.isRunning = false;
    scraperState.lastRunAt = new Date();
    scraperState.lastResult = {
      discovered: totalDiscovered,
      inserted: totalInserted,
      updated: totalUpdated,
      deactivated: totalDeactivated,
      errors,
    };
  }

  return { discovered: totalDiscovered, inserted: totalInserted, updated: totalUpdated, deactivated: totalDeactivated, errors };
}

export function startEventScheduler() {
  if (scraperState.intervalId) {
    clearInterval(scraperState.intervalId);
  }

  scraperState.nextRunAt = new Date(Date.now() + EVENT_REFRESH_INTERVAL_MS);
  logInfo('EVENTS', `Event scheduler started - will refresh every 7 days`);
  logInfo('EVENTS', `Next event refresh at: ${scraperState.nextRunAt.toISOString()}`);

  scraperState.intervalId = setInterval(async () => {
    scraperState.nextRunAt = new Date(Date.now() + EVENT_REFRESH_INTERVAL_MS);
    await runEventDiscovery();
  }, EVENT_REFRESH_INTERVAL_MS);

  setTimeout(() => {
    runEventDiscovery().catch(err => logError('EVENTS', `Initial event discovery failed: ${err.message}`));
  }, 30000);
}

export function stopEventScheduler() {
  if (scraperState.intervalId) {
    clearInterval(scraperState.intervalId);
    scraperState.intervalId = null;
    scraperState.nextRunAt = null;
    logInfo('EVENTS', 'Event scheduler stopped');
  }
}
