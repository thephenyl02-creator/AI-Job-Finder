import { storage } from '../storage';
import { extractExperience, determineSeniority } from '../lib/experience-extractor';
import { extractStructuredDescription } from '../lib/description-extractor';
import { categorizeJob } from '../lib/job-categorizer';
import { cleanJobDescription } from '../lib/description-cleaner';
import { generateJobHash } from '../lib/job-hash';
import type { Job } from '@shared/schema';
import axios from 'axios';

async function fetchJobPageContent(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      responseType: 'text',
    });

    if (typeof response.data !== 'string') return null;

    let text = response.data
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (text.length > 15000) {
      text = text.substring(0, 15000);
    }

    return text.length > 100 ? text : null;
  } catch {
    return null;
  }
}

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

  /\bstaff attorney\b/i,
  /\bsupervising attorney\b/i,
  /\bfamily law\b/i,
  /\bimmigration (attorney|lawyer|counsel|coordinator)\b/i,
  /\bpersonal injury\b/i,
  /\breal estate\b.*\b(attorney|lawyer|associate|counsel)\b/i,
  /\b(attorney|lawyer|associate|counsel)\b.*\breal estate\b/i,
  /\bcriminal (defense|law)\b/i,
  /\bpublic defender\b/i,
  /\bprosecutor\b/i,
  /\bestate planning\b/i,
  /\bbankruptcy (attorney|lawyer|counsel)\b/i,
  /\bdivorce (attorney|lawyer|counsel)\b/i,
  /\bprobate (attorney|lawyer|counsel)\b/i,
  /\btenant rights\b/i,
  /\bhousing (staff )?(attorney|lawyer)\b/i,
  /\bdomestic violence\b/i,
  /\bdisability advocacy\b/i,
  /\bright to counsel\b/i,
  /\bhomeowner defense\b/i,
  /\bgovernment benefits unit\b/i,
  /\bveterans justice\b/i,
  /\bimmigrant justice\b/i,
  /\bvoting rights\b/i,
  /\bnational security project\b/i,
  /\bwomen'?s rights project\b/i,
  /\bstate supreme court initiative\b/i,
  /\bexperienced lawyers?\b/i,
  /\blaw graduate\b/i,
  /\blegal externship\b/i,
  /\btrademark attorney\b/i,
  /\bdeputy director\b/i,
  /\bforward deployed engineer\b/i,
  /\bresearch scientist\b/i,
  /\bcertification content\b/i,
  /\bcustomer trust lead\b/i,
  /\bhead of security risk\b/i,
  /\binsider risk investigator\b/i,
  /\bimmigration coordinator\b/i,
  /\beuropean tax lead\b/i,
  /\binternational indirect tax\b/i,
  /\broc analyst\b/i,
  /\bsenior investment associate\b/i,
  /\bbusiness systems analyst\b/i,
  /\bsecurity workforce\b/i,
  /\bregional state and local affairs\b/i,
  /\bsoftware quality assurance\b/i,
  /\bclinical counsel\b/i,
  /\bthreat intelligence\b/i,
  /\bgift planning\b/i,
  /\bdisability rights program\b/i,
  /\bresponsible scaling policy\b/i,
  /\bai\/ml software engineer\b/i,
  /^paralegal$/i,
  /^account manager$/i,
  /\bfreelance attorney\b/i,
  /\bask a lawyer\b/i,
  /^chief of staff$/i,
  /\bdirector of tax\b/i,
  /^gtm (director|team lead)\b/i,
  /\bdeal desk\b/i,
];

function shouldHardReject(title: string): boolean {
  return HARD_REJECT_TITLE_PATTERNS.some(pattern => pattern.test(title));
}

const NON_LEGAL_TECH_COMPANIES: Record<string, 'general-ai' | 'legal-aid' | 'advocacy'> = {
  'Anthropic': 'general-ai',
  'OpenAI': 'general-ai',
  'Legal Services NYC': 'legal-aid',
  'Legal Aid Society': 'legal-aid',
  'ACLU': 'advocacy',
};

const LEGAL_TITLE_SIGNALS_FOR_GENERAL_COMPANIES = [
  /\bcounsel\b/i, /\blegal\b/i, /\bprivacy\b/i, /\bcompliance\b/i,
  /\bregulatory\b/i, /\bgovernment affairs\b/i,
  /\btrust\s*&?\s*safety\b/i, /\bai safety\b/i,
];

const TECH_IMPLEMENTATION_TITLE_SIGNALS = [
  /\btechnology\b/i, /\btech\b/i, /\bsoftware\b/i, /\bplatform\b/i,
  /\bproduct manager\b/i, /\bengineering\b/i, /\bdata\b/i, /\bsystems\b/i,
  /\bdigital\b/i, /\bimplementation\b/i, /\bautomation\b/i,
];

function shouldRejectByCompany(title: string, company: string): boolean {
  const companyType = NON_LEGAL_TECH_COMPANIES[company];
  if (!companyType) return false;

  if (companyType === 'legal-aid' || companyType === 'advocacy') {
    const hasTechSignal = TECH_IMPLEMENTATION_TITLE_SIGNALS.some(p => p.test(title));
    return !hasTechSignal;
  }

  if (companyType === 'general-ai') {
    const hasLegalSignal = LEGAL_TITLE_SIGNALS_FOR_GENERAL_COMPANIES.some(p => p.test(title));
    if (!hasLegalSignal) {
      return true;
    }
  }

  return false;
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
    if (sd.summary && sd.summary.length > 20) score += 10;
    if (sd.aboutCompany && sd.aboutCompany.length > 20) score += 5;
    if (sd.responsibilities?.length >= 3) score += 15;
    else if (sd.responsibilities?.length > 0) score += 5;
    if (sd.minimumQualifications?.length >= 2) score += 5;
    if (sd.skillsRequired?.length >= 3) score += 5;
  }
  if (enrichedData.experienceMin !== null && enrichedData.experienceMin !== undefined) score += 15;
  if (job.applyUrl && job.applyUrl.startsWith('http')) score += 10;
  if (job.description && job.description.length > 200) score += 5;
  if (enrichedData.seniorityLevel && enrichedData.seniorityLevel !== 'Not specified') score += 5;
  if (enrichedData.legalRelevanceScore && enrichedData.legalRelevanceScore >= 5) score += 5;

  return Math.min(100, score);
}

function isStructuredDescriptionComplete(sd: any): boolean {
  if (!sd) return false;
  const hasAboutCompany = sd.aboutCompany && sd.aboutCompany.length > 20;
  const hasResponsibilities = sd.responsibilities?.length >= 3;
  const hasQualifications = sd.minimumQualifications?.length >= 2;
  const hasSkills = sd.skillsRequired?.length >= 3;
  return hasAboutCompany && hasResponsibilities && hasQualifications && hasSkills;
}

async function enrichJob(job: Job): Promise<void> {
  if (shouldHardReject(job.title)) {
    console.log(`[Enrichment] Hard-rejecting "${job.title}" at ${job.company} - irrelevant title pattern`);
    await storage.updateJobWorkerFields(job.id, {
      pipelineStatus: 'rejected',
      reviewReasonCode: 'IRRELEVANT_TITLE',
      lastEnrichedAt: new Date(),
    });
    return;
  }

  if (shouldRejectByCompany(job.title, job.company)) {
    console.log(`[Enrichment] Company-rejecting "${job.title}" at ${job.company} - non-legal-tech company without legal signal`);
    await storage.updateJobWorkerFields(job.id, {
      pipelineStatus: 'rejected',
      reviewReasonCode: 'NON_LEGAL_TECH_COMPANY',
      lastEnrichedAt: new Date(),
    });
    return;
  }

  const enrichedData: Record<string, any> = {
    pipelineStatus: 'enriching',
  };

  try {
    await storage.updateJobWorkerFields(job.id, { pipelineStatus: 'enriching' });

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

    const existingSD = job.structuredDescription as any;
    const needsStructuredExtraction = !existingSD || !isStructuredDescriptionComplete(existingSD);

    if (needsStructuredExtraction) {
      try {
        let descForExtraction = job.description || '';

        if (descForExtraction.length < 200 && job.applyUrl && job.applyUrl.startsWith('http')) {
          try {
            const fetchedContent = await fetchJobPageContent(job.applyUrl);
            if (fetchedContent && fetchedContent.length > descForExtraction.length) {
              descForExtraction = fetchedContent;
              enrichedData.description = fetchedContent;
              enrichedData.descriptionFormatted = true;
            }
          } catch (fetchErr: any) {
            console.log(`[Enrichment] Failed to fetch job page for job ${job.id}: ${fetchErr.message?.slice(0, 60)}`);
          }
        }

        const structured = await extractStructuredDescription(descForExtraction, job.company, job.title);
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

    const structuredComplete = isStructuredDescriptionComplete(enrichedData.structuredDescription || job.structuredDescription);
    const relevanceScore = enrichedData.legalRelevanceScore || 0;

    if (catResult?.reviewStatus === 'rejected' || relevanceConfidence < 40) {
      enrichedData.pipelineStatus = 'rejected';
      enrichedData.reviewReasonCode = 'LOW_RELEVANCE';
    } else if (relevanceConfidence >= 60 && enrichedData.roleCategory && structuredComplete && relevanceScore >= 6 && qualityScore >= 80) {
      const existingDuplicate = await storage.findLiveJobByTitleAndCompany(job.title, job.company, job.id);
      if (existingDuplicate) {
        enrichedData.pipelineStatus = 'rejected';
        enrichedData.reviewReasonCode = 'DUPLICATE_JOB';
        console.log(`[Enrichment] Duplicate detected: "${job.title}" at ${job.company} (existing live job #${existingDuplicate.id})`);
      } else {
        enrichedData.pipelineStatus = 'ready';
      }
    } else {
      enrichedData.pipelineStatus = 'ready';
      if (!enrichedData.roleCategory) {
        enrichedData.reviewReasonCode = 'MISSING_CATEGORY';
      } else if (!structuredComplete) {
        enrichedData.reviewReasonCode = 'INCOMPLETE_DESCRIPTION';
      } else if (relevanceScore < 6) {
        enrichedData.reviewReasonCode = 'LOW_RELEVANCE_SCORE';
      } else if (qualityScore < 80) {
        enrichedData.reviewReasonCode = 'LOW_QUALITY_SCORE';
      } else {
        enrichedData.reviewReasonCode = 'MANUAL_REVIEW';
      }
    }

    await storage.updateJobWorkerFields(job.id, enrichedData);
  } catch (err: any) {
    console.error(`[Enrichment] Failed to enrich job ${job.id}: ${err.message}`);
    await storage.updateJobWorkerFields(job.id, {
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
          if (updatedJob?.pipelineStatus === 'ready') result.published++;
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

async function runLiveJobAudit(): Promise<{ audited: number; flagged: number }> {
  let audited = 0;
  let flagged = 0;

  try {
    const liveJobs = await storage.getLiveJobs();
    console.log(`[Audit] Checking ${liveJobs.length} live jobs against updated filters...`);

    for (const job of liveJobs) {
      audited++;

      if (shouldHardReject(job.title)) {
        console.log(`[Audit] Flagging "${job.title}" at ${job.company} - matched hard reject title pattern`);
        await storage.updateJobWorkerFields(job.id, {
          pipelineStatus: 'rejected',
          reviewReasonCode: 'AUDIT_TITLE_REJECT',
        });
        flagged++;
        continue;
      }

      if (shouldRejectByCompany(job.title, job.company)) {
        console.log(`[Audit] Flagging "${job.title}" at ${job.company} - non-legal-tech company`);
        await storage.updateJobWorkerFields(job.id, {
          pipelineStatus: 'rejected',
          reviewReasonCode: 'AUDIT_COMPANY_REJECT',
        });
        flagged++;
        continue;
      }

      const duplicate = await storage.findLiveJobByTitleAndCompany(job.title, job.company, job.id);
      if (duplicate && duplicate.id < job.id) {
        console.log(`[Audit] Flagging duplicate "${job.title}" at ${job.company} (keeping #${duplicate.id}, rejecting #${job.id})`);
        await storage.updateJobWorkerFields(job.id, {
          pipelineStatus: 'rejected',
          reviewReasonCode: 'AUDIT_DUPLICATE',
        });
        flagged++;
      }
    }

    console.log(`[Audit] Done: ${audited} audited, ${flagged} flagged for removal`);
  } catch (err: any) {
    console.error('[Audit] Failed:', err.message);
  }

  return { audited, flagged };
}

const AUDIT_INTERVAL_MS = 6 * 60 * 60 * 1000;
let auditIntervalId: NodeJS.Timeout | null = null;

export function startEnrichmentWorker() {
  if (intervalId) return;
  console.log('[Enrichment] Starting enrichment worker (every 2 minutes)');

  setTimeout(() => {
    runEnrichmentBatch().catch(console.error);
  }, 15000);

  intervalId = setInterval(() => {
    runEnrichmentBatch().catch(console.error);
  }, ENRICHMENT_INTERVAL_MS);

  if (!auditIntervalId) {
    setTimeout(() => {
      runLiveJobAudit().catch(console.error);
    }, 60000);

    auditIntervalId = setInterval(() => {
      runLiveJobAudit().catch(console.error);
    }, AUDIT_INTERVAL_MS);
    console.log('[Audit] Starting live job audit worker (every 6 hours)');
  }
}

export function stopEnrichmentWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (auditIntervalId) {
    clearInterval(auditIntervalId);
    auditIntervalId = null;
  }
}

export async function runEnrichmentNow(): Promise<EnrichmentResult> {
  return runEnrichmentBatch();
}

export function getEnrichmentStatus() {
  return { isRunning, intervalActive: !!intervalId };
}
