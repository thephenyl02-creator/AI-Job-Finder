const US_STATE_ABBREVS: Record<string, string> = {
  'al': 'Alabama', 'ak': 'Alaska', 'az': 'Arizona', 'ar': 'Arkansas',
  'ca': 'California', 'co': 'Colorado', 'ct': 'Connecticut', 'de': 'Delaware',
  'fl': 'Florida', 'ga': 'Georgia', 'hi': 'Hawaii', 'id': 'Idaho',
  'il': 'Illinois', 'in': 'Indiana', 'ia': 'Iowa', 'ks': 'Kansas',
  'ky': 'Kentucky', 'la': 'Louisiana', 'me': 'Maine', 'md': 'Maryland',
  'ma': 'Massachusetts', 'mi': 'Michigan', 'mn': 'Minnesota', 'ms': 'Mississippi',
  'mo': 'Missouri', 'mt': 'Montana', 'ne': 'Nebraska', 'nv': 'Nevada',
  'nh': 'New Hampshire', 'nj': 'New Jersey', 'nm': 'New Mexico', 'ny': 'New York',
  'nc': 'North Carolina', 'nd': 'North Dakota', 'oh': 'Ohio', 'ok': 'Oklahoma',
  'or': 'Oregon', 'pa': 'Pennsylvania', 'ri': 'Rhode Island', 'sc': 'South Carolina',
  'sd': 'South Dakota', 'tn': 'Tennessee', 'tx': 'Texas', 'ut': 'Utah',
  'vt': 'Vermont', 'va': 'Virginia', 'wa': 'Washington', 'wv': 'West Virginia',
  'wi': 'Wisconsin', 'wy': 'Wyoming', 'dc': 'District of Columbia',
};

const US_STATE_FULL: Record<string, boolean> = {};
for (const v of Object.values(US_STATE_ABBREVS)) {
  US_STATE_FULL[v.toLowerCase()] = true;
}

const COUNTRY_ABBREVS: Record<string, string> = {
  'us': 'United States', 'usa': 'United States', 'u.s.': 'United States', 'u.s.a.': 'United States',
  'uk': 'United Kingdom', 'u.k.': 'United Kingdom', 'gb': 'United Kingdom',
  'uae': 'United Arab Emirates', 'u.a.e.': 'United Arab Emirates',
  'bel': 'Belgium', 'nld': 'Netherlands', 'ned': 'Netherlands',
  'deu': 'Germany', 'ger': 'Germany', 'fra': 'France',
  'esp': 'Spain', 'ita': 'Italy', 'jpn': 'Japan', 'aus': 'Australia',
  'can': 'Canada', 'sgp': 'Singapore', 'hkg': 'Hong Kong',
  'ind': 'India', 'kor': 'South Korea', 'chn': 'China', 'bra': 'Brazil',
  'mex': 'Mexico', 'arg': 'Argentina', 'che': 'Switzerland',
  'swe': 'Sweden', 'nor': 'Norway', 'dnk': 'Denmark', 'fin': 'Finland',
  'irl': 'Ireland', 'aut': 'Austria', 'prt': 'Portugal', 'pol': 'Poland',
  'nzl': 'New Zealand', 'zaf': 'South Africa', 'isr': 'Israel',
};

const CITY_TO_COUNTRY: Record<string, { country: string; region: string }> = {
  'london': { country: 'United Kingdom', region: 'Europe' },
  'manchester': { country: 'United Kingdom', region: 'Europe' },
  'birmingham': { country: 'United Kingdom', region: 'Europe' },
  'edinburgh': { country: 'United Kingdom', region: 'Europe' },
  'glasgow': { country: 'United Kingdom', region: 'Europe' },
  'bristol': { country: 'United Kingdom', region: 'Europe' },
  'leeds': { country: 'United Kingdom', region: 'Europe' },
  'cambridge': { country: 'United Kingdom', region: 'Europe' },
  'oxford': { country: 'United Kingdom', region: 'Europe' },
  'belfast': { country: 'United Kingdom', region: 'Europe' },
  'berlin': { country: 'Germany', region: 'Europe' },
  'munich': { country: 'Germany', region: 'Europe' },
  'frankfurt': { country: 'Germany', region: 'Europe' },
  'hamburg': { country: 'Germany', region: 'Europe' },
  'paris': { country: 'France', region: 'Europe' },
  'amsterdam': { country: 'Netherlands', region: 'Europe' },
  'dublin': { country: 'Ireland', region: 'Europe' },
  'madrid': { country: 'Spain', region: 'Europe' },
  'barcelona': { country: 'Spain', region: 'Europe' },
  'stockholm': { country: 'Sweden', region: 'Europe' },
  'copenhagen': { country: 'Denmark', region: 'Europe' },
  'oslo': { country: 'Norway', region: 'Europe' },
  'helsinki': { country: 'Finland', region: 'Europe' },
  'vienna': { country: 'Austria', region: 'Europe' },
  'brussels': { country: 'Belgium', region: 'Europe' },
  'mechelen': { country: 'Belgium', region: 'Europe' },
  'zurich': { country: 'Switzerland', region: 'Europe' },
  'geneva': { country: 'Switzerland', region: 'Europe' },
  'milan': { country: 'Italy', region: 'Europe' },
  'rome': { country: 'Italy', region: 'Europe' },
  'lisbon': { country: 'Portugal', region: 'Europe' },
  'warsaw': { country: 'Poland', region: 'Europe' },
  'toronto': { country: 'Canada', region: 'Canada' },
  'vancouver': { country: 'Canada', region: 'Canada' },
  'montreal': { country: 'Canada', region: 'Canada' },
  'ottawa': { country: 'Canada', region: 'Canada' },
  'calgary': { country: 'Canada', region: 'Canada' },
  'sydney': { country: 'Australia', region: 'Asia-Pacific' },
  'melbourne': { country: 'Australia', region: 'Asia-Pacific' },
  'brisbane': { country: 'Australia', region: 'Asia-Pacific' },
  'perth': { country: 'Australia', region: 'Asia-Pacific' },
  'singapore': { country: 'Singapore', region: 'Asia-Pacific' },
  'hong kong': { country: 'Hong Kong', region: 'Asia-Pacific' },
  'tokyo': { country: 'Japan', region: 'Asia-Pacific' },
  'seoul': { country: 'South Korea', region: 'Asia-Pacific' },
  'shanghai': { country: 'China', region: 'Asia-Pacific' },
  'beijing': { country: 'China', region: 'Asia-Pacific' },
  'bangalore': { country: 'India', region: 'Asia-Pacific' },
  'bengaluru': { country: 'India', region: 'Asia-Pacific' },
  'mumbai': { country: 'India', region: 'Asia-Pacific' },
  'delhi': { country: 'India', region: 'Asia-Pacific' },
  'new delhi': { country: 'India', region: 'Asia-Pacific' },
  'hyderabad': { country: 'India', region: 'Asia-Pacific' },
  'chennai': { country: 'India', region: 'Asia-Pacific' },
  'pune': { country: 'India', region: 'Asia-Pacific' },
  'gurugram': { country: 'India', region: 'Asia-Pacific' },
  'gurgaon': { country: 'India', region: 'Asia-Pacific' },
  'noida': { country: 'India', region: 'Asia-Pacific' },
  'tel aviv': { country: 'Israel', region: 'Middle East' },
  'dubai': { country: 'United Arab Emirates', region: 'Middle East' },
  'abu dhabi': { country: 'United Arab Emirates', region: 'Middle East' },
  'riyadh': { country: 'Saudi Arabia', region: 'Middle East' },
  'sao paulo': { country: 'Brazil', region: 'Latin America' },
  'mexico city': { country: 'Mexico', region: 'Latin America' },
  'buenos aires': { country: 'Argentina', region: 'Latin America' },
  'cape town': { country: 'South Africa', region: 'Africa' },
  'johannesburg': { country: 'South Africa', region: 'Africa' },
  'nairobi': { country: 'Kenya', region: 'Africa' },
  'lagos': { country: 'Nigeria', region: 'Africa' },
};

const COUNTRY_TO_REGION: Record<string, string> = {
  'united states': 'United States',
  'canada': 'Canada',
  'united kingdom': 'Europe',
  'england': 'Europe',
  'scotland': 'Europe',
  'wales': 'Europe',
  'northern ireland': 'Europe',
  'ireland': 'Europe',
  'germany': 'Europe',
  'france': 'Europe',
  'netherlands': 'Europe',
  'spain': 'Europe',
  'italy': 'Europe',
  'belgium': 'Europe',
  'austria': 'Europe',
  'switzerland': 'Europe',
  'sweden': 'Europe',
  'norway': 'Europe',
  'denmark': 'Europe',
  'finland': 'Europe',
  'portugal': 'Europe',
  'poland': 'Europe',
  'czech republic': 'Europe',
  'hungary': 'Europe',
  'romania': 'Europe',
  'greece': 'Europe',
  'australia': 'Asia-Pacific',
  'new zealand': 'Asia-Pacific',
  'japan': 'Asia-Pacific',
  'south korea': 'Asia-Pacific',
  'korea': 'Asia-Pacific',
  'china': 'Asia-Pacific',
  'india': 'Asia-Pacific',
  'singapore': 'Asia-Pacific',
  'hong kong': 'Asia-Pacific',
  'taiwan': 'Asia-Pacific',
  'malaysia': 'Asia-Pacific',
  'philippines': 'Asia-Pacific',
  'thailand': 'Asia-Pacific',
  'vietnam': 'Asia-Pacific',
  'indonesia': 'Asia-Pacific',
  'israel': 'Middle East',
  'united arab emirates': 'Middle East',
  'saudi arabia': 'Middle East',
  'qatar': 'Middle East',
  'bahrain': 'Middle East',
  'brazil': 'Latin America',
  'mexico': 'Latin America',
  'argentina': 'Latin America',
  'colombia': 'Latin America',
  'chile': 'Latin America',
  'south africa': 'Africa',
  'nigeria': 'Africa',
  'kenya': 'Africa',
  'egypt': 'Africa',
};

const US_CITIES: Record<string, string> = {
  'new york': 'New York',
  'new york city': 'New York',
  'nyc': 'New York',
  'los angeles': 'California',
  'san francisco': 'California',
  'san jose': 'California',
  'san mateo': 'California',
  'palo alto': 'California',
  'mountain view': 'California',
  'menlo park': 'California',
  'sunnyvale': 'California',
  'cupertino': 'California',
  'oakland': 'California',
  'sacramento': 'California',
  'san diego': 'California',
  'irvine': 'California',
  'chicago': 'Illinois',
  'houston': 'Texas',
  'dallas': 'Texas',
  'austin': 'Texas',
  'san antonio': 'Texas',
  'phoenix': 'Arizona',
  'philadelphia': 'Pennsylvania',
  'atlanta': 'Georgia',
  'miami': 'Florida',
  'tampa': 'Florida',
  'orlando': 'Florida',
  'seattle': 'Washington',
  'denver': 'Colorado',
  'boulder': 'Colorado',
  'boston': 'Massachusetts',
  'detroit': 'Michigan',
  'minneapolis': 'Minnesota',
  'portland': 'Oregon',
  'charlotte': 'North Carolina',
  'raleigh': 'North Carolina',
  'nashville': 'Tennessee',
  'salt lake city': 'Utah',
  'lehi': 'Utah',
  'provo': 'Utah',
  'las vegas': 'Nevada',
  'washington': 'District of Columbia',
  'washington dc': 'District of Columbia',
  'washington d.c.': 'District of Columbia',
  'pittsburgh': 'Pennsylvania',
  'columbus': 'Ohio',
  'cleveland': 'Ohio',
  'indianapolis': 'Indiana',
  'kansas city': 'Missouri',
  'st louis': 'Missouri',
  'st. louis': 'Missouri',
  'richmond': 'Virginia',
  'wilmington': 'Delaware',
};

export interface NormalizedLocation {
  display: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  region: string | null;
  locationType: 'remote' | 'hybrid' | 'onsite' | null;
  isRemote: boolean;
}

function stripAtsPrefixes(raw: string): string {
  return raw
    .replace(/^[A-Z]{2,3}\s*[-–]\s*/i, '')
    .replace(/^(?:location|loc|office|site)\s*[:=]\s*/i, '')
    .trim();
}

function extractRemoteSignal(text: string): { cleaned: string; locationType: 'remote' | 'hybrid' | null; remoteRegion: string | null } {
  const lower = text.toLowerCase().trim();

  if (/^remote\s*[-–(/]\s*(.+)$/i.test(text)) {
    const regionPart = text.replace(/^remote\s*[-–(/]\s*/i, '').replace(/\)$/, '').trim();
    return { cleaned: regionPart || '', locationType: 'remote', remoteRegion: regionPart || null };
  }

  if (/^(.+?)\s*[-–]\s*remote$/i.test(text)) {
    const regionPart = text.replace(/\s*[-–]\s*remote$/i, '').trim();
    return { cleaned: regionPart || '', locationType: 'remote', remoteRegion: regionPart || null };
  }

  if (/^remote[,\s]+(.+)/i.test(text)) {
    const afterRemote = text.replace(/^remote[,\s]+/i, '').trim();
    if (afterRemote.toLowerCase().includes('based') || afterRemote.toLowerCase().includes('eligible')) {
      const region = afterRemote.replace(/\b(based|eligible)\b/gi, '').replace(/,/g, '').trim();
      return { cleaned: '', locationType: 'remote', remoteRegion: region || null };
    }
    return { cleaned: afterRemote, locationType: 'remote', remoteRegion: afterRemote || null };
  }

  if (/^remote$/i.test(lower)) {
    return { cleaned: '', locationType: 'remote', remoteRegion: null };
  }

  return { cleaned: text, locationType: null, remoteRegion: null };
}

function lookupCityCountry(city: string): { country: string; region: string; state?: string } | null {
  const cityLower = city.toLowerCase().trim();

  const intl = CITY_TO_COUNTRY[cityLower];
  if (intl) return intl;

  const usState = US_CITIES[cityLower];
  if (usState) return { country: 'United States', region: 'United States', state: usState };

  return null;
}

function expandStateAbbrev(abbrev: string): string | null {
  return US_STATE_ABBREVS[abbrev.toLowerCase().replace(/\./g, '')] || null;
}

function isCountryName(text: string): string | null {
  const lower = text.toLowerCase().trim();
  const abbrev = COUNTRY_ABBREVS[lower];
  if (abbrev) return abbrev;
  for (const [country] of Object.entries(COUNTRY_TO_REGION)) {
    if (lower === country) return country.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }
  if (lower === 'england' || lower === 'scotland' || lower === 'wales') return 'United Kingdom';
  return null;
}

function isUSState(text: string): string | null {
  const lower = text.toLowerCase().trim();
  if (US_STATE_FULL[lower]) return text.trim().split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  const expanded = expandStateAbbrev(text.trim());
  return expanded || null;
}

function regionForCountry(country: string): string | null {
  return COUNTRY_TO_REGION[country.toLowerCase()] || null;
}

export function normalizeLocation(rawLocation: string | null | undefined, companyName?: string): NormalizedLocation {
  const empty: NormalizedLocation = { display: null, city: null, state: null, country: null, region: null, locationType: null, isRemote: false };

  if (!rawLocation || rawLocation.trim() === '' || rawLocation.trim() === 'Not specified') {
    return empty;
  }

  let text = rawLocation.trim();

  if (companyName) {
    const companyWords = companyName.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const textLower = text.toLowerCase();
    const nonGeoPatterns = [/\blegal\s+services?\b/i, /\bcentral\s+office\b/i, /\bheadquarters?\b/i, /\b(division|department|unit|branch|office)\s*$/i];
    const looksLikeCompany = nonGeoPatterns.some(p => p.test(text));
    const hasCompanyWord = companyWords.some(w => textLower.includes(w));

    if (looksLikeCompany && hasCompanyWord && !CITY_TO_COUNTRY[textLower]) {
      return empty;
    }
  }

  text = stripAtsPrefixes(text);

  const remoteSignal = extractRemoteSignal(text);
  let locationType = remoteSignal.locationType;
  text = remoteSignal.cleaned;

  if (!locationType) {
    const lower = text.toLowerCase();
    if (/\bhybrid\b/i.test(lower)) locationType = 'hybrid';
  }

  const parts = text.split(/[;|]/).map(p => p.trim()).filter(Boolean);
  const firstPart = parts[0] || '';
  const segments = firstPart.split(',').map(s => s.trim()).filter(Boolean);

  let city: string | null = null;
  let state: string | null = null;
  let country: string | null = null;
  let region: string | null = null;

  if (segments.length === 0 && locationType) {
    if (remoteSignal.remoteRegion) {
      const regionCountry = isCountryName(remoteSignal.remoteRegion);
      if (regionCountry) {
        country = regionCountry;
        region = regionForCountry(regionCountry);
      } else {
        const regionLower = remoteSignal.remoteRegion.toLowerCase();
        if (regionLower.includes('us') || regionLower.includes('united states') || regionLower.includes('america')) {
          country = 'United States';
          region = 'United States';
        } else if (regionLower.includes('apac') || regionLower.includes('asia')) {
          region = 'Asia-Pacific';
        } else if (regionLower.includes('emea') || regionLower.includes('europe')) {
          region = 'Europe';
        } else if (regionLower.includes('latam') || regionLower.includes('latin')) {
          region = 'Latin America';
        } else {
          region = 'Global';
        }
      }
    }

    const display = country ? `Remote - ${country}` : region && region !== 'Global' ? `Remote - ${region}` : 'Remote';
    return { display, city: null, state: null, country, region: region || 'Global', locationType: locationType as 'remote' | 'hybrid', isRemote: true };
  }

  if (segments.length === 1) {
    const single = segments[0];
    const asCountry = isCountryName(single);
    if (asCountry) {
      country = asCountry;
      region = regionForCountry(asCountry);
    } else {
      const asState = isUSState(single);
      if (asState) {
        state = asState;
        country = 'United States';
        region = 'United States';
      } else {
        const cityInfo = lookupCityCountry(single);
        if (cityInfo) {
          city = single.trim().split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
          country = cityInfo.country;
          region = cityInfo.region;
          if (cityInfo.state) state = cityInfo.state;
        } else {
          city = single;
        }
      }
    }
  } else if (segments.length === 2) {
    const [seg1, seg2] = segments;

    const seg2Country = isCountryName(seg2);
    const seg2State = isUSState(seg2);

    if (seg2Country) {
      city = seg1;
      country = seg2Country;
      region = regionForCountry(seg2Country);
    } else if (seg2State) {
      city = seg1;
      state = seg2State;
      country = 'United States';
      region = 'United States';
    } else {
      const cityInfo = lookupCityCountry(seg1);
      if (cityInfo) {
        city = seg1;
        country = cityInfo.country;
        region = cityInfo.region;
        if (cityInfo.state) state = cityInfo.state;
        const possibleState = isUSState(seg2);
        if (possibleState) state = possibleState;
      } else {
        city = seg1;
        state = seg2;
      }
    }
  } else if (segments.length >= 3) {
    const lastSeg = segments[segments.length - 1];
    const midSeg = segments[segments.length - 2];

    const lastCountry = isCountryName(lastSeg);
    if (lastCountry) {
      country = lastCountry;
      region = regionForCountry(lastCountry);
      const midState = isUSState(midSeg);
      if (midState) {
        state = midState;
        city = segments.slice(0, -2).join(', ');
      } else {
        city = segments.slice(0, -1).join(', ');
        if (!state) {
          const stateCheck = isUSState(midSeg);
          if (stateCheck) state = stateCheck;
        }
      }
    } else {
      const midState = isUSState(midSeg);
      const lastState = isUSState(lastSeg);
      if (lastState) {
        state = lastState;
        country = 'United States';
        region = 'United States';
        city = segments.slice(0, -1).join(', ');
      } else if (midState) {
        state = midState;
        city = segments.slice(0, -2).join(', ');
      } else {
        city = segments.join(', ');
      }
    }
  }

  if (city && !country && !state) {
    const cityInfo = lookupCityCountry(city);
    if (cityInfo) {
      country = cityInfo.country;
      region = cityInfo.region;
      if (cityInfo.state) state = cityInfo.state;
    }
  }

  if (state && !country) {
    country = 'United States';
    region = 'United States';
  }

  if (country && !region) {
    region = regionForCountry(country) || null;
  }

  if (city) {
    city = city.split(' ').map(w => {
      if (w.length <= 2) return w.toUpperCase();
      return w[0].toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
  }

  let display: string;
  if (city && state && country === 'United States') {
    display = `${city}, ${state}`;
  } else if (city && country) {
    display = `${city}, ${country}`;
  } else if (city && state) {
    display = `${city}, ${state}`;
  } else if (state && country === 'United States') {
    display = state;
  } else if (country) {
    display = country;
  } else if (city) {
    display = city;
  } else {
    display = rawLocation.trim();
  }

  const isRemote = locationType === 'remote' || locationType === 'hybrid';

  return {
    display,
    city,
    state,
    country,
    region,
    locationType: locationType || null,
    isRemote,
  };
}

export function shortLocationDisplay(normalized: NormalizedLocation): string | null {
  if (!normalized.display) return null;

  if (normalized.locationType === 'remote') {
    if (normalized.country) return `Remote - ${normalized.country}`;
    if (normalized.region && normalized.region !== 'Global') return `Remote - ${normalized.region}`;
    return 'Remote';
  }

  if (normalized.city && normalized.country && normalized.country !== 'United States') {
    return `${normalized.city}, ${normalized.country}`;
  }
  if (normalized.city && normalized.state) {
    return `${normalized.city}, ${normalized.state}`;
  }
  return normalized.display;
}

export function detectRegion(location: string | null | undefined): string | null {
  if (!location) return null;
  const normalized = normalizeLocation(location);
  return normalized.region;
}
