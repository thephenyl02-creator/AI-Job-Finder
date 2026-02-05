import axios from 'axios';
import { storage } from '../storage';
import { db } from '../db';
import { jobs } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

const COMPANIES_TO_REFETCH = [
  { name: 'Mitratech', id: 'mitratech' },
  { name: 'Everlaw', id: 'everlaw' },
  { name: 'NetDocuments', id: 'netdocuments' },
  { name: 'Axiom', id: 'axiom' },
  { name: 'Brightflag', id: 'brightflag' },
];

function stripHtml(html: string): string {
  let decoded = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
  
  decoded = decoded.replace(/<br\s*\/?>/gi, '\n');
  decoded = decoded.replace(/<\/p>/gi, '\n\n');
  decoded = decoded.replace(/<\/li>/gi, '\n');
  decoded = decoded.replace(/<li[^>]*>/gi, '- ');
  decoded = decoded.replace(/<\/h[1-6]>/gi, '\n\n');
  decoded = decoded.replace(/<[^>]*>/g, ' ');
  decoded = decoded.replace(/[ \t]+/g, ' ');
  decoded = decoded.replace(/\n /g, '\n');
  decoded = decoded.replace(/\n{3,}/g, '\n\n');
  return decoded.trim();
}

async function main() {
  console.log('Re-fetching full job descriptions from Greenhouse...\n');
  
  let totalUpdated = 0;
  
  for (const company of COMPANIES_TO_REFETCH) {
    try {
      console.log(`Fetching ${company.name} (${company.id})...`);
      
      const url = `https://boards-api.greenhouse.io/v1/boards/${company.id}/jobs?content=true`;
      const res = await axios.get(url, { timeout: 15000 });
      
      const apiJobs = res.data.jobs || [];
      console.log(`  Found ${apiJobs.length} jobs from API`);
      
      const contentMap = new Map<string, string>();
      for (const job of apiJobs) {
        const externalId = `gh_${company.id}_${job.id}`;
        if (job.content) {
          contentMap.set(externalId, stripHtml(job.content).slice(0, 10000));
        }
      }
      
      const dbJobs = await db.select({ id: jobs.id, externalId: jobs.externalId, description: jobs.description })
        .from(jobs)
        .where(sql`${jobs.company} = ${company.name} AND ${jobs.source} = 'greenhouse'`);
      
      let updated = 0;
      for (const dbJob of dbJobs) {
        if (!dbJob.externalId) continue;
        
        const fullDescription = contentMap.get(dbJob.externalId);
        if (fullDescription && fullDescription.length > (dbJob.description?.length || 0)) {
          await db.update(jobs)
            .set({ description: fullDescription })
            .where(eq(jobs.id, dbJob.id));
          updated++;
        }
      }
      
      console.log(`  Updated ${updated}/${dbJobs.length} jobs with full descriptions`);
      totalUpdated += updated;
      
    } catch (error: any) {
      console.error(`  Error for ${company.name}: ${error.message}`);
    }
  }
  
  console.log(`\nDone! Updated ${totalUpdated} jobs total.`);
  process.exit(0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
