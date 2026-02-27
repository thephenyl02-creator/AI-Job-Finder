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
    return `Weekly Briefing - ${fmt(weekAgo)} to ${fmt(now)}, ${now.getFullYear()}`;
  }
  if (period === "monthly") {
    return `Monthly Report - ${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  }
  return `Annual Report - ${now.getFullYear()}`;
}

const NAVY = "1e293b";
const ACCENT = "3b82f6";
const GRAY_500 = "64748b";
const WHITE = "ffffff";

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: WHITE };
  return { top: none, bottom: none, left: none, right: none };
}

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.SOLID, color: NAVY },
    borders: noBorders(),
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text, bold: true, color: WHITE, size: 16, font: "Calibri" })],
    })],
  });
}

function dataCell(text: string, width: number, align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT, shaded = false): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: shaded ? { type: ShadingType.SOLID, color: "f8fafc" } : undefined,
    borders: noBorders(),
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, size: 18, font: "Calibri", color: NAVY })],
    })],
  });
}

function sectionHeading(num: string, title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
    children: [
      new TextRun({ text: `${num}  `, color: ACCENT, bold: true, size: 16, font: "Calibri" }),
      new TextRun({ text: title, bold: true, size: 28, font: "Calibri", color: NAVY }),
    ],
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 20, font: "Calibri", color: GRAY_500 })],
  });
}

function insightText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 200 },
    indent: { left: 240 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 8 } },
    children: [new TextRun({ text, italics: true, size: 18, font: "Calibri", color: GRAY_500 })],
  });
}

function bulletItem(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: { level: 0 },
    children: [new TextRun({ text, size: 20, font: "Calibri", color: GRAY_500 })],
  });
}

function statLine(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20, font: "Calibri", color: NAVY }),
      new TextRun({ text: value, size: 20, font: "Calibri", color: GRAY_500 }),
    ],
  });
}

export async function generateMarketIntelligenceDocx(data: MarketData, period: string): Promise<Buffer> {
  const children: any[] = [];

  children.push(new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: "LEGAL TECH CAREERS", bold: true, size: 16, font: "Calibri", color: GRAY_500, characterSpacing: 80 })],
  }));
  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: 40 },
    children: [new TextRun({ text: `${getQuarterLabel()} Legal Tech Hiring Report`, bold: true, size: 52, font: "Calibri", color: NAVY })],
  }));
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: getPeriodTitle(period), size: 22, font: "Calibri", color: GRAY_500 })],
  }));
  children.push(new Paragraph({
    spacing: { after: 400 },
    children: [new TextRun({
      text: `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      size: 18, font: "Calibri", color: GRAY_500,
    })],
  }));

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 200 },
    children: [new TextRun({ text: "Key Findings", bold: true, size: 36, font: "Calibri", color: NAVY })],
  }));

  const findings = generateKeyFindings(data);
  for (const f of findings) {
    children.push(insightText(f));
  }

  children.push(sectionHeading("01", "Executive Summary"));
  children.push(statLine("Active Roles", fmtNum(data.overview.totalJobs)));
  children.push(statLine("Companies", String(data.overview.totalCompanies)));
  children.push(statLine("Countries", String(data.overview.totalCountries)));
  children.push(statLine("Remote", `${data.overview.remotePercentage}%`));
  children.push(statLine("New This Week", fmtNum(data.overview.newJobsThisWeek)));
  children.push(statLine("With Salary Data", fmtNum(data.overview.jobsWithSalary)));

  const execInsight = generateSectionInsight("executive", data);
  if (execInsight) children.push(bodyText(execInsight));

  if (data.skillsDemand.length > 0) {
    children.push(sectionHeading("02", "Skills in Demand"));
    const skillRows = data.skillsDemand.slice(0, 15).map((s, i) => new TableRow({
      children: [
        dataCell(String(i + 1).padStart(2, "0"), 600, AlignmentType.CENTER, i % 2 === 0),
        dataCell(s.skill, 4000, AlignmentType.LEFT, i % 2 === 0),
        dataCell(fmtNum(s.count), 1400, AlignmentType.RIGHT, i % 2 === 0),
      ],
    }));
    children.push(new Table({
      width: { size: 6000, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ children: [headerCell("#", 600), headerCell("SKILL", 4000), headerCell("MENTIONS", 1400)] }),
        ...skillRows,
      ],
    }));
    const skillsInsight = generateSectionInsight("skills", data);
    if (skillsInsight) children.push(insightText(skillsInsight));
  }

  if (data.careerPaths.length > 0) {
    children.push(sectionHeading("03", "Career Paths"));
    const cpRows = data.careerPaths.map((cp, i) => new TableRow({
      children: [
        dataCell(cp.name, 3000, AlignmentType.LEFT, i % 2 === 0),
        dataCell(fmtNum(cp.jobCount), 1200, AlignmentType.RIGHT, i % 2 === 0),
        dataCell(`${cp.percentage}%`, 1000, AlignmentType.RIGHT, i % 2 === 0),
        dataCell(fmtNum(cp.newThisWeek), 1400, AlignmentType.RIGHT, i % 2 === 0),
      ],
    }));
    children.push(new Table({
      width: { size: 6600, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ children: [headerCell("CAREER PATH", 3000), headerCell("JOBS", 1200), headerCell("SHARE", 1000), headerCell("NEW THIS WEEK", 1400)] }),
        ...cpRows,
      ],
    }));
    const careersInsight = generateSectionInsight("careers", data);
    if (careersInsight) children.push(insightText(careersInsight));
  }

  if (data.salaryByPath.length > 0) {
    children.push(sectionHeading("04", "Salary Insights"));
    const salRows = data.salaryByPath.map((sp, i) => new TableRow({
      children: [
        dataCell(sp.name, 2800, AlignmentType.LEFT, i % 2 === 0),
        dataCell(`${formatSalary(sp.medianMin)} - ${formatSalary(sp.medianMax)}`, 2400, AlignmentType.CENTER, i % 2 === 0),
        dataCell(`${sp.sampleSize} roles`, 1400, AlignmentType.RIGHT, i % 2 === 0),
      ],
    }));
    children.push(new Table({
      width: { size: 6600, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ children: [headerCell("CAREER PATH", 2800), headerCell("MEDIAN RANGE", 2400), headerCell("SAMPLE SIZE", 1400)] }),
        ...salRows,
      ],
    }));
    const salaryInsight = generateSectionInsight("salary", data);
    if (salaryInsight) children.push(insightText(salaryInsight));
  }

  const wmTotal = (data.workMode.remote || 0) + (data.workMode.hybrid || 0) + (data.workMode.onsite || 0);
  const aiTotal = (data.aiIntensity.low || 0) + (data.aiIntensity.medium || 0) + (data.aiIntensity.high || 0);

  if (wmTotal > 0 || aiTotal > 0) {
    children.push(sectionHeading("05", "Work Mode & AI Intensity"));
    if (wmTotal > 0) {
      children.push(statLine("Remote", `${fmtPct(data.workMode.remote, wmTotal)}% (${fmtNum(data.workMode.remote)} roles)`));
      children.push(statLine("Hybrid", `${fmtPct(data.workMode.hybrid, wmTotal)}% (${fmtNum(data.workMode.hybrid)} roles)`));
      children.push(statLine("On-site", `${fmtPct(data.workMode.onsite, wmTotal)}% (${fmtNum(data.workMode.onsite)} roles)`));
    }
    if (aiTotal > 0) {
      children.push(new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: "AI Intensity", bold: true, size: 22, font: "Calibri", color: NAVY })] }));
      children.push(statLine("Low", `${fmtPct(data.aiIntensity.low, aiTotal)}%`));
      children.push(statLine("Medium", `${fmtPct(data.aiIntensity.medium, aiTotal)}%`));
      children.push(statLine("High", `${fmtPct(data.aiIntensity.high, aiTotal)}%`));
    }
    const wmInsight = generateSectionInsight("workmode", data);
    if (wmInsight) children.push(insightText(wmInsight));
  }

  if (data.seniorityDistribution.length > 0) {
    children.push(sectionHeading("06", "Seniority Distribution"));
    const senRows = data.seniorityDistribution.map((s, i) => new TableRow({
      children: [
        dataCell(s.level, 3600, AlignmentType.LEFT, i % 2 === 0),
        dataCell(fmtNum(s.count), 2000, AlignmentType.RIGHT, i % 2 === 0),
      ],
    }));
    children.push(new Table({
      width: { size: 5600, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ children: [headerCell("LEVEL", 3600), headerCell("COUNT", 2000)] }),
        ...senRows,
      ],
    }));
    const senInsight = generateSectionInsight("seniority", data);
    if (senInsight) children.push(insightText(senInsight));
  }

  if (data.topCompanies.length > 0 || data.geography.length > 0) {
    children.push(sectionHeading("07", "Top Companies & Geography"));
    if (data.topCompanies.length > 0) {
      children.push(new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "Top Hiring Companies", bold: true, size: 22, font: "Calibri", color: NAVY })] }));
      for (let i = 0; i < Math.min(data.topCompanies.length, 10); i++) {
        const tc = data.topCompanies[i];
        children.push(statLine(`${String(i + 1).padStart(2, "0")}. ${tc.company}`, `${tc.jobCount} roles`));
      }
    }
    if (data.geography.length > 0) {
      children.push(new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: "Top Geographies", bold: true, size: 22, font: "Calibri", color: NAVY })] }));
      for (let i = 0; i < Math.min(data.geography.length, 10); i++) {
        const g = data.geography[i];
        children.push(statLine(`${String(i + 1).padStart(2, "0")}. ${g.countryName}`, `${fmtNum(g.jobCount)} roles`));
      }
    }
    const compInsight = generateSectionInsight("companies", data);
    if (compInsight) children.push(insightText(compInsight));
  }

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    children: [new TextRun({ text: "What This Means for Lawyers Considering Legal Tech", bold: true, size: 36, font: "Calibri", color: NAVY })],
  }));

  const wmTotalForLawyers = (data.workMode.remote || 0) + (data.workMode.hybrid || 0) + (data.workMode.onsite || 0);
  const flexPct = wmTotalForLawyers > 0 ? fmtPct(data.workMode.remote + data.workMode.hybrid, wmTotalForLawyers) : 0;

  children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "The Opportunity", bold: true, size: 24, font: "Calibri", color: NAVY })] }));
  children.push(bodyText(
    `With ${fmtNum(data.overview.totalJobs)} active positions across ${data.overview.totalCountries} countries, legal technology represents a substantial and growing labor market. Unlike traditional law, where geographic constraints and billable-hour structures dominate, ${flexPct}% of legal tech roles offer remote or hybrid arrangements. Legal professionals bring domain expertise that pure technologists lack - an understanding of regulatory frameworks, contract interpretation, litigation workflows, and client advisory dynamics. This positions lawyers not as career changers starting from scratch, but as specialists entering a field that values exactly what they already know.`
  ));

  children.push(new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: "Most Accessible Entry Points", bold: true, size: 24, font: "Calibri", color: NAVY })] }));
  const accessiblePaths = data.careerPaths.slice(0, 3).map(c => c.name).join(", ");
  const skillNote = data.skillsDemand.length >= 2
    ? `The most demanded skills - ${data.skillsDemand[0].skill} and ${data.skillsDemand[1].skill} - `
    : "Top skills ";
  children.push(bodyText(
    `Among current openings, ${accessiblePaths} represent the highest-volume categories - and all three draw heavily on core legal competencies. ${skillNote}overlap significantly with the capabilities developed in legal practice. For lawyers with 3-7 years of experience, these paths offer the strongest alignment between existing expertise and employer requirements.`
  ));

  children.push(new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: "Recommended Next Steps", bold: true, size: 24, font: "Calibri", color: NAVY })] }));
  const steps = [
    "Assess your readiness: Upload your resume for a personalized career diagnostic that maps your skills to current market demand.",
    "Target high-momentum paths: Focus your search on categories with the highest new listings this week - that is where hiring managers are actively reviewing candidates.",
    "Build bridge skills: Identify the 2-3 technical skills most relevant to your target path and invest in foundational fluency, not mastery.",
    "Leverage your legal edge: In applications and interviews, frame your legal experience as a strategic advantage - you understand the problems these companies are solving.",
  ];
  for (const step of steps) {
    children.push(bulletItem(step));
  }

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    children: [new TextRun({ text: "About This Report", bold: true, size: 36, font: "Calibri", color: NAVY })],
  }));
  children.push(bodyText(
    "This report is generated from real-time data collected across legal technology employers worldwide. Our pipeline continuously monitors job postings from leading ATS platforms including Greenhouse, Lever, Ashby, and Workday, covering law firms, legal tech startups, corporate legal departments, and alternative legal service providers."
  ));
  children.push(bodyText(
    "All statistics reflect currently active, published positions that have passed our quality gate. Salary data represents reported ranges where available. Skills are extracted and normalized using AI-powered enrichment with synonym merging for accuracy. Career path categorization follows our proprietary taxonomy of 13 categories mapped to three role tracks."
  ));
  children.push(new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: "Data Sources", bold: true, size: 24, font: "Calibri", color: NAVY })] }));
  const sources = [
    "Greenhouse, Lever, Ashby, Workday CXS API integrations",
    `${fmtNum(data.overview.totalCompanies)}+ companies tracked across legal technology`,
    "AI-powered job categorization and skills extraction",
    "Automated quality scoring, deduplication, and link validation",
    "Continuous refresh cycle with per-company reliability monitoring",
  ];
  for (const src of sources) {
    children.push(bulletItem(src));
  }

  children.push(new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: "Coverage", bold: true, size: 24, font: "Calibri", color: NAVY })] }));
  children.push(bulletItem(`${fmtNum(data.overview.totalJobs)} active roles across ${data.overview.totalCountries} countries`));
  children.push(bulletItem(`${data.overview.totalCompanies} companies monitored`));
  children.push(bulletItem(`${fmtNum(data.overview.jobsWithSalary)} roles with salary data (${data.overview.totalJobs ? Math.round(data.overview.jobsWithSalary / data.overview.totalJobs * 100) : 0}%)`));

  children.push(new Paragraph({
    spacing: { before: 400 },
    children: [new TextRun({
      text: `Data is refreshed continuously. This snapshot was generated on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`,
      size: 18, font: "Calibri", color: GRAY_500, italics: true,
    })],
  }));

  const doc = new Document({
    creator: "Legal Tech Careers",
    title: `Legal Tech Careers - ${getQuarterLabel()} Hiring Report`,
    description: "Market intelligence report for legal technology careers",
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
    numbering: {
      config: [{
        reference: "default-bullet",
        levels: [{
          level: 0,
          format: "bullet" as any,
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
    `The legal technology sector currently lists ${fmtNum(data.overview.totalJobs)} active roles across ${fmtNum(data.overview.totalCompanies)} companies in ${data.overview.totalCountries} countries - a market with meaningful breadth for professionals exploring a transition from traditional legal practice.`
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
      `Remote and hybrid work remain accessible: ${remotePct}% of positions offer fully remote arrangements, while ${hybridPct}% are hybrid - meaning ${remotePct + hybridPct}% of the market does not require full-time office presence.`
    );
  }
  if (data.salaryByPath.length > 0) {
    const sorted = [...data.salaryByPath].sort((a, b) => b.medianMax - a.medianMax);
    const highest = sorted[0];
    findings.push(`Salary ranges are competitive: ${highest.name} tops the compensation spectrum at ${formatSalary(highest.medianMin)}-${formatSalary(highest.medianMax)} median range (${highest.sampleSize} roles reporting).`);
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
      return `Compensation in legal technology is competitive with traditional practice. ${highest.name} commands the highest median range at ${formatSalary(highest.medianMin)}-${formatSalary(highest.medianMax)}.`;
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
      return `The seniority distribution is led by ${data.seniorityDistribution[0].level}-level roles (${fmtNum(data.seniorityDistribution[0].count)} positions).`;
    }
    case "companies": {
      if (data.topCompanies.length === 0 && data.geography.length === 0) return "";
      let text = "";
      if (data.topCompanies.length >= 3) {
        text += `${data.topCompanies[0].company} leads hiring with ${data.topCompanies[0].jobCount} active positions.`;
      }
      if (data.geography.length >= 2) {
        text += ` Geographically, ${data.geography[0].countryName} dominates with ${fmtNum(data.geography[0].jobCount)} roles.`;
      }
      return text;
    }
    default:
      return "";
  }
}
