import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  TableLayoutType,
  Header,
  Footer,
  PageBreak,
  PageNumber,
  NumberFormat,
  Tab,
  TabStopType,
  TabStopPosition,
  VerticalAlign,
  LevelFormat,
} from "docx";

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

const NAVY = "1a2332";
const DARK_NAVY = "0f1722";
const ACCENT = "2563eb";
const GRAY_700 = "374151";
const GRAY_500 = "6b7280";
const GRAY_400 = "9ca3af";
const LIGHT_BG = "f8fafc";
const STRIPE_BG = "f1f5f9";
const WHITE = "ffffff";
const BORDER_GRAY = "e2e8f0";
const FONT = "Calibri";
const FULL_WIDTH = 9360;

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function fmtPct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function formatSalary(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n.toLocaleString()}`;
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
    return `Weekly Briefing  \u2014  ${fmt(weekAgo)} to ${fmt(now)}, ${now.getFullYear()}`;
  }
  if (period === "monthly") {
    return `Monthly Report  \u2014  ${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  }
  return `Annual Report  \u2014  ${now.getFullYear()}`;
}

function thinBorder(color = BORDER_GRAY) {
  const b = { style: BorderStyle.SINGLE, size: 1, color };
  return { top: b, bottom: b, left: b, right: b };
}

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: WHITE };
  return { top: none, bottom: none, left: none, right: none };
}

function bottomOnlyBorder() {
  const none = { style: BorderStyle.NONE, size: 0, color: WHITE };
  return { top: none, left: none, right: none, bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY } };
}

function tblHeaderCell(text: string, width: number, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.SOLID, color: DARK_NAVY },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, color: WHITE, size: 15, font: FONT, characterSpacing: 30 })],
    })],
  });
}

function tblDataCell(text: string, width: number, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT, rowIdx = 0): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: rowIdx % 2 === 0 ? { type: ShadingType.SOLID, color: WHITE } : { type: ShadingType.SOLID, color: STRIPE_BG },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    borders: bottomOnlyBorder(),
    children: [new Paragraph({
      alignment: align,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text, size: 19, font: FONT, color: GRAY_700 })],
    })],
  });
}

function tblNumCell(text: string, width: number, rowIdx = 0, bold = false): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: rowIdx % 2 === 0 ? { type: ShadingType.SOLID, color: WHITE } : { type: ShadingType.SOLID, color: STRIPE_BG },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    borders: bottomOnlyBorder(),
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text, size: 19, font: FONT, color: bold ? NAVY : GRAY_700, bold })],
    })],
  });
}

function sectionTitle(num: string, title: string, pageBreakBefore = false): Paragraph {
  const children: any[] = [];
  if (pageBreakBefore) {
    children.push(new TextRun({ break: 1, text: "", font: FONT, size: 2 }));
  }
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: pageBreakBefore ? 0 : 480, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: NAVY, space: 6 } },
    children: [
      new TextRun({ text: `${num}`, bold: true, size: 20, font: FONT, color: ACCENT }),
      new TextRun({ text: `  \u2502  `, size: 20, font: FONT, color: GRAY_400 }),
      new TextRun({ text: title.toUpperCase(), bold: true, size: 22, font: FONT, color: NAVY, characterSpacing: 20 }),
    ],
  });
}

function sectionTitleWithBreak(num: string, title: string): Paragraph[] {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    sectionTitle(num, title, false),
  ];
}

function subsectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, font: FONT, color: NAVY })],
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 160, line: 276 },
    children: [new TextRun({ text, size: 20, font: FONT, color: GRAY_700 })],
  });
}

function insightCallout(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 240 },
    indent: { left: 200, right: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 12 } },
    shading: { type: ShadingType.SOLID, color: LIGHT_BG },
    children: [
      new TextRun({ text: "INSIGHT  ", bold: true, size: 14, font: FONT, color: ACCENT, characterSpacing: 40 }),
      new TextRun({ text, size: 18, font: FONT, color: GRAY_700, italics: true }),
    ],
  });
}

function bulletItem(text: string, bold_prefix = ""): Paragraph {
  const children: any[] = [];
  if (bold_prefix) {
    children.push(new TextRun({ text: bold_prefix, bold: true, size: 20, font: FONT, color: NAVY }));
  }
  children.push(new TextRun({ text: bold_prefix ? text : text, size: 20, font: FONT, color: GRAY_700 }));
  return new Paragraph({
    spacing: { after: 80, line: 276 },
    bullet: { level: 0 },
    children,
  });
}

function spacer(pts = 120): Paragraph {
  return new Paragraph({ spacing: { before: pts, after: 0 }, children: [] });
}

function buildAtAGlancePanel(data: MarketData): Table {
  const stats = [
    { label: "ACTIVE ROLES", value: fmtNum(data.overview.totalJobs) },
    { label: "COMPANIES", value: fmtNum(data.overview.totalCompanies) },
    { label: "COUNTRIES", value: String(data.overview.totalCountries) },
    { label: "REMOTE", value: `${data.overview.remotePercentage}%` },
    { label: "NEW THIS WEEK", value: fmtNum(data.overview.newJobsThisWeek) },
    { label: "WITH SALARY DATA", value: fmtNum(data.overview.jobsWithSalary) },
  ];

  const cellWidth = Math.floor(FULL_WIDTH / 3);

  function statCell(label: string, value: string): TableCell {
    return new TableCell({
      width: { size: cellWidth, type: WidthType.DXA },
      borders: thinBorder(BORDER_GRAY),
      shading: { type: ShadingType.SOLID, color: LIGHT_BG },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: value, bold: true, size: 36, font: FONT, color: NAVY })],
        }),
        new Paragraph({
          spacing: { after: 0 },
          children: [new TextRun({ text: label, size: 13, font: FONT, color: GRAY_500, characterSpacing: 40, bold: true })],
        }),
      ],
    });
  }

  return new Table({
    width: { size: FULL_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ children: [statCell(stats[0].label, stats[0].value), statCell(stats[1].label, stats[1].value), statCell(stats[2].label, stats[2].value)] }),
      new TableRow({ children: [statCell(stats[3].label, stats[3].value), statCell(stats[4].label, stats[4].value), statCell(stats[5].label, stats[5].value)] }),
    ],
  });
}

function buildWorkModeTable(data: MarketData): Table {
  const wmTotal = (data.workMode.remote || 0) + (data.workMode.hybrid || 0) + (data.workMode.onsite || 0);
  const modes = [
    { mode: "Remote", count: data.workMode.remote || 0, pct: fmtPct(data.workMode.remote || 0, wmTotal) },
    { mode: "Hybrid", count: data.workMode.hybrid || 0, pct: fmtPct(data.workMode.hybrid || 0, wmTotal) },
    { mode: "On-site", count: data.workMode.onsite || 0, pct: fmtPct(data.workMode.onsite || 0, wmTotal) },
  ];

  const colW = [Math.floor(FULL_WIDTH * 0.4), Math.floor(FULL_WIDTH * 0.3), Math.floor(FULL_WIDTH * 0.3)];

  return new Table({
    width: { size: FULL_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ children: [tblHeaderCell("Work Mode", colW[0]), tblHeaderCell("Roles", colW[1], AlignmentType.RIGHT), tblHeaderCell("Share", colW[2], AlignmentType.RIGHT)] }),
      ...modes.map((m, i) => new TableRow({
        children: [tblDataCell(m.mode, colW[0], AlignmentType.LEFT, i), tblNumCell(fmtNum(m.count), colW[1], i), tblNumCell(`${m.pct}%`, colW[2], i)],
      })),
    ],
  });
}

function buildAIIntensityTable(data: MarketData): Table {
  const aiTotal = (data.aiIntensity.low || 0) + (data.aiIntensity.medium || 0) + (data.aiIntensity.high || 0);
  const levels = [
    { level: "Low", count: data.aiIntensity.low || 0, pct: fmtPct(data.aiIntensity.low || 0, aiTotal) },
    { level: "Medium", count: data.aiIntensity.medium || 0, pct: fmtPct(data.aiIntensity.medium || 0, aiTotal) },
    { level: "High", count: data.aiIntensity.high || 0, pct: fmtPct(data.aiIntensity.high || 0, aiTotal) },
  ];

  const colW = [Math.floor(FULL_WIDTH * 0.4), Math.floor(FULL_WIDTH * 0.3), Math.floor(FULL_WIDTH * 0.3)];

  return new Table({
    width: { size: FULL_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ children: [tblHeaderCell("AI Intensity", colW[0]), tblHeaderCell("Roles", colW[1], AlignmentType.RIGHT), tblHeaderCell("Share", colW[2], AlignmentType.RIGHT)] }),
      ...levels.map((l, i) => new TableRow({
        children: [tblDataCell(l.level, colW[0], AlignmentType.LEFT, i), tblNumCell(fmtNum(l.count), colW[1], i), tblNumCell(`${l.pct}%`, colW[2], i)],
      })),
    ],
  });
}

function makePageHeader(): Header {
  return new Header({
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: NAVY, space: 4 } },
        spacing: { after: 0 },
        children: [
          new TextRun({ text: "LEGAL TECH CAREERS", bold: true, size: 14, font: FONT, color: NAVY, characterSpacing: 80 }),
          new TextRun({ text: "\t" }),
          new TextRun({ text: `${getQuarterLabel()} Hiring Report`, size: 14, font: FONT, color: GRAY_500 }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      }),
    ],
  });
}

function makePageFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY, space: 4 } },
        spacing: { before: 0 },
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({ text: "Confidential  \u2014  For Professional Use", size: 14, font: FONT, color: GRAY_400 }),
          new TextRun({ text: "\t" }),
          new TextRun({ text: "Page ", size: 14, font: FONT, color: GRAY_400 }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, font: FONT, color: GRAY_400 }),
          new TextRun({ text: " of ", size: 14, font: FONT, color: GRAY_400 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, font: FONT, color: GRAY_400 }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      }),
    ],
  });
}

export async function generateMarketIntelligenceDocx(data: MarketData, period: string, siteUrl?: string): Promise<Buffer> {
  const baseUrl = siteUrl || "legaltechcareers.com";
  const coverChildren: any[] = [];

  coverChildren.push(spacer(600));
  coverChildren.push(new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: "LEGAL TECH CAREERS", bold: true, size: 18, font: FONT, color: ACCENT, characterSpacing: 120 })],
  }));
  coverChildren.push(new Paragraph({
    spacing: { after: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 12 } },
    children: [new TextRun({ text: " ", size: 8, font: FONT })],
  }));
  coverChildren.push(spacer(200));
  coverChildren.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: 80 },
    children: [new TextRun({ text: `${getQuarterLabel()} Legal Tech`, bold: true, size: 56, font: FONT, color: NAVY })],
  }));
  coverChildren.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: 120 },
    children: [new TextRun({ text: "Hiring Report", bold: true, size: 56, font: FONT, color: NAVY })],
  }));
  coverChildren.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: getPeriodTitle(period), size: 22, font: FONT, color: GRAY_500 })],
  }));
  coverChildren.push(new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({
      text: `Published ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`,
      size: 18, font: FONT, color: GRAY_400,
    })],
  }));

  coverChildren.push(spacer(400));
  coverChildren.push(new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text: "AT A GLANCE", bold: true, size: 16, font: FONT, color: NAVY, characterSpacing: 60 })],
  }));
  coverChildren.push(buildAtAGlancePanel(data));

  coverChildren.push(spacer(400));
  coverChildren.push(new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({
      text: baseUrl,
      size: 16, font: FONT, color: GRAY_400,
    })],
  }));

  const bodyChildren: any[] = [];

  bodyChildren.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 120, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: NAVY, space: 8 } },
    children: [new TextRun({ text: "KEY FINDINGS", bold: true, size: 28, font: FONT, color: NAVY, characterSpacing: 40 })],
  }));

  const findings = generateKeyFindings(data);
  findings.forEach((f, i) => {
    bodyChildren.push(new Paragraph({
      spacing: { before: 120, after: 160 },
      indent: { left: 200, right: 200 },
      border: { left: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 12 } },
      shading: { type: ShadingType.SOLID, color: LIGHT_BG },
      children: [
        new TextRun({ text: `${String(i + 1).padStart(2, "0")}  `, bold: true, size: 18, font: FONT, color: ACCENT }),
        new TextRun({ text: f, size: 19, font: FONT, color: GRAY_700 }),
      ],
    }));
  });

  bodyChildren.push(...sectionTitleWithBreak("01", "Executive Summary"));

  const execInsight = generateSectionInsight("executive", data);
  if (execInsight) bodyChildren.push(bodyText(execInsight));

  const summaryStats = [
    { label: "Active Roles", value: fmtNum(data.overview.totalJobs) },
    { label: "Companies Hiring", value: fmtNum(data.overview.totalCompanies) },
    { label: "Countries Covered", value: String(data.overview.totalCountries) },
    { label: "Remote Roles", value: `${data.overview.remotePercentage}%` },
    { label: "New Roles This Week", value: `+${fmtNum(data.overview.newJobsThisWeek)}` },
    { label: "Roles With Salary Data", value: `${fmtNum(data.overview.jobsWithSalary)} (${data.overview.totalJobs ? Math.round(data.overview.jobsWithSalary / data.overview.totalJobs * 100) : 0}%)` },
  ];

  const summaryColW = [Math.floor(FULL_WIDTH * 0.55), Math.floor(FULL_WIDTH * 0.45)];
  bodyChildren.push(new Table({
    width: { size: FULL_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ children: [tblHeaderCell("Metric", summaryColW[0]), tblHeaderCell("Value", summaryColW[1], AlignmentType.RIGHT)] }),
      ...summaryStats.map((s, i) => new TableRow({
        children: [
          tblDataCell(s.label, summaryColW[0], AlignmentType.LEFT, i),
          tblNumCell(s.value, summaryColW[1], i, true),
        ],
      })),
    ],
  }));

  if (data.skillsDemand.length > 0) {
    bodyChildren.push(...sectionTitleWithBreak("02", "Skills in Demand"));
    const skillsInsight = generateSectionInsight("skills", data);
    if (skillsInsight) bodyChildren.push(insightCallout(skillsInsight));

    const sColW = [600, Math.floor(FULL_WIDTH * 0.55), Math.floor(FULL_WIDTH * 0.15), Math.floor(FULL_WIDTH - 600 - Math.floor(FULL_WIDTH * 0.55) - Math.floor(FULL_WIDTH * 0.15))];
    const maxCount = Math.max(...data.skillsDemand.slice(0, 15).map(s => s.count), 1);

    bodyChildren.push(new Table({
      width: { size: FULL_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ children: [tblHeaderCell("#", sColW[0], AlignmentType.CENTER), tblHeaderCell("Skill", sColW[1]), tblHeaderCell("Mentions", sColW[2], AlignmentType.RIGHT), tblHeaderCell("Relative", sColW[3], AlignmentType.CENTER)] }),
        ...data.skillsDemand.slice(0, 15).map((s, i) => {
          const barLen = Math.round((s.count / maxCount) * 20);
          const bar = "\u2588".repeat(barLen) + "\u2591".repeat(20 - barLen);
          return new TableRow({
            children: [
              tblDataCell(String(i + 1).padStart(2, "0"), sColW[0], AlignmentType.CENTER, i),
              tblDataCell(s.skill, sColW[1], AlignmentType.LEFT, i),
              tblNumCell(fmtNum(s.count), sColW[2], i),
              new TableCell({
                width: { size: sColW[3], type: WidthType.DXA },
                shading: i % 2 === 0 ? { type: ShadingType.SOLID, color: WHITE } : { type: ShadingType.SOLID, color: STRIPE_BG },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 50, bottom: 50, left: 100, right: 100 },
                borders: bottomOnlyBorder(),
                children: [new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [new TextRun({ text: bar, size: 14, font: "Courier New", color: ACCENT })],
                })],
              }),
            ],
          });
        }),
      ],
    }));
  }

  if (data.careerPaths.length > 0) {
    bodyChildren.push(...sectionTitleWithBreak("03", "Career Paths"));
    const careersInsight = generateSectionInsight("careers", data);
    if (careersInsight) bodyChildren.push(insightCallout(careersInsight));

    const cpColW = [Math.floor(FULL_WIDTH * 0.4), Math.floor(FULL_WIDTH * 0.18), Math.floor(FULL_WIDTH * 0.18), Math.floor(FULL_WIDTH * 0.24)];
    bodyChildren.push(new Table({
      width: { size: FULL_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ children: [tblHeaderCell("Career Path", cpColW[0]), tblHeaderCell("Jobs", cpColW[1], AlignmentType.RIGHT), tblHeaderCell("Share", cpColW[2], AlignmentType.RIGHT), tblHeaderCell("New This Week", cpColW[3], AlignmentType.RIGHT)] }),
        ...data.careerPaths.map((cp, i) => new TableRow({
          children: [
            tblDataCell(cp.name, cpColW[0], AlignmentType.LEFT, i),
            tblNumCell(fmtNum(cp.jobCount), cpColW[1], i, cp.percentage >= 10),
            tblNumCell(`${cp.percentage}%`, cpColW[2], i),
            tblNumCell(cp.newThisWeek > 0 ? `+${fmtNum(cp.newThisWeek)}` : "\u2014", cpColW[3], i),
          ],
        })),
      ],
    }));
  }

  if (data.salaryByPath.length > 0) {
    bodyChildren.push(...sectionTitleWithBreak("04", "Compensation Analysis"));
    const salaryInsight = generateSectionInsight("salary", data);
    if (salaryInsight) bodyChildren.push(insightCallout(salaryInsight));

    const salColW = [Math.floor(FULL_WIDTH * 0.38), Math.floor(FULL_WIDTH * 0.2), Math.floor(FULL_WIDTH * 0.2), Math.floor(FULL_WIDTH * 0.22)];
    bodyChildren.push(new Table({
      width: { size: FULL_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ children: [tblHeaderCell("Career Path", salColW[0]), tblHeaderCell("Median Low", salColW[1], AlignmentType.RIGHT), tblHeaderCell("Median High", salColW[2], AlignmentType.RIGHT), tblHeaderCell("Sample Size", salColW[3], AlignmentType.RIGHT)] }),
        ...data.salaryByPath.map((sp, i) => new TableRow({
          children: [
            tblDataCell(sp.name, salColW[0], AlignmentType.LEFT, i),
            tblNumCell(formatSalary(sp.medianMin), salColW[1], i),
            tblNumCell(formatSalary(sp.medianMax), salColW[2], i, true),
            tblNumCell(`${sp.sampleSize} roles`, salColW[3], i),
          ],
        })),
      ],
    }));
  }

  const wmTotal = (data.workMode.remote || 0) + (data.workMode.hybrid || 0) + (data.workMode.onsite || 0);
  const aiTotal = (data.aiIntensity.low || 0) + (data.aiIntensity.medium || 0) + (data.aiIntensity.high || 0);

  if (wmTotal > 0 || aiTotal > 0) {
    bodyChildren.push(...sectionTitleWithBreak("05", "Work Mode & AI Intensity"));
    const wmInsight = generateSectionInsight("workmode", data);
    if (wmInsight) bodyChildren.push(insightCallout(wmInsight));

    if (wmTotal > 0) {
      bodyChildren.push(subsectionTitle("Work Mode Distribution"));
      bodyChildren.push(buildWorkModeTable(data));
    }

    if (aiTotal > 0) {
      bodyChildren.push(spacer(200));
      bodyChildren.push(subsectionTitle("AI Integration Levels"));
      bodyChildren.push(buildAIIntensityTable(data));
    }
  }

  if (data.seniorityDistribution.length > 0) {
    bodyChildren.push(...sectionTitleWithBreak("06", "Seniority Distribution"));
    const senInsight = generateSectionInsight("seniority", data);
    if (senInsight) bodyChildren.push(insightCallout(senInsight));

    const senColW = [Math.floor(FULL_WIDTH * 0.5), Math.floor(FULL_WIDTH * 0.25), Math.floor(FULL_WIDTH * 0.25)];
    const senTotal = data.seniorityDistribution.reduce((sum, s) => sum + s.count, 0);
    bodyChildren.push(new Table({
      width: { size: FULL_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ children: [tblHeaderCell("Level", senColW[0]), tblHeaderCell("Count", senColW[1], AlignmentType.RIGHT), tblHeaderCell("Share", senColW[2], AlignmentType.RIGHT)] }),
        ...data.seniorityDistribution.map((s, i) => new TableRow({
          children: [
            tblDataCell(s.level, senColW[0], AlignmentType.LEFT, i),
            tblNumCell(fmtNum(s.count), senColW[1], i),
            tblNumCell(`${fmtPct(s.count, senTotal)}%`, senColW[2], i),
          ],
        })),
      ],
    }));
  }

  if (data.topCompanies.length > 0 || data.geography.length > 0) {
    bodyChildren.push(...sectionTitleWithBreak("07", "Companies & Geography"));

    if (data.topCompanies.length > 0) {
      bodyChildren.push(subsectionTitle("Top Hiring Companies"));
      const compColW = [600, Math.floor(FULL_WIDTH * 0.55), FULL_WIDTH - 600 - Math.floor(FULL_WIDTH * 0.55)];
      bodyChildren.push(new Table({
        width: { size: FULL_WIDTH, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({ children: [tblHeaderCell("#", compColW[0], AlignmentType.CENTER), tblHeaderCell("Company", compColW[1]), tblHeaderCell("Open Roles", compColW[2], AlignmentType.RIGHT)] }),
          ...data.topCompanies.slice(0, 10).map((tc, i) => new TableRow({
            children: [
              tblDataCell(String(i + 1).padStart(2, "0"), compColW[0], AlignmentType.CENTER, i),
              tblDataCell(tc.company, compColW[1], AlignmentType.LEFT, i),
              tblNumCell(fmtNum(tc.jobCount), compColW[2], i, i < 3),
            ],
          })),
        ],
      }));
    }

    if (data.geography.length > 0) {
      bodyChildren.push(spacer(280));
      bodyChildren.push(subsectionTitle("Top Geographies"));
      const geoColW = [600, Math.floor(FULL_WIDTH * 0.55), FULL_WIDTH - 600 - Math.floor(FULL_WIDTH * 0.55)];
      bodyChildren.push(new Table({
        width: { size: FULL_WIDTH, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({ children: [tblHeaderCell("#", geoColW[0], AlignmentType.CENTER), tblHeaderCell("Country", geoColW[1]), tblHeaderCell("Open Roles", geoColW[2], AlignmentType.RIGHT)] }),
          ...data.geography.slice(0, 15).map((g, i) => new TableRow({
            children: [
              tblDataCell(String(i + 1).padStart(2, "0"), geoColW[0], AlignmentType.CENTER, i),
              tblDataCell(g.countryName, geoColW[1], AlignmentType.LEFT, i),
              tblNumCell(fmtNum(g.jobCount), geoColW[2], i, i < 3),
            ],
          })),
        ],
      }));
    }

    const compInsight = generateSectionInsight("companies", data);
    if (compInsight) bodyChildren.push(insightCallout(compInsight));
  }

  bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
  bodyChildren.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 120, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: NAVY, space: 8 } },
    children: [new TextRun({ text: "WHAT THIS MEANS FOR LAWYERS", bold: true, size: 28, font: FONT, color: NAVY, characterSpacing: 40 })],
  }));

  const wmTotalForLawyers = (data.workMode.remote || 0) + (data.workMode.hybrid || 0) + (data.workMode.onsite || 0);
  const flexPct = wmTotalForLawyers > 0 ? fmtPct(data.workMode.remote + data.workMode.hybrid, wmTotalForLawyers) : 0;

  bodyChildren.push(subsectionTitle("The Opportunity"));
  bodyChildren.push(bodyText(
    `With ${fmtNum(data.overview.totalJobs)} active positions across ${data.overview.totalCountries} countries, legal technology represents a substantial and growing labor market. Unlike traditional law, where geographic constraints and billable-hour structures dominate, ${flexPct}% of legal tech roles offer remote or hybrid arrangements. Legal professionals bring domain expertise that pure technologists lack \u2014 an understanding of regulatory frameworks, contract interpretation, litigation workflows, and client advisory dynamics. This positions lawyers not as career changers starting from scratch, but as specialists entering a field that values exactly what they already know.`
  ));

  bodyChildren.push(subsectionTitle("Most Accessible Entry Points"));
  const accessiblePaths = data.careerPaths.slice(0, 3).map(c => c.name).join(", ");
  const skillNote = data.skillsDemand.length >= 2
    ? `The most demanded skills \u2014 ${data.skillsDemand[0].skill} and ${data.skillsDemand[1].skill} \u2014 `
    : "Top skills ";
  bodyChildren.push(bodyText(
    `Among current openings, ${accessiblePaths} represent the highest-volume categories \u2014 and all three draw heavily on core legal competencies. ${skillNote}overlap significantly with the capabilities developed in legal practice. For lawyers with 3\u20137 years of experience, these paths offer the strongest alignment between existing expertise and employer requirements.`
  ));

  bodyChildren.push(subsectionTitle("Recommended Next Steps"));
  bodyChildren.push(bulletItem("Assess your readiness: ", "Upload your resume for a personalized career diagnostic that maps your skills to current market demand."));
  bodyChildren.push(bulletItem("Target high-momentum paths: ", "Focus your search on categories with the highest new listings this week \u2014 that is where hiring managers are actively reviewing candidates."));
  bodyChildren.push(bulletItem("Build bridge skills: ", "Identify the 2\u20133 technical skills most relevant to your target path and invest in foundational fluency, not mastery."));
  bodyChildren.push(bulletItem("Leverage your legal edge: ", "In applications and interviews, frame your legal experience as a strategic advantage \u2014 you understand the problems these companies are solving."));

  bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
  bodyChildren.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 120, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: NAVY, space: 8 } },
    children: [new TextRun({ text: "METHODOLOGY", bold: true, size: 28, font: FONT, color: NAVY, characterSpacing: 40 })],
  }));

  bodyChildren.push(bodyText(
    "This report is generated from real-time data collected across legal technology employers worldwide. Our pipeline continuously monitors job postings from leading applicant tracking systems including Greenhouse, Lever, Ashby, and Workday, covering law firms, legal tech startups, corporate legal departments, and alternative legal service providers."
  ));
  bodyChildren.push(bodyText(
    "All statistics reflect currently active, published positions that have passed our quality gate. Salary data represents reported ranges where available. Skills are extracted and normalized using AI-powered enrichment with synonym merging for accuracy. Career path categorization follows our proprietary taxonomy of 13 categories mapped to three role tracks (Lawyer-Led, Technical, and Ecosystem)."
  ));

  bodyChildren.push(subsectionTitle("Data Sources"));
  bodyChildren.push(bulletItem("Greenhouse, Lever, Ashby, and Workday CXS API integrations"));
  bodyChildren.push(bulletItem(`${fmtNum(data.overview.totalCompanies)}+ companies tracked across legal technology`));
  bodyChildren.push(bulletItem("AI-powered job categorization and skills extraction"));
  bodyChildren.push(bulletItem("Automated quality scoring, deduplication, and link validation"));
  bodyChildren.push(bulletItem("Continuous refresh cycle with per-company reliability monitoring"));

  bodyChildren.push(subsectionTitle("Coverage"));
  bodyChildren.push(bulletItem(`${fmtNum(data.overview.totalJobs)} active roles across ${data.overview.totalCountries} countries`));
  bodyChildren.push(bulletItem(`${data.overview.totalCompanies} companies monitored`));
  bodyChildren.push(bulletItem(`${fmtNum(data.overview.jobsWithSalary)} roles with salary data (${data.overview.totalJobs ? Math.round(data.overview.jobsWithSalary / data.overview.totalJobs * 100) : 0}%)`));

  bodyChildren.push(spacer(400));
  bodyChildren.push(new Paragraph({
    spacing: { after: 80 },
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY, space: 8 } },
    children: [new TextRun({
      text: `Data is refreshed continuously. This snapshot was generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}.`,
      size: 16, font: FONT, color: GRAY_400, italics: true,
    })],
  }));
  bodyChildren.push(new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({
      text: "\u00a9 Legal Tech Careers. All rights reserved.",
      size: 14, font: FONT, color: GRAY_400,
    })],
  }));

  const pageHeader = makePageHeader();
  const pageFooter = makePageFooter();

  const doc = new Document({
    creator: "Legal Tech Careers",
    title: `Legal Tech Careers \u2014 ${getQuarterLabel()} Hiring Report`,
    description: "Market intelligence report for legal technology careers",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1296, bottom: 1080, left: 1296 },
          },
        },
        children: coverChildren,
      },
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1296, bottom: 1080, left: 1296 },
          },
        },
        headers: { default: pageHeader },
        footers: { default: pageFooter },
        children: bodyChildren,
      },
    ],
    numbering: {
      config: [{
        reference: "default-bullet",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
  });

  return await Packer.toBuffer(doc) as Buffer;
}

function generateKeyFindings(data: MarketData): string[] {
  const findings: string[] = [];
  findings.push(
    `The legal technology sector currently lists ${fmtNum(data.overview.totalJobs)} active roles across ${fmtNum(data.overview.totalCompanies)} companies in ${data.overview.totalCountries} countries \u2014 a market with meaningful breadth for professionals exploring a transition from traditional legal practice.`
  );
  if (data.careerPaths.length > 0) {
    const top = data.careerPaths[0];
    const second = data.careerPaths.length > 1 ? data.careerPaths[1] : null;
    let text = `${top.name} leads demand with ${fmtNum(top.jobCount)} positions (${top.percentage}% of all roles)`;
    if (second) text += `, followed by ${second.name} at ${second.percentage}%.`;
    else text += ".";
    text += ` This concentration signals where employers are investing most heavily and where candidates may find the strongest hiring momentum.`;
    findings.push(text);
  }
  const wmTotal = (data.workMode.remote || 0) + (data.workMode.hybrid || 0) + (data.workMode.onsite || 0);
  if (wmTotal > 0) {
    const remotePct = fmtPct(data.workMode.remote, wmTotal);
    const hybridPct = fmtPct(data.workMode.hybrid, wmTotal);
    findings.push(
      `Remote and hybrid work remain accessible: ${remotePct}% of positions offer fully remote arrangements, while ${hybridPct}% are hybrid \u2014 meaning ${remotePct + hybridPct}% of the market does not require full-time office presence.`
    );
  }
  if (data.salaryByPath.length > 0) {
    const sorted = [...data.salaryByPath].sort((a, b) => b.medianMax - a.medianMax);
    const highest = sorted[0];
    findings.push(`Salary ranges are competitive: ${highest.name} tops the compensation spectrum at ${formatSalary(highest.medianMin)}\u2013${formatSalary(highest.medianMax)} median range (${highest.sampleSize} roles reporting).`);
  }
  if (data.skillsDemand.length >= 3) {
    const top3 = data.skillsDemand.slice(0, 3);
    findings.push(
      `The most sought-after skills are ${top3[0].skill} (${fmtNum(top3[0].count)} mentions), ${top3[1].skill} (${fmtNum(top3[1].count)}), and ${top3[2].skill} (${fmtNum(top3[2].count)}).`
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
      return `The legal technology labor market is actively hiring across ${data.overview.totalCountries} countries, with ${fmtNum(data.overview.totalCompanies)} companies maintaining open positions.${remoteNote}`;
    }
    case "skills": {
      if (data.skillsDemand.length < 2) return "";
      const top = data.skillsDemand[0];
      const runner = data.skillsDemand[1];
      return `${top.skill} dominates employer requirements with ${fmtNum(top.count)} mentions, nearly ${top.count > runner.count * 1.5 ? "double" : "matching"} ${runner.skill} at ${fmtNum(runner.count)}. For lawyers considering a transition, these skills represent concrete learning objectives.`;
    }
    case "careers": {
      if (data.careerPaths.length < 2) return "";
      const top = data.careerPaths[0];
      return `${top.name} accounts for ${top.percentage}% of all positions, establishing it as the primary hiring category in legal technology.`;
    }
    case "salary": {
      if (data.salaryByPath.length === 0) return "";
      const sorted = [...data.salaryByPath].sort((a, b) => b.medianMax - a.medianMax);
      const highest = sorted[0];
      return `Compensation in legal technology is competitive with traditional practice. ${highest.name} commands the highest median range at ${formatSalary(highest.medianMin)}\u2013${formatSalary(highest.medianMax)}.`;
    }
    case "workmode": {
      const wmTotal = (data.workMode.remote || 0) + (data.workMode.hybrid || 0) + (data.workMode.onsite || 0);
      if (wmTotal === 0) return "";
      const remotePct = fmtPct(data.workMode.remote, wmTotal);
      return `With ${remotePct}% of roles offering full remote work, legal technology is notably more flexible than traditional legal practice.`;
    }
    case "seniority": {
      if (data.seniorityDistribution.length === 0) return "";
      const total = data.seniorityDistribution.reduce((sum, s) => sum + s.count, 0);
      const entry = data.seniorityDistribution.find(s => s.level.toLowerCase().includes("entry") || s.level.toLowerCase().includes("junior"));
      const mid = data.seniorityDistribution.find(s => s.level.toLowerCase().includes("mid"));
      if (entry && mid) {
        const accessiblePct = fmtPct(entry.count + mid.count, total);
        return `${accessiblePct}% of roles are at Entry or Mid level, suggesting the market is receptive to professionals entering from adjacent fields.`;
      }
      return "";
    }
    case "companies": {
      if (data.topCompanies.length === 0) return "";
      const top = data.topCompanies[0];
      const top3Total = data.topCompanies.slice(0, 3).reduce((sum, c) => sum + c.jobCount, 0);
      const totalPct = data.overview.totalJobs > 0 ? Math.round((top3Total / data.overview.totalJobs) * 100) : 0;
      return `${top.company} leads hiring with ${top.jobCount} open positions. The top three employers account for ${totalPct}% of all listed roles, indicating meaningful concentration among market leaders.`;
    }
    default:
      return "";
  }
}
