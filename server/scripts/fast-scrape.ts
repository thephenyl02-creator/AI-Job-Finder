import axios from 'axios';
import { storage } from '../storage';
import type { InsertJob } from '../../shared/schema';

// Companies confirmed to have working Greenhouse APIs
const GREENHOUSE_SOURCES = [
  // Legal Tech Companies
  { name: 'Everlaw', id: 'everlaw', type: 'legaltech' },
  { name: 'NetDocuments', id: 'netdocuments', type: 'legaltech' },
  { name: 'Mitratech', id: 'mitratech', type: 'legaltech' },
  { name: 'Brightflag', id: 'brightflag', type: 'legaltech' },
  { name: 'Rocket Lawyer', id: 'rocketlawyer', type: 'legaltech' },
  
  // Law Firms (include ALL jobs - any role at a law firm is relevant)
  { name: 'Gibson Dunn', id: 'gibsondunn', type: 'lawfirm' },
  
  // Legal Services Organizations  
  { name: 'Legal Services NYC', id: 'legalservicesnyc', type: 'legalaid' },
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

// Strip HTML tags and decode all HTML entities
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))  // Decode numeric entities
    .replace(/\s+/g, ' ')
    .trim();
}

async function scrapeGreenhouse(name: string, id: string, orgType: string): Promise<InsertJob[]> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`;
    const res = await axios.get(url, { timeout: 15000 });
    const jobs: InsertJob[] = [];
    
    for (const job of res.data.jobs || []) {
      // For law firms and legal aid orgs, include ALL jobs (any position is relevant for lawyers)
      // For legal tech companies, use the keyword filter
      const isRelevant = (orgType === 'lawfirm' || orgType === 'legalaid') 
        ? true 
        : isLegalCareerRole(job.title || '', job.content || '');
      
      if (!isRelevant) continue;
      
      // Clean up description from HTML
      const rawContent = job.content || '';
      const cleanDescription = stripHtml(rawContent).slice(0, 2000);
      
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
