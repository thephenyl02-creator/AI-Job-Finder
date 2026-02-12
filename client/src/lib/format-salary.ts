const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  GBP: '\u00A3',
  EUR: '\u20AC',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  HKD: 'HK$',
  INR: '\u20B9',
};

export function formatSalary(
  min?: number | null,
  max?: number | null,
  currency?: string | null,
): string | null {
  if (!min && !max) return null;
  const symbol = CURRENCY_SYMBOLS[currency || 'USD'] || '$';
  const fmt = (n: number) => {
    const k = n / 1000;
    return k % 1 === 0 ? `${symbol}${k.toFixed(0)}K` : `${symbol}${k.toFixed(1)}K`;
  };
  if (min && max) return `${fmt(min)} \u2013 ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}
