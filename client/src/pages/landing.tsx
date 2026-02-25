import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { ArrowRight, Search, Target, Globe, Wifi, Clock, BarChart3, Lock, Upload, Check } from "lucide-react";
import { Footer } from "@/components/footer";

interface Stats {
  totalJobs: number;
  totalCompanies: number;
  totalCategories: number;
  categoryCounts: Record<string, number>;
  totalUsers?: number;
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
  const { isAuthenticated } = useAuth();

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: latestDiag } = useQuery<any>({
    queryKey: ["/api/diagnostic/latest"],
    enabled: isAuthenticated,
  });

  const hasDiagnostic = !!latestDiag?.report;

  const { data: density } = useQuery<{ totalJobs: number; countriesCount: number; remoteShare: number; byCountry: { countryCode: string; countryName: string; jobCount: number; topCategories: string[] }[] }>({
    queryKey: ["/api/job-density"],
  });

  const careerPathsWithCounts = stats?.categoryCounts
    ? Object.entries(stats.categoryCounts)
        .filter(([, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
    : [];
  const careerPaths = careerPathsWithCounts.map(([name]) => name);

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

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
          <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-20">
            <div className="flex-1 max-w-md lg:max-w-lg lg:pt-4">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-[0.2em] uppercase mb-10" data-testid="text-hero-label">
                Career intelligence for legal professionals
              </p>

              <h1
                className="text-4xl sm:text-5xl font-serif font-medium text-foreground leading-[1.5]"
                data-testid="text-hero-title"
              >
                Where do you fit in legal tech?
              </h1>

              <p
                className="text-base text-muted-foreground mt-10 leading-relaxed"
                data-testid="text-hero-subtitle"
              >
                Upload your resume. In 60 seconds, see your readiness score, matching career paths, and a plan to get there.
              </p>

              <div className="mt-10 flex items-center gap-4 flex-wrap">
                <Button size="lg" asChild data-testid="button-hero-diagnostic">
                  <a href="/diagnostic" onClick={() => {
                    if (!hasDiagnostic) {
                      try { navigator.sendBeacon("/api/track", new Blob([JSON.stringify({ eventType: "landing_cta_click" })], { type: "application/json" })); } catch {};
                    }
                  }}>
                    {hasDiagnostic ? "View your results" : "Check Your Fit"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <a href="/jobs" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-hero-browse">
                  or browse {stats?.totalJobs ? `${stats.totalJobs}+` : ""} roles →
                </a>
              </div>

              <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap" data-testid="text-hero-trust">
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private by default</span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Results in ~90 seconds</span>
                <span className="text-border">·</span>
                <span>No account needed</span>
              </div>

              <p className="mt-4">
                <a href="/quiz" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5" data-testid="link-hero-quiz">
                  <Search className="h-3.5 w-3.5" />
                  Not sure yet? Take a 30-second career quiz →
                </a>
              </p>
            </div>

            <div className="w-full lg:w-[420px] shrink-0">
              <Card className="overflow-visible card-elev-prominent" data-testid="diagnostic-preview-card">
                <CardContent className="p-5">
                  <p className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase mb-4">Sample Readiness Report</p>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex items-center justify-center shrink-0">
                      <svg className="w-[72px] h-[72px] -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--status-warning))" strokeWidth="6" strokeLinecap="round"
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
                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 no-default-active-elevate">3 Ready roles</Badge>
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 no-default-active-elevate">5 Near-Ready</Badge>
                      <Badge variant="secondary" className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 no-default-active-elevate">2 Stretch</Badge>
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
        </section>

        {stats && (
          <section className="border-t border-border/30" data-testid="stats-strip-section">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
              <div className="flex items-center justify-center gap-6 sm:gap-10 text-sm text-muted-foreground flex-wrap" data-testid="stats-strip">
                {stats.totalJobs > 0 && (
                  <span data-testid="stat-jobs"><span className="font-semibold text-foreground">{stats.totalJobs}+</span> curated roles</span>
                )}
                <span className="text-border hidden sm:inline">·</span>
                {stats.totalCompanies > 0 && (
                  <span data-testid="stat-companies"><span className="font-semibold text-foreground">{stats.totalCompanies}+</span> companies</span>
                )}
                <span className="text-border hidden sm:inline">·</span>
                {stats.totalCategories > 0 && (
                  <span data-testid="stat-categories"><span className="font-semibold text-foreground">{stats.totalCategories}</span> career paths</span>
                )}
                {(stats.totalUsers || 0) > 10 && (
                  <>
                    <span className="text-border hidden sm:inline">·</span>
                    <span data-testid="stat-users"><span className="font-semibold text-foreground">{stats.totalUsers}+</span> lawyers assessed</span>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="border-t border-border/30 bg-muted/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-xl sm:text-3xl font-serif font-medium text-foreground" data-testid="text-how-it-works-title">
                How it works
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 max-w-3xl mx-auto" data-testid="how-it-works-steps">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-background border border-border/50 flex items-center justify-center mx-auto">
                  <Upload className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Upload your resume</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  PDF or Word. We extract your skills, experience, and practice areas in seconds. Nothing leaves our servers.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-background border border-border/50 flex items-center justify-center mx-auto">
                  <BarChart3 className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">See where you stand</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your readiness score, top career paths, skill gaps, and a week-by-week plan to close them.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-background border border-border/50 flex items-center justify-center mx-auto">
                  <Target className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Apply with confidence</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Matched roles ranked by fit. Tailored resume suggestions. You'll know exactly why you're a good candidate.
                </p>
              </div>
            </div>
            <div className="text-center mt-10">
              <Button size="lg" asChild data-testid="button-how-it-works-cta">
                <a href="/diagnostic">
                  Check Your Fit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {careerPaths.length > 0 && (
          <section className="border-t border-border/30">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
              <div className="text-center mb-8 sm:mb-10">
                <h2 className="text-xl sm:text-3xl font-serif font-medium text-foreground" data-testid="text-career-paths-title">
                  Career paths we map you to
                </h2>
                <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto">
                  Upload your resume to see which paths match your background and how close you are to each one.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap max-w-2xl mx-auto" data-testid="career-paths-list">
                {careerPathsWithCounts.map(([path, count], index) => (
                  <a key={path} href="/diagnostic" className={index >= 6 ? "hidden sm:block" : ""}>
                    <Badge
                      variant="outline"
                      className="text-xs px-3 sm:px-4 py-1.5 sm:py-2 cursor-pointer no-default-active-elevate hover-elevate"
                      data-testid={`career-path-${path.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {CAREER_PATH_LABELS[path] || path}
                      <span className="ml-1.5 text-muted-foreground font-normal">{count}</span>
                    </Badge>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {density && density.countriesCount > 0 && (
          <section className="border-t border-border/30 bg-muted/20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
              <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-[10px] font-semibold text-muted-foreground tracking-[0.2em] uppercase mb-3">
                    Global coverage
                  </p>
                  <h2
                    className="text-xl sm:text-3xl font-serif font-medium text-foreground"
                    data-testid="text-map-teaser-title"
                  >
                    See where legal tech is hiring
                  </h2>
                  <p className="text-sm text-muted-foreground mt-3 max-w-md">
                    Explore opportunities across {density.countriesCount} countries. Click any region to see available roles instantly.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-5 sm:gap-6 mt-6">
                    <div>
                      <p className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-map-teaser-countries">{density.countriesCount}</p>
                      <p className="text-xs text-muted-foreground">Countries</p>
                    </div>
                    <div className="w-px h-8 bg-border/40" />
                    <div>
                      <p className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-map-teaser-jobs">{density.totalJobs}+</p>
                      <p className="text-xs text-muted-foreground">Roles</p>
                    </div>
                    <div className="w-px h-8 bg-border/40" />
                    <div>
                      <p className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-map-teaser-remote">{density.remoteShare}%</p>
                      <p className="text-xs text-muted-foreground">Remote</p>
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
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-3xl font-serif font-medium text-foreground" data-testid="text-pro-title">
                Free vs Pro
              </h2>
              <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto">
                Get started for free. Upgrade when you're ready to go deeper.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto" data-testid="pro-comparison">
              <div className="rounded-lg border border-border/40 bg-background p-6 space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Free</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    Readiness score
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    Top career path
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    Key skill snapshot
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    Browse all jobs
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border-2 border-primary/30 bg-background p-6 space-y-4 relative">
                <Badge variant="secondary" className="absolute -top-2.5 right-4 text-[10px] no-default-active-elevate">From $2.50/mo</Badge>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Pro</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Full diagnostic report with all career paths
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    30-day transition plan
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Per-job fit scores and gap analysis
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Resume tailoring for each role
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Smart search and job alerts
                  </li>
                </ul>
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

        <section className="border-t border-border/30 bg-muted/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
            <div className="text-center space-y-5" data-testid="final-cta-section">
              <h2 className="text-xl sm:text-3xl font-serif font-medium text-foreground">
                Ready to find out where you fit?
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                It takes 60 seconds. No account needed.
              </p>
              <Button size="lg" asChild data-testid="button-final-cta">
                <a href="/diagnostic">
                  Check Your Fit
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
