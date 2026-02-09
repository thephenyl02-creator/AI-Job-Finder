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
        content: `You are an expert job description analyzer for a legal technology careers platform. Your task is to extract and structure job descriptions into a uniform JSON format.

IMPORTANT RULES:
1. Extract ONLY factual information from the original description. Do not invent or add information that isn't present.
2. If a section's information is not explicitly stated, infer it from context clues in the description.
3. Keep each bullet point concise and clear - one requirement or responsibility per bullet.
4. Remove company benefits, perks, salary details, EEO statements, and application instructions.
5. The "aboutCompany" section should be 2-4 sentences maximum.
6. "skillsRequired" should be specific, named skills (tools, technologies, domains, certifications) - not generic traits like "good communicator". Use short keywords.
7. If minimum vs preferred qualifications are hard to distinguish, put firm requirements (with "must", "required", years of experience, bar/licensure, certifications) in minimum, and everything else ("preferred", "bonus", "plus", "nice to have") in preferred.
8. "responsibilities" items must start with action verbs.
9. "summary" should be a single sentence (max 350 chars) describing the role in plain language.
10. "lawyerTransitionNotes" should be 2-4 bullets in plain language explaining how a lawyer could transition into this role, or why it would be challenging.

Return ONLY valid JSON with this exact structure:
{
  "summary": "One-sentence plain-language summary of the role (max 350 chars)",
  "aboutCompany": "Brief 2-4 sentence company description",
  "responsibilities": ["Start with action verb 1", "Start with action verb 2", ...],
  "minimumQualifications": ["qualification 1", "qualification 2", ...],
  "preferredQualifications": ["qualification 1", "qualification 2", ...],
  "skillsRequired": ["short skill keyword 1", "short skill keyword 2", ...],
  "seniority": "Entry-Level | Mid-Level | Senior | Lead | Director | VP | C-Suite",
  "legalTechCategory": "Primary legal tech category (e.g., Contract Management, eDiscovery, Legal AI, Compliance Tech, Legal Analytics, Practice Management, IP Tech, RegTech, Access to Justice Tech, Legal Marketplace, Court Tech, General Legal Tech)",
  "aiRelevanceScore": "Low | Medium | High",
  "lawyerTransitionFriendly": true or false,
  "lawyerTransitionNotes": ["Note about transition feasibility 1", "Note 2", ...]
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
    max_tokens: 2500,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return buildFallbackStructure(rawDescription, company, title);
  }

  try {
    const parsed = JSON.parse(content);
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.substring(0, 350) : `${title} at ${company}`,
      aboutCompany: parsed.aboutCompany || `${company} is a company in the legal technology space.`,
      responsibilities: ensureArray(parsed.responsibilities),
      minimumQualifications: ensureArray(parsed.minimumQualifications),
      preferredQualifications: ensureArray(parsed.preferredQualifications),
      skillsRequired: ensureArray(parsed.skillsRequired),
      seniority: typeof parsed.seniority === "string" ? parsed.seniority : "",
      legalTechCategory: typeof parsed.legalTechCategory === "string" ? parsed.legalTechCategory : "",
      aiRelevanceScore: typeof parsed.aiRelevanceScore === "string" ? parsed.aiRelevanceScore : "",
      lawyerTransitionFriendly: typeof parsed.lawyerTransitionFriendly === "boolean" ? parsed.lawyerTransitionFriendly : false,
      lawyerTransitionNotes: ensureArray(parsed.lawyerTransitionNotes),
    };
  } catch {
    return buildFallbackStructure(rawDescription, company, title);
  }
}

export function validateStructuredDescription(sd: StructuredDescription): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!sd.summary || sd.summary.trim().length === 0) issues.push("Missing summary");
  if (sd.summary && sd.summary.length > 350) issues.push("Summary exceeds 350 characters");
  if (!sd.minimumQualifications || sd.minimumQualifications.length < 3) issues.push("Minimum qualifications needs at least 3 bullets");
  if (!sd.responsibilities || sd.responsibilities.length < 4) issues.push("Responsibilities needs at least 4 bullets");
  if (!sd.skillsRequired || sd.skillsRequired.length < 6) issues.push("Skills required needs at least 6 bullets");
  if (!sd.seniority) issues.push("Missing seniority level");
  if (!sd.legalTechCategory) issues.push("Missing legal tech category");
  return { valid: issues.length === 0, issues };
}

function ensureArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return [];
}

function buildFallbackStructure(description: string, company: string, title: string): StructuredDescription {
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
    summary: `${title} at ${company}`,
    aboutCompany: `${company} is a company in the legal technology space.`,
    responsibilities: responsibilities.slice(0, 10),
    minimumQualifications: qualifications.slice(0, 8),
    preferredQualifications: [],
    skillsRequired: [],
    seniority: "",
    legalTechCategory: "",
    aiRelevanceScore: "",
    lawyerTransitionFriendly: false,
    lawyerTransitionNotes: [],
  };
}
