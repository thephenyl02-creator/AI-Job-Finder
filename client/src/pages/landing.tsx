import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { cleanStructuredText } from "@/lib/structured-description";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { ArrowRight, Building2, Search, FileText, Target, ChevronRight, Briefcase, MapPin } from "lucide-react";
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

export default function Landing() {
  usePageTitle();
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
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
          <div className="flex items-center gap-0.5 sm:gap-3">
            <Link href="/jobs">
              <Button variant="ghost" size="sm" className="text-muted-foreground min-h-[44px] px-2 sm:px-3" data-testid="link-landing-browse">
                Browse Jobs
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground min-h-[44px] px-2 sm:px-3 hidden sm:inline-flex" data-testid="link-landing-pricing">
                Pricing
              </Button>
            </Link>
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <Link href="/auth">
              <Button size="sm" className="min-h-[44px]" data-testid="button-header-login">Sign In</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-16 flex-1">
        <section className="relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-12 sm:pb-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-muted-foreground tracking-[0.22em] uppercase mb-4" data-testid="text-hero-label">
                For lawyers and paralegals
              </p>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold text-foreground mb-5 leading-[1.08] tracking-tight" data-testid="text-hero-title">
                Your legal expertise is your advantage in tech.
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl" data-testid="text-hero-subtitle">
                {stats?.totalJobs ? `${stats.totalJobs}+ curated roles` : "Hundreds of curated roles"} at {stats?.totalCompanies ? `${stats.totalCompanies}+` : ""} legal tech companies where your background isn't just relevant — it's the requirement.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-3 mb-3">
                <Button size="lg" asChild className="text-base px-8" data-testid="button-hero-browse">
                  <a href="/jobs">
                    Browse roles
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-hero-signup">
                  <a href="/auth?returnTo=/jobs">
                    Create free account
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground" data-testid="text-hero-trust">
                Free to browse. Upload your resume to see your match.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <div className="flex items-center justify-between gap-2 mb-5">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide" data-testid="text-live-roles-heading">
                Open now
              </h2>
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" data-testid="link-view-all-jobs">
                  View all
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="featured-jobs-grid">
              {featuredJobs?.slice(0, 6).map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <Card className="h-full hover-elevate cursor-pointer" data-testid={`featured-job-card-${job.id}`}>
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-foreground truncate mb-1.5" data-testid={`text-job-title-${job.id}`}>
                        {cleanStructuredText(job.title)}
                      </p>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{cleanStructuredText(job.company)}</span>
                        </span>
                        <JobLocation location={job.location} locationType={job.locationType} isRemote={job.isRemote} showTypeBadge={false} size="sm" />
                      </div>
                      {job.roleCategory && (
                        <Badge variant="outline" className="text-[10px]">
                          {cleanStructuredText(job.roleCategory)}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {(!featuredJobs || featuredJobs.length === 0) && (
                <>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-24 rounded-md bg-muted/40 animate-pulse" />
                  ))}
                </>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight" data-testid="text-how-it-works-title">
                Three steps to your next role
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                No noise, no guesswork — just a clear path from browsing to applying.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto" data-testid="how-it-works-steps">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Search className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Browse curated roles</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Every listing is vetted for legal professionals. No dev-only jobs, no irrelevant noise.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Target className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">See your fit</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload your resume and instantly see how you match against any role. Free for everyone.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <FileText className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Improve and apply</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Get line-by-line resume suggestions. Accept, reject, and apply with a stronger resume.
                </p>
              </div>
            </div>
            <div className="text-center mt-8">
              <Button asChild data-testid="button-steps-cta">
                <a href="/jobs">
                  Start browsing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
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
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight" data-testid="text-final-cta-title">
                Your background is the qualification.
              </h2>
              <p className="text-base text-muted-foreground mb-8 max-w-lg mx-auto">
                Legal tech companies need people who understand both law and technology. That's you. See where you fit.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" asChild className="text-base px-10" data-testid="button-cta-browse">
                  <a href="/jobs">
                    Browse roles
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-cta-signup">
                  <a href="/auth?returnTo=/jobs">
                    Create free account
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
