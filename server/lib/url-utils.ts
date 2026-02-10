const PLATFORM_MAP: Record<string, string> = {
  "lever.co": "Lever",
  "greenhouse.io": "Greenhouse",
  "jobs.lever.co": "Lever",
  "boards.greenhouse.io": "Greenhouse",
  "apply.workable.com": "Workable",
  "jobs.ashbyhq.com": "Ashby",
  "careers.google.com": "Google Careers",
  "linkedin.com": "LinkedIn",
  "indeed.com": "Indeed",
  "angel.co": "AngelList",
  "wellfound.com": "Wellfound",
  "ycombinator.com": "Y Combinator",
  "builtin.com": "Built In",
  "glassdoor.com": "Glassdoor",
  "simplyhired.com": "SimplyHired",
  "ziprecruiter.com": "ZipRecruiter",
  "smartrecruiters.com": "SmartRecruiters",
  "myworkdayjobs.com": "Workday",
  "icims.com": "iCIMS",
  "jobvite.com": "Jobvite",
};

export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function detectSourcePlatform(url: string): string | null {
  const domain = extractDomain(url);
  if (!domain) return null;

  for (const [pattern, name] of Object.entries(PLATFORM_MAP)) {
    if (domain === pattern || domain.endsWith(`.${pattern}`)) {
      return name;
    }
  }
  return null;
}

export function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.hash = "";
    const removeParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "source", "fbclid", "gclid"];
    for (const p of removeParams) {
      parsed.searchParams.delete(p);
    }
    let path = parsed.pathname.replace(/\/+$/, "") || "/";
    parsed.pathname = path;
    return parsed.toString();
  } catch {
    return url;
  }
}

export function deriveSourceInfo(applyUrl: string, existingSource?: string | null): {
  sourceName: string | null;
  sourceDomain: string | null;
  sourceUrl: string;
} {
  const domain = extractDomain(applyUrl);
  const platform = detectSourcePlatform(applyUrl);
  const canonical = canonicalizeUrl(applyUrl);

  return {
    sourceName: platform || existingSource || null,
    sourceDomain: domain,
    sourceUrl: canonical,
  };
}
