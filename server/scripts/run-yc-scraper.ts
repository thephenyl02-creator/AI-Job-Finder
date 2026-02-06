import axios from 'axios';
import { transformToJobSchema, isLegalTechRole } from '../lib/law-firm-scraper';
import { categorizeJob } from '../lib/job-categorizer';
import { LAW_FIRMS_AND_COMPANIES } from '../lib/law-firms-list';
import { storage } from '../storage';
import { matchNewJobsAgainstAlerts } from '../lib/alert-matcher';
import type { InsertJob } from '@shared/schema';

const YC_API_TAGS = [
  'https://yc-oss.github.io/api/tags/legaltech.json',
  'https://yc-oss.github.io/api/tags/legal.json',
  'https://yc-oss.github.io/api/tags/regtech.json',
];

const COMPANY_BLOCKLIST = new Set([
  'spire', 'cognition', 'pointone', 'point one',
]);

function isBlockedCompany(name: string, slug: string, description: string): boolean {
  const n = name.toLowerCase();
  const d = (description || '').toLowerCase();
  if (COMPANY_BLOCKLIST.has(n.replace(/[^a-z0-9]/g, '')) || COMPANY_BLOCKLIST.has(slug)) return true;

  const nonLegalIndicators = [
    'satellite', 'spacecraft', 'space data', 'weather data',
    'autonomous driving', 'self-driving', 'robotics',
    'cryptocurrency exchange', 'crypto trading',
    'game engine', 'video game', 'gaming platform',
  ];
  if (nonLegalIndicators.some(ind => d.includes(ind))) return true;

  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractDomain(website: string): string {
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    return url.hostname.replace('www.', '');
  } catch { return ''; }
}

function generateSlugs(name: string, slug: string, website: string): string[] {
  const domain = extractDomain(website);
  const domainBase = domain.split('.')[0];
  const nameNoSpaces = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameDashed = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const firstWord = name.toLowerCase().split(/\s+/)[0]?.replace(/[^a-z0-9]/g, '') || '';
  const slugs = new Set([domainBase, nameNoSpaces, nameDashed, slug, firstWord]);
  slugs.delete('');
  return Array.from(slugs);
}

async function tryATS(slugs: string[]): Promise<{ type: string; slug: string; jobs: any[] } | null> {
  const results = await Promise.allSettled([
    ...slugs.map(async (s) => {
      const res = await axios.get(`https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)' } });
      if (res.data?.jobs?.length > 0) return { type: 'greenhouse', slug: s, jobs: res.data.jobs };
      return null;
    }),
    ...slugs.map(async (s) => {
      const res = await axios.get(`https://api.lever.co/v0/postings/${s}`, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)' } });
      if (Array.isArray(res.data) && res.data.length > 0) return { type: 'lever', slug: s, jobs: res.data };
      return null;
    }),
    ...slugs.map(async (s) => {
      const res = await axios.get(`https://api.ashbyhq.com/posting-api/job-board/${s}`, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)', 'Accept': 'application/json' } });
      if (res.data?.jobs?.length > 0) return { type: 'ashby', slug: s, jobs: res.data.jobs };
      return null;
    }),
  ]);

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) return r.value;
  }
  return null;
}

async function main() {
  const phase = process.argv[2] || 'scrape';

  if (phase === 'categorize') {
    console.log('=== Phase 2: AI Categorization of uncategorized YC jobs ===\n');
    const allJobs = await storage.getJobs();
    const ycJobs = allJobs.filter((j: any) => j.source?.startsWith('yc_') && !j.roleCategory);
    console.log(`Found ${ycJobs.length} uncategorized YC jobs`);
    
    let count = 0;
    for (const job of ycJobs) {
      try {
        const cat = await categorizeJob(job.title, job.description || '', job.company);
        await storage.updateJob(job.id, {
          roleCategory: cat.category,
          roleSubcategory: cat.subcategory,
          seniorityLevel: cat.seniorityLevel,
          keySkills: cat.keySkills,
          aiSummary: cat.aiSummary,
          matchKeywords: cat.matchKeywords,
        });
        count++;
        process.stdout.write(`\r  Categorized ${count}/${ycJobs.length}: ${job.title.substring(0, 50)}`);
        await delay(300);
      } catch (err: any) {
        console.log(`\n  Error categorizing ${job.title}: ${err.message}`);
      }
    }
    console.log(`\n\nDone! Categorized ${count} jobs.`);
    process.exit(0);
    return;
  }

  console.log('=== Phase 1: YC Legal Tech Job Discovery & Scraping ===\n');

  const existingNames = new Set(
    LAW_FIRMS_AND_COMPANIES.map(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );

  const allCompanies = new Map<number, any>();
  for (const tagUrl of YC_API_TAGS) {
    try {
      const res = await axios.get(tagUrl, { timeout: 15000 });
      for (const c of res.data) {
        if (!allCompanies.has(c.id)) allCompanies.set(c.id, c);
      }
    } catch (e: any) {
      console.error(`Failed to fetch ${tagUrl}: ${e.message}`);
    }
  }

  const companies = Array.from(allCompanies.values()).filter((c: any) => c.status === 'Active');
  console.log(`Found ${companies.length} active YC legal tech companies\n`);

  const allJobs: InsertJob[] = [];
  const successCompanies: string[] = [];
  let skippedCount = 0;
  let noAtsCount = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    const nameNorm = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (existingNames.has(nameNorm)) {
      skippedCount++;
      continue;
    }

    if (isBlockedCompany(c.name, c.slug, c.one_liner || '')) {
      console.log(`[${i+1}/${companies.length}] ${c.name}... blocked (not legal tech)`);
      continue;
    }

    process.stdout.write(`[${i+1}/${companies.length}] ${c.name}... `);

    try {
      const slugs = generateSlugs(c.name, c.slug, c.website);
      const ats = await tryATS(slugs);

      if (!ats) {
        console.log('no ATS');
        noAtsCount++;
        continue;
      }

      let scraped: any[] = [];
      if (ats.type === 'greenhouse') {
        scraped = ats.jobs.map((j: any) => ({
          title: j.title, company: c.name,
          location: j.location?.name || 'Not specified',
          description: j.content || '',
          applyUrl: j.absolute_url,
          postedDate: j.updated_at || new Date().toISOString(),
          source: 'yc_greenhouse', externalId: `yc_gh_${ats.slug}_${j.id}`,
        }));
      } else if (ats.type === 'lever') {
        scraped = ats.jobs.map((j: any) => ({
          title: j.text, company: c.name,
          location: j.categories?.location || 'Not specified',
          description: j.description || '',
          applyUrl: j.hostedUrl,
          postedDate: new Date(j.createdAt).toISOString(),
          source: 'yc_lever', externalId: `yc_lever_${j.id}`,
        }));
      } else if (ats.type === 'ashby') {
        scraped = ats.jobs.map((j: any) => ({
          title: j.title, company: c.name,
          location: j.location?.name || j.locationName || 'Not specified',
          description: j.descriptionPlain || j.descriptionHtml || '',
          applyUrl: j.applicationUrl || j.jobUrl || '',
          postedDate: j.publishedDate || new Date().toISOString(),
          source: 'yc_ashby', externalId: `yc_ashby_${j.id}`,
        }));
      }

      const relevant = scraped.filter(j => isLegalTechRole(j.title));

      if (relevant.length === 0) {
        console.log(`${scraped.length} jobs, 0 relevant (${ats.type})`);
        continue;
      }

      for (const job of relevant) {
        allJobs.push(transformToJobSchema(job));
      }

      console.log(`${scraped.length} total, ${relevant.length} relevant (${ats.type}:${ats.slug})`);
      successCompanies.push(`${c.name} (${relevant.length} jobs via ${ats.type})`);

    } catch (err: any) {
      console.log(`error: ${err.message}`);
    }
  }

  console.log('\n=== RESULTS ===');
  console.log(`Companies checked: ${companies.length}`);
  console.log(`Skipped (already in existing list): ${skippedCount}`);
  console.log(`No ATS found: ${noAtsCount}`);
  console.log(`Successfully scraped: ${successCompanies.length}`);
  console.log(`Total jobs found: ${allJobs.length}`);

  if (successCompanies.length > 0) {
    console.log('\nCompanies with jobs:');
    successCompanies.forEach(c => console.log(`  - ${c}`));
  }

  if (allJobs.length > 0) {
    console.log(`\nInserting ${allJobs.length} jobs into database...`);
    const { inserted, updated, newJobs } = await storage.bulkUpsertJobs(allJobs);
    console.log(`Inserted: ${inserted}, Updated: ${updated}`);

    if (newJobs.length > 0) {
      console.log(`Matching ${newJobs.length} new jobs against alerts...`);
      await matchNewJobsAgainstAlerts(newJobs);
    }
    
    console.log('\nNote: Jobs inserted without AI categorization. Run "npx tsx server/scripts/run-yc-scraper.ts categorize" to categorize them.');
  }

  console.log('\nDone!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
