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
    if (lastWord.length === 1 || abbreviations.test(lastWord)) {
      continue;
    }
    result += text.slice(lastIndex, matchPos) + m[1] + m[2] + ' ' + m[3];
    lastIndex = matchPos + m[0].length;
  }
  result += text.slice(lastIndex);
  result = result.replace(/([.!?])(\()([A-Z])/g, '$1 $2$3');
  return result;
}

export function stripHtml(html: string): string {
  let decoded = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));

  decoded = decoded.replace(/<br\s*\/?>/gi, '\n');
  decoded = decoded.replace(/<\/p>/gi, '\n\n');
  decoded = decoded.replace(/<\/li>/gi, '\n');
  decoded = decoded.replace(/<li[^>]*>/gi, '- ');
  decoded = decoded.replace(/<\/h[1-6]>/gi, '\n\n');
  decoded = decoded.replace(/<[^>]*>/g, ' ');
  decoded = decoded.replace(/[ \t]+/g, ' ');
  decoded = decoded.replace(/\n /g, '\n');
  decoded = decoded.replace(/\n{3,}/g, '\n\n');
  return decoded.trim();
}

export function isRelevantRole(title: string, desc: string = '', orgType?: string): boolean {
  const titleLower = title.toLowerCase().trim();

  if (orgType === 'lawfirm' || orgType === 'legalaid') return true;

  if (orgType === 'legaltech-core') return true;

  const exclude = ['janitor', 'maintenance', 'facilities', 'cafeteria', 'cook', 'custodian'];
  if (exclude.some(e => titleLower.includes(e))) return false;

  const legalTitleKeywords = [
    'attorney', 'lawyer', 'counsel', 'paralegal', 'legal',
    'litigation', 'compliance', 'regulatory', 'patent',
    'contract manager', 'contract analyst', 'contracts manager',
    'law clerk', 'ediscovery', 'e-discovery',
    'trust & safety', 'trust and safety',
    'privacy', 'policy',
  ];

  if (legalTitleKeywords.some(k => titleLower.includes(k))) return true;

  if (orgType === 'legaltech') {
    const relevantTechRoles = [
      'engineer', 'developer', 'product manager', 'product designer',
      'data scientist', 'data analyst', 'data engineer',
      'machine learning', 'ml engineer', 'ai researcher',
      'software', 'solutions engineer', 'solutions architect',
      'customer success', 'sales engineer',
      'technical account', 'devops', 'platform engineer',
      'qa engineer', 'quality engineer', 'ux researcher', 'ux designer',
      'frontend', 'backend', 'full stack', 'fullstack',
      'vp engineering', 'head of engineering',
    ];
    const wordBoundaryRoles = ['cto', 'sre', 'nlp'];
    return relevantTechRoles.some(k => titleLower.includes(k))
      || wordBoundaryRoles.some(k => new RegExp(`\\b${k}\\b`).test(titleLower));
  }

  return false;
}
