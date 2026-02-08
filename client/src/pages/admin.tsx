import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw, Building2, Globe, Loader2, CheckCircle, XCircle, Sparkles, Activity, FileText, Play, Square, LinkIcon, Clock, ShieldX, ShieldCheck, Plus, Upload, Pencil, Trash2, RotateCw, ToggleLeft, ToggleRight, Search, Filter, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Save, X as XIcon, BarChart3, ClipboardPaste, Zap, MapPin, DollarSign, Briefcase, GraduationCap, Tag, Eye, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Job, StructuredDescription } from "@shared/schema";
import { JOB_TAXONOMY } from "@shared/schema";
import { cleanStructuredText, parseStructuredDescription } from "@/lib/structured-description";
import { StructuredDescriptionView } from "@/components/structured-description-view";

const SENIORITY_OPTIONS = ["Intern", "Fellowship", "Entry", "Mid", "Senior", "Lead", "Director", "VP"];

const ADMIN_HL_PATTERNS: { pattern: RegExp; cls: string }[] = [
  { pattern: /\b(\d+)\+?\s*(?:[-–]?\s*\d+\s*)?(?:years?|yrs?)\b(?:\s+(?:of\s+)?(?:experience|exp))?/gi, cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' },
  { pattern: /\b(?:JD|J\.D\.|Juris Doctor|Bar (?:Admission|License)|Licensed Attorney|LL\.?M\.?|CIPP|CIPM|PMP|CISSP|Certified)\b/gi, cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
  { pattern: /\b(?:Bachelor'?s?|Master'?s?|MBA|Ph\.?D\.?|Doctorate|B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?)\b(?:\s+(?:degree|in))?\b/gi, cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  { pattern: /\b(?:Python|JavaScript|TypeScript|SQL|React|Node\.?js|AWS|Azure|Salesforce|Relativity|Everlaw|DISCO|NetDocuments|iManage|Clio|Luminance|Kira|LexisNexis|Westlaw|Docker|Jira|Tableau|Power BI|Excel|Agile)\b/gi, cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' },
  { pattern: /\b(?:e-?discovery|ediscovery|litigation|compliance|regulatory|GDPR|CCPA|privacy|intellectual property|patent|trademark|copyright|M&A|due diligence|corporate governance|contract (?:management|review|drafting)|CLM|antitrust|securities|SOX|HIPAA|AML|KYC|data protection|information governance|legal hold|privilege review|document review)\b/gi, cls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300' },
  { pattern: /\$\s*\d[\d,]*(?:\.\d{2})?(?:\s*[-–]\s*\$?\s*\d[\d,]*(?:\.\d{2})?)?\s*(?:per\s+(?:hour|year|annum|month)|\/(?:hr|yr|mo)|annually|(?:K|k)\b)?/g, cls: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300' },
  { pattern: /\b(?:equity|stock options?|RSU|bonus|401\(?k\)?|health (?:insurance|benefits)|PTO|paid time off|parental leave|remote work|work[- ]from[- ]home|flexible (?:hours|schedule|work))\b/gi, cls: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300' },
  { pattern: /\b(?:leadership|communication|collaboration|teamwork|problem[- ]solving|critical thinking|analytical|strategic (?:thinking|planning)|stakeholder management|cross[- ]functional|mentoring|negotiation|presentation|interpersonal|relationship[- ]building|project management|decision[- ]making)\b/gi, cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300' },
];

function adminHighlight(text: string): (string | JSX.Element)[] {
  const matches: { start: number; end: number; cls: string }[] = [];
  for (const { pattern, cls } of ADMIN_HL_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      const overlap = matches.some(ex => m!.index < ex.end && m!.index + m![0].length > ex.start);
      if (!overlap) matches.push({ start: m.index, end: m.index + m[0].length, cls });
    }
  }
  if (matches.length === 0) return [text];
  matches.sort((a, b) => a.start - b.start);
  const parts: (string | JSX.Element)[] = [];
  let last = 0;
  matches.forEach((match, idx) => {
    if (match.start > last) parts.push(text.slice(last, match.start));
    parts.push(<mark key={`ah-${idx}`} className={`${match.cls} px-0.5 py-0 rounded text-[0.92em] font-medium no-underline`}>{text.slice(match.start, match.end)}</mark>);
    last = match.end;
  });
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function decodeAdminHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
    .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
    .replace(/&bull;/g, '\u2022').replace(/&hellip;/g, '\u2026')
    .replace(/&trade;/g, '\u2122').replace(/&copy;/g, '\u00A9').replace(/&reg;/g, '\u00AE')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function fixAdminSentenceSpaces(text: string): string {
  const abbreviations = /^(?:Mr|Ms|Mrs|Dr|Jr|Sr|St|vs|etc|ie|eg|al|Prof|Gen|Gov|Rev|Hon|Inc|Ltd|Co|Corp|LLC|Vol|No|Fig|Eq|Dept|Est|Assn|Intl)$/i;
  let result = '';
  let lastIndex = 0;
  const re = /(\w)([.!?])([A-Z][a-z])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const matchPos = m.index;
    const lookback = text.slice(Math.max(0, matchPos - 12), matchPos + 1);
    const lastWord = lookback.match(/([A-Za-z]+)$/)?.[1] || '';
    if (lastWord.length === 1 || abbreviations.test(lastWord)) continue;
    result += text.slice(lastIndex, matchPos) + m[1] + m[2] + ' ' + m[3];
    lastIndex = matchPos + m[0].length;
  }
  result += text.slice(lastIndex);
  return result;
}

function cleanAdminText(text: string): string {
  let cleaned = decodeAdminHtmlEntities(text);
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
  cleaned = fixAdminSentenceSpaces(cleaned);
  return cleaned.trim();
}


function AdminJobDescription({ description }: { description?: string | null }) {
  if (!description) return <p className="text-xs text-muted-foreground italic">No description</p>;
  const text = cleanAdminText(description);

  const lines = text.split('\n').filter(l => l.trim());
  const headingRe = /^(?:About|What|Who|Responsibilities|Qualifications|Requirements|Skills|Benefits|Perks|Compensation|Getting|In this|How you|Why|Our|The|Your|Key|Core|Preferred|Required|Nice|Education|Experience|Pluses?)\b/i;

  return (
    <div className="space-y-1 text-xs leading-relaxed max-h-[300px] overflow-y-auto pr-2" data-testid="admin-job-description">
      {lines.slice(0, 40).map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const isBullet = /^[-\u2022*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed);
        const isHead = headingRe.test(trimmed) && trimmed.length < 80;

        if (isHead) {
          return <p key={i} className="font-semibold text-foreground pt-2 first:pt-0 text-xs">{adminHighlight(trimmed)}</p>;
        }
        if (isBullet) {
          const content = trimmed.replace(/^[-\u2022*]\s+|^\d+[.)]\s+/, '');
          return (
            <div key={i} className="flex gap-1.5 pl-2 py-0.5">
              <span className="text-muted-foreground/60 shrink-0 mt-1 w-1 h-1 rounded-full bg-foreground/25" />
              <span className="text-foreground/80">{adminHighlight(content)}</span>
            </div>
          );
        }
        return <p key={i} className="text-foreground/80">{adminHighlight(trimmed)}</p>;
      })}
      {lines.length > 40 && (
        <p className="text-muted-foreground italic pt-1">...{lines.length - 40} more lines</p>
      )}
    </div>
  );
}
const TAXONOMY_CATEGORIES = Object.entries(JOB_TAXONOMY).map(([name, data]) => ({
  value: name,
  label: data.shortName,
  subcategories: data.subcategories as readonly string[],
}));

interface Company {
  name: string;
  type: string;
  careerUrl: string;
  hasApi: boolean;
}

interface ScrapeResult {
  success: boolean;
  message: string;
  stats?: { company: string; found: number; filtered: number; categorized?: number }[];
  inserted: number;
  updated: number;
  totalScraped?: number;
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  category: string;
  message: string;
  details?: Record<string, any>;
}

interface ValidationStatus {
  isRunning: boolean;
  progress: { current: number; total: number };
  stats: { valid: number; broken: number };
  startedAt: string | null;
  lastCheckedAt: string | null;
}

interface MonitoringData {
  scheduler: {
    running: boolean;
    nextRun: string;
  };
  jobs: {
    total: number;
    bySource: Record<string, number>;
  };
  logs: {
    files: { filename: string; date: string; size: number }[];
    recent: LogEntry[];
  };
}

interface UploadFileResult {
  filename: string;
  success: boolean;
  job?: { title: string; company: string; category: string };
  error?: string;
}

interface UploadResponse {
  success: boolean;
  message: string;
  results: UploadFileResult[];
}

interface AdminJobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminPage() {
  usePageTitle("Admin Dashboard");
  const { toast } = useToast();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [lastResult, setLastResult] = useState<ScrapeResult | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [addJobMode, setAddJobMode] = useState<"quick" | "smart" | "file">("quick");
  const [smartInput, setSmartInput] = useState("");
  const [quickAddUrls, setQuickAddUrls] = useState("");
  const [quickAddResults, setQuickAddResults] = useState<Array<{ url: string; status: 'added' | 'updated' | 'failed' | 'skipped'; title?: string; company?: string; error?: string }>>([]);
  const [previewJob, setPreviewJob] = useState<Record<string, any> | null>(null);
  const [previewEdits, setPreviewEdits] = useState<Record<string, any>>({});
  const [addJobError, setAddJobError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadResults, setUploadResults] = useState<UploadFileResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [jobsPage, setJobsPage] = useState(1);
  const [jobsSearch, setJobsSearch] = useState("");
  const [jobsCategoryFilter, setJobsCategoryFilter] = useState("all");
  const [jobsSourceFilter, setJobsSourceFilter] = useState("all");
  const [jobsActiveFilter, setJobsActiveFilter] = useState("all");
  const [jobsSeniorityFilter, setJobsSeniorityFilter] = useState("");
  const [jobsReviewFilter, setJobsReviewFilter] = useState("all");
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState<Partial<Job>>({});
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [showStructuredEdit, setShowStructuredEdit] = useState(false);
  const [isScanningRelevance, setIsScanningRelevance] = useState(false);

  const { data: companies, isLoading: loadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/admin/scraper/companies"],
    enabled: isAdmin,
  });

  const { data: monitoring, isLoading: loadingMonitoring, refetch: refetchMonitoring } = useQuery<MonitoringData>({
    queryKey: ["/api/admin/monitoring"],
    refetchInterval: 15000,
    enabled: isAdmin,
  });

  const { data: validationStatus, refetch: refetchValidation } = useQuery<ValidationStatus>({
    queryKey: ["/api/admin/validation-status"],
    refetchInterval: 5000,
    enabled: isAdmin,
  });

  const jobsQueryParams = new URLSearchParams({
    page: jobsPage.toString(),
    limit: "50",
    ...(jobsSearch && { search: jobsSearch }),
    ...(jobsCategoryFilter !== "all" && { category: jobsCategoryFilter }),
    ...(jobsSourceFilter !== "all" && { source: jobsSourceFilter }),
    ...(jobsActiveFilter !== "all" && { active: jobsActiveFilter }),
    ...(jobsSeniorityFilter && { seniority: jobsSeniorityFilter }),
    ...(jobsReviewFilter !== "all" && { reviewStatus: jobsReviewFilter }),
  });

  const { data: adminJobs, isLoading: loadingAdminJobs } = useQuery<AdminJobsResponse>({
    queryKey: [`/api/admin/jobs?${jobsQueryParams.toString()}`],
    enabled: isAdmin,
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadResults([]);
    try {
      if (files.length === 1) {
        const file = files[0];
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/jobs/preview-file", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error("File processing failed");
        const data = await res.json();
        if (data.success && data.parsed) {
          setPreviewJob(data.parsed);
          setPreviewEdits(data.parsed);
          setAddJobError(null);
        } else {
          setAddJobError(data.error || "Could not extract job details from file.");
        }
      } else {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
          formData.append("files", files[i]);
        }
        const res = await fetch("/api/admin/scraper/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error("Upload failed");
        const data: UploadResponse = await res.json();
        setUploadResults(data.results);
        queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/admin/jobs") });
        queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/jobs") });
        toast({
          title: data.success ? "Upload Complete" : "Upload Had Issues",
          description: data.message,
        });
      }
    } catch (error: any) {
      setAddJobError(error.message);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Job> }) => {
      const res = await apiRequest("PATCH", `/api/admin/jobs/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      setEditingJob(null);
      setEditForm({});
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/admin/jobs") });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/jobs") });
      toast({ title: "Job updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update job", description: error.message, variant: "destructive" });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/jobs/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/admin/jobs") });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/jobs") });
      toast({ title: "Job deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete job", description: error.message, variant: "destructive" });
    },
  });

  const recategorizeJobMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/jobs/${id}/recategorize`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/admin/jobs") });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/jobs") });
      toast({
        title: "Job recategorized",
        description: data.categorization ? `Category: ${data.categorization.category}` : "Done",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to recategorize", description: error.message, variant: "destructive" });
    },
  });

  const toggleJobActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/jobs/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/admin/jobs") });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/jobs") });
      toast({ title: "Job status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const reviewJobMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'approve' | 'reject' }) => {
      const res = await apiRequest("POST", `/api/admin/jobs/${id}/review`, { action });
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/admin/jobs") });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/jobs") });
      toast({ title: variables.action === 'approve' ? "Job approved" : "Job rejected and deactivated" });
    },
    onError: (error: Error) => {
      toast({ title: "Review failed", description: error.message, variant: "destructive" });
    },
  });

  const handleScanRelevance = async () => {
    setIsScanningRelevance(true);
    try {
      const res = await apiRequest("POST", "/api/admin/scan-relevance", {});
      const data = await res.json();
      toast({
        title: "Relevance scan started",
        description: data.message,
      });
    } catch (error: any) {
      toast({ title: "Failed to start scan", description: error.message, variant: "destructive" });
    } finally {
      setTimeout(() => setIsScanningRelevance(false), 5000);
    }
  };

  const openEditDialog = (job: Job) => {
    setEditingJob(job);
    setShowStructuredEdit(false);
    setEditForm({
      title: job.title,
      company: job.company,
      location: job.location,
      applyUrl: job.applyUrl,
      description: job.description,
      aiSummary: job.aiSummary,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      isActive: job.isActive,
      isRemote: job.isRemote,
      locationType: job.locationType || (job.isRemote ? 'remote' : 'onsite'),
      roleCategory: job.roleCategory,
      roleSubcategory: job.roleSubcategory,
      seniorityLevel: job.seniorityLevel,
      keySkills: job.keySkills,
      structuredDescription: job.structuredDescription as StructuredDescription | null,
    });
  };

  const updateStructuredField = (field: keyof StructuredDescription, value: string) => {
    setEditForm((f) => {
      const current = (f.structuredDescription as StructuredDescription) || {
        aboutCompany: "",
        responsibilities: [],
        minimumQualifications: [],
        preferredQualifications: [],
        skillsRequired: [],
      };
      if (field === "aboutCompany") {
        return { ...f, structuredDescription: { ...current, aboutCompany: value } };
      }
      const lines = value.split("\n").filter((l) => l.trim());
      return { ...f, structuredDescription: { ...current, [field]: lines } };
    });
  };

  const getStructuredFieldValue = (field: keyof StructuredDescription): string => {
    const sd = editForm.structuredDescription as StructuredDescription | null;
    if (!sd) return "";
    if (field === "aboutCompany") return sd.aboutCompany || "";
    const arr = sd[field];
    return Array.isArray(arr) ? arr.join("\n") : "";
  };

  const getSubcategoriesForCategory = (category: string | null | undefined): readonly string[] => {
    if (!category) return [];
    const tax = JOB_TAXONOMY[category as keyof typeof JOB_TAXONOMY];
    return tax ? tax.subcategories : [];
  };

  const schedulerMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop' | 'run-now') => {
      const res = await apiRequest("POST", `/api/admin/scheduler/${action}`);
      return res.json();
    },
    onSuccess: (data) => {
      refetchMonitoring();
      toast({
        title: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scheduler action failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startValidationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/validate-links/start");
      return res.json();
    },
    onSuccess: (data) => {
      refetchValidation();
      toast({
        title: "Validation started",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start validation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopValidationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/validate-links/stop");
      return res.json();
    },
    onSuccess: (data) => {
      refetchValidation();
      toast({
        title: "Stopping validation",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to stop validation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [smartInputResults, setSmartInputResults] = useState<Record<string, any>[]>([]);
  const [extractionTrace, setExtractionTrace] = useState<Record<string, any> | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  const smartInputMutation = useMutation({
    mutationFn: async (input: string) => {
      const res = await apiRequest("POST", "/api/admin/jobs/smart-input", { input });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.jobs?.length > 0) {
        if (data.trace) {
          setExtractionTrace(data.trace);
          setShowTrace(true);
        } else {
          setExtractionTrace(null);
          setShowTrace(false);
        }
        if (data.jobs.length === 1) {
          setPreviewJob(data.jobs[0]);
          setPreviewEdits(data.jobs[0]);
          setAddJobError(null);
        } else {
          setSmartInputResults(data.jobs);
          setAddJobError(null);
        }
        setSmartInput("");
        const typeLabel = data.inputType === 'url' ? 'URL' : 'text';
        toast({
          title: `Extracted ${data.count} job${data.count > 1 ? 's' : ''} from ${typeLabel}`,
          description: data.jobs[0].title + (data.count > 1 ? ` and ${data.count - 1} more` : ` at ${data.jobs[0].company}`),
        });
      } else {
        setAddJobError(data.error || "Could not extract job details. Try a different format.");
      }
    },
    onError: (error: Error) => {
      setAddJobError(error.message);
      toast({ title: "Extraction failed", description: error.message, variant: "destructive" });
    },
  });

  const quickAddMutation = useMutation({
    mutationFn: async (urlText: string) => {
      const urls = urlText.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 5);
      const res = await apiRequest("POST", "/api/admin/jobs/quick-add", { urls });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setQuickAddResults(data.results || []);
        setQuickAddUrls("");
        queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs"] });
        const { added, updated, failed } = data.summary;
        toast({
          title: `${added} added, ${updated} updated${failed > 0 ? `, ${failed} failed` : ''}`,
          description: `Processed ${data.summary.total} URL${data.summary.total > 1 ? 's' : ''}`,
        });
      } else {
        setAddJobError(data.error || "Failed to process URLs");
      }
    },
    onError: (error: Error) => {
      setAddJobError(error.message);
      toast({ title: "Quick add failed", description: error.message, variant: "destructive" });
    },
  });

  const previewUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/admin/jobs/preview-url", { url });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.parsed) {
        setPreviewJob(data.parsed);
        setPreviewEdits(data.parsed);
        setAddJobError(null);
        setCustomUrl("");
      } else {
        setAddJobError(data.error || "Could not extract job details.");
      }
    },
    onError: (error: Error) => {
      setAddJobError(error.message);
      toast({ title: "Failed to scrape URL", description: error.message, variant: "destructive" });
    },
  });

  const parseTextMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/admin/jobs/parse-text", { text });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.parsed) {
        setPreviewJob(data.parsed);
        setPreviewEdits(data.parsed);
        setAddJobError(null);
        setPasteText("");
      } else {
        setAddJobError(data.error || "Could not parse text.");
      }
    },
    onError: (error: Error) => {
      setAddJobError(error.message);
      toast({ title: "Failed to parse text", description: error.message, variant: "destructive" });
    },
  });

  const confirmJobMutation = useMutation({
    mutationFn: async (jobData: Record<string, any>) => {
      const res = await apiRequest("POST", "/api/admin/jobs/confirm", jobData);
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewJob(null);
      setPreviewEdits({});
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/admin/jobs") });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/jobs") });
      toast({ title: data.message || "Job added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save job", description: error.message, variant: "destructive" });
    },
  });

  const scrapeAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/scraper/run");
      return res.json() as Promise<ScrapeResult>;
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Scraping Complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scraping Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scrapeWithAIMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/scraper/run-with-ai");
      return res.json() as Promise<ScrapeResult>;
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "AI Scraping Complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "AI Scraping Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scrapeYCMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/scraper/yc");
      return res.json() as Promise<ScrapeResult>;
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "YC Scraping Complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "YC Scraping Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scrapeCompanyMutation = useMutation({
    mutationFn: async (companyName: string) => {
      const res = await apiRequest("POST", `/api/admin/scraper/company/${encodeURIComponent(companyName)}`);
      return res.json() as Promise<ScrapeResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Company Scraped",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scraping Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <ShieldX className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to access the admin area. This page is restricted to administrators only.
              </p>
              <Link href="/">
                <Button className="mt-4" data-testid="button-go-home">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Job Scraper Admin</h1>
              <p className="text-sm text-muted-foreground">
                Scrape legal tech jobs from career websites
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/admin/scraper">
                <Button variant="outline" data-testid="link-scraper-dashboard">
                  <Activity className="h-4 w-4 mr-2" />
                  Scraper Autopilot
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button variant="outline" data-testid="link-analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  User Analytics
                </Button>
              </Link>
              <Link href="/admin/events">
                <Button variant="outline" data-testid="link-events-admin">
                  <Calendar className="h-4 w-4 mr-2" />
                  Events
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Scheduler & Monitoring
              </CardTitle>
              <CardDescription>
                View scheduler status, job statistics, and recent logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMonitoring ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Scheduler Status
                        </h4>
                        <Badge variant={monitoring?.scheduler.running ? "default" : "secondary"}>
                          {monitoring?.scheduler.running ? "Running" : "Stopped"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {monitoring?.scheduler.nextRun}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {monitoring?.scheduler.running ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => schedulerMutation.mutate('stop')}
                            disabled={schedulerMutation.isPending}
                            data-testid="button-stop-scheduler"
                          >
                            <Square className="h-3 w-3 mr-1" />
                            Stop
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => schedulerMutation.mutate('start')}
                            disabled={schedulerMutation.isPending}
                            data-testid="button-start-scheduler"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => schedulerMutation.mutate('run-now')}
                          disabled={schedulerMutation.isPending}
                          data-testid="button-run-now"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Run Now
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Building2 className="h-4 w-4" />
                        Job Statistics
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Active Jobs</span>
                          <span className="font-medium">{monitoring?.jobs.total || 0}</span>
                        </div>
                        {monitoring?.jobs.bySource && Object.entries(monitoring.jobs.bySource).map(([source, count]) => (
                          <div key={source} className="flex justify-between text-sm text-muted-foreground">
                            <span className="capitalize">{source}</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Link Validation</span>
                          {validationStatus?.isRunning && (
                            <Badge variant="default" className="text-xs">
                              {validationStatus.progress.current}/{validationStatus.progress.total}
                            </Badge>
                          )}
                        </div>
                        
                        {validationStatus?.isRunning && (
                          <div className="mb-2">
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-300"
                                style={{ 
                                  width: `${(validationStatus.progress.current / validationStatus.progress.total) * 100}%` 
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>{validationStatus.stats.valid} valid</span>
                              <span>{validationStatus.stats.broken} broken</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          {validationStatus?.isRunning ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => stopValidationMutation.mutate()}
                              disabled={stopValidationMutation.isPending}
                              data-testid="button-stop-validation"
                            >
                              <Square className="h-3 w-3 mr-1" />
                              Stop
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => startValidationMutation.mutate()}
                              disabled={startValidationMutation.isPending}
                              data-testid="button-start-validation"
                            >
                              {startValidationMutation.isPending ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <LinkIcon className="h-3 w-3 mr-1" />
                              )}
                              Validate All Links
                            </Button>
                          )}
                        </div>
                        {validationStatus?.isRunning && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Checking 1 job every 10 seconds. Broken links auto-deactivated.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4" />
                      Recent Logs
                    </h4>
                    {monitoring?.logs.recent && monitoring.logs.recent.length > 0 ? (
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-1 text-xs font-mono">
                          {monitoring.logs.recent.map((log, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="text-muted-foreground whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                              <Badge 
                                variant={
                                  log.level === 'ERROR' ? 'destructive' : 
                                  log.level === 'WARN' ? 'secondary' : 
                                  log.level === 'SUCCESS' ? 'default' : 
                                  'outline'
                                }
                                className="text-[10px] h-4 px-1"
                              >
                                {log.level}
                              </Badge>
                              <span className="text-muted-foreground">[{log.category}]</span>
                              <span className="truncate">{log.message}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No logs yet. Run the scheduler to generate logs.
                      </p>
                    )}
                    {monitoring?.logs.files && monitoring.logs.files.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Log files ({monitoring.logs.files.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {monitoring.logs.files.slice(0, 5).map((file) => (
                            <Badge key={file.filename} variant="outline" className="text-xs">
                              {file.date} ({(file.size / 1024).toFixed(1)}KB)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Add Job
              </CardTitle>
              <CardDescription>
                Paste anything - a URL, job description, email, LinkedIn post - the system figures it out. Or drop a file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {smartInputResults.length > 0 && !previewJob && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Found {smartInputResults.length} jobs:</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSmartInputResults([])}
                        data-testid="button-clear-results"
                      >
                        <XIcon className="mr-1.5 h-3.5 w-3.5" />
                        Clear
                      </Button>
                    </div>
                    {smartInputResults.map((job, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-3 border rounded-md hover-elevate cursor-pointer"
                        onClick={() => {
                          setPreviewJob(job);
                          setPreviewEdits(job);
                        }}
                        data-testid={`multi-job-result-${idx}`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{job.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{job.company} &middot; {job.location}</p>
                        </div>
                        <Button size="sm" variant="outline" data-testid={`button-preview-job-${idx}`}>
                          Review
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {!previewJob && smartInputResults.length === 0 && (
                  <>
                    <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
                      <Button
                        size="sm"
                        variant={addJobMode === "quick" ? "default" : "ghost"}
                        onClick={() => { setAddJobMode("quick"); setAddJobError(null); setQuickAddResults([]); }}
                        data-testid="button-mode-quick"
                      >
                        <Zap className="mr-1.5 h-3.5 w-3.5" />
                        Quick Add
                      </Button>
                      <Button
                        size="sm"
                        variant={addJobMode === "smart" ? "default" : "ghost"}
                        onClick={() => { setAddJobMode("smart"); setAddJobError(null); }}
                        data-testid="button-mode-smart"
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Review First
                      </Button>
                      <Button
                        size="sm"
                        variant={addJobMode === "file" ? "default" : "ghost"}
                        onClick={() => { setAddJobMode("file"); setAddJobError(null); }}
                        data-testid="button-mode-file"
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        File
                      </Button>
                    </div>

                    {addJobMode === "quick" && (
                      <div className="space-y-3">
                        <Textarea
                          placeholder={"Paste one or more job URLs (one per line):\n\nhttps://boards.greenhouse.io/company/jobs/123\nhttps://jobs.lever.co/company/abc-def\nhttps://company.bamboohr.com/careers/456"}
                          value={quickAddUrls}
                          onChange={(e) => setQuickAddUrls(e.target.value)}
                          rows={4}
                          data-testid="input-quick-add"
                        />
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-xs text-muted-foreground">
                            Paste URLs and they'll be scraped, categorized, and saved automatically. Up to 20 at a time.
                          </p>
                          <Button
                            onClick={() => {
                              if (quickAddUrls.trim()) {
                                setAddJobError(null);
                                setQuickAddResults([]);
                                quickAddMutation.mutate(quickAddUrls.trim());
                              }
                            }}
                            disabled={quickAddMutation.isPending || quickAddUrls.trim().length < 10}
                            data-testid="button-quick-add"
                          >
                            {quickAddMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Zap className="mr-2 h-4 w-4" />
                                Add Jobs
                              </>
                            )}
                          </Button>
                        </div>

                        {quickAddResults.length > 0 && (
                          <div className="space-y-1.5" data-testid="quick-add-results">
                            {quickAddResults.map((r, idx) => (
                              <div key={idx} className="flex items-start gap-2 p-2.5 border rounded-md text-sm" data-testid={`quick-add-result-${idx}`}>
                                {r.status === 'added' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                                {r.status === 'updated' && <RefreshCw className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />}
                                {r.status === 'failed' && <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                                {r.status === 'skipped' && <XCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
                                <div className="min-w-0 flex-1">
                                  {r.title ? (
                                    <p className="font-medium truncate">{r.title} at {r.company}</p>
                                  ) : (
                                    <p className="font-medium truncate text-muted-foreground break-all">{r.url}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {r.status === 'added' && 'Added successfully'}
                                    {r.status === 'updated' && 'Updated existing job'}
                                    {r.status === 'failed' && (r.error || 'Failed to extract')}
                                    {r.status === 'skipped' && (r.error || 'Skipped')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {addJobMode === "smart" && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder={"Paste a job URL or the full job posting text...\n\nExamples:\nhttps://boards.greenhouse.io/company/jobs/123\nhttps://jobs.lever.co/company/abc-def\n\nOr paste the job description directly:\nSenior Legal Engineer at Clio\nRemote, US - $120K-$160K\nWe are looking for..."}
                          value={smartInput}
                          onChange={(e) => setSmartInput(e.target.value)}
                          rows={5}
                          data-testid="input-smart"
                        />
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-xs text-muted-foreground">
                            URLs, job descriptions, emails, LinkedIn posts - works with anything.
                            Supports Greenhouse, Lever, Ashby, Workday, SmartRecruiters, iCIMS, and more.
                          </p>
                          <Button
                            onClick={() => {
                              if (smartInput.trim()) {
                                setAddJobError(null);
                                smartInputMutation.mutate(smartInput.trim());
                              }
                            }}
                            disabled={smartInputMutation.isPending || smartInput.trim().length < 10}
                            data-testid="button-smart-extract"
                          >
                            {smartInputMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Extracting...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Extract & Review
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {addJobMode === "file" && (
                      <div className="space-y-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.html,.htm,.docx,.txt"
                          className="hidden"
                          data-testid="input-file-upload"
                          onChange={(e) => handleFileUpload(e.target.files)}
                        />
                        <div
                          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
                          }`}
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            handleFileUpload(e.dataTransfer.files);
                          }}
                          data-testid="drop-zone"
                        >
                          {isUploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Processing files...</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <p className="text-sm font-medium">Drop files here or click to browse</p>
                              <p className="text-xs text-muted-foreground">PDF, HTML, DOCX, TXT</p>
                            </div>
                          )}
                        </div>

                        {uploadResults.length > 0 && (
                          <div className="space-y-2" data-testid="upload-results">
                            {uploadResults.map((result, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 p-3 border rounded-md text-sm"
                                data-testid={`upload-result-${idx}`}
                              >
                                {result.success ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{result.filename}</p>
                                  {result.success && result.job ? (
                                    <p className="text-muted-foreground">
                                      {result.job.title} at {result.job.company}
                                      {result.job.category && (
                                        <Badge variant="secondary" className="ml-2 text-xs">{result.job.category}</Badge>
                                      )}
                                    </p>
                                  ) : result.error ? (
                                    <p className="text-destructive">{result.error}</p>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {addJobError && (
                      <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/5" data-testid="add-job-error">
                        <div className="flex items-start gap-3">
                          <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-sm">Failed to extract job</p>
                            <p className="text-sm text-muted-foreground">{addJobError}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {extractionTrace && showTrace && (
                  <div className="border rounded-md p-3 space-y-2 bg-muted/30" data-testid="extraction-trace">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium">Extraction Details</span>
                        <Badge variant={extractionTrace.confidence === 'high' ? 'default' : extractionTrace.confidence === 'medium' ? 'secondary' : 'destructive'} className="text-[10px] px-1.5 py-0">
                          {extractionTrace.confidence === 'high' ? 'High Confidence' : extractionTrace.confidence === 'medium' ? 'Medium Confidence' : 'Low Confidence'}
                        </Badge>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setShowTrace(false)} data-testid="button-hide-trace">
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Platform:</span>
                        <span className="ml-1 font-medium">{extractionTrace.platformLabel}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Method:</span>
                        <span className="ml-1 font-medium">{extractionTrace.extractionMethod}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time:</span>
                        <span className="ml-1 font-medium">{(extractionTrace.processingTimeMs / 1000).toFixed(1)}s</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Extraction Steps</p>
                      {(extractionTrace.steps || []).map((step: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          {step.status === 'success' ? (
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                          ) : step.status === 'failed' ? (
                            <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                          ) : (
                            <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                          )}
                          <span className="font-medium min-w-[120px]">{step.method}</span>
                          <span className="text-muted-foreground">{step.detail}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Fields extracted:</span>
                        <span className="ml-1 font-medium text-green-600 dark:text-green-400">{extractionTrace.fieldsExtracted?.length || 0}/{(extractionTrace.fieldsExtracted?.length || 0) + (extractionTrace.fieldsMissing?.length || 0)}</span>
                      </div>
                      {extractionTrace.fieldsMissing?.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Missing:</span>
                          <span className="ml-1 text-amber-600 dark:text-amber-400">{extractionTrace.fieldsMissing.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {extractionTrace && !showTrace && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowTrace(true)}
                    className="text-xs"
                    data-testid="button-show-trace"
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Show extraction details
                    <Badge variant={extractionTrace.confidence === 'high' ? 'default' : extractionTrace.confidence === 'medium' ? 'secondary' : 'destructive'} className="ml-2 text-[10px] px-1.5 py-0">
                      {extractionTrace.confidence}
                    </Badge>
                  </Button>
                )}

                {previewJob && (
                  <div className="space-y-4" data-testid="job-preview">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Review extracted job before saving
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setPreviewJob(null); setPreviewEdits({}); setExtractionTrace(null); setShowTrace(false); }}
                        data-testid="button-cancel-preview"
                      >
                        <XIcon className="mr-1 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={previewEdits.title || ""}
                            onChange={(e) => setPreviewEdits(p => ({ ...p, title: e.target.value }))}
                            data-testid="input-preview-title"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Company</Label>
                          <Input
                            value={previewEdits.company || ""}
                            onChange={(e) => setPreviewEdits(p => ({ ...p, company: e.target.value }))}
                            data-testid="input-preview-company"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Location</Label>
                          <Input
                            value={previewEdits.location || ""}
                            onChange={(e) => setPreviewEdits(p => ({ ...p, location: e.target.value }))}
                            data-testid="input-preview-location"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Apply URL</Label>
                          <Input
                            value={previewEdits.applyUrl || ""}
                            onChange={(e) => setPreviewEdits(p => ({ ...p, applyUrl: e.target.value }))}
                            data-testid="input-preview-applyUrl"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={previewEdits.roleCategory || "_none"}
                            onValueChange={(v) => setPreviewEdits(p => ({
                              ...p,
                              roleCategory: v === "_none" ? null : v,
                              roleSubcategory: v === "_none" ? null : (p.roleSubcategory && getSubcategoriesForCategory(v).includes(p.roleSubcategory) ? p.roleSubcategory : null),
                            }))}
                          >
                            <SelectTrigger data-testid="select-preview-category">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">None</SelectItem>
                              {TAXONOMY_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Subcategory</Label>
                          <Select
                            value={previewEdits.roleSubcategory || "_none"}
                            onValueChange={(v) => setPreviewEdits(p => ({ ...p, roleSubcategory: v === "_none" ? null : v }))}
                          >
                            <SelectTrigger data-testid="select-preview-subcategory">
                              <SelectValue placeholder="Sub" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">None</SelectItem>
                              {getSubcategoriesForCategory(previewEdits.roleCategory).map((sub) => (
                                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Seniority</Label>
                          <Select
                            value={previewEdits.seniorityLevel || "_none"}
                            onValueChange={(v) => setPreviewEdits(p => ({ ...p, seniorityLevel: v === "_none" ? null : v }))}
                          >
                            <SelectTrigger data-testid="select-preview-seniority">
                              <SelectValue placeholder="Level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">None</SelectItem>
                              {SENIORITY_OPTIONS.map((level) => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Work Setting</Label>
                          <Select
                            value={previewEdits.locationType || 'onsite'}
                            onValueChange={(v) => setPreviewEdits(p => ({ ...p, locationType: v, isRemote: v === 'remote' }))}
                          >
                            <SelectTrigger data-testid="select-preview-location-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="remote">Remote</SelectItem>
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                              <SelectItem value="onsite">On-site</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Salary Min</Label>
                          <Input
                            type="number"
                            value={previewEdits.salaryMin ?? ""}
                            onChange={(e) => setPreviewEdits(p => ({ ...p, salaryMin: e.target.value ? Number(e.target.value) : null }))}
                            placeholder="e.g. 80000"
                            data-testid="input-preview-salaryMin"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Salary Max</Label>
                          <Input
                            type="number"
                            value={previewEdits.salaryMax ?? ""}
                            onChange={(e) => setPreviewEdits(p => ({ ...p, salaryMax: e.target.value ? Number(e.target.value) : null }))}
                            placeholder="e.g. 150000"
                            data-testid="input-preview-salaryMax"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Skills (comma-separated)</Label>
                        <Input
                          value={(previewEdits.keySkills || []).join(", ")}
                          onChange={(e) => setPreviewEdits(p => ({
                            ...p,
                            keySkills: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean),
                          }))}
                          placeholder="e.g. Python, NLP, Contract Review"
                          data-testid="input-preview-skills"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          value={previewEdits.description || ""}
                          onChange={(e) => setPreviewEdits(p => ({ ...p, description: e.target.value }))}
                          rows={4}
                          data-testid="input-preview-description"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        onClick={() => { setPreviewJob(null); setPreviewEdits({}); }}
                        data-testid="button-discard-preview"
                      >
                        Discard
                      </Button>
                      <Button
                        onClick={() => confirmJobMutation.mutate(previewEdits)}
                        disabled={confirmJobMutation.isPending || !previewEdits.title || !previewEdits.company}
                        data-testid="button-confirm-job"
                      >
                        {confirmJobMutation.isPending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                        ) : (
                          <><CheckCircle className="mr-2 h-4 w-4" /> Confirm & Save</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Scrape All Companies
              </CardTitle>
              <CardDescription>
                Run the scraper on all configured legal tech companies. This may take a few minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => scrapeAllMutation.mutate()}
                  disabled={scrapeAllMutation.isPending || scrapeWithAIMutation.isPending}
                  variant="outline"
                  data-testid="button-scrape-all"
                >
                  {scrapeAllMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Quick Scrape (No AI)
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => scrapeWithAIMutation.mutate()}
                  disabled={scrapeAllMutation.isPending || scrapeWithAIMutation.isPending || scrapeYCMutation.isPending}
                  data-testid="button-scrape-with-ai"
                >
                  {scrapeWithAIMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI Scraping... (This takes a while)
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Scrape with AI Categorization
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => scrapeYCMutation.mutate()}
                  disabled={scrapeAllMutation.isPending || scrapeWithAIMutation.isPending || scrapeYCMutation.isPending}
                  variant="outline"
                  data-testid="button-scrape-yc"
                >
                  {scrapeYCMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping YC Companies... (5-10 min)
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Scrape YC Legal Tech Companies
                    </>
                  )}
                </Button>
              </div>

              {lastResult && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Last Result</h4>
                  <p className="text-sm text-muted-foreground mb-2">{lastResult.message}</p>
                  {lastResult.stats && (
                    <div className="space-y-1">
                      {lastResult.stats.map((stat) => (
                        <div key={stat.company} className="flex items-center gap-2 text-sm">
                          {stat.filtered > 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{stat.company}:</span>
                          <span className="text-muted-foreground">
                            {stat.found} found, {stat.filtered} legal tech
                            {stat.categorized !== undefined && `, ${stat.categorized} AI categorized`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Job Management
              </CardTitle>
              <CardDescription>
                Search, filter, edit, and manage all jobs in the database.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs..."
                      value={jobsSearch}
                      onChange={(e) => {
                        setJobsSearch(e.target.value);
                        setJobsPage(1);
                      }}
                      className="pl-9"
                      data-testid="input-jobs-search"
                    />
                  </div>
                  <Select
                    value={jobsCategoryFilter}
                    onValueChange={(v) => { setJobsCategoryFilter(v); setJobsPage(1); }}
                  >
                    <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {TAXONOMY_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={jobsSourceFilter}
                    onValueChange={(v) => { setJobsSourceFilter(v); setJobsPage(1); }}
                  >
                    <SelectTrigger className="w-[150px]" data-testid="select-source-filter">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="greenhouse">Greenhouse</SelectItem>
                      <SelectItem value="lever">Lever</SelectItem>
                      <SelectItem value="ashby">Ashby</SelectItem>
                      <SelectItem value="generic">Generic</SelectItem>
                      <SelectItem value="upload">File Upload</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={jobsSeniorityFilter || "all"}
                    onValueChange={(v) => { setJobsSeniorityFilter(v === "all" ? "" : v); setJobsPage(1); }}
                  >
                    <SelectTrigger className="w-[150px]" data-testid="select-seniority-filter">
                      <SelectValue placeholder="Seniority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      {SENIORITY_OPTIONS.map((level) => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={jobsActiveFilter}
                    onValueChange={(v) => { setJobsActiveFilter(v); setJobsPage(1); }}
                  >
                    <SelectTrigger className="w-[140px]" data-testid="select-active-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={jobsReviewFilter}
                    onValueChange={(v) => { setJobsReviewFilter(v); setJobsPage(1); }}
                  >
                    <SelectTrigger className="w-[160px]" data-testid="select-review-filter">
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Review" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reviews</SelectItem>
                      <SelectItem value="needs_review">Needs Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="unscored">Unscored</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScanRelevance}
                    disabled={isScanningRelevance}
                    data-testid="button-scan-relevance"
                    className="shrink-0"
                  >
                    {isScanningRelevance ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                    Scan Relevance
                  </Button>
                </div>

                {loadingAdminJobs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : adminJobs && adminJobs.jobs.length > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground" data-testid="text-jobs-count">
                      Showing {adminJobs.jobs.length} of {adminJobs.total} jobs (page {adminJobs.page} of {adminJobs.totalPages})
                    </p>
                    <div className="space-y-3">
                      {adminJobs.jobs.map((job) => (
                        <div
                          key={job.id}
                          className="p-4 border rounded-lg space-y-2"
                          data-testid={`job-card-${job.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium truncate" data-testid={`text-job-title-${job.id}`}>{cleanStructuredText(job.title)}</h4>
                              <p className="text-sm text-muted-foreground" data-testid={`text-job-company-${job.id}`}>
                                {cleanStructuredText(job.company)}
                                {job.location && ` \u2022 ${cleanStructuredText(job.location)}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                                data-testid={`button-expand-job-${job.id}`}
                              >
                                {expandedJobId === job.id ? <ChevronUp /> : <ChevronDown />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditDialog(job)}
                                data-testid={`button-edit-job-${job.id}`}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => toggleJobActiveMutation.mutate({ id: job.id, isActive: !job.isActive })}
                                disabled={toggleJobActiveMutation.isPending}
                                data-testid={`button-toggle-job-${job.id}`}
                              >
                                {job.isActive ? <ToggleRight /> : <ToggleLeft />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => recategorizeJobMutation.mutate(job.id)}
                                disabled={recategorizeJobMutation.isPending}
                                data-testid={`button-recategorize-job-${job.id}`}
                              >
                                <RotateCw />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this job?")) {
                                    deleteJobMutation.mutate(job.id);
                                  }
                                }}
                                disabled={deleteJobMutation.isPending}
                                data-testid={`button-delete-job-${job.id}`}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {job.legalRelevanceScore != null && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  job.legalRelevanceScore >= 7
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                                    : job.legalRelevanceScore >= 4
                                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                                }`}
                                data-testid={`badge-relevance-${job.id}`}
                              >
                                {job.legalRelevanceScore}/10
                              </Badge>
                            )}
                            {job.reviewStatus === 'needs_review' && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-auto py-0.5 px-2 text-xs text-green-700 dark:text-green-400 border-green-300 dark:border-green-700"
                                  onClick={() => reviewJobMutation.mutate({ id: job.id, action: 'approve' })}
                                  disabled={reviewJobMutation.isPending}
                                  data-testid={`button-approve-${job.id}`}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-auto py-0.5 px-2 text-xs text-red-700 dark:text-red-400 border-red-300 dark:border-red-700"
                                  onClick={() => reviewJobMutation.mutate({ id: job.id, action: 'reject' })}
                                  disabled={reviewJobMutation.isPending}
                                  data-testid={`button-reject-${job.id}`}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />Reject
                                </Button>
                              </div>
                            )}
                            {job.reviewStatus === 'approved' && (
                              <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800" data-testid={`badge-approved-${job.id}`}>
                                <ShieldCheck className="h-2.5 w-2.5 mr-1" />Approved
                              </Badge>
                            )}
                            {job.reviewStatus === 'rejected' && (
                              <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" data-testid={`badge-rejected-${job.id}`}>
                                <ShieldX className="h-2.5 w-2.5 mr-1" />Rejected
                              </Badge>
                            )}
                            {job.manuallyEdited && (
                              <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" data-testid={`badge-edited-${job.id}`}>
                                <Pencil className="h-2.5 w-2.5 mr-1" />Curated
                              </Badge>
                            )}
                            {job.source && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-source-${job.id}`}>{job.source}</Badge>
                            )}
                            <Select
                              value={job.roleCategory || "_none"}
                              onValueChange={(v) => {
                                const newCategory = v === "_none" ? null : v;
                                updateJobMutation.mutate({ id: job.id, updates: { roleCategory: newCategory } });
                              }}
                            >
                              <SelectTrigger className="h-auto py-0.5 px-2 text-xs border-dashed w-auto min-w-0 gap-1" data-testid={`select-inline-category-${job.id}`}>
                                <Tag className="h-3 w-3 shrink-0" />
                                <span className="truncate">{job.roleCategory ? cleanStructuredText(job.roleCategory) : "No category"}</span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none">No category</SelectItem>
                                {TAXONOMY_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={job.seniorityLevel || "_none"}
                              onValueChange={(v) => {
                                const newLevel = v === "_none" ? null : v;
                                updateJobMutation.mutate({ id: job.id, updates: { seniorityLevel: newLevel } });
                              }}
                            >
                              <SelectTrigger className="h-auto py-0.5 px-2 text-xs border-dashed w-auto min-w-0 gap-1" data-testid={`select-inline-seniority-${job.id}`}>
                                <GraduationCap className="h-3 w-3 shrink-0" />
                                <span className="truncate">{job.seniorityLevel || "No level"}</span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none">No level</SelectItem>
                                {SENIORITY_OPTIONS.map((level) => (
                                  <SelectItem key={level} value={level}>{level}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {job.keySkills && job.keySkills.length > 0 && job.keySkills.slice(0, 3).map((skill, si) => (
                              <Badge key={si} variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                {cleanStructuredText(skill)}
                              </Badge>
                            ))}
                            {job.keySkills && job.keySkills.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{job.keySkills.length - 3}</span>
                            )}
                            <Badge
                              variant={job.isActive ? "default" : "destructive"}
                              className="text-xs"
                              data-testid={`badge-active-${job.id}`}
                            >
                              {job.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {expandedJobId === job.id && (
                            <div className="pt-3 mt-3 border-t border-border/50">
                              {(() => {
                                const parsed = parseStructuredDescription(job.structuredDescription);
                                if (parsed) {
                                  return (
                                    <>
                                      <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground">
                                        <span className="font-medium uppercase tracking-wider">User View Preview</span>
                                        <Badge variant="outline" className="text-[9px] gap-0.5">
                                          <Sparkles className="h-2.5 w-2.5" />
                                          Structured
                                        </Badge>
                                      </div>
                                      <div className="max-h-[400px] overflow-y-auto pr-2">
                                        {job.aiSummary && (
                                          <div className="rounded-md bg-muted/50 border border-border/30 p-2.5 mb-3">
                                            <div className="flex items-center gap-1.5 mb-1">
                                              <Sparkles className="h-3 w-3 text-muted-foreground shrink-0" />
                                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">At a Glance</span>
                                            </div>
                                            <p className="text-xs text-foreground/80 leading-relaxed">{cleanStructuredText(job.aiSummary)}</p>
                                          </div>
                                        )}
                                        <StructuredDescriptionView data={parsed} compact />
                                      </div>
                                    </>
                                  );
                                }
                                return (
                                <>
                                  <div className="flex items-center gap-3 mb-2 text-[10px] text-muted-foreground flex-wrap">
                                    <span className="font-medium uppercase tracking-wider">Description Preview</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-amber-200 dark:bg-amber-800" />Exp</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-purple-200 dark:bg-purple-800" />Certs</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-blue-200 dark:bg-blue-800" />Edu</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-emerald-200 dark:bg-emerald-800" />Tools</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-rose-200 dark:bg-rose-800" />Legal</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-teal-200 dark:bg-teal-800" />Comp</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-sky-200 dark:bg-sky-800" />Skills</span>
                                  </div>
                                  {job.aiSummary && (
                                    <div className="rounded-md bg-muted/50 border border-border/30 p-2.5 mb-2">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Sparkles className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">At a Glance</span>
                                      </div>
                                      <p className="text-xs text-foreground/80 leading-relaxed">{cleanStructuredText(job.aiSummary)}</p>
                                    </div>
                                  )}
                                  <AdminJobDescription description={job.description} />
                                </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                        disabled={jobsPage <= 1}
                        data-testid="button-jobs-prev"
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground" data-testid="text-jobs-page-info">
                        Page {adminJobs.page} of {adminJobs.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setJobsPage((p) => Math.min(adminJobs.totalPages, p + 1))}
                        disabled={jobsPage >= adminJobs.totalPages}
                        data-testid="button-jobs-next"
                      >
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No jobs found matching your filters.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!editingJob} onOpenChange={(open) => { if (!open) { setEditingJob(null); setEditForm({}); } }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Job</DialogTitle>
                <DialogDescription>Update job details below.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editForm.title || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    data-testid="input-edit-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-company">Company</Label>
                  <Input
                    id="edit-company"
                    value={editForm.company || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))}
                    data-testid="input-edit-company"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={editForm.location || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                    data-testid="input-edit-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-applyUrl">Apply URL</Label>
                  <Input
                    id="edit-applyUrl"
                    value={editForm.applyUrl || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, applyUrl: e.target.value }))}
                    data-testid="input-edit-applyUrl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-salaryMin">Salary Min</Label>
                    <Input
                      id="edit-salaryMin"
                      type="number"
                      value={editForm.salaryMin ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, salaryMin: e.target.value ? Number(e.target.value) : null }))}
                      data-testid="input-edit-salaryMin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-salaryMax">Salary Max</Label>
                    <Input
                      id="edit-salaryMax"
                      type="number"
                      value={editForm.salaryMax ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, salaryMax: e.target.value ? Number(e.target.value) : null }))}
                      data-testid="input-edit-salaryMax"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      value={editForm.roleCategory || "_none"}
                      onValueChange={(v) => setEditForm((f) => ({
                        ...f,
                        roleCategory: v === "_none" ? null : v,
                        roleSubcategory: v === "_none" ? null : (f.roleSubcategory && getSubcategoriesForCategory(v).includes(f.roleSubcategory) ? f.roleSubcategory : null),
                      }))}
                    >
                      <SelectTrigger data-testid="select-edit-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        {TAXONOMY_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-subcategory">Subcategory</Label>
                    <Select
                      value={editForm.roleSubcategory || "_none"}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, roleSubcategory: v === "_none" ? null : v }))}
                    >
                      <SelectTrigger data-testid="select-edit-subcategory">
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        {getSubcategoriesForCategory(editForm.roleCategory).map((sub) => (
                          <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-seniority">Seniority Level</Label>
                    <Select
                      value={editForm.seniorityLevel || "_none"}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, seniorityLevel: v === "_none" ? null : v }))}
                    >
                      <SelectTrigger data-testid="select-edit-seniority">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        {SENIORITY_OPTIONS.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Work Setting</Label>
                    <Select
                      value={editForm.locationType || (editForm.isRemote ? 'remote' : 'onsite')}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, locationType: v, isRemote: v === 'remote' }))}
                    >
                      <SelectTrigger data-testid="select-edit-location-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="onsite">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-skills">Key Skills (comma-separated)</Label>
                  <Input
                    id="edit-skills"
                    value={(editForm.keySkills || []).join(", ")}
                    onChange={(e) => setEditForm((f) => ({
                      ...f,
                      keySkills: e.target.value.split(",").map(s => s.trim()).filter(Boolean),
                    }))}
                    placeholder="e.g. Python, NLP, Contract Review"
                    data-testid="input-edit-skills"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-aiSummary">AI Summary</Label>
                  <Textarea
                    id="edit-aiSummary"
                    value={editForm.aiSummary || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, aiSummary: e.target.value }))}
                    rows={3}
                    placeholder="Brief overview of this role..."
                    data-testid="input-edit-aiSummary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    rows={6}
                    data-testid="input-edit-description"
                  />
                </div>
                <div className="space-y-3 border rounded-md p-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full text-left text-sm font-semibold"
                    onClick={() => setShowStructuredEdit(!showStructuredEdit)}
                    data-testid="button-toggle-structured-edit"
                  >
                    {showStructuredEdit ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Structured Sections
                    {(editForm.structuredDescription as StructuredDescription | null) && (
                      <Badge variant="secondary" className="text-[10px]">Populated</Badge>
                    )}
                  </button>
                  {showStructuredEdit && (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs text-muted-foreground">
                        Edit each section. For list fields, put one item per line.
                      </p>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-sd-about" className="text-xs">About the Company</Label>
                        <Textarea
                          id="edit-sd-about"
                          value={getStructuredFieldValue("aboutCompany")}
                          onChange={(e) => updateStructuredField("aboutCompany", e.target.value)}
                          rows={3}
                          placeholder="Brief company overview..."
                          data-testid="input-edit-sd-about"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-sd-responsibilities" className="text-xs">Responsibilities (one per line)</Label>
                        <Textarea
                          id="edit-sd-responsibilities"
                          value={getStructuredFieldValue("responsibilities")}
                          onChange={(e) => updateStructuredField("responsibilities", e.target.value)}
                          rows={4}
                          placeholder="Lead product strategy&#10;Collaborate with engineering..."
                          data-testid="input-edit-sd-responsibilities"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-sd-minquals" className="text-xs">Minimum Qualifications (one per line)</Label>
                        <Textarea
                          id="edit-sd-minquals"
                          value={getStructuredFieldValue("minimumQualifications")}
                          onChange={(e) => updateStructuredField("minimumQualifications", e.target.value)}
                          rows={3}
                          placeholder="JD or equivalent&#10;3+ years experience..."
                          data-testid="input-edit-sd-minquals"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-sd-prefquals" className="text-xs">Preferred Qualifications (one per line)</Label>
                        <Textarea
                          id="edit-sd-prefquals"
                          value={getStructuredFieldValue("preferredQualifications")}
                          onChange={(e) => updateStructuredField("preferredQualifications", e.target.value)}
                          rows={3}
                          placeholder="Experience with legal tech&#10;Background in compliance..."
                          data-testid="input-edit-sd-prefquals"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-sd-skills" className="text-xs">Skills Required (one per line)</Label>
                        <Textarea
                          id="edit-sd-skills"
                          value={getStructuredFieldValue("skillsRequired")}
                          onChange={(e) => updateStructuredField("skillsRequired", e.target.value)}
                          rows={3}
                          placeholder="Contract review&#10;Python&#10;Project management..."
                          data-testid="input-edit-sd-skills"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="edit-active">Active</Label>
                  <Button
                    variant={editForm.isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditForm((f) => ({ ...f, isActive: !f.isActive }))}
                    data-testid="button-edit-toggle-active"
                  >
                    {editForm.isActive ? (
                      <><ToggleRight className="mr-1 h-4 w-4" /> Active</>
                    ) : (
                      <><ToggleLeft className="mr-1 h-4 w-4" /> Inactive</>
                    )}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setEditingJob(null); setEditForm({}); }}
                  data-testid="button-edit-cancel"
                >
                  <XIcon className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editingJob) {
                      updateJobMutation.mutate({ id: editingJob.id, updates: editForm });
                    }
                  }}
                  disabled={updateJobMutation.isPending}
                  data-testid="button-edit-save"
                >
                  {updateJobMutation.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-4 w-4" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Configured Companies
              </CardTitle>
              <CardDescription>
                Companies configured for job scraping. Click to scrape individually.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCompanies ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-3">
                  {companies?.map((company) => (
                    <div
                      key={company.name}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <a
                              href={company.careerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              Career Page
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={company.hasApi ? "default" : "secondary"}>
                          {company.hasApi ? "API" : "HTML"}
                        </Badge>
                        <Badge variant="outline">{company.type}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => scrapeCompanyMutation.mutate(company.name)}
                          disabled={scrapeCompanyMutation.isPending}
                          data-testid={`button-scrape-${company.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {scrapeCompanyMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Scrape"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
