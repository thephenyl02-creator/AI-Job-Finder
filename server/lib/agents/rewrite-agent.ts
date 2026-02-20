import type { EditorSections, EditorSkill } from "@shared/schema";
import { getOpenAIClient } from "../openai-client";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export interface RewriteResult {
  summary: string;
  summaryReason: string;
  summaryGrounded: boolean;
  experience: Array<{
    originalIndex: number;
    bullets: Array<{
      originalIndex: number;
      rewritten: string;
      reason: string;
      grounded: boolean;
    }>;
  }>;
  suggestedSkills: string[];
  strengthNotes: string[];
}

export async function rewriteAgent(
  sections: EditorSections,
  jobDescription: string,
  jobRequirements: string | undefined,
  jobTitle: string,
  company: string
): Promise<RewriteResult> {
  try {
    const openai = getOpenAIClient();
    const resumeContext = buildResumeContext(sections);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an elite legal tech career strategist. A candidate wants their resume rewritten for a specific role. You must rewrite EVERYTHING — summary, every single bullet point across every job, and suggest additional skills.

APPROACH:
- Think like a hiring manager at a legal tech company reading this resume. Make them stop scrolling.
- Bridge the candidate's legal background to the tech role. Legal expertise IS an asset — frame it that way.
- Use the EXACT language of the job posting. If they say "legal operations," don't write "legal management."
- Every bullet should start with a strong action verb and include measurable impact where the original implies scale.

REWRITE RULES:
1. NEVER invent employers, job titles, degrees, dates, or certifications not in the original
2. Rewrite EVERY bullet point — even if the improvement is small. Sharpen language, add job-relevant keywords, quantify impact where implied.
3. Write a compelling 2-3 sentence summary positioning this candidate as a natural fit for THIS specific role.
4. For bullets where you infer metrics not explicitly stated (e.g., "managed team" → "Led cross-functional team of 8"), set grounded=false so the user can verify.
5. Suggest 3-8 skills from the job posting the candidate should add (only if relevant to their background).
6. Note 1-3 genuine strengths this candidate brings to the role.

ACTION VERBS: Spearheaded, Orchestrated, Negotiated, Streamlined, Implemented, Championed, Advised, Drove, Architected, Transformed, Accelerated, Optimized

Return valid JSON:
{
  "summary": "new tailored summary",
  "summaryReason": "why this summary is better",
  "summaryGrounded": true,
  "experience": [
    {
      "originalIndex": 0,
      "bullets": [
        {
          "originalIndex": 0,
          "rewritten": "rewritten bullet text",
          "reason": "Added [keyword]; quantified impact",
          "grounded": true
        }
      ]
    }
  ],
  "suggestedSkills": ["skill1", "skill2"],
  "strengthNotes": ["Strength 1", "Strength 2"]
}

IMPORTANT: Include ALL experience entries and ALL bullets. Do not skip any.`
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
      summary: result.summary || "",
      summaryReason: result.summaryReason || "",
      summaryGrounded: result.summaryGrounded !== false,
      experience: Array.isArray(result.experience) ? result.experience : [],
      suggestedSkills: Array.isArray(result.suggestedSkills) ? result.suggestedSkills : [],
      strengthNotes: Array.isArray(result.strengthNotes) ? result.strengthNotes : [],
    };
  } catch (err) {
    console.error("[RewriteAgent] Failed:", err);
    return {
      summary: "",
      summaryReason: "",
      summaryGrounded: true,
      experience: [],
      suggestedSkills: [],
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

  sections.education.forEach((edu) => {
    parts.push(`\nEducation: ${edu.degree}${edu.field ? ` in ${edu.field}` : ""} from ${edu.institution}${edu.graduationDate ? ` (${edu.graduationDate})` : ""}`);
  });

  if (sections.skills.length > 0) {
    parts.push(`\nSkills: ${sections.skills.map(s => typeof s === 'string' ? s : s.name).join(", ")}`);
  }

  sections.certifications.forEach((c) => {
    parts.push(`Certification: ${c.name}${c.issuer ? ` from ${c.issuer}` : ""}`);
  });

  return parts.join("\n");
}

export function applyRewrite(
  sections: EditorSections,
  rewrite: RewriteResult
): EditorSections {
  let changedCount = 0;

  const result: EditorSections = {
    contact: { ...sections.contact },
    summary: sections.summary,
    experience: sections.experience.map(e => ({
      ...e,
      bullets: e.bullets.map(b => ({ ...b })),
    })),
    education: [...sections.education],
    skills: sections.skills.map(s => typeof s === 'string' ? { name: s } : { ...s }),
    certifications: [...sections.certifications],
  };

  if (rewrite.summary && rewrite.summary !== sections.summary) {
    result.originalSummary = sections.summary;
    result.summary = rewrite.summary;
    result.summaryRewriteReason = rewrite.summaryReason;
    result.summaryGrounded = rewrite.summaryGrounded;
    result.summaryReverted = false;
    changedCount++;
  }

  for (const expRewrite of rewrite.experience) {
    const idx = expRewrite.originalIndex;
    if (idx >= 0 && idx < result.experience.length && Array.isArray(expRewrite.bullets)) {
      for (const bulletRewrite of expRewrite.bullets) {
        const bIdx = bulletRewrite.originalIndex;
        if (bIdx >= 0 && bIdx < result.experience[idx].bullets.length) {
          const bullet = result.experience[idx].bullets[bIdx];
          if (bulletRewrite.rewritten && bulletRewrite.rewritten !== bullet.text) {
            bullet.originalText = bullet.text;
            bullet.text = bulletRewrite.rewritten;
            bullet.rewriteReason = bulletRewrite.reason || "";
            bullet.grounded = bulletRewrite.grounded !== false;
            bullet.reverted = false;
            changedCount++;
          }
        }
      }
    }
  }

  if (rewrite.suggestedSkills.length > 0) {
    const existingLower = new Set(result.skills.map(s => s.name.toLowerCase()));
    for (const skill of rewrite.suggestedSkills) {
      if (skill && !existingLower.has(skill.toLowerCase())) {
        result.skills.push({ name: skill, addedByAI: true });
        changedCount++;
      }
    }
  }

  if (rewrite.strengthNotes.length > 0) {
    result.strengthNotes = rewrite.strengthNotes;
  }

  result.changedCount = changedCount;
  return result;
}
