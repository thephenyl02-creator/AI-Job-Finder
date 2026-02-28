import * as cheerio from 'cheerio';

export interface ParsedJob {
  title: string;
  company: string;
  location: string;
  applyUrl: string;
  department?: string;
}

const JOB_LINK_PATTERNS = [
  /\/jobs?\//i, /\/careers?\//i, /\/positions?\//i, /\/openings?\//i,
  /\/opportunities?\//i, /\/vacanci/i, /\/apply\//i, /\/posting/i,
  /gh_jid=/i, /lever\.co\//i, /ashbyhq\.com\//i, /workday/i,
  /icims\.com\//i, /rippling/i, /smartrecruiters/i, /jobvite/i,
  /myworkdayjobs/i, /greenhouse/i,
];

const SKIP_PATTERNS = [
  /\.(pdf|doc|docx|png|jpg|jpeg|gif|svg|css|js)$/i,
  /\/(about|contact|privacy|terms|blog|news|press|faq|help|login|signup|register|#)/i,
  /^mailto:/i, /^tel:/i, /^javascript:/i,
];

const NAV_TEXT_PATTERNS = /^(home|about|contact|menu|close|open|search|login|back|next|prev|more|see all|view all|apply now|learn more|read more|explore|subscribe|sign up|follow|cookie|accept|decline|dismiss)$/i;

export function parseJobsFromHTML(html: string, companyName: string, baseUrl?: string): ParsedJob[] {
  const $ = cheerio.load(html);
  const jobs: ParsedJob[] = [];
  const seenUrls = new Set<string>();
  const origin = baseUrl ? new URL(baseUrl).origin : '';

  const containerSelectors = [
    '[class*="job"], [class*="career"], [class*="position"], [class*="opening"], [class*="vacancy"]',
    '[class*="listing"], [class*="opportunity"]',
    '[id*="job"], [id*="career"], [id*="position"], [id*="opening"]',
    'table tbody tr, .list-group-item, ul.jobs li, ol.jobs li',
    '[role="listitem"]',
  ];

  for (const sel of containerSelectors) {
    $(sel).each((i, element) => {
      const $item = $(element);
      const $link = $item.find('a[href]').first();
      if (!$link.length) return;

      let href = $link.attr('href') || '';
      if (!href || href === '#') return;
      if (SKIP_PATTERNS.some(p => p.test(href))) return;

      if (!href.startsWith('http') && origin) {
        try { href = new URL(href, baseUrl || origin).href; } catch { return; }
      }
      if (seenUrls.has(href)) return;
      seenUrls.add(href);

      let title = $link.text().trim();
      if (!title) title = $item.find('h2, h3, h4, h5, .title').first().text().trim();
      if (!title || title.length < 3 || title.length > 200) return;
      if (NAV_TEXT_PATTERNS.test(title)) return;

      const locEl = $item.find('[class*="location"], .location, .city, [class*="city"], [class*="loc"]').first();
      const location = locEl.text().trim() || 'Not specified';

      const deptEl = $item.find('[class*="department"], [class*="dept"], [class*="team"], [class*="category"]').first();
      const department = deptEl.text().trim() || undefined;

      jobs.push({ title, company: companyName, location, applyUrl: href, department });
    });
    if (jobs.length > 0) break;
  }

  if (jobs.length === 0) {
    $('a[href]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      if (!href || href === '#' || href === '/') return;
      if (SKIP_PATTERNS.some(p => p.test(href))) return;

      let fullUrl = href;
      if (!href.startsWith('http') && origin) {
        try { fullUrl = new URL(href, baseUrl || origin).href; } catch { return; }
      }
      if (seenUrls.has(fullUrl)) return;

      const text = $el.text().trim();
      const looksLikeJobLink = JOB_LINK_PATTERNS.some(p => p.test(fullUrl));
      const hasJobTitle = text.length > 5 && text.length < 200 && !NAV_TEXT_PATTERNS.test(text);

      if (looksLikeJobLink && hasJobTitle) {
        seenUrls.add(fullUrl);
        const parent = $el.parent();
        const locEl = parent.find('[class*="location"], .location').first();
        const location = locEl.text().trim() || 'Not specified';

        jobs.push({ title: text, company: companyName, location, applyUrl: fullUrl });
      }
    });
  }

  return jobs;
}
