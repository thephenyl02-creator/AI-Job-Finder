import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { cleanStructuredText } from "@/lib/structured-description";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import { Footer } from "@/components/footer";

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

  const topJobs = featuredJobs?.slice(0, 3);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <nav className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
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
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 leading-snug tracking-tight" data-testid="text-hero-title">
              Where legal meets tech.
            </h1>

            <p className="text-base text-muted-foreground mb-8 leading-relaxed" data-testid="text-hero-subtitle">
              Curated roles at companies that value your legal background.
            </p>

            <Button size="lg" asChild data-testid="button-hero-browse">
              <a href="/jobs">
                See open roles
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>

        {topJobs && topJobs.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-5" data-testid="text-featured-label">
              Recently added
            </p>
            <div className="space-y-1" data-testid="featured-jobs-list">
              {topJobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div
                    className="group flex items-center justify-between gap-4 py-4 px-1 border-b border-border/40 hover-elevate cursor-pointer rounded-md"
                    data-testid={`featured-job-${job.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground group-hover:text-foreground/80 truncate" data-testid={`text-job-title-${job.id}`}>
                        {cleanStructuredText(job.title)}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
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
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6">
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" data-testid="link-view-all-jobs">
                  View all open roles
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </section>
        )}

        {(!topJobs || topJobs.length === 0) && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-md bg-muted/30 animate-pulse" />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
