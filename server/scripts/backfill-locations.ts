import axios from 'axios';
import { db } from '../db';
import { jobs } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

async function backfillAshbyLocations() {
  console.log('Fetching Ashby jobs with null locations...');
  
  const nullLocationJobs = await db.select({
    id: jobs.id,
    title: jobs.title,
    company: jobs.company,
    source: jobs.source,
    applyUrl: jobs.applyUrl,
  }).from(jobs).where(
    sql`(${jobs.location} IS NULL OR TRIM(${jobs.location}) = '') AND ${jobs.source} IN ('ashby', 'yc_ashby')`
  );

  console.log(`Found ${nullLocationJobs.length} Ashby jobs with null locations`);

  const companyBoardCache = new Map<string, any[]>();

  async function getAshbyBoard(slug: string) {
    if (companyBoardCache.has(slug)) return companyBoardCache.get(slug)!;
    try {
      const res = await axios.get(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, {
        headers: { 'Accept': 'application/json' },
        timeout: 15000,
      });
      const boardJobs = res.data.jobs || [];
      companyBoardCache.set(slug, boardJobs);
      return boardJobs;
    } catch {
      companyBoardCache.set(slug, []);
      return [];
    }
  }

  let updated = 0;
  for (const job of nullLocationJobs) {
    const urlMatch = job.applyUrl?.match(/jobs\.ashbyhq\.com\/([^/]+)\/([a-f0-9-]+)/i);
    if (!urlMatch) continue;
    
    const [, slug, jobId] = urlMatch;
    const boardJobs = await getAshbyBoard(slug);
    const apiJob = boardJobs.find((j: any) => j.id === jobId);
    
    if (!apiJob) continue;

    let location = '';
    if (typeof apiJob.location === 'string') location = apiJob.location;
    else if (apiJob.location?.name) location = apiJob.location.name;
    if (!location && apiJob.address?.postalAddress) {
      const addr = apiJob.address.postalAddress;
      location = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(', ');
    }
    if (!location && apiJob.isRemote) location = 'Remote';
    
    if (location) {
      await db.update(jobs).set({ location }).where(eq(jobs.id, job.id));
      console.log(`Updated #${job.id} "${job.title}" -> "${location}"`);
      updated++;
    }
  }

  console.log(`\nBackfilled ${updated}/${nullLocationJobs.length} Ashby jobs with locations`);
}

async function backfillFromDescription() {
  console.log('\nChecking remaining null-location published jobs...');
  
  const remaining = await db.select({
    id: jobs.id,
    title: jobs.title,
    company: jobs.company,
    source: jobs.source,
    description: jobs.description,
  }).from(jobs).where(
    sql`(${jobs.location} IS NULL OR TRIM(${jobs.location}) = '') AND ${jobs.isPublished} = true`
  );

  console.log(`Found ${remaining.length} published jobs still with null locations`);
  
  const cities = ['Sydney', 'Melbourne', 'London', 'New York', 'San Francisco', 'Dallas', 'Austin', 'Chicago', 'Boston', 'Seattle', 'Toronto', 'Berlin', 'Amsterdam', 'Singapore', 'Tokyo', 'Dublin', 'Paris', 'Mumbai', 'Bangalore', 'Los Angeles', 'Washington', 'Denver', 'Portland', 'Atlanta', 'Houston', 'Miami', 'Philadelphia'];

  let updated = 0;
  for (const job of remaining) {
    const desc = job.description || '';
    
    const locMatch = desc.match(/\bLocation:\s*([^\n]+)/i);
    if (locMatch) {
      const loc = locMatch[1].trim().replace(/[.;,]$/, '');
      if (loc.length > 2 && loc.length < 60) {
        await db.update(jobs).set({ location: loc }).where(eq(jobs.id, job.id));
        console.log(`[Desc] #${job.id} "${job.title}" -> "${loc}"`);
        updated++;
        continue;
      }
    }

    const basedMatch = desc.match(/\bBased in (?:our )?([A-Z][a-z]+(?:[ ,]+[A-Z][a-z]+){0,3})/);
    if (basedMatch) {
      const loc = basedMatch[1].trim();
      if (loc.length > 2 && loc.length < 50) {
        await db.update(jobs).set({ location: loc }).where(eq(jobs.id, job.id));
        console.log(`[Based] #${job.id} "${job.title}" -> "${loc}"`);
        updated++;
        continue;
      }
    }

    for (const city of cities) {
      if (desc.includes(city)) {
        await db.update(jobs).set({ location: city }).where(eq(jobs.id, job.id));
        console.log(`[City] #${job.id} "${job.title}" -> "${city}"`);
        updated++;
        break;
      }
    }
  }

  console.log(`Backfilled ${updated}/${remaining.length} from descriptions`);
}

backfillAshbyLocations()
  .then(() => backfillFromDescription())
  .then(() => { console.log('Done!'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
