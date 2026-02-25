import PDFDocument from "pdfkit";

const NAVY = "#1e293b";
const GRAY_100 = "#f1f5f9";
const GRAY_200 = "#e2e8f0";
const GRAY_400 = "#94a3b8";
const GRAY_600 = "#475569";
const WHITE = "#ffffff";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_MARGIN = 60;

interface MarketData {
  overview: { totalJobs: number; totalCompanies: number; totalCountries: number; newThisWeek: number; remotePercentage: number; jobsWithSalary: number };
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
    return `Weekly Briefing — ${fmt(weekAgo)}–${fmt(now)}, ${now.getFullYear()}`;
  }
  if (period === "monthly") {
    return `Monthly Report — ${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  }
  return `Annual Report — ${now.getFullYear()}`;
}

function formatDollar(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n.toLocaleString()}`;
}

function drawRoundedRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, r: number, fill: string) {
  doc.save();
  doc.roundedRect(x, y, w, h, r).fill(fill);
  doc.restore();
}

function addPageHeader(doc: PDFKit.PDFDocument) {
  doc.save();
  doc.moveTo(MARGIN, 42).lineTo(PAGE_WIDTH - MARGIN, 42).strokeColor(NAVY).lineWidth(0.5).stroke();
  doc.fontSize(7).fillColor(GRAY_400).font("Helvetica").text("LEGAL TECH CAREERS  |  MARKET INTELLIGENCE", MARGIN, 30, { width: CONTENT_WIDTH });
  doc.restore();
}

function addPageNumber(doc: PDFKit.PDFDocument, num: number) {
  doc.save();
  doc.fontSize(8).fillColor(GRAY_400).font("Helvetica").text(String(num), 0, PAGE_HEIGHT - 36, { width: PAGE_WIDTH - MARGIN, align: "right" });
  doc.restore();
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number, pageNum: { val: number }) {
  if (doc.y + needed > PAGE_HEIGHT - BOTTOM_MARGIN) {
    doc.addPage();
    pageNum.val++;
    addPageHeader(doc);
    addPageNumber(doc, pageNum.val);
    doc.y = 52;
  }
}

function drawSectionHeader(doc: PDFKit.PDFDocument, num: string, title: string, pageNum: { val: number }) {
  ensureSpace(doc, 40, pageNum);
  const y = doc.y;
  doc.save();
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(NAVY).lineWidth(1).stroke();
  doc.fontSize(8).fillColor(GRAY_400).font("Helvetica").text(num, MARGIN, y + 6);
  doc.fontSize(16).fillColor(NAVY).font("Helvetica-Bold").text(title, MARGIN, y + 16, { width: CONTENT_WIDTH });
  doc.restore();
  doc.y = y + 38;
}

function drawStatBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, value: string, label: string) {
  drawRoundedRect(doc, x, y, w, h, 4, NAVY);
  doc.save();
  doc.fontSize(18).fillColor(WHITE).font("Helvetica-Bold").text(value, x + 8, y + 10, { width: w - 16, align: "center" });
  doc.fontSize(7.5).fillColor(GRAY_200).font("Helvetica").text(label, x + 8, y + 32, { width: w - 16, align: "center" });
  doc.restore();
}

function drawHorizontalBar(doc: PDFKit.PDFDocument, x: number, y: number, maxWidth: number, fraction: number, height: number = 9) {
  drawRoundedRect(doc, x, y, maxWidth, height, 2, GRAY_100);
  if (fraction > 0) {
    const barW = Math.max(4, maxWidth * Math.min(fraction, 1));
    drawRoundedRect(doc, x, y, barW, height, 2, NAVY);
  }
}

function drawTableRow(doc: PDFKit.PDFDocument, y: number, cols: { text: string; x: number; width: number; align?: string; bold?: boolean }[], bgColor?: string) {
  if (bgColor) {
    doc.save();
    doc.rect(MARGIN, y - 2, CONTENT_WIDTH, 16).fill(bgColor);
    doc.restore();
  }
  for (const col of cols) {
    doc.save();
    doc.fontSize(8.5).fillColor(bgColor === NAVY ? WHITE : NAVY).font(col.bold ? "Helvetica-Bold" : "Helvetica");
    doc.text(col.text, col.x, y, { width: col.width, align: (col.align as any) || "left" });
    doc.restore();
  }
}

export function generateMarketIntelligencePDF(data: MarketData, period: string): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "LETTER", margin: MARGIN, bufferPages: true });
  const pageNum = { val: 1 };

  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(NAVY);
  doc.save();
  doc.fontSize(10).fillColor(GRAY_200).font("Helvetica-Bold").text("LEGAL TECH CAREERS", MARGIN, 80, { width: CONTENT_WIDTH, characterSpacing: 4 });
  doc.moveTo(MARGIN, 108).lineTo(MARGIN + 60, 108).strokeColor(GRAY_400).lineWidth(1).stroke();
  doc.fontSize(36).fillColor(WHITE).font("Helvetica-Bold").text("Market\nIntelligence\nReport", MARGIN, 150, { width: CONTENT_WIDTH, lineGap: 4 });
  doc.fontSize(14).fillColor(GRAY_200).font("Helvetica").text(getPeriodTitle(period), MARGIN, 300, { width: CONTENT_WIDTH });
  doc.fontSize(10).fillColor(GRAY_400).font("Helvetica").text(
    `Powered by real-time data from ${data.overview.totalJobs.toLocaleString()}+ roles across ${data.overview.totalCompanies} companies in ${data.overview.totalCountries} countries`,
    MARGIN, PAGE_HEIGHT - 120, { width: CONTENT_WIDTH }
  );
  doc.fontSize(8).fillColor(GRAY_600).font("Helvetica").text(
    `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    MARGIN, PAGE_HEIGHT - 80, { width: CONTENT_WIDTH }
  );
  doc.restore();

  doc.addPage();
  pageNum.val++;
  addPageHeader(doc);
  addPageNumber(doc, pageNum.val);
  doc.y = 52;

  drawSectionHeader(doc, "01", "Executive Summary", pageNum);

  const boxW = (CONTENT_WIDTH - 16) / 3;
  const boxH = 48;
  const statsRow1 = [
    { value: data.overview.totalJobs.toLocaleString(), label: "Total Active Jobs" },
    { value: String(data.overview.totalCompanies), label: "Companies Tracked" },
    { value: String(data.overview.totalCountries), label: "Countries" },
  ];
  const statsRow2 = [
    { value: `${data.overview.remotePercentage}%`, label: "Remote Roles" },
    { value: String(data.overview.newThisWeek), label: "New This Week" },
    { value: String(data.overview.jobsWithSalary), label: "Jobs with Salary Data" },
  ];

  let sy = doc.y;
  statsRow1.forEach((s, i) => drawStatBox(doc, MARGIN + i * (boxW + 8), sy, boxW, boxH, s.value, s.label));
  sy += boxH + 8;
  statsRow2.forEach((s, i) => drawStatBox(doc, MARGIN + i * (boxW + 8), sy, boxW, boxH, s.value, s.label));
  doc.y = sy + boxH + 14;

  drawSectionHeader(doc, "02", "Skills in Demand", pageNum);
  const maxSkillCount = data.skillsDemand[0]?.count || 1;
  const barMaxW = CONTENT_WIDTH - 190;

  for (let i = 0; i < Math.min(data.skillsDemand.length, 15); i++) {
    ensureSpace(doc, 16, pageNum);
    const s = data.skillsDemand[i];
    const rowY = doc.y;
    doc.save();
    doc.fontSize(8.5).fillColor(GRAY_400).font("Helvetica").text(`${String(i + 1).padStart(2, "0")}`, MARGIN, rowY);
    doc.fontSize(8.5).fillColor(NAVY).font("Helvetica").text(s.skill, MARGIN + 22, rowY, { width: 130 });
    doc.restore();
    drawHorizontalBar(doc, MARGIN + 158, rowY + 1, barMaxW, s.count / maxSkillCount, 8);
    doc.save();
    doc.fontSize(8).fillColor(GRAY_600).font("Helvetica-Bold").text(String(s.count), MARGIN + 158 + barMaxW + 4, rowY, { width: 28 });
    doc.restore();
    doc.y = rowY + 15;
  }
  doc.y += 6;

  drawSectionHeader(doc, "03", "Career Paths", pageNum);

  const cpCols = [
    { x: MARGIN, width: 190 },
    { x: MARGIN + 200, width: 55 },
    { x: MARGIN + 265, width: 45 },
    { x: MARGIN + 320, width: 75 },
  ];

  let cpY = doc.y;
  drawTableRow(doc, cpY, [
    { text: "Career Path", ...cpCols[0], bold: true },
    { text: "Jobs", ...cpCols[1], align: "right", bold: true },
    { text: "%", ...cpCols[2], align: "right", bold: true },
    { text: "New This Week", ...cpCols[3], align: "right", bold: true },
  ], NAVY);
  cpY += 18;

  for (let i = 0; i < data.careerPaths.length; i++) {
    ensureSpace(doc, 18, pageNum);
    cpY = doc.y;
    const cp = data.careerPaths[i];
    const bg = i % 2 === 0 ? GRAY_100 : undefined;
    drawTableRow(doc, cpY, [
      { text: cp.name, ...cpCols[0] },
      { text: String(cp.jobCount), ...cpCols[1], align: "right" },
      { text: `${cp.percentage}%`, ...cpCols[2], align: "right" },
      { text: String(cp.newThisWeek), ...cpCols[3], align: "right" },
    ], bg);
    doc.y = cpY + 18;
  }
  doc.y += 6;

  if (data.salaryByPath.length > 0) {
    drawSectionHeader(doc, "04", "Salary Insights", pageNum);

    const salCols = [
      { x: MARGIN, width: 190 },
      { x: MARGIN + 200, width: 150 },
      { x: MARGIN + 360, width: 75 },
    ];

    let salY = doc.y;
    drawTableRow(doc, salY, [
      { text: "Career Path", ...salCols[0], bold: true },
      { text: "Median Range", ...salCols[1], align: "center", bold: true },
      { text: "Sample Size", ...salCols[2], align: "right", bold: true },
    ], NAVY);
    salY += 18;

    for (let i = 0; i < data.salaryByPath.length; i++) {
      ensureSpace(doc, 18, pageNum);
      salY = doc.y;
      const sp = data.salaryByPath[i];
      const bg = i % 2 === 0 ? GRAY_100 : undefined;
      drawTableRow(doc, salY, [
        { text: sp.name, ...salCols[0] },
        { text: `${formatDollar(sp.medianMin)} – ${formatDollar(sp.medianMax)}`, ...salCols[1], align: "center" },
        { text: `${sp.sampleSize} roles`, ...salCols[2], align: "right" },
      ], bg);
      doc.y = salY + 18;
    }
    doc.y += 6;
  }

  drawSectionHeader(doc, "05", "Work Mode & AI Intensity", pageNum);

  const wmY = doc.y;
  const wmBoxW = (CONTENT_WIDTH / 2 - 16) / 3;
  const wmTotal = data.workMode.remote + data.workMode.hybrid + data.workMode.onsite;
  const wmItems = [
    { value: String(data.workMode.remote), label: "Remote", pct: wmTotal ? Math.round(data.workMode.remote / wmTotal * 100) : 0 },
    { value: String(data.workMode.hybrid), label: "Hybrid", pct: wmTotal ? Math.round(data.workMode.hybrid / wmTotal * 100) : 0 },
    { value: String(data.workMode.onsite), label: "On-site", pct: wmTotal ? Math.round(data.workMode.onsite / wmTotal * 100) : 0 },
  ];

  doc.save();
  doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold").text("Work Mode", MARGIN, wmY);
  doc.restore();
  const wmBoxY = wmY + 14;
  wmItems.forEach((item, i) => {
    const bx = MARGIN + i * (wmBoxW + 6);
    drawRoundedRect(doc, bx, wmBoxY, wmBoxW, 38, 4, GRAY_100);
    doc.save();
    doc.fontSize(14).fillColor(NAVY).font("Helvetica-Bold").text(`${item.pct}%`, bx + 6, wmBoxY + 5, { width: wmBoxW - 12, align: "center" });
    doc.fontSize(7.5).fillColor(GRAY_600).font("Helvetica").text(`${item.label} (${item.value})`, bx + 6, wmBoxY + 22, { width: wmBoxW - 12, align: "center" });
    doc.restore();
  });

  const aiX = MARGIN + CONTENT_WIDTH / 2 + 8;
  const aiW = CONTENT_WIDTH / 2 - 8;
  doc.save();
  doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold").text("AI Intensity", aiX, wmY);
  doc.restore();
  const aiTotal = data.aiIntensity.low + data.aiIntensity.medium + data.aiIntensity.high;
  const aiItems = [
    { label: "Low", count: data.aiIntensity.low },
    { label: "Medium", count: data.aiIntensity.medium },
    { label: "High", count: data.aiIntensity.high },
  ];
  let aiBarY = wmBoxY;
  for (const item of aiItems) {
    doc.save();
    doc.fontSize(8.5).fillColor(NAVY).font("Helvetica").text(item.label, aiX, aiBarY + 1, { width: 48 });
    doc.restore();
    drawHorizontalBar(doc, aiX + 50, aiBarY, aiW - 90, aiTotal ? item.count / aiTotal : 0, 9);
    doc.save();
    doc.fontSize(8).fillColor(GRAY_600).font("Helvetica").text(`${aiTotal ? Math.round(item.count / aiTotal * 100) : 0}%`, aiX + aiW - 36, aiBarY + 1, { width: 36, align: "right" });
    doc.restore();
    aiBarY += 13;
  }

  doc.y = wmBoxY + 46;

  drawSectionHeader(doc, "06", "Seniority Distribution", pageNum);
  const maxSeniority = Math.max(...data.seniorityDistribution.map(s => s.count), 1);
  for (const s of data.seniorityDistribution) {
    ensureSpace(doc, 15, pageNum);
    const rowY = doc.y;
    doc.save();
    doc.fontSize(8.5).fillColor(NAVY).font("Helvetica").text(s.level, MARGIN, rowY, { width: 90 });
    doc.restore();
    drawHorizontalBar(doc, MARGIN + 95, rowY + 1, CONTENT_WIDTH - 150, s.count / maxSeniority, 8);
    doc.save();
    doc.fontSize(8).fillColor(GRAY_600).font("Helvetica-Bold").text(String(s.count), MARGIN + CONTENT_WIDTH - 45, rowY, { width: 45, align: "right" });
    doc.restore();
    doc.y = rowY + 15;
  }
  doc.y += 6;

  drawSectionHeader(doc, "07", "Top Companies & Geography", pageNum);

  const colW = (CONTENT_WIDTH - 16) / 2;
  const listY = doc.y;

  doc.save();
  doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold").text("Top Hiring Companies", MARGIN, listY);
  doc.restore();
  let ly = listY + 14;
  for (let i = 0; i < Math.min(data.topCompanies.length, 10); i++) {
    const tc = data.topCompanies[i];
    doc.save();
    doc.fontSize(8.5).fillColor(GRAY_400).font("Helvetica-Bold").text(`${i + 1}.`, MARGIN, ly, { width: 14 });
    doc.fontSize(8.5).fillColor(NAVY).font("Helvetica").text(tc.company, MARGIN + 16, ly, { width: colW - 55 });
    doc.fontSize(8.5).fillColor(GRAY_600).font("Helvetica").text(`${tc.jobCount} roles`, MARGIN + colW - 45, ly, { width: 45, align: "right" });
    doc.restore();
    ly += 13;
  }

  const geoX = MARGIN + colW + 16;
  let gy = listY;
  doc.save();
  doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold").text("Top Geographies", geoX, gy);
  doc.restore();
  gy += 14;
  for (let i = 0; i < Math.min(data.geography.length, 10); i++) {
    const g = data.geography[i];
    doc.save();
    doc.fontSize(8.5).fillColor(GRAY_400).font("Helvetica-Bold").text(`${i + 1}.`, geoX, gy, { width: 14 });
    doc.fontSize(8.5).fillColor(NAVY).font("Helvetica").text(g.countryName, geoX + 16, gy, { width: colW - 55 });
    doc.fontSize(8.5).fillColor(GRAY_600).font("Helvetica").text(`${g.jobCount} roles`, geoX + colW - 45, gy, { width: 45, align: "right" });
    doc.restore();
    gy += 13;
  }

  doc.y = Math.max(ly, gy) + 6;

  doc.addPage();
  pageNum.val++;
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(NAVY);
  doc.save();

  doc.fontSize(10).fillColor(GRAY_200).font("Helvetica-Bold").text("LEGAL TECH CAREERS", MARGIN, 80, { width: CONTENT_WIDTH, characterSpacing: 4 });
  doc.moveTo(MARGIN, 108).lineTo(MARGIN + 60, 108).strokeColor(GRAY_400).lineWidth(1).stroke();

  doc.y = 130;
  doc.fontSize(16).fillColor(WHITE).font("Helvetica-Bold").text("About This Report", MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.6);
  doc.fontSize(10).fillColor(GRAY_200).font("Helvetica").text(
    "This report is generated from real-time data collected across legal technology employers worldwide. Our pipeline continuously monitors job postings from leading ATS platforms including Greenhouse, Lever, Ashby, and Workday, covering law firms, legal tech startups, corporate legal departments, and alternative legal service providers.",
    MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 3 }
  );
  doc.moveDown(0.8);
  doc.fontSize(10).fillColor(GRAY_200).font("Helvetica").text(
    "All statistics reflect currently active, published positions. Salary data represents reported ranges where available. Skills are extracted and normalized using AI-powered enrichment. Career path categorization follows our proprietary taxonomy covering Legal Engineering, Compliance Tech, Contract Management, Legal Operations, E-Discovery, Privacy & Data Protection, and more.",
    MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 3 }
  );
  doc.moveDown(0.8);
  doc.fontSize(10).fillColor(GRAY_200).font("Helvetica").text(
    "Data is refreshed continuously. This snapshot was generated on " + new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + ".",
    MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 3 }
  );

  doc.fontSize(9).fillColor(GRAY_400).font("Helvetica").text(
    `© ${new Date().getFullYear()} Legal Tech Careers. All rights reserved.`,
    MARGIN, PAGE_HEIGHT - 80, { width: CONTENT_WIDTH }
  );
  doc.fontSize(9).fillColor(GRAY_400).font("Helvetica").text(
    "legaltechcareers.com",
    MARGIN, PAGE_HEIGHT - 65, { width: CONTENT_WIDTH }
  );

  doc.restore();

  doc.end();
  return doc;
}
