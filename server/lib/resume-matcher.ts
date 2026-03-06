import type { ResumeExtractedData, Job } from "@shared/schema";
import { getOpenAIClient } from "./openai-client";

export interface BatchMatchResult {
  jobId: number;
  title: string;
  company: string;
  location: string | null;
  isRemote: boolean | null;
  locationType: string | null;
  matchScore: number;
  tweakPercentage: number;
  brutalVerdict: string;
  matchHighlights: string[];
  gapSummary: string;
  topMissingSkills: string[];
}

export interface ResumeTweakResult {
  jobId: number;
  overallFit: number;
  tweakPercentage: number;
  brutalAssessment: string;
  descriptionAlignment: Array<{
    requirement: string;
    status: "match" | "partial" | "missing";
    resumeEvidence: string | null;
    tweakSuggestion: string | null;
  }>;
  resumeEdits: Array<{
    section: string;
    currentContent: string;
    suggestedChange: string;
    reason: string;
    impact: "high" | "medium" | "low";
  }>;
  skillsToAdd: Array<{
    skill: string;
    howToFrame: string;
    isRealistic: boolean;
  }>;
  overallStrategy: string;
  honestWarnings: string[];
}

function preFilterJobs(resumeData: ResumeExtractedData, jobs: Job[]): Job[] {
  const resumeSkills = (resumeData.skills || []).map((s) => s.toLowerCase());
  const resumeRoles = (resumeData.preferredRoles || []).map((r) =>
    r.toLowerCase(),
  );
  const resumeYears = resumeData.totalYearsExperience || 0;

  const scored = jobs.map((job) => {
    let score = 0;

    const jobSkills = (job.keySkills || []).map((s) => s.toLowerCase());
    const skillOverlap = jobSkills.filter((js) =>
      resumeSkills.some(
        (rs) =>
          rs.includes(js) ||
          js.includes(rs) ||
          rs.split(/\s+/).some((w) => js.includes(w)),
      ),
    ).length;
    score += skillOverlap * 10;

    const jobTitle = (job.title || "").toLowerCase();
    const roleMatch = resumeRoles.some(
      (r) =>
        jobTitle.includes(r) ||
        r.split(/\s+/).some((w) => w.length > 3 && jobTitle.includes(w)),
    );
    if (roleMatch) score += 25;

    const jobCategory = (job.roleCategory || "").toLowerCase();
    const jobSubcategory = (job.roleSubcategory || "").toLowerCase();
    if (resumeData.legalBackground) {
      if (
        jobCategory.includes("legal") ||
        jobSubcategory.includes("legal") ||
        jobTitle.includes("legal")
      ) {
        score += 15;
      }
    }
    if (resumeData.techBackground) {
      if (
        jobCategory.includes("tech") ||
        jobCategory.includes("engineer") ||
        jobCategory.includes("ai")
      ) {
        score += 10;
      }
    }

    if (job.experienceMin && job.experienceMax) {
      if (
        resumeYears >= job.experienceMin - 1 &&
        resumeYears <= job.experienceMax + 3
      ) {
        score += 15;
      }
    } else if (job.experienceMin) {
      if (resumeYears >= job.experienceMin - 2) {
        score += 10;
      }
    }

    if (job.isRemote && resumeData.isOpenToRemote) {
      score += 5;
    }

    return { job, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 30).map((s) => s.job);
}

export async function batchMatchResume(
  resumeData: ResumeExtractedData,
  allJobs: Job[],
): Promise<BatchMatchResult[]> {
  const candidateJobs = preFilterJobs(resumeData, allJobs);

  if (candidateJobs.length === 0) {
    return [];
  }

  const jobSummaries = candidateJobs.map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    isRemote: job.isRemote,
    locationType: job.locationType || (job.isRemote ? 'remote' : 'onsite'),
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    seniorityLevel: job.seniorityLevel,
    roleCategory: job.roleCategory,
    keySkills: job.keySkills,
    description: (job.description || "").substring(0, 400),
  }));

  const systemPrompt = `You are a brutally honest career advisor for legal tech professionals. You analyze resumes against job postings and give unflinching assessments.

Your job: Score how well this resume matches each job. Be BRUTALLY HONEST. Don't sugarcoat.

For each job, provide:
- matchScore: 0-100 (be harsh - a 100 means PERFECT fit, nearly impossible)
- tweakPercentage: 0-100 (how much of the resume needs changing to be competitive for this job. 0 = ready to apply as-is, 80+ = major rewrite needed)
- brutalVerdict: 1-2 sentences. Be direct. If they're a great fit, say so clearly. If they're reaching, say that too. No corporate speak.
- matchHighlights: 2-3 specific things from their resume that match well
- gapSummary: 1-2 sentences about what's missing. Be specific, not vague.
- topMissingSkills: Up to 3 specific skills they'd need

Rules:
- A 95-100 match is extremely rare. Reserve it for near-perfect alignment.
- If someone has 2 years experience applying for a Director role, call it out.
- If they're a lawyer trying to become a software engineer, be realistic about the gap.
- But also recognize transferable skills - legal analysis maps to data analysis, etc.
- Only return jobs scoring 40+. Below that it's not worth discussing.
- Return max 10 best matches, sorted by score descending.

Return valid JSON:
{
  "matches": [
    {
      "jobId": 123,
      "matchScore": 72,
      "tweakPercentage": 35,
      "brutalVerdict": "Strong fit. Your contract management experience maps directly, but you'll need to show more technical depth.",
      "matchHighlights": ["Contract management expertise", "Legal operations background"],
      "gapSummary": "Missing hands-on CLM platform experience. Your legal background is relevant but you haven't demonstrated tech implementation skills.",
      "topMissingSkills": ["CLM Platforms", "API Integration"]
    }
  ]
}`;

  const userPrompt = `RESUME:
Name: ${resumeData.name || "Not provided"}
Summary: ${resumeData.summary || "Not provided"}
Total Experience: ${resumeData.totalYearsExperience || "Unknown"} years
Skills: ${(resumeData.skills || []).join(", ") || "Not listed"}
Preferred Roles: ${(resumeData.preferredRoles || []).join(", ") || "Not specified"}
Legal Background: ${resumeData.legalBackground ? "Yes" : "No"}
Tech Background: ${resumeData.techBackground ? "Yes" : "No"}

Experience:
${
  resumeData.experience
    ?.map((e) => `- ${e.title} at ${e.company} (${e.duration}): ${e.description}`)
    .join("\n") || "No experience listed"
}

Education:
${
  resumeData.education
    ?.map((e) => `- ${e.degree} from ${e.institution} (${e.year})`)
    .join("\n") || "No education listed"
}

JOBS TO MATCH AGAINST:
${JSON.stringify(jobSummaries, null, 2)}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content) as {
      matches: Array<{
        jobId: number;
        matchScore: number;
        tweakPercentage: number;
        brutalVerdict: string;
        matchHighlights: string[];
        gapSummary: string;
        topMissingSkills: string[];
      }>;
    };

    const jobMap = new Map(candidateJobs.map((j) => [j.id, j]));

    return (parsed.matches || [])
      .filter((m) => m.matchScore >= 40 && jobMap.has(m.jobId))
      .slice(0, 10)
      .map((m) => {
        const job = jobMap.get(m.jobId)!;
        return {
          jobId: m.jobId,
          title: job.title,
          company: job.company,
          location: job.location,
          isRemote: job.isRemote,
          locationType: job.locationType || (job.isRemote ? 'remote' : 'onsite'),
          matchScore: m.matchScore,
          tweakPercentage: m.tweakPercentage,
          brutalVerdict: m.brutalVerdict,
          matchHighlights: m.matchHighlights || [],
          gapSummary: m.gapSummary,
          topMissingSkills: m.topMissingSkills || [],
        };
      });
  } catch (error) {
    console.error("Batch resume match error:", error);
    return fallbackBatchMatch(resumeData, candidateJobs);
  }
}

function fallbackBatchMatch(
  resumeData: ResumeExtractedData,
  jobs: Job[],
): BatchMatchResult[] {
  const resumeSkills = (resumeData.skills || []).map((s) => s.toLowerCase());

  return jobs
    .slice(0, 10)
    .map((job) => {
      const jobSkills = (job.keySkills || []).map((s) => s.toLowerCase());
      const matched = jobSkills.filter((js) =>
        resumeSkills.some((rs) => rs.includes(js) || js.includes(rs)),
      );
      const missing = jobSkills.filter(
        (js) =>
          !resumeSkills.some((rs) => rs.includes(js) || js.includes(rs)),
      );
      const score =
        jobSkills.length > 0
          ? Math.round((matched.length / jobSkills.length) * 70) + 20
          : 50;
      const tweakPct = Math.max(0, Math.min(100, 100 - score + 10));

      return {
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        isRemote: job.isRemote,
        locationType: job.locationType || (job.isRemote ? 'remote' : 'onsite'),
        matchScore: Math.min(score, 95),
        tweakPercentage: tweakPct,
        brutalVerdict: `You match ${matched.length} of ${jobSkills.length} listed skills. ${missing.length > 0 ? "Gaps exist." : "Solid alignment."}`,
        matchHighlights: matched.slice(0, 3),
        gapSummary:
          missing.length > 0
            ? `Missing: ${missing.slice(0, 3).join(", ")}`
            : "Skills appear aligned",
        topMissingSkills: missing.slice(0, 3),
      };
    })
    .filter((r) => r.matchScore >= 40)
    .sort((a, b) => b.matchScore - a.matchScore);
}

export async function generateResumeTweaks(
  resumeData: ResumeExtractedData,
  resumeText: string,
  job: Job,
): Promise<ResumeTweakResult> {
  const systemPrompt = `You are a brutally honest resume coach specializing in legal tech careers. You analyze a resume against a specific job posting and provide REALISTIC, ACTIONABLE tweaking advice.

Rules for honesty:
- If the candidate is genuinely a great fit, say so - but still find areas to optimize
- If they're reaching, don't pretend otherwise. Tell them the real gap.
- Never suggest lying or fabricating experience
- "Realistic tweaking" means: reframing existing experience, highlighting relevant transferable skills, adding missing keywords where truthful, restructuring sections
- If a skill is completely missing and can't be honestly reframed, say so in honestWarnings

For descriptionAlignment: Break the job posting into key requirements/responsibilities and map each one to the resume:
- "match": Resume clearly demonstrates this requirement
- "partial": Resume shows related but not exact experience 
- "missing": Resume has no relevant evidence for this requirement

For resumeEdits: Suggest SPECIFIC text changes they could make. Reference their actual experience and reframe it. Show before/after style suggestions. Rate impact as high/medium/low.

For skillsToAdd: Only suggest skills that:
- isRealistic=true: They could honestly claim (adjacent skills, things they've likely used but not listed)
- isRealistic=false: They genuinely don't have (be honest about this)

Return valid JSON:
{
  "overallFit": 72,
  "tweakPercentage": 30,
  "brutalAssessment": "You're a solid 70% fit. Your legal ops background is strong, but you're missing the technical implementation experience they want. With strategic tweaking you could present as a credible candidate, but don't expect to skip the learning curve.",
  "descriptionAlignment": [
    {
      "requirement": "3+ years managing CLM platforms",
      "status": "partial",
      "resumeEvidence": "Managed contract workflows for 2 years using manual processes",
      "tweakSuggestion": "Reframe as: 'Led contract lifecycle management processes, evaluating and implementing workflow solutions' - emphasize the management aspect"
    }
  ],
  "resumeEdits": [
    {
      "section": "Experience - Legal Operations Manager",
      "currentContent": "Managed contract processes for the legal team",
      "suggestedChange": "Led contract lifecycle management for a 15-person legal team, streamlining review workflows and reducing turnaround time by 30%",
      "reason": "Adds specificity and metrics. Maps directly to their CLM requirement.",
      "impact": "high"
    }
  ],
  "skillsToAdd": [
    {
      "skill": "Contract Lifecycle Management",
      "howToFrame": "Add to skills section - your workflow management experience qualifies this",
      "isRealistic": true
    },
    {
      "skill": "Salesforce Integration",
      "howToFrame": "You don't have this - consider taking a short online course before applying",
      "isRealistic": false
    }
  ],
  "overallStrategy": "Focus on quantifying your legal ops impact and explicitly connecting your workflow experience to their CLM needs. Lead with your process improvement results.",
  "honestWarnings": [
    "They want 5+ years and you have 3 - this will be a tough sell regardless of resume tweaks",
    "The Salesforce requirement is non-negotiable for this role - you'd need to address it"
  ]
}`;

  const userPrompt = `RESUME TEXT (full):
${resumeText.substring(0, 3000)}

PARSED RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || "Not specified"} ${job.isRemote ? "(Remote)" : ""}
Seniority: ${job.seniorityLevel || "Not specified"}
Required Skills: ${(job.keySkills || []).join(", ") || "Not listed"}
Salary: ${job.salaryMin && job.salaryMax ? `$${job.salaryMin.toLocaleString()}-$${job.salaryMax.toLocaleString()}` : "Not specified"}
Experience Required: ${job.experienceMin && job.experienceMax ? `${job.experienceMin}-${job.experienceMax} years` : job.experienceMin ? `${job.experienceMin}+ years` : "Not specified"}

Full Job Description:
${(job.description || "").substring(0, 4000)}

Requirements:
${(job.requirements || "").substring(0, 2000)}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No AI response");
    }

    const result = JSON.parse(content) as Omit<ResumeTweakResult, "jobId">;
    return { ...result, jobId: job.id };
  } catch (error) {
    console.error("Resume tweak generation error:", error);
    return generateFallbackTweaks(resumeData, job);
  }
}

function generateFallbackTweaks(
  resumeData: ResumeExtractedData,
  job: Job,
): ResumeTweakResult {
  const resumeSkills = (resumeData.skills || []).map((s) => s.toLowerCase());
  const jobSkills = (job.keySkills || []).map((s) => s.toLowerCase());

  const matched = jobSkills.filter((js) =>
    resumeSkills.some((rs) => rs.includes(js) || js.includes(rs)),
  );
  const missing = jobSkills.filter(
    (js) => !resumeSkills.some((rs) => rs.includes(js) || js.includes(rs)),
  );
  const score =
    jobSkills.length > 0
      ? Math.round((matched.length / jobSkills.length) * 80) + 15
      : 50;

  return {
    jobId: job.id,
    overallFit: Math.min(score, 95),
    tweakPercentage: Math.max(0, 100 - score + 10),
    brutalAssessment: `You match ${matched.length} of ${jobSkills.length} required skills. ${missing.length > 0 ? `Key gaps: ${missing.slice(0, 3).join(", ")}. Your resume needs work in these areas.` : "Skills are largely aligned."}`,
    descriptionAlignment: jobSkills.map((skill) => ({
      requirement: skill,
      status: (matched.includes(skill)
        ? "match"
        : "missing") as "match" | "missing",
      resumeEvidence: matched.includes(skill)
        ? "Found in resume skills"
        : null,
      tweakSuggestion: !matched.includes(skill)
        ? `Consider how your experience relates to ${skill}`
        : null,
    })),
    resumeEdits: [
      {
        section: "Skills",
        currentContent: (resumeData.skills || []).slice(0, 5).join(", "),
        suggestedChange: `Add relevant skills: ${missing.slice(0, 3).join(", ")} (only if you can honestly claim them)`,
        reason: "Align skills section with job requirements",
        impact: "high" as const,
      },
    ],
    skillsToAdd: missing.slice(0, 5).map((skill) => ({
      skill,
      howToFrame: `Evaluate whether your experience includes ${skill}-adjacent work`,
      isRealistic: false,
    })),
    overallStrategy:
      "Focus on connecting your existing experience to the job requirements. Quantify achievements where possible.",
    honestWarnings:
      missing.length > 3
        ? [
            `You're missing ${missing.length} of ${jobSkills.length} required skills - this is a significant gap`,
          ]
        : [],
  };
}

export interface ReadinessResult {
  resumeId: number;
  label: string | null;
  isPrimary: boolean | null;
  score: number;
  matched: string[];
  missing: string[];
  totalSkills: number;
}

export function computeReadinessScores(
  jobKeySkills: string[],
  resumes: Array<{ id: number; label: string | null; isPrimary: boolean | null; extractedData: any }>,
): ReadinessResult[] {
  if (!jobKeySkills || jobKeySkills.length === 0) return [];

  const jobSkillsLower = jobKeySkills.map(s => s.toLowerCase().trim());

  const results = resumes
    .filter(r => r.extractedData && typeof r.extractedData === "object")
    .map(resume => {
      const data = resume.extractedData as any;
      const resumeSkills = ((data.skills || []) as string[]).map(s => s.toLowerCase().trim());
      let matchCount = 0;
      const matched: string[] = [];
      const missing: string[] = [];
      for (const js of jobKeySkills) {
        const jsLower = js.toLowerCase().trim();
        const found = resumeSkills.some(rs =>
          rs.includes(jsLower) || jsLower.includes(rs) ||
          rs.split(/\s+/).some(w => w.length > 2 && jsLower.split(/\s+/).some(jw => jw.length > 2 && (jw.includes(w) || w.includes(jw))))
        );
        if (found) { matchCount++; matched.push(js); } else { missing.push(js); }
      }
      const score = Math.round((matchCount / jobSkillsLower.length) * 100);
      return { resumeId: resume.id, label: resume.label, isPrimary: resume.isPrimary, score, matched, missing, totalSkills: jobSkillsLower.length };
    })
    .sort((a, b) => b.score - a.score);

  return results;
}
