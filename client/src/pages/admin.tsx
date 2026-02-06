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
import { ArrowLeft, RefreshCw, Building2, Globe, Loader2, CheckCircle, XCircle, Sparkles, Activity, FileText, Play, Square, LinkIcon, Clock, ShieldX, Plus, Upload, Pencil, Trash2, RotateCw, ToggleLeft, ToggleRight, Search, Filter, ChevronLeft, ChevronRight, Save, X as XIcon, BarChart3, ClipboardPaste, Zap, MapPin, DollarSign, Briefcase, GraduationCap, Tag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Job } from "@shared/schema";
import { JOB_TAXONOMY } from "@shared/schema";

const SENIORITY_OPTIONS = ["Intern", "Fellowship", "Entry", "Mid", "Senior", "Lead", "Director", "VP"];
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
  const [addJobMode, setAddJobMode] = useState<"url" | "paste" | "file">("url");
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
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState<Partial<Job>>({});

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

  const openEditDialog = (job: Job) => {
    setEditingJob(job);
    setEditForm({
      title: job.title,
      company: job.company,
      location: job.location,
      applyUrl: job.applyUrl,
      description: job.description,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      isActive: job.isActive,
      isRemote: job.isRemote,
      roleCategory: job.roleCategory,
      roleSubcategory: job.roleSubcategory,
      seniorityLevel: job.seniorityLevel,
      keySkills: job.keySkills,
    });
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
            <div className="ml-auto">
              <Link href="/admin/analytics">
                <Button variant="outline" data-testid="link-analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  User Analytics
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
                Paste a URL, drop in a file, or paste the job text directly. The system auto-extracts everything.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!previewJob && (
                  <>
                    <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
                      <Button
                        size="sm"
                        variant={addJobMode === "url" ? "default" : "ghost"}
                        onClick={() => { setAddJobMode("url"); setAddJobError(null); }}
                        data-testid="button-mode-url"
                      >
                        <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                        URL
                      </Button>
                      <Button
                        size="sm"
                        variant={addJobMode === "paste" ? "default" : "ghost"}
                        onClick={() => { setAddJobMode("paste"); setAddJobError(null); }}
                        data-testid="button-mode-paste"
                      >
                        <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
                        Paste Text
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

                    {addJobMode === "url" && (
                      <div className="space-y-2">
                        <div className="flex gap-3">
                          <Input
                            placeholder="https://boards.greenhouse.io/company/jobs/123..."
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && customUrl.trim()) {
                                setAddJobError(null);
                                previewUrlMutation.mutate(customUrl.trim());
                              }
                            }}
                            className="flex-1"
                            data-testid="input-custom-url"
                          />
                          <Button
                            onClick={() => {
                              if (customUrl.trim()) {
                                setAddJobError(null);
                                previewUrlMutation.mutate(customUrl.trim());
                              }
                            }}
                            disabled={previewUrlMutation.isPending || !customUrl.trim()}
                            data-testid="button-scrape-url"
                          >
                            {previewUrlMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Scraping...
                              </>
                            ) : (
                              <>
                                <Search className="mr-2 h-4 w-4" />
                                Extract
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Supports Greenhouse, Lever, Ashby, and any generic job page.
                        </p>
                      </div>
                    )}

                    {addJobMode === "paste" && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder={"Paste the full job posting text here...\n\nExample:\nSenior Legal Engineer\nCompany: Clio\nLocation: Remote, US\nSalary: $120K - $160K\n\nWe are looking for a Senior Legal Engineer to join our team..."}
                          value={pasteText}
                          onChange={(e) => setPasteText(e.target.value)}
                          rows={8}
                          data-testid="input-paste-text"
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Paste any format: job description, email, LinkedIn post, etc.
                          </p>
                          <Button
                            onClick={() => {
                              if (pasteText.trim()) {
                                setAddJobError(null);
                                parseTextMutation.mutate(pasteText.trim());
                              }
                            }}
                            disabled={parseTextMutation.isPending || pasteText.trim().length < 20}
                            data-testid="button-parse-text"
                          >
                            {parseTextMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Zap className="mr-2 h-4 w-4" />
                                Extract
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
                        onClick={() => { setPreviewJob(null); setPreviewEdits({}); }}
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
                          <Label className="text-xs">Remote</Label>
                          <div className="pt-0.5">
                            <Button
                              variant={previewEdits.isRemote ? "default" : "outline"}
                              size="sm"
                              className="w-full"
                              onClick={() => setPreviewEdits(p => ({ ...p, isRemote: !p.isRemote }))}
                              data-testid="button-preview-remote"
                            >
                              {previewEdits.isRemote ? (
                                <><Globe className="mr-1 h-3.5 w-3.5" /> Remote</>
                              ) : "On-site"}
                            </Button>
                          </div>
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
                              <h4 className="font-medium truncate" data-testid={`text-job-title-${job.id}`}>{job.title}</h4>
                              <p className="text-sm text-muted-foreground" data-testid={`text-job-company-${job.id}`}>
                                {job.company}
                                {job.location && ` \u2022 ${job.location}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
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
                            {job.source && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-source-${job.id}`}>{job.source}</Badge>
                            )}
                            {job.roleCategory && (
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${job.id}`}>{job.roleCategory}</Badge>
                            )}
                            {job.seniorityLevel && (
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-seniority-${job.id}`}>{job.seniorityLevel}</Badge>
                            )}
                            <Badge
                              variant={job.isActive ? "default" : "destructive"}
                              className="text-xs"
                              data-testid={`badge-active-${job.id}`}
                            >
                              {job.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
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
                    <Label>Remote</Label>
                    <div className="pt-1">
                      <Button
                        variant={editForm.isRemote ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditForm((f) => ({ ...f, isRemote: !f.isRemote }))}
                        data-testid="button-edit-toggle-remote"
                      >
                        {editForm.isRemote ? (
                          <><Globe className="mr-1 h-4 w-4" /> Remote</>
                        ) : (
                          "Not Remote"
                        )}
                      </Button>
                    </div>
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
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    rows={6}
                    data-testid="input-edit-description"
                  />
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
