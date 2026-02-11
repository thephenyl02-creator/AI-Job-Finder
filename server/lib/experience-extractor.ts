export interface ExperienceResult {
  experienceMin: number | null;
  experienceMax: number | null;
  experienceText: string;
  confidence: number;
}

const PATTERNS = [
  { regex: /(\d{1,2})\s*\+\s*years?\b/gi, type: 'plus' },
  { regex: /(\d{1,2})\s*[-–—to]+\s*(\d{1,2})\s*years?\b/gi, type: 'range' },
  { regex: /(?:at\s+least|minimum(?:\s+of)?|no\s+less\s+than)\s+(\d{1,2})\s*years?\b/gi, type: 'min' },
  { regex: /(\d{1,2})\s*years?\s*(?:of\s+)?(?:relevant|professional|legal|hands[\s-]on|practical|direct|progressive|post[\s-]?qualif|PQE)\s*(?:experience|work)/gi, type: 'exact' },
  { regex: /(\d{1,2})\s*years?\s*(?:of\s+)?experience/gi, type: 'exact' },
  { regex: /experience\s*(?:of\s+)?(\d{1,2})\s*\+?\s*years?\b/gi, type: 'exact' },
  { regex: /(\d{1,2})\s*(?:years?|yrs?)[\s-]*PQE/gi, type: 'exact' },
  { regex: /PQE\s*(?:of\s+)?(\d{1,2})\s*(?:years?|yrs?)/gi, type: 'exact' },
];

interface Match {
  min: number;
  max: number | null;
  text: string;
  confidence: number;
}

function extractMatches(text: string): Match[] {
  const matches: Match[] = [];

  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let m: RegExpExecArray | null;

    while ((m = regex.exec(text)) !== null) {
      const num1 = parseInt(m[1], 10);

      if (num1 > 30 || num1 === 0) continue;

      if (pattern.type === 'range') {
        const num2 = parseInt(m[2], 10);
        if (num2 > 30 || num2 <= num1) continue;
        matches.push({
          min: num1,
          max: num2,
          text: `${num1}-${num2} years`,
          confidence: 0.95,
        });
      } else if (pattern.type === 'plus') {
        matches.push({
          min: num1,
          max: null,
          text: `${num1}+ years`,
          confidence: 0.9,
        });
      } else if (pattern.type === 'min') {
        matches.push({
          min: num1,
          max: null,
          text: `${num1}+ years`,
          confidence: 0.9,
        });
      } else {
        matches.push({
          min: num1,
          max: num1 + 2,
          text: `${num1} years`,
          confidence: 0.85,
        });
      }
    }
  }

  return matches;
}

export function extractExperience(description: string): ExperienceResult {
  if (!description || description.length < 20) {
    return { experienceMin: null, experienceMax: null, experienceText: 'Not specified', confidence: 0 };
  }

  const matches = extractMatches(description);

  if (matches.length === 0) {
    return { experienceMin: null, experienceMax: null, experienceText: 'Not specified', confidence: 0 };
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  const best = matches[0];

  return {
    experienceMin: best.min,
    experienceMax: best.max,
    experienceText: best.text,
    confidence: best.confidence,
  };
}

export function determineSeniority(experienceMin: number | null): string {
  if (experienceMin === null) return 'Not specified';
  if (experienceMin <= 2) return 'Entry';
  if (experienceMin <= 5) return 'Mid';
  if (experienceMin <= 8) return 'Senior';
  if (experienceMin <= 12) return 'Lead';
  return 'Director+';
}
