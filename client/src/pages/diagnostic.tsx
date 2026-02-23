import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  Lock,
  Zap,
  Brain,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Briefcase,
  BarChart3,
  Shield,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";
import type { DiagnosticReportData, SkillCluster, CareerPath, ReadinessRole, TransitionWeek } from "@shared/schema";

function ChartCard({ title, subtitle, info, children, className = "" }: {
  title: string;
  subtitle?: string;
  info?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`border border-border/50 shadow-sm ${className}`} data-testid="chart-card">
      <CardHeader className="pb-2 space-y-0.5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
          {info && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] text-xs">{info}</TooltipContent>
            </Tooltip>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function SkillRadarChart({ clusters }: { clusters: SkillCluster[] }) {
  const data = clusters.map(c => ({
    subject: c.name.replace("Legal ", "").replace("& ", "& \n"),
    score: c.score,
    fullMark: 100,
  }));

  return (
    <ChartCard
      title="Skill Clusters"
      subtitle="Your capabilities across 7 key areas"
      info="Each cluster is scored 0-100 based on resume evidence. Green = strength (60+), gray = gap (<40)."
    >
      <div className="w-full h-[260px]" data-testid="skill-radar-chart">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Your Skills"
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {clusters.map(c => (
          <Tooltip key={c.name}>
            <TooltipTrigger asChild>
              <Badge
                variant={c.score >= 60 ? "default" : "secondary"}
                className={`text-[10px] px-1.5 py-0 cursor-help ${c.score >= 60 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground"}`}
              >
                {c.name.replace("Legal ", "").split(" ")[0]} {c.score}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px] text-xs">
              <p className="font-semibold mb-1">{c.name}: {c.score}/100</p>
              {c.evidence.length > 0 && <p className="text-emerald-600 dark:text-emerald-400">Evidence: {c.evidence[0]}</p>}
              {c.missingSignals.length > 0 && <p className="text-amber-600 dark:text-amber-400 mt-0.5">Gap: {c.missingSignals[0]}</p>}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </ChartCard>
  );
}

function FitBreakdownChart({ breakdown }: { breakdown: DiagnosticReportData["fitBreakdown"] }) {
  const data = [
    { name: "Skills", value: breakdown.skillsMatch, weight: "35%" },
    { name: "Experience", value: breakdown.experienceMatch, weight: "30%" },
    { name: "Domain", value: breakdown.domainMatch, weight: "20%" },
    { name: "Seniority", value: breakdown.seniorityMatch, weight: "15%" },
  ];

  const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];

  return (
    <ChartCard
      title="Fit Score Breakdown"
      subtitle="What contributes to your overall score"
      info="Weighted formula: 35% Skills + 30% Experience + 20% Domain + 15% Seniority. Each component scored 0-100."
    >
      <div className="w-full h-[180px]" data-testid="fit-breakdown-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={70} />
            <RechartsTooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(value: number, _: any, entry: any) => [`${value}/100 (weight: ${entry.payload.weight})`, entry.payload.name]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i]} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function MarketDemandChart({ demand }: { demand: DiagnosticReportData["marketDemand"] }) {
  const data = demand.slice(0, 8).map(d => ({
    skill: d.skill.length > 18 ? d.skill.slice(0, 16) + "..." : d.skill,
    fullSkill: d.skill,
    count: d.demandCount,
    hasIt: d.userHasIt,
  }));

  return (
    <ChartCard
      title="Market Demand vs Your Skills"
      subtitle="Most requested skills across live roles"
      info="Skills demanded across all published jobs. Green = you have it, gray = you're missing it."
    >
      <div className="w-full h-[220px]" data-testid="market-demand-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
            <XAxis dataKey="skill" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <RechartsTooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(value: number, _: any, entry: any) => [
                `${value} jobs · ${entry.payload.hasIt ? "You have this" : "Gap — you're missing this"}`,
                entry.payload.fullSkill
              ]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={24}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.hasIt ? "#10b981" : "#94a3b8"} fillOpacity={d.hasIt ? 0.8 : 0.4} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function TransitionGauge({ difficulty }: { difficulty: DiagnosticReportData["transitionDifficulty"] }) {
  const pct = difficulty.score;
  const circumference = 2 * Math.PI * 45;
  const halfCircumference = circumference / 2;
  const dashOffset = halfCircumference - (pct / 100) * halfCircumference;
  const color = difficulty.label === "Easy" ? "#10b981" : difficulty.label === "Moderate" ? "#f59e0b" : "#ef4444";

  return (
    <ChartCard
      title="Transition Difficulty"
      info={difficulty.explanation}
    >
      <div className="flex flex-col items-center" data-testid="transition-gauge">
        <svg className="w-[140px] h-[80px]" viewBox="0 0 120 70">
          <path
            d="M 10 65 A 45 45 0 0 1 110 65"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 10 65 A 45 45 0 0 1 110 65"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={halfCircumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000"
          />
          <text x="60" y="55" textAnchor="middle" className="fill-foreground text-lg font-bold" fontSize="18">
            {pct}
          </text>
          <text x="60" y="68" textAnchor="middle" className="fill-muted-foreground" fontSize="10">
            {difficulty.label}
          </text>
        </svg>
      </div>
    </ChartCard>
  );
}

function ReadinessScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" data-testid="readiness-score-ring">
      <svg className="w-[120px] h-[120px] -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-foreground">{score}</span>
        <span className="text-[10px] text-muted-foreground">Readiness</span>
      </div>
    </div>
  );
}

function ReadinessLadder({ ladder, isPro }: {
  ladder: DiagnosticReportData["readinessLadder"];
  isPro: boolean;
}) {
  const [expandedTier, setExpandedTier] = useState<string | null>("ready");
  const tiers = [
    { key: "ready" as const, label: "Ready Now", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10 border-emerald-500/20", roles: ladder.ready },
    { key: "nearReady" as const, label: "Near-Ready (2-6 weeks)", icon: Clock, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/20", roles: ladder.nearReady },
    { key: "stretch" as const, label: "Stretch (3-6 months)", icon: Target, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-500/10 border-rose-500/20", roles: ladder.stretch },
  ];

  return (
    <div className="space-y-3" data-testid="readiness-ladder">
      {tiers.map(tier => (
        <div key={tier.key} className={`border rounded-lg overflow-hidden ${tier.bgColor}`}>
          <button
            type="button"
            className="w-full flex items-center justify-between p-3 text-left"
            onClick={() => setExpandedTier(expandedTier === tier.key ? null : tier.key)}
            data-testid={`readiness-tier-${tier.key}`}
          >
            <div className="flex items-center gap-2">
              <tier.icon className={`h-4 w-4 ${tier.color}`} />
              <span className={`text-sm font-semibold ${tier.color}`}>{tier.label}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{tier.roles.length} roles</Badge>
            </div>
            {expandedTier === tier.key ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {expandedTier === tier.key && tier.roles.length > 0 && (
            <div className="px-3 pb-3 space-y-2">
              {tier.roles.slice(0, isPro ? undefined : 2).map((role, idx) => (
                <div key={idx} className="bg-background/80 rounded-md p-2.5 border border-border/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/jobs/${role.jobId}`}>
                        <span className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-1" data-testid={`readiness-role-${role.jobId}`}>
                          {role.title}
                        </span>
                      </Link>
                      <p className="text-xs text-muted-foreground">{role.company}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{role.fitScore}% fit</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 italic">{role.whyThisTier}</p>
                  {isPro && (
                    <div className="flex gap-3 mt-1.5">
                      <div className="flex-1">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Strengths</p>
                        {role.topStrengths.slice(0, 2).map((s, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground">+ {s}</p>
                        ))}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Blockers</p>
                        {role.topBlockers.slice(0, 2).map((b, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground">- {b}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {!isPro && tier.roles.length > 2 && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-dashed border-border">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">+{tier.roles.length - 2} more {tier.key === "ready" ? "roles you qualify for" : "roles within reach"}</span>
                  <Link href="/pricing">
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary" data-testid="unlock-roles-cta">
                      See all matches
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TransitionPlan({ plan, isPro }: { plan: TransitionWeek[]; isPro: boolean }) {
  return (
    <div className="space-y-4" data-testid="transition-plan">
      {plan.map((week, weekIdx) => {
        const isLocked = !isPro && weekIdx > 0;
        return (
          <div key={week.week} className="relative">
            {isLocked && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] rounded-lg z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-1.5">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {weekIdx === 1 ? "Your next steps are ready" : `Week ${week.week} plan`}
                  </span>
                  {weekIdx === 1 && (
                    <Link href="/pricing">
                      <Button size="sm" className="h-7 text-xs mt-1" data-testid="unlock-plan-cta">
                        Unlock your 30-day plan
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
            <Card className="border border-border/40">
              <CardHeader className="pb-1.5 pt-3 px-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5">Week {week.week}</Badge>
                  <CardTitle className="text-sm font-semibold">{week.theme}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-2">
                  {week.actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-foreground font-medium">{action.task}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                          <span>{action.timeEstimate}</span>
                          <span>·</span>
                          <span className="text-primary/80">{action.skillGapAddressed}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

function DiagnosticSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-[120px] w-[120px] rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-[300px] rounded-lg" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
      <Skeleton className="h-[200px] rounded-lg" />
      <Skeleton className="h-[200px] rounded-lg" />
    </div>
  );
}

export default function DiagnosticPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: authData } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const isPro = authData?.isPro === true;

  const { data: resumeData } = useQuery<any[]>({
    queryKey: ["/api/resumes"],
    enabled: isAuthenticated,
  });

  const hasResume = (resumeData || []).length > 0;

  const { data: latestDiag, isLoading: diagLoading } = useQuery<any>({
    queryKey: ["/api/diagnostic/latest"],
    enabled: isAuthenticated && hasResume,
  });

  const runDiagnostic = useMutation({
    mutationFn: async (data?: { resumeId?: number; targetPath?: string }) => {
      const res = await apiRequest("POST", "/api/diagnostic/run", data || {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostic/latest"] });
      toast({ title: "Diagnostic complete", description: "Your career report is ready." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to generate diagnostic", variant: "destructive" });
    },
  });

  const report: DiagnosticReportData | null = latestDiag?.report || null;

  if (authLoading) return <DiagnosticSkeleton />;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full mb-4">
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="button-back-jobs">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Jobs
            </Button>
          </Link>
        </div>
        <Card className="max-w-md w-full text-center p-8">
          <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 font-serif">Career Diagnostic</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Upload your resume and get a personalized career diagnostic — including readiness scores, skill gaps, and a 30-day transition plan.
          </p>
          <Link href="/auth">
            <Button className="w-full" data-testid="button-sign-in">Sign in to get started</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!hasResume && !diagLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <Card className="max-w-md w-full text-center p-8">
          <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 font-serif">Upload your resume first</h2>
          <p className="text-sm text-muted-foreground mb-6">
            We need your resume to generate a career diagnostic. Upload one to get your readiness score, skill gaps, and a personalized 30-day plan.
          </p>
          <Link href="/resumes">
            <Button className="w-full" data-testid="button-upload-resume">Upload Resume</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="mb-1">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2" data-testid="button-back-dashboard-main">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground" data-testid="diagnostic-title">
            Career Diagnostic
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {report ? "Your personalized career intelligence report" : "Generate your career diagnostic to see where you stand"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => runDiagnostic.mutate({})}
              disabled={runDiagnostic.isPending}
              data-testid="button-rerun-diagnostic"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${runDiagnostic.isPending ? "animate-spin" : ""}`} />
              Recompute
            </Button>
          )}
          {!report && (
            <Button
              onClick={() => runDiagnostic.mutate({})}
              disabled={runDiagnostic.isPending}
              data-testid="button-run-diagnostic"
            >
              {runDiagnostic.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing your career...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Get My Diagnostic
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {runDiagnostic.isPending && <DiagnosticSkeleton />}

      {report && !runDiagnostic.isPending && (
        <>
          {/* Top Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
            <div className="flex flex-col items-center gap-2">
              <ReadinessScoreRing score={report.overallReadinessScore} />
              <p className="text-xs text-muted-foreground text-center max-w-[140px]">
                {report.overallReadinessScore >= 70
                  ? "You're in a strong position"
                  : report.overallReadinessScore >= 45
                  ? `You're ${Math.ceil((70 - report.overallReadinessScore) / 10)} improvements away from Strong Fit`
                  : "Significant gaps to address"}
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5">Top Career Paths</h3>
                <div className="space-y-2">
                  {report.topPaths.slice(0, isPro ? 3 : 1).map((path, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-md p-2.5 border border-border/30" data-testid={`career-path-${i}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{path.name}</span>
                          <Badge variant={path.fitLevel === "high" ? "default" : "secondary"} className={`text-[10px] px-1.5 py-0 ${path.fitLevel === "high" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : ""}`}>
                            {path.confidence}% match
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{path.description}</p>
                      </div>
                    </div>
                  ))}
                  {!isPro && report.topPaths.length > 1 && (
                    <div className="flex items-center gap-2 p-2 rounded-md border border-dashed border-border bg-muted/20">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">+{report.topPaths.length - 1} more career {report.topPaths.length - 1 === 1 ? "path" : "paths"} matched to you</span>
                      <Link href="/pricing">
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" data-testid="unlock-paths-cta">Explore paths</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {report.readinessLadder.ready.length} Ready</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-500" /> {report.readinessLadder.nearReady.length} Near-Ready</span>
                  <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5 text-rose-500" /> {report.readinessLadder.stretch.length} Stretch</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkillRadarChart clusters={report.skillClusters} />
            <div className="space-y-4">
              <FitBreakdownChart breakdown={report.fitBreakdown} />
              <TransitionGauge difficulty={report.transitionDifficulty} />
            </div>
          </div>

          {/* Market Demand */}
          <MarketDemandChart demand={report.marketDemand} />

          {/* Brutal Honesty */}
          <Card className="border-rose-500/20 bg-rose-500/5" data-testid="brutal-honesty-section">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <CardTitle className="text-sm font-semibold text-rose-700 dark:text-rose-400">Brutal Honesty</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.brutalHonesty.map((statement, i) => (
                <p key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="text-rose-500 font-bold shrink-0">{i + 1}.</span>
                  {statement}
                </p>
              ))}
            </CardContent>
          </Card>

          {/* Readiness Ladder */}
          <div>
            <h3 className="text-lg font-bold font-serif text-foreground mb-3" data-testid="readiness-ladder-title">Role Readiness Ladder</h3>
            <ReadinessLadder ladder={report.readinessLadder} isPro={isPro} />
          </div>

          {/* 30-Day Plan */}
          <div>
            <h3 className="text-lg font-bold font-serif text-foreground mb-1" data-testid="transition-plan-title">30-Day Transition Plan</h3>
            <p className="text-xs text-muted-foreground mb-3">Week-by-week actions tied to your skill gaps and real job requirements</p>
            <TransitionPlan plan={report.transitionPlan} isPro={isPro} />
          </div>

          {/* Bottom CTA */}
          <Card className="bg-primary/5 border-primary/20 p-6 text-center" data-testid="diagnostic-bottom-cta">
            <h3 className="text-lg font-bold font-serif text-foreground mb-2">Ready to take the next step?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {report.readinessLadder.ready.length > 0
                ? `You're ready for ${report.readinessLadder.ready.length} role${report.readinessLadder.ready.length === 1 ? "" : "s"} right now. Start applying today.`
                : report.readinessLadder.nearReady.length > 0
                ? `You're ${report.readinessLadder.nearReady.length > 1 ? "a few improvements" : "one step"} away from being market-ready. Browse matching roles now.`
                : "Your transition starts with understanding the market. Browse roles that match your background."}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/jobs">
                <Button data-testid="button-browse-matches">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Browse Matched Roles
                </Button>
              </Link>
              {!isPro && (
                <Link href="/pricing">
                  <Button variant="outline" data-testid="button-upgrade-pro">
                    <Zap className="h-4 w-4 mr-2" />
                    Unlock Full Diagnostic
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
