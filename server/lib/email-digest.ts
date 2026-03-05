import { storage } from "../storage";
import { db } from "../db";
import { jobs, emailPreferences, users } from "@shared/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { sendEmail, buildEmailTemplate, buildDigestContent } from "./email-service";

const BATCH_SIZE = 50;
const DELAY_BETWEEN_SENDS_MS = 500;

export async function generateWeeklyDigest(userId: string): Promise<{ subject: string; html: string } | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const persona = await storage.getUserPersona(userId);
  const topCategories = persona?.topCategories || [];

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const categoryConditions = [
    eq(jobs.isPublished, true),
    eq(jobs.isActive, true),
    eq(jobs.pipelineStatus, "ready"),
    eq(jobs.jobStatus, "open"),
    gte(jobs.postedDate, oneWeekAgo),
  ];

  if (topCategories.length > 0) {
    const orClauses = topCategories.map(
      (cat) => sql`${jobs.roleCategory} = ${cat}`
    );
    categoryConditions.push(sql`(${sql.join(orClauses, sql` OR `)})`);
  }

  const newJobsInCategories = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(jobs)
    .where(and(...categoryConditions));
  const newJobsCount = Number(newJobsInCategories[0]?.cnt || 0);

  const topJobs = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      roleCategory: jobs.roleCategory,
      legalRelevanceScore: jobs.legalRelevanceScore,
    })
    .from(jobs)
    .where(and(...categoryConditions))
    .orderBy(desc(jobs.legalRelevanceScore), desc(jobs.postedDate))
    .limit(5);

  let pipelineSummary: string | undefined;
  try {
    const apps = await storage.getUserApplications(userId);
    if (apps.length > 0) {
      const applied = apps.filter((a) => a.status === "applied").length;
      const interviewing = apps.filter((a) => a.status === "interviewing").length;
      const parts: string[] = [];
      if (applied > 0) parts.push(`${applied} applied`);
      if (interviewing > 0) parts.push(`${interviewing} interviewing`);
      if (parts.length > 0) {
        pipelineSummary = `Your pipeline: ${parts.join(", ")}`;
      }
    }
  } catch {}

  let marketPulse: { totalJobs: number; trendingSkill: string | null } | undefined;
  try {
    const pulse = await storage.getMarketPulse(topCategories[0]);
    marketPulse = {
      totalJobs: pulse.totalJobs,
      trendingSkill: pulse.trendingSkill?.name || null,
    };
  } catch {}

  const prefs = await storage.getEmailPreferences(userId);
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://lawjobs.co";
  const unsubscribeUrl = prefs?.unsubscribeToken
    ? `${baseUrl}/api/unsubscribe/${prefs.unsubscribeToken}`
    : undefined;

  const firstName = user.firstName || "there";
  const content = buildDigestContent({
    greeting: `Hi ${firstName},`,
    newJobsCount,
    topJobs: topJobs.map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      category: j.roleCategory || "Legal Tech",
    })),
    pipelineSummary,
    marketPulse,
  });

  return {
    subject: newJobsCount > 0
      ? `${newJobsCount} new legal tech roles this week`
      : "Your weekly legal tech careers update",
    html: buildEmailTemplate(content, unsubscribeUrl),
  };
}

export async function runWeeklyDigestBatch(): Promise<{ sent: number; failed: number; skipped: number }> {
  console.log("[DIGEST] Starting weekly digest batch...");

  const usersForDigest = await storage.getUsersForWeeklyDigest();
  console.log(`[DIGEST] Found ${usersForDigest.length} users opted in for weekly digest`);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < usersForDigest.length && i < BATCH_SIZE; i++) {
    const userPref = usersForDigest[i];

    try {
      const [user] = await db.select().from(users).where(eq(users.id, userPref.userId)).limit(1);
      if (!user?.email) {
        skipped++;
        continue;
      }

      const digest = await generateWeeklyDigest(userPref.userId);
      if (!digest) {
        skipped++;
        continue;
      }

      const success = await sendEmail(user.email, digest.subject, digest.html);
      if (success) {
        sent++;
        await db
          .update(emailPreferences)
          .set({ lastDigestSentAt: new Date(), updatedAt: new Date() })
          .where(eq(emailPreferences.userId, userPref.userId));
      } else {
        failed++;
      }
    } catch (err: any) {
      console.error(`[DIGEST] Error for user ${userPref.userId}:`, err.message);
      failed++;
    }

    if (i < usersForDigest.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_SENDS_MS));
    }
  }

  console.log(`[DIGEST] Batch complete: ${sent} sent, ${failed} failed, ${skipped} skipped`);
  return { sent, failed, skipped };
}
