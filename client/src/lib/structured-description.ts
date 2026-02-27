import type { StructuredDescription } from "@shared/schema";

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
    .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
    .replace(/&bull;/g, '\u2022').replace(/&hellip;/g, '\u2026')
    .replace(/&trade;/g, '\u2122').replace(/&copy;/g, '\u00A9').replace(/&reg;/g, '\u00AE')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

export function fixMissingSentenceSpaces(text: string): string {
  const abbreviations = /^(?:Mr|Ms|Mrs|Dr|Jr|Sr|St|vs|etc|ie|eg|al|Prof|Gen|Gov|Rev|Hon|Inc|Ltd|Co|Corp|LLC|Vol|No|Fig|Eq|Dept|Est|Assn|Intl)$/i;
  let result = '';
  let lastIndex = 0;
  const re = /(\w)([.!?])([A-Z][a-z])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const matchPos = m.index;
    const lookback = text.slice(Math.max(0, matchPos - 12), matchPos + 1);
    const lastWord = lookback.match(/([A-Za-z]+)$/)?.[1] || '';
    if (lastWord.length === 1 || abbreviations.test(lastWord)) continue;
    result += text.slice(lastIndex, matchPos) + m[1] + m[2] + ' ' + m[3];
    lastIndex = matchPos + m[0].length;
  }
  result += text.slice(lastIndex);
  return result;
}

export function cleanStructuredText(text: string): string {
  let cleaned = decodeHtmlEntities(text);
  cleaned = fixMissingSentenceSpaces(cleaned);
  return cleaned;
}

export function parseStructuredDescription(raw: unknown): StructuredDescription | null {
  if (raw === null || raw === undefined) return null;
  let data: unknown = raw;

  if (typeof data === 'string') {
    if (!data.trim()) return null;
    try { data = JSON.parse(data); } catch { return null; }
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return null; }
    }
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;

  const obj = data as Record<string, unknown>;
  const keys = ['aboutCompany', 'responsibilities', 'minimumQualifications', 'preferredQualifications', 'skillsRequired'] as const;
  const hasAnyKey = keys.some(k => {
    const v = obj[k];
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });

  if (!hasAnyKey) return null;

  const result: StructuredDescription = {
    summary: typeof obj.summary === 'string' ? obj.summary : '',
    aboutCompany: typeof obj.aboutCompany === 'string' ? obj.aboutCompany : '',
    responsibilities: Array.isArray(obj.responsibilities) ? obj.responsibilities.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [],
    minimumQualifications: Array.isArray(obj.minimumQualifications) ? obj.minimumQualifications.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [],
    preferredQualifications: Array.isArray(obj.preferredQualifications) ? obj.preferredQualifications.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [],
    skillsRequired: Array.isArray(obj.skillsRequired) ? obj.skillsRequired.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [],
    seniority: typeof obj.seniority === 'string' ? obj.seniority : '',
    legalTechCategory: typeof obj.legalTechCategory === 'string' ? obj.legalTechCategory : '',
  };

  return result;
}
