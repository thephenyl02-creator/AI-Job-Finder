import { db } from '../db';
import { jobs } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { normalizeLocation } from './location-normalizer';

export async function migrateLocations(): Promise<{ updated: number; errors: number }> {
  let updated = 0;
  let errors = 0;

  const allJobs = await db.select({
    id: jobs.id,
    location: jobs.location,
    locationType: jobs.locationType,
    isRemote: jobs.isRemote,
    company: jobs.company,
    locationRegion: jobs.locationRegion,
  }).from(jobs);

  console.log(`[Location Migration] Processing ${allJobs.length} jobs...`);

  for (const job of allJobs) {
    try {
      const normalized = normalizeLocation(job.location, job.company);

      const newLocation = normalized.display || null;
      const newLocationType = job.locationType || normalized.locationType || null;
      const newIsRemote = job.locationType === 'remote' || job.locationType === 'hybrid' || normalized.isRemote || job.isRemote || false;
      const newRegion = normalized.region || null;

      const locationChanged = newLocation !== job.location;
      const typeChanged = newLocationType !== job.locationType;
      const remoteChanged = newIsRemote !== job.isRemote;
      const regionChanged = newRegion !== job.locationRegion;

      if (locationChanged || typeChanged || remoteChanged || regionChanged) {
        await db.update(jobs).set({
          location: newLocation,
          locationType: newLocationType,
          isRemote: newIsRemote,
          locationRegion: newRegion,
        }).where(eq(jobs.id, job.id));
        updated++;
      }
    } catch (err: any) {
      console.error(`[Location Migration] Error for job ${job.id}:`, err.message);
      errors++;
    }
  }

  console.log(`[Location Migration] Complete. Updated: ${updated}, Errors: ${errors}`);
  return { updated, errors };
}
