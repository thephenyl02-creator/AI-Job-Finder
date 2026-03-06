import type { RequirementItem, EditorSections } from "@shared/schema";
import { getOpenAIClient } from "../openai-client";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export async function requirementMappingAgent(
  jobDescription: string,
  jobRequirements: string | undefined,
  sections: EditorSections
): Promise<RequirementItem[]> {
  try {
    const openai = getOpenAIClient();

    const resumeContext = buildResumeContext(sections);
    const jobText = `${jobDescription}\n\nRequirements: ${jobRequirements || "Not specified"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze the job posting and extract requirements. Map each against the candidate's resume. Return valid JSON:
{
  "requirements": [
    {
      "text": "requirement description",
      "category": "must_have" | "nice_to_have" | "tools_keywords",
      "coverage": "covered" | "partial" | "missing",
      "evidenceRefs": ["experience.0.bullets.0", "skills.3"]
    }
  ]
}

Rules:
- Extract 8-15 requirements max
- "must_have": explicitly required qualifications, experience, degrees
- "nice_to_have": preferred but not required items
- "tools_keywords": specific tools, technologies, certifications mentioned
- "covered": clearly demonstrated in resume
- "partial": somewhat related experience exists but not exact match
- "missing": no evidence in resume
- evidenceRefs: use dot notation paths like "experience.0.bullets.2", "skills.5", "education.0", "certifications.1"
- Only reference items that actually exist in the resume`
        },
        {
          role: "user",
          content: `JOB POSTING:\n${jobText.substring(0, 4000)}\n\nCANDIDATE RESUME:\n${resumeContext.substring(0, 4000)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{"requirements":[]}');
    const requirements = parsed.requirements || [];

    return requirements.map((r: any) => ({
      id: generateId(),
      text: r.text || "",
      category: validateCategory(r.category),
      coverage: validateCoverage(r.coverage),
      evidenceRefs: Array.isArray(r.evidenceRefs) ? r.evidenceRefs : [],
    }));
  } catch (err) {
    console.error("[RequirementMappingAgent] Failed:", err);
    return extractRequirementsFallback(jobDescription, jobRequirements);
  }
}

function buildResumeContext(sections: EditorSections): string {
  const parts: string[] = [];
  parts.push(`Name: ${sections.contact.fullName}`);
  if (sections.summary) parts.push(`Summary: ${sections.summary}`);
  
  sections.experience.forEach((exp, i) => {
    parts.push(`\nExperience ${i}: ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate})`);
    exp.bullets.forEach((b, j) => {
      parts.push(`  - [experience.${i}.bullets.${j}] ${b.text}`);
    });
  });

  sections.education.forEach((edu, i) => {
    parts.push(`\nEducation ${i}: ${edu.degree} in ${edu.field} from ${edu.institution}`);
  });

  if (sections.skills.length > 0) {
    parts.push(`\nSkills: ${sections.skills.map((s, i) => `[skills.${i}] ${s}`).join(", ")}`);
  }

  sections.certifications.forEach((c, i) => {
    parts.push(`Certification ${i}: ${c.name} from ${c.issuer}`);
  });

  return parts.join("\n");
}

function validateCategory(cat: string): RequirementItem["category"] {
  if (cat === "must_have" || cat === "nice_to_have" || cat === "tools_keywords") return cat;
  return "nice_to_have";
}

function validateCoverage(cov: string): RequirementItem["coverage"] {
  if (cov === "covered" || cov === "partial" || cov === "missing") return cov;
  return "missing";
}

function extractRequirementsFallback(description: string, requirements?: string): RequirementItem[] {
  const text = `${description} ${requirements || ""}`;
  const lines = text.split(/[.\n]/).filter(l => l.trim().length > 20);
  const reqKeywords = ["require", "must", "should", "experience", "knowledge", "skill", "proficien"];
  
  return lines
    .filter(l => reqKeywords.some(k => l.toLowerCase().includes(k)))
    .slice(0, 10)
    .map(l => ({
      id: generateId(),
      text: l.trim(),
      category: "must_have" as const,
      coverage: "missing" as const,
      evidenceRefs: [],
    }));
}
