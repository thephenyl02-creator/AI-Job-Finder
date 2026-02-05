import OpenAI from "openai";
import mammoth from "mammoth";
import type { ResumeExtractedData } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export class InvalidPDFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPDFError";
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Basic PDF validation - check for PDF header
    const header = buffer.slice(0, 8).toString("utf-8");
    if (!header.startsWith("%PDF-")) {
      throw new InvalidPDFError("The file is not a valid PDF. Please upload a real PDF file.");
    }

    // Use createRequire to import CommonJS module in ESM context
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const { PDFParse } = require("pdf-parse");
    // v2 API: create parser instance with buffer data, then call getText()
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text;
  } catch (error: any) {
    console.error("PDF parsing error:", error);
    if (error instanceof InvalidPDFError) {
      throw error;
    }
    // Check for common PDF parsing errors
    if (error.message?.includes("Invalid") || error.name === "InvalidPDFException") {
      throw new InvalidPDFError("The PDF file appears to be corrupted or invalid. Please try a different file.");
    }
    throw new InvalidPDFError("Failed to read the PDF file. Please ensure it contains readable text.");
  }
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error("DOCX parsing error:", error);
    throw new Error("Failed to parse DOCX");
  }
}

export async function parseResumeWithAI(resumeText: string): Promise<ResumeExtractedData> {
  const systemPrompt = `You are a resume parser for legal AI job matching. Extract structured information from the resume.

Return JSON with:
{
  "name": "Full name",
  "email": "Email if found",
  "phone": "Phone if found",
  "summary": "Brief professional summary (2-3 sentences)",
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "duration": "2020-2023",
      "description": "What they did"
    }
  ],
  "totalYearsExperience": 5,
  "skills": ["skill1", "skill2"],
  "education": [
    {
      "degree": "Degree name",
      "institution": "School",
      "year": "2020"
    }
  ],
  "preferredRoles": ["Product Manager", "Legal Engineer"],
  "preferredLocations": ["San Francisco", "Remote"],
  "desiredSalary": { "min": 120000, "max": 180000 },
  "isOpenToRemote": true,
  "legalBackground": true,
  "techBackground": true
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this resume:\n\n${resumeText}` },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    return JSON.parse(content) as ResumeExtractedData;
  } catch (error) {
    console.error("AI resume parsing failed:", error);
    // Return basic extracted data on failure
    return {
      summary: resumeText.substring(0, 500),
      skills: [],
      preferredRoles: [],
      preferredLocations: [],
      isOpenToRemote: true,
    };
  }
}

export async function generateSearchQueryFromResume(parsedData: ResumeExtractedData): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "Convert resume data into a natural language job search query. Keep it concise (2-3 sentences).",
        },
        {
          role: "user",
          content: `Based on this resume data: ${JSON.stringify(parsedData)}
      
Generate a natural search query that captures what this person is looking for in their next role.`,
        },
      ],
      max_completion_tokens: 256,
    });

    return completion.choices[0]?.message?.content || generateFallbackQuery(parsedData);
  } catch (error) {
    console.error("Failed to generate search query:", error);
    return generateFallbackQuery(parsedData);
  }
}

function generateFallbackQuery(parsedData: ResumeExtractedData): string {
  const parts: string[] = [];

  if (parsedData.preferredRoles?.length) {
    parts.push(parsedData.preferredRoles.slice(0, 2).join(" or "));
  }

  if (parsedData.totalYearsExperience) {
    parts.push(`${parsedData.totalYearsExperience} years experience`);
  }

  if (parsedData.isOpenToRemote) {
    parts.push("remote-friendly");
  } else if (parsedData.preferredLocations?.length) {
    parts.push(`in ${parsedData.preferredLocations[0]}`);
  }

  if (parsedData.desiredSalary?.min) {
    parts.push(`$${Math.round(parsedData.desiredSalary.min / 1000)}K+`);
  }

  return parts.length > 0 ? parts.join(", ") : "Legal tech role matching my experience";
}
