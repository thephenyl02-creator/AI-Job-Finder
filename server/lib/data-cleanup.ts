import { db } from "../db";
import { jobs, firmSources } from "@shared/schema";
import { eq, and, lt, lte, isNull, sql, or, like, ne } from "drizzle-orm";
import { clearMarketIntelligenceCache } from "./mi-cache";

const CLEANUP_VERSION = "v2_quality_enforcement";

async function hasRunCleanup(version: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT value FROM app_settings WHERE key = 'cleanup_version' AND value = ${version}
    `);
    return (result as any).rows?.length > 0;
  } catch {
    return false;
  }
}

async function markCleanupComplete(version: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('cleanup_version', ${version}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${version}, updated_at = NOW()
  `);
}

async function ensureSettingsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

export async function runDataCleanup(force = false): Promise<{
  unpublishedLowRelevance: number;
  unpublishedNullQuality: number;
  unpublishedNegativeAi: number;
  rearchivedResurrected: number;
  decodedEntities: number;
  skipped: boolean;
}> {
  const results = {
    unpublishedLowRelevance: 0,
    unpublishedNullQuality: 0,
    unpublishedNegativeAi: 0,
    rearchivedResurrected: 0,
    decodedEntities: 0,
    skipped: false,
  };

  try {
    await ensureSettingsTable();

    if (!force) {
      const alreadyRun = await hasRunCleanup(CLEANUP_VERSION);
      if (alreadyRun) {
        console.log(`[DataCleanup] Version ${CLEANUP_VERSION} already applied, skipping.`);
        results.skipped = true;
        return results;
      }
    }

    console.log(`[DataCleanup] Starting cleanup (version: ${CLEANUP_VERSION}, force: ${force})...`);

    const r1 = await db.execute(sql`
      UPDATE jobs
      SET is_published = false, review_status = 'needs_review', pipeline_status = 'review'
      WHERE is_published = true
        AND legal_relevance_score IS NOT NULL
        AND legal_relevance_score < 6
    `);
    results.unpublishedLowRelevance = Number((r1 as any).rowCount || 0);
    console.log(`[DataCleanup] Unpublished ${results.unpublishedLowRelevance} low-relevance jobs (score < 6)`);

    const r2 = await db.execute(sql`
      UPDATE jobs
      SET is_published = false, review_status = 'needs_review', pipeline_status = 'review'
      WHERE is_published = true
        AND quality_score IS NULL
        AND (legal_relevance_score IS NULL OR legal_relevance_score <= 6)
    `);
    results.unpublishedNullQuality = Number((r2 as any).rowCount || 0);
    console.log(`[DataCleanup] Unpublished ${results.unpublishedNullQuality} null-quality/low-relevance jobs`);

    const r3 = await db.execute(sql`
      UPDATE jobs
      SET is_published = false, review_status = 'needs_review', pipeline_status = 'review'
      WHERE is_published = true
        AND (legal_relevance_score IS NULL OR legal_relevance_score < 7)
        AND ai_summary IS NOT NULL
        AND (
          ai_summary ILIKE '%does not involve%technology%'
          OR ai_summary ILIKE '%not suitable for lawyers%transitioning%'
          OR ai_summary ILIKE '%purely administrative%'
          OR ai_summary ILIKE '%not a legal tech%'
          OR ai_summary ILIKE '%no technology component%'
          OR ai_summary ILIKE '%not relevant to legal technology%'
          OR ai_summary ILIKE '%traditional business development%'
        )
    `);
    results.unpublishedNegativeAi = Number((r3 as any).rowCount || 0);
    console.log(`[DataCleanup] Unpublished ${results.unpublishedNegativeAi} negative-AI-signal jobs`);

    const r4 = await db.execute(sql`
      UPDATE jobs
      SET is_active = false, is_published = false, job_status = 'archived', pipeline_status = 'archived'
      WHERE deactivated_at IS NOT NULL
        AND is_active = true
    `);
    results.rearchivedResurrected = Number((r4 as any).rowCount || 0);
    console.log(`[DataCleanup] Re-archived ${results.rearchivedResurrected} resurrected jobs`);

    let entityCount = 0;
    const r5a = await db.execute(sql`
      UPDATE jobs SET title = REPLACE(title, '&amp;', '&')
      WHERE title LIKE '%&amp;%'
    `);
    entityCount += Number((r5a as any).rowCount || 0);

    const r5b = await db.execute(sql`
      UPDATE jobs SET company = REPLACE(company, '&amp;', '&')
      WHERE company LIKE '%&amp;%'
    `);
    entityCount += Number((r5b as any).rowCount || 0);

    try {
      const r5c = await db.execute(sql`
        UPDATE firm_sources SET firm_name = REPLACE(firm_name, '&amp;', '&')
        WHERE firm_name LIKE '%&amp;%'
      `);
      entityCount += Number((r5c as any).rowCount || 0);
    } catch {
    }

    results.decodedEntities = entityCount;
    console.log(`[DataCleanup] Decoded ${results.decodedEntities} HTML entities`);

    if (!force) {
      await markCleanupComplete(CLEANUP_VERSION);
    }

    const totalChanges = results.unpublishedLowRelevance + results.unpublishedNullQuality +
      results.unpublishedNegativeAi + results.rearchivedResurrected + results.decodedEntities;

    if (totalChanges > 0) {
      clearMarketIntelligenceCache();
      console.log(`[DataCleanup] MI cache cleared after ${totalChanges} total changes`);
    }

    console.log(`[DataCleanup] Complete:`, JSON.stringify(results));
    return results;

  } catch (error: any) {
    console.error(`[DataCleanup] Error:`, error.message);
    throw error;
  }
}
