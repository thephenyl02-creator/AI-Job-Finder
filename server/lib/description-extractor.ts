import { getOpenAIClient } from "./openai-client";
import type { StructuredDescription } from "@shared/schema";

export async function extractStructuredDescription(
  rawDescription: string,
  company: string,
  title: string
): Promise<StructuredDescription> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert job description analyzer for a legal technology careers platform. Your task is to extract and structure job descriptions into exactly 5 clean sections.

IMPORTANT RULES:
1. Extract ONLY factual information from the original description. Do not invent or add information that isn't present.
2. If a section's information is not explicitly stated, infer it from context clues in the description. For example, if no "minimum qualifications" heading exists, look for phrases like "you must have", "required:", "X+ years of experience", etc.
3. Keep each bullet point concise and clear - one requirement or responsibility per bullet.
4. Remove company benefits, perks, salary details, EEO statements, and application instructions - those don't belong in any section.
5. The "About the Company" section should be 2-4 sentences maximum.
6. "Skills Required" should be specific, named skills (tools, technologies, domains, certifications) - not generic traits like "good communicator".
7. If minimum vs preferred qualifications are hard to distinguish, put firm requirements (with "must", "required", years of experience) in minimum, and everything else in preferred.

Return valid JSON with this exact structure:
{
  "aboutCompany": "Brief 2-4 sentence company description relevant to this role",
  "responsibilities": ["responsibility 1", "responsibility 2", ...],
  "minimumQualifications": ["qualification 1", "qualification 2", ...],
  "preferredQualifications": ["qualification 1", "qualification 2", ...],
  "skillsRequired": ["skill 1", "skill 2", ...]
}`
      },
      {
        role: "user",
        content: `Extract the structured description for this job posting:

Company: ${company}
Title: ${title}

Raw Description:
${rawDescription.substring(0, 12000)}`
      }
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return buildFallbackStructure(rawDescription, company);
  }

  try {
    const parsed = JSON.parse(content);
    return {
      aboutCompany: parsed.aboutCompany || `${company} is a company in the legal technology space.`,
      responsibilities: ensureArray(parsed.responsibilities),
      minimumQualifications: ensureArray(parsed.minimumQualifications),
      preferredQualifications: ensureArray(parsed.preferredQualifications),
      skillsRequired: ensureArray(parsed.skillsRequired),
    };
  } catch {
    return buildFallbackStructure(rawDescription, company);
  }
}

function ensureArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return [];
}

function buildFallbackStructure(description: string, company: string): StructuredDescription {
  const lines = description.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const responsibilities: string[] = [];
  const qualifications: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("experience") || lower.includes("degree") || lower.includes("years") || lower.includes("required")) {
      qualifications.push(line.replace(/^[-•*]\s*/, ""));
    } else if (lower.includes("manage") || lower.includes("develop") || lower.includes("lead") || lower.includes("support") || lower.includes("design") || lower.includes("build")) {
      responsibilities.push(line.replace(/^[-•*]\s*/, ""));
    }
  }

  return {
    aboutCompany: `${company} is a company in the legal technology space.`,
    responsibilities: responsibilities.slice(0, 10),
    minimumQualifications: qualifications.slice(0, 8),
    preferredQualifications: [],
    skillsRequired: [],
  };
}
