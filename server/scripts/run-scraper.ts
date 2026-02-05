import { scrapeAllLawFirms } from '../lib/law-firm-scraper';
import { storage } from '../storage';
import type { InsertJob } from '../../shared/schema';

async function main() {
  console.log('Starting scraper...');
  const result = await scrapeAllLawFirms();
  console.log('Scraper completed');
  console.log('Stats:', JSON.stringify(result.stats, null, 2));
  
  // Use bulkUpsertJobs for efficiency
  const jobsToInsert: InsertJob[] = result.jobs.map(job => ({
    title: job.title,
    company: job.company,
    companyLogo: job.companyLogo || null,
    location: job.location || 'Remote',
    isRemote: job.isRemote || false,
    description: job.description || '',
    requirements: job.requirements || null,
    applyUrl: job.applyUrl,
    externalId: job.externalId || null,
    source: job.source || null,
    roleCategory: job.roleCategory || null,
    roleSubcategory: job.roleSubcategory || null,
    seniorityLevel: job.seniorityLevel || null,
    keySkills: job.keySkills || null,
    aiSummary: job.aiSummary || null,
    matchKeywords: job.matchKeywords || null,
  }));
  
  const { inserted, updated } = await storage.bulkUpsertJobs(jobsToInsert);
  console.log(`Done! Inserted: ${inserted}, Updated: ${updated}`);
  process.exit(0);
}

main().catch(console.error);
