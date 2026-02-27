import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";
import {
  Briefcase,
  Building2,
  Globe,
  Wifi,
  TrendingUp,
  ArrowRight,
  Crown,
  Lock,
  Users,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Download,
  DollarSign,
  ChevronDown,
  MapPin,
  FileText,
  Loader2,
} from "lucide-react";

interface MarketIntelligenceData {
  overview: {
    totalJobs: number;
    totalCompanies: number;
    countriesCount: number;
    remotePercentage: number;
    newJobsThisWeek: number;
    avgSalaryMin: number | null;
    avgSalaryMax: number | null;
    medianSalaryMin: number | null;
    medianSalaryMax: number | null;
    jobsWithSalary: number;
  };
  skillsDemand: { skill: string; count: number }[];
  careerPaths: { name: string; jobCount: number; percentage: number; newThisWeek: number }[];
  salaryByPath: { name: string; medianMin: number; medianMax: number; sampleSize?: number }[];
  workMode: { remote: { count: number; percentage: number }; hybrid: { count: number; percentage: number }; onsite: { count: number; percentage: number } };
  topCompanies: { company: string; jobCount: number }[];
  geography: { countryName: string; countryCode: string; jobCount: number }[];
  seniorityDistribution: { level: string; count: number }[];
  aiIntensity: { low: { count: number; percentage: number }; medium: { count: number; percentage: number }; high: { count: number; percentage: number } };
  communityBenchmarks?: {
    avgReadiness: number;
    readinessDistribution: { bucket: string; count: number }[];
    topSkillGaps: { skill: string; count: number }[];
    topCareerPaths: { path: string; count: number }[];
  };
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const WORK_MODE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const PATH_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function formatSalary(val: number | null): string {
  if (!val) return "N/A";
  return `$${Math.round(val / 1000)}K`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-primary tracking-[0.2em] uppercase border-l-2 border-primary pl-3 -ml-3 mb-4">
      {children}
    </p>
  );
}

function SkeletonPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
          <Skeleton className="h-4 w-48 mb-4" />
          <Skeleton className="h-12 w-full max-w-md mb-4" />
          <Skeleton className="h-5 w-full max-w-lg" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-4 mb-2" />
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-7 w-56 mb-8" />
          <Skeleton className="h-[300px] w-full rounded-md" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-7 w-48 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-[250px] w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-[250px] w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function WorkModeCenterLabel({ viewBox, total }: { viewBox?: { cx: number; cy: number }; total: number }) {
  if (!viewBox) return null;
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-2xl font-bold">
        {total}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-[10px]">
        total jobs
      </text>
    </g>
  );
}

export default function MarketIntelligence() {
  usePageTitle("Market Intelligence");
  const { isAdmin } = useAuth();
  const { isPro } = useSubscription();
  const { track } = useActivityTracker();

  useEffect(() => { track({ eventType: "page_view", pagePath: "/market-intelligence" }); }, []);

  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<MarketIntelligenceData>({
    queryKey: ["/api/market-intelligence"],
  });

  useEffect(() => {
    if (!data) return;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        if (name.startsWith("og:") || name.startsWith("twitter:")) {
          el.setAttribute("property", name);
        } else {
          el.setAttribute("name", name);
        }
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    const quarter = `Q${q} ${now.getFullYear()}`;
    const desc = `${data.overview.totalJobs.toLocaleString()} active roles across ${data.overview.totalCompanies.toLocaleString()} companies in ${data.overview.countriesCount} countries. Skills, salaries, career paths, and what it means for lawyers.`;
    setMeta("description", desc);
    setMeta("og:title", `State of Legal Tech Careers — ${quarter} Hiring Report`);
    setMeta("og:description", desc);
    setMeta("og:type", "article");
    setMeta("og:url", `${window.location.origin}/market-intelligence`);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", `State of Legal Tech Careers — ${quarter} Hiring Report`);
    setMeta("twitter:description", desc);
  }, [data]);

  if (isLoading) {
    return <SkeletonPage />;
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center py-20">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-2" data-testid="text-error-title">Unable to load market data</h2>
            <p className="text-sm text-muted-foreground mb-4">Something went wrong. Please try again.</p>
            <Button onClick={() => refetch()} data-testid="button-retry">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { overview, skillsDemand = [], careerPaths = [], salaryByPath = [], workMode, topCompanies = [], geography = [], seniorityDistribution = [], aiIntensity, communityBenchmarks } = data;

  const safeRemote = workMode?.remote || { count: 0, percentage: 0 };
  const safeHybrid = workMode?.hybrid || { count: 0, percentage: 0 };
  const safeOnsite = workMode?.onsite || { count: 0, percentage: 0 };
  const safeAI = {
    low: aiIntensity?.low || { count: 0, percentage: 0 },
    medium: aiIntensity?.medium || { count: 0, percentage: 0 },
    high: aiIntensity?.high || { count: 0, percentage: 0 },
  };

  const skillsChartData = skillsDemand.slice(0, 10).map((s) => ({
    name: s.skill.length > 22 ? s.skill.slice(0, 20) + "\u2026" : s.skill,
    count: s.count,
  }));

  const workModeTotal = safeRemote.count + safeHybrid.count + safeOnsite.count;
  const workModeData = [
    { name: "Remote", value: safeRemote.count, pct: safeRemote.percentage },
    { name: "Hybrid", value: safeHybrid.count, pct: safeHybrid.percentage },
    { name: "On-site", value: safeOnsite.count, pct: safeOnsite.percentage },
  ];

  const seniorityChartData = seniorityDistribution.map((s) => ({
    name: s.level,
    count: s.count,
  }));

  const aiMax = Math.max(safeAI.low.count, safeAI.medium.count, safeAI.high.count, 1);

  const salaryVisible = isPro ? salaryByPath : salaryByPath.slice(0, 3);
  const salaryBlurred = !isPro && salaryByPath.length > 3;
  const salaryMax = Math.max(...(salaryByPath.length > 0 ? salaryByPath.map((s) => s.medianMax || 0) : [0]), 1);

  const triggerDownload = (url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "");
    link.setAttribute("target", "_self");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async (period: string) => {
    track({ eventType: "mi_report_download", metadata: { period } });
    setDownloading(true);
    try {
      triggerDownload(`/api/market-intelligence/report?period=${period}`);
      toast({ title: "Report downloading", description: `Your ${period} report is being prepared.` });
    } catch (err: any) {
      console.error("Download failed:", err);
      toast({ title: "Download failed", description: err.message || "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleDocxDownload = async (period: string) => {
    setDownloading(true);
    try {
      triggerDownload(`/api/admin/market-intelligence/docx?period=${period}`);
      toast({ title: "Word draft downloading", description: `Your ${period} Word draft is being prepared.` });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-10 sm:pb-14" data-testid="section-hero">
          <SectionLabel>Market Intelligence</SectionLabel>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
            <div>
              <h1 className="text-3xl sm:text-[2.75rem] font-serif font-medium text-foreground leading-[1.3] mb-4" data-testid="text-mi-title">
                State of Legal Tech Careers
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl leading-relaxed" data-testid="text-mi-subtitle">
                Live data from {overview.totalJobs} roles across {overview.totalCompanies} companies, updated daily.
              </p>
            </div>
            {isAdmin ? (
              <div className="flex gap-2 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2" disabled={downloading} data-testid="button-download-report">
                      {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Download Report
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>PDF Report</DropdownMenuLabel>
                    {(["weekly", "monthly", "annual"] as const).map(p => (
                      <DropdownMenuItem
                        key={p}
                        onClick={() => handleDownload(p)}
                        data-testid={`menu-download-${p}`}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {p.charAt(0).toUpperCase() + p.slice(1)} Report
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2" disabled={downloading} data-testid="button-admin-actions">
                      {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      Word Draft
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDocxDownload("weekly")} data-testid="menu-docx-weekly">
                      <FileText className="h-4 w-4 mr-2" />
                      Weekly Briefing (.docx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDocxDownload("monthly")} data-testid="menu-docx-monthly">
                      <FileText className="h-4 w-4 mr-2" />
                      Monthly Report (.docx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDocxDownload("annual")} data-testid="menu-docx-annual">
                      <FileText className="h-4 w-4 mr-2" />
                      Annual Report (.docx)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : isPro ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 shrink-0" disabled={downloading} data-testid="button-download-report">
                    {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {downloading ? "Downloading..." : "Download Report"}
                    {!downloading && <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(["weekly", "monthly", "annual"] as const).map(p => (
                    <DropdownMenuItem
                      key={p}
                      onClick={() => handleDownload(p)}
                      data-testid={`menu-download-${p}`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {p.charAt(0).toUpperCase() + p.slice(1)} Report
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/pricing">
                <Button variant="outline" className="gap-2 shrink-0" data-testid="button-upgrade-download">
                  <Lock className="h-4 w-4" />
                  Pro Feature
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                </Button>
              </Link>
            )}
          </div>
        </section>

        <section className="border-t border-border/30" data-testid="section-key-stats">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="bg-primary/5 dark:bg-primary/10 border-primary/10" data-testid="stat-total-jobs">
                <CardContent className="p-4">
                  <Briefcase className="h-4 w-4 text-primary mb-2" />
                  <p className="text-2xl font-bold text-foreground tabular-nums">{overview.totalJobs}</p>
                  <p className="text-xs text-muted-foreground">Total jobs</p>
                </CardContent>
              </Card>
              <Card className="bg-chart-2/5 dark:bg-chart-2/10 border-chart-2/10" data-testid="stat-companies">
                <CardContent className="p-4">
                  <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <p className="text-2xl font-bold text-foreground tabular-nums">{overview.totalCompanies}</p>
                  <p className="text-xs text-muted-foreground">Companies</p>
                </CardContent>
              </Card>
              <Card className="bg-chart-3/5 dark:bg-chart-3/10 border-chart-3/10" data-testid="stat-countries">
                <CardContent className="p-4">
                  <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400 mb-2" />
                  <p className="text-2xl font-bold text-foreground tabular-nums">{overview.countriesCount}</p>
                  <p className="text-xs text-muted-foreground">Countries</p>
                </CardContent>
              </Card>
              <Card className="bg-chart-4/5 dark:bg-chart-4/10 border-chart-4/10" data-testid="stat-remote">
                <CardContent className="p-4">
                  <Wifi className="h-4 w-4 text-violet-600 dark:text-violet-400 mb-2" />
                  <p className="text-2xl font-bold text-foreground tabular-nums">{overview.remotePercentage}%</p>
                  <p className="text-xs text-muted-foreground">Remote</p>
                </CardContent>
              </Card>
              <Card className="bg-chart-5/5 dark:bg-chart-5/10 border-chart-5/10" data-testid="stat-new-this-week">
                <CardContent className="p-4">
                  <TrendingUp className="h-4 w-4 text-rose-600 dark:text-rose-400 mb-2" />
                  <p className="text-2xl font-bold text-foreground tabular-nums">{overview.newJobsThisWeek}</p>
                  <p className="text-xs text-muted-foreground">New this week</p>
                </CardContent>
              </Card>
              <Card className="bg-chart-1/5 dark:bg-chart-1/10 border-chart-1/10" data-testid="stat-salary-data">
                <CardContent className="p-4">
                  <DollarSign className="h-4 w-4 text-sky-600 dark:text-sky-400 mb-2" />
                  <p className="text-2xl font-bold text-foreground tabular-nums">{overview.jobsWithSalary}</p>
                  <p className="text-xs text-muted-foreground">With salary</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t border-border/30" data-testid="section-skills">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
            <SectionLabel>Skills in Demand</SectionLabel>
            <h2 className="text-xl sm:text-2xl font-serif font-medium text-foreground mb-8 sm:mb-10" data-testid="text-skills-title">
              Most requested skills
            </h2>
            {skillsChartData.length > 0 ? (
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillsChartData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={200} tickFormatter={(value: string) => value.length > 28 ? value.slice(0, 26) + '…' : value} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 13 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22} name="Job count">
                      {skillsChartData.map((_, index) => (
                        <Cell key={`skill-cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No skills data available.</p>
            )}
          </div>
        </section>

        {careerPaths.length > 0 && (
          <section className="border-t border-border/30 bg-muted/20" data-testid="section-career-paths">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
              <SectionLabel>Career Paths</SectionLabel>
              <h2 className="text-xl sm:text-2xl font-serif font-medium text-foreground mb-8 sm:mb-10" data-testid="text-career-paths-title">
                Where the roles are
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {careerPaths.map((cp, i) => (
                  <Card key={cp.name} className="hover-elevate overflow-visible relative" data-testid={`card-path-${cp.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ backgroundColor: PATH_COLORS[i % PATH_COLORS.length] }} />
                    <CardContent className="p-4 sm:p-5 pl-5 sm:pl-6">
                      <h3 className="text-sm font-semibold text-foreground mb-2 leading-snug">{cp.name}</h3>
                      <p className="text-2xl font-semibold text-foreground tabular-nums" data-testid={`text-path-count-${cp.name.toLowerCase().replace(/\s+/g, "-")}`}>
                        {cp.jobCount}
                      </p>
                      <p className="text-xs text-muted-foreground">{cp.percentage}% of all roles</p>
                      {cp.newThisWeek > 0 && (
                        <Badge variant="secondary" className="mt-2 text-[10px] no-default-active-elevate bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                          +{cp.newThisWeek} new this week
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {salaryByPath.length > 0 && (
          <section className="border-t border-border/30" data-testid="section-salary">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
              <SectionLabel>Salary Insights</SectionLabel>
              <h2 className="text-xl sm:text-2xl font-serif font-medium text-foreground mb-2" data-testid="text-salary-title">
                Compensation by career path
              </h2>
              <p className="text-sm text-muted-foreground mb-8 sm:mb-10">
                Median salary ranges based on {overview.jobsWithSalary} listings with disclosed compensation.
              </p>
              <div className="space-y-5">
                {salaryVisible.map((sp) => {
                  const minPct = salaryMax > 0 ? ((sp.medianMin || 0) / salaryMax) * 100 : 0;
                  const maxPct = salaryMax > 0 ? ((sp.medianMax || 0) / salaryMax) * 100 : 0;
                  const rangePct = maxPct - minPct;
                  return (
                    <div key={sp.name} data-testid={`salary-path-${sp.name.toLowerCase().replace(/\s+/g, "-")}`}>
                      <div className="flex items-center justify-between gap-4 mb-1.5">
                        <span className="text-sm text-foreground font-medium">{sp.name}</span>
                        <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                          {formatSalary(sp.medianMin)} – {formatSalary(sp.medianMax)}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden relative">
                        <div
                          className="absolute h-full rounded-full bg-primary/30"
                          style={{ left: `${minPct}%`, width: `${Math.max(rangePct, 2)}%` }}
                        />
                        <div
                          className="absolute h-full rounded-full bg-primary"
                          style={{ left: `${minPct}%`, width: `${Math.max(rangePct * 0.6, 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {salaryBlurred && (
                <div className="relative mt-6">
                  <div className="space-y-5 blur-sm select-none pointer-events-none opacity-50">
                    {salaryByPath.slice(3, 6).map((sp) => {
                      const minPct = salaryMax > 0 ? ((sp.medianMin || 0) / salaryMax) * 100 : 0;
                      const maxPct = salaryMax > 0 ? ((sp.medianMax || 0) / salaryMax) * 100 : 0;
                      const rangePct = maxPct - minPct;
                      return (
                        <div key={sp.name}>
                          <div className="flex items-center justify-between gap-4 mb-1.5">
                            <span className="text-sm text-foreground font-medium">{sp.name}</span>
                            <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                              {formatSalary(sp.medianMin)} – {formatSalary(sp.medianMax)}
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden relative">
                            <div
                              className="absolute h-full rounded-full bg-primary/30"
                              style={{ left: `${minPct}%`, width: `${Math.max(rangePct, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-md">
                    <div className="text-center">
                      <Lock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground mb-1">Full salary data</p>
                      <p className="text-xs text-muted-foreground mb-3 max-w-xs">
                        Upgrade to Pro to see salary ranges for all career paths.
                      </p>
                      <Link href="/pricing">
                        <Button size="sm" className="gap-1.5" data-testid="button-salary-upgrade">
                          <Crown className="h-3.5 w-3.5" />
                          Upgrade to Pro
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="border-t border-border/30 bg-muted/20" data-testid="section-work-mode-ai">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
            <div className="grid md:grid-cols-2 gap-8 sm:gap-12">
              <div>
                <SectionLabel>Work Mode</SectionLabel>
                <h2 className="text-xl sm:text-2xl font-serif font-medium text-foreground mb-8 sm:mb-10" data-testid="text-work-mode-title">
                  How teams work
                </h2>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workModeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        dataKey="value"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {workModeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={WORK_MODE_COLORS[index]} />
                        ))}
                        <Label content={<WorkModeCenterLabel total={workModeTotal} />} position="center" />
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 13 }}
                        formatter={(value: number, name: string) => [`${value} jobs`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-2 flex-wrap">
                  {workModeData.map((wm, i) => (
                    <div key={wm.name} className="flex items-center gap-2" data-testid={`work-mode-${wm.name.toLowerCase().replace(/\s+/g, "-")}`}>
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: WORK_MODE_COLORS[i] }} />
                      <span className="text-sm text-foreground">{wm.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{wm.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>AI Intensity</SectionLabel>
                <h2 className="text-xl sm:text-2xl font-serif font-medium text-foreground mb-8 sm:mb-10" data-testid="text-ai-title">
                  AI in job requirements
                </h2>
                <div className="space-y-6">
                  {[
                    { label: "Low", data: safeAI.low, color: "bg-emerald-500 dark:bg-emerald-400" },
                    { label: "Medium", data: safeAI.medium, color: "bg-amber-500 dark:bg-amber-400" },
                    { label: "High", data: safeAI.high, color: "bg-rose-500 dark:bg-rose-400" },
                  ].map(({ label, data: d, color }) => (
                    <div key={label} data-testid={`ai-intensity-${label.toLowerCase()}`}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm text-foreground font-medium">{label}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-foreground tabular-nums">{d.count}</span>
                          <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{d.percentage}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
                          style={{ width: `${Math.max(4, (d.count / aiMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Based on AI-related keywords in job descriptions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {seniorityDistribution.length > 0 && (
          <section className="border-t border-border/30" data-testid="section-seniority">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
              <SectionLabel>Seniority Landscape</SectionLabel>
              <h2 className="text-xl sm:text-2xl font-serif font-medium text-foreground mb-8 sm:mb-10" data-testid="text-seniority-title">
                Experience levels in demand
              </h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seniorityChartData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 13 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36} name="Jobs">
                      {seniorityChartData.map((entry, index) => {
                        const isEntry = ["Intern", "Fellowship", "Entry", "Junior"].includes(entry.name);
                        return <Cell key={`cell-${index}`} fill={isEntry ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))"} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Entry-level bands highlighted.
              </p>
            </div>
          </section>
        )}

        <section className="border-t border-border/30 bg-muted/20" data-testid="section-companies-geography">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
            <div className="grid md:grid-cols-2 gap-8 sm:gap-12">
              <div>
                <SectionLabel>Top Hiring Companies</SectionLabel>
                <h2 className="text-xl sm:text-2xl font-serif font-medium text-foreground mb-8 sm:mb-10" data-testid="text-companies-title">
                  Who's hiring the most
                </h2>
                <div className="space-y-2.5">
                  {topCompanies.slice(0, 10).map((c, i) => (
                    <Card key={c.company} className="overflow-visible" data-testid={`company-row-${i}`}>
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary shrink-0">
                            <span className="text-xs font-bold tabular-nums">{i + 1}</span>
                          </div>
                          <span className="text-sm text-foreground truncate">{c.company}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs tabular-nums shrink-0 no-default-active-elevate">{c.jobCount}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>Where They're Hiring</SectionLabel>
                <h2 className="text-xl sm:text-2xl font-serif font-medium text-foreground mb-8 sm:mb-10" data-testid="text-geography-title">
                  Top hiring countries
                </h2>
                <div className="space-y-2.5">
                  {geography.slice(0, 10).map((g, i) => (
                    <Card key={g.countryCode} className="overflow-visible" data-testid={`geography-row-${i}`}>
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/10 dark:bg-amber-400/10 shrink-0">
                            {g.countryCode === "WW" ? (
                              <Wifi className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <MapPin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <span className="text-sm text-foreground truncate">{g.countryName}</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{g.jobCount}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>


        {communityBenchmarks && (
          <section className="border-t border-border/30 bg-muted/20" data-testid="section-community">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
              <SectionLabel>Community Pulse</SectionLabel>
              <h2 className="text-xl sm:text-2xl font-serif font-medium text-foreground mb-2" data-testid="text-community-title">
                How the community stacks up
              </h2>
              <p className="text-sm text-muted-foreground mb-8 sm:mb-10">
                Aggregated insights from career diagnostic assessments.
              </p>

              {isPro ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Average Readiness
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6">
                        <div className="relative flex items-center justify-center shrink-0">
                          <svg className="w-[80px] h-[80px] -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                            <circle
                              cx="50" cy="50" r="42" fill="none"
                              stroke={communityBenchmarks.avgReadiness >= 60 ? "hsl(var(--status-success))" : communityBenchmarks.avgReadiness >= 40 ? "hsl(var(--status-warning))" : "hsl(var(--status-danger))"}
                              strokeWidth="6" strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 42}`}
                              strokeDashoffset={`${2 * Math.PI * 42 - (communityBenchmarks.avgReadiness / 100) * 2 * Math.PI * 42}`}
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-xl font-bold text-foreground" data-testid="text-avg-readiness">{Math.round(communityBenchmarks.avgReadiness)}</span>
                            <span className="text-[8px] text-muted-foreground">/ 100</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {communityBenchmarks.readinessDistribution.map((b) => (
                            <div key={b.bucket} className="flex items-center justify-between gap-3 text-xs" data-testid={`readiness-bucket-${b.bucket}`}>
                              <span className="text-muted-foreground">{b.bucket}</span>
                              <span className="text-foreground font-medium tabular-nums">{b.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        Top Skill Gaps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {communityBenchmarks.topSkillGaps.slice(0, 6).map((sg) => (
                          <div key={sg.skill} className="flex items-center justify-between gap-3 text-sm" data-testid={`skill-gap-${sg.skill.toLowerCase().replace(/\s+/g, "-")}`}>
                            <span className="text-foreground truncate">{sg.skill}</span>
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0">{sg.count} users</span>
                          </div>
                        ))}
                      </div>
                      {communityBenchmarks.topCareerPaths.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/30">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Most popular paths</p>
                          <div className="flex flex-wrap gap-1.5">
                            {communityBenchmarks.topCareerPaths.slice(0, 4).map((cp) => (
                              <Badge key={cp.path} variant="outline" className="text-xs no-default-active-elevate" data-testid={`popular-path-${cp.path.toLowerCase().replace(/\s+/g, "-")}`}>
                                {cp.path}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="relative">
                  <div className="grid sm:grid-cols-2 gap-6 blur-sm select-none pointer-events-none opacity-50">
                    <Card>
                      <CardContent className="p-6">
                        <Skeleton className="h-[120px] w-full" />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <Skeleton className="h-[120px] w-full" />
                      </CardContent>
                    </Card>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-md">
                    <div className="text-center">
                      <Lock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground mb-1">Community benchmarks</p>
                      <p className="text-xs text-muted-foreground mb-3 max-w-xs">
                        See how your readiness compares to the community, top skill gaps, and popular career paths.
                      </p>
                      <Link href="/pricing">
                        <Button size="sm" className="gap-1.5" data-testid="button-community-upgrade">
                          <Crown className="h-3.5 w-3.5" />
                          Upgrade to Pro
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="border-t border-border/30" data-testid="section-cta">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24 text-center">
            <h2 className="text-xl sm:text-3xl font-serif font-medium text-foreground mb-4" data-testid="text-cta-title">
              Ready to find out where you fit?
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
              Upload your resume and get a personalized career readiness report in under 90 seconds.
            </p>
            <Button size="lg" asChild data-testid="button-cta-diagnostic">
              <Link href="/diagnostic">
                Check Your Fit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
