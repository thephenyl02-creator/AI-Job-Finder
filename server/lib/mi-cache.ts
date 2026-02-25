let marketIntelligenceCache: { data: any; timestamp: number } | null = null;
const MI_CACHE_TTL = 3600000;

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
