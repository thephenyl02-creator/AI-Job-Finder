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

function isLegalCareerRole(title: string, desc: string = ''): boolean {
  const text = `${title} ${desc}`.toLowerCase();
  
  // Include both tech roles AND legal professional roles
  // This is for people with JD, law degree, or legal experience
  const legalProfessionalKeywords = [
    'attorney', 'lawyer', 'counsel', 'paralegal', 'legal assistant',
    'litigation', 'associate', 'legal operations', 'legal ops',
    'contract', 'compliance', 'regulatory', 'corporate counsel',
    'in-house', 'general counsel', 'legal analyst', 'legal specialist',
    'legal advisor', 'legal consultant', 'jd', 'law clerk', 'legal intern'
  ];
  
  const techRoleKeywords = [
    'engineer', 'developer', 'product', 'designer', 'data', 'ml', 'ai ',
    'machine learning', 'nlp', 'software', 'technical', 'solutions',
    'implementation', 'customer success', 'sales', 'operations',
    'innovation', 'technology', 'ediscovery', 'analytics', 'platform',
    'devops', 'cloud', 'security', 'qa', 'quality', 'ux', 'ui', 'frontend',
    'backend', 'full stack', 'fullstack', 'manager', 'director', 'architect',
    'marketing', 'finance', 'hr', 'people', 'business', 'admin', 'support'
  ];
  
  // Exclude purely administrative or unrelated roles
  const exclude = ['janitor', 'maintenance', 'facilities', 'cafeteria'];
  
  if (exclude.some(e => text.includes(e))) return false;
  
  // Include if it matches legal professional keywords OR tech role keywords
  return legalProfessionalKeywords.some(k => text.includes(k)) || 
         techRoleKeywords.some(k => text.includes(k));
}

// Strip HTML tags and clean up text
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function scrapeGreenhouse(name: string, id: string): Promise<InsertJob[]> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`;
    const res = await axios.get(url, { timeout: 15000 });
    const jobs: InsertJob[] = [];
    
    for (const job of res.data.jobs || []) {
      if (!isLegalCareerRole(job.title || '', job.content || '')) continue;
      
      // Clean up description from HTML
      const rawContent = job.content || '';
      const cleanDescription = stripHtml(rawContent).slice(0, 2000);
      
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
        roleCategory: 'Legal Tech Startup Roles',
      });
    }
    
    console.log(`${name}: ${res.data.jobs?.length || 0} jobs, ${jobs.length} legal/tech roles`);
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
