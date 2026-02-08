import { fixMissingSentenceSpaces, stripHtml } from './html-utils';

function decodeHtmlEntities(text: string): string {
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

function ensureCompleteSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/[.!?:)\]"'\u201D\u2019]$/.test(trimmed)) return trimmed;
  const lastSentenceEnd = Math.max(
    trimmed.lastIndexOf('. '),
    trimmed.lastIndexOf('.\n'),
    trimmed.lastIndexOf('? '),
    trimmed.lastIndexOf('?\n'),
    trimmed.lastIndexOf('! '),
    trimmed.lastIndexOf('!\n'),
  );
  if (lastSentenceEnd > trimmed.length * 0.7) {
    return trimmed.slice(0, lastSentenceEnd + 1).trim();
  }
  if (/\.\s*$/.test(trimmed) || /[.!?]$/.test(trimmed)) return trimmed;
  const veryLastPeriod = trimmed.lastIndexOf('.');
  if (veryLastPeriod > trimmed.length * 0.5) {
    return trimmed.slice(0, veryLastPeriod + 1).trim();
  }
  return trimmed;
}

function fixAshbyDashPrefixParagraphs(text: string): string {
  const lines = text.split('\n');
  const dashLines = lines.filter(l => /^- /.test(l.trim()));
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (dashLines.length < 3 || dashLines.length < nonEmpty.length * 0.5) return text;

  const fixed: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^- /.test(trimmed)) {
      const content = trimmed.slice(2).trim();
      if (content.length > 80 && !content.includes('\n')) {
        fixed.push(content);
      } else {
        fixed.push(trimmed);
      }
    } else {
      fixed.push(trimmed);
    }
  }
  return fixed.join('\n');
}

function stripMultiParagraphCompanyIntro(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  if (paragraphs.length < 3) return text;

  const roleSignals = [
    /\b(?:about (?:the |this )?role|the (?:role|opportunity|challenge|position)|in this role|what you(?:'ll| will)|your (?:role|responsibilities|impact)|we(?:'re| are) (?:looking|seeking|hiring))\b/i,
    /(?:^|\.\s+)As (?:a|an|the) /,
    /\b(?:responsibilities|qualifications|requirements|key duties)\b/i,
    /(?:^|\.\s+)(?:You will|You'll|In this role)/,
  ];

  let roleStartIdx = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    for (const signal of roleSignals) {
      if (signal.test(p)) {
        roleStartIdx = i;
        break;
      }
    }
    if (roleStartIdx >= 0) break;
  }

  if (roleStartIdx <= 1) return text;

  const introParagraphs = paragraphs.slice(0, roleStartIdx);
  const introText = introParagraphs.join('\n\n');
  if (introText.length > text.length * 0.6) return text;

  const remaining = paragraphs.slice(roleStartIdx).join('\n\n').trim();
  if (remaining.length < 200) return text;

  let result = remaining;
  result = result.replace(/^(?:About (?:the |this )?role|The (?:Role|Opportunity|Challenge|Position|Team))\s*:?\s*\n*/i, '');

  return result;
}

function stripBoilerplate(text: string): string {
  let cleaned = text;

  cleaned = cleaned.replace(/^[A-Z][\w\s&.'()-]{2,60} is committed to providing an excellent candidate experience[^]*?(?:so our team members can review\.?\s*\n*)/i, '');
  cleaned = cleaned.replace(/^[A-Z][\w\s&.'()-]{2,60} is committed to providing an excellent candidate experience[^\n]*\.\s*\n*/i, '');

  cleaned = cleaned.replace(/^Summary:\s*/i, '');

  cleaned = cleaned.replace(/^At\s+[\w\s&.'()-]{2,40},\s+we are a team of (?:innovators|technocrats)[^]*?(?:having fun!?\s*\n*)/i, '');

  cleaned = cleaned.replace(/^ABOUT\s+(?:US|THE COMPANY|THE JOB|FIRSTBASE|NOTABENE)\s*/i, '');
  cleaned = cleaned.replace(/^About\s+(?:the company|us|the job|Axiom|Rocket Lawyer|the role)\s*:?\s*/i, '');
  cleaned = cleaned.replace(/^About\s+[\w\s&.'()-]{2,30}\s+(?:We\s)/i, 'We ');
  cleaned = cleaned.replace(/^(?:Intro description|Job Description|Role Description|Position Description)\s*:?\s*/i, '');

  cleaned = stripMultiParagraphCompanyIntro(cleaned);

  cleaned = cleaned.replace(/^(?:The Opportunity|The Role|Overview|Position Summary|Job Summary|Role Summary|Position Overview)\s*:?\s*\n*/i, '');

  const trailingPatterns = [
    /\n{2,}\s*(?:Equal\s+(?:Opportunity|Employment)|EEO Statement|EOE Statement)[^\n]*(?:\n[^\n]*){0,15}$/i,
    /\n{2,}\s*(?:OUR COMMITMENT TO (?:ACCESSIBILITY|EQUITY|DIVERSITY|INCLUSION))[^\n]*(?:\n[^\n]*){0,15}$/i,
    /\n{2,}\s*(?:Disclaimer|Legal Notice):?\s*(?:This job (?:posting|description|ad))[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n{2,}\s*(?:Pursue Truth While Finding Yours|Find Your Truth)[^\n]*(?:\n[^\n]*){0,15}$/i,
    /\n{2,}\s*(?:By applying for this role, you acknowledge)[^\n]*(?:\n[^\n]*){0,3}$/i,
    /\n{2,}\s*(?:Your privacy is important to us)[^\n]*(?:\n[^\n]*){0,3}$/i,
    /\n{2,}\s*(?:To learn more, visit:?\s*everify\.com)[^\n]*(?:\n[^\n]*){0,3}$/i,
    /\n{2,}\s*(?:Benefits|Perks|What We Offer|Why (?:Join|Work (?:at|with|here)))\s*:?\s*\n(?:[-•*]\s[^\n]*\n?){3,}$/i,
    /\n{2,}\s*(?:We are (?:an equal|committed)|[\w\s]+ is (?:an equal|committed to))[^\n]*(?:\n[^\n]*){0,10}$/i,
    /\n{2,}\s*(?:Accommodation|Reasonable (?:Accommodation|Adjustments?))[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n{2,}\s*(?:Notice to (?:Recruiters|Agency|Staffing))[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n{2,}\s*(?:E-Verify|We participate in E-Verify)[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n{2,}\s*(?:Pay Transparency|Salary Transparency|Compensation Disclosure)[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n{2,}\s*(?:About (?:the |this )?Company)\s*:?\s*\n[\s\S]*$/i,
  ];
  for (const p of trailingPatterns) {
    cleaned = cleaned.replace(p, '');
  }

  cleaned = cleaned.replace(/\n*-\s*#LI-\w+\s*/g, '');
  cleaned = cleaned.replace(/#LI-(?:Remote|Hybrid|Onsite|DNI|\w+)\s*/g, '');

  cleaned = cleaned.replace(/\n*-?\s*Find out more about our Benefits and Perks\s*\n*/gi, '\n');

  const midSectionBoilerplate = [
    /\n{2,}(?:BENEFITS|PERKS|WHAT WE OFFER)\s*:?\s*\n(?:[-•*]\s[^\n]*\n?){3,}\n*/gi,
    /\n{2,}(?:Why (?:join|work at|work with) [\w\s&.'()-]+)\s*:?\s*\n(?:[-•*]\s[^\n]*\n?){3,}\n*/gi,
  ];
  for (const p of midSectionBoilerplate) {
    cleaned = cleaned.replace(p, '\n\n');
  }

  cleaned = ensureCompleteSentence(cleaned);

  return cleaned.trim();
}

function normalizeFlatText(text: string): string {
  const newlineCount = (text.match(/\n/g) || []).length;
  if (newlineCount > 5) return splitInlineBulletsInLines(text);

  let result = text;

  result = result.replace(/\s+([A-Z][A-Z\s\u2019'&\-:]{3,60}?)(?=\s+(?:[A-Z][a-z]|[-\u2013\u2022*]|You['\u2019]|We['\u2019]|Our |The |This |While ))/g, (full, heading) => {
    const words = heading.trim().split(/\s+/);
    const allCaps = words.every((w: string) => w === w.toUpperCase() && /[A-Z]/.test(w));
    if (allCaps && words.length >= 2) {
      return '\n\n' + heading.trim() + '\n';
    }
    return full;
  });

  result = result.replace(/([.!?:])(\s+)- /g, '$1\n- ');
  result = result.replace(/ - (?=[A-Z][a-z])/g, '\n- ');

  const inlineHeadings = /\s+((?:What you (?:will be doing|bring|[''\u2019]ll do|need)|What we (?:offer|[''\u2019]re looking for)|Who you are|Nice to have|How you will|Your (?:impact|responsibilities)|The (?:role|opportunity|impact)):?\s*)/gi;
  result = result.replace(inlineHeadings, '\n\n$1\n');

  const lines = result.split('\n');
  const output: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { output.push(''); continue; }
    if (trimmed.length < 200) { output.push(trimmed); continue; }
    const split = splitLongFlatLine(trimmed);
    output.push(split);
  }

  result = output.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

function splitLongFlatLine(line: string): string {
  const sep = /\s+[-\u2013]\s+/g;
  const matches: Array<{ index: number; len: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = sep.exec(line)) !== null) {
    matches.push({ index: m.index, len: m[0].length });
  }

  if (matches.length >= 2) {
    const segments: string[] = [];
    let lastEnd = 0;
    for (const mt of matches) {
      const chunk = line.slice(lastEnd, mt.index).trim();
      if (chunk) segments.push(chunk);
      lastEnd = mt.index + mt.len;
    }
    const tail = line.slice(lastEnd).trim();
    if (tail) segments.push(tail);

    const bulletLike = segments.filter(s => s.length > 15);
    if (bulletLike.length >= 3) {
      const parts: string[] = [];
      const firstIsLabel = segments[0].length < 60 && /[:.]$/.test(segments[0].trim());
      const startIdx = firstIsLabel ? 1 : 0;
      if (firstIsLabel) parts.push(segments[0]);
      for (let i = startIdx; i < segments.length; i++) {
        parts.push('- ' + segments[i]);
      }
      return parts.join('\n');
    }
  }

  const sentenceSplits: string[] = [];
  const sentences = line.split(/(?<=[.!?])\s+(?=[A-Z])/);
  let buffer = '';
  for (const s of sentences) {
    if (buffer && buffer.length > 120) {
      sentenceSplits.push(buffer);
      buffer = s;
    } else {
      buffer = buffer ? buffer + ' ' + s : s;
    }
  }
  if (buffer) sentenceSplits.push(buffer);

  if (sentenceSplits.length > 1) {
    return sentenceSplits.join('\n\n');
  }

  return line;
}

function splitInlineBulletsInLines(text: string): string {
  return text.replace(/^(.*?)$/gm, (line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 80) return line;
    if (/^[-\u2013\u2022*]\s/.test(trimmed) && trimmed.length < 200) return line;
    return splitLongFlatLine(trimmed);
  });
}

export function cleanJobDescription(text: string): string {
  if (!text || !text.trim()) return '';

  let cleaned = text;
  cleaned = decodeHtmlEntities(cleaned);

  if (/<[a-z][^>]*>/i.test(cleaned)) {
    cleaned = stripHtml(cleaned);
  }

  cleaned = cleaned.replace(/\u00A0/g, ' ');
  cleaned = cleaned.replace(/ {2,}/g, ' ');
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
  cleaned = cleaned.replace(/^[ \t]+/gm, '');

  cleaned = fixMissingSentenceSpaces(cleaned);
  cleaned = fixAshbyDashPrefixParagraphs(cleaned);
  cleaned = stripBoilerplate(cleaned);
  cleaned = normalizeFlatText(cleaned);

  cleaned = cleaned.trim();
  return cleaned;
}

export function isDescriptionFlat(text: string): boolean {
  if (!text || text.length < 500) return false;
  const newlineCount = (text.match(/\n/g) || []).length;
  const ratio = text.length / Math.max(newlineCount, 1);
  return ratio > 300;
}
