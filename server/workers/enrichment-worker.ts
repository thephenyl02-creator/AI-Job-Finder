import { storage } from '../storage';
import { extractExperience, determineSeniority } from '../lib/experience-extractor';
import { extractStructuredDescription } from '../lib/description-extractor';
import { categorizeJob } from '../lib/job-categorizer';
import { cleanJobDescription } from '../lib/description-cleaner';
import { generateJobHash, generateFuzzyJobHash } from '../lib/job-hash';
import { LAW_FIRMS_AND_COMPANIES } from '../lib/law-firms-list';
import { normalizeLocation } from '../lib/location-normalizer';
import type { Job } from '@shared/schema';
import { jobs } from '@shared/schema';
import { db } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import axios from 'axios';

function normalizeCompanyName(name: string): string {
  return name.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+(inc|llc|ltd|corp|co|plc|gmbh|ag|sa|bv|pty|limited)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const LEGAL_TECH_COMPANIES = new Set(
  LAW_FIRMS_AND_COMPANIES
    .filter(f => f.type === 'startup' || f.type === 'tech-legal')
    .map(f => normalizeCompanyName(f.name))
);

function isLegalTechCompany(company: string): boolean {
  return LEGAL_TECH_COMPANIES.has(normalizeCompanyName(company));
}

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

function cleanJobTitle(title: string): string {
  let cleaned = title.trim();
  cleaned = cleaned.replace(/\s*[\|–—-]\s*(Remote|Hybrid|On-?site|Full[- ]?Time|Part[- ]?Time|Contract|Temporary|Intern|Internship)\s*$/i, '');
  cleaned = cleaned.replace(/\s*\((Remote|Hybrid|On-?site|Full[- ]?Time|Part[- ]?Time|Contract|Temporary|Intern|Internship)\)\s*$/i, '');
  cleaned = cleaned.replace(/\s*\[.*?\]\s*$/, '');
  cleaned = cleaned.replace(/\s*-\s*(US|UK|EU|EMEA|APAC|LATAM|Remote)\s*$/i, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned || title;
}

const ENRICHMENT_INTERVAL_MS = 2 * 60 * 1000;
const BATCH_SIZE = 50;
let intervalId: NodeJS.Timeout | null = null;
let isRunning = false;

const LEGAL_TITLE_WHITELIST = [
  /\blegal engineer\b/i,
  /\blegal architect\b/i,
  /\blegal solutions?\s*(architect|engineer)\b/i,
  /\bsolutions?\s*(architect|engineer)\b.*\blegal\b/i,
  /\bsolutions?\s*engineer\b/i,
  /\bsolutions?\s*architect\b/i,
  /\blegal\s+data\b/i,
  /\bcompliance\s+engineer\b/i,
  /\bprivacy\s+engineer\b/i,
  /\btrust\s+engineer\b/i,
  /\bai\s+quality\s+engineer\b/i,
  /\blegal\s+ai\b/i,
  /\bai\s+product\s+engineer\b/i,
  /\bprofessional\s+services\s+.*engineer\b/i,
  /\bimplementation\s+(engineer|consultant|specialist)\b/i,
  /\bcustomer\s+engineer\b/i,
  /\bfield\s+engineer\b/i,
  /\bpre-?sales?\s+engineer\b/i,
  /\bdata\s+security.*engineer\b/i,
  /\bai\s+safety\b/i,
];

function isWhitelistedLegalTitle(title: string): boolean {
  return LEGAL_TITLE_WHITELIST.some(pattern => pattern.test(title));
}

const PURE_ENGINEERING_PATTERNS = [
  /\bsoftware\s+(developer|engineer|development)\b/i,
  /\b(senior|staff|principal|lead|junior|mid)?\s*software\s+(developer|engineer)\b/i,
  /\b(frontend|front-end|front end)\s+(developer|engineer)\b/i,
  /\b(backend|back-end|back end)\s+(developer|engineer)\b/i,
  /\b(full[- ]?stack)\s+(developer|engineer)\b/i,
  /\bweb\s+developer\b/i,
  /\bmobile\s+(developer|engineer)\b/i,
  /\bios\s+(developer|engineer)\b/i,
  /\bandroid\s+(developer|engineer)\b/i,
  /\breact\s+(developer|engineer|native)\b/i,
  /\bangular\s+(developer|engineer)\b/i,
  /\bvue\s+(developer|engineer)\b/i,
  /\bnode\.?js\s+(developer|engineer)\b/i,
  /\bpython\s+(developer|engineer)\b/i,
  /\bjava\s+(developer|engineer)\b/i,
  /\bruby\s+(developer|engineer|on rails)\b/i,
  /\bgolang\s+(developer|engineer)\b/i,
  /\brust\s+(developer|engineer)\b/i,
  /\b(c\+\+|c#|\.net)\s+(developer|engineer)\b/i,
  /\bplatform\s+engineer\b/i,
  /\binfrastructure\s+engineer\b/i,
  /\bcloud\s+engineer\b/i,
  /\bsystems?\s+engineer\b/i,
  /\bnetwork\s+engineer\b/i,
  /\bsecurity\s+engineer\b/i,
  /\bcyber\s*security\s+engineer\b/i,
  /\bendpoint\s+engineer\b/i,
  /\bdata\s+engineer\b/i,
  /\bml\s+engineer\b/i,
  /\bmachine\s+learning\s+engineer\b/i,
  /\bdeep\s+learning\s+engineer\b/i,
  /\bcomputer\s+vision\s+engineer\b/i,
  /\bnlp\s+engineer\b/i,
  /\bai\s+engineer\b/i,
  /\bmlops\b/i,
  /\bdevops\b/i,
  /\b(SRE|site reliability)\b/i,
  /\bqa\s+engineer\b/i,
  /\btest\s+engineer\b/i,
  /\bsdet\b/i,
  /\bquality\s+(assurance|engineer)\b/i,
  /\bfirmware\s+engineer\b/i,
  /\bembedded\s+engineer\b/i,
  /\bhardware\s+engineer\b/i,
  /\belectronics?\s+engineer\b/i,
  /\brf\s+engineer\b/i,
  /\bmechanical\s+engineer\b/i,
  /\bux\s+designer\b/i,
  /\bui\s+designer\b/i,
  /\bproduct\s+designer\b/i,
  /\bgraphic\s+designer\b/i,
  /\bbrand\s+designer\b/i,
  /\bvisual\s+designer\b/i,
  /\bweb\s+designer\b/i,
  /\bmotion\s+designer\b/i,
  /\bit\s+(administrator|support|engineer|operations)\b/i,
  /\bsystem\s+administrator\b/i,
  /\bdatabase\s+(administrator|engineer)\b/i,
  /\b(engineering|software\s+development)\s+manager\b/i,
  /\bengineering\s+(director|lead(er)?|operations)\b/i,
  /\bdirector\s+of\s+engineering\b/i,
  /\bhead\s+of\s+(product\s+)?engineering\b/i,
  /\bvp\s+of?\s+engineering\b/i,
  /\bproduct\s+engineer\b/i,
  /\bcst\s+developer\b/i,
  /\bapplication\s+security\b/i,
  /\blogging\s+(&|and)\s+detection\s+engineer\b/i,
  /\bdefensive\s+security\b/i,
  /\bdetection\s+engineer\b/i,
  /\bresearch\s+scientist\b/i,
  /\bforward\s+deployed\s+engineer\b/i,
  /\bdata\s+migration\s+engineer\b/i,
  /\banalytics\s+engineer\b/i,
  /\brelease\s+engineer\b/i,
  /\bbuild\s+engineer\b/i,
  /\bperformance\s+engineer\b/i,
  /\bautomation\s+engineer\b/i,
  /\bintegration(s)?\s+engineer\b/i,
  /\b(senior|staff|principal|lead)\s+engineer\b/i,
  /\barchitect\s+(i|ii|iii|iv|v)\b/i,
];

const ALWAYS_REJECT_TITLE_PATTERNS = [
  /\bUS-?\s*General\b/i,
  /\bSKYE TEST\b/i,
  /\bcertification content\b/i,
  /\bthreat intelligence\b/i,
  /\binsider risk investigator\b/i,

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
  /\bfreelance attorney\b/i,
  /\bask a lawyer\b/i,
  /\bclinical counsel\b/i,
  /\bdisability rights program\b/i,
  /\bgift planning\b/i,
  /\bsocial worker\b/i,
  /\bimmigration coordinator\b/i,
];

const GENERAL_COMPANY_REJECT_PATTERNS = [
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
  /\bchief of staff\b/i,
  /\bexecutive (assistant|secretary)\b/i,
  /\boffice manager\b/i,
  /\bhr manager\b/i,
  /\bfinance manager\b/i,
  /\bfinancial audit\b/i,
  /\bpricing specialist\b/i,
  /\bbenefits assistant\b/i,
  /\btax manager\b/i,
  /\bdirector of tax\b/i,
  /\btechnology coordinator\b/i,
  /\bsenior product designer\b/i,
  /\bimplementation partner manager\b/i,
  /\bsuccess account manager\b/i,
  /\bglobal account manager\b/i,
  /\bcorporate account executive\b/i,
  /\bstrategic account executive\b/i,
  /\bdeputy director\b/i,
  /\bcustomer trust lead\b/i,
  /\bhead of security risk\b/i,
  /\beuropean tax lead\b/i,
  /\binternational indirect tax\b/i,
  /\broc analyst\b/i,
  /\bsenior investment associate\b/i,
  /\bbusiness systems analyst\b/i,
  /\bsecurity workforce\b/i,
  /\bregional state and local affairs\b/i,
  /\bresponsible scaling policy\b/i,
  /^paralegal$/i,
  /^account manager$/i,
  /^chief of staff$/i,
  /\bdirector of tax\b/i,
  /^gtm (director|team lead)\b/i,
  /\bdeal desk\b/i,
  /\bbenefits program manager\b/i,
  /\bpeople business partner\b/i,
  /\bsales compensation\b/i,
  /\bglobal workplace operations\b/i,
  /\binternational accounting\b/i,
  /\bit operations analyst\b/i,
  /\bmotion designer\b/i,
  /\bsocial media marketing\b/i,
  /\bgrowth marketing\b/i,
  /\bnotary public\b/i,
];

function shouldHardReject(title: string, company?: string): boolean {
  if (ALWAYS_REJECT_TITLE_PATTERNS.some(pattern => pattern.test(title))) {
    return true;
  }

  if (isWhitelistedLegalTitle(title)) {
    return false;
  }

  if (PURE_ENGINEERING_PATTERNS.some(pattern => pattern.test(title))) {
    return true;
  }

  if (company && isLegalTechCompany(company)) {
    return false;
  }

  return GENERAL_COMPANY_REJECT_PATTERNS.some(pattern => pattern.test(title));
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

function isLikelyNonEnglish(text: string): boolean {
  const cyrillicPattern = /[\u0400-\u04FF]/g;
  const cjkPattern = /[\u4E00-\u9FFF]/g;
  const arabicPattern = /[\u0600-\u06FF]/g;
  const hangulPattern = /[\uAC00-\uD7AF]/g;

  const nonLatinMatches = (text.match(cyrillicPattern) || []).length +
    (text.match(cjkPattern) || []).length +
    (text.match(arabicPattern) || []).length +
    (text.match(hangulPattern) || []).length;

  const latinAlpha = (text.match(/[a-zA-Z]/g) || []).length;
  const totalAlpha = latinAlpha + nonLatinMatches;

  if (totalAlpha === 0) return false;
  return nonLatinMatches / totalAlpha > 0.2;
}

function isArticleTitle(title: string): boolean {
  const words = title.trim().split(/\s+/);

  const JOB_KEYWORDS = /\b(manager|engineer|analyst|counsel|director|specialist|coordinator|lead|associate|consultant|designer|architect|officer|paralegal|attorney|advisor|developer|recruiter|intern|fellow)\b/i;

  const ARTICLE_SIGNALS = /\b(mastering|navigating|understanding|exploring|unlocking|transforming|reimagining|rethinking|how to|why you|the future of|ease the way|successful implementation|fragmented|landscape|strategies for|insights into|guide to)\b/i;
  if (ARTICLE_SIGNALS.test(title) && !JOB_KEYWORDS.test(title)) return true;

  if (words.length <= 8) return false;
  if (JOB_KEYWORDS.test(title)) return false;

  const colonIndex = title.indexOf(':');
  if (colonIndex >= 0) {
    const afterColon = title.substring(colonIndex + 1).trim();
    const afterColonWords = afterColon.split(/\s+/);
    if (afterColonWords.length >= 4) return true;
  }

  if (words.length > 10) return true;

  return false;
}

function hasGarbageDescription(description: string | null): boolean {
  if (!description || description.trim().length === 0) return true;
  const trimmed = description.trim();
  if (trimmed.length < 100) return true;
  if (trimmed.includes('Skip to main content') || trimmed.includes('Skip to content')) return true;
  if (trimmed.startsWith('-->')) return true;
  const textChars = trimmed.replace(/\s/g, '').length;
  if (trimmed.length > 0 && textChars / trimmed.length < 0.3) return true;
  return false;
}

function isGenericCareersUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    if (/gh_jid=|jobs\/\d+|\/job\/\d+|\/position\/|\/opening\/|\/requisition\/|\/jid\/|\/apply\/\d+/i.test(url)) return false;
    if (/\/jobs\/[a-z0-9-]{5,}/i.test(path) && !/\/jobs\/?$/i.test(path)) return false;

    if (url.includes('icims.com/jobs/intro')) return true;

    if (/^\/careers\/?$/.test(path) || /^\/jobs\/?$/.test(path)) return true;

    if (path === '/' || path === '') return true;

    return false;
  } catch {
    return false;
  }
}

function reconcileLocation(location: string | null, enrichedData: Record<string, any>): void {
  if (!location || location.trim() === '') return;
  const loc = location.toLowerCase();

  const hasRemote = /\bremote\b/i.test(loc);
  const hasHybrid = /\bhybrid\b/i.test(loc);

  const cityPatterns = /\b(new york|san francisco|los angeles|chicago|boston|seattle|austin|denver|washington|atlanta|dallas|houston|miami|philadelphia|phoenix|portland|minneapolis|detroit|charlotte|nashville|raleigh|salt lake|san diego|san jose|tampa|orlando|pittsburgh|st\.? louis|indianapolis|columbus|milwaukee|kansas city|cleveland|cincinnati|sacramento|las vegas|london|toronto|berlin|amsterdam|dublin|paris|singapore|sydney|mumbai|bangalore|tokyo)\b/i;
  const hasCity = cityPatterns.test(loc);

  if (hasRemote && !hasCity) {
    enrichedData.isRemote = true;
    enrichedData.locationType = 'remote';
  } else if (hasCity && (hasRemote || hasHybrid)) {
    enrichedData.isRemote = false;
    enrichedData.locationType = 'hybrid';
  } else if (hasCity && !hasRemote) {
    enrichedData.isRemote = false;
    enrichedData.locationType = 'onsite';
  }
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

  if (enrichedData.roleCategory) score += 15;

  if (enrichedData.structuredDescription) {
    const sd = enrichedData.structuredDescription as any;
    if (sd.summary && sd.summary.length > 50) score += 5;
    else if (sd.summary && sd.summary.length > 20) score += 3;
    if (sd.aboutCompany && sd.aboutCompany.length > 50) score += 5;
    if (sd.responsibilities?.length >= 6) score += 12;
    else if (sd.responsibilities?.length >= 4) score += 8;
    else if (sd.responsibilities?.length >= 2) score += 4;
    if (sd.minimumQualifications?.length >= 4) score += 5;
    else if (sd.minimumQualifications?.length >= 2) score += 3;
    if (sd.preferredQualifications?.length >= 2) score += 3;
    if (sd.skillsRequired?.length >= 6) score += 5;
    else if (sd.skillsRequired?.length >= 3) score += 3;
    if (sd.lawyerTransitionNotes?.length >= 2) score += 3;
  }

  if (enrichedData.experienceMin !== null && enrichedData.experienceMin !== undefined) score += 5;

  if (job.applyUrl && job.applyUrl.startsWith('http')) score += 10;

  const descLen = (job.description || '').length;
  if (descLen > 1000) score += 8;
  else if (descLen > 500) score += 5;
  else if (descLen > 200) score += 3;

  if (enrichedData.seniorityLevel && enrichedData.seniorityLevel !== 'Not specified') score += 5;

  const relevance = enrichedData.legalRelevanceScore || 0;
  if (relevance >= 8) score += 15;
  else if (relevance >= 6) score += 10;
  else if (relevance >= 4) score += 5;

  if (enrichedData.aiSummary && enrichedData.aiSummary.length > 100) score += 3;

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

async function recoverStuckJobs(): Promise<number> {
  try {
    const stuckJobs = await db.select().from(jobs)
      .where(and(
        eq(jobs.pipelineStatus, 'enriching'),
        eq(jobs.isActive, true),
        sql`(${jobs.lastEnrichedAt} < NOW() - INTERVAL '30 minutes' OR ${jobs.lastEnrichedAt} IS NULL)`
      ));

    if (stuckJobs.length > 0) {
      console.log(`[Enrichment] Found ${stuckJobs.length} stuck jobs in 'enriching' state, resetting to 'raw'`);
      for (const job of stuckJobs) {
        await storage.updateJobWorkerFields(job.id, { pipelineStatus: 'raw' });
      }
    }
    return stuckJobs.length;
  } catch (err: any) {
    console.error('[Enrichment] Failed to recover stuck jobs:', err.message);
    return 0;
  }
}

async function enrichJob(job: Job): Promise<void> {
  if (shouldHardReject(job.title, job.company)) {
    console.log(`[Enrichment] Hard-rejecting "${job.title}" at ${job.company} - irrelevant title pattern`);
    await storage.updateJobWorkerFields(job.id, {
      pipelineStatus: 'rejected',
      isPublished: false,
      reviewReasonCode: 'IRRELEVANT_TITLE',
      lastEnrichedAt: new Date(),
    });
    return;
  }

  if (shouldRejectByCompany(job.title, job.company)) {
    console.log(`[Enrichment] Company-rejecting "${job.title}" at ${job.company} - non-legal-tech company without legal signal`);
    await storage.updateJobWorkerFields(job.id, {
      pipelineStatus: 'rejected',
      isPublished: false,
      reviewReasonCode: 'NON_LEGAL_TECH_COMPANY',
      lastEnrichedAt: new Date(),
    });
    return;
  }

  if (isLikelyNonEnglish(job.title)) {
    console.log(`[Enrichment] Non-English title detected: "${job.title}" at ${job.company}`);
    await storage.updateJobWorkerFields(job.id, {
      pipelineStatus: 'rejected',
      isPublished: false,
      reviewReasonCode: 'NON_ENGLISH',
      lastEnrichedAt: new Date(),
    });
    return;
  }

  if (isArticleTitle(job.title)) {
    console.log(`[Enrichment] Article title detected: "${job.title}" at ${job.company}`);
    await storage.updateJobWorkerFields(job.id, {
      pipelineStatus: 'rejected',
      isPublished: false,
      reviewReasonCode: 'ARTICLE_TITLE',
      lastEnrichedAt: new Date(),
    });
    return;
  }

  if (hasGarbageDescription(job.description)) {
    console.log(`[Enrichment] Garbage description detected for "${job.title}" at ${job.company}`);
    await storage.updateJobWorkerFields(job.id, {
      pipelineStatus: 'rejected',
      isPublished: false,
      reviewReasonCode: 'GARBAGE_DESCRIPTION',
      lastEnrichedAt: new Date(),
    });
    return;
  }

  if (job.source === 'generic' && ((job.description || '').trim().length < 200 || hasGarbageDescription(job.description))) {
    console.log(`[Enrichment] Low quality generic scrape: "${job.title}" at ${job.company}`);
    await storage.updateJobWorkerFields(job.id, {
      pipelineStatus: 'rejected',
      isPublished: false,
      reviewReasonCode: 'LOW_QUALITY_SCRAPE',
      lastEnrichedAt: new Date(),
    });
    return;
  }

  const cleanedTitle = cleanJobTitle(job.title);
  if (cleanedTitle !== job.title) {
    console.log(`[Enrichment] Title cleaned: "${job.title}" → "${cleanedTitle}"`);
  }

  const enrichedData: Record<string, any> = {
    pipelineStatus: 'enriching',
  };

  if (cleanedTitle !== job.title) {
    enrichedData.title = cleanedTitle;
  }

  try {
    await storage.updateJobWorkerFields(job.id, { pipelineStatus: 'enriching' });

    if (!job.jobHash) {
      enrichedData.jobHash = generateJobHash(
        job.company, cleanedTitle, job.location || '', job.applyUrl
      );
    }

    const fuzzyHash = generateFuzzyJobHash(job.company, cleanedTitle);
    const normalizedCo = normalizeCompanyName(job.company);
    const companyPattern = `%${job.company.split(/\s+/)[0].toLowerCase()}%`;
    const candidateJobs = await db
      .select({ id: jobs.id, title: jobs.title, company: jobs.company })
      .from(jobs)
      .where(and(
        eq(jobs.isPublished, true),
        eq(jobs.pipelineStatus, 'ready'),
        sql`lower(${jobs.company}) LIKE ${companyPattern}`,
      ));

    const matchingCompanyJobs = candidateJobs.filter(
      j => normalizeCompanyName(j.company) === normalizedCo
    );

    for (const existing of matchingCompanyJobs) {
      if (existing.id === job.id) continue;
      const existingFuzzyHash = generateFuzzyJobHash(existing.company, existing.title);
      if (existingFuzzyHash === fuzzyHash) {
        console.log(`[Enrichment] Near-duplicate detected: "${cleanedTitle}" at ${job.company} matches existing job #${existing.id} "${existing.title}" — rejecting`);
        await storage.updateJobWorkerFields(job.id, {
          pipelineStatus: 'rejected',
          reviewReasonCode: 'NEAR_DUPLICATE',
          reviewStatus: 'rejected',
        });
        return;
      }
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

      if (isLegalTechCompany(job.company)) {
        const aiScore = catResult.legalRelevanceScore || 0;
        if (aiScore < 6) {
          enrichedData.legalRelevanceScore = 6;
          console.log(`[Enrichment] Boosted relevance for "${job.title}" at ${job.company}: ${aiScore} -> 6 (legal tech company)`);
        }
        if (catResult.reviewStatus === 'rejected') {
          catResult.reviewStatus = 'needs_review';
        }
      }

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

    reconcileLocation(job.location, enrichedData);

    const qualityScore = computeQualityScore(job, enrichedData);
    const relevanceConfidence = enrichedData.legalRelevanceScore
      ? Math.min(100, enrichedData.legalRelevanceScore * 10)
      : 0;

    enrichedData.qualityScore = qualityScore;
    enrichedData.relevanceConfidence = relevanceConfidence;
    enrichedData.lastEnrichedAt = new Date();

    const structuredComplete = isStructuredDescriptionComplete(enrichedData.structuredDescription || job.structuredDescription);
    const relevanceScore = enrichedData.legalRelevanceScore || 0;

    const qualityThreshold = relevanceScore >= 7 ? 40 : 50;

    if (catResult?.reviewStatus === 'rejected' || relevanceConfidence < 40) {
      enrichedData.pipelineStatus = 'rejected';
      enrichedData.isPublished = false;
      enrichedData.reviewReasonCode = 'LOW_RELEVANCE';
    } else if (relevanceConfidence >= 40 && enrichedData.roleCategory && relevanceScore >= 3 && qualityScore >= qualityThreshold) {
      const existingDuplicate = await storage.findLiveJobDuplicate(job.title, job.company, job.location, job.id);
      if (existingDuplicate) {
        enrichedData.pipelineStatus = 'rejected';
        enrichedData.isPublished = false;
        enrichedData.reviewReasonCode = 'DUPLICATE_JOB';
        console.log(`[Enrichment] Duplicate detected: "${job.title}" at ${job.company} (existing live job #${existingDuplicate.id})`);
      } else {
        enrichedData.pipelineStatus = 'ready';
        enrichedData.isPublished = true;
      }
    } else {
      enrichedData.pipelineStatus = 'ready';
      if (!enrichedData.roleCategory) {
        enrichedData.reviewReasonCode = 'MISSING_CATEGORY';
      } else if (relevanceScore < 6) {
        enrichedData.reviewReasonCode = 'LOW_RELEVANCE_SCORE';
      } else if (qualityScore < 70) {
        enrichedData.reviewReasonCode = 'LOW_QUALITY_SCORE';
      } else {
        enrichedData.reviewReasonCode = 'MANUAL_REVIEW';
      }
    }

    const normalizedLocation = normalizeLocation(job.location);
    if (normalizedLocation && normalizedLocation !== job.location) {
      enrichedData.location = normalizedLocation;
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
    await recoverStuckJobs();

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

async function runLiveJobAudit(): Promise<{ audited: number; flagged: number; promoted: number }> {
  let audited = 0;
  let flagged = 0;
  let promoted = 0;

  try {
    const allPublished = await db.select().from(jobs).where(eq(jobs.isPublished, true));
    console.log(`[Audit] Checking ${allPublished.length} published jobs against ALL quality gates...`);

    for (const job of allPublished) {
      audited++;

      if (job.pipelineStatus === 'raw' || job.pipelineStatus === 'enriching') {
        continue;
      }

      if (shouldHardReject(job.title, job.company)) {
        console.log(`[Audit] Unpublish "${job.title}" at ${job.company} - hard reject title`);
        await storage.updateJobWorkerFields(job.id, { pipelineStatus: 'rejected', isPublished: false, reviewReasonCode: 'AUDIT_TITLE_REJECT' });
        flagged++;
        continue;
      }

      if (shouldRejectByCompany(job.title, job.company)) {
        console.log(`[Audit] Unpublish "${job.title}" at ${job.company} - non-legal-tech company`);
        await storage.updateJobWorkerFields(job.id, { pipelineStatus: 'rejected', isPublished: false, reviewReasonCode: 'AUDIT_COMPANY_REJECT' });
        flagged++;
        continue;
      }

      if (isGenericCareersUrl(job.applyUrl || '')) {
        console.log(`[Audit] Unpublish "${job.title}" at ${job.company} - generic careers URL`);
        await storage.updateJobWorkerFields(job.id, { pipelineStatus: 'rejected', isPublished: false, reviewReasonCode: 'GENERIC_APPLY_URL' });
        flagged++;
        continue;
      }

      const duplicate = await storage.findLiveJobDuplicate(job.title, job.company, job.location, job.id);
      if (duplicate && duplicate.id < job.id) {
        console.log(`[Audit] Unpublish duplicate "${job.title}" at ${job.company} (keeping #${duplicate.id})`);
        await storage.updateJobWorkerFields(job.id, { pipelineStatus: 'rejected', isPublished: false, reviewReasonCode: 'AUDIT_DUPLICATE' });
        flagged++;
        continue;
      }

      let failReason: string | null = null;
      const auditQualityThreshold = (job.legalRelevanceScore ?? 0) >= 7 ? 40 : 50;
      if (!job.isActive) failReason = 'INACTIVE';
      else if (job.jobStatus !== 'open') failReason = 'JOB_CLOSED';
      else if ((job.qualityScore ?? 0) < auditQualityThreshold) failReason = 'LOW_QUALITY_SCORE';
      else if ((job.legalRelevanceScore ?? 0) < 3) failReason = 'LOW_RELEVANCE_SCORE';
      else if (!job.roleCategory) failReason = 'MISSING_CATEGORY';
      else if ((job.relevanceConfidence ?? 0) < 40) failReason = 'LOW_CONFIDENCE';
      else if (!job.applyUrl || job.applyUrl.trim() === '') failReason = 'NO_APPLY_URL';

      if (failReason) {
        console.log(`[Audit] Unpublish "${job.title}" at ${job.company} - ${failReason} (quality=${job.qualityScore}, relevance=${job.legalRelevanceScore}, status=${job.jobStatus}, active=${job.isActive})`);
        await storage.updateJobWorkerFields(job.id, { isPublished: false, reviewReasonCode: failReason });
        flagged++;
      }
    }

    console.log(`[Audit] Phase 1 done: ${audited} checked, ${flagged} unpublished`);

    const candidates = await db.select().from(jobs).where(
      and(
        eq(jobs.pipelineStatus, 'ready'),
        eq(jobs.isPublished, false),
        eq(jobs.isActive, true),
        eq(jobs.jobStatus, 'open')
      )
    );

    for (const job of candidates) {
      const candidateQualityThreshold = (job.legalRelevanceScore ?? 0) >= 7 ? 40 : 50;
      const passesGate = (job.qualityScore ?? 0) >= candidateQualityThreshold
        && (job.legalRelevanceScore ?? 0) >= 3
        && job.roleCategory !== null
        && (job.relevanceConfidence ?? 0) >= 40
        && job.applyUrl && job.applyUrl.trim() !== ''
        && !isGenericCareersUrl(job.applyUrl)
        && !shouldHardReject(job.title, job.company)
        && !shouldRejectByCompany(job.title, job.company);

      if (!passesGate) continue;

      const dup = await storage.findLiveJobDuplicate(job.title, job.company, job.location, job.id);
      if (dup) continue;

      console.log(`[Audit] Auto-publishing "${job.title}" at ${job.company} (quality=${job.qualityScore}, relevance=${job.legalRelevanceScore})`);
      await storage.updateJobWorkerFields(job.id, { isPublished: true });
      promoted++;
    }

    console.log(`[Audit] Phase 2 done: ${candidates.length} candidates checked, ${promoted} newly published`);
    console.log(`[Audit] Complete: ${flagged} unpublished, ${promoted} promoted`);
  } catch (err: any) {
    console.error('[Audit] Failed:', err.message);
  }

  return { audited, flagged, promoted };
}

const AUDIT_INTERVAL_MS = 4 * 60 * 60 * 1000;
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
    console.log('[Audit] Starting quality gate audit worker (every 4 hours)');
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
