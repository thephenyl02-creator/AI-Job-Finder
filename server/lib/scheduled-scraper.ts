import axios from 'axios';
import { storage } from '../storage';
import type { InsertJob, Job } from '../../shared/schema';
import { logInfo, logWarn, logError, logSuccess, cleanupOldLogs } from './logger';
import { matchNewJobsAgainstAlerts } from './alert-matcher';
import { scrapeAllLawFirms, isLegalTechRole, transformToJobSchema } from './law-firm-scraper';
import { LAW_FIRMS_AND_COMPANIES } from './law-firms-list';

const SCRAPE_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
const LINK_CHECK_TIMEOUT = 10000;
const VALIDATION_DELAY_MS = 10000;
const MAX_NEW_JOBS_PER_RUN = 500;

interface ScrapeState {
  isRunning: boolean;
  startedAt: Date | null;
  triggeredBy: string | null;
  currentCompany: string | null;
  companiesProcessed: number;
  companiesTotal: number;
  jobsFound: number;
}

const scrapeState: ScrapeState = {
  isRunning: false,
  startedAt: null,
  triggeredBy: null,
  currentCompany: null,
  companiesProcessed: 0,
  companiesTotal: 0,
  jobsFound: 0,
};

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

export function getScrapeStatus(): ScrapeState & { schedulerActive: boolean; nextRunAt: Date | null } {
  return {
    ...scrapeState,
    schedulerActive: schedulerInterval !== null,
    nextRunAt: schedulerInterval && scrapeState.startedAt
      ? new Date(scrapeState.startedAt.getTime() + SCRAPE_INTERVAL_MS)
      : schedulerInterval
        ? new Date(Date.now() + SCRAPE_INTERVAL_MS)
        : null,
  };
}

export function getValidationStatus() {
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

async function checkSingleJobLink(job: Job): Promise<boolean> {
  try {
    const response = await axios.head(job.applyUrl, {
      timeout: LINK_CHECK_TIMEOUT,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });
    if (response.status >= 400) return false;
    return true;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return true;
    try {
      const getResponse = await axios.get(job.applyUrl, {
        timeout: LINK_CHECK_TIMEOUT,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
        headers: { 'Range': 'bytes=0-0' },
      });
      if (getResponse.status >= 400) return false;
      return true;
    } catch {
      return false;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

  for (let i = 0; i < jobs.length; i++) {
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
        await storage.updateJob(job.id, { isActive: false });
        logInfo('VALIDATE', `Deactivated job ${job.id} due to broken link`);
      }

      if ((i + 1) % 10 === 0) {
        logInfo('VALIDATE', `Progress: ${i + 1}/${jobs.length}`, {
          valid: validationState.validCount,
          broken: validationState.brokenCount,
        });
      }
    } catch (error: any) {
      logError('VALIDATE', `Error checking job ${job.id}`, { error: error.message });
    }

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

export function stopContinuousValidation(): void {
  if (validationState.isRunning) {
    validationState.isRunning = false;
    logInfo('VALIDATE', 'Stopping validation...');
  }
}

export async function validateJobLinks(jobs: Job[]): Promise<{ valid: number; broken: number; brokenIds: number[] }> {
  logInfo('VALIDATE', `Quick validation check for ${Math.min(10, jobs.length)} jobs`);

  let valid = 0;
  let broken = 0;
  const brokenIds: number[] = [];

  for (const job of jobs.slice(0, 10)) {
    const isValid = await checkSingleJobLink(job);
    if (isValid) {
      valid++;
    } else {
      broken++;
      brokenIds.push(job.id);
      logWarn('VALIDATE', `Broken: ${job.company} - ${job.title}`, { jobId: job.id });
    }
    await delay(1000);
  }

  logInfo('VALIDATE', `Quick validation complete`, { valid, broken });
  return { valid, broken, brokenIds };
}

function isValidJob(job: InsertJob): boolean {
  if (!job.title || job.title.trim().length < 3) return false;
  if (!job.company || job.company.trim().length < 2) return false;
  if (!job.applyUrl || (!job.applyUrl.startsWith('http') && job.applyUrl !== '#')) return false;
  if (!job.externalId) return false;
  return true;
}

export async function runScheduledScrape(triggeredBy: string = 'scheduler'): Promise<{
  newJobs: number;
  updatedJobs: number;
  totalJobs: number;
  brokenLinks: number;
  alertsTriggered: number;
  sources: { name: string; count: number }[];
  companiesScraped: number;
  companiesFailed: number;
  jobsValidated: number;
  jobsRejectedValidation: number;
}> {
  if (scrapeState.isRunning) {
    logWarn('SCHEDULER', `Scrape already running (started at ${scrapeState.startedAt?.toISOString()}, triggered by ${scrapeState.triggeredBy})`);
    return {
      newJobs: 0, updatedJobs: 0, totalJobs: 0, brokenLinks: 0,
      alertsTriggered: 0, sources: [], companiesScraped: 0,
      companiesFailed: 0, jobsValidated: 0, jobsRejectedValidation: 0,
    };
  }

  scrapeState.isRunning = true;
  scrapeState.startedAt = new Date();
  scrapeState.triggeredBy = triggeredBy;
  scrapeState.companiesProcessed = 0;
  scrapeState.companiesTotal = LAW_FIRMS_AND_COMPANIES.length;
  scrapeState.jobsFound = 0;

  const startTime = Date.now();
  const errors: string[] = [];

  logInfo('SCHEDULER', '========================================');
  logInfo('SCHEDULER', `Starting FULL PIPELINE scrape (${LAW_FIRMS_AND_COMPANIES.length} companies)`);
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

  let inserted = 0;
  let updated = 0;
  let newJobs: Job[] = [];
  let alertsTriggered = 0;
  let brokenLinks = 0;
  let totalActiveJobs = 0;
  let jobsValidated = 0;
  let jobsRejectedValidation = 0;
  const sources: { name: string; count: number }[] = [];
  const successfulSourceTypes = new Set<string>();
  let companiesSucceeded = 0;
  let companiesFailed = 0;

  try {
    logInfo('PHASE', `--- Phase 1: Scraping ${LAW_FIRMS_AND_COMPANIES.length} companies ---`);

    const { jobs: scrapedJobs, stats: scrapeStats, funnel } = await scrapeAllLawFirms();

    const companiesAttempted = new Set(scrapeStats.map(s => s.company));
    for (const stat of scrapeStats) {
      sources.push({ name: stat.company, count: stat.filtered });
      companiesSucceeded++;
    }
    companiesFailed = LAW_FIRMS_AND_COMPANIES.length - companiesAttempted.size;

    scrapeState.companiesProcessed = LAW_FIRMS_AND_COMPANIES.length;
    scrapeState.jobsFound = scrapedJobs.length;

    logInfo('SCRAPE', `Scraping complete: ${scrapedJobs.length} jobs from ${companiesSucceeded} companies (${companiesFailed} failed)`);
    logInfo('FUNNEL', `Pipeline funnel: ${funnel.companiesAttempted} companies → ${funnel.totalScraped} scraped → ${funnel.titleFiltered} title-filtered → ${scrapedJobs.length} transformed`);

    for (const firm of LAW_FIRMS_AND_COMPANIES) {
      const firmStat = scrapeStats.find(s => s.company === firm.name);
      if (firmStat && (firmStat.found > 0 || firmStat.filtered > 0)) {
        if (firm.greenhouseId) successfulSourceTypes.add('greenhouse');
        else if (firm.leverPostingsUrl) successfulSourceTypes.add('lever');
        else if (firm.ashbyUrl) successfulSourceTypes.add('ashby');
        else if (firm.workday) successfulSourceTypes.add('workday');
      }
    }

    logInfo('PHASE', '--- Phase 2: Validation & Save ---');

    const validJobs: InsertJob[] = [];
    for (const job of scrapedJobs) {
      if (isValidJob(job)) {
        validJobs.push(job);
      } else {
        jobsRejectedValidation++;
      }
    }
    jobsValidated = validJobs.length;

    if (jobsRejectedValidation > 0) {
      logWarn('VALIDATE', `Rejected ${jobsRejectedValidation} jobs with missing required fields`);
    }

    const capHit = validJobs.length > MAX_NEW_JOBS_PER_RUN;
    const jobsToSave = capHit ? validJobs.slice(0, MAX_NEW_JOBS_PER_RUN) : validJobs;
    if (capHit) {
      logWarn('CAP', `Capped at ${MAX_NEW_JOBS_PER_RUN} jobs (${validJobs.length} available) to prevent flooding`);
    }

    if (jobsToSave.length > 0) {
      logInfo('DATABASE', `Saving ${jobsToSave.length} validated jobs...`);
      const result = await storage.bulkUpsertJobs(jobsToSave);
      inserted = result.inserted;
      updated = result.updated;
      newJobs = result.newJobs;
      logSuccess('DATABASE', `Jobs saved`, { inserted, updated, newJobs: newJobs.length });
    }

    logInfo('PHASE', '--- Phase 3: Stale job detection ---');

    const successfulSources = Array.from(successfulSourceTypes);
    if (capHit) {
      logWarn('STALE', 'Skipping stale detection: job cap was hit, external ID set is incomplete');
    } else if (successfulSources.length > 0 && companiesSucceeded >= LAW_FIRMS_AND_COMPANIES.length * 0.3) {
      const scrapedExternalIds = new Set(validJobs.map(j => j.externalId).filter(Boolean) as string[]);
      const scrapedCompanyNames = new Set(scrapeStats.map(s => s.company));
      if (scrapedExternalIds.size > 0) {
        const staleDeactivated = await storage.deactivateStaleJobs(scrapedExternalIds, successfulSources, scrapedCompanyNames);
        if (staleDeactivated > 0) {
          logInfo('STALE', `Deactivated ${staleDeactivated} stale jobs from ${scrapedCompanyNames.size} scraped companies`);
        }
      }
    } else {
      logWarn('STALE', `Skipping stale detection: only ${companiesSucceeded}/${LAW_FIRMS_AND_COMPANIES.length} companies succeeded (need 30%+)`);
    }

    logInfo('PHASE', '--- Phase 4: Alert matching ---');

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

    logInfo('PHASE', '--- Phase 5: Deduplication sweep ---');
    try {
      const dedupResult = await deduplicatePublishedJobs();
      if (dedupResult.merged > 0) {
        logInfo('DEDUP', `Merged ${dedupResult.merged} duplicate jobs`);
        dedupResult.details.forEach(d => logInfo('DEDUP', d));
      }
    } catch (err: any) {
      logError('DEDUP', 'Dedup sweep failed', { error: err.message });
    }

    logInfo('PHASE', '--- Phase 6: Link validation (sample) ---');

    try {
      const allActiveJobs = await storage.getActiveJobs();
      totalActiveJobs = allActiveJobs.length;
      logInfo('VALIDATE', `Validating ${Math.min(10, allActiveJobs.length)} job links (sample)...`);
      const linkResults = await validateJobLinks(allActiveJobs);
      brokenLinks = linkResults.broken;

      for (const brokenId of linkResults.brokenIds) {
        await storage.updateJob(brokenId, { isActive: false });
      }
      if (brokenLinks > 0) {
        logWarn('VALIDATE', `Deactivated ${brokenLinks} jobs with broken links`);
      }
    } catch (err: any) {
      logError('VALIDATE', 'Link validation failed', { error: err.message });
      errors.push(`Link validation: ${err.message}`);
    }

  } catch (fatalError: any) {
    logError('SCHEDULER', 'FATAL: Autopilot scrape crashed', { error: fatalError.message });
    errors.push(`Fatal: ${fatalError.message}`);
  } finally {
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
          totalFound: scrapeState.jobsFound,
          inserted,
          updated,
          staleDeactivated: 0,
          categorized: 0,
          alertsTriggered,
          brokenLinks,
          sourcesSucceeded: companiesSucceeded,
          sourcesFailed: companiesFailed,
          sourceDetails: sources.filter(s => s.count > 0),
          errors: errors.length > 0 ? errors : null,
        });
      } catch (updateErr: any) {
        logError('SCHEDULER', `Failed to update scrape run record: ${updateErr.message}`);
      }
    }

    logInfo('SCHEDULER', '========================================');
    logSuccess('SCHEDULER', `FULL PIPELINE scrape ${status}`, {
      duration: `${duration}s`,
      companiesScraped: companiesSucceeded,
      companiesFailed,
      jobsFound: scrapeState.jobsFound,
      jobsValidated,
      jobsRejectedValidation,
      inserted,
      updated,
      alertsTriggered,
      totalActiveJobs,
      brokenLinks,
      errors: errors.length,
    });
    logInfo('SCHEDULER', '========================================');

    scrapeState.isRunning = false;
    scrapeState.currentCompany = null;
  }

  return {
    newJobs: inserted,
    updatedJobs: updated,
    totalJobs: totalActiveJobs,
    brokenLinks,
    alertsTriggered,
    sources: sources.filter(s => s.count > 0),
    companiesScraped: companiesSucceeded,
    companiesFailed,
    jobsValidated,
    jobsRejectedValidation,
  };
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startScheduler(): void {
  if (schedulerInterval) {
    logWarn('SCHEDULER', 'Scheduler already running');
    return;
  }

  logInfo('SCHEDULER', `Scheduler started - will run every 12 hours`);
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

export async function deduplicatePublishedJobs(): Promise<{ merged: number; details: string[] }> {
  logInfo('DEDUP', 'Starting deduplication sweep...');
  const details: string[] = [];
  let merged = 0;

  try {
    const publishedJobs = await storage.getActiveJobs();
    const seen = new Map<string, typeof publishedJobs[0]>();
    const deactivatedIds = new Set<number>();

    for (const job of publishedJobs) {
      if (!job.applyUrl) continue;
      const normalizedUrl = job.applyUrl.toLowerCase().replace(/\/+$/, '').replace(/\?.*$/, '');
      if (seen.has(normalizedUrl)) {
        const existing = seen.get(normalizedUrl)!;
        const keepId = existing.id > job.id ? existing.id : job.id;
        const removeId = existing.id > job.id ? job.id : existing.id;
        await storage.updateJob(removeId, { isActive: false, isPublished: false } as any);
        deactivatedIds.add(removeId);
        details.push(`Merged duplicate: "${job.title}" at ${job.company} (kept #${keepId}, removed #${removeId})`);
        merged++;
        if (keepId !== existing.id) seen.set(normalizedUrl, job);
      } else {
        seen.set(normalizedUrl, job);
      }
    }

    const titleCompanyMap = new Map<string, typeof publishedJobs[0]>();
    for (const job of publishedJobs) {
      if (deactivatedIds.has(job.id)) continue;
      const key = `${(job.title || '').toLowerCase().trim()}|||${(job.company || '').toLowerCase().trim()}`;
      if (!key || key === '|||') continue;
      if (titleCompanyMap.has(key)) {
        const existing = titleCompanyMap.get(key)!;
        if (existing.applyUrl === job.applyUrl) continue;
        const keepId = existing.id > job.id ? existing.id : job.id;
        const removeId = existing.id > job.id ? job.id : existing.id;
        await storage.updateJob(removeId, { isActive: false, isPublished: false } as any);
        deactivatedIds.add(removeId);
        details.push(`Merged title+company duplicate: "${job.title}" at ${job.company} (kept #${keepId}, removed #${removeId})`);
        merged++;
        if (keepId !== existing.id) titleCompanyMap.set(key, job);
      } else {
        titleCompanyMap.set(key, job);
      }
    }

    logInfo('DEDUP', `Deduplication complete. Merged ${merged} duplicates.`);
  } catch (error: any) {
    logError('DEDUP', 'Deduplication sweep failed', { error: error.message });
  }

  return { merged, details };
}

export async function enrichShortDescriptions(): Promise<number> {
  logInfo('ENRICH', 'enrichShortDescriptions is now handled by the enrichment worker');
  return 0;
}
