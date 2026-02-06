import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import {
  ArrowLeft, Users, Briefcase, TrendingUp, Search, Eye, MousePointerClick,
  FileText, Bookmark, Bell, BarChart3, Activity, Crown, ArrowUpRight,
  Loader2, ShieldX, Filter, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { Header } from "@/components/header";

interface KpiData {
  totalUsers: number;
  activeUsersLast7d: number;
  activeUsersLast30d: number;
  proUsers: number;
  freeUsers: number;
  conversionRate: number;
  totalJobs: number;
  activeJobs: number;
  totalResumes: number;
  totalSavedJobs: number;
  totalPageViews: number;
  totalSearches: number;
  totalJobViews: number;
  totalApplyClicks: number;
}

interface EngagementData {
  dailyActiveUsers: { date: string; count: number }[];
  pageViewsByPage: { page: string; views: number; uniqueUsers: number }[];
  eventBreakdown: { eventType: string; count: number; uniqueUsers: number }[];
  activityTimeline: { date: string; pageViews: number; jobViews: number; searches: number; applyClicks: number }[];
}

interface FeatureData {
  resumeUploads: number;
  builtResumes: number;
  savedJobsUsers: number;
  totalSavedJobs: number;
  alertsCreated: number;
  alertsActiveUsers: number;
  careerAdvisorViews: number;
  insightsViews: number;
  resumeBuilderViews: number;
}

interface CohortData {
  signupsByDay: { date: string; count: number }[];
  subscriptionBreakdown: { tier: string; status: string; count: number }[];
  authMethodBreakdown: { method: string; count: number }[];
  usersWithResume: number;
  usersWithSearch: number;
}

interface TopContentData {
  topSearchTerms: { term: string; count: number }[];
  topViewedJobs: { id: number; title: string; company: string; viewCount: number; applyClicks: number }[];
  topAppliedJobs: { id: number; title: string; company: string; applyClicks: number; viewCount: number }[];
  topCategories: { category: string; count: number }[];
  topCompanies: { company: string; jobCount: number; totalViews: number }[];
}

interface UserAnalytics {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  createdAt: string | null;
  lastActiveAt: string | null;
  totalJobViews: number;
  totalSearches: number;
  totalApplyClicks: number;
  totalPageViews: number;
  savedJobsCount: number;
  resumeCount: number;
}

interface FunnelData {
  totalUsers: number;
  usersWhoSearched: number;
  usersWhoViewedJob: number;
  usersWhoApplied: number;
  usersWhoSavedJob: number;
  usersWhoUploadedResume: number;
  usersWhoBuiltResume: number;
  usersWhoPurchasedPro: number;
}

function KpiCard({ label, value, icon: Icon, detail, testId }: {
  label: string; value: string | number; icon: any; detail?: string; testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
          </div>
          <div className="shrink-0 p-2 rounded-md bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function FunnelStep({ label, value, total, index }: { label: string; value: number; total: number; index: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const maxWidth = 100 - index * 8;
  return (
    <div className="flex items-center gap-3" data-testid={`funnel-step-${index}`}>
      <div className="w-24 text-right">
        <span className="text-sm font-medium">{value}</span>
        <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
      </div>
      <div className="flex-1">
        <div
          className="h-8 bg-primary/20 rounded-md flex items-center px-3 transition-all"
          style={{ width: `${maxWidth}%` }}
        >
          <div
            className="h-full bg-primary rounded-md"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-muted-foreground w-40 truncate">{label}</span>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  usePageTitle("Admin Analytics");
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [engagementDays, setEngagementDays] = useState("30");
  const [userSearch, setUserSearch] = useState("");
  const [userSort, setUserSort] = useState<string>("lastActive");
  const [userSortDir, setUserSortDir] = useState<"asc" | "desc">("desc");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { data: kpis, isLoading: loadingKpis, dataUpdatedAt: kpiUpdatedAt } = useQuery<KpiData>({
    queryKey: ["/api/admin/analytics/kpis"],
    enabled: isAdmin,
    refetchInterval: 15000,
  });

  const { data: engagement, isLoading: loadingEngagement } = useQuery<EngagementData>({
    queryKey: ["/api/admin/analytics/engagement", engagementDays],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/engagement?days=${engagementDays}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: features, isLoading: loadingFeatures } = useQuery<FeatureData>({
    queryKey: ["/api/admin/analytics/features"],
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: cohorts, isLoading: loadingCohorts } = useQuery<CohortData>({
    queryKey: ["/api/admin/analytics/cohorts"],
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: topContent, isLoading: loadingContent } = useQuery<TopContentData>({
    queryKey: ["/api/admin/analytics/top-content"],
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: userList, isLoading: loadingUsers } = useQuery<UserAnalytics[]>({
    queryKey: ["/api/admin/analytics/users"],
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const { data: funnel, isLoading: loadingFunnel } = useQuery<FunnelData>({
    queryKey: ["/api/admin/analytics/funnel"],
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (kpiUpdatedAt) setLastUpdated(new Date(kpiUpdatedAt));
  }, [kpiUpdatedAt]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <ShieldX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Admin access required.</p>
        </main>
      </>
    );
  }

  const filteredUsers = (userList || []).filter(u => {
    if (!userSearch) return true;
    const search = userSearch.toLowerCase();
    return (
      u.email?.toLowerCase().includes(search) ||
      u.firstName?.toLowerCase().includes(search) ||
      u.lastName?.toLowerCase().includes(search)
    );
  }).sort((a, b) => {
    let aVal: any, bVal: any;
    switch (userSort) {
      case "lastActive": aVal = a.lastActiveAt || ""; bVal = b.lastActiveAt || ""; break;
      case "created": aVal = a.createdAt || ""; bVal = b.createdAt || ""; break;
      case "pageViews": aVal = a.totalPageViews; bVal = b.totalPageViews; break;
      case "jobViews": aVal = a.totalJobViews; bVal = b.totalJobViews; break;
      case "searches": aVal = a.totalSearches; bVal = b.totalSearches; break;
      case "applies": aVal = a.totalApplyClicks; bVal = b.totalApplyClicks; break;
      default: aVal = a.lastActiveAt || ""; bVal = b.lastActiveAt || "";
    }
    if (userSortDir === "asc") return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const toggleSort = (col: string) => {
    if (userSort === col) {
      setUserSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setUserSort(col);
      setUserSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (userSort !== col) return null;
    return userSortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />;
  };

  const formatDate = (d: string | null) => {
    if (!d) return "Never";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDateShort = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const maxDau = engagement?.dailyActiveUsers?.length
    ? Math.max(...engagement.dailyActiveUsers.map(d => d.count))
    : 1;

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="icon" data-testid="button-back-admin">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-analytics-title">
                  User Analytics
                </h1>
                <p className="text-sm text-muted-foreground">
                  Product metrics and user behavior insights
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="live-indicator">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span>Live</span>
                <span className="hidden sm:inline">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
              <Link href="/admin">
                <Button variant="outline" size="sm" data-testid="link-back-admin">
                  Back to Admin
                </Button>
              </Link>
            </div>
          </div>

          {loadingKpis ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : kpis && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3" data-testid="section-kpis">
                <KpiCard label="Total Users" value={kpis.totalUsers} icon={Users} testId="kpi-total-users" />
                <KpiCard label="Active (7d)" value={kpis.activeUsersLast7d} icon={Activity} testId="kpi-active-7d" />
                <KpiCard label="Active (30d)" value={kpis.activeUsersLast30d} icon={Activity} testId="kpi-active-30d" />
                <KpiCard label="Pro Users" value={kpis.proUsers} icon={Crown} detail={`${kpis.conversionRate}% conversion`} testId="kpi-pro-users" />
                <KpiCard label="Total Searches" value={kpis.totalSearches} icon={Search} testId="kpi-searches" />
                <KpiCard label="Job Views" value={kpis.totalJobViews} icon={Eye} testId="kpi-job-views" />
                <KpiCard label="Apply Clicks" value={kpis.totalApplyClicks} icon={MousePointerClick} testId="kpi-apply-clicks" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="Active Jobs" value={`${kpis.activeJobs} / ${kpis.totalJobs}`} icon={Briefcase} testId="kpi-jobs" />
                <KpiCard label="Page Views" value={kpis.totalPageViews} icon={BarChart3} testId="kpi-page-views" />
                <KpiCard label="Resumes" value={kpis.totalResumes} icon={FileText} testId="kpi-resumes" />
                <KpiCard label="Saved Jobs" value={kpis.totalSavedJobs} icon={Bookmark} testId="kpi-saved-jobs" />
              </div>
            </>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="section-dau">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Daily Active Users</CardTitle>
                  <Select value={engagementDays} onValueChange={setEngagementDays}>
                    <SelectTrigger className="w-24" data-testid="select-engagement-days">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingEngagement ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : engagement?.dailyActiveUsers?.length ? (
                  <div className="space-y-1.5">
                    {engagement.dailyActiveUsers.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-14 shrink-0">{formatDateShort(d.date)}</span>
                        <MiniBar value={d.count} max={maxDau} />
                        <span className="text-xs font-medium w-6 text-right shrink-0">{d.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity data yet</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="section-funnel">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">User Funnel</CardTitle>
                <CardDescription>Conversion through key actions</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFunnel ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : funnel ? (
                  <div className="space-y-2">
                    {[
                      { label: "Signed Up", value: funnel.totalUsers },
                      { label: "Searched", value: funnel.usersWhoSearched },
                      { label: "Viewed a Job", value: funnel.usersWhoViewedJob },
                      { label: "Saved a Job", value: funnel.usersWhoSavedJob },
                      { label: "Clicked Apply", value: funnel.usersWhoApplied },
                      { label: "Uploaded Resume", value: funnel.usersWhoUploadedResume },
                      { label: "Built Resume", value: funnel.usersWhoBuiltResume },
                      { label: "Purchased Pro", value: funnel.usersWhoPurchasedPro },
                    ].map((step, i) => (
                      <FunnelStep key={i} label={step.label} value={step.value} total={funnel.totalUsers} index={i} />
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card data-testid="section-page-views">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Page Views by Page</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEngagement ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                ) : engagement?.pageViewsByPage?.length ? (
                  <div className="space-y-2">
                    {engagement.pageViewsByPage.slice(0, 10).map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-sm truncate flex-1">{p.page || "/"}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-medium">{p.views}</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="secondary" className="text-xs">{p.uniqueUsers}u</Badge>
                            </TooltipTrigger>
                            <TooltipContent>{p.uniqueUsers} unique users</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="section-event-breakdown">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Event Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEngagement ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                ) : engagement?.eventBreakdown?.length ? (
                  <div className="space-y-3">
                    {engagement.eventBreakdown.map((e, i) => {
                      const maxCount = engagement.eventBreakdown[0]?.count || 1;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm capitalize">{e.eventType.replace(/_/g, " ")}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{e.count}</span>
                              <Badge variant="secondary" className="text-xs">{e.uniqueUsers}u</Badge>
                            </div>
                          </div>
                          <MiniBar value={e.count} max={maxCount} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="section-feature-adoption">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Feature Adoption</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingFeatures ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                ) : features ? (
                  <div className="space-y-3">
                    {[
                      { label: "Resume Uploads", value: features.resumeUploads, icon: FileText },
                      { label: "Built Resumes", value: features.builtResumes, icon: FileText },
                      { label: "Saved Jobs Users", value: features.savedJobsUsers, icon: Bookmark },
                      { label: "Total Saved Jobs", value: features.totalSavedJobs, icon: Bookmark },
                      { label: "Job Alerts Created", value: features.alertsCreated, icon: Bell },
                      { label: "Alert Users", value: features.alertsActiveUsers, icon: Bell },
                      { label: "Career Advisor Views", value: features.careerAdvisorViews, icon: TrendingUp },
                      { label: "Market Insights Views", value: features.insightsViews, icon: BarChart3 },
                      { label: "Resume Builder Views", value: features.resumeBuilderViews, icon: FileText },
                    ].map((f, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <f.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{f.label}</span>
                        </div>
                        <span className="text-sm font-medium">{f.value}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="section-top-searches">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Search Terms</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingContent ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                ) : topContent?.topSearchTerms?.length ? (
                  <div className="space-y-2">
                    {topContent.topSearchTerms.slice(0, 15).map((t, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                          <span className="text-sm truncate">{t.term}</span>
                        </div>
                        <Badge variant="secondary" className="shrink-0">{t.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No search data yet</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="section-top-categories">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Job Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingContent ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                ) : topContent?.topCategories?.length ? (
                  <div className="space-y-2">
                    {topContent.topCategories.slice(0, 12).map((c, i) => {
                      const maxCat = topContent.topCategories[0]?.count || 1;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm truncate">{c.category}</span>
                            <span className="text-sm font-medium shrink-0">{c.count} jobs</span>
                          </div>
                          <MiniBar value={c.count} max={maxCat} color="bg-primary/70" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="section-top-viewed-jobs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Most Viewed Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingContent ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                ) : topContent?.topViewedJobs?.length ? (
                  <ScrollArea className="h-72">
                    <div className="space-y-2 pr-3">
                      {topContent.topViewedJobs.filter(j => j.viewCount > 0).map((j, i) => (
                        <div key={j.id} className="flex items-start justify-between gap-2 py-1">
                          <div className="min-w-0">
                            <Link href={`/jobs/${j.id}`}>
                              <span className="text-sm font-medium hover:underline cursor-pointer truncate block">{j.title}</span>
                            </Link>
                            <span className="text-xs text-muted-foreground">{j.company}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="secondary" className="text-xs">{j.viewCount} views</Badge>
                              </TooltipTrigger>
                              <TooltipContent>{j.applyClicks} apply clicks</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No view data yet</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="section-top-companies">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Companies</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingContent ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                ) : topContent?.topCompanies?.length ? (
                  <ScrollArea className="h-72">
                    <div className="space-y-2 pr-3">
                      {topContent.topCompanies.map((c, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 py-1">
                          <span className="text-sm truncate">{c.company}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="text-xs">{c.jobCount} jobs</Badge>
                            <Badge variant="outline" className="text-xs">{c.totalViews} views</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card data-testid="section-signups">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">User Signups</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCohorts ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                ) : cohorts?.signupsByDay?.length ? (
                  <div className="space-y-1.5">
                    {cohorts.signupsByDay.slice(-14).map((s, i) => {
                      const maxSignups = Math.max(...cohorts.signupsByDay.slice(-14).map(d => d.count));
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-14 shrink-0">{formatDateShort(s.date)}</span>
                          <MiniBar value={s.count} max={maxSignups} color="bg-green-500" />
                          <span className="text-xs font-medium w-4 text-right shrink-0">{s.count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="section-subscriptions">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Subscription Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCohorts ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                ) : cohorts ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {cohorts.subscriptionBreakdown.map((s, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={s.tier === "pro" ? "default" : "secondary"} className="text-xs capitalize">{s.tier}</Badge>
                            <span className="text-xs text-muted-foreground capitalize">{s.status}</span>
                          </div>
                          <span className="text-sm font-medium">{s.count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground">Users with resume</span>
                        <span className="text-sm font-medium">{cohorts.usersWithResume}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground">Users who searched</span>
                        <span className="text-sm font-medium">{cohorts.usersWithSearch}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card data-testid="section-auth-methods">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Auth Methods</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCohorts ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                ) : cohorts?.authMethodBreakdown ? (
                  <div className="space-y-3">
                    {cohorts.authMethodBreakdown.filter(a => a.count > 0).map((a, i) => {
                      const total = cohorts.authMethodBreakdown.reduce((sum, m) => sum + m.count, 0);
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm">{a.method}</span>
                            <span className="text-sm font-medium">{a.count}</span>
                          </div>
                          <MiniBar value={a.count} max={total} color="bg-blue-500" />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="section-user-table">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-base">All Users</CardTitle>
                  <CardDescription>{filteredUsers.length} users</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-8 w-48"
                      data-testid="input-user-search"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">User</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Tier</th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("pageViews")}>
                            <span className="flex items-center justify-end gap-1">Pages <SortIcon col="pageViews" /></span>
                          </th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("searches")}>
                            <span className="flex items-center justify-end gap-1">Searches <SortIcon col="searches" /></span>
                          </th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("jobViews")}>
                            <span className="flex items-center justify-end gap-1">Jobs <SortIcon col="jobViews" /></span>
                          </th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("applies")}>
                            <span className="flex items-center justify-end gap-1">Applies <SortIcon col="applies" /></span>
                          </th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground">Saved</th>
                          <th className="text-right py-2 px-1 font-medium text-muted-foreground">Resumes</th>
                          <th className="text-right py-2 px-2 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("lastActive")}>
                            <span className="flex items-center justify-end gap-1">Last Active <SortIcon col="lastActive" /></span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr key={u.id} className="border-b last:border-0 hover-elevate" data-testid={`row-user-${u.id}`}>
                            <td className="py-2 px-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate max-w-[180px]">
                                  {u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email || "No email"}</p>
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <Badge variant={u.subscriptionTier === "pro" ? "default" : "secondary"} className="text-xs capitalize">
                                {u.subscriptionTier || "free"}
                              </Badge>
                            </td>
                            <td className="text-right py-2 px-1 tabular-nums">{u.totalPageViews}</td>
                            <td className="text-right py-2 px-1 tabular-nums">{u.totalSearches}</td>
                            <td className="text-right py-2 px-1 tabular-nums">{u.totalJobViews}</td>
                            <td className="text-right py-2 px-1 tabular-nums">{u.totalApplyClicks}</td>
                            <td className="text-right py-2 px-1 tabular-nums">{u.savedJobsCount}</td>
                            <td className="text-right py-2 px-1 tabular-nums">{u.resumeCount}</td>
                            <td className="text-right py-2 px-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(u.lastActiveAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}