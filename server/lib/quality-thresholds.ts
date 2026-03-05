import { LAW_FIRMS_AND_COMPANIES } from './law-firms-list';

type CompanyCategory = 'legal-tech-startup' | 'law-firm' | 'general-tech';

function normalizeCompanyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const COMPANY_TYPE_MAP = new Map<string, CompanyCategory>();
for (const firm of LAW_FIRMS_AND_COMPANIES) {
  const key = normalizeCompanyName(firm.name);
  if (firm.type === 'startup' || firm.type === 'alsp' || firm.type === 'tech-legal') {
    COMPANY_TYPE_MAP.set(key, 'legal-tech-startup');
  } else if (firm.type === 'biglaw') {
    COMPANY_TYPE_MAP.set(key, 'law-firm');
  } else {
    COMPANY_TYPE_MAP.set(key, 'general-tech');
  }
}

export function getCompanyCategory(company: string): CompanyCategory {
  return COMPANY_TYPE_MAP.get(normalizeCompanyName(company)) || 'general-tech';
}

export interface QualityThresholds {
  minRelevance: number;
  qualityThreshold: number;
  minConfidence: number;
}

export function getQualityThresholds(company: string): QualityThresholds {
  const category = getCompanyCategory(company);
  switch (category) {
    case 'legal-tech-startup':
      return { minRelevance: 6, qualityThreshold: 35, minConfidence: 40 };
    case 'law-firm':
      return { minRelevance: 8, qualityThreshold: 40, minConfidence: 50 };
    case 'general-tech':
      return { minRelevance: 7, qualityThreshold: 40, minConfidence: 50 };
  }
}

export function getCompanyQualityThresholds(company: string): { minRelevance: number } {
  return { minRelevance: getQualityThresholds(company).minRelevance };
}
