import axios from 'axios';
import { storage } from '../storage';
import type { InsertJob, Job } from '../../shared/schema';
import { logInfo, logWarn, logError, logSuccess, cleanupOldLogs } from './logger';

const SCRAPE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LINK_CHECK_TIMEOUT = 10000; // 10 seconds

const GREENHOUSE_SOURCES = [
  { name: 'Everlaw', id: 'everlaw', type: 'legaltech' },
  { name: 'NetDocuments', id: 'netdocuments', type: 'legaltech' },
  { name: 'Mitratech', id: 'mitratech', type: 'legaltech' },
  { name: 'Brightflag', id: 'brightflag', type: 'legaltech' },
  { name: 'Rocket Lawyer', id: 'rocketlawyer', type: 'legaltech' },
  { name: 'Gibson Dunn', id: 'gibsondunn', type: 'lawfirm' },
  { name: 'Legal Services NYC', id: 'legalservicesnyc', type: 'legalaid' },
  { name: 'Axiom', id: 'axiom', type: 'legaltech' },
];

const LEVER_SOURCES = [
  { name: 'Factor', id: 'factor' },
];

function stripHtml(html: string): string {
  let decoded = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
  
  decoded = decoded.replace(/<[^>]*>/g, ' ');
  return decoded.replace(/\s+/g, ' ').trim();
}

function isLegalCareerRole(title: string, desc: string = ''): boolean {
  const text = `${title} ${desc}`.toLowerCase();
  
  const legalKeywords = [
    'attorney', 'lawyer', 'counsel', 'paralegal', 'legal assistant',
    'litigation', 'associate', 'legal operations', 'legal ops',
    'contract', 'compliance', 'regulatory', 'corporate counsel',
    'in-house', 'general counsel', 'legal analyst', 'legal specialist',
  ];
  
  const techKeywords = [
    'engineer', 'developer', 'product', 'designer', 'data', 'ml', 'ai ',
    'machine learning', 'nlp', 'software', 'technical', 'solutions',
    'implementation', 'customer success', 'sales', 'operations',
    'innovation', 'technology', 'ediscovery', 'analytics', 'platform',
  ];
  
  const exclude = ['janitor', 'maintenance', 'facilities', 'cafeteria'];
  if (exclude.some(e => text.includes(e))) return false;
  
  return legalKeywords.some(k => text.includes(k)) || techKeywords.some(k => text.includes(k));
}

async function scrapeGreenhouse(name: string, id: string, orgType: string): Promise<InsertJob[]> {
  const jobs: InsertJob[] = [];
  
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`;
    const res = await axios.get(url, { timeout: 15000 });
    
    for (const job of res.data.jobs || []) {
      const isRelevant = (orgType === 'lawfirm' || orgType === 'legalaid') 
        ? true 
        : isLegalCareerRole(job.title || '', job.content || '');
      
      if (!isRelevant) continue;
      
      const cleanDescription = stripHtml(job.content || '').slice(0, 2000);
      
      let roleCategory = 'Legal Tech Startup Roles';
      if (orgType === 'lawfirm') roleCategory = 'Law Firm Tech & Innovation';
      if (orgType === 'legalaid') roleCategory = 'Legal AI Jobs';
      
      jobs.push({
        title: job.title || 'Untitled',
        company: name,
        companyLogo: `https://logo.clearbit.com/${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        location: job.location?.name || 'Remote',
        isRemote: (job.location?.name || '').toLowerCase().includes('remote'),
        description: cleanDescription,
        applyUrl: job.absolute_url || '',
        externalId: `gh_${id}_${job.id}`,
        source: 'greenhouse',
        roleCategory,
      });
    }
    
    logInfo('SCRAPE', `${name}: Found ${res.data.jobs?.length || 0} jobs, ${jobs.length} relevant`);
  } catch (error: any) {
    logError('SCRAPE', `${name}: Failed to scrape`, { error: error.message });
  }
  
  return jobs;
}

async function scrapeLever(name: string, id: string): Promise<InsertJob[]> {
  const jobs: InsertJob[] = [];
  
  try {
    const url = `https://api.lever.co/v0/postings/${id}`;
    const res = await axios.get(url, { timeout: 15000 });
    
    for (const job of res.data || []) {
      if (!isLegalCareerRole(job.text || '', job.descriptionPlain || '')) continue;
      
      jobs.push({
        title: job.text || 'Untitled',
        company: name,
        companyLogo: `https://logo.clearbit.com/${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        location: job.categories?.location || 'Remote',
        isRemote: (job.categories?.location || '').toLowerCase().includes('remote'),
        description: (job.descriptionPlain || '').slice(0, 2000),
        applyUrl: job.hostedUrl || '',
        externalId: `lever_${id}_${job.id}`,
        source: 'lever',
        roleCategory: 'Legal Tech Startup Roles',
      });
    }
    
    logInfo('SCRAPE', `${name}: Found ${res.data?.length || 0} jobs, ${jobs.length} relevant`);
  } catch (error: any) {
    logError('SCRAPE', `${name}: Failed to scrape`, { error: error.message });
  }
  
  return jobs;
}

export async function validateJobLinks(jobs: Job[]): Promise<{ valid: number; broken: number; brokenIds: number[] }> {
  logInfo('VALIDATE', `Starting link validation for ${jobs.length} jobs`);
  
  let valid = 0;
  let broken = 0;
  const brokenIds: number[] = [];
  
  const checkPromises = jobs.slice(0, 50).map(async (job) => {
    try {
      const response = await axios.head(job.applyUrl, { 
        timeout: LINK_CHECK_TIMEOUT,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });
      
      if (response.status >= 400) {
        brokenIds.push(job.id);
        broken++;
        logWarn('VALIDATE', `Broken link: ${job.company} - ${job.title}`, { 
          jobId: job.id, 
          status: response.status,
          url: job.applyUrl 
        });
      } else {
        valid++;
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        valid++;
      } else {
        brokenIds.push(job.id);
        broken++;
        logWarn('VALIDATE', `Link check failed: ${job.company} - ${job.title}`, { 
          jobId: job.id,
          error: error.message 
        });
      }
    }
  });
  
  await Promise.allSettled(checkPromises);
  
  logInfo('VALIDATE', `Link validation complete`, { valid, broken, checked: jobs.slice(0, 50).length });
  
  return { valid, broken, brokenIds };
}

export async function runScheduledScrape(): Promise<{
  newJobs: number;
  updatedJobs: number;
  totalJobs: number;
  brokenLinks: number;
  sources: { name: string; count: number }[];
}> {
  const startTime = Date.now();
  
  logInfo('SCHEDULER', '========================================');
  logInfo('SCHEDULER', 'Starting scheduled job scrape');
  logInfo('SCHEDULER', `Time: ${new Date().toISOString()}`);
  logInfo('SCHEDULER', '========================================');
  
  cleanupOldLogs();
  
  const allJobs: InsertJob[] = [];
  const sources: { name: string; count: number }[] = [];
  
  logInfo('SCRAPE', `Scraping ${GREENHOUSE_SOURCES.length} Greenhouse sources...`);
  const greenhouseResults = await Promise.allSettled(
    GREENHOUSE_SOURCES.map(s => scrapeGreenhouse(s.name, s.id, s.type))
  );
  
  for (let i = 0; i < greenhouseResults.length; i++) {
    const result = greenhouseResults[i];
    const source = GREENHOUSE_SOURCES[i];
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value);
      sources.push({ name: source.name, count: result.value.length });
    } else {
      sources.push({ name: source.name, count: 0 });
    }
  }
  
  logInfo('SCRAPE', `Scraping ${LEVER_SOURCES.length} Lever sources...`);
  const leverResults = await Promise.allSettled(
    LEVER_SOURCES.map(s => scrapeLever(s.name, s.id))
  );
  
  for (let i = 0; i < leverResults.length; i++) {
    const result = leverResults[i];
    const source = LEVER_SOURCES[i];
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value);
      sources.push({ name: source.name, count: result.value.length });
    } else {
      sources.push({ name: source.name, count: 0 });
    }
  }
  
  logInfo('SCRAPE', `Total jobs collected: ${allJobs.length}`);
  
  let inserted = 0;
  let updated = 0;
  
  if (allJobs.length > 0) {
    const result = await storage.bulkUpsertJobs(allJobs);
    inserted = result.inserted;
    updated = result.updated;
    logSuccess('DATABASE', `Jobs saved`, { inserted, updated });
  }
  
  const activeJobs = await storage.getActiveJobs();
  logInfo('VALIDATE', `Validating ${Math.min(50, activeJobs.length)} job links (sample)...`);
  const linkResults = await validateJobLinks(activeJobs);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  logInfo('SCHEDULER', '========================================');
  logSuccess('SCHEDULER', 'Scheduled scrape completed', {
    duration: `${duration}s`,
    newJobs: inserted,
    updatedJobs: updated,
    totalJobs: activeJobs.length,
    brokenLinks: linkResults.broken,
  });
  logInfo('SCHEDULER', '========================================');
  
  return {
    newJobs: inserted,
    updatedJobs: updated,
    totalJobs: activeJobs.length,
    brokenLinks: linkResults.broken,
    sources,
  };
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startScheduler(): void {
  if (schedulerInterval) {
    logWarn('SCHEDULER', 'Scheduler already running');
    return;
  }
  
  logInfo('SCHEDULER', `Scheduler started - will run every 24 hours`);
  logInfo('SCHEDULER', `Next run at: ${new Date(Date.now() + SCRAPE_INTERVAL_MS).toISOString()}`);
  
  schedulerInterval = setInterval(async () => {
    try {
      await runScheduledScrape();
    } catch (error: any) {
      logError('SCHEDULER', 'Scheduled scrape failed', { error: error.message });
    }
  }, SCRAPE_INTERVAL_MS);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logInfo('SCHEDULER', 'Scheduler stopped');
  }
}

export function isSchedulerRunning(): boolean {
  return schedulerInterval !== null;
}
