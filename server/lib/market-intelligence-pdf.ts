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

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const USABLE_BOTTOM = PAGE_HEIGHT - 50;

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
  drawRect(doc, x, y, maxW, h, GRAY_200, 2);
  if (fraction > 0) {
    const bw = Math.max(4, maxW * Math.min(fraction, 1));
    drawRect(doc, x, y, bw, h, barColor, 2);
  }
}

function pageHeader(doc: PDFKit.PDFDocument, pageNum: number) {
  doc.save();
  doc.fontSize(7).fillColor(GRAY_400).font("Helvetica")
    .text("LEGAL TECH CAREERS  ·  MARKET INTELLIGENCE", MARGIN, 28, { width: CONTENT_WIDTH * 0.7 });
  doc.fontSize(7).fillColor(GRAY_400).font("Helvetica")
    .text(String(pageNum), MARGIN, 28, { width: CONTENT_WIDTH, align: "right" });
  doc.moveTo(MARGIN, 40).lineTo(PAGE_WIDTH - MARGIN, 40).strokeColor(GRAY_300).lineWidth(0.5).stroke();
  doc.restore();
}

function needsNewPage(doc: PDFKit.PDFDocument, needed: number): boolean {
  return doc.y + needed > USABLE_BOTTOM;
}

function newContentPage(doc: PDFKit.PDFDocument, pn: { val: number }) {
  doc.addPage({ size: "LETTER", margin: MARGIN });
  pn.val++;
  pageHeader(doc, pn.val);
  doc.y = 50;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number, pn: { val: number }) {
  if (needsNewPage(doc, needed)) {
    newContentPage(doc, pn);
  }
}

function sectionTitle(doc: PDFKit.PDFDocument, num: string, title: string, pn: { val: number }) {
  ensureSpace(doc, 36, pn);
  const y = doc.y;
  doc.save();
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(NAVY).lineWidth(0.75).stroke();
  doc.restore();
  doc.save();
  doc.fontSize(7.5).fillColor(GRAY_400).font("Helvetica").text(num, MARGIN, y + 5);
  doc.fontSize(13).fillColor(NAVY).font("Helvetica-Bold").text(title, MARGIN + 22, y + 4, { width: CONTENT_WIDTH - 22 });
  doc.restore();
  doc.y = y + 24;
}

function tableHeaderRow(doc: PDFKit.PDFDocument, cols: { text: string; x: number; w: number; align?: string }[]) {
  const y = doc.y;
  drawRect(doc, MARGIN, y - 2, CONTENT_WIDTH, 16, NAVY);
  doc.save();
  for (const c of cols) {
    doc.fontSize(7.5).fillColor(WHITE).font("Helvetica-Bold")
      .text(c.text, c.x, y, { width: c.w, align: (c.align as any) || "left" });
  }
  doc.restore();
  doc.y = y + 16;
}

function tableDataRow(doc: PDFKit.PDFDocument, cols: { text: string; x: number; w: number; align?: string }[], striped: boolean) {
  const y = doc.y;
  if (striped) drawRect(doc, MARGIN, y - 2, CONTENT_WIDTH, 15, GRAY_50);
  doc.save();
  for (const c of cols) {
    doc.fontSize(8).fillColor(NAVY).font("Helvetica")
      .text(c.text, c.x, y, { width: c.w, align: (c.align as any) || "left" });
  }
  doc.restore();
  doc.y = y + 15;
}

export function generateMarketIntelligencePDF(data: MarketData, period: string): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "LETTER",
    margin: MARGIN,
    info: {
      Title: `Legal Tech Careers - Market Intelligence ${period.charAt(0).toUpperCase() + period.slice(1)} Report`,
      Author: "Legal Tech Careers",
      Creator: "Legal Tech Careers Platform",
      Producer: "Legal Tech Careers",
    },
    pdfVersion: "1.7",
    autoFirstPage: true,
  });

  const pn = { val: 1 };

  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(NAVY);

  doc.save();
  doc.fontSize(9).fillColor(GRAY_400).font("Helvetica-Bold")
    .text("LEGAL TECH CAREERS", MARGIN, 72, { width: CONTENT_WIDTH, characterSpacing: 3 });
  doc.moveTo(MARGIN, 92).lineTo(MARGIN + 50, 92).strokeColor(GRAY_500).lineWidth(0.75).stroke();

  doc.fontSize(34).fillColor(WHITE).font("Helvetica-Bold")
    .text("Market", MARGIN, 120, { width: CONTENT_WIDTH, lineGap: 2 });
  doc.fontSize(34).fillColor(WHITE).font("Helvetica-Bold")
    .text("Intelligence", MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 2 });
  doc.fontSize(34).fillColor(WHITE).font("Helvetica-Bold")
    .text("Report", MARGIN, doc.y, { width: CONTENT_WIDTH });

  doc.moveDown(1.5);
  doc.fontSize(12).fillColor(GRAY_200).font("Helvetica")
    .text(getPeriodTitle(period), MARGIN, doc.y, { width: CONTENT_WIDTH });

  const coverStatsY = 420;
  const csBoxW = (CONTENT_WIDTH - 20) / 3;
  const coverStats = [
    { val: fmtNum(data.overview.totalJobs), label: "Active Roles" },
    { val: fmtNum(data.overview.totalCompanies), label: "Companies" },
    { val: fmtNum(data.overview.totalCountries), label: "Countries" },
  ];
  coverStats.forEach((s, i) => {
    const bx = MARGIN + i * (csBoxW + 10);
    drawRect(doc, bx, coverStatsY, csBoxW, 52, NAVY_LIGHT, 4);
    doc.fontSize(20).fillColor(WHITE).font("Helvetica-Bold")
      .text(s.val, bx + 8, coverStatsY + 8, { width: csBoxW - 16, align: "center" });
    doc.fontSize(8).fillColor(GRAY_400).font("Helvetica")
      .text(s.label, bx + 8, coverStatsY + 33, { width: csBoxW - 16, align: "center" });
  });

  doc.fontSize(8.5).fillColor(GRAY_400).font("Helvetica")
    .text(
      `Powered by real-time data across ${fmtNum(data.overview.totalCompanies)} companies in ${fmtNum(data.overview.totalCountries)} countries`,
      MARGIN, PAGE_HEIGHT - 100, { width: CONTENT_WIDTH }
    );
  doc.fontSize(8).fillColor(GRAY_500).font("Helvetica")
    .text(
      `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      MARGIN, PAGE_HEIGHT - 82, { width: CONTENT_WIDTH }
    );
  doc.restore();

  newContentPage(doc, pn);

  sectionTitle(doc, "01", "Executive Summary", pn);

  const boxW = (CONTENT_WIDTH - 12) / 3;
  const boxH = 44;
  const row1 = [
    { value: fmtNum(data.overview.totalJobs), label: "Total Active Jobs" },
    { value: String(data.overview.totalCompanies), label: "Companies Tracked" },
    { value: String(data.overview.totalCountries), label: "Countries" },
  ];
  const row2 = [
    { value: `${data.overview.remotePercentage}%`, label: "Remote Roles" },
    { value: fmtNum(data.overview.newJobsThisWeek), label: "New This Week" },
    { value: fmtNum(data.overview.jobsWithSalary), label: "With Salary Data" },
  ];

  let sy = doc.y;
  row1.forEach((s, i) => {
    const bx = MARGIN + i * (boxW + 6);
    drawRect(doc, bx, sy, boxW, boxH, NAVY, 3);
    doc.save();
    doc.fontSize(16).fillColor(WHITE).font("Helvetica-Bold")
      .text(s.value, bx + 6, sy + 7, { width: boxW - 12, align: "center" });
    doc.fontSize(7).fillColor(GRAY_200).font("Helvetica")
      .text(s.label, bx + 6, sy + 27, { width: boxW - 12, align: "center" });
    doc.restore();
  });
  sy += boxH + 6;
  row2.forEach((s, i) => {
    const bx = MARGIN + i * (boxW + 6);
    drawRect(doc, bx, sy, boxW, boxH, NAVY, 3);
    doc.save();
    doc.fontSize(16).fillColor(WHITE).font("Helvetica-Bold")
      .text(s.value, bx + 6, sy + 7, { width: boxW - 12, align: "center" });
    doc.fontSize(7).fillColor(GRAY_200).font("Helvetica")
      .text(s.label, bx + 6, sy + 27, { width: boxW - 12, align: "center" });
    doc.restore();
  });
  doc.y = sy + boxH + 10;

  if (data.skillsDemand.length > 0) {
    sectionTitle(doc, "02", "Skills in Demand", pn);
    const maxCount = data.skillsDemand[0]?.count || 1;
    const barMax = CONTENT_WIDTH - 175;

    for (let i = 0; i < Math.min(data.skillsDemand.length, 15); i++) {
      ensureSpace(doc, 14, pn);
      const s = data.skillsDemand[i];
      const ry = doc.y;
      doc.save();
      doc.fontSize(7.5).fillColor(GRAY_400).font("Helvetica")
        .text(String(i + 1).padStart(2, "0"), MARGIN, ry);
      doc.fontSize(8).fillColor(NAVY).font("Helvetica")
        .text(s.skill, MARGIN + 20, ry, { width: 120 });
      doc.restore();
      drawBar(doc, MARGIN + 145, ry + 1, barMax, s.count / maxCount, 7);
      doc.save();
      doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica-Bold")
        .text(fmtNum(s.count), MARGIN + 145 + barMax + 4, ry, { width: 26, align: "right" });
      doc.restore();
      doc.y = ry + 14;
    }
    doc.y += 6;
  }

  if (data.careerPaths.length > 0) {
    sectionTitle(doc, "03", "Career Paths", pn);
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
      ensureSpace(doc, 15, pn);
      const cp = data.careerPaths[i];
      tableDataRow(doc, [
        { text: cp.name, ...cpCols[0] },
        { text: fmtNum(cp.jobCount), ...cpCols[1], align: "right" },
        { text: `${cp.percentage}%`, ...cpCols[2], align: "right" },
        { text: fmtNum(cp.newThisWeek), ...cpCols[3], align: "right" },
      ], i % 2 === 0);
    }
    doc.y += 6;
  }

  if (data.salaryByPath.length > 0) {
    sectionTitle(doc, "04", "Salary Insights", pn);
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
      ensureSpace(doc, 15, pn);
      const sp = data.salaryByPath[i];
      tableDataRow(doc, [
        { text: sp.name, ...salCols[0] },
        { text: `${formatSalary(sp.medianMin)} – ${formatSalary(sp.medianMax)}`, ...salCols[1], align: "center" },
        { text: `${sp.sampleSize} roles`, ...salCols[2], align: "right" },
      ], i % 2 === 0);
    }
    doc.y += 6;
  }

  const wmTotal = (data.workMode.remote || 0) + (data.workMode.hybrid || 0) + (data.workMode.onsite || 0);
  const aiTotal = (data.aiIntensity.low || 0) + (data.aiIntensity.medium || 0) + (data.aiIntensity.high || 0);

  if (wmTotal > 0 || aiTotal > 0) {
    sectionTitle(doc, "05", "Work Mode & AI Intensity", pn);

    if (wmTotal > 0) {
      const wmBoxW = (CONTENT_WIDTH / 2 - 20) / 3;
      const wmy = doc.y;
      doc.save();
      doc.fontSize(8.5).fillColor(NAVY).font("Helvetica-Bold").text("Work Mode", MARGIN, wmy);
      doc.restore();
      const wmby = wmy + 14;
      const wmEntries = [
        { label: "Remote", count: data.workMode.remote || 0 },
        { label: "Hybrid", count: data.workMode.hybrid || 0 },
        { label: "On-site", count: data.workMode.onsite || 0 },
      ];
      wmEntries.forEach((item, i) => {
        const bx = MARGIN + i * (wmBoxW + 6);
        const pct = wmTotal ? Math.round(item.count / wmTotal * 100) : 0;
        drawRect(doc, bx, wmby, wmBoxW, 36, GRAY_100, 3);
        doc.save();
        doc.fontSize(13).fillColor(NAVY).font("Helvetica-Bold")
          .text(`${pct}%`, bx + 4, wmby + 4, { width: wmBoxW - 8, align: "center" });
        doc.fontSize(7).fillColor(GRAY_600).font("Helvetica")
          .text(`${item.label} (${fmtNum(item.count)})`, bx + 4, wmby + 21, { width: wmBoxW - 8, align: "center" });
        doc.restore();
      });

      if (aiTotal > 0) {
        const aiX = MARGIN + CONTENT_WIDTH / 2 + 10;
        const aiW = CONTENT_WIDTH / 2 - 10;
        doc.save();
        doc.fontSize(8.5).fillColor(NAVY).font("Helvetica-Bold").text("AI Intensity", aiX, wmy);
        doc.restore();
        const aiEntries = [
          { label: "Low", count: data.aiIntensity.low || 0 },
          { label: "Medium", count: data.aiIntensity.medium || 0 },
          { label: "High", count: data.aiIntensity.high || 0 },
        ];
        let aby = wmby;
        for (const item of aiEntries) {
          const pct = aiTotal ? Math.round(item.count / aiTotal * 100) : 0;
          doc.save();
          doc.fontSize(8).fillColor(NAVY).font("Helvetica")
            .text(item.label, aiX, aby + 1, { width: 45 });
          doc.restore();
          drawBar(doc, aiX + 48, aby, aiW - 88, item.count / aiTotal, 8);
          doc.save();
          doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica")
            .text(`${pct}%`, aiX + aiW - 36, aby + 1, { width: 36, align: "right" });
          doc.restore();
          aby += 12;
        }
      }

      doc.y = wmby + 42;
    }
  }

  if (data.seniorityDistribution.length > 0) {
    sectionTitle(doc, "06", "Seniority Distribution", pn);
    const maxSen = Math.max(...data.seniorityDistribution.map(s => s.count), 1);
    for (const s of data.seniorityDistribution) {
      ensureSpace(doc, 14, pn);
      const ry = doc.y;
      doc.save();
      doc.fontSize(8).fillColor(NAVY).font("Helvetica")
        .text(s.level, MARGIN, ry, { width: 80 });
      doc.restore();
      drawBar(doc, MARGIN + 85, ry + 1, CONTENT_WIDTH - 135, s.count / maxSen, 7);
      doc.save();
      doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica-Bold")
        .text(fmtNum(s.count), MARGIN + CONTENT_WIDTH - 40, ry, { width: 40, align: "right" });
      doc.restore();
      doc.y = ry + 14;
    }
    doc.y += 6;
  }

  if (data.topCompanies.length > 0 || data.geography.length > 0) {
    sectionTitle(doc, "07", "Top Companies & Geography", pn);

    const halfW = (CONTENT_WIDTH - 20) / 2;
    const startY = doc.y;

    if (data.topCompanies.length > 0) {
      doc.save();
      doc.fontSize(8.5).fillColor(NAVY).font("Helvetica-Bold").text("Top Hiring Companies", MARGIN, startY);
      doc.restore();
      let cy = startY + 14;
      const companyMax = data.topCompanies[0]?.jobCount || 1;
      for (let i = 0; i < Math.min(data.topCompanies.length, 10); i++) {
        const tc = data.topCompanies[i];
        doc.save();
        doc.fontSize(7).fillColor(GRAY_400).font("Helvetica-Bold")
          .text(`${i + 1}`, MARGIN, cy, { width: 12 });
        doc.fontSize(8).fillColor(NAVY).font("Helvetica")
          .text(tc.company, MARGIN + 14, cy, { width: halfW - 70 });
        doc.restore();
        drawBar(doc, MARGIN + halfW - 55, cy + 1, 35, tc.jobCount / companyMax, 6, ACCENT);
        doc.save();
        doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica")
          .text(`${tc.jobCount}`, MARGIN + halfW - 14, cy, { width: 14, align: "right" });
        doc.restore();
        cy += 13;
      }
    }

    if (data.geography.length > 0) {
      const gx = MARGIN + halfW + 20;
      doc.save();
      doc.fontSize(8.5).fillColor(NAVY).font("Helvetica-Bold").text("Top Geographies", gx, startY);
      doc.restore();
      let gy = startY + 14;
      const geoMax = data.geography[0]?.jobCount || 1;
      for (let i = 0; i < Math.min(data.geography.length, 10); i++) {
        const g = data.geography[i];
        doc.save();
        doc.fontSize(7).fillColor(GRAY_400).font("Helvetica-Bold")
          .text(`${i + 1}`, gx, gy, { width: 12 });
        doc.fontSize(8).fillColor(NAVY).font("Helvetica")
          .text(g.countryName, gx + 14, gy, { width: halfW - 70 });
        doc.restore();
        drawBar(doc, gx + halfW - 55, gy + 1, 35, g.jobCount / geoMax, 6, ACCENT);
        doc.save();
        doc.fontSize(7.5).fillColor(GRAY_500).font("Helvetica")
          .text(`${g.jobCount}`, gx + halfW - 14, gy, { width: 14, align: "right" });
        doc.restore();
        gy += 13;
      }
    }

    const companiesEnd = startY + 14 + Math.min(data.topCompanies.length, 10) * 13;
    const geoEnd = startY + 14 + Math.min(data.geography.length, 10) * 13;
    doc.y = Math.max(companiesEnd, geoEnd) + 6;
  }

  newContentPage(doc, pn);

  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(NAVY);
  pageHeader(doc, pn.val);
  doc.save();
  doc.fontSize(7).fillColor(GRAY_500).font("Helvetica")
    .text("LEGAL TECH CAREERS  ·  METHODOLOGY", MARGIN, 28, { width: CONTENT_WIDTH * 0.7 });
  doc.fontSize(7).fillColor(GRAY_500).font("Helvetica")
    .text(String(pn.val), MARGIN, 28, { width: CONTENT_WIDTH, align: "right" });
  doc.moveTo(MARGIN, 40).lineTo(PAGE_WIDTH - MARGIN, 40).strokeColor(GRAY_500).lineWidth(0.5).stroke();
  doc.restore();

  doc.save();
  doc.fontSize(9).fillColor(GRAY_400).font("Helvetica-Bold")
    .text("LEGAL TECH CAREERS", MARGIN, 64, { width: CONTENT_WIDTH, characterSpacing: 3 });
  doc.moveTo(MARGIN, 82).lineTo(MARGIN + 50, 82).strokeColor(GRAY_500).lineWidth(0.75).stroke();

  doc.fontSize(18).fillColor(WHITE).font("Helvetica-Bold")
    .text("About This Report", MARGIN, 100, { width: CONTENT_WIDTH });

  doc.fontSize(9).fillColor(GRAY_200).font("Helvetica")
    .text(
      "This report is generated from real-time data collected across legal technology employers worldwide. Our pipeline continuously monitors job postings from leading ATS platforms including Greenhouse, Lever, Ashby, and Workday, covering law firms, legal tech startups, corporate legal departments, and alternative legal service providers.",
      MARGIN, 130, { width: CONTENT_WIDTH, lineGap: 3 }
    );

  doc.moveDown(0.6);
  doc.fontSize(9).fillColor(GRAY_200).font("Helvetica")
    .text(
      "All statistics reflect currently active, published positions that have passed our quality gate. Salary data represents reported ranges where available. Skills are extracted and normalized using AI-powered enrichment with synonym merging for accuracy. Career path categorization follows our proprietary taxonomy.",
      MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 3 }
    );

  doc.moveDown(0.6);

  doc.fontSize(11).fillColor(WHITE).font("Helvetica-Bold")
    .text("Data Sources", MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.3);
  const sources = [
    "Greenhouse, Lever, Ashby, Workday CXS API integrations",
    "441+ companies tracked across 5 categories",
    "AI-powered job categorization and skills extraction",
    "Automated quality scoring, deduplication, and link validation",
    "Continuous refresh cycle with per-company reliability monitoring",
  ];
  for (const src of sources) {
    doc.fontSize(8.5).fillColor(GRAY_200).font("Helvetica")
      .text(`  •  ${src}`, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 2 });
    doc.moveDown(0.15);
  }

  doc.moveDown(0.6);
  doc.fontSize(11).fillColor(WHITE).font("Helvetica-Bold")
    .text("Coverage", MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.3);
  const coverage = [
    `${fmtNum(data.overview.totalJobs)} active roles across ${data.overview.totalCountries} countries`,
    `${data.overview.totalCompanies} companies monitored`,
    `${fmtNum(data.overview.jobsWithSalary)} roles with salary data (${data.overview.totalJobs ? Math.round(data.overview.jobsWithSalary / data.overview.totalJobs * 100) : 0}%)`,
  ];
  for (const item of coverage) {
    doc.fontSize(8.5).fillColor(GRAY_200).font("Helvetica")
      .text(`  •  ${item}`, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 2 });
    doc.moveDown(0.15);
  }

  doc.moveDown(0.6);
  doc.fontSize(8.5).fillColor(GRAY_400).font("Helvetica")
    .text(
      "Data is refreshed continuously. This snapshot was generated on " +
      new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + ".",
      MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 2 }
    );

  doc.fontSize(8).fillColor(GRAY_500).font("Helvetica")
    .text(`© ${new Date().getFullYear()} Legal Tech Careers. All rights reserved.`, MARGIN, PAGE_HEIGHT - 72, { width: CONTENT_WIDTH });
  doc.fontSize(8).fillColor(GRAY_500).font("Helvetica")
    .text("legaltechcareers.com", MARGIN, PAGE_HEIGHT - 58, { width: CONTENT_WIDTH });
  doc.restore();

  doc.end();
  return doc;
}
