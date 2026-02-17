import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { cleanStructuredText } from "@/lib/structured-description";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import { Footer } from "@/components/footer";
import { useMemo } from "react";

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

  const { data: featuredJobs } = useQuery<FeaturedJob[]>({
    queryKey: ["/api/featured-jobs"],
    refetchInterval: 30000,
  });

  const topJobs = featuredJobs?.slice(0, 4);

  const companyNames = useMemo(() => {
    if (!featuredJobs || featuredJobs.length === 0) return null;
    const unique = [...new Set(featuredJobs.map(j => cleanStructuredText(j.company)))];
    return unique.slice(0, 4);
  }, [featuredJobs]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <nav className="max-w-3xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-2">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer" data-testid="logo-landing">
              <LogoMark className="h-5 w-5 text-foreground" />
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Legal Tech Careers
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <Link href="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="button-header-login">
                Sign in
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-14 flex-1">

        <section className="max-w-3xl mx-auto px-5 sm:px-8 pt-20 sm:pt-32 pb-12 sm:pb-16">
          <div className="max-w-lg">
            <h1
              className="text-3xl sm:text-[2.75rem] font-serif font-medium text-foreground leading-[1.15] tracking-tight"
              data-testid="text-hero-title"
            >
              You already have the hardest qualification.
            </h1>

            <p
              className="text-base sm:text-lg text-muted-foreground mt-5 leading-relaxed"
              data-testid="text-hero-subtitle"
            >
              Find roles where your legal background is what they're looking for.
            </p>

            <div className="mt-8 flex items-center gap-4 flex-wrap">
              <Button size="lg" asChild data-testid="button-hero-browse">
                <a href="/jobs">
                  See open roles
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Link href="/auth?returnTo=/jobs">
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-hero-signup">
                  or create a free account
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70" data-testid="value-strip">
            <span>Curated for legal professionals</span>
            <span aria-hidden="true" className="text-border">·</span>
            <span>Resume matching</span>
            <span aria-hidden="true" className="text-border">·</span>
            <span>Career guidance</span>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-5 sm:px-8 pt-10 pb-20 sm:pb-28">
          {companyNames && companyNames.length > 0 && (
            <p className="text-xs text-muted-foreground mb-6" data-testid="text-trust-companies">
              Roles from {companyNames.join(", ")}, and others
            </p>
          )}

          {topJobs && topJobs.length > 0 ? (
            <div data-testid="featured-jobs-list">
              {topJobs.map((job, index) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div
                    className={`group flex items-center justify-between gap-4 py-5 px-2 hover-elevate cursor-pointer rounded-md ${
                      index < topJobs.length - 1 ? "border-b border-border/30" : ""
                    }`}
                    data-testid={`featured-job-${job.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate" data-testid={`text-job-title-${job.id}`}>
                          {cleanStructuredText(job.title)}
                        </p>
                        {job.roleCategory && (
                          <Badge variant="outline" className="text-[10px] shrink-0 no-default-active-elevate">
                            {cleanStructuredText(job.roleCategory)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {cleanStructuredText(job.company)}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {cleanStructuredText(job.location)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 transition-colors" />
                  </div>
                </Link>
              ))}

              <div className="mt-5">
                <Link href="/jobs">
                  <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 -ml-2" data-testid="link-view-all-jobs">
                    View all roles
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[72px] rounded-md bg-muted/20 animate-pulse" />
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-border/30">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-24 text-center">
            <p
              className="text-lg sm:text-xl font-serif font-medium text-foreground tracking-tight"
              data-testid="text-closing"
            >
              Your next role is closer than you think.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <Button size="lg" asChild data-testid="button-closing-browse">
                <a href="/jobs">
                  Start exploring
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Link href="/auth?returnTo=/jobs">
                <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-closing-signup">
                  Sign up free
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
