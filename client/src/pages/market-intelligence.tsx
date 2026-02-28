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
                <Badge variant="secondary" className="text-[10px]" data-testid="badge-live-data">Live data</Badge>
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

        {/* MARKET PULSE GRID */}
        <section className="border-t border-border/40" data-testid="section-key-stats">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { label: "Active Roles", value: overview.totalJobs.toLocaleString(), sub: `+${overview.newJobsThisWeek} this week`, icon: Briefcase },
                { label: "Career Changers", value: transitionData ? `${transitionData.transitionFriendlyPct}%` : "—", sub: transitionData ? `${transitionData.totalTransitionFriendly} welcome career changers` : "Pro", icon: Users },
                { label: "Lawyer-Led", value: `${lawyerLedPct}%`, sub: `${transitionData?.trackSummary.find(t => t.track === "Lawyer-Led")?.jobCount || (dataQuality?.market?.trackDistribution?.find((t: { name: string; count: number }) => t.name === "Lawyer-Led")?.count || 0)} roles`, icon: Shield },
                { label: "Entry-to-Mid", value: `${entryAccessiblePct}%`, sub: transitionData ? `${transitionData.avgExperience} years average` : "of roles", icon: GraduationCap },
                { label: "Remote", value: `${overview.remotePercentage}%`, sub: `${safeRemote.count} roles`, icon: Wifi },
                { label: "Salary Transparency", value: `${overview.totalJobs ? Math.round((overview.jobsWithSalary / overview.totalJobs) * 100) : 0}%`, sub: `${overview.jobsWithSalary} roles with pay data`, icon: TrendingUp },
              ].map((stat, i) => (
                <div key={i} className="mi-panel flex flex-col gap-1" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <stat.icon className="h-3 w-3 text-muted-foreground" />
                    <span className="mi-label">{stat.label}</span>
                  </div>
                  <span className="mi-metric">{stat.value}</span>
                  <span className="text-[11px] text-muted-foreground">{stat.sub}</span>
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
                    <p className="mi-label mb-3">Job Volume Over Time</p>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={volumeData} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip {...SHARED_TOOLTIP_STYLE} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="discovered" name="Discovered" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="published" name="Approved" fill="hsl(var(--chart-5))" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="mi-panel" data-testid="chart-skills-trajectory">
                    <p className="mi-label mb-3">Skills Trajectory</p>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={skillsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip {...SHARED_TOOLTIP_STYLE} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          {topSkills.map((skill, i) => (
                            <Line key={skill} type="monotone" dataKey={skill} stroke={GENERIC_PALETTE[i % GENERIC_PALETTE.length]} strokeWidth={2} dot={{ r: 2 }} name={skill.length > 18 ? skill.slice(0, 16) + '…' : skill} />
                          ))}
                        </LineChart>
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
                          <Badge key={s.skill} variant="outline" className="text-[10px] no-default-active-elevate">{s.skill}</Badge>
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
                              <div key={s.skill} className="flex items-center justify-between gap-1">
                                <span className="text-[11px] text-foreground truncate" title={s.skill}>{s.skill}</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{s.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mi-label text-amber-600 dark:text-amber-400 mb-2">To Build</p>
                          <div className="space-y-1.5">
                            {toBuildVisible.map(s => (
                              <div key={s.skill} className="flex items-center justify-between gap-1">
                                <span className="text-[11px] text-foreground truncate" title={s.skill}>{s.skill}</span>
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
                    <p className="mi-label mb-3 flex items-center gap-1.5">
                      <Wrench className="h-3 w-3" /> Tools & Technical Skills
                    </p>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hardSkillsChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                          <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={120} />
                          <Tooltip {...SHARED_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.2)" }} formatter={(value: number) => [`${value} jobs`, "Demand"]} labelFormatter={(_: string, payload: any[]) => payload?.[0]?.payload?.fullName || _} />
                          <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={18} name="Jobs">
                            {hardSkillsChartData.map((_, index) => (
                              <Cell key={`hard-cell-${index}`} fill={GENERIC_PALETTE[index % GENERIC_PALETTE.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="mi-panel" data-testid="soft-skills-chart">
                    <p className="mi-label mb-3 flex items-center gap-1.5">
                      <Users className="h-3 w-3" /> Professional Skills
                    </p>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={softSkillsChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                          <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={120} />
                          <Tooltip {...SHARED_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.2)" }} formatter={(value: number) => [`${value} jobs`, "Demand"]} labelFormatter={(_: string, payload: any[]) => payload?.[0]?.payload?.fullName || _} />
                          <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={18} name="Jobs">
                            {softSkillsChartData.map((_, index) => (
                              <Cell key={`soft-cell-${index}`} fill={GENERIC_PALETTE[index % GENERIC_PALETTE.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mi-panel">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={skillsChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={120} />
                        <Tooltip {...SHARED_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.2)" }} formatter={(value: number) => [`${value} jobs`, "Demand"]} labelFormatter={(_: string, payload: any[]) => payload?.[0]?.payload?.fullName || _} />
                        <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={18} name="Jobs">
                          {skillsChartData.map((_, index) => (
                            <Cell key={`skill-cell-${index}`} fill={GENERIC_PALETTE[index % GENERIC_PALETTE.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
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
              {/* Salary */}
              {salaryByPath.length > 0 && (
                <div className="mi-panel" data-testid="section-salary">
                  <p className="mi-section-title mb-4">Salary by Career Path</p>
                  <p className="mi-insight mb-3">Median ranges from {overview.jobsWithSalary} listings with disclosed pay</p>
                  <div className="space-y-3">
                    {salaryByPath.map((sp) => {
                      const minPct = salaryMax > 0 ? ((sp.medianMin || 0) / salaryMax) * 100 : 0;
                      const maxPct = salaryMax > 0 ? ((sp.medianMax || 0) / salaryMax) * 100 : 0;
                      const rangePct = maxPct - minPct;
                      const trackColor = getCategoryColor(sp.name);
                      return (
                        <div key={sp.name} data-testid={`salary-path-${sp.name.toLowerCase().replace(/\s+/g, "-")}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: trackColor }} />
                              <span className="text-[11px] text-foreground font-medium truncate" title={sp.name}>{sp.name}</span>
                            </div>
                            <span className="text-[11px] font-semibold text-foreground tabular-nums shrink-0 pl-3 sm:pl-0">
                              {formatSalary(sp.medianMin)} – {formatSalary(sp.medianMax)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted/60 overflow-hidden relative">
                            <div className="absolute h-full rounded-full" style={{ left: `${minPct}%`, width: `${Math.max(rangePct, 2)}%`, backgroundColor: `${trackColor}40` }} />
                            <div className="absolute h-full rounded-full" style={{ left: `${minPct}%`, width: `${Math.max(rangePct * 0.6, 1)}%`, backgroundColor: trackColor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Work Mode + AI Intensity */}
              <div className="space-y-4">
                <div className="mi-panel" data-testid="section-work-mode">
                  <p className="mi-section-title mb-3">Work Mode</p>
                  <div className="h-7 rounded-md overflow-hidden flex" data-testid="chart-work-mode-bar">
                    {workModeTotal > 0 && [
                      { label: "Remote", count: safeRemote.count, pct: safeRemote.percentage, color: WORK_MODE_PALETTE.remote },
                      { label: "Hybrid", count: safeHybrid.count, pct: safeHybrid.percentage, color: WORK_MODE_PALETTE.hybrid },
                      { label: "On-site", count: safeOnsite.count, pct: safeOnsite.percentage, color: WORK_MODE_PALETTE.onsite },
                    ].map((wm) => (
                      <div
                        key={wm.label}
                        className="h-full flex items-center justify-center relative group"
                        style={{ width: `${Math.max(wm.pct, 3)}%`, backgroundColor: wm.color }}
                        data-testid={`work-mode-${wm.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {wm.pct >= 12 && (
                          <span className="text-[10px] font-semibold text-white drop-shadow-sm">{wm.label} {wm.pct}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
                    {[
                      { label: "Remote", pct: safeRemote.percentage, color: WORK_MODE_PALETTE.remote },
                      { label: "Hybrid", pct: safeHybrid.percentage, color: WORK_MODE_PALETTE.hybrid },
                      { label: "On-site", pct: safeOnsite.percentage, color: WORK_MODE_PALETTE.onsite },
                    ].map(wm => (
                      <div key={wm.label} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: wm.color }} />
                        <span className="text-[10px] text-muted-foreground">{wm.label}</span>
                        <span className="text-[10px] text-foreground font-medium tabular-nums">{wm.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mi-panel" data-testid="section-ai-intensity">
                  <p className="mi-section-title mb-3">AI Intensity</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Low", data: safeAI.low, color: "text-emerald-600 dark:text-emerald-400" },
                      { label: "Medium", data: safeAI.medium, color: "text-amber-600 dark:text-amber-400" },
                      { label: "High", data: safeAI.high, color: "text-rose-600 dark:text-rose-400" },
                    ].map(({ label, data: d, color }) => (
                      <div key={label} className="text-center" data-testid={`ai-intensity-${label.toLowerCase()}`}>
                        <span className="mi-label">{label}</span>
                        <p className={`mi-metric-sm ${color}`}>{d.percentage}%</p>
                        <span className="text-[10px] text-muted-foreground">{d.count} roles</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
          </div>
        </section>

        {/* SENIORITY */}
        {seniorityDistribution.length > 0 && (
          <section className="border-t border-border/40" data-testid="section-seniority">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                <p className="mi-section-title">Seniority Landscape</p>
                <span className="mi-insight">{entryAccessiblePct}% are entry-to-mid level</span>
              </div>
              <div className="mi-panel">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seniorityChartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip {...SHARED_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.2)" }} />
                      <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={16} name="Jobs">
                        {seniorityChartData.map((entry, index) => {
                          const isEntry = ["Intern", "Fellowship", "Entry", "Junior", "Mid"].includes(entry.name);
                          return <Cell key={`cell-${index}`} fill={isEntry ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))"} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/50 select-none text-right mt-2" data-testid="text-attribution">Source: lawjobs.co</p>
            </div>
          </section>
        )}

        {/* COMPANIES + GEOGRAPHY */}
        <section className="border-t border-border/40" data-testid="section-companies-geography">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Companies */}
              {companyChartData.length > 0 && (
                <div className="mi-panel" data-testid="section-companies">
                  <p className="mi-section-title mb-3">Top Hiring Companies</p>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={companyChartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={110} />
                        <Tooltip {...SHARED_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.2)" }} formatter={(value: number) => [`${value} jobs`, "Open Roles"]} labelFormatter={(_: string, payload: any[]) => payload?.[0]?.payload?.fullName || _} />
                        <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={16} fill="hsl(var(--chart-1))" name="Jobs" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Geography */}
              {geoChartData.length > 0 && (
                <div className="mi-panel" data-testid="section-geography">
                  <p className="mi-section-title mb-3">Where They're Hiring</p>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={geoChartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={110} />
                        <Tooltip {...SHARED_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.2)" }} formatter={(value: number) => [`${value} jobs`, "Open Roles"]} />
                        <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={16} fill="hsl(var(--chart-5))" name="Jobs" />
                      </BarChart>
                    </ResponsiveContainer>
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
                  <p className="mi-label mb-2">Average Readiness</p>
                  <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center shrink-0">
                      <svg className="w-[64px] h-[64px] -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                        <circle cx="50" cy="50" r="42" fill="none"
                          stroke={communityBenchmarks.avgReadiness >= 60 ? "hsl(var(--status-success))" : communityBenchmarks.avgReadiness >= 40 ? "hsl(var(--status-warning))" : "hsl(var(--status-danger))"}
                          strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 42}`}
                          strokeDashoffset={`${2 * Math.PI * 42 - (communityBenchmarks.avgReadiness / 100) * 2 * Math.PI * 42}`}
                        />
                      </svg>
                      <span className="absolute mi-metric-sm" data-testid="text-avg-readiness">{Math.round(communityBenchmarks.avgReadiness)}</span>
                    </div>
                    <div className="space-y-1">
                      {communityBenchmarks.readinessDistribution.map((b) => (
                        <div key={b.bucket} className="flex items-center justify-between gap-3 text-[11px]" data-testid={`readiness-bucket-${b.bucket}`}>
                          <span className="text-muted-foreground">{b.bucket}</span>
                          <span className="text-foreground font-medium tabular-nums">{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mi-panel" data-testid="panel-skill-gaps">
                  <p className="mi-label mb-2">Top Skill Gaps</p>
                  <div className="space-y-1.5">
                    {communityBenchmarks.topSkillGaps.slice(0, 6).map((sg) => (
                      <div key={sg.skill} className="flex items-center justify-between gap-2 text-[11px]" data-testid={`skill-gap-${sg.skill.toLowerCase().replace(/\s+/g, "-")}`}>
                        <span className="text-foreground truncate" title={sg.skill}>{sg.skill}</span>
                        <span className="text-muted-foreground tabular-nums shrink-0">{sg.count}</span>
                      </div>
                    ))}
                  </div>
                  {communityBenchmarks.topCareerPaths.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <p className="mi-label mb-1.5">Popular Paths</p>
                      <div className="flex flex-wrap gap-1">
                        {communityBenchmarks.topCareerPaths.slice(0, 4).map((cp) => (
                          <Badge key={cp.path} variant="outline" className="text-[10px] no-default-active-elevate" data-testid={`popular-path-${cp.path.toLowerCase().replace(/\s+/g, "-")}`}>
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
