import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLocation, useParams } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Job, Resume, StructuredDescription } from "@shared/schema";
import type { ResumeExtractedData } from "@shared/models/auth";
import { decodeHtmlEntities, fixMissingSentenceSpaces, cleanStructuredText, parseStructuredDescription } from "@/lib/structured-description";
import { formatSalary } from "@/lib/format-salary";
import { JobLocation } from "@/components/job-location";
import { StructuredDescriptionView } from "@/components/structured-description-view";
import { NextStepCard } from "@/components/next-step-card";
import { Link } from "wouter";
import {
  ArrowLeft,
  ExternalLink,
  Building2,
  Briefcase,
  DollarSign,
  Loader2,
  FileText,
  Bookmark,
  Award,
  GraduationCap,
  Clock,
  Scale,
  Handshake,
  Hash,
  TrendingUp,
  Sparkles,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Flag,
  X,
  Lock,
  Eye,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

const ANON_VIEW_LIMIT = 3;
const ANON_VIEWS_KEY = "ltc_anon_job_views";

function getAnonViewCount(): number {
  try {
    const stored = sessionStorage.getItem(ANON_VIEWS_KEY);
    if (!stored) return 0;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch { return 0; }
}

function recordAnonView(jobId: string): number {
  try {
    const stored = sessionStorage.getItem(ANON_VIEWS_KEY);
    const views: string[] = stored ? JSON.parse(stored) : [];
    if (!views.includes(jobId)) {
      views.push(jobId);
      sessionStorage.setItem(ANON_VIEWS_KEY, JSON.stringify(views));
    }
    return views.length;
  } catch { return 0; }
}

function hasViewedJob(jobId: string): boolean {
  try {
    const stored = sessionStorage.getItem(ANON_VIEWS_KEY);
    if (!stored) return false;
    return JSON.parse(stored).includes(jobId);
  } catch { return false; }
}

function cleanDescription(text: string): string {
  let cleaned = decodeHtmlEntities(text);
  if (/<[a-z][^>]*>/i.test(cleaned)) {
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<\/(?:p|div|h[1-6]|li|tr|section|article)>/gi, '\n');
    cleaned = cleaned.replace(/<(?:p|div|h[1-6]|ul|ol|table|tbody|thead|section|article)(?:\s[^>]*)?>/gi, '\n');
    cleaned = cleaned.replace(/<li(?:\s[^>]*)?>/gi, '- ');
    cleaned = cleaned.replace(/<[^>]+>/g, '');
  }
  cleaned = cleaned.replace(/\u00A0/g, ' ');
  cleaned = cleaned.replace(/ {2,}/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/^[ \t]+/gm, '');
  cleaned = fixMissingSentenceSpaces(cleaned);
  return cleaned.trim();
}

const HEADING_RE = /^(?:About|What|Who|Responsibilities|Qualifications|Requirements|Skills|Benefits|Perks|Compensation|Getting|In this|How you|Why|Our|The|Your|Key|Core|Preferred|Required|Nice|Education|Experience|Pluses?|Overview|Summary|Position|Role|Minimum|Additional|Essential|Desired|Duties|Mission|Values|Culture|Team|Company|Description|Expectations|Opportunity)\b/i;

function linkifyEmails(content: string) {
  const emailRegex = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
  const parts = content.split(emailRegex);
  if (parts.length === 1) return content;
  return parts.map((part, idx) => {
    if (emailRegex.test(part)) {
      emailRegex.lastIndex = 0;
      return (
        <a
          key={idx}
          href={`mailto:${part}`}
          className="text-primary hover:underline inline-flex items-center gap-0.5"
          data-testid={`link-inline-email-${part.replace(/[@.]/g, '-')}`}
        >
          {part}
        </a>
      );
    }
    emailRegex.lastIndex = 0;
    return part;
  });
}

type HighlightCategory = 'experience' | 'certification' | 'education' | 'tool' | 'legal' | 'compensation' | 'softskill';

const HIGHLIGHT_CATEGORIES: Record<HighlightCategory, { label: string; color: string; icon: typeof Clock }> = {
  experience: { label: 'Experience', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300', icon: Clock },
  certification: { label: 'Certifications', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300', icon: Award },
  education: { label: 'Education', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300', icon: GraduationCap },
  tool: { label: 'Tools & Tech', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300', icon: Hash },
  legal: { label: 'Legal Domains', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300', icon: Scale },
  compensation: { label: 'Compensation', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300', icon: DollarSign },
  softskill: { label: 'Soft Skills', color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300', icon: Handshake },
};


const HIGHLIGHT_PATTERNS: { pattern: RegExp; type: HighlightCategory }[] = [
  { pattern: /\b(\d+)\+?\s*(?:[-–]?\s*\d+\s*)?(?:years?|yrs?)\b(?:\s+(?:of\s+)?(?:experience|exp))?/gi, type: 'experience' },
  { pattern: /\b(?:JD|J\.D\.|Juris Doctor|Bar (?:Admission|License|Certified)|Licensed Attorney|Bar Exam|Esq\.|LL\.?M\.?|LL\.?B\.?|Certified|CIPP|CIPM|CIPT|PMP|CISSP|AWS Certified|Scrum Master|Six Sigma|CLE)\b/gi, type: 'certification' },
  { pattern: /\b(?:Bachelor'?s?|Master'?s?|MBA|Ph\.?D\.?|Doctorate|B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?)\b(?:\s+(?:degree|in))?\b/gi, type: 'education' },
  { pattern: /\b(?:Python|JavaScript|TypeScript|SQL|Java|C\+\+|React|Angular|Vue|Node\.?js|AWS|Azure|GCP|Docker|Kubernetes|Salesforce|Tableau|Power BI|Excel|Jira|Confluence|Slack|Notion|Figma|Sketch|REST(?:ful)?|GraphQL|API|Git|CI\/CD|Agile|NLP|Machine Learning|AI|Blockchain|Relativity|Everlaw|Reveal|Concordance|Clearwell|Brainspace|DISCO|NetDocuments|iManage|Clio|Aderant|Elite|ProLaw|Legal Tracker|Luminance|Kira|Eigen|Diligent|Thomson Reuters|LexisNexis|Westlaw)\b/gi, type: 'tool' },
  { pattern: /\b(?:e-?discovery|ediscovery|litigation|compliance|regulatory|GDPR|CCPA|privacy|intellectual property|patent|trademark|copyright|M&A|mergers?\s*(?:&|and)\s*acquisitions?|due diligence|corporate governance|contract (?:management|review|drafting|lifecycle)|CLM|antitrust|securities|SOX|HIPAA|AML|KYC|data protection|cyber\s*security|information governance|records management|legal hold|privilege review|document review)\b/gi, type: 'legal' },
  { pattern: /\$\s*\d[\d,]*(?:\.\d{2})?(?:\s*[-–]\s*\$?\s*\d[\d,]*(?:\.\d{2})?)?\s*(?:per\s+(?:hour|year|annum|month)|\/(?:hr|yr|mo)|annually|(?:K|k)\b)?/g, type: 'compensation' },
  { pattern: /\b(?:equity|stock options?|RSU|bonus|401\(?k\)?|health (?:insurance|benefits)|dental|vision|PTO|paid time off|unlimited (?:PTO|vacation)|parental leave|remote work|work[- ]from[- ]home|flexible (?:hours|schedule|work))\b/gi, type: 'compensation' },
  { pattern: /\b(?:leadership|communication|collaboration|teamwork|problem[- ]solving|critical thinking|analytical|strategic (?:thinking|planning)|stakeholder management|cross[- ]functional|mentoring|coaching|negotiation|presentation|interpersonal|relationship[- ]building|project management|time management|organizational|adaptability|creative thinking|decision[- ]making|conflict resolution)\b/gi, type: 'softskill' },
];

function highlightKeywords(content: string | (string | JSX.Element)[], activeCategories: Set<HighlightCategory>): (string | JSX.Element)[] {
  if (typeof content !== 'string') {
    if (Array.isArray(content)) return content;
    return [content];
  }
  const text = content;
  const matches: { start: number; end: number; type: HighlightCategory }[] = [];
  for (const { pattern, type } of HIGHLIGHT_PATTERNS) {
    if (!activeCategories.has(type)) continue;
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      const overlap = matches.some(
        (ex) => m!.index < ex.end && m!.index + m![0].length > ex.start
      );
      if (!overlap) {
        matches.push({ start: m.index, end: m.index + m[0].length, type });
      }
    }
  }
  if (matches.length === 0) return [text];
  matches.sort((a, b) => a.start - b.start);
  const parts: (string | JSX.Element)[] = [];
  let last = 0;
  matches.forEach((match, idx) => {
    if (match.start > last) parts.push(text.slice(last, match.start));
    const highlighted = text.slice(match.start, match.end);
    const colorClass = HIGHLIGHT_CATEGORIES[match.type].color;
    parts.push(
      <mark key={`hl-${idx}`} className={`${colorClass} px-1 py-0.5 rounded text-[0.92em] font-medium no-underline`} data-hl-type={match.type}>
        {highlighted}
      </mark>
    );
    last = match.end;
  });
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderHighlightedContent(content: string, activeCategories: Set<HighlightCategory>) {
  const emailified = linkifyEmails(content);
  if (typeof emailified === 'string') {
    return highlightKeywords(emailified, activeCategories);
  }
  if (Array.isArray(emailified)) {
    return emailified.flatMap((part) => {
      if (typeof part === 'string') return highlightKeywords(part, activeCategories);
      return [part];
    });
  }
  return [emailified];
}


function DescriptionContent({ text, testId, compact, isPro }: { text?: string | null; testId: string; compact?: boolean; isPro?: boolean }) {
  if (!text) return null;

  const cleanedText = useMemo(() => cleanDescription(text), [text]);
  const lines = useMemo(() => cleanedText.split('\n').filter(l => l.trim()), [cleanedText]);

  const activeCategories = useMemo(() => {
    if (isPro) return new Set(Object.keys(HIGHLIGHT_CATEGORIES) as HighlightCategory[]);
    return new Set<HighlightCategory>();
  }, [isPro]);

  if (compact) {
    return (
      <div className="space-y-2" data-testid={testId}>
        {lines.slice(0, 12).map((line, i) => {
          const trimmed = line.trim();
          const isBullet = /^[-•*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed);
          const isHead = (HEADING_RE.test(trimmed) && trimmed.length < 80) || (trimmed.endsWith(':') && trimmed.length < 80) || (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 80 && /[A-Z]/.test(trimmed));

          if (isHead) {
            return <p key={i} className="font-medium text-foreground text-sm pt-2 first:pt-0">{trimmed}</p>;
          }
          if (isBullet) {
            const content = trimmed.replace(/^[-•*]\s+|^\d+[.)]\s+/, '');
            return (
              <div key={i} className="flex gap-2 pl-1 text-sm">
                <span className="shrink-0 mt-[0.45rem] w-1.5 h-1.5 rounded-full bg-foreground/25" />
                <span className="text-foreground/90">{content}</span>
              </div>
            );
          }
          return <p key={i} className="text-sm text-foreground/90">{trimmed}</p>;
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5" data-testid={testId}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const isBullet = /^[-•*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed);
        const isHead = (HEADING_RE.test(trimmed) && trimmed.length < 80) || (trimmed.endsWith(':') && trimmed.length < 80) || (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 80 && /[A-Z]/.test(trimmed));

        const renderContent = (content: string) => {
          return renderHighlightedContent(content, activeCategories);
        };

        if (isHead) {
          return (
            <h3 key={i} className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-4 first:pt-0 pb-1">
              {trimmed.replace(/:$/, '')}
            </h3>
          );
        }
        if (isBullet) {
          const content = trimmed.replace(/^[-•*]\s+|^\d+[.)]\s+/, '');
          return (
            <li key={i} className="flex gap-3 text-[0.925rem] text-foreground/80 leading-[1.7] pl-1" data-testid={`bullet-${i}`}>
              <span className="shrink-0 mt-[0.65rem] w-[5px] h-[5px] rounded-full bg-primary/40" />
              <span>{renderContent(content)}</span>
            </li>
          );
        }
        return (
          <p key={i} className="text-[0.925rem] text-foreground/80 leading-[1.7]" data-testid={`para-${i}`}>
            {renderContent(trimmed)}
          </p>
        );
      })}
    </div>
  );
}



function getPostedDateLabel(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 7) return `Posted ${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Posted ${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  const months = Math.floor(days / 30);
  return `Posted ${months} ${months === 1 ? "month" : "months"} ago`;
}

function getLastCheckedLabel(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Verified just now";
  if (hours < 24) return `Verified ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Verified yesterday";
  if (days < 7) return `Verified ${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `Verified ${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
}

function getLocationTypeLabel(job: Job): string | null {
  if (job.locationType === 'remote' || (!job.locationType && job.isRemote)) return 'Remote';
  if (job.locationType === 'hybrid') return 'Hybrid';
  if (job.locationType === 'onsite') return 'On-site';
  return null;
}

export default function JobDetail() {
  usePageTitle("Job Details");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isPro } = useSubscription();
  const { trackNow } = useActivityTracker();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const trackedJobRef = useRef<string | null>(null);
  const applyButtonRef = useRef<HTMLDivElement>(null);
  const inlineUploadRef = useRef<HTMLInputElement>(null);
  const [inlineUploadState, setInlineUploadState] = useState<"idle" | "uploading" | "matching" | "done">("idle");
  const [inlineMatchResult, setInlineMatchResult] = useState<{ score: number; highlights: string[]; gapSummary: string } | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showApplyNudge, setShowApplyNudge] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportType, setReportType] = useState<string>("broken_link");
  const [reportDetails, setReportDetails] = useState("");
  const [showSignupGate, setShowSignupGate] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !hasViewedJob(jobId || '') && getAnonViewCount() >= ANON_VIEW_LIMIT;
  });
  const authReturnUrl = `/auth?returnTo=${encodeURIComponent(`/jobs/${jobId}`)}`;

  const { data: publicJob, isLoading: publicLoading } = useQuery<Job>({
    queryKey: ['/api/public/jobs', jobId],
    enabled: !isAuthenticated && !authLoading && !!jobId && !showSignupGate,
  });

  const { data: authJob, isLoading: authJobLoading } = useQuery<Job>({
    queryKey: ['/api/jobs', jobId],
    enabled: isAuthenticated && !!jobId,
  });

  const job = isAuthenticated ? authJob : publicJob;
  const isLoading = isAuthenticated ? authJobLoading : publicLoading;

  useEffect(() => {
    if (jobId && job && trackedJobRef.current !== jobId) {
      trackedJobRef.current = jobId;
      trackNow({
        eventType: "job_view",
        entityType: "job",
        entityId: jobId,
        metadata: {
          company: job.company,
          roleCategory: job.roleCategory,
          title: job.title,
        },
      });
    }
  }, [jobId, job]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      { threshold: 0 }
    );
    const el = applyButtonRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [job]);

  useEffect(() => {
    if (!isAuthenticated && !authLoading && jobId && job && !hasViewedJob(jobId)) {
      const viewCount = getAnonViewCount();
      if (viewCount >= ANON_VIEW_LIMIT) {
        setShowSignupGate(true);
      } else {
        recordAnonView(jobId);
      }
    }
  }, [isAuthenticated, authLoading, jobId, job]);

  const { data: savedJobIds = [] } = useQuery<number[]>({
    queryKey: ["/api/saved-jobs/ids"],
    enabled: isAuthenticated,
  });

  const jobIsSaved = job ? savedJobIds.includes(job.id) : false;

  const { data: userResumes = [] } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
    enabled: isAuthenticated,
  });

  const resumeFit = useMemo(() => {
    if (!job?.keySkills?.length || userResumes.length === 0) return null;
    const jobSkillsLower = job.keySkills.map(s => s.toLowerCase().trim());
    const results = userResumes
      .filter(r => r.extractedData && typeof r.extractedData === 'object')
      .map(resume => {
        const data = resume.extractedData as ResumeExtractedData;
        const resumeSkills = (data.skills || []).map(s => s.toLowerCase().trim());
        let matchCount = 0;
        const matched: string[] = [];
        const missing: string[] = [];
        for (const js of job.keySkills!) {
          const jsLower = js.toLowerCase().trim();
          const found = resumeSkills.some(rs =>
            rs.includes(jsLower) || jsLower.includes(rs) ||
            rs.split(/\s+/).some(w => jsLower.split(/\s+/).includes(w))
          );
          if (found) { matchCount++; matched.push(js); } else { missing.push(js); }
        }
        const score = Math.round((matchCount / jobSkillsLower.length) * 100);
        return { resumeId: resume.id, label: resume.label, isPrimary: resume.isPrimary, score, matched, missing, totalSkills: jobSkillsLower.length };
      })
      .sort((a, b) => b.score - a.score);
    return results.length > 0 ? results : null;
  }, [job?.keySkills, userResumes]);

  const { toast } = useToast();

  const handleInlineUpload = async (file: File) => {
    try {
      setInlineUploadState("uploading");
      setInlineMatchResult(null);
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("label", file.name.replace(/\.[^/.]+$/, ""));

      const uploadRes = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      const uploadData = await uploadRes.json();
      const resumeId = uploadData.resume?.id;
      if (!resumeId) throw new Error("Upload succeeded but matching failed.");

      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      setInlineUploadState("matching");

      const matchRes = await apiRequest("POST", `/api/resumes/${resumeId}/match-jobs`);
      const matchData = await matchRes.json();
      const matches = matchData.matches || [];

      const thisJobMatch = matches.find((m: any) => String(m.jobId) === String(jobId));

      if (thisJobMatch) {
        setInlineMatchResult({
          score: thisJobMatch.matchScore,
          highlights: thisJobMatch.matchHighlights || [],
          gapSummary: thisJobMatch.gapSummary || "",
        });
        setInlineUploadState("done");
      } else if (matches.length > 0) {
        toast({
          title: `${matches.length} roles match your background`,
          description: `This role wasn't in your top matches, but we found ${matches.length} others. Redirecting...`,
        });
        setTimeout(() => setLocation("/jobs"), 1500);
        setInlineUploadState("idle");
      } else {
        toast({
          title: "Resume uploaded successfully",
          description: "No strong matches found right now. We'll notify you when new roles appear.",
        });
        setInlineUploadState("idle");
      }
    } catch (error: any) {
      setInlineUploadState("idle");
      toast({
        title: "Couldn't process your resume",
        description: error.message || "Please try again with a different file.",
        variant: "destructive",
      });
    }
  };

  const saveJobMutation = useMutation({
    mutationFn: async () => {
      if (!job) return;
      if (jobIsSaved) {
        await apiRequest("DELETE", `/api/saved-jobs/${job.id}`);
      } else {
        await apiRequest("POST", `/api/saved-jobs/${job.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs/ids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
    },
    onError: (error: any) => {
      if (error?.message?.includes("5 jobs") || error?.message?.includes("Upgrade to Pro")) {
        toast({ title: "Save limit reached", description: "Free accounts can save up to 5 jobs. Upgrade to Pro for unlimited saves.", variant: "destructive" });
      }
    },
  });

  const reportMutation = useMutation({
    mutationFn: async ({ reportType, details }: { reportType: string; details?: string }) => {
      if (!job) return;
      await apiRequest("POST", `/api/jobs/${job.id}/report`, { reportType, details });
    },
    onSuccess: () => {
      toast({ title: "Thanks for the report!", description: "We'll review it shortly." });
      setShowReportDialog(false);
      setReportType("broken_link");
      setReportDetails("");
    },
  });

  const { data: similarJobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs", jobId, "similar"],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}/similar`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!jobId,
  });


  const salary = formatSalary(job?.salaryMin, job?.salaryMax, (job as any)?.salaryCurrency);
  const postedLabel = getPostedDateLabel(job?.postedDate);
  const locationTypeLabel = job ? getLocationTypeLabel(job) : null;

  const handleApplyClick = () => {
    if (!job) return;
    trackNow({
      eventType: "apply_click",
      entityType: "job",
      entityId: String(job.id),
      metadata: {
        company: job.company,
        roleCategory: job.roleCategory,
        title: job.title,
      },
    });
    apiRequest("POST", `/api/jobs/${job.id}/apply-click`).catch((e) =>
      console.error("Failed to track apply click", e)
    );
    setShowApplyNudge(true);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading job details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !authLoading && showSignupGate) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8" data-testid="button-back-jobs-gate">
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Link>
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 mb-4">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-serif font-medium text-foreground mb-2" data-testid="text-signup-gate-title">
                You've previewed {ANON_VIEW_LIMIT} jobs
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Create a free account to keep exploring job details, save favorites, and get personalized recommendations.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href={authReturnUrl}>
                  <Button data-testid="button-signup-gate-create">
                    Create Free Account
                  </Button>
                </Link>
                <Link href={authReturnUrl}>
                  <Button variant="outline" data-testid="button-signup-gate-signin">
                    Sign In
                  </Button>
                </Link>
              </div>
              <div className="mt-6 pt-5 border-t space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Free accounts include:</p>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Unlimited job browsing</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Save favorite jobs</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Resume upload</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated && !job) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Job Not Found</h1>
          <p className="text-muted-foreground mb-6">This job listing may have been removed or is no longer available.</p>
          <Button onClick={() => setLocation("/jobs")} data-testid="button-back-jobs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Job Not Found</h1>
          <p className="text-muted-foreground mb-6">This job listing may have been removed or is no longer available.</p>
          <Button onClick={() => setLocation("/jobs")} data-testid="button-back-jobs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  if (!job.isPublished) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="rounded-md border border-border/50 bg-muted/30 p-8">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2" data-testid="text-job-standardizing">Being Standardized</h1>
            <p className="text-sm text-muted-foreground mb-1 font-medium">{cleanStructuredText(job.title)} at {cleanStructuredText(job.company)}</p>
            <p className="text-sm text-muted-foreground mb-6">This job listing is currently being reviewed and standardized. It will be available soon.</p>
            <Button onClick={() => setLocation("/jobs")} data-testid="button-back-jobs-standardizing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Browse Available Jobs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5" data-testid="button-back-jobs">
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        {/* === HEADER === */}
        <div className="mb-6" ref={applyButtonRef}>
          <h1
            className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight leading-tight"
            data-testid="text-job-detail-title"
          >
            {cleanStructuredText(job.title)}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground mt-3">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground/80" data-testid="text-job-detail-company">{cleanStructuredText(job.company)}</span>
            </span>
            <JobLocation
              location={job.location}
              locationType={job.locationType}
              isRemote={job.isRemote}
              size="md"
              testIdPrefix="job-detail"
            />
            {salary && (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                <span data-testid="text-salary">{salary}</span>
              </span>
            )}
            {job.seniorityLevel && (
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                <span data-testid="text-level">{job.seniorityLevel}</span>
              </span>
            )}
            {postedLabel && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span data-testid="text-posted-date">{postedLabel}</span>
              </span>
            )}
          </div>

          {(job.roleCategory || job.roleSubcategory || (job.legalRelevanceScore && job.legalRelevanceScore >= 8)) && (
            <div className="flex flex-wrap gap-1.5 mt-3" data-testid="section-job-badges">
              {job.roleCategory && (
                <Badge
                  variant="outline"
                  className="gap-1"
                  data-testid="badge-role-category"
                >
                  <Briefcase className="h-3 w-3" />
                  {cleanStructuredText(job.roleCategory)}
                </Badge>
              )}
              {job.roleSubcategory && (
                <Badge
                  variant="outline"
                  className="gap-1 text-xs"
                  data-testid="badge-role-subcategory"
                >
                  {cleanStructuredText(job.roleSubcategory)}
                </Badge>
              )}
              {job.legalRelevanceScore && job.legalRelevanceScore >= 8 && (
                <Badge
                  variant="secondary"
                  className={`gap-1 ${
                    job.legalRelevanceScore >= 9
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                      : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800"
                  }`}
                  data-testid="badge-legal-fit"
                >
                  <Scale className="h-3 w-3" />
                  {job.legalRelevanceScore >= 9 ? "JD Preferred" : "Legal Background Valued"}
                </Badge>
              )}
            </div>
          )}

          {job.keySkills && job.keySkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2" data-testid="section-key-skills">
              {job.keySkills.map((skill, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs"
                  data-testid={`badge-skill-${i}`}
                >
                  {cleanStructuredText(skill)}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground mt-3" data-testid="section-trust-attribution">
            {(job.sourceName || job.sourceDomain) && (
              <span className="flex items-center gap-1">
                {job.sourceUrl ? (
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    data-testid="link-source-attribution"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    Found on {job.sourceName || job.sourceDomain}
                  </a>
                ) : (
                  <>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span data-testid="text-source-attribution">Found on {job.sourceName || job.sourceDomain}</span>
                  </>
                )}
              </span>
            )}
            {getLastCheckedLabel(job.lastCheckedAt) && (
              <span className="flex items-center gap-1" data-testid="text-last-verified">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                {getLastCheckedLabel(job.lastCheckedAt)}
              </span>
            )}
            {job.jobStatus === 'closed' && (
              <Badge variant="secondary" className="text-[10px] gap-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" data-testid="badge-job-closed">
                <AlertTriangle className="h-2.5 w-2.5" />
                This position may be closed
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1 h-auto py-0.5 px-1.5"
              onClick={() => setShowReportDialog(true)}
              data-testid="button-report-issue"
            >
              <Flag className="h-3 w-3" />
              Report an issue
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {job?.applyUrl ? (
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" onClick={handleApplyClick}>
                <Button className="gap-2" data-testid="button-apply-top">
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Apply on Company Website</span>
                  <span className="sm:hidden">Apply Now</span>
                </Button>
              </a>
            ) : (
              <Button className="gap-2" disabled data-testid="button-apply-top">
                <ExternalLink className="h-4 w-4" />
                Apply link unavailable
              </Button>
            )}
            {isAuthenticated ? (
              <Button
                variant="outline"
                onClick={() => saveJobMutation.mutate()}
                disabled={saveJobMutation.isPending}
                data-testid="button-save-job-detail"
                className={`gap-1.5 ${jobIsSaved ? "text-primary" : ""}`}
              >
                <Bookmark className={`h-4 w-4 ${jobIsSaved ? "fill-current" : ""}`} />
                {jobIsSaved ? "Saved" : "Save"}
              </Button>
            ) : (
              <Link href={authReturnUrl}>
                <Button
                  variant="outline"
                  className="gap-1.5 text-muted-foreground"
                  data-testid="button-save-signin"
                >
                  <Bookmark className="h-4 w-4" />
                  Save
                </Button>
              </Link>
            )}
          </div>

          {showApplyNudge && (
            <div className="mt-3 flex items-center gap-2" data-testid="section-apply-nudge">
              <p className="text-sm text-muted-foreground">Good luck with your application!</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => setShowApplyNudge(false)}
                data-testid="button-apply-nudge-dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* === UNIFIED JOB DETAILS CARD === */}
        <Card className="mb-6" data-testid="section-job-details">
          <CardContent className="p-5 sm:p-6">
            {job.aiSummary && (
              <div data-testid="section-ai-summary" className="mb-6">
                <div className="rounded-md bg-muted/50 border border-border/30 p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="heading-ai-summary">
                      At a Glance
                    </span>
                  </div>
                  <p className="text-[0.925rem] text-foreground/80 leading-[1.75]" data-testid="text-ai-summary">
                    {cleanStructuredText(job.aiSummary)}
                  </p>
                </div>
              </div>
            )}

            {(() => {
              const structured = parseStructuredDescription(job.structuredDescription);
              if (structured) {
                return (
                  <div data-testid="section-full-description">
                    <StructuredDescriptionView data={structured} />
                  </div>
                );
              }
              if (job.description) {
                return (
                  <div data-testid="section-full-description">
                    <DescriptionContent text={job.description} testId="text-job-description" isPro={isPro} />
                    {job.requirements && (
                      <div className="mt-8 pt-6 border-t border-border/40">
                        <DescriptionContent text={job.requirements} testId="text-job-requirements" isPro={isPro} />
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            {isAuthenticated && resumeFit && resumeFit.length > 0 && (
              <div data-testid="section-resume-fit" className="mt-6 pt-6 border-t border-border/40">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Resume Fit</h3>
                <p className="text-xs text-muted-foreground mb-3">Job-specific fit analysis.</p>
                <div className="space-y-2.5">
                  {resumeFit.map((rf) => (
                    <div
                      key={rf.resumeId}
                      className="rounded-md border border-border/40 p-3"
                      data-testid={`resume-fit-${rf.resumeId}`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">{rf.label}</span>
                          {rf.isPrimary && (
                            <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${
                            rf.score >= 60 ? "text-green-600 dark:text-green-400" :
                            rf.score >= 30 ? "text-amber-600 dark:text-amber-400" :
                            "text-muted-foreground"
                          }`}>
                            {rf.score}% match
                          </span>
                        </div>
                      </div>
                      <Progress value={rf.score} className="h-1.5 mb-2" />
                      <div className="flex flex-wrap gap-1">
                        {rf.matched.map((s, i) => (
                          <Badge key={`m-${i}`} variant="outline" className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40 gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {s}
                          </Badge>
                        ))}
                        {rf.missing.map((s, i) => (
                          <Badge key={`g-${i}`} variant="outline" className="text-[10px] text-muted-foreground gap-0.5">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(() => {
              const hasMatch = !!(resumeFit && resumeFit.length > 0);
              const primaryFit = resumeFit?.find(r => r.isPrimary) || resumeFit?.[0];
              const primaryScore = primaryFit?.score ?? null;
              return (
                <div className="mt-6 pt-6 border-t border-border/40" data-testid="section-next-step">
                  <NextStepCard
                    isLoggedIn={isAuthenticated}
                    isPro={isPro}
                    hasMatch={hasMatch}
                    matchScore={primaryScore}
                    onUploadResume={() => setLocation("/resumes")}
                    onOpenRewrite={() => setLocation(`/resume-review/${job?.id}`)}
                    onSignIn={() => setLocation(authReturnUrl)}
                    roleCategory={job?.roleCategory}
                    jobId={job?.id}
                  />
                </div>
              );
            })()}

          </CardContent>
        </Card>

        {/* === ATS RESUME KEYWORDS === */}
        {job.keySkills && job.keySkills.length >= 3 && (
          <Card className="mb-6" data-testid="card-ats-keywords">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <h3 className="text-sm font-semibold text-foreground">Resume Keywords for This Role</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Include these terms in your resume to align with this position. Most applicant tracking systems scan for exact keyword matches.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {job.keySkills.map((skill, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs gap-1 bg-primary/5 border-primary/20"
                    data-testid={`badge-ats-keyword-${i}`}
                  >
                    <CheckCircle2 className="h-2.5 w-2.5 text-primary shrink-0" />
                    {cleanStructuredText(skill)}
                  </Badge>
                ))}
              </div>
              {job.experienceText && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Experience level:</span>{" "}
                    {job.experienceText}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* === RESUME MATCH TEASER === */}
        {(() => {
          const hasResumes = userResumes.length > 0;
          const hasMatchData = !!(resumeFit && resumeFit.length > 0);

          if (isPro && hasMatchData) return null;

          if (!isAuthenticated) {
            return (
              <Card className="mb-6 border-primary/20" data-testid="card-match-teaser-anon">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground mb-1">
                        How well do you match this role?
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Upload your resume and instantly see which skills align with this position and where to focus your preparation.
                      </p>
                      <Link href={`/auth?returnTo=/jobs/${jobId}`}>
                        <Button size="sm" data-testid="button-match-teaser-signup">
                          Create Free Account
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          if (!hasResumes) {
            if (inlineUploadState === "done" && inlineMatchResult) {
              const scoreColor = inlineMatchResult.score >= 75 ? "text-emerald-600 dark:text-emerald-400" :
                inlineMatchResult.score >= 55 ? "text-amber-600 dark:text-amber-400" :
                inlineMatchResult.score > 0 ? "text-muted-foreground" : "text-muted-foreground";
              return (
                <Card className="mb-6 border-primary/20" data-testid="card-match-result-inline">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {inlineMatchResult.score > 0 ? (
                          <>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-semibold text-foreground">Your match score</h3>
                              <span className={`text-lg font-bold ${scoreColor}`} data-testid="text-inline-match-score">
                                {inlineMatchResult.score}%
                              </span>
                            </div>
                            {inlineMatchResult.highlights.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {inlineMatchResult.highlights.slice(0, 3).map((h, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
                                ))}
                              </div>
                            )}
                            {inlineMatchResult.gapSummary && (
                              <p className="text-xs text-muted-foreground mb-3">{inlineMatchResult.gapSummary}</p>
                            )}
                            <Link href={`/resume-review/${job?.id}`}>
                              <Button size="sm" data-testid="button-inline-match-improve">
                                <FileText className="h-3.5 w-3.5 mr-1.5" />
                                Improve your resume for this role
                              </Button>
                            </Link>
                          </>
                        ) : (
                          <>
                            <h3 className="text-sm font-semibold text-foreground mb-1">Resume uploaded</h3>
                            <p className="text-sm text-muted-foreground mb-3">{inlineMatchResult.gapSummary}</p>
                            <Link href="/jobs">
                              <Button size="sm" variant="outline" data-testid="button-inline-match-browse">
                                See your matches
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card className="mb-6 border-primary/20" data-testid="card-match-teaser-no-resume">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground mb-1">
                        {inlineUploadState !== "idle" ? (
                          inlineUploadState === "uploading" ? "Processing your resume..." : "Finding your matches..."
                        ) : (
                          "See how you match this role"
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {inlineUploadState !== "idle"
                          ? "This usually takes about 15 seconds."
                          : "Upload your resume and instantly see how your skills align with this position."
                        }
                      </p>
                      <input
                        ref={inlineUploadRef}
                        type="file"
                        accept=".pdf,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleInlineUpload(file);
                          if (inlineUploadRef.current) inlineUploadRef.current.value = "";
                        }}
                        data-testid="input-inline-upload-file"
                      />
                      <Button
                        size="sm"
                        onClick={() => inlineUploadRef.current?.click()}
                        disabled={inlineUploadState !== "idle"}
                        data-testid="button-match-teaser-upload"
                      >
                        {inlineUploadState !== "idle" ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            {inlineUploadState === "matching" ? "Matching..." : "Processing..."}
                          </>
                        ) : (
                          <>
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            Upload Resume
                          </>
                        )}
                      </Button>
                      {inlineUploadState === "idle" && (
                        <p className="text-xs text-muted-foreground mt-2">PDF or DOCX</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          if (!isPro && hasMatchData) {
            const topFit = resumeFit![0];
            return (
              <Card className="mb-6 border-primary/20" data-testid="card-match-teaser-upgrade">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground mb-1">
                        Your resume match is ready
                      </h3>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">{topFit.label}</span>
                            <span className="text-sm font-semibold text-foreground/40 blur-[3px] select-none" aria-hidden="true">
                              {topFit.score}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/30"
                              style={{ width: `${Math.min(topFit.score, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Upgrade to see your full match score, skill gaps, and tailored recommendations.
                      </p>
                      <Button size="sm" onClick={() => setLocation("/pricing")} data-testid="button-match-teaser-upgrade">
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Unlock Full Match
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return null;
        })()}

        {similarJobs.length > 0 && (
          <div className="mb-8" data-testid="section-similar-jobs">
            <h2 className="text-lg font-serif font-medium text-foreground mb-4 tracking-tight">
              {job?.roleCategory ? `More in ${job.roleCategory}` : "Similar Roles"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {similarJobs.map(sj => {
                const sjSalary = formatSalary(sj.salaryMin, sj.salaryMax, (sj as any).salaryCurrency);
                const sjLegalFit = sj.legalRelevanceScore && sj.legalRelevanceScore >= 8;
                return (
                  <Link key={sj.id} href={`/jobs/${sj.id}`}>
                    <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-similar-job-${sj.id}`}>
                      <CardContent className="p-4">
                        <h3 className="font-medium text-foreground text-sm leading-snug line-clamp-2" data-testid={`text-similar-title-${sj.id}`}>
                          {cleanStructuredText(sj.title)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {cleanStructuredText(sj.company)}
                          </span>
                          <JobLocation
                            location={sj.location}
                            locationType={sj.locationType}
                            isRemote={sj.isRemote}
                            showIcon={true}
                          />
                          {sjSalary && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <DollarSign className="h-3 w-3" />
                              {sjSalary}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sjLegalFit && (
                            <Badge variant="secondary" className="text-[10px] gap-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                              <Scale className="h-2.5 w-2.5" />
                              Legal Fit
                            </Badge>
                          )}
                          {sj.seniorityLevel && (
                            <Badge variant="outline" className="text-[10px]">{sj.seniorityLevel}</Badge>
                          )}
                          {sj.keySkills && sj.keySkills.slice(0, 3).map((skill, si) => (
                            <Badge key={si} variant="outline" className="text-[10px]">
                              {cleanStructuredText(skill)}
                            </Badge>
                          ))}
                          {sj.keySkills && sj.keySkills.length > 3 && (
                            <span className="text-[10px] text-muted-foreground self-center">+{sj.keySkills.length - 3}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <div
        className={`fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg transition-transform duration-300 ${showStickyBar ? "translate-y-0" : "translate-y-full"}`}
        data-testid="sticky-apply-bar"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 hidden sm:block">
            <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
            <p className="text-xs text-muted-foreground truncate">{job.company}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveJobMutation.mutate()}
                disabled={saveJobMutation.isPending}
                className={`gap-1.5 ${jobIsSaved ? "text-primary" : ""}`}
                data-testid="button-save-sticky"
              >
                <Bookmark className={`h-4 w-4 ${jobIsSaved ? "fill-current" : ""}`} />
                <span className="hidden sm:inline">{jobIsSaved ? "Saved" : "Save"}</span>
              </Button>
            )}
            {!isAuthenticated && (
              <Link href={authReturnUrl}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  data-testid="button-save-sticky-signin"
                >
                  <Bookmark className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {job?.applyUrl ? (
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" onClick={handleApplyClick} className="flex-1 sm:flex-none">
                <Button className="gap-2 w-full" data-testid="button-apply-sticky">
                  <ExternalLink className="h-4 w-4" />
                  Apply Now
                </Button>
              </a>
            ) : (
              <Button className="gap-2 flex-1 sm:flex-none" disabled data-testid="button-apply-sticky">
                <ExternalLink className="h-4 w-4" />
                Apply Now
              </Button>
            )}
          </div>
        </div>
      </div>

      <Footer />

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="heading-report-dialog">Report an Issue</DialogTitle>
            <DialogDescription>Help us keep listings accurate by reporting problems.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <RadioGroup value={reportType} onValueChange={setReportType} data-testid="radio-report-type">
              {[
                { value: "broken_link", label: "Broken link" },
                { value: "duplicate", label: "Duplicate posting" },
                { value: "wrong_category", label: "Wrong category" },
                { value: "outdated", label: "Outdated/expired" },
                { value: "spam", label: "Spam" },
              ].map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`report-${opt.value}`} data-testid={`radio-report-${opt.value}`} />
                  <Label htmlFor={`report-${opt.value}`} className="text-sm">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
            <div>
              <Label htmlFor="report-details" className="text-sm text-muted-foreground">Details (optional)</Label>
              <Textarea
                id="report-details"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Any additional context..."
                className="mt-1.5"
                rows={3}
                data-testid="textarea-report-details"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowReportDialog(false)} data-testid="button-report-cancel">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => reportMutation.mutate({ reportType, details: reportDetails || undefined })}
                disabled={reportMutation.isPending}
                data-testid="button-report-submit"
              >
                {reportMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Flag className="h-3.5 w-3.5 mr-1.5" />
                )}
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
