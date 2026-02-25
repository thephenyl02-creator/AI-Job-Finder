import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

function getScoreColor(score: number): string {
  if (score >= 70) return "hsl(var(--status-success))";
  if (score >= 45) return "hsl(var(--status-warning))";
  return "hsl(var(--status-danger))";
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { SiLinkedin } from "react-icons/si";
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
  Upload,
  Loader2,
  Sparkles,
  User,
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
    <Card className={`border border-border/50 card-elev-static ${className}`} data-testid="chart-card">
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

  const colors = ["hsl(var(--chart-5))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

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
                <Cell key={i} fill={d.hasIt ? "hsl(var(--status-success))" : "hsl(var(--status-neutral))"} fillOpacity={d.hasIt ? 0.8 : 0.4} />
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
  const color = difficulty.label === "Easy" ? "hsl(var(--status-success))" : difficulty.label === "Moderate" ? "hsl(var(--status-warning))" : "hsl(var(--status-danger))";

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
  const color = getScoreColor(score);

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
            <Card className="border border-border/40 card-elev-static">
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

function CareerPathFlow({
  topPaths,
  readinessLadder,
  isPro,
  currentRole,
  readinessScore,
}: {
  topPaths: CareerPath[];
  readinessLadder: DiagnosticReportData["readinessLadder"];
  isPro: boolean;
  currentRole: string;
  readinessScore: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const paths = topPaths.slice(0, 3);
  const scoreColor = getScoreColor(readinessScore);

  const allRoles = [
    ...readinessLadder.ready.map((r) => ({ ...r, tierColor: "emerald" as const })),
    ...readinessLadder.nearReady.map((r) => ({ ...r, tierColor: "amber" as const })),
  ];

  const getRolesForPath = (pathName: string) => {
    const lcName = pathName.toLowerCase();
    const matched = allRoles.filter(
      (r) =>
        r.title.toLowerCase().includes(lcName.split(" ")[0].toLowerCase()) ||
        lcName.includes(r.title.toLowerCase().split(" ")[0])
    );
    if (matched.length > 0) return matched.slice(0, 2);
    return allRoles.slice(0, 2);
  };

  const fitColor = (fitLevel: string) => {
    if (fitLevel === "high") return "text-emerald-600 dark:text-emerald-400";
    if (fitLevel === "medium") return "text-amber-600 dark:text-amber-400";
    return "text-muted-foreground";
  };

  const fitBorder = (fitLevel: string) => {
    if (fitLevel === "high") return "border-emerald-500/30";
    if (fitLevel === "medium") return "border-amber-500/30";
    return "border-border/50";
  };

  const connectorOpacity = (confidence: number) => {
    if (confidence >= 70) return 0.8;
    if (confidence >= 50) return 0.5;
    return 0.3;
  };

  const connectorWidth = (confidence: number) => {
    if (confidence >= 70) return 2.5;
    if (confidence >= 50) return 1.8;
    return 1.2;
  };

  if (isMobile) {
    return (
      <div className="space-y-3" data-testid="career-path-flow">
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20" data-testid="career-flow-origin">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: scoreColor }}
              data-testid="career-flow-score"
            >
              {readinessScore}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{currentRole}</p>
            <p className="text-[10px] text-muted-foreground">Your starting point</p>
          </div>
        </div>

        {paths.map((path, i) => {
          const isLocked = !isPro && i >= 2;
          const roles = getRolesForPath(path.name);
          return (
            <div key={i} className="relative" data-testid={`career-flow-path-${i}`}>
              <div className="flex justify-center py-1">
                <svg width="2" height="24" className="text-muted-foreground/40">
                  <line x1="1" y1="0" x2="1" y2="24" stroke="currentColor" strokeWidth={connectorWidth(path.confidence)} strokeDasharray="4 3" opacity={connectorOpacity(path.confidence)} />
                </svg>
              </div>
              {path.topGaps[0] && (
                <div className="flex justify-center -mt-1 -mb-1 relative z-10">
                  <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/30" data-testid={`career-flow-gap-${i}`}>
                    {path.topGaps[0]}
                  </span>
                </div>
              )}
              <div className={`relative rounded-lg border p-3 ${fitBorder(path.fitLevel)} ${isLocked ? "select-none" : ""}`}>
                {isLocked && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-[3px] rounded-lg z-10 flex items-center justify-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    <Link href="/pricing">
                      <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" data-testid={`unlock-path-flow-${i}`}>
                        Unlock
                      </Button>
                    </Link>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${fitColor(path.fitLevel)}`}>{path.name}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{path.confidence}%</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{path.description}</p>
                {roles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {roles.slice(0, 2).map((role) => (
                      <Link key={role.jobId} href={`/jobs/${role.jobId}`}>
                        <div className="flex items-center gap-1.5 text-[10px] cursor-pointer hover:text-foreground transition-colors" data-testid={`career-flow-role-${role.jobId}`}>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${role.tierColor === "emerald" ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <span className="text-foreground/80 truncate">{role.title}</span>
                          <span className="text-muted-foreground shrink-0">@ {role.company}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const originX = 40;
  const svgH = paths.length <= 1 ? 100 : paths.length === 2 ? 160 : 220;
  const originY = svgH / 2;
  const destX = dims.w > 0 ? dims.w * 0.35 : 280;
  const ySpacing = paths.length <= 1 ? 0 : svgH / (paths.length + 1);
  const destYs = paths.map((_, i) => ySpacing * (i + 1));

  return (
    <div className="relative" ref={containerRef} data-testid="career-path-flow">
      <div className="flex items-start gap-0">
        <div className="shrink-0 flex flex-col items-center pt-2" style={{ width: "120px", marginTop: `${originY - 40}px` }} data-testid="career-flow-origin">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
              style={{ backgroundColor: scoreColor }}
              data-testid="career-flow-score"
            >
              {readinessScore}
            </div>
          </div>
          <p className="text-xs font-semibold text-foreground mt-2 text-center leading-tight max-w-[110px] truncate">{currentRole}</p>
          <p className="text-[10px] text-muted-foreground">You</p>
        </div>

        <div className="shrink-0" style={{ width: `${destX - 60}px` }}>
          <svg width="100%" height={svgH} className="overflow-visible">
            {paths.map((path, i) => {
              const startX = 0;
              const startY = originY;
              const endX = destX - 80;
              const endY = destYs[i];
              const cpX = endX * 0.5;

              return (
                <g key={i}>
                  <path
                    d={`M ${startX} ${startY} C ${cpX} ${startY}, ${cpX} ${endY}, ${endX} ${endY}`}
                    fill="none"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={connectorWidth(path.confidence)}
                    strokeDasharray={path.fitLevel === "low" ? "6 4" : "none"}
                    opacity={connectorOpacity(path.confidence)}
                    data-testid={`career-flow-connector-${i}`}
                  />
                  {path.topGaps[0] && (
                    <text
                      x={cpX}
                      y={startY + (endY - startY) * 0.5 - 6}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                      fontSize="9"
                      data-testid={`career-flow-gap-${i}`}
                    >
                      {path.topGaps[0].length > 28 ? path.topGaps[0].slice(0, 26) + "..." : path.topGaps[0]}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex-1 flex flex-col justify-center" style={{ minHeight: `${svgH}px` }}>
          <div className="space-y-3" style={{ paddingTop: `${destYs[0] - 30}px` }}>
            {paths.map((path, i) => {
              const isLocked = !isPro && i >= 2;
              const roles = getRolesForPath(path.name);
              return (
                <div key={i} className={`relative rounded-lg border p-3 ${fitBorder(path.fitLevel)} ${isLocked ? "select-none" : ""}`} data-testid={`career-flow-path-${i}`}>
                  {isLocked && (
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-[3px] rounded-lg z-10 flex items-center justify-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      <Link href="/pricing">
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" data-testid={`unlock-path-flow-${i}`}>
                          Unlock
                        </Button>
                      </Link>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${fitColor(path.fitLevel)}`}>{path.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{path.confidence}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{path.description}</p>
                  {roles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {roles.slice(0, 2).map((role) => (
                        <Link key={role.jobId} href={`/jobs/${role.jobId}`}>
                          <div className="flex items-center gap-1.5 text-[10px] cursor-pointer hover:text-foreground transition-colors" data-testid={`career-flow-role-${role.jobId}`}>
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${role.tierColor === "emerald" ? "bg-emerald-500" : "bg-amber-500"}`} />
                            <span className="text-foreground/80 truncate">{role.title}</span>
                            <span className="text-muted-foreground shrink-0">@ {role.company}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
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

interface PreviewResult {
  score: number;
  topPath: { name: string; confidence: number } | null;
  skills: string[];
  totalMatched: number;
}

function AnonymousPreview() {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: statsData } = useQuery<{ totalJobs: number }>({ queryKey: ["/api/stats"] });

  const { data: percentileData } = useQuery<{ percentile: number | null; totalAssessments: number }>({
    queryKey: [`/api/diagnostic/percentile?score=${preview?.score ?? 0}`],
    enabled: preview !== null && preview.score > 0,
  });

  const handleFile = useCallback(async (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/diagnostic/preview", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      const data: PreviewResult = await res.json();
      setPreview(data);
      try {
        localStorage.setItem("ltc_diagnostic_preview", JSON.stringify(data));
      } catch {}
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "anon_diagnostic_upload" }) }).catch(() => {});
    } catch (err: any) {
      setError(err.message || "Failed to analyze resume.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (isUploading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative flex items-center justify-center">
            <svg className="w-[120px] h-[120px] -rotate-90 animate-pulse" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * 0.7}`}
                className="animate-spin origin-center"
                style={{ animationDuration: "3s" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-foreground" data-testid="text-analyzing">Analyzing your resume</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Evaluating your skills against {statsData?.totalJobs ?? ""}+ legal tech roles. This takes about 30–60 seconds.
            </p>
          </div>
          <div className="space-y-2 max-w-xs mx-auto">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
            <Skeleton className="h-3 w-3/5 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (preview) {
    const scoreColor = getScoreColor(preview.score);
    const circumference = 2 * Math.PI * 42;
    const dashOffset = circumference - (preview.score / 100) * circumference;

    return (
      <div className="min-h-[60vh] flex flex-col items-center px-4 py-10">
        <div className="max-w-lg w-full space-y-8">
          <div className="mb-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" data-testid="button-preview-back-home">
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Button>
            </Link>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold text-muted-foreground tracking-[0.2em] uppercase mb-2">
              Your Preview Results
            </p>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight" data-testid="text-preview-title">
              Here's where you stand
            </h1>
          </div>

          <Card className="overflow-hidden" data-testid="preview-results-card">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative flex items-center justify-center shrink-0" data-testid="preview-score-ring">
                  <svg className="w-[120px] h-[120px] -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={scoreColor}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-bold text-foreground">{preview.score}</span>
                    <span className="text-[10px] text-muted-foreground">Readiness</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left">
                  {preview.topPath && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Top career path</p>
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <span className="text-base font-semibold text-foreground" data-testid="text-preview-path">{preview.topPath.name}</span>
                        <Badge variant="secondary" className="text-[10px]" data-testid="badge-preview-confidence">
                          {preview.topPath.confidence}% match
                        </Badge>
                      </div>
                    </div>
                  )}

                  {preview.skills.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Key skills detected</p>
                      <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start" data-testid="preview-skills">
                        {preview.skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground" data-testid="text-preview-matched">
                    <span className="font-semibold text-foreground">{preview.totalMatched}</span> roles matched to your profile
                  </p>

                  {percentileData?.percentile !== null && percentileData?.percentile !== undefined && (
                    <p className="text-xs text-muted-foreground" data-testid="text-preview-percentile">
                      You scored higher than <span className="font-semibold text-foreground">{percentileData.percentile}%</span> of lawyers on this platform
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 border-border/60 bg-muted/10" data-testid="preview-gate-card">
            <CardContent className="p-6 sm:p-8 text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">Your full report is ready</h3>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Sign up free to unlock your complete career diagnostic — including all career paths, detailed skill gaps, a role readiness ladder, and a personalized 30-day transition plan.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-left">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>All career paths</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Skill gap analysis</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Readiness ladder</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>30-day plan</span>
                </div>
              </div>
              <Link href="/auth?returnTo=/diagnostic">
                <Button size="lg" className="mt-2" data-testid="button-signup-unlock">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create free account
                </Button>
              </Link>
              <p className="text-[10px] text-muted-foreground">
                No credit card required
              </p>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link href="/jobs">
              <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="link-browse-jobs-preview">
                Or browse roles without signing up
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="mb-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Button>
          </Link>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-semibold text-muted-foreground tracking-[0.2em] uppercase mb-3">
            Career Diagnostic
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight" data-testid="text-anon-diagnostic-title">
            See where you fit in legal tech
          </h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
            Upload your resume — no account needed. Get your career readiness score and top matching path in about 60 seconds.
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border/60 hover:border-primary/50 hover:bg-muted/30"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          data-testid="upload-drop-zone"
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            Drop your resume here or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            PDF or DOCX · Max 5MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={onFileChange}
            data-testid="input-resume-file"
          />
        </div>

        {error && (
          <div className="text-center">
            <p className="text-sm text-destructive" data-testid="text-upload-error">{error}</p>
          </div>
        )}

        <div className="space-y-3 max-w-sm mx-auto">
          <div className="flex items-center gap-3 text-sm">
            <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-foreground">Instant readiness score across 7 skill areas</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="shrink-0 w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-foreground">Your top matching career path</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="shrink-0 w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-foreground">Your resume is never stored or shared</span>
          </div>
        </div>

        <div className="text-center pt-2 space-y-1.5">
          <p className="text-xs text-muted-foreground">
            No resume handy?{" "}
            <Link href="/quiz" className="text-primary hover:underline" data-testid="link-quiz-from-diagnostic">
              Take a quick career quiz instead →
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth?returnTo=/diagnostic" className="text-primary hover:underline" data-testid="link-sign-in">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoggedInNoResume() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const cachedPreview = (() => {
    try {
      const raw = localStorage.getItem("ltc_diagnostic_preview");
      if (raw) return JSON.parse(raw) as PreviewResult;
    } catch {}
    return null;
  })();

  const handleUpload = useCallback(async (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a PDF or DOCX file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File must be under 5MB.");
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed. Please try again.");
      }
      try { localStorage.removeItem("ltc_diagnostic_preview"); } catch {}
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostic/latest"] });
      toast({ title: "Resume uploaded", description: "Generating your career diagnostic..." });
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload resume.");
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const scoreColor = cachedPreview
    ? getScoreColor(cachedPreview.score)
    : "hsl(var(--status-neutral))";
  const circumference = 2 * Math.PI * 42;
  const dashOffset = cachedPreview ? circumference - (cachedPreview.score / 100) * circumference : circumference;

  return (
    <div className="min-h-[60vh] flex flex-col items-center px-4 py-10">
      <div className="max-w-lg w-full space-y-6">
        <div className="max-w-lg w-full mb-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {cachedPreview && (
          <>
            <div className="text-center">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-[0.2em] uppercase mb-2">
                Welcome back
              </p>
              <h1 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight" data-testid="text-cached-preview-title">
                Your preview results
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                We saved your earlier analysis. Upload your resume to your account for the full report.
              </p>
            </div>

            <Card className="overflow-hidden" data-testid="cached-preview-card">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="relative flex items-center justify-center shrink-0">
                    <svg className="w-[100px] h-[100px] -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-xl font-bold text-foreground">{cachedPreview.score}</span>
                      <span className="text-[10px] text-muted-foreground">Readiness</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                    {cachedPreview.topPath && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Top path</p>
                        <p className="text-sm font-semibold text-foreground">{cachedPreview.topPath.name}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{cachedPreview.totalMatched}</span> roles matched
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!cachedPreview && (
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight">
              Upload your resume
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Get your career readiness score, personalized skill gaps, and matching roles.
            </p>
          </div>
        )}

        <Card className={isUploading ? "pointer-events-none opacity-70" : ""} data-testid="inline-upload-card">
          <CardContent className="p-6 text-center space-y-4">
            {isUploading ? (
              <div className="py-6 space-y-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                <p className="text-sm font-medium text-foreground">Uploading your resume...</p>
                <p className="text-xs text-muted-foreground">This will just take a moment.</p>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer ${
                  isDragging ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleUpload(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                data-testid="inline-upload-zone"
              >
                <Upload className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {cachedPreview ? "Upload resume for your full report" : "Drop your resume here or click to browse"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">PDF or DOCX, up to 5MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                  data-testid="inline-upload-input"
                />
              </div>
            )}
            {uploadError && (
              <p className="text-sm text-destructive" data-testid="text-upload-error">{uploadError}</p>
            )}
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="h-3 w-3" />
              Your resume stays private. Never shared.
            </p>
          </CardContent>
        </Card>
      </div>
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

  const { data: percentileData } = useQuery<{ percentile: number | null; totalAssessments: number }>({
    queryKey: [`/api/diagnostic/percentile?score=${report?.overallReadinessScore ?? 0}`],
    enabled: !!report && report.overallReadinessScore > 0,
  });

  useEffect(() => {
    if (!report) return;
    const topPath = report.topPaths?.[0];
    const ogDescription = `I scored ${report.overallReadinessScore}/100 on my Legal Tech Career Readiness assessment.${topPath ? ` Top path: ${topPath.name}.` : ""} Check yours at Legal Tech Careers.`;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("og:title", `Career Readiness: ${report.overallReadinessScore}/100 | Legal Tech Careers`);
    setMeta("og:description", ogDescription);
    setMeta("og:url", `${window.location.origin}/diagnostic`);

    return () => {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogTitle) ogTitle.setAttribute("content", "Legal Tech Careers - Jobs for Legal Professionals in Technology");
      if (ogDesc) ogDesc.setAttribute("content", "The career platform for lawyers and legal professionals transitioning into legal technology. AI-powered job matching, resume analysis, and career guidance.");
      if (ogUrl) ogUrl.remove();
    };
  }, [report]);

  if (authLoading) return <DiagnosticSkeleton />;

  if (!isAuthenticated) {
    return <AnonymousPreview />;
  }

  if (!hasResume && !diagLoading) {
    return <LoggedInNoResume />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
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
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const topPath = report.topPaths?.[0];
                  const shareText = encodeURIComponent(
                    `I scored ${report.overallReadinessScore}/100 on my Legal Tech Career Readiness assessment.${topPath ? ` Top path: ${topPath.name}.` : ""} Check yours at Legal Tech Careers.`
                  );
                  const shareUrl = encodeURIComponent(`${window.location.origin}/diagnostic`);
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
                    "_blank",
                    "noopener,noreferrer,width=600,height=600"
                  );
                }}
                data-testid="button-share-linkedin"
              >
                <SiLinkedin className="h-3.5 w-3.5 mr-1.5" />
                Share on LinkedIn
              </Button>
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
            </>
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
          {/* Sticky Section Navigation */}
          <nav className="sticky top-0 z-50 -mx-4 px-4 py-2.5 bg-background/80 backdrop-blur-md border-b border-border/40" data-testid="section-nav">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {[
                { id: "overview", label: "Overview", icon: BarChart3 },
                { id: "skills", label: "Skills", icon: Brain },
                { id: "career-paths", label: "Career Paths", icon: TrendingUp },
                { id: "action-plan", label: "Action Plan", icon: FileText },
              ].map((section) => (
                <Button
                  key={section.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const el = document.getElementById(`section-${section.id}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  data-testid={`nav-${section.id}`}
                >
                  <section.icon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  {section.label}
                </Button>
              ))}
            </div>
          </nav>

          {/* Top Summary Row */}
          <div id="section-overview" />
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
              {percentileData?.percentile !== null && percentileData?.percentile !== undefined && (
                <p className="text-[10px] text-muted-foreground text-center" data-testid="text-diagnostic-percentile">
                  Top <span className="font-semibold text-foreground">{100 - percentileData.percentile}%</span> of lawyers assessed
                </p>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {report.readinessLadder.ready.length} Ready</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-500" /> {report.readinessLadder.nearReady.length} Near-Ready</span>
                  <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5 text-rose-500" /> {report.readinessLadder.stretch.length} Stretch</span>
                </div>
              </div>
            </div>
          </div>

          {/* Career Path Flow */}
          <div id="section-career-paths" />
          <CareerPathFlow
            topPaths={report.topPaths}
            readinessLadder={report.readinessLadder}
            isPro={isPro}
            currentRole={(resumeData as any)?.[0]?.extractedData?.experience?.[0]?.title || "Your Current Role"}
            readinessScore={report.overallReadinessScore}
          />

          {/* Charts Row */}
          <div id="section-skills" />
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
          <Card className="border-2 border-rose-500/30 bg-rose-500/5 card-elev-static" data-testid="brutal-honesty-section">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                </div>
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
          <div id="section-action-plan" />
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
          <Card className="bg-primary/5 border-primary/20 p-6 text-center card-elev-static" data-testid="diagnostic-bottom-cta">
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
