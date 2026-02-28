import { db } from "../db";
import { jobs, firmSources } from "@shared/schema";
import { eq, and, lt, lte, isNull, sql, or, like, ne } from "drizzle-orm";
import { clearMarketIntelligenceCache } from "./mi-cache";
import { normalizeSkill, toTitleCase } from "./skills-normalization";
import { isGenericBusinessRole, hasNegativeAiSignal } from "./job-quality-patterns";

const CLEANUP_VERSION = "v4d_generic_role_cleanup";

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

const COUNTRY_TO_REGION: Record<string, string> = {
  US: "North America", CA: "North America",
  GB: "Europe", IE: "Europe", DE: "Europe", FR: "Europe", SE: "Europe",
  ES: "Europe", PL: "Europe", PT: "Europe", BE: "Europe", BG: "Europe",
  RO: "Europe", UA: "Europe", NL: "Europe", IT: "Europe", CH: "Europe",
  AT: "Europe", DK: "Europe", NO: "Europe", FI: "Europe", CZ: "Europe",
  HU: "Europe", HR: "Europe", SK: "Europe", SI: "Europe", LT: "Europe",
  LV: "Europe", EE: "Europe", GR: "Europe", LU: "Europe",
  EU: "Europe",
  IN: "Asia-Pacific", AU: "Asia-Pacific", JP: "Asia-Pacific",
  KR: "Asia-Pacific", SG: "Asia-Pacific", CN: "Asia-Pacific",
  HK: "Asia-Pacific", TW: "Asia-Pacific", NZ: "Asia-Pacific",
  PH: "Asia-Pacific", TH: "Asia-Pacific", MY: "Asia-Pacific",
  ID: "Asia-Pacific", VN: "Asia-Pacific",
  BR: "Latin America", MX: "Latin America", AR: "Latin America",
  CL: "Latin America", CO: "Latin America", PE: "Latin America",
  IL: "Middle East", AE: "Middle East", SA: "Middle East",
  ZA: "Africa", NG: "Africa", KE: "Africa", EG: "Africa",
  WW: "Global",
};

interface LocationCleanup {
  pattern: RegExp;
  newLocation: string;
  locationType: string;
  isRemote: boolean;
}

const LOCATION_CLEANUPS: LocationCleanup[] = [
  { pattern: /^Remote \(USA\)\s*$/i, newLocation: "United States", locationType: "remote", isRemote: true },
  { pattern: /^Remote United States\s*$/i, newLocation: "United States", locationType: "remote", isRemote: true },
  { pattern: /^Remote - US\s*$/i, newLocation: "United States", locationType: "remote", isRemote: true },
  { pattern: /^Remote, United States\s*$/i, newLocation: "United States", locationType: "remote", isRemote: true },
  { pattern: /^United States - Remote\s*$/i, newLocation: "United States", locationType: "remote", isRemote: true },
  { pattern: /^United States - Canada - Remote\s*$/i, newLocation: "United States · Canada", locationType: "remote", isRemote: true },
  { pattern: /^Remote - UK\s*$/i, newLocation: "United Kingdom", locationType: "remote", isRemote: true },
  { pattern: /^Remote \(UK\)\s*$/i, newLocation: "United Kingdom", locationType: "remote", isRemote: true },
  { pattern: /^Remote \(Spain\)\s*$/i, newLocation: "Spain", locationType: "remote", isRemote: true },
  { pattern: /^Remote \(Portugal\)\s*$/i, newLocation: "Portugal", locationType: "remote", isRemote: true },
  { pattern: /^Remote \(Europe\)\s*$/i, newLocation: "Europe", locationType: "remote", isRemote: true },
  { pattern: /^Europe \(Remote\)\s*$/i, newLocation: "Europe", locationType: "remote", isRemote: true },
  { pattern: /^Remote \(Ukraine\)\s*$/i, newLocation: "Ukraine", locationType: "remote", isRemote: true },
  { pattern: /^Mexico - Remote\s*$/i, newLocation: "Mexico", locationType: "remote", isRemote: true },
  { pattern: /^Anywhere, United States\s*$/i, newLocation: "United States", locationType: "remote", isRemote: true },
  { pattern: /^Friendly \(travel[- ]required\)\s*$/i, newLocation: "United States", locationType: "remote", isRemote: true },
  { pattern: /^New York, NY \(Hybrid\)\s*$/i, newLocation: "New York, NY", locationType: "hybrid", isRemote: true },
  { pattern: /^United Kingdom \(Hybrid\)\s*$/i, newLocation: "United Kingdom", locationType: "hybrid", isRemote: true },
  { pattern: /^Singapore, Central, Singapore\s*$/i, newLocation: "Singapore", locationType: "onsite", isRemote: false },
  { pattern: /^Sydney, New South Wales\s*$/i, newLocation: "Sydney", locationType: "onsite", isRemote: false },
  { pattern: /^Melbourne, Australia; Sydney, Australia\s*$/i, newLocation: "Melbourne · Sydney", locationType: "onsite", isRemote: false },
  { pattern: /^Bangalore, India\s*$/i, newLocation: "Bangalore", locationType: "onsite", isRemote: false },
  { pattern: /^Washington, District Of Columbia\s*$/i, newLocation: "Washington, DC", locationType: "onsite", isRemote: false },
  { pattern: /^Washington, District of Columbia\s*$/i, newLocation: "Washington, DC", locationType: "onsite", isRemote: false },
  { pattern: /^London, UK\s*$/i, newLocation: "London", locationType: "onsite", isRemote: false },
  { pattern: /^Mclean, VA\s*$/i, newLocation: "McLean, VA", locationType: "onsite", isRemote: false },
];

const MULTI_LOCATION_CLEANUPS: Array<{ pattern: RegExp; newLocation: string }> = [
  { pattern: /^US - Boston, MA\s*;\s*US - Houston, TX\s*$/i, newLocation: "Boston, MA · Houston, TX" },
  { pattern: /^McLean, Virginia, United States;\s*Richmond, Virginia, United States\s*$/i, newLocation: "McLean, VA · Richmond, VA" },
  { pattern: /^McLean, Virginia, United States,\s*Richmond, Virginia, United States\s*$/i, newLocation: "McLean, VA · Richmond, VA" },
];

const STRIP_COUNTRY_PATTERNS: Array<{ pattern: RegExp; newLocation: string }> = [
  { pattern: /^McLean, Virginia, United States\s*$/i, newLocation: "McLean, Virginia" },
  { pattern: /^Los Angeles, California\s*$/i, newLocation: "Los Angeles, CA" },
  { pattern: /^Oakland, California\s*$/i, newLocation: "Oakland, CA" },
  { pattern: /^Raleigh, North Carolina\s*$/i, newLocation: "Raleigh, NC" },
  { pattern: /^Riverwoods, Illinois\s*$/i, newLocation: "Riverwoods, IL" },
  { pattern: /^Madrid, Spain\s*$/i, newLocation: "Madrid" },
];

const ADDRESS_CLEANUPS: Array<{ pattern: RegExp; newLocation: string }> = [
  { pattern: /^IND-Hyderabad.*$/i, newLocation: "Hyderabad" },
  { pattern: /^Pune-indiqube.*$/i, newLocation: "Pune" },
];

const TITLE_CLEANUPS: Array<{ id: number; newTitle: string }> = [
  { id: 583, newTitle: "Senior AI/ML Software Engineer" },
  { id: 584, newTitle: "Senior AI/ML Software Engineer" },
  { id: 585, newTitle: "Senior AI/ML Software Engineer" },
  { id: 586, newTitle: "Senior AI/ML Software Engineer" },
  { id: 587, newTitle: "Senior AI/ML Software Engineer" },
];

const UNPUBLISH_IDS = [1246, 1599, 881, 146, 147, 185, 2081, 135, 1127, 149, 184, 797];

const CAREER_TRACK_FIXES: Array<{ id: number; track: string }> = [
  { id: 184, track: "Ecosystem" },
  { id: 185, track: "Ecosystem" },
];

function normalizeSkillArray(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const skill of skills) {
    const normalized = toTitleCase(normalizeSkill(skill));
    const key = normalized.toLowerCase();
    if (!seen.has(key) && normalized.trim()) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

export async function runDataCleanup(force = false): Promise<{
  unpublishedLowRelevance: number;
  unpublishedNullQuality: number;
  unpublishedNegativeAi: number;
  rearchivedResurrected: number;
  decodedEntities: number;
  skillsNormalized: number;
  locationTypeFixed: number;
  locationRegionFixed: number;
  locationStringsFixed: number;
  titlesFixed: number;
  unpublishedQuestionable: number;
  careerTrackFixed: number;
  workModeSynced: number;
  skipped: boolean;
}> {
  const results = {
    unpublishedLowRelevance: 0,
    unpublishedNullQuality: 0,
    unpublishedNegativeAi: 0,
    rearchivedResurrected: 0,
    decodedEntities: 0,
    skillsNormalized: 0,
    locationTypeFixed: 0,
    locationRegionFixed: 0,
    locationStringsFixed: 0,
    titlesFixed: 0,
    unpublishedQuestionable: 0,
    careerTrackFixed: 0,
    workModeSynced: 0,
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

    console.log(`[DataCleanup] Starting v3 comprehensive fixes...`);

    const allJobs = await db.select({
      id: jobs.id,
      keySkills: jobs.keySkills,
      location: jobs.location,
      locationType: jobs.locationType,
      workMode: jobs.workMode,
      isRemote: jobs.isRemote,
      countryCode: jobs.countryCode,
      locationRegion: jobs.locationRegion,
      title: jobs.title,
    }).from(jobs).where(eq(jobs.isActive, true));

    for (const job of allJobs) {
      const updates: Record<string, any> = {};

      if (job.keySkills && job.keySkills.length > 0) {
        const normalized = normalizeSkillArray(job.keySkills);
        const changed = JSON.stringify(normalized) !== JSON.stringify(job.keySkills);
        if (changed) {
          updates.keySkills = normalized;
          results.skillsNormalized++;
        }
      }

      let effectiveLocationType = job.locationType;
      let effectiveIsRemote = job.isRemote;

      if (!job.locationType && job.workMode) {
        updates.locationType = job.workMode;
        effectiveLocationType = job.workMode;
        results.locationTypeFixed++;
      } else if (!job.locationType && !job.workMode) {
        const loc = (job.location || '').toLowerCase();
        if (job.isRemote || /\bremote\b/.test(loc)) {
          updates.locationType = 'remote';
          updates.workMode = 'remote';
          updates.isRemote = true;
          effectiveLocationType = 'remote';
          effectiveIsRemote = true;
        } else if (/\bhybrid\b/.test(loc)) {
          updates.locationType = 'hybrid';
          updates.workMode = 'hybrid';
          updates.isRemote = true;
          effectiveLocationType = 'hybrid';
          effectiveIsRemote = true;
        } else {
          updates.locationType = 'onsite';
          updates.workMode = 'onsite';
          effectiveLocationType = 'onsite';
        }
        results.locationTypeFixed++;
      }

      if (job.countryCode && (!job.locationRegion || job.locationRegion === '')) {
        const region = COUNTRY_TO_REGION[job.countryCode];
        if (region) {
          updates.locationRegion = region;
          results.locationRegionFixed++;
        }
      }

      if (job.location) {
        let newLocation = job.location;
        let locationChanged = false;

        for (const cleanup of LOCATION_CLEANUPS) {
          if (cleanup.pattern.test(newLocation)) {
            newLocation = cleanup.newLocation;
            if (!updates.locationType) updates.locationType = cleanup.locationType;
            if (cleanup.isRemote && !updates.isRemote) updates.isRemote = cleanup.isRemote;
            effectiveLocationType = cleanup.locationType;
            effectiveIsRemote = cleanup.isRemote;
            locationChanged = true;
            break;
          }
        }

        if (!locationChanged) {
          for (const cleanup of MULTI_LOCATION_CLEANUPS) {
            if (cleanup.pattern.test(newLocation)) {
              newLocation = cleanup.newLocation;
              locationChanged = true;
              break;
            }
          }
        }

        if (!locationChanged) {
          for (const cleanup of STRIP_COUNTRY_PATTERNS) {
            if (cleanup.pattern.test(newLocation)) {
              newLocation = cleanup.newLocation;
              locationChanged = true;
              break;
            }
          }
        }

        if (!locationChanged) {
          for (const cleanup of ADDRESS_CLEANUPS) {
            if (cleanup.pattern.test(newLocation)) {
              newLocation = cleanup.newLocation;
              locationChanged = true;
              break;
            }
          }
        }

        const trimmed = newLocation.trim();
        if (trimmed !== job.location) {
          updates.location = trimmed;
          results.locationStringsFixed++;
        }
      }

      const finalLocationType = updates.locationType || effectiveLocationType;
      const currentWorkMode = job.workMode;
      if (finalLocationType && finalLocationType !== currentWorkMode) {
        updates.workMode = finalLocationType;
        results.workModeSynced++;
      }

      if (finalLocationType === 'remote' || finalLocationType === 'hybrid') {
        if (!effectiveIsRemote && !updates.isRemote) {
          updates.isRemote = true;
        }
      }

      if (Object.keys(updates).length > 0) {
        await db.update(jobs).set(updates).where(eq(jobs.id, job.id));
      }
    }
    console.log(`[DataCleanup] Skills normalized: ${results.skillsNormalized}`);
    console.log(`[DataCleanup] Location type fixed: ${results.locationTypeFixed}`);
    console.log(`[DataCleanup] Location region fixed: ${results.locationRegionFixed}`);
    console.log(`[DataCleanup] Location strings fixed: ${results.locationStringsFixed}`);
    console.log(`[DataCleanup] Work mode synced: ${results.workModeSynced}`);

    for (const fix of TITLE_CLEANUPS) {
      const r = await db.execute(sql`
        UPDATE jobs SET title = ${fix.newTitle} WHERE id = ${fix.id} AND title LIKE '%(Remote in %'
      `);
      if (Number((r as any).rowCount || 0) > 0) results.titlesFixed++;
    }
    console.log(`[DataCleanup] Titles fixed: ${results.titlesFixed}`);

    for (const fix of CAREER_TRACK_FIXES) {
      const r = await db.execute(sql`
        UPDATE jobs SET career_track = ${fix.track} WHERE id = ${fix.id} AND (career_track IS NULL OR career_track != ${fix.track})
      `);
      if (Number((r as any).rowCount || 0) > 0) results.careerTrackFixed++;
    }
    console.log(`[DataCleanup] Career track fixed: ${results.careerTrackFixed}`);

    for (const jobId of UNPUBLISH_IDS) {
      const r = await db.execute(sql`
        UPDATE jobs 
        SET is_published = false, review_status = 'needs_review', pipeline_status = 'review'
        WHERE id = ${jobId} AND is_published = true
      `);
      results.unpublishedQuestionable += Number((r as any).rowCount || 0);
    }
    console.log(`[DataCleanup] Unpublished ${results.unpublishedQuestionable} questionable jobs`);

    const rIronclad = await db.execute(sql`
      UPDATE jobs SET key_skills = array_remove(key_skills, 'Ironclad')
      WHERE id = 540 AND 'Ironclad' = ANY(key_skills)
    `);
    if (Number((rIronclad as any).rowCount || 0) > 0) {
      console.log(`[DataCleanup] Removed Ironclad skill from job 540`);
    }

    const rRegion = await db.execute(sql`
      UPDATE jobs SET location_region = 'North America' 
      WHERE location_region IN ('United States', 'Canada') AND country_code IN ('US', 'CA')
    `);
    const regionFixed = Number((rRegion as any).rowCount || 0);
    if (regionFixed > 0) {
      console.log(`[DataCleanup] Standardized ${regionFixed} region values to North America`);
    }

    const rMismatch = await db.execute(sql`
      UPDATE jobs SET work_mode = location_type, is_remote = CASE WHEN location_type IN ('remote', 'hybrid') THEN true ELSE false END
      WHERE is_published = true AND is_active = true AND location_type IS NOT NULL AND work_mode IS NOT NULL AND location_type != work_mode
    `);
    const mismatchFixed = Number((rMismatch as any).rowCount || 0);
    if (mismatchFixed > 0) {
      console.log(`[DataCleanup] Fixed ${mismatchFixed} locationType/workMode mismatches`);
    }

    let genericRolesUnpublished = 0;
    let negativeAiUnpublished = 0;
    let nullQualityLowRelUnpublished = 0;

    const publishedJobs = await db.select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      legalRelevanceScore: jobs.legalRelevanceScore,
      qualityScore: jobs.qualityScore,
      aiSummary: jobs.aiSummary,
      isPublished: jobs.isPublished,
    }).from(jobs).where(
      and(eq(jobs.isPublished, true), eq(jobs.isActive, true))
    );

    for (const job of publishedJobs) {
      const relevance = job.legalRelevanceScore ?? 0;
      let shouldUnpublish = false;
      let reason = '';

      if (isGenericBusinessRole(job.title) && relevance < 8) {
        shouldUnpublish = true;
        reason = 'GENERIC_BUSINESS_ROLE';
        genericRolesUnpublished++;
      } else if (hasNegativeAiSignal(job.aiSummary)) {
        shouldUnpublish = true;
        reason = 'AI_FLAGGED_IRRELEVANT';
        negativeAiUnpublished++;
      } else if (job.qualityScore === null && relevance < 8) {
        shouldUnpublish = true;
        reason = 'NULL_QUALITY_LOW_RELEVANCE';
        nullQualityLowRelUnpublished++;
      }

      if (shouldUnpublish) {
        await db.update(jobs).set({
          isPublished: false,
          reviewStatus: 'needs_review',
          pipelineStatus: 'review',
          reviewReasonCode: reason,
        }).where(eq(jobs.id, job.id));
      }
    }

    console.log(`[DataCleanup] Generic business roles unpublished: ${genericRolesUnpublished}`);
    console.log(`[DataCleanup] Negative AI signal unpublished: ${negativeAiUnpublished}`);
    console.log(`[DataCleanup] Null quality/low relevance unpublished: ${nullQualityLowRelUnpublished}`);

    if (!force) {
      await markCleanupComplete(CLEANUP_VERSION);
    }

    const totalChanges = results.unpublishedLowRelevance + results.unpublishedNullQuality +
      results.unpublishedNegativeAi + results.rearchivedResurrected + results.decodedEntities +
      results.skillsNormalized + results.locationTypeFixed + results.locationRegionFixed +
      results.locationStringsFixed + results.titlesFixed + results.unpublishedQuestionable +
      results.careerTrackFixed + results.workModeSynced +
      genericRolesUnpublished + negativeAiUnpublished + nullQualityLowRelUnpublished;

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
