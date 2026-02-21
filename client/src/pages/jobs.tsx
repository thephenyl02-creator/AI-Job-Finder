import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLocation, useSearch } from "wouter";
import { Header } from "@/components/header";
import { Container } from "@/components/container";
import { useAuth } from "@/hooks/use-auth";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { apiRequest } from "@/lib/queryClient";
import type { Job, JobWithScore } from "@shared/schema";
import { JOB_TAXONOMY } from "@shared/schema";
import { cleanStructuredText } from "@/lib/structured-description";
import { getCountryDisplayName } from "@/lib/country-names";
import { JobLocation } from "@/components/job-location";
import { JourneyStepper } from "@/components/journey-stepper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Building2,
  X,
  Target,
  Loader2,
  Globe,
  Check,
  ExternalLink,
  ArrowUpDown,
  Upload,
  FileText,
  Sparkles,
  Lock,
  Compass,
  TrendingUp,
  Settings2,
  Zap,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { queryClient } from "@/lib/queryClient";
import { Footer } from "@/components/footer";
import { ResumePickerDialog } from "@/components/resume-picker-dialog";

interface ResumeMatchResult {
  jobId: number;
  title: string;
  company: string;
  location: string | null;
  isRemote: boolean | null;
  locationType: string | null;
  matchScore: number;
  tweakPercentage: number;
  brutalVerdict: string;
  matchHighlights: string[];
  gapSummary: string;
  topMissingSkills: string[];
}

interface CareerPath {
  path: string;
  why: string;
  fit: "high" | "medium" | "low";
  jobCount: number;
}

interface CareerIntelligenceResult {
  recommendedPaths: CareerPath[];
  strengths: { label: string; evidence: string }[];
  gaps: { label: string; suggestion: string }[];
  transitionSteps: string[];
  suggestedSteppingStoneRoles: string[];
  learningPlan: string[];
  confidenceNotes: string[];
}

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
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const levelParam = urlParams.get("level");
  const categoryParam = urlParams.get("category");
  const countryParam = urlParams.get("country");
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || "all");
  const [selectedLevel, setSelectedLevel] = useState<string>(levelParam && ["student", "entry", "mid", "senior"].includes(levelParam) ? levelParam : "all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>(countryParam || "all");
  const [filterText, setFilterText] = useState("");
  const [debouncedFilterText, setDebouncedFilterText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const JOBS_PER_PAGE = 20;
  const [searchResults, setSearchResults] = useState<JobWithScore[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedIntelligencePath, setSelectedIntelligencePath] = useState<string | null>(null);

  const [smartQuery, setSmartQuery] = useState("");
  const [guidedStep, setGuidedStep] = useState<GuidedStep>("idle");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [refinedSummary, setRefinedSummary] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [resumeMatches, setResumeMatches] = useState<ResumeMatchResult[] | null>(null);
  const [resumeMatchStep, setResumeMatchStep] = useState<"idle" | "uploading" | "matching">("idle");
  const [pickerJobId, setPickerJobId] = useState<number | null>(null);
  const [pickerJobTitle, setPickerJobTitle] = useState<string>("");
  const [profileSummary, setProfileSummary] = useState<string | null>(null);
  const [proNudgeDismissed, setProNudgeDismissed] = useState(() => {
    try { return localStorage.getItem("ltc_pro_nudge_dismissed") === "1"; } catch { return false; }
  });
  const [welcomeSkipped, setWelcomeSkipped] = useState(() => {
    try { return localStorage.getItem("ltc_welcome_skipped") === "1"; } catch { return false; }
  });
  const welcomeFileRef = useRef<HTMLInputElement>(null);
  const [welcomeUploading, setWelcomeUploading] = useState(false);
  const [intelligenceResult, setIntelligenceResult] = useState<CareerIntelligenceResult | null>(null);
  const [intelligenceResumeChanged, setIntelligenceResumeChanged] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);

  const { data: userResumes = [] } = useQuery<any[]>({
    queryKey: ["/api/resumes"],
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  });

  const { data: usageLimits } = useQuery<{
    isPro: boolean;
    guidedSearch: { used: number; limit: number | null };
  }>({
    queryKey: ["/api/usage/limits"],
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });

  const hasResume = userResumes.length > 0;

  const { data: cachedIntelligence } = useQuery<{
    cached: boolean;
    resumeChanged?: boolean;
    generatedAt?: string;
    data: CareerIntelligenceResult | null;
  }>({
    queryKey: ["/api/career-intelligence"],
    enabled: isAuthenticated && hasResume && !intelligenceResult,
  });

  useEffect(() => {
    if (cachedIntelligence?.cached && cachedIntelligence.data && !intelligenceResult) {
      setIntelligenceResult(cachedIntelligence.data);
      if (cachedIntelligence.resumeChanged) {
        setIntelligenceResumeChanged(true);
      }
    }
  }, [cachedIntelligence, intelligenceResult]);

  const guidedSearchUsed = usageLimits?.guidedSearch?.used ?? 0;
  const guidedSearchLimit = usageLimits?.guidedSearch?.limit ?? 7;
  const isPro = usageLimits?.isPro ?? false;
  const guidedTrialsRemaining = isPro ? Infinity : Math.max(0, guidedSearchLimit - guidedSearchUsed);
  const canUseGuidedSearch = isPro || guidedTrialsRemaining > 0;

  const advisorMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/career-path-advisor", {});
      return res.json() as Promise<CareerIntelligenceResult>;
    },
    onSuccess: (data) => {
      if (!data?.recommendedPaths) {
        toast({ title: "Unexpected response", description: "Please try again.", variant: "destructive" });
        return;
      }
      setIntelligenceResult(data);
      setIntelligenceResumeChanged(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to generate career intelligence", variant: "destructive" });
    },
  });

  const handlePathClick = useCallback((path: CareerPath, index: number) => {
    if (index > 0 && !isPro) return;
    if (selectedIntelligencePath === path.path) {
      setSelectedIntelligencePath(null);
      setSelectedCategory("all");
    } else {
      setSelectedIntelligencePath(path.path);
      setSelectedCategory(path.path);
    }
    setCurrentPage(1);
    setGearOpen(false);
  }, [isPro, selectedIntelligencePath]);

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
          title: "You've used all 7 free smart searches",
          description: "Upgrade to Pro for unlimited searches with follow-up questions.",
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

  const semanticSearchMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch("/api/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Search failed" }));
        throw new Error(err.error || "Search failed");
      }
      return response.json() as Promise<{ profileSummary: string; matches: JobWithScore[] }>;
    },
    onSuccess: (data) => {
      setProfileSummary(data.profileSummary);
      setSearchResults(data.matches);
      setSearchQuery("Profile match");
      setSmartQuery("");
      setGuidedStep("idle");
      track({ eventType: "search", metadata: { type: "semantic", resultCount: data.matches.length } });
    },
    onError: (error: any) => {
      toast({ title: "Couldn't analyze your text", description: error.message || "Please try again.", variant: "destructive" });
      setGuidedStep("idle");
    },
  });

  const handleResumeUpload = useCallback(async (file: File) => {
    try {
      setResumeMatchStep("uploading");
      setResumeMatches(null);
      setSearchResults(null);
      setSearchQuery(null);

      const formData = new FormData();
      formData.append("resume", file);

      if (isAuthenticated) {
        formData.append("label", file.name.replace(/\.[^/.]+$/, ""));

        const uploadRes = await fetch("/api/resumes/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({ error: "Upload failed" }));
          if (err.limitReached) {
            throw new Error("You already have a resume saved. Delete it from your profile first, or upgrade to Pro for up to 5.");
          }
          throw new Error(err.error || "Upload failed");
        }

        const uploadData = await uploadRes.json();
        const resumeId = uploadData.resume?.id;
        if (!resumeId) {
          throw new Error("Resume uploaded but couldn't start matching. Please try again.");
        }

        setResumeMatchStep("matching");

        const matchRes = await apiRequest("POST", `/api/resumes/${resumeId}/match-jobs`);
        const matchData = await matchRes.json();

        setResumeMatches(matchData.matches || []);
        setResumeMatchStep("idle");
        track({ eventType: "resume_match", metadata: { resumeId, matchCount: matchData.matches?.length || 0 } });

        toast({
          title: `Found ${matchData.matches?.length || 0} matching roles`,
          description: matchData.matches?.length > 0 ? "Sorted by how well they fit your background." : "Try broadening your experience or upload a different resume.",
        });
      } else {
        const matchRes = await fetch("/api/resume/anonymous-match", {
          method: "POST",
          body: formData,
        });

        if (!matchRes.ok) {
          const err = await matchRes.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error || "Upload failed");
        }

        setResumeMatchStep("matching");
        const matchData = await matchRes.json();

        setResumeMatches(matchData.matches || []);
        setResumeMatchStep("idle");

        toast({
          title: `Found ${matchData.matches?.length || 0} matching roles`,
          description: matchData.matches?.length > 0
            ? "Sign in to save these results and apply."
            : "Try uploading a different resume.",
        });
      }
    } catch (error: any) {
      setResumeMatchStep("idle");
      toast({
        title: "Couldn't match your resume",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, track, toast]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleResumeUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [handleResumeUpload]);

  const handleWelcomeUpload = useCallback(async (file: File) => {
    try {
      setWelcomeUploading(true);
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
      if (!resumeId) throw new Error("Upload succeeded but couldn't start matching.");

      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });

      const matchRes = await apiRequest("POST", `/api/resumes/${resumeId}/match-jobs`);
      const matchData = await matchRes.json();
      const matches = matchData.matches || [];

      setResumeMatches(matches);
      setWelcomeUploading(false);

      track({ eventType: "resume_match", metadata: { resumeId, matchCount: matches.length, source: "welcome_card" } });

      if (matches.length > 0) {
        const top = matches[0];
        toast({
          title: `${matches.length} roles match your background`,
          description: `Top match: ${top.title} at ${top.company} (${top.matchScore}% fit)`,
        });
      } else {
        toast({
          title: "Resume uploaded successfully",
          description: "We couldn't find strong matches right now, but we'll notify you when new roles appear.",
        });
      }
    } catch (error: any) {
      setWelcomeUploading(false);
      toast({
        title: "Couldn't process your resume",
        description: error.message || "Please try again with a different file.",
        variant: "destructive",
      });
    }
  }, [track, toast]);

  const handleClearResumeMatches = useCallback(() => {
    setResumeMatches(null);
    setResumeMatchStep("idle");
  }, []);

  const resumeMatchMap = useMemo(() => {
    if (!resumeMatches) return null;
    const map = new Map<number, ResumeMatchResult>();
    resumeMatches.forEach(m => map.set(m.jobId, m));
    return map;
  }, [resumeMatches]);

  const handleSmartSearch = useCallback(() => {
    if (!smartQuery.trim()) return;
    const wordCount = smartQuery.trim().split(/\s+/).length;
    if (wordCount >= 40) {
      setProfileSummary(null);
      setSearchResults(null);
      setGuidedStep("refining");
      semanticSearchMutation.mutate(smartQuery.trim());
      return;
    }
    if (!isAuthenticated) {
      setFilterText(smartQuery.trim());
      setSmartQuery("");
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
  }, [smartQuery, canUseGuidedSearch, isAuthenticated]);

  const handleQuickSearch = useCallback(() => {
    if (!smartQuery.trim()) return;
    if (!isAuthenticated) {
      setFilterText(smartQuery.trim());
      setSmartQuery("");
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
    setProfileSummary(null);
  }, []);

  const allQuestionsAnswered = analysis?.questions?.every(q => answers[q.id]);
  const isSearching = searchMutation.isPending || analyzeMutation.isPending || refinedSearchMutation.isPending || semanticSearchMutation.isPending;

  useEffect(() => { track({ eventType: "page_view", pagePath: "/jobs" }); }, []);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilterText(filterText), 300);
    return () => clearTimeout(timer);
  }, [filterText]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedLevel, selectedLocation, selectedRegion, selectedCountry, debouncedFilterText]);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const level = params.get("level");
    if (level && ["entry", "mid", "senior"].includes(level)) {
      setSelectedLevel(level);
    }
    const country = params.get("country");
    if (country) {
      setSelectedCountry(country);
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
    if (selectedRegion !== "all") params.set("region", selectedRegion);
    if (selectedCountry !== "all") params.set("country", selectedCountry);
    if (debouncedFilterText) params.set("search", debouncedFilterText);
    if (sortBy !== "newest") params.set("sort", sortBy);
    return params.toString();
  }, [currentPage, selectedCategory, selectedLevel, selectedLocation, selectedRegion, selectedCountry, debouncedFilterText, sortBy]);

  const { data: jobsResponse, isLoading: jobsLoading } = useQuery<{ jobs: Job[]; total: number; page: number; totalPages: number }>({
    queryKey: ["/api/jobs", jobsQueryParams],
    queryFn: () => fetch(`/api/jobs?${jobsQueryParams}`).then(r => r.json()),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });
  const allJobs = jobsResponse?.jobs ?? [];
  const totalJobCount = jobsResponse?.total ?? 0;
  const totalPages = jobsResponse?.totalPages ?? 1;

  const { data: statsData } = useQuery<{ totalJobs: number; categoryCounts: Record<string, number> }>({
    queryKey: ["/api/stats"],
    staleTime: 60000,
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  const filteredJobs = searchResults || allJobs;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      <main className="py-6 overflow-hidden">
        <Container className="space-y-4">

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          className="hidden"
          data-testid="input-resume-file"
        />

        {searchResults ? (
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              data-testid="button-back-search"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              All Jobs
            </Button>
            <div className="space-y-0.5">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight" data-testid="text-page-title">
                Results for "{searchQuery}"
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">
                {searchResults.length} results
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center pt-2 pb-1" data-testid="section-search-hero">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-1" data-testid="text-page-title">
              Find your next role in legal tech
            </h1>
            <p className="text-sm text-muted-foreground mb-5" data-testid="text-page-subtitle">
              {totalJobCount} curated roles across legal technology
            </p>

            <div data-testid="card-smart-search" className="max-w-3xl mx-auto">
              <div
                className="rounded-xl border border-foreground/15 bg-muted/20 px-5 py-4 sm:px-6 sm:py-5 transition-colors focus-within:border-primary/40 focus-within:bg-muted/30 focus-within:shadow-sm cursor-text"
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('button, a, [role="button"]')) {
                    searchInputRef.current?.focus();
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  {isAuthenticated && (
                    <Popover open={gearOpen} onOpenChange={setGearOpen}>
                      <PopoverTrigger asChild>
                        <button
                          className={`relative shrink-0 rounded-md p-1.5 transition-colors hover:bg-muted/60 ${intelligenceResult ? "text-primary" : "text-muted-foreground/50"}`}
                          data-testid="button-career-gear"
                          title="Career intelligence"
                        >
                          <Settings2 className="h-5 w-5" />
                          {intelligenceResult && (
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[380px] sm:w-[440px] p-0"
                        align="start"
                        side="bottom"
                        sideOffset={8}
                      >
                        <CareerGearPopover
                          isAuthenticated={isAuthenticated}
                          hasResume={hasResume}
                          isPro={isPro}
                          result={intelligenceResult}
                          resumeChanged={intelligenceResumeChanged}
                          isGenerating={advisorMutation.isPending}
                          onGenerate={() => advisorMutation.mutate()}
                          onSelectPath={handlePathClick}
                          selectedPath={selectedIntelligencePath}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  <Search className="h-6 w-6 text-foreground/40 shrink-0" />
                  <Input
                    ref={searchInputRef}
                    placeholder={searchPlaceholder}
                    className="!border-0 shadow-none h-14 text-lg focus-visible:ring-0 !bg-transparent placeholder:text-muted-foreground/40 px-0 !ring-0 !ring-offset-0"
                    value={smartQuery}
                    onChange={(e) => setSmartQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSmartSearch();
                      }
                    }}
                    data-testid="input-smart-search"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground h-9 w-9"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={resumeMatchStep !== "idle"}
                      data-testid="button-upload-resume"
                      title="Upload resume to find matching roles"
                    >
                      {resumeMatchStep !== "idle" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      className="h-10 w-10"
                      onClick={handleSmartSearch}
                      disabled={!smartQuery.trim() || isSearching}
                      data-testid="button-smart-search"
                    >
                      {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    </Button>
                    <kbd
                      className={`hidden sm:inline-flex h-5 items-center rounded border border-foreground/10 bg-muted/50 px-1.5 text-[10px] text-muted-foreground/60 font-mono transition-opacity ${smartQuery ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                      data-testid="kbd-search-hint"
                    >/</kbd>
                  </div>
                </div>
              </div>

              {!smartQuery && guidedStep === "idle" && (
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  {isPersonalized && (
                    <span className="text-[10px] text-muted-foreground/60 mr-0.5" data-testid="text-personalized-label">Try:</span>
                  )}
                  {searchSuggestions.map((s) => (
                    <Badge
                      key={s.label}
                      variant="outline"
                      className="cursor-pointer text-xs font-normal"
                      onClick={() => setSmartQuery(s.query)}
                      data-testid={`chip-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {cleanStructuredText(s.label)}
                    </Badge>
                  ))}
                </div>
              )}
              {smartQuery.trim() && guidedStep === "idle" && !isSearching && (
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleQuickSearch}
                    className="text-xs text-muted-foreground"
                    data-testid="button-quick-search"
                  >
                    Search without follow-up questions
                  </Button>
                  {!canUseGuidedSearch && (
                    <Link href="/pricing" className="text-xs text-primary font-medium" data-testid="link-guided-search-upgrade">
                      Upgrade for unlimited
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!searchResults && <JourneyStepper currentStep="jobs" />}

        {!searchResults && isAuthenticated && <WelcomeBackBanner />}

        {selectedIntelligencePath && (
          <div className="flex items-center gap-2 flex-wrap" data-testid="path-filter-banner">
            <Badge variant="secondary" className="text-xs gap-1">
              <Compass className="h-3 w-3" />
              Filtered: {selectedIntelligencePath}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => {
                setSelectedIntelligencePath(null);
                setSelectedCategory("all");
              }}
              data-testid="button-clear-path-filter"
            >
              Show all jobs
            </Button>
          </div>
        )}

        {selectedCountry !== "all" && (
          <div className="flex items-center gap-2 mt-2 flex-wrap" data-testid="country-filter-banner">
            <Badge variant="secondary" className="no-default-active-elevate text-xs gap-1">
              <MapPin className="h-3 w-3" />
              {getCountryDisplayName(selectedCountry)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => { setSelectedCountry("all"); setLocation("/jobs"); }}
              data-testid="button-clear-country"
            >
              Clear filter
            </Button>
          </div>
        )}

        {resumeMatchStep !== "idle" && (
          <Card className="border-primary/20" data-testid="card-resume-matching">
            <CardContent className="p-5 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {resumeMatchStep === "uploading" ? "Reading your resume..." : "Finding matching roles..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {resumeMatchStep === "uploading" ? "Extracting skills and experience" : "Comparing your background against open positions"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {resumeMatches && (
          <Card className="bg-muted/40 border-border/60" data-testid="card-resume-match-results">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {resumeMatches.length > 0
                        ? `${resumeMatches.length} roles match your resume`
                        : "No strong matches found"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resumeMatches.length > 0
                        ? "Sorted by fit. Match scores show how well each role aligns with your background."
                        : "Try uploading a different resume or browse all roles below."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!isAuthenticated && resumeMatches.length > 0 && (
                    <Link href="/auth">
                      <Button
                        size="sm"
                        className="gap-1 text-xs"
                        data-testid="button-signin-save-matches"
                      >
                        Sign in to save results
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1 text-xs"
                    data-testid="button-try-another-resume"
                  >
                    <Upload className="h-3 w-3" />
                    Try another
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearResumeMatches}
                    className="gap-1 text-xs"
                    data-testid="button-clear-resume-matches"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {guidedStep === "refining" && (
          <Card className="border-primary/20">
            <CardContent className="p-5 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {semanticSearchMutation.isPending ? "Analyzing your background..." : "Understanding your search..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {semanticSearchMutation.isPending ? "Extracting skills and experience to find the best matches" : "Preparing a few questions to find the best matches"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {guidedStep === "questions" && analysis && (
          <div className="space-y-3">
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
              <Card key={question.id}>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-sm font-medium text-foreground mb-2">
                    {idx + 1}. {question.question}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {question.options.map((option) => (
                      <Badge
                        key={option.value}
                        variant={answers[question.id] === option.value ? "default" : "outline"}
                        className={`cursor-pointer py-2 px-3 text-xs transition-all flex items-center ${
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
            ))}

            <div className="flex items-center gap-2 justify-between flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="gap-1"
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
                  className="text-muted-foreground gap-1"
                  data-testid="button-skip-questions"
                >
                  Skip
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitAnswers}
                  disabled={!allQuestionsAnswered}
                  className="gap-1"
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
                <Link href="/pricing" className="text-primary ml-1 font-medium">Upgrade for unlimited</Link>
              </p>
            )}
          </div>
        )}

        {guidedStep === "searching" && (
          <Card className="border-primary/20">
            <CardContent className="p-5 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Finding your best matches...</p>
                <p className="text-xs text-muted-foreground">Searching for roles that fit your criteria</p>
              </div>
            </CardContent>
          </Card>
        )}

        {refinedSummary && searchResults && (
          <Card className="bg-muted/40 border-border/60" data-testid="card-refined-summary">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground">{refinedSummary}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {profileSummary && searchResults && (
          <Card className="bg-muted/40 border-border/60" data-testid="card-profile-summary">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Target className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">What we understood</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{profileSummary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs" data-testid="badge-match-count">
                    {searchResults.length} {searchResults.length === 1 ? "match" : "matches"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSearch}
                    className="gap-1 text-xs"
                    data-testid="button-clear-profile-search"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2 mb-4" data-testid="filter-bar">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Search className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
              <Input
                placeholder="Filter by keyword..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="max-w-xs"
                data-testid="input-filter"
              />
            </div>
            <div className="hidden sm:flex items-center gap-1" data-testid="location-type-pills">
              {[
                { value: "all", label: "All" },
                { value: "remote", label: "Remote" },
                { value: "hybrid", label: "Hybrid" },
                { value: "onsite", label: "On-site" },
              ].map((loc) => (
                <Button
                  key={loc.value}
                  variant={selectedLocation === loc.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => { setSelectedLocation(loc.value); setCurrentPage(1); track({ eventType: "filter_change", metadata: { filterType: "location", value: loc.value } }); }}
                  data-testid={`button-location-${loc.value}`}
                >
                  {loc.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap scrollbar-none">
            <Select value={selectedCategory} onValueChange={(val) => { setSelectedCategory(val); setCurrentPage(1); track({ eventType: "filter_change", metadata: { filterType: "category", value: val } }); }}>
              <SelectTrigger className="w-auto min-w-[110px] sm:min-w-[130px] max-w-[200px] shrink-0" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-category-all">All Categories</SelectItem>
                {Object.entries(JOB_TAXONOMY)
                  .sort((a, b) => (statsData?.categoryCounts?.[b[0]] ?? 0) - (statsData?.categoryCounts?.[a[0]] ?? 0))
                  .filter(([cat]) => (statsData?.categoryCounts?.[cat] ?? 0) > 0)
                  .map(([category]) => (
                    <SelectItem key={category} value={category} data-testid={`select-category-${category.replace(/\s+/g, '-').toLowerCase()}`}>
                      {category}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={selectedLevel} onValueChange={(val) => { setSelectedLevel(val); setCurrentPage(1); track({ eventType: "filter_change", metadata: { filterType: "level", value: val } }); }}>
              <SelectTrigger className="w-auto min-w-[90px] sm:min-w-[100px] max-w-[140px] shrink-0" data-testid="select-level">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                {SENIORITY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value} data-testid={`select-level-${level.value}`}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="sm:hidden shrink-0">
              <Select value={selectedLocation} onValueChange={(val) => { setSelectedLocation(val); setCurrentPage(1); track({ eventType: "filter_change", metadata: { filterType: "location", value: val } }); }}>
                <SelectTrigger className="w-auto min-w-[90px]" data-testid="select-location-mobile">
                  <MapPin className="h-3 w-3 mr-1 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="select-location-mobile-all">All Locations</SelectItem>
                  <SelectItem value="remote" data-testid="select-location-mobile-remote">Remote</SelectItem>
                  <SelectItem value="hybrid" data-testid="select-location-mobile-hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite" data-testid="select-location-mobile-onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={selectedRegion} onValueChange={(val) => { setSelectedRegion(val); setCurrentPage(1); track({ eventType: "filter_change", metadata: { filterType: "region", value: val } }); }}>
              <SelectTrigger className="w-auto min-w-[90px] sm:min-w-[100px] max-w-[170px] shrink-0" data-testid="select-region">
                <Globe className="h-3 w-3 mr-1 shrink-0" />
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-region-all">All Regions</SelectItem>
                <SelectItem value="United States" data-testid="select-region-us">United States</SelectItem>
                <SelectItem value="Europe" data-testid="select-region-europe">Europe</SelectItem>
                <SelectItem value="Asia-Pacific" data-testid="select-region-apac">Asia-Pacific</SelectItem>
                <SelectItem value="Canada" data-testid="select-region-canada">Canada</SelectItem>
                <SelectItem value="Latin America" data-testid="select-region-latam">Latin America</SelectItem>
                <SelectItem value="Middle East" data-testid="select-region-me">Middle East</SelectItem>
                <SelectItem value="Africa" data-testid="select-region-africa">Africa</SelectItem>
                <SelectItem value="Global" data-testid="select-region-global">Global</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(val) => { setSortBy(val); setCurrentPage(1); }}>
              <SelectTrigger className="w-auto min-w-[100px] sm:min-w-[110px] max-w-[150px] shrink-0" data-testid="select-sort">
                <ArrowUpDown className="h-3 w-3 mr-1 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" data-testid="select-sort-newest">Newest First</SelectItem>
                <SelectItem value="salary" data-testid="select-sort-salary">Salary (High)</SelectItem>
                <SelectItem value="company" data-testid="select-sort-company">Company A-Z</SelectItem>
              </SelectContent>
            </Select>
            {(selectedCategory !== "all" || selectedLevel !== "all" || selectedLocation !== "all" || selectedRegion !== "all" || filterText) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedCategory("all"); setSelectedLevel("all"); setSelectedLocation("all"); setSelectedRegion("all"); setFilterText(""); }}
                className="text-xs text-muted-foreground gap-1 shrink-0"
                data-testid="button-clear-all-filters"
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {jobsLoading && !jobsResponse ? (
          <div className="grid gap-3" data-testid="skeleton-jobs">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-3 sm:p-4 rounded-lg border bg-card">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-md bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-4 w-3/5 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    <div className="flex gap-2">
                      <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                      <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-12">
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
                  {(filterText || selectedCategory !== "all" || selectedLevel !== "all" || selectedLocation !== "all" || selectedRegion !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setFilterText(""); setSelectedCategory("all"); setSelectedLevel("all"); setSelectedLocation("all"); setSelectedRegion("all"); }}
                      className="gap-1"
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
                      className="gap-1"
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
                          className="gap-1 text-xs"
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
          </div>
        ) : (
          <div className="grid gap-3">
            {isAuthenticated && userResumes.length === 0 && !welcomeSkipped && !resumeMatches && !searchResults && (
              <Card className="border-primary/20" data-testid="card-welcome-upload">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground mb-1">
                        Welcome! Find roles that match your background.
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Upload your resume and we'll instantly show you which open roles are the best fit for your experience.
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          ref={welcomeFileRef}
                          type="file"
                          accept=".pdf,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleWelcomeUpload(file);
                            if (welcomeFileRef.current) welcomeFileRef.current.value = "";
                          }}
                          data-testid="input-welcome-file"
                        />
                        <Button
                          size="sm"
                          onClick={() => welcomeFileRef.current?.click()}
                          disabled={welcomeUploading}
                          data-testid="button-welcome-upload"
                        >
                          {welcomeUploading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              {resumeMatchStep === "matching" ? "Finding matches..." : "Processing..."}
                            </>
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5 mr-1.5" />
                              Upload Resume
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setWelcomeSkipped(true);
                            try { localStorage.setItem("ltc_welcome_skipped", "1"); } catch {}
                          }}
                          data-testid="button-welcome-skip"
                        >
                          Skip for now
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        PDF or DOCX. Your resume is parsed securely and never shared.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {isAuthenticated && !isPro && userResumes.length > 0 && !proNudgeDismissed && !resumeMatches && !searchResults && (
              <div
                className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-primary/15 bg-primary/[0.02]"
                data-testid="banner-pro-nudge"
              >
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground flex-1">
                  <span className="font-medium text-foreground">Get more from your search.</span>{" "}
                  Pro members get unlimited resume matching, tailored recommendations, and market insights.
                </p>
                <Link href="/pricing" onClick={(e: any) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" className="shrink-0" data-testid="button-pro-nudge-upgrade">
                    View Plans
                  </Button>
                </Link>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => {
                    setProNudgeDismissed(true);
                    try { localStorage.setItem("ltc_pro_nudge_dismissed", "1"); } catch {}
                  }}
                  data-testid="button-pro-nudge-dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {resumeMatches && resumeMatches.length > 0 && (
              <div className="grid gap-3 mb-2" data-testid="section-resume-matches">
                {resumeMatches.map((match, idx) => {
                  const freeLimit = !isAuthenticated ? 3 : 5;
                  const isGated = !isPro && idx >= freeLimit;
                  const scoreColor = match.matchScore >= 75 ? "text-emerald-600 dark:text-emerald-400" :
                    match.matchScore >= 55 ? "text-amber-600 dark:text-amber-400" :
                    "text-muted-foreground";
                  const scoreBg = match.matchScore >= 75 ? "bg-emerald-500/10 border-emerald-500/20" :
                    match.matchScore >= 55 ? "bg-amber-500/10 border-amber-500/20" :
                    "bg-muted/50 border-border/60";

                  if (isGated) {
                    if (idx === freeLimit) {
                      return (
                        <div
                          key={`match-${match.jobId}`}
                          className="p-3 sm:p-4 rounded-lg border bg-card relative overflow-hidden"
                          data-testid={`card-match-gated-${match.jobId}`}
                        >
                          <div className="flex gap-3 opacity-[0.08] select-none pointer-events-none blur-[2px]" aria-hidden="true">
                            <div className="flex flex-col items-center justify-center rounded-md border px-2 py-1.5 shrink-0 bg-muted/50 border-border/60">
                              <span className="text-lg font-bold leading-none text-muted-foreground">--</span>
                              <span className="text-[9px] text-muted-foreground mt-0.5">match</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="h-4 w-40 bg-muted rounded mb-1.5" />
                              <div className="h-3 w-24 bg-muted rounded" />
                            </div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center" data-testid="overlay-pro-gate">
                            <div className="text-center px-4">
                              <Lock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm font-medium text-foreground mb-1">
                                {!isAuthenticated ? "Sign up to see more matches" : "Upgrade for full match analysis"}
                              </p>
                              <p className="text-xs text-muted-foreground mb-3">
                                {!isAuthenticated
                                  ? `${resumeMatches.length - freeLimit} more matches found`
                                  : `${resumeMatches.length - freeLimit} more matches with detailed scoring`}
                              </p>
                              <Link href={!isAuthenticated ? "/auth" : "/pricing"}>
                                <Button size="sm" data-testid="button-unlock-matches">
                                  {!isAuthenticated ? "Create Free Account" : "Upgrade to Pro"}
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }

                  return (
                    <div
                      key={`match-${match.jobId}`}
                      className="p-3 sm:p-4 rounded-lg border bg-card hover-elevate cursor-pointer"
                      data-testid={`card-match-${match.jobId}`}
                      onClick={() => setLocation(`/jobs/${match.jobId}`)}
                    >
                      <div className="flex gap-3">
                        <div className={`flex flex-col items-center justify-center rounded-md border px-2 py-1.5 shrink-0 ${scoreBg}`}>
                          <span className={`text-lg font-bold leading-none ${scoreColor}`} data-testid={`text-match-score-${match.jobId}`}>
                            {match.matchScore}
                          </span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">match</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-foreground text-sm sm:text-base leading-snug" data-testid={`text-match-title-${match.jobId}`}>
                            {cleanStructuredText(match.title)}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            {cleanStructuredText(match.company)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1" data-testid={`text-match-verdict-${match.jobId}`}>
                            {match.brutalVerdict}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {match.location && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                {match.location}
                              </span>
                            )}
                            {match.matchHighlights.length > 0 && (
                              <Badge variant="secondary" className="text-[10px]">
                                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                {match.matchHighlights[0]}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto py-0.5 px-1.5 text-[11px] text-muted-foreground"
                              data-testid={`link-improve-resume-${match.jobId}`}
                              onClick={(e: any) => {
                                e.stopPropagation();
                                setPickerJobId(match.jobId);
                                setPickerJobTitle(match.title);
                              }}
                            >
                              <FileText className="h-3 w-3 mr-0.5" />
                              Tailor resume
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {resumeMatches && resumeMatches.length > 0 && filteredJobs.length > 0 && (
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-xs text-muted-foreground shrink-0">All roles</span>
                <div className="h-px flex-1 bg-border/60" />
              </div>
            )}

            {filteredJobs.map((job, index) => {
              const postedAgo = job.postedDate ? (() => {
                const days = Math.floor((Date.now() - new Date(job.postedDate).getTime()) / 86400000);
                if (days === 0) return "Today";
                if (days === 1) return "1d ago";
                if (days < 7) return `${days}d ago`;
                if (days < 30) return `${Math.floor(days / 7)}w ago`;
                return `${Math.floor(days / 30)}mo ago`;
              })() : null;
              const taxonomy = job.roleCategory ? JOB_TAXONOMY[job.roleCategory as keyof typeof JOB_TAXONOMY] : null;
              const matchData = resumeMatchMap?.get(job.id);
              const showMatchNudge = index === 3 && !resumeMatches && !searchResults && currentPage === 1;
              return (
                <div key={job.id}>
                  {showMatchNudge && (
                    <div
                      className="p-3 sm:p-4 rounded-lg border border-primary/20 bg-primary/[0.03] mb-2 flex items-center gap-3"
                      data-testid="card-match-nudge"
                    >
                      <div className="shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground font-medium">
                          See which roles fit your background
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Upload your resume to get personalized match scores for every listing.
                        </p>
                      </div>
                      {isAuthenticated ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={(e) => { e.stopPropagation(); setLocation("/resumes"); }}
                          data-testid="button-match-nudge-upload"
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          Upload
                        </Button>
                      ) : (
                        <Link href="/auth?returnTo=/jobs" onClick={(e: any) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="shrink-0" data-testid="button-match-nudge-signup">
                            Get Started
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                  <div
                    className="p-3 sm:p-4 rounded-lg border bg-card hover-elevate cursor-pointer"
                    data-testid={`card-job-${job.id}`}
                    onClick={() => setLocation(`/jobs/${job.id}`)}
                  >
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 rounded-md shrink-0 mt-0.5">
                        <AvatarImage src={job.companyLogo || undefined} alt={job.company} />
                        <AvatarFallback className="rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
                          {job.company.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground text-sm sm:text-base leading-snug" data-testid={`text-job-title-${job.id}`}>
                            {cleanStructuredText(job.title)}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            {matchData && (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${matchData.matchScore >= 75 ? "text-emerald-600 dark:text-emerald-400" : matchData.matchScore >= 55 ? "text-amber-600 dark:text-amber-400" : ""}`}
                                data-testid={`badge-match-${job.id}`}
                              >
                                {matchData.matchScore}% fit
                              </Badge>
                            )}
                            {postedAgo && (
                              <span className="text-xs text-muted-foreground mt-0.5" data-testid={`text-posted-${job.id}`}>
                                {postedAgo}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5" data-testid={`text-job-company-${job.id}`}>
                          {cleanStructuredText(job.company)}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <JobLocation
                            location={job.location}
                            locationType={job.locationType}
                            isRemote={job.isRemote}
                            testIdPrefix={`browse-job-${job.id}`}
                          />
                          {taxonomy && (
                            <Badge variant="secondary" className="text-[10px]" data-testid={`badge-category-${job.id}`}>
                              {taxonomy.shortName}
                            </Badge>
                          )}
                        </div>
                      </div>
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

        </Container>
      </main>

      <Footer />

      {pickerJobId && (
        <ResumePickerDialog
          open={!!pickerJobId}
          onOpenChange={(open) => { if (!open) { setPickerJobId(null); setPickerJobTitle(""); } }}
          jobId={pickerJobId}
          jobTitle={pickerJobTitle}
        />
      )}
    </div>
  );
}

const FIT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  high: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
  medium: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  low: { bg: "bg-slate-50 dark:bg-slate-900/30", text: "text-slate-600 dark:text-slate-400", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-400" },
};

const FIT_LABELS: Record<string, string> = { high: "Strong fit", medium: "Good fit", low: "Stretch" };

function CareerGearPopover({
  isAuthenticated,
  hasResume,
  isPro,
  result,
  resumeChanged,
  isGenerating,
  onGenerate,
  onSelectPath,
  selectedPath,
}: {
  isAuthenticated: boolean;
  hasResume: boolean;
  isPro: boolean;
  result: CareerIntelligenceResult | null;
  resumeChanged: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onSelectPath: (path: CareerPath, index: number) => void;
  selectedPath: string | null;
}) {
  if (!isAuthenticated) {
    return (
      <div className="p-4 text-center" data-testid="gear-unauth">
        <Compass className="h-5 w-5 text-primary mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground mb-1">Career Intelligence</p>
        <p className="text-xs text-muted-foreground mb-3">Sign in and upload your resume to see personalized career paths</p>
        <Link href="/auth">
          <Button size="sm" data-testid="button-signin-gear">Sign In</Button>
        </Link>
      </div>
    );
  }

  if (!hasResume) {
    return (
      <div className="p-4 text-center" data-testid="gear-no-resume">
        <Compass className="h-5 w-5 text-primary mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground mb-1">Career Intelligence</p>
        <p className="text-xs text-muted-foreground mb-3">Upload your resume to unlock personalized career paths</p>
        <Link href="/resumes">
          <Button size="sm" data-testid="button-upload-resume-gear">
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Upload Resume
          </Button>
        </Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4 text-center" data-testid="gear-generate">
        <Compass className="h-5 w-5 text-primary mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground mb-1">Career Intelligence</p>
        <p className="text-xs text-muted-foreground mb-3">Discover which legal tech paths match your background</p>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          size="sm"
          data-testid="button-generate-intelligence"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Map my career paths
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4" data-testid="gear-intelligence-result">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Career Intelligence</span>
        </div>
        {resumeChanged && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-amber-600 h-7 px-2"
            onClick={onGenerate}
            disabled={isGenerating}
            data-testid="button-refresh-intelligence"
          >
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
            Refresh
          </Button>
        )}
      </div>

      {resumeChanged && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50" data-testid="resume-changed-banner">
          <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400">Resume changed — refresh for updated insights</p>
        </div>
      )}

      {result.strengths.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            Top strengths
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.strengths.slice(0, 3).map((s, i) => (
              <Badge key={i} variant="outline" className="text-[11px] font-normal bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30">
                {s.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {result.gaps.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-slate-400" />
            Gaps to close
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.gaps.slice(0, 3).map((g, i) => (
              <Badge key={i} variant="outline" className="text-[11px] font-normal">
                {g.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-foreground/10 pt-3 mt-1">
        <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">Career paths — click to filter jobs</p>
        <div className="space-y-1.5">
          {result.recommendedPaths.map((path, i) => {
            const isLocked = i > 0 && !isPro;
            const isActive = selectedPath === path.path;
            const colors = FIT_COLORS[path.fit] || FIT_COLORS.medium;

            return (
              <button
                key={path.path}
                onClick={() => onSelectPath(path, i)}
                disabled={isLocked}
                className={`relative w-full text-left rounded-md border px-3 py-2 transition-all text-sm ${
                  isActive
                    ? `${colors.border} ${colors.bg} ring-1 ring-primary/20`
                    : isLocked
                      ? "border-foreground/5 bg-muted/10 opacity-50"
                      : "border-foreground/10 hover:border-foreground/20 hover:bg-muted/20"
                }`}
                data-testid={`button-path-${i}`}
              >
                {isLocked && (
                  <div className="absolute inset-0 rounded-md bg-background/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                    <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
                      <Lock className="h-3 w-3" />
                      Pro
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground text-sm">{path.path}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`flex items-center gap-1 text-[10px] font-medium ${colors.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                      {FIT_LABELS[path.fit]}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                      <Briefcase className="h-2.5 w-2.5" />
                      {path.jobCount}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{path.why}</p>
              </button>
            );
          })}
        </div>

        {!isPro && result.recommendedPaths.length > 1 && (
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="text-xs text-primary mt-2 w-full" data-testid="button-unlock-paths">
              <Lock className="h-3 w-3 mr-1" />
              Unlock all {result.recommendedPaths.length} paths
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function WelcomeBackBanner() {
  const { data: insights } = useQuery<{
    hasInsights: boolean;
    newJobCount: number;
    topCategory: string | null;
    topCategoryNewJobs: number;
    totalJobViews: number;
    totalApplyClicks: number;
  }>({
    queryKey: ["/api/personalized-insights"],
    staleTime: 60000,
  });

  if (!insights?.hasInsights || insights.newJobCount === 0) return null;

  return (
    <div
      className="flex items-center gap-3 rounded-md border border-primary/15 bg-primary/5 dark:bg-primary/10 px-4 py-3 mb-1"
      data-testid="welcome-back-banner"
    >
      <TrendingUp className="h-4 w-4 text-primary shrink-0" />
      <div className="text-sm text-foreground">
        {insights.topCategory && insights.topCategoryNewJobs > 0 ? (
          <span>
            <span className="font-medium">{insights.topCategoryNewJobs} new {insights.topCategory}</span> {insights.topCategoryNewJobs === 1 ? "role" : "roles"} since your last visit
            {insights.newJobCount > insights.topCategoryNewJobs && (
              <span className="text-muted-foreground"> ({insights.newJobCount} total new)</span>
            )}
          </span>
        ) : (
          <span>
            <span className="font-medium">{insights.newJobCount} new</span> {insights.newJobCount === 1 ? "role" : "roles"} since your last visit
          </span>
        )}
      </div>
    </div>
  );
}
