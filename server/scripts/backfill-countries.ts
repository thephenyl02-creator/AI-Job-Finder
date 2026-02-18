import { db } from '../db';
import { jobs } from '@shared/schema';
import { isNull, or, eq, inArray } from 'drizzle-orm';
import { normalizeCountry } from '../lib/country-normalizer';

export async function backfillCountryCodes(): Promise<{ updated: number; errors: number; summary: Record<string, number> }> {
  let updated = 0;
  let errors = 0;
  const summary: Record<string, number> = {};

  const allJobs = await db.select({
    id: jobs.id,
    location: jobs.location,
    isRemote: jobs.isRemote,
    locationType: jobs.locationType,
    countryCode: jobs.countryCode,
  }).from(jobs).where(
    or(isNull(jobs.countryCode), eq(jobs.countryCode, ''), eq(jobs.countryCode, 'UN'))
  );

  if (allJobs.length === 0) {
    console.log(`[Country Backfill] All jobs already have country codes — nothing to do`);
    return { updated: 0, errors: 0, summary: {} };
  }

  console.log(`[Country Backfill] Processing ${allJobs.length} jobs...`);

  const batches: Record<string, { countryCode: string; countryName: string; workMode: string; ids: number[] }> = {};

  for (const job of allJobs) {
    try {
      const isRemoteFlag = job.isRemote || job.locationType === 'remote';
      const result = normalizeCountry(job.location, isRemoteFlag);

      let workMode = result.workMode;
      if (job.locationType === 'remote' || job.locationType === 'hybrid') {
        workMode = job.locationType as 'remote' | 'hybrid';
      }

      const key = `${result.countryCode}|${result.countryName}|${workMode}`;
      if (!batches[key]) {
        batches[key] = { countryCode: result.countryCode, countryName: result.countryName, workMode, ids: [] };
      }
      batches[key].ids.push(job.id);

      summary[result.countryCode] = (summary[result.countryCode] || 0) + 1;
      updated++;
    } catch (err: any) {
      console.error(`[Country Backfill] Error normalizing job ${job.id}:`, err.message);
      errors++;
    }
  }

  for (const batch of Object.values(batches)) {
    try {
      await db.update(jobs).set({
        countryCode: batch.countryCode,
        countryName: batch.countryName,
        workMode: batch.workMode,
      }).where(inArray(jobs.id, batch.ids));
    } catch (err: any) {
      console.error(`[Country Backfill] Batch update error for ${batch.countryCode}:`, err.message);
      errors += batch.ids.length;
      updated -= batch.ids.length;
    }
  }

  console.log(`[Country Backfill] Complete. Updated: ${updated}, Errors: ${errors}`);
  console.log(`[Country Backfill] Distribution:`, JSON.stringify(summary, null, 2));
  return { updated, errors, summary };
}

const isDirectRun = process.argv[1]?.includes('backfill-countries');
if (isDirectRun) {
  backfillCountryCodes().then((result) => {
    console.log('Backfill result:', result);
    process.exit(0);
  }).catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
}
