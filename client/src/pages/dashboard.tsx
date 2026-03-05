import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { formatSalary } from "@/lib/format-salary";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileText, Bell, Bookmark, ArrowRight, TrendingUp,
  Building2, ChevronRight, Briefcase,
  Brain, Target, Wifi, Clock, CheckCircle,
  Upload, Search, Map, DollarSign, Sparkles,
  RefreshCw, Zap, Flame, BarChart3, Globe, Eye, Mail,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProGate } from "@/components/pro-gate";

interface RecentlyViewedJob {
  id: number;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string | null;
  roleCategory: string | null;
  viewedAt: string;
}

interface NewSinceLastVisit {
  count: number;
  jobs: { id: number; title: string; company: string; companyLogo: string | null; roleCategory: string | null; postedDate: string }[];
}

interface DailyBriefing {
  newMatchCount: number;
  topNewJob: { id: number; title: string; company: string; category: string } | null;
  returningCompany: string | null;
  pipelineCount: number;
  streakDays: number;
}

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
  recentlyViewed?: RecentlyViewedJob[];
  newSinceLastVisit?: NewSinceLastVisit;
  briefing?: DailyBriefing;
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

function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-1.5 w-full rounded-full bg-muted/40 overflow-hidden ${className || ""}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function getWelcomeSubtitle(dashData: DashboardData | undefined, marketData: MarketPulseData | undefined, hasDiagnostic: boolean) {
  if (!dashData) return "Loading your career intelligence...";
  if (!hasDiagnostic && !dashData.readiness.hasResume) return "Ready to start your career diagnostic?";
  if (!hasDiagnostic && dashData.readiness.hasResume) return "Upload your resume for a personalized career roadmap";
  if (marketData && marketData.newJobsThisWeek > 0) {
    return `You have ${marketData.newJobsThisWeek} new matching roles this week`;
  }
  return "Here's your personalized career intelligence";
}

function getCurrentWeek(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(4, Math.max(1, Math.ceil((diffDays + 1) / 7)));
}

function getStreakLabel(streak: number): string {
  if (streak >= 7) return "On Fire";
  if (streak >= 3) return "Building";
  if (streak >= 1) return "Active";
  return "Start Today";
}

function getEngagementColor(level: string | null | undefined): string {
  switch (level) {
    case "Power User": return "text-green-600 dark:text-green-400";
    case "Active": return "text-blue-600 dark:text-blue-400";
    case "Casual": return "text-amber-600 dark:text-amber-400";
    default: return "text-muted-foreground";
  }
}

function getEngagementBg(level: string | null | undefined): string {
  switch (level) {
    case "Power User": return "bg-green-500/10 text-green-700 dark:text-green-300";
    case "Active": return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "Casual": return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default: return "bg-muted/40 text-muted-foreground";
  }
}

const heroCardConfigs = [
  { bg: "bg-primary/[0.08] dark:bg-primary/[0.15]", accent: "bg-primary", iconBg: "bg-primary/15 text-primary" },
  { bg: "bg-chart-2/[0.08] dark:bg-chart-2/[0.15]", accent: "bg-chart-2", iconBg: "bg-chart-2/15 text-chart-2" },
  { bg: "bg-chart-3/[0.08] dark:bg-chart-3/[0.15]", accent: "bg-chart-3", iconBg: "bg-chart-3/15 text-chart-3" },
  { bg: "bg-chart-4/[0.08] dark:bg-chart-4/[0.15]", accent: "bg-chart-4", iconBg: "bg-chart-4/15 text-chart-4" },
];

const stepColors = [
  "bg-primary text-primary-foreground",
  "bg-chart-2 text-white dark:text-black",
  "bg-chart-3 text-white dark:text-black",
  "bg-chart-4 text-white dark:text-black",
];

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function DashboardSkeleton() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-56 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8 sm:mb-10">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="card-elev-static"><CardContent className="p-3.5 sm:p-6"><Skeleton className="h-28 w-full" /></CardContent></Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2">
              <Card className="card-elev-static"><CardContent className="p-4 sm:p-6"><Skeleton className="h-56 w-full" /></CardContent></Card>
            </div>
            <div className="space-y-4 sm:space-y-5">
              <Card className="card-elev-static"><CardContent className="p-4 sm:p-5"><Skeleton className="h-28 w-full" /></CardContent></Card>
              <Card className="card-elev-static"><CardContent className="p-4 sm:p-5"><Skeleton className="h-28 w-full" /></CardContent></Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

interface EmailPrefs {
  weeklyDigest: boolean;
  alertEmails: boolean;
}

function EmailPreferencesCard() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: emailPrefs, isLoading } = useQuery<EmailPrefs>({
    queryKey: ["/api/user/email-preferences"],
  });

  const mutation = useMutation({
    mutationFn: async (prefs: Partial<EmailPrefs>) => {
      const res = await apiRequest("PATCH", "/api/user/email-preferences", prefs);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/email-preferences"] });
      toast({ title: "Preferences updated" });
    },
    onError: () => {
      toast({ title: "Failed to update preferences", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card className="card-elev-static" data-testid="card-email-preferences">
        <CardContent className="p-4 sm:p-5">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elev-static" data-testid="card-email-preferences">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-chart-4/10 text-chart-4">
            <Mail className="h-3.5 w-3.5" />
          </div>
          <p className="text-sm font-semibold text-foreground">Email Notifications</p>
        </div>

        {user?.email && (
          <p className="text-xs text-muted-foreground mb-3 truncate" data-testid="text-email-address">{user.email}</p>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-foreground">Weekly Digest</p>
              <p className="text-xs text-muted-foreground">Top new roles + market pulse every Sunday</p>
            </div>
            <Switch
              checked={emailPrefs?.weeklyDigest ?? true}
              onCheckedChange={(checked) => mutation.mutate({ weeklyDigest: checked })}
              disabled={mutation.isPending}
              data-testid="switch-weekly-digest"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-foreground">Job Alert Emails</p>
              <p className="text-xs text-muted-foreground">Get emailed when alerts match new jobs</p>
            </div>
            <Switch
              checked={emailPrefs?.alertEmails ?? true}
              onCheckedChange={(checked) => mutation.mutate({ alertEmails: checked })}
              disabled={mutation.isPending}
              data-testid="switch-alert-emails"
            />
          </div>
        </div>
      </CardContent>
    </Card>
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
    enabled: !isPro,
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

  const { readiness, activityMetrics } = dashData;

  const topPath = diagnosticReport?.topPaths?.[0] || diagnosticReport?.careerPaths?.[0];
  const topPathName = (topPath as any)?.title || (topPath as any)?.pathName || null;
  const topPathConfidence = (topPath as any)?.confidence || (topPath as any)?.matchScore || null;

  const transitionPlan = diagnosticReport?.transitionPlan || [];
  const currentWeekPlan = transitionPlan.find(w => w.week === currentWeek);

  const topReadyJob = diagnosticReport?.readinessLadder?.ready?.[0] || null;

  const remotePercent = marketPulse ? Math.round(
    (marketPulse.workModeSplit.remote / Math.max(1, marketPulse.workModeSplit.remote + marketPulse.workModeSplit.hybrid + marketPulse.workModeSplit.onsite)) * 100
  ) : 0;

  const topAlignedCategory = dashData.marketAlignment?.[0];
  const streak = activityMetrics?.currentStreak ?? 0;

  const weekProgress = currentWeek / 4;

  return (
    <div className="overflow-x-hidden">
      <Header />
      <main className="container mx-auto px-4 py-8 sm:py-10 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground" data-testid="text-dashboard-title">
              {user?.firstName ? `Welcome back, ${user.firstName}` : "Welcome back"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1.5" data-testid="text-dashboard-subtitle">
              {getWelcomeSubtitle(dashData, marketPulse, hasDiagnostic)}
            </p>
          </div>

          {dashData.newSinceLastVisit && dashData.newSinceLastVisit.count > 0 && (
            <Link href="/jobs?sort=newest">
              <div className="mb-6 sm:mb-8 flex items-center gap-2.5 p-3 sm:p-4 rounded-md bg-primary/[0.06] dark:bg-primary/[0.12] hover-elevate cursor-pointer" data-testid="banner-new-since-last-visit">
                <div className="p-1.5 rounded-md bg-primary/15 text-primary shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  <span className="font-bold tabular-nums" data-testid="text-new-jobs-count">{dashData.newSinceLastVisit.count}</span>
                  {" "}new {dashData.newSinceLastVisit.count === 1 ? "job" : "jobs"} since your last visit
                </p>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
              </div>
            </Link>
          )}

          {dashData.briefing && (
            <Card className="mb-6 sm:mb-8 border-primary/20 dark:border-primary/30 card-elev-static" data-testid="card-daily-briefing">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-md bg-chart-2/15 text-chart-2">
                    <Zap className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Today's Briefing</h3>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {dashData.briefing.newMatchCount > 0 ? (
                    <p data-testid="text-briefing-matches">
                      <span className="font-medium text-foreground">{dashData.briefing.newMatchCount}</span> new{" "}
                      {dashData.briefing.topNewJob ? dashData.briefing.topNewJob.category : "legal tech"} role{dashData.briefing.newMatchCount !== 1 ? "s" : ""} today
                      {dashData.briefing.topNewJob && (
                        <span> — <Link href={`/jobs/${dashData.briefing.topNewJob.id}`} className="text-primary hover:underline">{dashData.briefing.topNewJob.company}</Link> is hiring</span>
                      )}
                    </p>
                  ) : (
                    <p data-testid="text-briefing-quiet">No new matches today — market is quiet</p>
                  )}
                  {dashData.briefing.returningCompany && (
                    <p data-testid="text-briefing-returning">
                      <Building2 className="h-3.5 w-3.5 inline mr-1 text-chart-3" />
                      <span className="font-medium text-foreground">{dashData.briefing.returningCompany}</span> is hiring again
                    </p>
                  )}
                  {dashData.briefing.pipelineCount > 0 && (
                    <p data-testid="text-briefing-pipeline">
                      <Target className="h-3.5 w-3.5 inline mr-1 text-chart-4" />
                      You're tracking <Link href="/pipeline" className="font-medium text-primary hover:underline">{dashData.briefing.pipelineCount} application{dashData.briefing.pipelineCount !== 1 ? "s" : ""}</Link>
                    </p>
                  )}
                  {dashData.briefing.streakDays > 2 && (
                    <p data-testid="text-briefing-streak">
                      <Flame className="h-3.5 w-3.5 inline mr-1 text-orange-500" />
                      <span className="font-medium text-foreground">{dashData.briefing.streakDays}-day streak</span> — keep it going!
                    </p>
                  )}
                </div>
                {dashData.briefing.newMatchCount > 0 && (
                  <Link href={`/jobs${dashData.briefing.topNewJob ? `?category=${encodeURIComponent(dashData.briefing.topNewJob.category)}` : "?sort=newest"}`}>
                    <Button size="sm" variant="outline" className="mt-3 gap-1.5 text-xs" data-testid="button-see-new-matches">
                      See new matches <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8 sm:mb-10">
            <Card className={`card-elev-prominent ${heroCardConfigs[0].bg} overflow-visible`} data-testid="card-hero-readiness">
              <CardContent className="p-3.5 sm:p-6">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                  <div className={`p-1 sm:p-1.5 rounded-md ${heroCardConfigs[0].iconBg}`}>
                    <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide">Readiness</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  {hasDiagnostic ? (
                    <>
                      <ReadinessRing score={readinessScore} size="sm" />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {readinessScore >= 70 ? "Strong" : readinessScore >= 40 ? "Growing" : "Getting Started"}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-md bg-primary/10">
                        <Sparkles className="h-7 w-7 text-primary" />
                      </div>
                      <p className="text-xs font-medium text-foreground text-center mt-1">Get Your Score</p>
                      <Link href={readiness.hasResume ? "/diagnostic" : "/resumes"}>
                        <Button size="sm" className="gap-1" data-testid="button-start-diagnostic">
                          <Upload className="h-3 w-3" />
                          Start
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={`card-elev-prominent ${heroCardConfigs[3].bg} overflow-visible`} data-testid="card-hero-streak">
              <CardContent className="p-3.5 sm:p-6">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                  <div className={`p-1 sm:p-1.5 rounded-md ${heroCardConfigs[3].iconBg}`}>
                    <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide">Activity</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl sm:text-4xl font-bold text-foreground tabular-nums" data-testid="text-streak-count">
                    {streak}
                  </p>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">day streak</span>
                </div>
                <p className={`text-xs font-semibold mt-1.5 ${streak >= 3 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                  {getStreakLabel(streak)}
                </p>
              </CardContent>
            </Card>

            {isPro && (
              <>
                <Card className={`card-elev-prominent ${heroCardConfigs[1].bg} overflow-visible`} data-testid="card-hero-active-jobs">
                  <CardContent className="p-3.5 sm:p-6">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                      <div className={`p-1 sm:p-1.5 rounded-md ${heroCardConfigs[1].iconBg}`}>
                        <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide">Active Jobs</span>
                    </div>
                    <p className="text-2xl sm:text-4xl font-bold text-foreground tabular-nums" data-testid="text-active-jobs-count">
                      {marketPulse?.totalJobs ?? dashData.totalActiveJobs}
                    </p>
                    {marketPulse && marketPulse.newJobsThisWeek > 0 && (
                      <Badge variant="secondary" className="text-[10px] mt-1.5 sm:mt-2 w-fit">
                        +{marketPulse.newJobsThisWeek} this week
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                <Card className={`card-elev-prominent ${heroCardConfigs[2].bg} overflow-visible`} data-testid="card-hero-top-path">
                  <CardContent className="p-3.5 sm:p-6">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                      <div className={`p-1 sm:p-1.5 rounded-md ${heroCardConfigs[2].iconBg}`}>
                        <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide">Top Path</span>
                    </div>
                    {topPathName ? (
                      <>
                        <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight line-clamp-2" data-testid="text-top-path-name" title={topPathName}>
                          {topPathName}
                        </p>
                        {topPathConfidence && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-1.5">{topPathConfidence}% match</p>
                        )}
                        {topAlignedCategory && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 sm:mt-1">
                            {topAlignedCategory.availableJobs} roles available
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-xs sm:text-sm text-muted-foreground">Run diagnostic</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">to discover your path</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div className="mb-8 sm:mb-10" data-testid="section-recently-viewed">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">Recently Viewed</h2>
              </div>
              {dashData.recentlyViewed && dashData.recentlyViewed.length > 0 && (
                <Link href="/jobs">
                  <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="button-browse-more-jobs">
                    Browse jobs <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
            {dashData.recentlyViewed && dashData.recentlyViewed.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin" data-testid="list-recently-viewed">
                {dashData.recentlyViewed.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <Card className="card-elev-interactive cursor-pointer min-w-[200px] max-w-[220px] snap-start shrink-0" data-testid={`card-recently-viewed-${job.id}`}>
                      <CardContent className="p-3.5">
                        <div className="flex items-start gap-2.5 mb-2">
                          <Avatar className="h-8 w-8 shrink-0 rounded-md">
                            {job.companyLogo ? (
                              <AvatarImage src={job.companyLogo} alt={job.company} />
                            ) : null}
                            <AvatarFallback className="rounded-md text-[10px] font-medium">
                              {job.company.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight" title={job.title} data-testid={`text-viewed-title-${job.id}`}>{job.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate" title={job.company} data-testid={`text-viewed-company-${job.id}`}>{job.company}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          {job.roleCategory && (
                            <Badge variant="secondary" className="text-[10px]" data-testid={`badge-viewed-category-${job.id}`}>{job.roleCategory}</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5" data-testid={`text-viewed-time-${job.id}`}>
                            <Clock className="h-2.5 w-2.5" />
                            {relativeTime(job.viewedAt)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-no-recently-viewed">No recently viewed jobs yet. Start exploring to see your history here.</p>
            )}
          </div>

          {!hasDiagnostic && (
            <Card className="mb-8 sm:mb-10 border-dashed card-elev-static" data-testid="card-diagnostic-cta">
              <CardContent className="p-5 sm:p-9">
                <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                  <div className="p-4 rounded-md bg-primary/10 text-primary shrink-0">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-foreground mb-1.5">Get your career roadmap</h2>
                    <p className="text-sm text-muted-foreground">
                      Upload your resume and see where you fit in 60 seconds. Get your readiness score, matching career paths, and a personalized transition plan.
                    </p>
                  </div>
                  <Link href={readiness.hasResume ? "/diagnostic" : "/resumes"}>
                    <Button className="gap-1.5 shrink-0" data-testid="button-start-diagnostic-cta">
                      <Upload className="h-4 w-4" />
                      {readiness.hasResume ? "Run Diagnostic" : "Upload Resume"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {!isPro && recentJobsData?.jobs && recentJobsData.jobs.length > 0 && (
            <div className="mb-8 sm:mb-10" data-testid="section-new-this-week">
              <div className="flex items-center justify-between mb-4">
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

          {!isPro && (
            <ProGate
              mode="blur"
              feature="Full Career Dashboard"
              description="Upgrade to Pro to unlock your complete career command center with market pulse, career snapshot, weekly action plan, activity insights, and more."
              highlights={[
                "Market Pulse with hiring trends & salary data",
                "Career Snapshot with skill clusters",
                "Weekly Action Plan (all 4 weeks)",
                "Market alignment & activity patterns",
                "Daily activity chart & recommendations",
                "Top hiring companies & trending skills",
              ]}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-10">
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                  <Card className="card-elev-static">
                    <CardContent className="p-4 sm:p-6">
                      <div className="space-y-4">
                        <div className="h-6 w-32 bg-muted/40 rounded" />
                        <div className="h-14 bg-muted/20 rounded-md" />
                        <div className="h-14 bg-muted/20 rounded-md" />
                        <div className="h-14 bg-muted/20 rounded-md" />
                      </div>
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                    {[...Array(4)].map((_, i) => (
                      <Card key={i} className="card-elev-static">
                        <CardContent className="p-4 sm:p-5">
                          <div className="h-24 bg-muted/20 rounded" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 sm:space-y-6">
                  <Card className="card-elev-static">
                    <CardContent className="p-4 sm:p-5">
                      <div className="h-28 bg-muted/20 rounded" />
                    </CardContent>
                  </Card>
                  <Card className="card-elev-static">
                    <CardContent className="p-4 sm:p-5">
                      <div className="h-28 bg-muted/20 rounded" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ProGate>
          )}

          {isPro && hasDiagnostic && (
            <Card className="mb-8 sm:mb-10 card-elev-prominent" data-testid="card-career-snapshot">
              <CardContent className="p-4 sm:p-7">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-primary to-chart-3 hidden sm:block shrink-0" />
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <Brain className="h-4 w-4" />
                      </div>
                      <h2 className="text-lg font-semibold text-foreground">Career Snapshot</h2>
                    </div>
                    {topPathName && (
                      <p className="text-sm text-muted-foreground mb-4" title={`Top path: ${topPathName}${topPathConfidence ? ` · ${topPathConfidence}% confidence` : ""}`}>
                        Top path: <span className="font-medium text-foreground">{topPathName}</span>
                        {topPathConfidence && <span> · {topPathConfidence}% confidence</span>}
                      </p>
                    )}
                    {diagnosticReport?.skillClusters && diagnosticReport.skillClusters.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        {diagnosticReport.skillClusters.slice(0, 5).map((skill, idx) => {
                          const dotColors = ["bg-primary", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
                          return (
                            <Badge key={skill.name} variant="secondary" className={`text-xs gap-1.5 py-1 ${idx >= 3 ? "hidden sm:inline-flex" : ""}`} title={`${skill.name}: ${skill.score}`}>
                              <span className={`inline-block h-2 w-2 rounded-full ${dotColors[idx % dotColors.length]}`} />
                              {skill.name}: {skill.score}
                            </Badge>
                          );
                        })}
                        {diagnosticReport.skillClusters.length > 3 && (
                          <Badge variant="outline" className="text-xs py-1 sm:hidden" title={`${diagnosticReport.skillClusters.length - 3} more skills`}>
                            +{Math.min(diagnosticReport.skillClusters.slice(0, 5).length - 3, diagnosticReport.skillClusters.length - 3)} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row sm:flex-col gap-5 shrink-0">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums" data-testid="text-saved-jobs-count">{readiness.savedJobsCount}</p>
                      <p className="text-xs text-muted-foreground">Saved</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums" data-testid="text-alerts-count">{readiness.activeAlertsCount}</p>
                      <p className="text-xs text-muted-foreground">Alerts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums" data-testid="text-resume-count">{readiness.resumeCount}</p>
                      <p className="text-xs text-muted-foreground">Resumes</p>
                    </div>
                  </div>
                  <Link href="/diagnostic">
                    <Button variant="outline" size="sm" className="gap-1 shrink-0" data-testid="button-view-full-report">
                      View full report
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {isPro && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-10">
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              <Card className="card-elev-static" data-testid="card-this-week">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-chart-4/10 text-chart-4">
                        <Zap className="h-4 w-4" />
                      </div>
                      This Week
                    </CardTitle>
                    {hasDiagnostic && !planComplete && transitionPlan.length > 0 && (
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
                  {hasDiagnostic && transitionPlan.length > 0 ? (
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

                        {marketPulse && marketPulse.newJobsThisWeek > 0 && (
                          <Link href="/jobs">
                            <div className="flex items-center gap-3 p-3.5 rounded-md bg-muted/30 hover-elevate cursor-pointer" data-testid="link-new-matching-roles">
                              <div className="p-1.5 rounded-md bg-green-500/10">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              </div>
                              <p className="text-sm text-foreground flex-1">
                                <span className="font-medium">{marketPulse.newJobsThisWeek} new roles</span> match your profile this week
                              </p>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </Link>
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
                  ) : hasDiagnostic ? (
                    <div className="flex flex-col items-center gap-3 py-5 text-center">
                      <p className="text-sm text-muted-foreground">No transition plan available. Run a new diagnostic for an updated plan.</p>
                      <Link href="/diagnostic">
                        <Button size="sm" variant="outline" data-testid="button-rerun-diagnostic">Run Diagnostic</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col items-center gap-3 py-3 text-center">
                        <div className="p-3 rounded-md bg-muted/40">
                          <Brain className="h-6 w-6 text-muted-foreground/60" />
                        </div>
                        <p className="text-sm text-muted-foreground">Upload your resume to get a personalized weekly action plan</p>
                        <Link href={readiness.hasResume ? "/diagnostic" : "/resumes"}>
                          <Button size="sm" data-testid="button-get-action-plan">
                            {readiness.hasResume ? "Run Diagnostic" : "Upload Resume"}
                          </Button>
                        </Link>
                      </div>
                      {marketPulse && (
                        <div className="space-y-2 pt-3 border-t">
                          {marketPulse.newJobsThisWeek > 0 && (
                            <div className="flex items-center gap-3 p-2.5">
                              <div className="p-1.5 rounded-md bg-green-500/10">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{marketPulse.newJobsThisWeek}</span> new roles added this week
                              </p>
                            </div>
                          )}
                          {marketPulse.topHiringCompanies?.[0] && (
                            <div className="flex items-center gap-3 p-2.5">
                              <div className="p-1.5 rounded-md bg-chart-1/10">
                                <Building2 className="h-4 w-4 text-chart-1" />
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground" title={marketPulse.topHiringCompanies[0].name}>{marketPulse.topHiringCompanies[0].name}</span> is hiring the most
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div>
                <h2 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-chart-1/10 text-chart-1">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  Market Pulse
                </h2>

                {marketPulse ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                    <Card className="card-elev-static hover-elevate" data-testid="card-pulse-new-roles">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">New This Week</p>
                            <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">{marketPulse.newJobsThisWeek}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">roles added</p>
                          </div>
                          <div className="p-2.5 rounded-md bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400">
                            <TrendingUp className="h-5 w-5" />
                          </div>
                        </div>
                        {marketPulse.totalJobs > 0 && (
                          <div className="mt-3">
                            <ProgressBar value={marketPulse.newJobsThisWeek} max={marketPulse.totalJobs} />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="card-elev-static hover-elevate" data-testid="card-pulse-top-hiring">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Top Hiring</p>
                            <p className="text-lg sm:text-xl font-bold text-foreground truncate" title={marketPulse.topHiringCompanies?.[0]?.name || "N/A"}>
                              {marketPulse.topHiringCompanies?.[0]?.name || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {marketPulse.topHiringCompanies?.[0]?.count || 0} open roles
                            </p>
                          </div>
                          <div className="p-2.5 rounded-md bg-chart-1/10 dark:bg-chart-1/20 text-chart-1">
                            <Building2 className="h-5 w-5" />
                          </div>
                        </div>
                        {marketPulse.topHiringCompanies?.[0] && marketPulse.totalJobs > 0 && (
                          <div className="mt-3">
                            <ProgressBar value={marketPulse.topHiringCompanies[0].count} max={marketPulse.totalJobs} />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="card-elev-static hover-elevate" data-testid="card-pulse-trending-skill">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Most In-Demand</p>
                            <p className="text-lg sm:text-xl font-bold text-foreground truncate" title={marketPulse.trendingSkill?.name || "N/A"}>
                              {marketPulse.trendingSkill?.name || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {marketPulse.trendingSkill?.count || 0} mentions
                            </p>
                          </div>
                          <div className="p-2.5 rounded-md bg-chart-3/10 dark:bg-chart-3/20 text-chart-3">
                            <Target className="h-5 w-5" />
                          </div>
                        </div>
                        {marketPulse.trendingSkill && marketPulse.totalJobs > 0 && (
                          <div className="mt-3">
                            <ProgressBar value={marketPulse.trendingSkill.count} max={marketPulse.totalJobs} />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="card-elev-static hover-elevate" data-testid="card-pulse-remote">
                      {isPro ? (
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Remote</p>
                              <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">{remotePercent}%</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">of all roles</p>
                            </div>
                            <div className="p-2.5 rounded-md bg-chart-2/10 dark:bg-chart-2/20 text-chart-2">
                              <Wifi className="h-5 w-5" />
                            </div>
                          </div>
                          <div className="mt-3">
                            <ProgressBar value={remotePercent} max={100} />
                          </div>
                        </CardContent>
                      ) : (
                        <CardContent className="p-5">
                          <ProGate mode="blur" feature="Remote %" description="Upgrade to Pro for work mode insights.">
                            <div className="h-20" />
                          </ProGate>
                        </CardContent>
                      )}
                    </Card>

                    {isPro ? (
                      <>
                        {marketPulse.salaryInsight && (
                          <Card className="card-elev-static hover-elevate" data-testid="card-pulse-salary">
                            <CardContent className="p-4 sm:p-5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Avg Salary</p>
                                  <p className="text-lg sm:text-xl font-bold text-foreground truncate" title={formatSalary(marketPulse.salaryInsight.avgMin, marketPulse.salaryInsight.avgMax) ?? undefined}>
                                    {formatSalary(marketPulse.salaryInsight.avgMin, marketPulse.salaryInsight.avgMax)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 truncate" title={marketPulse.salaryInsight.category}>
                                    {marketPulse.salaryInsight.category}
                                  </p>
                                </div>
                                <div className="p-2.5 rounded-md bg-chart-4/10 dark:bg-chart-4/20 text-chart-4">
                                  <DollarSign className="h-5 w-5" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <Card className="card-elev-static hover-elevate" data-testid="card-pulse-total">
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Total Active</p>
                                <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">{marketPulse.totalJobs}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">open positions</p>
                              </div>
                              <div className="p-2.5 rounded-md bg-chart-5/10 dark:bg-chart-5/20 text-chart-5">
                                <Globe className="h-5 w-5" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <Card className="card-elev-static">
                        <CardContent className="p-5">
                          <ProGate mode="blur" feature="Salary & Total" description="Upgrade to Pro for salary data.">
                            <div className="h-20" />
                          </ProGate>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                    {[...Array(4)].map((_, i) => (
                      <Card key={i} className="card-elev-static"><CardContent className="p-4 sm:p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <Card className="card-elev-static" data-testid="card-saved-jobs-sidebar">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-chart-4/10 text-chart-4">
                        <Bookmark className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Saved Jobs</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{readiness.savedJobsCount}</Badge>
                      {readiness.expiringSoonCount > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                          {readiness.expiringSoonCount} expiring
                        </Badge>
                      )}
                    </div>
                  </div>
                  {readiness.savedJobsCount > 0 && readiness.expiringSoonCount > 0 && (
                    <div className="mb-3 p-2.5 rounded-md bg-destructive/10 dark:bg-destructive/20">
                      <p className="text-xs text-destructive-foreground dark:text-red-300 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {readiness.expiringSoonCount} job{readiness.expiringSoonCount > 1 ? "s" : ""} expiring soon
                      </p>
                    </div>
                  )}
                  <Link href="/saved-jobs">
                    <Button variant="outline" size="sm" className="w-full gap-1" data-testid="button-view-saved-jobs">
                      View Saved Jobs
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="card-elev-static" data-testid="card-alerts-sidebar">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-chart-2/10 text-chart-2">
                        <Bell className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Active Alerts</p>
                    </div>
                    <Badge variant={readiness.activeAlertsCount > 0 ? "secondary" : "outline"}>
                      {readiness.activeAlertsCount}
                    </Badge>
                  </div>
                  {readiness.activeAlertsCount === 0 && (
                    <p className="text-xs text-muted-foreground mb-3">Set up alerts to get notified about new roles</p>
                  )}
                  <Link href="/alerts">
                    <Button variant="outline" size="sm" className="w-full gap-1" data-testid="button-manage-alerts">
                      {readiness.activeAlertsCount > 0 ? "Manage Alerts" : "Create Alert"}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="card-elev-static" data-testid="card-engagement-sidebar">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-chart-3/10 text-chart-3">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Engagement</p>
                    </div>
                    <Badge className={`text-[10px] font-semibold no-default-hover-elevate no-default-active-elevate ${getEngagementBg(dashData.persona?.engagementLevel)}`}>
                      {dashData.persona?.engagementLevel || "New"}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">Jobs viewed</span>
                        <span className="text-xs font-semibold text-foreground tabular-nums">{activityMetrics.period.jobViews}</span>
                      </div>
                      <ProgressBar value={activityMetrics.period.jobViews} max={Math.max(activityMetrics.period.jobViews, 20)} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">Searches</span>
                        <span className="text-xs font-semibold text-foreground tabular-nums">{activityMetrics.period.searches}</span>
                      </div>
                      <ProgressBar value={activityMetrics.period.searches} max={Math.max(activityMetrics.period.searches, 10)} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">Apply clicks</span>
                        <span className="text-xs font-semibold text-foreground tabular-nums">{activityMetrics.period.applyClicks}</span>
                      </div>
                      <ProgressBar value={activityMetrics.period.applyClicks} max={Math.max(activityMetrics.period.applyClicks, 5)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elev-static" data-testid="card-quick-links">
                <CardContent className="p-4 sm:p-5">
                  <p className="text-sm font-semibold text-foreground mb-3">Quick Links</p>
                  <div className="space-y-1.5">
                    {[
                      { label: "Browse Jobs", href: "/jobs", icon: Search, color: "bg-primary/10 text-primary" },
                      { label: "Run Diagnostic", href: "/diagnostic", icon: Brain, color: "bg-chart-3/10 text-chart-3" },
                      { label: "My Resumes", href: "/resumes", icon: FileText, color: "bg-chart-2/10 text-chart-2" },
                      { label: "Opportunity Map", href: "/opportunity-map", icon: Map, color: "bg-chart-4/10 text-chart-4" },
                    ].map((link) => (
                      <Link href={link.href} key={link.label}>
                        <div className="flex items-center gap-2.5 p-2.5 rounded-md hover-elevate cursor-pointer" data-testid={`link-quick-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          <div className={`p-1.5 rounded-md ${link.color}`}>
                            <link.icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm text-foreground">{link.label}</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <EmailPreferencesCard />
            </div>
          </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
