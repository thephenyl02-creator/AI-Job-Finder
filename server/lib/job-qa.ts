import type { Job } from '@shared/schema';
import type { StructuredDescription } from '@shared/schema';
import { db } from '../db';
import { jobs } from '@shared/schema';
import { eq, and, ne } from 'drizzle-orm';

export interface QAError {
  code: string;
  field: string;
  message: string;
}

export interface QAWarning {
  code: string;
  field: string;
  message: string;
}

export type QAStatus = 'passed' | 'needs_review' | 'failed';

export interface QAResult {
  qaStatus: QAStatus;
  errors: QAError[];
  warnings: QAWarning[];
  lawyerFirstScore: number;
  excludeReason: string | null;
}

const ENGINEERING_ONLY_TITLES = [
  /\bsoftware engineer\b/i,
  /\bbackend engineer\b/i,
  /\bfrontend engineer\b/i,
  /\bfull[- ]?stack\b.*\bengineer\b/i,
  /\bdevops\b/i,
  /\bsite reliability\b/i,
  /\b(SRE)\b/,
  /\bqa engineer\b/i,
  /\bmobile engineer\b/i,
  /\bdata engineer\b/i,
  /\bml engineer\b/i,
  /\bplatform engineer\b/i,
  /\binfrastructure engineer\b/i,
];

const LEGAL_INDICATORS_IN_TITLE = [
  /\blegal\b/i, /\bcounsel\b/i, /\battorney\b/i, /\bprivacy\b/i,
  /\bcompliance\b/i, /\bcontracts?\b/i, /\blegal ops\b/i,
  /\bclm\b/i, /\bediscovery\b/i, /\bgovernance\b/i, /\brisk\b/i,
  /\bpolicy\b/i, /\bregulatory\b/i, /\bparalegal\b/i,
  /\blegal tech\b/i, /\blegal engineer\b/i, /\bknowledge engineer\b/i,
  /\binnovation\b/i, /\btransformation\b/i,
];

const POSITIVE_LEGAL_KEYWORDS = [
  'counsel', 'attorney', 'legal', 'privacy', 'compliance', 'contracts',
  'legal ops', 'legal operations', 'clm', 'contract lifecycle',
  'ediscovery', 'e-discovery', 'governance', 'risk', 'policy',
  'regulatory', 'paralegal', 'legal tech', 'legal technology',
  'legal engineer', 'knowledge engineer', 'innovation', 'transformation',
  'ai adoption', 'legal ai', 'law firm', 'bar admission', 'jd',
  'juris doctor', 'legal practice', 'litigation', 'intellectual property',
  'patent', 'trademark', 'data protection', 'gdpr', 'ccpa',
  'hipaa', 'sox', 'aml', 'kyc', 'sanctions', 'investigations',
  'court', 'judiciary', 'legal department', 'general counsel',
  'in-house', 'outside counsel', 'law department', 'legal services',
  'access to justice', 'pro bono', 'legal aid', 'practice management',
  'matter management', 'legal billing', 'ebilling', 'legal analytics',
  'contract management', 'document review', 'due diligence',
  'legal workflow', 'legal automation',
];

function isEngineeringOnly(title: string): boolean {
  const matchesEngineering = ENGINEERING_ONLY_TITLES.some(p => p.test(title));
  if (!matchesEngineering) return false;
  const hasLegalSignal = LEGAL_INDICATORS_IN_TITLE.some(p => p.test(title));
  return !hasLegalSignal;
}

export function computeLawyerFirstScore(title: string, description: string, roleCategory: string | null): number {
  let score = 0;
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const combined = titleLower + ' ' + descLower;

  for (const kw of POSITIVE_LEGAL_KEYWORDS) {
    if (titleLower.includes(kw)) {
      score += 5;
    }
    if (descLower.includes(kw)) {
      score += 1;
    }
  }

  if (roleCategory) {
    const cat = roleCategory.toLowerCase();
    const legalCategories = [
      'privacy', 'compliance', 'legal ops', 'contract', 'ediscovery',
      'governance', 'regulatory', 'legal ai', 'legal tech', 'counsel',
      'policy', 'risk', 'practice management', 'ip tech', 'court tech',
      'access to justice', 'legal marketplace', 'legal analytics',
    ];
    if (legalCategories.some(c => cat.includes(c))) {
      score += 15;
    }
  }

  if (/\b(jd|juris doctor|bar admission|law degree)\b/i.test(combined)) {
    score += 10;
  }

  if (isEngineeringOnly(title)) {
    score = Math.min(score, 20);
  }

  return Math.min(score, 100);
}

function getStructuredFields(job: Partial<Job>): {
  summary: string;
  responsibilities: string[];
  minimumQualifications: string[];
  preferredQualifications: string[];
  coreSkills: string[];
} {
  const sd = job.structuredDescription as StructuredDescription | null;
  return {
    summary: sd?.summary || job.aiSummary || '',
    responsibilities: sd?.responsibilities || job.aiResponsibilities || [],
    minimumQualifications: sd?.minimumQualifications || job.aiQualifications || [],
    preferredQualifications: sd?.preferredQualifications || job.aiNiceToHaves || [],
    coreSkills: sd?.skillsRequired || job.keySkills || [],
  };
}

export function runQAChecks(job: Partial<Job>): QAResult {
  const errors: QAError[] = [];
  const warnings: QAWarning[] = [];
  let excludeReason: string | null = null;

  const title = job.title || '';
  const company = job.company || '';
  const location = job.location || '';
  const roleCategory = job.roleCategory || '';
  const structured = getStructuredFields(job);

  if (title.length < 3) {
    errors.push({ code: 'E_TITLE_MISSING', field: 'title', message: 'Title must be at least 3 characters' });
  }

  if (company.length < 2) {
    errors.push({ code: 'E_COMPANY_MISSING', field: 'company', message: 'Company must be at least 2 characters' });
  }

  if (structured.summary.length < 30) {
    errors.push({ code: 'E_SUMMARY_SHORT', field: 'summary', message: 'Summary must be at least 30 characters' });
  }

  if (structured.coreSkills.length < 3) {
    errors.push({ code: 'E_SKILLS_TOO_FEW', field: 'coreSkills', message: 'Add at least 3 core skills' });
  }

  if (!roleCategory) {
    errors.push({ code: 'E_ROLECATEGORY_EMPTY', field: 'roleCategory', message: 'Role category is required' });
  }

  if (isEngineeringOnly(title)) {
    errors.push({ code: 'E_ENGINEERING_ONLY', field: 'title', message: 'Engineering-only role detected — not relevant for legal professionals' });
    excludeReason = 'Engineering-only role';
  }

  if (!location || location === '__unspecified__') {
    warnings.push({ code: 'W_LOCATION_UNKNOWN', field: 'location', message: 'Location not specified' });
  }

  if (structured.preferredQualifications.length === 0) {
    warnings.push({ code: 'W_PREFERRED_EMPTY', field: 'preferredQualifications', message: 'No preferred qualifications listed' });
  }

  if (structured.responsibilities.length < 2) {
    warnings.push({ code: 'W_RESP_TOO_FEW', field: 'responsibilities', message: 'Fewer than 2 responsibilities listed' });
  }

  if (structured.minimumQualifications.length === 0 && structured.responsibilities.length === 0) {
    errors.push({ code: 'E_MINQ_EMPTY', field: 'minimumQualifications', message: 'At least minimum qualifications or responsibilities are required' });
  }

  const description = job.description || '';
  const lawyerFirstScore = computeLawyerFirstScore(title, description, roleCategory);

  if (lawyerFirstScore < 40) {
    warnings.push({ code: 'W_LOW_LAWYER_SCORE', field: 'lawyerFirstScore', message: `Lawyer relevance score is low (${lawyerFirstScore}/100)` });
  }

  if (description.length > 20000) {
    warnings.push({ code: 'W_TOO_MUCH_RAW', field: 'description', message: 'Raw description is unusually long' });
  }

  let qaStatus: QAStatus;
  if (errors.length > 0) {
    qaStatus = 'failed';
  } else if (lawyerFirstScore < 60) {
    qaStatus = 'needs_review';
  } else {
    qaStatus = 'passed';
  }

  console.log(`[QA] Job "${title}" (${company}): status=${qaStatus}, lawyerScore=${lawyerFirstScore}, errors=${errors.length}, warnings=${warnings.length}, skills=${structured.coreSkills.length}, resp=${structured.responsibilities.length}, minQ=${structured.minimumQualifications.length}`);

  return {
    qaStatus,
    errors,
    warnings,
    lawyerFirstScore,
    excludeReason,
  };
}

export async function checkDuplicate(jobHash: string, excludeJobId?: number): Promise<boolean> {
  if (!jobHash) return false;
  const conditions = [eq(jobs.jobHash, jobHash), eq(jobs.isActive, true)];
  if (excludeJobId) {
    conditions.push(ne(jobs.id, excludeJobId));
  }
  const existing = await db.select({ id: jobs.id })
    .from(jobs)
    .where(and(...conditions))
    .limit(1);
  return existing.length > 0;
}
