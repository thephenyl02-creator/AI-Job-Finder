import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLocation, useSearch } from "wouter";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { apiRequest } from "@/lib/queryClient";
import type { Job, JobWithScore } from "@shared/schema";
import { JOB_TAXONOMY } from "@shared/schema";
import { cleanStructuredText } from "@/lib/structured-description";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/animations";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
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
  Clock,
  ExternalLink,
  Lock,
  ArrowUpDown,
  Wrench,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  { label: "Compliance & Privacy", query: "compliance or privacy counsel role" },
  { label: "Remote Roles", query: "remote legal tech position" },
  { label: "Legal Engineering", query: "legal engineer role" },
  { label: "In-House Counsel", query: "counsel or attorney at legal tech company" },
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
  "Wrench": Wrench,
  "Target": Target,
  "Briefcase": Briefcase,
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
  const [debouncedFilterText, setDebouncedFilterText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const JOBS_PER_PAGE = 20;
  const [searchResults, setSearchResults] = useState<JobWithScore[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const [smartQuery, setSmartQuery] = useState("");
  const [guidedStep, setGuidedStep] = useState<GuidedStep>("idle");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [refinedSummary, setRefinedSummary] = useState<string | null>(null);

  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const MAX_COMPARE = 3;

  const toggleCompare = (jobId: number) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else if (next.size < MAX_COMPARE) {
        next.add(jobId);
      }
      return next;
    });
  };

  const { data: usageLimits } = useQuery<{
    isPro: boolean;
    guidedSearch: { used: number; limit: number | null };
  }>({
    queryKey: ["/api/usage/limits"],
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });

  const guidedSearchUsed = usageLimits?.guidedSearch?.used ?? 0;
  const guidedSearchLimit = usageLimits?.guidedSearch?.limit ?? 7;
  const guidedTrialsRemaining = isPro ? Infinity : Math.max(0, guidedSearchLimit - guidedSearchUsed);
  const canUseGuidedSearch = isPro || guidedTrialsRemaining > 0;

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
      queryClient.invalidateQueries({ queryKey: ["/api/usage/limits"] });
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
    onError: (error: any) => {
      const isLimitError = error?.message?.includes("guided searches") || error?.message?.includes("Upgrade to Pro");
      if (isLimitError) {
        setGuidedStep("idle");
        toast({
          title: "You've used all 7 free guided searches",
          description: "Guided search helps you find better-fit roles. Upgrade to Pro for unlimited access — just $5/mo.",
        });
      } else {
        toast({ title: "Let's try a quick search instead", variant: "default" });
      }
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
      track({ eventType: "search", metadata: { query: smartQuery, resultCount: data.jobs.length, guided: true } });
    },
    onError: () => {
      toast({ title: "Refined search failed", description: "Showing regular results instead.", variant: "destructive" });
      searchMutation.mutate(smartQuery);
    },
  });

  const handleSmartSearch = useCallback(() => {
    if (!smartQuery.trim()) return;
    if (!isAuthenticated) {
      toast({ title: "Create a free account to save jobs, see your match %, get alerts, and track applications." });
      setLocation("/auth?returnTo=/jobs");
      return;
    }
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
    if (!isAuthenticated) {
      toast({ title: "Create a free account to save jobs, see your match %, get alerts, and track applications." });
      setLocation("/auth?returnTo=/jobs");
      return;
    }
    setGuidedStep("idle");
    searchMutation.mutate(smartQuery);
  }, [smartQuery, isAuthenticated]);

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
    const timer = setTimeout(() => setDebouncedFilterText(filterText), 300);
    return () => clearTimeout(timer);
  }, [filterText]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedLevel, selectedLocation, debouncedFilterText]);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const level = params.get("level");
    if (level && ["entry", "mid", "senior"].includes(level)) {
      setSelectedLevel(level);
    }
  }, [searchString]);


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


  const jobsQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("limit", String(JOBS_PER_PAGE));
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedLevel !== "all") params.set("seniority", selectedLevel);
    if (selectedLocation === "remote" || selectedLocation === "hybrid" || selectedLocation === "onsite") {
      params.set("locationType", selectedLocation);
    } else if (selectedLocation !== "all") {
      params.set("location", selectedLocation);
    }
    if (debouncedFilterText) params.set("search", debouncedFilterText);
    return params.toString();
  }, [currentPage, selectedCategory, selectedLevel, selectedLocation, debouncedFilterText]);

  const { data: jobsResponse, isLoading: jobsLoading } = useQuery<{ jobs: Job[]; total: number; page: number; totalPages: number }>({
    queryKey: ["/api/jobs", jobsQueryParams],
    queryFn: () => fetch(`/api/jobs?${jobsQueryParams}`).then(r => r.json()),
    placeholderData: (prev) => prev,
  });
  const allJobs = jobsResponse?.jobs ?? [];
  const totalJobCount = jobsResponse?.total ?? 0;
  const totalPages = jobsResponse?.totalPages ?? 1;

  const { data: statsData } = useQuery<{ totalJobs: number; categoryCounts: Record<string, number> }>({
    queryKey: ["/api/stats"],
    staleTime: 60000,
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
  const isPersonalized = suggestionsData?.personalized ?? false;

  const searchPlaceholder = useMemo(() => {
    if (isPersonalized && searchSuggestions.length > 0) {
      const example = cleanStructuredText(searchSuggestions[0].query);
      return `Try "${example}" or describe what you're looking for...`;
    }
    return "Describe what you're looking for, e.g. 'remote compliance role' or 'entry level legal tech in New York'";
  }, [isPersonalized, searchSuggestions]);

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
    } catch (err) {
      console.error("Failed to remove resume:", err);
    }
  };

  const { data: locationsData = [] } = useQuery<{ location: string; count: number }[]>({
    queryKey: ["/api/jobs/locations"],
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

  const filteredJobs = searchResults || allJobs;

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
            {searchResults ? `${searchResults.length} results` : `${totalJobCount} jobs`}
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
                  placeholder={searchPlaceholder}
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
                {isPersonalized && (
                  <span className="text-[10px] text-muted-foreground/60 mr-0.5" data-testid="text-personalized-label">For you:</span>
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
                    {cleanStructuredText(s.label)}
                  </Button>
                ))}
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
                  <Link href="/pricing">
                    <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" data-testid="badge-guided-search-pro">
                      <Crown className="h-3 w-3" />
                      Unlock guided search — $5/mo
                    </Badge>
                  </Link>
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
                    ? `${guidedTrialsRemaining} of 7 free guided ${guidedTrialsRemaining === 1 ? "search" : "searches"} remaining.`
                    : "You've used all 7 free guided searches."}
                  <Link href="/pricing" className="text-primary ml-1 font-medium">Upgrade for unlimited — $5/mo</Link>
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

        {(() => {
          const activeFilterCount = (selectedCategory !== "all" ? 1 : 0) + (selectedLevel !== "all" ? 1 : 0) + (selectedLocation !== "all" ? 1 : 0);
          return (
            <>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0 max-w-sm">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Filter by keyword, company, or location..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="min-h-[44px]"
                    data-testid="input-filter"
                  />
                </div>
                <Button
                  variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-1.5"
                  data-testid="button-toggle-filters"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] ml-0.5">{activeFilterCount}</Badge>
                  )}
                  {showFilters ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
              </div>

              {activeFilterCount > 0 && (
                <div className="flex items-center gap-1.5 mb-4 flex-wrap" data-testid="active-filter-chips">
                  <span className="text-xs text-muted-foreground mr-1">Active:</span>
                  {selectedCategory !== "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedCategory("all"); track({ eventType: "filter_change", metadata: { filterType: "category", value: "all" } }); }}
                      className="gap-1 text-xs h-7"
                      data-testid="button-clear-category"
                    >
                      <Layers className="h-3 w-3" />
                      {selectedCategory}
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {selectedLevel !== "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedLevel("all"); track({ eventType: "filter_change", metadata: { filterType: "level", value: "all" } }); }}
                      className="gap-1 text-xs h-7"
                      data-testid="button-clear-level"
                    >
                      <Briefcase className="h-3 w-3" />
                      {SENIORITY_LEVELS.find(l => l.value === selectedLevel)?.label}
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {selectedLocation !== "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedLocation("all"); track({ eventType: "filter_change", metadata: { filterType: "location", value: "all" } }); }}
                      className="gap-1 text-xs h-7"
                      data-testid="button-clear-location"
                    >
                      <MapPin className="h-3 w-3" />
                      {selectedLocation === "remote" ? "Remote" : selectedLocation === "hybrid" ? "Hybrid" : selectedLocation === "onsite" ? "On-site" : uniqueLocations.find(l => l.key === selectedLocation)?.display || selectedLocation}
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedCategory("all"); setSelectedLevel("all"); setSelectedLocation("all"); }}
                    className="text-xs text-muted-foreground h-7"
                    data-testid="button-clear-all-filters-top"
                  >
                    Clear all
                  </Button>
                </div>
              )}

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mb-4"
                  >
                    <Card data-testid="card-filter-panel">
                      <CardContent className="p-4 space-y-5">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Experience Level</p>
                          <div className="flex flex-wrap gap-1.5">
                            {SENIORITY_LEVELS.map((level) => (
                              <Button
                                key={level.value}
                                variant={selectedLevel === level.value ? "default" : "outline"}
                                size="sm"
                                onClick={() => { setSelectedLevel(level.value); track({ eventType: "filter_change", metadata: { filterType: "level", value: level.value } }); }}
                                data-testid={`button-level-${level.value}`}
                              >
                                {level.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Category</p>
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              variant={selectedCategory === "all" ? "default" : "outline"}
                              size="sm"
                              onClick={() => { setSelectedCategory("all"); track({ eventType: "filter_change", metadata: { filterType: "category", value: "all" } }); }}
                              data-testid="button-category-all"
                            >
                              All Categories
                            </Button>
                            {Object.entries(JOB_TAXONOMY).map(([category, data]) => {
                              const count = statsData?.categoryCounts?.[category] ?? 0;
                              const Icon = getCategoryIcon(data.icon);
                              return (
                                <Button
                                  key={category}
                                  variant={selectedCategory === category ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCategory(category);
                                    setCurrentPage(1);
                                    track({ eventType: "filter_change", metadata: { filterType: "category", value: category } });
                                  }}
                                  disabled={count === 0}
                                  className={`gap-1 ${count === 0 ? "opacity-40" : ""}`}
                                  data-testid={`button-category-${category.replace(/\s+/g, '-').toLowerCase()}`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {data.shortName}
                                  <Badge variant="secondary" className="text-[10px] ml-0.5">{count}</Badge>
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Location</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <Button
                              variant={selectedLocation === "all" ? "default" : "outline"}
                              size="sm"
                              onClick={() => { setSelectedLocation("all"); track({ eventType: "filter_change", metadata: { filterType: "location", value: "all" } }); }}
                              data-testid="button-location-all"
                            >
                              All Locations
                            </Button>
                            <Button
                              variant={selectedLocation === "remote" ? "default" : "outline"}
                              size="sm"
                              onClick={() => { setSelectedLocation("remote"); setCurrentPage(1); track({ eventType: "filter_change", metadata: { filterType: "location", value: "remote" } }); }}
                              data-testid="button-location-remote"
                            >
                              Remote
                            </Button>
                            <Button
                              variant={selectedLocation === "hybrid" ? "default" : "outline"}
                              size="sm"
                              onClick={() => { setSelectedLocation("hybrid"); setCurrentPage(1); track({ eventType: "filter_change", metadata: { filterType: "location", value: "hybrid" } }); }}
                              data-testid="button-location-hybrid"
                            >
                              Hybrid
                            </Button>
                            <Button
                              variant={selectedLocation === "onsite" ? "default" : "outline"}
                              size="sm"
                              onClick={() => { setSelectedLocation("onsite"); setCurrentPage(1); track({ eventType: "filter_change", metadata: { filterType: "location", value: "onsite" } }); }}
                              data-testid="button-location-onsite"
                            >
                              On-site
                            </Button>
                          </div>
                          {uniqueLocations.length > 0 && (
                            <div>
                              <div className="mb-1.5">
                                <Input
                                  placeholder="Search cities..."
                                  value={locationSearch}
                                  onChange={(e) => setLocationSearch(e.target.value)}
                                  className="h-8 text-sm max-w-xs"
                                  data-testid="input-location-search"
                                />
                              </div>
                              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                {uniqueLocations
                                  .filter(l => locationSearch === "" || l.display.toLowerCase().includes(locationSearch.toLowerCase()))
                                  .slice(0, locationSearch ? undefined : 12)
                                  .map((loc) => (
                                    <Button
                                      key={loc.key}
                                      variant={selectedLocation === loc.key ? "default" : "ghost"}
                                      size="sm"
                                      onClick={() => { setSelectedLocation(loc.key); track({ eventType: "filter_change", metadata: { filterType: "location", value: loc.key } }); }}
                                      className="gap-1 text-xs h-7"
                                      data-testid={`button-location-${loc.key}`}
                                    >
                                      {loc.display}
                                      <Badge variant="secondary" className="text-[10px]">{loc.count}</Badge>
                                    </Button>
                                  ))}
                                {!locationSearch && uniqueLocations.length > 12 && (
                                  <span className="text-xs text-muted-foreground self-center ml-1">
                                    +{uniqueLocations.length - 12} more (type to search)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          );
        })()}

        {jobsLoading && !jobsResponse ? (
          <div className="grid gap-3" data-testid="skeleton-jobs">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-3 sm:p-4 rounded-lg border bg-card">
                <div className="flex gap-3">
                  <div className="h-5 w-5 rounded bg-muted animate-pulse shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-4 w-3/5 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="flex gap-1.5">
                      <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
                      <div className="h-5 w-14 bg-muted animate-pulse rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                          {cleanStructuredText(s.label)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid gap-3">
            {filteredJobs.map((job) => {
              const salaryDisplay = formatSalaryRange(job.salaryMin, job.salaryMax);
              const locType = job.locationType || (job.isRemote ? "remote" : null);
              const postedAgo = job.postedDate ? (() => {
                const days = Math.floor((Date.now() - new Date(job.postedDate).getTime()) / 86400000);
                if (days === 0) return "Today";
                if (days === 1) return "1d ago";
                if (days < 7) return `${days}d ago`;
                if (days < 30) return `${Math.floor(days / 7)}w ago`;
                return `${Math.floor(days / 30)}mo ago`;
              })() : null;
              const isSelected = compareIds.has(job.id);
              const canSelect = isSelected || compareIds.size < MAX_COMPARE;
              const taxonomy = job.roleCategory ? JOB_TAXONOMY[job.roleCategory as keyof typeof JOB_TAXONOMY] : null;
              const CategoryIcon = taxonomy ? getCategoryIcon(taxonomy.icon) : null;
              return (
                <div
                  key={job.id}
                  className={`p-3 sm:p-4 rounded-lg border bg-card hover-elevate transition-colors cursor-pointer ${isSelected ? "ring-1 ring-primary/40" : ""}`}
                  data-testid={`card-job-${job.id}`}
                  onClick={() => setLocation(`/jobs/${job.id}`)}
                >
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : canSelect
                          ? "border-muted-foreground/30 hover:border-primary/50"
                          : "border-muted-foreground/10 opacity-40 cursor-not-allowed"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAuthenticated) {
                          toast({ title: "Create a free account to compare jobs." });
                          setLocation("/auth?returnTo=/jobs");
                          return;
                        }
                        if (canSelect || isSelected) toggleCompare(job.id);
                      }}
                      data-testid={`checkbox-compare-${job.id}`}
                      aria-label={isSelected ? "Remove from comparison" : "Add to comparison"}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground text-sm sm:text-base leading-snug" data-testid={`text-job-title-${job.id}`}>
                          {cleanStructuredText(job.title)}
                        </h3>
                        {postedAgo && (
                          <span className="text-xs text-muted-foreground shrink-0 mt-0.5" data-testid={`text-posted-${job.id}`}>
                            {postedAgo}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span data-testid={`text-job-company-${job.id}`}>{cleanStructuredText(job.company)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span data-testid={`text-job-location-${job.id}`}>{job.location ? cleanStructuredText(job.location) : "Not specified"}</span>
                        </span>
                        {locType && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-loc-type-${job.id}`}>
                            {locType === "remote" ? "Remote" : locType === "hybrid" ? "Hybrid" : "On-site"}
                          </Badge>
                        )}
                        {salaryDisplay && (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <DollarSign className="h-3 w-3 shrink-0" />
                            <span data-testid={`text-salary-${job.id}`}>{salaryDisplay}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {taxonomy && CategoryIcon && (
                          <Badge variant="secondary" className="text-[10px] gap-1" data-testid={`badge-category-${job.id}`}>
                            <CategoryIcon className="h-2.5 w-2.5" />
                            {taxonomy.shortName}
                          </Badge>
                        )}
                        {job.seniorityLevel && (
                          <Badge variant="outline" className="text-[10px]">
                            {job.seniorityLevel}
                          </Badge>
                        )}
                        {job.legalRelevanceScore && job.legalRelevanceScore >= 8 && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] gap-0.5 ${
                              job.legalRelevanceScore >= 9
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
                            }`}
                            data-testid={`badge-legal-fit-${job.id}`}
                          >
                            <Scale className="h-2.5 w-2.5" />
                            {job.legalRelevanceScore >= 9 ? "JD Preferred" : "Legal Background Valued"}
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
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {cleanStructuredText(job.aiSummary)}
                        </p>
                      )}
                      {job.keySkills && job.keySkills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {job.keySkills.slice(0, 4).map((skill, si) => (
                            <Badge key={si} variant="outline" className="text-[10px]" data-testid={`badge-skill-${job.id}-${si}`}>
                              {cleanStructuredText(skill)}
                            </Badge>
                          ))}
                          {job.keySkills.length > 4 && (
                            <span className="text-[10px] text-muted-foreground self-center">+{job.keySkills.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!searchResults && totalPages > 1 && filteredJobs.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-6 mb-2" data-testid="pagination-controls">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              data-testid="button-prev-page"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-3" data-testid="text-page-info">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              data-testid="button-next-page"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

      </main>

      <AnimatePresence>
        {isAuthenticated && compareIds.size > 0 && !showCompare && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
            data-testid="compare-floating-bar"
          >
            <Card className="shadow-lg border-primary/20">
              <CardContent className="p-3 flex items-center gap-3">
                <Badge variant="default" className="shrink-0">{compareIds.size}</Badge>
                <span className="text-sm text-foreground whitespace-nowrap">
                  {compareIds.size === 1 ? "job selected" : "jobs selected"}
                </span>
                <Button
                  size="sm"
                  disabled={compareIds.size < 2}
                  onClick={() => setShowCompare(true)}
                  className="gap-1.5 shrink-0"
                  data-testid="button-open-compare"
                >
                  <Scale className="h-3.5 w-3.5" />
                  Compare
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCompareIds(new Set())}
                  data-testid="button-clear-compare"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            data-testid="compare-overlay"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="fixed inset-x-0 bottom-0 top-16 sm:inset-4 sm:top-auto sm:max-h-[80vh] bg-background border rounded-t-xl sm:rounded-xl shadow-2xl overflow-auto"
            >
              <div className="p-4 sm:p-6">
                <BrowseCompareView
                  jobs={allJobs.filter(j => compareIds.has(j.id))}
                  onClose={() => setShowCompare(false)}
                  onClear={() => { setCompareIds(new Set()); setShowCompare(false); }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}


interface ComparisonAIResult {
  jobs: Array<{
    jobTitle: string;
    overallFitSummary?: string;
    pros?: string[];
    cons?: string[];
    transferableSkills?: string[];
    skillsToDevelop?: string[];
    legalTechGrowthPotential?: {
      shortTerm: string;
      mediumTerm: string;
      longTerm: string;
      aiOpportunities: string;
    };
    mainResponsibilities: string[];
    requiredSkills: string[];
    workType: { structured: number; ambiguous: number; description: string };
    transitionDifficulty: { level: string; explanation: string };
    whoSucceeds: string[];
    fitAnalysis?: {
      overallFit: number;
      strengths: string[];
      gaps: string[];
      resumePositioning: string[];
      interviewRisks: string[];
    };
  }>;
  recommendation: {
    bestFitNow: { jobTitle: string; reason: string };
    bestLongTerm: { jobTitle: string; reason: string };
    biggestShift: { jobTitle: string; reason: string };
  };
  overallStrategy: string;
}

function BrowseCompareView({ jobs, onClose, onClear }: { jobs: Job[]; onClose: () => void; onClear: () => void }) {
  const { isPro } = useSubscription();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [aiResult, setAiResult] = useState<ComparisonAIResult | null>(null);

  const { data: resumes } = useQuery<any[]>({
    queryKey: ["/api/resumes"],
    enabled: isAuthenticated,
  });

  const primaryResume = resumes?.find((r: any) => r.isPrimary) || resumes?.[0];
  const resumeSkills: string[] = useMemo(() => {
    if (!primaryResume?.extractedData) return [];
    const ed = primaryResume.extractedData as any;
    return (ed.skills || []).map((s: string) => s.toLowerCase().trim());
  }, [primaryResume]);

  const aiAnalysisMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        jobs: jobs.map((j) => ({
          title: j.title,
          description: j.description || j.aiSummary || j.title,
        })),
        includeResume: true,
      };
      const res = await apiRequest("POST", "/api/career-advisor/compare", payload);
      return res.json() as Promise<ComparisonAIResult>;
    },
    onSuccess: (data) => {
      setAiResult(data);
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const formatSalary = (min?: number | null, max?: number | null): string | null => {
    if (!min && !max) return null;
    const fmt = (n: number) => {
      const k = n / 1000;
      return k % 1 === 0 ? `$${k.toFixed(0)}K` : `$${k.toFixed(1)}K`;
    };
    if (min && max) return `${fmt(min)} \u2013 ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    return `Up to ${fmt(max!)}`;
  };

  const getLocationLabel = (job: Job): string => {
    if (job.locationType === 'remote' || (!job.locationType && job.isRemote)) return 'Remote';
    if (job.locationType === 'hybrid') return 'Hybrid';
    if (job.locationType === 'onsite') return 'On-site';
    return '';
  };

  const getLegalFitLabel = (score: number | null | undefined): string | null => {
    if (!score || score < 8) return null;
    if (score >= 9) return "JD Preferred";
    return "Legal Background Valued";
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "Easy": return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case "Moderate": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
      case "Challenging": return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400";
      case "Difficult": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const differentiators = useMemo(() => {
    const diffs: string[] = [];
    const salaries = jobs.map(j => {
      const mid = j.salaryMin && j.salaryMax ? (j.salaryMin + j.salaryMax) / 2 : j.salaryMin || j.salaryMax;
      return mid;
    }).filter(Boolean) as number[];
    if (salaries.length >= 2) {
      const gap = Math.max(...salaries) - Math.min(...salaries);
      if (gap > 0) {
        const fmt = (n: number) => `$${Math.round(n / 1000)}K`;
        diffs.push(`Salary gap: ${fmt(gap)}`);
      }
    }
    const locationTypes = new Set(jobs.map(j => getLocationLabel(j)).filter(Boolean));
    if (locationTypes.size > 1) {
      diffs.push(`Work style: ${Array.from(locationTypes).join(" vs ")}`);
    }
    const levels = new Set(jobs.map(j => j.seniorityLevel).filter(Boolean));
    if (levels.size > 1) {
      diffs.push(`Seniority: ${Array.from(levels).join(" vs ")}`);
    }
    const categories = new Set(jobs.map(j => j.roleCategory).filter(Boolean));
    if (categories.size > 1) {
      diffs.push(`Different focus areas`);
    }
    const companies = jobs.map(j => j.company);
    if (new Set(companies).size === jobs.length) {
      diffs.push(`${jobs.length} different companies`);
    }
    return diffs;
  }, [jobs]);

  const skillsAnalysis = useMemo(() => {
    const allSkillSets = jobs.map(j => (j.keySkills || []).map(s => s.toLowerCase().trim()));
    if (allSkillSets.every(s => s.length === 0)) return null;

    const shared: string[] = [];
    const uniquePerJob: string[][] = jobs.map(() => []);

    if (allSkillSets.length >= 2) {
      const firstSet = new Set(allSkillSets[0]);
      firstSet.forEach(skill => {
        if (allSkillSets.every(set => set.includes(skill))) {
          shared.push(skill);
        }
      });
      allSkillSets.forEach((skillSet, idx) => {
        skillSet.forEach(skill => {
          if (!shared.includes(skill)) {
            const isUnique = allSkillSets.every((otherSet, otherIdx) =>
              otherIdx === idx || !otherSet.includes(skill)
            );
            if (isUnique && !uniquePerJob[idx].includes(skill)) {
              uniquePerJob[idx].push(skill);
            }
          }
        });
      });
    }

    return { shared, uniquePerJob };
  }, [jobs]);

  const resumeMatchScores = useMemo(() => {
    if (resumeSkills.length === 0) return null;
    return jobs.map(job => {
      const jobSkills = (job.keySkills || []).map(s => s.toLowerCase().trim());
      if (jobSkills.length === 0) return null;
      const matched = jobSkills.filter(js => {
        if (js.length < 3) return resumeSkills.some(rs => rs === js);
        return resumeSkills.some(rs => {
          if (rs.length < 3) return rs === js;
          const words1 = js.split(/\s+/);
          const words2 = rs.split(/\s+/);
          return js === rs
            || words1.some(w => w.length >= 3 && words2.includes(w))
            || words2.some(w => w.length >= 3 && words1.includes(w));
        });
      });
      return Math.round((matched.length / jobSkills.length) * 100);
    });
  }, [jobs, resumeSkills]);

  const rows: { label: string; render: (job: Job) => React.ReactNode }[] = [
    {
      label: "Company",
      render: (job) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 rounded-md">
            <AvatarImage src={job.companyLogo || undefined} alt={job.company} />
            <AvatarFallback className="rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
              {job.company.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground">{job.company}</span>
        </div>
      ),
    },
    {
      label: "Location",
      render: (job) => (
        <div className="space-y-1">
          <span className="text-sm text-foreground/80">{job.location || "Not specified"}</span>
          {getLocationLabel(job) && (
            <Badge variant="secondary" className={`text-[10px] block w-fit ${
              getLocationLabel(job) === 'Remote'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : getLocationLabel(job) === 'Hybrid'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
            }`}>
              {getLocationLabel(job)}
            </Badge>
          )}
        </div>
      ),
    },
    {
      label: "Salary",
      render: (job) => {
        const salary = formatSalary(job.salaryMin, job.salaryMax);
        return salary
          ? <span className="text-sm font-medium text-green-600 dark:text-green-400">{salary}</span>
          : <span className="text-sm text-muted-foreground">Not listed</span>;
      },
    },
    {
      label: "Level",
      render: (job) => (
        <span className="text-sm text-foreground/80">{job.seniorityLevel || "Not specified"}</span>
      ),
    },
    {
      label: "Legal Fit",
      render: (job) => {
        const label = getLegalFitLabel(job.legalRelevanceScore);
        if (!label) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <Badge variant="secondary" className={`text-[10px] gap-0.5 ${
            job.legalRelevanceScore! >= 9
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
              : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
          }`}>
            <Scale className="h-2.5 w-2.5" />
            {label}
          </Badge>
        );
      },
    },
    {
      label: "Key Skills",
      render: (job) => (
        <div className="flex flex-wrap gap-1">
          {job.keySkills && job.keySkills.length > 0
            ? job.keySkills.slice(0, 5).map((skill, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{cleanStructuredText(skill)}</Badge>
              ))
            : <span className="text-sm text-muted-foreground">-</span>
          }
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4" data-testid="section-browse-compare">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-serif font-medium text-foreground" data-testid="heading-browse-compare">
          Compare {jobs.length} Jobs
        </h2>
        <div className="flex items-center gap-2">
          {isPro && !aiResult && (
            <Button
              size="sm"
              onClick={() => aiAnalysisMutation.mutate()}
              disabled={aiAnalysisMutation.isPending}
              className="gap-1.5"
              data-testid="button-ai-compare"
            >
              {aiAnalysisMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Brain className="h-3.5 w-3.5" />
              )}
              {aiAnalysisMutation.isPending ? "Analyzing..." : "Deep Analysis"}
            </Button>
          )}
          {!isPro && isAuthenticated && (
            <Link href="/pricing">
              <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer" data-testid="badge-deep-analysis-pro">
                <Crown className="h-3 w-3" />
                Unlock Deep Analysis — $5/mo
              </Badge>
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={onClear} className="gap-1.5 text-muted-foreground" data-testid="button-clear-all-compare">
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5" data-testid="button-close-browse-compare">
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>
      </div>

      {differentiators.length > 0 && (
        <Card data-testid="section-differentiators">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Differences</span>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {differentiators.map((diff, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{diff}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24 sm:w-32 align-top" />
                  {jobs.map((job) => (
                    <th key={job.id} className="p-3 align-top min-w-[180px]">
                      <Link href={`/jobs/${job.id}`} className="hover:text-primary transition-colors">
                        <span className="text-sm font-semibold text-foreground leading-snug line-clamp-2" data-testid={`browse-compare-title-${job.id}`}>
                          {job.title}
                        </span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={row.label} className={ri < rows.length - 1 ? "border-b border-border/50" : ""}>
                    <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap">
                      {row.label}
                    </td>
                    {jobs.map((job) => (
                      <td key={job.id} className="p-3 align-top">
                        {row.render(job)}
                      </td>
                    ))}
                  </tr>
                ))}

                {skillsAnalysis && skillsAnalysis.shared.length > 0 && (
                  <tr className="border-t border-border/50">
                    <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap">
                      Shared Skills
                    </td>
                    <td colSpan={jobs.length} className="p-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {skillsAnalysis.shared.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20 capitalize">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}

                {skillsAnalysis && skillsAnalysis.uniquePerJob.some(u => u.length > 0) && (
                  <tr className="border-t border-border/50">
                    <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap">
                      Unique Skills
                    </td>
                    {jobs.map((job, idx) => (
                      <td key={job.id} className="p-3 align-top">
                        <div className="flex flex-wrap gap-1">
                          {skillsAnalysis.uniquePerJob[idx].length > 0
                            ? skillsAnalysis.uniquePerJob[idx].map((skill, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] capitalize">{skill}</Badge>
                              ))
                            : <span className="text-xs text-muted-foreground">None unique</span>
                          }
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {resumeMatchScores && (
                  <tr className="border-t border-border">
                    <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap">
                      Resume Match
                    </td>
                    {jobs.map((job, idx) => {
                      const score = resumeMatchScores[idx];
                      return (
                        <td key={job.id} className="p-3 align-top">
                          {score !== null ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <Progress value={score} className="h-1.5 flex-1" />
                                <span className="text-xs font-medium text-foreground">{score}%</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {score >= 70 ? "Strong skill match" : score >= 40 ? "Partial match" : "Skills gap"}
                              </span>
                              {!isPro && (
                                <Link href="/pricing">
                                  <span className="text-[10px] text-primary flex items-center gap-1 mt-0.5 cursor-pointer" data-testid={`link-resume-deep-${job.id}`}>
                                    <Lock className="h-2.5 w-2.5" />
                                    Full gap analysis with Pro
                                  </span>
                                </Link>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No skills data</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}

                {!resumeMatchScores && isAuthenticated && (
                  <tr className="border-t border-border">
                    <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap">
                      Resume Match
                    </td>
                    <td colSpan={jobs.length} className="p-3 align-top">
                      <Link href="/resumes">
                        <span className="text-xs text-primary flex items-center gap-1.5 cursor-pointer" data-testid="link-upload-resume-compare">
                          <Upload className="h-3 w-3" />
                          Upload a resume to see skill match scores
                        </span>
                      </Link>
                    </td>
                  </tr>
                )}

                <tr className="border-t border-border">
                  <td className="p-3" />
                  {jobs.map((job) => (
                    <td key={job.id} className="p-3">
                      <Button asChild size="sm" className="gap-1.5 w-full" data-testid={`browse-compare-apply-${job.id}`}>
                        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                          Apply
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {aiAnalysisMutation.isPending && (
        <Card>
          <CardContent className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Running deep career analysis...</p>
            <p className="text-xs text-muted-foreground/60">This may take 15-30 seconds</p>
          </CardContent>
        </Card>
      )}

      {aiResult && (
        <div className="space-y-4" data-testid="section-ai-analysis">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="text-base font-serif font-medium text-foreground flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Career Analysis
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setAiResult(null)} className="text-muted-foreground text-xs" data-testid="button-dismiss-ai">
              Dismiss
            </Button>
          </div>

          {aiResult.overallStrategy && (
            <Card>
              <CardContent className="py-4 px-5">
                <p className="text-sm text-foreground/90 leading-relaxed">{aiResult.overallStrategy}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Best Fit Now", data: aiResult.recommendation.bestFitNow, icon: Target },
              { label: "Best Long-Term", data: aiResult.recommendation.bestLongTerm, icon: TrendingUp },
              { label: "Biggest Shift", data: aiResult.recommendation.biggestShift, icon: Scale },
            ].map(({ label, data, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="py-3 px-4 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{data.jobTitle}</p>
                  <p className="text-xs text-foreground/70 leading-relaxed">{data.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24 sm:w-32 align-top" />
                      {aiResult.jobs.map((aj, i) => (
                        <th key={i} className="p-3 align-top min-w-[200px]">
                          <span className="text-sm font-semibold text-foreground">{aj.jobTitle}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aiResult.jobs[0]?.overallFitSummary && (
                      <tr className="border-b border-border/50">
                        <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap">Summary</td>
                        {aiResult.jobs.map((aj, i) => (
                          <td key={i} className="p-3 align-top">
                            <p className="text-xs text-foreground/80 leading-relaxed">{aj.overallFitSummary}</p>
                          </td>
                        ))}
                      </tr>
                    )}
                    <tr className="border-b border-border/50">
                      <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap">Difficulty</td>
                      {aiResult.jobs.map((aj, i) => (
                        <td key={i} className="p-3 align-top space-y-1">
                          <Badge variant="secondary" className={`text-[10px] ${getDifficultyColor(aj.transitionDifficulty.level)}`}>
                            {aj.transitionDifficulty.level}
                          </Badge>
                          <p className="text-xs text-foreground/70">{aj.transitionDifficulty.explanation}</p>
                        </td>
                      ))}
                    </tr>
                    {aiResult.jobs[0]?.pros && (
                      <tr className="border-b border-border/50">
                        <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap">Pros</td>
                        {aiResult.jobs.map((aj, i) => (
                          <td key={i} className="p-3 align-top">
                            <ul className="space-y-0.5">
                              {aj.pros?.map((p, pi) => (
                                <li key={pi} className="text-xs text-foreground/80 flex gap-1.5">
                                  <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </td>
                        ))}
                      </tr>
                    )}
                    {aiResult.jobs[0]?.cons && (
                      <tr className="border-b border-border/50">
                        <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap">Cons</td>
                        {aiResult.jobs.map((aj, i) => (
                          <td key={i} className="p-3 align-top">
                            <ul className="space-y-0.5">
                              {aj.cons?.map((c, ci) => (
                                <li key={ci} className="text-xs text-foreground/80 flex gap-1.5">
                                  <X className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </td>
                        ))}
                      </tr>
                    )}
                    {aiResult.jobs[0]?.transferableSkills && (
                      <tr className="border-b border-border/50">
                        <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top">Transferable Skills</td>
                        {aiResult.jobs.map((aj, i) => (
                          <td key={i} className="p-3 align-top">
                            <div className="flex flex-wrap gap-1">
                              {aj.transferableSkills?.map((s, si) => (
                                <Badge key={si} variant="outline" className="text-[10px]">{s}</Badge>
                              ))}
                            </div>
                          </td>
                        ))}
                      </tr>
                    )}
                    {aiResult.jobs[0]?.fitAnalysis && (
                      <tr className="border-b border-border/50">
                        <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap">Resume Fit</td>
                        {aiResult.jobs.map((aj, i) => (
                          <td key={i} className="p-3 align-top space-y-2">
                            {aj.fitAnalysis && (
                              <>
                                <div className="flex items-center gap-2">
                                  <Progress value={aj.fitAnalysis.overallFit} className="h-1.5 flex-1" />
                                  <span className="text-xs font-medium">{aj.fitAnalysis.overallFit}%</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Strengths</span>
                                  <ul className="mt-0.5 space-y-0.5">
                                    {aj.fitAnalysis.strengths.map((s, si) => (
                                      <li key={si} className="text-xs text-foreground/80">{s}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Gaps</span>
                                  <ul className="mt-0.5 space-y-0.5">
                                    {aj.fitAnalysis.gaps.map((g, gi) => (
                                      <li key={gi} className="text-xs text-foreground/80">{g}</li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            )}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
