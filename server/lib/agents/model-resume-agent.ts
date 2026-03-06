import type { EditorSections, EditorBullet, EditorExperience } from "@shared/schema";
import { getOpenAIClient } from "../openai-client";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export async function modelResumeAgent(
  originalSections: EditorSections,
  jobDescription: string,
  jobRequirements: string | undefined,
  jobTitle: string,
  company: string
): Promise<EditorSections> {
  try {
    const openai = getOpenAIClient();

    const resumeJson = JSON.stringify({
      summary: originalSections.summary,
      experience: originalSections.experience.map(e => ({
        company: e.company,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        bullets: e.bullets.map(b => b.text),
      })),
      skills: originalSections.skills,
      education: originalSections.education,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an elite legal tech career strategist who has helped hundreds of lawyers transition into legal technology roles. Your task: transform this resume into a compelling, ATS-optimized version tailored to the target position.

APPROACH:
- Think like a hiring manager at a legal tech company. What would make them stop scrolling?
- Bridge the candidate's legal background to the tech role. Legal expertise IS an asset — frame it that way.
- Use the language of the job posting. If they say "legal operations," don't write "legal management."

CRITICAL RULES:
1. NEVER invent employers, job titles, degrees, dates, or certifications not in the original
2. You MAY sharpen bullet points with stronger action verbs, add relevant keywords from the job posting, and quantify impact where the original implies scale (e.g., "managed team" → "Led cross-functional team of 8" only if team size is implied)
3. Write a compelling 2-3 sentence summary positioning this candidate as a natural fit
4. For bullets with inferred metrics or claims, mark grounded=false so the user can verify
5. Suggest 3-6 skills from the job posting the candidate should add if relevant to their background

ATS OPTIMIZATION:
- Start bullets with strong action verbs: Spearheaded, Orchestrated, Negotiated, Streamlined, Implemented, Championed, Advised, Drove, Architected
- Include exact keywords from the job posting (e.g., "contract lifecycle management," "legal workflow automation," "compliance framework")
- Quantify impact: revenue, time saved, accuracy improvement, team size, project scope, cases handled

Return valid JSON:
{
  "summary": "new tailored summary",
  "summaryGrounded": true,
  "experience": [
    {
      "originalIndex": 0,
      "bullets": [
        {
          "originalIndex": 0,
          "suggested": "rewritten bullet text with action verb and keywords",
          "grounded": true/false,
          "improvementNote": "Added [keyword] from job posting; quantified impact"
        }
      ]
    }
  ],
  "suggestedSkills": ["skill1", "skill2"],
  "newSkillsGrounded": false
}`
        },
        {
          role: "user",
          content: `TARGET ROLE: ${jobTitle} at ${company}\n\nJOB DESCRIPTION:\n${jobDescription.substring(0, 4000)}\n\nREQUIREMENTS:\n${(jobRequirements || "See job description above").substring(0, 2000)}\n\nORIGINAL RESUME:\n${resumeJson.substring(0, 5000)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return applyModelSuggestions(originalSections, result);
  } catch (err) {
    console.error("[ModelResumeAgent] Failed:", err);
    return cloneSectionsWithPendingSuggestions(originalSections);
  }
}

function applyModelSuggestions(original: EditorSections, aiResult: any): EditorSections {
  const model: EditorSections = {
    contact: { ...original.contact },
    summary: original.summary,
    experience: original.experience.map(e => ({
      ...e,
      bullets: e.bullets.map(b => ({ ...b })),
    })),
    education: [...original.education],
    skills: [...original.skills],
    certifications: [...original.certifications],
  };

  if (aiResult.summary) {
    model.summarySuggestion = aiResult.summary;
    model.summarySuggestionStatus = "pending";
    model.summarySuggestionGrounded = aiResult.summaryGrounded !== false;
  }

  if (Array.isArray(aiResult.experience)) {
    for (const expSuggestion of aiResult.experience) {
      const idx = expSuggestion.originalIndex;
      if (idx >= 0 && idx < model.experience.length && Array.isArray(expSuggestion.bullets)) {
        for (const bulletSuggestion of expSuggestion.bullets) {
          const bIdx = bulletSuggestion.originalIndex;
          if (bIdx >= 0 && bIdx < model.experience[idx].bullets.length) {
            const bullet = model.experience[idx].bullets[bIdx];
            bullet.suggestion = bulletSuggestion.suggested || "";
            bullet.grounded = bulletSuggestion.grounded !== false;
            bullet.status = bulletSuggestion.grounded === false ? "needs_confirmation" : "pending";
            bullet.improvementNote = bulletSuggestion.improvementNote || "";
            bullet.evidenceRefs = [`experience.${idx}.bullets.${bIdx}`];
          }
        }
      }
    }
  }

  if (Array.isArray(aiResult.suggestedSkills)) {
    const existingLower = new Set(model.skills.map(s => s.name.toLowerCase()));
    for (const skill of aiResult.suggestedSkills) {
      if (!existingLower.has(skill.toLowerCase())) {
        model.skills.push({ name: skill, addedByAI: true });
      }
    }
  }

  return model;
}

function cloneSectionsWithPendingSuggestions(original: EditorSections): EditorSections {
  return {
    contact: { ...original.contact },
    summary: original.summary,
    experience: original.experience.map(e => ({
      ...e,
      bullets: e.bullets.map(b => ({ ...b, status: "pending" as const })),
    })),
    education: [...original.education],
    skills: [...original.skills],
    certifications: [...original.certifications],
  };
}
