import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BuiltResume, ResumeSections, Job } from "@shared/schema";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  FileText,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  Award,
  AlignLeft,
  Target,
  Zap,
  Upload,
  Pencil,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  CheckCircle,
  Clock,
  Crown,
  Sparkles,
  BarChart3,
  Shield,
} from "lucide-react";

const EMPTY_SECTIONS: ResumeSections = {
  contact: { fullName: "", email: "", phone: "", location: "", linkedin: "", website: "" },
  summary: "",
  experience: [],
  education: [],
  skills: { technical: [], legal: [], soft: [] },
  certifications: [],
};

const SECTION_NAV = [
  { key: "contact", label: "Contact", icon: User },
  { key: "summary", label: "Summary", icon: AlignLeft },
  { key: "experience", label: "Experience", icon: Briefcase },
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "skills", label: "Skills", icon: Wrench },
  { key: "certifications", label: "Certifications", icon: Award },
] as const;

type SectionKey = (typeof SECTION_NAV)[number]["key"];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function ATSScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const getColor = () => {
    if (score >= 80) return "text-green-500 dark:text-green-400";
    if (score >= 60) return "text-yellow-500 dark:text-yellow-400";
    return "text-red-500 dark:text-red-400";
  };
  const getStroke = () => {
    if (score >= 80) return "stroke-green-500 dark:stroke-green-400";
    if (score >= 60) return "stroke-yellow-500 dark:stroke-yellow-400";
    return "stroke-red-500 dark:stroke-red-400";
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={6}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-700 ease-out ${getStroke()}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold ${getColor()}`} data-testid="text-ats-score">{score}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ATS</span>
      </div>
    </div>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const styles: Record<string, string> = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[impact] || styles.low}`}>
      {impact}
    </span>
  );
}

function ContactEditor({
  sections,
  onChange,
}: {
  sections: ResumeSections;
  onChange: (s: ResumeSections) => void;
}) {
  const update = (field: keyof ResumeSections["contact"], value: string) => {
    onChange({ ...sections, contact: { ...sections.contact, [field]: value } });
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
        <Input
          value={sections.contact.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          placeholder="Jane Smith"
          data-testid="input-contact-fullname"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
          <Input
            type="email"
            value={sections.contact.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="jane@example.com"
            data-testid="input-contact-email"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
          <Input
            value={sections.contact.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="(555) 123-4567"
            data-testid="input-contact-phone"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Location</label>
        <Input
          value={sections.contact.location}
          onChange={(e) => update("location", e.target.value)}
          placeholder="New York, NY"
          data-testid="input-contact-location"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">LinkedIn</label>
          <Input
            value={sections.contact.linkedin || ""}
            onChange={(e) => update("linkedin", e.target.value)}
            placeholder="linkedin.com/in/janesmith"
            data-testid="input-contact-linkedin"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Website</label>
          <Input
            value={sections.contact.website || ""}
            onChange={(e) => update("website", e.target.value)}
            placeholder="janesmith.com"
            data-testid="input-contact-website"
          />
        </div>
      </div>
    </div>
  );
}

function SummaryEditor({
  sections,
  onChange,
  isPro,
  onAiAssist,
  isAiLoading,
}: {
  sections: ResumeSections;
  onChange: (s: ResumeSections) => void;
  isPro: boolean;
  onAiAssist: (section: string, content: string) => void;
  isAiLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <Textarea
        value={sections.summary}
        onChange={(e) => onChange({ ...sections, summary: e.target.value })}
        placeholder="Write a compelling professional summary highlighting your legal technology expertise, key achievements, and career objectives..."
        rows={8}
        className="text-sm leading-relaxed"
        data-testid="textarea-summary"
      />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {sections.summary.length} characters
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAiAssist("summary", sections.summary)}
          disabled={isAiLoading}
          data-testid="button-ai-assist-summary"
        >
          {isAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
          {isPro ? "AI Assist" : "AI Assist (Pro)"}
        </Button>
      </div>
    </div>
  );
}

function ExperienceEditor({
  sections,
  onChange,
  isPro,
  onAiAssist,
  isAiLoading,
}: {
  sections: ResumeSections;
  onChange: (s: ResumeSections) => void;
  isPro: boolean;
  onAiAssist: (section: string, content: string) => void;
  isAiLoading: boolean;
}) {
  const addEntry = () => {
    onChange({
      ...sections,
      experience: [
        ...sections.experience,
        { id: generateId(), title: "", company: "", location: "", startDate: "", endDate: "", current: false, bullets: [""] },
      ],
    });
  };

  const updateEntry = (idx: number, field: string, value: any) => {
    const updated = [...sections.experience];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ ...sections, experience: updated });
  };

  const removeEntry = (idx: number) => {
    onChange({ ...sections, experience: sections.experience.filter((_, i) => i !== idx) });
  };

  const addBullet = (idx: number) => {
    const updated = [...sections.experience];
    updated[idx] = { ...updated[idx], bullets: [...updated[idx].bullets, ""] };
    onChange({ ...sections, experience: updated });
  };

  const updateBullet = (entryIdx: number, bulletIdx: number, value: string) => {
    const updated = [...sections.experience];
    const bullets = [...updated[entryIdx].bullets];
    bullets[bulletIdx] = value;
    updated[entryIdx] = { ...updated[entryIdx], bullets };
    onChange({ ...sections, experience: updated });
  };

  const removeBullet = (entryIdx: number, bulletIdx: number) => {
    const updated = [...sections.experience];
    updated[entryIdx] = {
      ...updated[entryIdx],
      bullets: updated[entryIdx].bullets.filter((_, i) => i !== bulletIdx),
    };
    onChange({ ...sections, experience: updated });
  };

  return (
    <div className="space-y-6">
      {sections.experience.map((exp, idx) => (
        <div key={exp.id} className="border border-border/60 rounded-md p-4 space-y-4" data-testid={`experience-entry-${idx}`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h4 className="text-sm font-medium text-foreground">
              {exp.title || exp.company ? `${exp.title}${exp.company ? ` at ${exp.company}` : ""}` : `Position ${idx + 1}`}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeEntry(idx)}
              data-testid={`button-remove-experience-${idx}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Job Title</label>
              <Input value={exp.title} onChange={(e) => updateEntry(idx, "title", e.target.value)} placeholder="Legal Technology Manager" data-testid={`input-exp-title-${idx}`} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Company</label>
              <Input value={exp.company} onChange={(e) => updateEntry(idx, "company", e.target.value)} placeholder="Smith & Associates LLP" data-testid={`input-exp-company-${idx}`} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
              <Input value={exp.location} onChange={(e) => updateEntry(idx, "location", e.target.value)} placeholder="New York, NY" data-testid={`input-exp-location-${idx}`} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
              <Input value={exp.startDate} onChange={(e) => updateEntry(idx, "startDate", e.target.value)} placeholder="Jan 2022" data-testid={`input-exp-startdate-${idx}`} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
              <div className="flex items-center gap-2">
                <Input
                  value={exp.current ? "Present" : exp.endDate}
                  onChange={(e) => updateEntry(idx, "endDate", e.target.value)}
                  placeholder="Present"
                  disabled={exp.current}
                  data-testid={`input-exp-enddate-${idx}`}
                />
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={exp.current}
              onChange={(e) => updateEntry(idx, "current", e.target.checked)}
              className="rounded border-border"
              data-testid={`checkbox-exp-current-${idx}`}
            />
            I currently work here
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="text-xs font-medium text-muted-foreground">Bullet Points</label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => addBullet(idx)} data-testid={`button-add-bullet-${idx}`}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAiAssist("experience", JSON.stringify(exp))}
                  disabled={isAiLoading}
                  data-testid={`button-ai-bullets-${idx}`}
                >
                  {isAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  {isPro ? "AI Suggest" : "AI (Pro)"}
                </Button>
              </div>
            </div>
            {exp.bullets.map((bullet, bIdx) => (
              <div key={bIdx} className="flex items-start gap-2">
                <span className="text-muted-foreground text-xs mt-2.5 shrink-0">-</span>
                <Input
                  value={bullet}
                  onChange={(e) => updateBullet(idx, bIdx, e.target.value)}
                  placeholder="Describe your accomplishment..."
                  className="flex-1"
                  data-testid={`input-bullet-${idx}-${bIdx}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBullet(idx, bIdx)}
                  data-testid={`button-remove-bullet-${idx}-${bIdx}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={addEntry} className="w-full" data-testid="button-add-experience">
        <Plus className="h-4 w-4 mr-2" />
        Add Experience
      </Button>
    </div>
  );
}

function EducationEditor({
  sections,
  onChange,
}: {
  sections: ResumeSections;
  onChange: (s: ResumeSections) => void;
}) {
  const addEntry = () => {
    onChange({
      ...sections,
      education: [
        ...sections.education,
        { id: generateId(), institution: "", degree: "", field: "", graduationDate: "", honors: "" },
      ],
    });
  };

  const updateEntry = (idx: number, field: string, value: string) => {
    const updated = [...sections.education];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ ...sections, education: updated });
  };

  const removeEntry = (idx: number) => {
    onChange({ ...sections, education: sections.education.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      {sections.education.map((edu, idx) => (
        <div key={edu.id} className="border border-border/60 rounded-md p-4 space-y-3" data-testid={`education-entry-${idx}`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h4 className="text-sm font-medium text-foreground">
              {edu.institution || `Education ${idx + 1}`}
            </h4>
            <Button variant="ghost" size="icon" onClick={() => removeEntry(idx)} data-testid={`button-remove-education-${idx}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Institution</label>
            <Input value={edu.institution} onChange={(e) => updateEntry(idx, "institution", e.target.value)} placeholder="Harvard Law School" data-testid={`input-edu-institution-${idx}`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Degree</label>
              <Input value={edu.degree} onChange={(e) => updateEntry(idx, "degree", e.target.value)} placeholder="Juris Doctor" data-testid={`input-edu-degree-${idx}`} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Field of Study</label>
              <Input value={edu.field} onChange={(e) => updateEntry(idx, "field", e.target.value)} placeholder="Legal Technology" data-testid={`input-edu-field-${idx}`} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Graduation Date</label>
              <Input value={edu.graduationDate} onChange={(e) => updateEntry(idx, "graduationDate", e.target.value)} placeholder="May 2020" data-testid={`input-edu-graddate-${idx}`} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Honors</label>
              <Input value={edu.honors || ""} onChange={(e) => updateEntry(idx, "honors", e.target.value)} placeholder="Magna Cum Laude" data-testid={`input-edu-honors-${idx}`} />
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={addEntry} className="w-full" data-testid="button-add-education">
        <Plus className="h-4 w-4 mr-2" />
        Add Education
      </Button>
    </div>
  );
}

function SkillsEditor({
  sections,
  onChange,
}: {
  sections: ResumeSections;
  onChange: (s: ResumeSections) => void;
}) {
  const [inputs, setInputs] = useState({ technical: "", legal: "", soft: "" });

  const addSkill = (category: "technical" | "legal" | "soft") => {
    const val = inputs[category].trim();
    if (!val) return;
    if (sections.skills[category].includes(val)) return;
    onChange({
      ...sections,
      skills: { ...sections.skills, [category]: [...sections.skills[category], val] },
    });
    setInputs((prev) => ({ ...prev, [category]: "" }));
  };

  const removeSkill = (category: "technical" | "legal" | "soft", idx: number) => {
    onChange({
      ...sections,
      skills: {
        ...sections.skills,
        [category]: sections.skills[category].filter((_, i) => i !== idx),
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, category: "technical" | "legal" | "soft") => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill(category);
    }
  };

  const renderColumn = (category: "technical" | "legal" | "soft", label: string) => (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">{label}</h4>
      <div className="flex items-center gap-2">
        <Input
          value={inputs[category]}
          onChange={(e) => setInputs((prev) => ({ ...prev, [category]: e.target.value }))}
          onKeyDown={(e) => handleKeyDown(e, category)}
          placeholder="Type and press Enter"
          data-testid={`input-skill-${category}`}
        />
        <Button variant="ghost" size="icon" onClick={() => addSkill(category)} data-testid={`button-add-skill-${category}`}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sections.skills[category].map((skill, idx) => (
          <Badge
            key={idx}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => removeSkill(category, idx)}
            data-testid={`badge-skill-${category}-${idx}`}
          >
            {skill}
            <X className="h-3 w-3 ml-1" />
          </Badge>
        ))}
        {sections.skills[category].length === 0 && (
          <p className="text-xs text-muted-foreground">No skills added yet</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {renderColumn("technical", "Technical Skills")}
      {renderColumn("legal", "Legal Skills")}
      {renderColumn("soft", "Soft Skills")}
    </div>
  );
}

function CertificationsEditor({
  sections,
  onChange,
}: {
  sections: ResumeSections;
  onChange: (s: ResumeSections) => void;
}) {
  const addEntry = () => {
    onChange({
      ...sections,
      certifications: [
        ...sections.certifications,
        { id: generateId(), name: "", issuer: "", date: "" },
      ],
    });
  };

  const updateEntry = (idx: number, field: string, value: string) => {
    const updated = [...sections.certifications];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ ...sections, certifications: updated });
  };

  const removeEntry = (idx: number) => {
    onChange({ ...sections, certifications: sections.certifications.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      {sections.certifications.map((cert, idx) => (
        <div key={cert.id} className="border border-border/60 rounded-md p-4 space-y-3" data-testid={`certification-entry-${idx}`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h4 className="text-sm font-medium text-foreground">{cert.name || `Certification ${idx + 1}`}</h4>
            <Button variant="ghost" size="icon" onClick={() => removeEntry(idx)} data-testid={`button-remove-cert-${idx}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
            <Input value={cert.name} onChange={(e) => updateEntry(idx, "name", e.target.value)} placeholder="Certified E-Discovery Specialist" data-testid={`input-cert-name-${idx}`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Issuer</label>
              <Input value={cert.issuer} onChange={(e) => updateEntry(idx, "issuer", e.target.value)} placeholder="ACEDS" data-testid={`input-cert-issuer-${idx}`} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
              <Input value={cert.date} onChange={(e) => updateEntry(idx, "date", e.target.value)} placeholder="March 2023" data-testid={`input-cert-date-${idx}`} />
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={addEntry} className="w-full" data-testid="button-add-certification">
        <Plus className="h-4 w-4 mr-2" />
        Add Certification
      </Button>
    </div>
  );
}

interface OptimizationData {
  optimizedSummary?: string;
  keywordInjections?: Array<{ section: string; keyword: string; context: string }>;
  bulletRewrites?: Array<{ experienceIndex: number; bulletIndex: number; original: string; optimized: string }>;
  missingSkills?: { technical?: string[]; legal?: string[] };
  overallAdvice?: string;
  estimatedScoreBoost?: number;
}

function OptimizationResultsPanel({
  data,
  onApplySummary,
  onApplyBullet,
  onApplySkills,
  onDismiss,
}: {
  data: OptimizationData;
  onApplySummary: (summary: string) => void;
  onApplyBullet: (expIdx: number, bulletIdx: number, text: string) => boolean;
  onApplySkills: (technical: string[], legal: string[]) => void;
  onDismiss: () => void;
}) {
  const [appliedSummary, setAppliedSummary] = useState(false);
  const [appliedBullets, setAppliedBullets] = useState<Set<string>>(new Set());
  const [appliedSkills, setAppliedSkills] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-serif font-medium text-foreground">Optimization Suggestions</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onDismiss} data-testid="button-dismiss-optimization">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {data.estimatedScoreBoost != null && data.estimatedScoreBoost > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <ChevronUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-700 dark:text-green-300">
            Estimated +{data.estimatedScoreBoost} point ATS score improvement
          </span>
        </div>
      )}

      {data.overallAdvice && (
        <div className="px-3 py-2.5 rounded-md bg-muted/50 border border-border/60">
          <p className="text-xs text-muted-foreground leading-relaxed">{data.overallAdvice}</p>
        </div>
      )}

      {data.optimizedSummary && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Improved Summary</h4>
            <Button
              variant="outline"
              size="sm"
              disabled={appliedSummary}
              onClick={() => { onApplySummary(data.optimizedSummary!); setAppliedSummary(true); }}
              data-testid="button-apply-summary"
            >
              {appliedSummary ? <Check className="h-3.5 w-3.5 mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              {appliedSummary ? "Applied" : "Apply"}
            </Button>
          </div>
          <div className="text-xs text-foreground bg-muted/30 rounded-md p-3 border border-border/40 leading-relaxed">
            {data.optimizedSummary}
          </div>
        </div>
      )}

      {data.bulletRewrites && data.bulletRewrites.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bullet Point Improvements</h4>
          {data.bulletRewrites.map((rewrite, i) => {
            const key = `${rewrite.experienceIndex}-${rewrite.bulletIndex}`;
            const isApplied = appliedBullets.has(key);
            return (
              <div key={i} className="space-y-1.5 p-3 rounded-md border border-border/40 bg-muted/20">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-red-500 dark:text-red-400 line-through shrink-0 mt-0.5">Before:</span>
                  <p className="text-[10px] text-muted-foreground line-through">{rewrite.original}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-green-600 dark:text-green-400 shrink-0 mt-0.5">After:</span>
                  <p className="text-[10px] text-foreground">{rewrite.optimized}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isApplied}
                  onClick={() => {
                    const success = onApplyBullet(rewrite.experienceIndex, rewrite.bulletIndex, rewrite.optimized);
                    if (success) setAppliedBullets((prev) => new Set(prev).add(key));
                  }}
                  data-testid={`button-apply-bullet-${i}`}
                >
                  {isApplied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  {isApplied ? "Applied" : "Apply Change"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {data.missingSkills && ((data.missingSkills.technical?.length ?? 0) > 0 || (data.missingSkills.legal?.length ?? 0) > 0) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suggested Skills to Add</h4>
            <Button
              variant="outline"
              size="sm"
              disabled={appliedSkills}
              onClick={() => {
                onApplySkills(data.missingSkills?.technical || [], data.missingSkills?.legal || []);
                setAppliedSkills(true);
              }}
              data-testid="button-apply-skills"
            >
              {appliedSkills ? <Check className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              {appliedSkills ? "Added" : "Add All"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(data.missingSkills.technical || []).map((s, i) => (
              <Badge key={`t-${i}`} variant="secondary" className="text-[10px]">{s}</Badge>
            ))}
            {(data.missingSkills.legal || []).map((s, i) => (
              <Badge key={`l-${i}`} variant="outline" className="text-[10px]">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {data.keywordInjections && data.keywordInjections.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Keyword Placement Guide</h4>
          <p className="text-[10px] text-muted-foreground">Manually weave these keywords into the suggested sections for best results.</p>
          {data.keywordInjections.map((inj, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <Target className="h-3 w-3 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-medium text-foreground">{inj.keyword}</span>
                <span className="text-muted-foreground"> in {inj.section}: {inj.context}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ATSPanel({
  resume,
  isPro,
  onRunReview,
  isReviewing,
  onOptimize,
  isOptimizing,
  hasTargetJob,
}: {
  resume: BuiltResume | null;
  isPro: boolean;
  onRunReview: () => void;
  isReviewing: boolean;
  onOptimize: () => void;
  isOptimizing: boolean;
  hasTargetJob: boolean;
}) {
  const atsScore = resume?.atsScore ?? 0;
  const atsAnalysis = (resume?.atsAnalysis as any) || null;

  const scoreBreakdown = atsAnalysis?.scoreBreakdown;
  const breakdownItems = scoreBreakdown
    ? [
        { label: "Formatting", score: Math.round((scoreBreakdown.formatting / 25) * 100) },
        { label: "Keywords", score: Math.round((scoreBreakdown.keywords / 25) * 100) },
        { label: "Content", score: Math.round((scoreBreakdown.content / 25) * 100) },
        { label: "Relevance", score: Math.round((scoreBreakdown.relevance / 25) * 100) },
      ]
    : atsAnalysis?.breakdown || [
        { label: "Formatting", score: 0 },
        { label: "Keywords", score: 0 },
        { label: "Content", score: 0 },
        { label: "Relevance", score: 0 },
      ];

  const quickFixes = atsAnalysis?.quickFixes || [];
  const jobFitScore = atsAnalysis?.jobFitScore;
  const jobFitVerdict = atsAnalysis?.jobFitVerdict;
  const missingJobKeywords = atsAnalysis?.missingJobKeywords || [];
  const matchedJobKeywords = atsAnalysis?.matchedJobKeywords || [];
  const verdict = atsAnalysis?.verdict;
  const keywordAnalysis = atsAnalysis?.keywordAnalysis;
  const sectionScores = atsAnalysis?.sectionScores;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <ATSScoreRing score={atsScore} size={110} />
        <p className="text-xs text-muted-foreground mt-2">ATS Readiness Score</p>
        {verdict && <p className="text-[10px] text-foreground mt-1">{verdict}</p>}
      </div>

      {jobFitScore != null && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Job Fit</h4>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{jobFitScore}%</span>
              <Progress value={jobFitScore} className="h-2 flex-1" />
            </div>
            {jobFitVerdict && <p className="text-[10px] text-muted-foreground">{jobFitVerdict}</p>}
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score Breakdown</h4>
        {breakdownItems.map((item: { label: string; score: number }, i: number) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground">{item.label}</span>
              <span className="text-xs font-medium text-muted-foreground">{item.score}%</span>
            </div>
            <Progress value={item.score} className="h-1.5" />
          </div>
        ))}
      </div>

      {sectionScores && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Section Analysis</h4>
            {Object.entries(sectionScores).map(([key, data]: [string, any]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground capitalize">{key}</span>
                  <span className={`text-xs font-medium ${data.score >= 80 ? "text-green-600 dark:text-green-400" : data.score >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                    {data.score}%
                  </span>
                </div>
                {data.fixes && data.fixes.length > 0 && (
                  <ul className="space-y-0.5">
                    {data.fixes.slice(0, 2).map((fix: string, i: number) => (
                      <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                        <span className="shrink-0 mt-0.5">-</span>
                        <span>{fix}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {(matchedJobKeywords.length > 0 || missingJobKeywords.length > 0) && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Job Keywords</h4>
            {matchedJobKeywords.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Matched</span>
                <div className="flex flex-wrap gap-1">
                  {matchedJobKeywords.map((kw: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px] bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
            {missingJobKeywords.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">Missing</span>
                <div className="flex flex-wrap gap-1">
                  {missingJobKeywords.map((kw: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {keywordAnalysis && !jobFitScore && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Keywords</h4>
            {keywordAnalysis.strong?.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Strong</span>
                <div className="flex flex-wrap gap-1">
                  {keywordAnalysis.strong.slice(0, 8).map((kw: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
            {keywordAnalysis.missing?.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">Consider Adding</span>
                <div className="flex flex-wrap gap-1">
                  {keywordAnalysis.missing.slice(0, 8).map((kw: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {quickFixes.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Fixes</h4>
            {quickFixes.map((fix: any, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 dark:text-yellow-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">{fix.fix || fix.text || fix.issue}</p>
                  {fix.impact && <ImpactBadge impact={fix.impact} />}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={isPro ? onRunReview : undefined}
          disabled={isReviewing || !isPro}
          data-testid="button-run-ats-review"
        >
          {isReviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <BarChart3 className="h-3.5 w-3.5 mr-1.5" />}
          {isPro ? "Run ATS Review" : "ATS Review (Pro)"}
        </Button>

        {hasTargetJob && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onOptimize}
            disabled={isOptimizing}
            data-testid="button-optimize-for-job"
          >
            {isOptimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Target className="h-3.5 w-3.5 mr-1.5" />}
            {isPro ? "Optimize for Job" : "Optimize (Pro)"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ResumeListView({
  resumes,
  isLoading,
  onEdit,
  onDelete,
  onCreate,
  onImport,
  onAtsReview,
  isDeletingId,
  isCreating,
  isImporting,
}: {
  resumes: BuiltResume[];
  isLoading: boolean;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
  onImport: () => void;
  onAtsReview: (id: number) => void;
  isDeletingId: number | null;
  isCreating: boolean;
  isImporting: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-serif font-medium text-foreground" data-testid="text-resumes-heading">Your Resumes</h2>
          <p className="text-sm text-muted-foreground mt-1">{resumes.length} resume{resumes.length !== 1 ? "s" : ""} built</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={onImport} disabled={isImporting} data-testid="button-import-resume">
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Import from Upload
          </Button>
          <Button onClick={onCreate} disabled={isCreating} data-testid="button-create-resume">
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Create New Resume
          </Button>
        </div>
      </div>

      {resumes.length === 0 ? (
        <Card data-testid="card-empty-state">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-serif font-medium text-foreground mb-2">Build Your First Resume</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Create a tailored, ATS-optimized resume for legal technology roles. Our builder helps you highlight the skills and experience that matter most.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button onClick={onCreate} disabled={isCreating} data-testid="button-create-resume-empty">
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Resume
              </Button>
              <Button variant="outline" onClick={onImport} disabled={isImporting} data-testid="button-import-resume-empty">
                <Upload className="h-4 w-4 mr-2" />
                Import Existing
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((resume) => {
            const sections = resume.sections as ResumeSections | null;
            const contactName = sections?.contact?.fullName;
            return (
              <Card key={resume.id} className="overflow-visible" data-testid={`card-built-resume-${resume.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate" data-testid={`text-resume-title-${resume.id}`}>
                        {resume.title}
                      </h3>
                      {contactName && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{contactName}</p>
                      )}
                    </div>
                    {resume.atsScore != null && resume.atsScore > 0 && (
                      <ATSScoreRing score={resume.atsScore} size={48} />
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {resume.templateId && (
                      <Badge variant="secondary" className="text-[10px]">{resume.templateId}</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {resume.updatedAt ? new Date(resume.updatedAt).toLocaleDateString() : "Recently"}
                    </span>
                  </div>

                  <Separator className="mb-3" />

                  <div className="flex items-center gap-1 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(resume.id)} data-testid={`button-edit-resume-${resume.id}`}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onAtsReview(resume.id)} data-testid={`button-ats-review-${resume.id}`}>
                      <BarChart3 className="h-3.5 w-3.5 mr-1" />
                      ATS Review
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(resume.id)}
                      disabled={isDeletingId === resume.id}
                      data-testid={`button-delete-resume-${resume.id}`}
                    >
                      {isDeletingId === resume.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function JobSelector({
  selectedJobId,
  onSelect,
}: {
  selectedJobId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: jobsResponse } = useQuery<{ jobs: Job[]; total: number }>({
    queryKey: ["/api/jobs"],
    queryFn: () => fetch("/api/jobs?limit=50&page=1").then(r => r.json()),
  });
  const jobs = jobsResponse?.jobs;

  const filtered = (jobs || []).filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase())
  );

  const selectedJob = (jobs || []).find((j) => j.id === selectedJobId);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="max-w-xs truncate"
        data-testid="button-select-target-job"
      >
        <Target className="h-3.5 w-3.5 mr-1.5 shrink-0" />
        {selectedJob ? (
          <span className="truncate">{selectedJob.title} - {selectedJob.company}</span>
        ) : (
          "Select Target Job"
        )}
        <ChevronDown className="h-3.5 w-3.5 ml-1.5 shrink-0" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 w-[calc(100vw-2rem)] sm:w-80 bg-background border border-border rounded-md shadow-lg p-2 max-h-64 overflow-auto">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="mb-2"
              autoFocus
              data-testid="input-search-jobs"
            />
            {selectedJobId && (
              <button
                onClick={() => { onSelect(null); setOpen(false); }}
                className="w-full text-left px-2 py-2 text-xs text-muted-foreground rounded-md hover-elevate min-h-[44px] flex items-center"
                data-testid="button-clear-target-job"
              >
                Clear selection
              </button>
            )}
            {filtered.slice(0, 20).map((job) => (
              <button
                key={job.id}
                onClick={() => { onSelect(job.id); setOpen(false); }}
                className={`w-full text-left px-2 py-2 rounded-md hover-elevate min-h-[44px] flex flex-col justify-center ${selectedJobId === job.id ? "bg-muted" : ""}`}
                data-testid={`button-job-option-${job.id}`}
              >
                <span className="text-xs font-medium text-foreground truncate block">{job.title}</span>
                <span className="text-[10px] text-muted-foreground truncate block">{job.company}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No jobs found</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ResumeEditorView({
  resumeId,
  onBack,
  isPro,
  showUpgradePrompt,
  setShowUpgradePrompt,
}: {
  resumeId: number;
  onBack: () => void;
  isPro: boolean;
  showUpgradePrompt: boolean;
  setShowUpgradePrompt: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<SectionKey>("contact");
  const [sections, setSections] = useState<ResumeSections>(EMPTY_SECTIONS);
  const [title, setTitle] = useState("");
  const [targetJobId, setTargetJobId] = useState<number | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [atsExpanded, setAtsExpanded] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationData | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: resume, isLoading } = useQuery<BuiltResume>({
    queryKey: ["/api/built-resumes", resumeId],
  });

  useEffect(() => {
    if (resume && !hasLoaded) {
      setSections((resume.sections as ResumeSections) || EMPTY_SECTIONS);
      setTitle(resume.title);
      setTargetJobId(resume.targetJobId ?? null);
      setHasLoaded(true);
    }
  }, [resume, hasLoaded]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", `/api/built-resumes/${resumeId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/built-resumes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/built-resumes", resumeId] });
    },
  });

  const autoSave = useCallback(
    (newSections: ResumeSections) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateMutation.mutate({ sections: newSections });
      }, 1500);
    },
    [updateMutation]
  );

  const handleSectionsChange = (newSections: ResumeSections) => {
    setSections(newSections);
    autoSave(newSections);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateMutation.mutate({ title: newTitle });
    }, 1500);
  };

  const handleTargetJobChange = (jobId: number | null) => {
    setTargetJobId(jobId);
    updateMutation.mutate({ targetJobId: jobId });
  };

  const aiAssistMutation = useMutation({
    mutationFn: async ({ section, content }: { section: string; content: string }) => {
      const res = await apiRequest("POST", "/api/built-resumes/ai-assist", {
        section,
        currentContent: content,
        resumeContext: JSON.stringify(sections),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.suggestion) {
        toast({ title: "AI Suggestion", description: "Content has been updated with AI suggestions." });
        if (data.section === "summary" && typeof data.suggestion === "string") {
          const updated = { ...sections, summary: data.suggestion };
          setSections(updated);
          autoSave(updated);
        } else if (data.section === "experience" && data.suggestion) {
          toast({ title: "AI Suggestion", description: data.suggestion });
        }
      }
    },
    onError: (error: any) => {
      if (error.message?.includes("403") || error.message?.includes("Pro")) {
        setShowUpgradePrompt(true);
      } else {
        toast({ title: "Error", description: "Failed to get AI assistance. Please try again.", variant: "destructive" });
      }
    },
  });

  const atsReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/built-resumes/${resumeId}/ats-review`, {
        jobId: targetJobId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/built-resumes", resumeId] });
      toast({ title: "ATS Review Complete", description: "Your resume has been analyzed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to run ATS review.", variant: "destructive" });
    },
  });

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/built-resumes/${resumeId}/optimize-for-job`, {
        jobId: targetJobId,
      });
      return res.json();
    },
    onSuccess: (data: OptimizationData) => {
      setOptimizationResults(data);
      toast({ title: "Optimization Complete", description: "Review the suggestions below and apply the ones you like." });
    },
    onError: (error: any) => {
      if (error.message?.includes("403") || error.message?.includes("Pro")) {
        setShowUpgradePrompt(true);
      } else {
        toast({ title: "Error", description: "Failed to optimize resume.", variant: "destructive" });
      }
    },
  });

  const saveImmediately = useCallback((newSections: ResumeSections) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    updateMutation.mutate({ sections: newSections });
  }, [updateMutation]);

  const applyOptimizedSummary = (summary: string) => {
    const updated = { ...sections, summary };
    setSections(updated);
    saveImmediately(updated);
    toast({ title: "Summary Updated", description: "The optimized summary has been applied and saved." });
  };

  const applyOptimizedBullet = (expIdx: number, bulletIdx: number, text: string) => {
    const updated = { ...sections };
    const exp = [...updated.experience];
    if (expIdx >= exp.length) {
      toast({ title: "Could Not Apply", description: "The experience entry no longer exists. The change was not applied.", variant: "destructive" });
      return false;
    }
    const bullets = [...exp[expIdx].bullets];
    if (bulletIdx >= bullets.length) {
      bullets.push(text);
    } else {
      bullets[bulletIdx] = text;
    }
    exp[expIdx] = { ...exp[expIdx], bullets };
    updated.experience = exp;
    setSections(updated);
    saveImmediately(updated);
    toast({ title: "Bullet Updated", description: "The improved bullet point has been applied and saved." });
    return true;
  };

  const applyOptimizedSkills = (technical: string[], legal: string[]) => {
    const updated = { ...sections };
    const existTech = new Set(updated.skills.technical.map((s) => s.toLowerCase()));
    const existLegal = new Set(updated.skills.legal.map((s) => s.toLowerCase()));
    const newTech = technical.filter((s) => !existTech.has(s.toLowerCase()));
    const newLegal = legal.filter((s) => !existLegal.has(s.toLowerCase()));
    updated.skills = {
      ...updated.skills,
      technical: [...updated.skills.technical, ...newTech],
      legal: [...updated.skills.legal, ...newLegal],
    };
    setSections(updated);
    saveImmediately(updated);
    toast({ title: "Skills Added", description: `Added ${newTech.length + newLegal.length} suggested skills and saved.` });
  };

  const handleAiAssist = (section: string, content: string) => {
    if (!isPro) {
      setShowUpgradePrompt(true);
      return;
    }
    aiAssistMutation.mutate({ section, content });
  };

  const handleRunReview = () => {
    atsReviewMutation.mutate();
  };

  const handleOptimize = () => {
    if (!isPro) {
      setShowUpgradePrompt(true);
      return;
    }
    if (!targetJobId) {
      toast({ title: "Select a Target Job", description: "Please select a target job to optimize your resume for.", variant: "destructive" });
      return;
    }
    optimizeMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showUpgradePrompt) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setShowUpgradePrompt(false)} className="mb-4" data-testid="button-back-from-upgrade">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Editor
        </Button>
        <UpgradePrompt
          feature="AI Resume Assistant"
          description="Unlock resume optimization, smart bullet point suggestions, and ATS score improvements with Pro."
        />
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "contact":
        return <ContactEditor sections={sections} onChange={handleSectionsChange} />;
      case "summary":
        return <SummaryEditor sections={sections} onChange={handleSectionsChange} isPro={isPro} onAiAssist={handleAiAssist} isAiLoading={aiAssistMutation.isPending} />;
      case "experience":
        return <ExperienceEditor sections={sections} onChange={handleSectionsChange} isPro={isPro} onAiAssist={handleAiAssist} isAiLoading={aiAssistMutation.isPending} />;
      case "education":
        return <EducationEditor sections={sections} onChange={handleSectionsChange} />;
      case "skills":
        return <SkillsEditor sections={sections} onChange={handleSectionsChange} />;
      case "certifications":
        return <CertificationsEditor sections={sections} onChange={handleSectionsChange} />;
    }
  };

  const currentNavItem = SECTION_NAV.find((s) => s.key === activeSection);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-list">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-5 hidden sm:block" />
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-sm font-medium max-w-xs"
            placeholder="Resume title..."
            data-testid="input-resume-title"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <JobSelector selectedJobId={targetJobId} onSelect={handleTargetJobChange} />
          {updateMutation.isPending && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {!updateMutation.isPending && hasLoaded && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="hidden lg:block w-48 shrink-0">
          <nav className="space-y-1 sticky top-20">
            {SECTION_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm min-h-[44px] transition-colors ${
                    isActive
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover-elevate"
                  }`}
                  data-testid={`button-section-${item.key}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="lg:hidden">
          <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as SectionKey)}>
            <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-auto">
              {SECTION_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTrigger
                    key={item.key}
                    value={item.key}
                    className="flex flex-col items-center gap-1 py-2 min-h-[44px]"
                    data-testid={`tab-section-${item.key}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px]">{item.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                {currentNavItem && <currentNavItem.icon className="h-5 w-5 text-muted-foreground" />}
                <h3 className="text-base font-serif font-medium text-foreground">
                  {currentNavItem?.label}
                </h3>
              </div>
              {renderSection()}
            </CardContent>
          </Card>

          {optimizationResults && (
            <Card data-testid="card-optimization-results">
              <CardContent className="p-5 sm:p-6">
                <OptimizationResultsPanel
                  data={optimizationResults}
                  onApplySummary={applyOptimizedSummary}
                  onApplyBullet={applyOptimizedBullet}
                  onApplySkills={applyOptimizedSkills}
                  onDismiss={() => setOptimizationResults(null)}
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-20">
            <Card>
              <CardContent className="p-4">
                <ATSPanel
                  resume={resume ?? null}
                  isPro={isPro}
                  onRunReview={handleRunReview}
                  isReviewing={atsReviewMutation.isPending}
                  onOptimize={handleOptimize}
                  isOptimizing={optimizeMutation.isPending}
                  hasTargetJob={!!targetJobId}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="border border-border/60 rounded-md overflow-visible">
            <button
              onClick={() => setAtsExpanded(!atsExpanded)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[44px]"
              data-testid="button-toggle-ats-panel"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">ATS Score</span>
                {resume?.atsScore != null && resume.atsScore > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{resume.atsScore}%</Badge>
                )}
              </div>
              {atsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {atsExpanded && (
              <div className="px-4 pb-4">
                <Separator className="mb-4" />
                <ATSPanel
                  resume={resume ?? null}
                  isPro={isPro}
                  onRunReview={handleRunReview}
                  isReviewing={atsReviewMutation.isPending}
                  onOptimize={handleOptimize}
                  isOptimizing={optimizeMutation.isPending}
                  hasTargetJob={!!targetJobId}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResumeBuilder() {
  usePageTitle("Resume Builder - Legal Tech Careers");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isPro, isLoading: subLoading } = useSubscription();
  const { toast } = useToast();
  const { track } = useActivityTracker();
  const [, navigate] = useLocation();

  useEffect(() => { track({ eventType: "page_view", pagePath: "/resume-builder" }); }, []);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const autoCreateAttempted = useRef(false);

  const { data: resumes = [], isLoading: resumesLoading } = useQuery<BuiltResume[]>({
    queryKey: ["/api/built-resumes"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async (opts?: { targetJobId?: number }) => {
      const res = await apiRequest("POST", "/api/built-resumes", {
        title: "Untitled Resume",
        sections: EMPTY_SECTIONS,
        targetJobId: opts?.targetJobId ?? null,
      });
      return res.json();
    },
    onSuccess: (data: BuiltResume) => {
      queryClient.invalidateQueries({ queryKey: ["/api/built-resumes"] });
      setEditingId(data.id);
      toast({ title: "Resume Created", description: "Start building your resume." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create resume.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (autoCreateAttempted.current) return;
    const params = new URLSearchParams(window.location.search);
    const jid = params.get("jobId");
    if (!jid) return;
    const jobId = parseInt(jid, 10);
    if (isNaN(jobId) || jobId <= 0) return;
    if (!isAuthenticated || resumesLoading || editingId || createMutation.isPending) return;
    autoCreateAttempted.current = true;
    createMutation.mutate({ targetJobId: jobId });
  }, [isAuthenticated, resumesLoading, editingId, createMutation.isPending]);

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/built-resumes/import-from-upload", {});
      return res.json();
    },
    onSuccess: (data: BuiltResume) => {
      queryClient.invalidateQueries({ queryKey: ["/api/built-resumes"] });
      setEditingId(data.id);
      toast({ title: "Resume Imported", description: "Your uploaded resume has been imported into the builder." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to import resume. Make sure you have uploaded a resume first.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      setDeletingId(id);
      await apiRequest("DELETE", `/api/built-resumes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/built-resumes"] });
      setDeletingId(null);
      toast({ title: "Resume Deleted", description: "The resume has been removed." });
    },
    onError: () => {
      setDeletingId(null);
      toast({ title: "Error", description: "Failed to delete resume.", variant: "destructive" });
    },
  });

  const listAtsReviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/built-resumes/${id}/ats-review`, {});
      return res.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/built-resumes"] });
      toast({ title: "ATS Review Complete", description: "Resume analyzed successfully." });
    },
    onError: (error: any) => {
      if (error.message?.includes("403")) {
        toast({ title: "Pro Feature", description: "ATS Review is available for Pro subscribers. Upgrade to access this feature.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to run ATS review.", variant: "destructive" });
      }
    },
  });

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h1 className="text-2xl font-serif font-medium text-foreground mb-4">Resume Builder</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to start building your resume.</p>
          <Button onClick={() => navigate("/auth")} data-testid="button-sign-in">
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!editingId && (
          <div className="mb-6">
            <h1 className="text-2xl font-serif font-medium text-foreground" data-testid="text-page-title">
              Resume Builder
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build ATS-optimized resumes tailored for legal technology careers
            </p>
          </div>
        )}

        {editingId ? (
          <ResumeEditorView
            resumeId={editingId}
            onBack={() => setEditingId(null)}
            isPro={isPro}
            showUpgradePrompt={showUpgradePrompt}
            setShowUpgradePrompt={setShowUpgradePrompt}
          />
        ) : (
          <ResumeListView
            resumes={resumes}
            isLoading={resumesLoading}
            onEdit={(id) => setEditingId(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
            onCreate={() => createMutation.mutate({})}
            onImport={() => importMutation.mutate()}
            onAtsReview={(id) => listAtsReviewMutation.mutate(id)}
            isDeletingId={deletingId}
            isCreating={createMutation.isPending}
            isImporting={importMutation.isPending}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}