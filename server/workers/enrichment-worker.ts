import { storage } from '../storage';
import { extractExperience, determineSeniority } from '../lib/experience-extractor';
import { extractStructuredDescription } from '../lib/description-extractor';
import { categorizeJob } from '../lib/job-categorizer';
import { cleanJobDescription } from '../lib/description-cleaner';
import { generateJobHash } from '../lib/job-hash';
import type { Job } from '@shared/schema';

const ENRICHMENT_INTERVAL_MS = 2 * 60 * 1000;
const BATCH_SIZE = 50;
let intervalId: NodeJS.Timeout | null = null;
let isRunning = false;

const HARD_REJECT_TITLE_PATTERNS = [
  /\baccount executive\b/i,
  /\bsales engineer\b/i,
  /\bsales enablement\b/i,
  /\bsales development\b/i,
  /\bsales representative\b/i,
  /\b(SDR|BDR)\b/,
  /\bGTM\s+(manager|director|enablement|lead)\b/i,
  /\bgo[- ]to[- ]market\b/i,
  /\bmarketing manager\b/i,
  /\bmarketing program\b/i,
  /\bdemand gen\b/i,
  /\bcontent marketing\b/i,
  /\bbilling analyst\b/i,
  /\bbilling team\b/i,
  /\bdeal desk\b/i,
  /\binvestment associate\b/i,
  /\bproposal specialist\b/i,
  /\bregional sales\b/i,
  /\benterprise sales\b/i,
  /\bpartner development\b/i,
  /\bfield enablement\b/i,
  /\brevenue operations\b/i,
  /\brecruiter\b/i,
  /\btalent acquisition\b/i,
  /\btechnical support engineer\b/i,
  /\bcustomer support (representative|specialist)\b/i,
  /\btechnical account manager\b/i,
  /\bdata migration engineer\b/i,
  /\bchief of staff\b/i,
  /\bexecutive (assistant|secretary)\b/i,
  /\boffice manager\b/i,
  /\bhr manager\b/i,
  /\bfinance manager\b/i,
  /\bfinancial audit\b/i,
  /\bpricing specialist\b/i,
  /\bsocial worker\b/i,
  /\bbenefits assistant\b/i,
  /\btax manager\b/i,
  /\bdirector of tax\b/i,
  /\bsenior engineer \(\.net\b/i,
  /\btechnology coordinator\b/i,
  /\bsenior product designer\b/i,
  /\bimplementation partner manager\b/i,
  /\bdevops\b/i,
  /\b(SRE|site reliability)\b/i,
  /\bsuccess account manager\b/i,
  /\bglobal account manager\b/i,
  /\bcorporate account executive\b/i,
  /\bstrategic account executive\b/i,
  /\bUS-?\s*General\b/i,
  /\bSKYE TEST\b/i,
];

function shouldHardReject(title: string): boolean {
  return HARD_REJECT_TITLE_PATTERNS.some(pattern => pattern.test(title));
}

interface EnrichmentResult {
  processed: number;
  published: number;
  needsReview: number;
  rejected: number;
  errors: number;
}

function computeQualityScore(job: Job, enrichedData: Record<string, any>): number {
  let score = 0;

  if (enrichedData.roleCategory) score += 20;
  if (enrichedData.structuredDescription) {
    const sd = enrichedData.structuredDescription as any;
    if (sd.summary && sd.summary.length > 20) score += 20;
    if (sd.responsibilities?.length > 0) score += 10;
    if (sd.minimumQualifications?.length > 0) score += 5;
    if (sd.skillsRequired?.length > 0) score += 5;
  }
  if (enrichedData.experienceMin !== null && enrichedData.experienceMin !== undefined) score += 15;
  if (job.applyUrl && job.applyUrl.startsWith('http')) score += 10;
  if (job.description && job.description.length > 200) score += 5;
  if (enrichedData.seniorityLevel && enrichedData.seniorityLevel !== 'Not specified') score += 5;
  if (enrichedData.legalRelevanceScore && enrichedData.legalRelevanceScore >= 5) score += 5;

  return Math.min(100, score);
}

async function enrichJob(job: Job): Promise<void> {
  if (shouldHardReject(job.title)) {
    console.log(`[Enrichment] Hard-rejecting "${job.title}" at ${job.company} - irrelevant title pattern`);
    await storage.updateJobPipeline(job.id, {
      pipelineStatus: 'rejected',
      isPublished: false,
      reviewReasonCode: 'IRRELEVANT_TITLE',
      lastEnrichedAt: new Date(),
    });
    return;
  }

  const enrichedData: Record<string, any> = {
    pipelineStatus: 'enriching',
  };

  try {
    await storage.updateJobPipeline(job.id, { pipelineStatus: 'enriching' });

    if (!job.jobHash) {
      enrichedData.jobHash = generateJobHash(
        job.company, job.title, job.location || '', job.applyUrl
      );
    }

    const cleanDesc = cleanJobDescription(job.description);
    if (cleanDesc !== job.description) {
      enrichedData.description = cleanDesc;
      enrichedData.descriptionFormatted = true;
    }

    const expResult = extractExperience(job.description);
    enrichedData.experienceMin = expResult.experienceMin;
    enrichedData.experienceMax = expResult.experienceMax;
    enrichedData.experienceText = expResult.experienceText;

    if (expResult.experienceMin !== null) {
      enrichedData.seniorityLevel = determineSeniority(expResult.experienceMin);
    }

    let catResult;
    try {
      catResult = await categorizeJob(job.title, job.description, job.company);
      enrichedData.roleCategory = catResult.category;
      enrichedData.roleSubcategory = catResult.subcategory;
      enrichedData.keySkills = catResult.keySkills;
      enrichedData.aiSummary = catResult.aiSummary;
      enrichedData.matchKeywords = catResult.matchKeywords;
      enrichedData.aiResponsibilities = catResult.aiResponsibilities || null;
      enrichedData.aiQualifications = catResult.aiQualifications || null;
      enrichedData.aiNiceToHaves = catResult.aiNiceToHaves || null;
      enrichedData.legalRelevanceScore = catResult.legalRelevanceScore;
      enrichedData.reviewStatus = catResult.reviewStatus;

      if (!enrichedData.seniorityLevel || enrichedData.seniorityLevel === 'Not specified') {
        enrichedData.seniorityLevel = catResult.seniorityLevel;
      }
      if (catResult.experienceMin && !enrichedData.experienceMin) {
        enrichedData.experienceMin = catResult.experienceMin;
        enrichedData.experienceMax = catResult.experienceMax;
        enrichedData.experienceText = `${catResult.experienceMin}${catResult.experienceMax ? '-' + catResult.experienceMax : '+'} years`;
      }
    } catch (err: any) {
      console.log(`[Enrichment] AI categorization failed for job ${job.id}: ${err.message?.slice(0, 80)}`);
    }

    if (!job.structuredDescription) {
      try {
        const structured = await extractStructuredDescription(job.description, job.company, job.title);
        if (structured) {
          enrichedData.structuredDescription = structured;
          enrichedData.structuredStatus = 'generated';
        }
      } catch (err: any) {
        console.log(`[Enrichment] Structured extraction failed for job ${job.id}: ${err.message?.slice(0, 80)}`);
      }
    }

    const qualityScore = computeQualityScore(job, enrichedData);
    const relevanceConfidence = enrichedData.legalRelevanceScore
      ? Math.min(100, enrichedData.legalRelevanceScore * 10)
      : 0;

    enrichedData.qualityScore = qualityScore;
    enrichedData.relevanceConfidence = relevanceConfidence;
    enrichedData.lastEnrichedAt = new Date();

    if (catResult?.reviewStatus === 'rejected' || relevanceConfidence < 40) {
      enrichedData.pipelineStatus = 'rejected';
      enrichedData.isPublished = false;
      enrichedData.reviewReasonCode = 'LOW_RELEVANCE';
    } else if (relevanceConfidence >= 45 && enrichedData.roleCategory) {
      enrichedData.pipelineStatus = 'ready';
      enrichedData.isPublished = true;
    } else {
      enrichedData.pipelineStatus = 'ready';
      enrichedData.isPublished = false;
      if (!enrichedData.roleCategory) {
        enrichedData.reviewReasonCode = 'MISSING_CATEGORY';
      } else if (!enrichedData.experienceMin && enrichedData.experienceText === 'Not specified') {
        enrichedData.reviewReasonCode = 'MISSING_EXPERIENCE';
      } else if (qualityScore < 80) {
        enrichedData.reviewReasonCode = 'LOW_QUALITY_SCORE';
      } else {
        enrichedData.reviewReasonCode = 'MANUAL_REVIEW';
      }
    }

    await storage.updateJobPipeline(job.id, enrichedData);
  } catch (err: any) {
    console.error(`[Enrichment] Failed to enrich job ${job.id}: ${err.message}`);
    await storage.updateJobPipeline(job.id, {
      pipelineStatus: 'raw',
      reviewReasonCode: 'MANUAL_REVIEW',
    });
    throw err;
  }
}

async function runEnrichmentBatch(): Promise<EnrichmentResult> {
  if (isRunning) return { processed: 0, published: 0, needsReview: 0, rejected: 0, errors: 0 };
  isRunning = true;

  const result: EnrichmentResult = { processed: 0, published: 0, needsReview: 0, rejected: 0, errors: 0 };

  try {
    const rawJobs = await storage.getJobsForEnrichment(BATCH_SIZE);
    if (rawJobs.length === 0) return result;

    console.log(`[Enrichment] Processing ${rawJobs.length} raw jobs...`);

    for (let i = 0; i < rawJobs.length; i += 3) {
      const batch = rawJobs.slice(i, i + 3);
      const batchResults = await Promise.allSettled(
        batch.map(job => enrichJob(job))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const batchResult = batchResults[j];
        if (batchResult.status === 'fulfilled') {
          result.processed++;
          const updatedJob = await storage.getJob(batch[j].id);
          if (updatedJob?.isPublished) result.published++;
          else if (updatedJob?.pipelineStatus === 'rejected') result.rejected++;
          else result.needsReview++;
        } else {
          result.errors++;
        }
      }

      if (i + 3 < rawJobs.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log(`[Enrichment] Done: ${result.processed} processed, ${result.published} published, ${result.needsReview} need review, ${result.rejected} rejected, ${result.errors} errors`);
  } catch (err: any) {
    console.error('[Enrichment] Batch failed:', err.message);
  } finally {
    isRunning = false;
  }

  return result;
}

export function startEnrichmentWorker() {
  if (intervalId) return;
  console.log('[Enrichment] Starting enrichment worker (every 2 minutes)');

  setTimeout(() => {
    runEnrichmentBatch().catch(console.error);
  }, 15000);

  intervalId = setInterval(() => {
    runEnrichmentBatch().catch(console.error);
  }, ENRICHMENT_INTERVAL_MS);
}

export function stopEnrichmentWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export async function runEnrichmentNow(): Promise<EnrichmentResult> {
  return runEnrichmentBatch();
}

export function getEnrichmentStatus() {
  return { isRunning, intervalActive: !!intervalId };
}
