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
  let decoded = html;

  decoded = decoded.replace(/<br\s*\/?>/gi, '\n');
  decoded = decoded.replace(/<\/p>/gi, '\n\n');
  decoded = decoded.replace(/<\/li>/gi, '\n');
  decoded = decoded.replace(/<li[^>]*>/gi, '- ');
  decoded = decoded.replace(/<\/h[1-6]>/gi, '\n\n');
  decoded = decoded.replace(/<[^>]*>/g, ' ');

  decoded = decoded.replace(/&mdash;/g, '\u2014');
  decoded = decoded.replace(/&ndash;/g, '\u2013');
  decoded = decoded.replace(/&rsquo;/g, '\u2019');
  decoded = decoded.replace(/&lsquo;/g, '\u2018');
  decoded = decoded.replace(/&rdquo;/g, '\u201D');
  decoded = decoded.replace(/&ldquo;/g, '\u201C');
  decoded = decoded.replace(/&bull;/g, '\u2022');
  decoded = decoded.replace(/&hellip;/g, '\u2026');
  decoded = decoded.replace(/&trade;/g, '\u2122');
  decoded = decoded.replace(/&copy;/g, '\u00A9');
  decoded = decoded.replace(/&reg;/g, '\u00AE');
  decoded = decoded.replace(/&nbsp;/g, ' ');
  decoded = decoded.replace(/&lt;/g, '<');
  decoded = decoded.replace(/&gt;/g, '>');
  decoded = decoded.replace(/&quot;/g, '"');
  decoded = decoded.replace(/&#39;/g, "'");
  decoded = decoded.replace(/&apos;/g, "'");
  decoded = decoded.replace(/&#x27;/g, "'");
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
  decoded = decoded.replace(/&amp;/g, '&');

  decoded = decoded.replace(/[ \t]+/g, ' ');
  decoded = decoded.replace(/\n /g, '\n');
  decoded = decoded.replace(/\n{3,}/g, '\n\n');
  return decoded.trim();
}

export function isRelevantRole(title: string, desc: string = '', orgType?: string): boolean {
  const titleLower = title.toLowerCase().trim();
  const descLower = desc.toLowerCase();

  const hardExcludeTitlePatterns = [
    'general application', 'open application',
    'janitor', 'maintenance', 'facilities', 'cafeteria', 'custodian',
    'receptionist', 'office assistant', 'mail clerk',
    'data center', 'datacenter', 'hardware engineer', 'network engineer',
    'site reliability', 'sre ', 'devops', 'dev ops', 'linux admin',
    'electrical engineer', 'mechanical engineer', 'civil engineer',
    'threat intelligence', 'threat collection', 'offensive security',
    'penetration test', 'red team', 'blue team', 'soc analyst',
    'encoding librar', 'ml infrastructure', 'gpu ', 'accelerator',
    'pre-training', 'pretraining', 'sandboxing',
    'chef ', 'cook ', 'driver ', 'warehouse', 'shipping', 'logistics',
    'hvac', 'plumber', 'electrician',
    'account executive', 'demand generation', 'demand gen',
    'gift planning', 'fundrais', 'donor', 'development officer',
    'personal injury attorney', 'family law attorney',
    'right to counsel', 'tenant rights', 'homeowner defense',
    'disability advocacy', 'voting rights', 'immigrant justice',
    'foreclosure prevention', 'government benefits unit',
    'ask a lawyer',
  ];
  if (hardExcludeTitlePatterns.some(p => titleLower.includes(p))) return false;

  const traditionalLegalPatterns = [
    /^staff attorney/i, /^supervising attorney/i, /^senior staff attorney/i,
    /^senior counsel,?\s/i, /^deputy director/i,
  ];
  if (traditionalLegalPatterns.some(p => p.test(titleLower))) {
    const hasLegalTechContext = [
      'legal tech', 'legaltech', 'legal technology', 'legal ops',
      'legal operations', 'legal ai', 'legal software', 'legal automation',
      'ediscovery', 'e-discovery', 'contract lifecycle', 'clm',
      'compliance platform', 'regulatory tech', 'regtech',
    ].some(k => descLower.includes(k));
    if (!hasLegalTechContext) return false;
  }

  if (orgType === 'legaltech') return true;

  if (orgType === 'lawfirm' || orgType === 'legalaid') {
    const techRelevantTitles = [
      'engineer', 'developer', 'architect', 'designer', 'product',
      'technology', 'innovation', 'knowledge management', 'data',
      'analytics', 'automation', 'digital', 'solutions', 'implementation',
      'operations', 'project manager', 'program manager',
    ];
    return techRelevantTitles.some(k => titleLower.includes(k));
  }

  const legalTitleKeywords = [
    'legal', 'counsel', 'compliance', 'regulatory', 'governance',
    'ediscovery', 'e-discovery', 'contract', 'privacy',
    'policy', 'grc', 'risk', 'ethics', 'patent', 'ip ',
    'intellectual property', 'law clerk',
    'antitrust', 'arbitration',
  ];
  if (legalTitleKeywords.some(k => titleLower.includes(k))) return true;

  const legalTechTitleKeywords = [
    'product', 'solutions', 'customer success', 'implementation',
    'sales engineer', 'account manager',
    'business development', 'partnership', 'enablement',
    'proposal', 'presales', 'pre-sales', 'onboarding',
    'professional services', 'consulting',
  ];
  const isLegalTechTitle = legalTechTitleKeywords.some(k => titleLower.includes(k));

  const descLegalSignals = [
    'legal', 'law firm', 'attorney', 'lawyer', 'litigation',
    'ediscovery', 'e-discovery', 'compliance', 'regulatory',
    'contract management', 'legal tech', 'legaltech', 'legal technology',
    'legal operations', 'legal ops', 'corporate counsel', 'in-house counsel',
    'legal department', 'legal team', 'legal industry', 'legal market',
    'legal professional', 'legal workflow', 'legal document',
    'legal service', 'legal solution', 'legal software',
    'court', 'judicial', 'paralegal', 'governance',
  ];
  const hasLegalDescSignal = descLegalSignals.some(k => descLower.includes(k));

  if (isLegalTechTitle && hasLegalDescSignal) return true;

  const coreEngineeringTitles = [
    'software engineer', 'senior software engineer', 'staff software engineer',
    'principal software engineer', 'frontend engineer', 'backend engineer',
    'full stack engineer', 'fullstack engineer', 'data engineer',
    'data scientist', 'machine learning engineer', 'ml engineer',
    'platform engineer', 'infrastructure engineer', 'security engineer',
    'ux designer', 'ui designer', 'product designer',
    'qa engineer', 'quality engineer', 'test engineer',
    'data analyst', 'business analyst',
  ];
  const isCoreEngineering = coreEngineeringTitles.some(k => titleLower.includes(k));

  if (isCoreEngineering) {
    const strongLegalDescSignals = [
      'legal tech', 'legaltech', 'legal technology', 'legal industry',
      'legal operations', 'legal ops', 'ediscovery', 'e-discovery',
      'legal workflow', 'legal document', 'legal solution', 'legal software',
      'contract management', 'contract lifecycle', 'clm',
      'legal department', 'compliance platform', 'regulatory tech', 'regtech',
      'legal ai', 'legal nlp', 'legal automation',
    ];
    return strongLegalDescSignals.some(k => descLower.includes(k));
  }

  const directLegalTechRoles = [
    'innovation', 'knowledge management', 'knowledge engineer',
    'legal engineer', 'legal technologist', 'practice technology',
    'court technology', 'judicial', 'tax manager', 'tax analyst',
    'billing analyst', 'billing team',
  ];
  if (directLegalTechRoles.some(k => titleLower.includes(k))) return true;

  if (hasLegalDescSignal) {
    const broadRelevantTitles = [
      'manager', 'director', 'head of', 'vp ', 'vice president',
      'chief', 'lead', 'senior', 'specialist', 'coordinator',
      'strategist', 'architect', 'consultant', 'advisor',
    ];
    if (broadRelevantTitles.some(k => titleLower.includes(k))) return true;
  }

  return false;
}
