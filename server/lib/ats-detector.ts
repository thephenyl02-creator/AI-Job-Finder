import axios from 'axios';
import { logInfo, logWarn } from './logger';

export interface ATSDetectionResult {
  atsType: string;
  config: Record<string, string>;
  confidence: number;
  evidence: string;
  scrapeSupported?: boolean;
}

const ATS_PATTERNS: { pattern: RegExp; atsType: string; extractConfig: (match: RegExpMatchArray) => Record<string, string>; evidence: string; scrapeSupported?: boolean }[] = [
  {
    pattern: /(?:boards|job-boards)\.greenhouse\.io\/([a-zA-Z0-9_-]+)/i,
    atsType: 'greenhouse',
    extractConfig: (m) => ({ boardId: m[1] }),
    evidence: 'Greenhouse board URL detected',
  },
  {
    pattern: /greenhouse\.io\/embed\/job_board\/js\?for=([a-zA-Z0-9_-]+)/i,
    atsType: 'greenhouse',
    extractConfig: (m) => ({ boardId: m[1] }),
    evidence: 'Greenhouse embed script detected',
  },
  {
    pattern: /jobs\.lever\.co\/([a-zA-Z0-9_-]+)/i,
    atsType: 'lever',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'Lever jobs URL detected',
  },
  {
    pattern: /([a-zA-Z0-9_-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:en-US\/)?([a-zA-Z0-9_-]+)/i,
    atsType: 'workday',
    extractConfig: (m) => ({ company: m[1], instance: m[2], site: m[3] }),
    evidence: 'Workday jobs URL detected',
  },
  {
    pattern: /([a-zA-Z0-9_-]+)\.(wd\d+)\.myworkday(?:jobs)?\.com/i,
    atsType: 'workday',
    extractConfig: (m) => ({ company: m[1], instance: m[2], site: '' }),
    evidence: 'Workday domain detected (site needs discovery)',
  },
  {
    pattern: /careers-([a-zA-Z0-9_-]+)\.icims\.com/i,
    atsType: 'icims',
    extractConfig: (m) => ({ slug: m[1] }),
    evidence: 'iCIMS careers subdomain detected',
  },
  {
    pattern: /([a-zA-Z0-9_-]+)\.icims\.com/i,
    atsType: 'icims',
    extractConfig: (m) => ({ slug: m[1] }),
    evidence: 'iCIMS subdomain detected',
  },
  {
    pattern: /jobs\.ashbyhq\.com\/([a-zA-Z0-9._-]+)/i,
    atsType: 'ashby',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'Ashby jobs URL detected',
  },
  {
    pattern: /api\.ashbyhq\.com\/posting-api\/job-board\/([a-zA-Z0-9._-]+)/i,
    atsType: 'ashby',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'Ashby API URL detected',
  },
  {
    pattern: /jobs\.smartrecruiters\.com\/([a-zA-Z0-9_-]+)/i,
    atsType: 'smartrecruiters',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'SmartRecruiters URL detected',
  },
  {
    pattern: /([a-zA-Z0-9_-]+)\.bamboohr\.com\/(?:careers|jobs)/i,
    atsType: 'bamboohr',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'BambooHR careers URL detected',
  },
  {
    pattern: /ats\.rippling\.com\/([a-zA-Z0-9_-]+)/i,
    atsType: 'rippling',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'Rippling ATS URL detected',
  },
  {
    pattern: /apply\.workable\.com\/([a-zA-Z0-9_-]+)/i,
    atsType: 'workable',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'Workable URL detected',
  },
  {
    pattern: /recruiting2?\.ultipro\.com\/([A-Z0-9]+)\/JobBoard\/([a-f0-9-]+)/i,
    atsType: 'ultipro',
    extractConfig: (m) => ({ companyCode: m[1], boardId: m[2] }),
    evidence: 'UltiPro job board URL detected',
  },
  {
    pattern: /(?:[a-zA-Z0-9_-]+)?selfapply\.viglobalcloud\.com\/viRecruitSelfApply/i,
    atsType: 'virecruit',
    extractConfig: () => ({}),
    evidence: 'viRecruit/viGlobalCloud self-apply URL detected',
    scrapeSupported: false,
  },
  {
    pattern: /viglobalcloud\.com/i,
    atsType: 'virecruit',
    extractConfig: () => ({}),
    evidence: 'viGlobalCloud domain detected',
    scrapeSupported: false,
  },
  {
    pattern: /jobs\.jobvite\.com\/([a-zA-Z0-9_-]+)/i,
    atsType: 'jobvite',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'Jobvite jobs URL detected',
  },
  {
    pattern: /([a-zA-Z0-9_-]+)\.taleo\.net/i,
    atsType: 'taleo',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'Taleo URL detected',
  },
  {
    pattern: /performancemanager\d*\.successfactors\.com/i,
    atsType: 'successfactors',
    extractConfig: () => ({}),
    evidence: 'SuccessFactors URL detected',
    scrapeSupported: false,
  },
  {
    pattern: /([a-zA-Z0-9_-]+)\.recruitee\.com/i,
    atsType: 'recruitee',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'Recruitee URL detected',
  },
  {
    pattern: /([a-zA-Z0-9_-]+)\.jobs\.personio\.de/i,
    atsType: 'personio',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'Personio jobs URL detected',
  },
  {
    pattern: /([a-zA-Z0-9_-]+)\.applytojob\.com/i,
    atsType: 'jazzhr',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'JazzHR URL detected',
  },
  {
    pattern: /([a-zA-Z0-9_-]+)\.teamtailor\.com/i,
    atsType: 'teamtailor',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'Teamtailor URL detected',
  },
  {
    pattern: /([a-zA-Z0-9_-]+)\.pinpointhq\.com/i,
    atsType: 'pinpoint',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'Pinpoint URL detected',
  },
  {
    pattern: /app\.beapplied\.com\/org\/([a-zA-Z0-9_-]+)/i,
    atsType: 'applied',
    extractConfig: (m) => ({ company: m[1] }),
    evidence: 'Applied (BeApplied) URL detected',
  },
];

const EMBEDDED_ATS_MARKERS: { pattern: RegExp; atsType: string; evidence: string; scrapeSupported?: boolean }[] = [
  { pattern: /greenhouse\.io\/embed/i, atsType: 'greenhouse', evidence: 'Greenhouse embed detected in page' },
  { pattern: /boards\.greenhouse\.io/i, atsType: 'greenhouse', evidence: 'Greenhouse board iframe detected' },
  { pattern: /lever\.co/i, atsType: 'lever', evidence: 'Lever iframe/link detected in page' },
  { pattern: /myworkdayjobs\.com/i, atsType: 'workday', evidence: 'Workday iframe/link detected in page' },
  { pattern: /icims\.com/i, atsType: 'icims', evidence: 'iCIMS iframe/link detected in page' },
  { pattern: /ashbyhq\.com/i, atsType: 'ashby', evidence: 'Ashby iframe/link detected in page' },
  { pattern: /smartrecruiters\.com/i, atsType: 'smartrecruiters', evidence: 'SmartRecruiters iframe/link detected' },
  { pattern: /bamboohr\.com/i, atsType: 'bamboohr', evidence: 'BambooHR iframe/link detected in page' },
  { pattern: /rippling\.com/i, atsType: 'rippling', evidence: 'Rippling iframe/link detected in page' },
  { pattern: /workable\.com/i, atsType: 'workable', evidence: 'Workable iframe/link detected in page' },
  { pattern: /ultipro\.com/i, atsType: 'ultipro', evidence: 'UltiPro iframe/link detected in page' },
  { pattern: /viglobalcloud\.com/i, atsType: 'virecruit', evidence: 'viRecruit/viGlobalCloud detected in page', scrapeSupported: false },
  { pattern: /jobvite\.com/i, atsType: 'jobvite', evidence: 'Jobvite iframe/link detected in page' },
  { pattern: /taleo\.net/i, atsType: 'taleo', evidence: 'Taleo iframe/link detected in page' },
  { pattern: /successfactors\.com/i, atsType: 'successfactors', evidence: 'SuccessFactors detected in page', scrapeSupported: false },
  { pattern: /recruitee\.com/i, atsType: 'recruitee', evidence: 'Recruitee iframe/link detected in page' },
  { pattern: /personio\.de/i, atsType: 'personio', evidence: 'Personio iframe/link detected in page' },
  { pattern: /applytojob\.com/i, atsType: 'jazzhr', evidence: 'JazzHR iframe/link detected in page' },
  { pattern: /teamtailor\.com/i, atsType: 'teamtailor', evidence: 'Teamtailor iframe/link detected in page' },
  { pattern: /pinpointhq\.com/i, atsType: 'pinpoint', evidence: 'Pinpoint iframe/link detected in page' },
  { pattern: /beapplied\.com/i, atsType: 'applied', evidence: 'Applied (BeApplied) iframe/link detected in page' },
];

export function detectATSFromUrl(url: string): ATSDetectionResult {
  for (const { pattern, atsType, extractConfig, evidence, scrapeSupported } of ATS_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      return {
        atsType,
        config: extractConfig(match),
        confidence: 0.95,
        evidence,
        scrapeSupported: scrapeSupported !== undefined ? scrapeSupported : true,
      };
    }
  }

  return {
    atsType: 'unknown',
    config: {},
    confidence: 0,
    evidence: 'No known ATS pattern matched',
    scrapeSupported: false,
  };
}

export function detectEmbeddedATS(html: string): ATSDetectionResult | null {
  for (const { pattern, atsType, evidence, scrapeSupported } of EMBEDDED_ATS_MARKERS) {
    if (pattern.test(html)) {
      const urlPatternResult = (() => {
        for (const p of ATS_PATTERNS) {
          if (p.atsType === atsType) {
            const match = html.match(p.pattern);
            if (match) {
              return {
                config: p.extractConfig(match),
                confidence: 0.85,
              };
            }
          }
        }
        return null;
      })();

      return {
        atsType,
        config: urlPatternResult?.config || {},
        confidence: urlPatternResult?.confidence || 0.6,
        evidence,
        scrapeSupported: scrapeSupported !== undefined ? scrapeSupported : true,
      };
    }
  }
  return null;
}

export async function validateATSConfig(atsType: string, config: Record<string, string>): Promise<{ valid: boolean; jobCount: number; error?: string }> {
  try {
    switch (atsType) {
      case 'greenhouse': {
        const resp = await axios.get(`https://boards-api.greenhouse.io/v1/boards/${config.boardId}/jobs`, { timeout: 10000 });
        return { valid: true, jobCount: resp.data?.jobs?.length || 0 };
      }
      case 'lever': {
        const resp = await axios.get(`https://api.lever.co/v0/postings/${config.company}?limit=1&mode=json`, { timeout: 10000 });
        return { valid: true, jobCount: Array.isArray(resp.data) ? resp.data.length : 0 };
      }
      case 'workday': {
        if (!config.site) return { valid: false, jobCount: 0, error: 'Workday site identifier needed. Look for the path after the domain, e.g., company.wd1.myworkdayjobs.com/SITE_NAME' };
        const apiUrl = `https://${config.company}.${config.instance}.myworkdayjobs.com/wday/cxs/${config.company}/${config.site}/jobs`;
        const resp = await axios.post(apiUrl, { appliedFacets: {}, limit: 1, offset: 0, searchText: '' }, { timeout: 10000, headers: { 'Content-Type': 'application/json' } });
        return { valid: true, jobCount: resp.data?.total || 0 };
      }
      case 'icims': {
        const searchUrl = `https://careers-${config.slug}.icims.com/jobs/search?pr=0&schemaId=&o=`;
        const resp = await axios.get(searchUrl, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' } });
        const hasJobs = resp.data && resp.data.length > 1000;
        return { valid: hasJobs, jobCount: hasJobs ? -1 : 0 };
      }
      case 'ashby': {
        const apiUrl = config.company.startsWith('http') ? config.company : `https://api.ashbyhq.com/posting-api/job-board/${config.company}`;
        const resp = await axios.get(apiUrl, { timeout: 10000 });
        return { valid: true, jobCount: resp.data?.jobs?.length || 0 };
      }
      case 'smartrecruiters': {
        const resp = await axios.get(`https://api.smartrecruiters.com/v1/companies/${config.company}/postings?limit=1`, { timeout: 10000 });
        return { valid: true, jobCount: resp.data?.totalFound || 0 };
      }
      case 'bamboohr': {
        const resp = await axios.get(`https://api.bamboohr.com/api/gateway.php/${config.company}/v1/applicant_tracking/jobs`, { timeout: 10000, headers: { Accept: 'application/json' } });
        return { valid: true, jobCount: resp.data?.result?.length || 0 };
      }
      case 'rippling': {
        const resp = await axios.get(`https://ats.rippling.com/api/ats/v1/${config.company}/jobs`, { timeout: 10000, headers: { Accept: 'application/json' } });
        return { valid: true, jobCount: Array.isArray(resp.data) ? resp.data.length : 0 };
      }
      case 'workable': {
        const resp = await axios.get(`https://apply.workable.com/api/v3/accounts/${config.company}/jobs`, { timeout: 10000, headers: { Accept: 'application/json' } });
        return { valid: true, jobCount: resp.data?.results?.length || 0 };
      }
      case 'ultipro': {
        const postUrl = `https://recruiting2.ultipro.com/${config.companyCode}/JobBoard/${config.boardId}/JobBoardView/LoadSearchResults`;
        const resp = await axios.post(postUrl, { opportunitySearch: { Top: 1, Skip: 0 } }, { timeout: 10000, headers: { 'Content-Type': 'application/json' } });
        return { valid: true, jobCount: resp.data?.totalCount || resp.data?.opportunities?.length || 0 };
      }
      case 'virecruit':
      case 'successfactors':
        return { valid: false, jobCount: 0, error: `${atsType} detected but scraping is not supported (no public job listing API)` };
      case 'jobvite':
      case 'taleo':
      case 'recruitee':
      case 'personio':
      case 'jazzhr':
      case 'teamtailor':
      case 'pinpoint':
      case 'applied':
        return { valid: false, jobCount: 0, error: `${atsType} detected but validation not yet implemented` };
      default:
        return { valid: false, jobCount: 0, error: `Unknown ATS type: ${atsType}` };
    }
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 404) return { valid: false, jobCount: 0, error: 'ATS endpoint not found (404). Check the identifier.' };
    if (status === 403) return { valid: false, jobCount: 0, error: 'ATS endpoint blocked (403). May need different credentials or URL.' };
    return { valid: false, jobCount: 0, error: `Validation failed: ${error.message?.substring(0, 200)}` };
  }
}
