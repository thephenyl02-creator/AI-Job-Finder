import type { EditorSections, RequirementItem, ToConfirmItem, EditorPayload, ResumeEditorVersion } from "@shared/schema";
import { resumeIntakeAgent } from "./resume-intake-agent";
import { requirementMappingAgent } from "./requirement-mapping-agent";
import { rewriteAgent, applyRewrite } from "./rewrite-agent";
import { generateDocx, generatePdf, generateApplyPack } from "./export-agent";

export interface OrchestratorInput {
  resumeExtractedData: any;
  resumeText?: string;
  existingVersion?: ResumeEditorVersion | null;
  jobId: number;
  jobTitle: string;
  jobCompany: string;
  jobDescription: string;
  jobRequirements?: string;
  careerContext?: { strengths: { label: string; evidence: string }[]; gaps: { label: string; suggestion: string }[] } | null;
}

export interface OrchestratorResult {
  sections: EditorSections;
  jobRequirements: RequirementItem[];
  toConfirmItems: ToConfirmItem[];
  readyToApply: "yes" | "almost" | "not_yet";
  counts: {
    improvementsApplied: number;
    needsConfirmation: number;
    missingRequirements: number;
  };
}

export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorResult> {
  const traceId = Math.random().toString(36).substring(2, 10);
  console.log(`[Orchestrator:${traceId}] Starting for job ${input.jobId}`);

  if (input.existingVersion && input.existingVersion.sections) {
    console.log(`[Orchestrator:${traceId}] Using existing version ${input.existingVersion.versionNumber}`);
    const existingSections = input.existingVersion.sections as EditorSections;
    const existingMapping = (input.existingVersion.requirementMapping as RequirementItem[]) || [];
    const existingConfirm = (input.existingVersion.toConfirmItems as ToConfirmItem[]) || [];

    return {
      sections: existingSections,
      jobRequirements: existingMapping,
      toConfirmItems: existingConfirm,
      readyToApply: (input.existingVersion.readyToApply as "yes" | "almost" | "not_yet") || "not_yet",
      counts: {
        improvementsApplied: input.existingVersion.improvementsApplied || 0,
        needsConfirmation: input.existingVersion.needsConfirmationCount || 0,
        missingRequirements: input.existingVersion.missingRequirementsCount || 0,
      },
    };
  }

  let sections: EditorSections;
  let intakeConfirmItems: ToConfirmItem[] = [];

  try {
    console.log(`[Orchestrator:${traceId}] Step 1: Resume Intake`);
    const intake = await withTimeout(
      resumeIntakeAgent(input.resumeExtractedData, input.resumeText),
      15000,
      "ResumeIntakeAgent"
    );
    sections = intake.sections;
    intakeConfirmItems = intake.toConfirmItems;
  } catch (err) {
    console.error(`[Orchestrator:${traceId}] Intake failed:`, err);
    sections = getEmptySections();
  }

  let jobRequirements: RequirementItem[] = [];
  try {
    console.log(`[Orchestrator:${traceId}] Step 2: Requirement Mapping`);
    jobRequirements = await withTimeout(
      requirementMappingAgent(input.jobDescription, input.jobRequirements, sections),
      15000,
      "RequirementMappingAgent"
    );
  } catch (err) {
    console.error(`[Orchestrator:${traceId}] Requirement mapping failed:`, err);
  }

  try {
    console.log(`[Orchestrator:${traceId}] Step 3: Unified Rewrite`);
    const rewrite = await withTimeout(
      rewriteAgent(sections, input.jobDescription, input.jobRequirements, input.jobTitle, input.jobCompany, input.careerContext),
      25000,
      "RewriteAgent"
    );
    sections = applyRewrite(sections, rewrite);
    if (!rewrite.summary && rewrite.experience.length === 0) {
      sections.rewriteWarning = "We couldn't fully tailor your resume. Your original content is shown — you can edit everything directly.";
    }
  } catch (err: any) {
    console.error(`[Orchestrator:${traceId}] Rewrite failed:`, err);
    const isTimeout = err?.message?.includes("timed out");
    sections.rewriteWarning = isTimeout
      ? "Tailoring took too long and was skipped. Your original resume is shown — you can edit everything directly."
      : "Tailoring encountered an error. Your original resume is shown — you can edit everything directly.";
  }

  const missingRequirements = jobRequirements.filter(r => r.coverage === "missing").length;
  const improvementsApplied = sections.changedCount || 0;
  const needsConfirmation = countUngrounded(sections);

  let readyToApply: "yes" | "almost" | "not_yet" = "not_yet";
  if (missingRequirements === 0 && needsConfirmation === 0) readyToApply = "yes";
  else if (missingRequirements <= 2 && needsConfirmation <= 3) readyToApply = "almost";

  console.log(`[Orchestrator:${traceId}] Complete. Ready: ${readyToApply}, Improvements: ${improvementsApplied}, Ungrounded: ${needsConfirmation}`);

  return {
    sections,
    jobRequirements,
    toConfirmItems: intakeConfirmItems.slice(0, 5),
    readyToApply,
    counts: {
      improvementsApplied,
      needsConfirmation,
      missingRequirements,
    },
  };
}

function countUngrounded(sections: EditorSections): number {
  let count = 0;
  if (sections.summaryGrounded === false) count++;
  for (const exp of sections.experience) {
    for (const b of exp.bullets) {
      if (b.grounded === false && !b.reverted) count++;
    }
  }
  return count;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[${label}] timed out after ${ms}ms`)), ms);
    promise.then(
      (result) => { clearTimeout(timer); resolve(result); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

function getEmptySections(): EditorSections {
  return {
    contact: { fullName: "", email: "", phone: "", location: "" },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    certifications: [],
  };
}

export { generateDocx, generatePdf, generateApplyPack };
