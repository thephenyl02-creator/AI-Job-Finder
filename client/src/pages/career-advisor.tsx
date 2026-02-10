import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/animations";
import {
  Loader2,
  Compass,
  TrendingUp,
  Lightbulb,
  GraduationCap,
  Briefcase,
  AlertCircle,
  Upload,
  ArrowRight,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";

interface RecommendedPath {
  path: string;
  why: string;
}

interface CareerPathResult {
  recommendedPaths: RecommendedPath[];
  transitionSteps: string[];
  suggestedSteppingStoneRoles: string[];
  learningPlan: string[];
  confidenceNotes: string[];
}

export default function CareerPathAdvisor() {
  usePageTitle("Career Path Advisor");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { track } = useActivityTracker();
  const { toast } = useToast();

  useEffect(() => { track({ eventType: "page_view", pagePath: "/career-advisor" }); }, []);

  const [result, setResult] = useState<CareerPathResult | null>(null);

  const { data: resumes } = useQuery<any[]>({
    queryKey: ["/api/resumes"],
    enabled: isAuthenticated,
  });

  const hasResume = resumes && resumes.length > 0;

  const advisorMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/career-path-advisor", {});
      return res.json() as Promise<CareerPathResult>;
    },
    onSuccess: (data) => {
      if (!data?.recommendedPaths) {
        toast({ title: "Unexpected response", description: "Please try again.", variant: "destructive" });
        return;
      }
      setResult(data);
      track({ eventType: "career_path_generated" });
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to generate career path guidance";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-6 text-center space-y-4">
              <Compass className="h-10 w-10 mx-auto text-muted-foreground" />
              <h2 className="text-lg font-semibold">Sign in to access Career Path Advisor</h2>
              <p className="text-sm text-muted-foreground">
                Get personalized career direction based on your resume and experience.
              </p>
              <Link href="/auth">
                <Button data-testid="button-login-career">Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" data-testid="page-career-path-advisor">
      <Header />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 space-y-8">
        <ScrollReveal>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Compass className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-serif text-foreground" data-testid="heading-career-path">
                  Career Path Advisor
                </h1>
                <p className="text-sm text-muted-foreground">
                  Career direction and transition steps.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 ml-[3.25rem]">
              Direction for your next 6–24 months (not job-specific edits).
            </p>
          </div>
        </ScrollReveal>

        {!hasResume ? (
          <Card data-testid="section-upload-cta">
            <CardContent className="p-6 text-center space-y-4">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <h3 className="text-base font-semibold">Upload your resume first</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                We need your resume to analyze your background and suggest career paths that make sense for you.
              </p>
              <Link href="/resume">
                <Button data-testid="button-upload-resume-career">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Resume
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : !result ? (
          <Card data-testid="section-generate-prompt">
            <CardContent className="p-6 space-y-4">
              <div className="rounded-md border border-border/40 p-4">
                <p className="text-sm text-foreground mb-3">
                  Based on your resume, we'll provide personalized guidance on:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                    <span>2–4 recommended career paths in legal tech</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                    <span>Concrete transition steps over the next 6–24 months</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Briefcase className="h-3.5 w-3.5 mt-0.5 text-violet-500 shrink-0" />
                    <span>Stepping-stone roles that bridge your current experience</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <GraduationCap className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                    <span>A practical learning plan (skills, certifications, projects)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <span>Honest assessment of what's strong and what's missing</span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  onClick={() => advisorMutation.mutate()}
                  disabled={advisorMutation.isPending}
                  data-testid="button-generate-career-path"
                >
                  {advisorMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing your background...
                    </>
                  ) : (
                    <>
                      <Compass className="h-4 w-4 mr-2" />
                      Get Career Path Guidance
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
            data-testid="section-career-results"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-foreground">Your Career Path Guidance</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResult(null)}
                data-testid="button-career-again"
              >
                Run Again
              </Button>
            </div>

            {result.recommendedPaths.length > 0 && (
              <Card data-testid="card-recommended-paths">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1 rounded bg-blue-50 dark:bg-blue-900/20">
                      <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Recommended Paths</h3>
                  </div>
                  <div className="space-y-3">
                    {result.recommendedPaths.map((p, idx) => (
                      <div key={idx} className="rounded-md border border-border/40 p-3" data-testid={`path-${idx}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">{p.path}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{p.why}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {result.transitionSteps.length > 0 && (
              <Card data-testid="card-transition-steps">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1 rounded bg-green-50 dark:bg-green-900/20">
                      <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Transition Steps (6–24 months)</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.transitionSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-muted-foreground/50 shrink-0 font-mono text-xs mt-0.5">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {result.suggestedSteppingStoneRoles.length > 0 && (
              <Card data-testid="card-stepping-stone-roles">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1 rounded bg-violet-50 dark:bg-violet-900/20">
                      <Briefcase className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Stepping-Stone Roles</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.suggestedSteppingStoneRoles.map((role, idx) => (
                      <Badge key={idx} variant="outline" data-testid={`role-badge-${idx}`}>
                        {role}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {result.learningPlan.length > 0 && (
              <Card data-testid="card-learning-plan">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1 rounded bg-amber-50 dark:bg-amber-900/20">
                      <GraduationCap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Learning Plan</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.learningPlan.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {result.confidenceNotes.length > 0 && (
              <Card data-testid="card-confidence-notes">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1 rounded bg-muted">
                      <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Honest Assessment</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.confidenceNotes.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <p className="text-xs text-muted-foreground italic">
              This is career-level guidance based on your resume profile. For job-specific positioning, use Alignment Strategy on individual job pages.
            </p>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
}
