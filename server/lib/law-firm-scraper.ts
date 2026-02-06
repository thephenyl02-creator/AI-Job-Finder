import axios from 'axios';
import * as cheerio from 'cheerio';
import { LAW_FIRMS_AND_COMPANIES, type LawFirmConfig } from './law-firms-list';
import type { InsertJob } from '@shared/schema';
import { categorizeJob, type JobCategorizationResult } from './job-categorizer';

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

export function transformToJobSchema(job: ScrapedJob, categorization?: JobCategorizationResult): InsertJob {
  const companySlug = job.company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  
  const cleanDescription = (job.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || `${job.title} position at ${job.company}`;
  
  return {
    title: job.title.trim(),
    company: job.company.trim(),
    companyLogo: `https://logo.clearbit.com/${companySlug}.com`,
    location: job.location?.trim() || 'Not specified',
    isRemote: job.location?.toLowerCase().includes('remote') || false,
    salaryMin: null,
    salaryMax: null,
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

// Scrape a single job URL
export async function scrapeSingleJobUrl(url: string): Promise<InsertJob | null> {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    
    let scrapedJob: ScrapedJob | null = null;
    
    // Detect ATS platform from URL
    if (hostname.includes('greenhouse.io') || hostname.includes('boards.greenhouse.io')) {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalAICareersBot/1.0)' },
        timeout: 15000,
      });
      const $ = cheerio.load(response.data);
      
      const title = $('h1').first().text().trim() || $('[class*="title"]').first().text().trim();
      const company = $('.company-name').text().trim() || $('[class*="company"]').first().text().trim() || 'Unknown Company';
      const location = $('#location, .location, [class*="location"]').first().text().trim() || 'Not specified';
      const description = $('#content, .content, [class*="description"]').text().trim();
      
      if (title) {
        scrapedJob = {
          title,
          company,
          location,
          description,
          applyUrl: url,
          postedDate: new Date().toISOString(),
          source: 'greenhouse',
          externalId: `gh_custom_${Date.now()}`,
        };
      }
    } else if (hostname.includes('lever.co')) {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalAICareersBot/1.0)' },
        timeout: 15000,
      });
      const $ = cheerio.load(response.data);
      
      const title = $('h2').first().text().trim() || $('.posting-headline h2').text().trim();
      const company = $('.company-name').text().trim() || $('[class*="company"]').first().text().trim() || 'Unknown Company';
      const location = $('.location, .posting-categories .sort-by-time').first().text().trim() || 'Not specified';
      const description = $('[class*="description"], .posting-page-body').text().trim();
      
      if (title) {
        scrapedJob = {
          title,
          company,
          location,
          description,
          applyUrl: url,
          postedDate: new Date().toISOString(),
          source: 'lever',
          externalId: `lever_custom_${Date.now()}`,
        };
      }
    } else if (hostname.includes('ashby')) {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalAICareersBot/1.0)' },
        timeout: 15000,
      });
      const $ = cheerio.load(response.data);
      
      const title = $('h1').first().text().trim();
      const company = $('[class*="company"]').first().text().trim() || 'Unknown Company';
      const location = $('[class*="location"]').first().text().trim() || 'Not specified';
      const description = $('[class*="description"]').text().trim();
      
      if (title) {
        scrapedJob = {
          title,
          company,
          location,
          description,
          applyUrl: url,
          postedDate: new Date().toISOString(),
          source: 'ashby',
          externalId: `ashby_custom_${Date.now()}`,
        };
      }
    } else {
      const response = await axios.get(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 15000,
      });
      const $ = cheerio.load(response.data);
      
      const title = $('h1').first().text().trim() || $('title').text().trim();
      const company = $('[class*="company"]').first().text().trim() || 
                      $('meta[property="og:site_name"]').attr('content') || 
                      parsedUrl.hostname.replace('www.', '').split('.')[0];
      const location = $('[class*="location"]').first().text().trim() || 'Not specified';
      const description = $('article, [class*="description"], [class*="content"], main').first().text().trim();
      
      if (title) {
        scrapedJob = {
          title: title.substring(0, 255),
          company: company.substring(0, 100),
          location,
          description,
          applyUrl: url,
          postedDate: new Date().toISOString(),
          source: 'custom',
          externalId: `custom_${Date.now()}`,
        };
      }
    }
    
    if (!scrapedJob) {
      return null;
    }
    
    // Categorize the job
    let categorization: JobCategorizationResult | undefined;
    try {
      categorization = await categorizeJob(scrapedJob.title, scrapedJob.description, scrapedJob.company);
    } catch (error) {
      console.error('Categorization failed for custom URL:', error);
    }
    
    return transformToJobSchema(scrapedJob, categorization);
  } catch (error: any) {
    console.error('Error scraping single URL:', error.message);
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
