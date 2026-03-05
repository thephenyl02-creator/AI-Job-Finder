import { db } from '../db';
import { sql } from 'drizzle-orm';

let marketIntelligenceCache: { data: any; timestamp: number } | null = null;
let dataQualityCache: { data: any; timestamp: number } | null = null;
let canonicalStats: { totalJobs: number; totalCompanies: number; totalCountries: number; timestamp: number } | null = null;
let displayStats: { totalJobs: number; totalCompanies: number; totalCountries: number; timestamp: number } | null = null;
let displayStatsLoaded = false;
const MI_CACHE_TTL = 3600000;
const DQ_CACHE_TTL = 3600000;
const CANONICAL_TTL = 3600000;
const DISPLAY_TTL = 86400000;

async function persistDisplayStats(totalJobs: number, totalCompanies: number, totalCountries: number): Promise<void> {
  try {
    const value = JSON.stringify({ totalJobs, totalCompanies, totalCountries });
    await db.execute(sql`
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES ('display_stats', ${value}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${value}::jsonb, updated_at = NOW()
    `);
  } catch (err: any) {
    console.error('[DisplayStats] Failed to persist to DB:', err.message);
  }
}

export async function loadDisplayStatsFromDB(): Promise<void> {
  if (displayStatsLoaded) return;
  try {
    const result = await db.execute(sql`
      SELECT value, updated_at FROM platform_settings WHERE key = 'display_stats'
    `);
    const rows = result.rows as any[];
    if (rows.length > 0) {
      const val = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
      const updatedAt = new Date(rows[0].updated_at).getTime();
      if (displayStats) {
        const merged = {
          totalJobs: Math.max(val.totalJobs, displayStats.totalJobs),
          totalCompanies: Math.max(val.totalCompanies, displayStats.totalCompanies),
          totalCountries: Math.max(val.totalCountries, displayStats.totalCountries),
        };
        displayStats = { ...merged, timestamp: Math.max(updatedAt, displayStats.timestamp) };
        console.log(`[DisplayStats] Merged DB + in-memory: ${merged.totalJobs} jobs, ${merged.totalCompanies} companies, ${merged.totalCountries} countries`);
      } else {
        displayStats = {
          totalJobs: val.totalJobs,
          totalCompanies: val.totalCompanies,
          totalCountries: val.totalCountries,
          timestamp: updatedAt,
        };
        console.log(`[DisplayStats] Loaded from DB: ${val.totalJobs} jobs, ${val.totalCompanies} companies, ${val.totalCountries} countries (age: ${Math.round((Date.now() - updatedAt) / 60000)}min)`);
      }
    }
    displayStatsLoaded = true;
  } catch (err: any) {
    console.error('[DisplayStats] Failed to load from DB:', err.message);
    displayStatsLoaded = true;
  }
}

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
    const ratchetedJobs = Math.max(totalJobs, displayStats.totalJobs);
    const ratchetedCompanies = Math.max(totalCompanies, displayStats.totalCompanies);
    const ratchetedCountries = Math.max(totalCountries, displayStats.totalCountries);
    if (ratchetedJobs > displayStats.totalJobs || ratchetedCompanies > displayStats.totalCompanies || ratchetedCountries > displayStats.totalCountries) {
      displayStats = { totalJobs: ratchetedJobs, totalCompanies: ratchetedCompanies, totalCountries: ratchetedCountries, timestamp: displayStats.timestamp };
      persistDisplayStats(ratchetedJobs, ratchetedCompanies, ratchetedCountries);
    }
    return;
  }
  if (displayStats) {
    totalJobs = Math.max(totalJobs, displayStats.totalJobs);
    totalCompanies = Math.max(totalCompanies, displayStats.totalCompanies);
    totalCountries = Math.max(totalCountries, displayStats.totalCountries);
  }
  displayStats = { totalJobs, totalCompanies, totalCountries, timestamp: Date.now() };
  persistDisplayStats(totalJobs, totalCompanies, totalCountries);
}

export function forceRefreshDisplayStats(totalJobs: number, totalCompanies: number, totalCountries: number) {
  displayStats = { totalJobs, totalCompanies, totalCountries, timestamp: Date.now() };
  persistDisplayStats(totalJobs, totalCompanies, totalCountries);
}

export function clearDisplayStats() {
  displayStats = null;
}

export function clearAllStatsCaches() {
  marketIntelligenceCache = null;
  dataQualityCache = null;
  canonicalStats = null;
}
