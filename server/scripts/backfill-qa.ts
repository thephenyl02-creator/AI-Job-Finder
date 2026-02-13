import { db } from '../db';
import { jobs } from '@shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { parseDescription } from '../lib/description-parser';
import { enforceJobDefaults, enforceStructuredDefaults } from '../lib/job-defaults';
import { runQAChecks } from '../lib/job-qa';
import type { StructuredDescription } from '@shared/schema';

async function backfillQA() {
  console.log('[Backfill] Starting QA backfill for published jobs...');

  const allJobs = await db.select().from(jobs).where(
    and(eq(jobs.isPublished, true), eq(jobs.isActive, true))
  );

  console.log(`[Backfill] Found ${allJobs.length} published+active jobs to process`);

  let updated = 0;
  let skipped = 0;
  let defaultsFixed = 0;
  const qaSummary = { passed: 0, needs_review: 0, failed: 0 };

  for (const job of allJobs) {
    const sd = job.structuredDescription as StructuredDescription | null;
    let needsUpdate = false;
    const updates: Record<string, unknown> = {};

    const enforced = enforceJobDefaults(job);
    const arrayFields = ['keySkills', 'matchKeywords', 'aiResponsibilities', 'aiQualifications', 'aiNiceToHaves', 'secondaryTags'] as const;
    for (const field of arrayFields) {
      if (job[field] == null) {
        (updates as any)[field] = enforced[field];
        needsUpdate = true;
        defaultsFixed++;
      }
    }

    const stringFields = ['aiSummary', 'roleCategory', 'roleSubcategory', 'seniorityLevel', 'experienceText', 'whyThisFitsLawyers'] as const;
    for (const field of stringFields) {
      if (job[field] == null) {
        (updates as any)[field] = enforced[field];
        needsUpdate = true;
        defaultsFixed++;
      }
    }

    if (!sd || (!sd.summary && (!sd.responsibilities || sd.responsibilities.length === 0))) {
      const rawText = job.description || '';
      if (rawText.length > 50) {
        const parsed = parseDescription(rawText, job.title || '', job.company || '');
        const existing = (sd || {}) as Partial<StructuredDescription>;
        const merged: StructuredDescription = enforceStructuredDefaults({
          ...existing,
          summary: existing.summary || parsed.summary,
          responsibilities: (existing.responsibilities && existing.responsibilities.length > 0) ? existing.responsibilities : parsed.responsibilities,
          minimumQualifications: (existing.minimumQualifications && existing.minimumQualifications.length > 0) ? existing.minimumQualifications : parsed.minimumQualifications,
          preferredQualifications: (existing.preferredQualifications && existing.preferredQualifications.length > 0) ? existing.preferredQualifications : parsed.preferredQualifications,
          skillsRequired: (existing.skillsRequired && existing.skillsRequired.length > 0) ? existing.skillsRequired : parsed.coreSkills,
        });
        updates.structuredDescription = merged;
        needsUpdate = true;
      }
    } else if (sd) {
      const cleaned = enforceStructuredDefaults(sd);
      const sdJson = JSON.stringify(sd);
      const cleanedJson = JSON.stringify(cleaned);
      if (sdJson !== cleanedJson) {
        updates.structuredDescription = cleaned;
        needsUpdate = true;
      }
    }

    const qaResult = runQAChecks({ ...job, ...updates });
    qaSummary[qaResult.qaStatus]++;

    updates.qaStatus = qaResult.qaStatus;
    updates.qaErrors = qaResult.errors;
    updates.qaWarnings = qaResult.warnings;
    updates.lawyerFirstScore = qaResult.lawyerFirstScore;
    updates.qaExcludeReason = qaResult.excludeReason;
    updates.qaCheckedAt = new Date();
    needsUpdate = true;

    if (needsUpdate) {
      await db.update(jobs).set(updates).where(eq(jobs.id, job.id));
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`[Backfill] Complete.`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (no changes): ${skipped}`);
  console.log(`  Default fixes: ${defaultsFixed}`);
  console.log(`  QA Results: passed=${qaSummary.passed}, needs_review=${qaSummary.needs_review}, failed=${qaSummary.failed}`);
}

backfillQA()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Backfill] Error:', err);
    process.exit(1);
  });
