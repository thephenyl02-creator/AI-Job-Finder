import axios from 'axios';
import * as cheerio from 'cheerio';
import { LAW_FIRMS_AND_COMPANIES, type LawFirmConfig } from './law-firms-list';
import type { InsertJob } from '@shared/schema';
import { categorizeJob, parseSalaryFromText, type JobCategorizationResult } from './job-categorizer';
import { normalizeLocation } from './location-normalizer';
import { logInfo, logWarn, logError } from './logger';

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
  salaryCurrency?: string;
  compensationText?: string;
  locationType?: 'remote' | 'hybrid' | 'onsite';
  department?: string;
  employmentType?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const circuitBreaker = new Map<string, { failures: number; lastFailure: number; open: boolean }>();
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 30 * 60 * 1000;

function isCircuitOpen(key: string): boolean {
  const state = circuitBreaker.get(key);
  if (!state || !state.open) return false;
  if (Date.now() - state.lastFailure > CIRCUIT_BREAKER_RESET_MS) {
    state.open = false;
    state.failures = 0;
    return false;
  }
  return true;
}

function recordFailure(key: string): void {
  const state = circuitBreaker.get(key) || { failures: 0, lastFailure: 0, open: false };
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) state.open = true;
  circuitBreaker.set(key, state);
}

function recordSuccess(key: string): void {
  circuitBreaker.delete(key);
}

async function fetchWithRetry(url: string, options: any = {}, retries = 2): Promise<any> {
  const timeout = options.timeout || 20000;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios({
        ...options,
        url,
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LegalTechCareersBot/1.0)',
          ...options.headers,
        },
      });
      return response;
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 404 || status === 403 || status === 401) {
        throw error;
      }
      if (attempt < retries) {
        const backoff = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 8000);
        await delay(backoff);
        continue;
      }
      throw error;
    }
  }
}

function inferCurrencyFromLocation(location: string): string {
  const loc = (location || '').toLowerCase();
  const gbpSignals = ['uk', 'united kingdom', 'london', 'manchester', 'birmingham', 'edinburgh', 'glasgow', 'bristol', 'leeds', 'cambridge', 'oxford', 'england', 'scotland', 'wales', 'northern ireland'];
  const eurSignals = ['germany', 'france', 'netherlands', 'spain', 'italy', 'ireland', 'belgium', 'austria', 'portugal', 'finland', 'sweden', 'denmark', 'norway', 'berlin', 'munich', 'paris', 'amsterdam', 'dublin', 'madrid', 'stockholm', 'copenhagen', 'oslo', 'vienna', 'brussels', 'zurich', 'emea', 'europe'];
  const audSignals = ['australia', 'sydney', 'melbourne', 'brisbane', 'perth'];
  const cadSignals = ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary'];
  const sgdSignals = ['singapore'];
  const hkdSignals = ['hong kong'];
  const inrSignals = ['india', 'mumbai', 'bangalore', 'delhi', 'hyderabad', 'chennai', 'pune'];

  if (gbpSignals.some(s => loc.includes(s))) return 'GBP';
  if (eurSignals.some(s => loc.includes(s))) return 'EUR';
  if (audSignals.some(s => loc.includes(s))) return 'AUD';
  if (cadSignals.some(s => loc.includes(s))) return 'CAD';
  if (sgdSignals.some(s => loc.includes(s))) return 'SGD';
  if (hkdSignals.some(s => loc.includes(s))) return 'HKD';
  if (inrSignals.some(s => loc.includes(s))) return 'INR';
  return 'USD';
}

function inferRegionFromLocation(location: string): string | null {
  const loc = (location || '').toLowerCase();
  const regionMap: Record<string, string[]> = {
    'North America': ['united states', 'usa', 'us', 'canada', 'mexico', 'new york', 'san francisco', 'los angeles', 'chicago', 'toronto', 'vancouver', 'montreal', 'washington', 'boston', 'seattle', 'austin', 'denver', 'miami', 'houston', 'dallas', 'atlanta', 'philadelphia', 'detroit', 'minneapolis', 'portland', 'calgary', 'ottawa'],
    'Europe': ['united kingdom', 'uk', 'london', 'germany', 'france', 'netherlands', 'spain', 'italy', 'ireland', 'belgium', 'austria', 'switzerland', 'sweden', 'denmark', 'norway', 'finland', 'portugal', 'poland', 'czech', 'hungary', 'romania', 'greece', 'berlin', 'munich', 'paris', 'amsterdam', 'dublin', 'madrid', 'stockholm', 'copenhagen', 'oslo', 'vienna', 'brussels', 'zurich', 'manchester', 'edinburgh', 'birmingham', 'luxembourg', 'lisbon', 'barcelona', 'milan', 'rome', 'hamburg', 'frankfurt', 'prague', 'warsaw', 'budapest', 'england', 'scotland'],
    'Asia-Pacific': ['australia', 'japan', 'singapore', 'hong kong', 'south korea', 'korea', 'india', 'china', 'taiwan', 'philippines', 'indonesia', 'thailand', 'vietnam', 'new zealand', 'malaysia', 'sydney', 'melbourne', 'tokyo', 'mumbai', 'bangalore', 'delhi', 'hyderabad', 'chennai', 'pune', 'shanghai', 'beijing', 'seoul', 'taipei', 'manila', 'jakarta', 'bangkok', 'brisbane', 'perth'],
    'Middle East & Africa': ['uae', 'dubai', 'saudi arabia', 'qatar', 'bahrain', 'oman', 'kuwait', 'israel', 'south africa', 'nigeria', 'kenya', 'egypt', 'abu dhabi', 'riyadh', 'johannesburg', 'cape town', 'nairobi', 'cairo', 'tel aviv'],
    'Latin America': ['brazil', 'argentina', 'colombia', 'chile', 'peru', 'panama', 'costa rica', 'sao paulo', 'rio de janeiro', 'buenos aires', 'bogota', 'santiago', 'lima', 'mexico city'],
  };
  for (const [region, signals] of Object.entries(regionMap)) {
    if (signals.some(s => loc.includes(s))) return region;
  }
  return null;
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

function extractLeverSalary(job: any): { min?: number; max?: number; currency?: string; text?: string } {
  if (job.salaryRange) {
    const range = job.salaryRange;
    let min = range.min || undefined;
    let max = range.max || undefined;
    const currency = range.currency || undefined;

    if (min !== undefined && min > 1000000) min = Math.round(min / 100);
    if (max !== undefined && max > 1000000) max = Math.round(max / 100);

    if (min !== undefined && min < 1000) return {};
    if (max !== undefined && max < 1000) return {};

    return {
      min,
      max,
      currency,
      text: currency
        ? `${currency} ${min?.toLocaleString()} - ${max?.toLocaleString()}`
        : undefined,
    };
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
    const response = await fetchWithRetry(url, { method: 'GET' });
    
    const jobs: ScrapedJob[] = response.data.jobs.map((job: any) => {
      const salary = extractGreenhouseSalary(job);
      const locationType = extractGreenhouseLocationType(job);
      let jobLocation = job.location?.name || '';
      if (!jobLocation && job.offices?.length > 0) {
        jobLocation = job.offices.map((o: any) => o.name).filter(Boolean).join(', ');
      }
      return {
        title: job.title,
        company: companyName,
        location: jobLocation,
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
    logError('GREENHOUSE', `Error scraping ${companyName}`, { error: error.message });
    return [];
  }
}

export async function scrapeLever(leverUrl: string, companyName: string): Promise<ScrapedJob[]> {
  try {
    const apiUrl = leverUrl.replace('jobs.lever.co', 'api.lever.co/v0/postings');
    
    const response = await fetchWithRetry(apiUrl, { method: 'GET' });
    
    const jobs: ScrapedJob[] = response.data.map((job: any) => {
      const salary = extractLeverSalary(job);
      const locationType = extractLeverLocationType(job);
      return {
        title: job.text,
        company: companyName,
        location: job.categories?.location || '',
        description: job.description || '',
        applyUrl: job.hostedUrl,
        postedDate: new Date(job.createdAt).toISOString(),
        source: 'lever',
        externalId: `lever_${job.id}`,
        salaryMin: salary.min,
        salaryMax: salary.max,
        salaryCurrency: salary.currency,
        compensationText: salary.text,
        locationType,
        department: job.categories?.department || undefined,
        employmentType: job.categories?.commitment || undefined,
      };
    });
    
    return jobs;
  } catch (error: any) {
    logError('LEVER', `Error scraping ${companyName}`, { error: error.message });
    return [];
  }
}

export async function scrapeAshby(ashbyUrl: string, companyName: string): Promise<ScrapedJob[]> {
  try {
    const response = await fetchWithRetry(ashbyUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    const jobs: ScrapedJob[] = (response.data.jobs || []).map((job: any) => {
      let locationName = '';
      if (typeof job.location === 'string') {
        locationName = job.location;
      } else if (job.location?.name) {
        locationName = job.location.name;
      } else if (job.locationName) {
        locationName = job.locationName;
      }
      if (!locationName && job.address?.postalAddress) {
        const addr = job.address.postalAddress;
        const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
        locationName = parts.join(', ');
      }
      if (!locationName && job.isRemote) {
        locationName = 'Remote';
      }
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
    logError('ASHBY', `Error scraping ${companyName}`, { error: error.message });
    return [];
  }
}

function normalizeWorkdayConfigs(
  workday: { company: string; instance: string; site: string; label?: string } | { company: string; instance: string; site: string; label?: string }[]
): { company: string; instance: string; site: string; label?: string }[] {
  return Array.isArray(workday) ? workday : [workday];
}

export async function scrapeWorkdayMultiRegion(
  workday: { company: string; instance: string; site: string; label?: string } | { company: string; instance: string; site: string; label?: string }[],
  companyName: string,
  companyType?: string
): Promise<ScrapedJob[]> {
  const configs = normalizeWorkdayConfigs(workday);
  const allJobs: ScrapedJob[] = [];
  for (const config of configs) {
    try {
      const regionLabel = config.label ? ` [${config.label}]` : '';
      logInfo('WORKDAY', `Scraping ${companyName}${regionLabel} (site: ${config.site})`);
      const jobs = await scrapeWorkday(config, companyName, companyType);
      allJobs.push(...jobs);
      if (configs.length > 1) {
        await delay(1000);
      }
    } catch (error: any) {
      const regionLabel = config.label || config.site;
      logWarn('WORKDAY', `Failed to scrape ${companyName} region ${regionLabel}: ${error.message}`);
    }
  }
  const seen = new Set<string>();
  return allJobs.filter(job => {
    const key = `${job.title}|${job.location}|${job.applyUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function scrapeWorkday(
  config: { company: string; instance: string; site: string },
  companyName: string,
  companyType?: string
): Promise<ScrapedJob[]> {
  const baseUrl = `https://${config.company}.${config.instance}.myworkdayjobs.com`;
  const apiUrl = `${baseUrl}/wday/cxs/${config.company}/${config.site}/jobs`;
  const pageSize = 20;
  let offset = 0;
  let total = 0;

  interface ListingData {
    title: string;
    externalPath: string;
    locationsText: string;
    postedOn: string;
    bulletFields: string[];
    locationType: 'remote' | 'hybrid' | 'onsite' | undefined;
    applyUrl: string;
    jobId: string;
  }

  const listings: ListingData[] = [];

  try {
    do {
      const response = await axios.post(
        apiUrl,
        {
          appliedFacets: {},
          limit: pageSize,
          offset,
          searchText: '',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 20000,
        }
      );

      const data = response.data;
      total = data.total || 0;
      const postings = data.jobPostings || [];

      for (const posting of postings) {
        const externalPath = posting.externalPath || '';
        const applyUrl = externalPath ? `${baseUrl}/${config.site}${externalPath}` : '';
        const jobId = externalPath.split('/').pop() || `${offset}_${postings.indexOf(posting)}`;
        let locationText = posting.locationsText || (posting.bulletFields || []).find((f: string) => /,/.test(f)) || '';
        if (!locationText && externalPath) {
          const pathMatch = externalPath.match(/\/job\/([^/]+)\//);
          if (pathMatch) {
            locationText = pathMatch[1].replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
          }
        }
        const locationType = detectLocationType(locationText + ' ' + (posting.title || ''));

        listings.push({
          title: posting.title || '',
          externalPath,
          locationsText: locationText,
          postedOn: posting.postedOn || new Date().toISOString(),
          bulletFields: posting.bulletFields || [],
          locationType,
          applyUrl,
          jobId,
        });
      }

      offset += pageSize;
      if (postings.length > 0) {
        await delay(1000);
      }
    } while (offset < total && offset < 200);

    const relevant = listings.filter(l => isLegalTechRole(l.title, companyType));
    logInfo('WORKDAY', `${companyName}: ${total} total, ${listings.length} listed, ${relevant.length} relevant titles`);

    if (relevant.length === 0) return [];

    const allJobs: ScrapedJob[] = [];
    const BATCH_SIZE = 5;
    for (let i = 0; i < relevant.length; i += BATCH_SIZE) {
      const batch = relevant.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (listing) => {
          let description = listing.title;
          try {
            const detailUrl = `${baseUrl}/wday/cxs/${config.company}/${config.site}${listing.externalPath}`;
            const detailResp = await axios.get(detailUrl, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
              timeout: 15000,
            });
            const detail = detailResp.data;
            if (detail.jobPostingInfo) {
              description = detail.jobPostingInfo.jobDescription
                || detail.jobPostingInfo.externalDescription
                || detail.jobPostingInfo.additionalInformation
                || description;
              if (detail.jobPostingInfo.qualifications && (!description || description.trim() === listing.title)) {
                description = detail.jobPostingInfo.qualifications;
              }
            }
            const descMissing = !description || description.trim().length < 50 || description.trim() === listing.title;
            if (descMissing && detail.structuredDataAttributes) {
              const sda = detail.structuredDataAttributes;
              description = sda.description || sda.jobDescription || description;
            }
          } catch {
          }
          const needsHtmlFallback = !description || description.trim().length < 50 || description.trim() === listing.title;
          if (needsHtmlFallback) {
            try {
              const htmlUrl = listing.applyUrl;
              if (htmlUrl) {
                const htmlResp = await axios.get(htmlUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  },
                  timeout: 15000,
                  maxRedirects: 5,
                });
                const htmlText = typeof htmlResp.data === 'string' ? htmlResp.data : '';
                const ldJsonMatch = htmlText.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
                if (ldJsonMatch) {
                  try {
                    const ldJson = JSON.parse(ldJsonMatch[1]);
                    if (ldJson.description && ldJson.description.length > 50) {
                      description = ldJson.description;
                    }
                  } catch {}
                }
                const stillMissing = !description || description.trim().length < 50 || description.trim() === listing.title;
                if (stillMissing) {
                  const descMatch = htmlText.match(/data-automation-id="jobPostingDescription"[^>]*>([\s\S]*?)<\/div>/i);
                  if (descMatch) {
                    const cleaned = descMatch[1]
                      .replace(/<[^>]+>/g, '\n')
                      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
                      .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
                    if (cleaned.length > 100) {
                      description = cleaned;
                    }
                  }
                }
              }
            } catch {}
          }

          const salary = parseSalaryFromText(description);
          return {
            title: listing.title,
            company: companyName,
            location: listing.locationsText,
            description,
            applyUrl: listing.applyUrl,
            postedDate: listing.postedOn,
            source: 'workday' as const,
            externalId: `wd_${config.company}_${listing.jobId}`,
            salaryMin: salary.min,
            salaryMax: salary.max,
            locationType: listing.locationType,
            department: listing.bulletFields[1] || undefined,
          };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allJobs.push(result.value);
        }
      }
      if (i + BATCH_SIZE < relevant.length) {
        await delay(500);
      }
    }

    return allJobs;
  } catch (error: any) {
    const statusCode = error.response?.status || 'unknown';
    logError('WORKDAY', `Error scraping ${companyName} (status: ${statusCode})`, { error: error.message });
    return [];
  }
}

export async function scrapeGenericCareerPage(url: string, companyName: string, selectors?: LawFirmConfig['selectors']): Promise<ScrapedJob[]> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
      maxRedirects: 5,
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    const jobs: ScrapedJob[] = [];
    const baseUrl = new URL(url).origin;
    const seenUrls = new Set<string>();

    const embeddedATS = detectEmbeddedATS(html, url);
    if (embeddedATS) {
      logInfo('GENERIC', `Detected embedded ${embeddedATS.platform} for ${companyName} at ${embeddedATS.url}`);
      try {
        if (embeddedATS.platform === 'greenhouse') {
          const boardId = embeddedATS.url.match(/(?:boards|job-boards)\.greenhouse\.io\/(\w+)/)?.[1]
            || embeddedATS.url.match(/greenhouse\.io\/embed\/job_board\/js\?for=(\w+)/)?.[1];
          if (boardId) return await scrapeGreenhouse(boardId, companyName);
        } else if (embeddedATS.platform === 'lever') {
          return await scrapeLever(embeddedATS.url, companyName);
        } else if (embeddedATS.platform === 'ashby') {
          const ashbyId = embeddedATS.url.match(/jobs\.ashbyhq\.com\/([a-zA-Z0-9._-]+)/)?.[1];
          if (ashbyId) return await scrapeAshby(`https://api.ashbyhq.com/posting-api/job-board/${ashbyId}`, companyName);
          return await scrapeAshby(embeddedATS.url, companyName);
        } else if (embeddedATS.platform === 'workable') {
          const wkId = embeddedATS.url.match(/apply\.workable\.com\/([a-zA-Z0-9_-]+)/)?.[1];
          if (wkId) return await scrapeWorkable(wkId, companyName);
        } else if (embeddedATS.platform === 'smartrecruiters') {
          const srId = embeddedATS.url.match(/jobs\.smartrecruiters\.com\/([a-zA-Z0-9_-]+)/)?.[1];
          if (srId) return await scrapeSmartRecruiters(srId, companyName);
        } else if (embeddedATS.platform === 'bamboohr') {
          const bhrId = embeddedATS.url.match(/([a-zA-Z0-9_-]+)\.bamboohr\.com/)?.[1];
          if (bhrId) return await scrapeBambooHR(bhrId, companyName);
        } else if (embeddedATS.platform === 'rippling') {
          const rpId = embeddedATS.url.match(/ats\.rippling\.com\/([a-zA-Z0-9_-]+)/)?.[1];
          if (rpId) return await scrapeRippling(rpId, companyName);
        }
      } catch (e) {
        logWarn('GENERIC', `Embedded ATS scrape failed for ${companyName}, continuing with HTML parse`);
      }
    }
    
    if (selectors?.jobList) {
      $(selectors.jobList).each((i, element) => {
        const $job = $(element);
        let title = selectors.title ? $job.find(selectors.title).first().text().trim() : '';
        if (!title) title = $job.find('h2, h3, h4, a').first().text().trim();
        let location = selectors.location ? $job.find(selectors.location).first().text().trim() : '';
        let applyUrl = selectors.applyLink ? ($job.find(selectors.applyLink).attr('href') || '') : ($job.find('a').first().attr('href') || '');
        if (applyUrl && !applyUrl.startsWith('http')) applyUrl = baseUrl + applyUrl;
        if (title && applyUrl && !seenUrls.has(applyUrl)) {
          seenUrls.add(applyUrl);
          jobs.push({ title, company: companyName, location: location || 'Not specified', description: '', applyUrl, postedDate: new Date().toISOString(), source: 'generic', externalId: `generic_${companyName.replace(/\s+/g, '_')}_${i}` });
        }
      });
      if (jobs.length > 0) return jobs;
    }

    const JOB_LINK_PATTERNS = [
      /\/jobs?\//i, /\/careers?\//i, /\/positions?\//i, /\/openings?\//i,
      /\/opportunities?\//i, /\/vacanci/i, /\/apply\//i, /\/posting/i,
      /gh_jid=/i, /lever\.co\//i, /ashbyhq\.com\//i, /workday/i,
      /icims\.com\//i, /rippling/i, /smartrecruiters/i, /jobvite/i,
    ];
    const SKIP_PATTERNS = [
      /\.(pdf|doc|docx|png|jpg|jpeg|gif|svg|css|js)$/i,
      /\/(about|contact|privacy|terms|blog|news|press|faq|help|login|signup|register|#)/i,
      /^mailto:/i, /^tel:/i, /^javascript:/i,
    ];

    const allLinks: { href: string; text: string; context: string }[] = [];
    $('a[href]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      if (!href || href === '#' || href === '/') return;
      const text = $el.text().trim();
      const parent = $el.parent();
      const context = parent.text().trim().substring(0, 200);
      if (SKIP_PATTERNS.some(p => p.test(href))) return;

      let fullUrl = href;
      if (!href.startsWith('http')) {
        try { fullUrl = new URL(href, url).href; } catch { return; }
      }

      if (seenUrls.has(fullUrl)) return;
      seenUrls.add(fullUrl);

      const looksLikeJobLink = JOB_LINK_PATTERNS.some(p => p.test(fullUrl));
      const hasJobTitle = text.length > 5 && text.length < 200 && !/^(home|about|contact|menu|close|open|search|login|back|next|prev|more|see all|view all|apply now|learn more|read more|explore|subscribe|sign up|follow)$/i.test(text);
      
      if (looksLikeJobLink && hasJobTitle) {
        allLinks.push({ href: fullUrl, text, context });
      }
    });

    if (allLinks.length === 0) {
      const containerSelectors = [
        '[class*="job"], [class*="career"], [class*="position"], [class*="opening"], [class*="vacancy"]',
        '[class*="listing"], [class*="opportunity"]',
        '[id*="job"], [id*="career"], [id*="position"], [id*="opening"]',
        'table tbody tr, .list-group-item, ul.jobs li, ol.jobs li',
        '[role="listitem"]',
      ];
      for (const sel of containerSelectors) {
        $(sel).each((i, element) => {
          const $item = $(element);
          const $link = $item.find('a[href]').first();
          if (!$link.length) return;
          let href = $link.attr('href') || '';
          if (!href || href === '#') return;
          if (!href.startsWith('http')) {
            try { href = new URL(href, url).href; } catch { return; }
          }
          if (seenUrls.has(href)) return;
          seenUrls.add(href);

          let title = $link.text().trim();
          if (!title) title = $item.find('h2, h3, h4, h5, .title').first().text().trim();
          if (!title || title.length < 3 || title.length > 200) return;

          const locEl = $item.find('[class*="location"], .location, .city, [class*="city"]').first();
          const location = locEl.text().trim() || 'Not specified';

          allLinks.push({ href, text: title, context: location });
        });
        if (allLinks.length > 0) break;
      }
    }

    for (let i = 0; i < allLinks.length && i < 200; i++) {
      const link = allLinks[i];
      const navGarbage = /^(home|about|contact|menu|close|cookie|privacy|accept|dismiss|skip|©)/i.test(link.text);
      if (navGarbage) continue;

      jobs.push({
        title: link.text,
        company: companyName,
        location: extractLocationFromContext(link.context, link.text) || 'Not specified',
        description: '',
        applyUrl: link.href,
        postedDate: new Date().toISOString(),
        source: 'generic',
        externalId: `generic_${companyName.replace(/\s+/g, '_')}_${i}`,
      });
    }
    
    return jobs;
  } catch (error: any) {
    logError('GENERIC', `Scrape error for ${companyName}`, { error: error.message });
    return [];
  }
}


function extractLocationFromContext(context: string, title: string): string {
  const withoutTitle = context.replace(title, '').trim();
  const locPatterns = [
    /(?:location|office|city|based in|located in)[:\s]*([A-Z][a-zA-Z\s,]+)/,
    /([A-Z][a-z]+(?:,\s*[A-Z]{2})?)\s*(?:·|•|\||-|–)\s*/,
    /(?:·|•|\||-|–)\s*([A-Z][a-z]+(?:,\s*[A-Z]{2})?)/,
  ];
  for (const pattern of locPatterns) {
    const match = withoutTitle.match(pattern);
    if (match && match[1] && match[1].length > 2 && match[1].length < 100) {
      return match[1].trim();
    }
  }
  if (withoutTitle.length > 0 && withoutTitle.length < 60) {
    return withoutTitle;
  }
  return 'Not specified';
}

export async function scrapeRippling(ripplingSlug: string, companyName: string): Promise<ScrapedJob[]> {
  try {
    const apiUrl = `https://ats.rippling.com/api/o/${ripplingSlug}/jobs`;
    try {
      const apiResponse = await fetchWithRetry(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      const data = apiResponse.data;
      const jobList = Array.isArray(data) ? data : (data.jobs || data.results || []);
      if (jobList.length > 0) {
        return jobList.map((job: any, index: number) => {
          const jobId = job.id || job.slug || `${index}`;
          const locationText = job.location || job.locationName || '';
          const locationType = detectLocationType(locationText + ' ' + (job.title || ''));
          const salary = parseSalaryFromText(job.description || job.descriptionPlain || '');
          return {
            title: job.title || job.name || '',
            company: companyName,
            location: locationText,
            description: job.description || job.descriptionHtml || job.descriptionPlain || '',
            applyUrl: job.url || job.applyUrl || `https://ats.rippling.com/${ripplingSlug}/jobs/${jobId}`,
            postedDate: job.publishedAt || job.createdAt || new Date().toISOString(),
            source: 'rippling',
            externalId: `rippling_${ripplingSlug}_${jobId}`,
            salaryMin: salary.min,
            salaryMax: salary.max,
            locationType,
            department: job.department || job.team || undefined,
          };
        });
      }
    } catch {
    }

    const htmlUrl = `https://ats.rippling.com/${ripplingSlug}/jobs`;
    const response = await fetchWithRetry(htmlUrl, { method: 'GET' });
    const $ = cheerio.load(response.data);
    const jobs: ScrapedJob[] = [];

    $('a[href*="/jobs/"]').each((i, el) => {
      const $el = $(el);
      let href = $el.attr('href') || '';
      const title = $el.text().trim();

      if (!title || title.length < 3 || title.length > 200) return;

      if (href.startsWith('/')) {
        href = `https://ats.rippling.com${href}`;
      } else if (!href.startsWith('http')) {
        href = `https://ats.rippling.com/${ripplingSlug}/${href}`;
      }

      const locationEl = $el.parent().find('[class*="location"], [class*="Location"]');
      const location = locationEl.text().trim() || '';
      const locationType = detectLocationType(location + ' ' + title);

      jobs.push({
        title,
        company: companyName,
        location: location || 'Not specified',
        description: '',
        applyUrl: href,
        postedDate: new Date().toISOString(),
        source: 'rippling',
        externalId: `rippling_${ripplingSlug}_${i}`,
        locationType,
      });
    });

    return jobs;
  } catch (error: any) {
    logError('RIPPLING', `Error scraping ${companyName}`, { error: error.message });
    return [];
  }
}

export async function scrapeICIMS(icimsSlug: string, companyName: string): Promise<ScrapedJob[]> {
  try {
    const jobs = await scrapeICIMSSearchApi(icimsSlug, companyName);
    if (jobs.length > 0) {
      logInfo('ICIMS', `${companyName}: ${jobs.length} jobs from search API`);
      return jobs;
    }

    const feedJobs = await scrapeICIMSFeed(icimsSlug, companyName);
    if (feedJobs.length > 0) {
      logInfo('ICIMS', `${companyName}: ${feedJobs.length} jobs from RSS feed`);
      return feedJobs;
    }

    logWarn('ICIMS', `${companyName}: No jobs found via API or feed`);
    return [];
  } catch (error: any) {
    logError('ICIMS', `Error scraping ${companyName}`, { error: error.message });
    return [];
  }
}

async function scrapeICIMSSearchApi(icimsSlug: string, companyName: string): Promise<ScrapedJob[]> {
  const baseUrls = [
    `https://careers-${icimsSlug}.icims.com`,
    `https://${icimsSlug}.icims.com`,
  ];

  for (const baseUrl of baseUrls) {
    try {
      const searchUrl = `${baseUrl}/jobs/search?ss=1&searchRelation=keyword_all&mobile=false&width=1140&height=500&bga=true&needsRedirect=false&jan1offset=-300&jun1offset=-240`;
      const response = await fetchWithRetry(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/html, */*',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      const data = response.data;
      const jobs: ScrapedJob[] = [];

      if (typeof data === 'object' && data !== null) {
        const jobList = data.jobPositionPostings || data.jobs || data.results || data.data || [];
        const items = Array.isArray(jobList) ? jobList : (Array.isArray(data) ? data : []);

        for (const job of items) {
          const title = job.title || job.Title || job.jobTitle || job.position || '';
          if (!title || title.length < 3) continue;

          const jobId = job.id || job.Id || job.jobId || job.requisitionId || '';
          let applyUrl = job.url || job.applyUrl || job.link || job.jobUrl || '';
          if (!applyUrl && jobId) {
            applyUrl = `${baseUrl}/jobs/${jobId}/job`;
          }
          if (applyUrl && !applyUrl.startsWith('http')) {
            applyUrl = baseUrl + (applyUrl.startsWith('/') ? '' : '/') + applyUrl;
          }

          const location = job.location || job.Location || job.city || job.normalizedLocation || '';
          const locationType = detectLocationType(location + ' ' + title);
          const postedDate = job.postedDate || job.datePosted || job.postingDate || job.createdDate || new Date().toISOString();
          const description = job.description || job.jobDescription || job.summary || '';

          jobs.push({
            title,
            company: companyName,
            location: location || 'Not specified',
            description,
            applyUrl,
            postedDate,
            source: 'icims',
            externalId: `icims_${icimsSlug}_${jobId || jobs.length}`,
            locationType,
            department: job.department || job.category || undefined,
          });
        }

        if (jobs.length > 0) return jobs;
      }

      if (typeof data === 'string' && data.includes('<')) {
        const $ = cheerio.load(data);
        const seenUrls = new Set<string>();

        $('a[href*="/jobs/"]').each((i, el) => {
          const $el = $(el);
          let href = $el.attr('href') || '';
          const title = $el.text().trim();

          if (!title || title.length < 3 || title.length > 200) return;
          if (/search|login|sign|apply|reset/i.test(title)) return;

          if (href.startsWith('/')) {
            href = baseUrl + href;
          } else if (!href.startsWith('http')) {
            href = baseUrl + '/' + href;
          }

          if (seenUrls.has(href)) return;
          seenUrls.add(href);

          const jobIdMatch = href.match(/\/jobs\/(\d+)/);
          const jobId = jobIdMatch ? jobIdMatch[1] : String(i);

          const locationEl = $el.closest('tr, .row, [class*="row"], div').find('[class*="location"], [class*="Location"]');
          const location = locationEl.text().trim() || '';
          const locationType = detectLocationType(location + ' ' + title);

          jobs.push({
            title,
            company: companyName,
            location: location || 'Not specified',
            description: '',
            applyUrl: href,
            postedDate: new Date().toISOString(),
            source: 'icims',
            externalId: `icims_${icimsSlug}_${jobId}`,
            locationType,
          });
        });

        if (jobs.length > 0) return jobs;
      }
    } catch {
      continue;
    }
  }

  return [];
}

async function scrapeICIMSFeed(icimsSlug: string, companyName: string): Promise<ScrapedJob[]> {
  const feedUrls = [
    `https://careers-${icimsSlug}.icims.com/jobs/feed/`,
    `https://${icimsSlug}.icims.com/jobs/feed/`,
  ];

  for (const feedUrl of feedUrls) {
    try {
      const response = await fetchWithRetry(feedUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
      });

      const xmlData = typeof response.data === 'string' ? response.data : '';
      if (!xmlData || !xmlData.includes('<')) continue;

      const $ = cheerio.load(xmlData, { xmlMode: true });
      const jobs: ScrapedJob[] = [];
      const baseUrl = new URL(feedUrl).origin;

      $('item').each((i, el) => {
        const $item = $(el);
        const title = $item.find('title').text().trim();
        if (!title || title.length < 3) return;

        let link = $item.find('link').text().trim();
        if (!link) {
          link = $item.find('guid').text().trim();
        }
        if (link && !link.startsWith('http')) {
          link = baseUrl + (link.startsWith('/') ? '' : '/') + link;
        }

        const description = $item.find('description').text().trim();
        const pubDate = $item.find('pubDate').text().trim();
        const category = $item.find('category').text().trim();

        const locationMatch = description.match(/(?:Location|City|Office)\s*:\s*([^<\n]+)/i);
        const location = locationMatch ? locationMatch[1].trim() : '';
        const locationType = detectLocationType(location + ' ' + title + ' ' + description);

        const jobIdMatch = link.match(/\/jobs\/(\d+)/);
        const jobId = jobIdMatch ? jobIdMatch[1] : String(i);

        const salary = parseSalaryFromText(description);

        jobs.push({
          title,
          company: companyName,
          location: location || 'Not specified',
          description,
          applyUrl: link,
          postedDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          source: 'icims',
          externalId: `icims_${icimsSlug}_${jobId}`,
          locationType,
          salaryMin: salary.min,
          salaryMax: salary.max,
          department: category || undefined,
        });
      });

      if (jobs.length > 0) return jobs;
    } catch {
      continue;
    }
  }

  return [];
}

export async function scrapeWorkable(workableId: string, companyName: string): Promise<ScrapedJob[]> {
  try {
    const apiUrl = `https://apply.workable.com/api/v3/accounts/${workableId}/jobs`;
    const response = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      data: JSON.stringify({ query: '', location: '', department: [], worktype: [], remote: [] }),
    });

    const data = response.data;
    const jobList = data.results || data.jobs || [];
    const jobs: ScrapedJob[] = [];

    for (const job of jobList) {
      const shortcode = job.shortcode || job.id || '';
      const locationCity = job.city || '';
      const locationCountry = job.country || '';
      const locationParts = [locationCity, job.state, locationCountry].filter(Boolean);
      const locationText = locationParts.join(', ') || job.location?.name || '';
      const isRemote = job.remote === true || job.telecommuting === true;
      const locationType = isRemote ? 'remote' : detectLocationType(locationText + ' ' + (job.title || ''));

      jobs.push({
        title: job.title || '',
        company: companyName,
        location: locationText || (isRemote ? 'Remote' : 'Not specified'),
        description: job.description || '',
        applyUrl: `https://apply.workable.com/${workableId}/j/${shortcode}/`,
        postedDate: job.published_on || job.created_at || new Date().toISOString(),
        source: 'workable',
        externalId: `workable_${workableId}_${shortcode}`,
        locationType,
        department: job.department || undefined,
        employmentType: job.employment_type || job.type || undefined,
      });
    }

    return jobs;
  } catch (error: any) {
    try {
      const htmlUrl = `https://apply.workable.com/${workableId}/`;
      const response = await fetchWithRetry(htmlUrl, { method: 'GET' });
      const $ = cheerio.load(response.data);
      const jobs: ScrapedJob[] = [];

      $('a[href*="/j/"]').each((i, el) => {
        const $el = $(el);
        let href = $el.attr('href') || '';
        const title = $el.text().trim();
        if (!title || title.length < 3 || title.length > 200) return;
        if (!href.startsWith('http')) {
          href = `https://apply.workable.com${href.startsWith('/') ? '' : '/'}${href}`;
        }
        const locationEl = $el.closest('[class*="job"], li, tr').find('[class*="location"], [class*="Location"]');
        const location = locationEl.text().trim() || 'Not specified';

        jobs.push({
          title,
          company: companyName,
          location,
          description: '',
          applyUrl: href,
          postedDate: new Date().toISOString(),
          source: 'workable',
          externalId: `workable_${workableId}_${i}`,
        });
      });

      return jobs;
    } catch (htmlError: any) {
      logError('WORKABLE', `Error scraping ${companyName}`, { error: htmlError.message });
      return [];
    }
  }
}

export async function scrapeBambooHR(bamboohrId: string, companyName: string): Promise<ScrapedJob[]> {
  try {
    const apiUrl = `https://${bamboohrId}.bamboohr.com/careers/list`;
    const response = await fetchWithRetry(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    let jobList: any[] = [];
    if (response.data && response.data.result) {
      jobList = response.data.result || [];
    } else if (Array.isArray(response.data)) {
      jobList = response.data;
    }

    const jobs: ScrapedJob[] = [];
    for (const job of jobList) {
      const jobId = job.id || '';
      const locationCity = job.location?.city || '';
      const locationState = job.location?.state || '';
      const locationCountry = job.location?.country || '';
      const locationParts = [locationCity, locationState, locationCountry].filter(Boolean);
      const locationText = locationParts.join(', ');
      const locationType = detectLocationType(locationText + ' ' + (job.jobOpeningName || ''));

      jobs.push({
        title: job.jobOpeningName || job.title || '',
        company: companyName,
        location: locationText || 'Not specified',
        description: job.description || '',
        applyUrl: `https://${bamboohrId}.bamboohr.com/careers/${jobId}`,
        postedDate: job.dateCreated || new Date().toISOString(),
        source: 'bamboohr',
        externalId: `bamboohr_${bamboohrId}_${jobId}`,
        locationType,
        department: job.departmentLabel || job.department || undefined,
        employmentType: job.employmentStatusLabel || undefined,
      });
    }

    return jobs;
  } catch (error: any) {
    try {
      const htmlUrl = `https://${bamboohrId}.bamboohr.com/careers`;
      const response = await fetchWithRetry(htmlUrl, { method: 'GET' });
      const $ = cheerio.load(response.data);
      const jobs: ScrapedJob[] = [];

      $('a[href*="/careers/"]').each((i, el) => {
        const $el = $(el);
        let href = $el.attr('href') || '';
        const title = $el.text().trim();
        if (!title || title.length < 3 || title.length > 200) return;
        if (href.includes('/careers/list') || href.endsWith('/careers/') || href.endsWith('/careers')) return;
        if (!href.startsWith('http')) {
          href = `https://${bamboohrId}.bamboohr.com${href.startsWith('/') ? '' : '/'}${href}`;
        }
        const locationEl = $el.closest('li, tr, [class*="job"]').find('[class*="location"], [class*="Location"]');
        const location = locationEl.text().trim() || 'Not specified';

        jobs.push({
          title,
          company: companyName,
          location,
          description: '',
          applyUrl: href,
          postedDate: new Date().toISOString(),
          source: 'bamboohr',
          externalId: `bamboohr_${bamboohrId}_${i}`,
        });
      });

      return jobs;
    } catch (htmlError: any) {
      logError('BAMBOOHR', `Error scraping ${companyName}`, { error: htmlError.message });
      return [];
    }
  }
}

export async function scrapeSmartRecruiters(srId: string, companyName: string): Promise<ScrapedJob[]> {
  try {
    const apiUrl = `https://api.smartrecruiters.com/v1/companies/${srId}/postings`;
    const response = await fetchWithRetry(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const data = response.data;
    const jobList = data.content || data.results || [];
    const jobs: ScrapedJob[] = [];

    for (const job of jobList) {
      const locationCity = job.location?.city || '';
      const locationCountry = job.location?.country || '';
      const locationRegion = job.location?.region || '';
      const locationParts = [locationCity, locationRegion, locationCountry].filter(Boolean);
      const locationText = locationParts.join(', ');
      const isRemote = job.location?.remote === true;
      const locationType = isRemote ? 'remote' : detectLocationType(locationText + ' ' + (job.name || ''));

      jobs.push({
        title: job.name || job.title || '',
        company: companyName,
        location: locationText || (isRemote ? 'Remote' : 'Not specified'),
        description: job.jobAd?.sections?.jobDescription?.text || '',
        applyUrl: job.ref || `https://jobs.smartrecruiters.com/${srId}/${job.id}`,
        postedDate: job.releasedDate || new Date().toISOString(),
        source: 'smartrecruiters',
        externalId: `sr_${srId}_${job.id || job.uuid}`,
        locationType,
        department: job.department?.label || undefined,
        employmentType: job.typeOfEmployment?.label || undefined,
      });
    }

    return jobs;
  } catch (error: any) {
    logError('SMARTRECRUITERS', `Error scraping ${companyName}`, { error: error.message });
    return [];
  }
}

export async function scrapeUltiPro(companyCode: string, boardId: string, companyName: string): Promise<ScrapedJob[]> {
  const baseUrl = `https://recruiting2.ultipro.com/${companyCode}/JobBoard/${boardId}`;
  const searchUrl = `${baseUrl}/JobBoardView/LoadSearchResults`;
  const pageSize = 25;
  let skip = 0;
  const allJobs: ScrapedJob[] = [];

  try {
    let hasMore = true;
    while (hasMore) {
      const response = await fetchWithRetry(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        data: {
          opportunitySearch: {
            Top: pageSize,
            Skip: skip,
            QueryString: '',
            OrderBy: [{ Value: 'postedDateDesc', PropertyName: 'PostedDate', Ascending: false }],
            Filters: [],
          },
        },
      });

      const data = response.data;
      const jobs = data?.opportunities || [];
      const totalRows = data?.totalCount || 0;

      if (!Array.isArray(jobs) || jobs.length === 0) {
        hasMore = false;
        break;
      }

      for (const job of jobs) {
        const opportunityId = job.Id || '';
        const title = job.Title || '';
        const locations = Array.isArray(job.Locations) ? job.Locations : [];
        const locationText = locations.map((l: any) => {
          const addr = l.Address;
          if (!addr) return l.LocalizedDescription || '';
          return [addr.City, addr.State?.Code, addr.Country?.Name].filter(Boolean).join(', ');
        }).join(' | ') || '';
        const category = job.JobCategoryName || '';
        const requisition = job.RequisitionNumber || '';
        const postedDate = job.PostedDate || new Date().toISOString();

        if (!title || !opportunityId) continue;

        const applyUrl = `${baseUrl}/OpportunityDetail?opportunityId=${opportunityId}`;

        let description = '';
        try {
          const detailUrl = `${baseUrl}/JobBoardView/LoadOpportunityDetail`;
          const detailResp = await fetchWithRetry(detailUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            data: { opportunityId },
          });
          const detail = detailResp.data;
          description = detail?.Description || detail?.JobDescription || detail?.description || detail?.model?.Description || '';
          if (description) {
            description = description
              .replace(/<[^>]+>/g, '\n')
              .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
              .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
          }
        } catch {
        }

        if (!description) {
          try {
            const htmlResp = await fetchWithRetry(applyUrl, {
              method: 'GET',
              headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            });
            const htmlText = typeof htmlResp.data === 'string' ? htmlResp.data : '';
            const descMatch = htmlText.match(/class="[^"]*(?:job-?description|opportunity-?description|detail-?body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            if (descMatch) {
              description = descMatch[1]
                .replace(/<[^>]+>/g, '\n')
                .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
                .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
            }
          } catch {
          }
        }

        const locationType = detectLocationType(locationText + ' ' + title + ' ' + description);
        const salary = parseSalaryFromText(description);

        allJobs.push({
          title,
          company: companyName,
          location: locationText || 'Not specified',
          description: description || `${title} at ${companyName}`,
          applyUrl,
          postedDate: postedDate ? new Date(postedDate).toISOString() : new Date().toISOString(),
          source: 'ultipro',
          externalId: `ultipro_${companyCode}_${opportunityId}`,
          salaryMin: salary.min,
          salaryMax: salary.max,
          locationType,
          department: category || undefined,
        });
      }

      skip += pageSize;
      if (skip >= totalRows || skip >= 200) {
        hasMore = false;
      } else {
        await delay(1000);
      }
    }

    logInfo('ULTIPRO', `${companyName}: Found ${allJobs.length} jobs`);
    return allJobs;
  } catch (error: any) {
    logError('ULTIPRO', `Error scraping ${companyName}`, { error: error.message });
    return [];
  }
}

export function isValidJobUrl(url: string): boolean {
  if (!url || url.trim().length === 0) return false;

  const NON_JOB_PATTERNS = [
    /\/news\//i,
    /\/blog\//i,
    /\/press-release/i,
    /\/articles?\//i,
    /\/insights?\//i,
    /\/whitepaper/i,
    /\/webinar/i,
  ];

  if (NON_JOB_PATTERNS.some(p => p.test(url))) return false;

  const GENERIC_PORTAL_PATTERNS = [
    /\/jobs\/intro\?/i,
    /\/jobs\/?(\?(?!.*(?:gh_jid|id=|job)).*)?$/i,
    /\/careers\/?$/i,
    /\/openings\/?$/i,
  ];

  if (GENERIC_PORTAL_PATTERNS.some(p => p.test(url))) return false;

  return true;
}

export function isLegalTechRole(title: string, companyType?: string): boolean {
  const t = title.toLowerCase();

  const rejectPatterns = [
    /general application/i, /career opportunities/i, /talent pool/i,
    /don.t see what/i, /join our team/i,
  ];
  if (rejectPatterns.some(p => p.test(t))) return false;

  const isBiglawOrAlsp = companyType === 'biglaw' || companyType === 'alsp';

  const traditionalPracticeReject = [
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
    /\bconveyancing\b/i,
    /\btenant rights\b/i,
    /\bhousing (staff )?(attorney|lawyer)\b/i,
    /\bdomestic violence\b/i,
    /\bdisability advocacy\b/i,
    /\bright to counsel\b/i,
    /\bhomeowner defense\b/i,
    /\bgovernment benefits unit\b/i,
    /\bveterans justice\b/i,
    /\bimmigrant justice\b/i,
    /\bneighborhood stabilization\b/i,
    /\bforeclosure prevention\b/i,
    /\bvoting rights\b/i,
    /\bnational security project\b/i,
    /\bwomen'?s rights project\b/i,
    /\bstate supreme court initiative\b/i,
    /\bexperienced lawyers?\b/i,
    /\bjunior associate\b.*\b(real estate|litigation|corporate|tax|regulatory)\b/i,
    /\bsenior associate\b.*\b(real estate|litigation|corporate|tax)\b/i,
    /\blaw graduate\b/i,
    /\blegal externship\b/i,
  ];

  if (!isBiglawOrAlsp) {
    traditionalPracticeReject.push(
      /\bstaff attorney\b/i,
      /\bsupervising attorney\b/i,
      /\bdeputy director\b/i,
      /\btrademark attorney\b/i,
    );
  }
  if (traditionalPracticeReject.some(p => p.test(t))) return false;

  if (isBiglawOrAlsp && t.includes('legal')) return true;

  const SCRAPER_LEGAL_WHITELIST = [
    /\blegal engineer\b/i, /\blegal architect\b/i,
    /\bsolutions?\s*(architect|engineer)\b/i,
    /\blegal\s+data\b/i, /\bcompliance\s+engineer\b/i,
    /\bprivacy\s+engineer\b/i, /\btrust\s+engineer\b/i,
    /\bai\s+quality\s+engineer\b/i, /\blegal\s+ai\b/i,
    /\bai\s+product\s+engineer\b/i,
    /\bprofessional\s+services\s+.*engineer\b/i,
    /\bimplementation\s+(engineer|consultant|specialist)\b/i,
    /\bcustomer\s+engineer\b/i, /\bfield\s+engineer\b/i,
    /\bpre-?sales?\s+engineer\b/i, /\bdata\s+security.*engineer\b/i,
    /\bai\s+safety\b/i,
    /\blegal\s+transformation\b/i,
    /\blegal\s+automation\s*(engineer)?\b/i,
    /\blegal\s+workflow\b/i,
    /\blegal\s+program\s+manager\b/i,
    /\blegal\s+strategy\b/i,
    /\blegal\s+project\s+manager\b/i,
    /\blegal\s+(data\s+)?(analyst|scientist)\b/i,
    /\blegal\s+intelligence\b/i,
    /\blegal\s+knowledge\b/i,
    /\blegal\s+content\s+engineer\b/i,
    /\blegal\s+innovation\b/i,
    /\blegal\s+product\s+(manager|owner|director)\b/i,
    /\blegal\s+technology\s+manager\b/i,
    /\blegal\s+solutions\s+engineer\b/i,
    /\bcontract\s+automation\b/i,
    /\bai\s+governance\b/i,
    /\bai\s+policy\b/i,
    /\bai\s+compliance\b/i,
    /\bresponsible\s+ai\b/i,
    /\bai\s+risk\s+manager\b/i,
    /\blegal\s+process\s+(improvement|manager)\b/i,
    /\blegal\s+efficiency\b/i,
    /\bmatter\s+management\b/i,
    /\blpm\s+manager\b/i,
    /\blegal\s+insights\b/i,
    /\bdata\s+protection\s+officer\b/i,
    /\bchief\s+privacy\s+officer\b/i,
  ];
  const isWhitelisted = SCRAPER_LEGAL_WHITELIST.some(p => p.test(title));

  const SCRAPER_PURE_ENGINEERING = [
    /\bsoftware\s+(developer|engineer|development)\b/i,
    /\b(frontend|front-end|front end)\s+(developer|engineer)\b/i,
    /\b(backend|back-end|back end)\s+(developer|engineer)\b/i,
    /\b(full[- ]?stack)\s+(developer|engineer)\b/i,
    /\bweb\s+developer\b/i, /\bmobile\s+(developer|engineer)\b/i,
    /\bios\s+(developer|engineer)\b/i, /\bandroid\s+(developer|engineer)\b/i,
    /\breact\s+(developer|engineer|native)\b/i,
    /\bangular\s+(developer|engineer)\b/i, /\bvue\s+(developer|engineer)\b/i,
    /\bnode\.?js\s+(developer|engineer)\b/i,
    /\bpython\s+(developer|engineer)\b/i, /\bjava\s+(developer|engineer)\b/i,
    /\bruby\s+(developer|engineer|on rails)\b/i,
    /\bgolang\s+(developer|engineer)\b/i, /\brust\s+(developer|engineer)\b/i,
    /\b(c\+\+|c#|\.net)\s+(developer|engineer)\b/i,
    /\bplatform\s+engineer\b/i, /\binfrastructure\s+engineer\b/i,
    /\bcloud\s+engineer\b/i, /\bsystems?\s+engineer\b/i,
    /\bnetwork\s+engineer\b/i, /\bsecurity\s+engineer\b/i,
    /\bcyber\s*security\s+engineer\b/i, /\bendpoint\s+engineer\b/i,
    /\bdata\s+engineer\b/i, /\bml\s+engineer\b/i,
    /\bmachine\s+learning\s+engineer\b/i, /\bdeep\s+learning\b/i,
    /\bcomputer\s+vision\s+engineer\b/i, /\bnlp\s+engineer\b/i,
    /\bai\s+engineer\b/i, /\bmlops\b/i, /\bdevops\b/i,
    /\b(SRE|site reliability)\b/i,
    /\bqa\s+engineer\b/i, /\btest\s+engineer\b/i, /\bsdet\b/i,
    /\bquality\s+(assurance|engineer)\b/i,
    /\bfirmware\s+engineer\b/i, /\bembedded\s+engineer\b/i,
    /\bhardware\s+engineer\b/i, /\belectronics?\s+engineer\b/i,
    /\brf\s+engineer\b/i, /\bmechanical\s+engineer\b/i,
    /\bux\s+designer\b/i, /\bui\s+designer\b/i,
    /\bproduct\s+designer\b/i, /\bgraphic\s+designer\b/i,
    /\bbrand\s+designer\b/i, /\bvisual\s+designer\b/i,
    /\bweb\s+designer\b/i, /\bmotion\s+designer\b/i,
    /\bit\s+(administrator|support|engineer|operations)\b/i,
    /\bsystem\s+administrator\b/i, /\bdatabase\s+(administrator|engineer)\b/i,
    /\b(engineering|software\s+development)\s+manager\b/i,
    /\bengineering\s+(director|lead(er)?|operations)\b/i,
    /\bdirector\s+of\s+engineering\b/i,
    /\bhead\s+of\s+(product\s+)?engineering\b/i,
    /\bvp\s+of?\s+engineering\b/i,
    /\bproduct\s+engineer\b/i, /\bcst\s+developer\b/i,
    /\bapplication\s+security\b/i,
    /\blogging\s+(&|and)\s+detection\s+engineer\b/i,
    /\bdefensive\s+security\b/i, /\bdetection\s+engineer\b/i,
    /\bresearch\s+scientist\b/i, /\bforward\s+deployed\s+engineer\b/i,
    /\bdata\s+migration\s+engineer\b/i, /\banalytics\s+engineer\b/i,
    /\brelease\s+engineer\b/i, /\bbuild\s+engineer\b/i,
    /\bperformance\s+engineer\b/i, /\bautomation\s+engineer\b/i,
    /\bintegration(s)?\s+engineer\b/i,
    /\b(senior|staff|principal|lead)\s+engineer\b/i,
    /\barchitect\s+(i|ii|iii|iv|v)\b/i,
  ];

  if (!isWhitelisted && SCRAPER_PURE_ENGINEERING.some(p => p.test(title))) return false;
  if (isWhitelisted) return true;

  const hardExclude = [
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
    'certification content', 'customer trust lead',
    'head of security risk', 'insider risk investigator',
    'immigration coordinator', 'european tax lead',
    'international indirect tax', 'roc analyst',
    'senior investment associate', 'investment associate',
    'business systems analyst', 'security workforce',
    'regional state and local affairs',
    'chief of staff',
    'executive assistant', 'personal assistant',
    'creative producer', 'video producer', 'content producer',
    'communications manager', 'communications director', 'comms manager',
    'editorial manager', 'editorial director',
    'site lead', 'office lead',
    'procurement director', 'procurement manager', 'procurement specialist', 'procurement analyst',
    'it procurement',
    'global mobility', 'relocation',
    'onboarding manager', 'onboarding specialist', 'onboarding coordinator',
    'program manager, global onboarding', 'gtm onboarding',
    'workplace manager', 'workplace operations', 'workplace coordinator',
    'deal desk', 'pricing & strategy', 'pricing specialist',
    'financial analyst', 'fp&a', 'accounts payable', 'accounts receivable',
    'connector development representative',
    'graphic designer', 'brand designer', 'motion designer', 'visual designer',
    'video editor', 'photographer',
    'event coordinator', 'event planner',
    'data entry', 'office coordinator',
    'maintenance', 'security guard', 'warehouse', 'cleaning',
    'cook', 'driver', 'cashier', 'barista',
    'culture camp',
  ];
  if (hardExclude.some(k => t.includes(k))) return false;

  const legalTechInclude = [
    'legal engineer', 'legal associate', 'legal analyst',
    'legal operations', 'legal ops', 'legal project',
    'legal innovation', 'legal technology', 'legaltech',
    'compliance', 'regulatory',
    'contract manager', 'contract analyst', 'contract specialist', 'clm',
    'ediscovery', 'e-discovery', 'litigation support', 'litigation technology',
    'knowledge management', 'practice technology',
    'legal writer', 'legal content',
    'privacy', 'data protection', 'gdpr', 'ccpa',
    'chief legal',
    'paralegal', 'legal assistant', 'legal secretary',
    'innovation', 'knowledge manager',
    'practice support', 'legal project manager', 'legal process',
    'in-house', 'general counsel', 'deputy general counsel',
    'legal transformation', 'legal strategy', 'legal efficiency',
    'legal program', 'legal automation', 'legal workflow',
    'legal data', 'legal analytics', 'legal intelligence',
    'legal insights', 'matter management', 'client operations',
    'ai governance', 'ai policy', 'ai compliance',
    'responsible ai', 'ai risk',
    'legal ai', 'legal product',
    'data protection officer', 'chief privacy',
    'legal solutions consultant', 'lpm manager', 'legal project management',
    'contract automation', 'legal knowledge',
    'litigation data', 'legal tech',
  ];
  if (legalTechInclude.some(k => t.includes(k))) return true;

  const techSignals = [
    'technology', 'tech', 'innovation', 'automation', 'digital',
    'platform', 'product', 'software', 'ai ', 'data', 'analytics',
    'implementation', 'solutions', 'saas', 'workflow',
    'intelligence', 'transformation', 'efficiency',
  ];
  const hasTechSignal = techSignals.some(k => t.includes(k));

  const legalSignals = [
    'attorney', 'lawyer', 'counsel', 'legal director',
    'paralegal', 'legal secretary', 'legal assistant',
    'ip specialist', 'brand protection', 'trademark',
    'patent', 'intellectual property',
    'governance', 'audit', 'risk',
    'government affairs', 'public policy', 'legislative', 'policy',
    'tax counsel',
    'legal transformation', 'legal strategy', 'legal program',
    'matter management',
  ];
  const hasLegalSignal = legalSignals.some(k => t.includes(k));

  if (hasLegalSignal && hasTechSignal) return true;

  const isLegalTechCompanyType = companyType === 'startup' || companyType === 'tech-legal';

  if (isLegalTechCompanyType) {
    const productFacingRoles = [
      'product manager', 'product lead', 'product director', 'head of product',
      'customer success', 'client success',
      'solutions architect', 'solutions consultant', 'solutions engineer',
      'sales engineer', 'pre-sales',
      'account executive', 'account manager', 'enterprise sales',
      'business development', 'partnerships',
      'implementation', 'professional services',
      'customer support', 'technical support',
      'marketing manager', 'product marketing', 'growth',
      'content strategist', 'content marketing',
      'counsel', 'legal', 'attorney', 'lawyer',
      'paralegal', 'compliance', 'privacy', 'policy',
      'operations manager', 'operations director',
      'success manager', 'success director',
    ];
    return productFacingRoles.some(k => t.includes(k));
  }

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

function isGarbageScrapedJob(job: Partial<ScrapedJob>): boolean {
  const title = (job.title || '').trim();
  const desc = (job.description || '').trim();
  const company = (job.company || '').trim();

  if (!title || title.length < 3) return true;

  if (title === company) return true;

  const navGarbagePatterns = [
    /skip to (?:main )?content/i,
    /^menu$/i,
    /^close$/i,
    /^careers$/i,
    /^home$/i,
    /^search$/i,
    /^sign in$/i,
    /^login$/i,
    /^apply$/i,
    /^back to/i,
    /^cookie/i,
    /^about\s+us$/i,
    /^contact$/i,
    /^join\s+(?:our\s+)?team$/i,
    /^open\s+positions$/i,
    /^current\s+openings$/i,
    /^we.re\s+hiring$/i,
    /^career\s+opportunities$/i,
  ];
  if (navGarbagePatterns.some(p => p.test(title))) return true;

  if (title.length > 150) return true;

  const descLower = desc.toLowerCase();
  const navKeywords = ['skip to main content', 'careers @', 'returning candidates', 'current employees', 'stay connected', 'visit linkedin', 'visit facebook', 'cookie policy', 'privacy policy', 'terms of use', 'accept cookies'];
  const navKeywordCount = navKeywords.filter(kw => descLower.includes(kw)).length;
  if (navKeywordCount >= 2) return true;

  if (desc.length > 0 && desc.length < 50) {
    const menuItems = desc.split(/\n/).filter(l => l.trim().length > 0 && l.trim().length < 30);
    if (menuItems.length > 3 && menuItems.length > desc.split(/\n/).filter(l => l.trim().length >= 30).length * 2) {
      return true;
    }
  }

  if (desc.length > 100) {
    const lines = desc.split(/\n/).filter(l => l.trim().length > 0);
    const shortLines = lines.filter(l => l.trim().length < 25);
    if (lines.length > 5 && shortLines.length > lines.length * 0.7) {
      const hasJobContent = /(?:responsibilit|qualificat|requirement|experience|you will|you'll|we are|we're looking)/i.test(desc);
      if (!hasJobContent) return true;
    }
  }

  const jobContentSignals = /(?:responsibilit|qualificat|requirement|experience|you will|you'll|we are looking|we're looking|about the role|about this role|what you'll do|key duties|must have|preferred|desired|compensation|salary|benefits|who you are|ideal candidate|the opportunity|position|role|team|department|report to|reports to|working with)/i;
  if (!jobContentSignals.test(desc) && desc.length < 300) {
    return true;
  }

  if (job.source === 'ai_extracted') {
    if (desc.length < 100) return true;

    const hasSpecificRequirements = /\b(?:\d+\+?\s*years?|bachelor|master|JD|MBA|bar\s+admission|degree|proficien|certified|PMP|CPA|CIPP)/i.test(desc);
    const hasActionVerbs = /\b(?:manage|develop|implement|analyze|draft|review|negotiate|coordinate|oversee|advise|counsel)/i.test(desc);
    if (!hasSpecificRequirements && !hasActionVerbs) return true;

    const genericOnlyPhrases = [
      'exciting opportunity', 'dynamic team', 'competitive compensation',
      'great culture', 'innovative environment', 'passionate individuals',
      'make a difference', 'world-class team', 'cutting-edge',
    ];
    const genericHits = genericOnlyPhrases.filter(p => descLower.includes(p)).length;
    if (genericHits >= 3 && desc.length < 300) return true;
  }

  return false;
}

function cleanCompanyName(name: string): string {
  let cleaned = name;
  cleaned = decodeHtmlEntities(cleaned);
  cleaned = cleaned
    .replace(/\s*\(formerly\s+[^)]+\)/gi, '')
    .replace(/\s*\(fka\s+[^)]+\)/gi, '')
    .replace(/\s*\(prev(?:iously)?\s+[^)]+\)/gi, '')
    .trim();
  return cleaned;
}

function sanitizeLocation(location: string, company: string): string | null {
  const loc = location?.trim();
  if (!loc || loc === 'Not specified') return null;

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
    return null;
  }

  return loc;
}

export function extractDomainFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const thirdPartyAts = [
      'job-boards.greenhouse.io', 'boards.greenhouse.io',
      'jobs.lever.co', 'jobs.ashbyhq.com', 'api.ashbyhq.com',
      'jobs.smartrecruiters.com', 'api.smartrecruiters.com',
      'app.bamboohr.com', 'api.bamboohr.com',
      'apply.workable.com', 'jobs.workable.com',
      'api.lever.co',
    ];
    if (thirdPartyAts.some(ats => hostname === ats || hostname.endsWith('.' + ats))) return null;
    const stripped = hostname.replace(/^(jobs|careers|career|apply|recruiting|hire)\./i, '');
    if (stripped !== hostname && stripped.includes('.')) return stripped;
    return hostname || null;
  } catch {
    return null;
  }
}

export function transformToJobSchema(job: ScrapedJob, categorization?: JobCategorizationResult, companyDomain?: string): InsertJob {
  const companyClean = cleanCompanyName(job.company);
  const companySlug = companyClean.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  const logoDomain = companyDomain || `${companySlug}.com`;
  
  const cleanDescription = cleanDescriptionText(job.description || '') || `${job.title} position at ${companyClean}`;
  
  const sanitizedLoc = sanitizeLocation(job.location || '', companyClean);
  const locationText = normalizeLocation(sanitizedLoc) || null;
  const fullText = `${job.title} ${cleanDescription} ${locationText || ''}`.toLowerCase();
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

  let salaryCurrency: string | null = job.salaryCurrency || null;
  if (salaryMin || salaryMax) {
    if (!salaryCurrency) {
      salaryCurrency = inferCurrencyFromLocation(locationText || '');
    }
  }

  return {
    title: decodeHtmlEntities(job.title.trim()),
    company: companyClean,
    companyLogo: `https://www.google.com/s2/favicons?domain=${logoDomain}&sz=128`,
    location: locationText,
    isRemote: isRemoteDetected,
    locationType,
    locationRegion: inferRegionFromLocation(locationText || ''),
    salaryMin,
    salaryMax,
    salaryCurrency,
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
    aiResponsibilities: categorization?.aiResponsibilities || null,
    aiQualifications: categorization?.aiQualifications || null,
    aiNiceToHaves: categorization?.aiNiceToHaves || null,
  };
}

export interface SourceResult {
  company: string;
  atsType: string;
  status: 'success' | 'failed' | 'skipped' | 'circuit_broken';
  found: number;
  filtered: number;
  durationMs: number;
  errorCode?: string;
  errorMessage?: string;
}

export async function scrapeAllLawFirms(): Promise<{
  jobs: InsertJob[];
  stats: { company: string; found: number; filtered: number }[];
  sourceResults: SourceResult[];
  funnel: { totalScraped: number; titleFiltered: number; companiesAttempted: number; companiesWithJobs: number };
}> {
  const allJobs: InsertJob[] = [];
  const stats: { company: string; found: number; filtered: number }[] = [];
  const sourceResults: SourceResult[] = [];
  let totalScraped = 0;
  let totalFiltered = 0;
  let companiesWithJobs = 0;
  
  let skippedCircuitOpen = 0;
  const GLOBAL_TIMEOUT_MS = 20 * 60 * 1000;
  const globalStart = Date.now();
  const BATCH_SIZE = 10;

  for (let batchStart = 0; batchStart < LAW_FIRMS_AND_COMPANIES.length; batchStart += BATCH_SIZE) {
    if (Date.now() - globalStart > GLOBAL_TIMEOUT_MS) {
      logWarn('SCRAPE', `Global timeout reached (20min) after processing ${batchStart} companies`);
      break;
    }

    const batch = LAW_FIRMS_AND_COMPANIES.slice(batchStart, batchStart + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (firm) => {
        const atsType = firm.greenhouseId ? `greenhouse` : firm.leverPostingsUrl ? `lever` : firm.ashbyUrl ? `ashby` : firm.workday ? `workday` : firm.ultipro ? `ultipro` : firm.rippling ? `rippling` : firm.icims ? `icims` : firm.workableId ? `workable` : firm.smartrecruitersId ? `smartrecruiters` : firm.bamboohrId ? `bamboohr` : `generic`;
        const circuitKey = `${atsType}:${firm.name}`;
        const companyStart = Date.now();

        if (isCircuitOpen(circuitKey)) {
          skippedCircuitOpen++;
          sourceResults.push({
            company: firm.name, atsType, status: 'circuit_broken',
            found: 0, filtered: 0, durationMs: 0,
            errorCode: 'CIRCUIT_BROKEN', errorMessage: `Circuit breaker open (${CIRCUIT_BREAKER_THRESHOLD}+ consecutive failures)`,
          });
          return { firm, found: 0, filtered: 0, jobs: [] as InsertJob[], skipped: true };
        }

        try {
          const isMultiRegionWorkday = firm.workday && Array.isArray(firm.workday);
          const PER_COMPANY_TIMEOUT = firm.workday ? (isMultiRegionWorkday ? 180000 : 90000) : 30000;

          const scrapePromise = (async () => {
            if (firm.greenhouseId) {
              return await scrapeGreenhouse(firm.greenhouseId, firm.name);
            } else if (firm.leverPostingsUrl) {
              return await scrapeLever(firm.leverPostingsUrl, firm.name);
            } else if (firm.ashbyUrl) {
              return await scrapeAshby(firm.ashbyUrl, firm.name);
            } else if (firm.workday) {
              return await scrapeWorkdayMultiRegion(firm.workday, firm.name, firm.type);
            } else if (firm.ultipro) {
              return await scrapeUltiPro(firm.ultipro.companyCode, firm.ultipro.boardId, firm.name);
            } else if (firm.rippling) {
              return await scrapeRippling(firm.rippling, firm.name);
            } else if (firm.icims) {
              return await scrapeICIMS(firm.icims, firm.name);
            } else if (firm.workableId) {
              return await scrapeWorkable(firm.workableId, firm.name);
            } else if (firm.smartrecruitersId) {
              return await scrapeSmartRecruiters(firm.smartrecruitersId, firm.name);
            } else if (firm.bamboohrId) {
              return await scrapeBambooHR(firm.bamboohrId, firm.name);
            } else {
              return await scrapeGenericCareerPage(firm.careerUrl, firm.name, firm.selectors);
            }
          })();

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Scrape timed out after ${PER_COMPANY_TIMEOUT / 1000}s`)), PER_COMPANY_TIMEOUT)
          );

          const scrapedJobs = await Promise.race([scrapePromise, timeoutPromise]);

          recordSuccess(circuitKey);

          const legalTechJobs = scrapedJobs
            .filter(job => isLegalTechRole(job.title, firm.type))
            .filter(job => isValidJobUrl(job.applyUrl));

          const firmDomain = extractDomainFromUrl(firm.careerUrl) || undefined;
          const transformedJobs = legalTechJobs.map(job => transformToJobSchema(job, undefined, firmDomain));

          logInfo('SCRAPE', `Found ${scrapedJobs.length} jobs, ${legalTechJobs.length} legal tech roles at ${firm.name} (${firm.type})`);

          sourceResults.push({
            company: firm.name, atsType, status: 'success',
            found: scrapedJobs.length, filtered: legalTechJobs.length,
            durationMs: Date.now() - companyStart,
          });

          return { firm, found: scrapedJobs.length, filtered: legalTechJobs.length, jobs: transformedJobs, skipped: false };
        } catch (error: any) {
          recordFailure(circuitKey);
          const isTimeout = error.message?.includes('timed out');
          logError('SCRAPE', `Error scraping ${firm.name}`, { error: error.message });
          sourceResults.push({
            company: firm.name, atsType, status: 'failed',
            found: 0, filtered: 0, durationMs: Date.now() - companyStart,
            errorCode: isTimeout ? 'TIMEOUT' : 'SCRAPE_ERROR',
            errorMessage: error.message?.substring(0, 500),
          });
          return { firm, found: 0, filtered: 0, jobs: [] as InsertJob[], skipped: false };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        const { firm, found, filtered, jobs, skipped } = result.value;
        if (!skipped) {
          totalScraped += found;
          totalFiltered += filtered;
          if (filtered > 0) companiesWithJobs++;
          allJobs.push(...jobs);
        }
        stats.push({ company: firm.name, found, filtered });
      } else {
        logError('SCRAPE', `Batch item rejected`, { error: result.reason?.message || 'unknown' });
      }
    }

    if (batchStart + BATCH_SIZE < LAW_FIRMS_AND_COMPANIES.length) {
      await delay(3000);
    }
  }

  if (skippedCircuitOpen > 0) {
    logWarn('CIRCUIT', `Skipped ${skippedCircuitOpen} companies due to open circuits`);
  }

  try {
    const { db } = await import('../db');
    const { firmSources } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    const activeSources = await db.select().from(firmSources)
      .where(eq(firmSources.status, 'active'));
    const apiSources = activeSources.filter(s => s.fetchMode === 'ats_api' && s.atsConfig);

    if (apiSources.length > 0) {
      logInfo('FIRM_SOURCES', `Scraping ${apiSources.length} firm_sources with ATS API configs`);
    }

    for (const source of apiSources) {
      if (Date.now() - globalStart > GLOBAL_TIMEOUT_MS) break;
      const config = source.atsConfig as Record<string, string>;
      const companyStart = Date.now();

      try {
        let scrapedJobs: ScrapedJob[] = [];
        switch (source.atsType) {
          case 'greenhouse': scrapedJobs = await scrapeGreenhouse(config.boardId, source.firmName); break;
          case 'lever': scrapedJobs = await scrapeLever(`https://api.lever.co/v0/postings/${config.company}`, source.firmName); break;
          case 'workday': scrapedJobs = await scrapeWorkday({ company: config.company, instance: config.instance, site: config.site }, source.firmName); break;
          case 'icims': scrapedJobs = await scrapeICIMS(config.slug, source.firmName); break;
          case 'ashby': scrapedJobs = await scrapeAshby(`https://api.ashbyhq.com/posting-api/job-board/${config.company}`, source.firmName); break;
          case 'smartrecruiters': scrapedJobs = await scrapeSmartRecruiters(config.company, source.firmName); break;
          case 'bamboohr': scrapedJobs = await scrapeBambooHR(config.company, source.firmName); break;
          case 'rippling': scrapedJobs = await scrapeRippling(config.company, source.firmName); break;
          case 'workable': scrapedJobs = await scrapeWorkable(config.company, source.firmName); break;
          case 'ultipro': scrapedJobs = await scrapeUltiPro(config.companyCode, config.boardId, source.firmName); break;
        }

        const firmType = 'biglaw';
        const legalTechJobs = scrapedJobs
          .filter(job => isLegalTechRole(job.title, firmType))
          .filter(job => isValidJobUrl(job.applyUrl));
        const transformedJobs = legalTechJobs.map(job => transformToJobSchema(job));

        logInfo('FIRM_SOURCES', `${source.firmName}: ${scrapedJobs.length} scraped, ${legalTechJobs.length} legal tech (via ${source.atsType})`);
        totalScraped += scrapedJobs.length;
        totalFiltered += legalTechJobs.length;
        if (legalTechJobs.length > 0) companiesWithJobs++;
        allJobs.push(...transformedJobs);
        stats.push({ company: source.firmName, found: scrapedJobs.length, filtered: legalTechJobs.length });
        sourceResults.push({ company: source.firmName, atsType: source.atsType || 'unknown', status: 'success', found: scrapedJobs.length, filtered: legalTechJobs.length, durationMs: Date.now() - companyStart });

        await db.update(firmSources).set({ lastSuccessAt: new Date(), jobCount: scrapedJobs.length, lastErrorMessage: null, updatedAt: new Date() }).where(eq(firmSources.id, source.id));
      } catch (error: any) {
        logError('FIRM_SOURCES', `Error scraping ${source.firmName}`, { error: error.message });
        sourceResults.push({ company: source.firmName, atsType: source.atsType || 'unknown', status: 'failed', found: 0, filtered: 0, durationMs: Date.now() - companyStart, errorCode: 'SCRAPE_ERROR', errorMessage: error.message?.substring(0, 500) });
        await db.update(firmSources).set({ lastErrorMessage: error.message?.substring(0, 500), updatedAt: new Date() }).where(eq(firmSources.id, source.id));
      }

      await delay(2000);
    }
  } catch (err: any) {
    logError('FIRM_SOURCES', `Failed to load firm_sources`, { error: err.message });
  }
  
  const funnel = {
    totalScraped,
    titleFiltered: totalFiltered,
    companiesAttempted: LAW_FIRMS_AND_COMPANIES.length,
    companiesWithJobs,
  };
  logInfo('FUNNEL', `${funnel.companiesAttempted} companies attempted → ${funnel.totalScraped} total jobs scraped → ${funnel.titleFiltered} passed title filter → ${funnel.companiesWithJobs} companies with relevant jobs`);
  
  return { jobs: allJobs, stats, sourceResults, funnel };
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
  } else if (firm.workday) {
    scrapedJobs = await scrapeWorkdayMultiRegion(firm.workday, firm.name, firm.type);
  } else if (firm.ultipro) {
    scrapedJobs = await scrapeUltiPro(firm.ultipro.companyCode, firm.ultipro.boardId, firm.name);
  } else if (firm.rippling) {
    scrapedJobs = await scrapeRippling(firm.rippling, firm.name);
  } else if (firm.icims) {
    scrapedJobs = await scrapeICIMS(firm.icims, firm.name);
  } else if (firm.workableId) {
    scrapedJobs = await scrapeWorkable(firm.workableId, firm.name);
  } else if (firm.smartrecruitersId) {
    scrapedJobs = await scrapeSmartRecruiters(firm.smartrecruitersId, firm.name);
  } else if (firm.bamboohrId) {
    scrapedJobs = await scrapeBambooHR(firm.bamboohrId, firm.name);
  } else {
    scrapedJobs = await scrapeGenericCareerPage(firm.careerUrl, firm.name, firm.selectors);
  }
  
  const legalTechJobs = scrapedJobs
    .filter(job => isLegalTechRole(job.title, firm.type))
    .filter(job => isValidJobUrl(job.applyUrl));
  const firmDomain = extractDomainFromUrl(firm.careerUrl) || undefined;
  return legalTechJobs.map(job => transformToJobSchema(job, undefined, firmDomain));
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
      logInfo('SCRAPE', `[${i + 1}/${total}] Scraping ${firm.name}...`);
      
      let scrapedJobs: ScrapedJob[] = [];
      
      if (firm.greenhouseId) {
        scrapedJobs = await scrapeGreenhouse(firm.greenhouseId, firm.name);
      } else if (firm.leverPostingsUrl) {
        scrapedJobs = await scrapeLever(firm.leverPostingsUrl, firm.name);
      } else if (firm.ashbyUrl) {
        scrapedJobs = await scrapeAshby(firm.ashbyUrl, firm.name);
      } else if (firm.workday) {
        scrapedJobs = await scrapeWorkdayMultiRegion(firm.workday, firm.name, firm.type);
      } else if (firm.ultipro) {
        scrapedJobs = await scrapeUltiPro(firm.ultipro.companyCode, firm.ultipro.boardId, firm.name);
      } else if (firm.rippling) {
        scrapedJobs = await scrapeRippling(firm.rippling, firm.name);
      } else if (firm.icims) {
        scrapedJobs = await scrapeICIMS(firm.icims, firm.name);
      } else if (firm.workableId) {
        scrapedJobs = await scrapeWorkable(firm.workableId, firm.name);
      } else if (firm.smartrecruitersId) {
        scrapedJobs = await scrapeSmartRecruiters(firm.smartrecruitersId, firm.name);
      } else if (firm.bamboohrId) {
        scrapedJobs = await scrapeBambooHR(firm.bamboohrId, firm.name);
      } else {
        scrapedJobs = await scrapeGenericCareerPage(firm.careerUrl, firm.name, firm.selectors);
      }
      
      const legalTechJobs = scrapedJobs
        .filter(job => isLegalTechRole(job.title, firm.type))
        .filter(job => isValidJobUrl(job.applyUrl));
      
      const firmDomain = extractDomainFromUrl(firm.careerUrl) || undefined;
      let categorizedCount = 0;
      for (const job of legalTechJobs) {
        try {
          const categorization = await categorizeJob(job.title, job.description, job.company);
          const transformedJob = transformToJobSchema(job, categorization, firmDomain);
          allJobs.push(transformedJob);
          categorizedCount++;
          
          await delay(500);
        } catch (catError) {
          logError('SCRAPE', `Categorization failed for ${job.title}`, { error: (catError as any)?.message || 'unknown' });
          const transformedJob = transformToJobSchema(job, undefined, firmDomain);
          allJobs.push(transformedJob);
        }
      }
      
      stats.push({
        company: firm.name,
        found: scrapedJobs.length,
        filtered: legalTechJobs.length,
        categorized: categorizedCount,
      });
      
      logInfo('SCRAPE', `Found ${scrapedJobs.length} jobs, ${legalTechJobs.length} legal tech roles, ${categorizedCount} categorized at ${firm.name}`);
      
      await delay(1500);
      
    } catch (error: any) {
      logError('SCRAPE', `Error scraping ${firm.name}`, { error: error.message });
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

type ATSPlatform = 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'smartrecruiters' | 'icims' | 'bamboohr' | 'rippling' | 'jazzhr' | 'recruitee' | 'breezy' | 'linkedin' | 'indeed' | 'myworkdayjobs' | 'applytojob' | 'jobvite' | 'dover' | 'personio' | 'workable' | 'ultipro' | 'generic';

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
  if (hostname.includes('workable.com') || hostname.includes('apply.workable.com')) return 'workable';
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
  if (hostname.includes('ultipro.com') || hostname.includes('recruiting2.ultipro.com')) return 'ultipro';

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

  const workableMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*apply\.workable\.com\/([a-zA-Z0-9_-]+)[^"']*)/i)
    || html.match(/(?:src|href)\s*=\s*["']([^"']*([a-zA-Z0-9_-]+)\.workable\.com[^"']*)/i);
  if (workableMatch) return { platform: 'workable', url: workableMatch[1] };

  const recruiteeMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*\.recruitee\.com[^"']*)/i);
  if (recruiteeMatch) return { platform: 'recruitee', url: recruiteeMatch[1] };

  const jazzMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*(?:app\.jazz\.co|jazzhr\.com)[^"']*)/i);
  if (jazzMatch) return { platform: 'jazzhr', url: jazzMatch[1] };

  const breezyMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*\.breezy\.hr[^"']*)/i);
  if (breezyMatch) return { platform: 'breezy', url: breezyMatch[1] };

  const jobviteMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*jobvite\.com[^"']*)/i);
  if (jobviteMatch) return { platform: 'jobvite', url: jobviteMatch[1] };

  const ripplingMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*ats\.rippling\.com\/([a-zA-Z0-9_-]+)[^"']*)/i);
  if (ripplingMatch) return { platform: 'rippling' as ATSPlatform, url: ripplingMatch[1] };

  const personioMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*jobs\.personio\.de[^"']*)/i)
    || html.match(/(?:src|href)\s*=\s*["']([^"']*\.jobs\.personio\.com[^"']*)/i);
  if (personioMatch) return { platform: 'personio', url: personioMatch[1] };

  const ultiproMatch = html.match(/(?:src|href)\s*=\s*["']([^"']*recruiting2?\.ultipro\.com[^"']*)/i);
  if (ultiproMatch) return { platform: 'ultipro', url: ultiproMatch[1] };

  if (lower.includes('greenhouse') && lower.includes('grnhse')) return { platform: 'greenhouse', url: pageUrl };
  if (lower.includes('lever_co_embed') || lower.includes('lever-jobs-container')) return { platform: 'lever', url: pageUrl };
  if (lower.includes('workable') && lower.includes('whr(')) return { platform: 'workable', url: pageUrl };

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
          host.includes('recruitee.com') || host.includes('icims.com') || host.includes('workday.com') ||
          host.includes('ultipro.com')) {
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

function fuzzyMatchInSource(needle: string, haystack: string): boolean {
  if (!needle || !haystack) return false;
  const needleLower = needle.toLowerCase().trim();
  const haystackLower = haystack.toLowerCase();
  if (haystackLower.includes(needleLower)) return true;
  const words = needleLower.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return false;
  const matchedWords = words.filter(w => haystackLower.includes(w));
  return matchedWords.length >= Math.ceil(words.length * 0.6);
}

function isJSRenderedPage(rawHtml: string): boolean {
  const $ = cheerio.load(rawHtml);
  $('script, style, noscript, link, meta').remove();
  const visibleText = $('body').text().replace(/\s+/g, ' ').trim();
  const scriptCount = (rawHtml.match(/<script[\s>]/gi) || []).length;
  const spaMarkers = [
    /id\s*=\s*["'](?:root|app|__next|__nuxt|__gatsby)/i,
    /data-reactroot/i,
    /ng-app|ng-version/i,
    /data-v-[a-f0-9]/i,
  ];
  const isSPA = spaMarkers.some(p => p.test(rawHtml));
  return (visibleText.length < 200 && scriptCount > 3) || (isSPA && visibleText.length < 500);
}

function detectATSFromScripts(rawHtml: string): { platform: ATSPlatform; url: string } | null {
  const ghScriptMatch = rawHtml.match(/(?:boards|board)\.greenhouse\.io\/embed\/job_board\/js\?for=([a-zA-Z0-9_-]+)/i)
    || rawHtml.match(/grnhse_app\s*=\s*["']([^"']+)/i)
    || rawHtml.match(/greenhouse\.io\/(?:embed\/)?job_board\?for=([a-zA-Z0-9_-]+)/i);
  if (ghScriptMatch) {
    const slug = ghScriptMatch[1];
    return { platform: 'greenhouse', url: `https://boards.greenhouse.io/${slug}` };
  }

  const leverScriptMatch = rawHtml.match(/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/i);
  if (leverScriptMatch) return { platform: 'lever', url: `https://jobs.lever.co/${leverScriptMatch[1]}` };

  const ashbyScriptMatch = rawHtml.match(/jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/i);
  if (ashbyScriptMatch) return { platform: 'ashby', url: `https://jobs.ashbyhq.com/${ashbyScriptMatch[1]}` };

  const wdScriptMatch = rawHtml.match(/(https?:\/\/[a-zA-Z0-9.-]+\.myworkdayjobs\.com\/[a-zA-Z0-9_/-]+)/i);
  if (wdScriptMatch) return { platform: 'workday', url: wdScriptMatch[1] };

  const srScriptMatch = rawHtml.match(/jobs\.smartrecruiters\.com\/([a-zA-Z0-9_-]+)/i);
  if (srScriptMatch) return { platform: 'smartrecruiters', url: `https://jobs.smartrecruiters.com/${srScriptMatch[1]}` };

  const personioMatch = rawHtml.match(/(https?:\/\/[a-zA-Z0-9.-]+\.jobs\.personio\.(?:de|com)\/[^"'\s]+)/i);
  if (personioMatch) return { platform: 'personio', url: personioMatch[1] };

  const workableScript = rawHtml.match(/apply\.workable\.com\/([a-zA-Z0-9_-]+)/i);
  if (workableScript) return { platform: 'workable', url: `https://apply.workable.com/${workableScript[1]}` };

  const icimsMatch = rawHtml.match(/(https?:\/\/[a-zA-Z0-9.-]+\.icims\.com\/jobs\/[^"'\s]+)/i);
  if (icimsMatch) return { platform: 'icims', url: icimsMatch[1] };

  const jobviteMatch = rawHtml.match(/(https?:\/\/jobs\.jobvite\.com\/[a-zA-Z0-9_/-]+)/i);
  if (jobviteMatch) return { platform: 'jobvite', url: jobviteMatch[1] };

  const ultiproScript = rawHtml.match(/(https?:\/\/recruiting2?\.ultipro\.com\/[^"'\s]+)/i);
  if (ultiproScript) return { platform: 'ultipro', url: ultiproScript[1] };

  return null;
}

function validateAIExtraction(parsed: any, sourceText: string, url: string): { valid: boolean; reason: string } {
  if (parsed.not_found === true || parsed.is_job_posting === false) {
    return { valid: false, reason: 'AI determined no job posting found on page' };
  }

  const title = (parsed.title || '').trim();
  const company = (parsed.company || '').trim();
  const description = (parsed.description || '').trim();

  if (!title || title.length < 3) {
    return { valid: false, reason: 'No valid title extracted' };
  }

  if (!description || description.length < 50) {
    return { valid: false, reason: `Description too short (${description.length} chars) — likely fabricated` };
  }

  if (!fuzzyMatchInSource(title, sourceText)) {
    return { valid: false, reason: `Title "${title}" not found in source text — likely hallucinated` };
  }

  if (company && company !== 'Unknown Company') {
    try {
      const urlDomain = new URL(url).hostname.replace(/^www\./, '').split('.')[0].toLowerCase();
      const companyWords = company.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const companyInSource = fuzzyMatchInSource(company, sourceText);
      const companyMatchesDomain = companyWords.some((w: string) => urlDomain.includes(w)) || urlDomain.includes(company.toLowerCase().replace(/\s+/g, ''));
      if (!companyInSource && !companyMatchesDomain) {
        return { valid: false, reason: `Company "${company}" not found in source text or URL domain — likely hallucinated` };
      }
    } catch {}
  }

  const genericPhrases = [
    'exciting opportunity', 'dynamic team', 'competitive salary',
    'great benefits', 'fast-paced environment', 'innovative company',
  ];
  const descLower = description.toLowerCase();
  const genericCount = genericPhrases.filter(p => descLower.includes(p)).length;
  const hasSpecifics = /\b(?:years?|degree|bachelor|master|experience|proficien|certification|qualif)/i.test(description);
  if (genericCount >= 3 && !hasSpecifics) {
    return { valid: false, reason: 'Description contains mostly generic filler phrases without specific requirements — likely fabricated' };
  }

  const descSentences = description.split(/[.!?]+/).filter((s: string) => s.trim().length > 15);
  if (descSentences.length > 5) {
    const sentencesInSource = descSentences.filter((s: string) => fuzzyMatchInSource(s.trim(), sourceText));
    if (sentencesInSource.length < Math.ceil(descSentences.length * 0.15)) {
      return { valid: false, reason: `Only ${sentencesInSource.length}/${descSentences.length} description sentences found in source — likely fabricated` };
    }
  }

  return { valid: true, reason: 'Passed all validation checks' };
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

  logInfo('SMART_SCRAPER', `Basic extraction insufficient for ${url}, using AI fallback...`);

  let cleanedText = cleanDescriptionText(rawHtml);
  if (cleanedText.length < 50) {
    const $ = cheerio.load(rawHtml);
    $('script, style, nav, footer, header, iframe, noscript').remove();
    cleanedText = $('body').text().replace(/\s+/g, ' ').trim();
  }

  if (cleanedText.length < 30) {
    logWarn('SMART_SCRAPER', `Not enough text content from ${url}`);
    return null;
  }

  if (isJSRenderedPage(rawHtml) && cleanedText.length < 150) {
    const scriptATS = detectATSFromScripts(rawHtml);
    if (!scriptATS) {
      logWarn('SMART_SCRAPER', `JS-rendered page with minimal content from ${url} — skipping AI to prevent hallucination`);
      return null;
    }
  }

  const truncated = cleanedText.substring(0, 8000);

  try {
    const { getOpenAIClient } = await import('./openai-client');
    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a strict job posting extractor. Your ONLY job is to extract REAL job data that EXISTS in the provided text.

CRITICAL ANTI-HALLUCINATION RULES:
1. NEVER invent, fabricate, or guess any information. Every field you return MUST come directly from the text.
2. If you cannot find a real, specific job posting in the text, you MUST return: {"not_found": true, "reason": "explanation"}
3. The job title MUST appear verbatim (or near-verbatim) in the source text. Do NOT infer or construct titles.
4. The company name MUST appear in the text or be obvious from the URL domain. Do NOT guess company names.
5. The description MUST be composed of sentences/phrases that actually appear in the source text. Do NOT write your own description.
6. If the page appears to be a careers listing page, a company homepage, a login page, or any non-job-posting page, return {"not_found": true, "reason": "not a job posting page"}.
7. If the text is mostly navigation menus, cookie banners, or boilerplate, return {"not_found": true, "reason": "insufficient job content"}.

When a real job posting IS found, return ONLY valid JSON:
{
  "is_job_posting": true,
  "title": "The exact job title as it appears in the text",
  "company": "Company name as it appears in the text",
  "location": "Location as stated, or 'Remote', or 'Not specified' if truly not mentioned",
  "description": "The actual job description text from the page — responsibilities, requirements, qualifications. Copy from source, do not rewrite.",
  "locationType": "remote" | "hybrid" | "onsite",
  "salaryMin": number or null,
  "salaryMax": number or null
}

Additional rules:
- For salary, only extract if explicitly stated. Convert to annual USD if needed.
- For locationType: only set based on explicit statements in the text. Default to "onsite" if not mentioned.
- Preserve the original wording from the source text as much as possible.`,
        },
        {
          role: "user",
          content: `Extract job posting data from this page (URL: ${url}):\n\n${truncated}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);

    const validation = validateAIExtraction(parsed, cleanedText, url);
    if (!validation.valid) {
      logWarn('SMART_SCRAPER', `AI extraction rejected for ${url}: ${validation.reason}`);
      return null;
    }

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
    logError('SMART_SCRAPER', `AI fallback failed for ${url}`, { error: error.message });
    if (basicResult.title && basicResult.description && basicResult.description.length > 50) {
      return {
        title: basicResult.title,
        company: basicResult.company || 'Unknown Company',
        location: basicResult.location || 'Not specified',
        description: basicResult.description,
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
      let loc = '';
      if (typeof matchingJob.location === 'string') loc = matchingJob.location;
      else if (matchingJob.location?.name) loc = matchingJob.location.name;
      else if (matchingJob.locationName) loc = matchingJob.locationName;
      if (!loc && matchingJob.address?.postalAddress) {
        const addr = matchingJob.address.postalAddress;
        loc = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(', ');
      }
      if (!loc && matchingJob.isRemote) loc = 'Remote';
      return {
        title: matchingJob.title,
        company: companySlug,
        location: loc || 'Not specified',
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
    logError('WORKDAY', `Extraction failed for ${url}`, { error: error.message });
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
    logError('BAMBOOHR', `Extraction failed for ${url}`, { error: error.message });
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
    logInfo('SMART_SCRAPER', `Detected platform: ${platform} for ${url}`);
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
        const scriptATS = !embedded ? detectATSFromScripts(rawHtml) : null;
        const atsDiscovery = embedded || scriptATS;
        if (atsDiscovery) {
          const discoveryMethod = embedded ? 'Embedded ATS Detection' : 'Script ATS Detection';
          logInfo('SMART_SCRAPER', `Found ${embedded ? 'embedded' : 'script-referenced'} ${atsDiscovery.platform} ATS in page: ${atsDiscovery.url}`);
          trace.steps.push({ method: discoveryMethod, status: 'success', detail: `Found ${platformLabels[atsDiscovery.platform] || atsDiscovery.platform} → ${atsDiscovery.url}` });
          platform = atsDiscovery.platform;
          trace.platform = platform;
          trace.platformLabel = platformLabels[platform] || platform;

          const embeddedHandler = atsHandlers[platform];
          if (embeddedHandler) {
            scrapedJob = await embeddedHandler.fn(atsDiscovery.url);
            if (scrapedJob) {
              trace.steps.push({ method: `${embeddedHandler.label} (via ${embedded ? 'embed' : 'script'})`, status: 'success', detail: `Found: ${scrapedJob.title}` });
              trace.extractionMethod = `${embeddedHandler.label} (discovered via ${embedded ? 'embed' : 'script'})`;
            }
          }

          if (!scrapedJob && !embedded && scriptATS) {
            try {
              const atsResp = await axios.get(scriptATS.url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html,application/json' },
                timeout: 15000, maxRedirects: 5,
              });
              const $ats = cheerio.load(atsResp.data);
              const atsLinks = discoverJobLinksFromPage($ats, scriptATS.url);
              if (atsLinks.length > 0) {
                const firstATSLink = atsLinks[0];
                const linkPlatform = detectATSPlatform(firstATSLink);
                const linkHandler = atsHandlers[linkPlatform];
                if (linkHandler) {
                  scrapedJob = await linkHandler.fn(firstATSLink);
                  if (scrapedJob) {
                    trace.extractionMethod = `${linkHandler.label} (via script ATS board)`;
                    trace.steps.push({ method: `${linkHandler.label} (script board)`, status: 'success', detail: `Found: ${scrapedJob.title}` });
                  }
                }
              }
            } catch {
              trace.steps.push({ method: 'Script ATS Follow', status: 'failed', detail: 'Could not fetch ATS board page' });
            }
          }
        } else {
          trace.steps.push({ method: 'Embedded ATS Detection', status: 'skipped', detail: 'No embedded ATS found in page HTML or scripts' });
        }
      }

      if (!scrapedJob && platform === 'generic') {
        const isListing = isJobListingPage(effectiveUrl, $);
        if (isListing) {
          const discoveredLinks = discoverJobLinksFromPage($, effectiveUrl);
          if (discoveredLinks.length > 0) {
            logInfo('SMART_SCRAPER', `Detected listing page with ${discoveredLinks.length} job links`);
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
          logInfo('SMART_SCRAPER', `Found JSON-LD JobPosting data`);
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
      logWarn('SMART_SCRAPER', `Could not extract job data from ${url}`);
      trace.confidence = 'low';
      trace.processingTimeMs = Date.now() - startTime;
      if (withTrace) {
        return null;
      }
      return null;
    }

    if (scrapedJob.title) {
      scrapedJob.title = decodeHtmlEntities(scrapedJob.title).trim();
    }
    if (scrapedJob.description) {
      scrapedJob.description = cleanDescriptionText(scrapedJob.description);
    }

    if (isGarbageScrapedJob(scrapedJob)) {
      logWarn('SMART_SCRAPER', `Rejected garbage scrape result from ${url}: title="${scrapedJob.title}", desc=${scrapedJob.description?.length || 0} chars`);
      trace.steps.push({ method: 'Quality Gate', status: 'failed', detail: 'Scraped content appears to be navigation/menu HTML, not a job posting' });
      trace.confidence = 'low';
      trace.processingTimeMs = Date.now() - startTime;
      return null;
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
      logError('SMART_SCRAPER', 'Categorization failed', { error: (error as any)?.message || 'unknown' });
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
    const isAIExtracted = trace.extractionMethod?.includes('AI') || scrapedJob.source === 'ai_extracted';
    if (isAIExtracted) {
      trace.confidence = extractedRatio >= 0.7 ? 'medium' : 'low';
      trace.steps.push({
        method: 'Verification Warning',
        status: 'failed',
        detail: `⚠️ AI-extracted content — review carefully before publishing. Title, company, and description should be verified against the original page.`
      });
    } else {
      trace.confidence = extractedRatio >= 0.7 ? 'high' : extractedRatio >= 0.4 ? 'medium' : 'low';
    }
    trace.processingTimeMs = Date.now() - startTime;

    if (withTrace) {
      return { ...result, _trace: trace };
    }
    return result;
  } catch (error: any) {
    logError('SMART_SCRAPER', `Error scraping ${url}`, { error: error.message });
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
