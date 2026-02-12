import * as cheerio from "cheerio";
import { extractTextFromPDF, extractTextFromDOCX } from "./resume-parser";
import { categorizeJob } from "./job-categorizer";
import type { InsertJob } from "@shared/schema";
import { getOpenAIClient } from "./openai-client";

interface ParsedJobData {
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
}

export function extractTextFromHTML(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

async function parseJobFromText(rawText: string, sourceHint?: string): Promise<ParsedJobData> {
  const truncated = rawText.substring(0, 12000);

  const completion = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert job posting parser. Extract structured data from ANY format: formal job descriptions, LinkedIn posts, emails, Slack messages, screenshots-to-text, or casual text.

Return ONLY valid JSON:
{
  "title": "Exact job title (not company name or tagline)",
  "company": "Company name (clean, no suffixes like 'Inc.' unless part of brand)",
  "location": "City, State, Country format. Use 'Remote' for remote roles. 'Not specified' if unknown.",
  "description": "Comprehensive job description. Include: role overview, responsibilities, requirements, qualifications, and benefits. Strip navigation text, cookie notices, and unrelated content. Preserve bullet points as '- item' format.",
  "applyUrl": "Application URL if found, empty string otherwise",
  "isRemote": true/false,
  "salaryMin": number or null,
  "salaryMax": number or null
}

SMART EXTRACTION RULES:
- Title: Look for the most specific role title. Ignore generic headers like "We're Hiring" or "Join Our Team".
- Company: Look for "at [Company]", "Company: X", email domains (@company.com), or brand mentions.
- Salary: Convert ALL formats to annual USD:
  * "$120K-$150K" or "$120,000-$150,000" → direct
  * "$55/hr" or "$55 per hour" → multiply by 2080
  * "$10,000/mo" → multiply by 12
  * "EUR", "GBP" → approximate USD conversion
- Remote: Check for "remote", "hybrid", "work from home", "distributed", "WFH", "anywhere"
- If text contains MULTIPLE job postings, extract only the FIRST/primary one.
- If the input is messy (email forward, chat paste), focus on extracting the actual job details.`,
      },
      {
        role: "user",
        content: `Extract job posting data from this ${sourceHint || "text"}:\n\n${truncated}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 3000,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI when parsing job file");
  }

  const parsed = JSON.parse(content);

  return {
    title: parsed.title || "Untitled Position",
    company: parsed.company || "Unknown Company",
    location: parsed.location || "Not specified",
    description: parsed.description || truncated,
    applyUrl: parsed.applyUrl || "",
    isRemote: Boolean(parsed.isRemote),
    salaryMin: parsed.salaryMin ? Number(parsed.salaryMin) : null,
    salaryMax: parsed.salaryMax ? Number(parsed.salaryMax) : null,
  };
}

async function detectAndParseMultipleJobs(rawText: string): Promise<ParsedJobData[] | null> {
  const jobSeparators = /(?:^|\n)(?:---+|===+|\*\*\*+|#{2,}\s)/m;
  const multiJobIndicators = [
    /(?:position|role|job)\s*(?:#?\d+|[A-Z])\s*:/i,
    /(?:^|\n)\d+\.\s+[A-Z][a-z]+\s+(?:Manager|Director|Engineer|Analyst|Specialist|Lead|Attorney|Counsel)/m,
  ];

  const hasMultipleJobs = jobSeparators.test(rawText) ||
    multiJobIndicators.some(p => p.test(rawText)) ||
    (rawText.match(/(?:^|\n)(?:Job Title|Position|Role)\s*:/gim) || []).length > 1;

  if (!hasMultipleJobs) return null;

  const truncated = rawText.substring(0, 15000);

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You detect and extract MULTIPLE job postings from text that contains more than one job. 
Return JSON: { "jobs": [...] } where each job has: title, company, location, description, applyUrl, isRemote, salaryMin, salaryMax.
If the text only contains ONE job, return { "jobs": [single_job] }.
Apply the same extraction rules: clean titles, annual USD salary, remote detection.`,
        },
        {
          role: "user",
          content: `Extract all job postings from this text:\n\n${truncated}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const jobs = parsed.jobs || [parsed];

    return jobs.map((j: any) => ({
      title: j.title || "Untitled Position",
      company: j.company || "Unknown Company",
      location: j.location || "Not specified",
      description: j.description || "",
      applyUrl: j.applyUrl || "",
      isRemote: Boolean(j.isRemote),
      salaryMin: j.salaryMin ? Number(j.salaryMin) : null,
      salaryMax: j.salaryMax ? Number(j.salaryMax) : null,
    }));
  } catch (error) {
    console.error("Multi-job detection failed:", error);
    return null;
  }
}

export async function parseMultipleJobsFromText(rawText: string): Promise<InsertJob[]> {
  const multiJobs = await detectAndParseMultipleJobs(rawText);
  if (!multiJobs || multiJobs.length <= 1) {
    const singleJob = await parseJobFile(Buffer.from(rawText, 'utf-8'), 'text/plain', 'pasted-text.txt');
    return [singleJob];
  }

  const results: InsertJob[] = [];
  for (const jobData of multiJobs) {
    let categorization;
    try {
      categorization = await categorizeJob(jobData.title, jobData.description, jobData.company);
    } catch (error) {
      console.error("Categorization failed for multi-job:", error);
    }

    const companySlug = jobData.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    results.push({
      title: jobData.title.substring(0, 255),
      company: jobData.company.substring(0, 255),
      companyLogo: companySlug ? `https://logo.clearbit.com/${companySlug}.com` : null,
      location: jobData.location || "Not specified",
      isRemote: jobData.isRemote,
      salaryMin: jobData.salaryMin,
      salaryMax: jobData.salaryMax,
      experienceMin: categorization?.experienceMin || null,
      experienceMax: categorization?.experienceMax || null,
      roleType: inferRoleType(jobData.title),
      description: jobData.description,
      requirements: null,
      applyUrl: jobData.applyUrl || "#",
      isActive: true,
      externalId: `multi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      source: "paste",
      aiSummary: categorization?.aiSummary || null,
      keySkills: categorization?.keySkills || null,
      roleCategory: categorization?.category || null,
      roleSubcategory: categorization?.subcategory || null,
      seniorityLevel: categorization?.seniorityLevel || null,
      matchKeywords: categorization?.matchKeywords || null,
      aiResponsibilities: categorization?.aiResponsibilities || null,
      aiQualifications: categorization?.aiQualifications || null,
      aiNiceToHaves: categorization?.aiNiceToHaves || null,
    });
  }

  return results;
}

function inferRoleType(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes("engineer") || t.includes("developer") || t.includes("architect")) return "Engineering";
  if (t.includes("product manager") || t.includes("product lead")) return "Product";
  if (t.includes("design") || t.includes("ux") || t.includes("ui")) return "Design";
  if (t.includes("sales") || t.includes("account")) return "Sales";
  if (t.includes("market") || t.includes("growth")) return "Marketing";
  if (t.includes("data") || t.includes("analyst") || t.includes("analytics")) return "Data";
  if (t.includes("legal") || t.includes("counsel") || t.includes("attorney") || t.includes("lawyer")) return "Legal";
  if (t.includes("operations") || t.includes("ops")) return "Operations";
  if (t.includes("support") || t.includes("success")) return "Support";
  return null;
}

export async function parseJobFile(
  buffer: Buffer,
  mimetype: string,
  filename: string
): Promise<InsertJob> {
  let rawText: string;
  let sourceHint: string;

  if (mimetype === "application/pdf") {
    rawText = await extractTextFromPDF(buffer);
    sourceHint = "PDF document";
  } else if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword"
  ) {
    rawText = await extractTextFromDOCX(buffer);
    sourceHint = "Word document";
  } else if (mimetype === "text/html" || mimetype === "application/xhtml+xml") {
    rawText = extractTextFromHTML(buffer.toString("utf-8"));
    sourceHint = "HTML page";
  } else if (mimetype === "text/plain") {
    rawText = buffer.toString("utf-8");
    sourceHint = "text file";
  } else {
    const content = buffer.toString("utf-8");
    if (content.trim().startsWith("<") || content.includes("<!DOCTYPE") || content.includes("<html")) {
      rawText = extractTextFromHTML(content);
      sourceHint = "HTML file";
    } else {
      rawText = content;
      sourceHint = "text file";
    }
  }

  if (!rawText || rawText.trim().length < 20) {
    throw new Error("Could not extract enough text from the file to identify a job posting.");
  }

  const jobData = await parseJobFromText(rawText, sourceHint);

  let categorization;
  try {
    categorization = await categorizeJob(jobData.title, jobData.description, jobData.company);
  } catch (error) {
    console.error("Categorization failed for uploaded file:", error);
  }

  const companySlug = jobData.company.toLowerCase().replace(/[^a-z0-9]/g, "");

  return {
    title: jobData.title.substring(0, 255),
    company: jobData.company.substring(0, 255),
    companyLogo: companySlug ? `https://logo.clearbit.com/${companySlug}.com` : null,
    location: jobData.location || "Not specified",
    isRemote: jobData.isRemote,
    salaryMin: jobData.salaryMin,
    salaryMax: jobData.salaryMax,
    experienceMin: categorization?.experienceMin || null,
    experienceMax: categorization?.experienceMax || null,
    roleType: inferRoleType(jobData.title),
    description: jobData.description,
    requirements: null,
    applyUrl: jobData.applyUrl || "#",
    isActive: true,
    externalId: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    source: "upload",
    aiSummary: categorization?.aiSummary || null,
    keySkills: categorization?.keySkills || null,
    roleCategory: categorization?.category || null,
    roleSubcategory: categorization?.subcategory || null,
    seniorityLevel: categorization?.seniorityLevel || null,
    matchKeywords: categorization?.matchKeywords || null,
    aiResponsibilities: categorization?.aiResponsibilities || null,
    aiQualifications: categorization?.aiQualifications || null,
    aiNiceToHaves: categorization?.aiNiceToHaves || null,
  };
}
