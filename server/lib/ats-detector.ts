import axios from 'axios';
import { logInfo, logWarn } from './logger';

export interface ATSDetectionResult {
  atsType: string;
  config: Record<string, string>;
  confidence: number;
  evidence: string;
}

const ATS_PATTERNS: { pattern: RegExp; atsType: string; extractConfig: (match: RegExpMatchArray) => Record<string, string>; evidence: string }[] = [
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
];

export function detectATSFromUrl(url: string): ATSDetectionResult {
  for (const { pattern, atsType, extractConfig, evidence } of ATS_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      return {
        atsType,
        config: extractConfig(match),
        confidence: 0.95,
        evidence,
      };
    }
  }

  return {
    atsType: 'unknown',
    config: {},
    confidence: 0,
    evidence: 'No known ATS pattern matched',
  };
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
