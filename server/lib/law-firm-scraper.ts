import axios from 'axios';
import * as cheerio from 'cheerio';
import { LAW_FIRMS_AND_COMPANIES, type LawFirmConfig } from './law-firms-list';
import type { InsertJob } from '@shared/schema';
import { categorizeJob, parseSalaryFromText, type JobCategorizationResult } from './job-categorizer';
import { fixMissingSentenceSpaces } from './html-utils';

interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  postedDate: string;
  source: string;
  externalId: string;
  salaryMin?: number;
  salaryMax?: number;
  compensationText?: string;
  locationType?: 'remote' | 'hybrid' | 'onsite';
  department?: string;
  employmentType?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function detectLocationType(text: string): 'remote' | 'hybrid' | 'onsite' | undefined {
  const lower = text.toLowerCase().replace(/\s+/g, ' ');

  const negativeRemote = /\bnot\s+remote\b|\bno\s+remote\b|\bnon[- ]?remote\b/.test(lower);
  const onsiteOnly = /\bon[- ]?site\s+only\b|\bin[- ]?office\s+only\b|\bin[- ]?person\s+only\b|\boffice[- ]?based\s+only\b|\bno\s+remote\s+option\b|\bfully\s+on[- ]?site\b|\b100%?\s+on[- ]?site\b|\b100%?\s+in[- ]?office\b/.test(lower);

  const hybridPatterns = [
    /\bhybrid\b/,
    /\bflex(?:ible)?\s+work(?:place|ing|space)?\b/,
    /\bremote\s*(?:\/|\+|&|and)\s*(?:on[- ]?site|office|in[- ]?person)\b/,
    /\b(?:on[- ]?site|office|in[- ]?person)\s*(?:\/|\+|&|and)\s*remote\b/,
    /\b(?:2|3|4)\s*(?:days?\s+)?(?:in[- ]?)?office\b/,
    /\bpartially?\s+remote\b/,
    /\bsplit\s+(?:between|time)\b.*(?:remote|office)/,
    /\bwork\s+from\s+(?:home|anywhere)\s+.*(?:days?\s+(?:in|at)\s+(?:the\s+)?office)/,
    /\b(?:some|partial)\s+(?:remote|in[- ]?office)\b/,
    /\bremote[- ]?first\b/,
    /\boffice[- ]?optional\b/,
  ];

  const remotePatterns = [
    /\bremote\b/,
    /\bwork\s+from\s+(?:home|anywhere)\b/,
    /\bwfh\b/,
    /\btelecommute\b/,
    /\btele[- ]?work(?:ing)?\b/,
    /\bfully\s+remote\b/,
    /\b100%?\s+remote\b/,
    /\bdistributed\s+(?:team|company|workforce)\b/,
    /\bvirtual\s+(?:position|role|opportunity)\b/,
    /\banywhere\s+in\s+(?:the\s+)?(?:us|u\.s\.|united\s+states|world|globe|country)\b/,
    /\blocation[: ]+?\s*(?:fully\s+)?remote\b/,
    /\bremote\s*[-–]\s*(?:us|u\.s\.|united\s+states|worldwide|global|anywhere)\b/,
  ];

  const onsitePatterns = [
    /\bon[- ]?site\b/,
    /\bin[- ]?office\b/,
    /\bin[- ]?person\b/,
    /\boffice[- ]?based\b/,
    /\bphysical\s+(?:office|location|presence)\b/,
    /\bmust\s+(?:be\s+)?(?:located|based|work)\s+(?:in|at|from)\s+(?:our|the)?\s*(?:office|hq|headquarters)/,
    /\bon\s+premises?\b/,
    /\b(?:5|five)\s+days?\s+(?:a\s+week\s+)?(?:in[- ]?)?(?:office|on[- ]?site)\b/,
    /\brequires?\s+(?:daily\s+)?(?:office|on[- ]?site|in[- ]?person)\s+(?:presence|attendance)\b/,
    /\brelocate\s+to\b/,
    /\bcommute\s+to\s+(?:our|the)\s+office\b/,
  ];

  if (hybridPatterns.some(p => p.test(lower))) return 'hybrid';

  if (!negativeRemote && !onsiteOnly && remotePatterns.some(p => p.test(lower))) return 'remote';

  if (onsiteOnly || onsitePatterns.some(p => p.test(lower))) return 'onsite';

  return undefined;
}

function extractGreenhouseSalary(job: any): { min?: number; max?: number; text?: string } {
  const metadata = job.metadata || [];
  for (const meta of metadata) {
    const name = (meta.name || '').toLowerCase();
    if (name.includes('salary') || name.includes('compensation') || name.includes('pay')) {
      const val = meta.value;
      if (typeof val === 'object' && val !== null) {
        const min = val.min_value || val.min || undefined;
        const max = val.max_value || val.max || undefined;
        if (min || max) return { min, max };
      }
      if (typeof val === 'string') {
        const parsed = parseSalaryFromText(val);
        if (parsed.min || parsed.max) {
          return { min: parsed.min, max: parsed.max, text: val };
        }
      }
    }
  }

  if (job.pay) {
    const pay = job.pay;
    return {
      min: pay.min_value || pay.min || undefined,
      max: pay.max_value || pay.max || undefined,
      text: pay.salary_range || undefined,
    };
  }

  return {};
}

function extractLeverSalary(job: any): { min?: number; max?: number; text?: string } {
  if (job.salaryRange) {
    const range = job.salaryRange;
    return {
      min: range.min || undefined,
      max: range.max || undefined,
      text: range.currency
        ? `${range.currency} ${range.min?.toLocaleString()} - ${range.max?.toLocaleString()}`
        : undefined,
    };
  }

  if (job.categories?.commitment) {
    const parsed = parseSalaryFromText(job.categories.commitment);
    if (parsed.min || parsed.max) return { min: parsed.min, max: parsed.max };
  }

  const lists = job.lists || [];
  for (const list of lists) {
    const listText = (list.text || '').toLowerCase();
    if (listText.includes('compensation') || listText.includes('salary') || listText.includes('pay')) {
      const content = (list.content || '');
      const parsed = parseSalaryFromText(content);
      if (parsed.min || parsed.max) {
        return { min: parsed.min, max: parsed.max, text: content.replace(/<[^>]*>/g, '').trim() };
      }
    }
  }

  return {};
}

function extractLeverLocationType(job: any): 'remote' | 'hybrid' | 'onsite' | undefined {
  const locType = job.categories?.locationType || job.workplaceType || '';
  if (locType) {
    const lower = locType.toLowerCase();
    if (lower.includes('hybrid')) return 'hybrid';
    if (lower.includes('remote')) return 'remote';
    if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('in-office')) return 'onsite';
  }
  const location = job.categories?.location || '';
  return detectLocationType(location);
}

function extractGreenhouseLocationType(job: any): 'remote' | 'hybrid' | 'onsite' | undefined {
  const metadata = job.metadata || [];
  for (const meta of metadata) {
    const name = (meta.name || '').toLowerCase();
    if (name.includes('location type') || name.includes('workplace') || name.includes('work arrangement')) {
      const val = typeof meta.value === 'string' ? meta.value : '';
      const detected = detectLocationType(val);
      if (detected) return detected;
    }
  }
  const locationName = job.location?.name || '';
  return detectLocationType(locationName);
}

export async function scrapeGreenhouse(companyId: string, companyName: string): Promise<ScrapedJob[]> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${companyId}/jobs?content=true`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LegalAICareersBot/1.0)',
      },
      timeout: 15000,
    });
    
    const jobs: ScrapedJob[] = response.data.jobs.map((job: any) => {
      const salary = extractGreenhouseSalary(job);
      const locationType = extractGreenhouseLocationType(job);
      return {
        title: job.title,
        company: companyName,
        location: job.location?.name || 'Not specified',
        description: job.content || '',
        applyUrl: job.absolute_url,
        postedDate: job.updated_at || new Date().toISOString(),
        source: 'greenhouse',
        externalId: `gh_${companyId}_${job.id}`,
        salaryMin: salary.min,
        salaryMax: salary.max,
        compensationText: salary.text,
        locationType,
        department: job.departments?.[0]?.name || undefined,
      };
    });
    
    return jobs;
  } catch (error: any) {
    console.error(`Greenhouse error for ${companyName}:`, error.message);
    return [];
  }
}

export async function scrapeLever(leverUrl: string, companyName: string): Promise<ScrapedJob[]> {
  try {
    const apiUrl = leverUrl.replace('jobs.lever.co', 'api.lever.co/v0/postings');
    
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LegalAICareersBot/1.0)',
      },
      timeout: 15000,
    });
    
    const jobs: ScrapedJob[] = response.data.map((job: any) => {
      const salary = extractLeverSalary(job);
      const locationType = extractLeverLocationType(job);
      return {
        title: job.text,
        company: companyName,
        location: job.categories?.location || 'Not specified',
        description: job.description || '',
        applyUrl: job.hostedUrl,
        postedDate: new Date(job.createdAt).toISOString(),
        source: 'lever',
        externalId: `lever_${job.id}`,
        salaryMin: salary.min,
        salaryMax: salary.max,
        compensationText: salary.text,
        locationType,
        department: job.categories?.department || undefined,
        employmentType: job.categories?.commitment || undefined,
      };
    });
    
    return jobs;
  } catch (error: any) {
    console.error(`Lever error for ${companyName}:`, error.message);
    return [];
  }
}

export async function scrapeAshby(ashbyUrl: string, companyName: string): Promise<ScrapedJob[]> {
  try {
    const response = await axios.get(ashbyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LegalAICareersBot/1.0)',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });
    
    const jobs: ScrapedJob[] = (response.data.jobs || []).map((job: any) => {
      const locationName = job.location?.name || job.locationName || 'Not specified';
      const locationType = detectLocationType(locationName + ' ' + (job.descriptionPlain || ''));
      const descText = job.descriptionPlain || job.descriptionHtml || '';
      const salary = parseSalaryFromText(descText);
      return {
        title: job.title,
        company: companyName,
        location: locationName,
        description: descText,
        applyUrl: job.applicationUrl || job.jobUrl || '',
        postedDate: job.publishedDate || new Date().toISOString(),
        source: 'ashby',
        externalId: `ashby_${job.id}`,
        salaryMin: salary.min,
        salaryMax: salary.max,
        locationType,
        department: job.department || undefined,
        employmentType: job.employmentType || undefined,
      };
    });
    
    return jobs;
  } catch (error: any) {
    console.error(`Ashby error for ${companyName}:`, error.message);
    return [];
  }
}

export async function scrapeGenericCareerPage(url: string, companyName: string, selectors?: LawFirmConfig['selectors']): Promise<ScrapedJob[]> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 15000,
    });
    
    const $ = cheerio.load(response.data);
    const jobs: ScrapedJob[] = [];
    
    const jobSelectors = [
      selectors?.jobList,
      '.job, .job-listing, .position, .opening',
      '[class*="career"], [class*="job"]',
      'article, .card',
      'li[class*="job"], li[class*="position"]',
    ].filter(Boolean) as string[];
    
    for (const selector of jobSelectors) {
      $(selector).each((i, element) => {
        const $job = $(element);
        
        const titleSelectors = [
          selectors?.title,
          'h2, h3, h4',
          '.title, .job-title, .position-title',
          'a[class*="title"]',
        ].filter(Boolean) as string[];
        
        let title = '';
        for (const titleSel of titleSelectors) {
          title = $job.find(titleSel).first().text().trim();
          if (title) break;
        }
        
        const locationSelectors = [
          selectors?.location,
          '.location, [class*="location"]',
        ].filter(Boolean) as string[];
        
        let location = '';
        for (const locSel of locationSelectors) {
          location = $job.find(locSel).first().text().trim();
          if (location) break;
        }
        
        let applyUrl = $job.find('a').first().attr('href') || '';
        if (applyUrl && !applyUrl.startsWith('http')) {
          const baseUrl = new URL(url).origin;
          applyUrl = baseUrl + applyUrl;
        }
        
        if (title && applyUrl) {
          jobs.push({
            title,
            company: companyName,
            location: location || 'Not specified',
            description: '',
            applyUrl,
            postedDate: new Date().toISOString(),
            source: 'generic',
            externalId: `generic_${companyName.replace(/\s+/g, '_')}_${i}`,
          });
        }
      });
      
      if (jobs.length > 0) break;
    }
    
    return jobs;
  } catch (error: any) {
    console.error(`Generic scrape error for ${companyName}:`, error.message);
    return [];
  }
}

export function isLegalTechRole(title: string): boolean {
  const t = title.toLowerCase();

  const rejectPatterns = [
    /general application/i, /career opportunities/i, /talent pool/i,
    /don.t see what/i, /join our team/i,
  ];
  if (rejectPatterns.some(p => p.test(t))) return false;

  const hardExclude = [
    'software engineer', 'backend engineer', 'frontend engineer',
    'full-stack engineer', 'full stack engineer', 'fullstack engineer',
    'platform engineer', 'infrastructure engineer', 'site reliability',
    'devops', 'sre ', 'cloud engineer', 'systems engineer',
    'data engineer', 'ml engineer', 'mlops', 'machine learning engineer',
    'ai engineer', 'deep learning', 'computer vision engineer',
    'firmware engineer', 'embedded engineer', 'hardware engineer',
    'electronics engineer', 'rf engineer', 'optical engineer',
    'mechanical engineer', 'spacecraft', 'avionics', 'gnc engineer',
    'remote sensing engineer', 'telecommunications engineer',
    'qa engineer', 'test engineer', 'quality engineer', 'sdet',
    'ux designer', 'ui designer', 'product designer', 'graphic designer',
    'brand designer', 'visual designer', 'web designer',
    'it administrator', 'system administrator', 'it engineer',
    'network engineer', 'security engineer', 'cyber security engineer',
    'endpoint engineer', 'it support',
    'react native', 'react engineer', 'node.js', 'python developer',
    'java developer', 'golang', 'rust engineer',
    'receptionist', 'office manager', 'janitor', 'facilities',
    'senior accountant', 'accounting manager', 'controller',
    'payroll manager', 'global payroll', 'bookkeeper',
    'recruiter', 'recruiting', 'talent acquisition',
    'people enablement', 'people program', 'people tech',
    'people operations', 'human resources', ' hr ',
    'organizing strategist', 'campaign strategist', 'electoral strategist',
    'social media manager', 'community manager',
    'commodity manager', 'supply chain',
    'global workplace lead', 'reward manager',
    'engineering manager', 'engineering operations',
  ];
  if (hardExclude.some(k => t.includes(k))) return false;

  const strongInclude = [
    'attorney', 'lawyer', 'counsel', 'legal director',
    'legal engineer', 'legal associate', 'legal analyst',
    'legal operations', 'legal ops', 'legal project',
    'legal innovation', 'legal technology', 'legaltech',
    'paralegal', 'legal secretary', 'legal assistant',
    'compliance', 'regulatory', 'policy',
    'contract manager', 'contract analyst', 'contract specialist', 'clm',
    'ediscovery', 'e-discovery', 'litigation support',
    'ip specialist', 'brand protection', 'trademark',
    'patent', 'intellectual property',
    'knowledge management', 'practice technology',
    'legal writer', 'legal content', 'editorial manager',
    'deal desk', 'commercial operations',
    'tax manager', 'tax director', 'tax counsel',
    'investment manager', 'investment associate',
    'risk', 'governance', 'audit',
    'privacy', 'data protection', 'gdpr', 'ccpa',
    'government affairs', 'public policy', 'legislative',
    'threat intelligence', 'investigations',
    'chief legal', 'deputy director', 'deputy project director',
  ];
  if (strongInclude.some(k => t.includes(k))) return true;

  const lawyerFriendly = [
    'customer success', 'customer enablement', 'customer onboarding',
    'engagement manager', 'engagement associate',
    'implementation', 'solutions consultant', 'solutions architect',
    'product manager', 'product lead', 'product owner',
    'product operations', 'program manager',
    'enablement manager', 'enablement specialist', 'enablement director',
    'account executive', 'account manager',
    'gtm manager', 'gtm director', 'gtm team lead',
    'business development manager', 'business development director',
    'chief of staff', 'content strategy', 'content lead',
    'technical delivery', 'delivery manager',
    'field enablement', 'sales engineer',
    'senior program manager',
  ];
  if (lawyerFriendly.some(k => t.includes(k))) return true;

  return false;
}

function inferRoleType(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('engineer') || titleLower.includes('developer')) return 'Engineering';
  if (titleLower.includes('product manager') || titleLower.includes('pm')) return 'Product Management';
  if (titleLower.includes('designer') || titleLower.includes('ux') || titleLower.includes('ui')) return 'Design';
  if (titleLower.includes('data scientist') || titleLower.includes('machine learning') || titleLower.includes('ai')) return 'Research';
  if (titleLower.includes('operations') || titleLower.includes('ops')) return 'Operations';
  if (titleLower.includes('sales') || titleLower.includes('business development')) return 'Sales';
  if (titleLower.includes('customer success')) return 'Customer Success';
  if (titleLower.includes('marketing') || titleLower.includes('content') || titleLower.includes('writer')) return 'Content';
  
  return 'Other';
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
    .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
    .replace(/&bull;/g, '\u2022').replace(/&hellip;/g, '\u2026')
    .replace(/&trade;/g, '\u2122').replace(/&copy;/g, '\u00A9').replace(/&reg;/g, '\u00AE')
    .replace(/&#(\d+);/g, (_: string, n: string) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_: string, h: string) => String.fromCharCode(parseInt(h, 16)));
}

function cleanDescriptionText(raw: string): string {
  let text = raw;
  text = decodeHtmlEntities(text);
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(?:p|div|h[1-6]|li|tr|section|article)>/gi, '\n');
  text = text.replace(/<(?:p|div|h[1-6]|ul|ol|table|tbody|thead|section|article)(?:\s[^>]*)?>/gi, '\n');
  text = text.replace(/<li(?:\s[^>]*)?>/gi, '- ');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&[a-z]+;/gi, ' ');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n /g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = fixMissingSentenceSpaces(text);
  return text.trim();
}

function cleanCompanyName(name: string): string {
  return name
    .replace(/\s*\(formerly\s+[^)]+\)/gi, '')
    .replace(/\s*\(fka\s+[^)]+\)/gi, '')
    .replace(/\s*\(prev(?:iously)?\s+[^)]+\)/gi, '')
    .trim();
}

function sanitizeLocation(location: string, company: string): string {
  const loc = location?.trim();
  if (!loc || loc === 'Not specified') return loc || 'Not specified';

  const locLower = loc.toLowerCase();
  const companyLower = company.toLowerCase();

  const nonGeoPatterns = [
    /\blegal\s+services?\b/i,
    /\bcentral\s+office\b/i,
    /\bheadquarters?\b/i,
    /\b(division|department|unit|branch|office)\s*$/i,
  ];

  const looksLikeCompanyName = nonGeoPatterns.some(p => p.test(loc));
  const containsCompanyWord = companyLower.split(/\s+/).some(
    w => w.length > 3 && locLower.includes(w)
  );

  if (looksLikeCompanyName || containsCompanyWord) {
    const boroughMap: Record<string, string> = {
      'bronx': 'Bronx, New York, United States',
      'brooklyn': 'Brooklyn, New York, United States',
      'manhattan': 'Manhattan, New York, United States',
      'queens': 'Queens, New York, United States',
      'staten island': 'Staten Island, New York, United States',
    };
    for (const [borough, fullLoc] of Object.entries(boroughMap)) {
      if (locLower.includes(borough)) return fullLoc;
    }
    return 'Not specified';
  }

  return loc;
}

export function transformToJobSchema(job: ScrapedJob, categorization?: JobCategorizationResult): InsertJob {
  const companyClean = cleanCompanyName(job.company);
  const companySlug = companyClean.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  
  const cleanDescription = cleanDescriptionText(job.description || '') || `${job.title} position at ${companyClean}`;
  
  const locationText = sanitizeLocation(job.location || '', companyClean);
  const fullText = `${job.title} ${cleanDescription} ${locationText}`.toLowerCase();
  const negativeRemote = /\bnot remote\b|\bon[- ]?site only\b|\bin[- ]?office only\b|\bno remote\b/.test(fullText);
  const hasRemoteSignal = /\bremote\b/.test(fullText) || /\bwork from home\b/.test(fullText) || /\bhybrid\b/.test(fullText) || /\bwfh\b/.test(fullText);

  const locationType = job.locationType || detectLocationType(fullText) || null;

  let isRemoteDetected: boolean;
  if (locationType) {
    isRemoteDetected = locationType === 'remote' || locationType === 'hybrid';
  } else {
    isRemoteDetected = !negativeRemote && (hasRemoteSignal || categorization?.isRemote === true);
  }

  let salaryMin: number | null = job.salaryMin || null;
  let salaryMax: number | null = job.salaryMax || null;
  if (!salaryMin && !salaryMax) {
    salaryMin = categorization?.salaryMin || null;
    salaryMax = categorization?.salaryMax || null;
  }
  if (!salaryMin && !salaryMax) {
    const parsed = parseSalaryFromText(cleanDescription);
    salaryMin = parsed.min ?? null;
    salaryMax = parsed.max ?? null;
  }

  return {
    title: job.title.trim(),
    company: companyClean,
    companyLogo: `https://logo.clearbit.com/${companySlug}.com`,
    location: locationText,
    isRemote: isRemoteDetected,
    locationType,
    salaryMin,
    salaryMax,
    experienceMin: categorization?.experienceMin || null,
    experienceMax: categorization?.experienceMax || null,
    roleType: inferRoleType(job.title),
    description: cleanDescription || `${job.title} position at ${job.company}`,
    requirements: null,
    applyUrl: job.applyUrl?.trim() || '#',
    isActive: true,
    externalId: job.externalId,
    source: job.source,
    roleCategory: categorization?.category || null,
    roleSubcategory: categorization?.subcategory || null,
    seniorityLevel: categorization?.seniorityLevel || null,
    keySkills: categorization?.keySkills || null,
    aiSummary: categorization?.aiSummary || null,
    matchKeywords: categorization?.matchKeywords || null,
  };
}

export async function scrapeAllLawFirms(): Promise<{
  jobs: InsertJob[];
  stats: { company: string; found: number; filtered: number }[];
}> {
  const allJobs: InsertJob[] = [];
  const stats: { company: string; found: number; filtered: number }[] = [];
  
  for (const firm of LAW_FIRMS_AND_COMPANIES) {
    try {
      console.log(`Scraping ${firm.name}...`);
      
      let scrapedJobs: ScrapedJob[] = [];
      
      if (firm.greenhouseId) {
        scrapedJobs = await scrapeGreenhouse(firm.greenhouseId, firm.name);
      } else if (firm.leverPostingsUrl) {
        scrapedJobs = await scrapeLever(firm.leverPostingsUrl, firm.name);
      } else if (firm.ashbyUrl) {
        scrapedJobs = await scrapeAshby(firm.ashbyUrl, firm.name);
      } else {
        scrapedJobs = await scrapeGenericCareerPage(firm.careerUrl, firm.name, firm.selectors);
      }
      
      const legalTechJobs = scrapedJobs.filter(job => isLegalTechRole(job.title));
      
      const transformedJobs = legalTechJobs.map(job => transformToJobSchema(job));
      allJobs.push(...transformedJobs);
      
      stats.push({
        company: firm.name,
        found: scrapedJobs.length,
        filtered: legalTechJobs.length,
      });
      
      console.log(`Found ${scrapedJobs.length} jobs, ${legalTechJobs.length} legal tech roles at ${firm.name}`);
      
      await delay(2000);
      
    } catch (error: any) {
      console.error(`Error scraping ${firm.name}:`, error.message);
      stats.push({
        company: firm.name,
        found: 0,
        filtered: 0,
      });
    }
  }
  
  return { jobs: allJobs, stats };
}

export async function scrapeSingleCompany(companyName: string): Promise<InsertJob[]> {
  const firm = LAW_FIRMS_AND_COMPANIES.find(
    f => f.name.toLowerCase() === companyName.toLowerCase()
  );
  
  if (!firm) {
    throw new Error(`Company "${companyName}" not found in the list`);
  }
  
  let scrapedJobs: ScrapedJob[] = [];
  
  if (firm.greenhouseId) {
    scrapedJobs = await scrapeGreenhouse(firm.greenhouseId, firm.name);
  } else if (firm.leverPostingsUrl) {
    scrapedJobs = await scrapeLever(firm.leverPostingsUrl, firm.name);
  } else if (firm.ashbyUrl) {
    scrapedJobs = await scrapeAshby(firm.ashbyUrl, firm.name);
  } else {
    scrapedJobs = await scrapeGenericCareerPage(firm.careerUrl, firm.name, firm.selectors);
  }
  
  const legalTechJobs = scrapedJobs.filter(job => isLegalTechRole(job.title));
  return legalTechJobs.map(job => transformToJobSchema(job));
}

export async function scrapeAllLawFirmsWithAI(
  onProgress?: (current: number, total: number, company: string) => void
): Promise<{
  jobs: InsertJob[];
  stats: { company: string; found: number; filtered: number; categorized: number }[];
}> {
  const allJobs: InsertJob[] = [];
  const stats: { company: string; found: number; filtered: number; categorized: number }[] = [];
  const total = LAW_FIRMS_AND_COMPANIES.length;
  
  for (let i = 0; i < LAW_FIRMS_AND_COMPANIES.length; i++) {
    const firm = LAW_FIRMS_AND_COMPANIES[i];
    
    try {
      if (onProgress) {
        onProgress(i + 1, total, firm.name);
      }
      console.log(`[${i + 1}/${total}] Scraping ${firm.name}...`);
      
      let scrapedJobs: ScrapedJob[] = [];
      
      if (firm.greenhouseId) {
        scrapedJobs = await scrapeGreenhouse(firm.greenhouseId, firm.name);
      } else if (firm.leverPostingsUrl) {
        scrapedJobs = await scrapeLever(firm.leverPostingsUrl, firm.name);
      } else if (firm.ashbyUrl) {
        scrapedJobs = await scrapeAshby(firm.ashbyUrl, firm.name);
      } else {
        scrapedJobs = await scrapeGenericCareerPage(firm.careerUrl, firm.name, firm.selectors);
      }
      
      const legalTechJobs = scrapedJobs.filter(job => isLegalTechRole(job.title));
      
      let categorizedCount = 0;
      for (const job of legalTechJobs) {
        try {
          const categorization = await categorizeJob(job.title, job.description, job.company);
          const transformedJob = transformToJobSchema(job, categorization);
          allJobs.push(transformedJob);
          categorizedCount++;
          
          await delay(500);
        } catch (catError) {
          console.error(`Categorization failed for ${job.title}:`, catError);
          const transformedJob = transformToJobSchema(job);
          allJobs.push(transformedJob);
        }
      }
      
      stats.push({
        company: firm.name,
        found: scrapedJobs.length,
        filtered: legalTechJobs.length,
        categorized: categorizedCount,
      });
      
      console.log(`Found ${scrapedJobs.length} jobs, ${legalTechJobs.length} legal tech roles, ${categorizedCount} categorized at ${firm.name}`);
      
      await delay(1500);
      
    } catch (error: any) {
      console.error(`Error scraping ${firm.name}:`, error.message);
      stats.push({
        company: firm.name,
        found: 0,
        filtered: 0,
        categorized: 0,
      });
    }
  }
  
  return { jobs: allJobs, stats };
}

type ATSPlatform = 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'smartrecruiters' | 'icims' | 'bamboohr' | 'rippling' | 'jazzhr' | 'recruitee' | 'breezy' | 'linkedin' | 'indeed' | 'myworkdayjobs' | 'applytojob' | 'jobvite' | 'dover' | 'personio' | 'generic';

function detectATSPlatform(url: string): ATSPlatform {
  const hostname = new URL(url).hostname.toLowerCase();
  const fullUrl = url.toLowerCase();

  if (hostname.includes('greenhouse.io') || hostname.includes('boards.greenhouse.io') || hostname.includes('job-boards.greenhouse.io')) return 'greenhouse';
  if (hostname.includes('lever.co') || hostname.includes('jobs.lever.co')) return 'lever';
  if (hostname.includes('ashbyhq.com') || hostname.includes('jobs.ashbyhq.com')) return 'ashby';
  if (hostname.includes('myworkdayjobs.com') || hostname.includes('wd5.myworkdayjobs.com') || hostname.includes('workday.com')) return 'workday';
  if (hostname.includes('smartrecruiters.com') || hostname.includes('jobs.smartrecruiters.com')) return 'smartrecruiters';
  if (hostname.includes('icims.com') || fullUrl.includes('icims')) return 'icims';
  if (hostname.includes('bamboohr.com')) return 'bamboohr';
  if (hostname.includes('rippling.com') || hostname.includes('ats.rippling.com')) return 'rippling';
  if (hostname.includes('jazzhr.com') || hostname.includes('app.jazz.co')) return 'jazzhr';
  if (hostname.includes('recruitee.com')) return 'recruitee';
  if (hostname.includes('breezy.hr')) return 'breezy';
  if (hostname.includes('linkedin.com')) return 'linkedin';
  if (hostname.includes('indeed.com')) return 'indeed';
  if (hostname.includes('applytojob.com')) return 'applytojob';
  if (hostname.includes('jobvite.com') || hostname.includes('jobs.jobvite.com')) return 'jobvite';
  if (hostname.includes('dover.com') || hostname.includes('app.dover.io')) return 'dover';
  if (hostname.includes('personio.de') || hostname.includes('jobs.personio.de')) return 'personio';

  return 'generic';
}

function detectEmbeddedATS(html: string, pageUrl: string): { platform: ATSPlatform; url: string } | null {
  const lower = html.toLowerCase();

  const ghMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*(?:boards|job-boards)\.greenhouse\.io[^"']*)/i)
    || html.match(/(?:src|href)\s*=\s*["']([^"']*greenhouse\.io\/[^"']*)/i);
  if (ghMatch) return { platform: 'greenhouse', url: ghMatch[1] };

  const leverMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*jobs\.lever\.co[^"']*)/i);
  if (leverMatch) return { platform: 'lever', url: leverMatch[1] };

  const ashbyMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*jobs\.ashbyhq\.com[^"']*)/i);
  if (ashbyMatch) return { platform: 'ashby', url: ashbyMatch[1] };

  const wdMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*myworkdayjobs\.com[^"']*)/i);
  if (wdMatch) return { platform: 'workday', url: wdMatch[1] };

  const srMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*jobs\.smartrecruiters\.com[^"']*)/i);
  if (srMatch) return { platform: 'smartrecruiters', url: srMatch[1] };

  const bhrMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*\.bamboohr\.com[^"']*)/i);
  if (bhrMatch) return { platform: 'bamboohr', url: bhrMatch[1] };

  const recruiteeMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*\.recruitee\.com[^"']*)/i);
  if (recruiteeMatch) return { platform: 'recruitee', url: recruiteeMatch[1] };

  const jazzMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*(?:app\.jazz\.co|jazzhr\.com)[^"']*)/i);
  if (jazzMatch) return { platform: 'jazzhr', url: jazzMatch[1] };

  const breezyMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*\.breezy\.hr[^"']*)/i);
  if (breezyMatch) return { platform: 'breezy', url: breezyMatch[1] };

  const jobviteMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*jobvite\.com[^"']*)/i);
  if (jobviteMatch) return { platform: 'jobvite', url: jobviteMatch[1] };

  if (lower.includes('greenhouse') && lower.includes('grnhse')) return { platform: 'greenhouse', url: pageUrl };
  if (lower.includes('lever_co_embed') || lower.includes('lever-jobs-container')) return { platform: 'lever', url: pageUrl };

  return null;
}

function discoverJobLinksFromPage($: cheerio.CheerioAPI, pageUrl: string): string[] {
  const baseUrl = new URL(pageUrl).origin;
  const links = new Set<string>();

  $('a[href]').each((_, el) => {
    let href = $(el).attr('href') || '';
    if (!href || href === '#' || href.startsWith('mailto:') || href.startsWith('javascript:') || href.startsWith('tel:')) return;

    if (href.startsWith('/')) href = baseUrl + href;
    else if (!href.startsWith('http')) href = baseUrl + '/' + href;

    try {
      const linkUrl = new URL(href);
      const path = linkUrl.pathname.toLowerCase();
      const host = linkUrl.hostname.toLowerCase();

      if (host.includes('greenhouse.io') || host.includes('lever.co') || host.includes('ashbyhq.com') ||
          host.includes('myworkdayjobs.com') || host.includes('smartrecruiters.com') || host.includes('bamboohr.com') ||
          host.includes('jazzhr.com') || host.includes('breezy.hr') || host.includes('jobvite.com') ||
          host.includes('recruitee.com') || host.includes('icims.com') || host.includes('workday.com')) {
        links.add(href);
        return;
      }

      const jobPathPatterns = [
        /\/jobs?\//i, /\/careers?\//i, /\/positions?\//i, /\/openings?\//i,
        /\/apply\//i, /\/opportunities?\//i, /\/vacancies?\//i,
        /\/job-details?\//i, /\/job-posting/i, /\/role\//i,
      ];

      const parentText = $(el).text().trim().toLowerCase();
      const hasJobContext = parentText.length > 3 && parentText.length < 200;

      if (jobPathPatterns.some(p => p.test(path)) && hasJobContext) {
        links.add(href);
      }
    } catch { }
  });

  return Array.from(links).slice(0, 100);
}

function isJobListingPage(url: string, $: cheerio.CheerioAPI): boolean {
  const path = new URL(url).pathname.toLowerCase();
  const listingPathPatterns = [
    /^\/careers?\/?$/i, /^\/jobs?\/?$/i, /^\/openings?\/?$/i,
    /^\/positions?\/?$/i, /^\/opportunities?\/?$/i,
    /\/careers?\/?\??/i, /\/jobs?\/?\??/i,
  ];
  const isListingPath = listingPathPatterns.some(p => p.test(path));

  const jobLinks = $('a[href*="/job"], a[href*="/position"], a[href*="/career"], a[href*="/opening"]').length;
  const jobCards = $('[class*="job-"], [class*="job_"], [class*="position"], [class*="opening"], [class*="vacancy"]').length;

  return isListingPath || jobLinks >= 3 || jobCards >= 3;
}

async function tryRecruiteeExtract(url: string): Promise<ScrapedJob | null> {
  const match = url.match(/([^/]+)\.recruitee\.com\/o\/([^/?#]+)/i);
  if (!match) return null;
  const [, companySlug, jobSlug] = match;
  try {
    const apiUrl = `https://${companySlug}.recruitee.com/api/offers/${jobSlug}`;
    const response = await axios.get(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalTechCareersBot/1.0)', 'Accept': 'application/json' },
      timeout: 10000,
    });
    const job = response.data?.offer || response.data;
    if (!job?.title) return null;
    return {
      title: job.title,
      company: job.company_name || companySlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      location: job.location || job.city || 'Not specified',
      description: cleanDescriptionText(job.description || ''),
      applyUrl: job.careers_url || url,
      postedDate: job.published_at || job.created_at || new Date().toISOString(),
      source: 'recruitee',
      externalId: `rec_${companySlug}_${job.id || jobSlug}`,
    };
  } catch { return null; }
}

async function tryBreezyExtract(url: string): Promise<ScrapedJob | null> {
  const match = url.match(/([^/]+)\.breezy\.hr\/p\/([a-f0-9]+)/i);
  if (!match) return null;
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
      timeout: 10000,
    });
    const $ = cheerio.load(response.data);
    const title = $('h1.position-title, h1[class*="title"], h1').first().text().trim();
    const company = $('meta[property="og:site_name"]').attr('content')?.trim()
      || $('[class*="company"], .company-name').first().text().trim() || match[1].replace(/-/g, ' ');
    const location = $('[class*="location"], .location').first().text().trim();
    $('script, style, nav, footer, header, iframe, noscript').remove();
    const descEl = $('[class*="description"], .description, main, article').first();
    const description = descEl.length ? cleanDescriptionText(descEl.html() || '') : '';
    if (!title || title.length < 3) return null;
    return { title, company, location: location || 'Not specified', description, applyUrl: url, postedDate: new Date().toISOString(), source: 'breezy', externalId: `brz_${match[1]}_${match[2]}` };
  } catch { return null; }
}

async function tryJazzHRExtract(url: string): Promise<ScrapedJob | null> {
  const match = url.match(/(?:app\.jazz\.co|jazzhr\.com)\/([^/]+)\/([^/?#]+)/i)
    || url.match(/(?:app\.jazz\.co|jazzhr\.com)\/apply\/([^/?#]+)/i);
  if (!match) return null;
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
      timeout: 10000,
    });
    const $ = cheerio.load(response.data);
    const title = $('h1.job-title, h1[class*="title"], h1, .job-title').first().text().trim();
    const company = $('meta[property="og:site_name"]').attr('content')?.trim() || '';
    const location = $('[class*="location"], .location, .job-location').first().text().trim();
    $('script, style, nav, footer, header, iframe, noscript').remove();
    const descEl = $('[class*="description"], .job-description, main, article').first();
    const description = descEl.length ? cleanDescriptionText(descEl.html() || '') : '';
    if (!title || title.length < 3) return null;
    return { title, company: company || 'Unknown Company', location: location || 'Not specified', description, applyUrl: url, postedDate: new Date().toISOString(), source: 'jazzhr', externalId: `jazz_${match[1] || ''}_${match[2] || match[1]}` };
  } catch { return null; }
}

async function tryRipplingExtract(url: string): Promise<ScrapedJob | null> {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
      timeout: 10000,
    });
    const $ = cheerio.load(response.data);
    const title = $('h1[class*="title"], h1, .job-title').first().text().trim();
    const company = $('meta[property="og:site_name"]').attr('content')?.trim() || '';
    const location = $('[class*="location"], .location').first().text().trim();
    $('script, style, nav, footer, header, iframe, noscript').remove();
    const descEl = $('[class*="description"], .job-description, main, article').first();
    const description = descEl.length ? cleanDescriptionText(descEl.html() || '') : '';
    if (!title || title.length < 3) return null;
    return { title, company: company || 'Unknown Company', location: location || 'Not specified', description, applyUrl: url, postedDate: new Date().toISOString(), source: 'rippling', externalId: `rip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` };
  } catch { return null; }
}

function extractGreenhouseJobId(url: string): string | null {
  const match = url.match(/\/jobs\/(\d+)/);
  return match ? match[1] : null;
}

function extractGreenhouseBoardSlug(url: string): string | null {
  const match = url.match(/(?:boards|job-boards)\.greenhouse\.io\/(\w+)/);
  return match ? match[1] : null;
}

function smartExtractFromHTML($: cheerio.CheerioAPI, platform: ATSPlatform): Partial<ScrapedJob> {
  const result: Partial<ScrapedJob> = {};

  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim();
  const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim();
  const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim();

  const titleCandidates = [
    $('h1.job-title, h1.posting-title, h1[class*="job-title"], h1[class*="JobTitle"]').first().text().trim(),
    $('h1[data-testid*="title"], h1[data-qa*="title"]').first().text().trim(),
    $('h1').first().text().trim(),
    $('h2.posting-headline h2, .posting-headline h2').first().text().trim(),
    ogTitle || '',
    twitterTitle || '',
    $('title').text().trim().split(/\s*[-|–]\s*/)[0]?.trim() || '',
  ];
  result.title = titleCandidates.find(t => t && t.length > 2 && t.length < 200) || '';

  const companyCandidates = [
    ogSiteName || '',
    $('[class*="company-name"], [class*="CompanyName"], [data-testid*="company"]').first().text().trim(),
    $('meta[name="author"]').attr('content')?.trim() || '',
    $('[itemtype*="Organization"] [itemprop="name"]').first().text().trim(),
  ];
  result.company = companyCandidates.find(c => c && c.length > 1 && c.length < 100) || '';

  const locationCandidates = [
    $('[class*="location"], [data-testid*="location"], .posting-categories .location').first().text().trim(),
    $('[itemprop="jobLocation"] [itemprop="addressLocality"]').first().text().trim(),
    $('[class*="Location"]').first().text().trim(),
  ];
  result.location = locationCandidates.find(l => l && l.length > 1) || '';

  $('script, style, nav, footer, header, iframe, noscript, [class*="cookie"], [class*="banner"], [class*="footer"], [class*="header"], [class*="nav"], [class*="sidebar"], [class*="related"], [class*="similar"]').remove();

  const descCandidates = [
    $('[class*="job-description"], [class*="jobDescription"], [class*="job_description"]').first(),
    $('[class*="posting-page"], .posting-page-body, #content').first(),
    $('[class*="description"], [data-testid*="description"]').first(),
    $('[class*="job-details"], [class*="jobDetails"]').first(),
    $('article').first(),
    $('main').first(),
    $('[role="main"]').first(),
  ];

  let descEl = descCandidates.find(el => el.length > 0 && el.text().trim().length > 100);
  if (!descEl || descEl.text().trim().length < 100) {
    descEl = $('body');
  }

  if (descEl && descEl.length > 0) {
    let descHtml = descEl.html() || '';
    result.description = cleanDescriptionText(descHtml);
  }

  return result;
}

async function scrapeWithAIFallback(url: string, rawHtml: string, basicResult: Partial<ScrapedJob>): Promise<ScrapedJob | null> {
  const hasGoodTitle = basicResult.title && basicResult.title.length > 3;
  const hasGoodDesc = basicResult.description && basicResult.description.length > 100;

  if (hasGoodTitle && hasGoodDesc) {
    return {
      title: basicResult.title!,
      company: basicResult.company || 'Unknown Company',
      location: basicResult.location || 'Not specified',
      description: basicResult.description!,
      applyUrl: url,
      postedDate: new Date().toISOString(),
      source: 'scraped',
      externalId: `scraped_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
  }

  console.log(`[Smart Scraper] Basic extraction insufficient for ${url}, using AI fallback...`);

  let cleanedText = cleanDescriptionText(rawHtml);
  if (cleanedText.length < 50) {
    const $ = cheerio.load(rawHtml);
    $('script, style, nav, footer, header, iframe, noscript').remove();
    cleanedText = $('body').text().replace(/\s+/g, ' ').trim();
  }

  if (cleanedText.length < 30) {
    console.log(`[Smart Scraper] Not enough text content from ${url}`);
    return null;
  }

  const truncated = cleanedText.substring(0, 8000);

  try {
    const { getOpenAIClient } = await import('./openai-client');
    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert job posting extractor. Given raw text from a job posting page, extract structured job data.
Return ONLY valid JSON:
{
  "title": "Exact job title",
  "company": "Company name",
  "location": "Location or 'Remote' or 'Not specified'",
  "description": "The full job description including responsibilities, requirements, qualifications, and benefits. Preserve important details but remove navigation/menu text, cookie notices, and unrelated content.",
  "locationType": "remote" | "hybrid" | "onsite",
  "salaryMin": number or null,
  "salaryMax": number or null
}
Rules:
- Extract the REAL job title (not the page title or company tagline)
- If multiple jobs appear, extract only the primary/most prominent one
- For salary, convert to annual USD. Handle hourly ($X/hr * 2080), monthly (*12), and "$XK" formats
- Clean the description: keep responsibilities, requirements, qualifications, benefits. Remove boilerplate.
- For locationType: "remote" if fully remote/work from home; "hybrid" if mix of remote and office/flexible; "onsite" if must work in office/on-site only. Default to "onsite" if unclear.`,
        },
        {
          role: "user",
          content: `Extract job posting data from this page (URL: ${url}):\n\n${truncated}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const aiTitle = parsed.title || basicResult.title;
    if (!aiTitle) return null;

    const aiLocationType = ['remote', 'hybrid', 'onsite'].includes(parsed.locationType) ? parsed.locationType : undefined;
    return {
      title: (aiTitle || 'Untitled Position').substring(0, 255),
      company: (parsed.company || basicResult.company || 'Unknown Company').substring(0, 255),
      location: parsed.location || basicResult.location || 'Not specified',
      description: parsed.description || basicResult.description || `${aiTitle} position`,
      applyUrl: url,
      postedDate: new Date().toISOString(),
      source: 'ai_extracted',
      externalId: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      salaryMin: typeof parsed.salaryMin === 'number' ? parsed.salaryMin : undefined,
      salaryMax: typeof parsed.salaryMax === 'number' ? parsed.salaryMax : undefined,
      locationType: aiLocationType,
    };
  } catch (error: any) {
    console.error(`[Smart Scraper] AI fallback failed for ${url}:`, error.message);
    if (basicResult.title) {
      return {
        title: basicResult.title,
        company: basicResult.company || 'Unknown Company',
        location: basicResult.location || 'Not specified',
        description: basicResult.description || `${basicResult.title} position`,
        applyUrl: url,
        postedDate: new Date().toISOString(),
        source: 'scraped',
        externalId: `scraped_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
    }
    return null;
  }
}

async function tryGreenhouseAPI(url: string): Promise<ScrapedJob | null> {
  const boardSlug = extractGreenhouseBoardSlug(url);
  const jobId = extractGreenhouseJobId(url);

  if (boardSlug && jobId) {
    try {
      const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardSlug}/jobs/${jobId}?content=true`;
      const response = await axios.get(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalTechCareersBot/1.0)' },
        timeout: 10000,
      });
      const job = response.data;
      return {
        title: job.title,
        company: job.company?.name || boardSlug,
        location: job.location?.name || 'Not specified',
        description: cleanDescriptionText(job.content || ''),
        applyUrl: job.absolute_url || url,
        postedDate: job.updated_at || new Date().toISOString(),
        source: 'greenhouse',
        externalId: `gh_${boardSlug}_${jobId}`,
      };
    } catch {
    }
  }

  if (boardSlug) {
    try {
      const listUrl = `https://boards-api.greenhouse.io/v1/boards/${boardSlug}/jobs?content=true`;
      const response = await axios.get(listUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalTechCareersBot/1.0)' },
        timeout: 10000,
      });
      const matchingJob = response.data.jobs?.find((j: any) =>
        url.includes(String(j.id)) || url.includes(j.absolute_url)
      );
      if (matchingJob) {
        return {
          title: matchingJob.title,
          company: boardSlug,
          location: matchingJob.location?.name || 'Not specified',
          description: cleanDescriptionText(matchingJob.content || ''),
          applyUrl: matchingJob.absolute_url || url,
          postedDate: matchingJob.updated_at || new Date().toISOString(),
          source: 'greenhouse',
          externalId: `gh_${boardSlug}_${matchingJob.id}`,
        };
      }
    } catch {
    }
  }
  return null;
}

async function tryLeverAPI(url: string): Promise<ScrapedJob | null> {
  const match = url.match(/jobs\.lever\.co\/([^/]+)\/([a-f0-9-]+)/i);
  if (!match) return null;

  const [, companySlug, jobId] = match;
  try {
    const apiUrl = `https://api.lever.co/v0/postings/${companySlug}/${jobId}`;
    const response = await axios.get(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalTechCareersBot/1.0)' },
      timeout: 10000,
    });
    const job = response.data;
    return {
      title: job.text,
      company: companySlug,
      location: job.categories?.location || 'Not specified',
      description: cleanDescriptionText(job.descriptionPlain || job.description || ''),
      applyUrl: job.hostedUrl || url,
      postedDate: new Date(job.createdAt).toISOString(),
      source: 'lever',
      externalId: `lever_${jobId}`,
    };
  } catch {
    return null;
  }
}

async function tryAshbyAPI(url: string): Promise<ScrapedJob | null> {
  const match = url.match(/jobs\.ashbyhq\.com\/([^/]+)\/([a-f0-9-]+)/i);
  if (!match) return null;

  const [, companySlug, jobId] = match;
  try {
    const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${companySlug}`;
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LegalTechCareersBot/1.0)',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    const matchingJob = (response.data.jobs || []).find((j: any) => j.id === jobId);
    if (matchingJob) {
      return {
        title: matchingJob.title,
        company: companySlug,
        location: matchingJob.location?.name || matchingJob.locationName || 'Not specified',
        description: cleanDescriptionText(matchingJob.descriptionHtml || matchingJob.descriptionPlain || ''),
        applyUrl: matchingJob.applicationUrl || matchingJob.jobUrl || url,
        postedDate: matchingJob.publishedDate || new Date().toISOString(),
        source: 'ashby',
        externalId: `ashby_${jobId}`,
      };
    }
  } catch {
  }
  return null;
}

async function tryWorkdayExtract(url: string): Promise<ScrapedJob | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 25000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);

    let title = $('[data-automation-id="jobPostingHeader"] h2').text().trim()
      || $('h2[data-automation-id*="title"]').text().trim()
      || $('h1.css-1oqwq4a, h1[data-automation-id="jobPostingHeader"]').text().trim()
      || $('h2.css-1oqwq4a').text().trim()
      || $('[class*="JobTitle"], [class*="job-title"]').first().text().trim()
      || $('h1, h2').first().text().trim();

    let company = $('[data-automation-id="jobPostingCompanyName"]').text().trim()
      || $('meta[property="og:site_name"]').attr('content')?.trim()
      || '';

    if (!company) {
      const wdMatch = url.match(/(?:myworkdayjobs\.com|wd\d+\.myworkdayjobs\.com)\/(?:en-US\/)?([^/]+)/i);
      if (wdMatch) company = wdMatch[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    let location = $('[data-automation-id="jobPostingLocation"]').text().trim()
      || $('[data-automation-id="locations"] .css-129m7dg').text().trim()
      || $('[class*="location"]').first().text().trim()
      || '';

    $('script, style, nav, footer, header, iframe, noscript, [class*="cookie"], [class*="banner"]').remove();
    let descEl = $('[data-automation-id="jobPostingDescription"]').first();
    if (!descEl.length) descEl = $('[class*="jobDescription"], [class*="job-description"]').first();
    if (!descEl.length) descEl = $('[role="main"], main, article').first();

    const description = descEl.length ? cleanDescriptionText(descEl.html() || '') : '';

    if (!title || title.length < 3) return null;

    return {
      title: title.substring(0, 255),
      company: company || 'Unknown Company',
      location: location || 'Not specified',
      description,
      applyUrl: url,
      postedDate: new Date().toISOString(),
      source: 'workday',
      externalId: `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
  } catch (error: any) {
    console.error(`[Workday] Extraction failed for ${url}:`, error.message);
    return null;
  }
}

async function tryBambooHRExtract(url: string): Promise<ScrapedJob | null> {
  try {
    const match = url.match(/([^/]+)\.bamboohr\.com\/(?:careers|jobs)\/view\.php\?id=(\d+)/i)
      || url.match(/([^/]+)\.bamboohr\.com\/(?:careers|jobs)\/(\d+)/i);

    if (match) {
      const [, companySlug, jobId] = match;
      try {
        const apiUrl = `https://api.bamboohr.com/api/gateway.php/${companySlug}/v1/applicant_tracking/jobs/${jobId}`;
        const response = await axios.get(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LegalTechCareersBot/1.0)',
            'Accept': 'application/json',
          },
          timeout: 10000,
        });
        const job = response.data;
        if (job.title) {
          return {
            title: job.title,
            company: job.company?.name || companySlug.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            location: [job.location?.city, job.location?.state, job.location?.country].filter(Boolean).join(', ') || 'Not specified',
            description: cleanDescriptionText(job.description || ''),
            applyUrl: url,
            postedDate: job.dateCreated || new Date().toISOString(),
            source: 'bamboohr',
            externalId: `bhr_${companySlug}_${jobId}`,
          };
        }
      } catch {
      }
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);
    const title = $('h2.ResAts__TextHeader, .ResAts__TextHeader').text().trim()
      || $('[class*="JobTitle"], [class*="job-title"], h1, h2').first().text().trim();
    const company = $('meta[property="og:site_name"]').attr('content')?.trim()
      || $('[class*="CompanyName"], [class*="company-name"]').first().text().trim()
      || '';
    const location = $('[class*="location"], .ResAts__JobOpening--location').text().trim() || '';

    $('script, style, nav, footer, header, iframe, noscript').remove();
    let descEl = $('[class*="jobDescription"], [class*="job-description"], .ResAts__JobOpening--description').first();
    if (!descEl.length) descEl = $('main, article, [role="main"]').first();
    const description = descEl.length ? cleanDescriptionText(descEl.html() || '') : '';

    if (!title || title.length < 3) return null;

    return {
      title: title.substring(0, 255),
      company: company || 'Unknown Company',
      location: location || 'Not specified',
      description,
      applyUrl: url,
      postedDate: new Date().toISOString(),
      source: 'bamboohr',
      externalId: `bhr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
  } catch (error: any) {
    console.error(`[BambooHR] Extraction failed for ${url}:`, error.message);
    return null;
  }
}

async function trySmartRecruitersExtract(url: string): Promise<ScrapedJob | null> {
  const match = url.match(/jobs\.smartrecruiters\.com\/([^/]+)\/([a-f0-9-]+)/i);
  if (!match) return null;

  const [, companySlug, jobId] = match;
  try {
    const apiUrl = `https://api.smartrecruiters.com/v1/companies/${companySlug}/postings/${jobId}`;
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LegalTechCareersBot/1.0)',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    const job = response.data;
    const sections = (job.jobAd?.sections || {});
    const descParts = [
      sections.jobDescription?.text || '',
      sections.qualifications?.text || '',
      sections.additionalInformation?.text || '',
    ].filter(Boolean);

    return {
      title: job.name || job.title || '',
      company: job.company?.name || companySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      location: [job.location?.city, job.location?.region, job.location?.country].filter(Boolean).join(', ') || 'Not specified',
      description: cleanDescriptionText(descParts.join('\n\n')),
      applyUrl: job.applyUrl || url,
      postedDate: job.releasedDate || new Date().toISOString(),
      source: 'smartrecruiters',
      externalId: `sr_${companySlug}_${jobId}`,
    };
  } catch {
    return null;
  }
}

export interface ExtractionTrace {
  platform: string;
  platformLabel: string;
  steps: { method: string; status: 'success' | 'failed' | 'skipped'; detail: string }[];
  extractionMethod: string;
  confidence: 'high' | 'medium' | 'low';
  fieldsExtracted: string[];
  fieldsMissing: string[];
  processingTimeMs: number;
}

export async function scrapeSingleJobUrl(url: string, withTrace?: boolean): Promise<(InsertJob & { _trace?: ExtractionTrace }) | null> {
  const startTime = Date.now();
  const trace: ExtractionTrace = {
    platform: 'generic',
    platformLabel: 'Unknown',
    steps: [],
    extractionMethod: 'none',
    confidence: 'low',
    fieldsExtracted: [],
    fieldsMissing: [],
    processingTimeMs: 0,
  };

  const platformLabels: Record<string, string> = {
    greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', workday: 'Workday',
    smartrecruiters: 'SmartRecruiters', icims: 'iCIMS', bamboohr: 'BambooHR',
    rippling: 'Rippling', jazzhr: 'JazzHR', recruitee: 'Recruitee', breezy: 'Breezy HR',
    linkedin: 'LinkedIn', indeed: 'Indeed', applytojob: 'ApplyToJob', jobvite: 'Jobvite',
    dover: 'Dover', personio: 'Personio', generic: 'Generic Website',
  };

  try {
    let platform = detectATSPlatform(url);
    let effectiveUrl = url;
    trace.platform = platform;
    trace.platformLabel = platformLabels[platform] || platform;
    console.log(`[Smart Scraper] Detected platform: ${platform} for ${url}`);
    trace.steps.push({ method: 'Platform Detection', status: 'success', detail: `Identified as ${trace.platformLabel}` });

    let scrapedJob: ScrapedJob | null = null;

    const atsHandlers: Record<string, { fn: (u: string) => Promise<ScrapedJob | null>; label: string }> = {
      greenhouse: { fn: tryGreenhouseAPI, label: 'Greenhouse API' },
      lever: { fn: tryLeverAPI, label: 'Lever API' },
      ashby: { fn: tryAshbyAPI, label: 'Ashby API' },
      workday: { fn: tryWorkdayExtract, label: 'Workday Extractor' },
      bamboohr: { fn: tryBambooHRExtract, label: 'BambooHR Extractor' },
      smartrecruiters: { fn: trySmartRecruitersExtract, label: 'SmartRecruiters API' },
      recruitee: { fn: tryRecruiteeExtract, label: 'Recruitee API' },
      breezy: { fn: tryBreezyExtract, label: 'Breezy HR Extractor' },
      jazzhr: { fn: tryJazzHRExtract, label: 'JazzHR Extractor' },
      rippling: { fn: tryRipplingExtract, label: 'Rippling Extractor' },
    };

    const handler = atsHandlers[platform];
    if (handler) {
      scrapedJob = await handler.fn(effectiveUrl);
      trace.steps.push({ method: handler.label, status: scrapedJob ? 'success' : 'failed', detail: scrapedJob ? `Found: ${scrapedJob.title}` : `${handler.label} failed, falling back` });
      if (scrapedJob) trace.extractionMethod = `${handler.label} (direct)`;
    } else {
      trace.steps.push({ method: 'Platform API', status: 'skipped', detail: `No dedicated API handler for ${trace.platformLabel}` });
    }

    if (!scrapedJob) {
      const response = await axios.get(effectiveUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 20000,
        maxRedirects: 5,
      });
      trace.steps.push({ method: 'Page Fetch', status: 'success', detail: `Downloaded ${(response.data?.length || 0).toLocaleString()} bytes` });

      const rawHtml = response.data;
      const $ = cheerio.load(rawHtml);

      if (platform === 'generic' && !scrapedJob) {
        const embedded = detectEmbeddedATS(rawHtml, effectiveUrl);
        if (embedded) {
          console.log(`[Smart Scraper] Found embedded ${embedded.platform} ATS in page: ${embedded.url}`);
          trace.steps.push({ method: 'Embedded ATS Detection', status: 'success', detail: `Found ${platformLabels[embedded.platform] || embedded.platform} embed → ${embedded.url}` });
          platform = embedded.platform;
          trace.platform = platform;
          trace.platformLabel = platformLabels[platform] || platform;

          const embeddedHandler = atsHandlers[platform];
          if (embeddedHandler) {
            scrapedJob = await embeddedHandler.fn(embedded.url);
            if (scrapedJob) {
              trace.steps.push({ method: `${embeddedHandler.label} (via embed)`, status: 'success', detail: `Found: ${scrapedJob.title}` });
              trace.extractionMethod = `${embeddedHandler.label} (discovered via embed)`;
            }
          }
        } else {
          trace.steps.push({ method: 'Embedded ATS Detection', status: 'skipped', detail: 'No embedded ATS found in page HTML' });
        }
      }

      if (!scrapedJob && platform === 'generic') {
        const isListing = isJobListingPage(effectiveUrl, $);
        if (isListing) {
          const discoveredLinks = discoverJobLinksFromPage($, effectiveUrl);
          if (discoveredLinks.length > 0) {
            console.log(`[Smart Scraper] Detected listing page with ${discoveredLinks.length} job links`);
            trace.steps.push({ method: 'Job Link Discovery', status: 'success', detail: `Found ${discoveredLinks.length} job links on listing page. Will try first link.` });

            const firstLink = discoveredLinks[0];
            const firstPlatform = detectATSPlatform(firstLink);
            const firstHandler = atsHandlers[firstPlatform];
            if (firstHandler) {
              scrapedJob = await firstHandler.fn(firstLink);
              if (scrapedJob) {
                trace.extractionMethod = `${firstHandler.label} (discovered from listing page)`;
                trace.steps.push({ method: `${firstHandler.label} (discovered)`, status: 'success', detail: `Found: ${scrapedJob.title} via ${firstLink}` });
              }
            }

            if (!scrapedJob) {
              try {
                const linkResp = await axios.get(firstLink, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'Accept': 'text/html' },
                  timeout: 15000, maxRedirects: 5,
                });
                const $link = cheerio.load(linkResp.data);
                const basicResult = smartExtractFromHTML($link, firstPlatform);
                scrapedJob = await scrapeWithAIFallback(firstLink, linkResp.data, basicResult);
                if (scrapedJob) {
                  trace.extractionMethod = 'Smart Extraction (discovered from listing)';
                  trace.steps.push({ method: 'Listing Link Follow', status: 'success', detail: `Extracted: ${scrapedJob.title}` });
                }
              } catch { }
            }
          }
        }
      }

      if (!scrapedJob) {
        const ldJsonScripts = $('script[type="application/ld+json"]');
        let ldJob: any = null;
        ldJsonScripts.each((_, el) => {
          try {
            const json = JSON.parse($(el).html() || '');
            const items = Array.isArray(json) ? json : [json];
            for (const item of items) {
              if (item['@type'] === 'JobPosting') {
                ldJob = item;
                break;
              }
              if (item['@graph']) {
                const posting = item['@graph'].find((g: any) => g['@type'] === 'JobPosting');
                if (posting) { ldJob = posting; break; }
              }
            }
          } catch { }
        });

        if (ldJob) {
          console.log(`[Smart Scraper] Found JSON-LD JobPosting data`);
          const ldTitle = ldJob.title || ldJob.name || '';
          const ldCompany = ldJob.hiringOrganization?.name || '';
          let ldLocation = '';
          if (ldJob.jobLocation) {
            const loc = Array.isArray(ldJob.jobLocation) ? ldJob.jobLocation[0] : ldJob.jobLocation;
            ldLocation = loc?.address?.addressLocality
              ? `${loc.address.addressLocality}${loc.address.addressRegion ? ', ' + loc.address.addressRegion : ''}${loc.address.addressCountry ? ', ' + loc.address.addressCountry : ''}`
              : loc?.name || '';
          }
          if (!ldLocation && ldJob.jobLocationType === 'TELECOMMUTE') ldLocation = 'Remote';
          const ldDesc = cleanDescriptionText(ldJob.description || '');

          let ldSalaryMin: number | undefined;
          let ldSalaryMax: number | undefined;
          if (ldJob.baseSalary?.value) {
            const sv = ldJob.baseSalary.value;
            ldSalaryMin = sv.minValue || sv.value;
            ldSalaryMax = sv.maxValue || sv.value;
            if (ldJob.baseSalary.value.unitText === 'HOUR' && ldSalaryMin) { ldSalaryMin *= 2080; ldSalaryMax = ldSalaryMax ? ldSalaryMax * 2080 : undefined; }
            if (ldJob.baseSalary.value.unitText === 'MONTH' && ldSalaryMin) { ldSalaryMin *= 12; ldSalaryMax = ldSalaryMax ? ldSalaryMax * 12 : undefined; }
          }

          const ldLocType = ldJob.jobLocationType === 'TELECOMMUTE' ? 'remote' as const
            : ldJob.applicantLocationRequirements ? 'remote' as const : undefined;

          if (ldTitle && ldDesc.length > 50) {
            scrapedJob = {
              title: ldTitle.substring(0, 255),
              company: ldCompany || 'Unknown Company',
              location: ldLocation || 'Not specified',
              description: ldDesc,
              applyUrl: ldJob.url || url,
              postedDate: ldJob.datePosted || new Date().toISOString(),
              source: platform === 'generic' ? 'structured' : platform,
              externalId: `ld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              salaryMin: ldSalaryMin,
              salaryMax: ldSalaryMax,
              locationType: ldLocType,
            };
            trace.steps.push({ method: 'JSON-LD Structured Data', status: 'success', detail: `Found JobPosting schema: "${ldTitle}"` });
            trace.extractionMethod = 'JSON-LD Structured Data (schema.org)';
          } else {
            trace.steps.push({ method: 'JSON-LD Structured Data', status: 'failed', detail: ldTitle ? `Title found but description too short (${ldDesc.length} chars)` : 'No title in JSON-LD data' });
          }
        } else {
          trace.steps.push({ method: 'JSON-LD Structured Data', status: 'failed', detail: 'No JobPosting schema found on page' });
        }
      }

      if (!scrapedJob) {
        const basicResult = smartExtractFromHTML($, platform);
        const hasGoodBasic = basicResult.title && basicResult.title.length > 3 && basicResult.description && basicResult.description.length > 100;
        trace.steps.push({ method: 'HTML Selectors', status: hasGoodBasic ? 'success' : 'failed', detail: hasGoodBasic ? `Extracted title: "${basicResult.title}" (${basicResult.description?.length || 0} char desc)` : `Insufficient: title="${basicResult.title || 'none'}", desc=${basicResult.description?.length || 0} chars` });

        scrapedJob = await scrapeWithAIFallback(url, rawHtml, basicResult);
        if (scrapedJob && !hasGoodBasic) {
          trace.steps.push({ method: 'AI Analysis (OpenAI)', status: 'success', detail: `AI extracted: "${scrapedJob.title}" at ${scrapedJob.company}` });
          trace.extractionMethod = 'AI-Powered Analysis (GPT-4o-mini)';
        } else if (scrapedJob && hasGoodBasic) {
          trace.extractionMethod = 'Smart HTML Extraction (selectors)';
        } else {
          trace.steps.push({ method: 'AI Analysis (OpenAI)', status: 'failed', detail: 'AI could not extract job data from page content' });
        }
      }
    }

    if (!scrapedJob) {
      console.log(`[Smart Scraper] Could not extract job data from ${url}`);
      trace.confidence = 'low';
      trace.processingTimeMs = Date.now() - startTime;
      if (withTrace) {
        return null;
      }
      return null;
    }

    if (scrapedJob.description) {
      scrapedJob.description = cleanDescriptionText(scrapedJob.description);
    }
    if (!scrapedJob.description || scrapedJob.description.length < 20) {
      scrapedJob.description = `${scrapedJob.title} position at ${scrapedJob.company}. Location: ${scrapedJob.location || 'Not specified'}.`;
    }

    scrapedJob.company = cleanCompanyName(scrapedJob.company);

    let categorization: JobCategorizationResult | undefined;
    try {
      categorization = await categorizeJob(scrapedJob.title, scrapedJob.description, scrapedJob.company);
      trace.steps.push({ method: 'AI Categorization', status: 'success', detail: `Category: ${categorization?.category || 'N/A'}, Seniority: ${categorization?.seniorityLevel || 'N/A'}` });
    } catch (error) {
      console.error('[Smart Scraper] Categorization failed:', error);
      trace.steps.push({ method: 'AI Categorization', status: 'failed', detail: 'Categorization error - using defaults' });
    }

    const result = transformToJobSchema(scrapedJob, categorization);

    const allFields = ['title', 'company', 'location', 'description', 'applyUrl', 'roleCategory', 'seniorityLevel', 'keySkills', 'salaryMin', 'aiSummary'];
    trace.fieldsExtracted = allFields.filter(f => {
      const val = (result as any)[f];
      return val && val !== 'Not specified' && val !== 'Unknown Company' && val !== '#';
    });
    trace.fieldsMissing = allFields.filter(f => !trace.fieldsExtracted.includes(f));

    const extractedRatio = trace.fieldsExtracted.length / allFields.length;
    trace.confidence = extractedRatio >= 0.7 ? 'high' : extractedRatio >= 0.4 ? 'medium' : 'low';
    trace.processingTimeMs = Date.now() - startTime;

    if (withTrace) {
      return { ...result, _trace: trace };
    }
    return result;
  } catch (error: any) {
    console.error(`[Smart Scraper] Error scraping ${url}:`, error.message);
    trace.steps.push({ method: 'Fatal Error', status: 'failed', detail: error.message });
    trace.processingTimeMs = Date.now() - startTime;
    return null;
  }
}

export async function scrapeBulkUrls(
  urls: string[],
  onProgress?: (current: number, total: number, url: string, status: 'success' | 'failed') => void
): Promise<{ results: { url: string; job: InsertJob | null; error?: string }[]; summary: { total: number; success: number; failed: number } }> {
  const results: { url: string; job: InsertJob | null; error?: string }[] = [];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    if (!url) continue;
    try {
      new URL(url);
    } catch {
      results.push({ url, job: null, error: 'Invalid URL format' });
      failed++;
      onProgress?.(i + 1, urls.length, url, 'failed');
      continue;
    }
    try {
      const job = await scrapeSingleJobUrl(url);
      if (job) {
        results.push({ url, job });
        success++;
        onProgress?.(i + 1, urls.length, url, 'success');
      } else {
        results.push({ url, job: null, error: 'Could not extract job details' });
        failed++;
        onProgress?.(i + 1, urls.length, url, 'failed');
      }
    } catch (error: any) {
      results.push({ url, job: null, error: error.message });
      failed++;
      onProgress?.(i + 1, urls.length, url, 'failed');
    }

    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { results, summary: { total: urls.length, success, failed } };
}

export async function discoverJobLinksFromUrl(pageUrl: string): Promise<{ links: string[]; isListing: boolean; embeddedATS?: { platform: string; url: string } }> {
  try {
    const response = await axios.get(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      timeout: 15000,
      maxRedirects: 5,
    });
    const $ = cheerio.load(response.data);
    const isListing = isJobListingPage(pageUrl, $);
    const links = isListing ? discoverJobLinksFromPage($, pageUrl) : [];
    const embedded = detectEmbeddedATS(response.data, pageUrl);
    return { links, isListing, embeddedATS: embedded ? { platform: embedded.platform, url: embedded.url } : undefined };
  } catch {
    return { links: [], isListing: false };
  }
}

export async function validateJobUrl(url: string): Promise<{ valid: boolean; statusCode?: number; error?: string }> {
  try {
    const response = await axios.head(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalAICareersBot/1.0)' },
      timeout: 10000,
      maxRedirects: 5,
    });
    return { valid: response.status >= 200 && response.status < 400, statusCode: response.status };
  } catch (error: any) {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalAICareersBot/1.0)' },
        timeout: 10000,
        maxRedirects: 5,
      });
      return { valid: response.status >= 200 && response.status < 400, statusCode: response.status };
    } catch (getError: any) {
      return { 
        valid: false, 
        statusCode: getError.response?.status,
        error: getError.message 
      };
    }
  }
}
