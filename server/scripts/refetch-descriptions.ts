import axios from 'axios';
import { db } from '../db';
import { jobs } from '../../shared/schema';
import { eq, sql, and, lt } from 'drizzle-orm';
import { stripHtml } from '../lib/html-utils';

const GREENHOUSE_SOURCES = [
  { name: 'Everlaw', id: 'everlaw' },
  { name: 'NetDocuments', id: 'netdocuments' },
  { name: 'Mitratech', id: 'mitratech' },
  { name: 'Brightflag', id: 'brightflag' },
  { name: 'Rocket Lawyer', id: 'rocketlawyer' },
  { name: 'Gibson Dunn', id: 'gibsondunn' },
  { name: 'Legal Services NYC', id: 'legalservicesnyc' },
  { name: 'Axiom', id: 'axiom' },
  { name: 'Anthropic', id: 'anthropic' },
  { name: 'OneTrust', id: 'onetrust' },
  { name: 'Notion', id: 'notion' },
];

const LEVER_SOURCES = [
  { name: 'Factor', id: 'factorlegal' },
  { name: 'NetDocuments', id: 'netdocuments' },
  { name: 'Mitratech', id: 'mitratech' },
  { name: 'Brightflag', id: 'brightflag' },
  { name: 'Axiom', id: 'axiom' },
  { name: 'Integreon', id: 'integreon' },
  { name: 'QuisLex', id: 'quislex' },
  { name: 'Neota Logic', id: 'neotalogic' },
];

async function main() {
  console.log('Re-fetching full job descriptions for ALL sources...\n');
  
  let totalUpdated = 0;
  let totalChecked = 0;
  
  for (const company of GREENHOUSE_SOURCES) {
    try {
      console.log(`[Greenhouse] ${company.name} (${company.id})...`);
      
      const url = `https://boards-api.greenhouse.io/v1/boards/${company.id}/jobs?content=true`;
      const res = await axios.get(url, { timeout: 15000 });
      
      const apiJobs = res.data.jobs || [];
      console.log(`  Found ${apiJobs.length} jobs from API`);
      
      const contentMap = new Map<string, string>();
      for (const job of apiJobs) {
        const externalId = `gh_${company.id}_${job.id}`;
        if (job.content) {
          contentMap.set(externalId, stripHtml(job.content));
        }
      }
      
      const dbJobs = await db.select({ id: jobs.id, externalId: jobs.externalId, description: jobs.description })
        .from(jobs)
        .where(sql`${jobs.company} = ${company.name} AND ${jobs.source} = 'greenhouse'`);
      
      let updated = 0;
      for (const dbJob of dbJobs) {
        if (!dbJob.externalId) continue;
        totalChecked++;
        
        const fullDescription = contentMap.get(dbJob.externalId);
        if (fullDescription && fullDescription.length > (dbJob.description?.length || 0)) {
          const gain = fullDescription.length - (dbJob.description?.length || 0);
          await db.update(jobs)
            .set({ description: fullDescription })
            .where(eq(jobs.id, dbJob.id));
          updated++;
          console.log(`  [${dbJob.id}] +${gain} chars`);
        }
      }
      
      console.log(`  Updated ${updated}/${dbJobs.length} jobs`);
      totalUpdated += updated;
      
    } catch (error: any) {
      console.error(`  Error for ${company.name}: ${error.message}`);
    }
  }
  
  for (const company of LEVER_SOURCES) {
    try {
      console.log(`[Lever] ${company.name} (${company.id})...`);
      
      const url = `https://api.lever.co/v0/postings/${company.id}`;
      const res = await axios.get(url, { timeout: 15000 });
      
      const apiJobs = res.data || [];
      console.log(`  Found ${apiJobs.length} jobs from API`);
      
      const contentMap = new Map<string, string>();
      for (const job of apiJobs) {
        const descHtml = job.description || '';
        const descPlain = job.descriptionPlain || '';
        const cleanDesc = descHtml ? stripHtml(descHtml) : (descPlain ? stripHtml(descPlain) : '');
        if (cleanDesc) {
          contentMap.set(`lever-${job.id}`, cleanDesc);
          contentMap.set(`lever_${company.id}_${job.id}`, cleanDesc);
        }
      }
      
      const dbJobs = await db.select({ id: jobs.id, externalId: jobs.externalId, description: jobs.description })
        .from(jobs)
        .where(sql`${jobs.company} = ${company.name} AND ${jobs.source} = 'lever'`);
      
      let updated = 0;
      for (const dbJob of dbJobs) {
        if (!dbJob.externalId) continue;
        totalChecked++;
        
        const fullDescription = contentMap.get(dbJob.externalId);
        if (fullDescription && fullDescription.length > (dbJob.description?.length || 0)) {
          const gain = fullDescription.length - (dbJob.description?.length || 0);
          await db.update(jobs)
            .set({ description: fullDescription })
            .where(eq(jobs.id, dbJob.id));
          updated++;
          console.log(`  [${dbJob.id}] +${gain} chars`);
        }
      }
      
      console.log(`  Updated ${updated}/${dbJobs.length} jobs`);
      totalUpdated += updated;
      
    } catch (error: any) {
      console.error(`  Error for ${company.name}: ${error.message}`);
    }
  }
  
  console.log(`\nAlso fixing YC Greenhouse jobs...`);
  const ycGhJobs = await db.select({ id: jobs.id, externalId: jobs.externalId, description: jobs.description, applyUrl: jobs.applyUrl })
    .from(jobs)
    .where(sql`${jobs.source} = 'yc_greenhouse' AND length(${jobs.description}) < 2100`);
  
  console.log(`  Found ${ycGhJobs.length} potentially truncated YC Greenhouse jobs`);
  
  for (const dbJob of ycGhJobs) {
    try {
      if (!dbJob.applyUrl) continue;
      const urlMatch = dbJob.applyUrl.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/);
      if (!urlMatch) continue;
      
      const [, boardSlug, jobId] = urlMatch;
      const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardSlug}/jobs/${jobId}`;
      const res = await axios.get(apiUrl, { timeout: 10000 });
      const content = res.data.content;
      if (!content) continue;
      
      const fullDescription = stripHtml(content);
      if (fullDescription.length > (dbJob.description?.length || 0)) {
        const gain = fullDescription.length - (dbJob.description?.length || 0);
        await db.update(jobs)
          .set({ description: fullDescription })
          .where(eq(jobs.id, dbJob.id));
        totalUpdated++;
        console.log(`  [${dbJob.id}] +${gain} chars`);
      }
      totalChecked++;
      
      await new Promise(r => setTimeout(r, 200));
    } catch (error: any) {
      // Silently skip individual failures
    }
  }
  
  console.log(`\nDone! Checked ${totalChecked} jobs, updated ${totalUpdated} with full descriptions.`);
  process.exit(0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
