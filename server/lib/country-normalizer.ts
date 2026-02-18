export interface NormalizedCountry {
  countryCode: string;
  countryName: string;
  workMode: "onsite" | "hybrid" | "remote";
}

const CITY_TO_COUNTRY: Record<string, { code: string; name: string }> = {
  "new york": { code: "US", name: "United States" },
  "san francisco": { code: "US", name: "United States" },
  "dallas": { code: "US", name: "United States" },
  "salt lake city": { code: "US", name: "United States" },
  "atlanta": { code: "US", name: "United States" },
  "denver": { code: "US", name: "United States" },
  "chicago": { code: "US", name: "United States" },
  "lehi": { code: "US", name: "United States" },
  "san mateo": { code: "US", name: "United States" },
  "colorado": { code: "US", name: "United States" },
  "utah": { code: "US", name: "United States" },
  "maine": { code: "US", name: "United States" },
  "london": { code: "GB", name: "United Kingdom" },
  "manchester": { code: "GB", name: "United Kingdom" },
  "belfast": { code: "GB", name: "United Kingdom" },
  "stockholm": { code: "SE", name: "Sweden" },
  "toronto": { code: "CA", name: "Canada" },
  "st. john's": { code: "CA", name: "Canada" },
  "seoul": { code: "KR", name: "South Korea" },
  "paris": { code: "FR", name: "France" },
  "munich": { code: "DE", name: "Germany" },
  "sydney": { code: "AU", name: "Australia" },
  "dublin": { code: "IE", name: "Ireland" },
  "bengaluru": { code: "IN", name: "India" },
  "bangalore": { code: "IN", name: "India" },
  "gurugram": { code: "IN", name: "India" },
  "mumbai": { code: "IN", name: "India" },
  "shanghai": { code: "CN", name: "China" },
  "madrid": { code: "ES", name: "Spain" },
  "alphen aan den rijn": { code: "NL", name: "Netherlands" },
  "singapore": { code: "SG", name: "Singapore" },
  "tokyo": { code: "JP", name: "Japan" },
  "berlin": { code: "DE", name: "Germany" },
  "amsterdam": { code: "NL", name: "Netherlands" },
  "hong kong": { code: "HK", name: "Hong Kong" },
  "tel aviv": { code: "IL", name: "Israel" },
  "zurich": { code: "CH", name: "Switzerland" },
  "vienna": { code: "AT", name: "Austria" },
  "brussels": { code: "BE", name: "Belgium" },
  "oslo": { code: "NO", name: "Norway" },
  "copenhagen": { code: "DK", name: "Denmark" },
  "helsinki": { code: "FI", name: "Finland" },
  "milan": { code: "IT", name: "Italy" },
  "lisbon": { code: "PT", name: "Portugal" },
  "auckland": { code: "NZ", name: "New Zealand" },
  "melbourne": { code: "AU", name: "Australia" },
  "brisbane": { code: "AU", name: "Australia" },
  "perth": { code: "AU", name: "Australia" },
  "vancouver": { code: "CA", name: "Canada" },
  "montreal": { code: "CA", name: "Canada" },
  "ottawa": { code: "CA", name: "Canada" },
  "calgary": { code: "CA", name: "Canada" },
  "mexico city": { code: "MX", name: "Mexico" },
  "sao paulo": { code: "BR", name: "Brazil" },
  "bogota": { code: "CO", name: "Colombia" },
  "buenos aires": { code: "AR", name: "Argentina" },
  "lima": { code: "PE", name: "Peru" },
  "santiago": { code: "CL", name: "Chile" },
  "nairobi": { code: "KE", name: "Kenya" },
  "lagos": { code: "NG", name: "Nigeria" },
  "cape town": { code: "ZA", name: "South Africa" },
  "johannesburg": { code: "ZA", name: "South Africa" },
  "dubai": { code: "AE", name: "United Arab Emirates" },
  "riyadh": { code: "SA", name: "Saudi Arabia" },
  "bangkok": { code: "TH", name: "Thailand" },
  "kuala lumpur": { code: "MY", name: "Malaysia" },
  "manila": { code: "PH", name: "Philippines" },
  "jakarta": { code: "ID", name: "Indonesia" },
  "taipei": { code: "TW", name: "Taiwan" },
  "warsaw": { code: "PL", name: "Poland" },
  "prague": { code: "CZ", name: "Czech Republic" },
  "budapest": { code: "HU", name: "Hungary" },
  "bucharest": { code: "RO", name: "Romania" },
  "edinburgh": { code: "GB", name: "United Kingdom" },
  "birmingham": { code: "GB", name: "United Kingdom" },
  "bristol": { code: "GB", name: "United Kingdom" },
  "leeds": { code: "GB", name: "United Kingdom" },
  "boston": { code: "US", name: "United States" },
  "seattle": { code: "US", name: "United States" },
  "austin": { code: "US", name: "United States" },
  "houston": { code: "US", name: "United States" },
  "portland": { code: "US", name: "United States" },
  "minneapolis": { code: "US", name: "United States" },
  "philadelphia": { code: "US", name: "United States" },
  "phoenix": { code: "US", name: "United States" },
  "san diego": { code: "US", name: "United States" },
  "san jose": { code: "US", name: "United States" },
  "washington": { code: "US", name: "United States" },
  "charlotte": { code: "US", name: "United States" },
  "miami": { code: "US", name: "United States" },
  "nashville": { code: "US", name: "United States" },
  "raleigh": { code: "US", name: "United States" },
  "pittsburgh": { code: "US", name: "United States" },
  "detroit": { code: "US", name: "United States" },
  "los angeles": { code: "US", name: "United States" },
  "new york city": { code: "US", name: "United States" },
  "silicon valley": { code: "US", name: "United States" },
  "saint petersburg": { code: "US", name: "United States" },
  "st. petersburg": { code: "US", name: "United States" },
  "st petersburg": { code: "US", name: "United States" },
};

const COUNTRY_NAME_TO_CODE: Record<string, { code: string; name: string }> = {
  "united states": { code: "US", name: "United States" },
  "united states of america": { code: "US", name: "United States" },
  "usa": { code: "US", name: "United States" },
  "us": { code: "US", name: "United States" },
  "united kingdom": { code: "GB", name: "United Kingdom" },
  "uk": { code: "GB", name: "United Kingdom" },
  "england": { code: "GB", name: "United Kingdom" },
  "canada": { code: "CA", name: "Canada" },
  "australia": { code: "AU", name: "Australia" },
  "india": { code: "IN", name: "India" },
  "germany": { code: "DE", name: "Germany" },
  "france": { code: "FR", name: "France" },
  "sweden": { code: "SE", name: "Sweden" },
  "ireland": { code: "IE", name: "Ireland" },
  "netherlands": { code: "NL", name: "Netherlands" },
  "singapore": { code: "SG", name: "Singapore" },
  "japan": { code: "JP", name: "Japan" },
  "south korea": { code: "KR", name: "South Korea" },
  "korea": { code: "KR", name: "South Korea" },
  "china": { code: "CN", name: "China" },
  "spain": { code: "ES", name: "Spain" },
  "brazil": { code: "BR", name: "Brazil" },
  "mexico": { code: "MX", name: "Mexico" },
  "israel": { code: "IL", name: "Israel" },
  "switzerland": { code: "CH", name: "Switzerland" },
  "austria": { code: "AT", name: "Austria" },
  "belgium": { code: "BE", name: "Belgium" },
  "norway": { code: "NO", name: "Norway" },
  "denmark": { code: "DK", name: "Denmark" },
  "finland": { code: "FI", name: "Finland" },
  "italy": { code: "IT", name: "Italy" },
  "portugal": { code: "PT", name: "Portugal" },
  "new zealand": { code: "NZ", name: "New Zealand" },
  "hong kong": { code: "HK", name: "Hong Kong" },
  "uae": { code: "AE", name: "United Arab Emirates" },
  "united arab emirates": { code: "AE", name: "United Arab Emirates" },
  "saudi arabia": { code: "SA", name: "Saudi Arabia" },
  "south africa": { code: "ZA", name: "South Africa" },
  "nigeria": { code: "NG", name: "Nigeria" },
  "kenya": { code: "KE", name: "Kenya" },
  "egypt": { code: "EG", name: "Egypt" },
  "colombia": { code: "CO", name: "Colombia" },
  "argentina": { code: "AR", name: "Argentina" },
  "chile": { code: "CL", name: "Chile" },
  "peru": { code: "PE", name: "Peru" },
  "philippines": { code: "PH", name: "Philippines" },
  "indonesia": { code: "ID", name: "Indonesia" },
  "thailand": { code: "TH", name: "Thailand" },
  "vietnam": { code: "VN", name: "Vietnam" },
  "taiwan": { code: "TW", name: "Taiwan" },
  "malaysia": { code: "MY", name: "Malaysia" },
  "poland": { code: "PL", name: "Poland" },
  "czech republic": { code: "CZ", name: "Czech Republic" },
  "hungary": { code: "HU", name: "Hungary" },
  "romania": { code: "RO", name: "Romania" },
  "greece": { code: "GR", name: "Greece" },
  "turkey": { code: "TR", name: "Turkey" },
  "croatia": { code: "HR", name: "Croatia" },
  "serbia": { code: "RS", name: "Serbia" },
  "bulgaria": { code: "BG", name: "Bulgaria" },
  "luxembourg": { code: "LU", name: "Luxembourg" },
  "qatar": { code: "QA", name: "Qatar" },
  "bahrain": { code: "BH", name: "Bahrain" },
  "kuwait": { code: "KW", name: "Kuwait" },
};

const US_STATES: Set<string> = new Set([
  "california", "new york", "texas", "illinois", "massachusetts",
  "colorado", "washington", "georgia", "virginia", "north carolina",
  "south carolina", "florida", "pennsylvania", "ohio", "michigan",
  "minnesota", "oregon", "arizona", "nevada", "utah", "connecticut",
  "new jersey", "maryland", "tennessee", "missouri", "wisconsin",
  "indiana", "iowa", "kansas", "nebraska", "oklahoma", "arkansas",
  "kentucky", "alabama", "mississippi", "louisiana", "delaware",
  "rhode island", "vermont", "new hampshire", "maine", "montana",
  "idaho", "wyoming", "south dakota", "north dakota", "alaska", "hawaii",
  "ca", "ny", "tx", "il", "ma", "co", "wa", "ga", "va", "nc",
  "sc", "fl", "pa", "oh", "mi", "mn", "or", "az", "nv", "ut",
  "ct", "nj", "md", "tn", "mo", "wi", "in", "ia", "ks", "ne",
  "ok", "ar", "ky", "al", "ms", "la", "de", "ri", "vt", "nh",
  "me", "mt", "id", "wy", "sd", "nd", "ak", "hi",
]);

const CANADIAN_PROVINCES: Set<string> = new Set([
  "ontario", "quebec", "british columbia", "alberta", "manitoba",
  "saskatchewan", "on", "qc", "bc", "ab",
]);

const REMOTE_KEYWORDS = /\b(remote|work from home|wfh|telecommute|virtual)\b/i;
const HYBRID_KEYWORDS = /\bhybrid\b/i;
const WORLDWIDE_KEYWORDS = /\b(worldwide|global|anywhere|global remote|remote - global)\b/i;
const MULTI_LOCATION = /^\d+ locations?$|^multiple locations?$/i;
const REGION_KEYWORDS = /^(americas|apac|asia-pacific|emea|europe|asia|latin america|middle east|africa)$/i;

export function normalizeCountry(locationRaw: string | null | undefined, isRemoteFlag?: boolean): NormalizedCountry {
  if (!locationRaw || !locationRaw.trim()) {
    return {
      countryCode: isRemoteFlag ? "WW" : "UN",
      countryName: isRemoteFlag ? "Worldwide" : "Unknown",
      workMode: isRemoteFlag ? "remote" : "onsite",
    };
  }

  const raw = locationRaw.trim();
  const lower = raw.toLowerCase();

  let workMode: "onsite" | "hybrid" | "remote" = "onsite";
  if (isRemoteFlag || REMOTE_KEYWORDS.test(lower)) {
    workMode = "remote";
  } else if (HYBRID_KEYWORDS.test(lower)) {
    workMode = "hybrid";
  }

  if (WORLDWIDE_KEYWORDS.test(lower)) {
    return { countryCode: "WW", countryName: "Worldwide", workMode: "remote" };
  }

  if (lower === "remote" || lower === "fully remote" || lower === "not specified") {
    return { countryCode: isRemoteFlag ? "WW" : "UN", countryName: isRemoteFlag ? "Worldwide" : "Unknown", workMode: isRemoteFlag ? "remote" : workMode };
  }

  const remoteCountryDirect = lower.match(/^remote\s+(us|usa|uk|canada|india|germany|france|australia)$/i);
  if (remoteCountryDirect) {
    const country = remoteCountryDirect[1].toLowerCase();
    if (COUNTRY_NAME_TO_CODE[country]) {
      return { countryCode: COUNTRY_NAME_TO_CODE[country].code, countryName: COUNTRY_NAME_TO_CODE[country].name, workMode: "remote" };
    }
  }

  if (MULTI_LOCATION.test(lower)) {
    return { countryCode: "WW", countryName: "Worldwide", workMode };
  }

  if (REGION_KEYWORDS.test(lower)) {
    return { countryCode: "WW", countryName: "Worldwide", workMode };
  }

  let cleaned = lower
    .replace(/\s*\((on-?site|hybrid|remote|in-?office|flexible)\)\s*/i, "")
    .replace(/\s*[-–—]\s*(on-?site|hybrid|in-?office)\s*$/i, "")
    .replace(/\s*(hq|headquarters|office|campus|hub)\s*$/i, "")
    .trim();

  const remoteWithCountry = cleaned.match(/^remote\s*[-–—]\s*(.+)$/i);
  if (remoteWithCountry) {
    workMode = "remote";
    cleaned = remoteWithCountry[1].trim();
  }

  const remoteParens = cleaned.match(/^remote\s*\((.+)\)$/i);
  if (remoteParens) {
    workMode = "remote";
    cleaned = remoteParens[1].trim();
  }

  if (CITY_TO_COUNTRY[cleaned]) {
    const match = CITY_TO_COUNTRY[cleaned];
    return { countryCode: match.code, countryName: match.name, workMode };
  }

  if (COUNTRY_NAME_TO_CODE[cleaned]) {
    const match = COUNTRY_NAME_TO_CODE[cleaned];
    return { countryCode: match.code, countryName: match.name, workMode };
  }

  if (US_STATES.has(cleaned)) {
    return { countryCode: "US", countryName: "United States", workMode };
  }

  if (CANADIAN_PROVINCES.has(cleaned)) {
    return { countryCode: "CA", countryName: "Canada", workMode };
  }

  const commaParts = cleaned.split(",").map(p => p.trim()).filter(Boolean);

  for (let i = commaParts.length - 1; i >= 0; i--) {
    const segment = commaParts[i];
    if (COUNTRY_NAME_TO_CODE[segment]) {
      return { countryCode: COUNTRY_NAME_TO_CODE[segment].code, countryName: COUNTRY_NAME_TO_CODE[segment].name, workMode };
    }
    if (US_STATES.has(segment)) {
      return { countryCode: "US", countryName: "United States", workMode };
    }
    if (CANADIAN_PROVINCES.has(segment)) {
      return { countryCode: "CA", countryName: "Canada", workMode };
    }
    if (CITY_TO_COUNTRY[segment]) {
      return { countryCode: CITY_TO_COUNTRY[segment].code, countryName: CITY_TO_COUNTRY[segment].name, workMode };
    }
    const words = segment.split(/\s+/);
    if (words.length > 1) {
      for (let j = words.length - 1; j >= 0; j--) {
        const sub = words.slice(j).join(" ");
        if (COUNTRY_NAME_TO_CODE[sub]) {
          return { countryCode: COUNTRY_NAME_TO_CODE[sub].code, countryName: COUNTRY_NAME_TO_CODE[sub].name, workMode };
        }
        if (US_STATES.has(sub)) {
          return { countryCode: "US", countryName: "United States", workMode };
        }
        if (CANADIAN_PROVINCES.has(sub)) {
          return { countryCode: "CA", countryName: "Canada", workMode };
        }
      }
      for (const w of words) {
        if (CITY_TO_COUNTRY[w]) {
          return { countryCode: CITY_TO_COUNTRY[w].code, countryName: CITY_TO_COUNTRY[w].name, workMode };
        }
      }
    }
  }

  return { countryCode: "UN", countryName: "Unknown", workMode };
}
