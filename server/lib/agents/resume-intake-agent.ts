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
      const startDate = normalizeDate(exp.startDate || exp.start || "");
      const endDate = normalizeDate(exp.endDate || exp.end || "Present");

      if (!startDate) {
        toConfirm.push({
          id: generateId(),
          prompt: `When did you start at ${exp.company || "this company"}?`,
          fieldsToFill: ["startDate"],
          severity: "medium",
          resolved: false,
        });
      }

      const rawBullets = exp.bullets || exp.responsibilities || exp.achievements || [];
      const bullets: EditorBullet[] = (Array.isArray(rawBullets) ? rawBullets : []).map((b: any) => ({
        id: generateId(),
        text: typeof b === "string" ? b : b.text || "",
        grounded: true,
      }));

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
    graduationDate: normalizeDate(e.graduationDate || e.graduation || e.date || ""),
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
