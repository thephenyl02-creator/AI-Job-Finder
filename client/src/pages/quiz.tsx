import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Sparkles,
  Target,
  Search,
  Loader2,
  Lock,
  FileText,
  CheckCircle2,
  Upload,
} from "lucide-react";

interface QuizAnswers {
  currentRole: string;
  interest: string;
  techLevel: string;
  careerStage: string;
}

interface PathResult {
  name: string;
  description: string;
  jobCount: number;
  confidence: number;
}

interface QuizResult {
  paths: PathResult[];
  transitionDifficulty: string;
  totalMatchedRoles: number;
}

const QUESTIONS = [
  {
    id: "currentRole" as const,
    title: "What best describes your current role?",
    subtitle: "This helps us understand your starting point.",
    options: [
      { value: "practicing_attorney", label: "Practicing attorney (law firm)" },
      { value: "in_house_counsel", label: "In-house counsel" },
      { value: "legal_ops", label: "Legal operations / paralegal" },
      { value: "non_legal", label: "Non-legal professional interested in legal tech" },
      { value: "student", label: "Early-career professional / recent graduate" },
    ],
  },
  {
    id: "interest" as const,
    title: "What interests you most?",
    subtitle: "Pick the area that excites you the most.",
    options: [
      { value: "improving_teams", label: "Improving how legal teams work" },
      { value: "building_products", label: "Building or designing legal tech products" },
      { value: "data_analytics", label: "Using data and analytics to drive decisions" },
      { value: "compliance_risk", label: "Compliance, risk, and regulatory matters" },
      { value: "business_dev", label: "Business development and client relationships" },
    ],
  },
  {
    id: "techLevel" as const,
    title: "How comfortable are you with technology?",
    subtitle: "Be honest — there's no wrong answer.",
    options: [
      { value: "basic", label: "I use basic office tools (Word, Excel, email)" },
      { value: "legal_tech", label: "I'm comfortable with legal tech tools (CLM, eDiscovery, etc.)" },
      { value: "light_scripting", label: "I can do light scripting or data analysis" },
      { value: "technical", label: "I have a technical background (coding, data science, etc.)" },
    ],
  },
  {
    id: "careerStage" as const,
    title: "Where are you in your career?",
    subtitle: "This helps calibrate role recommendations.",
    options: [
      { value: "early", label: "Early career (0\u20133 years)" },
      { value: "mid", label: "Mid-career (4\u20138 years)" },
      { value: "senior", label: "Senior (9\u201315 years)" },
      { value: "executive", label: "Executive / leadership (15+ years)" },
    ],
  },
];

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2" data-testid="quiz-progress">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 bg-primary"
              : i < current
                ? "w-2 bg-primary/50"
                : "w-2 bg-muted"
          }`}
          data-testid={`progress-dot-${i}`}
        />
      ))}
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config: Record<string, string> = {
    Easy: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    Moderate: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    Challenging: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  };
  return (
    <Badge
      variant="secondary"
      className={`text-xs ${config[difficulty] || ""}`}
      data-testid="badge-transition-difficulty"
    >
      {difficulty} transition
    </Badge>
  );
}

export default function QuizPage() {
  usePageTitle("Career Quiz");
  const { track } = useActivityTracker();

  useEffect(() => { track({ eventType: "page_view", pagePath: "/quiz" }); }, []);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const submitMutation = useMutation({
    mutationFn: async (body: QuizAnswers) => {
      const res = await apiRequest("POST", "/api/quiz/result", body);
      return res.json() as Promise<QuizResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      track({ eventType: "quiz_complete", metadata: { topPath: data?.paths?.[0]?.name } });
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "quiz_completion" }) }).catch(() => {});
    },
  });

  const selectOption = useCallback(
    (questionId: string, value: string) => {
      const next = { ...answers, [questionId]: value };
      setAnswers(next);

      if (step < QUESTIONS.length - 1) {
        setTimeout(() => setStep(step + 1), 200);
      } else {
        submitMutation.mutate(next as QuizAnswers);
      }
    },
    [answers, step, submitMutation]
  );

  const goBack = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  const restart = useCallback(() => {
    setStep(0);
    setAnswers({});
    setResult(null);
  }, []);

  const isSubmitting = submitMutation.isPending;
  const showResult = result !== null;
  const question = QUESTIONS[step];
  const selectedValue = question ? answers[question.id] : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer" data-testid="logo-quiz">
              <LogoMark className="h-5 w-5 text-foreground" />
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Legal Tech Careers
              </span>
            </div>
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className="pt-14 flex-1 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-10">
        <div className="w-full max-w-lg">
          {!showResult && !isSubmitting && (
            <>
              <div className="text-center mb-8">
                <h1
                  className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight"
                  data-testid="text-quiz-title"
                >
                  Find your path in legal tech
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  4 quick questions. 30 seconds. Personalized results.
                </p>
              </div>

              <div className="flex justify-center mb-6">
                <ProgressDots current={step} total={QUESTIONS.length} />
              </div>

              <div className="space-y-4">
                <div className="text-center mb-2">
                  <h2
                    className="text-lg font-semibold text-foreground"
                    data-testid="text-question-title"
                  >
                    {question.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {question.subtitle}
                  </p>
                </div>

                <div className="space-y-2">
                  {question.options.map((option) => (
                    <Card
                      key={option.value}
                      className={`cursor-pointer transition-all duration-150 hover-elevate ${
                        selectedValue === option.value
                          ? "border-primary ring-1 ring-primary/30"
                          : "border-border/50"
                      }`}
                      onClick={() => selectOption(question.id, option.value)}
                      data-testid={`option-${option.value}`}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
                            selectedValue === option.value
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {selectedValue === option.value && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-foreground">{option.label}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {step > 0 && (
                  <div className="flex justify-start pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goBack}
                      data-testid="button-quiz-back"
                    >
                      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                      Back
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {isSubmitting && (
            <div className="text-center space-y-4 py-16">
              <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
              <div>
                <h2
                  className="text-xl font-serif font-medium text-foreground"
                  data-testid="text-quiz-loading"
                >
                  Analyzing your answers
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Matching you with career paths and live roles...
                </p>
              </div>
            </div>
          )}

          {showResult && (
            <div className="space-y-6">
              <div className="text-center">
                <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
                <h2
                  className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight"
                  data-testid="text-quiz-results-title"
                >
                  Your top career paths
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Based on your answers, here's where you'd thrive in legal tech.
                </p>
                <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
                  <DifficultyBadge difficulty={result.transitionDifficulty} />
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    data-testid="badge-total-roles"
                  >
                    {result.totalMatchedRoles} matching roles
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                {result.paths.map((path, i) => (
                  <Card
                    key={path.name}
                    className="border-border/50"
                    data-testid={`result-path-${i}`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-semibold text-foreground">
                              {path.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className="text-[10px] no-default-active-elevate"
                            >
                              {path.confidence}% match
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            {path.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {path.jobCount} open roles
                        </span>
                        <Button variant="outline" size="sm" asChild data-testid={`button-browse-path-${i}`}>
                          <Link
                            href={`/jobs?category=${encodeURIComponent(path.name)}`}
                          >
                            <Search className="mr-1.5 h-3 w-3" />
                            Browse roles
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-primary/30 bg-primary/[0.03]" data-testid="quiz-upgrade-bridge">
                <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase mb-1">
                      Quiz estimate vs. resume analysis
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Your quiz gives a directional estimate. A resume scan unlocks precision.
                    </p>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] gap-x-1 sm:gap-x-0 text-xs">
                    <div className="text-center pb-2 border-b border-border/50">
                      <Badge variant="secondary" className="text-[10px]">Quiz Estimate</Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">~60% confidence</p>
                    </div>
                    <div className="pb-2 border-b border-border/50" />
                    <div className="text-center pb-2 border-b border-border/50">
                      <Badge className="text-[10px]">Resume-Verified</Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">95%+ confidence</p>
                    </div>

                    <div className="py-2 sm:py-2.5 text-center border-b border-border/30">
                      <p className="text-muted-foreground text-[11px] sm:text-xs">Top 2 paths</p>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto mt-1" />
                    </div>
                    <div className="py-2 sm:py-2.5 border-b border-border/30 flex items-center justify-center">
                      <span className="text-muted-foreground/40 text-[10px]">vs</span>
                    </div>
                    <div className="py-2 sm:py-2.5 text-center border-b border-border/30">
                      <p className="text-foreground font-medium text-[11px] sm:text-xs">All paths ranked</p>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto mt-1" />
                    </div>

                    <div className="py-2 sm:py-2.5 text-center border-b border-border/30">
                      <p className="text-muted-foreground text-[11px] sm:text-xs">Difficulty level</p>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto mt-1" />
                    </div>
                    <div className="py-2 sm:py-2.5 border-b border-border/30 flex items-center justify-center">
                      <span className="text-muted-foreground/40 text-[10px]">vs</span>
                    </div>
                    <div className="py-2 sm:py-2.5 text-center border-b border-border/30">
                      <p className="text-foreground font-medium text-[11px] sm:text-xs">Readiness score</p>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto mt-1" />
                    </div>

                    <div className="py-2 sm:py-2.5 text-center border-b border-border/30">
                      <p className="text-muted-foreground/50">—</p>
                    </div>
                    <div className="py-2 sm:py-2.5 border-b border-border/30 flex items-center justify-center">
                      <span className="text-muted-foreground/40 text-[10px]">vs</span>
                    </div>
                    <div className="py-2 sm:py-2.5 text-center border-b border-border/30">
                      <p className="text-foreground font-medium text-[11px] sm:text-xs">Exact skill gaps</p>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto mt-1" />
                    </div>

                    <div className="py-2 sm:py-2.5 text-center">
                      <p className="text-muted-foreground/50">—</p>
                    </div>
                    <div className="py-2 sm:py-2.5 flex items-center justify-center">
                      <span className="text-muted-foreground/40 text-[10px]">vs</span>
                    </div>
                    <div className="py-2 sm:py-2.5 text-center">
                      <p className="text-foreground font-medium text-[11px] sm:text-xs">Best job matches</p>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto mt-1" />
                    </div>
                  </div>

                  <Button className="w-full" asChild data-testid="button-quiz-upload-cta">
                    <Link href="/diagnostic">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload resume for full results
                    </Link>
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    Private by default. Takes ~90 seconds. No account needed.
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-3 pt-1">
                <Button variant="outline" className="w-full" asChild data-testid="button-quiz-browse-all">
                  <Link href="/jobs">
                    Browse all roles
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="text-center space-y-2 pt-2">
                <Link href="/auth">
                  <span
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    data-testid="link-quiz-signin"
                  >
                    Already have an account? Sign in
                  </span>
                </Link>
                <div>
                  <button
                    onClick={restart}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-quiz-restart"
                  >
                    Retake quiz
                  </button>
                </div>
              </div>
            </div>
          )}

          {submitMutation.isError && !showResult && (
            <div className="text-center space-y-4 py-8">
              <p className="text-sm text-destructive" data-testid="text-quiz-error">
                Something went wrong. Please try again.
              </p>
              <Button variant="outline" onClick={restart} data-testid="button-quiz-retry">
                Start over
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
