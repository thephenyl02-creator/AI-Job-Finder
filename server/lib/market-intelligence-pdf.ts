import PDFDocument from "pdfkit";

const NAVY = "#1e293b";
const NAVY_LIGHT = "#334155";
const ACCENT = "#3b82f6";
const GRAY_50 = "#f8fafc";
const GRAY_100 = "#f1f5f9";
const GRAY_200 = "#e2e8f0";
const GRAY_300 = "#cbd5e1";
const GRAY_400 = "#94a3b8";
const GRAY_500 = "#64748b";
const GRAY_600 = "#475569";
const WHITE = "#ffffff";
const TEAL = "#0d9488";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const USABLE_BOTTOM = PAGE_HEIGHT - 56;

interface MarketData {
  overview: { totalJobs: number; totalCompanies: number; totalCountries: number; newJobsThisWeek: number; remotePercentage: number; jobsWithSalary: number };
  skillsDemand: { skill: string; count: number }[];
  careerPaths: { name: string; jobCount: number; percentage: number; newThisWeek: number }[];
  salaryByPath: { name: string; medianMin: number; medianMax: number; sampleSize: number }[];
  workMode: { remote: number; hybrid: number; onsite: number };
  aiIntensity: { low: number; medium: number; high: number };
  seniorityDistribution: { level: string; count: number }[];
  topCompanies: { company: string; jobCount: number }[];
  geography: { countryCode: string; countryName: string; jobCount: number }[];
  historicalTrends?: {
    totalEverScraped: number;
    jobsByMonth: Record<string, number>;
    publishedByMonth: Record<string, number>;
    categoryByMonth: Record<string, Record<string, number>>;
    workModeByMonth: Record<string, Record<string, number>>;
    skillTrends: Record<string, { name: string; count: number }[]>;
  };
  transitionIntelligence?: {
    totalTransitionFriendly: number;
    transitionFriendlyPct: number;
    avgExperience: number;
    trackSummary: {
      track: string;
      jobCount: number;
      percentage: number;
      transitionFriendlyPct: number;
      avgExperience: number;
      topSkills: { skill: string; count: number }[];
    }[];
    entryCorridor: {
      category: string;
      track: string;
      jobCount: number;
      accessibilityScore: number;
      transitionFriendly: number;
      avgExperience: number;
      entryMidPct: number;
    }[];
    skillBridge: Record<string, {
      youHave: { skill: string; count: number }[];
      toBuild: { skill: string; count: number }[];
    }>;
    transitionEmployers: {
      company: string;
      transitionFriendlyCount: number;
      tracks: string[];
    }[];
  };
}

function getQuarterLabel(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

function getPeriodTitle(period: string): string {
  const now = new Date();
  if (period === "weekly") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    return `Weekly Briefing  ·  ${fmt(weekAgo)} – ${fmt(now)}, ${now.getFullYear()}`;
  }
  if (period === "monthly") {
    return `Monthly Report  ·  ${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  }
  return `Annual Report  ·  ${now.getFullYear()}`;
}

function formatSalary(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n.toLocaleString()}`;
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function fmtPct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function drawRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, fill: string, radius?: number) {
  doc.save();
  if (radius) {
    doc.roundedRect(x, y, w, h, radius).fill(fill);
  } else {
    doc.rect(x, y, w, h).fill(fill);
  }
  doc.restore();
}

function drawBar(doc: PDFKit.PDFDocument, x: number, y: number, maxW: number, fraction: number, h: number, barColor: string = NAVY) {
  drawRect(doc, x, y, maxW, h, GRAY_200, h / 2);
  if (fraction > 0) {
    const bw = Math.max(4, maxW * Math.min(fraction, 1));
    drawRect(doc, x, y, bw, h, barColor, h / 2);
  }
}

function pageHeader(doc: PDFKit.PDFDocument, pageNum: number) {
  doc.save();
  doc.fontSize(6.5).fillColor(GRAY_400).font("Helvetica")
    .text("LEGAL TECH CAREERS", MARGIN, 28, { width: CONTENT_WIDTH * 0.7, characterSpacing: 1.5 });
  doc.fontSize(6.5).fillColor(GRAY_400).font("Helvetica")
    .text(String(pageNum).padStart(2, "0"), MARGIN, 28, { width: CONTENT_WIDTH, align: "right" });
  doc.moveTo(MARGIN, 42).lineTo(PAGE_WIDTH - MARGIN, 42).strokeColor(GRAY_300).lineWidth(0.5).stroke();
  doc.restore();
}

function pageFooter(doc: PDFKit.PDFDocument, siteUrl: string = "lawjobs.co") {
  doc.save();
  doc.moveTo(MARGIN, PAGE_HEIGHT - 45).lineTo(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 45).strokeColor(GRAY_300).lineWidth(0.3).stroke();
  doc.fontSize(5.5).fillColor(GRAY_400).font("Helvetica")
    .text(`Source: ${siteUrl} — Proprietary data. Do not redistribute without permission.`, MARGIN, PAGE_HEIGHT - 38, { width: CONTENT_WIDTH / 2 });
  doc.fontSize(5.5).fillColor(GRAY_400).font("Helvetica")
    .text(`© ${new Date().getFullYear()} Legal Tech Careers. All rights reserved.`, MARGIN, PAGE_HEIGHT - 38, { width: CONTENT_WIDTH, align: "right" });
  doc.restore();
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number, pn: { val: number }) {
  if (doc.y > USABLE_BOTTOM || doc.y + needed > USABLE_BOTTOM) {
    newContentPage(doc, pn);
  }
}

function newContentPage(doc: PDFKit.PDFDocument, pn: { val: number }) {
  (doc as any)._explicitPage = true;
  doc.addPage({ size: "LETTER", margin: MARGIN });
  pn.val++;
  pageHeader(doc, pn.val);
  pageFooter(doc, (doc as any)._siteUrl || "lawjobs.co");
  doc.y = 56;
}

function sectionTitle(doc: PDFKit.PDFDocument, num: string, title: string, pn: { val: number }) {
  ensureSpace(doc, 120, pn);
  const y = doc.y;
  doc.save();
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(GRAY_300).lineWidth(0.5).stroke();
  doc.restore();
  doc.save();
  doc.fontSize(7).fillColor(ACCENT).font("Helvetica-Bold").text(num, MARGIN, y + 10);
  doc.fontSize(14).fillColor(NAVY).font("Helvetica-Bold").text(title, MARGIN + 24, y + 8, { width: CONTENT_WIDTH - 24 });
  doc.restore();
  doc.y = y + 36;
}

function insightBlock(doc: PDFKit.PDFDocument, text: string, pn: { val: number }) {
  const textHeight = doc.font("Times-Italic").fontSize(9).heightOfString(text, { width: CONTENT_WIDTH - 24, lineGap: 3 });
  ensureSpace(doc, textHeight + 16, pn);
  const y = doc.y + 4;
  doc.save();
  doc.moveTo(MARGIN, y).lineTo(MARGIN, y + textHeight + 8).strokeColor(ACCENT).lineWidth(2).stroke();
  doc.fontSize(9).fillColor(GRAY_600).font("Times-Italic")
    .text(text, MARGIN + 14, y + 4, { width: CONTENT_WIDTH - 24, lineGap: 3 });
  doc.restore();
  doc.y = y + textHeight + 16;
}

function narrativeParagraph(doc: PDFKit.PDFDocument, text: string, pn: { val: number }) {
  const textHeight = doc.font("Helvetica").fontSize(9).heightOfString(text, { width: CONTENT_WIDTH, lineGap: 3 });
  ensureSpace(doc, textHeight + 12, pn);
  const startY = doc.y;
  doc.save();
  doc.fontSize(9).fillColor(GRAY_600).font("Helvetica")
    .text(text, MARGIN, startY, { width: CONTENT_WIDTH, lineGap: 3 });
  doc.restore();
  doc.y = startY + textHeight + 12;
}

function tableHeaderRow(doc: PDFKit.PDFDocument, cols: { text: string; x: number; w: number; align?: string }[]) {
  const y = doc.y;
  drawRect(doc, MARGIN, y - 2, CONTENT_WIDTH, 16, NAVY);
  doc.save();
  for (const c of cols) {
    doc.fontSize(6.5).fillColor(WHITE).font("Helvetica-Bold")
      .text(c.text, c.x, y + 1, { width: c.w, align: (c.align as any) || "left", characterSpacing: 0.5 });
  }
  doc.restore();
  doc.y = y + 16;
}

function tableDataRow(doc: PDFKit.PDFDocument, cols: { text: string; x: number; w: number; align?: string; color?: string }[], striped: boolean) {
  const y = doc.y;
  let maxH = 12;
  for (const c of cols) {
    const h = doc.font("Helvetica").fontSize(8).heightOfString(c.text, { width: c.w });
    if (h > maxH) maxH = h;
  }
  const rowH = maxH + 4;
  if (striped) drawRect(doc, MARGIN, y - 2, CONTENT_WIDTH, rowH + 1, GRAY_50);
  doc.save();
  for (const c of cols) {
    doc.fontSize(8).fillColor(c.color || NAVY).font("Helvetica")
      .text(c.text, c.x, y, { width: c.w, align: (c.align as any) || "left" });
  }
  doc.restore();
  doc.y = y + rowH;
}

function generateKeyFindings(data: MarketData): string[] {
  const findings: string[] = [];

  findings.push(
    `The legal technology sector currently lists ${fmtNum(data.overview.totalJobs)} active roles across ${fmtNum(data.overview.totalCompanies)} companies in ${data.overview.totalCountries} countries — a market with meaningful breadth for professionals exploring a transition from traditional legal practice.`
  );

  if (data.careerPaths.length > 0) {
    const top = data.careerPaths[0];
    const second = data.careerPaths.length > 1 ? data.careerPaths[1] : null;
    let text = `${top.name} leads demand with ${fmtNum(top.jobCount)} positions (${top.percentage}% of all roles)`;
    if (second) {
      text += `, followed by ${second.name} at ${second.percentage}%.`;
    } else {
      text += ".";
    }
    text += ` This concentration signals where employers are investing most heavily and where candidates may find the strongest hiring momentum.`;
    findings.push(text);
  }

  const wmTotal = (data.workMode.remote || 0) + (data.workMode.hybrid || 0) + (data.workMode.onsite || 0);
  if (wmTotal > 0) {
    const remotePct = fmtPct(data.workMode.remote, wmTotal);
    const hybridPct = fmtPct(data.workMode.hybrid, wmTotal);
    findings.push(
      `Remote and hybrid work remain accessible: ${remotePct}% of positions offer fully remote arrangements, while ${hybridPct}% are hybrid — meaning ${remotePct + hybridPct}% of the market does not require full-time office presence. This flexibility is particularly relevant for career changers who may be transitioning from a different geographic base.`
    );
  }

  if (data.salaryByPath.length > 0) {
    const sorted = [...data.salaryByPath].sort((a, b) => b.medianMax - a.medianMax);
    const highest = sorted[0];
    const withData = data.salaryByPath.filter(s => s.sampleSize >= 3);
    const accessible = withData.length > 1 ? withData[withData.length - 1] : null;
    let text = `Salary ranges are competitive: ${highest.name} tops the compensation spectrum at ${formatSalary(highest.medianMin)}–${formatSalary(highest.medianMax)} median range (${highest.sampleSize} roles reporting).`;
    if (accessible && accessible.name !== highest.name) {
      text += ` ${accessible.name} offers a more accessible entry at ${formatSalary(accessible.medianMin)}–${formatSalary(accessible.medianMax)}.`;
    }
    findings.push(text);
  }

  if (data.skillsDemand.length >= 3) {
    const top3 = data.skillsDemand.slice(0, 3);
    findings.push(
      `The most sought-after skills are ${top3[0].skill} (${fmtNum(top3[0].count)} mentions), ${top3[1].skill} (${fmtNum(top3[1].count)}), and ${top3[2].skill} (${fmtNum(top3[2].count)}). This mix of legal domain knowledge and technical fluency reflects the industry's need for professionals who can bridge both worlds — an advantage for lawyers with the right preparation.`
    );
  }

  return findings;
}

function generateSectionInsight(section: string, data: MarketData): string {
  switch (section) {
    case "executive": {
      const remoteNote = data.overview.remotePercentage > 0
        ? ` ${data.overview.remotePercentage}% of positions are remote, reflecting the sector's embrace of distributed work.`
        : "";
      return `The legal technology labor market is actively hiring across ${data.overview.totalCountries} countries, with ${fmtNum(data.overview.totalCompanies)} companies maintaining open positions.${remoteNote} Of these roles, ${fmtNum(data.overview.jobsWithSalary)} disclose salary information — a transparency rate of ${data.overview.totalJobs ? Math.round(data.overview.jobsWithSalary / data.overview.totalJobs * 100) : 0}% that reflects the sector's growing openness around compensation.`;
    }
    case "skills": {
      if (data.skillsDemand.length < 2) return "";
      const top = data.skillsDemand[0];
      const runner = data.skillsDemand[1];
      return `${top.skill} dominates employer requirements with ${fmtNum(top.count)} mentions across active listings, nearly ${top.count > runner.count * 1.5 ? "double" : "matching"} ${runner.skill} at ${fmtNum(runner.count)}. For lawyers considering a transition, these skills represent concrete learning objectives. Many — particularly contract management, compliance, and legal research — build directly on existing legal expertise.`;
    }
    case "careers": {
      if (data.careerPaths.length < 2) return "";
      const top = data.careerPaths[0];
      const weekGrowth = data.careerPaths.filter(c => c.newThisWeek > 0).sort((a, b) => b.newThisWeek - a.newThisWeek);
      let text = `${top.name} accounts for ${top.percentage}% of all positions, establishing it as the primary hiring category in legal technology.`;
      if (weekGrowth.length > 0 && weekGrowth[0].newThisWeek > 0) {
        text += ` This week, ${weekGrowth[0].name} added ${fmtNum(weekGrowth[0].newThisWeek)} new listings, suggesting active employer demand.`;
      }
      text += ` For career changers, paths like Legal Operations and Compliance Technology offer the most natural alignment with existing legal skills.`;
      return text;
    }
    case "salary": {
      if (data.salaryByPath.length === 0) return "";
      const sorted = [...data.salaryByPath].sort((a, b) => b.medianMax - a.medianMax);
      const highest = sorted[0];
      return `Compensation in legal technology is competitive with traditional practice. ${highest.name} commands the highest median range at ${formatSalary(highest.medianMin)}–${formatSalary(highest.medianMax)}, based on ${highest.sampleSize} roles with disclosed salary data. These figures suggest that a move into legal technology need not come with a significant pay cut — and for many mid-career lawyers, may represent an improvement in total compensation when factoring in work-life flexibility.`;
    }
    case "workmode": {
      const wmTotal = (data.workMode.remote || 0) + (data.workMode.hybrid || 0) + (data.workMode.onsite || 0);
      if (wmTotal === 0) return "";
      const remotePct = fmtPct(data.workMode.remote, wmTotal);
      const aiTotal = (data.aiIntensity.low || 0) + (data.aiIntensity.medium || 0) + (data.aiIntensity.high || 0);
      let text = `With ${remotePct}% of roles offering full remote work, legal technology is notably more flexible than traditional legal practice. This creates opportunities regardless of geographic location.`;
      if (aiTotal > 0) {
        const highAiPct = fmtPct(data.aiIntensity.high, aiTotal);
        text += ` Meanwhile, ${highAiPct}% of positions involve high AI intensity, indicating that artificial intelligence is becoming embedded in legal technology workflows. Understanding AI capabilities — even at a conceptual level — is increasingly valuable.`;
      }
      return text;
    }
    case "seniority": {
      if (data.seniorityDistribution.length === 0) return "";
      const total = data.seniorityDistribution.reduce((sum, s) => sum + s.count, 0);
      const entry = data.seniorityDistribution.find(s => s.level.toLowerCase().includes("entry") || s.level.toLowerCase().includes("junior"));
      const mid = data.seniorityDistribution.find(s => s.level.toLowerCase().includes("mid"));
      if (entry && mid) {
        const accessiblePct = fmtPct(entry.count + mid.count, total);
        return `${accessiblePct}% of roles are at Entry or Mid level, suggesting that the market is receptive to professionals entering from adjacent fields. Career changers with legal experience should target these positions, where domain knowledge can compensate for less technical depth.`;
      }
      const seniorEntry = data.seniorityDistribution[0];
      return `The seniority distribution is led by ${seniorEntry.level}-level roles (${fmtNum(seniorEntry.count)} positions), providing data on where hiring demand concentrates across experience levels.`;
    }
    case "companies": {
      if (data.topCompanies.length === 0 && data.geography.length === 0) return "";
      let text = "";
      if (data.topCompanies.length >= 3) {
        const topCo = data.topCompanies[0];
        text += `${topCo.company} leads hiring with ${topCo.jobCount} active positions, followed by ${data.topCompanies[1].company} and ${data.topCompanies[2].company}.`;
      }
      if (data.geography.length >= 2) {
        text += ` Geographically, ${data.geography[0].countryName} dominates with ${fmtNum(data.geography[0].jobCount)} roles, while ${data.geography[1].countryName} follows with ${fmtNum(data.geography[1].jobCount)}.`;
      }
      if (text) {
        text += ` This concentration creates clear target lists for job seekers, while the international spread opens doors for those willing to work across borders.`;
      }
      return text;
    }
    default:
      return "";
  }
}

export function generateMarketIntelligencePDF(data: MarketData, period: string, siteUrl?: string): PDFKit.PDFDocument {
  const baseUrl = siteUrl || "lawjobs.co";

  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: MARGIN, bottom: 0, left: MARGIN, right: MARGIN },
    compress: true,
    info: {
      Title: `Legal Tech Careers - ${getQuarterLabel()} Hiring Report`,
      Author: "Legal Tech Careers",
      Creator: "Legal Tech Careers Platform",
      Producer: "Legal Tech Careers",
    },
    pdfVersion: "1.4",
    autoFirstPage: true,
  });

  const pn = { val: 1 };
  (doc as any)._siteUrl = baseUrl;

  const _origAddPage = doc.addPage.bind(doc);
  (doc as any)._blockedAutoPages = 0;
  (doc as any)._explicitPage = false;
  (doc as any).addPage = function (...args: any[]) {
    if (!(doc as any)._explicitPage) {
      (doc as any)._blockedAutoPages++;
      return doc;
    }
    (doc as any)._explicitPage = false;
    return _origAddPage(...args);
  };

  // ── COVER PAGE ──
  doc.save();
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(NAVY);
  doc.restore();

  doc.save();
  doc.fontSize(8).fillColor(GRAY_400).font("Helvetica-Bold")
    .text("LEGAL TECH CAREERS", MARGIN, 72, { width: CONTENT_WIDTH, characterSpacing: 4 });
  doc.moveTo(MARGIN, 94).lineTo(MARGIN + 48, 94).strokeColor(ACCENT).lineWidth(2).stroke();

  doc.fontSize(42).fillColor(WHITE).font("Helvetica-Bold")
    .text(getQuarterLabel(), MARGIN, 130, { width: CONTENT_WIDTH });
  doc.fontSize(28).fillColor(GRAY_200).font("Helvetica")
    .text("Legal Tech", MARGIN, doc.y + 4, { width: CONTENT_WIDTH, lineGap: 2 });
  doc.fontSize(28).fillColor(GRAY_200).font("Helvetica")
    .text("Hiring Report", MARGIN, doc.y, { width: CONTENT_WIDTH });

  doc.moveDown(1);
  doc.fontSize(10).fillColor(GRAY_400).font("Helvetica")
    .text(getPeriodTitle(period), MARGIN, doc.y, { width: CONTENT_WIDTH });

  const coverStatsY = 440;
  const csBoxW = (CONTENT_WIDTH - 24) / 3;
  const coverStats = [
    { val: fmtNum(data.overview.totalJobs), label: "Active Roles" },
    { val: fmtNum(data.overview.totalCompanies), label: "Companies Tracked" },
    { val: String(data.overview.totalCountries), label: "Countries" },
  ];
  coverStats.forEach((s, i) => {
    const bx = MARGIN + i * (csBoxW + 12);
    drawRect(doc, bx, coverStatsY, csBoxW, 56, NAVY_LIGHT, 4);
    doc.save();
    doc.moveTo(bx, coverStatsY).lineTo(bx, coverStatsY + 56).strokeColor(ACCENT).lineWidth(2).stroke();
    doc.fontSize(22).fillColor(WHITE).font("Helvetica-Bold")
      .text(s.val, bx + 12, coverStatsY + 10, { width: csBoxW - 24, align: "left" });
    doc.fontSize(8).fillColor(GRAY_400).font("Helvetica")
      .text(s.label.toUpperCase(), bx + 12, coverStatsY + 37, { width: csBoxW - 24, align: "left", characterSpacing: 0.5 });
    doc.restore();
  });

  doc.fontSize(8).fillColor(GRAY_500).font("Helvetica")
    .text(
      `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      MARGIN, PAGE_HEIGHT - 80, { width: CONTENT_WIDTH }
    );
  doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica")
    .text(baseUrl, MARGIN, PAGE_HEIGHT - 66, { width: CONTENT_WIDTH });
  doc.restore();

  // ── KEY FINDINGS PAGE ──
  newContentPage(doc, pn);

  const kfY1 = doc.y;
  doc.save();
  doc.fontSize(7).fillColor(ACCENT).font("Helvetica-Bold").text("OVERVIEW", MARGIN, kfY1, { characterSpacing: 1.5 });
  doc.restore();
  doc.y = kfY1 + 14;
  const kfY2 = doc.y;
  doc.save();
  doc.fontSize(22).fillColor(NAVY).font("Helvetica-Bold").text("Key Findings", MARGIN, kfY2, { width: CONTENT_WIDTH });
  doc.restore();
  doc.y = kfY2 + 30;

  doc.save();
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).strokeColor(GRAY_300).lineWidth(0.5).stroke();
  doc.restore();
  doc.y += 12;

  const findings = generateKeyFindings(data);
  for (let i = 0; i < findings.length; i++) {
    insightBlock(doc, findings[i], pn);
  }

  // ── EXECUTIVE SUMMARY ──
  sectionTitle(doc, "01", "Executive Summary", pn);

  const boxW = (CONTENT_WIDTH - 16) / 3;
  const boxH = 48;
  ensureSpace(doc, boxH * 2 + 6 * 2 + 4, pn);
  const row1 = [
    { value: fmtNum(data.overview.totalJobs), label: "ACTIVE ROLES" },
    { value: String(data.overview.totalCompanies), label: "COMPANIES" },
    { value: String(data.overview.totalCountries), label: "COUNTRIES" },
  ];
  const row2 = [
    { value: `${data.overview.remotePercentage}%`, label: "REMOTE" },
    { value: fmtNum(data.overview.newJobsThisWeek), label: "NEW THIS WEEK" },
    { value: fmtNum(data.overview.jobsWithSalary), label: "WITH SALARY" },
  ];

  let sy = doc.y;
  [row1, row2].forEach((row, ri) => {
    row.forEach((s, i) => {
      const bx = MARGIN + i * (boxW + 8);
      drawRect(doc, bx, sy, boxW, boxH, NAVY, 4);
      doc.save();
      doc.fontSize(18).fillColor(WHITE).font("Helvetica-Bold")
        .text(s.value, bx + 8, sy + 8, { width: boxW - 16, align: "center" });
      doc.fontSize(6.5).fillColor(GRAY_300).font("Helvetica")
        .text(s.label, bx + 8, sy + 30, { width: boxW - 16, align: "center", characterSpacing: 0.8 });
      doc.restore();
    });
    sy += boxH + 6;
  });
  doc.y = sy + 4;

  const execInsight = generateSectionInsight("executive", data);
  if (execInsight) narrativeParagraph(doc, execInsight, pn);

  // ── SKILLS IN DEMAND ──
  if (data.skillsDemand.length > 0) {
    sectionTitle(doc, "02", "Skills in Demand", pn);
    const maxCount = data.skillsDemand[0]?.count || 1;
    const barMax = CONTENT_WIDTH - 170;

    for (let i = 0; i < Math.min(data.skillsDemand.length, 15); i++) {
      const s = data.skillsDemand[i];
      const nameHeight = doc.font("Helvetica").fontSize(8.5).heightOfString(s.skill, { width: 115 });
      const rowH = Math.max(15, nameHeight + 4);
      ensureSpace(doc, rowH, pn);
      const ry = doc.y;
      doc.save();
      doc.fontSize(7).fillColor(GRAY_400).font("Helvetica")
        .text(String(i + 1).padStart(2, "0"), MARGIN, ry + 1);
      doc.fontSize(8.5).fillColor(NAVY).font("Helvetica")
        .text(s.skill, MARGIN + 22, ry, { width: 115 });
      doc.restore();
      drawBar(doc, MARGIN + 140, ry + 2, barMax, s.count / maxCount, 7, i === 0 ? ACCENT : NAVY);
      doc.save();
      doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica-Bold")
        .text(fmtNum(s.count), MARGIN + 140 + barMax + 6, ry, { width: 30, align: "right" });
      doc.restore();
      doc.y = ry + rowH;
    }
    doc.y += 6;

    const skillsInsight = generateSectionInsight("skills", data);
    if (skillsInsight) insightBlock(doc, skillsInsight, pn);
  }

  // ── TRANSITION INTELLIGENCE ──
  if (data.transitionIntelligence) {
    const ti = data.transitionIntelligence;
    sectionTitle(doc, "03", "Transition Intelligence", pn);

    narrativeParagraph(doc, `${ti.transitionFriendlyPct}% of all roles (${fmtNum(ti.totalTransitionFriendly)} positions) explicitly welcome career changers — professionals transitioning from traditional legal practice into legal technology. The average experience requirement is ${ti.avgExperience} years, making many roles accessible to mid-career lawyers.`, pn);

    if (ti.trackSummary.length > 0) {
      ensureSpace(doc, 20, pn);
      doc.y += 4;
      const trackCols = [
        { x: MARGIN, w: 95 },
        { x: MARGIN + 100, w: 45 },
        { x: MARGIN + 150, w: 50 },
        { x: MARGIN + 205, w: 55 },
        { x: MARGIN + 265, w: 50 },
        { x: MARGIN + 320, w: 180 },
      ];
      tableHeaderRow(doc, [
        { text: "TRACK", ...trackCols[0] },
        { text: "JOBS", ...trackCols[1], align: "right" },
        { text: "SHARE", ...trackCols[2], align: "right" },
        { text: "TF RATE", ...trackCols[3], align: "right" },
        { text: "AVG EXP", ...trackCols[4], align: "right" },
        { text: "TOP SKILLS", ...trackCols[5] },
      ]);
      for (let i = 0; i < ti.trackSummary.length; i++) {
        ensureSpace(doc, 18, pn);
        const ts = ti.trackSummary[i];
        const topSkillsStr = ts.topSkills.slice(0, 3).map(s => s.skill).join(", ");
        tableDataRow(doc, [
          { text: ts.track, ...trackCols[0], color: NAVY },
          { text: fmtNum(ts.jobCount), ...trackCols[1], align: "right" },
          { text: `${ts.percentage}%`, ...trackCols[2], align: "right" },
          { text: `${ts.transitionFriendlyPct}%`, ...trackCols[3], align: "right" },
          { text: `${ts.avgExperience}y`, ...trackCols[4], align: "right" },
          { text: topSkillsStr, ...trackCols[5], color: GRAY_500 },
        ], i % 2 === 0);
      }
      doc.y += 8;
    }

    if (ti.entryCorridor.length > 0) {
      ensureSpace(doc, 30, pn);
      doc.save();
      doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
        .text("Entry Corridors", MARGIN, doc.y);
      doc.restore();
      doc.y += 14;
      narrativeParagraph(doc, "Categories ranked by accessibility — factoring in transition-friendly ratio, entry-level availability, experience requirements, and legal relevance.", pn);

      const ecCols = [
        { x: MARGIN, w: 170 },
        { x: MARGIN + 175, w: 60 },
        { x: MARGIN + 240, w: 70 },
        { x: MARGIN + 315, w: 40 },
        { x: MARGIN + 360, w: 55 },
        { x: MARGIN + 420, w: 55 },
      ];
      tableHeaderRow(doc, [
        { text: "CATEGORY", ...ecCols[0] },
        { text: "TRACK", ...ecCols[1] },
        { text: "ACCESS", ...ecCols[2], align: "right" },
        { text: "JOBS", ...ecCols[3], align: "right" },
        { text: "TF", ...ecCols[4], align: "right" },
        { text: "AVG EXP", ...ecCols[5], align: "right" },
      ]);
      for (let i = 0; i < Math.min(ti.entryCorridor.length, 12); i++) {
        ensureSpace(doc, 18, pn);
        const ec = ti.entryCorridor[i];
        const accLabel = ec.accessibilityScore >= 65 ? "High" : ec.accessibilityScore >= 35 ? "Moderate" : "Selective";
        tableDataRow(doc, [
          { text: ec.category, ...ecCols[0] },
          { text: ec.track, ...ecCols[1], color: GRAY_500 },
          { text: `${accLabel} (${ec.accessibilityScore})`, ...ecCols[2], align: "right" },
          { text: fmtNum(ec.jobCount), ...ecCols[3], align: "right" },
          { text: fmtNum(ec.transitionFriendly), ...ecCols[4], align: "right" },
          { text: `${ec.avgExperience}y`, ...ecCols[5], align: "right" },
        ], i % 2 === 0);
      }
      doc.y += 8;
    }

    if (ti.skillBridge && Object.keys(ti.skillBridge).length > 0) {
      ensureSpace(doc, 30, pn);
      doc.save();
      doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
        .text("Skill Bridge", MARGIN, doc.y);
      doc.restore();
      doc.y += 14;
      narrativeParagraph(doc, "Legal skills you already have vs. new skills to build — by career track.", pn);

      for (const [trackName, bridge] of Object.entries(ti.skillBridge)) {
        ensureSpace(doc, 100, pn);
        doc.save();
        doc.fontSize(8).fillColor(ACCENT).font("Helvetica-Bold")
          .text(trackName.toUpperCase(), MARGIN, doc.y, { characterSpacing: 1 });
        doc.restore();
        doc.y += 14;

        const colW = (CONTENT_WIDTH - 20) / 2;
        const startY = doc.y;

        doc.save();
        doc.fontSize(7).fillColor(TEAL).font("Helvetica-Bold")
          .text("YOU LIKELY HAVE", MARGIN, startY, { characterSpacing: 0.5 });
        doc.restore();
        let leftY = startY + 12;
        for (const s of bridge.youHave.slice(0, 5)) {
          doc.save();
          doc.fontSize(8).fillColor(NAVY).font("Helvetica")
            .text(`${s.skill}`, MARGIN + 8, leftY, { width: colW - 50 });
          doc.fontSize(7.5).fillColor(GRAY_400).font("Helvetica")
            .text(fmtNum(s.count), MARGIN + colW - 40, leftY, { width: 40, align: "right" });
          doc.restore();
          leftY += 13;
        }

        doc.save();
        doc.fontSize(7).fillColor(GRAY_500).font("Helvetica-Bold")
          .text("TO BUILD", MARGIN + colW + 20, startY, { characterSpacing: 0.5 });
        doc.restore();
        let rightY = startY + 12;
        for (const s of bridge.toBuild.slice(0, 5)) {
          doc.save();
          doc.fontSize(8).fillColor(NAVY).font("Helvetica")
            .text(`${s.skill}`, MARGIN + colW + 28, rightY, { width: colW - 50 });
          doc.fontSize(7.5).fillColor(GRAY_400).font("Helvetica")
            .text(fmtNum(s.count), MARGIN + CONTENT_WIDTH - 40, rightY, { width: 40, align: "right" });
          doc.restore();
          rightY += 13;
        }

        doc.y = Math.max(leftY, rightY) + 6;
      }
    }

    if (ti.transitionEmployers.length > 0) {
      ensureSpace(doc, 30, pn);
      doc.save();
      doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
        .text("Transition-Friendly Employers", MARGIN, doc.y);
      doc.restore();
      doc.y += 14;

      const teCols = [
        { x: MARGIN, w: 200 },
        { x: MARGIN + 205, w: 80 },
        { x: MARGIN + 290, w: 210 },
      ];
      tableHeaderRow(doc, [
        { text: "COMPANY", ...teCols[0] },
        { text: "TF ROLES", ...teCols[1], align: "right" },
        { text: "TRACKS", ...teCols[2] },
      ]);
      for (let i = 0; i < Math.min(ti.transitionEmployers.length, 10); i++) {
        ensureSpace(doc, 18, pn);
        const te = ti.transitionEmployers[i];
        tableDataRow(doc, [
          { text: te.company, ...teCols[0] },
          { text: fmtNum(te.transitionFriendlyCount), ...teCols[1], align: "right" },
          { text: te.tracks.join(", "), ...teCols[2], color: GRAY_500 },
        ], i % 2 === 0);
      }
      doc.y += 6;
    }

    insightBlock(doc, `The transition-friendly designation identifies roles where employers explicitly value legal background, transferable skills, or welcome career changers. These roles often emphasize domain expertise over specific technical credentials — making them natural entry points for lawyers exploring legal technology.`, pn);
  }

  // ── CAREER PATHS ──
  if (data.careerPaths.length > 0) {
    sectionTitle(doc, "04", "Career Paths", pn);
    const cpCols = [
      { x: MARGIN, w: 180 },
      { x: MARGIN + 185, w: 55 },
      { x: MARGIN + 245, w: 50 },
      { x: MARGIN + 300, w: 75 },
    ];
    tableHeaderRow(doc, [
      { text: "CAREER PATH", ...cpCols[0] },
      { text: "JOBS", ...cpCols[1], align: "right" },
      { text: "SHARE", ...cpCols[2], align: "right" },
      { text: "NEW THIS WEEK", ...cpCols[3], align: "right" },
    ]);
    for (let i = 0; i < data.careerPaths.length; i++) {
      ensureSpace(doc, 18, pn);
      const cp = data.careerPaths[i];
      tableDataRow(doc, [
        { text: cp.name, ...cpCols[0] },
        { text: fmtNum(cp.jobCount), ...cpCols[1], align: "right" },
        { text: `${cp.percentage}%`, ...cpCols[2], align: "right" },
        { text: fmtNum(cp.newThisWeek), ...cpCols[3], align: "right" },
      ], i % 2 === 0);
    }
    doc.y += 6;

    const careersInsight = generateSectionInsight("careers", data);
    if (careersInsight) insightBlock(doc, careersInsight, pn);
  }

  // ── SALARY INSIGHTS ──
  if (data.salaryByPath.length > 0) {
    sectionTitle(doc, "05", "Salary Insights", pn);
    const salCols = [
      { x: MARGIN, w: 175 },
      { x: MARGIN + 180, w: 140 },
      { x: MARGIN + 330, w: 75 },
    ];
    tableHeaderRow(doc, [
      { text: "CAREER PATH", ...salCols[0] },
      { text: "MEDIAN RANGE", ...salCols[1], align: "center" },
      { text: "SAMPLE SIZE", ...salCols[2], align: "right" },
    ]);
    for (let i = 0; i < data.salaryByPath.length; i++) {
      ensureSpace(doc, 18, pn);
      const sp = data.salaryByPath[i];
      tableDataRow(doc, [
        { text: sp.name, ...salCols[0] },
        { text: `${formatSalary(sp.medianMin)} – ${formatSalary(sp.medianMax)}`, ...salCols[1], align: "center" },
        { text: `${sp.sampleSize} roles`, ...salCols[2], align: "right" },
      ], i % 2 === 0);
    }
    doc.y += 6;

    const salaryInsight = generateSectionInsight("salary", data);
    if (salaryInsight) insightBlock(doc, salaryInsight, pn);
  }

  // ── WORK MODE & AI INTENSITY ──
  const wmTotal = (data.workMode.remote || 0) + (data.workMode.hybrid || 0) + (data.workMode.onsite || 0);
  const aiTotal = (data.aiIntensity.low || 0) + (data.aiIntensity.medium || 0) + (data.aiIntensity.high || 0);

  if (wmTotal > 0 || aiTotal > 0) {
    sectionTitle(doc, "06", "Work Mode & AI Intensity", pn);
    ensureSpace(doc, 70, pn);

    if (wmTotal > 0) {
      const wmBoxW = (CONTENT_WIDTH / 2 - 20) / 3;
      const wmy = doc.y;
      doc.save();
      doc.fontSize(8).fillColor(NAVY).font("Helvetica-Bold").text("WORK MODE", MARGIN, wmy, { characterSpacing: 1 });
      doc.restore();
      const wmby = wmy + 16;
      const wmEntries = [
        { label: "Remote", count: data.workMode.remote || 0 },
        { label: "Hybrid", count: data.workMode.hybrid || 0 },
        { label: "On-site", count: data.workMode.onsite || 0 },
      ];
      wmEntries.forEach((item, i) => {
        const bx = MARGIN + i * (wmBoxW + 6);
        const pct = fmtPct(item.count, wmTotal);
        drawRect(doc, bx, wmby, wmBoxW, 40, GRAY_50, 4);
        doc.save();
        doc.moveTo(bx, wmby + 4).lineTo(bx, wmby + 36).strokeColor(i === 0 ? ACCENT : GRAY_300).lineWidth(2).stroke();
        doc.fontSize(16).fillColor(NAVY).font("Helvetica-Bold")
          .text(`${pct}%`, bx + 8, wmby + 6, { width: wmBoxW - 12, align: "left" });
        doc.fontSize(7).fillColor(GRAY_500).font("Helvetica")
          .text(`${item.label} (${fmtNum(item.count)})`, bx + 8, wmby + 26, { width: wmBoxW - 12, align: "left" });
        doc.restore();
      });

      if (aiTotal > 0) {
        const aiX = MARGIN + CONTENT_WIDTH / 2 + 10;
        const aiW = CONTENT_WIDTH / 2 - 10;
        doc.save();
        doc.fontSize(8).fillColor(NAVY).font("Helvetica-Bold").text("AI INTENSITY", aiX, wmy, { characterSpacing: 1 });
        doc.restore();
        const aiEntries = [
          { label: "Low", count: data.aiIntensity.low || 0 },
          { label: "Medium", count: data.aiIntensity.medium || 0 },
          { label: "High", count: data.aiIntensity.high || 0 },
        ];
        let aby = wmby;
        for (const item of aiEntries) {
          const pct = fmtPct(item.count, aiTotal);
          doc.save();
          doc.fontSize(8).fillColor(NAVY).font("Helvetica")
            .text(item.label, aiX, aby + 1, { width: 45 });
          doc.restore();
          drawBar(doc, aiX + 48, aby + 1, aiW - 90, item.count / aiTotal, 8, item.label === "High" ? ACCENT : NAVY);
          doc.save();
          doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica-Bold")
            .text(`${pct}%`, aiX + aiW - 36, aby + 1, { width: 36, align: "right" });
          doc.restore();
          aby += 13;
        }
      }

      doc.y = wmby + 48;
    }

    const workmodeInsight = generateSectionInsight("workmode", data);
    if (workmodeInsight) insightBlock(doc, workmodeInsight, pn);
  }

  // ── SENIORITY DISTRIBUTION ──
  if (data.seniorityDistribution.length > 0) {
    sectionTitle(doc, "07", "Seniority Distribution", pn);
    const maxSen = Math.max(...data.seniorityDistribution.map(s => s.count), 1);
    for (const s of data.seniorityDistribution) {
      ensureSpace(doc, 18, pn);
      const ry = doc.y;
      doc.save();
      doc.fontSize(8).fillColor(NAVY).font("Helvetica")
        .text(s.level, MARGIN, ry, { width: 80 });
      doc.restore();
      drawBar(doc, MARGIN + 85, ry + 2, CONTENT_WIDTH - 135, s.count / maxSen, 7);
      doc.save();
      doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica-Bold")
        .text(fmtNum(s.count), MARGIN + CONTENT_WIDTH - 40, ry, { width: 40, align: "right" });
      doc.restore();
      doc.y = ry + 18;
    }
    doc.y += 6;

    const senInsight = generateSectionInsight("seniority", data);
    if (senInsight) insightBlock(doc, senInsight, pn);
  }

  // ── TOP COMPANIES & GEOGRAPHY ──
  if (data.topCompanies.length > 0 || data.geography.length > 0) {
    sectionTitle(doc, "08", "Top Companies & Geography", pn);

    const halfW = (CONTENT_WIDTH - 24) / 2;
    const companyRows = Math.min(data.topCompanies.length, 10);
    const geoRows = Math.min(data.geography.length, 10);
    const twoColHeight = 16 + Math.max(companyRows, geoRows) * 16 + 6;
    ensureSpace(doc, twoColHeight, pn);
    const startY = doc.y;

    if (data.topCompanies.length > 0) {
      doc.save();
      doc.fontSize(8).fillColor(NAVY).font("Helvetica-Bold").text("TOP HIRING COMPANIES", MARGIN, startY, { characterSpacing: 0.8 });
      doc.restore();
      let cy = startY + 16;
      const companyMax = data.topCompanies[0]?.jobCount || 1;
      for (let i = 0; i < Math.min(data.topCompanies.length, 10); i++) {
        const tc = data.topCompanies[i];
        doc.save();
        doc.fontSize(7).fillColor(GRAY_400).font("Helvetica-Bold")
          .text(String(i + 1).padStart(2, "0"), MARGIN, cy, { width: 14 });
        doc.fontSize(8).fillColor(NAVY).font("Helvetica")
          .text(tc.company, MARGIN + 18, cy, { width: halfW - 70 });
        doc.restore();
        drawBar(doc, MARGIN + halfW - 50, cy + 1, 32, tc.jobCount / companyMax, 6, ACCENT);
        doc.save();
        doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica-Bold")
          .text(`${tc.jobCount}`, MARGIN + halfW - 12, cy, { width: 12, align: "right" });
        doc.restore();
        cy += 16;
      }
    }

    if (data.geography.length > 0) {
      const gx = MARGIN + halfW + 24;
      doc.save();
      doc.fontSize(8).fillColor(NAVY).font("Helvetica-Bold").text("TOP GEOGRAPHIES", gx, startY, { characterSpacing: 0.8 });
      doc.restore();
      let gy = startY + 16;
      const geoMax = data.geography[0]?.jobCount || 1;
      for (let i = 0; i < Math.min(data.geography.length, 10); i++) {
        const g = data.geography[i];
        doc.save();
        doc.fontSize(7).fillColor(GRAY_400).font("Helvetica-Bold")
          .text(String(i + 1).padStart(2, "0"), gx, gy, { width: 14 });
        doc.fontSize(8).fillColor(NAVY).font("Helvetica")
          .text(g.countryName, gx + 18, gy, { width: halfW - 70 });
        doc.restore();
        drawBar(doc, gx + halfW - 50, gy + 1, 32, g.jobCount / geoMax, 6, TEAL);
        doc.save();
        doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica-Bold")
          .text(`${g.jobCount}`, gx + halfW - 12, gy, { width: 12, align: "right" });
        doc.restore();
        gy += 16;
      }
    }

    const companiesEnd = startY + 16 + Math.min(data.topCompanies.length, 10) * 16;
    const geoEnd = startY + 16 + Math.min(data.geography.length, 10) * 16;
    doc.y = Math.max(companiesEnd, geoEnd) + 6;

    const companiesInsight = generateSectionInsight("companies", data);
    if (companiesInsight) insightBlock(doc, companiesInsight, pn);
  }

  // ── MARKET EVOLUTION / HISTORICAL TRENDS ──
  if (data.historicalTrends && Object.keys(data.historicalTrends.jobsByMonth).length > 0) {
    const ht = data.historicalTrends;
    const months = Object.keys(ht.jobsByMonth).sort();
    const formatMo = (m: string) => {
      const [y, mo] = m.split('-');
      const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${names[parseInt(mo) - 1]} '${y.slice(2)}`;
    };

    sectionTitle(doc, "09", "Market Evolution", pn);

    ensureSpace(doc, 40, pn);
    doc.save();
    doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
      .text("Monthly Job Volume", MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.restore();
    doc.y += 14;

    const volHeaderY = doc.y;
    const volCols = [MARGIN, MARGIN + 80, MARGIN + 180, MARGIN + 280, MARGIN + 380];
    const volHeaders = ["Month", "Discovered", "Published", "Net Change", "Cumulative"];
    doc.save();
    doc.fontSize(7).fillColor(GRAY_500).font("Helvetica-Bold");
    volHeaders.forEach((h, i) => doc.text(h, volCols[i], volHeaderY, { width: 90 }));
    doc.restore();
    doc.y = volHeaderY + 14;

    let cumulative = 0;
    let prevDiscovered = 0;
    for (const m of months) {
      ensureSpace(doc, 14, pn);
      const discovered = ht.jobsByMonth[m] || 0;
      const published = ht.publishedByMonth?.[m] || 0;
      cumulative += discovered;
      const change = discovered - prevDiscovered;
      const changeStr = prevDiscovered === 0 ? '—' : (change >= 0 ? `+${change}` : `${change}`);
      prevDiscovered = discovered;

      const rowY = doc.y;
      doc.save();
      doc.fontSize(7.5).fillColor(NAVY).font("Helvetica")
        .text(formatMo(m), volCols[0], rowY, { width: 80 });
      doc.fillColor(GRAY_600).font("Helvetica")
        .text(String(discovered), volCols[1], rowY, { width: 90 })
        .text(String(published), volCols[2], rowY, { width: 90 })
        .text(changeStr, volCols[3], rowY, { width: 90 })
        .text(cumulative.toLocaleString(), volCols[4], rowY, { width: 90 });
      doc.restore();
      doc.y = rowY + 13;
    }
    doc.y += 6;

    const allCats = new Set<string>();
    for (const cats of Object.values(ht.categoryByMonth)) {
      for (const cat of Object.keys(cats)) allCats.add(cat);
    }
    const topCats = Array.from(allCats)
      .map(cat => ({
        name: cat,
        total: Object.values(ht.categoryByMonth).reduce((s, m) => s + (m[cat] || 0), 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    if (topCats.length > 0) {
      ensureSpace(doc, 40, pn);
      doc.save();
      doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
        .text("Category Distribution by Month", MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.restore();
      doc.y += 14;

      const catHeaderY = doc.y;
      doc.save();
      doc.fontSize(7).fillColor(GRAY_500).font("Helvetica-Bold")
        .text("Category", MARGIN, catHeaderY, { width: 140 });
      let cx = MARGIN + 150;
      for (const m of months) {
        doc.text(formatMo(m), cx, catHeaderY, { width: 60 });
        cx += 60;
      }
      doc.text("Total", cx, catHeaderY, { width: 50 });
      doc.restore();
      doc.y = catHeaderY + 14;

      for (const cat of topCats) {
        ensureSpace(doc, 14, pn);
        const rowY = doc.y;
        doc.save();
        doc.fontSize(7.5).fillColor(NAVY).font("Helvetica")
          .text(cat.name.length > 24 ? cat.name.slice(0, 22) + '..' : cat.name, MARGIN, rowY, { width: 140 });
        let rx = MARGIN + 150;
        for (const m of months) {
          const val = ht.categoryByMonth[m]?.[cat.name] || 0;
          doc.fillColor(val > 0 ? GRAY_600 : GRAY_300).font("Helvetica")
            .text(val > 0 ? String(val) : '—', rx, rowY, { width: 60 });
          rx += 60;
        }
        doc.fillColor(NAVY).font("Helvetica-Bold")
          .text(String(cat.total), rx, rowY, { width: 50 });
        doc.restore();
        doc.y = rowY + 13;
      }
      doc.y += 6;
    }

    const allSkills = new Map<string, number>();
    for (const skills of Object.values(ht.skillTrends || {})) {
      for (const s of skills) allSkills.set(s.name, (allSkills.get(s.name) || 0) + s.count);
    }
    const topPdfSkills = Array.from(allSkills.entries()).sort(([,a],[,b]) => b - a).slice(0, 8);

    if (topPdfSkills.length > 0) {
      ensureSpace(doc, 40, pn);
      doc.save();
      doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
        .text("Top Skills Across All Months", MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.restore();
      doc.y += 14;

      const skillMax = topPdfSkills[0]?.[1] || 1;
      for (const [skill, count] of topPdfSkills) {
        ensureSpace(doc, 16, pn);
        const rowY = doc.y;
        doc.save();
        doc.fontSize(7.5).fillColor(NAVY).font("Helvetica")
          .text(skill.length > 30 ? skill.slice(0, 28) + '..' : skill, MARGIN, rowY, { width: 160 });
        doc.restore();
        drawBar(doc, MARGIN + 170, rowY + 1, 200, count / skillMax, 7, ACCENT);
        doc.save();
        doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica-Bold")
          .text(String(count), MARGIN + 380, rowY, { width: 40 });
        doc.restore();
        doc.y = rowY + 14;
      }
      doc.y += 6;
    }

    ensureSpace(doc, 40, pn);
    const wm = ht.workModeByMonth || {};
    const wmMonths = Object.keys(wm).sort();
    if (wmMonths.length > 0) {
      doc.save();
      doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
        .text("Work Mode Trends", MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.restore();
      doc.y += 14;

      const wmHeaderY = doc.y;
      doc.save();
      doc.fontSize(7).fillColor(GRAY_500).font("Helvetica-Bold")
        .text("Month", MARGIN, wmHeaderY, { width: 80 })
        .text("Remote", MARGIN + 100, wmHeaderY, { width: 70 })
        .text("Hybrid", MARGIN + 180, wmHeaderY, { width: 70 })
        .text("On-site", MARGIN + 260, wmHeaderY, { width: 70 })
        .text("Total", MARGIN + 340, wmHeaderY, { width: 60 });
      doc.restore();
      doc.y = wmHeaderY + 14;

      for (const m of wmMonths) {
        ensureSpace(doc, 14, pn);
        const remote = wm[m]?.['remote'] || 0;
        const hybrid = wm[m]?.['hybrid'] || 0;
        const onsite = wm[m]?.['onsite'] || 0;
        const total = remote + hybrid + onsite;
        const rowY = doc.y;
        doc.save();
        doc.fontSize(7.5).fillColor(NAVY).font("Helvetica")
          .text(formatMo(m), MARGIN, rowY, { width: 80 });
        doc.fillColor(GRAY_600).font("Helvetica")
          .text(`${remote} (${total ? Math.round(remote/total*100) : 0}%)`, MARGIN + 100, rowY, { width: 70 })
          .text(`${hybrid} (${total ? Math.round(hybrid/total*100) : 0}%)`, MARGIN + 180, rowY, { width: 70 })
          .text(`${onsite} (${total ? Math.round(onsite/total*100) : 0}%)`, MARGIN + 260, rowY, { width: 70 })
          .text(String(total), MARGIN + 340, rowY, { width: 60 });
        doc.restore();
        doc.y = rowY + 13;
      }
      doc.y += 6;
    }

    ensureSpace(doc, 30, pn);
    doc.save();
    doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica")
      .text(`Based on ${ht.totalEverScraped.toLocaleString()} jobs tracked across ${months.length} month(s).`, MARGIN, doc.y, { width: CONTENT_WIDTH, align: "center" });
    doc.restore();
    doc.y += 16;
  }

  // ── WHAT THIS MEANS FOR LAWYERS ──
  ensureSpace(doc, 160, pn);

  const wtY1 = doc.y;
  doc.save();
  doc.fontSize(7).fillColor(ACCENT).font("Helvetica-Bold").text("ANALYSIS", MARGIN, wtY1, { characterSpacing: 1.5 });
  doc.restore();
  doc.y = wtY1 + 14;
  const wtY2 = doc.y;
  doc.save();
  doc.fontSize(20).fillColor(NAVY).font("Helvetica-Bold")
    .text("What This Means for Lawyers", MARGIN, wtY2, { width: CONTENT_WIDTH });
  doc.fontSize(12).fillColor(GRAY_500).font("Helvetica")
    .text("Considering Legal Tech", MARGIN, wtY2 + 24, { width: CONTENT_WIDTH });
  doc.restore();
  doc.y = wtY2 + 40;
  doc.save();
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).strokeColor(GRAY_300).lineWidth(0.5).stroke();
  doc.restore();
  doc.y += 10;

  // The Opportunity
  const opY = doc.y;
  doc.save();
  doc.fontSize(12).fillColor(NAVY).font("Helvetica-Bold").text("The Opportunity", MARGIN, opY, { width: CONTENT_WIDTH });
  doc.restore();
  doc.y = opY + 18;

  const wmTotalForLawyers = (data.workMode.remote || 0) + (data.workMode.hybrid || 0) + (data.workMode.onsite || 0);
  const flexPct = wmTotalForLawyers > 0 ? fmtPct(data.workMode.remote + data.workMode.hybrid, wmTotalForLawyers) : 0;
  const opportunityText = `With ${fmtNum(data.overview.totalJobs)} active positions across ${data.overview.totalCountries} countries, legal technology represents a substantial and growing labor market. Unlike traditional law, where geographic constraints and billable-hour structures dominate, ${flexPct}% of legal tech roles offer remote or hybrid arrangements. Legal professionals bring domain expertise that pure technologists lack — an understanding of regulatory frameworks, contract interpretation, litigation workflows, and client advisory dynamics. This positions lawyers not as career changers starting from scratch, but as specialists entering a field that values exactly what they already know.`;
  narrativeParagraph(doc, opportunityText, pn);

  // Most Accessible Entry Points
  const maeY = doc.y;
  doc.save();
  doc.fontSize(12).fillColor(NAVY).font("Helvetica-Bold").text("Most Accessible Entry Points", MARGIN, maeY, { width: CONTENT_WIDTH });
  doc.restore();
  doc.y = maeY + 18;

  const accessiblePaths = data.careerPaths.slice(0, 3).map(c => c.name).join(", ");
  const entryText = `Among current openings, ${accessiblePaths} represent the highest-volume categories — and all three draw heavily on core legal competencies. ${data.skillsDemand.length >= 2 ? `The most demanded skills — ${data.skillsDemand[0].skill} and ${data.skillsDemand[1].skill} — ` : "Top skills "}overlap significantly with the capabilities developed in legal practice. For lawyers with 3-7 years of experience, these paths offer the strongest alignment between existing expertise and employer requirements.`;
  narrativeParagraph(doc, entryText, pn);

  // Recommended Next Steps
  const rnsY = doc.y;
  doc.save();
  doc.fontSize(12).fillColor(NAVY).font("Helvetica-Bold").text("Recommended Next Steps", MARGIN, rnsY, { width: CONTENT_WIDTH });
  doc.restore();
  doc.y = rnsY + 18;

  const steps = [
    "Assess your readiness: Upload your resume for a personalized career diagnostic that maps your skills to current market demand.",
    "Target high-momentum paths: Focus your search on categories with the highest new listings this week — that is where hiring managers are actively reviewing candidates.",
    "Build bridge skills: Identify the 2-3 technical skills most relevant to your target path and invest in foundational fluency, not mastery.",
    "Leverage your legal edge: In applications and interviews, frame your legal experience as a strategic advantage — you understand the problems these companies are solving.",
  ];
  for (const step of steps) {
    const stepH = doc.font("Helvetica").fontSize(9).heightOfString(step, { width: CONTENT_WIDTH - 14, lineGap: 2.5 }) + 8;
    ensureSpace(doc, stepH, pn);
    const stepY = doc.y;
    doc.save();
    drawRect(doc, MARGIN, stepY + 3, 4, 4, ACCENT, 2);
    doc.fontSize(9).fillColor(GRAY_600).font("Helvetica")
      .text(step, MARGIN + 14, stepY, { width: CONTENT_WIDTH - 14, lineGap: 2.5 });
    doc.restore();
    doc.y = stepY + stepH;
  }
  doc.y += 6;

  // CTA callout
  ensureSpace(doc, 60, pn);
  const ctaY = doc.y;
  drawRect(doc, MARGIN, ctaY, CONTENT_WIDTH, 50, NAVY, 6);
  doc.save();
  doc.fontSize(11).fillColor(WHITE).font("Helvetica-Bold")
    .text("Ready to explore your fit?", MARGIN + 16, ctaY + 12, { width: CONTENT_WIDTH - 32 });
  doc.fontSize(9).fillColor(GRAY_200).font("Helvetica")
    .text(`Take the free career diagnostic at ${baseUrl}/diagnostic`, MARGIN + 16, ctaY + 28, { width: CONTENT_WIDTH - 32 });
  doc.restore();
  doc.y = ctaY + 58;

  // ── METHODOLOGY PAGE ──
  (doc as any)._explicitPage = true;
  doc.addPage({ size: "LETTER", margin: MARGIN });
  pn.val++;
  doc.save();
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(NAVY);
  doc.restore();

  doc.save();
  doc.fontSize(6.5).fillColor(GRAY_500).font("Helvetica")
    .text("LEGAL TECH CAREERS  ·  METHODOLOGY", MARGIN, 28, { width: CONTENT_WIDTH * 0.7, characterSpacing: 1.5 });
  doc.fontSize(6.5).fillColor(GRAY_500).font("Helvetica")
    .text(String(pn.val).padStart(2, "0"), MARGIN, 28, { width: CONTENT_WIDTH, align: "right" });
  doc.moveTo(MARGIN, 42).lineTo(PAGE_WIDTH - MARGIN, 42).strokeColor(GRAY_500).lineWidth(0.5).stroke();
  doc.restore();

  doc.save();
  doc.fontSize(8).fillColor(GRAY_400).font("Helvetica-Bold")
    .text("LEGAL TECH CAREERS", MARGIN, 64, { width: CONTENT_WIDTH, characterSpacing: 4 });
  doc.moveTo(MARGIN, 84).lineTo(MARGIN + 48, 84).strokeColor(ACCENT).lineWidth(2).stroke();

  doc.fontSize(20).fillColor(WHITE).font("Helvetica-Bold")
    .text("About This Report", MARGIN, 100, { width: CONTENT_WIDTH });

  doc.fontSize(9).fillColor(GRAY_200).font("Helvetica")
    .text(
      "This report is generated from real-time data collected across legal technology employers worldwide. Our pipeline continuously monitors job postings from leading ATS platforms including Greenhouse, Lever, Ashby, and Workday, covering law firms, legal tech startups, corporate legal departments, and alternative legal service providers.",
      MARGIN, 134, { width: CONTENT_WIDTH, lineGap: 3.5 }
    );

  doc.moveDown(0.8);
  doc.fontSize(9).fillColor(GRAY_200).font("Helvetica")
    .text(
      "All statistics reflect currently active, published positions that have passed our quality gate. Salary data represents reported ranges where available. Skills are extracted and normalized using AI-powered enrichment with synonym merging for accuracy. Career path categorization follows our proprietary taxonomy of 13 categories mapped to three role tracks.",
      MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 3.5 }
    );

  doc.moveDown(1);
  doc.fontSize(12).fillColor(WHITE).font("Helvetica-Bold")
    .text("Data Sources", MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.4);
  const sources = [
    "Greenhouse, Lever, Ashby, Workday CXS API integrations",
    `${fmtNum(data.overview.totalCompanies)}+ companies tracked across legal technology`,
    "AI-powered job categorization and skills extraction",
    "Automated quality scoring, deduplication, and link validation",
    "Continuous refresh cycle with per-company reliability monitoring",
  ];
  for (const src of sources) {
    doc.fontSize(8.5).fillColor(GRAY_200).font("Helvetica")
      .text(`  •  ${src}`, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 2 });
    doc.moveDown(0.2);
  }

  doc.moveDown(0.8);
  doc.fontSize(12).fillColor(WHITE).font("Helvetica-Bold")
    .text("Coverage", MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.4);
  const coverage = [
    `${fmtNum(data.overview.totalJobs)} active roles across ${data.overview.totalCountries} countries`,
    `${data.overview.totalCompanies} companies monitored`,
    `${fmtNum(data.overview.jobsWithSalary)} roles with salary data (${data.overview.totalJobs ? Math.round(data.overview.jobsWithSalary / data.overview.totalJobs * 100) : 0}%)`,
  ];
  for (const item of coverage) {
    doc.fontSize(8.5).fillColor(GRAY_200).font("Helvetica")
      .text(`  •  ${item}`, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 2 });
    doc.moveDown(0.2);
  }

  doc.moveDown(0.8);
  doc.fontSize(8.5).fillColor(GRAY_400).font("Helvetica")
    .text(
      "Data is refreshed continuously. This snapshot was generated on " +
      new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + ".",
      MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 2 }
    );

  doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica")
    .text(`© ${new Date().getFullYear()} Legal Tech Careers. All rights reserved.`, MARGIN, PAGE_HEIGHT - 72, { width: CONTENT_WIDTH });
  doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica")
    .text(baseUrl, MARGIN, PAGE_HEIGHT - 58, { width: CONTENT_WIDTH });
  doc.restore();

  return doc;
}
