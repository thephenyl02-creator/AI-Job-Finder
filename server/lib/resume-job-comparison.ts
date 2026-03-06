import type { ResumeExtractedData } from "@shared/schema";
import type { Job } from "@shared/schema";
import { getOpenAIClient } from "./openai-client";

export interface SkillMatch {
  skill: string;
  status: 'match' | 'partial' | 'missing';
  resumeEvidence?: string;
}

export interface ComparisonResult {
  overallScore: number;
  matchSummary: string;
  gapAnalysis: string;
  skillsComparison: SkillMatch[];
  experienceMatch: {
    status: 'match' | 'overqualified' | 'underqualified';
    required: string;
    yours: string;
    explanation: string;
  };
  locationMatch: {
    status: 'match' | 'partial' | 'mismatch';
    jobLocation: string;
    yourPreference: string;
    explanation: string;
  };
  salaryMatch: {
    status: 'match' | 'above' | 'below' | 'unknown';
    jobRange: string;
    yourRange: string;
    explanation: string;
  };
  seniorityMatch: {
    status: 'match' | 'overqualified' | 'underqualified';
    jobLevel: string;
    yourLevel: string;
    explanation: string;
  };
  recommendations: string[];
}

export async function compareResumeToJob(
  resumeData: ResumeExtractedData,
  job: Job
): Promise<ComparisonResult> {
  const jobSkills = job.keySkills || [];
  const jobRequirements = job.requirements || job.description || '';
  
  const systemPrompt = `You are a career advisor analyzing how well a candidate's resume matches a job posting.
Compare the resume data to the job requirements and provide a detailed analysis.

Return JSON with this exact structure:
{
  "overallScore": 75,
  "matchSummary": "Brief 1-2 sentence summary of overall fit",
  "gapAnalysis": "2-3 sentences about what the candidate is missing or could improve",
  "skillsComparison": [
    {"skill": "Python", "status": "match", "resumeEvidence": "5 years experience with Python"},
    {"skill": "Contract Law", "status": "partial", "resumeEvidence": "Some legal coursework"},
    {"skill": "Machine Learning", "status": "missing"}
  ],
  "experienceMatch": {
    "status": "match",
    "required": "3-5 years",
    "yours": "4 years",
    "explanation": "Your experience aligns well with the requirements"
  },
  "locationMatch": {
    "status": "match",
    "jobLocation": "Remote",
    "yourPreference": "Open to remote",
    "explanation": "Perfect match - job offers remote work"
  },
  "salaryMatch": {
    "status": "match",
    "jobRange": "$120K-150K",
    "yourRange": "$130K-160K",
    "explanation": "Good overlap in salary expectations"
  },
  "seniorityMatch": {
    "status": "match",
    "jobLevel": "Senior",
    "yourLevel": "Senior",
    "explanation": "Your seniority aligns with the role"
  },
  "recommendations": [
    "Highlight your Python experience more prominently",
    "Consider taking a short course on contract law"
  ]
}

Rules:
- overallScore should be 0-100
- status values must be exactly as specified above
- If information is missing, make reasonable inferences or mark as "unknown"
- Be encouraging but honest
- Focus on actionable recommendations`;

  const userPrompt = `Resume Data:
${JSON.stringify(resumeData, null, 2)}

Job Posting:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Remote: ${job.isRemote ? 'Yes' : 'No'}
Salary: ${job.salaryMin && job.salaryMax ? `$${job.salaryMin.toLocaleString()}-$${job.salaryMax.toLocaleString()}` : 'Not specified'}
Experience Required: ${job.experienceMin && job.experienceMax ? `${job.experienceMin}-${job.experienceMax} years` : job.experienceMin ? `${job.experienceMin}+ years` : 'Not specified'}
Seniority: ${job.seniorityLevel || 'Not specified'}
Category: ${job.roleCategory || 'Not specified'}
Required Skills: ${jobSkills.length > 0 ? jobSkills.join(', ') : 'Not specified'}
Description: ${job.description?.substring(0, 2000) || 'Not available'}
Requirements: ${jobRequirements.substring(0, 1000) || 'Not specified'}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content) as ComparisonResult;
    return result;
  } catch (error) {
    console.error("Resume-job comparison error:", error);
    return generateFallbackComparison(resumeData, job);
  }
}

function generateFallbackComparison(
  resumeData: ResumeExtractedData,
  job: Job
): ComparisonResult {
  const resumeSkills = resumeData.skills || [];
  const jobSkills = job.keySkills || [];
  
  const skillsComparison: SkillMatch[] = jobSkills.map(skill => {
    const match = resumeSkills.some(rs => 
      rs.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(rs.toLowerCase())
    );
    return {
      skill,
      status: match ? 'match' as const : 'missing' as const,
      resumeEvidence: match ? `Found in resume skills` : undefined
    };
  });

  const matchingSkills = skillsComparison.filter(s => s.status === 'match').length;
  const skillScore = jobSkills.length > 0 ? (matchingSkills / jobSkills.length) * 100 : 50;

  let experienceStatus: 'match' | 'overqualified' | 'underqualified' = 'match';
  const yearsExp = resumeData.totalYearsExperience || 0;
  if (job.experienceMin && yearsExp < job.experienceMin) {
    experienceStatus = 'underqualified';
  } else if (job.experienceMax && yearsExp > job.experienceMax + 3) {
    experienceStatus = 'overqualified';
  }

  let locationStatus: 'match' | 'partial' | 'mismatch' = 'match';
  if (job.isRemote && resumeData.isOpenToRemote) {
    locationStatus = 'match';
  } else if (!job.isRemote && resumeData.preferredLocations?.length) {
    const jobLoc = (job.location || '').toLowerCase();
    const hasMatch = resumeData.preferredLocations.some(loc => 
      jobLoc.includes(loc.toLowerCase()) || loc.toLowerCase().includes(jobLoc)
    );
    locationStatus = hasMatch ? 'match' : 'partial';
  }

  const overallScore = Math.round((skillScore * 0.5) + (experienceStatus === 'match' ? 30 : 15) + (locationStatus === 'match' ? 20 : 10));

  return {
    overallScore: Math.min(overallScore, 100),
    matchSummary: `Based on your profile, you match ${matchingSkills} of ${jobSkills.length} required skills for this role.`,
    gapAnalysis: skillsComparison.filter(s => s.status === 'missing').length > 0 
      ? `Consider developing skills in: ${skillsComparison.filter(s => s.status === 'missing').map(s => s.skill).slice(0, 3).join(', ')}`
      : 'Your skills align well with this position.',
    skillsComparison,
    experienceMatch: {
      status: experienceStatus,
      required: job.experienceMin && job.experienceMax 
        ? `${job.experienceMin}-${job.experienceMax} years` 
        : job.experienceMin ? `${job.experienceMin}+ years` : 'Not specified',
      yours: yearsExp ? `${yearsExp} years` : 'Not specified',
      explanation: experienceStatus === 'match' 
        ? 'Your experience level aligns with this role'
        : experienceStatus === 'underqualified' 
          ? 'You may be below the experience requirements'
          : 'You exceed the experience requirements'
    },
    locationMatch: {
      status: locationStatus,
      jobLocation: job.isRemote ? 'Remote' : (job.location || 'Not specified'),
      yourPreference: resumeData.isOpenToRemote 
        ? 'Open to remote' 
        : (resumeData.preferredLocations?.join(', ') || 'Not specified'),
      explanation: locationStatus === 'match' 
        ? 'Location works for you'
        : 'Location may require consideration'
    },
    salaryMatch: {
      status: 'unknown',
      jobRange: job.salaryMin && job.salaryMax 
        ? `$${job.salaryMin.toLocaleString()}-$${job.salaryMax.toLocaleString()}` 
        : 'Not specified',
      yourRange: resumeData.desiredSalary 
        ? `$${resumeData.desiredSalary.min.toLocaleString()}-$${resumeData.desiredSalary.max.toLocaleString()}` 
        : 'Not specified',
      explanation: 'Unable to compare salary ranges'
    },
    seniorityMatch: {
      status: 'match',
      jobLevel: job.seniorityLevel || 'Not specified',
      yourLevel: 'Based on experience',
      explanation: 'Seniority appears appropriate'
    },
    recommendations: [
      'Tailor your resume to highlight relevant skills',
      'Research the company before applying'
    ]
  };
}
