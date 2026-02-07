import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useSubscription } from "@/hooks/use-subscription";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import {
  Eye, Search, MousePointerClick, Flame, Calendar, Target,
  FileText, Bell, Bookmark, ArrowRight, TrendingUp,
  Building2, CheckCircle, Circle, ChevronRight, Briefcase,
  Loader2, BarChart3, Zap, Award, Lock
} from "lucide-react";

interface DashboardData {
  activityMetrics: {
    period: {
      jobViews: number;
      searches: number;
      applyClicks: number;
      pageViews: number;
      filterChanges: number;
    };
    allTime: {
      jobViews: number;
      searches: number;
      applyClicks: number;
    };
    currentStreak: number;
    activeDaysInPeriod: number;
  };
  dailyActivity: { date: string; count: number; types: string }[];
  patterns: {
    topCategories: { name: string; count: number }[];
    topCompanies: { name: string; count: number }[];
    recentSearches: string[];
  };
  readiness: {
    hasResume: boolean;
    resumeCount: number;
    hasBuiltResume: boolean;
    builtResumeCount: number;
    hasActiveAlerts: boolean;
    activeAlertsCount: number;
    hasPersona: boolean;
    savedJobsCount: number;
    expiringSoonCount: number;
    score: number;
  };
  marketAlignment: { category: string; availableJobs: number }[];
  totalActiveJobs: number;
  persona: {
    topCategories: string[] | null;
    topSkills: string[] | null;
    careerStage: string | null;
    engagementLevel: string | null;
    summary: string | null;
  } | null;
  recommendations: { type: string; title: string; description: string; action: string; priority: number }[];
}

function ActivityChart({ data, days }: { data: { date: string; count: number }[]; days: number }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No activity yet. Start exploring jobs to see your progress here.
      </div>
    );
  }

  const allDates: { date: string; count: number }[] = [];
  const dataMap = new Map(data.map(d => [d.date, d.count]));
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    allDates.push({ date: dateStr, count: dataMap.get(dateStr) || 0 });
  }

  const maxCount = Math.max(...allDates.map(d => d.count), 1);

  return (
    <div className="flex items-end gap-[2px] h-28" data-testid="chart-daily-activity">
      {allDates.map((d, i) => {
        const height = d.count > 0 ? Math.max(8, (d.count / maxCount) * 100) : 2;
        const isToday = i === allDates.length - 1;
        return (
          <div
            key={d.date}
            className="flex-1 min-w-0 group relative"
            title={`${d.date}: ${d.count} actions`}
          >
            <div
              className={`w-full rounded-sm transition-colors ${
                d.count > 0
                  ? isToday ? "bg-primary" : "bg-primary/60"
                  : "bg-muted/40"
              }`}
              style={{ height: `${height}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function ReadinessRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 75) return "text-green-500";
    if (score >= 50) return "text-amber-500";
    return "text-muted-foreground";
  };

  return (
    <div className="relative inline-flex items-center justify-center" data-testid="readiness-ring">
      <svg className="transform -rotate-90" width="96" height="96">
        <circle
          cx="48" cy="48" r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          className="text-muted/30"
        />
        <circle
          cx="48" cy="48" r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ${getColor()}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold text-foreground">{score}%</span>
        <span className="text-[10px] text-muted-foreground">Ready</span>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtext, iconColor }: {
  icon: typeof Eye;
  label: string;
  value: number | string;
  subtext?: string;
  iconColor?: string;
}) {
  return (
    <Card className="transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>
            <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
          </div>
          <div className={`p-2 rounded-md bg-muted/50 ${iconColor || "text-muted-foreground"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProLockedOverlay({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[3px] opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[1px] rounded-md">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{label || "Pro Feature"}</p>
          <p className="text-xs text-muted-foreground max-w-[200px]">Upgrade to Pro for full dashboard analytics</p>
          <Link href="/pricing">
            <Button size="sm" data-testid="button-upgrade-dashboard">Upgrade</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <div className="h-7 w-48 skeleton-shimmer rounded-md mb-2" />
              <div className="h-4 w-72 skeleton-shimmer rounded-md" />
            </div>
            <div className="h-9 w-[140px] skeleton-shimmer rounded-md" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-4 w-16 skeleton-shimmer rounded-md mb-2" />
                  <div className="h-7 w-12 skeleton-shimmer rounded-md mb-1" />
                  <div className="h-3 w-20 skeleton-shimmer rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardContent className="p-4">
                <div className="h-5 w-32 skeleton-shimmer rounded-md mb-4" />
                <div className="h-40 skeleton-shimmer rounded-md" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="h-5 w-28 skeleton-shimmer rounded-md mb-4" />
                <div className="h-40 skeleton-shimmer rounded-md" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}

export default function DashboardPage() {
  usePageTitle("My Dashboard");
  const { track } = useActivityTracker();
  const { isPro } = useSubscription();
  const [timeRange, setTimeRange] = useState("30");

  useEffect(() => { track({ eventType: "page_view", pagePath: "/dashboard" }); }, []);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { data, isLoading, error, dataUpdatedAt } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard?days=${timeRange}`],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (dataUpdatedAt) setLastUpdated(new Date(dataUpdatedAt));
  }, [dataUpdatedAt]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <p className="text-muted-foreground">Could not load your dashboard.</p>
            <Link href="/jobs">
              <Button variant="outline" data-testid="button-browse-jobs-fallback">Browse Jobs</Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  const { activityMetrics, dailyActivity, patterns, readiness, marketAlignment, totalActiveJobs, persona, recommendations } = data;

  const readinessItems = [
    { label: "Resume uploaded", done: readiness.hasResume, link: "/resumes", icon: FileText },
    { label: "Job alerts active", done: readiness.hasActiveAlerts, link: "/alerts", icon: Bell },
    { label: "Jobs saved", done: readiness.savedJobsCount > 0, link: "/saved-jobs", icon: Bookmark },
    { label: "Applied to jobs", done: activityMetrics.allTime.applyClicks > 0, link: "/jobs", icon: MousePointerClick },
  ];

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-tight text-foreground" data-testid="text-dashboard-title">
                Your Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track your job search progress and discover next steps
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="dashboard-live-indicator">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="hidden sm:inline">Updated {lastUpdated.toLocaleTimeString()}</span>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]" data-testid="select-time-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {recommendations.length > 0 && recommendations[0].type !== "streak" && (
            <Card className="mb-6 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{recommendations[0].title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{recommendations[0].description}</p>
                  </div>
                  <Link href={recommendations[0].action}>
                    <Button size="sm" data-testid="button-top-recommendation">
                      Go
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {activityMetrics.currentStreak >= 3 && (
            <Card className="mb-6 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-amber-500/10 text-amber-500 shrink-0">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {activityMetrics.currentStreak}-day streak
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You've been consistently active. Keep the momentum going!
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0" data-testid="badge-streak">
                    <Flame className="h-3 w-3 mr-1" />
                    {activityMetrics.currentStreak} days
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <MetricCard
              icon={Eye}
              label="Jobs Viewed"
              value={activityMetrics.period.jobViews}
              subtext={`${activityMetrics.allTime.jobViews} all time`}
              iconColor="text-blue-500"
            />
            <MetricCard
              icon={Search}
              label="Searches"
              value={activityMetrics.period.searches}
              subtext={`${activityMetrics.allTime.searches} all time`}
              iconColor="text-violet-500"
            />
            <MetricCard
              icon={MousePointerClick}
              label="Applications"
              value={activityMetrics.period.applyClicks}
              subtext={`${activityMetrics.allTime.applyClicks} all time`}
              iconColor="text-green-500"
            />
            <MetricCard
              icon={Calendar}
              label="Active Days"
              value={activityMetrics.activeDaysInPeriod}
              subtext={`of ${timeRange} days`}
              iconColor="text-amber-500"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {isPro ? (
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">Activity Trend</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {activityMetrics.activeDaysInPeriod > 0
                        ? `${Math.round((activityMetrics.period.jobViews + activityMetrics.period.searches + activityMetrics.period.applyClicks) / activityMetrics.activeDaysInPeriod)} actions/active day`
                        : "Start exploring to see trends"}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <ActivityChart data={dailyActivity} days={parseInt(timeRange)} />
                </CardContent>
              </Card>
            ) : (
              <div className="lg:col-span-2">
                <ProLockedOverlay label="Activity Trends">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Activity Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-32" />
                    </CardContent>
                  </Card>
                </ProLockedOverlay>
              </div>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Search Readiness</CardTitle>
                <CardDescription className="text-xs">How prepared you are</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <ReadinessRing score={readiness.score} />
                  <div className="w-full space-y-2">
                    {readinessItems.map((item) => (
                      <Link href={item.link} key={item.label}>
                        <div className="flex items-center gap-2 text-sm hover-elevate rounded-md p-1.5 -mx-1.5 cursor-pointer" data-testid={`readiness-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          {item.done ? (
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                          {!item.done && <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {isPro ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Top Categories</CardTitle>
                  </div>
                  <CardDescription className="text-xs">Based on jobs you've viewed</CardDescription>
                </CardHeader>
                <CardContent>
                  {patterns.topCategories.length > 0 ? (
                    <div className="space-y-2.5">
                      {patterns.topCategories.map((cat, i) => {
                        const maxCat = patterns.topCategories[0]?.count || 1;
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-foreground truncate mr-2">{cat.name}</span>
                              <span className="text-muted-foreground text-xs shrink-0">{cat.count} views</span>
                            </div>
                            <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary/60 rounded-full transition-all"
                                style={{ width: `${(cat.count / maxCat) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      View some jobs to discover your interests
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Top Companies</CardTitle>
                  </div>
                  <CardDescription className="text-xs">Companies you've explored</CardDescription>
                </CardHeader>
                <CardContent>
                  {patterns.topCompanies.length > 0 ? (
                    <div className="space-y-2.5">
                      {patterns.topCompanies.map((comp, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-foreground truncate mr-2">{comp.name}</span>
                          <Badge variant="secondary" className="text-xs shrink-0">{comp.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Explore jobs to see which companies interest you
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Recent Searches</CardTitle>
                  </div>
                  <CardDescription className="text-xs">What you've been looking for</CardDescription>
                </CardHeader>
                <CardContent>
                  {patterns.recentSearches.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patterns.recentSearches.map((term, i) => (
                        <Link href={`/search?q=${encodeURIComponent(term)}`} key={i}>
                          <Badge variant="outline" className="cursor-pointer" data-testid={`search-term-${i}`}>
                            {term}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Try searching for roles that interest you
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <ProLockedOverlay label="Search Insights">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <Card><CardHeader className="pb-3"><CardTitle className="text-base">Top Categories</CardTitle></CardHeader><CardContent><div className="h-24" /></CardContent></Card>
                <Card><CardHeader className="pb-3"><CardTitle className="text-base">Top Companies</CardTitle></CardHeader><CardContent><div className="h-24" /></CardContent></Card>
                <Card><CardHeader className="pb-3"><CardTitle className="text-base">Recent Searches</CardTitle></CardHeader><CardContent><div className="h-24" /></CardContent></Card>
              </div>
            </ProLockedOverlay>
          )}

          {isPro ? (
            <>
              {(marketAlignment.length > 0 || readiness.savedJobsCount > 0) && (
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {marketAlignment.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base">Market Alignment</CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                          Jobs available in your areas of interest ({totalActiveJobs} total active)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {marketAlignment.map((m, i) => (
                            <div key={i}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-foreground truncate mr-2">{m.category}</span>
                                <span className="text-muted-foreground text-xs shrink-0">{m.availableJobs} jobs</span>
                              </div>
                              <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500/60 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, (m.availableJobs / totalActiveJobs) * 100 * 3)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {readiness.savedJobsCount > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Bookmark className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base">Saved Jobs</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-3xl font-bold text-foreground">{readiness.savedJobsCount}</p>
                            <p className="text-xs text-muted-foreground">saved</p>
                          </div>
                          {readiness.expiringSoonCount > 0 && (
                            <div className="text-amber-500">
                              <p className="text-3xl font-bold">{readiness.expiringSoonCount}</p>
                              <p className="text-xs">expiring soon</p>
                            </div>
                          )}
                        </div>
                        <Link href="/saved-jobs">
                          <Button variant="outline" size="sm" className="mt-4 gap-1" data-testid="button-view-saved-jobs">
                            View Saved Jobs
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {persona && persona.summary && (
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">Your Career Profile</CardTitle>
                    </div>
                    <CardDescription className="text-xs">Based on your activity patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3" data-testid="text-persona-summary">{persona.summary}</p>
                    <div className="flex flex-wrap gap-2">
                      {persona.careerStage && (
                        <Badge variant="outline">{persona.careerStage}</Badge>
                      )}
                      {persona.topSkills?.slice(0, 4).map((skill, i) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="space-y-6 mb-6">
              <ProLockedOverlay label="Market & Career Insights">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card><CardHeader className="pb-3"><CardTitle className="text-base">Market Alignment</CardTitle></CardHeader><CardContent><div className="h-24" /></CardContent></Card>
                  <Card><CardHeader className="pb-3"><CardTitle className="text-base">Career Profile</CardTitle></CardHeader><CardContent><div className="h-24" /></CardContent></Card>
                </div>
              </ProLockedOverlay>
            </div>
          )}

          {recommendations.length > 1 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Suggested Next Steps</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.slice(0, 4).map((rec, i) => (
                    <Link href={rec.action} key={i}>
                      <div className="flex items-center gap-3 p-2.5 rounded-md hover-elevate cursor-pointer" data-testid={`recommendation-${rec.type}`}>
                        <div className="p-1.5 rounded-md bg-muted/50 shrink-0">
                          {rec.type === "resume" && <FileText className="h-4 w-4 text-blue-500" />}
                          {rec.type === "alerts" && <Bell className="h-4 w-4 text-violet-500" />}
                          {rec.type === "apply" && <MousePointerClick className="h-4 w-4 text-green-500" />}
                          {rec.type === "save" && <Bookmark className="h-4 w-4 text-amber-500" />}
                          {rec.type === "explore" && <Briefcase className="h-4 w-4 text-primary" />}
                          {rec.type === "streak" && <Flame className="h-4 w-4 text-amber-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{rec.title}</p>
                          <p className="text-xs text-muted-foreground">{rec.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}