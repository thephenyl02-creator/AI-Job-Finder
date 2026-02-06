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
  const taxonomyText = Object.entries(JOB_TAXONOMY)
    .map(([cat, data]) => `${cat}:\n${data.subcategories.map(s => `  - ${s}`).join('\n')}`)
    .join('\n\n');

  const prompt = `You are an expert at categorizing legal tech jobs for attorneys and legal professionals interested in AI.

Job Title: ${title}
Company: ${company}
Description: ${description.substring(0, 1500)}

Categorize this job into ONE of these categories and subcategories:

${taxonomyText}

CATEGORIZATION GUIDANCE:
- "Legal AI & Machine Learning": For AI/ML engineers, data scientists, NLP specialists, AI product managers
- "Legal Product & Innovation": For product managers, innovation leaders, UX designers, digital transformation
- "Legal Knowledge Engineering": For knowledge managers, research engineers, taxonomy/ontology specialists
- "Legal Operations": For legal ops managers, process improvement, vendor management, implementations
- "Contract Technology": For CLM specialists, contract automation, smart contracts, transaction tech
- "Compliance & RegTech": For regulatory tech, compliance automation, privacy, AML/KYC
- "Litigation & eDiscovery": For eDiscovery, litigation support, trial analytics, case strategy
- "Legal Consulting & Strategy": For consultants, advisors, AI governance, strategy roles
- "Legal Education & Training": For learning technology, curriculum design, training
- "Legal Publishing & Content": For editorial tech, content platforms, publishing systems
- "Courts & Public Legal Systems": For court tech, access to justice, government legal tech
- "Legal Research & Academia": For academic researchers, computational law scientists
- "Emerging LegalTech Roles": For new/cutting-edge roles like AI auditors, safety specialists

Also extract:
- Seniority level (Intern/Fellowship/Entry/Mid/Senior/Lead/Director/VP)
- Key skills (5-8 most important technical/domain skills)
- Experience range if mentioned
- Summary (3 sentences max, focus on: what you'll do, what they're looking for, what makes it interesting)
- Match keywords for search (5-10 relevant terms)

Return ONLY valid JSON:
{
  "category": "Legal AI & Machine Learning",
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
  if (categoryLower.includes("ai") || categoryLower.includes("machine learning") || categoryLower.includes("ml")) return "Legal AI & Machine Learning";
  if (categoryLower.includes("product") || categoryLower.includes("innovation")) return "Legal Product & Innovation";
  if (categoryLower.includes("knowledge") || categoryLower.includes("research")) return "Legal Knowledge Engineering";
  if (categoryLower.includes("operations") || categoryLower.includes("ops")) return "Legal Operations";
  if (categoryLower.includes("contract") || categoryLower.includes("clm")) return "Contract Technology";
  if (categoryLower.includes("compliance") || categoryLower.includes("regtech") || categoryLower.includes("regulatory")) return "Compliance & RegTech";
  if (categoryLower.includes("litigation") || categoryLower.includes("ediscovery") || categoryLower.includes("discovery")) return "Litigation & eDiscovery";
  if (categoryLower.includes("consult") || categoryLower.includes("strategy")) return "Legal Consulting & Strategy";
  if (categoryLower.includes("education") || categoryLower.includes("training")) return "Legal Education & Training";
  if (categoryLower.includes("publish") || categoryLower.includes("content")) return "Legal Publishing & Content";
  if (categoryLower.includes("court") || categoryLower.includes("government") || categoryLower.includes("justice")) return "Courts & Public Legal Systems";
  if (categoryLower.includes("academic") || categoryLower.includes("research")) return "Legal Research & Academia";
  if (categoryLower.includes("emerging") || categoryLower.includes("new")) return "Emerging LegalTech Roles";
  return "Legal AI & Machine Learning";
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
  if (titleLower.includes("intern") || titleLower.includes("internship")) return "Intern";
  if (titleLower.includes("fellow") || titleLower.includes("fellowship")) return "Fellowship";
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
  
  let category = "Legal AI & Machine Learning";
  let subcategory = "Legal AI Engineer";
  const keySkills: string[] = [];
  const matchKeywords: string[] = [];

  if (text.includes("ai engineer") || text.includes("ml engineer") || text.includes("machine learning") || text.includes("nlp")) {
    category = "Legal AI & Machine Learning";
    subcategory = "Legal AI Engineer";
    keySkills.push("AI", "Machine Learning", "Python");
    matchKeywords.push("ai", "ml", "machine learning", "nlp");
  } else if (text.includes("data scientist") || text.includes("data science")) {
    category = "Legal AI & Machine Learning";
    subcategory = "Legal Data Scientist";
    keySkills.push("Data Science", "Python", "Statistics");
    matchKeywords.push("data", "analytics", "statistics");
  } else if (text.includes("product manager") || text.includes("pm")) {
    if (text.includes("ai")) {
      category = "Legal AI & Machine Learning";
      subcategory = "AI Product Manager";
    } else {
      category = "Legal Product & Innovation";
      subcategory = "Legal Product Manager";
    }
    keySkills.push("Product Management", "Strategy", "User Research");
    matchKeywords.push("product", "roadmap", "strategy");
  } else if (text.includes("legal ops") || text.includes("legal operations")) {
    category = "Legal Operations";
    subcategory = "Legal Operations Manager";
    keySkills.push("Legal Operations", "Process Improvement", "Vendor Management");
    matchKeywords.push("legal ops", "operations", "efficiency");
  } else if (text.includes("contract") || text.includes("clm")) {
    category = "Contract Technology";
    subcategory = "Contract Automation Specialist";
    keySkills.push("CLM", "Contract Management", "Automation");
    matchKeywords.push("contract", "clm", "automation");
  } else if (text.includes("compliance") || text.includes("regulatory") || text.includes("regtech")) {
    category = "Compliance & RegTech";
    subcategory = "Compliance Technology Counsel";
    keySkills.push("Compliance", "Regulatory", "Risk Management");
    matchKeywords.push("compliance", "regulatory", "risk");
  } else if (text.includes("ediscovery") || text.includes("e-discovery") || text.includes("litigation")) {
    category = "Litigation & eDiscovery";
    subcategory = "eDiscovery Counsel";
    keySkills.push("eDiscovery", "Litigation Support", "Relativity");
    matchKeywords.push("ediscovery", "litigation", "review");
  } else if (text.includes("consult")) {
    category = "Legal Consulting & Strategy";
    subcategory = "LegalTech Consultant";
    keySkills.push("Consulting", "Strategy", "Implementation");
    matchKeywords.push("consulting", "advisory", "strategy");
  } else if (text.includes("knowledge") || text.includes("taxonomy")) {
    category = "Legal Knowledge Engineering";
    subcategory = "Legal Knowledge Manager";
    keySkills.push("Knowledge Management", "Taxonomy", "Information Architecture");
    matchKeywords.push("knowledge", "taxonomy", "information");
  } else if (text.includes("innovation") || text.includes("transformation")) {
    category = "Legal Product & Innovation";
    subcategory = "Head of Legal Innovation";
    keySkills.push("Innovation", "Digital Transformation", "Change Management");
    matchKeywords.push("innovation", "transformation", "strategy");
  } else if (text.includes("engineer") || text.includes("developer")) {
    category = "Legal AI & Machine Learning";
    subcategory = "Legal AI Engineer";
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
