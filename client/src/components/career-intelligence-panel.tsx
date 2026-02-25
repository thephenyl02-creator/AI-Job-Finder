import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Loader2,
  Compass,
  ChevronDown,
  ChevronUp,
  Upload,
  Lock,
  Zap,
  TrendingUp,
  AlertCircle,
  Briefcase,
} from "lucide-react";

interface CareerPath {
  path: string;
  why: string;
  fit: "high" | "medium" | "low";
  jobCount: number;
}

interface StrengthItem {
  label: string;
  evidence: string;
}

interface GapItem {
  label: string;
  suggestion: string;
}

interface CareerIntelligenceResult {
  recommendedPaths: CareerPath[];
  strengths: StrengthItem[];
  gaps: GapItem[];
  transitionSteps: string[];
  suggestedSteppingStoneRoles: string[];
  learningPlan: string[];
  confidenceNotes: string[];
}

interface CareerIntelligencePanelProps {
  onSelectPath: (category: string | null) => void;
  selectedPath: string | null;
}

const FIT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  high: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
  medium: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  low: { bg: "bg-slate-50 dark:bg-slate-900/30", text: "text-slate-600 dark:text-slate-400", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-400" },
};

const FIT_LABELS: Record<string, string> = {
  high: "Strong fit",
  medium: "Good fit",
  low: "Stretch",
};

const DEMO_PATHS: CareerPath[] = [
  { path: "Legal Operations", why: "Your process improvement experience translates directly.", fit: "high", jobCount: 0 },
  { path: "Compliance & Privacy", why: "Your regulatory background is a strong foundation.", fit: "high", jobCount: 0 },
  { path: "Legal Product Management", why: "Your client-facing skills drive product thinking.", fit: "medium", jobCount: 0 },
  { path: "Legal Engineering", why: "Technical roles that blend law and code.", fit: "low", jobCount: 0 },
];

export function CareerIntelligencePanel({ onSelectPath, selectedPath }: CareerIntelligencePanelProps) {
  const { isAuthenticated, isPro } = useAuth();
  const { toast } = useToast();
  const { trackNow } = useActivityTracker();
  const [isExpanded, setIsExpanded] = useState(true);
  const [result, setResult] = useState<CareerIntelligenceResult | null>(null);
  const [resumeChanged, setResumeChanged] = useState(false);

  const { data: resumes } = useQuery<any[]>({
    queryKey: ["/api/resumes"],
    enabled: isAuthenticated,
  });

  const hasResume = resumes && resumes.length > 0;

  const { data: cachedIntelligence, isLoading: isCacheLoading } = useQuery<{
    cached: boolean;
    resumeChanged?: boolean;
    generatedAt?: string;
    data: CareerIntelligenceResult | null;
  }>({
    queryKey: ["/api/career-intelligence"],
    enabled: isAuthenticated && hasResume === true && !result,
  });

  useEffect(() => {
    if (cachedIntelligence?.cached && cachedIntelligence.data && !result) {
      setResult(cachedIntelligence.data);
      if (cachedIntelligence.resumeChanged) {
        setResumeChanged(true);
      }
    }
  }, [cachedIntelligence, result]);

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
      setResult(data);
      setResumeChanged(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to generate career intelligence", variant: "destructive" });
    },
  });

  const handlePathClick = useCallback((path: CareerPath, index: number) => {
    if (index > 0 && !isPro) return;
    if (selectedPath === path.path) {
      onSelectPath(null);
    } else {
      onSelectPath(path.path);
    }
  }, [isPro, selectedPath, onSelectPath]);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-between rounded-md border border-foreground/10 bg-muted/20 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
        data-testid="button-expand-intelligence"
      >
        <span className="flex items-center gap-2">
          <Compass className="h-4 w-4" />
          Career Intelligence
          {selectedPath && <Badge variant="secondary" className="text-xs">{selectedPath}</Badge>}
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="border-foreground/10" data-testid="panel-intelligence-unauth">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Career Intelligence</h2>
            </div>
            <button onClick={() => setIsExpanded(false)} className="text-muted-foreground hover:text-foreground">
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
          <DemoFlowchart />
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">Sign in and upload your resume to see personalized career paths</p>
            <Link href="/auth">
              <Button size="sm" data-testid="button-signin-intelligence">Sign In</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasResume) {
    return (
      <Card className="border-foreground/10" data-testid="panel-intelligence-no-resume">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Career Intelligence</h2>
            </div>
            <button onClick={() => setIsExpanded(false)} className="text-muted-foreground hover:text-foreground">
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
          <DemoFlowchart />
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">Upload your resume to unlock personalized career paths</p>
            <Link href="/resume">
              <Button size="sm" data-testid="button-upload-resume-intelligence">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload Resume
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="border-foreground/10" data-testid="panel-intelligence-generate">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Career Intelligence</h2>
            </div>
            <button onClick={() => setIsExpanded(false)} className="text-muted-foreground hover:text-foreground">
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
          {isCacheLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading your career data...
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Discover which legal tech career paths match your background — and how many roles are hiring right now.
              </p>
              <Button
                onClick={() => advisorMutation.mutate()}
                disabled={advisorMutation.isPending}
                size="sm"
                data-testid="button-generate-intelligence"
              >
                {advisorMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Analyzing your background...
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    Map my career paths
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-foreground/10" data-testid="panel-intelligence-result">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Career Intelligence</h2>
          </div>
          <button onClick={() => setIsExpanded(false)} className="text-muted-foreground hover:text-foreground">
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>

        {resumeChanged && (
          <div className="flex items-center gap-2 mb-4 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50" data-testid="resume-changed-banner">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">Your resume has changed since this analysis. Refresh for updated insights.</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-amber-700 dark:text-amber-400 h-7 px-2"
              onClick={() => advisorMutation.mutate()}
              disabled={advisorMutation.isPending}
              data-testid="button-refresh-intelligence"
            >
              {advisorMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              <span className="ml-1">Refresh</span>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1.5fr] gap-5">
          <ProfileCard strengths={result.strengths} gaps={result.gaps} />

          <div className="hidden lg:block w-px bg-foreground/10" />

          <div>
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Your career paths</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.recommendedPaths.map((path, i) => {
                const isLocked = i > 0 && !isPro;
                const isActive = selectedPath === path.path;
                const colors = FIT_COLORS[path.fit] || FIT_COLORS.medium;

                return (
                  <button
                    key={path.path}
                    onClick={() => handlePathClick(path, i)}
                    disabled={isLocked}
                    className={`relative text-left rounded-md border p-3 transition-all ${
                      isActive
                        ? `${colors.border} ${colors.bg} ring-1 ring-offset-1 ring-primary/30`
                        : isLocked
                          ? "border-foreground/5 bg-muted/10 opacity-60"
                          : `border-foreground/10 hover:border-foreground/20 hover:bg-muted/20`
                    }`}
                    data-testid={`button-path-${i}`}
                  >
                    {isLocked && (
                      <div className="absolute inset-0 rounded-md bg-background/40 backdrop-blur-[3px] flex flex-col items-center justify-center z-10 gap-1">
                        <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
                          <Lock className="h-3 w-3" />
                          Unlock with Pro
                        </span>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-sm font-medium text-foreground leading-tight">{path.path}</span>
                      <span className={`flex items-center gap-1 text-[10px] font-medium shrink-0 ${colors.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                        {FIT_LABELS[path.fit]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug mb-2">{path.why}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                      <Briefcase className="h-3 w-3" />
                      {path.jobCount} {path.jobCount === 1 ? "role" : "roles"} hiring
                    </div>
                  </button>
                );
              })}
            </div>

            {!isPro && result.recommendedPaths.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <Link href="/pricing" onClick={() => trackNow({ eventType: "pro_gate_click", entityType: "feature", metadata: { gate: "career_paths", pathCount: result.recommendedPaths.length } })}>
                  <Button variant="ghost" size="sm" className="text-xs text-primary" data-testid="button-unlock-paths">
                    <Lock className="h-3 w-3 mr-1" />
                    Unlock all {result.recommendedPaths.length} paths
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileCard({ strengths, gaps }: { strengths: StrengthItem[]; gaps: GapItem[] }) {
  return (
    <div data-testid="section-profile-card">
      <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Your profile</p>
      <div className="space-y-3">
        {strengths.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              Strengths
            </p>
            <div className="space-y-1.5">
              {strengths.map((s, i) => (
                <div key={i} className="group" data-testid={`strength-${i}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${85 - i * 10}%` }}
                      />
                    </div>
                    <span className="text-xs text-foreground min-w-0 truncate max-w-[140px]">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {gaps.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-slate-400" />
              Gaps to close
            </p>
            <div className="space-y-1.5">
              {gaps.map((g, i) => (
                <div key={i} className="group" data-testid={`gap-${i}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800/30 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-300 dark:bg-slate-600 transition-all"
                        style={{ width: `${30 + i * 10}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground min-w-0 truncate max-w-[140px]">{g.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DemoFlowchart() {
  return (
    <div className="space-y-2" data-testid="demo-flowchart">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Example career paths</p>
      <div className="grid grid-cols-2 gap-2 opacity-60">
        {DEMO_PATHS.map((path, i) => {
          const colors = FIT_COLORS[path.fit] || FIT_COLORS.medium;
          return (
            <div
              key={path.path}
              className={`rounded-md border p-2.5 ${colors.border} ${colors.bg}`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-medium text-foreground truncate">{path.path}</span>
                <span className={`flex items-center gap-1 text-[10px] shrink-0 ${colors.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                  {FIT_LABELS[path.fit]}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">{path.why}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
