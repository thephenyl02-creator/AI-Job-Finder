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
          content: `You are a resume optimization agent for legal tech careers. Generate a model resume tailored to the target job.

CRITICAL RULES:
1. NEVER invent employers, job titles, degrees, dates, certifications, or metrics that don't exist in the original resume
2. You may rewrite bullet points to better align with the job requirements, but the underlying facts must come from the original
3. You may suggest a new summary tailored to the role
4. You may reorder or emphasize skills that match the job
5. For each suggested bullet rewrite, indicate if it's "grounded" (based on original content) or "needs_confirmation" (inference that user should verify)
6. Keep ATS-safe formatting: action verbs, quantified achievements, relevant keywords

Return valid JSON:
{
  "summary": "new tailored summary",
  "summaryGrounded": true/false,
  "experience": [
    {
      "originalIndex": 0,
      "bullets": [
        {
          "originalIndex": 0,
          "suggested": "rewritten bullet text",
          "grounded": true/false,
          "improvementNote": "brief reason for change"
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
          content: `TARGET JOB: ${jobTitle} at ${company}\n\nJOB DESCRIPTION:\n${jobDescription.substring(0, 3000)}\n\nREQUIREMENTS:\n${(jobRequirements || "Not specified").substring(0, 1500)}\n\nORIGINAL RESUME:\n${resumeJson.substring(0, 4000)}`
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
    const existingLower = new Set(model.skills.map(s => s.toLowerCase()));
    for (const skill of aiResult.suggestedSkills) {
      if (!existingLower.has(skill.toLowerCase())) {
        model.skills.push(skill);
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
