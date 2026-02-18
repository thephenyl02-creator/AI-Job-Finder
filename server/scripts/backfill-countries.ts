import { db } from '../db';
import { jobs } from '@shared/schema';
import { isNull, or, eq } from 'drizzle-orm';
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
    or(isNull(jobs.countryCode), eq(jobs.countryCode, ''))
  );

  if (allJobs.length === 0) {
    console.log(`[Country Backfill] All jobs already have country codes — nothing to do`);
    return { updated: 0, errors: 0, summary: {} };
  }

  console.log(`[Country Backfill] Processing ${allJobs.length} jobs without country codes...`);

  for (const job of allJobs) {
    try {
      const isRemoteFlag = job.isRemote || job.locationType === 'remote';
      const result = normalizeCountry(job.location, isRemoteFlag);

      let workMode = result.workMode;
      if (job.locationType === 'remote' || job.locationType === 'hybrid') {
        workMode = job.locationType as 'remote' | 'hybrid';
      }

      await db.update(jobs).set({
        countryCode: result.countryCode,
        countryName: result.countryName,
        workMode: workMode,
      }).where(eq(jobs.id, job.id));

      summary[result.countryCode] = (summary[result.countryCode] || 0) + 1;
      updated++;
    } catch (err: any) {
      console.error(`[Country Backfill] Error for job ${job.id}:`, err.message);
      errors++;
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
