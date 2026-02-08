import { db } from '../db';
import { jobs } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { cleanJobDescription, isDescriptionFlat } from './description-cleaner';
import { formatFlatDescription } from './description-formatter';

export async function backfillDescriptions(options?: { aiFormat?: boolean }): Promise<{
  cleaned: number;
  aiFormatted: number;
  total: number;
  errors: string[];
}> {
  const aiFormat = options?.aiFormat ?? false;
  const allJobs = await db.select().from(jobs).where(eq(jobs.isActive, true));
  let cleaned = 0;
  let aiFormatted = 0;
  const errors: string[] = [];

  console.log(`[BACKFILL] Processing ${allJobs.length} active jobs...`);

  for (const job of allJobs) {
    if (!job.description) continue;

    try {
      let newDesc = cleanJobDescription(job.description);
      let wasFormatted = false;

      if (aiFormat && isDescriptionFlat(newDesc)) {
        try {
          const formatted = await formatFlatDescription(newDesc);
          if (formatted !== newDesc) {
            newDesc = formatted;
            wasFormatted = true;
            aiFormatted++;
          }
        } catch (err: any) {
          errors.push(`AI format job ${job.id}: ${err.message}`);
        }
      }

      if (newDesc !== job.description || !job.descriptionFormatted) {
        let updateFields: Record<string, any> = {
          description: newDesc,
          descriptionFormatted: true,
        };
        if (job.requirements) {
          updateFields.requirements = cleanJobDescription(job.requirements);
        }
        await db.update(jobs).set(updateFields).where(eq(jobs.id, job.id));
        cleaned++;
      }
    } catch (err: any) {
      errors.push(`Clean job ${job.id}: ${err.message}`);
    }
  }

  console.log(`[BACKFILL] Done: ${cleaned} cleaned, ${aiFormatted} AI-formatted out of ${allJobs.length} total. ${errors.length} errors.`);

  return { cleaned, aiFormatted, total: allJobs.length, errors };
}
