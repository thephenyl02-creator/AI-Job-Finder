import axios from 'axios';
import { db } from '../db';
import { jobs } from '../../shared/schema';
import { eq, sql, and } from 'drizzle-orm';

async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      validateStatus: (status) => status < 400,
    });
    return true;
  } catch {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        validateStatus: (status) => status < 400,
      });
      return true;
    } catch {
      return false;
    }
  }
}

async function revalidateBrokenLinks() {
  const brokenLinkJobs = await db.select({
    id: jobs.id,
    title: jobs.title,
    company: jobs.company,
    applyUrl: jobs.applyUrl,
    qualityScore: jobs.qualityScore,
    legalRelevanceScore: jobs.legalRelevanceScore,
    relevanceConfidence: jobs.relevanceConfidence,
    roleCategory: jobs.roleCategory,
  }).from(jobs).where(
    sql`${jobs.pipelineStatus} = 'ready' AND ${jobs.isPublished} = false AND ${jobs.reviewReasonCode} = 'BROKEN_APPLY_LINK' AND ${jobs.isActive} = true AND ${jobs.jobStatus} = 'open'`
  );

  console.log(`Found ${brokenLinkJobs.length} jobs with broken apply links to re-check`);
  
  let fixed = 0;
  let stillBroken = 0;

  for (const job of brokenLinkJobs) {
    if (!job.applyUrl) { stillBroken++; continue; }
    
    const isWorking = await checkUrl(job.applyUrl);
    
    if (isWorking) {
      const qualityThreshold = (job.legalRelevanceScore ?? 0) >= 7 ? 40 : 50;
      const passesGate = (job.qualityScore ?? 0) >= qualityThreshold
        && (job.legalRelevanceScore ?? 0) >= 6
        && job.roleCategory !== null
        && (job.relevanceConfidence ?? 0) >= 40;
      
      if (passesGate) {
        await db.update(jobs).set({ 
          isPublished: true, 
          reviewReasonCode: null 
        }).where(eq(jobs.id, job.id));
        console.log(`[FIXED] #${job.id} "${job.title}" at ${job.company} - link works, publishing`);
        fixed++;
      } else {
        await db.update(jobs).set({ reviewReasonCode: null }).where(eq(jobs.id, job.id));
        console.log(`[LINK OK] #${job.id} "${job.title}" - link works but doesn't pass quality gate (q=${job.qualityScore}, r=${job.legalRelevanceScore})`);
      }
    } else {
      stillBroken++;
      console.log(`[STILL BROKEN] #${job.id} "${job.title}" at ${job.company}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\nResults: ${fixed} republished, ${stillBroken} still broken, ${brokenLinkJobs.length - fixed - stillBroken} link ok but below gate`);
}

revalidateBrokenLinks()
  .then(() => { console.log('Done!'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
