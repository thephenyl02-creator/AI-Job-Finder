import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { cleanStructuredText } from "@/lib/structured-description";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { ArrowRight, Building2, Search, Target, FileText, Sparkles, Bell, Globe, Wifi, Brain, CheckCircle2, Clock } from "lucide-react";
import { Footer } from "@/components/footer";

interface Stats {
  totalJobs: number;
  totalCompanies: number;
  totalCategories: number;
  categoryCounts: Record<string, number>;
}

interface FeaturedJob {
  id: number;
  title: string;
  company: string;
  location: string | null;
  isRemote: boolean | null;
  locationType: string | null;
  roleCategory: string | null;
  seniorityLevel: string | null;
}

const CAREER_PATH_LABELS: Record<string, string> = {
  "Legal Operations": "Legal Operations",
  "Compliance & Privacy": "Compliance & Privacy",
  "Legal Product Management": "Legal Product",
  "Legal Consulting & Advisory": "Legal Consulting",
  "Legal Sales & Client Solutions": "Legal Sales",
  "Legal Engineering": "Legal Engineering",
  "In-House Counsel": "In-House Counsel",
  "Legal AI & Analytics": "Legal AI & Analytics",
  "Contract Management": "Contract Management",
  "Litigation & eDiscovery": "Litigation & eDiscovery",
  "Knowledge Management": "Knowledge Management",
  "Intellectual Property & Innovation": "IP & Innovation",
};

export default function Landing() {
  usePageTitle();

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: featuredJobs } = useQuery<FeaturedJob[]>({
    queryKey: ["/api/featured-jobs"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: density } = useQuery<{ totalJobs: number; countriesCount: number; remoteShare: number; byCountry: { countryCode: string; countryName: string; jobCount: number; topCategories: string[] }[] }>({
    queryKey: ["/api/job-density"],
  });

  const topJobs = featuredJobs?.slice(0, 3);

  const careerPaths = stats?.categoryCounts
    ? Object.entries(stats.categoryCounts)
        .filter(([, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer" data-testid="logo-landing">
              <LogoMark className="h-5 w-5 text-foreground" />
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Legal Tech Careers
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/opportunity-map">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:inline-flex" data-testid="link-header-map">
                Map
              </Button>
            </Link>
            <Link href="/events">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:inline-flex" data-testid="link-header-events">
                Events
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:inline-flex" data-testid="link-header-pricing">
                Pricing
              </Button>
            </Link>
            <ThemeToggle />
            <Link href="/auth">
              <Button size="sm" data-testid="button-header-login">
                Sign In
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-14 flex-1">

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-20 pb-10 sm:pb-20">
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-16">
            <div className="flex-1 max-w-md lg:max-w-lg lg:pt-4">
              <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.2em] uppercase mb-4" data-testid="text-hero-label">
                Your next career move starts here
              </p>

              <h1
                className="text-4xl sm:text-5xl font-serif font-medium text-foreground leading-[1.08] tracking-tight"
                data-testid="text-hero-title"
              >
                Legal tech careers, made clear.
              </h1>

              <p
                className="text-base text-muted-foreground mt-5 leading-relaxed"
                data-testid="text-hero-subtitle"
              >
                Curated roles for legal professionals at every level. See where you fit, check your match, and apply with confidence.
              </p>

              <div className="mt-8 flex items-center gap-3 flex-wrap">
                <Button size="lg" asChild data-testid="button-hero-diagnostic">
                  <a href="/diagnostic">
                    See where you fit
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild data-testid="button-hero-browse">
                  <a href="/jobs">
                    Browse {stats?.totalJobs ? `${stats.totalJobs}+` : ""} roles
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3" data-testid="text-hero-trust">
                Free to start · No account needed
              </p>
            </div>

            <div className="w-full lg:w-[420px] shrink-0">
              <Card className="overflow-visible" data-testid="live-roles-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Live Roles</p>
                    {stats?.totalJobs && (
                      <Badge variant="secondary" className="text-[10px] font-semibold no-default-active-elevate" data-testid="badge-job-count">
                        {stats.totalJobs}+ open
                      </Badge>
                    )}
                  </div>
                  {topJobs && topJobs.length > 0 ? (
                    <div className="space-y-2">
                      {topJobs.map((job) => (
                        <Link key={job.id} href={`/jobs/${job.id}`}>
                          <div
                            className="rounded-md border border-border/50 p-3 hover-elevate cursor-pointer"
                            data-testid={`featured-job-${job.id}`}
                          >
                            <p className="text-sm font-medium text-foreground leading-snug" data-testid={`text-job-title-${job.id}`}>
                              {cleanStructuredText(job.title)}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3 shrink-0" />
                                {cleanStructuredText(job.company)}
                              </span>
                              {job.roleCategory && (
                                <Badge variant="outline" className="text-[9px] no-default-active-elevate">
                                  {cleanStructuredText(job.roleCategory)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-[72px] rounded-md bg-muted/20 animate-pulse" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {careerPaths.length > 0 && (
          <section className="border-t border-border/30">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-3xl font-serif font-medium text-foreground tracking-tight" data-testid="text-career-paths-title">
                  Browse by career path
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  Not sure what role to search for? Pick a path that matches your interests.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap max-w-2xl mx-auto" data-testid="career-paths-list">
                {careerPaths.map((path, index) => (
                  <Link key={path} href={`/jobs?category=${encodeURIComponent(path)}`} className={index >= 6 ? "hidden sm:block" : ""}>
                    <Badge
                      variant="outline"
                      className="text-xs px-3 sm:px-4 py-1.5 sm:py-2 cursor-pointer no-default-active-elevate hover-elevate"
                      data-testid={`career-path-${path.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {CAREER_PATH_LABELS[path] || path}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {density && density.countriesCount > 0 && (
          <section className="border-t border-border/30">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-12">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.2em] uppercase mb-3">
                    Global coverage
                  </p>
                  <h2
                    className="text-xl sm:text-3xl font-serif font-medium text-foreground tracking-tight"
                    data-testid="text-map-teaser-title"
                  >
                    See where legal tech is hiring
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md">
                    Explore opportunities across {density.countriesCount} countries. Click any region to see available roles instantly.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-4 sm:gap-6 mt-5">
                    <div>
                      <p className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-map-teaser-countries">{density.countriesCount}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Countries</p>
                    </div>
                    <div className="w-px h-8 bg-border/40" />
                    <div>
                      <p className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-map-teaser-jobs">{density.totalJobs}+</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Roles</p>
                    </div>
                    <div className="w-px h-8 bg-border/40" />
                    <div className="flex items-center gap-1">
                      <div>
                        <p className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-map-teaser-remote">{density.remoteShare}%</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Remote</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button asChild data-testid="button-map-teaser-explore">
                      <a href="/opportunity-map">
                        <Globe className="mr-2 h-4 w-4" />
                        Explore the map
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="w-full sm:w-[280px] lg:w-[340px] shrink-0">
                  <div className="rounded-md border border-border/50 bg-muted/20 dark:bg-muted/10 p-4">
                    <p className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase mb-3">Top hiring regions</p>
                    <div className="space-y-2">
                      {density?.byCountry
                        ?.filter((c) => c.jobCount > 0 && c.countryCode !== "UN" && c.countryName !== "Unknown")
                        .sort((a, b) => b.jobCount - a.jobCount)
                        .slice(0, 5)
                        .map((region) => (
                          <a
                            key={region.countryCode}
                            href={`/jobs?country=${region.countryCode}`}
                            className="flex items-center justify-between gap-2 text-sm hover-elevate rounded-md px-2 py-1.5 -mx-2 cursor-pointer"
                            data-testid={`link-region-${region.countryCode}`}
                          >
                            <span className="flex items-center gap-2">
                              {region.countryCode === "WW" ? (
                                <Wifi className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              ) : (
                                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                              <span className="text-foreground text-xs">{region.countryName}</span>
                            </span>
                            <span className="text-muted-foreground text-xs tabular-nums">{region.jobCount}</span>
                          </a>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="border-t border-border/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
            <div className="text-center mb-6 sm:mb-10">
              <h2 className="text-xl sm:text-3xl font-serif font-medium text-foreground tracking-tight" data-testid="text-how-it-works-title">
                How it works
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10 max-w-3xl mx-auto" data-testid="how-it-works-steps">
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Browse & Search</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Curated roles from {stats?.totalCompanies ? `${stats.totalCompanies}+` : "200+"} legal tech companies, organized by career path.
                </p>
              </div>
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Check Your Fit</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload your resume and see how you match. Get a clear fit score and actionable next steps.
                </p>
              </div>
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Apply with Confidence</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tailor your resume, compare offers, and apply knowing where you stand.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/30 bg-primary/[0.02] dark:bg-primary/[0.04]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
              <div className="flex-1 text-center lg:text-left">
                <p className="text-[11px] font-semibold text-muted-foreground tracking-[0.2em] uppercase mb-3">
                  Career Diagnostic
                </p>
                <h2
                  className="text-xl sm:text-3xl font-serif font-medium text-foreground tracking-tight"
                  data-testid="text-diagnostic-teaser-title"
                >
                  See where you stand in 60 seconds
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md mx-auto lg:mx-0">
                  Upload your resume and get a personalized readiness report — skill gaps, matching roles, and a 30-day action plan to break into legal tech.
                </p>
                <div className="space-y-3 mt-6 max-w-sm mx-auto lg:mx-0">
                  <div className="flex items-center gap-3 text-sm" data-testid="diagnostic-benefit-1">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-foreground">Readiness score across 7 skill categories</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm" data-testid="diagnostic-benefit-2">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-foreground">Roles you qualify for right now</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm" data-testid="diagnostic-benefit-3">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-foreground">30-day transition plan tied to real jobs</span>
                  </div>
                </div>
                <div className="mt-7">
                  <Button asChild data-testid="button-diagnostic-cta">
                    <a href="/auth">
                      <Brain className="mr-2 h-4 w-4" />
                      Get your diagnostic
                    </a>
                  </Button>
                </div>
              </div>
              <div className="w-full lg:w-[340px] shrink-0">
                <Card className="overflow-hidden" data-testid="diagnostic-preview-card">
                  <CardContent className="p-5">
                    <p className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase mb-4">Sample Report Preview</p>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative flex items-center justify-center shrink-0">
                        <svg className="w-[72px] h-[72px] -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                          <circle cx="50" cy="50" r="42" fill="none" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 42}`}
                            strokeDashoffset={`${2 * Math.PI * 42 - (58 / 100) * 2 * Math.PI * 42}`}
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-lg font-bold text-foreground">58</span>
                          <span className="text-[8px] text-muted-foreground">Readiness</span>
                        </div>
                      </div>
                      <div className="space-y-1.5 min-w-0">
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">3 Ready roles</Badge>
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">5 Near-Ready</Badge>
                        <Badge variant="secondary" className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20">2 Stretch</Badge>
                      </div>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">Contract Drafting</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "82%" }} />
                          </div>
                          <span className="text-foreground font-medium w-6 text-right">82</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">Legal Tech Tools</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: "54%" }} />
                          </div>
                          <span className="text-foreground font-medium w-6 text-right">54</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">Data Analytics</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500/60 rounded-full" style={{ width: "28%" }} />
                          </div>
                          <span className="text-foreground font-medium w-6 text-right">28</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-2.5">
                      Top path: <span className="font-medium text-foreground">Legal Operations</span> · 87% match
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {stats && (
          <section className="border-t border-border/30">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
              <div className="flex items-center justify-center gap-10 sm:gap-24 flex-wrap" data-testid="stats-bar">
                {stats.totalJobs > 0 && (
                  <div className="text-center">
                    <p className="text-2xl sm:text-4xl font-semibold text-foreground" data-testid="stat-jobs">{stats.totalJobs}+</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Curated roles</p>
                  </div>
                )}
                {stats.totalCompanies > 0 && (
                  <div className="text-center">
                    <p className="text-2xl sm:text-4xl font-semibold text-foreground" data-testid="stat-companies">{stats.totalCompanies}+</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Companies</p>
                  </div>
                )}
                {stats.totalCategories > 0 && (
                  <div className="text-center">
                    <p className="text-2xl sm:text-4xl font-semibold text-foreground" data-testid="stat-categories">{stats.totalCategories}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Career paths</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="border-t border-border/30 bg-muted/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
            <div className="text-center mb-6 sm:mb-10">
              <h2 className="text-xl sm:text-3xl font-serif font-medium text-foreground tracking-tight" data-testid="text-pro-title">
                Go further with Pro
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
                Everything you need to move from browsing to applying, starting at $2.50/mo.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto" data-testid="pro-features-grid">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <Brain className="h-4 w-4 text-foreground shrink-0" />
                  <h3 className="text-sm font-semibold text-foreground">Full Career Diagnostic</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-[26px]">
                  Unlock your complete readiness report — all career paths, detailed skill gaps, and a full 30-day transition plan.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <Target className="h-4 w-4 text-foreground shrink-0" />
                  <h3 className="text-sm font-semibold text-foreground">Per-Job Fit Scores</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-[26px]">
                  See exactly how your experience lines up with each role, with specific gap analysis and match breakdowns.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-foreground shrink-0" />
                  <h3 className="text-sm font-semibold text-foreground">Resume Tailoring</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-[26px]">
                  Rewrite your bullet points to match the language and keywords each employer uses.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <Search className="h-4 w-4 text-foreground shrink-0" />
                  <h3 className="text-sm font-semibold text-foreground">Smart Search & Alerts</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-[26px]">
                  Search in plain English and get notified when matching roles appear. Never miss the right opportunity.
                </p>
              </div>
            </div>
            <div className="text-center mt-8">
              <Button variant="outline" asChild data-testid="button-pro-pricing">
                <a href="/pricing">
                  See pricing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
