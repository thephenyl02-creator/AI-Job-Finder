import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { cleanStructuredText } from "@/lib/structured-description";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { ArrowRight, Building2, Search, FileText, Target, Sparkles } from "lucide-react";
import { JobLocation } from "@/components/job-location";
import { Footer } from "@/components/footer";

interface Stats {
  totalJobs: number;
  totalCompanies: number;
  totalCategories: number;
  totalEvents: number;
  upcomingEvents: number;
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

const careerPaths: { label: string; category: string }[] = [
  { label: "Legal Operations", category: "Legal Operations" },
  { label: "Compliance & Privacy", category: "Compliance & Privacy" },
  { label: "Legal Product", category: "Legal Product Management" },
  { label: "In-House Counsel", category: "In-House Counsel" },
  { label: "Contract Management", category: "Contract Management" },
  { label: "Legal Engineering", category: "Legal Engineering" },
  { label: "Legal Consulting", category: "Legal Consulting & Advisory" },
  { label: "Legal Sales", category: "Legal Sales & Client Solutions" },
  { label: "Legal AI & Analytics", category: "Legal AI & Analytics" },
];

export default function Landing() {
  usePageTitle();
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 10000,
  });

  const { data: featuredJobs } = useQuery<FeaturedJob[]>({
    queryKey: ["/api/featured-jobs"],
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <Link href="/">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer min-h-[44px]" data-testid="logo-landing">
              <LogoMark className="h-6 w-6 text-foreground" />
              <span className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
                Legal Tech Careers
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link href="/events">
              <Button variant="ghost" size="sm" className="text-muted-foreground min-h-[44px]" data-testid="link-landing-events">
                Events
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground min-h-[44px]" data-testid="link-landing-pricing">
                Pricing
              </Button>
            </Link>
            <ThemeToggle />
            <Link href="/auth">
              <Button className="min-h-[44px]" data-testid="button-header-login">Sign In</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-16 flex-1">
        <section className="relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-10 sm:pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <div>
                <p className="text-xs font-semibold text-muted-foreground tracking-[0.22em] uppercase mb-4" data-testid="text-hero-label">
                  Your next career move starts here
                </p>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-5 leading-[1.05] tracking-tight max-w-[560px]" data-testid="text-hero-title">
                  Legal tech careers, made clear.
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground mb-7 leading-relaxed max-w-[560px]" data-testid="text-hero-subtitle">
                  Curated roles for legal professionals at every level. See where you fit, check your match, and apply with confidence.
                </p>

                <div className="flex items-start gap-3 mb-3">
                  <Button size="lg" asChild className="text-base px-8" data-testid="button-hero-explore">
                    <a href="/jobs">
                      Start exploring
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground" data-testid="text-hero-trust">
                  Free to browse &bull; No account needed
                </p>
              </div>

              <div className="hidden lg:block" data-testid="hero-job-preview">
                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live roles</p>
                    {stats?.totalJobs ? (
                      <Badge variant="secondary" className="text-xs" data-testid="badge-job-count">
                        {stats.totalJobs}+ open
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-2.5">
                    {featuredJobs?.slice(0, 3).map((job, i) => (
                      <Card key={job.id} className="border-border/60 bg-background" data-testid={`hero-job-card-${i}`}>
                        <CardContent className="p-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">{cleanStructuredText(job.title)}</p>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{cleanStructuredText(job.company)}</span>
                                </span>
                                <JobLocation location={job.location} locationType={job.locationType} isRemote={job.isRemote} showTypeBadge={false} size="sm" />
                              </div>
                            </div>
                            {job.roleCategory && (
                              <Badge variant="outline" className="text-[10px] shrink-0 whitespace-nowrap">
                                {cleanStructuredText(job.roleCategory)}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {(!featuredJobs || featuredJobs.length === 0) && (
                      <div className="space-y-2.5">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-16 rounded-md bg-muted/40 animate-pulse" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:hidden mt-4" data-testid="hero-job-preview-mobile">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live roles</p>
                  {stats?.totalJobs ? (
                    <Badge variant="secondary" className="text-xs" data-testid="badge-job-count-mobile">
                      {stats.totalJobs}+ open
                    </Badge>
                  ) : null}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
                  {featuredJobs?.slice(0, 4).map((job, i) => (
                    <div key={job.id} className="snap-start shrink-0 w-[260px]">
                      <Card className="bg-background/80 backdrop-blur-sm border-border/50 h-full" data-testid={`hero-job-card-mobile-${i}`}>
                        <CardContent className="p-3">
                          <p className="text-sm font-semibold text-foreground truncate">{cleanStructuredText(job.title)}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                              <Building2 className="h-3 w-3 shrink-0" />
                              {cleanStructuredText(job.company)}
                            </span>
                          </div>
                          <JobLocation location={job.location} locationType={job.locationType} isRemote={job.isRemote} showTypeBadge={false} size="sm" className="mt-1 text-xs text-muted-foreground" />
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                  {(!featuredJobs || featuredJobs.length === 0) && (
                    <div className="flex gap-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="shrink-0 w-[260px] h-[76px] rounded-md bg-muted/40 animate-pulse" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="career-paths" className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight" data-testid="text-career-paths-title">
                Browse by career path
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Not sure what role to search for? Pick a path that matches your interests.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5" data-testid="career-paths-chips">
              {careerPaths.map((path) => (
                <Link key={path.category} href={`/jobs?category=${encodeURIComponent(path.category)}`}>
                  <Badge
                    variant="outline"
                    className="text-sm px-4 py-1.5 cursor-pointer"
                    data-testid={`chip-career-path-${path.label.toLowerCase().replace(/[\s\/&]+/g, "-")}`}
                  >
                    {path.label}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight" data-testid="text-how-it-works-title">
                How it works
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto" data-testid="how-it-works-steps">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Search className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Browse & Search</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Curated roles from 200+ legal tech companies, organized by career path. No noise, no irrelevant listings.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Target className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Check Your Fit</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload your resume and see how you match. Get a clear fit score, gap analysis, and suggestions for every role.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <FileText className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Apply with Confidence</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tailor your resume, compare offers, and apply knowing exactly where you stand. No guesswork.
                </p>
              </div>
            </div>
          </div>
        </section>

        {stats && (stats.totalJobs > 0 || stats.totalCompanies > 0) && (
          <section className="border-t border-border/40 bg-muted/30">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
              <div className="flex items-center justify-center gap-8 sm:gap-16 flex-wrap" data-testid="stats-bar">
                {stats.totalJobs > 0 && (
                  <div className="text-center">
                    <p className="text-2xl sm:text-3xl font-semibold text-foreground" data-testid="stat-jobs">{stats.totalJobs}+</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Curated roles</p>
                  </div>
                )}
                {stats.totalCompanies > 0 && (
                  <div className="text-center">
                    <p className="text-2xl sm:text-3xl font-semibold text-foreground" data-testid="stat-companies">{stats.totalCompanies}+</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Companies</p>
                  </div>
                )}
                {stats.totalCategories > 0 && (
                  <div className="text-center">
                    <p className="text-2xl sm:text-3xl font-semibold text-foreground" data-testid="stat-categories">{stats.totalCategories}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Career paths</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight" data-testid="text-pro-preview-title">
                  Go further with Pro
                </h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  Everything you need to move from browsing to applying, starting at $2.50/mo.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Target className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Resume Match Scores</p>
                    <p className="text-xs text-muted-foreground mt-0.5">See exactly how your experience lines up with each role, with specific gap analysis.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Sparkles className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Resume Tailoring</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Rewrite your bullet points to match the language and keywords each employer uses.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <Search className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Guided Search</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Describe what you want in plain English. We'll ask a few questions and find your best-fit roles.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <FileText className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Job Alerts</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Get notified when roles matching your profile are posted. Never miss the right opportunity.</p>
                  </div>
                </div>
              </div>
              <div className="text-center mt-6">
                <Button variant="outline" asChild data-testid="button-landing-pricing">
                  <Link href="/pricing">
                    See pricing
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight" data-testid="text-final-cta-title">
                Ready to find your next role?
              </h2>
              <p className="text-base text-muted-foreground mb-8 max-w-lg mx-auto">
                Browse roles for free. Go Pro for resume matching, fit checks, and job alerts the moment a role fits your profile.
              </p>
              <Button size="lg" asChild className="text-base px-10" data-testid="button-cta-explore">
                <a href="/jobs">
                  Start exploring
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
