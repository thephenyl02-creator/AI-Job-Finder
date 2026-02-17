const LOCATION_ALIASES: Record<string, string> = {
  'new york city': 'New York',
  'nyc': 'New York',
  'ny': 'New York',
  'manhattan': 'New York',
  'brooklyn': 'New York',
  'queens': 'New York',
  'san francisco bay area': 'San Francisco',
  'san francisco, california': 'San Francisco',
  'san francisco, ca': 'San Francisco',
  'sf': 'San Francisco',
  'sf bay area': 'San Francisco',
  'bay area': 'San Francisco',
  'silicon valley': 'San Francisco',
  'palo alto': 'San Francisco Bay Area',
  'mountain view': 'San Francisco Bay Area',
  'los angeles': 'Los Angeles',
  'los angeles, ca': 'Los Angeles',
  'la': 'Los Angeles',
  'washington dc': 'Washington, DC',
  'washington d.c.': 'Washington, DC',
  'washington, d.c.': 'Washington, DC',
  'dc': 'Washington, DC',
  'd.c.': 'Washington, DC',
  'chicago, il': 'Chicago',
  'boston, ma': 'Boston',
  'seattle, wa': 'Seattle',
  'austin, tx': 'Austin',
  'denver, co': 'Denver',
  'dallas, tx': 'Dallas',
  'houston, tx': 'Houston',
  'atlanta, ga': 'Atlanta',
  'charlotte, nc': 'Charlotte',
  'miami, fl': 'Miami',
  'portland, or': 'Portland',
  'minneapolis, mn': 'Minneapolis',
  'philadelphia, pa': 'Philadelphia',
  'phoenix, az': 'Phoenix',
  'san diego, ca': 'San Diego',
  'san jose, ca': 'San Jose',
  'salt lake city, utah': 'Salt Lake City',
  'salt lake city, ut': 'Salt Lake City',
  'stockholm, sweden': 'Stockholm',
  'stockholm hq': 'Stockholm',
  'london, united kingdom': 'London',
  'london, uk': 'London',
  'london, england': 'London',
  'toronto, canada': 'Toronto',
  'toronto, on': 'Toronto',
  'toronto, ontario': 'Toronto',
  'dublin, ireland': 'Dublin',
  'amsterdam, netherlands': 'Amsterdam',
  'berlin, germany': 'Berlin',
  'paris, france': 'Paris',
  'munich, germany': 'Munich',
  'sydney, australia': 'Sydney',
  'singapore, singapore': 'Singapore',
  'bengaluru, india': 'Bengaluru',
  'bangalore, india': 'Bengaluru',
  'bangalore': 'Bengaluru',
  'mumbai, india': 'Mumbai',
  'remote - united states': 'United States',
  'remote - us': 'United States',
  'remote - usa': 'United States',
  'remote - canada': 'Canada',
  'remote - uk': 'United Kingdom',
  'remote - india': 'India',
};

const HQ_SUFFIXES = /\s+(hq|headquarters|head\s*quarters|office|campus|hub|location)\s*$/i;

export function normalizeLocation(raw: string | null | undefined): string {
  if (!raw || raw.trim() === '') return '';

  let location = raw.trim();

  location = location.replace(HQ_SUFFIXES, '');

  location = location.replace(/\s*\((on-?site|hybrid|remote|in-?office)\)\s*/i, '');
  location = location.replace(/\s*-\s*(on-?site|hybrid|in-?office)\s*$/i, '');

  if (/^remote\s*[-–—]\s*(.+)$/i.test(location)) {
    const match = location.match(/^remote\s*[-–—]\s*(.+)$/i);
    if (match) {
      location = match[1].trim();
    }
  }

  const lowerLoc = location.toLowerCase().trim();
  if (LOCATION_ALIASES[lowerLoc]) {
    return LOCATION_ALIASES[lowerLoc];
  }

  const KNOWN_SUFFIXES = /,\s*(United States|USA|US|United Kingdom|UK|England|Canada|Australia|Germany|France|Ireland|Netherlands|Sweden|India|Japan|Singapore|Mexico|Brazil|Spain|South Korea|Korea|China|Israel|Switzerland|Austria|Belgium|Norway|Denmark|Finland|Italy|Portugal|New Zealand|Philippines|Indonesia|Thailand|Vietnam|Taiwan|Hong Kong|UAE|Saudi Arabia|South Africa|Nigeria|Kenya|Egypt|Colombia|Argentina|Chile|Peru|Czech Republic|Poland|Hungary|Romania|Greece|Turkey|Ukraine|Croatia|Serbia|Bulgaria|Slovenia|Slovakia|Latvia|Lithuania|Estonia|California|New York|Texas|Illinois|Massachusetts|Colorado|Washington|Georgia|Virginia|North Carolina|South Carolina|Florida|Pennsylvania|Ohio|Michigan|Minnesota|Oregon|Arizona|Nevada|Utah|Connecticut|New Jersey|Maryland|Tennessee|Missouri|Wisconsin|Indiana|Iowa|Kansas|Nebraska|Oklahoma|Arkansas|Kentucky|Alabama|Mississippi|Louisiana|Delaware|Rhode Island|Vermont|New Hampshire|Maine|Montana|Idaho|Wyoming|South Dakota|North Dakota|Alaska|Hawaii|Ontario|Quebec|British Columbia|Alberta|Manitoba|Saskatchewan|BC|ON|QC|AB|CA|NY|TX|IL|MA|CO|WA|GA|VA|NC|SC|FL|PA|OH|MI|MN|OR|AZ|NV|UT|CT|NJ|MD|TN|MO|WI|IN|IA|KS|NE|OK|AR|KY|AL|MS|LA|DE|RI|VT|NH|ME|MT|ID|WY|SD|ND|AK|HI)\s*$/i;
  
  const suffixMatch = location.match(KNOWN_SUFFIXES);
  if (suffixMatch) {
    const city = location.replace(KNOWN_SUFFIXES, '').trim();
    if (city.length > 0) {
      location = city;
    }
  }

  location = location.replace(/\s{2,}/g, ' ').trim();

  if (location.length > 0) {
    location = location.charAt(0).toUpperCase() + location.slice(1);
  }

  return location;
}
