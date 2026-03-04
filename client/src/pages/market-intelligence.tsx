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
  Cell,
  LineChart,
  Line,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  Treemap,
} from "recharts";
import { ProGate } from "@/components/pro-gate";
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
  ChevronDown,
  MapPin,
  FileText,
  Loader2,
  Shield,
  Target,
  GraduationCap,
  ArrowUpRight,
  Wrench,
  CheckCircle,
  Filter,
  Database,
} from "lucide-react";
import {
  TRACK_COLORS,
  getCategoryColor,
  getTrackForCategory,
  GENERIC_PALETTE,
  WORK_MODE_PALETTE,
  SHARED_TOOLTIP_STYLE,
  accessibilityLabel,
} from "@/lib/chart-theme";
import { ROLE_TRACKS } from "@shared/schema";

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
  hardSkillsDemand?: { skill: string; count: number }[];
  softSkillsDemand?: { skill: string; count: number }[];
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

interface DataQualityData {
  curation: {
    totalScreened: number;
    totalPublished: number;
    passRate: number;
    totalRejected: number;
    rejectedPct: number;
    totalInReview: number;
    inReviewPct: number;
    filterCategories: number;
    uniqueCompanies: number;
    uniqueSources: number;
    activeInventory: number;
  };
  quality: {
    avgQualityScore: number;
    avgRelevanceScore: number;
    qualityTiers: { excellent: number; veryGood: number; good: number; adequate: number };
    totalWithQualityScore: number;
  };
  rejectionBreakdown: { reason: string; count: number }[];
  market: {
    categoryDistribution: { name: string; count: number; percentage: number }[];
    trackDistribution: { name: string; count: number; percentage: number }[];
    entryAccessiblePct: number;
    salaryTransparencyPct: number;
    uniqueCountries: number;
    uniqueRegions: number;
  };
}

interface TransitionData {
  totalJobs: number;
  totalTransitionFriendly: number;
  transitionFriendlyPct: number;
  avgExperience: number;
  trackSummary: {
    track: string;
    jobCount: number;
    percentage: number;
    avgRelevance: number;
    transitionFriendly: number;
    transitionFriendlyPct: number;
    avgExperience: number;
    topSkills: { skill: string; count: number }[];
    topCountries: { code: string; count: number }[];
  }[];
  entryCorridor: {
    category: string;
    track: string;
    jobCount: number;
    accessibilityScore: number;
    transitionFriendly: number;
    avgExperience: number;
    entryMidPct: number;
  }[];
  skillBridge: Record<string, {
    youHave: { skill: string; count: number }[];
    toBuild: { skill: string; count: number }[];
  }>;
  transitionEmployers: {
    company: string;
    transitionFriendlyCount: number;
    tracks: string[];
  }[];
  regionalIntelligence: {
    countryCode: string;
    countryName: string;
    total: number;
    tracks: Record<string, number>;
    dominantTrack: string;
    transitionFriendly: number;
    transitionFriendlyPct: number;
  }[];
}

function formatSalary(val: number | null): string {
  if (!val) return "N/A";
  return `$${Math.round(val / 1000)}K`;
}

function SkeletonPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-8">
          <Skeleton className="h-4 w-48 mb-3" />
          <Skeleton className="h-10 w-full max-w-md mb-3" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="mi-panel"><Skeleton className="h-16 w-full" /></div>
            ))}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="mi-panel"><Skeleton className="h-40 w-full" /></div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const TRACK_ICONS: Record<string, typeof Briefcase> = {
  "Lawyer-Led": Shield,
  "Technical": Target,
  "Ecosystem": Globe,
};

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

  const { data: transitionData } = useQuery<TransitionData>({
    queryKey: ["/api/market-intelligence/transition"],
  });

  const { data: dataQuality } = useQuery<DataQualityData>({
    queryKey: ["/api/stats/data-quality"],
  });

  const { data: historicalData } = useQuery<{
    totalTracked: number;
    totalEverScreened: number;
    totalActive: number;
    totalArchived: number;
    jobsByMonth: Record<string, number>;
    publishedByMonth: Record<string, number>;
    archivedByMonth: Record<string, number>;
    categoryByMonth: Record<string, Record<string, number>>;
    workModeByMonth: Record<string, Record<string, number>>;
    seniorityByMonth: Record<string, Record<string, number>>;
    companyTrends: Record<string, { name: string; count: number }[]>;
    skillTrends: Record<string, { name: string; count: number }[]>;
    geographyTrends: Record<string, { name: string; count: number }[]>;
    limited?: boolean;
  }>({
    queryKey: ["/api/stats/historical"],
  });

  useEffect(() => {
    if (!data) return;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        if (name.startsWith("og:") || name.startsWith("twitter:")) el.setAttribute("property", name);
        else el.setAttribute("name", name);
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

  if (isLoading) return <SkeletonPage />;

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

  const { overview, skillsDemand = [], hardSkillsDemand = [], softSkillsDemand = [], careerPaths = [], salaryByPath = [], workMode, topCompanies = [], geography = [], seniorityDistribution = [], aiIntensity, communityBenchmarks } = data;

  const safeRemote = workMode?.remote || { count: 0, percentage: 0 };
  const safeHybrid = workMode?.hybrid || { count: 0, percentage: 0 };
  const safeOnsite = workMode?.onsite || { count: 0, percentage: 0 };
  const safeAI = {
    low: aiIntensity?.low || { count: 0, percentage: 0 },
    medium: aiIntensity?.medium || { count: 0, percentage: 0 },
    high: aiIntensity?.high || { count: 0, percentage: 0 },
  };

  const workModeTotal = safeRemote.count + safeHybrid.count + safeOnsite.count;
  const canAccessFull = isPro || isAdmin;
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

  const lawyerLedPct = transitionData?.trackSummary.find(t => t.track === "Lawyer-Led")?.percentage
    || dataQuality?.market?.trackDistribution?.find((t: { name: string; percentage: number }) => t.name === "Lawyer-Led")?.percentage
    || 0;
  const entryAccessibleFromSeniority = seniorityDistribution.length > 0
    ? Math.round((seniorityDistribution.filter(s => ["Intern", "Fellowship", "Entry", "Junior", "Associate", "Mid"].includes(s.level)).reduce((a, b) => a + b.count, 0) / (overview.totalJobs || 1)) * 100)
    : null;
  const entryAccessiblePct = entryAccessibleFromSeniority ?? dataQuality?.market?.entryAccessiblePct ?? 0;

  const hasHardSoftSplit = hardSkillsDemand.length > 0 && softSkillsDemand.length > 0;
  const skillsChartData = skillsDemand.slice(0, 10).map((s) => ({
    name: s.skill.length > 22 ? s.skill.slice(0, 20) + "\u2026" : s.skill,
    fullName: s.skill,
    count: s.count,
  }));
  const hardSkillsChartData = hardSkillsDemand.slice(0, 10).map((s) => ({
    name: s.skill.length > 22 ? s.skill.slice(0, 20) + "\u2026" : s.skill,
    fullName: s.skill,
    count: s.count,
  }));
  const softSkillsChartData = softSkillsDemand.slice(0, 10).map((s) => ({
    name: s.skill.length > 22 ? s.skill.slice(0, 20) + "\u2026" : s.skill,
    fullName: s.skill,
    count: s.count,
  }));

  const seniorityChartData = seniorityDistribution.map((s) => ({
    name: s.level,
    count: s.count,
  }));

  const companyChartData = topCompanies.slice(0, 10).map((c) => ({
    name: c.company.length > 20 ? c.company.slice(0, 18) + "\u2026" : c.company,
    fullName: c.company,
    count: c.jobCount,
  }));

  const geoChartData = geography.slice(0, 10).map((g) => ({
    name: g.countryName,
    count: g.jobCount,
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-6" data-testid="section-hero">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="mi-label mb-2" data-testid="text-mi-label">Market Intelligence</p>
              <h1 className="text-2xl sm:text-[2.25rem] font-serif font-medium text-foreground leading-[1.2] mb-3" data-testid="text-mi-title">
                State of Legal Tech Careers
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground max-w-xl" data-testid="text-mi-subtitle">
                  {overview.totalJobs.toLocaleString()} roles · {overview.totalCompanies.toLocaleString()} companies · {overview.countriesCount} countries · Updated daily
                </p>
                <Badge variant="secondary" className="text-[10px] gap-1.5" data-testid="badge-live-data"><span className="mi-live-dot" /> Live data</Badge>
              </div>
              {transitionData && (
                <p className="text-xs text-muted-foreground mt-1.5" data-testid="text-mi-transition-stats">
                  {transitionData.totalTransitionFriendly} roles welcome career changers · {lawyerLedPct}% are Lawyer-Led · {transitionData.avgExperience} years average experience
                </p>
              )}
            </div>
            {isAdmin ? (
              <div className="flex gap-2 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5" disabled={downloading} data-testid="button-download-report">
                      {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      PDF
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>PDF Report</DropdownMenuLabel>
                    {(["weekly", "monthly", "annual"] as const).map(p => (
                      <DropdownMenuItem key={p} onClick={() => handleDownload(p)} data-testid={`menu-download-${p}`}>
                        <Download className="h-3.5 w-3.5 mr-2" />{p.charAt(0).toUpperCase() + p.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5" disabled={downloading} data-testid="button-admin-actions">
                      <FileText className="h-3.5 w-3.5" />
                      DOCX
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(["weekly", "monthly", "annual"] as const).map(p => (
                      <DropdownMenuItem key={p} onClick={() => handleDocxDownload(p)} data-testid={`menu-docx-${p}`}>
                        <FileText className="h-3.5 w-3.5 mr-2" />{p.charAt(0).toUpperCase() + p.slice(1)} (.docx)
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : isPro ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0" disabled={downloading} data-testid="button-download-report">
                    {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Download Report
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(["weekly", "monthly", "annual"] as const).map(p => (
                    <DropdownMenuItem key={p} onClick={() => handleDownload(p)} data-testid={`menu-download-${p}`}>
                      <Download className="h-3.5 w-3.5 mr-2" />{p.charAt(0).toUpperCase() + p.slice(1)} Report
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/pricing">
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0" data-testid="button-upgrade-download">
                  <Lock className="h-3.5 w-3.5" />
                  Download Report
                  <Crown className="h-3 w-3 text-amber-500" />
                </Button>
              </Link>
            )}
          </div>
        </section>

        {/* MARKET PULSE TICKER */}
        <section className="border-t border-border/40" data-testid="section-key-stats">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { label: "Active Roles", value: overview.totalJobs.toLocaleString(), sub: `+${overview.newJobsThisWeek} this week`, icon: Briefcase, delta: overview.newJobsThisWeek > 0 ? "up" : "flat" },
                { label: "Career Changers", value: transitionData ? `${transitionData.transitionFriendlyPct}%` : "—", sub: transitionData ? `${transitionData.totalTransitionFriendly} welcome career changers` : "Pro", icon: Users, delta: "flat" },
                { label: "Lawyer-Led", value: `${lawyerLedPct}%`, sub: `${transitionData?.trackSummary.find(t => t.track === "Lawyer-Led")?.jobCount || (dataQuality?.market?.trackDistribution?.find((t: { name: string; count: number }) => t.name === "Lawyer-Led")?.count || 0)} roles`, icon: Shield, delta: "flat" },
                { label: "Entry-to-Mid", value: `${entryAccessiblePct}%`, sub: transitionData ? `${transitionData.avgExperience}y avg exp` : "of roles", icon: GraduationCap, delta: "flat" },
                { label: "Remote", value: `${overview.remotePercentage}%`, sub: `${safeRemote.count} roles`, icon: Wifi, delta: "flat" },
                { label: "Salary Data", value: `${overview.totalJobs ? Math.round((overview.jobsWithSalary / overview.totalJobs) * 100) : 0}%`, sub: `${overview.jobsWithSalary} with pay`, icon: TrendingUp, delta: "flat" },
              ].map((stat, i) => (
                <div key={i} className="mi-ticker flex flex-col gap-1" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <stat.icon className="h-3 w-3 text-muted-foreground/60" />
                    <span className="mi-label text-[9px]">{stat.label}</span>
                    {stat.delta === "up" && <span className="mi-delta-up text-[9px]">&#9650;</span>}
                  </div>
                  <span className="mi-metric">{stat.value}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{stat.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {dataQuality && (
          <section className="border-t border-border/40" data-testid="section-data-quality">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              <p className="mi-section-title mb-1">How We Curate</p>
              <p className="mi-insight mb-4">Every listing is screened through {dataQuality.curation.filterCategories} quality checks before it reaches you</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="mi-panel" data-testid="panel-curation">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-primary/10">
                      <Filter className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Curation Pipeline</span>
                  </div>
                  <div className="mb-3">
                    <span className="mi-metric">{(overview?.totalJobs ?? dataQuality.curation.activeInventory).toLocaleString()}</span>
                    <span className="text-[11px] text-muted-foreground ml-1">verified roles from {dataQuality.curation.totalScreened.toLocaleString()}+ reviewed</span>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Approved ({dataQuality.curation.passRate}%)</span>
                      <span>Rejected ({dataQuality.curation.rejectedPct}%)</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden flex bg-muted" data-testid="bar-pipeline">
                      <div
                        className="h-full bg-emerald-500 rounded-l-full"
                        style={{ width: `${dataQuality.curation.passRate}%` }}
                      />
                      <div
                        className="h-full bg-red-400/70"
                        style={{ width: `${dataQuality.curation.rejectedPct}%` }}
                      />
                      <div
                        className="h-full bg-amber-400/70 rounded-r-full"
                        style={{ width: `${dataQuality.curation.inReviewPct}%` }}
                      />
                    </div>
                    <div className="flex justify-end text-[10px] text-muted-foreground mt-0.5">
                      <span>Under Review ({dataQuality.curation.inReviewPct}%)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div data-testid="stat-companies">
                      <span className="mi-label">Companies</span>
                      <p className="mi-metric-sm">{overview?.totalCompanies ?? dataQuality.curation.uniqueCompanies}</p>
                    </div>
                    <div data-testid="stat-sources">
                      <span className="mi-label">Job Sources</span>
                      <p className="mi-metric-sm">{dataQuality.curation.uniqueSources}</p>
                    </div>
                    <div data-testid="stat-filters">
                      <span className="mi-label">Quality Checks</span>
                      <p className="mi-metric-sm">{dataQuality.curation.filterCategories}</p>
                    </div>
                  </div>
                </div>

                <div className="mi-panel" data-testid="panel-quality">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-emerald-500/10">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Quality Assurance</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div data-testid="stat-quality-score">
                      <span className="mi-label">Quality Score</span>
                      <p className="mi-metric">{dataQuality.quality.avgQualityScore}<span className="text-xs text-muted-foreground">/100</span></p>
                      <span className="text-[10px] text-muted-foreground">listing completeness</span>
                    </div>
                    <div data-testid="stat-relevance-score">
                      <span className="mi-label">Relevance</span>
                      <p className="mi-metric">{dataQuality.quality.avgRelevanceScore}<span className="text-xs text-muted-foreground">/10</span></p>
                      <span className="text-[10px] text-muted-foreground">match to legal tech</span>
                    </div>
                  </div>
                  <div className="mb-2">
                    <span className="mi-label mb-1 block">Quality Distribution</span>
                    {(() => {
                      const total = dataQuality.quality.totalWithQualityScore || 1;
                      const tiers = [
                        { label: "Excellent", count: dataQuality.quality.qualityTiers.excellent, color: "bg-emerald-500" },
                        { label: "Very Good", count: dataQuality.quality.qualityTiers.veryGood, color: "bg-emerald-400" },
                        { label: "Good", count: dataQuality.quality.qualityTiers.good, color: "bg-amber-400" },
                        { label: "Adequate", count: dataQuality.quality.qualityTiers.adequate, color: "bg-slate-400" },
                      ];
                      return (
                        <>
                          <div className="h-2 rounded-full overflow-hidden flex bg-muted" data-testid="bar-quality-tiers">
                            {tiers.map(t => (
                              <div key={t.label} className={`h-full ${t.color}`} style={{ width: `${Math.round((t.count / total) * 100)}%` }} />
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                            {tiers.filter(t => t.count > 0).map(t => (
                              <div key={t.label} className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-sm ${t.color}`} />
                                <span className="text-[10px] text-muted-foreground">{t.label} ({Math.round((t.count / total) * 100)}%)</span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="mi-panel" data-testid="panel-benchmarks">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-blue-500/10">
                      <Database className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Market Benchmarks</span>
                  </div>
                  <div className="mb-3">
                    <span className="mi-label mb-1.5 block">Role Distribution by Track</span>
                    <div className="space-y-1.5">
                      {dataQuality.market.trackDistribution.map((t) => {
                        const trackColors: Record<string, string> = {
                          "Lawyer-Led": "bg-blue-500",
                          "Technical": "bg-violet-500",
                          "Ecosystem": "bg-teal-500",
                        };
                        return (
                          <div key={t.name} data-testid={`bar-track-${t.name.toLowerCase().replace(/\s+/g, "-")}`}>
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                              <span>{t.name}</span>
                              <span>{t.percentage}% ({t.count})</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${trackColors[t.name] || "bg-primary"}`} style={{ width: `${t.percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div data-testid="stat-entry-accessible">
                      <span className="mi-label">Entry-to-Mid Level</span>
                      <p className="mi-metric-sm">{dataQuality.market.entryAccessiblePct}%</p>
                      <span className="text-[10px] text-muted-foreground">career-changer accessible</span>
                    </div>
                    <div data-testid="stat-geographic-reach">
                      <span className="mi-label">Geographic Reach</span>
                      <p className="mi-metric-sm">{overview?.countriesCount ?? dataQuality.market.uniqueCountries}</p>
                      <span className="text-[10px] text-muted-foreground">countries</span>
                    </div>
                  </div>
                </div>
              </div>

              {dataQuality.rejectionBreakdown.length > 0 && (() => {
                const friendlyLabels: Record<string, string> = {
                  "Title Screened Out": "Unrelated Job Title",
                  "Near Duplicate": "Duplicate Listing",
                  "Non-Legal-Tech Title": "Not Legal Tech",
                  "Non-Legal-Tech Company": "Outside Industry",
                  "Poor Description Quality": "Incomplete Listing",
                };
                return (
                <div className="mt-3 mi-panel" data-testid="panel-rejection-breakdown">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-foreground">Why Jobs Don't Make the Cut</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {dataQuality.rejectionBreakdown.map((r) => (
                      <div key={r.reason} className="text-center" data-testid={`rejection-${r.reason.toLowerCase().replace(/\s+/g, "-")}`}>
                        <p className="text-sm font-semibold text-foreground">{r.count.toLocaleString()}</p>
                        <span className="text-[10px] text-muted-foreground leading-tight block">{friendlyLabels[r.reason] || r.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })()}

              <div className="flex items-center justify-between mt-2">
                <Link href="/trust" className="text-[10px] text-primary/60 hover:text-primary transition-colors" data-testid="link-methodology-dq">
                  How we curate &rarr;
                </Link>
                <p className="text-[10px] text-muted-foreground/50 select-none">Updated {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
              </div>
            </div>
          </section>
        )}

        {/* MARKET EVOLUTION — visible to all users */}
        {historicalData && (() => {
          const months = Object.keys(historicalData.jobsByMonth).sort();
          if (months.length < 2) {
            return (
              <section className="border-t border-border/40" data-testid="section-market-evolution">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                  <p className="mi-section-title mb-2">Market Evolution</p>
                  <div className="mi-panel text-center py-6">
                    <TrendingUp className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground" data-testid="text-evolution-note">
                      Tracking since {months[0] ? new Date(months[0] + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'now'}.
                      Trend charts will appear as more months of data accumulate.
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {historicalData.totalTracked.toLocaleString()} jobs tracked so far
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
                </div>
              </section>
            );
          }

          const formatMonth = (m: string) => {
            const [y, mo] = m.split('-');
            const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${names[parseInt(mo) - 1]} ${y.slice(2)}`;
          };

          const volumeData = months.map(m => ({
            month: formatMonth(m),
            discovered: historicalData.jobsByMonth[m] || 0,
            published: historicalData.publishedByMonth?.[m] || 0,
          }));

          const allSkills = new Map<string, number>();
          for (const skills of Object.values(historicalData.skillTrends || {})) {
            for (const s of skills) allSkills.set(s.name, (allSkills.get(s.name) || 0) + s.count);
          }
          const topSkills = Array.from(allSkills.entries()).sort(([,a], [,b]) => b - a).slice(0, 5).map(([name]) => name);

          const skillsData = months.map(m => {
            const row: Record<string, any> = { month: formatMonth(m) };
            const monthSkills = historicalData.skillTrends?.[m] || [];
            for (const skill of topSkills) {
              const found = monthSkills.find(s => s.name === skill);
              row[skill] = found?.count || 0;
            }
            return row;
          });

          return (
            <section className="border-t border-border/40" data-testid="section-market-evolution">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                  <p className="mi-section-title">Market Evolution</p>
                  {historicalData.limited && (
                    <span className="text-[11px] text-muted-foreground">Showing last 2 months</span>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="mi-panel" data-testid="chart-job-volume">
                    <div className="mi-panel-header">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="mi-label text-[10px]">Job Volume Over Time</span>
                    </div>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={volumeData}>
                          <defs>
                            <linearGradient id="gradDiscovered" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="gradPublished" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--chart-5))" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <Tooltip {...SHARED_TOOLTIP_STYLE} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Area type="monotone" dataKey="discovered" name="Discovered" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#gradDiscovered)" dot={{ r: 2, fill: "hsl(var(--chart-1))" }} />
                          <Area type="monotone" dataKey="published" name="Approved" stroke="hsl(var(--chart-5))" strokeWidth={2} fill="url(#gradPublished)" dot={{ r: 2, fill: "hsl(var(--chart-5))" }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="mi-panel" data-testid="chart-skills-trajectory">
                    <div className="mi-panel-header">
                      <Sparkles className="h-3 w-3 text-muted-foreground" />
                      <span className="mi-label text-[10px]">Skills Trajectory</span>
                    </div>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={skillsData}>
                          <defs>
                            {topSkills.map((_, i) => (
                              <linearGradient key={`skillGrad${i}`} id={`skillGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={GENERIC_PALETTE[i % GENERIC_PALETTE.length]} stopOpacity={0.15} />
                                <stop offset="100%" stopColor={GENERIC_PALETTE[i % GENERIC_PALETTE.length]} stopOpacity={0} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <Tooltip {...SHARED_TOOLTIP_STYLE} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          {topSkills.map((skill, i) => (
                            <Area key={skill} type="monotone" dataKey={skill} stroke={GENERIC_PALETTE[i % GENERIC_PALETTE.length]} strokeWidth={2} fill={`url(#skillGrad${i})`} dot={{ r: 2 }} name={skill.length > 18 ? skill.slice(0, 16) + '…' : skill} />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-3" data-testid="text-evolution-note">
                  Based on {historicalData.totalTracked.toLocaleString()} jobs tracked
                  {historicalData.totalActive > 0 && ` · ${historicalData.totalActive.toLocaleString()} active`}
                  {historicalData.totalArchived > 0 && ` · ${historicalData.totalArchived.toLocaleString()} archived`}
                </p>
                {historicalData.limited && (
                  <div className="flex items-center justify-center gap-2 mt-3" data-testid="evolution-upsell">
                    <Link href="/pricing">
                      <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-evolution-upgrade">
                        <Crown className="h-3 w-3 text-amber-500" />
                        See full history
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
              </div>
            </section>
          );
        })()}

        {!canAccessFull && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 py-4" data-testid="section-mi-progate">
            <ProGate
              feature="Unlock Full Market Intelligence"
              description="Get the complete picture of legal tech hiring — career paths, salary data, skills analysis, and strategic insights to guide your transition."
              highlights={[
                "Three Paths analysis — Lawyer-Led, Technical, Ecosystem",
                "Skill Bridge — what transfers and what to build",
                "Entry Corridors — accessibility rankings by category",
                "Salary data by career path",
                "Skills demand charts (hard & soft)",
                "Work mode & AI intensity breakdown",
                "Seniority landscape",
                "Top hiring companies & geography",
                "Transition-friendly employer rankings",
                "Community benchmarks & readiness data",
                "Full market evolution history",
                "Downloadable PDF reports",
              ]}
            />
          </section>
        )}

        {canAccessFull && <>
        {/* THREE PATHS */}
        {transitionData && transitionData.trackSummary.length > 0 && (
          <section className="border-t border-border/40" data-testid="section-three-paths">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              <p className="mi-section-title mb-4">Three Paths Into Legal Tech</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {transitionData.trackSummary.map((ts) => {
                  const trackKey = ts.track as keyof typeof ROLE_TRACKS;
                  const colors = TRACK_COLORS[trackKey];
                  const Icon = TRACK_ICONS[ts.track] || Briefcase;
                  const trackCorridors = transitionData.entryCorridor.filter(c => c.track === ts.track);
                  const avgAccess = trackCorridors.length > 0
                    ? trackCorridors.reduce((sum, c) => sum + c.accessibilityScore, 0) / trackCorridors.length
                    : 50;
                  const acc = accessibilityLabel(isNaN(avgAccess) ? 50 : avgAccess);
                  return (
                    <div
                      key={ts.track}
                      className="mi-panel relative pl-4"
                      style={{ borderLeftWidth: "3px", borderLeftColor: colors.primary }}
                      data-testid={`path-${ts.track.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
                          <Icon className="h-3.5 w-3.5" style={{ color: colors.primary }} />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{ts.track}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                        {ROLE_TRACKS[trackKey]?.description}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                        <div>
                          <span className="mi-label">Jobs</span>
                          <p className="mi-metric-sm">{ts.jobCount}</p>
                          <span className="text-[10px] text-muted-foreground">{ts.percentage}% of market</span>
                        </div>
                        <div>
                          <span className="mi-label">Accessibility</span>
                          <p className={`mi-metric-sm ${acc.className}`}>{acc.label}</p>
                          <span className="text-[10px] text-muted-foreground">{ts.avgExperience} years avg</span>
                        </div>
                        <div>
                          <span className="mi-label">Transition-Friendly</span>
                          <p className="mi-metric-sm">{ts.transitionFriendlyPct}%</p>
                          <span className="text-[10px] text-muted-foreground">{ts.transitionFriendly} of {ts.jobCount}</span>
                        </div>
                        <div>
                          <span className="mi-label">Relevance</span>
                          <p className="mi-metric-sm">{ts.avgRelevance}<span className="text-[10px] text-muted-foreground">/10</span></p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {ts.topSkills.slice(0, 3).map(s => (
                          <Badge key={s.skill} variant="outline" className="text-[10px] no-default-active-elevate" title={s.skill}>{s.skill}</Badge>
                        ))}
                      </div>
                      <Link href={`/jobs?track=${encodeURIComponent(ts.track)}`}>
                        <span className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: colors.primary }} data-testid={`link-browse-${ts.track.toLowerCase().replace(/\s+/g, "-")}`}>
                          Browse roles <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
            </div>
          </section>
        )}

        {/* CAREER PATHS TREEMAP */}
        {careerPaths.length > 0 && (
          <section className="border-t border-border/40" data-testid="section-career-treemap">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              <p className="mi-section-title mb-1">Career Landscape</p>
              <p className="mi-insight mb-4">{careerPaths.length} categories across {overview.totalJobs.toLocaleString()} roles — sized by market share</p>
              <div className="mi-panel">
                <div className="h-[240px] sm:h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={careerPaths.map(cp => ({ name: cp.name, size: cp.jobCount, pct: cp.percentage }))}
                      dataKey="size"
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                      content={({ x, y, width, height, name, value, pct }: any) => {
                        if (!width || !height || width < 2 || height < 2) return null;
                        const color = getCategoryColor(name || '');
                        const showName = width > 35 && height > 18;
                        const showValue = width > 25 && height > 14;
                        const SHORT_NAMES: Record<string, string> = {
                          "Legal Consulting & Advisory": "Consulting",
                          "Legal Product Management": "Product",
                          "Legal Operations": "Legal Ops",
                          "Legal Engineering": "Engineering",
                          "Legal Sales & Client Solutions": "Sales",
                          "Compliance & Privacy": "Compliance",
                          "Legal AI & Analytics": "AI & Analytics",
                          "In-House Counsel": "In-House",
                          "Knowledge Management": "Knowledge",
                          "Contract Management": "Contracts",
                          "Intellectual Property & Innovation": "IP & Innovation",
                          "Litigation & eDiscovery": "Litigation",
                        };
                        const displayName = name && SHORT_NAMES[name] ? SHORT_NAMES[name] : name;
                        const fontSize = Math.min(11, width / 9);
                        const maxChars = Math.floor(width / (fontSize * 0.65));
                        const truncatedName = displayName && displayName.length > maxChars ? displayName.slice(0, maxChars - 1) + '…' : displayName;
                        return (
                          <g>
                            <rect x={x} y={y} width={width} height={height} rx={4} fill={color} fillOpacity={0.85} stroke="hsl(var(--card))" strokeWidth={2} />
                            {showName && (
                              <text x={x + width / 2} y={y + height / 2 - (showValue ? 7 : 0)} textAnchor="middle" dominantBaseline="central" style={{ fontSize, fontWeight: 600, fill: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                <title>{name}</title>
                                {truncatedName}
                              </text>
                            )}
                            {showValue && (
                              <text x={x + width / 2} y={y + height / 2 + (showName ? 9 : 0)} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 8, fontWeight: 500, fill: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-mono)' }}>
                                {value} ({pct}%)
                              </text>
                            )}
                          </g>
                        );
                      }}
                    />
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
            </div>
          </section>
        )}

        {/* SKILL BRIDGE */}
        {transitionData && transitionData.skillBridge && (
          <section className="border-t border-border/40" data-testid="section-skill-bridge">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              <p className="mi-section-title mb-1">Skill Bridge</p>
              <p className="mi-insight mb-4">What legal skills transfer — and what you'll need to learn</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(transitionData.skillBridge).map(([trackName, bridge]) => {
                  const colors = TRACK_COLORS[trackName as keyof typeof TRACK_COLORS];
                  const youHaveVisible = bridge.youHave;
                  const toBuildVisible = bridge.toBuild;
                  return (
                    <div key={trackName} className="mi-panel" data-testid={`skill-bridge-${trackName.toLowerCase().replace(/\s+/g, "-")}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
                        <span className="text-xs font-semibold text-foreground">{trackName}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="mi-label text-emerald-600 dark:text-emerald-400 mb-2">You Likely Have</p>
                          <div className="space-y-1.5">
                            {youHaveVisible.map(s => (
                              <div key={s.skill} className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-foreground truncate min-w-0" title={s.skill}>{s.skill}</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{s.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mi-label text-amber-600 dark:text-amber-400 mb-2">To Build</p>
                          <div className="space-y-1.5">
                            {toBuildVisible.map(s => (
                              <div key={s.skill} className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-foreground truncate min-w-0" title={s.skill}>{s.skill}</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{s.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
            </div>
          </section>
        )}

        {/* ENTRY CORRIDORS */}
        {transitionData && transitionData.entryCorridor.length > 0 && (
          <section className="border-t border-border/40" data-testid="section-entry-corridors">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              <p className="mi-section-title mb-1">Entry Corridors</p>
              <p className="mi-insight mb-4">Categories ranked by how accessible they are for lawyers making the switch</p>
              <div className="mi-panel overflow-hidden">
                <div className="hidden sm:grid grid-cols-[1fr_80px_90px_60px_70px_80px] gap-2 px-3 py-2 border-b border-border/40">
                  <span className="mi-label">Category</span>
                  <span className="mi-label text-right">Jobs</span>
                  <span className="mi-label text-right">Access</span>
                  <span className="mi-label text-right">Friendly</span>
                  <span className="mi-label text-right">Exp</span>
                  <span className="mi-label text-right">Entry %</span>
                </div>
                {transitionData.entryCorridor.map((c, i) => {
                  const acc = accessibilityLabel(c.accessibilityScore);
                  const trackColors = TRACK_COLORS[c.track as keyof typeof TRACK_COLORS];
                  return (
                    <div
                      key={c.category}
                      className={`px-3 py-2.5 ${i % 2 === 0 ? "" : "bg-muted/30"}`}
                      data-testid={`corridor-${c.category.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <div className="hidden sm:grid grid-cols-[1fr_80px_90px_60px_70px_80px] gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: trackColors?.primary }} />
                          <span className="text-xs font-medium text-foreground truncate" title={c.category}>{c.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-foreground tabular-nums font-medium">{c.jobCount}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-semibold ${acc.className}`}>{acc.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-foreground tabular-nums">{c.transitionFriendly}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-foreground tabular-nums">{c.avgExperience}y</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-foreground tabular-nums">{c.entryMidPct}%</span>
                        </div>
                      </div>
                      <div className="sm:hidden">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: trackColors?.primary }} />
                          <span className="text-xs font-medium text-foreground" title={c.category}>{c.category}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-x-3 gap-y-1 pl-4">
                          <div>
                            <span className="mi-label">Jobs</span>
                            <p className="text-xs text-foreground font-medium tabular-nums">{c.jobCount}</p>
                          </div>
                          <div>
                            <span className="mi-label">Access</span>
                            <p className={`text-xs font-semibold ${acc.className}`}>{acc.label}</p>
                          </div>
                          <div>
                            <span className="mi-label">Friendly</span>
                            <p className="text-xs text-foreground tabular-nums">{c.transitionFriendly}</p>
                          </div>
                          <div>
                            <span className="mi-label">Exp</span>
                            <p className="text-xs text-foreground tabular-nums">{c.avgExperience}y</p>
                          </div>
                          <div>
                            <span className="mi-label">Entry %</span>
                            <p className="text-xs text-foreground tabular-nums">{c.entryMidPct}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
            </div>
          </section>
        )}

        {/* SKILLS IN DEMAND */}
        {skillsChartData.length > 0 && (
          <section className="border-t border-border/40" data-testid="section-skills">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              <p className="mi-section-title mb-4">Skills in Demand</p>
              {hasHardSoftSplit ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="mi-panel" data-testid="hard-skills-chart">
                    <div className="mi-panel-header">
                      <Wrench className="h-3 w-3 text-muted-foreground" />
                      <span className="mi-label text-[10px]">Tools & Technical Skills</span>
                    </div>
                    <div className="space-y-2">
                      {hardSkillsChartData.map((skill, i) => {
                        const maxCount = Math.max(...hardSkillsChartData.map(s => s.count), 1);
                        const pct = (skill.count / maxCount) * 100;
                        return (
                          <div key={skill.name} className="group" data-testid={`hard-skill-${i}`}>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-2">
                                <span className="mi-rank">#{i + 1}</span>
                                <span className="text-[11px] text-foreground font-medium truncate" title={skill.fullName}>{skill.name}</span>
                              </div>
                              <span className="mi-bar-label text-foreground">{skill.count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GENERIC_PALETTE[i % GENERIC_PALETTE.length]}, ${GENERIC_PALETTE[i % GENERIC_PALETTE.length]}80)` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mi-panel" data-testid="soft-skills-chart">
                    <div className="mi-panel-header">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="mi-label text-[10px]">Professional Skills</span>
                    </div>
                    <div className="space-y-2">
                      {softSkillsChartData.map((skill, i) => {
                        const maxCount = Math.max(...softSkillsChartData.map(s => s.count), 1);
                        const pct = (skill.count / maxCount) * 100;
                        return (
                          <div key={skill.name} className="group" data-testid={`soft-skill-${i}`}>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-2">
                                <span className="mi-rank">#{i + 1}</span>
                                <span className="text-[11px] text-foreground font-medium truncate" title={skill.fullName}>{skill.name}</span>
                              </div>
                              <span className="mi-bar-label text-foreground">{skill.count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GENERIC_PALETTE[(i + 2) % GENERIC_PALETTE.length]}, ${GENERIC_PALETTE[(i + 2) % GENERIC_PALETTE.length]}80)` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mi-panel">
                  <div className="space-y-2">
                    {skillsChartData.map((skill, i) => {
                      const maxCount = Math.max(...skillsChartData.map(s => s.count), 1);
                      const pct = (skill.count / maxCount) * 100;
                      return (
                        <div key={skill.name} className="group" data-testid={`skill-${i}`}>
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2">
                              <span className="mi-rank">#{i + 1}</span>
                              <span className="text-[11px] text-foreground font-medium truncate" title={skill.fullName}>{skill.name}</span>
                            </div>
                            <span className="mi-bar-label text-foreground">{skill.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GENERIC_PALETTE[i % GENERIC_PALETTE.length]}, ${GENERIC_PALETTE[i % GENERIC_PALETTE.length]}80)` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
            </div>
          </section>
        )}

        {/* SALARY + WORK MODE + AI (2-col grid) */}
        <section className="border-t border-border/40" data-testid="section-salary-work">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Salary - Lollipop Range Chart */}
              {salaryByPath.length > 0 && (
                <div className="mi-panel" data-testid="section-salary">
                  <div className="mi-panel-header">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span className="mi-label text-[10px]">Salary by Career Path</span>
                    <span className="text-[9px] text-muted-foreground ml-auto">{overview.jobsWithSalary} with pay data</span>
                  </div>
                  <div className="space-y-3">
                    {salaryByPath.map((sp, i) => {
                      const minPct = salaryMax > 0 ? ((sp.medianMin || 0) / salaryMax) * 100 : 0;
                      const maxPct = salaryMax > 0 ? ((sp.medianMax || 0) / salaryMax) * 100 : 0;
                      const trackColor = getCategoryColor(sp.name);
                      return (
                        <div key={sp.name} data-testid={`salary-path-${sp.name.toLowerCase().replace(/\s+/g, "-")}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="mi-rank">#{i + 1}</span>
                              <span className="text-[11px] text-foreground font-medium truncate" title={sp.name}>{sp.name}</span>
                            </div>
                            <span className="mi-bar-label text-foreground shrink-0 pl-2">
                              {formatSalary(sp.medianMin)} – {formatSalary(sp.medianMax)}
                            </span>
                          </div>
                          <div className="hidden sm:block">
                          <div className="h-3 rounded-full bg-muted/30 overflow-hidden relative">
                            <div className="absolute h-full rounded-full" style={{ left: `${minPct}%`, width: `${Math.max(maxPct - minPct, 2)}%`, background: `linear-gradient(90deg, ${trackColor}30, ${trackColor}60)` }} />
                            <div className="absolute top-0 h-full w-0.5 rounded-full" style={{ left: `${minPct}%`, backgroundColor: trackColor }} />
                            <div className="absolute top-0 h-full w-0.5 rounded-full" style={{ left: `${maxPct}%`, backgroundColor: trackColor }} />
                            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-background" style={{ left: `${minPct}%`, marginLeft: '-4px', backgroundColor: trackColor }} />
                            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-background" style={{ left: `${maxPct}%`, marginLeft: '-4px', backgroundColor: trackColor }} />
                          </div>
                          </div>
                          <div className="sm:hidden h-1.5 rounded-full bg-muted/30 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${maxPct}%`, backgroundColor: trackColor, opacity: 0.5 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Work Mode Donut + AI Intensity */}
              <div className="space-y-4">
                <div className="mi-panel" data-testid="section-work-mode">
                  <div className="mi-panel-header">
                    <Wifi className="h-3 w-3 text-muted-foreground" />
                    <span className="mi-label text-[10px]">Work Mode</span>
                  </div>
                  {workModeTotal > 0 && (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-[80px] h-[80px] sm:w-[140px] sm:h-[140px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Remote", value: safeRemote.count, fill: WORK_MODE_PALETTE.remote },
                                { name: "Hybrid", value: safeHybrid.count, fill: WORK_MODE_PALETTE.hybrid },
                                { name: "On-site", value: safeOnsite.count, fill: WORK_MODE_PALETTE.onsite },
                              ]}
                              cx="50%" cy="50%"
                              innerRadius="55%" outerRadius="85%"
                              dataKey="value"
                              strokeWidth={2}
                              stroke="hsl(var(--card))"
                            >
                              <Cell fill={WORK_MODE_PALETTE.remote} />
                              <Cell fill={WORK_MODE_PALETTE.hybrid} />
                              <Cell fill={WORK_MODE_PALETTE.onsite} />
                            </Pie>
                            <Tooltip {...SHARED_TOOLTIP_STYLE} formatter={(value: number, name: string) => [`${value} roles (${Math.round((value / workModeTotal) * 100)}%)`, name]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3 w-full sm:w-auto sm:flex-1">
                        {[
                          { label: "Remote", pct: safeRemote.percentage, count: safeRemote.count, color: WORK_MODE_PALETTE.remote },
                          { label: "Hybrid", pct: safeHybrid.percentage, count: safeHybrid.count, color: WORK_MODE_PALETTE.hybrid },
                          { label: "On-site", pct: safeOnsite.percentage, count: safeOnsite.count, color: WORK_MODE_PALETTE.onsite },
                        ].map(wm => (
                          <div key={wm.label} data-testid={`work-mode-${wm.label.toLowerCase().replace(/\s+/g, "-")}`}>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: wm.color }} />
                                <span className="text-[11px] text-foreground font-medium">{wm.label}</span>
                              </div>
                              <span className="mi-bar-label text-foreground">{wm.pct}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${wm.pct}%`, backgroundColor: wm.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mi-panel" data-testid="section-ai-intensity">
                  <div className="mi-panel-header">
                    <Sparkles className="h-3 w-3 text-muted-foreground" />
                    <span className="mi-label text-[10px]">AI Intensity</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-[80px] h-[56px] sm:w-[140px] sm:h-[100px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart cx="50%" cy="100%" innerRadius="30%" outerRadius="100%" startAngle={180} endAngle={0}
                          data={[
                            { name: "High", value: safeAI.high.percentage, fill: "hsl(var(--status-danger))" },
                            { name: "Medium", value: safeAI.medium.percentage, fill: "hsl(var(--status-warning))" },
                            { name: "Low", value: safeAI.low.percentage, fill: "hsl(var(--status-success))" },
                          ]}
                        >
                          <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "hsl(var(--muted) / 0.2)" }} />
                          <Tooltip {...SHARED_TOOLTIP_STYLE} formatter={(value: number, name: string) => [`${value}%`, name]} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 w-full sm:w-auto sm:flex-1">
                      {[
                        { label: "Low", data: safeAI.low, color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
                        { label: "Medium", data: safeAI.medium, color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
                        { label: "High", data: safeAI.high, color: "bg-rose-500", textColor: "text-rose-600 dark:text-rose-400" },
                      ].map(({ label, data: d, color, textColor }) => (
                        <div key={label} className="flex items-center justify-between" data-testid={`ai-intensity-${label.toLowerCase()}`}>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-sm ${color}`} />
                            <span className="text-[11px] text-foreground">{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`mi-bar-label ${textColor}`}>{d.percentage}%</span>
                            <span className="text-[9px] text-muted-foreground">{d.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
          </div>
        </section>

        {/* SENIORITY */}
        {seniorityDistribution.length > 0 && (() => {
          const totalSeniority = seniorityChartData.reduce((sum, s) => sum + s.count, 0) || 1;
          const entryLevels = ["Intern", "Fellowship", "Entry", "Junior", "Mid"];
          return (
            <section className="border-t border-border/40" data-testid="section-seniority">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                  <p className="mi-section-title">Seniority Landscape</p>
                  <span className="mi-insight">{entryAccessiblePct}% are entry-to-mid level</span>
                </div>
                <div className="mi-panel">
                  <div className="h-8 rounded-md overflow-hidden flex" data-testid="chart-seniority-bar">
                    {seniorityChartData.map((entry, i) => {
                      const pct = (entry.count / totalSeniority) * 100;
                      const isEntry = entryLevels.includes(entry.name);
                      return (
                        <div
                          key={entry.name}
                          className="h-full flex items-center justify-center relative group cursor-default"
                          style={{
                            width: `${pct}%`,
                            minWidth: pct > 0 ? '4px' : 0,
                            backgroundColor: isEntry ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))",
                            opacity: Math.max(1 - (i * 0.06), 0.5),
                          }}
                          title={`${entry.name}: ${entry.count} (${Math.round(pct)}%)`}
                          data-testid={`seniority-${entry.name.toLowerCase()}`}
                        >
                          {pct >= 14 && (
                            <span className="text-[9px] font-semibold text-white drop-shadow-sm truncate px-1">{entry.name} {Math.round(pct)}%</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    {seniorityChartData.map((entry, i) => {
                      const pct = Math.round((entry.count / totalSeniority) * 100);
                      const isEntry = entryLevels.includes(entry.name);
                      return (
                        <div key={entry.name} className="flex items-center gap-1.5" data-testid={`seniority-legend-${entry.name.toLowerCase()}`}>
                          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: isEntry ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))", opacity: Math.max(1 - (i * 0.06), 0.5) }} />
                          <span className="text-[10px] text-muted-foreground">{entry.name}</span>
                          <span className="text-[10px] text-foreground font-medium tabular-nums">{pct}%</span>
                          <span className="text-[9px] text-muted-foreground/60 tabular-nums">({entry.count})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
              </div>
            </section>
          );
        })()}

        {/* COMPANIES + GEOGRAPHY */}
        <section className="border-t border-border/40" data-testid="section-companies-geography">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Companies */}
              {companyChartData.length > 0 && (
                <div className="mi-panel" data-testid="section-companies">
                  <div className="mi-panel-header">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="mi-label text-[10px]">Top Hiring Companies</span>
                  </div>
                  <div className="space-y-2">
                    {companyChartData.map((company, i) => {
                      const maxCount = Math.max(...companyChartData.map(c => c.count), 1);
                      const pct = (company.count / maxCount) * 100;
                      return (
                        <div key={company.name} data-testid={`company-${i}`}>
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="mi-rank">#{i + 1}</span>
                              <span className="text-[11px] text-foreground font-medium truncate" title={company.fullName}>{company.name}</span>
                            </div>
                            <span className="mi-bar-label text-foreground shrink-0">{company.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, hsl(var(--chart-1)), hsl(var(--chart-1) / 0.5))` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Geography */}
              {geoChartData.length > 0 && (
                <div className="mi-panel" data-testid="section-geography">
                  <div className="mi-panel-header">
                    <Globe className="h-3 w-3 text-muted-foreground" />
                    <span className="mi-label text-[10px]">Where They're Hiring</span>
                  </div>
                  <div className="space-y-2">
                    {geoChartData.map((geo, i) => {
                      const maxCount = Math.max(...geoChartData.map(g => g.count), 1);
                      const pct = (geo.count / maxCount) * 100;
                      return (
                        <div key={geo.name} data-testid={`geo-${i}`}>
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="mi-rank">#{i + 1}</span>
                              <span className="text-[11px] text-foreground font-medium truncate" title={geo.name}>{geo.name}</span>
                            </div>
                            <span className="mi-bar-label text-foreground shrink-0">{geo.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, hsl(var(--chart-5)), hsl(var(--chart-5) / 0.5))` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
          </div>
        </section>

        {/* TRANSITION-FRIENDLY EMPLOYERS */}
        {transitionData && transitionData.transitionEmployers.length > 0 && (
          <section className="border-t border-border/40" data-testid="section-transition-employers">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              <p className="mi-section-title mb-1">Transition-Friendly Employers</p>
              <p className="mi-insight mb-4">Companies with the most roles that explicitly welcome career changers</p>
              <div className="mi-panel overflow-hidden">
                <div className="hidden sm:grid grid-cols-[1fr_100px_120px] gap-2 px-3 py-2 border-b border-border/40">
                  <span className="mi-label">Company</span>
                  <span className="mi-label text-right">Friendly Roles</span>
                  <span className="mi-label text-right">Tracks</span>
                </div>
                {transitionData.transitionEmployers.map((e, i) => (
                  <div
                    key={e.company}
                    className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_100px_120px] gap-2 px-3 py-2.5 ${i % 2 === 0 ? "" : "bg-muted/30"}`}
                    data-testid={`employer-${i}`}
                  >
                    <span className="text-xs font-medium text-foreground truncate" title={e.company}>{e.company}</span>
                    <span className="text-xs text-foreground tabular-nums text-right font-medium">{e.transitionFriendlyCount}</span>
                    <div className="hidden sm:flex items-center justify-end gap-1">
                      {e.tracks.map(t => (
                        <span key={t} className="w-2 h-2 rounded-full" style={{ backgroundColor: TRACK_COLORS[t as keyof typeof TRACK_COLORS]?.primary }} title={t} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
            </div>
          </section>
        )}

        {/* COMMUNITY PULSE */}
        {communityBenchmarks && (
          <section className="border-t border-border/40" data-testid="section-community">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              <p className="mi-section-title mb-1">Community Pulse</p>
              <p className="mi-insight mb-4">Aggregated insights from career diagnostic assessments</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="mi-panel" data-testid="panel-avg-readiness">
                  <div className="mi-panel-header">
                    <Target className="h-3 w-3 text-muted-foreground" />
                    <span className="mi-label text-[10px]">Average Readiness</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative flex items-center justify-center shrink-0">
                      <svg className="w-[64px] h-[40px] sm:w-[80px] sm:h-[48px]" viewBox="0 0 120 65">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => {
                          const angle = Math.PI - (i / 10) * Math.PI;
                          const x1 = 60 + 48 * Math.cos(angle);
                          const y1 = 55 - 48 * Math.sin(angle);
                          const x2 = 60 + 44 * Math.cos(angle);
                          const y2 = 55 - 44 * Math.sin(angle);
                          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeOpacity="0.3" />;
                        })}
                        <path
                          d={`M ${60 - 46} 55 A 46 46 0 0 1 ${60 + 46} 55`}
                          fill="none" stroke="hsl(var(--muted))" strokeWidth="6" strokeLinecap="round"
                        />
                        <path
                          d={`M ${60 - 46} 55 A 46 46 0 0 1 ${60 + 46} 55`}
                          fill="none"
                          stroke={communityBenchmarks.avgReadiness >= 60 ? "hsl(var(--status-success))" : communityBenchmarks.avgReadiness >= 40 ? "hsl(var(--status-warning))" : "hsl(var(--status-danger))"}
                          strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${Math.PI * 46}`}
                          strokeDashoffset={`${Math.PI * 46 - (communityBenchmarks.avgReadiness / 100) * Math.PI * 46}`}
                        />
                        <text x="60" y="50" textAnchor="middle" className="fill-foreground" style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)' }} data-testid="text-avg-readiness">
                          {Math.round(communityBenchmarks.avgReadiness)}
                        </text>
                        <text x="60" y="62" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '7px', letterSpacing: '0.05em' }}>
                          READINESS
                        </text>
                      </svg>
                    </div>
                    <div className="space-y-1 w-full sm:w-auto sm:flex-1">
                      {communityBenchmarks.readinessDistribution.map((b) => {
                        const maxBucket = Math.max(...communityBenchmarks.readinessDistribution.map(x => x.count)) || 1;
                        return (
                          <div key={b.bucket} className="flex items-center gap-2 text-[11px]" data-testid={`readiness-bucket-${b.bucket}`}>
                            <span className="text-muted-foreground w-10 shrink-0">{b.bucket}</span>
                            <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
                              <div className="h-full rounded-full bg-primary/50" style={{ width: `${(b.count / maxBucket) * 100}%` }} />
                            </div>
                            <span className="text-foreground font-medium tabular-nums w-6 text-right">{b.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="mi-panel" data-testid="panel-skill-gaps">
                  <div className="mi-panel-header">
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    <span className="mi-label text-[10px]">Top Skill Gaps</span>
                  </div>
                  <div className="space-y-1.5">
                    {communityBenchmarks.topSkillGaps.slice(0, 6).map((sg, i) => {
                      const maxGap = communityBenchmarks.topSkillGaps[0]?.count || 1;
                      return (
                        <div key={sg.skill} data-testid={`skill-gap-${sg.skill.toLowerCase().replace(/\s+/g, "-")}`}>
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2">
                              <span className="mi-rank">#{i + 1}</span>
                              <span className="text-[11px] text-foreground truncate max-w-[140px] sm:max-w-none" title={sg.skill}>{sg.skill}</span>
                            </div>
                            <span className="mi-bar-label text-muted-foreground">{sg.count}</span>
                          </div>
                          <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
                            <div className="h-full rounded-full bg-amber-500/60" style={{ width: `${(sg.count / maxGap) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {communityBenchmarks.topCareerPaths.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <p className="mi-label mb-1.5">Popular Paths</p>
                      <div className="flex flex-wrap gap-1">
                        {communityBenchmarks.topCareerPaths.slice(0, 4).map((cp) => (
                          <Badge key={cp.path} variant="outline" className="text-[10px] no-default-active-elevate" title={cp.path} data-testid={`popular-path-${cp.path.toLowerCase().replace(/\s+/g, "-")}`}>
                            {cp.path}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
            </div>
          </section>
        )}

        </>}

        {/* CTA */}
        <section className="border-t border-border/40" data-testid="section-cta">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 text-center">
            <h2 className="text-lg sm:text-xl font-serif font-medium text-foreground mb-2" data-testid="text-cta-title">
              Ready to find out where you fit?
            </h2>
            <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
              Upload your resume for a personalized career readiness report in under 90 seconds.
            </p>
            <Button size="default" asChild data-testid="button-cta-diagnostic">
              <Link href="/diagnostic">
                Check Your Fit
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
