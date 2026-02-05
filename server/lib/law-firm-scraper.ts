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
    const url = `https://boards-api.greenhouse.io/v1/boards/${companyId}/jobs`;
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
  const titleLower = title.toLowerCase();
  
  const highPriorityKeywords = [
    'legal ai', 'legal engineer', 'legal technology', 'legaltech',
    'nlp engineer', 'natural language', 'knowledge engineer',
    'legal data scientist', 'ai product manager', 'prompt engineer',
    'ai researcher', 'machine learning', 'legal innovation',
    'practice technology', 'knowledge management', 'litigation technology',
    'ediscovery', 'e-discovery', 'analytics manager',
    'ai counsel', 'automation counsel', 'research technology',
    'solutions engineer', 'legal operations', 'legal ops',
    'legal tech consultant', 'growth', 'partnerships',
    'contract manager', 'contract analyst', 'clm',
  ];
  
  if (highPriorityKeywords.some(keyword => titleLower.includes(keyword))) {
    return true;
  }
  
  const techRoles = [
    'software engineer', 'engineer', 'developer', 'architect',
    'product manager', 'product owner', 'pm',
    'designer', 'ux', 'ui', 'design',
    'data scientist', 'data analyst', 'data engineer',
    'ai', 'ml', 'machine learning', 'artificial intelligence',
    'customer success', 'sales engineer', 'account executive',
    'business development', 'marketing', 'content',
    'implementation', 'integration', 'technical',
    'devops', 'sre', 'platform', 'infrastructure',
    'qa', 'quality', 'test', 'automation',
    'frontend', 'backend', 'fullstack', 'full stack',
    'python', 'javascript', 'react', 'node',
    'innovation', 'transformation', 'digital',
  ];
  
  const excludeKeywords = [
    'paralegal', 'legal secretary', 'receptionist', 'assistant',
    'attorney', 'lawyer', 'counsel', 'associate', 'partner',
    'litigation', 'corporate', 'real estate', 'tax',
    'compliance officer', 'general counsel', 'in-house',
    'administrative', 'office manager', 'hr', 'human resources',
    'accounting', 'finance', 'controller', 'cfo',
  ];
  
  if (excludeKeywords.some(keyword => titleLower.includes(keyword)) && 
      !titleLower.includes('technology') && 
      !titleLower.includes('innovation') &&
      !titleLower.includes('ai') &&
      !titleLower.includes('engineer')) {
    return false;
  }
  
  return techRoles.some(keyword => titleLower.includes(keyword));
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
  
  const cleanDescription = (job.description || `${job.title} position at ${job.company}`)
    .replace(/<[^>]*>/g, '')
    .trim();
  
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
