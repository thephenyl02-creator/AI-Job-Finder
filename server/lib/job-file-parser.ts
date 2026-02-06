import OpenAI from "openai";
import * as cheerio from "cheerio";
import { extractTextFromPDF, extractTextFromDOCX } from "./resume-parser";
import { categorizeJob } from "./job-categorizer";
import type { InsertJob } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
  const truncated = rawText.substring(0, 6000);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You extract structured job posting data from raw text. Return valid JSON with these fields:
{
  "title": "Job title",
  "company": "Company name",
  "location": "Location (e.g. 'San Francisco, CA' or 'Remote')",
  "description": "Full job description text (preserve key details, responsibilities, requirements)",
  "applyUrl": "Application URL if found, or empty string",
  "isRemote": true/false,
  "salaryMin": number or null,
  "salaryMax": number or null
}

If you cannot determine a field, use reasonable defaults:
- title: Use the most prominent role title found
- company: Use any company name found, or "Unknown Company"
- location: "Not specified" if unclear
- description: Use the full text content as description
- isRemote: true if text mentions remote/distributed/work from home`,
      },
      {
        role: "user",
        content: `Extract job posting data from this ${sourceHint || "text"}:\n\n${truncated}`,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
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
  };
}
