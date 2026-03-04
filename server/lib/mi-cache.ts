let marketIntelligenceCache: { data: any; timestamp: number } | null = null;
let dataQualityCache: { data: any; timestamp: number } | null = null;
let canonicalStats: { totalJobs: number; totalCompanies: number; totalCountries: number; timestamp: number } | null = null;
let displayStats: { totalJobs: number; totalCompanies: number; totalCountries: number; timestamp: number } | null = null;
const MI_CACHE_TTL = 3600000;
const DQ_CACHE_TTL = 3600000;
const CANONICAL_TTL = 3600000;
const DISPLAY_TTL = 14400000;

export function clearMarketIntelligenceCache() {
  marketIntelligenceCache = null;
}

export function getMarketIntelligenceCache() {
  if (marketIntelligenceCache && Date.now() - marketIntelligenceCache.timestamp < MI_CACHE_TTL) {
    return marketIntelligenceCache.data;
  }
  return null;
}

export function setMarketIntelligenceCache(data: any) {
  marketIntelligenceCache = { data, timestamp: Date.now() };
}

export function clearDataQualityCache() {
  dataQualityCache = null;
}

export function getDataQualityCache() {
  if (dataQualityCache && Date.now() - dataQualityCache.timestamp < DQ_CACHE_TTL) {
    return dataQualityCache.data;
  }
  return null;
}

export function setDataQualityCache(data: any) {
  dataQualityCache = { data, timestamp: Date.now() };
}

export function getCanonicalStats() {
  if (canonicalStats && Date.now() - canonicalStats.timestamp < CANONICAL_TTL) {
    return { totalJobs: canonicalStats.totalJobs, totalCompanies: canonicalStats.totalCompanies, totalCountries: canonicalStats.totalCountries };
  }
  return null;
}

export function setCanonicalStats(totalJobs: number, totalCompanies: number, totalCountries: number) {
  if (canonicalStats && Date.now() - canonicalStats.timestamp < CANONICAL_TTL) {
    return;
  }
  canonicalStats = { totalJobs, totalCompanies, totalCountries, timestamp: Date.now() };
}

export function getDisplayStats() {
  if (displayStats && Date.now() - displayStats.timestamp < DISPLAY_TTL) {
    return { totalJobs: displayStats.totalJobs, totalCompanies: displayStats.totalCompanies, totalCountries: displayStats.totalCountries };
  }
  return null;
}

export function setDisplayStats(totalJobs: number, totalCompanies: number, totalCountries: number) {
  if (displayStats && Date.now() - displayStats.timestamp < DISPLAY_TTL) {
    return;
  }
  displayStats = { totalJobs, totalCompanies, totalCountries, timestamp: Date.now() };
}

export function clearDisplayStats() {
  displayStats = null;
}

export function clearAllStatsCaches() {
  marketIntelligenceCache = null;
  dataQualityCache = null;
  canonicalStats = null;
}
