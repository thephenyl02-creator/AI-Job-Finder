import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { apiRequest } from "@/lib/queryClient";
import type { JobWithScore, ResumeExtractedData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search as SearchIcon,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Target,
  Upload,
  FileText,
  CheckCircle2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressSteps, Typewriter, ScrollReveal } from "@/components/animations";

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

type SearchStep = "input" | "refining" | "questions" | "searching" | "results";

const STEP_MAP: Record<SearchStep, number> = {
  input: 0,
  refining: 1,
  questions: 1,
  searching: 2,
  results: 3,
};

const SEARCH_SUGGESTIONS = [
  "product manager at a legal tech startup, remote",
  "compliance role at a growing company",
  "legal operations, entry level",
  "contract management, hybrid, senior",
  "legal AI company, any role",
];

const pageVariants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

export default function Search() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<SearchStep>("input");
  const [query, setQuery] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<RefinedSearchResult | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: resumeStatus } = useQuery<{ hasResume: boolean; filename?: string; extractedData?: ResumeExtractedData }>({
    queryKey: ["/api/resume"],
    enabled: isAuthenticated,
  });

  const handleFileUpload = useCallback(async (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or Word document (.pdf, .docx, .doc).",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5 MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + 12;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok && data.success) {
        clearInterval(progressInterval);
        setUploadProgress(100);
        queryClient.invalidateQueries({ queryKey: ["/api/resume"] });

        if (data.searchQuery) {
          setQuery(data.searchQuery);
        }

        toast({
          title: "Resume uploaded",
          description: "We've analyzed your resume and generated a search query.",
        });
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [toast, queryClient]);

  const handleRemoveResume = async () => {
    try {
      await fetch("/api/resume", { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["/api/resume"] });
      setQuery("");
      toast({
        title: "Resume removed",
        description: "You can upload a new resume anytime.",
      });
    } catch (error) {
      console.error("Error removing resume:", error);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const analyzeMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const response = await apiRequest("POST", "/api/search/analyze", { query: searchQuery });
      return response.json() as Promise<AnalysisResult>;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      if (data.questions && data.questions.length > 0) {
        setStep("questions");
      } else {
        refinedSearchMutation.mutate({
          originalQuery: data.originalQuery,
          refinedIntent: data.refinedIntent,
          answers: {},
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Session expired",
          description: "Please log in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Analysis failed",
        description: "Let's try a regular search instead.",
        variant: "destructive",
      });
      regularSearchMutation.mutate(query);
    },
  });

  const refinedSearchMutation = useMutation({
    mutationFn: async (params: { originalQuery: string; refinedIntent: string; answers: Record<string, string> }) => {
      const response = await apiRequest("POST", "/api/search/refined", params);
      return response.json() as Promise<RefinedSearchResult>;
    },
    onSuccess: (data) => {
      setResults(data);
      setStep("results");
    },
    onError: () => {
      toast({
        title: "Search failed",
        description: "Please try again.",
        variant: "destructive",
      });
      setStep("input");
    },
  });

  const regularSearchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const response = await apiRequest("POST", "/api/search", { query: searchQuery });
      return response.json() as Promise<JobWithScore[]>;
    },
    onSuccess: (data) => {
      sessionStorage.setItem("searchResults", JSON.stringify(data));
      sessionStorage.setItem("searchQuery", query);
      setLocation("/jobs");
    },
    onError: () => {
      toast({
        title: "Search failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInitialSearch = () => {
    if (!query.trim()) return;
    setStep("refining");
    analyzeMutation.mutate(query);
  };

  const handleAnswerSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitAnswers = () => {
    if (!analysis) return;
    setStep("searching");
    
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
  };

  const handleViewAllResults = () => {
    if (results?.jobs) {
      sessionStorage.setItem("searchResults", JSON.stringify(results.jobs));
      sessionStorage.setItem("searchQuery", query + " (curated)");
      setLocation("/jobs");
    }
  };

  const handleReset = () => {
    setStep("input");
    setQuery("");
    setAnalysis(null);
    setAnswers({});
    setResults(null);
  };

  const allQuestionsAnswered = analysis?.questions?.every(q => answers[q.id]);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <ScrollReveal>
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-3 tracking-tight">
              Find Your Next Role
            </h1>
            <AnimatePresence mode="wait">
              <motion.p
                key={step}
                className="text-muted-foreground"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {step === "input" && "Describe what you're looking for in your own words"}
                {step === "refining" && "Understanding your search..."}
                {step === "questions" && "A few quick questions to narrow down the best matches"}
                {step === "searching" && "Finding your best matches..."}
                {step === "results" && "Your curated results"}
              </motion.p>
            </AnimatePresence>
          </div>
        </ScrollReveal>

        <div className="mb-8">
          <ProgressSteps
            steps={["Search", "Refine", "Match", "Results"]}
            currentStep={STEP_MAP[step]}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.div
              key="input"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="e.g., product manager at an AI legal tech startup, remote..."
                  className="pl-12 pr-4 h-14 text-base"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInitialSearch()}
                  data-testid="input-search-query"
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                onChange={handleFileInputChange}
                className="hidden"
                data-testid="input-file-resume"
              />

              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="py-5 px-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                        <span className="text-sm text-foreground">Analyzing your resume...</span>
                      </div>
                      <Progress value={uploadProgress} className="h-1.5" data-testid="upload-progress" />
                      <p className="text-xs text-muted-foreground mt-2">
                        {uploadProgress < 30 && "Extracting text..."}
                        {uploadProgress >= 30 && uploadProgress < 60 && "Reading experience and skills..."}
                        {uploadProgress >= 60 && uploadProgress < 90 && "Building your search profile..."}
                        {uploadProgress >= 90 && "Generating search query..."}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {!isUploading && resumeStatus?.hasResume && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-muted/40">
                    <CardContent className="py-4 px-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-wrap">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground" data-testid="text-resume-filename">
                              {resumeStatus.filename}
                            </p>
                            <p className="text-xs text-muted-foreground">Resume uploaded</p>
                          </div>
                          {resumeStatus.extractedData?.preferredRoles && (
                            <div className="flex flex-wrap gap-1.5">
                              {resumeStatus.extractedData.preferredRoles.slice(0, 2).map((role: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-muted-foreground"
                            data-testid="button-replace-resume"
                          >
                            Replace
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRemoveResume}
                            data-testid="button-remove-resume"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {!isUploading && !resumeStatus?.hasResume && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragOver
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="dropzone-resume"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Upload your resume
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Drop a PDF or Word file here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      We'll match you with the best roles based on your experience
                    </p>
                  </div>
                </motion.div>
              )}

              {!query && !resumeStatus?.hasResume && !isUploading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3"
                >
                  <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">
                    Try something like
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SEARCH_SUGGESTIONS.map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer py-1.5 px-3 text-xs"
                        onClick={() => setQuery(suggestion)}
                        data-testid={`suggestion-${suggestion.slice(0, 20).replace(/\s+/g, "-")}`}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  size="lg" 
                  onClick={handleInitialSearch}
                  disabled={!query.trim()}
                  className="gap-2"
                  data-testid="button-guided-search"
                >
                  <SearchIcon className="h-4 w-4" />
                  Guided Search
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => {
                    if (query.trim()) {
                      regularSearchMutation.mutate(query);
                    }
                  }}
                  disabled={!query.trim() || regularSearchMutation.isPending}
                  className="gap-2"
                  data-testid="button-quick-search"
                >
                  {regularSearchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Quick Search
                </Button>
              </div>

              <div className="text-center pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/jobs")}
                  className="text-muted-foreground"
                  data-testid="link-browse-all"
                >
                  Or browse all jobs
                </Button>
              </div>
            </motion.div>
          )}

          {step === "refining" && (
            <motion.div
              key="refining"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-6 py-12"
            >
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-16 h-16 rounded-full border-2 border-muted border-t-primary" />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground mb-1">Understanding your search...</p>
                <p className="text-sm text-muted-foreground">Preparing a few questions to narrow down the best matches</p>
              </div>
            </motion.div>
          )}

          {step === "questions" && analysis && (
            <motion.div
              key="questions"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {analysis.refinedIntent && (
                <Card className="bg-muted/40 border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">What we understood</p>
                        <p className="text-sm text-muted-foreground mt-1">{analysis.refinedIntent}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {analysis.questions.map((question, idx) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.12, duration: 0.35 }}
                  >
                    <Card className="overflow-visible">
                      <CardContent className="p-5">
                        <p className="font-medium text-foreground mb-4">
                          {idx + 1}. {question.question}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {question.options.map((option) => (
                            <motion.div key={option.value} whileTap={{ scale: 0.97 }}>
                              <Badge
                                variant={answers[question.id] === option.value ? "default" : "outline"}
                                className={`cursor-pointer py-2 px-3 text-sm transition-all duration-200 ${
                                  answers[question.id] === option.value
                                    ? "ring-1 ring-primary/30"
                                    : ""
                                }`}
                                onClick={() => handleAnswerSelect(question.id, option.value)}
                                data-testid={`option-${question.id}-${option.value}`}
                              >
                                {answers[question.id] === option.value && (
                                  <Check className="h-3 w-3 mr-1.5" />
                                )}
                                {option.label}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4">
                <Button 
                  variant="ghost" 
                  onClick={handleReset}
                  className="gap-2"
                  data-testid="button-start-over"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Start Over
                </Button>
                <Button 
                  size="lg"
                  onClick={handleSubmitAnswers}
                  disabled={!allQuestionsAnswered}
                  className="gap-2"
                  data-testid="button-find-matches"
                >
                  Find My Matches
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === "searching" && (
            <motion.div
              key="searching"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-6 py-12"
            >
              <div className="relative">
                <motion.div
                  className="w-16 h-16 rounded-full border-2 border-muted border-t-primary"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground mb-1">Finding your matches...</p>
                <p className="text-sm text-muted-foreground">Searching for roles that fit your criteria</p>
              </div>
            </motion.div>
          )}

          {step === "results" && results && (
            <motion.div
              key="results"
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card className="bg-muted/40 border-border/60" data-testid="card-curated-matches">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <motion.div
                      className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Target className="h-5 w-5 text-primary" />
                    </motion.div>
                    <div>
                      <p className="font-semibold text-foreground" data-testid="text-match-count">
                        {results.jobs.length} Curated Matches
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="text-search-summary">
                        {results.searchSummary}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {results.jobs.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {results.jobs.slice(0, 5).map((job, idx) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.35 }}
                      >
                        <Card 
                          className="hover-elevate cursor-pointer"
                          onClick={() => {
                            sessionStorage.setItem("searchResults", JSON.stringify([job]));
                            sessionStorage.setItem("searchQuery", query);
                            setLocation("/jobs");
                          }}
                          data-testid={`card-result-${job.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="font-medium text-foreground truncate" data-testid={`text-job-title-${job.id}`}>{job.title}</h3>
                                  <Badge variant="secondary" className="shrink-0" data-testid={`badge-match-score-${job.id}`}>
                                    {job.matchScore}% match
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2" data-testid={`text-job-company-${job.id}`}>
                                  {job.company} {job.location ? `\u2022 ${job.location}` : "\u2022 Remote"}
                                </p>
                                <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-match-reason-${job.id}`}>
                                  {job.matchReason}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {results.jobs.length > 5 && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleViewAllResults}
                      data-testid="button-view-all-results"
                    >
                      View All {results.jobs.length} Matches
                    </Button>
                  )}
                </>
              ) : (
                <Card className="bg-muted/30" data-testid="card-no-results">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground mb-4" data-testid="text-no-results">
                      No perfect matches found for your specific criteria. Try broadening your search.
                    </p>
                    <Button variant="outline" onClick={handleReset} data-testid="button-try-different">
                      Try a Different Search
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center pt-4">
                <Button variant="ghost" onClick={handleReset} className="gap-2" data-testid="button-new-search">
                  <ArrowLeft className="h-4 w-4" />
                  New Search
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
