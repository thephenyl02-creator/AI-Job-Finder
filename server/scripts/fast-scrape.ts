import axios from 'axios';
import { storage } from '../storage';
import type { InsertJob } from '../../shared/schema';
import { stripHtml, isRelevantRole } from '../lib/html-utils';

const GREENHOUSE_SOURCES = [
  { name: 'Everlaw', id: 'everlaw', type: 'legaltech' },
  { name: 'NetDocuments', id: 'netdocuments', type: 'legaltech' },
  { name: 'Mitratech', id: 'mitratech', type: 'legaltech' },
  { name: 'Brightflag', id: 'brightflag', type: 'legaltech' },
  { name: 'Rocket Lawyer', id: 'rocketlawyer', type: 'legaltech' },
  { name: 'Gibson Dunn', id: 'gibsondunn', type: 'lawfirm' },
  { name: 'Legal Services NYC', id: 'legalservicesnyc', type: 'legalaid' },
  { name: 'Anthropic', id: 'anthropic', type: 'legaltech' },
  { name: 'OneTrust', id: 'onetrust', type: 'legaltech' },
  { name: 'Notion', id: 'notion', type: 'legaltech' },
];

async function scrapeGreenhouse(name: string, id: string, orgType: string): Promise<InsertJob[]> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`;
    const res = await axios.get(url, { timeout: 15000 });
    const jobs: InsertJob[] = [];
    
    for (const job of res.data.jobs || []) {
      // For law firms and legal aid orgs, include ALL jobs (any position is relevant for lawyers)
      // For legal tech companies, use the keyword filter
      const isRelevant = isRelevantRole(job.title || '', job.content || '', orgType);
      
      if (!isRelevant) continue;
      
      // Clean up description from HTML
      const rawContent = job.content || '';
      const cleanDescription = stripHtml(rawContent);
      
      // Determine role category based on org type
      let roleCategory = 'Legal Tech Startup Roles';
      if (orgType === 'lawfirm') roleCategory = 'Law Firm Tech & Innovation';
      if (orgType === 'legalaid') roleCategory = 'Legal AI Jobs'; // Public interest law
      
      jobs.push({
        title: job.title || 'Untitled',
        company: name,
        companyLogo: `https://logo.clearbit.com/${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        location: job.location?.name || 'Remote',
        isRemote: (job.location?.name || '').toLowerCase().includes('remote'),
        description: cleanDescription,
        applyUrl: job.absolute_url || '',
        externalId: `gh_${id}_${job.id}`,
        source: 'greenhouse',
        roleCategory: roleCategory,
      });
    }
    
    console.log(`${name}: ${res.data.jobs?.length || 0} jobs, ${jobs.length} included`);
    return jobs;
  } catch (e: any) {
    console.log(`${name}: Error - ${e.message?.slice(0, 50)}`);
    return [];
  }
}

async function main() {
  console.log('Fast scraper starting...\n');
  const allJobs: InsertJob[] = [];
  
  // Run all requests in parallel for speed
  const results = await Promise.allSettled(
    GREENHOUSE_SOURCES.map(s => scrapeGreenhouse(s.name, s.id, s.type))
  );
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value);
    }
  }
  
  console.log(`\nTotal jobs collected: ${allJobs.length}`);
  
  if (allJobs.length > 0) {
    const { inserted, updated } = await storage.bulkUpsertJobs(allJobs);
    console.log(`Database: Inserted ${inserted}, Updated ${updated}`);
  }
  
  // Verify final count
  const finalCount = await storage.getActiveJobs();
  console.log(`Total jobs in database: ${finalCount.length}`);
  
  process.exit(0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
