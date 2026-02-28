let marketIntelligenceCache: { data: any; timestamp: number } | null = null;
let dataQualityCache: { data: any; timestamp: number } | null = null;
const MI_CACHE_TTL = 3600000;
const DQ_CACHE_TTL = 3600000;

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

export function clearAllStatsCaches() {
  marketIntelligenceCache = null;
  dataQualityCache = null;
}
