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
  const text = `${title} ${desc}`.toLowerCase();

  if (orgType === 'lawfirm' || orgType === 'legalaid') return true;

  const legalKeywords = [
    'attorney', 'lawyer', 'counsel', 'paralegal', 'legal assistant',
    'litigation', 'associate', 'legal operations', 'legal ops',
    'contract', 'compliance', 'regulatory', 'corporate counsel',
    'in-house', 'general counsel', 'legal analyst', 'legal specialist',
    'legal advisor', 'legal consultant', 'jd', 'law clerk', 'legal intern',
  ];

  const techKeywords = [
    'engineer', 'developer', 'product', 'designer', 'data', 'ml', 'ai ',
    'machine learning', 'nlp', 'software', 'technical', 'solutions',
    'implementation', 'customer success', 'sales', 'operations',
    'innovation', 'technology', 'ediscovery', 'analytics', 'platform',
    'devops', 'cloud', 'security', 'qa', 'quality', 'ux', 'ui', 'frontend',
    'backend', 'full stack', 'fullstack', 'manager', 'director', 'architect',
    'marketing', 'finance', 'hr', 'people', 'business', 'admin', 'support',
    'api',
  ];

  const exclude = ['janitor', 'maintenance', 'facilities', 'cafeteria'];
  if (exclude.some(e => text.includes(e))) return false;

  return legalKeywords.some(k => text.includes(k)) ||
         techKeywords.some(k => text.includes(k));
}
