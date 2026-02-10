import { getOpenAIClient } from "./openai-client";
import type { StructuredDescription } from "@shared/schema";

export interface RewriteInput {
  bullets: string[];
  jobTitle: string;
  company: string;
  structuredDescription: StructuredDescription;
}

export interface RewrittenBullet {
  original: string;
  rewritten: string;
  matchedKeywords: string[];
  improvementNote: string;
}

export interface RewriteOutput {
  bullets: RewrittenBullet[];
  suggestedSkills: string[];
  overallTips: string;
}

function getJobSignal(sd: StructuredDescription): string {
  const parts: string[] = [];
  if (sd.summary) parts.push(`Role Summary: ${sd.summary}`);
  if (sd.responsibilities?.length)
    parts.push(`Key Responsibilities: ${sd.responsibilities.slice(0, 6).join("; ")}`);
  if (sd.skillsRequired?.length)
    parts.push(`Required Skills: ${sd.skillsRequired.join(", ")}`);
  if (sd.minimumQualifications?.length)
    parts.push(`Qualifications: ${sd.minimumQualifications.slice(0, 4).join("; ")}`);
  if (sd.seniority) parts.push(`Seniority: ${sd.seniority}`);
  if (sd.legalTechCategory) parts.push(`Category: ${sd.legalTechCategory}`);
  return parts.join("\n");
}

export async function rewriteBulletsForJob(input: RewriteInput): Promise<RewriteOutput> {
  const openai = getOpenAIClient();
  const jobSignal = getJobSignal(input.structuredDescription);

  const systemPrompt = `You are a career coach for legal professionals transitioning into legal technology roles. Your job is to rewrite resume bullet points so they align more closely with a specific job posting—while preserving the candidate's truthful experience.

Rules:
- Never fabricate experience. Only rephrase, reorder emphasis, and add relevant industry terminology.
- Mirror keywords and skills from the job posting where the candidate's experience genuinely applies.
- Use strong action verbs and quantify impact where the original bullet implies it.
- Keep each bullet concise (1-2 lines).
- If a bullet already aligns well with the role, return it unchanged and explain why it already works.
- If a bullet has no meaningful connection to the role, still improve its clarity but note limited relevance.
- Use legal tech industry language that an ATS system would recognize.`;

  const userPrompt = `Target Role: ${input.jobTitle} at ${input.company}

Job Signals:
${jobSignal}

Resume Bullets to Rewrite:
${input.bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Return a JSON object with exactly this shape:
{
  "bullets": [
    {
      "original": "the original bullet text",
      "rewritten": "the improved bullet text",
      "matchedKeywords": ["keyword1", "keyword2"],
      "improvementNote": "brief explanation of what changed and why"
    }
  ],
  "suggestedSkills": ["skill1", "skill2"],
  "overallTips": "1-2 sentences of general advice for tailoring resume to this role"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI");

  const parsed = JSON.parse(content) as RewriteOutput;

  if (!parsed.bullets || !Array.isArray(parsed.bullets)) {
    throw new Error("Invalid AI response format");
  }

  return parsed;
}
