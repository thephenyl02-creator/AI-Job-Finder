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
    generatedBullets?: Array<{
      text: string;
      reason: string;
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
  company: string,
  careerContext?: { strengths: { label: string; evidence: string }[]; gaps: { label: string; suggestion: string }[] } | null
): Promise<RewriteResult> {
  try {
    const openai = getOpenAIClient();
    const resumeContext = buildResumeContext(sections);

    const hasEmptyBulletEntries = sections.experience.some(e => e.bullets.length === 0);

    const emptyBulletsInstruction = hasEmptyBulletEntries
      ? `\n\nSPECIAL CASE - EXPERIENCE WITH NO BULLETS:
Some experience entries have no bullet points. For these, generate 2-3 plausible bullet points based on the job title, company, and the target role. Mark ALL generated bullets as grounded=false so the user can verify them.
Include these in a "generatedBullets" array (separate from the "bullets" array which is for rewriting existing bullets):
"generatedBullets": [{ "text": "generated bullet text", "reason": "Generated based on role title" }]`
      : "";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an elite legal tech career strategist. A candidate wants their resume tailored for a specific role. Be SELECTIVE — only change what matters.

APPROACH:
- Think like a hiring manager at a legal tech company. Focus on the 5-8 most impactful improvements.
- Bridge the candidate's legal background to the tech role. Legal expertise IS an asset.
- Use the EXACT language of the job posting. If they say "legal operations," don't write "legal management."

SELECTIVE REWRITE RULES:
1. NEVER invent employers, job titles, degrees, dates, or certifications not in the original.
2. ALWAYS rewrite the summary — position the candidate as a natural fit for THIS specific role (2-3 sentences).
3. Only rewrite bullets that DIRECTLY relate to the job's key requirements or where the improvement is substantial. SKIP bullets that are already strong or only tangentially related. Return them in the experience array but with their original text unchanged — omit them from the bullets array entirely.
4. Focus rewrites on: adding job-relevant keywords, quantifying impact where implied, and strengthening weak language.
5. For bullets where you infer metrics not explicitly stated, set grounded=false so the user can verify.
6. Suggest 3-6 skills from the job posting the candidate should add (only if relevant to their background).
7. Note 1-3 genuine strengths this candidate brings to the role.

Return valid JSON:
{
  "summary": "new tailored summary",
  "summaryReason": "why this summary positions them well",
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
      ],
      "generatedBullets": []
    }
  ],
  "suggestedSkills": ["skill1", "skill2"],
  "strengthNotes": ["Strength 1", "Strength 2"]
}

IMPORTANT:
- Include ALL experience entries in the array (one per originalIndex).
- For each entry, ONLY include bullets you actually changed in the "bullets" array. Skip unchanged bullets — they will be preserved as-is.
- Aim for 5-8 total bullet rewrites across all experience, not every single bullet.${emptyBulletsInstruction}`
        },
        {
          role: "user",
          content: `TARGET ROLE: ${jobTitle} at ${company}

JOB DESCRIPTION:
${jobDescription.substring(0, 4000)}

REQUIREMENTS:
${(jobRequirements || "See job description above").substring(0, 2000)}
${careerContext ? `
CAREER INTELLIGENCE (from prior analysis):
Candidate Strengths: ${careerContext.strengths.map(s => `${s.label} (${s.evidence})`).join("; ")}
Known Gaps to Address: ${careerContext.gaps.map(g => `${g.label} — ${g.suggestion}`).join("; ")}
Use this context to: amplify the strengths in bullet rewrites, and specifically position experience to offset the known gaps where possible.` : ""}

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
    if (exp.bullets.length > 0) {
      exp.bullets.forEach((b, j) => {
        parts.push(`  Bullet ${j}: ${b.text}`);
      });
    } else {
      parts.push(`  (No bullet points provided for this role — please generate 2-3 based on the role title)`);
    }
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
  let summaryRewritten = false;
  let bulletsSharpened = 0;
  let bulletsGenerated = 0;
  let skillsAdded = 0;

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
    summaryRewritten = true;
  }

  for (const expRewrite of rewrite.experience) {
    const idx = expRewrite.originalIndex;
    if (idx >= 0 && idx < result.experience.length) {
      if (Array.isArray(expRewrite.bullets)) {
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
              bulletsSharpened++;
            }
          }
        }
      }

      if (Array.isArray(expRewrite.generatedBullets) && expRewrite.generatedBullets.length > 0) {
        for (const gen of expRewrite.generatedBullets) {
          if (gen.text) {
            result.experience[idx].bullets.push({
              id: generateId(),
              text: gen.text,
              grounded: false,
              addedByAI: true,
              rewriteReason: gen.reason || "Generated based on your role title",
            });
            changedCount++;
            bulletsGenerated++;
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
        skillsAdded++;
      }
    }
  }

  if (rewrite.strengthNotes.length > 0) {
    result.strengthNotes = rewrite.strengthNotes;
  }

  result.changedCount = changedCount;
  result.changeBreakdown = {
    summaryRewritten,
    bulletsSharpened,
    bulletsGenerated,
    skillsAdded,
  };
  return result;
}
