import axios from 'axios';
import { storage } from '../storage';
import type { InsertJob } from '../../shared/schema';

// Companies confirmed to have working Greenhouse APIs
const GREENHOUSE_SOURCES = [
  { name: 'Everlaw', id: 'everlaw' },
  { name: 'NetDocuments', id: 'netdocuments' },
  { name: 'Mitratech', id: 'mitratech' },
  { name: 'Brightflag', id: 'brightflag' },
  { name: 'Axiom', id: 'axiomlaw' },
  { name: 'QuisLex', id: 'quislex' },
  { name: 'Neota Logic', id: 'neotalogic' },
  { name: 'Factor', id: 'factorlegal' },
  { name: 'Integreon', id: 'integreon' },
  { name: 'Baker McKenzie', id: 'bakermckenzie' },
  { name: 'Sullivan & Cromwell', id: 'sullivancromwell' },
];

function isLegalTechRole(title: string, desc: string = ''): boolean {
  const text = `${title} ${desc}`.toLowerCase();
  const keywords = [
    'engineer', 'developer', 'product', 'designer', 'data', 'ml', 'ai ',
    'machine learning', 'nlp', 'software', 'technical', 'solutions',
    'implementation', 'customer success', 'sales engineer', 'operations',
    'innovation', 'technology', 'ediscovery', 'analytics', 'platform',
    'devops', 'cloud', 'security', 'qa', 'quality', 'ux', 'ui', 'frontend',
    'backend', 'full stack', 'fullstack', 'manager', 'director', 'architect',
    'marketing', 'finance', 'hr', 'people', 'business', 'admin', 'support'
  ];
  const exclude = ['attorney', 'paralegal', 'legal assistant', 'litigation associate', 'counsel'];
  
  if (exclude.some(e => text.includes(e))) return false;
  return keywords.some(k => text.includes(k));
}

async function scrapeGreenhouse(name: string, id: string): Promise<InsertJob[]> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${id}/jobs`;
    const res = await axios.get(url, { timeout: 15000 });
    const jobs: InsertJob[] = [];
    
    for (const job of res.data.jobs || []) {
      if (!isLegalTechRole(job.title || '')) continue;
      
      jobs.push({
        title: job.title || 'Untitled',
        company: name,
        companyLogo: `https://logo.clearbit.com/${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        location: job.location?.name || 'Remote',
        isRemote: (job.location?.name || '').toLowerCase().includes('remote'),
        description: (job.content || '').slice(0, 2000),
        applyUrl: job.absolute_url || '',
        externalId: `gh_${id}_${job.id}`,
        source: 'greenhouse',
        roleCategory: 'Legal Tech Startup Roles',
      });
    }
    
    console.log(`${name}: ${res.data.jobs?.length || 0} jobs, ${jobs.length} tech roles`);
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
    GREENHOUSE_SOURCES.map(s => scrapeGreenhouse(s.name, s.id))
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
