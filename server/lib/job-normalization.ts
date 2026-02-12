const TITLE_ABBREVIATIONS: Record<string, string> = {
  'sr.': 'senior',
  'sr ': 'senior ',
  'jr.': 'junior',
  'jr ': 'junior ',
  'mgr': 'manager',
  'mgr.': 'manager',
  'dir.': 'director',
  'dir ': 'director ',
  'eng.': 'engineer',
  'eng ': 'engineer ',
  'assoc.': 'associate',
  'assoc ': 'associate ',
  'dept.': 'department',
  'dept ': 'department ',
  'govt.': 'government',
  'govt ': 'government ',
  'intl.': 'international',
  'intl ': 'international ',
  'vp': 'vice president',
  'svp': 'senior vice president',
  'evp': 'executive vice president',
};

export function normalizeTitle(title: string): string {
  let normalized = (title || '').trim().toLowerCase();
  normalized = normalized.replace(/\.$/, '');
  normalized = normalized.replace(/\s+/g, ' ');
  for (const [abbr, full] of Object.entries(TITLE_ABBREVIATIONS)) {
    if (normalized.startsWith(abbr)) {
      normalized = full + normalized.slice(abbr.length);
    }
    const idx = normalized.indexOf(` ${abbr}`);
    if (idx >= 0) {
      normalized = normalized.slice(0, idx + 1) + full + normalized.slice(idx + 1 + abbr.length);
    }
  }
  normalized = normalized.replace(/[–—-]+/g, '-').replace(/\s+/g, ' ').trim();
  return normalized;
}

const REMOTE_VARIANTS = [
  /^remote$/i,
  /^remote\s*[-–—]?\s*/i,
  /^fully\s+remote$/i,
  /^work\s+from\s+home$/i,
  /^wfh$/i,
];

const US_STATE_ABBREVIATIONS: Record<string, string> = {
  'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas',
  'ca': 'california', 'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware',
  'fl': 'florida', 'ga': 'georgia', 'hi': 'hawaii', 'id': 'idaho',
  'il': 'illinois', 'in': 'indiana', 'ia': 'iowa', 'ks': 'kansas',
  'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
  'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi',
  'mo': 'missouri', 'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada',
  'nh': 'new hampshire', 'nj': 'new jersey', 'nm': 'new mexico', 'ny': 'new york',
  'nc': 'north carolina', 'nd': 'north dakota', 'oh': 'ohio', 'ok': 'oklahoma',
  'or': 'oregon', 'pa': 'pennsylvania', 'ri': 'rhode island', 'sc': 'south carolina',
  'sd': 'south dakota', 'tn': 'tennessee', 'tx': 'texas', 'ut': 'utah',
  'vt': 'vermont', 'va': 'virginia', 'wa': 'washington', 'wv': 'west virginia',
  'wi': 'wisconsin', 'wy': 'wyoming', 'dc': 'district of columbia',
};

const STATE_FULL_NAMES = new Set(Object.values(US_STATE_ABBREVIATIONS));

export function normalizeLocation(location: string | null | undefined): string {
  if (!location || location.trim() === '' || location.trim().toLowerCase() === 'not specified') {
    return '__unspecified__';
  }

  let normalized = location.trim().toLowerCase();
  normalized = normalized.replace(/\s+/g, ' ');

  for (const pattern of REMOTE_VARIANTS) {
    if (pattern.test(normalized)) {
      const remainder = normalized.replace(pattern, '').trim();
      if (!remainder || remainder === 'us' || remainder === 'usa' || remainder === 'united states') {
        return '__remote__';
      }
      return `__remote__ ${normalizeLocationParts(remainder)}`;
    }
  }

  if (normalized.includes('remote') && (normalized.includes('hybrid') || normalized.includes('onsite'))) {
    return normalizeLocationParts(normalized.replace(/remote/gi, '').trim());
  }

  return normalizeLocationParts(normalized);
}

function normalizeLocationParts(loc: string): string {
  let parts = loc.split(/[,|]+/).map(p => p.trim()).filter(Boolean);

  parts = parts.map(part => {
    const lower = part.toLowerCase().trim();
    if (US_STATE_ABBREVIATIONS[lower]) {
      return US_STATE_ABBREVIATIONS[lower];
    }
    if (lower === 'us' || lower === 'usa') return 'united states';
    if (lower === 'uk') return 'united kingdom';
    return lower;
  });

  parts = parts.filter(part => {
    if (STATE_FULL_NAMES.has(part) && parts.some(other => other !== part && other.includes(part))) {
      return false;
    }
    return true;
  });

  return parts.join(', ');
}

export function locationsMatch(loc1: string | null | undefined, loc2: string | null | undefined): boolean {
  return normalizeLocation(loc1) === normalizeLocation(loc2);
}
