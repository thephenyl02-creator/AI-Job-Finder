import type { EditorSections, EditorBullet, EditorSkill, ToConfirmItem } from "@shared/schema";
import { getOpenAIClient } from "../openai-client";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export interface IntakeResult {
  sections: EditorSections;
  toConfirmItems: ToConfirmItem[];
}

function normalizeDate(date: string): string {
  if (!date || date === "Present" || date === "Current") return date;
  const cleaned = date.trim();
  if (/^\d{4}$/.test(cleaned)) return cleaned;
  if (/^\d{1,2}\/\d{4}$/.test(cleaned)) return cleaned;
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getMonth() + 1}/${parsed.getFullYear()}`;
  }
  return cleaned;
}

function parseDurationToStartEnd(duration: string): { startDate: string; endDate: string } {
  if (!duration) return { startDate: "", endDate: "Present" };
  const cleaned = duration.trim();
  const rangeMatch = cleaned.match(/^(.+?)\s*[-–—to]+\s*(.+)$/i);
  if (rangeMatch) {
    return {
      startDate: normalizeDate(rangeMatch[1].trim()),
      endDate: normalizeDate(rangeMatch[2].trim()),
    };
  }
  return { startDate: normalizeDate(cleaned), endDate: "Present" };
}

function splitDescriptionIntoBullets(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  const bulletSplit = trimmed.split(/(?:^|\n)\s*[-•▪▸◦●■]\s*/);
  const filtered = bulletSplit.map(s => s.trim()).filter(Boolean);
  if (filtered.length >= 2) return filtered;

  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
  if (sentences.length >= 2) return sentences;

  if (trimmed.length > 20) return [trimmed];
  return [];
}

function deduplicateSkills(skills: EditorSkill[]): EditorSkill[] {
  const seen = new Set<string>();
  return skills.filter(s => {
    const key = s.name.toLowerCase().trim();
    if (seen.has(key) || !key) return false;
    seen.add(key);
    return true;
  });
}

export async function resumeIntakeAgent(
  extractedData: any,
  resumeText?: string
): Promise<IntakeResult> {
  const toConfirmItems: ToConfirmItem[] = [];

  let sections: EditorSections;

  if (extractedData && typeof extractedData === "object") {
    sections = normalizeExtractedData(extractedData, toConfirmItems);

    const hasAnyEmptyBullets = sections.experience.length > 0 &&
      sections.experience.some(e => e.bullets.length === 0);

    if (hasAnyEmptyBullets && resumeText) {
      console.log("[ResumeIntakeAgent] Some experience entries had empty bullets, falling back to AI re-parse from raw text");
      try {
        const reParsed = await parseResumeTextWithAI(resumeText, []);
        if (reParsed.experience.some(e => e.bullets.length > 0)) {
          for (let i = 0; i < sections.experience.length; i++) {
            if (sections.experience[i].bullets.length > 0) continue;
            const match = reParsed.experience.find(re =>
              (re.company && sections.experience[i].company && re.company.toLowerCase() === sections.experience[i].company.toLowerCase()) ||
              (re.title && sections.experience[i].title && re.title.toLowerCase() === sections.experience[i].title.toLowerCase())
            );
            if (match && match.bullets.length > 0) {
              sections.experience[i].bullets = match.bullets;
            }
          }
          const stillEmpty = sections.experience.filter(e => e.bullets.length === 0);
          const usedBulletSets = new Set(sections.experience.filter(e => e.bullets.length > 0).map(e => e.bullets));
          for (const exp of stillEmpty) {
            const unusedReParsed = reParsed.experience.find(re =>
              re.bullets.length > 0 && !usedBulletSets.has(re.bullets)
            );
            if (unusedReParsed) {
              exp.bullets = unusedReParsed.bullets;
              usedBulletSets.add(unusedReParsed.bullets);
            }
          }
        }
      } catch (err) {
        console.error("[ResumeIntakeAgent] Fallback AI re-parse failed:", err);
      }
    }
  } else if (resumeText) {
    sections = await parseResumeTextWithAI(resumeText, toConfirmItems);
  } else {
    sections = getEmptySections();
  }

  sections.skills = deduplicateSkills(sections.skills);

  return { sections, toConfirmItems: toConfirmItems.slice(0, 5) };
}

function normalizeExtractedData(data: any, toConfirm: ToConfirmItem[]): EditorSections {
  const contact = {
    fullName: data.name || data.fullName || data.contact?.fullName || "",
    email: data.email || data.contact?.email || "",
    phone: data.phone || data.contact?.phone || "",
    location: data.location || data.contact?.location || "",
    linkedin: data.linkedin || data.contact?.linkedin || "",
    website: data.website || data.contact?.website || "",
  };

  if (!contact.fullName) {
    toConfirm.push({
      id: generateId(),
      prompt: "What is your full name?",
      fieldsToFill: ["contact.fullName"],
      severity: "high",
      resolved: false,
    });
  }

  const summary = data.summary || data.objective || "";

  const experience: EditorSections["experience"] = [];
  const rawExp = data.experience || data.workExperience || [];
  if (Array.isArray(rawExp)) {
    for (const exp of rawExp) {
      let startDate = normalizeDate(exp.startDate || exp.start || "");
      let endDate = normalizeDate(exp.endDate || exp.end || "");

      if (!startDate && exp.duration) {
        const parsed = parseDurationToStartEnd(exp.duration);
        startDate = parsed.startDate;
        if (!endDate) endDate = parsed.endDate;
      }
      if (!endDate) endDate = "Present";

      if (!startDate) {
        toConfirm.push({
          id: generateId(),
          prompt: `When did you start at ${exp.company || "this company"}?`,
          fieldsToFill: ["startDate"],
          severity: "medium",
          resolved: false,
        });
      }

      let rawBullets = exp.bullets || exp.responsibilities || exp.achievements || [];
      let bullets: EditorBullet[];

      if (Array.isArray(rawBullets) && rawBullets.length > 0) {
        bullets = rawBullets.map((b: any) => ({
          id: generateId(),
          text: typeof b === "string" ? b : b.text || "",
          grounded: true,
        }));
      } else {
        const descText = exp.description || exp.details || exp.summary || exp.duties || "";
        const splitBullets = splitDescriptionIntoBullets(descText);
        bullets = splitBullets.map(text => ({
          id: generateId(),
          text,
          grounded: true,
        }));
      }

      experience.push({
        id: generateId(),
        company: exp.company || exp.employer || "",
        title: exp.title || exp.role || exp.position || "",
        location: exp.location || "",
        startDate,
        endDate,
        current: endDate === "Present" || exp.current === true,
        bullets,
      });
    }
  }

  const rawEdu = data.education || [];
  const education: EditorSections["education"] = (Array.isArray(rawEdu) ? rawEdu : []).map((e: any) => ({
    id: generateId(),
    institution: e.institution || e.school || e.university || "",
    degree: e.degree || "",
    field: e.field || e.major || e.fieldOfStudy || "",
    graduationDate: normalizeDate(e.graduationDate || e.graduation || e.date || e.year || ""),
    honors: e.honors || e.gpa || "",
  }));

  const rawSkills = data.skills || [];
  let skillNames: string[] = [];
  if (Array.isArray(rawSkills)) {
    skillNames = rawSkills.map((s: any) => typeof s === "string" ? s : s.name || "").filter(Boolean);
  } else if (typeof rawSkills === "object") {
    skillNames = [
      ...(rawSkills.technical || []),
      ...(rawSkills.legal || []),
      ...(rawSkills.soft || []),
    ];
  }
  const skills: EditorSkill[] = skillNames.map(name => ({ name }));

  const rawCerts = data.certifications || [];
  const certifications = (Array.isArray(rawCerts) ? rawCerts : []).map((c: any) => ({
    id: generateId(),
    name: typeof c === "string" ? c : c.name || "",
    issuer: typeof c === "string" ? "" : c.issuer || "",
    date: typeof c === "string" ? "" : normalizeDate(c.date || ""),
  }));

  return {
    contact,
    summary,
    experience,
    education,
    skills,
    certifications,
  };
}

async function parseResumeTextWithAI(text: string, toConfirm: ToConfirmItem[]): Promise<EditorSections> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Parse this resume text into structured JSON. Return valid JSON with this structure:
{
  "contact": { "fullName": "", "email": "", "phone": "", "location": "", "linkedin": "", "website": "" },
  "summary": "",
  "experience": [{ "company": "", "title": "", "location": "", "startDate": "", "endDate": "", "current": false, "bullets": [""] }],
  "education": [{ "institution": "", "degree": "", "field": "", "graduationDate": "", "honors": "" }],
  "skills": [""],
  "certifications": [{ "name": "", "issuer": "", "date": "" }]
}

IMPORTANT: For each experience entry, extract EVERY bullet point, responsibility, or achievement as a separate item in the "bullets" array.
If the experience description is a paragraph, split it into individual sentences/accomplishments for the bullets array.
Extract ONLY what's in the text. Never invent information.`
        },
        { role: "user", content: text.substring(0, 8000) }
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    return normalizeExtractedData(parsed, toConfirm);
  } catch (err) {
    console.error("[ResumeIntakeAgent] AI parse failed:", err);
    return getEmptySections();
  }
}

function getEmptySections(): EditorSections {
  return {
    contact: { fullName: "", email: "", phone: "", location: "" },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    certifications: [],
  };
}
