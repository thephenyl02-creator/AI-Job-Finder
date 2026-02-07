import axios from 'axios';
import { storage } from '../storage';
import type { InsertJob, Job } from '../../shared/schema';
import { logInfo, logWarn, logError, logSuccess, cleanupOldLogs } from './logger';
import { stripHtml, isRelevantRole } from './html-utils';
import { categorizeJob } from './job-categorizer';
import { matchNewJobsAgainstAlerts } from './alert-matcher';

const SCRAPE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LINK_CHECK_TIMEOUT = 10000; // 10 seconds for each request
const VALIDATION_DELAY_MS = 10000; // 10 seconds between validations

// Validation state for background processing
interface ValidationState {
  isRunning: boolean;
  currentIndex: number;
  totalJobs: number;
  validCount: number;
  brokenCount: number;
  brokenIds: number[];
  startedAt: Date | null;
  lastCheckedAt: Date | null;
  abortController: AbortController | null;
}

const validationState: ValidationState = {
  isRunning: false,
  currentIndex: 0,
  totalJobs: 0,
  validCount: 0,
  brokenCount: 0,
  brokenIds: [],
  startedAt: null,
  lastCheckedAt: null,
  abortController: null,
};

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

async function scrapeGreenhouse(name: string, id: string, orgType: string): Promise<InsertJob[]> {
  const jobs: InsertJob[] = [];
  
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`;
    const res = await axios.get(url, { timeout: 15000 });
    
    for (const job of res.data.jobs || []) {
      const isRelevant = isRelevantRole(job.title || '', job.content || '', orgType);
      
      if (!isRelevant) continue;
      
      const cleanDescription = stripHtml(job.content || '');
      
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
      if (!isRelevantRole(job.text || '', job.descriptionPlain || '')) continue;
      
      const descHtml = job.description || '';
      const descPlain = job.descriptionPlain || '';
      const cleanDesc = descHtml ? stripHtml(descHtml) : descPlain;
      
      jobs.push({
        title: job.text || 'Untitled',
        company: name,
        companyLogo: `https://logo.clearbit.com/${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        location: job.categories?.location || 'Remote',
        isRemote: (job.categories?.location || '').toLowerCase().includes('remote'),
        description: cleanDesc,
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

// Get current validation status
export function getValidationStatus(): {
  isRunning: boolean;
  progress: { current: number; total: number };
  stats: { valid: number; broken: number };
  startedAt: Date | null;
  lastCheckedAt: Date | null;
} {
  return {
    isRunning: validationState.isRunning,
    progress: {
      current: validationState.currentIndex,
      total: validationState.totalJobs,
    },
    stats: {
      valid: validationState.validCount,
      broken: validationState.brokenCount,
    },
    startedAt: validationState.startedAt,
    lastCheckedAt: validationState.lastCheckedAt,
  };
}

// Check a single job link
async function checkSingleJobLink(job: Job): Promise<boolean> {
  try {
    // Try HEAD request first
    const response = await axios.head(job.applyUrl, {
      timeout: LINK_CHECK_TIMEOUT,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });

    if (response.status >= 400) {
      return false; // Broken
    }
    return true; // Valid
  } catch (error: any) {
    // Treat timeouts as valid (server might be slow but reachable)
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    // Some servers block HEAD requests, try GET as fallback
    try {
      const getResponse = await axios.get(job.applyUrl, {
        timeout: LINK_CHECK_TIMEOUT,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
        headers: { 'Range': 'bytes=0-0' }, // Request minimal data
      });
      
      if (getResponse.status >= 400) {
        return false;
      }
      return true;
    } catch {
      // If both fail, mark as broken
      return false;
    }
  }
}

// Sleep helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start continuous background validation
export async function startContinuousValidation(): Promise<void> {
  if (validationState.isRunning) {
    logWarn('VALIDATE', 'Validation already in progress');
    return;
  }

  const jobs = await storage.getActiveJobs();
  
  if (jobs.length === 0) {
    logInfo('VALIDATE', 'No jobs to validate');
    return;
  }

  // Reset state
  validationState.isRunning = true;
  validationState.currentIndex = 0;
  validationState.totalJobs = jobs.length;
  validationState.validCount = 0;
  validationState.brokenCount = 0;
  validationState.brokenIds = [];
  validationState.startedAt = new Date();
  validationState.lastCheckedAt = null;
  validationState.abortController = new AbortController();

  logInfo('VALIDATE', `Starting continuous validation for ${jobs.length} jobs (10s interval)`);

  // Process jobs one at a time
  for (let i = 0; i < jobs.length; i++) {
    // Check if validation was stopped
    if (!validationState.isRunning) {
      logInfo('VALIDATE', 'Validation stopped by user');
      break;
    }

    const job = jobs[i];
    validationState.currentIndex = i + 1;

    try {
      const isValid = await checkSingleJobLink(job);
      validationState.lastCheckedAt = new Date();

      if (isValid) {
        validationState.validCount++;
      } else {
        validationState.brokenCount++;
        validationState.brokenIds.push(job.id);
        
        logWarn('VALIDATE', `Broken link found: ${job.company} - ${job.title}`, {
          jobId: job.id,
          url: job.applyUrl,
          progress: `${i + 1}/${jobs.length}`,
        });

        // Deactivate the job with broken link
        await storage.updateJob(job.id, { isActive: false });
        logInfo('VALIDATE', `Deactivated job ${job.id} due to broken link`);
      }

      // Log progress every 10 jobs
      if ((i + 1) % 10 === 0) {
        logInfo('VALIDATE', `Progress: ${i + 1}/${jobs.length}`, {
          valid: validationState.validCount,
          broken: validationState.brokenCount,
        });
      }

    } catch (error: any) {
      logError('VALIDATE', `Error checking job ${job.id}`, { error: error.message });
    }

    // Wait between checks (except for last job)
    if (i < jobs.length - 1 && validationState.isRunning) {
      await delay(VALIDATION_DELAY_MS);
    }
  }

  const duration = validationState.startedAt 
    ? Math.round((Date.now() - validationState.startedAt.getTime()) / 1000)
    : 0;

  logSuccess('VALIDATE', 'Continuous validation completed', {
    total: validationState.totalJobs,
    valid: validationState.validCount,
    broken: validationState.brokenCount,
    deactivated: validationState.brokenIds.length,
    durationSeconds: duration,
  });

  validationState.isRunning = false;
}

// Stop ongoing validation
export function stopContinuousValidation(): void {
  if (validationState.isRunning) {
    validationState.isRunning = false;
    logInfo('VALIDATE', 'Stopping validation...');
  }
}

// Legacy function for quick sampling (used in scheduled scrape for quick check)
export async function validateJobLinks(jobs: Job[]): Promise<{ valid: number; broken: number; brokenIds: number[] }> {
  logInfo('VALIDATE', `Quick validation check for ${Math.min(10, jobs.length)} jobs`);
  
  let valid = 0;
  let broken = 0;
  const brokenIds: number[] = [];
  
  // Quick sample of just 10 jobs for scheduled runs
  for (const job of jobs.slice(0, 10)) {
    const isValid = await checkSingleJobLink(job);
    
    if (isValid) {
      valid++;
    } else {
      broken++;
      brokenIds.push(job.id);
      logWarn('VALIDATE', `Broken: ${job.company} - ${job.title}`, { jobId: job.id });
    }
    
    // Small delay between checks
    await delay(1000);
  }
  
  logInfo('VALIDATE', `Quick validation complete`, { valid, broken });
  
  return { valid, broken, brokenIds };
}

export async function runScheduledScrape(triggeredBy: string = 'scheduler'): Promise<{
  newJobs: number;
  updatedJobs: number;
  totalJobs: number;
  brokenLinks: number;
  categorized: number;
  alertsTriggered: number;
  sources: { name: string; count: number }[];
}> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  logInfo('SCHEDULER', '========================================');
  logInfo('SCHEDULER', 'Starting AUTOPILOT job scrape');
  logInfo('SCHEDULER', `Time: ${new Date().toISOString()}`);
  logInfo('SCHEDULER', `Triggered by: ${triggeredBy}`);
  logInfo('SCHEDULER', '========================================');
  
  cleanupOldLogs();
  
  let scrapeRunId: number | null = null;
  try {
    const scrapeRun = await storage.createScrapeRun({
      status: 'running',
      triggeredBy,
    });
    scrapeRunId = scrapeRun.id;
  } catch (err: any) {
    logWarn('SCHEDULER', `Failed to create scrape run record: ${err.message}`);
  }
  
  const allJobs: InsertJob[] = [];
  const sources: { name: string; count: number }[] = [];
  const successfulSources: string[] = [];
  let totalSourcesSucceeded = 0;
  let totalSourcesFailed = 0;
  let inserted = 0;
  let updated = 0;
  let newJobs: Job[] = [];
  let staleDeactivated = 0;
  let categorizedCount = 0;
  let alertsTriggered = 0;
  let brokenLinks = 0;
  let totalActiveJobs = 0;
  
  try {
    // === PHASE 1: Scrape all sources with retry ===
    logInfo('PHASE', '--- Phase 1: Scraping sources ---');
    
    logInfo('SCRAPE', `Scraping ${GREENHOUSE_SOURCES.length} Greenhouse sources...`);
    const greenhouseResults = await Promise.allSettled(
      GREENHOUSE_SOURCES.map(s => scrapeGreenhouse(s.name, s.id, s.type))
    );
    
    let greenhouseSuccessCount = 0;
    const failedGreenhouseSources: typeof GREENHOUSE_SOURCES = [];
    for (let i = 0; i < greenhouseResults.length; i++) {
      const result = greenhouseResults[i];
      const source = GREENHOUSE_SOURCES[i];
      if (result.status === 'fulfilled') {
        allJobs.push(...result.value);
        sources.push({ name: source.name, count: result.value.length });
        greenhouseSuccessCount++;
      } else {
        failedGreenhouseSources.push(source);
        errors.push(`Greenhouse ${source.name}: ${result.reason?.message || 'Unknown error'}`);
      }
    }
    
    if (failedGreenhouseSources.length > 0) {
      logWarn('RETRY', `Retrying ${failedGreenhouseSources.length} failed Greenhouse sources...`);
      const retryResults = await Promise.allSettled(
        failedGreenhouseSources.map(s => scrapeGreenhouse(s.name, s.id, s.type))
      );
      for (let i = 0; i < retryResults.length; i++) {
        const result = retryResults[i];
        const source = failedGreenhouseSources[i];
        if (result.status === 'fulfilled') {
          allJobs.push(...result.value);
          sources.push({ name: source.name, count: result.value.length });
          greenhouseSuccessCount++;
          logSuccess('RETRY', `Retry succeeded for ${source.name}`);
        } else {
          sources.push({ name: source.name, count: 0 });
          totalSourcesFailed++;
          logError('RETRY', `Retry failed for ${source.name}`, { error: result.reason?.message });
        }
      }
    }
    totalSourcesSucceeded += greenhouseSuccessCount;
    if (greenhouseSuccessCount >= GREENHOUSE_SOURCES.length * 0.5) {
      successfulSources.push('greenhouse');
    }
    
    logInfo('SCRAPE', `Scraping ${LEVER_SOURCES.length} Lever sources...`);
    const leverResults = await Promise.allSettled(
      LEVER_SOURCES.map(s => scrapeLever(s.name, s.id))
    );
    
    let leverSuccessCount = 0;
    const failedLeverSources: typeof LEVER_SOURCES = [];
    for (let i = 0; i < leverResults.length; i++) {
      const result = leverResults[i];
      const source = LEVER_SOURCES[i];
      if (result.status === 'fulfilled') {
        allJobs.push(...result.value);
        sources.push({ name: source.name, count: result.value.length });
        leverSuccessCount++;
      } else {
        failedLeverSources.push(source);
        errors.push(`Lever ${source.name}: ${result.reason?.message || 'Unknown error'}`);
      }
    }
    
    if (failedLeverSources.length > 0) {
      logWarn('RETRY', `Retrying ${failedLeverSources.length} failed Lever sources...`);
      const retryResults = await Promise.allSettled(
        failedLeverSources.map(s => scrapeLever(s.name, s.id))
      );
      for (let i = 0; i < retryResults.length; i++) {
        const result = retryResults[i];
        const source = failedLeverSources[i];
        if (result.status === 'fulfilled') {
          allJobs.push(...result.value);
          sources.push({ name: source.name, count: result.value.length });
          leverSuccessCount++;
          logSuccess('RETRY', `Retry succeeded for ${source.name}`);
        } else {
          sources.push({ name: source.name, count: 0 });
          totalSourcesFailed++;
          logError('RETRY', `Retry failed for ${source.name}`, { error: result.reason?.message });
        }
      }
    }
    totalSourcesSucceeded += leverSuccessCount;
    if (leverSuccessCount >= LEVER_SOURCES.length * 0.5) {
      successfulSources.push('lever');
    }
    
    logInfo('SCRAPE', `Total jobs collected: ${allJobs.length} from ${totalSourcesSucceeded} sources`);
    
    // === PHASE 2: Save to database ===
    logInfo('PHASE', '--- Phase 2: Saving to database ---');
    
    if (allJobs.length > 0) {
      const result = await storage.bulkUpsertJobs(allJobs);
      inserted = result.inserted;
      updated = result.updated;
      newJobs = result.newJobs;
      logSuccess('DATABASE', `Jobs saved`, { inserted, updated, newJobs: newJobs.length });
    }
    
    // === PHASE 3: Stale job detection ===
    logInfo('PHASE', '--- Phase 3: Stale job detection ---');
    
    if (successfulSources.length > 0) {
      const scrapedExternalIds = new Set(allJobs.map(j => j.externalId).filter(Boolean) as string[]);
      if (scrapedExternalIds.size > 0) {
        staleDeactivated = await storage.deactivateStaleJobs(scrapedExternalIds, successfulSources);
        if (staleDeactivated > 0) {
          logInfo('STALE', `Deactivated ${staleDeactivated} stale jobs from sources: ${successfulSources.join(', ')}`);
        }
      }
    }
    
    // === PHASE 4: AI Categorization of uncategorized jobs ===
    logInfo('PHASE', '--- Phase 4: AI Categorization ---');
    
    try {
      const activeJobs = await storage.getActiveJobs();
      const uncategorized = activeJobs.filter(j => !j.roleCategory || j.roleCategory === '');
      
      if (uncategorized.length > 0) {
        logInfo('AI', `Categorizing ${uncategorized.length} uncategorized jobs...`);
        const batchSize = 5;
        for (let i = 0; i < uncategorized.length; i += batchSize) {
          const batch = uncategorized.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (job) => {
              try {
                const result = await categorizeJob(job.title, job.description, job.company);
                await storage.updateJob(job.id, {
                  roleCategory: result.category,
                  roleSubcategory: result.subcategory,
                  seniorityLevel: result.seniorityLevel,
                  keySkills: result.keySkills,
                  aiSummary: result.aiSummary,
                  matchKeywords: result.matchKeywords,
                });
                categorizedCount++;
              } catch (err: any) {
                errors.push(`Categorize job ${job.id}: ${err.message}`);
              }
            })
          );
          if (i + batchSize < uncategorized.length) {
            await new Promise((r) => setTimeout(r, 500));
          }
        }
        logSuccess('AI', `Categorized ${categorizedCount}/${uncategorized.length} jobs`);
      } else {
        logInfo('AI', 'All active jobs already categorized');
      }
    } catch (err: any) {
      logError('AI', 'Categorization phase failed', { error: err.message });
      errors.push(`Categorization phase: ${err.message}`);
    }
    
    // === PHASE 5: Alert matching for new jobs ===
    logInfo('PHASE', '--- Phase 5: Job alert matching ---');
    
    if (newJobs.length > 0) {
      try {
        alertsTriggered = await matchNewJobsAgainstAlerts(newJobs);
        if (alertsTriggered > 0) {
          logSuccess('ALERTS', `Triggered ${alertsTriggered} alert notifications for ${newJobs.length} new jobs`);
        } else {
          logInfo('ALERTS', 'No alert matches for new jobs');
        }
      } catch (err: any) {
        logError('ALERTS', 'Alert matching failed', { error: err.message });
        errors.push(`Alert matching: ${err.message}`);
      }
    } else {
      logInfo('ALERTS', 'No new jobs to match against alerts');
    }
    
    // === PHASE 6: Link validation (sample) ===
    logInfo('PHASE', '--- Phase 6: Link validation ---');
    
    try {
      const allActiveJobs = await storage.getActiveJobs();
      totalActiveJobs = allActiveJobs.length;
      logInfo('VALIDATE', `Validating ${Math.min(50, allActiveJobs.length)} job links (sample)...`);
      const linkResults = await validateJobLinks(allActiveJobs);
      brokenLinks = linkResults.broken;
    } catch (err: any) {
      logError('VALIDATE', 'Link validation failed', { error: err.message });
      errors.push(`Link validation: ${err.message}`);
    }
    
  } catch (fatalError: any) {
    logError('SCHEDULER', 'FATAL: Autopilot scrape crashed', { error: fatalError.message });
    errors.push(`Fatal: ${fatalError.message}`);
  } finally {
    // === PHASE 7: Record run results (always runs) ===
    const durationMs = Date.now() - startTime;
    const duration = (durationMs / 1000).toFixed(1);
    
    const hasFatalError = errors.some(e => e.startsWith('Fatal:'));
    const status = hasFatalError ? 'failed' : (errors.length > 0 ? 'completed_with_errors' : 'completed');
    
    if (scrapeRunId) {
      try {
        await storage.updateScrapeRun(scrapeRunId, {
          completedAt: new Date(),
          durationMs,
          status,
          totalFound: allJobs.length,
          inserted,
          updated,
          staleDeactivated,
          categorized: categorizedCount,
          alertsTriggered,
          brokenLinks,
          sourcesSucceeded: totalSourcesSucceeded,
          sourcesFailed: totalSourcesFailed,
          sourceDetails: sources,
          errors: errors.length > 0 ? errors : null,
        });
      } catch (updateErr: any) {
        logError('SCHEDULER', `Failed to update scrape run record: ${updateErr.message}`);
      }
    }
    
    logInfo('SCHEDULER', '========================================');
    logSuccess('SCHEDULER', `AUTOPILOT scrape ${status}`, {
      duration: `${duration}s`,
      newJobs: inserted,
      updatedJobs: updated,
      staleDeactivated,
      categorized: categorizedCount,
      alertsTriggered,
      totalJobs: totalActiveJobs,
      brokenLinks,
      errors: errors.length,
    });
    logInfo('SCHEDULER', '========================================');
  }
  
  return {
    newJobs: inserted,
    updatedJobs: updated,
    totalJobs: totalActiveJobs,
    brokenLinks,
    categorized: categorizedCount,
    alertsTriggered,
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
