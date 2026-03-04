import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  ArrowRight, TrendingUp,
  ChevronRight, Briefcase,
  Brain, Clock, CheckCircle,
  Upload, Sparkles,
  RefreshCw, Zap,
} from "lucide-react";
import { ProGate } from "@/components/pro-gate";

interface DashboardData {
  activityMetrics: {
    period: { jobViews: number; searches: number; applyClicks: number; pageViews: number; filterChanges: number };
    allTime: { jobViews: number; searches: number; applyClicks: number };
    currentStreak: number;
    activeDaysInPeriod: number;
  };
  dailyActivity: { date: string; count: number; types: string }[];
  patterns: { topCategories: { name: string; count: number }[]; topCompanies: { name: string; count: number }[]; recentSearches: string[] };
  readiness: {
    hasResume: boolean; resumeCount: number; hasBuiltResume: boolean; builtResumeCount: number;
    hasActiveAlerts: boolean; activeAlertsCount: number; hasPersona: boolean;
    savedJobsCount: number; expiringSoonCount: number; score: number;
  };
  marketAlignment: { category: string; availableJobs: number }[];
  totalActiveJobs: number;
  persona: { topCategories: string[] | null; topSkills: string[] | null; careerStage: string | null; engagementLevel: string | null; summary: string | null } | null;
  recommendations: { type: string; title: string; description: string; action: string; priority: number }[];
}

interface MarketPulseData {
  newJobsThisWeek: number;
  topHiringCompanies: { name: string; count: number }[];
  trendingSkill: { name: string; count: number } | null;
  workModeSplit: { remote: number; hybrid: number; onsite: number };
  totalJobs: number;
  salaryInsight: { category: string; avgMin: number; avgMax: number } | null;
}

interface DiagnosticReport {
  readinessScore: number;
  readinessTier: string;
  careerPaths?: { pathName: string; matchScore: number; tier: string }[];
  topPaths?: { title: string; confidence: number; whyFit: string }[];
  skillClusters: { name: string; score: number }[];
  transitionPlan?: { week: number; theme: string; actions: { task: string; timeEstimate: string; deliverable: string; skillGapAddressed: string }[] }[];
  readinessLadder?: { ready: { jobId: number; title: string; company: string; tier: string; fitScore: number }[] };
}

interface DiagnosticData {
  report: DiagnosticReport | null;
  reportId: number;
  createdAt: string;
  overallReadinessScore: number;
}


function ReadinessRing({ score, size = "lg" }: { score: number; size?: "lg" | "sm" }) {
  const isLg = size === "lg";
  const radius = isLg ? 52 : 36;
  const svgSize = isLg ? 120 : 88;
  const center = svgSize / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 70) return "hsl(var(--status-success))";
    if (score >= 40) return "hsl(var(--status-warning))";
    return "hsl(var(--status-neutral))";
  };

  return (
    <div className="relative inline-flex items-center justify-center" data-testid="readiness-ring">
      <svg className="transform -rotate-90" width={svgSize} height={svgSize}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={isLg ? 7 : 5} className="text-muted/30" />
        <circle cx={center} cy={center} r={radius} fill="none" stroke={getColor()} strokeWidth={isLg ? 7 : 5}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-bold text-foreground ${isLg ? "text-3xl" : "text-xl"}`}>{score}</span>
        <span className={`text-muted-foreground ${isLg ? "text-xs" : "text-[10px]"}`}>Ready</span>
      </div>
    </div>
  );
}

function getCurrentWeek(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(4, Math.max(1, Math.ceil((diffDays + 1) / 7)));
}

const stepColors = [
  "bg-primary text-primary-foreground",
  "bg-chart-2 text-white dark:text-black",
  "bg-chart-3 text-white dark:text-black",
  "bg-chart-4 text-white dark:text-black",
];

function DashboardSkeleton() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-56 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="space-y-6">
            <Card className="card-elev-static"><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
            <Card className="card-elev-static"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          </div>
        </div>
      </main>
    </>
  );
}

export default function DashboardPage() {
  usePageTitle("Career Command Center");
  const { track } = useActivityTracker();
  const { isPro } = useSubscription();
  const { user } = useAuth();

  useEffect(() => { track({ eventType: "page_view", pagePath: "/dashboard" }); }, []);

  const { data: dashData, isLoading: dashLoading, error: dashError } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard?days=30"],
    refetchInterval: 30000,
  });

  const { data: rawDiagnostic } = useQuery<DiagnosticData>({
    queryKey: ["/api/diagnostic/latest"],
  });

  const { data: marketPulse } = useQuery<MarketPulseData>({
    queryKey: ["/api/market-pulse"],
    refetchInterval: 60000,
  });

  const { data: recentJobsData } = useQuery<{ jobs: { id: number; title: string; company: string; location: string; workMode: string; roleCategory: string; seniorityLevel: string }[] }>({
    queryKey: ["/api/jobs?limit=3&sort=newest"],
  });

  const diagnosticReport = rawDiagnostic?.report || null;
  const hasResumes = (dashData?.readiness?.resumeCount ?? 0) > 0;
  const hasDiagnostic = !!diagnosticReport && hasResumes;
  const readinessScore = diagnosticReport?.readinessScore ?? rawDiagnostic?.overallReadinessScore ?? 0;
  const diagnosticCreatedAt = rawDiagnostic?.createdAt;
  const currentWeek = diagnosticCreatedAt ? getCurrentWeek(diagnosticCreatedAt) : 1;
  const planComplete = currentWeek > 4 || (diagnosticCreatedAt && getCurrentWeek(diagnosticCreatedAt) > 4);

  if (dashLoading) return <DashboardSkeleton />;

  if (dashError || !dashData) {
    return (
      <div className="overflow-x-hidden">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <p className="text-muted-foreground">Could not load your dashboard.</p>
            <Link href="/jobs">
              <Button variant="outline" data-testid="button-browse-jobs-fallback">Browse Jobs</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { readiness } = dashData;

  const topPath = diagnosticReport?.topPaths?.[0] || diagnosticReport?.careerPaths?.[0];
  const topPathName = (topPath as any)?.title || (topPath as any)?.pathName || null;
  const topPathConfidence = (topPath as any)?.confidence || (topPath as any)?.matchScore || null;

  const transitionPlan = diagnosticReport?.transitionPlan || [];
  const currentWeekPlan = transitionPlan.find(w => w.week === currentWeek);

  const topReadyJob = diagnosticReport?.readinessLadder?.ready?.[0] || null;

  const weekProgress = currentWeek / 4;

  return (
    <div className="overflow-x-hidden">
      <Header />
      <main className="container mx-auto px-4 py-8 sm:py-10 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground" data-testid="text-dashboard-title">
              {user?.firstName ? `Welcome back, ${user.firstName}` : "Welcome back"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1.5" data-testid="text-dashboard-subtitle">
              {!hasDiagnostic
                ? "Ready to discover where you fit in legal tech?"
                : marketPulse && marketPulse.newJobsThisWeek > 0
                  ? `${marketPulse.newJobsThisWeek} new matching roles this week`
                  : "Here's your personalized career intelligence"}
            </p>
          </div>

          {!hasDiagnostic && (
            <>
              <Card className="mb-8 border-dashed card-elev-prominent" data-testid="card-diagnostic-cta">
                <CardContent className="p-6 sm:p-10">
                  <div className="flex flex-col items-center text-center gap-5">
                    <div className="p-5 rounded-md bg-primary/10 text-primary">
                      <Sparkles className="h-10 w-10" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-2">Get your career roadmap</h2>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Upload your resume and see where you fit in 60 seconds. Get your readiness score, matching career paths, and a personalized transition plan.
                      </p>
                    </div>
                    <Link href={readiness.hasResume ? "/diagnostic" : "/resumes"}>
                      <Button size="lg" className="gap-2" data-testid="button-start-diagnostic-cta">
                        <Upload className="h-4 w-4" />
                        {readiness.hasResume ? "Run Diagnostic" : "Upload Resume"}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {recentJobsData?.jobs && recentJobsData.jobs.length > 0 && (
                <div data-testid="section-new-this-week">
                  <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <h2 className="text-base font-semibold text-foreground">New this week</h2>
                    </div>
                    <Link href="/jobs">
                      <Button variant="ghost" size="sm" className="text-xs text-primary gap-1" data-testid="button-see-all-jobs">
                        See all jobs <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {recentJobsData.jobs.slice(0, 3).map((job) => (
                      <Link key={job.id} href={`/jobs/${job.id}`}>
                        <Card className="card-elev-interactive cursor-pointer h-full" data-testid={`card-recent-job-${job.id}`}>
                          <CardContent className="p-4">
                            <p className="text-sm font-medium text-foreground line-clamp-2 mb-1" title={job.title}>{job.title}</p>
                            <p className="text-xs text-muted-foreground mb-2 truncate" title={job.company}>{job.company}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {job.roleCategory && <Badge variant="secondary" className="text-[10px]" title={job.roleCategory}>{job.roleCategory}</Badge>}
                              {job.workMode && <Badge variant="outline" className="text-[10px]" title={job.workMode}>{job.workMode}</Badge>}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {hasDiagnostic && (
            <>
              <Card className="mb-6 card-elev-prominent" data-testid="card-readiness-score">
                <CardContent className="p-5 sm:p-7">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <ReadinessRing score={readinessScore} size="lg" />
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <h2 className="text-lg font-semibold text-foreground mb-1">Your Readiness Score</h2>
                      {topPathName && (
                        <p className="text-sm text-muted-foreground mb-3" title={topPathName}>
                          Top path: <span className="font-medium text-foreground">{topPathName}</span>
                          {topPathConfidence && <span> · {topPathConfidence}% match</span>}
                        </p>
                      )}
                      {diagnosticReport?.skillClusters && diagnosticReport.skillClusters.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                          {diagnosticReport.skillClusters.slice(0, 4).map((skill, idx) => {
                            const dotColors = ["bg-primary", "bg-chart-2", "bg-chart-3", "bg-chart-4"];
                            return (
                              <Badge key={skill.name} variant="secondary" className="text-xs gap-1.5" title={`${skill.name}: ${skill.score}`}>
                                <span className={`inline-block h-2 w-2 rounded-full ${dotColors[idx % dotColors.length]}`} />
                                {skill.name}: {skill.score}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <Link href="/diagnostic" className="shrink-0">
                      <Button variant="outline" size="sm" className="gap-1" data-testid="button-view-full-report">
                        Full report
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6 card-elev-static" data-testid="card-this-week">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-chart-4/10 text-chart-4">
                        <Zap className="h-4 w-4" />
                      </div>
                      This Week
                    </CardTitle>
                    {!planComplete && transitionPlan.length > 0 && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="flex gap-0.5 sm:gap-1">
                          {[1, 2, 3, 4].map((w) => (
                            <div
                              key={w}
                              className={`h-1.5 sm:h-2 w-4 sm:w-7 rounded-full transition-colors ${
                                w < currentWeek
                                  ? "bg-gradient-to-r from-primary to-chart-2"
                                  : w === currentWeek
                                  ? "bg-primary/50"
                                  : "bg-muted"
                              }`}
                              data-testid={`progress-week-${w}`}
                            />
                          ))}
                        </div>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs font-semibold">
                          W{currentWeek}<span className="hidden sm:inline">/4</span> · {Math.round(weekProgress * 100)}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {transitionPlan.length > 0 ? (
                    planComplete ? (
                      <div className="flex flex-col items-center gap-3 py-5 text-center">
                        <div className="p-3 rounded-full bg-green-500/10">
                          <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                        <div>
                          <p className="text-base font-medium text-foreground">Plan complete</p>
                          <p className="text-sm text-muted-foreground mt-1">Run a fresh diagnostic to get updated recommendations</p>
                        </div>
                        <Link href="/diagnostic">
                          <Button size="sm" className="gap-1" data-testid="button-fresh-diagnostic">
                            <RefreshCw className="h-3 w-3" />
                            New Diagnostic
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {currentWeekPlan && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                              {currentWeekPlan.theme}
                            </p>
                            <div className="space-y-3">
                              {(isPro || currentWeek === 1 ? currentWeekPlan.actions : currentWeekPlan.actions.slice(0, 1)).map((action, i) => (
                                <div key={i} className="flex items-start gap-3 p-3.5 rounded-md bg-muted/30" data-testid={`task-week-${currentWeek}-${i}`}>
                                  <div className="mt-0.5 shrink-0">
                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${stepColors[i % stepColors.length]}`}>
                                      {i + 1}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">{action.task}</p>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {action.timeEstimate}
                                      </span>
                                      {action.skillGapAddressed && (
                                        <Badge variant="outline" className="text-[10px]" title={action.skillGapAddressed}>
                                          {action.skillGapAddressed}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!isPro && currentWeek > 1 && (
                          <ProGate
                            mode="blur"
                            feature="Weeks 2-4 Action Plan"
                            description="Upgrade to Pro for the full transition plan."
                          >
                            <div className="space-y-2">
                              <div className="h-14 bg-muted/20 rounded-md" />
                              <div className="h-14 bg-muted/20 rounded-md" />
                            </div>
                          </ProGate>
                        )}

                        {topReadyJob && (
                          <Link href={`/jobs/${topReadyJob.jobId}`}>
                            <div className="flex items-center gap-3 p-3.5 rounded-md bg-muted/30 hover-elevate cursor-pointer" data-testid="link-top-ready-role">
                              <div className="p-1.5 rounded-md bg-primary/10">
                                <Briefcase className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate" title={topReadyJob.title}>{topReadyJob.title}</p>
                                <p className="text-xs text-muted-foreground truncate" title={`${topReadyJob.company} · ${topReadyJob.fitScore}% fit`}>{topReadyJob.company} · {topReadyJob.fitScore}% fit</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </Link>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-5 text-center">
                      <p className="text-sm text-muted-foreground">No transition plan available. Run a new diagnostic for an updated plan.</p>
                      <Link href="/diagnostic">
                        <Button size="sm" variant="outline" data-testid="button-rerun-diagnostic">Run Diagnostic</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {recentJobsData?.jobs && recentJobsData.jobs.length > 0 && (
                <div className="mb-6" data-testid="section-new-this-week">
                  <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <h2 className="text-base font-semibold text-foreground">New this week</h2>
                    </div>
                    <Link href="/jobs">
                      <Button variant="ghost" size="sm" className="text-xs text-primary gap-1" data-testid="button-see-all-jobs">
                        See all jobs <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {recentJobsData.jobs.slice(0, 3).map((job) => (
                      <Link key={job.id} href={`/jobs/${job.id}`}>
                        <Card className="card-elev-interactive cursor-pointer h-full" data-testid={`card-recent-job-${job.id}`}>
                          <CardContent className="p-4">
                            <p className="text-sm font-medium text-foreground line-clamp-2 mb-1" title={job.title}>{job.title}</p>
                            <p className="text-xs text-muted-foreground mb-2 truncate" title={job.company}>{job.company}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {job.roleCategory && <Badge variant="secondary" className="text-[10px]" title={job.roleCategory}>{job.roleCategory}</Badge>}
                              {job.workMode && <Badge variant="outline" className="text-[10px]" title={job.workMode}>{job.workMode}</Badge>}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {isPro && marketPulse && (
                <Card className="mb-6 card-elev-static" data-testid="card-market-pulse-summary">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-md bg-chart-1/10 text-chart-1">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <h2 className="text-base font-semibold text-foreground">Market Pulse</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div data-testid="text-pulse-new-roles">
                        <p className="text-2xl font-bold text-foreground tabular-nums">{marketPulse.newJobsThisWeek}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">new roles this week</p>
                      </div>
                      <div data-testid="text-pulse-top-hiring">
                        <p className="text-sm font-semibold text-foreground truncate" title={marketPulse.topHiringCompanies?.[0]?.name || "N/A"}>
                          {marketPulse.topHiringCompanies?.[0]?.name || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">top hiring company</p>
                      </div>
                      <div data-testid="text-pulse-trending">
                        <p className="text-sm font-semibold text-foreground truncate" title={marketPulse.trendingSkill?.name || "N/A"}>
                          {marketPulse.trendingSkill?.name || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">trending skill</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!isPro && (
                <ProGate
                  compact
                  feature="Full Career Dashboard"
                  description="Upgrade to Pro for market pulse, full action plans, salary data, and more."
                />
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
