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
        content: `You are an expert job description analyst for a premium legal technology careers platform. Your task is to produce thorough, uniform structured descriptions that give candidates a complete picture of each role.

QUALITY STANDARDS — every section must be substantive:

1. "summary" — A detailed 2-3 sentence summary (max 500 chars) that describes what this role does concretely. Mention the specific product, team, or practice area. NEVER use vague phrases like "leverage expertise" or "innovative solutions". Be specific and factual.

2. "aboutCompany" — 3-4 informative sentences about the company. Include: what the company does (specific products/services), who their customers are, company size or stage if mentioned, and what differentiates them. If the posting doesn't say much about the company, use what's available but keep it factual.

3. "responsibilities" — Extract 6-10 specific responsibilities. Each MUST start with an action verb. Be detailed enough that a candidate understands the day-to-day work. Avoid generic bullets like "work with cross-functional teams" unless the description specifies which teams and why. If the posting lists fewer responsibilities, infer reasonable ones from context but mark nothing as invented.

4. "minimumQualifications" — Extract 4-8 firm requirements. Include years of experience, degrees, bar admission, certifications, and required technical skills with "must have" or "required" language. Each bullet should be a clear, testable requirement.

5. "preferredQualifications" — Extract 3-6 nice-to-have qualifications. Include "preferred", "bonus", "plus" items. If none are explicitly stated, separate softer requirements from minimumQualifications.

6. "skillsRequired" — List 6-12 specific, named skills as short keywords. Include tools (e.g., "Relativity", "iManage"), technologies (e.g., "Python", "SQL"), domains (e.g., "eDiscovery", "contract lifecycle management"), and certifications (e.g., "CIPP", "PMP"). NO generic traits.

7. "lawyerTransitionNotes" — 3-5 detailed bullets aimed at lawyers considering this role. Address: (a) which legal skills transfer directly, (b) what new skills they'd need to develop, (c) realistic assessment of the transition difficulty, (d) how JD/bar admission helps or doesn't. Be honest and specific, not promotional.

8. "seniority" — One of: Entry-Level | Mid-Level | Senior | Lead | Director | VP | C-Suite
9. "legalTechCategory" — Primary legal tech category (Contract Management, eDiscovery, Legal AI, Compliance Tech, Legal Analytics, Practice Management, IP Tech, RegTech, Access to Justice Tech, Legal Marketplace, Court Tech, General Legal Tech)
10. "aiRelevanceScore" — Low | Medium | High
11. "lawyerTransitionFriendly" — true or false

QUALITY RULES:
- Extract ONLY factual information. Do not invent details not present in the description.
- Remove benefits, perks, salary details, EEO statements, and application instructions.
- Every section should feel thorough and informative — shallow output is unacceptable.
- The goal is that a candidate reading this structured description gets a COMPLETE understanding of the role without needing to read the raw posting.

Return ONLY valid JSON with this exact structure:
{
  "summary": "Detailed 2-3 sentence summary (max 500 chars)",
  "aboutCompany": "3-4 informative sentences about the company",
  "responsibilities": ["Action verb responsibility 1", ...],
  "minimumQualifications": ["Firm requirement 1", ...],
  "preferredQualifications": ["Nice-to-have 1", ...],
  "skillsRequired": ["Specific skill keyword 1", ...],
  "seniority": "Level",
  "legalTechCategory": "Category",
  "aiRelevanceScore": "Low | Medium | High",
  "lawyerTransitionFriendly": true/false,
  "lawyerTransitionNotes": ["Detailed transition note 1", ...]
}`
      },
      {
        role: "user",
        content: `Extract the structured description for this job posting:

Company: ${company}
Title: ${title}

Raw Description:
${rawDescription.substring(0, 14000)}`
      }
    ],
    response_format: { type: "json_object" },
    max_tokens: 3500,
    temperature: 0.15,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return buildFallbackStructure(rawDescription, company, title);
  }

  try {
    const parsed = JSON.parse(content);
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.substring(0, 500) : `${title} at ${company}`,
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
  if (sd.summary && sd.summary.length > 500) issues.push("Summary exceeds 500 characters");
  if (!sd.aboutCompany || sd.aboutCompany.trim().length === 0) issues.push("Missing about company");
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
