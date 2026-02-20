import type { EditorSections, RequirementItem, ToConfirmItem, EditorPayload, ResumeEditorVersion } from "@shared/schema";
import { resumeIntakeAgent } from "./resume-intake-agent";
import { requirementMappingAgent } from "./requirement-mapping-agent";
import { modelResumeAgent } from "./model-resume-agent";
import { honestyVerifierAgent } from "./honesty-verifier-agent";
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
  mode: "my" | "model";
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
  console.log(`[Orchestrator:${traceId}] Starting for job ${input.jobId}, mode=${input.mode}`);

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

  const originalSections = JSON.parse(JSON.stringify(sections));

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

  if (input.mode === "model") {
    try {
      console.log(`[Orchestrator:${traceId}] Step 3: Model Resume Generation`);
      sections = await withTimeout(
        modelResumeAgent(sections, input.jobDescription, input.jobRequirements, input.jobTitle, input.jobCompany),
        20000,
        "ModelResumeAgent"
      );
    } catch (err) {
      console.error(`[Orchestrator:${traceId}] Model resume failed:`, err);
    }
  }

  let readyToApply: "yes" | "almost" | "not_yet" = "not_yet";
  let improvementsApplied = 0;
  let needsConfirmation = 0;
  const missingRequirements = jobRequirements.filter(r => r.coverage === "missing").length;
  let allConfirmItems = [...intakeConfirmItems];

  try {
    console.log(`[Orchestrator:${traceId}] Step 4: Honesty Verification`);
    const verification = await withTimeout(
      honestyVerifierAgent(sections, originalSections, missingRequirements),
      10000,
      "HonestyVerifierAgent"
    );
    readyToApply = verification.readyToApply;
    improvementsApplied = verification.improvementsApplied;
    needsConfirmation = verification.needsConfirmation;
    allConfirmItems = [...intakeConfirmItems, ...verification.toConfirmItems];
    sections = verification.sections;
  } catch (err) {
    console.error(`[Orchestrator:${traceId}] Verification failed:`, err);
  }

  console.log(`[Orchestrator:${traceId}] Complete. Ready: ${readyToApply}, Improvements: ${improvementsApplied}, Confirm: ${needsConfirmation}`);

  return {
    sections,
    jobRequirements,
    toConfirmItems: allConfirmItems.slice(0, 5),
    readyToApply,
    counts: {
      improvementsApplied,
      needsConfirmation,
      missingRequirements,
    },
  };
}

export async function runVerificationOnly(
  sections: EditorSections,
  originalSections: EditorSections | null,
  jobRequirements: RequirementItem[]
): Promise<{
  readyToApply: "yes" | "almost" | "not_yet";
  counts: { improvementsApplied: number; needsConfirmation: number; missingRequirements: number };
  toConfirmItems: ToConfirmItem[];
}> {
  const missingRequirements = jobRequirements.filter(r => r.coverage === "missing").length;

  try {
    const verification = await withTimeout(
      honestyVerifierAgent(sections, originalSections, missingRequirements),
      10000,
      "HonestyVerifierAgent"
    );
    return {
      readyToApply: verification.readyToApply,
      counts: {
        improvementsApplied: verification.improvementsApplied,
        needsConfirmation: verification.needsConfirmation,
        missingRequirements,
      },
      toConfirmItems: verification.toConfirmItems,
    };
  } catch (err) {
    console.error("[Orchestrator] Verification-only failed:", err);
    return {
      readyToApply: "not_yet",
      counts: { improvementsApplied: 0, needsConfirmation: 0, missingRequirements },
      toConfirmItems: [],
    };
  }
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
