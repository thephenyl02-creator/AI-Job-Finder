import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Container } from "@/components/container";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  Check,
  X,
  CheckCheck,
  Copy,
  ExternalLink,
  FileText,
  Upload,
  Sparkles,
  Lock,
  ChevronRight,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

interface RewrittenBullet {
  original: string;
  rewritten: string;
  matchedKeywords: string[];
  improvementNote: string;
}

interface RewriteResult {
  bullets: RewrittenBullet[];
  suggestedSkills: string[];
  overallTips: string;
  remaining: number;
}

interface ExtractedBullet {
  text: string;
  source: string;
  experienceIndex: number;
}

interface ExtractResponse {
  bullets: ExtractedBullet[];
  resumeId: number;
  resumeLabel: string;
}

type BulletDecision = "pending" | "accepted" | "rejected";

export default function ResumeReview() {
  const { id } = useParams<{ id: string }>();
  const jobId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isPro, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  usePageTitle("Resume Review");

  const [step, setStep] = useState<"loading" | "sign-in" | "no-resume" | "analyzing" | "review" | "done">("loading");
  const [decisions, setDecisions] = useState<BulletDecision[]>([]);
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null);
  const [extractedBullets, setExtractedBullets] = useState<ExtractedBullet[] | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: job, isLoading: jobLoading } = useQuery<any>({
    queryKey: ["/api/jobs", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) throw new Error("Job not found");
      return res.json();
    },
    enabled: jobId > 0,
  });

  const { data: resumes } = useQuery<any[]>({
    queryKey: ["/api/resumes"],
    enabled: isAuthenticated,
  });

  const hasResume = resumes && resumes.length > 0;

  const extractMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/resume/extract-bullets", {});
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to extract bullets");
      }
      return res.json() as Promise<ExtractResponse>;
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: async (bullets: string[]) => {
      const res = await apiRequest("POST", "/api/resume/rewrite-for-job", {
        jobId,
        bullets,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || "Failed to analyze resume");
      }
      return res.json() as Promise<RewriteResult>;
    },
  });

  useEffect(() => {
    if (authLoading || jobLoading) return;
    if (!isAuthenticated) {
      setStep("sign-in");
      return;
    }
    if (!resumes) return;
    if (resumes.length === 0) {
      setStep("no-resume");
      return;
    }
    if (rewriteResult) return;

    setStep("analyzing");

    extractMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (!data.bullets || data.bullets.length === 0) {
          toast({
            title: "No bullet points found",
            description: "We couldn't extract bullet points from your resume. Try uploading a different format.",
            variant: "destructive",
          });
          setStep("no-resume");
          return;
        }
        setExtractedBullets(data.bullets);

        if (!isPro) {
          setStep("review");
          return;
        }

        const bulletsToRewrite = data.bullets.slice(0, 10).map((b) => b.text);

        rewriteMutation.mutate(bulletsToRewrite, {
          onSuccess: (result) => {
            setRewriteResult(result);
            setDecisions(result.bullets.map(() => "pending"));
            setStep("review");
          },
          onError: (err: any) => {
            toast({
              title: "Analysis failed",
              description: err.message || "Could not analyze your resume against this job.",
              variant: "destructive",
            });
            setStep("no-resume");
          },
        });
      },
      onError: (err: any) => {
        toast({
          title: "Could not load resume",
          description: err.message,
          variant: "destructive",
        });
        setStep("no-resume");
      },
    });
  }, [authLoading, jobLoading, isAuthenticated, resumes, jobId]);

  const handleDecision = useCallback((idx: number, decision: BulletDecision) => {
    setDecisions((prev) => prev.map((d, i) => (i === idx ? decision : d)));
  }, []);

  const handleAcceptAll = useCallback(() => {
    setDecisions((prev) => prev.map(() => "accepted"));
  }, []);

  const handleResetAll = useCallback(() => {
    setDecisions((prev) => prev.map(() => "pending"));
  }, []);

  const allDecided = decisions.length > 0 && decisions.every((d) => d !== "pending");

  const finalBullets = useMemo(() => {
    if (!rewriteResult) return [];
    return rewriteResult.bullets.map((b, i) => {
      if (decisions[i] === "accepted") return b.rewritten;
      return b.original;
    });
  }, [rewriteResult, decisions]);

  const handleFinish = useCallback(() => {
    setStep("done");
  }, []);

  const handleCopyAll = useCallback(() => {
    const text = finalBullets.map((b) => `• ${b}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard", description: "Your updated resume bullets are ready to paste." });
  }, [finalBullets, toast]);

  const acceptedCount = decisions.filter((d) => d === "accepted").length;
  const rejectedCount = decisions.filter((d) => d === "rejected").length;
  const pendingCount = decisions.filter((d) => d === "pending").length;

  if (authLoading || jobLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Container className="py-16 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <Container className="py-6 sm:py-8 flex-1">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setLocation(`/jobs/${jobId}`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 hover-elevate rounded-md px-2 py-1 -ml-2"
            data-testid="button-back-to-job"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to job
          </button>

          {job && (
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground font-serif" data-testid="text-review-title">
                Resume Review
              </h1>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-review-subtitle">
                {job.title} at {job.company}
              </p>
            </div>
          )}

          {step === "loading" && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          )}

          {step === "sign-in" && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-foreground" data-testid="text-signin-prompt">
                    Sign in to review your resume
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Create a free account to upload your resume and get line-by-line suggestions for this role.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Link href={`/auth?returnTo=${encodeURIComponent(`/resume-review/${jobId}`)}`}>
                    <Button data-testid="button-go-signup">
                      Sign In or Create Account
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => setLocation(`/jobs/${jobId}`)}
                    data-testid="button-back-to-job-alt"
                  >
                    Back to Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "no-resume" && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-foreground" data-testid="text-upload-prompt">
                    Upload your resume to get started
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    We'll analyze your experience and show you exactly what to change
                    to be a stronger candidate for this role.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Link href="/resumes">
                    <Button data-testid="button-go-upload">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Resume
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => setLocation(`/jobs/${jobId}`)}
                    data-testid="button-back-to-job-alt"
                  >
                    Back to Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "analyzing" && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground" data-testid="text-analyzing">
                    Analyzing your resume
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Comparing your experience against the job requirements...
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <StepIndicator label="Extract" active done={!!extractedBullets} />
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <StepIndicator label="Compare" active={!!extractedBullets} done={!!rewriteResult} />
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <StepIndicator label="Suggest" active={false} done={false} />
                </div>
              </CardContent>
            </Card>
          )}

          {step === "review" && !isPro && extractedBullets && (
            <Card className="mb-6">
              <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground" data-testid="text-pro-gate">
                    We found {extractedBullets.length} lines to review
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upgrade to Pro to see specific suggestions and accept or reject each change.
                  </p>
                </div>
                <div className="w-full max-w-sm space-y-2 mt-2">
                  {extractedBullets.slice(0, 3).map((b, i) => (
                    <div
                      key={i}
                      className="text-left p-3 rounded-md border bg-muted/30"
                      data-testid={`preview-bullet-${i}`}
                    >
                      <p className="text-xs text-muted-foreground">{b.text}</p>
                      <p className="text-xs text-foreground mt-1 blur-[4px] select-none" aria-hidden="true">
                        This bullet could be strengthened with relevant legal tech keywords and action verbs to better align with the role requirements.
                      </p>
                    </div>
                  ))}
                  {extractedBullets.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      + {extractedBullets.length - 3} more bullets to improve
                    </p>
                  )}
                </div>
                <Link href="/pricing">
                  <Button className="mt-2" data-testid="button-upgrade-pro">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade to Pro — $5/month
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {step === "review" && rewriteResult && isPro && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" data-testid="badge-accepted-count">
                    <Check className="h-3 w-3 mr-1" />
                    {acceptedCount} accepted
                  </Badge>
                  <Badge variant="secondary" data-testid="badge-rejected-count">
                    <X className="h-3 w-3 mr-1" />
                    {rejectedCount} kept original
                  </Badge>
                  {pendingCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {pendingCount} remaining
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetAll}
                    data-testid="button-reset-all"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptAll}
                    data-testid="button-accept-all"
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                    Accept All
                  </Button>
                </div>
              </div>

              <div className="space-y-3" data-testid="section-redline-bullets">
                {rewriteResult.bullets.map((bullet, idx) => (
                  <RedlineBullet
                    key={idx}
                    bullet={bullet}
                    decision={decisions[idx]}
                    onDecision={(d) => handleDecision(idx, d)}
                    index={idx}
                  />
                ))}
              </div>

              {rewriteResult.suggestedSkills.length > 0 && (
                <div className="mt-6 p-4 rounded-lg border bg-card" data-testid="section-suggested-skills">
                  <p className="text-sm font-medium text-foreground mb-2">Skills to consider adding</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rewriteResult.suggestedSkills.map((skill, i) => (
                      <Badge key={i} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {rewriteResult.overallTips && (
                <div className="mt-3 p-4 rounded-lg border bg-card" data-testid="section-overall-tips">
                  <p className="text-sm font-medium text-foreground mb-1">General tips</p>
                  <p className="text-xs text-muted-foreground">{rewriteResult.overallTips}</p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2 justify-end">
                <Button
                  onClick={handleFinish}
                  disabled={pendingCount > 0}
                  data-testid="button-finish-review"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {pendingCount > 0 ? `${pendingCount} items need a decision` : "See Final Resume"}
                </Button>
              </div>
            </>
          )}

          {step === "done" && (
            <>
              <Card className="mb-4">
                <CardContent className="py-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground" data-testid="text-resume-ready">
                        Your resume is ready
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {acceptedCount} improvement{acceptedCount !== 1 ? "s" : ""} applied, {rejectedCount} kept as-is
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 border rounded-md p-4 bg-muted/20" data-testid="section-final-resume">
                    {finalBullets.map((bullet, i) => {
                      const wasChanged = decisions[i] === "accepted";
                      return (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
                          <p className={`text-sm ${wasChanged ? "text-foreground" : "text-muted-foreground"}`} data-testid={`text-final-bullet-${i}`}>
                            {bullet}
                            {wasChanged && (
                              <Badge variant="outline" className="ml-2 text-[10px]">
                                updated
                              </Badge>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-2 justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setStep("review")}
                  data-testid="button-back-to-review"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Review
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCopyAll}
                    data-testid="button-copy-all"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copied ? "Copied" : "Copy to Clipboard"}
                  </Button>
                  {job?.applyUrl && (
                    <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                      <Button data-testid="button-apply-now">
                        Apply to {job.company}
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Container>
      <Footer />
    </div>
  );
}

function StepIndicator({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
          done
            ? "bg-primary text-primary-foreground"
            : active
              ? "bg-primary/20 text-primary border border-primary/40"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-3 w-3" /> : null}
      </div>
      <span className={`text-xs ${active || done ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

function RedlineBullet({
  bullet,
  decision,
  onDecision,
  index,
}: {
  bullet: RewrittenBullet;
  decision: BulletDecision;
  onDecision: (d: BulletDecision) => void;
  index: number;
}) {
  const noChange = bullet.original.trim() === bullet.rewritten.trim();

  if (noChange) {
    return (
      <div
        className="p-3 sm:p-4 rounded-lg border bg-card"
        data-testid={`redline-bullet-${index}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground" data-testid={`text-bullet-original-${index}`}>
              {bullet.original}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Already well-aligned with this role
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            No change needed
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-3 sm:p-4 rounded-lg border bg-card transition-colors ${
        decision === "accepted"
          ? "border-emerald-500/30 bg-emerald-500/[0.02]"
          : decision === "rejected"
            ? "border-border"
            : ""
      }`}
      data-testid={`redline-bullet-${index}`}
    >
      <div className="space-y-2">
        <div className="flex items-start gap-2" data-testid={`section-original-${index}`}>
          <span className="text-xs text-muted-foreground mt-0.5 shrink-0 w-12 text-right">Before</span>
          <p className={`text-sm flex-1 ${decision === "accepted" ? "line-through text-muted-foreground/60" : "text-muted-foreground"}`}>
            {bullet.original}
          </p>
        </div>

        <div className="flex items-start gap-2" data-testid={`section-suggested-${index}`}>
          <span className="text-xs text-primary mt-0.5 shrink-0 w-12 text-right">After</span>
          <p className={`text-sm flex-1 ${decision === "rejected" ? "text-muted-foreground/60" : "text-foreground font-medium"}`}>
            {bullet.rewritten}
          </p>
        </div>

        {bullet.improvementNote && (
          <div className="flex items-start gap-2 ml-14">
            <p className="text-[11px] text-muted-foreground italic" data-testid={`text-note-${index}`}>
              {bullet.improvementNote}
            </p>
          </div>
        )}

        {bullet.matchedKeywords.length > 0 && (
          <div className="flex items-center gap-1.5 ml-14 flex-wrap">
            {bullet.matchedKeywords.map((kw, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {kw}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 ml-14 pt-1">
          <Button
            size="sm"
            variant={decision === "accepted" ? "default" : "outline"}
            onClick={() => onDecision(decision === "accepted" ? "pending" : "accepted")}
            data-testid={`button-accept-${index}`}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {decision === "accepted" ? "Accepted" : "Accept"}
          </Button>
          <Button
            size="sm"
            variant={decision === "rejected" ? "default" : "outline"}
            onClick={() => onDecision(decision === "rejected" ? "pending" : "rejected")}
            data-testid={`button-reject-${index}`}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            {decision === "rejected" ? "Keeping Original" : "Keep Original"}
          </Button>
        </div>
      </div>
    </div>
  );
}
