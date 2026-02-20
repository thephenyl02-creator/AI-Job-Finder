import type { EditorSections, ToConfirmItem } from "@shared/schema";
import { getOpenAIClient } from "../openai-client";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export interface VerificationResult {
  readyToApply: "yes" | "almost" | "not_yet";
  improvementsApplied: number;
  needsConfirmation: number;
  missingRequirements: number;
  toConfirmItems: ToConfirmItem[];
  sections: EditorSections;
}

export async function honestyVerifierAgent(
  sections: EditorSections,
  originalSections: EditorSections | null,
  missingRequirementsCount: number
): Promise<VerificationResult> {
  let improvementsApplied = 0;
  let needsConfirmation = 0;
  const toConfirmItems: ToConfirmItem[] = [];

  const updatedSections = { ...sections };

  for (const exp of updatedSections.experience) {
    for (const bullet of exp.bullets) {
      if (bullet.status === "accepted" && bullet.suggestion) {
        improvementsApplied++;
      }
      if (bullet.status === "needs_confirmation" || !bullet.grounded) {
        needsConfirmation++;
      }
    }
  }

  if (updatedSections.summarySuggestionStatus === "accepted") {
    improvementsApplied++;
  }
  if (updatedSections.summarySuggestionStatus === "needs_confirmation" || updatedSections.summarySuggestionGrounded === false) {
    needsConfirmation++;
  }

  try {
    const flaggedItems = await runHonestyCheck(updatedSections, originalSections);
    for (const item of flaggedItems) {
      if (toConfirmItems.length < 5) {
        toConfirmItems.push(item);
        needsConfirmation++;
      }
    }
  } catch (err) {
    console.error("[HonestyVerifierAgent] AI check failed, using local check:", err);
    const localFlags = runLocalHonestyCheck(updatedSections);
    toConfirmItems.push(...localFlags.slice(0, 5));
    needsConfirmation += localFlags.length;
  }

  const atsIssues = checkATSSafety(updatedSections);
  for (const issue of atsIssues) {
    if (toConfirmItems.length < 5) {
      toConfirmItems.push(issue);
    }
  }

  let readyToApply: "yes" | "almost" | "not_yet" = "not_yet";

  const hasContact = updatedSections.contact.fullName && updatedSections.contact.email;
  const hasSummary = updatedSections.summary.length > 20;
  const hasExperience = updatedSections.experience.length > 0;
  const structurallyComplete = hasContact && hasSummary && hasExperience;

  if (structurallyComplete && needsConfirmation === 0 && atsIssues.length === 0) {
    readyToApply = "yes";
  } else if (structurallyComplete && needsConfirmation <= 3 && atsIssues.length === 0) {
    readyToApply = "almost";
  }

  return {
    readyToApply,
    improvementsApplied,
    needsConfirmation,
    missingRequirements: missingRequirementsCount,
    toConfirmItems: toConfirmItems.slice(0, 5),
    sections: updatedSections,
  };
}

async function runHonestyCheck(
  sections: EditorSections,
  original: EditorSections | null
): Promise<ToConfirmItem[]> {
  if (!original) return [];

  const openai = getOpenAIClient();
  
  const changes: string[] = [];
  for (let i = 0; i < sections.experience.length; i++) {
    const exp = sections.experience[i];
    const origExp = original.experience[i];
    if (!origExp) continue;
    
    for (let j = 0; j < exp.bullets.length; j++) {
      const bullet = exp.bullets[j];
      const origBullet = origExp.bullets[j];
      if (!origBullet) continue;
      
      const currentText = bullet.status === "accepted" && bullet.suggestion ? bullet.suggestion : bullet.text;
      if (currentText !== origBullet.text) {
        changes.push(`Original: "${origBullet.text}" → Current: "${currentText}" (at experience.${i}.bullets.${j})`);
      }
    }
  }

  if (changes.length === 0) return [];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Check if resume changes contain overhyped or invented claims. Flag items where:
- Specific metrics/numbers were added that weren't in the original
- Job titles, employers, or degrees were changed
- Claims seem significantly inflated beyond what's reasonable

Return JSON:
{
  "flagged": [
    { "path": "experience.0.bullets.2", "reason": "Added specific metric '$2M revenue' not in original", "severity": "high" }
  ]
}

Only flag genuinely suspicious changes. Rewording for clarity or adding relevant keywords is fine.`
      },
      {
        role: "user",
        content: `Changes to verify:\n${changes.slice(0, 10).join("\n")}`
      }
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0]?.message?.content || '{"flagged":[]}');

  return (result.flagged || []).slice(0, 5).map((f: any) => ({
    id: generateId(),
    prompt: f.reason || "Please verify this claim is accurate",
    fieldsToFill: [f.path || "unknown"],
    severity: f.severity === "high" ? "high" : f.severity === "low" ? "low" : "medium",
    resolved: false,
  }));
}

function runLocalHonestyCheck(sections: EditorSections): ToConfirmItem[] {
  const items: ToConfirmItem[] = [];

  for (let i = 0; i < sections.experience.length; i++) {
    const exp = sections.experience[i];
    if (!exp.company) {
      items.push({
        id: generateId(),
        prompt: `Company name is missing for position "${exp.title}"`,
        fieldsToFill: [`experience.${i}.company`],
        severity: "high",
        resolved: false,
      });
    }
    if (!exp.startDate) {
      items.push({
        id: generateId(),
        prompt: `Start date missing for "${exp.title}" at "${exp.company}"`,
        fieldsToFill: [`experience.${i}.startDate`],
        severity: "medium",
        resolved: false,
      });
    }
  }

  return items;
}

function checkATSSafety(sections: EditorSections): ToConfirmItem[] {
  const issues: ToConfirmItem[] = [];

  if (!sections.contact.fullName) {
    issues.push({
      id: generateId(),
      prompt: "Full name is required for ATS compatibility",
      fieldsToFill: ["contact.fullName"],
      severity: "high",
      resolved: false,
    });
  }

  if (!sections.contact.email) {
    issues.push({
      id: generateId(),
      prompt: "Email address is required for ATS compatibility",
      fieldsToFill: ["contact.email"],
      severity: "high",
      resolved: false,
    });
  }

  if (sections.experience.length === 0) {
    issues.push({
      id: generateId(),
      prompt: "At least one work experience entry is needed",
      fieldsToFill: ["experience"],
      severity: "high",
      resolved: false,
    });
  }

  return issues;
}
