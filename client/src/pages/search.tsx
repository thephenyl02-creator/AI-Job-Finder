import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { apiRequest } from "@/lib/queryClient";
import type { JobWithScore } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search as SearchIcon,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Target,
  ChevronRight,
} from "lucide-react";

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

export default function Search() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [step, setStep] = useState<SearchStep>("input");
  const [query, setQuery] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<RefinedSearchResult | null>(null);

  // Analyze query and get clarifying questions
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
        // No questions, go straight to search
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
      // Fall back to regular search
      regularSearchMutation.mutate(query);
    },
  });

  // Refined search with answers
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

  // Fallback regular search
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
    
    // Convert answers to question:answer format
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
        <div className="animate-pulse text-muted-foreground">Loading...</div>
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
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-3 tracking-tight">
            Find Your Next Role
          </h1>
          <p className="text-muted-foreground">
            {step === "input" && "Describe what you're looking for in your own words"}
            {step === "refining" && "Understanding your search..."}
            {step === "questions" && "A few quick questions to narrow down the best matches"}
            {step === "searching" && "Finding your best matches..."}
            {step === "results" && "Your curated results"}
          </p>
        </div>

        {/* Step: Input */}
        {step === "input" && (
          <div className="space-y-6">
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
          </div>
        )}

        {/* Step: Refining */}
        {step === "refining" && (
          <div className="flex flex-col items-center gap-6 py-12">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground mb-1">Understanding your search...</p>
              <p className="text-sm text-muted-foreground">Preparing a few questions to narrow down the best matches</p>
            </div>
          </div>
        )}

        {/* Step: Questions */}
        {step === "questions" && analysis && (
          <div className="space-y-6">
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
                <Card key={question.id} className="overflow-hidden">
                  <CardContent className="p-5">
                    <p className="font-medium text-foreground mb-4">
                      {idx + 1}. {question.question}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {question.options.map((option) => (
                        <Badge
                          key={option.value}
                          variant={answers[question.id] === option.value ? "default" : "outline"}
                          className="cursor-pointer py-2 px-3 text-sm"
                          onClick={() => handleAnswerSelect(question.id, option.value)}
                          data-testid={`option-${question.id}-${option.value}`}
                        >
                          {answers[question.id] === option.value && (
                            <Check className="h-3 w-3 mr-1.5" />
                          )}
                          {option.label}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
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
          </div>
        )}

        {/* Step: Searching */}
        {step === "searching" && (
          <div className="flex flex-col items-center gap-6 py-12">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground mb-1">Finding your matches...</p>
              <p className="text-sm text-muted-foreground">Searching for roles that fit your criteria</p>
            </div>
          </div>
        )}

        {/* Step: Results */}
        {step === "results" && results && (
          <div className="space-y-6">
            <Card className="bg-muted/40 border-border/60" data-testid="card-curated-matches">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Target className="h-5 w-5 text-foreground" />
                  </div>
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
                  {results.jobs.slice(0, 5).map((job) => (
                    <Card 
                      key={job.id} 
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
                              {job.company} • {job.location || "Remote"}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-match-reason-${job.id}`}>
                              {job.matchReason}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
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
          </div>
        )}
      </main>
    </div>
  );
}
