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
  legalRelevanceScore?: number;
  reviewStatus?: string;
}

export async function categorizeJob(
  title: string,
  description: string,
  company: string
): Promise<JobCategorizationResult> {
  const taxonomyText = Object.entries(JOB_TAXONOMY)
    .map(([cat, data]) => `${cat}:\n${data.subcategories.map(s => `  - ${s}`).join('\n')}`)
    .join('\n\n');

  const prompt = `You are a strict gatekeeper for "Legal Tech Careers" — a platform EXCLUSIVELY for lawyers and paralegals seeking careers in legal technology.

YOUR AUDIENCE: Practicing lawyers, law graduates, and paralegals who want to transition into or advance within legal tech. Every job shown must be one they would credibly pursue.

Job Title: ${title}
Company: ${company}
Description: ${description.substring(0, 2000)}

=== STEP 1: LEGAL RELEVANCE SCORING (1-10) — BE RUTHLESSLY STRICT ===

Ask yourself: "Would a lawyer or paralegal want this job? Does it require or meaningfully benefit from legal training?"

SCORE 9-10: Legal knowledge is REQUIRED. The role cannot be performed without legal expertise.
Examples: Legal Engineer, Product Counsel, Privacy Attorney, eDiscovery Counsel, Compliance Counsel, Legal Operations Manager, Contracts Counsel, Legal Director, Staff Attorney, Trademark Attorney, Immigration Attorney, ISDA Negotiator.

SCORE 7-8: Legal knowledge is STRONGLY PREFERRED. The work directly involves legal processes, legal data, or serving legal professionals.
Examples: Legal Product Manager, Contract Automation Specialist, Legal Solutions Director, Legal AI Product Manager, CLM Implementation Specialist, Engagement Manager at a legal tech company (if they work directly with lawyers on legal workflows), GRC Analyst.

SCORE 5-6: Legal domain knowledge is USEFUL. The role is at a legal tech company and understanding legal concepts helps, but a non-lawyer could also do it.
Examples: Product Manager at a legal tech company (generic product role), Legal Content Strategist, Professional Services at a legal tech vendor.

SCORE 3-4: GENERIC BUSINESS/TECH ROLE at a legal tech company. Legal knowledge provides minimal advantage. These should NOT be published.
Examples: Account Executive, Sales Engineer, Marketing Manager, Software Engineer (generic), Customer Success Manager (generic), HR, Finance, Billing, GTM, Revenue Ops, Data Migration Engineer, Technical Support.

SCORE 1-2: No legal connection whatsoever.

HARD REJECT LIST — If the title matches any of these patterns, score 1-3 regardless of company:
Account Executive, SDR, BDR, Sales Representative, Sales Engineer, Sales Enablement, GTM Manager, Marketing Manager, Content Marketing, Demand Generation, Billing Analyst, Finance Manager, HR Manager, Recruiter, Talent Acquisition, Revenue Operations, Deal Desk, Proposal Specialist, Technical Support Engineer, Customer Support Representative, Data Migration Engineer, DevOps, SRE, Backend Engineer (generic), Frontend Engineer (generic), UI/UX Designer (generic), Technical Account Manager, Chief of Staff, Executive Assistant, Office Manager.

=== STEP 2: CATEGORIZATION ===

Categorize into ONE of these categories and subcategories:

${taxonomyText}

CATEGORIZATION GUIDANCE:
- "Legal Engineering": For Legal Engineers who build/configure legal tech products using legal expertise. The role title typically contains "Legal Engineer" or involves designing legal workflows/automation.
- "Legal Operations": For legal ops managers, legal project managers, process improvement, legal spend management, legal vendor management, legal tech implementation.
- "Compliance & Privacy": For compliance counsel, privacy counsel, GRC analysts, trade compliance, regulatory tech roles, data privacy officers.
- "Contract Management": For contracts counsel, contracts managers, CLM specialists, contract analysts, ISDA negotiators, deal specialists working with legal agreements.
- "Litigation & eDiscovery": For eDiscovery project managers, litigation tech specialists, appellate specialists, case management, litigation analytics.
- "Legal AI & Analytics": For AI product managers focused on legal AI, AI solutions engineers with legal domain, legal data scientists, AI safety counsel.
- "Legal Product Management": For product managers/directors/leads at legal tech companies where the role requires understanding legal workflows and legal user needs.
- "In-House Counsel": For attorneys, counsel, legal directors, staff attorneys working at legal tech or tech companies. These are practicing lawyers IN tech companies.
- "Legal Consulting & Advisory": For consultants helping firms adopt legal tech, legal strategy advisors, legal innovation consultants, client-facing advisory roles requiring legal expertise.
- "Knowledge Management": For legal knowledge managers, knowledge counsel, legal research engineers, legal taxonomy/ontology specialists, editorial managers in legal publishing.
- "Policy & Access to Justice": For legal policy advisors, court tech advisors, access to justice roles, digital justice, legal aid technology.
- "Intellectual Property & Innovation": For trademark attorneys, IP specialists, patent technology, IP legal specialists working at the intersection of IP law and technology.
- "Legal Sales & Client Solutions": ONLY for business development roles that EXPLICITLY require a JD, legal background, or deep legal expertise. Generic sales roles at legal tech companies do NOT qualify. Examples: Engagement Manager who designs legal workflows for clients, Legal Solutions Consultant.

=== STEP 3: EXTRACTION ===

Extract:
- Seniority level: Exactly one of: Intern, Fellowship, Entry, Mid, Senior, Lead, Director, VP
  Priority rules: Intern/Fellowship from title → VP → Director → Lead/Principal → Senior/Sr./Staff → Associate/Junior/Entry → check description for years → default Mid
- Key skills (5-8 most important)
- Experience range: experienceMin/experienceMax from posting. null if not stated.
- Salary: salaryMin/salaryMax in annual USD. null if not stated.
- Remote: isRemote true if remote/hybrid mentioned.
- Employment type: full-time/part-time/contract/temporary/internship
- Summary: 3 sentences focused on what a LAWYER would find compelling about this role
- Match keywords: 5-10 search terms
- aiResponsibilities: 4-8 bullet points of what you'll DO
- aiQualifications: 4-8 REQUIRED qualifications
- aiNiceToHaves: 2-5 PREFERRED qualifications

Return ONLY valid JSON:
{
  "legalRelevanceScore": 8,
  "category": "Legal Engineering",
  "subcategory": "Legal Engineer",
  "seniorityLevel": "Senior",
  "keySkills": ["Legal Tech", "Contract Automation", "Legal Workflows"],
  "experienceMin": 5,
  "experienceMax": 8,
  "salaryMin": null,
  "salaryMax": null,
  "isRemote": false,
  "employmentType": "full-time",
  "aiSummary": "Brief 3-sentence summary here.",
  "matchKeywords": ["legal engineer", "legal tech", "automation"],
  "aiResponsibilities": ["Design legal workflows", "Configure legal AI tools"],
  "aiQualifications": ["JD or equivalent legal training", "3+ years in legal tech"],
  "aiNiceToHaves": ["Experience with CLM platforms"]
}

CRITICAL RULES:
- legalRelevanceScore MUST be strict. When in doubt, score LOWER. Platform credibility depends on this.
- Generic business roles at legal tech companies MUST score 3 or below.
- experienceMin/experienceMax: null if not stated.
- salaryMin/salaryMax: null if not stated.`;

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

    const rawScore = typeof result.legalRelevanceScore === "number" ? result.legalRelevanceScore : 5;
    const legalRelevanceScore = Math.max(1, Math.min(10, rawScore));
    
    let reviewStatus: string;
    if (legalRelevanceScore >= 7) {
      reviewStatus = "approved";
    } else if (legalRelevanceScore >= 4) {
      reviewStatus = "needs_review";
    } else {
      reviewStatus = "rejected";
    }

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
      legalRelevanceScore,
      reviewStatus,
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
  if (categoryLower.includes("legal engineer")) return "Legal Engineering";
  if (categoryLower.includes("in-house") || categoryLower.includes("in house") || categoryLower.includes("counsel")) return "In-House Counsel";
  if (categoryLower.includes("ai") || categoryLower.includes("machine learning") || categoryLower.includes("analytics")) return "Legal AI & Analytics";
  if (categoryLower.includes("product")) return "Legal Product Management";
  if (categoryLower.includes("knowledge") || categoryLower.includes("publishing") || categoryLower.includes("editorial")) return "Knowledge Management";
  if (categoryLower.includes("operations") || categoryLower.includes("ops")) return "Legal Operations";
  if (categoryLower.includes("contract") || categoryLower.includes("clm")) return "Contract Management";
  if (categoryLower.includes("compliance") || categoryLower.includes("regtech") || categoryLower.includes("regulatory") || categoryLower.includes("privacy")) return "Compliance & Privacy";
  if (categoryLower.includes("litigation") || categoryLower.includes("ediscovery") || categoryLower.includes("discovery")) return "Litigation & eDiscovery";
  if (categoryLower.includes("consult") || categoryLower.includes("strategy") || categoryLower.includes("advisory")) return "Legal Consulting & Advisory";
  if (categoryLower.includes("court") || categoryLower.includes("government") || categoryLower.includes("justice") || categoryLower.includes("policy")) return "Policy & Access to Justice";
  if (categoryLower.includes("ip") || categoryLower.includes("intellectual") || categoryLower.includes("trademark") || categoryLower.includes("patent")) return "Intellectual Property & Innovation";
  if (categoryLower.includes("sales") || categoryLower.includes("client solution") || categoryLower.includes("engagement")) return "Legal Sales & Client Solutions";
  return "Legal Operations";
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
  
  let category = "Legal Operations";
  let subcategory = "Legal Operations Manager";
  const keySkills: string[] = [];
  const matchKeywords: string[] = [];

  if (text.includes("legal engineer")) {
    category = "Legal Engineering";
    subcategory = "Legal Engineer";
    keySkills.push("Legal Tech", "Legal Workflows", "Automation");
    matchKeywords.push("legal engineer", "legal tech", "automation");
  } else if (text.includes("counsel") || text.includes("attorney") || text.includes("lawyer")) {
    if (text.includes("compliance") || text.includes("privacy") || text.includes("regulatory")) {
      category = "Compliance & Privacy";
      subcategory = "Compliance Counsel";
    } else if (text.includes("contract")) {
      category = "Contract Management";
      subcategory = "Contracts Counsel";
    } else if (text.includes("product")) {
      category = "Legal Product Management";
      subcategory = "Product Counsel";
    } else if (text.includes("trademark") || text.includes("ip") || text.includes("patent")) {
      category = "Intellectual Property & Innovation";
      subcategory = "Trademark Attorney";
    } else {
      category = "In-House Counsel";
      subcategory = "Commercial Counsel";
    }
    keySkills.push("Legal Analysis", "Legal Advisory");
    matchKeywords.push("counsel", "legal", "attorney");
  } else if (text.includes("product manager") || text.includes("product lead")) {
    if (text.includes("ai")) {
      category = "Legal AI & Analytics";
      subcategory = "Legal AI Product Manager";
    } else {
      category = "Legal Product Management";
      subcategory = "Legal Product Manager";
    }
    keySkills.push("Product Management", "Strategy", "User Research");
    matchKeywords.push("product", "roadmap", "strategy");
  } else if (text.includes("legal ops") || text.includes("legal operations") || text.includes("legal project")) {
    category = "Legal Operations";
    subcategory = "Legal Operations Manager";
    keySkills.push("Legal Operations", "Process Improvement");
    matchKeywords.push("legal ops", "operations");
  } else if (text.includes("contract") || text.includes("clm") || text.includes("isda")) {
    category = "Contract Management";
    subcategory = "Contracts Manager";
    keySkills.push("CLM", "Contract Management");
    matchKeywords.push("contract", "clm");
  } else if (text.includes("compliance") || text.includes("regulatory") || text.includes("privacy") || text.includes("grc")) {
    category = "Compliance & Privacy";
    subcategory = "Compliance Manager";
    keySkills.push("Compliance", "Regulatory", "Risk Management");
    matchKeywords.push("compliance", "regulatory", "risk");
  } else if (text.includes("ediscovery") || text.includes("e-discovery") || text.includes("litigation") || text.includes("appellate")) {
    category = "Litigation & eDiscovery";
    subcategory = "eDiscovery Project Manager";
    keySkills.push("eDiscovery", "Litigation Support");
    matchKeywords.push("ediscovery", "litigation");
  } else if (text.includes("consult") || text.includes("advisory")) {
    category = "Legal Consulting & Advisory";
    subcategory = "LegalTech Consultant";
    keySkills.push("Consulting", "Strategy");
    matchKeywords.push("consulting", "advisory");
  } else if (text.includes("knowledge") || text.includes("taxonomy") || text.includes("editorial")) {
    category = "Knowledge Management";
    subcategory = "Legal Knowledge Manager";
    keySkills.push("Knowledge Management", "Taxonomy");
    matchKeywords.push("knowledge", "taxonomy");
  } else if (text.includes("trademark") || text.includes("ip specialist") || text.includes("patent")) {
    category = "Intellectual Property & Innovation";
    subcategory = "IP Specialist";
    keySkills.push("IP Law", "Trademark");
    matchKeywords.push("trademark", "ip", "patent");
  } else if (text.includes("policy") || text.includes("justice") || text.includes("court")) {
    category = "Policy & Access to Justice";
    subcategory = "Legal Policy Advisor";
    keySkills.push("Legal Policy", "Justice Systems");
    matchKeywords.push("policy", "justice");
  } else if (text.includes("engagement manager") || text.includes("legal solutions")) {
    category = "Legal Sales & Client Solutions";
    subcategory = "Engagement Manager";
    keySkills.push("Client Relations", "Legal Solutions");
    matchKeywords.push("engagement", "solutions");
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
    legalRelevanceScore: 5,
    reviewStatus: "needs_review",
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
