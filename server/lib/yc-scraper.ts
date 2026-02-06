import axios from 'axios';
import { transformToJobSchema, isLegalTechRole } from './law-firm-scraper';
import { categorizeJob, type JobCategorizationResult } from './job-categorizer';
import { LAW_FIRMS_AND_COMPANIES } from './law-firms-list';
import type { InsertJob } from '@shared/schema';

interface YCCompany {
  id: number;
  name: string;
  slug: string;
  website: string;
  one_liner: string;
  long_description: string;
  team_size: number | null;
  isHiring: boolean;
  status: string;
  batch: string;
  tags: string[];
  industries: string[];
  all_locations: string;
  url: string;
}

interface YCScrapeStats {
  company: string;
  website: string;
  atsType: string;
  found: number;
  relevant: number;
  categorized: number;
  status: 'success' | 'no_ats' | 'no_jobs' | 'error' | 'skipped';
  error?: string;
}

const YC_API_TAGS = [
  'https://yc-oss.github.io/api/tags/legaltech.json',
  'https://yc-oss.github.io/api/tags/legal.json',
  'https://yc-oss.github.io/api/tags/regtech.json',
];

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractDomain(website: string): string {
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    return url.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function generateSlugs(company: YCCompany): string[] {
  const domain = extractDomain(company.website);
  const domainBase = domain.split('.')[0];

  const nameNoSpaces = company.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameDashed = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const nameWords = company.name.toLowerCase().split(/\s+/);
  const firstWord = nameWords[0]?.replace(/[^a-z0-9]/g, '') || '';

  const slugs = new Set([
    domainBase,
    nameNoSpaces,
    nameDashed,
    company.slug,
    firstWord,
  ]);

  slugs.delete('');
  return Array.from(slugs);
}

async function tryGreenhouseForCompany(slugs: string[]): Promise<{ jobs: any[]; slug: string } | null> {
  for (const slug of slugs) {
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalTechCareersBot/1.0)' },
        timeout: 5000,
      });
      if (response.data?.jobs?.length > 0) {
        return { jobs: response.data.jobs, slug };
      }
    } catch {
    }
  }
  return null;
}

async function tryLeverForCompany(slugs: string[]): Promise<{ jobs: any[]; slug: string } | null> {
  for (const slug of slugs) {
    try {
      const url = `https://api.lever.co/v0/postings/${slug}`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalTechCareersBot/1.0)' },
        timeout: 5000,
      });
      if (Array.isArray(response.data) && response.data.length > 0) {
        return { jobs: response.data, slug };
      }
    } catch {
    }
  }
  return null;
}

async function tryAshbyForCompany(slugs: string[]): Promise<{ jobs: any[]; slug: string } | null> {
  for (const slug of slugs) {
    try {
      const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LegalTechCareersBot/1.0)',
          'Accept': 'application/json',
        },
        timeout: 5000,
      });
      if (response.data?.jobs?.length > 0) {
        return { jobs: response.data.jobs, slug };
      }
    } catch {
    }
  }
  return null;
}

function getExistingCompanyNames(): Set<string> {
  return new Set(
    LAW_FIRMS_AND_COMPANIES.map(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );
}

export async function fetchYCLegalTechCompanies(): Promise<YCCompany[]> {
  const allCompanies = new Map<number, YCCompany>();

  for (const tagUrl of YC_API_TAGS) {
    try {
      const response = await axios.get(tagUrl, { timeout: 15000 });
      const companies: YCCompany[] = response.data;
      for (const company of companies) {
        if (!allCompanies.has(company.id)) {
          allCompanies.set(company.id, company);
        }
      }
    } catch (error: any) {
      console.error(`[YC Scraper] Error fetching ${tagUrl}:`, error.message);
    }
  }

  const combined = Array.from(allCompanies.values());
  const active = combined.filter(c => c.status === 'Active');

  console.log(`[YC Scraper] Found ${combined.length} unique companies across tags (${active.length} active)`);
  return active;
}

export async function scrapeYCCompanies(
  onProgress?: (current: number, total: number, company: string, status: string) => void
): Promise<{
  jobs: InsertJob[];
  stats: YCScrapeStats[];
}> {
  const companies = await fetchYCLegalTechCompanies();
  const allJobs: InsertJob[] = [];
  const stats: YCScrapeStats[] = [];
  const existingNames = getExistingCompanyNames();
  const total = companies.length;

  console.log(`[YC Scraper] Starting scrape of ${total} YC legal tech companies...`);

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const companyNameNorm = company.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const companyTags = (company.tags || []).map(t => t.toLowerCase());
    const isCoreLegalTech = companyTags.some(t => ['legaltech', 'legal'].includes(t));

    if (existingNames.has(companyNameNorm)) {
      stats.push({
        company: company.name,
        website: company.website,
        atsType: 'existing',
        found: 0,
        relevant: 0,
        categorized: 0,
        status: 'skipped',
      });
      console.log(`[YC Scraper] [${i + 1}/${total}] Skipping ${company.name} (already in company list)`);
      continue;
    }

    try {
      if (onProgress) {
        onProgress(i + 1, total, company.name, 'discovering');
      }
      console.log(`[YC Scraper] [${i + 1}/${total}] Discovering ATS for ${company.name}...`);

      const slugs = generateSlugs(company);
      let atsType = 'none';
      let scrapedJobs: any[] = [];

      const [greenhouse, lever, ashby] = await Promise.all([
        tryGreenhouseForCompany(slugs),
        tryLeverForCompany(slugs),
        tryAshbyForCompany(slugs),
      ]);

      if (greenhouse) {
        atsType = `greenhouse:${greenhouse.slug}`;
        scrapedJobs = greenhouse.jobs.map((job: any) => ({
          title: job.title,
          company: company.name,
          location: job.location?.name || 'Not specified',
          description: job.content || '',
          applyUrl: job.absolute_url,
          postedDate: job.updated_at || new Date().toISOString(),
          source: 'yc_greenhouse',
          externalId: `yc_gh_${greenhouse.slug}_${job.id}`,
        }));
      } else if (lever) {
        atsType = `lever:${lever.slug}`;
        scrapedJobs = lever.jobs.map((job: any) => ({
          title: job.text,
          company: company.name,
          location: job.categories?.location || 'Not specified',
          description: job.description || '',
          applyUrl: job.hostedUrl,
          postedDate: new Date(job.createdAt).toISOString(),
          source: 'yc_lever',
          externalId: `yc_lever_${job.id}`,
        }));
      } else if (ashby) {
        atsType = `ashby:${ashby.slug}`;
        scrapedJobs = ashby.jobs.map((job: any) => ({
          title: job.title,
          company: company.name,
          location: job.location?.name || job.locationName || 'Not specified',
          description: job.descriptionPlain || job.descriptionHtml || '',
          applyUrl: job.applicationUrl || job.jobUrl || '',
          postedDate: job.publishedDate || new Date().toISOString(),
          source: 'yc_ashby',
          externalId: `yc_ashby_${job.id}`,
        }));
      }

      if (scrapedJobs.length === 0) {
        stats.push({
          company: company.name,
          website: company.website,
          atsType: 'none',
          found: 0,
          relevant: 0,
          categorized: 0,
          status: 'no_ats',
        });
        console.log(`[YC Scraper] No ATS found for ${company.name}`);
        continue;
      }

      const relevantJobs = isCoreLegalTech
        ? scrapedJobs
        : scrapedJobs.filter(job => isLegalTechRole(job.title));

      if (relevantJobs.length === 0) {
        stats.push({
          company: company.name,
          website: company.website,
          atsType,
          found: scrapedJobs.length,
          relevant: 0,
          categorized: 0,
          status: 'no_jobs',
        });
        console.log(`[YC Scraper] ${company.name}: ${scrapedJobs.length} total jobs, 0 relevant`);
        continue;
      }

      if (onProgress) {
        onProgress(i + 1, total, company.name, 'categorizing');
      }

      let categorizedCount = 0;
      for (const job of relevantJobs) {
        try {
          const categorization = await categorizeJob(job.title, job.description, job.company);
          const transformedJob = transformToJobSchema(job, categorization);
          allJobs.push(transformedJob);
          categorizedCount++;
          await delay(300);
        } catch (catError) {
          const transformedJob = transformToJobSchema(job);
          allJobs.push(transformedJob);
        }
      }

      stats.push({
        company: company.name,
        website: company.website,
        atsType,
        found: scrapedJobs.length,
        relevant: relevantJobs.length,
        categorized: categorizedCount,
        status: 'success',
      });

      console.log(`[YC Scraper] ${company.name}: ${scrapedJobs.length} total, ${relevantJobs.length} relevant, ${categorizedCount} categorized (${atsType})`);

      await delay(500);

    } catch (error: any) {
      console.error(`[YC Scraper] Error for ${company.name}:`, error.message);
      stats.push({
        company: company.name,
        website: company.website,
        atsType: 'error',
        found: 0,
        relevant: 0,
        categorized: 0,
        status: 'error',
        error: error.message,
      });
    }
  }

  console.log(`[YC Scraper] Complete. Found ${allJobs.length} total jobs from ${stats.filter(s => s.status === 'success').length} companies.`);
  return { jobs: allJobs, stats };
}
