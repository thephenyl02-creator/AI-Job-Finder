export interface ParsedDescription {
  summary: string;
  responsibilities: string[];
  minimumQualifications: string[];
  preferredQualifications: string[];
  coreSkills: string[];
  compensation: string;
}

const SECTION_PATTERNS: { key: keyof Omit<ParsedDescription, 'summary' | 'coreSkills' | 'compensation'>; patterns: RegExp[] }[] = [
  {
    key: 'responsibilities',
    patterns: [
      /^(?:responsibilities|what you(?:'ll| will) (?:do|be doing)|your (?:responsibilities|impact|role)|key duties|in this role|how you will contribute|the role|what you(?:'ll| will) work on|day[- ]to[- ]day)\s*:?\s*$/i,
    ],
  },
  {
    key: 'minimumQualifications',
    patterns: [
      /^(?:minimum qualifications|qualifications|requirements|what you(?:'ll| will)? (?:need|bring)|required (?:qualifications|skills|experience)|must[- ]haves?|who you are|about you|what we(?:'re| are) looking for|basic qualifications|required)\s*:?\s*$/i,
    ],
  },
  {
    key: 'preferredQualifications',
    patterns: [
      /^(?:preferred qualifications|nice[- ]to[- ]haves?|bonus|preferred|additional qualifications|desired (?:qualifications|skills|experience)|it(?:'s| is) a plus if|what sets you apart|pluses?)\s*:?\s*$/i,
    ],
  },
];

const COMPENSATION_PATTERNS = [
  /^(?:compensation|salary|pay|total (?:compensation|rewards)|benefits & compensation)\s*:?\s*$/i,
];

const SKILL_KEYWORDS = [
  'Python', 'SQL', 'JavaScript', 'TypeScript', 'Java', 'C#', '.NET',
  'React', 'Angular', 'Node.js', 'AWS', 'Azure', 'GCP',
  'Relativity', 'iManage', 'Concordance', 'Nuix', 'Brainspace',
  'CIPP', 'CIPM', 'CISA', 'PMP', 'CISSP', 'FIP',
  'Salesforce', 'ServiceNow', 'Jira', 'Confluence',
  'eDiscovery', 'e-Discovery', 'CLM', 'contract lifecycle management',
  'Ironclad', 'DocuSign', 'Agiloft', 'Icertis', 'ContractPodAi',
  'legal hold', 'litigation hold', 'matter management',
  'GDPR', 'CCPA', 'HIPAA', 'SOX', 'AML', 'KYC',
  'machine learning', 'NLP', 'natural language processing',
  'data analytics', 'data visualization', 'Tableau', 'Power BI',
  'legal research', 'Westlaw', 'LexisNexis', 'Bloomberg Law',
  'contract drafting', 'contract review', 'due diligence',
  'regulatory compliance', 'risk management', 'audit',
  'project management', 'process improvement', 'change management',
  'stakeholder management', 'cross-functional collaboration',
  'legal operations', 'legal tech', 'legal technology',
  'privacy', 'data protection', 'information governance',
  'document management', 'records management',
  'SharePoint', 'HighQ', 'NetDocuments',
  'AI', 'artificial intelligence', 'automation',
  'API', 'REST', 'GraphQL', 'ETL',
  'Excel', 'VBA', 'Macro',
  'negotiation', 'drafting', 'analysis',
];

function extractBullets(text: string): string[] {
  const lines = text.split('\n');
  const bullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const bulletMatch = trimmed.match(/^(?:[-•*▸▹◦‣⁃·–—]\s*|\d+[.)]\s*|[a-z][.)]\s*)(.*)/);
    if (bulletMatch && bulletMatch[1]) {
      const content = bulletMatch[1].trim();
      if (content.length >= 10 && content.length <= 500) {
        bullets.push(content);
      }
    } else if (trimmed.length >= 20 && trimmed.length <= 500 && !isSectionHeading(trimmed)) {
      if (/^[A-Z]/.test(trimmed) && bullets.length > 0) {
        bullets.push(trimmed);
      }
    }
  }

  return Array.from(new Set(bullets));
}

function isSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length > 80) return false;
  if (/^[A-Z\s&/,()-]{5,}$/.test(trimmed)) return true;

  const allPatterns = [
    ...SECTION_PATTERNS.flatMap(s => s.patterns),
    ...COMPENSATION_PATTERNS,
  ];
  return allPatterns.some(p => p.test(trimmed));
}

function splitIntoSections(text: string): Map<string, string> {
  const lines = text.split('\n');
  const sections = new Map<string, string>();
  let currentKey = '__intro__';
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      currentLines.push('');
      continue;
    }

    let matched = false;
    for (const { key, patterns } of SECTION_PATTERNS) {
      if (patterns.some(p => p.test(trimmed))) {
        sections.set(currentKey, currentLines.join('\n'));
        currentKey = key;
        currentLines = [];
        matched = true;
        break;
      }
    }

    if (!matched && COMPENSATION_PATTERNS.some(p => p.test(trimmed))) {
      sections.set(currentKey, currentLines.join('\n'));
      currentKey = '__compensation__';
      currentLines = [];
      matched = true;
    }

    if (!matched) {
      currentLines.push(line);
    }
  }

  sections.set(currentKey, currentLines.join('\n'));
  return sections;
}

function extractSkillsFromText(text: string): string[] {
  const found: string[] = [];
  const textLower = text.toLowerCase();

  for (const skill of SKILL_KEYWORDS) {
    if (textLower.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  }

  return Array.from(new Set(found)).slice(0, 25);
}

function generateSummary(text: string, title: string, company: string): string {
  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 20)
    .slice(0, 10);

  const roleSentences = sentences.filter(s => {
    const lower = s.toLowerCase();
    return lower.includes('role') || lower.includes('position') ||
           lower.includes('responsible') || lower.includes('looking for') ||
           lower.includes('seeking') || lower.includes('opportunity') ||
           lower.includes('join') || lower.includes('team');
  });

  const summaryParts = roleSentences.length >= 2
    ? roleSentences.slice(0, 3)
    : sentences.slice(0, 3);

  const summary = summaryParts.join(' ').trim();
  if (summary.length >= 30) return summary.substring(0, 500);

  return `${title} role at ${company}.`;
}

export function parseDescription(rawText: string, title: string = '', company: string = ''): ParsedDescription {
  if (!rawText || !rawText.trim()) {
    return {
      summary: title && company ? `${title} role at ${company}.` : '',
      responsibilities: [],
      minimumQualifications: [],
      preferredQualifications: [],
      coreSkills: [],
      compensation: '',
    };
  }

  const sections = splitIntoSections(rawText);

  const responsibilities = extractBullets(sections.get('responsibilities') || '');
  const minimumQualifications = extractBullets(sections.get('minimumQualifications') || '');
  const preferredQualifications = extractBullets(sections.get('preferredQualifications') || '');

  const intro = sections.get('__intro__') || '';
  const summary = generateSummary(intro || rawText, title, company);

  const compensation = (sections.get('__compensation__') || '').trim();

  const allText = rawText;
  const coreSkills = extractSkillsFromText(allText);

  return {
    summary,
    responsibilities,
    minimumQualifications,
    preferredQualifications,
    coreSkills,
    compensation,
  };
}
