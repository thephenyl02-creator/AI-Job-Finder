import type { EditorSections } from "@shared/schema";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import PDFDocument from "pdfkit";
import archiver from "archiver";
import { Readable, PassThrough } from "stream";
import { getOpenAIClient } from "../openai-client";

function resolveSkills(sections: EditorSections): string[] {
  return sections.skills
    .filter(s => typeof s === 'string' ? !!s : !!s.name)
    .map(s => typeof s === 'string' ? s : s.name);
}

function resolveBulletText(bullet: { text: string; originalText?: string; reverted?: boolean }): string {
  if (bullet.reverted && bullet.originalText) return bullet.originalText;
  return bullet.text;
}

function resolveSummary(sections: EditorSections): string {
  if (sections.summaryReverted && sections.originalSummary) return sections.originalSummary;
  return sections.summary;
}

export async function generateDocx(sections: EditorSections, jobTitle?: string): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(new Paragraph({
    children: [new TextRun({ text: sections.contact.fullName, bold: true, size: 28, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));

  const contactParts: string[] = [];
  if (sections.contact.email) contactParts.push(sections.contact.email);
  if (sections.contact.phone) contactParts.push(sections.contact.phone);
  if (sections.contact.location) contactParts.push(sections.contact.location);
  if (sections.contact.linkedin) contactParts.push(sections.contact.linkedin);

  if (contactParts.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: contactParts.join(" | "), size: 20, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }));
  }

  const summary = resolveSummary(sections);
  if (summary) {
    children.push(createSectionHeading("PROFESSIONAL SUMMARY"));
    children.push(new Paragraph({
      children: [new TextRun({ text: summary, size: 22, font: "Calibri" })],
      spacing: { after: 200 },
    }));
  }

  if (sections.experience.length > 0) {
    children.push(createSectionHeading("EXPERIENCE"));
    for (const exp of sections.experience) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: exp.title, bold: true, size: 22, font: "Calibri" }),
          new TextRun({ text: ` | ${exp.company}`, size: 22, font: "Calibri" }),
        ],
        spacing: { before: 120 },
      }));
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${exp.location ? exp.location + " | " : ""}${exp.startDate} - ${exp.endDate}`, size: 20, font: "Calibri", italics: true }),
        ],
        spacing: { after: 60 },
      }));
      for (const bullet of exp.bullets) {
        const text = resolveBulletText(bullet);
        if (text) {
          children.push(new Paragraph({
            children: [new TextRun({ text, size: 22, font: "Calibri" })],
            bullet: { level: 0 },
            spacing: { after: 40 },
          }));
        }
      }
    }
  }

  if (sections.education.length > 0) {
    children.push(createSectionHeading("EDUCATION"));
    for (const edu of sections.education) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: edu.degree, bold: true, size: 22, font: "Calibri" }),
          new TextRun({ text: edu.field ? ` in ${edu.field}` : "", size: 22, font: "Calibri" }),
        ],
      }));
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${edu.institution}${edu.graduationDate ? " | " + edu.graduationDate : ""}`, size: 20, font: "Calibri", italics: true }),
        ],
        spacing: { after: 100 },
      }));
    }
  }

  const skillNames = resolveSkills(sections);
  if (skillNames.length > 0) {
    children.push(createSectionHeading("SKILLS"));
    children.push(new Paragraph({
      children: [new TextRun({ text: skillNames.join(", "), size: 22, font: "Calibri" })],
      spacing: { after: 200 },
    }));
  }

  if (sections.certifications.length > 0) {
    children.push(createSectionHeading("CERTIFICATIONS"));
    for (const cert of sections.certifications) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: cert.name, bold: true, size: 22, font: "Calibri" }),
          new TextRun({ text: cert.issuer ? ` - ${cert.issuer}` : "", size: 22, font: "Calibri" }),
          new TextRun({ text: cert.date ? ` (${cert.date})` : "", size: 20, font: "Calibri", italics: true }),
        ],
        spacing: { after: 60 },
      }));
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

function createSectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, font: "Calibri", allCaps: true })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    border: { bottom: { color: "333333", space: 1, style: BorderStyle.SINGLE, size: 6 } },
  });
}

export async function generatePdf(sections: EditorSections): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margins: { top: 50, bottom: 50, left: 60, right: 60 } });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(16).text(sections.contact.fullName, { align: "center" });
    doc.moveDown(0.3);

    const contactParts: string[] = [];
    if (sections.contact.email) contactParts.push(sections.contact.email);
    if (sections.contact.phone) contactParts.push(sections.contact.phone);
    if (sections.contact.location) contactParts.push(sections.contact.location);
    if (contactParts.length > 0) {
      doc.font("Helvetica").fontSize(10).text(contactParts.join(" | "), { align: "center" });
    }
    doc.moveDown(0.5);

    const summary = resolveSummary(sections);
    if (summary) {
      drawSectionHeader(doc, "PROFESSIONAL SUMMARY");
      doc.font("Helvetica").fontSize(10).text(summary);
      doc.moveDown(0.5);
    }

    if (sections.experience.length > 0) {
      drawSectionHeader(doc, "EXPERIENCE");
      for (const exp of sections.experience) {
        doc.font("Helvetica-Bold").fontSize(11).text(`${exp.title} | ${exp.company}`);
        doc.font("Helvetica-Oblique").fontSize(9).text(`${exp.location ? exp.location + " | " : ""}${exp.startDate} - ${exp.endDate}`);
        doc.moveDown(0.2);
        for (const bullet of exp.bullets) {
          const text = resolveBulletText(bullet);
          if (text) {
            doc.font("Helvetica").fontSize(10).text(`• ${text}`, { indent: 15 });
          }
        }
        doc.moveDown(0.3);
      }
    }

    if (sections.education.length > 0) {
      drawSectionHeader(doc, "EDUCATION");
      for (const edu of sections.education) {
        doc.font("Helvetica-Bold").fontSize(11).text(`${edu.degree}${edu.field ? " in " + edu.field : ""}`);
        doc.font("Helvetica-Oblique").fontSize(9).text(`${edu.institution}${edu.graduationDate ? " | " + edu.graduationDate : ""}`);
        doc.moveDown(0.3);
      }
    }

    const skillNames = resolveSkills(sections);
    if (skillNames.length > 0) {
      drawSectionHeader(doc, "SKILLS");
      doc.font("Helvetica").fontSize(10).text(skillNames.join(", "));
      doc.moveDown(0.5);
    }

    if (sections.certifications.length > 0) {
      drawSectionHeader(doc, "CERTIFICATIONS");
      for (const cert of sections.certifications) {
        doc.font("Helvetica").fontSize(10).text(`${cert.name}${cert.issuer ? " - " + cert.issuer : ""}${cert.date ? " (" + cert.date + ")" : ""}`);
      }
    }

    doc.end();
  });
}

function drawSectionHeader(doc: PDFKit.PDFDocument, text: string) {
  doc.font("Helvetica-Bold").fontSize(12).text(text);
  doc.moveTo(doc.x, doc.y).lineTo(doc.x + 490, doc.y).lineWidth(0.5).stroke("#333333");
  doc.moveDown(0.3);
}

export async function generateApplyPack(
  sections: EditorSections,
  jobTitle: string,
  company: string
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const [pdfBuffer, docxBuffer] = await Promise.all([
        generatePdf(sections),
        generateDocx(sections, jobTitle),
      ]);

      let coverLetterText = "";
      try {
        coverLetterText = await generateCoverLetter(sections, jobTitle, company);
      } catch (err) {
        console.error("[ExportAgent] Cover letter generation failed:", err);
        coverLetterText = `Dear Hiring Manager,\n\nI am writing to express my interest in the ${jobTitle} position at ${company}.\n\nWith my background in ${sections.experience[0]?.title || "the field"}, I believe I would be a strong fit for this role.\n\nSincerely,\n${sections.contact.fullName}`;
      }

      const archive = archiver("zip", { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      const passThrough = new PassThrough();
      passThrough.on("data", (chunk: Buffer) => chunks.push(chunk));
      passThrough.on("end", () => resolve(Buffer.concat(chunks)));
      passThrough.on("error", reject);

      archive.pipe(passThrough);
      archive.append(pdfBuffer, { name: "Resume.pdf" });
      archive.append(docxBuffer, { name: "Resume.docx" });
      archive.append(coverLetterText, { name: "Cover_Letter.txt" });
      await archive.finalize();
    } catch (err) {
      reject(err);
    }
  });
}

async function generateCoverLetter(
  sections: EditorSections,
  jobTitle: string,
  company: string
): Promise<string> {
  const openai = getOpenAIClient();
  const skillNames = resolveSkills(sections);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Write a professional cover letter (200-250 words) for a legal tech career application. 
Rules:
- Use ONLY facts from the provided resume. Never invent experience, titles, or achievements.
- Keep it concise and professional
- Address to "Dear Hiring Manager"
- Close with the applicant's name
- Focus on how their experience aligns with the role`
      },
      {
        role: "user",
        content: `Position: ${jobTitle} at ${company}\n\nApplicant: ${sections.contact.fullName}\nCurrent/Recent Role: ${sections.experience[0]?.title || "N/A"} at ${sections.experience[0]?.company || "N/A"}\nKey Skills: ${skillNames.slice(0, 10).join(", ")}\nSummary: ${resolveSummary(sections) || "N/A"}`
      }
    ],
  });

  return response.choices[0]?.message?.content || "";
}
