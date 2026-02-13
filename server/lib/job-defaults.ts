import type { Job } from '@shared/schema';
import type { StructuredDescription } from '@shared/schema';

export function enforceJobDefaults(job: Partial<Job>): Partial<Job> {
  const result = { ...job };

  if (result.keySkills == null) result.keySkills = [];
  if (result.matchKeywords == null) result.matchKeywords = [];
  if (result.aiResponsibilities == null) result.aiResponsibilities = [];
  if (result.aiQualifications == null) result.aiQualifications = [];
  if (result.aiNiceToHaves == null) result.aiNiceToHaves = [];
  if (result.secondaryTags == null) result.secondaryTags = [];

  if (result.aiSummary == null) result.aiSummary = '';
  if (result.roleCategory == null) result.roleCategory = '';
  if (result.roleSubcategory == null) result.roleSubcategory = '';
  if (result.seniorityLevel == null) result.seniorityLevel = '';
  if (result.experienceText == null) result.experienceText = '';
  if (result.whyThisFitsLawyers == null) result.whyThisFitsLawyers = '';

  if (result.locationType == null) result.locationType = 'unknown';

  if (result.structuredDescription != null) {
    const sd = result.structuredDescription as StructuredDescription;
    result.structuredDescription = enforceStructuredDefaults(sd);
  }

  return result;
}

export function enforceStructuredDefaults(sd: Partial<StructuredDescription> | null | undefined): StructuredDescription {
  if (!sd) {
    return {
      summary: '',
      aboutCompany: '',
      responsibilities: [],
      minimumQualifications: [],
      preferredQualifications: [],
      skillsRequired: [],
      seniority: '',
      legalTechCategory: '',
    };
  }

  return {
    summary: sd.summary || '',
    aboutCompany: sd.aboutCompany || '',
    responsibilities: Array.isArray(sd.responsibilities) ? sd.responsibilities : [],
    minimumQualifications: Array.isArray(sd.minimumQualifications) ? sd.minimumQualifications : [],
    preferredQualifications: Array.isArray(sd.preferredQualifications) ? sd.preferredQualifications : [],
    skillsRequired: Array.isArray(sd.skillsRequired) ? sd.skillsRequired : [],
    seniority: sd.seniority || '',
    legalTechCategory: sd.legalTechCategory || '',
    aiRelevanceScore: sd.aiRelevanceScore || '',
    lawyerTransitionFriendly: sd.lawyerTransitionFriendly || false,
    lawyerTransitionNotes: Array.isArray(sd.lawyerTransitionNotes) ? sd.lawyerTransitionNotes : [],
  };
}
