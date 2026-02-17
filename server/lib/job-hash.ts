import crypto from 'crypto';

function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeTitle(title: string): string {
  let t = (title || '').toLowerCase().trim();
  t = t.replace(/\bsr\.?\b/g, 'senior');
  t = t.replace(/\bjr\.?\b/g, 'junior');
  t = t.replace(/\bmgr\.?\b/g, 'manager');
  t = t.replace(/\bdir\.?\b/g, 'director');
  t = t.replace(/\bvp\b/g, 'vicepresident');
  t = t.replace(/\bsvp\b/g, 'seniorvicepresident');
  t = t.replace(/\bevp\b/g, 'executivevicepresident');
  t = t.replace(/\bassoc\.?\b/g, 'associate');
  t = t.replace(/\basst\.?\b/g, 'assistant');
  t = t.replace(/\bspec\.?\b/g, 'specialist');
  t = t.replace(/\badmin\.?\b/g, 'administrator');
  t = t.replace(/\bengr\.?\b/g, 'engineer');
  t = t.replace(/\s*[-–—|/]\s*(remote|hybrid|on-?site|full-?time|part-?time|contract|temporary|intern|internship)\s*$/i, '');
  t = t.replace(/\s*\((remote|hybrid|on-?site|full-?time|part-?time|contract|temporary|intern|internship)\)\s*$/i, '');
  t = t.replace(/\s*\[.*?\]\s*$/, '');
  t = t.replace(/\s*[-–—]\s*(us|uk|eu|emea|apac|latam|americas?|global)\s*$/i, '');
  t = t.replace(/\s*(i{1,3}|iv|v|vi{0,3})\s*$/i, '');
  return t.replace(/[^a-z0-9]/g, '');
}

function normalizeLocation(loc: string): string {
  let l = (loc || '').toLowerCase().trim();
  l = l.replace(/,\s*(us|usa|united states|uk|united kingdom)$/i, '');
  l = l.replace(/\s*(remote|hybrid|on-?site)\s*[-–—/]\s*/i, '');
  return l.replace(/[^a-z0-9]/g, '');
}

export function generateJobHash(company: string, title: string, location: string, applyUrl: string): string {
  const input = [
    normalize(company),
    normalizeTitle(title),
    normalizeLocation(location),
    normalize(applyUrl),
  ].join('|');

  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

export function generateFuzzyJobHash(company: string, title: string): string {
  const input = [
    normalize(company),
    normalizeTitle(title),
  ].join('|');

  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}
