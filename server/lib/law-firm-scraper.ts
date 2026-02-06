import axios from 'axios';
import * as cheerio from 'cheerio';
import { LAW_FIRMS_AND_COMPANIES, type LawFirmConfig } from './law-firms-list';
import type { InsertJob } from '@shared/schema';
import { categorizeJob, parseSalaryFromText, type JobCategorizationResult } from './job-categorizer';

interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  postedDate: string;
  source: string;
  externalId: string;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    
    const jobs: ScrapedJob[] = response.data.jobs.map((job: any) => ({
      title: job.title,
      company: companyName,
      location: job.location?.name || 'Not specified',
      description: job.content || '',
      applyUrl: job.absolute_url,
      postedDate: job.updated_at || new Date().toISOString(),
      source: 'greenhouse',
      externalId: `gh_${companyId}_${job.id}`,
    }));
    
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
    
    const jobs: ScrapedJob[] = response.data.map((job: any) => ({
      title: job.text,
      company: companyName,
      location: job.categories?.location || 'Not specified',
      description: job.description || '',
      applyUrl: job.hostedUrl,
      postedDate: new Date(job.createdAt).toISOString(),
      source: 'lever',
      externalId: `lever_${job.id}`,
    }));
    
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
    
    const jobs: ScrapedJob[] = (response.data.jobs || []).map((job: any) => ({
      title: job.title,
      company: companyName,
      location: job.location?.name || job.locationName || 'Not specified',
      description: job.descriptionPlain || job.descriptionHtml || '',
      applyUrl: job.applicationUrl || job.jobUrl || '',
      postedDate: job.publishedDate || new Date().toISOString(),
      source: 'ashby',
      externalId: `ashby_${job.id}`,
    }));
    
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
  return text.trim();
}

function cleanCompanyName(name: string): string {
  return name
    .replace(/\s*\(formerly\s+[^)]+\)/gi, '')
    .replace(/\s*\(fka\s+[^)]+\)/gi, '')
    .replace(/\s*\(prev(?:iously)?\s+[^)]+\)/gi, '')
    .trim();
}

export function transformToJobSchema(job: ScrapedJob, categorization?: JobCategorizationResult): InsertJob {
  const companyClean = cleanCompanyName(job.company);
  const companySlug = companyClean.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  
  const cleanDescription = cleanDescriptionText(job.description || '') || `${job.title} position at ${companyClean}`;
  
  const locationText = job.location?.trim() || 'Not specified';
  const fullText = `${job.title} ${cleanDescription} ${locationText}`.toLowerCase();
  const negativeRemote = /\bnot remote\b|\bon[- ]?site only\b|\bin[- ]?office only\b|\bno remote\b/.test(fullText);
  const hasRemoteSignal = /\bremote\b/.test(fullText) || /\bwork from home\b/.test(fullText) || /\bhybrid\b/.test(fullText) || /\bwfh\b/.test(fullText);
  const isRemoteDetected = !negativeRemote && (hasRemoteSignal || categorization?.isRemote === true);

  let salaryMin = categorization?.salaryMin || null;
  let salaryMax = categorization?.salaryMax || null;
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

type ATSPlatform = 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'smartrecruiters' | 'icims' | 'bamboohr' | 'rippling' | 'jazzhr' | 'recruitee' | 'breezy' | 'linkedin' | 'indeed' | 'myworkdayjobs' | 'generic';

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

  return 'generic';
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
  "isRemote": true/false,
  "salaryMin": number or null,
  "salaryMax": number or null
}
Rules:
- Extract the REAL job title (not the page title or company tagline)
- If multiple jobs appear, extract only the primary/most prominent one
- For salary, convert to annual USD. Handle hourly ($X/hr * 2080), monthly (*12), and "$XK" formats
- Clean the description: keep responsibilities, requirements, qualifications, benefits. Remove boilerplate.`,
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

    return {
      title: (aiTitle || 'Untitled Position').substring(0, 255),
      company: (parsed.company || basicResult.company || 'Unknown Company').substring(0, 255),
      location: parsed.location || basicResult.location || 'Not specified',
      description: parsed.description || basicResult.description || `${aiTitle} position`,
      applyUrl: url,
      postedDate: new Date().toISOString(),
      source: 'ai_extracted',
      externalId: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

export async function scrapeSingleJobUrl(url: string): Promise<InsertJob | null> {
  try {
    const platform = detectATSPlatform(url);
    console.log(`[Smart Scraper] Detected platform: ${platform} for ${url}`);
    let scrapedJob: ScrapedJob | null = null;

    if (platform === 'greenhouse') {
      scrapedJob = await tryGreenhouseAPI(url);
    } else if (platform === 'lever') {
      scrapedJob = await tryLeverAPI(url);
    } else if (platform === 'ashby') {
      scrapedJob = await tryAshbyAPI(url);
    }

    if (!scrapedJob) {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 20000,
        maxRedirects: 5,
      });

      const rawHtml = response.data;
      const $ = cheerio.load(rawHtml);

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
          }
        } catch {
        }
      });

      if (ldJob) {
        console.log(`[Smart Scraper] Found JSON-LD JobPosting data`);
        const ldTitle = ldJob.title || ldJob.name || '';
        const ldCompany = ldJob.hiringOrganization?.name || '';
        const ldLocation = ldJob.jobLocation?.address?.addressLocality
          ? `${ldJob.jobLocation.address.addressLocality}${ldJob.jobLocation.address.addressRegion ? ', ' + ldJob.jobLocation.address.addressRegion : ''}${ldJob.jobLocation.address.addressCountry ? ', ' + ldJob.jobLocation.address.addressCountry : ''}`
          : ldJob.jobLocationType === 'TELECOMMUTE' ? 'Remote' : '';
        const ldDesc = cleanDescriptionText(ldJob.description || '');

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
          };
        }
      }

      if (!scrapedJob) {
        const basicResult = smartExtractFromHTML($, platform);
        scrapedJob = await scrapeWithAIFallback(url, rawHtml, basicResult);
      }
    }

    if (!scrapedJob) {
      console.log(`[Smart Scraper] Could not extract job data from ${url}`);
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
    } catch (error) {
      console.error('[Smart Scraper] Categorization failed:', error);
    }

    return transformToJobSchema(scrapedJob, categorization);
  } catch (error: any) {
    console.error(`[Smart Scraper] Error scraping ${url}:`, error.message);
    return null;
  }
}

// Validate if a URL is accessible
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
