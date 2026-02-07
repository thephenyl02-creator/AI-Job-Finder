import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLocation, useSearch } from "wouter";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { apiRequest } from "@/lib/queryClient";
import type { Job, JobWithScore } from "@shared/schema";
import { JOB_TAXONOMY } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/animations";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ExternalLink,
  Search,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  MapPin,
  Building2,
  ChevronRight,
  ChevronDown,
  Brain,
  Lightbulb,
  BookOpen,
  Settings,
  FileText,
  Shield,
  Scale,
  TrendingUp,
  GraduationCap,
  Newspaper,
  Landmark,
  Microscope,
  Sparkles,
  X,
  Layers,
  Target,
  Loader2,
  DollarSign,
  Crown,
  Briefcase,
  Globe,
  Check,
  Upload,
  CheckCircle2,
  User,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ResumeExtractedData } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/hooks/use-subscription";
import { Footer } from "@/components/footer";

interface SearchQuestion {
  id: string;
  question: string;
  options: Array<{ value: string; label: string }>;
}

interface AnalysisResult {
  originalQuery: string;
  refinedIntent: string;
  questions: SearchQuestion[];
}

interface RefinedSearchResult {
  jobs: JobWithScore[];
  searchSummary: string;
}

type GuidedStep = "idle" | "refining" | "questions" | "searching";

const DEFAULT_SEARCH_SUGGESTIONS = [
  { label: "Compliance & Risk", query: "compliance or risk management role" },
  { label: "Remote Roles", query: "remote legal tech position" },
  { label: "Student / Intern", query: "internship or fellowship in legal tech" },
  { label: "Legal AI", query: "legal AI company, any role" },
  { label: "Operations", query: "legal operations at a growing company" },
];

const CATEGORY_ICONS: Record<string, typeof Brain> = {
  "Brain": Brain,
  "Lightbulb": Lightbulb,
  "BookOpen": BookOpen,
  "Settings": Settings,
  "FileText": FileText,
  "Shield": Shield,
  "Scale": Scale,
  "TrendingUp": TrendingUp,
  "GraduationCap": GraduationCap,
  "Newspaper": Newspaper,
  "Landmark": Landmark,
  "Microscope": Microscope,
  "Sparkles": Sparkles,
};

const SENIORITY_LEVELS = [
  { value: "all", label: "All Levels" },
  { value: "student", label: "Student / Intern", match: ["Intern", "Fellowship"] },
  { value: "entry", label: "Entry Level", match: ["Entry", "Junior", "Associate"] },
  { value: "mid", label: "Mid Level", match: ["Mid"] },
  { value: "senior", label: "Senior+", match: ["Senior", "Lead", "Director", "VP", "Principal", "Staff"] },
];

export default function Jobs() {
  usePageTitle("Browse Jobs");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { track } = useActivityTracker();
  const { isPro } = useSubscription();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const levelParam = urlParams.get("level");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>(levelParam && ["student", "entry", "mid", "senior"].includes(levelParam) ? levelParam : "all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [filterText, setFilterText] = useState("");
  const [searchResults, setSearchResults] = useState<JobWithScore[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showCategories, setShowCategories] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  const [locationSearch, setLocationSearch] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const [smartQuery, setSmartQuery] = useState("");
  const [guidedStep, setGuidedStep] = useState<GuidedStep>("idle");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [refinedSummary, setRefinedSummary] = useState<string | null>(null);

  const GUIDED_TRIAL_LIMIT = 7;

  const getGuidedTrialCount = useCallback(() => {
    const count = sessionStorage.getItem("guidedSearchCount");
    return count ? parseInt(count, 10) : 0;
  }, []);

  const hasUsedGuidedTrial = useCallback(() => {
    return getGuidedTrialCount() >= GUIDED_TRIAL_LIMIT;
  }, [getGuidedTrialCount]);

  const markGuidedTrialUsed = useCallback(() => {
    const current = getGuidedTrialCount();
    sessionStorage.setItem("guidedSearchCount", String(current + 1));
  }, [getGuidedTrialCount]);

  const guidedTrialsRemaining = isPro ? Infinity : GUIDED_TRIAL_LIMIT - getGuidedTrialCount();
  const canUseGuidedSearch = isPro || !hasUsedGuidedTrial();

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/search", { query });
      return response.json() as Promise<JobWithScore[]>;
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setSearchQuery(smartQuery);
      setGuidedStep("idle");
      track({ eventType: "search", metadata: { query: smartQuery, resultCount: data.length } });
    },
    onError: () => {
      toast({ title: "Search failed", description: "Please try again.", variant: "destructive" });
      setGuidedStep("idle");
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/search/analyze", { query });
      return response.json() as Promise<AnalysisResult>;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      if (data.questions && data.questions.length > 0) {
        setGuidedStep("questions");
      } else {
        refinedSearchMutation.mutate({
          originalQuery: data.originalQuery,
          refinedIntent: data.refinedIntent,
          answers: {},
        });
      }
    },
    onError: () => {
      toast({ title: "Let's try a quick search instead", variant: "default" });
      searchMutation.mutate(smartQuery);
    },
  });

  const refinedSearchMutation = useMutation({
    mutationFn: async (params: { originalQuery: string; refinedIntent: string; answers: Record<string, string> }) => {
      const response = await apiRequest("POST", "/api/search/refined", params);
      return response.json() as Promise<RefinedSearchResult>;
    },
    onSuccess: (data) => {
      setSearchResults(data.jobs);
      setSearchQuery(smartQuery + " (refined)");
      setRefinedSummary(data.searchSummary);
      setGuidedStep("idle");
      if (!isPro) markGuidedTrialUsed();
      track({ eventType: "search", metadata: { query: smartQuery, resultCount: data.jobs.length, guided: true } });
    },
    onError: () => {
      toast({ title: "Refined search failed", description: "Showing regular results instead.", variant: "destructive" });
      searchMutation.mutate(smartQuery);
    },
  });

  const handleSmartSearch = useCallback(() => {
    if (!smartQuery.trim()) return;
    if (canUseGuidedSearch) {
      setGuidedStep("refining");
      setAnalysis(null);
      setAnswers({});
      setRefinedSummary(null);
      analyzeMutation.mutate(smartQuery);
    } else {
      searchMutation.mutate(smartQuery);
    }
  }, [smartQuery, canUseGuidedSearch]);

  const handleQuickSearch = useCallback(() => {
    if (!smartQuery.trim()) return;
    setGuidedStep("idle");
    searchMutation.mutate(smartQuery);
  }, [smartQuery]);

  const handleSubmitAnswers = useCallback(() => {
    if (!analysis) return;
    setGuidedStep("searching");
    const formattedAnswers: Record<string, string> = {};
    analysis.questions.forEach(q => {
      if (answers[q.id]) {
        const selectedOption = q.options.find(o => o.value === answers[q.id]);
        formattedAnswers[q.question] = selectedOption?.label || answers[q.id];
      }
    });
    refinedSearchMutation.mutate({
      originalQuery: analysis.originalQuery,
      refinedIntent: analysis.refinedIntent,
      answers: formattedAnswers,
    });
  }, [analysis, answers]);

  const handleClearSearch = useCallback(() => {
    setSearchResults(null);
    setSearchQuery(null);
    setSmartQuery("");
    setGuidedStep("idle");
    setAnalysis(null);
    setAnswers({});
    setRefinedSummary(null);
  }, []);

  const allQuestionsAnswered = analysis?.questions?.every(q => answers[q.id]);
  const isSearching = searchMutation.isPending || analyzeMutation.isPending || refinedSearchMutation.isPending;

  useEffect(() => { track({ eventType: "page_view", pagePath: "/jobs" }); }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const level = params.get("level");
    if (level && ["entry", "mid", "senior"].includes(level)) {
      setSelectedLevel(level);
    }
  }, [searchString]);

  const toggleJobSelection = (jobId: number) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else if (next.size < 3) {
        next.add(jobId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedJobIds(new Set());
  };

  const getSelectedJobs = () => {
    const allDisplayJobs = searchResults || allJobs;
    return allDisplayJobs.filter((job) => selectedJobIds.has(job.id));
  };

  const handleCompareSelected = () => {
    const selectedJobs = getSelectedJobs();
    if (selectedJobs.length < 2) return;
    
    // Store selected jobs in sessionStorage for Career Advisor to pick up
    const jobsForComparison = selectedJobs.map((job) => ({
      id: String(job.id),
      title: job.title,
      description: job.description,
      company: job.company,
      location: job.location || undefined,
      portalJobId: job.id,
    }));
    sessionStorage.setItem("compareJobs", JSON.stringify(jobsForComparison));
    setLocation("/career-advisor");
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("searchResults");
    const query = sessionStorage.getItem("searchQuery");
    if (stored) {
      setSearchResults(JSON.parse(stored));
      setSearchQuery(query);
      sessionStorage.removeItem("searchResults");
      sessionStorage.removeItem("searchQuery");
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLocationDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const { data: allJobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    enabled: isAuthenticated,
  });

  const { data: resumeData } = useQuery<{ hasResume: boolean; filename?: string; extractedData?: ResumeExtractedData }>({
    queryKey: ["/api/resume"],
    enabled: isAuthenticated,
  });

  const { data: suggestionsData } = useQuery<{ suggestions: { label: string; query: string }[]; personalized: boolean }>({
    queryKey: ["/api/search/suggestions"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const searchSuggestions = suggestionsData?.suggestions ?? DEFAULT_SEARCH_SUGGESTIONS;

  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingResume(true);
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => prev >= 85 ? (clearInterval(progressInterval), 85) : prev + 15);
    }, 300);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const response = await fetch("/api/resume/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (response.ok && data.success) {
        clearInterval(progressInterval);
        setUploadProgress(100);
        toast({ title: "Resume uploaded", description: "Your profile has been updated. Searches will now be personalized to your background." });
        queryClient.invalidateQueries({ queryKey: ["/api/resume"] });
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsUploadingResume(false);
      setUploadProgress(0);
      if (resumeFileInputRef.current) resumeFileInputRef.current.value = "";
    }
  };

  const handleRemoveResume = async () => {
    try {
      await fetch("/api/resume", { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["/api/resume"] });
      toast({ title: "Resume removed", description: "You can upload a new one anytime." });
    } catch {}
  };

  const { data: locationsData = [] } = useQuery<{ location: string; count: number }[]>({
    queryKey: ["/api/jobs/locations"],
    enabled: isAuthenticated,
  });

  const normalizeLocation = (loc: string) => {
    const lower = loc.toLowerCase();
    const city = lower.split(",")[0].trim();
    return city;
  };

  const locationGroups = locationsData.reduce((acc, item) => {
    const city = normalizeLocation(item.location);
    if (!acc[city]) acc[city] = { display: item.location.split(",")[0].trim(), count: 0 };
    acc[city].count += item.count;
    return acc;
  }, {} as Record<string, { display: string; count: number }>);

  const uniqueLocations = Object.entries(locationGroups)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([key, val]) => ({ key, display: val.display, count: val.count }));

  const handleApplyClick = async (job: Job | JobWithScore) => {
    try {
      await apiRequest("POST", `/api/jobs/${job.id}/apply-click`);
    } catch (e) {
      console.error("Failed to track apply click", e);
    }
    window.open(job.applyUrl, "_blank");
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const formatSalaryRange = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) => {
      if (n >= 1000) {
        const k = n / 1000;
        return k % 1 === 0 ? `$${k.toFixed(0)}K` : `$${k.toFixed(1)}K`;
      }
      return `$${n}`;
    };
    if (min && max) return `${fmt(min)} \u2013 ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    return `Up to ${fmt(max!)}`;
  };

  const displayJobs = searchResults || allJobs;

  const filteredJobs = displayJobs.filter((job) => {
    const matchesCategory = selectedCategory === "all" || job.roleCategory === selectedCategory;
    const matchesText = filterText === "" || 
      job.title.toLowerCase().includes(filterText.toLowerCase()) ||
      job.company.toLowerCase().includes(filterText.toLowerCase()) ||
      (job.location?.toLowerCase().includes(filterText.toLowerCase()));
    
    let matchesLevel = true;
    if (selectedLevel !== "all") {
      const levelConfig = SENIORITY_LEVELS.find(l => l.value === selectedLevel);
      if (levelConfig && "match" in levelConfig && levelConfig.match) {
        const matchPatterns = levelConfig.match;
        matchesLevel = matchPatterns.some(m => 
          job.seniorityLevel?.toLowerCase().includes(m.toLowerCase()) ||
          job.title.toLowerCase().includes(m.toLowerCase())
        );
      }
    }

    let matchesLocation = true;
    if (selectedLocation === "remote") {
      matchesLocation = job.locationType === 'remote' || (!job.locationType && (!!job.isRemote || (job.location?.toLowerCase().includes("remote") ?? false)));
    } else if (selectedLocation === "hybrid") {
      matchesLocation = job.locationType === 'hybrid';
    } else if (selectedLocation === "onsite") {
      matchesLocation = job.locationType === 'onsite';
    } else if (selectedLocation !== "all") {
      const jobCity = normalizeLocation(job.location || "");
      matchesLocation = jobCity === selectedLocation;
    }
    
    return matchesCategory && matchesText && matchesLevel && matchesLocation;
  });

  const getCategoryCount = (category: string) => 
    displayJobs.filter(job => job.roleCategory === category).length;

  const jobsByCategory = Object.entries(JOB_TAXONOMY).reduce((acc, [category]) => {
    acc[category] = filteredJobs.filter(job => job.roleCategory === category);
    return acc;
  }, {} as Record<string, (Job | JobWithScore)[]>);

  const uncategorizedJobs = filteredJobs.filter(job => 
    !job.roleCategory || !Object.keys(JOB_TAXONOMY).includes(job.roleCategory)
  );

  const categoriesWithJobs = Object.entries(jobsByCategory)
    .filter(([_, jobs]) => jobs.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = CATEGORY_ICONS[iconName] || Brain;
    return IconComponent;
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-4 mb-4 flex-wrap">
          {searchResults && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="min-h-[44px]"
              data-testid="button-back-search"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              All Jobs
            </Button>
          )}
          <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight" data-testid="text-page-title">
            {searchResults ? `Results for "${searchQuery}"` : "Browse Jobs"}
          </h1>
          <span className="text-sm text-muted-foreground" data-testid="text-job-count">
            {filteredJobs.length} jobs
          </span>
        </div>

        <input
          ref={resumeFileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          onChange={handleResumeUpload}
          className="hidden"
          data-testid="input-resume-upload"
        />

        <Card className="mb-4 shadow-sm" data-testid="card-smart-search">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <Textarea
                  placeholder="Describe what you're looking for in plain language, e.g. 'remote compliance role for a mid-career attorney' or 'entry level legal tech jobs in New York'"
                  className="resize-none border-0 text-sm sm:text-base focus-visible:ring-0 shadow-none min-h-[52px] max-h-[100px] placeholder:text-muted-foreground/50 leading-relaxed"
                  rows={2}
                  value={smartQuery}
                  onChange={(e) => setSmartQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSmartSearch();
                    }
                  }}
                  data-testid="input-smart-search"
                />
              </div>
              <Button
                onClick={handleSmartSearch}
                disabled={!smartQuery.trim() || isSearching}
                className="gap-1.5 shrink-0"
                data-testid="button-smart-search"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="hidden sm:inline">Search</span>
              </Button>
            </div>

            {!smartQuery && !searchResults && guidedStep === "idle" && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {suggestionsData?.personalized && (
                  <Badge variant="secondary" className="text-[10px] mr-0.5" data-testid="badge-personalized-suggestions">
                    <User className="h-2.5 w-2.5 mr-0.5" />
                    For you
                  </Badge>
                )}
                {searchSuggestions.map((s) => (
                  <Button
                    key={s.label}
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => setSmartQuery(s.query)}
                    data-testid={`chip-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {s.label}
                  </Button>
                ))}

                <span className="text-muted-foreground/30 mx-0.5 hidden sm:inline">|</span>

                {isUploadingResume && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5" data-testid="text-resume-uploading">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analyzing resume...
                  </span>
                )}

                {resumeData?.hasResume && !isUploadingResume && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="text-resume-active">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    Personalized
                    <Button variant="ghost" size="sm" onClick={() => resumeFileInputRef.current?.click()} className="text-xs h-auto py-0.5 px-1.5" data-testid="button-update-resume">
                      Update
                    </Button>
                    <button onClick={handleRemoveResume} className="text-muted-foreground/50 hover:text-muted-foreground" data-testid="button-remove-resume">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {!resumeData?.hasResume && !isUploadingResume && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => resumeFileInputRef.current?.click()}
                    data-testid="button-upload-resume"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload resume for better matches
                  </Button>
                )}
              </div>
            )}
            {smartQuery.trim() && guidedStep === "idle" && !isSearching && !searchResults && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleQuickSearch}
                  className="text-muted-foreground gap-1 text-xs min-h-[44px]"
                  data-testid="button-quick-search"
                >
                  <ArrowRight className="h-3 w-3" />
                  Quick search (skip questions)
                </Button>
                {!canUseGuidedSearch && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Guided refinement is a Pro feature
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <AnimatePresence>
          {guidedStep === "refining" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card className="border-primary/20">
                <CardContent className="p-5 flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Understanding your search...</p>
                    <p className="text-xs text-muted-foreground">Preparing a few questions to find the best matches</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {guidedStep === "questions" && analysis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 space-y-3"
            >
              {analysis.refinedIntent && (
                <Card className="bg-muted/40 border-border/60">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground">What we understood</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{analysis.refinedIntent}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {analysis.questions.map((question, idx) => (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-3 sm:p-4">
                      <p className="text-sm font-medium text-foreground mb-2">
                        {idx + 1}. {question.question}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {question.options.map((option) => (
                          <Badge
                            key={option.value}
                            variant={answers[question.id] === option.value ? "default" : "outline"}
                            className={`cursor-pointer py-2 px-3 text-xs transition-all min-h-[44px] flex items-center ${
                              answers[question.id] === option.value ? "ring-1 ring-primary/30" : ""
                            }`}
                            onClick={() => setAnswers(prev => ({ ...prev, [question.id]: option.value }))}
                            data-testid={`option-${question.id}-${option.value}`}
                          >
                            {answers[question.id] === option.value && <Check className="h-3 w-3 mr-1" />}
                            {option.label}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              <div className="flex items-center gap-2 justify-between flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="gap-1 min-h-[44px]"
                  data-testid="button-guided-cancel"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleQuickSearch}
                    className="text-muted-foreground gap-1 min-h-[44px]"
                    data-testid="button-skip-questions"
                  >
                    Skip
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitAnswers}
                    disabled={!allQuestionsAnswered}
                    className="gap-1 min-h-[44px]"
                    data-testid="button-find-matches"
                  >
                    <Target className="h-3.5 w-3.5" />
                    Find Matches
                  </Button>
                </div>
              </div>

              {!isPro && (
                <p className="text-xs text-muted-foreground text-center">
                  {guidedTrialsRemaining > 0
                    ? `${guidedTrialsRemaining} free guided ${guidedTrialsRemaining === 1 ? "search" : "searches"} remaining.`
                    : "You've used all your free guided searches."}
                  <Link href="/pricing" className="text-primary ml-1">Upgrade for unlimited</Link>
                </p>
              )}
            </motion.div>
          )}

          {guidedStep === "searching" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card className="border-primary/20">
                <CardContent className="p-5 flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Finding your best matches...</p>
                    <p className="text-xs text-muted-foreground">Searching for roles that fit your criteria</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {refinedSummary && searchResults && (
          <Card className="bg-muted/40 border-border/60 mb-6" data-testid="card-refined-summary">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground">{refinedSummary}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 items-start">
          <div className="flex items-center gap-2 w-full sm:flex-1 sm:w-auto sm:min-w-[180px] sm:max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Filter results..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="min-h-[44px]"
              data-testid="input-filter"
            />
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 overflow-x-auto max-w-full">
            {SENIORITY_LEVELS.map((level) => (
              <Button
                key={level.value}
                variant={selectedLevel === level.value ? "default" : "ghost"}
                size="sm"
                onClick={() => { setSelectedLevel(level.value); track({ eventType: "filter_change", metadata: { filterType: "level", value: level.value } }); }}
                className="min-h-[44px] whitespace-nowrap shrink-0"
                data-testid={`button-level-${level.value}`}
              >
                {level.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
          {selectedCategory === "all" && (
            <Button
              variant={showCategories ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCategories(!showCategories)}
              className="gap-1 min-h-[44px]"
              data-testid="button-browse-categories"
            >
              <Layers className="h-3 w-3" />
              Categories
              {showCategories ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          )}
          <div className="relative" ref={locationDropdownRef}>
            <Button
              variant={selectedLocation !== "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
              className="gap-1 min-h-[44px]"
              data-testid="button-location-filter"
            >
              <MapPin className="h-3 w-3" />
              {selectedLocation === "all" ? "All Locations" : selectedLocation === "remote" ? "Remote" : selectedLocation === "hybrid" ? "Hybrid" : selectedLocation === "onsite" ? "On-site" : uniqueLocations.find(l => l.key === selectedLocation)?.display || selectedLocation}
            </Button>
            {locationDropdownOpen && (
              <div className="absolute top-full mt-1 left-0 z-50 w-64 max-h-72 bg-card border rounded-lg shadow-lg overflow-hidden">
                <div className="p-2 border-b">
                  <Input
                    placeholder="Search locations..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="h-8 text-sm"
                    data-testid="input-location-search"
                  />
                </div>
                <div className="overflow-y-auto max-h-52">
                  <button
                    className={`w-full text-left px-3 py-2.5 text-sm hover-elevate min-h-[44px] ${selectedLocation === "all" ? "bg-muted font-medium" : ""}`}
                    onClick={() => { setSelectedLocation("all"); setLocationDropdownOpen(false); setLocationSearch(""); track({ eventType: "filter_change", metadata: { filterType: "location", value: "all" } }); }}
                    data-testid="button-location-all"
                  >
                    All Locations
                  </button>
                  <button
                    className={`w-full text-left px-3 py-2.5 text-sm hover-elevate flex items-center justify-between gap-2 min-h-[44px] ${selectedLocation === "remote" ? "bg-muted font-medium" : ""}`}
                    onClick={() => { setSelectedLocation("remote"); setLocationDropdownOpen(false); setLocationSearch(""); track({ eventType: "filter_change", metadata: { filterType: "location", value: "remote" } }); }}
                    data-testid="button-location-remote"
                  >
                    <span>Remote</span>
                    <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">{allJobs.filter(j => j.locationType === 'remote' || (!j.locationType && j.isRemote)).length}</Badge>
                  </button>
                  <button
                    className={`w-full text-left px-3 py-2.5 text-sm hover-elevate flex items-center justify-between gap-2 min-h-[44px] ${selectedLocation === "hybrid" ? "bg-muted font-medium" : ""}`}
                    onClick={() => { setSelectedLocation("hybrid"); setLocationDropdownOpen(false); setLocationSearch(""); track({ eventType: "filter_change", metadata: { filterType: "location", value: "hybrid" } }); }}
                    data-testid="button-location-hybrid"
                  >
                    <span>Hybrid</span>
                    <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{allJobs.filter(j => j.locationType === 'hybrid').length}</Badge>
                  </button>
                  <button
                    className={`w-full text-left px-3 py-2.5 text-sm hover-elevate flex items-center justify-between gap-2 min-h-[44px] ${selectedLocation === "onsite" ? "bg-muted font-medium" : ""}`}
                    onClick={() => { setSelectedLocation("onsite"); setLocationDropdownOpen(false); setLocationSearch(""); track({ eventType: "filter_change", metadata: { filterType: "location", value: "onsite" } }); }}
                    data-testid="button-location-onsite"
                  >
                    <span>On-site</span>
                    <Badge variant="secondary" className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">{allJobs.filter(j => j.locationType === 'onsite').length}</Badge>
                  </button>
                  <div className="border-t my-1" />
                  {uniqueLocations
                    .filter(l => locationSearch === "" || l.display.toLowerCase().includes(locationSearch.toLowerCase()))
                    .map((loc) => (
                    <button
                      key={loc.key}
                      className={`w-full text-left px-3 py-2.5 text-sm hover-elevate flex items-center justify-between gap-2 min-h-[44px] ${selectedLocation === loc.key ? "bg-muted font-medium" : ""}`}
                      onClick={() => { setSelectedLocation(loc.key); setLocationDropdownOpen(false); setLocationSearch(""); track({ eventType: "filter_change", metadata: { filterType: "location", value: loc.key } }); }}
                      data-testid={`button-location-${loc.key}`}
                    >
                      <span className="truncate">{loc.display}</span>
                      <Badge variant="secondary" className="text-xs shrink-0 ml-2">{loc.count}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
          {selectedCategory !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="gap-1 min-h-[44px]"
              data-testid="button-clear-category"
            >
              <X className="h-3 w-3" />
              {selectedCategory}
            </Button>
          )}
          {selectedLevel !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLevel("all")}
              className="gap-1"
              data-testid="button-clear-level"
            >
              <X className="h-3 w-3" />
              {SENIORITY_LEVELS.find(l => l.value === selectedLevel)?.label}
            </Button>
          )}
          {selectedLocation !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLocation("all")}
              className="gap-1"
              data-testid="button-clear-location"
            >
              <X className="h-3 w-3" />
              {selectedLocation === "remote" ? "Remote" : selectedLocation === "hybrid" ? "Hybrid" : selectedLocation === "onsite" ? "On-site" : uniqueLocations.find(l => l.key === selectedLocation)?.display}
            </Button>
          )}
        </div>

        {selectedCategory === "all" && showCategories && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="flex flex-wrap gap-2">
              {Object.entries(JOB_TAXONOMY).map(([category, data]) => {
                const count = getCategoryCount(category);
                const Icon = getCategoryIcon(data.icon);
                return (
                  <Button
                    key={category}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(category);
                      setExpandedCategories(new Set([category]));
                      setShowCategories(false);
                      track({ eventType: "filter_change", metadata: { filterType: "category", value: category } });
                    }}
                    disabled={count === 0}
                    className={`gap-1.5 ${count === 0 ? "opacity-40" : ""}`}
                    data-testid={`button-category-${category.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {data.shortName}
                    <Badge variant="secondary" className="text-xs ml-0.5">{count}</Badge>
                  </Button>
                );
              })}
            </div>
          </motion.div>
        )}

        {jobsLoading ? (
          <div className="text-center py-12">
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading jobs...</span>
            </motion.div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <motion.div
            className="py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="max-w-lg mx-auto">
              <CardContent className="p-6 text-center">
                <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No jobs match your current filters</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {searchResults
                    ? "Try a different search or broaden your filters."
                    : "Try adjusting your filters or search for something specific."}
                </p>
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {(filterText || selectedCategory !== "all" || selectedLevel !== "all" || selectedLocation !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setFilterText(""); setSelectedCategory("all"); setSelectedLevel("all"); setSelectedLocation("all"); }}
                      className="gap-1 min-h-[44px]"
                      data-testid="button-clear-all-filters"
                    >
                      <X className="h-3 w-3" />
                      Clear all filters
                    </Button>
                  )}
                  {searchResults && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearSearch}
                      className="gap-1 min-h-[44px]"
                      data-testid="button-show-all-jobs"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Show all jobs
                    </Button>
                  )}
                </div>
                {!searchResults && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Try searching for:</p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {searchSuggestions.slice(0, 3).map((s) => (
                        <Button
                          key={s.label}
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs min-h-[44px]"
                          onClick={() => { setSmartQuery(s.query); handleClearSearch(); }}
                          data-testid={`empty-chip-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {selectedCategory !== "all" ? (
              <CategorySection
                category={selectedCategory}
                jobs={filteredJobs}
                taxonomy={JOB_TAXONOMY[selectedCategory as keyof typeof JOB_TAXONOMY]}
                expanded={true}
                onToggle={() => {}}
                onApply={handleApplyClick}
                hasResume={resumeData?.hasResume ?? false}
                searchResults={searchResults}
                getCategoryIcon={getCategoryIcon}
                selectedJobIds={selectedJobIds}
                onToggleSelection={toggleJobSelection}
                onJobClick={(id) => setLocation(`/jobs/${id}`)}
              />
            ) : (
              <>
                {categoriesWithJobs.map(([category, jobs]) => {
                  const taxonomy = JOB_TAXONOMY[category as keyof typeof JOB_TAXONOMY];
                  return (
                    <CategorySection
                      key={category}
                      category={category}
                      jobs={jobs}
                      taxonomy={taxonomy}
                      expanded={expandedCategories.has(category)}
                      onToggle={() => toggleCategory(category)}
                      onApply={handleApplyClick}
                      hasResume={resumeData?.hasResume ?? false}
                      searchResults={searchResults}
                      getCategoryIcon={getCategoryIcon}
                      selectedJobIds={selectedJobIds}
                      onToggleSelection={toggleJobSelection}
                      onJobClick={(id) => setLocation(`/jobs/${id}`)}
                    />
                  );
                })}
                {uncategorizedJobs.length > 0 && (
                  <CategorySection
                    category="Other"
                    jobs={uncategorizedJobs}
                    taxonomy={{ icon: "Sparkles", shortName: "Other", description: "Uncategorized jobs", subcategories: [] }}
                    expanded={expandedCategories.has("Other")}
                    onToggle={() => toggleCategory("Other")}
                    onApply={handleApplyClick}
                    hasResume={resumeData?.hasResume ?? false}
                    searchResults={searchResults}
                    getCategoryIcon={getCategoryIcon}
                    selectedJobIds={selectedJobIds}
                    onToggleSelection={toggleJobSelection}
                    onJobClick={(id) => setLocation(`/jobs/${id}`)}
                  />
                )}
              </>
            )}
          </div>
        )}

        <AnimatePresence>
          {selectedJobIds.size > 0 && (
            <motion.div
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] sm:w-auto max-w-lg"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              data-testid="compare-action-bar"
            >
              <Card className="shadow-lg border-primary/20">
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 py-3 px-4 sm:px-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Target className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-medium text-sm sm:text-base">
                      {selectedJobIds.size} job{selectedJobIds.size > 1 ? "s" : ""} selected
                    </span>
                    {selectedJobIds.size < 2 && (
                      <span className="text-xs sm:text-sm text-muted-foreground">(select at least 2)</span>
                    )}
                    {selectedJobIds.size >= 3 && (
                      <span className="text-xs sm:text-sm text-muted-foreground">(max 3)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      className="min-h-[44px] flex-1 sm:flex-none"
                      data-testid="button-clear-selection"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCompareSelected}
                      disabled={selectedJobIds.size < 2}
                      className="min-h-[44px] flex-1 sm:flex-none"
                      data-testid="button-compare-selected"
                    >
                      <Target className="h-4 w-4 mr-1" />
                      Compare
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

function CategorySection({
  category,
  jobs,
  taxonomy,
  expanded,
  onToggle,
  onApply,
  hasResume,
  searchResults,
  getCategoryIcon,
  selectedJobIds,
  onToggleSelection,
  onJobClick,
}: {
  category: string;
  jobs: (Job | JobWithScore)[];
  taxonomy: { icon: string; shortName: string; description: string; subcategories: readonly string[] };
  expanded: boolean;
  onToggle: () => void;
  onApply: (job: Job | JobWithScore) => void;
  hasResume: boolean;
  searchResults: JobWithScore[] | null;
  getCategoryIcon: (icon: string) => typeof Brain;
  selectedJobIds: Set<number>;
  onToggleSelection: (jobId: number) => void;
  onJobClick: (jobId: number) => void;
}) {
  const Icon = getCategoryIcon(taxonomy.icon);

  const formatSalaryRange = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) => {
      if (n >= 1000) {
        const k = n / 1000;
        return k % 1 === 0 ? `$${k.toFixed(0)}K` : `$${k.toFixed(1)}K`;
      }
      return `$${n}`;
    };
    if (min && max) return `${fmt(min)} \u2013 ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    return `Up to ${fmt(max!)}`;
  };

  const jobsBySubcategory = jobs.reduce((acc, job) => {
    const sub = job.roleSubcategory || "Other";
    if (!acc[sub]) acc[sub] = [];
    acc[sub].push(job);
    return acc;
  }, {} as Record<string, (Job | JobWithScore)[]>);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left min-h-[44px]"
        data-testid={`button-toggle-${category.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <CardHeader className="flex flex-row items-center gap-2 sm:gap-3 py-3 sm:py-4 hover:bg-muted/30 transition-colors">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">{category}</h3>
              <Badge variant="secondary">{jobs.length}</Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{taxonomy.description}</p>
          </div>
          {expanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
        </CardHeader>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 pb-4">
              <div className="space-y-6">
                {Object.entries(jobsBySubcategory)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([subcategory, subJobs]) => (
                    <div key={subcategory} data-testid={`subcategory-${subcategory.replace(/\s+/g, '-').toLowerCase()}`}>
                      <div className="flex items-center gap-3 mb-3 px-1 pb-2 border-b border-border">
                        <h4 className="text-sm font-semibold text-foreground">{subcategory}</h4>
                        <Badge variant="outline" className="text-xs">{subJobs.length}</Badge>
                      </div>
                      <div className="grid gap-2">
                        {subJobs.map((job) => {
                          const salaryDisplay = formatSalaryRange(job.salaryMin, job.salaryMax);
                          return (
                            <div
                              key={job.id}
                              className={`p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer ${selectedJobIds.has(job.id) ? "ring-2 ring-primary bg-primary/5" : ""}`}
                              data-testid={`card-job-${job.id}`}
                              onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button, [role="checkbox"], a')) return;
                                onJobClick(job.id);
                              }}
                            >
                              <div className="flex items-start gap-2 sm:gap-3">
                                <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                                  <Checkbox
                                    checked={selectedJobIds.has(job.id)}
                                    onCheckedChange={() => onToggleSelection(job.id)}
                                    disabled={!selectedJobIds.has(job.id) && selectedJobIds.size >= 3}
                                    className="min-h-[20px] min-w-[20px]"
                                    data-testid={`checkbox-job-${job.id}`}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-medium text-foreground text-sm sm:text-base" data-testid={`text-job-title-${job.id}`}>
                                      {job.title}
                                    </h4>
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onApply(job);
                                      }}
                                      className="min-h-[44px] shrink-0 hidden sm:flex"
                                      data-testid={`button-apply-${job.id}`}
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      Apply
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3 shrink-0" />
                                      <span data-testid={`text-job-company-${job.id}`}>{job.company}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      <span data-testid={`text-job-location-${job.id}`}>{job.location || "Not specified"}</span>
                                    </span>
                                    {salaryDisplay && (
                                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                        <DollarSign className="h-3 w-3 shrink-0" />
                                        <span data-testid={`text-salary-${job.id}`}>{salaryDisplay}</span>
                                      </span>
                                    )}
                                    {job.seniorityLevel && (
                                      <Badge variant="outline" className="text-xs">
                                        {job.seniorityLevel}
                                      </Badge>
                                    )}
                                    {searchResults && "matchScore" in job && (job as JobWithScore).matchScore && (
                                      <Badge 
                                        variant={(job as JobWithScore).matchScore! >= 80 ? "default" : "secondary"}
                                        data-testid={`badge-match-${job.id}`}
                                      >
                                        {(job as JobWithScore).matchScore}% match
                                      </Badge>
                                    )}
                                  </div>
                                  {job.aiSummary && (
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
                                      {job.aiSummary}
                                    </p>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onApply(job);
                                    }}
                                    className="min-h-[44px] mt-2 sm:hidden w-full"
                                    data-testid={`button-apply-mobile-${job.id}`}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Apply
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
