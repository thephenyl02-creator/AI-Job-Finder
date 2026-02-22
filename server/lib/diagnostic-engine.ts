import { getOpenAIClient } from "./openai-client";
import type { Job, ResumeExtractedData, SkillCluster, CareerPath, ReadinessRole, TransitionWeek, DiagnosticReportData } from "@shared/schema";
import { JOB_TAXONOMY } from "@shared/schema";

const SKILL_CLUSTERS = [
  "Legal Domain Expertise",
  "Legal Ops & Process",
  "Product Thinking",
  "Data & Analytics",
  "AI Literacy",
  "Technical Tools",
  "Stakeholder & Leadership",
] as const;

const AI_KEYWORDS = ["llm", "gpt", "ai", "machine learning", "ml", "natural language", "nlp", "rag", "prompt", "agents", "chatbot", "generative", "deep learning", "neural", "transformer", "openai", "langchain", "vector", "embedding"];
const CODING_KEYWORDS = ["python", "sql", "javascript", "typescript", "java", "coding", "programming", "software engineer", "developer", "api", "github", "code review", "react", "node"];

export function computeAIIntensity(job: Job): "Low" | "Med" | "High" {
  const text = `${job.title} ${job.description} ${(job.keySkills || []).join(" ")} ${(job.aiQualifications || []).join(" ")}`.toLowerCase();
  let count = 0;
  for (const kw of AI_KEYWORDS) {
    if (text.includes(kw)) count++;
  }
  if (count >= 4) return "High";
  if (count >= 2) return "Med";
  return "Low";
}

export function computeTransitionDifficulty(job: Job): "Easy" | "Medium" | "Hard" {
  const text = `${job.title} ${job.description} ${(job.keySkills || []).join(" ")}`.toLowerCase();
  let difficulty = 0;

  const aiIntensity = computeAIIntensity(job);
  if (aiIntensity === "High") difficulty += 3;
  else if (aiIntensity === "Med") difficulty += 1;

  let codingRequired = false;
  for (const kw of CODING_KEYWORDS) {
    if (text.includes(kw)) { codingRequired = true; break; }
  }
  if (codingRequired) difficulty += 2;

  const seniority = (job.seniorityLevel || "").toLowerCase();
  if (seniority.includes("senior") || seniority.includes("lead") || seniority.includes("director")) difficulty += 1;

  if (difficulty >= 4) return "Hard";
  if (difficulty >= 2) return "Medium";
  return "Easy";
}

export function computeJDRequirement(job: Job): "JD Required" | "JD Preferred" | "Not Required" {
  const text = `${job.description} ${job.requirements || ""} ${(job.aiQualifications || []).join(" ")}`.toLowerCase();
  if (text.includes("jd required") || text.includes("law degree required") || text.includes("must have a jd") || text.includes("bar admission required") || text.includes("active bar")) return "JD Required";
  if (text.includes("jd preferred") || text.includes("law degree preferred") || text.includes("legal background") || text.includes("legal experience") || text.includes("attorney") || text.includes("counsel")) return "JD Preferred";
  return "Not Required";
}

function buildResumeSignal(extracted: ResumeExtractedData): string {
  const parts: string[] = [];
  if (extracted.summary) parts.push(`Summary: ${extracted.summary}`);
  if (extracted.experience?.length) {
    const expLines = extracted.experience.slice(0, 8).map(
      (e) => `- ${e.title} at ${e.company} (${e.duration}): ${e.description?.slice(0, 300) || ""}`
    );
    parts.push(`Experience:\n${expLines.join("\n")}`);
  }
  if (extracted.skills?.length) parts.push(`Skills: ${extracted.skills.join(", ")}`);
  if (extracted.education?.length) {
    const eduLines = extracted.education.map((e) => `- ${e.degree}, ${e.institution} (${e.year})`);
    parts.push(`Education:\n${eduLines.join("\n")}`);
  }
  if (extracted.totalYearsExperience) parts.push(`Total Years: ${extracted.totalYearsExperience}`);
  return parts.join("\n\n");
}

export async function generateDiagnosticReport(
  resumeExtracted: ResumeExtractedData,
  allJobs: Job[],
  targetPath?: string,
): Promise<DiagnosticReportData> {
  const openai = getOpenAIClient();
  const resumeSignal = buildResumeSignal(resumeExtracted);

  const categories = Object.keys(JOB_TAXONOMY);
  const categoryCountMap: Record<string, number> = {};
  for (const job of allJobs) {
    if (job.roleCategory) {
      categoryCountMap[job.roleCategory] = (categoryCountMap[job.roleCategory] || 0) + 1;
    }
  }

  const skillDemand: Record<string, number> = {};
  for (const job of allJobs) {
    for (const skill of (job.keySkills || [])) {
      const s = skill.toLowerCase().trim();
      skillDemand[s] = (skillDemand[s] || 0) + 1;
    }
  }
  const topDemandSkills = Object.entries(skillDemand)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([skill, count]) => ({ skill, count }));

  const sampleJobs = allJobs
    .sort(() => Math.random() - 0.5)
    .slice(0, 30)
    .map(j => ({
      id: j.id,
      title: j.title,
      company: j.company,
      category: j.roleCategory,
      seniority: j.seniorityLevel,
      keySkills: (j.keySkills || []).slice(0, 5),
      aiIntensity: computeAIIntensity(j),
      transitionDifficulty: computeTransitionDifficulty(j),
    }));

  const prompt = `You are a career diagnostic engine for lawyers transitioning into legal tech.

RESUME:
${resumeSignal}

AVAILABLE CAREER PATHS: ${categories.join(", ")}
${targetPath ? `USER'S TARGET PATH: ${targetPath}` : ""}

TOP SKILLS IN DEMAND (from ${allJobs.length} live jobs):
${topDemandSkills.slice(0, 10).map(s => `- ${s.skill} (${s.count} jobs)`).join("\n")}

SAMPLE JOBS (${sampleJobs.length} of ${allJobs.length}):
${sampleJobs.map(j => `[${j.id}] ${j.title} @ ${j.company} | ${j.category} | ${j.seniority} | AI:${j.aiIntensity} | Difficulty:${j.transitionDifficulty} | Skills: ${j.keySkills.join(", ")}`).join("\n")}

Generate a Career Diagnostic Report. Be BRUTALLY HONEST. Respond with valid JSON matching this exact structure:

{
  "topPaths": [
    { "name": "category name from list above", "confidence": 0-100, "fitLevel": "high|medium|low", "description": "1 sentence why", "topStrengths": ["str1","str2","str3"], "topGaps": ["gap1","gap2","gap3"] }
  ],
  "skillClusters": [
    { "name": "cluster name", "score": 0-100, "evidence": ["exact quote/fact from resume proving this"], "missingSignals": ["what's missing"] }
  ],
  "readinessLadder": {
    "ready": [{ "jobId": id, "title": "...", "company": "...", "tier": "ready", "fitScore": 0-100, "topStrengths": ["..."], "topBlockers": ["..."], "whyThisTier": "..." }],
    "nearReady": [same format with tier "near_ready"],
    "stretch": [same format with tier "stretch"]
  },
  "overallReadinessScore": 0-100,
  "transitionDifficulty": { "score": 0-100, "label": "Easy|Moderate|Hard", "explanation": "why" },
  "transitionPlan": [
    { "week": 1, "theme": "...", "actions": [{ "task": "...", "timeEstimate": "2hrs", "deliverable": "...", "skillGapAddressed": "..." }] }
  ],
  "brutalHonesty": ["direct statement 1", "direct statement 2", "direct statement 3"],
  "fitBreakdown": { "skillsMatch": 0-100, "experienceMatch": 0-100, "domainMatch": 0-100, "seniorityMatch": 0-100 }
}

RULES:
- topPaths: exactly 3, from the career paths list. Rank by confidence.
- skillClusters: MUST include all 7 clusters: ${SKILL_CLUSTERS.join(", ")}. Score based on actual resume evidence.
- readinessLadder: pick real jobs from the sample list. Use actual jobId. ready = 3-5 jobs, nearReady = 3-5 jobs, stretch = 2-3 jobs.
- transitionPlan: exactly 4 weeks. Each week 2-3 specific actions tied to skill gaps.
- brutalHonesty: 3 direct, uncomfortable truths. No sugarcoating.
- fitBreakdown: weighted components summing to approximately the overallReadinessScore.
- Every score must have evidence from the resume or a gap explanation.
- DO NOT hallucinate skills the resume doesn't mention.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 4000,
  });

  const raw = JSON.parse(response.choices[0]?.message?.content || "{}");

  const userSkills = new Set((resumeExtracted.skills || []).map(s => s.toLowerCase().trim()));
  const marketDemand = topDemandSkills.slice(0, 8).map(s => ({
    skill: s.skill,
    demandCount: s.count,
    userHasIt: userSkills.has(s.skill) || Array.from(userSkills).some(us => us.includes(s.skill) || s.skill.includes(us)),
  }));

  return {
    topPaths: raw.topPaths || [],
    readinessLadder: raw.readinessLadder || { ready: [], nearReady: [], stretch: [] },
    skillClusters: raw.skillClusters || [],
    overallReadinessScore: raw.overallReadinessScore || 0,
    transitionDifficulty: raw.transitionDifficulty || { score: 50, label: "Moderate", explanation: "" },
    transitionPlan: raw.transitionPlan || [],
    brutalHonesty: raw.brutalHonesty || [],
    marketDemand,
    fitBreakdown: raw.fitBreakdown || { skillsMatch: 0, experienceMatch: 0, domainMatch: 0, seniorityMatch: 0 },
  };
}

export async function computeJobFitScore(
  resumeExtracted: ResumeExtractedData,
  job: Job,
): Promise<{
  fitScore: number;
  skillsMatch: number;
  experienceMatch: number;
  domainMatch: number;
  seniorityMatch: number;
  strengths: string[];
  gaps: string[];
  evidence: string[];
  recommendedEdits: string[];
  oneLineReason: string;
}> {
  const openai = getOpenAIClient();
  const resumeSignal = buildResumeSignal(resumeExtracted);

  const prompt = `Score this resume's fit for this specific job. Be accurate and evidence-based.

RESUME:
${resumeSignal}

JOB: ${job.title} at ${job.company}
Category: ${job.roleCategory || "Unknown"}
Seniority: ${job.seniorityLevel || "Unknown"}
Key Skills: ${(job.keySkills || []).join(", ")}
Description: ${(job.description || "").slice(0, 1500)}

Respond with JSON:
{
  "fitScore": 0-100,
  "skillsMatch": 0-100,
  "experienceMatch": 0-100,
  "domainMatch": 0-100,
  "seniorityMatch": 0-100,
  "strengths": ["matched requirement 1", "matched requirement 2", "matched requirement 3"],
  "gaps": ["missing requirement 1", "missing requirement 2", "missing requirement 3"],
  "evidence": ["resume snippet proving match 1", "resume snippet proving match 2"],
  "recommendedEdits": ["specific bullet rewrite suggestion 1", "specific bullet rewrite suggestion 2"],
  "oneLineReason": "Short explanation like 'Strong legal ops background but missing AI implementation experience'"
}

RULES:
- fitScore should be weighted: 35% skillsMatch + 30% experienceMatch + 20% domainMatch + 15% seniorityMatch
- strengths = requirements this resume ACTUALLY meets (with evidence)
- gaps = requirements this resume is MISSING
- evidence = direct quotes or facts from the resume
- recommendedEdits = specific resume bullet rewrites to improve score
- Be honest. Don't inflate scores.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 1500,
  });

  const raw = JSON.parse(response.choices[0]?.message?.content || "{}");
  return {
    fitScore: raw.fitScore || 0,
    skillsMatch: raw.skillsMatch || 0,
    experienceMatch: raw.experienceMatch || 0,
    domainMatch: raw.domainMatch || 0,
    seniorityMatch: raw.seniorityMatch || 0,
    strengths: raw.strengths || [],
    gaps: raw.gaps || [],
    evidence: raw.evidence || [],
    recommendedEdits: raw.recommendedEdits || [],
    oneLineReason: raw.oneLineReason || "",
  };
}

export async function batchComputeJobFits(
  resumeExtracted: ResumeExtractedData,
  jobs: Job[],
): Promise<Array<{
  jobId: number;
  fitScore: number;
  skillsMatch: number;
  experienceMatch: number;
  domainMatch: number;
  seniorityMatch: number;
  strengths: string[];
  gaps: string[];
  oneLineReason: string;
  aiIntensity: string;
  transitionDifficulty: string;
}>> {
  const openai = getOpenAIClient();
  const resumeSignal = buildResumeSignal(resumeExtracted);

  const jobSummaries = jobs.slice(0, 20).map(j => ({
    id: j.id,
    title: j.title,
    company: j.company,
    category: j.roleCategory || "Unknown",
    seniority: j.seniorityLevel || "Unknown",
    keySkills: (j.keySkills || []).slice(0, 5).join(", "),
    aiIntensity: computeAIIntensity(j),
    transitionDifficulty: computeTransitionDifficulty(j),
  }));

  const prompt = `Score this resume's fit against each job. Be accurate.

RESUME:
${resumeSignal}

JOBS:
${jobSummaries.map(j => `[${j.id}] ${j.title} @ ${j.company} | ${j.category} | ${j.seniority} | Skills: ${j.keySkills}`).join("\n")}

Respond with JSON array:
{
  "results": [
    {
      "jobId": number,
      "fitScore": 0-100,
      "skillsMatch": 0-100,
      "experienceMatch": 0-100,
      "domainMatch": 0-100,
      "seniorityMatch": 0-100,
      "strengths": ["top strength"],
      "gaps": ["top gap"],
      "oneLineReason": "short explanation"
    }
  ]
}

fitScore = 35% skills + 30% experience + 20% domain + 15% seniority. Be honest, don't inflate.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 3000,
  });

  const raw = JSON.parse(response.choices[0]?.message?.content || "{}");
  const results = raw.results || [];

  return results.map((r: any) => {
    const job = jobs.find(j => j.id === r.jobId);
    return {
      jobId: r.jobId,
      fitScore: r.fitScore || 0,
      skillsMatch: r.skillsMatch || 0,
      experienceMatch: r.experienceMatch || 0,
      domainMatch: r.domainMatch || 0,
      seniorityMatch: r.seniorityMatch || 0,
      strengths: r.strengths || [],
      gaps: r.gaps || [],
      oneLineReason: r.oneLineReason || "",
      aiIntensity: job ? computeAIIntensity(job) : "Low",
      transitionDifficulty: job ? computeTransitionDifficulty(job) : "Medium",
    };
  });
}
