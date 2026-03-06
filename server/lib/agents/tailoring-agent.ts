import type { EditorSections } from "@shared/schema";
import { getOpenAIClient } from "../openai-client";

export interface TailoringResult {
  summarySuggestion: string;
  bulletSuggestions: Array<{
    experienceIndex: number;
    bulletIndex: number;
    suggested: string;
    improvementNote: string;
  }>;
  missingSkills: string[];
  strengthNotes: string[];
}

export async function tailoringAgent(
  sections: EditorSections,
  jobDescription: string,
  jobRequirements: string | undefined,
  jobTitle: string,
  company: string
): Promise<TailoringResult> {
  try {
    const openai = getOpenAIClient();

    const resumeContext = buildResumeContext(sections);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a senior legal career coach specializing in legal technology transitions. A candidate wants to tailor their existing resume for a specific role. Your job is to suggest improvements while keeping their original content intact.

INSTRUCTIONS:
1. Write a tailored professional summary (2-3 sentences) that positions this candidate for the target role. Reference their actual background — never invent credentials.
2. For the 3-5 most impactful bullet points, suggest rewrites that better align with the job. Use strong action verbs, weave in relevant keywords from the job posting, and quantify impact where the original implies scale.
3. Identify 3-6 skills from the job posting that the candidate should add to their skills section (only if genuinely relevant to their background).
4. Note 1-2 genuine strengths this candidate brings to the role.

RULES:
- Never invent experience, metrics, or credentials not implied by the original
- Keep bullet rewrites grounded in the original content — just sharpen the language
- Focus on legal tech, legal operations, compliance, and legal industry keywords
- Use plain professional language, no buzzwords or fluff

Return valid JSON:
{
  "summarySuggestion": "tailored summary text",
  "bulletSuggestions": [
    {
      "experienceIndex": 0,
      "bulletIndex": 0,
      "suggested": "improved bullet text",
      "improvementNote": "why this is better for this role"
    }
  ],
  "missingSkills": ["skill1", "skill2"],
  "strengthNotes": ["This candidate's X experience maps directly to Y requirement"]
}`
        },
        {
          role: "user",
          content: `TARGET ROLE: ${jobTitle} at ${company}

JOB DESCRIPTION:
${jobDescription.substring(0, 4000)}

REQUIREMENTS:
${(jobRequirements || "See job description above").substring(0, 2000)}

CANDIDATE RESUME:
${resumeContext.substring(0, 5000)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");

    return {
      summarySuggestion: result.summarySuggestion || "",
      bulletSuggestions: Array.isArray(result.bulletSuggestions) ? result.bulletSuggestions : [],
      missingSkills: Array.isArray(result.missingSkills) ? result.missingSkills : [],
      strengthNotes: Array.isArray(result.strengthNotes) ? result.strengthNotes : [],
    };
  } catch (err) {
    console.error("[TailoringAgent] Failed:", err);
    return {
      summarySuggestion: "",
      bulletSuggestions: [],
      missingSkills: [],
      strengthNotes: [],
    };
  }
}

function buildResumeContext(sections: EditorSections): string {
  const parts: string[] = [];
  parts.push(`Name: ${sections.contact.fullName}`);
  if (sections.summary) parts.push(`Summary: ${sections.summary}`);

  sections.experience.forEach((exp, i) => {
    parts.push(`\nExperience ${i}: ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate})`);
    if (exp.location) parts.push(`  Location: ${exp.location}`);
    exp.bullets.forEach((b, j) => {
      parts.push(`  Bullet ${j}: ${b.text}`);
    });
  });

  sections.education.forEach((edu, i) => {
    parts.push(`\nEducation ${i}: ${edu.degree}${edu.field ? ` in ${edu.field}` : ""} from ${edu.institution}${edu.graduationDate ? ` (${edu.graduationDate})` : ""}`);
  });

  if (sections.skills.length > 0) {
    parts.push(`\nSkills: ${sections.skills.map(s => s.name).join(", ")}`);
  }

  sections.certifications.forEach((c) => {
    parts.push(`Certification: ${c.name}${c.issuer ? ` from ${c.issuer}` : ""}`);
  });

  return parts.join("\n");
}

export function applyTailoringSuggestions(
  sections: EditorSections,
  tailoring: TailoringResult
): EditorSections {
  const result: EditorSections = {
    contact: { ...sections.contact },
    summary: sections.summary,
    experience: sections.experience.map(e => ({
      ...e,
      bullets: e.bullets.map(b => ({ ...b })),
    })),
    education: [...sections.education],
    skills: [...sections.skills],
    certifications: [...sections.certifications],
  };

  if (tailoring.summarySuggestion) {
    result.summarySuggestion = tailoring.summarySuggestion;
    result.summarySuggestionStatus = "pending";
    result.summarySuggestionGrounded = true;
  }

  for (const bs of tailoring.bulletSuggestions) {
    const expIdx = bs.experienceIndex;
    const bIdx = bs.bulletIndex;
    if (expIdx >= 0 && expIdx < result.experience.length) {
      if (bIdx >= 0 && bIdx < result.experience[expIdx].bullets.length) {
        const bullet = result.experience[expIdx].bullets[bIdx];
        if (bs.suggested && bs.suggested !== bullet.text) {
          bullet.suggestion = bs.suggested;
          bullet.grounded = true;
          bullet.status = "pending";
          bullet.improvementNote = bs.improvementNote || "";
          bullet.evidenceRefs = [`experience.${expIdx}.bullets.${bIdx}`];
        }
      }
    }
  }

  if (tailoring.missingSkills.length > 0) {
    const existingLower = new Set(result.skills.map(s => s.name.toLowerCase()));
    for (const skill of tailoring.missingSkills) {
      if (skill && !existingLower.has(skill.toLowerCase())) {
        result.skills.push({ name: skill, addedByAI: true });
      }
    }
  }

  if (tailoring.strengthNotes.length > 0) {
    result.strengthNotes = tailoring.strengthNotes;
  }

  return result;
}
