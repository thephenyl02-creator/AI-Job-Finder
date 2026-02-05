import { storage } from '../storage';
import type { InsertJob } from '../../shared/schema';
import axios from 'axios';

// Only include companies we know work well
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

function isLegalTechRole(title: string, description: string = ''): boolean {
  const combined = `${title} ${description}`.toLowerCase();
  const keywords = [
    'engineer', 'developer', 'product manager', 'designer', 'data scientist',
    'machine learning', 'ai ', 'artificial intelligence', 'nlp', 'software',
    'technical', 'solutions', 'implementation', 'customer success', 'sales engineer',
    'legal engineer', 'legal operations', 'innovation', 'technology', 'ediscovery',
    'analytics', 'platform', 'api', 'full stack', 'frontend', 'backend', 'devops'
  ];
  const excludeTerms = ['attorney', 'paralegal', 'legal assistant', 'litigation associate'];
  
  if (excludeTerms.some(term => combined.includes(term))) return false;
  return keywords.some(keyword => combined.includes(keyword));
}

interface LeverJob {
  id: string;
  text: string;
  categories: { location?: string; team?: string; commitment?: string };
  descriptionPlain?: string;
  hostedUrl: string;
  createdAt: number;
}

async function scrapeLever(name: string, url: string): Promise<InsertJob[]> {
  try {
    const res = await axios.get<LeverJob[]>(url, { timeout: 15000 });
    const jobs: InsertJob[] = [];
    
    for (const job of res.data) {
      if (!isLegalTechRole(job.text, job.descriptionPlain)) continue;
      
      jobs.push({
        title: job.text,
        company: name,
        companyLogo: `https://logo.clearbit.com/${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        location: job.categories?.location || 'Remote',
        isRemote: (job.categories?.location || '').toLowerCase().includes('remote'),
        description: (job.descriptionPlain || '').slice(0, 2000),
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
