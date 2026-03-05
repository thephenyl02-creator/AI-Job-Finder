import { storage } from "../storage";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Job, JobAlert, InsertNotification } from "@shared/schema";
import { sendEmail, buildEmailTemplate, buildAlertEmailContent } from "./email-service";

function jobMatchesAlert(job: Job, alert: JobAlert): boolean {
  if (alert.isRemoteOnly) {
    const isRemoteJob = job.isRemote || job.locationType === 'remote';
    if (!isRemoteJob) return false;
  }

  if (alert.categories && alert.categories.length > 0) {
    const jobCategory = (job.roleCategory || "").toLowerCase();
    const matches = alert.categories.some(
      (cat) => jobCategory.includes(cat.toLowerCase())
    );
    if (!matches) return false;
  }

  if (alert.seniorityLevels && alert.seniorityLevels.length > 0) {
    const jobSeniority = (job.seniorityLevel || "").toLowerCase();
    if (!jobSeniority) return false;
    const matches = alert.seniorityLevels.some(
      (level) => jobSeniority === level.toLowerCase()
    );
    if (!matches) return false;
  }

  if (alert.keywords && alert.keywords.length > 0) {
    const searchText = [
      job.title,
      job.description,
      job.company,
      job.roleSubcategory,
      ...(job.keySkills || []),
      ...(job.matchKeywords || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matches = alert.keywords.some((kw) =>
      searchText.includes(kw.toLowerCase())
    );
    if (!matches) return false;
  }

  return true;
}

export async function matchNewJobsAgainstAlerts(
  newJobs: Job[]
): Promise<number> {
  if (newJobs.length === 0) return 0;

  const activeAlerts = await storage.getActiveAlerts();
  if (activeAlerts.length === 0) return 0;

  const notificationsToCreate: InsertNotification[] = [];

  for (const job of newJobs) {
    for (const alert of activeAlerts) {
      if (jobMatchesAlert(job, alert)) {
        notificationsToCreate.push({
          userId: alert.userId,
          alertId: alert.id,
          jobId: job.id,
          title: `New match: ${job.title}`,
          message: `${job.company} posted "${job.title}"${job.location ? ` in ${job.location}` : ""}${(job.isRemote || job.locationType === 'remote') ? " (Remote)" : job.locationType === 'hybrid' ? " (Hybrid)" : ""}. Matched your "${alert.name}" alert.`,
          isRead: false,
        });
      }
    }
  }

  const unique = new Map<string, InsertNotification>();
  for (const n of notificationsToCreate) {
    const key = `${n.userId}_${n.jobId}`;
    if (!unique.has(key)) {
      unique.set(key, n);
    }
  }

  const deduped = Array.from(unique.values());
  if (deduped.length > 0) {
    await storage.createNotifications(deduped);
    console.log(
      `Created ${deduped.length} notifications for ${newJobs.length} new jobs`
    );

    const userJobMap = new Map<string, { id: number; title: string; company: string; location?: string | null }[]>();
    for (const n of deduped) {
      if (!n.jobId) continue;
      const list = userJobMap.get(n.userId) || [];
      const job = newJobs.find(j => j.id === n.jobId);
      if (job) {
        list.push({ id: job.id, title: job.title, company: job.company, location: job.location });
        userJobMap.set(n.userId, list);
      }
    }

    for (const [userId, matchedJobs] of Array.from(userJobMap)) {
      try {
        const prefs = await storage.getEmailPreferences(userId);
        if (!prefs?.alertEmails) continue;

        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user?.email) continue;

        const baseUrl = process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : "https://lawjobs.co";
        const unsubscribeUrl = prefs.unsubscribeToken
          ? `${baseUrl}/api/unsubscribe/${prefs.unsubscribeToken}`
          : undefined;

        const content = buildAlertEmailContent(matchedJobs);
        const html = buildEmailTemplate(content, unsubscribeUrl);
        await sendEmail(
          user.email,
          `${matchedJobs.length} new job${matchedJobs.length !== 1 ? "s" : ""} matched your alerts`,
          html
        );
      } catch (err: any) {
        console.error(`[ALERT EMAIL] Failed for user ${userId}:`, err.message);
      }
    }
  }

  return deduped.length;
}

export async function matchSingleJobAgainstAlerts(job: Job): Promise<number> {
  return matchNewJobsAgainstAlerts([job]);
}
