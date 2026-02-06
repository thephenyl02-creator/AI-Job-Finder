import { db } from "../db";
import { jobs } from "@shared/schema";
import { eq } from "drizzle-orm";

interface JobMetadata {
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  isRemote?: boolean;
  employmentType?: string;
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LegalTechCareers/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function extractAshbyMetadata(url: string): Promise<JobMetadata> {
  const html = await fetchWithTimeout(url);
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data["@type"] === "JobPosting") {
        const meta: JobMetadata = {};

        if (data.jobLocation?.address) {
          const addr = data.jobLocation.address;
          const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
          meta.location = parts.join(", ");
        }

        if (data.baseSalary?.value) {
          const salary = data.baseSalary.value;
          if (salary.minValue) meta.salaryMin = salary.minValue;
          if (salary.maxValue) meta.salaryMax = salary.maxValue;
        }

        if (data.employmentType) {
          meta.employmentType = data.employmentType;
        }

        if (data.jobLocationType === "TELECOMMUTE" || meta.location?.toLowerCase().includes("remote")) {
          meta.isRemote = true;
        }

        return meta;
      }
    } catch (e) {
      continue;
    }
  }
  return {};
}

async function extractGreenhouseMetadata(url: string): Promise<JobMetadata> {
  const urlMatch = url.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/);
  if (!urlMatch) return {};

  const [, boardSlug, jobId] = urlMatch;
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardSlug}/jobs/${jobId}`;

  try {
    const text = await fetchWithTimeout(apiUrl);
    const data = JSON.parse(text);
    const meta: JobMetadata = {};

    if (data.location?.name) {
      meta.location = data.location.name;
    }

    if (data.metadata) {
      for (const m of data.metadata) {
        if (m.name === "Employment Type" || m.name === "Commitment") {
          meta.employmentType = m.value;
        }
      }
    }

    const descText = (data.content || "").replace(/<[^>]+>/g, " ");

    const salaryRangeMatch = descText.match(/\$([0-9]{2,3}),([0-9]{3})\s*[-–—. ]*\s*(?:to\s*)?\$?([0-9]{2,3}),([0-9]{3})/);
    if (salaryRangeMatch) {
      const sMin = parseInt(salaryRangeMatch[1]) * 1000 + parseInt(salaryRangeMatch[2]);
      const sMax = parseInt(salaryRangeMatch[3]) * 1000 + parseInt(salaryRangeMatch[4]);
      if (sMin >= 30000 && sMax >= 30000 && sMax <= 500000 && sMin < sMax) {
        meta.salaryMin = sMin;
        meta.salaryMax = sMax;
      }
    }

    if (!meta.salaryMin) {
      const hourlyMatch = descText.match(/\$([0-9]+\.?[0-9]*)\s*[-–—. ]*\s*(?:to\s*)?\$?([0-9]+\.?[0-9]*)\s*(?:per hour|\/hour|\/hr|hourly)/i);
      if (hourlyMatch) {
        const hourMin = parseFloat(hourlyMatch[1]);
        const hourMax = parseFloat(hourlyMatch[2]);
        if (hourMin >= 15 && hourMax <= 300) {
          meta.salaryMin = Math.round(hourMin * 2080);
          meta.salaryMax = Math.round(hourMax * 2080);
        }
      }
    }

    if (!meta.salaryMin) {
      const singleSalaryMatch = descText.match(/(?:salary|compensation|base|pay)[^$]*\$([0-9]{2,3}),([0-9]{3})/i);
      if (singleSalaryMatch) {
        const salary = parseInt(singleSalaryMatch[1]) * 1000 + parseInt(singleSalaryMatch[2]);
        if (salary >= 30000 && salary <= 500000) {
          meta.salaryMin = salary;
        }
      }
    }

    if (meta.location?.toLowerCase().includes("remote")) {
      meta.isRemote = true;
    }

    return meta;
  } catch (e) {
    return {};
  }
}

async function extractLeverMetadata(url: string): Promise<JobMetadata> {
  try {
    const html = await fetchWithTimeout(url);
    const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    let match;
    while ((match = re.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        if (data["@type"] === "JobPosting") {
          const meta: JobMetadata = {};
          if (data.jobLocation?.address) {
            const addr = data.jobLocation.address;
            const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
            meta.location = parts.join(", ");
          }
          if (data.baseSalary?.value) {
            if (data.baseSalary.value.minValue) meta.salaryMin = data.baseSalary.value.minValue;
            if (data.baseSalary.value.maxValue) meta.salaryMax = data.baseSalary.value.maxValue;
          }
          return meta;
        }
      } catch (e) {
        continue;
      }
    }

    const locMatch = html.match(/<div class="posting-categories">[\s\S]*?<div class="sort-by-commitment posting-category[^"]*">([\s\S]*?)<\/div>/);
    const meta: JobMetadata = {};
    const locDiv = html.match(/<div class="sort-by-location posting-category[^"]*">([\s\S]*?)<\/div>/);
    if (locDiv) {
      meta.location = locDiv[1].replace(/<[^>]+>/g, "").trim();
    }
    return meta;
  } catch (e) {
    return {};
  }
}

async function main() {
  console.log("Starting deep metadata scrape for all jobs...\n");

  const allJobs = await db.select({
    id: jobs.id,
    title: jobs.title,
    company: jobs.company,
    applyUrl: jobs.applyUrl,
    source: jobs.source,
    location: jobs.location,
    salaryMin: jobs.salaryMin,
    salaryMax: jobs.salaryMax,
    isRemote: jobs.isRemote,
  }).from(jobs);

  console.log(`Total jobs to process: ${allJobs.length}\n`);

  let updated = 0;
  let errors = 0;
  let skipped = 0;

  const BATCH_SIZE = 5;

  for (let i = 0; i < allJobs.length; i += BATCH_SIZE) {
    const batch = allJobs.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (job) => {
        if (!job.applyUrl) {
          skipped++;
          return null;
        }

        try {
          let meta: JobMetadata = {};

          if (job.source === "yc_ashby" || job.applyUrl.includes("ashbyhq.com")) {
            meta = await extractAshbyMetadata(job.applyUrl);
          } else if (
            job.source === "greenhouse" ||
            job.source === "yc_greenhouse" ||
            job.applyUrl.includes("greenhouse.io")
          ) {
            meta = await extractGreenhouseMetadata(job.applyUrl);
          } else if (job.source === "lever" || job.applyUrl.includes("lever.co")) {
            meta = await extractLeverMetadata(job.applyUrl);
          } else {
            skipped++;
            return null;
          }

          const updates: Record<string, any> = {};
          let hasUpdate = false;

          if (meta.location && meta.location.trim() !== "") {
            updates.location = meta.location;
            hasUpdate = true;
          }

          if (meta.salaryMin && (!job.salaryMin || meta.salaryMin !== job.salaryMin)) {
            updates.salaryMin = meta.salaryMin;
            hasUpdate = true;
          }

          if (meta.salaryMax && (!job.salaryMax || meta.salaryMax !== job.salaryMax)) {
            updates.salaryMax = meta.salaryMax;
            hasUpdate = true;
          }

          if (meta.isRemote !== undefined && meta.isRemote !== job.isRemote) {
            updates.isRemote = meta.isRemote;
            hasUpdate = true;
          }

          if (hasUpdate) {
            await db.update(jobs).set(updates).where(eq(jobs.id, job.id));
            updated++;
            const locChange =
              meta.location && meta.location !== job.location
                ? `location: "${job.location}" -> "${meta.location}"`
                : "";
            const salChange =
              meta.salaryMin
                ? `salary: $${meta.salaryMin?.toLocaleString()}${meta.salaryMax ? ` - $${meta.salaryMax.toLocaleString()}` : ""}`
                : "";
            console.log(
              `  Updated [${job.id}] ${job.title} @ ${job.company}: ${[locChange, salChange].filter(Boolean).join(", ")}`
            );
          } else {
            skipped++;
          }

          return meta;
        } catch (e: any) {
          errors++;
          console.error(`  Error [${job.id}] ${job.title}: ${e.message}`);
          return null;
        }
      })
    );

    process.stdout.write(`\rProcessed ${Math.min(i + BATCH_SIZE, allJobs.length)}/${allJobs.length} jobs...`);
  }

  console.log(`\n\nDone!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

main().catch(console.error).finally(() => process.exit(0));
