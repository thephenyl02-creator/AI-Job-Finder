import { getOpenAIClient } from "./openai-client";
import type { StructuredDescription } from "@shared/schema";
import type { ResumeExtractedData } from "@shared/models/auth";

export interface StrategyInput {
  jobId: number;
  jobTitle: string;
  company: string;
  structuredDescription: StructuredDescription;
  resumeData: ResumeExtractedData;
}

export interface StrategyOutput {
  topStrengths: string[];
  keyGaps: string[];
  reorderSuggestions: string[];
  emphasisSuggestions: string[];
  addSpecificityPrompts: string[];
  risks: string[];
  nextBestRoleIfNotFit?: string;
}

function getJobSignal(sd: StructuredDescription): string {
  const parts: string[] = [];
  if (sd.summary) parts.push(`Role Summary: ${sd.summary}`);
  if (sd.responsibilities?.length)
    parts.push(`Key Responsibilities: ${sd.responsibilities.slice(0, 8).join("; ")}`);
  if (sd.skillsRequired?.length)
    parts.push(`Required Skills: ${sd.skillsRequired.join(", ")}`);
  if (sd.minimumQualifications?.length)
    parts.push(`Minimum Qualifications: ${sd.minimumQualifications.slice(0, 6).join("; ")}`);
  if (sd.preferredQualifications?.length)
    parts.push(`Preferred Qualifications: ${sd.preferredQualifications.slice(0, 4).join("; ")}`);
  if (sd.seniority) parts.push(`Seniority: ${sd.seniority}`);
  if (sd.legalTechCategory) parts.push(`Category: ${sd.legalTechCategory}`);
  return parts.join("\n");
}

function getResumeSignal(r: ResumeExtractedData): string {
  const parts: string[] = [];
  if (r.summary) parts.push(`Summary: ${r.summary}`);
  if (r.experience?.length) {
    const expLines = r.experience.slice(0, 6).map(
      (e) => `- ${e.title} at ${e.company} (${e.duration}): ${e.description.slice(0, 200)}`
    );
    parts.push(`Experience:\n${expLines.join("\n")}`);
  }
  if (r.skills?.length)
    parts.push(`Skills: ${r.skills.join(", ")}`);
  if (r.education?.length) {
    const eduLines = r.education.map((e) => `- ${e.degree}, ${e.institution} (${e.year})`);
    parts.push(`Education:\n${eduLines.join("\n")}`);
  }
  if (r.totalYearsExperience)
    parts.push(`Total Years Experience: ${r.totalYearsExperience}`);
  return parts.join("\n\n");
}

export async function computeStrategy(input: StrategyInput): Promise<StrategyOutput> {
  const openai = getOpenAIClient();
  const jobSignal = getJobSignal(input.structuredDescription);
  const resumeSignal = getResumeSignal(input.resumeData);

  const systemPrompt = `You are an alignment strategist for legal professionals transitioning into legal technology roles. Your job is to analyze a candidate's resume against a specific job posting and provide structured, actionable positioning recommendations.

Rules:
- Never suggest adding experience the candidate does not have.
- Focus on repositioning, reordering, emphasizing, and adding specificity to existing experience.
- NEVER produce rewritten bullet text. Only describe what to change, not how the text should read.
- Be lawyer-professional and concise. Each suggestion should be 1-2 sentences max.
- Tailor advice specifically to the legal-tech industry transition.
- If the candidate is already well-aligned, say so—don't manufacture gaps.
- Include credibility risks: warn about claims the candidate should NOT make unless genuinely true.
- If the candidate appears to be a poor fit, provide one alternative role suggestion.`;

  const userPrompt = `Target Role: ${input.jobTitle} at ${input.company}

Job Signals:
${jobSignal}

Candidate Resume:
${resumeSignal}

Analyze the candidate's fit for this role and return a JSON object with exactly this shape:
{
  "topStrengths": ["3-6 specific strengths the candidate brings to this role"],
  "keyGaps": ["3-6 areas where the candidate's resume doesn't clearly address job requirements"],
  "reorderSuggestions": ["2-4 suggestions about what to move up/down in the resume for this specific role"],
  "emphasisSuggestions": ["3-6 themes or areas to highlight more prominently"],
  "addSpecificityPrompts": ["3-5 prompts asking the candidate to add specific details they may have omitted"],
  "risks": ["2-3 credibility warnings about claims the candidate should NOT make unless genuinely true"],
  "nextBestRoleIfNotFit": "One sentence suggesting an alternative role type if this one is a poor fit, or null if the candidate is a reasonable fit"
}

Examples of good suggestions:
- reorderSuggestions: "Move contract lifecycle / agreements work above litigation details for this role."
- emphasisSuggestions: "Emphasize cross-functional stakeholder coordination and implementation exposure."
- addSpecificityPrompts: "Add specificity: type of agreements, stakeholders, and scope of coordination."
- addSpecificityPrompts: "If you have any tools exposure (Salesforce, Gainsight), add it—only if true."
- risks: "Don't claim hands-on CLM implementation experience unless you directly configured a CLM platform."
- risks: "Avoid overstating 'data analytics' unless you've worked with dashboards, SQL, or reporting tools."`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
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

  const parsed = JSON.parse(content) as StrategyOutput;

  if (!parsed.topStrengths || !Array.isArray(parsed.topStrengths)) {
    throw new Error("Invalid AI response format");
  }

  return {
    topStrengths: parsed.topStrengths || [],
    keyGaps: parsed.keyGaps || [],
    reorderSuggestions: parsed.reorderSuggestions || [],
    emphasisSuggestions: parsed.emphasisSuggestions || [],
    addSpecificityPrompts: parsed.addSpecificityPrompts || [],
    risks: parsed.risks || [],
    nextBestRoleIfNotFit: parsed.nextBestRoleIfNotFit || undefined,
  };
}
