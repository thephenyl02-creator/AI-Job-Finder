import OpenAI from "openai";
import { JOB_TAXONOMY } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface JobCategorizationResult {
  category: string;
  subcategory: string;
  seniorityLevel: string;
  keySkills: string[];
  aiSummary: string;
  matchKeywords: string[];
  experienceMin?: number;
  experienceMax?: number;
}

export async function categorizeJob(
  title: string,
  description: string,
  company: string
): Promise<JobCategorizationResult> {
  const prompt = `You are an expert at categorizing legal tech jobs.

Job Title: ${title}
Company: ${company}
Description: ${description.substring(0, 1500)}

Categorize this job into ONE of these categories and subcategories:

LEGAL AI JOBS:
- Legal AI Engineer
- NLP Engineer (Legal)
- Knowledge Engineer
- Legal Data Scientist
- AI Product Manager (Legal)
- Prompt Engineer (Legal AI)
- AI Researcher (Law + ML)

LEGAL TECH STARTUP ROLES:
- Product Manager (LegalTech)
- Solutions Engineer
- Legal Operations Manager
- Legal Tech Consultant
- Customer Success (Legal SaaS)
- Sales Engineer (LegalTech)
- Growth / Partnerships (LegalTech)

LAW FIRM TECH & INNOVATION:
- Legal Innovation Manager
- Practice Technology Lead
- Knowledge Management Lawyer
- Litigation Technology Specialist
- eDiscovery / Analytics Manager
- AI & Automation Counsel
- Research Technology Attorney

Also extract:
- Seniority level (Entry/Mid/Senior/Lead/Director/VP)
- Key skills (5-8 most important technical/domain skills)
- Experience range if mentioned
- Summary (3 sentences max, focus on: what you'll do, what they're looking for, what makes it interesting)
- Match keywords for search (5-10 relevant terms)

Return ONLY valid JSON:
{
  "category": "Legal AI Jobs",
  "subcategory": "Legal AI Engineer",
  "seniorityLevel": "Senior",
  "keySkills": ["Python", "NLP", "Legal Domain Knowledge"],
  "experienceMin": 5,
  "experienceMax": 8,
  "aiSummary": "Brief 3-sentence summary here.",
  "matchKeywords": ["ai", "machine learning", "legal", "nlp"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content);
    
    const validCategory = validateCategory(result.category);
    const validSubcategory = validateSubcategory(validCategory, result.subcategory);

    return {
      category: validCategory,
      subcategory: validSubcategory,
      seniorityLevel: result.seniorityLevel || inferSeniority(title),
      keySkills: Array.isArray(result.keySkills) ? result.keySkills.slice(0, 8) : [],
      aiSummary: result.aiSummary || `${title} position at ${company}.`,
      matchKeywords: Array.isArray(result.matchKeywords) ? result.matchKeywords.slice(0, 10) : [],
      experienceMin: result.experienceMin,
      experienceMax: result.experienceMax,
    };
  } catch (error) {
    console.error("AI categorization error:", error);
    return fallbackCategorization(title, description, company);
  }
}

function validateCategory(category: string): string {
  const validCategories = Object.keys(JOB_TAXONOMY);
  if (validCategories.includes(category)) {
    return category;
  }
  const categoryLower = category?.toLowerCase() || "";
  if (categoryLower.includes("ai")) return "Legal AI Jobs";
  if (categoryLower.includes("startup") || categoryLower.includes("tech")) return "Legal Tech Startup Roles";
  if (categoryLower.includes("firm") || categoryLower.includes("innovation")) return "Law Firm Tech & Innovation";
  return "Legal Tech Startup Roles";
}

function validateSubcategory(category: string, subcategory: string): string {
  const taxonomy = JOB_TAXONOMY[category as keyof typeof JOB_TAXONOMY];
  if (!taxonomy) return subcategory || "Other";
  
  const validSubs = taxonomy.subcategories as readonly string[];
  if (validSubs.includes(subcategory)) {
    return subcategory;
  }
  return validSubs[0] || subcategory || "Other";
}

function inferSeniority(title: string): string {
  const titleLower = title.toLowerCase();
  if (titleLower.includes("senior") || titleLower.includes("sr.") || titleLower.includes("sr ")) return "Senior";
  if (titleLower.includes("lead") || titleLower.includes("principal")) return "Lead";
  if (titleLower.includes("director")) return "Director";
  if (titleLower.includes("vp") || titleLower.includes("vice president")) return "VP";
  if (titleLower.includes("junior") || titleLower.includes("jr.") || titleLower.includes("jr ")) return "Entry";
  if (titleLower.includes("associate") || titleLower.includes("entry")) return "Entry";
  if (titleLower.includes("staff") || titleLower.includes("manager")) return "Senior";
  return "Mid";
}

function fallbackCategorization(
  title: string,
  description: string,
  company: string
): JobCategorizationResult {
  const text = `${title} ${description}`.toLowerCase();
  
  let category = "Legal Tech Startup Roles";
  let subcategory = "Other";
  const keySkills: string[] = [];
  const matchKeywords: string[] = [];

  if (text.includes("ai engineer") || text.includes("ml engineer") || text.includes("machine learning") || text.includes("nlp")) {
    category = "Legal AI Jobs";
    subcategory = "Legal AI Engineer";
    keySkills.push("AI", "Machine Learning", "Python");
    matchKeywords.push("ai", "ml", "machine learning", "nlp");
  } else if (text.includes("data scientist") || text.includes("data science")) {
    category = "Legal AI Jobs";
    subcategory = "Legal Data Scientist";
    keySkills.push("Data Science", "Python", "Statistics");
    matchKeywords.push("data", "analytics", "statistics");
  } else if (text.includes("product manager") || text.includes("pm")) {
    if (text.includes("ai")) {
      category = "Legal AI Jobs";
      subcategory = "AI Product Manager (Legal)";
    } else {
      category = "Legal Tech Startup Roles";
      subcategory = "Product Manager (LegalTech)";
    }
    keySkills.push("Product Management", "Strategy", "User Research");
    matchKeywords.push("product", "roadmap", "strategy");
  } else if (text.includes("solutions engineer") || text.includes("sales engineer")) {
    category = "Legal Tech Startup Roles";
    subcategory = text.includes("sales") ? "Sales Engineer (LegalTech)" : "Solutions Engineer";
    keySkills.push("Technical Sales", "Demo", "Integration");
    matchKeywords.push("solutions", "technical", "client");
  } else if (text.includes("customer success")) {
    category = "Legal Tech Startup Roles";
    subcategory = "Customer Success (Legal SaaS)";
    keySkills.push("Customer Success", "SaaS", "Relationship Management");
    matchKeywords.push("customer", "success", "retention");
  } else if (text.includes("innovation") || text.includes("practice technology")) {
    category = "Law Firm Tech & Innovation";
    subcategory = text.includes("innovation") ? "Legal Innovation Manager" : "Practice Technology Lead";
    keySkills.push("Innovation", "Legal Technology", "Change Management");
    matchKeywords.push("innovation", "law firm", "technology");
  } else if (text.includes("ediscovery") || text.includes("e-discovery") || text.includes("litigation support")) {
    category = "Law Firm Tech & Innovation";
    subcategory = "eDiscovery / Analytics Manager";
    keySkills.push("eDiscovery", "Litigation Support", "Relativity");
    matchKeywords.push("ediscovery", "litigation", "review");
  } else if (text.includes("engineer") || text.includes("developer")) {
    category = "Legal Tech Startup Roles";
    subcategory = "Solutions Engineer";
    keySkills.push("Software Engineering", "Development");
    matchKeywords.push("engineering", "development", "software");
  }

  const seniorityLevel = inferSeniority(title);

  return {
    category,
    subcategory,
    seniorityLevel,
    keySkills,
    aiSummary: `${title} position at ${company}. Review the full description for detailed requirements and responsibilities.`,
    matchKeywords,
  };
}

export async function generateJobSummary(
  title: string,
  description: string,
  company: string
): Promise<string> {
  try {
    const prompt = `Summarize this job posting in exactly 3 concise sentences.
Focus on: (1) What you'll do, (2) What they're looking for, (3) What makes it interesting.

Job: ${title} at ${company}
Description: ${description.substring(0, 1500)}

Return ONLY the 3-sentence summary, no extra text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 200,
    });

    return completion.choices[0].message.content?.trim() || `${title} position at ${company}.`;
  } catch (error) {
    console.error("Summary generation error:", error);
    return `${title} position at ${company}. Review the full description for details.`;
  }
}
