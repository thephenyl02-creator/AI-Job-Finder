import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Job } from "@shared/schema";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Briefcase, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Lightbulb,
  FileText,
  Scale,
  Upload,
  GripVertical,
  Search,
  MapPin,
  Building2,
  ChevronDown,
  ChevronRight,
  Link2,
  ExternalLink
} from "lucide-react";

interface JobInput {
  id: string;
  title: string;
  description: string;
  fileName?: string;
  isUploading?: boolean;
  portalJobId?: number;
  company?: string;
  location?: string;
  sourceUrl?: string;
  urlInput?: string;
  isParsingUrl?: boolean;
}

interface LegalTechGrowthPotential {
  shortTerm: string;
  mediumTerm: string;
  longTerm: string;
  aiOpportunities: string;
}

interface JobAnalysis {
  jobTitle: string;
  overallFitSummary?: string;
  pros?: string[];
  cons?: string[];
  transferableSkills?: string[];
  skillsToDevelop?: string[];
  legalTechGrowthPotential?: LegalTechGrowthPotential;
  mainResponsibilities: string[];
  requiredSkills: string[];
  workType: {
    structured: number;
    ambiguous: number;
    description: string;
  };
  growthOpportunities?: string[];
  transitionDifficulty: {
    level: "Easy" | "Moderate" | "Challenging" | "Difficult";
    explanation: string;
  };
  whoSucceeds: string[];
  fitAnalysis?: {
    overallFit: number;
    strengths: string[];
    gaps: string[];
    resumePositioning: string[];
    interviewRisks: string[];
  };
}

interface ComparisonResult {
  jobs: JobAnalysis[];
  recommendation: {
    bestFitNow: {
      jobTitle: string;
      reason: string;
    };
    bestLongTerm: {
      jobTitle: string;
      reason: string;
    };
    biggestShift: {
      jobTitle: string;
      reason: string;
    };
  };
  overallStrategy: string;
}

export default function CareerAdvisor() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobInput[]>([
    { id: "1", title: "", description: "" },
    { id: "2", title: "", description: "" },
  ]);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showJobPicker, setShowJobPicker] = useState(false);
  const [jobPickerTarget, setJobPickerTarget] = useState<string | null>(null);
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: resumeData } = useQuery<{ hasResume: boolean; extractedData?: any }>({
    queryKey: ["/api/resume"],
    enabled: isAuthenticated,
  });

  const { data: portalJobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    enabled: isAuthenticated,
  });

  const groupedJobs = portalJobs?.reduce((acc, job) => {
    const category = job.roleSubcategory || job.roleCategory || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(job);
    return acc;
  }, {} as Record<string, Job[]>) || {};

  const filteredGroupedJobs = Object.entries(groupedJobs).reduce((acc, [category, categoryJobs]) => {
    const filtered = categoryJobs.filter(job => 
      job.title.toLowerCase().includes(jobSearchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(jobSearchQuery.toLowerCase())
    );
    if (filtered.length > 0) acc[category] = filtered;
    return acc;
  }, {} as Record<string, Job[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const selectPortalJob = (job: Job, targetSlotId: string) => {
    setJobs(prev => prev.map(j => 
      j.id === targetSlotId 
        ? { 
            ...j, 
            title: job.title, 
            description: job.description, 
            portalJobId: job.id,
            company: job.company,
            location: job.location || undefined,
            fileName: undefined,
            isUploading: undefined
          } 
        : j
    ));
    setShowJobPicker(false);
    setJobPickerTarget(null);
    setJobSearchQuery("");
    toast({
      title: "Job added",
      description: `${job.title} at ${job.company} has been added for comparison.`,
    });
  };

  const openJobPicker = (slotId: string) => {
    setJobPickerTarget(slotId);
    setShowJobPicker(true);
    if (expandedCategories.size === 0 && Object.keys(groupedJobs).length > 0) {
      setExpandedCategories(new Set([Object.keys(groupedJobs)[0]]));
    }
  };

  const handleFileDrop = useCallback(async (jobId: string, file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB.",
        variant: "destructive",
      });
      return;
    }

    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isUploading: true, fileName: file.name } : j))
    );

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/career-advisor/parse-job-file", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to parse file");
      }

      const data = await response.json();
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, description: data.text, title: data.title || j.title, isUploading: false }
            : j
        )
      );
      toast({
        title: "File uploaded",
        description: `Extracted ${data.text.length} characters from ${file.name}`,
      });
    } catch (error: any) {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, isUploading: false, fileName: undefined } : j))
      );
      toast({
        title: "Upload failed",
        description: error.message || "Could not extract text from file.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(jobId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileDrop(jobId, file);
    }
  }, [handleFileDrop]);

  const updateUrlInput = (id: string, url: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, urlInput: url } : j)));
  };

  const parseJobUrl = useCallback(async (jobId: string, url: string) => {
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a job posting URL.",
        variant: "destructive",
      });
      return;
    }

    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isParsingUrl: true } : j))
    );

    try {
      const response = await fetch("/api/career-advisor/parse-job-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to parse URL");
      }

      const data = await response.json();
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { 
                ...j, 
                description: data.text, 
                title: data.title || j.title, 
                isParsingUrl: false,
                sourceUrl: data.sourceUrl,
                urlInput: ""
              }
            : j
        )
      );
      toast({
        title: "Job posting loaded",
        description: `Successfully extracted job details from the URL`,
      });
    } catch (error: any) {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, isParsingUrl: false } : j))
      );
      toast({
        title: "Could not parse URL",
        description: error.message || "Please check the URL or paste the job description directly.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const compareMutation = useMutation({
    mutationFn: async (data: { jobs: JobInput[]; includeResume: boolean }) => {
      const response = await apiRequest("POST", "/api/career-advisor/compare", data);
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: () => {
      toast({
        title: "Analysis failed",
        description: "Please try again with different job descriptions.",
        variant: "destructive",
      });
    },
  });

  const addJob = () => {
    if (jobs.length < 3) {
      setJobs([...jobs, { id: String(Date.now()), title: "", description: "" }]);
    }
  };

  const removeJob = (id: string) => {
    if (jobs.length > 2) {
      setJobs(jobs.filter((j) => j.id !== id));
    }
  };

  const updateJob = (id: string, field: "title" | "description", value: string) => {
    setJobs(jobs.map((j) => (j.id === id ? { ...j, [field]: value } : j)));
  };

  const handleCompare = () => {
    const validJobs = jobs.filter((j) => j.description.trim().length > 50);
    if (validJobs.length < 2) {
      toast({
        title: "Need more job descriptions",
        description: "Please provide at least 2 job descriptions with sufficient detail.",
        variant: "destructive",
      });
      return;
    }
    compareMutation.mutate({ jobs: validJobs, includeResume: resumeData?.hasResume ?? false });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4 border border-primary/20">
            <Target className="h-4 w-4" />
            AI-Powered Analysis
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 tracking-tight">
            Career Advisor
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compare job opportunities side-by-side and get strategic career guidance tailored for legal professionals
          </p>
        </div>

        {!result ? (
          <div className="space-y-8">
            {resumeData?.hasResume && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-950/20 border-green-200/50 dark:border-green-900/50 max-w-2xl mx-auto">
                <CardContent className="flex items-center gap-4 py-5 px-6">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">Resume Connected</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Your analysis will include personalized fit scores and positioning advice
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!resumeData?.hasResume && (
              <Card className="bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-900/50 max-w-2xl mx-auto">
                <CardContent className="flex items-center gap-4 py-5 px-6">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200">No Resume Uploaded</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Upload your resume from the search page to unlock personalized fit analysis
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job, index) => (
                <Card 
                  key={job.id} 
                  data-testid={`card-job-input-${index}`}
                  className={`transition-all duration-200 ${dragOverId === job.id ? "ring-2 ring-primary ring-offset-2 shadow-lg" : "hover:shadow-md"}`}
                  onDragOver={(e) => handleDragOver(e, job.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, job.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{index + 1}</span>
                        </div>
                        <CardTitle className="text-lg">Opportunity {index + 1}</CardTitle>
                      </div>
                      {jobs.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeJob(job.id)}
                          data-testid={`button-remove-job-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    {job.fileName && (
                      <Badge variant="secondary" className="w-fit mt-2">
                        <FileText className="h-3 w-3 mr-1" />
                        {job.fileName}
                      </Badge>
                    )}
                    {job.portalJobId && job.company && (
                      <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/20" data-testid={`portal-job-info-${index}`}>
                        <p className="text-sm font-medium text-primary truncate" data-testid={`portal-job-title-${index}`}>{job.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span data-testid={`portal-job-company-${index}`}>{job.company}</span>
                          {job.location && (
                            <>
                              <span className="mx-1">·</span>
                              <MapPin className="h-3 w-3" />
                              <span data-testid={`portal-job-location-${index}`}>{job.location}</span>
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                        dragOverId === job.id 
                          ? "border-primary bg-primary/5 scale-[1.02]" 
                          : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      {job.isUploading ? (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="font-medium">Extracting text...</span>
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            accept=".pdf,.docx"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileDrop(job.id, file);
                              e.target.value = "";
                            }}
                            data-testid={`input-file-upload-${index}`}
                          />
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                              <Upload className="h-6 w-6" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-foreground block">Drop job posting file</span>
                              <span className="text-xs">or click to browse (PDF, DOCX)</span>
                            </div>
                          </div>
                        </label>
                      )}
                    </div>

                    {/* URL Input Section */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        Paste Job URL
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={job.urlInput || ""}
                          onChange={(e) => updateUrlInput(job.id, e.target.value)}
                          placeholder="https://careers.company.com/job/..."
                          className="flex-1"
                          disabled={job.isParsingUrl}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && job.urlInput) {
                              parseJobUrl(job.id, job.urlInput);
                            }
                          }}
                          data-testid={`input-job-url-${index}`}
                        />
                        <Button
                          variant="secondary"
                          size="default"
                          onClick={() => parseJobUrl(job.id, job.urlInput || "")}
                          disabled={!job.urlInput || job.isParsingUrl}
                          data-testid={`button-parse-url-${index}`}
                        >
                          {job.isParsingUrl ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Load"
                          )}
                        </Button>
                      </div>
                      {job.sourceUrl && (
                        <a 
                          href={job.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                          data-testid={`link-source-url-${index}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View original posting
                        </a>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => openJobPicker(job.id)}
                      data-testid={`button-browse-jobs-${index}`}
                    >
                      <Briefcase className="h-4 w-4" />
                      Browse Jobs from Portal
                    </Button>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider">
                          or paste manually
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">
                        Job Title
                      </label>
                      <Input
                        value={job.title}
                        onChange={(e) => updateJob(job.id, "title", e.target.value)}
                        placeholder="e.g., Legal AI Product Manager"
                        className="mt-1.5"
                        data-testid={`input-job-title-${index}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">
                        Job Description
                      </label>
                      <Textarea
                        value={job.description}
                        onChange={(e) => updateJob(job.id, "description", e.target.value)}
                        placeholder="Paste the full job description here..."
                        className="mt-1.5 min-h-[180px] resize-none"
                        data-testid={`input-job-description-${index}`}
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-muted-foreground">
                          {job.description.length} characters
                        </p>
                        {job.description.length > 0 && job.description.length < 50 && (
                          <p className="text-xs text-amber-600">Minimum 50 characters</p>
                        )}
                        {job.description.length >= 50 && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {jobs.length < 3 && (
                <Card
                  className="border-2 border-dashed border-muted-foreground/20 cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all duration-200 flex items-center justify-center min-h-[400px]"
                  onClick={addJob}
                  data-testid="button-add-job"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <Plus className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-semibold text-foreground">Add Third Opportunity</p>
                    <p className="text-sm text-muted-foreground mt-1">Compare up to 3 roles side-by-side</p>
                  </div>
                </Card>
              )}
            </div>

            <div className="flex flex-col items-center gap-4 pt-8">
              <Button
                size="lg"
                onClick={handleCompare}
                disabled={compareMutation.isPending || jobs.filter((j) => j.description.length > 50).length < 2}
                className="gap-2 px-10 h-12 shadow-lg text-base"
                data-testid="button-compare-jobs"
              >
                {compareMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing careers...
                  </>
                ) : (
                  <>
                    <Scale className="h-4 w-4" />
                    Analyze & Compare
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                Get strategic insights in under 30 seconds
              </p>
            </div>
          </div>
        ) : (
          <ComparisonResults 
            result={result} 
            onReset={() => setResult(null)} 
            hasResume={resumeData?.hasResume ?? false}
          />
        )}
      </main>

      {showJobPicker && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setShowJobPicker(false)}>
          <div 
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Select a Job from Portal</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowJobPicker(false)} data-testid="button-close-job-picker">
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-job-search"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4">
                {jobsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : Object.keys(filteredGroupedJobs).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No jobs found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(filteredGroupedJobs).map(([category, categoryJobs]) => (
                      <div key={category}>
                        <button
                          className="w-full flex items-center gap-2 py-2 px-2 text-left hover:bg-muted/50 rounded-lg transition-colors"
                          onClick={() => toggleCategory(category)}
                          data-testid={`button-category-${category.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          {expandedCategories.has(category) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="font-semibold text-foreground">{category}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {categoryJobs.length}
                          </Badge>
                        </button>
                        
                        {expandedCategories.has(category) && (
                          <div className="ml-4 mt-1 space-y-1">
                            {categoryJobs.map((job) => (
                              <button
                                key={job.id}
                                className="w-full text-left p-3 rounded-lg border border-transparent hover:border-primary/30 hover:bg-muted/30 transition-all group"
                                onClick={() => jobPickerTarget && selectPortalJob(job, jobPickerTarget)}
                                data-testid={`button-select-job-${job.id}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-primary group-hover:underline truncate">
                                      {job.title}
                                    </p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <Building2 className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{job.company}</span>
                                    </p>
                                    {job.location && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{job.location}</span>
                                      </p>
                                    )}
                                  </div>
                                  <Plus className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Click a job to add it for comparison
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonResults({ 
  result, 
  onReset,
  hasResume 
}: { 
  result: ComparisonResult; 
  onReset: () => void;
  hasResume: boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif">Career Analysis</h2>
        <Button variant="outline" onClick={onReset} data-testid="button-new-comparison">
          New Comparison
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-background rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Best Fit Now</span>
              </div>
              <p className="font-medium">{result.recommendation.bestFitNow.jobTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">{result.recommendation.bestFitNow.reason}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">Best Long-Term</span>
              </div>
              <p className="font-medium">{result.recommendation.bestLongTerm.jobTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">{result.recommendation.bestLongTerm.reason}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-muted-foreground">Biggest Shift</span>
              </div>
              <p className="font-medium">{result.recommendation.biggestShift.jobTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">{result.recommendation.biggestShift.reason}</p>
            </div>
          </div>
          <div className="p-4 bg-background rounded-lg border">
            <p className="text-sm font-medium mb-1">Strategic Advice</p>
            <p className="text-muted-foreground">{result.overallStrategy}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comparison" data-testid="tab-comparison">Side-by-Side Comparison</TabsTrigger>
          <TabsTrigger value="detailed" data-testid="tab-detailed">Detailed Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground w-48">Aspect</th>
                  {result.jobs.map((job, i) => (
                    <th key={i} className="text-left p-4 font-medium">
                      {job.jobTitle}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Overall Fit Summary - always shown when available */}
                {result.jobs[0]?.overallFitSummary && (
                  <tr className="border-b bg-primary/5">
                    <td className="p-4 font-medium text-muted-foreground">Overall Fit</td>
                    {result.jobs.map((job, i) => (
                      <td key={i} className="p-4">
                        <p className="text-sm">{job.overallFitSummary}</p>
                      </td>
                    ))}
                  </tr>
                )}
                {/* Pros */}
                {result.jobs[0]?.pros && (
                  <tr className="border-b">
                    <td className="p-4 font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Advantages (Pros)
                      </div>
                    </td>
                    {result.jobs.map((job, i) => (
                      <td key={i} className="p-4">
                        <ul className="text-sm space-y-1">
                          {job.pros?.map((pro, j) => (
                            <li key={j} className="flex items-start gap-1 text-green-700 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mt-1 shrink-0" />
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                )}
                {/* Cons */}
                {result.jobs[0]?.cons && (
                  <tr className="border-b">
                    <td className="p-4 font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Challenges (Cons)
                      </div>
                    </td>
                    {result.jobs.map((job, i) => (
                      <td key={i} className="p-4">
                        <ul className="text-sm space-y-1">
                          {job.cons?.map((con, j) => (
                            <li key={j} className="flex items-start gap-1 text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3 mt-1 shrink-0" />
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                )}
                {/* Transferable Skills */}
                {hasResume && result.jobs[0]?.transferableSkills && (
                  <tr className="border-b bg-muted/30">
                    <td className="p-4 font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4 text-primary" />
                        Transferable Skills
                      </div>
                    </td>
                    {result.jobs.map((job, i) => (
                      <td key={i} className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {job.transferableSkills?.map((skill, j) => (
                            <Badge key={j} variant="default" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}
                {/* Skills to Develop */}
                {result.jobs[0]?.skillsToDevelop && (
                  <tr className="border-b">
                    <td className="p-4 font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Skills to Develop
                      </div>
                    </td>
                    {result.jobs.map((job, i) => (
                      <td key={i} className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {job.skillsToDevelop?.map((skill, j) => (
                            <Badge key={j} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}
                {/* Legal Tech Career Growth */}
                {result.jobs[0]?.legalTechGrowthPotential && (
                  <tr className="border-b">
                    <td className="p-4 font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Career Growth Path
                      </div>
                    </td>
                    {result.jobs.map((job, i) => (
                      <td key={i} className="p-4">
                        {job.legalTechGrowthPotential && (
                          <div className="text-sm space-y-2">
                            <div>
                              <span className="font-medium text-xs text-muted-foreground">1-2 years:</span>
                              <p className="text-muted-foreground">{job.legalTechGrowthPotential.shortTerm}</p>
                            </div>
                            <div>
                              <span className="font-medium text-xs text-muted-foreground">3-5 years:</span>
                              <p className="text-muted-foreground">{job.legalTechGrowthPotential.mediumTerm}</p>
                            </div>
                            <div>
                              <span className="font-medium text-xs text-muted-foreground">5-10 years:</span>
                              <p className="text-muted-foreground">{job.legalTechGrowthPotential.longTerm}</p>
                            </div>
                            <div className="pt-1 border-t">
                              <span className="font-medium text-xs text-primary">AI Impact:</span>
                              <p className="text-muted-foreground">{job.legalTechGrowthPotential.aiOpportunities}</p>
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
                <tr className="border-b">
                  <td className="p-4 font-medium text-muted-foreground">Work Type</td>
                  {result.jobs.map((job, i) => (
                    <td key={i} className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={job.workType.structured > 50 ? "default" : "secondary"}>
                          {job.workType.structured}% Structured
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{job.workType.description}</p>
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium text-muted-foreground">Transition Difficulty</td>
                  {result.jobs.map((job, i) => (
                    <td key={i} className="p-4">
                      <Badge
                        variant={
                          job.transitionDifficulty.level === "Easy" ? "default" :
                          job.transitionDifficulty.level === "Moderate" ? "secondary" :
                          "outline"
                        }
                      >
                        {job.transitionDifficulty.level}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {job.transitionDifficulty.explanation}
                      </p>
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium text-muted-foreground">Key Skills</td>
                  {result.jobs.map((job, i) => (
                    <td key={i} className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {job.requiredSkills.slice(0, 5).map((skill, j) => (
                          <Badge key={j} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
                {result.jobs[0]?.growthOpportunities && (
                  <tr className="border-b">
                    <td className="p-4 font-medium text-muted-foreground">Growth Path</td>
                    {result.jobs.map((job, i) => (
                      <td key={i} className="p-4">
                        <ul className="text-sm space-y-1">
                          {job.growthOpportunities?.slice(0, 3).map((opp, j) => (
                            <li key={j} className="flex items-start gap-1">
                              <ArrowRight className="h-3 w-3 mt-1 text-muted-foreground shrink-0" />
                              <span>{opp}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                )}
                {hasResume && result.jobs[0].fitAnalysis && (
                  <tr className="border-b bg-muted/30">
                    <td className="p-4 font-medium text-muted-foreground">Your Fit Score</td>
                    {result.jobs.map((job, i) => (
                      <td key={i} className="p-4">
                        {job.fitAnalysis && (
                          <div className="flex items-center gap-2">
                            <div className="relative w-12 h-12">
                              <svg className="w-12 h-12 transform -rotate-90">
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="text-muted"
                                />
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  strokeDasharray={`${job.fitAnalysis.overallFit * 1.25} 125`}
                                  className={
                                    job.fitAnalysis.overallFit >= 80 ? "text-green-500" :
                                    job.fitAnalysis.overallFit >= 60 ? "text-amber-500" :
                                    "text-red-500"
                                  }
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                                {job.fitAnalysis.overallFit}%
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.jobs.map((job, i) => (
              <Card key={i} data-testid={`card-job-analysis-${i}`}>
                <CardHeader>
                  <CardTitle>{job.jobTitle}</CardTitle>
                  <CardDescription>
                    {job.transitionDifficulty.level} transition
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      Main Responsibilities
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {job.mainResponsibilities.map((resp, j) => (
                        <li key={j}>• {resp}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Who Succeeds</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {job.whoSucceeds.map((trait, j) => (
                        <li key={j}>• {trait}</li>
                      ))}
                    </ul>
                  </div>

                  {hasResume && job.fitAnalysis && (
                    <>
                      <div className="pt-2 border-t">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Your Strengths
                        </h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {job.fitAnalysis.strengths.map((s, j) => (
                            <li key={j}>• {s}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Gaps to Address
                        </h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {job.fitAnalysis.gaps.map((g, j) => (
                            <li key={j}>• {g}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          Interview Risks
                        </h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {job.fitAnalysis.interviewRisks.map((r, j) => (
                            <li key={j}>• {r}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <Lightbulb className="h-4 w-4 text-primary" />
                          Resume Positioning
                        </h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {job.fitAnalysis.resumePositioning.map((p, j) => (
                            <li key={j}>• {p}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
