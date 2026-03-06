import { storage } from '../storage';
import type { InsertJob } from '../../shared/schema';
import axios from 'axios';
import { stripHtml, isRelevantRole } from '../lib/html-utils';

const WORKING_SOURCES = [
  { name: 'Everlaw', type: 'lever', url: 'https://api.lever.co/v0/postings/everlaw' },
  { name: 'NetDocuments', type: 'lever', url: 'https://api.lever.co/v0/postings/netdocuments' },
  { name: 'Mitratech', type: 'lever', url: 'https://api.lever.co/v0/postings/mitratech' },
  { name: 'Brightflag', type: 'lever', url: 'https://api.lever.co/v0/postings/brightflag' },
  { name: 'Axiom', type: 'lever', url: 'https://api.lever.co/v0/postings/axiom' },
  { name: 'Integreon', type: 'lever', url: 'https://api.lever.co/v0/postings/integreon' },
  { name: 'QuisLex', type: 'lever', url: 'https://api.lever.co/v0/postings/quislex' },
  { name: 'Neota Logic', type: 'lever', url: 'https://api.lever.co/v0/postings/neotalogic' },
  { name: 'Factor', type: 'lever', url: 'https://api.lever.co/v0/postings/factorlegal' },
];

interface LeverJob {
  id: string;
  text: string;
  categories: { location?: string; team?: string; commitment?: string };
  description?: string;
  descriptionPlain?: string;
  hostedUrl: string;
  createdAt: number;
}

async function scrapeLever(name: string, url: string): Promise<InsertJob[]> {
  try {
    const res = await axios.get<LeverJob[]>(url, { timeout: 15000 });
    const jobs: InsertJob[] = [];
    
    for (const job of res.data) {
      if (!isRelevantRole(job.text, job.descriptionPlain)) continue;
      
      const descHtml = job.description || '';
      const descPlain = job.descriptionPlain || '';
      const cleanDesc = descHtml ? stripHtml(descHtml) : descPlain;
      
      jobs.push({
        title: job.text,
        company: name,
        companyLogo: `https://www.google.com/s2/favicons?domain=${name.toLowerCase().replace(/[^a-z]/g, '')}.com&sz=128`,
        location: job.categories?.location || 'Remote',
        isRemote: (job.categories?.location || '').toLowerCase().includes('remote'),
        description: cleanDesc,
        applyUrl: job.hostedUrl,
        externalId: `lever-${job.id}`,
        source: 'lever',
        roleCategory: 'Legal Tech Startup Roles',
      });
    }
    
    console.log(`${name}: Found ${res.data.length} jobs, ${jobs.length} legal tech roles`);
    return jobs;
  } catch (e: any) {
    console.log(`${name}: Error - ${e.message}`);
    return [];
  }
}

async function main() {
  console.log('Quick scraper starting...');
  const allJobs: InsertJob[] = [];
  
  for (const source of WORKING_SOURCES) {
    const jobs = await scrapeLever(source.name, source.url);
    allJobs.push(...jobs);
    await new Promise(r => setTimeout(r, 300)); // Small delay between requests
  }
  
  console.log(`\nTotal jobs collected: ${allJobs.length}`);
  
  if (allJobs.length > 0) {
    const { inserted, updated } = await storage.bulkUpsertJobs(allJobs);
    console.log(`Inserted: ${inserted}, Updated: ${updated}`);
  }
  
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
