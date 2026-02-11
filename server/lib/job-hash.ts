import crypto from 'crypto';

function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

export function generateJobHash(company: string, title: string, location: string, applyUrl: string): string {
  const input = [
    normalize(company),
    normalize(title),
    normalize(location),
    normalize(applyUrl),
  ].join('|');

  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}
