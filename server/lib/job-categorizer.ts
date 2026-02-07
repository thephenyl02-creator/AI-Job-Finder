import { JOB_TAXONOMY } from "@shared/schema";
import { getOpenAIClient } from "./openai-client";

export interface JobCategorizationResult {
  category: string;
  subcategory: string;
  seniorityLevel: string;
  keySkills: string[];
  aiSummary: string;
  matchKeywords: string[];
  aiResponsibilities?: string[];
  aiQualifications?: string[];
  aiNiceToHaves?: string[];
  experienceMin?: number;
  experienceMax?: number;
  isRemote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  employmentType?: string;
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
- Seniority level: MUST be exactly one of: Intern, Fellowship, Entry, Mid, Senior, Lead, Director, VP
  SENIORITY RULES (follow in strict priority order):
  1. Title contains "Intern", "Internship", "Co-op", "Summer Program" → "Intern"
  2. Title contains "Fellow" or "Fellowship" → "Fellowship"
  3. Title contains "VP" or "Vice President" → "VP"
  4. Title contains "Director" (including "Deputy Director") → "Director"
  5. Title contains "Lead", "Principal" → "Lead"
  6. Title contains "Senior", "Sr.", "Staff" → "Senior"
  7. Title contains "Associate" (without Senior/Director/Lead/VP) → "Entry"
  8. Title contains "Junior", "Jr.", "Entry" → "Entry"
  9. If title has NO seniority indicator: look at the description for experience requirements:
     - No experience mentioned or 0-2 years → "Entry"
     - 2-5 years → "Mid"
     - 5+ years → "Senior"
  10. If truly ambiguous with no clues → "Mid"
  - NEVER combine levels (e.g. never return "Senior/Lead" — pick the single best match)
- Key skills (5-8 most important technical/domain skills)
- Experience range: set experienceMin and experienceMax if the posting mentions years of experience. If NOT mentioned, set BOTH to null — do NOT guess or invent experience numbers.
- Salary: Extract salary/compensation if mentioned. Convert to annual USD amounts. Handle formats like "$120K-$150K", "$120,000 - $150,000/year", "$55/hr". If hourly, multiply by 2080 for annual. Set salaryMin and salaryMax. If only one number, set both to that number. If NOT mentioned, set both to null.
- Remote: Set isRemote to true if the job is remote, hybrid-remote, or remote-first. Look for "remote", "work from home", "distributed", "hybrid" in both the title AND description. If not mentioned, set to false.
- Employment type: Set employmentType to one of: "full-time", "part-time", "contract", "temporary", "internship". Default to "full-time" if not specified.
- Summary (3 sentences max, focus on: what you'll do, what they're looking for, what makes it interesting)
- Match keywords for search (5-10 relevant terms)
- aiResponsibilities: Extract 4-8 bullet points describing what the person will actually DO in this role. Focus on concrete activities, not vague corporate speak. Strip boilerplate. Each bullet should be one clear sentence. If description is too short, set to null.
- aiQualifications: Extract 4-8 REQUIRED qualifications (must-haves). Include years of experience, degrees, certifications, specific tools/skills they explicitly require. Each bullet should be one clear sentence. If description is too short, set to null.
- aiNiceToHaves: Extract 2-5 PREFERRED/nice-to-have qualifications. These are things they say "preferred", "bonus", "a plus", "ideally", etc. If none mentioned, set to null.

Return ONLY valid JSON:
{
  "category": "Legal AI & Machine Learning",
  "subcategory": "Legal AI Engineer",
  "seniorityLevel": "Senior",
  "keySkills": ["Python", "NLP", "Legal Domain Knowledge"],
  "experienceMin": 5,
  "experienceMax": 8,
  "salaryMin": 120000,
  "salaryMax": 150000,
  "isRemote": false,
  "employmentType": "full-time",
  "aiSummary": "Brief 3-sentence summary here.",
  "matchKeywords": ["ai", "machine learning", "legal", "nlp"],
  "aiResponsibilities": ["Build NLP models for contract analysis", "Lead technical architecture for legal AI products"],
  "aiQualifications": ["5+ years Python experience", "Experience with NLP/LLM frameworks", "JD or legal domain knowledge preferred"],
  "aiNiceToHaves": ["Experience in legal tech industry", "Published research in NLP"]
}

CRITICAL RULES:
- experienceMin/experienceMax: MUST be null if NOT explicitly stated. Do not guess.
- salaryMin/salaryMax: MUST be null if NOT explicitly stated. Convert all amounts to annual USD.
- isRemote: Check BOTH title and description for remote indicators.
- aiResponsibilities/aiQualifications/aiNiceToHaves: Extract from the actual posting. Be specific and concise. Strip corporate fluff. Set to null if description is too short to extract meaningful data.
- If the description is very short or empty, rely more heavily on the title for categorization.`;

  try {
    const completion = await getOpenAIClient().chat.completions.create({
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

    const aiSeniority = result.seniorityLevel || "Mid";
    const validatedSeniority = validateSeniority(aiSeniority, title, description);

    return {
      category: validCategory,
      subcategory: validSubcategory,
      seniorityLevel: validatedSeniority,
      keySkills: Array.isArray(result.keySkills) ? result.keySkills.slice(0, 8) : [],
      aiSummary: result.aiSummary || `${title} position at ${company}.`,
      matchKeywords: Array.isArray(result.matchKeywords) ? result.matchKeywords.slice(0, 10) : [],
      aiResponsibilities: Array.isArray(result.aiResponsibilities) ? result.aiResponsibilities.slice(0, 8) : undefined,
      aiQualifications: Array.isArray(result.aiQualifications) ? result.aiQualifications.slice(0, 8) : undefined,
      aiNiceToHaves: Array.isArray(result.aiNiceToHaves) ? result.aiNiceToHaves.slice(0, 5) : undefined,
      experienceMin: typeof result.experienceMin === "number" ? result.experienceMin : undefined,
      experienceMax: typeof result.experienceMax === "number" ? result.experienceMax : undefined,
      isRemote: result.isRemote === true || detectRemote(title, description),
      salaryMin: typeof result.salaryMin === "number" && result.salaryMin > 0 ? result.salaryMin : undefined,
      salaryMax: typeof result.salaryMax === "number" && result.salaryMax > 0 ? result.salaryMax : undefined,
      employmentType: result.employmentType || "full-time",
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

function detectRemote(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  const negativePatterns = /\bnot remote\b|\bon[- ]?site only\b|\bin[- ]?office only\b|\bno remote\b/;
  if (negativePatterns.test(text)) return false;
  return /\bremote\b/.test(text) || 
    /\bwork from home\b/.test(text) || 
    /\bremote[- ]first\b/.test(text) ||
    /\bfully remote\b/.test(text) ||
    /\bhybrid\b/.test(text) ||
    /\bwfh\b/.test(text);
}

export function parseSalaryFromText(text: string): { min: number | undefined; max: number | undefined } {
  const isHourly = /\/\s*h(ou)?r|per\s*hour/i.test(text);

  const hourlyRange = text.match(/\$\s*([\d,.]+)\s*[-–—to]+\s*\$?\s*([\d,.]+)\s*(?:\/\s*h(?:ou)?r|per\s*hour)/i);
  if (hourlyRange) {
    const min = Math.round(parseFloat(hourlyRange[1].replace(/,/g, '')) * 2080);
    const max = Math.round(parseFloat(hourlyRange[2].replace(/,/g, '')) * 2080);
    if (min >= 20000 && max <= 1000000) return { min, max: max >= min ? max : min };
  }

  const hourlySingle = text.match(/\$\s*([\d,.]+)\s*(?:\/\s*h(?:ou)?r|per\s*hour)/i);
  if (hourlySingle) {
    const val = Math.round(parseFloat(hourlySingle[1].replace(/,/g, '')) * 2080);
    if (val >= 20000 && val <= 1000000) return { min: val, max: val };
  }

  const kRange = text.match(/\$\s*([\d,.]+)\s*[kK]\s*[-–—to]+\s*\$?\s*([\d,.]+)\s*[kK]/);
  if (kRange) {
    const min = parseFloat(kRange[1].replace(/,/g, '')) * 1000;
    const max = parseFloat(kRange[2].replace(/,/g, '')) * 1000;
    if (min >= 20000 && max <= 1000000) return { min, max: max >= min ? max : min };
  }

  const annualRange = text.match(/\$\s*([\d,]+(?:\.\d+)?)\s*[-–—to]+\s*\$?\s*([\d,]+(?:\.\d+)?)/);
  if (annualRange && !isHourly) {
    let min = parseFloat(annualRange[1].replace(/,/g, ''));
    let max = parseFloat(annualRange[2].replace(/,/g, ''));
    if (min < 1000) min *= 1000;
    if (max < 1000) max *= 1000;
    if (min >= 20000 && max <= 1000000) return { min, max: max >= min ? max : min };
  }

  const kSingle = text.match(/\$\s*([\d,.]+)\s*[kK]\b/);
  if (kSingle) {
    const val = parseFloat(kSingle[1].replace(/,/g, '')) * 1000;
    if (val >= 20000 && val <= 1000000) return { min: val, max: val };
  }

  const annualSingle = text.match(/\$\s*([\d,]+(?:\.\d+)?)/);
  if (annualSingle && !isHourly) {
    let val = parseFloat(annualSingle[1].replace(/,/g, ''));
    if (val < 1000) val *= 1000;
    if (val >= 20000 && val <= 1000000) return { min: val, max: val };
  }

  return { min: undefined, max: undefined };
}

const VALID_SENIORITY_LEVELS = ["Intern", "Fellowship", "Entry", "Mid", "Senior", "Lead", "Director", "VP"];

function validateSeniority(aiSeniority: string, title: string, description?: string): string {
  if (!VALID_SENIORITY_LEVELS.includes(aiSeniority)) {
    return inferSeniority(title, description);
  }

  const titleLower = title.toLowerCase();
  const titleInferred = inferSeniority(title, description);

  if (titleInferred === "Intern" || titleInferred === "Fellowship") {
    return titleInferred;
  }

  const hasDirector = titleLower.includes("director");
  const hasVP = titleLower.includes("vp") || titleLower.includes("vice president");
  const hasLead = titleLower.includes("lead") || titleLower.includes("principal");
  const hasSenior = titleLower.includes("senior") || titleLower.includes("sr.") || titleLower.includes("sr ") || titleLower.includes("staff");
  const hasAssociate = titleLower.includes("associate") && !hasSenior && !hasDirector && !hasVP && !hasLead;
  const hasJunior = titleLower.includes("junior") || titleLower.includes("jr.") || titleLower.includes("jr ");
  const hasEntry = titleLower.includes("entry");

  if (hasVP) return "VP";
  if (hasDirector) return "Director";
  if (hasLead) return "Lead";
  if (hasSenior) return "Senior";

  if (aiSeniority === "Mid" && (hasAssociate || hasJunior || hasEntry)) {
    return "Entry";
  }

  return aiSeniority;
}

function inferSeniority(title: string, description?: string): string {
  const titleLower = title.toLowerCase();
  const descLower = (description || "").toLowerCase();

  if (titleLower.includes("intern") || titleLower.includes("internship") || titleLower.includes("co-op") || titleLower.includes("summer program")) return "Intern";
  if (titleLower.includes("fellow") || titleLower.includes("fellowship")) return "Fellowship";
  if (descLower.includes("current student") || descLower.includes("enrolled in") || descLower.includes("pursuing a degree")) return "Intern";
  if (descLower.includes("fellowship program") || descLower.includes("rotational program")) return "Fellowship";

  if (titleLower.includes("vp") || titleLower.includes("vice president")) return "VP";
  if (titleLower.includes("director")) return "Director";
  if (titleLower.includes("lead") || titleLower.includes("principal")) return "Lead";
  if (titleLower.includes("senior") || titleLower.includes("sr.") || titleLower.includes("sr ") || titleLower.includes("staff")) return "Senior";

  if (titleLower.includes("junior") || titleLower.includes("jr.") || titleLower.includes("jr ")) return "Entry";
  if (titleLower.includes("associate") || titleLower.includes("entry")) return "Entry";

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

  const seniorityLevel = inferSeniority(title, description);
  const salary = parseSalaryFromText(`${title} ${description}`);

  return {
    category,
    subcategory,
    seniorityLevel,
    keySkills,
    aiSummary: `${title} position at ${company}. Review the full description for detailed requirements and responsibilities.`,
    matchKeywords,
    isRemote: detectRemote(title, description),
    salaryMin: salary.min,
    salaryMax: salary.max,
    employmentType: "full-time",
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

    const completion = await getOpenAIClient().chat.completions.create({
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
