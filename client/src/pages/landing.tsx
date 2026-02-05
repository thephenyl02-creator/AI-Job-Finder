import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Briefcase,
  TrendingUp,
  Scale,
  Users,
  GraduationCap,
  ArrowRight,
  FileText,
  Target,
  BookOpen,
  RefreshCw,
  Rocket,
  Building2,
  FolderOpen,
  ChevronRight,
  Compass,
  MapPin,
} from "lucide-react";

interface Stats {
  totalJobs: number;
  totalCompanies: number;
  totalCategories: number;
}

export default function Landing() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3" data-testid="logo-landing">
            <Scale className="h-6 w-6 text-foreground" />
            <span className="text-base font-semibold text-foreground tracking-tight">
              Legal Tech Careers
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild data-testid="button-header-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </nav>
      </header>

      <main className="pt-16">
        <section className="relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-32 pb-16 sm:pb-24">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-6" data-testid="text-hero-label">
                For Lawyers Interested in Technology
              </p>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium text-foreground mb-6 leading-[1.15] tracking-tight" data-testid="text-hero-title">
                Your next career move starts here
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed" data-testid="text-hero-subtitle">
                Browse real job openings at companies building the future of legal technology. Search by role, experience level, or describe what you're looking for.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-3 mb-16">
                <Button size="lg" asChild className="text-base px-8" data-testid="button-hero-get-started">
                  <a href="/api/login">
                    Browse Jobs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-hero-post-job">
                  <a href="/post-job">
                    Post a Job
                  </a>
                </Button>
              </div>

              <div className="flex items-center gap-8 sm:gap-12" data-testid="stats-section">
                <div data-testid="stat-jobs">
                  <div className="text-3xl sm:text-4xl font-serif font-medium text-foreground tabular-nums">
                    {stats?.totalJobs ?? "\u2014"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">Open positions</div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div data-testid="stat-companies">
                  <div className="text-3xl sm:text-4xl font-serif font-medium text-foreground tabular-nums">
                    {stats?.totalCompanies ?? "\u2014"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">Companies</div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div data-testid="stat-categories">
                  <div className="text-3xl sm:text-4xl font-serif font-medium text-foreground tabular-nums">
                    {stats?.totalCategories ?? "\u2014"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">Career paths</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-4">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight">
              Three ways to find your next role
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mb-12">
              No technical skills needed. Just describe what you're looking for.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-background border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-foreground">
                      <Search className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Step 1</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-feature-search">
                    Search in plain English
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Type what you're looking for in your own words. Something like "product role at a legal tech startup, remote." We'll find the best matches.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Step 2</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-feature-resume">
                    Upload your resume
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We'll read your experience and match you with roles where your legal background is an advantage. See exactly how well you fit each position.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-foreground">
                      <Compass className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Step 3</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-feature-advisor">
                    Compare opportunities
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Torn between offers? Our Career Advisor compares 2-3 jobs side by side and shows how your legal experience transfers to each.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-4">
              Who this is for
            </p>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight">
              Built for legal professionals
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mb-12">
              Whether you're a seasoned attorney or a law student exploring options.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: GraduationCap,
                  title: "Attorneys",
                  description: "Transition from practice to product, operations, or consulting roles at legal tech companies.",
                },
                {
                  icon: Users,
                  title: "Paralegals & Legal Ops",
                  description: "Your expertise in document management, workflows, and legal processes is in high demand.",
                },
                {
                  icon: RefreshCw,
                  title: "Career changers",
                  description: "Moving from traditional practice? Your legal knowledge is a competitive advantage in tech.",
                },
                {
                  icon: BookOpen,
                  title: "Law students",
                  description: "Start your career where law meets technology. Find internships and entry-level positions.",
                },
                {
                  icon: TrendingUp,
                  title: "Multi-practice lawyers",
                  description: "Cross-functional experience in IP, contracts, or compliance translates directly to legal tech.",
                },
                {
                  icon: Rocket,
                  title: "Tech-curious professionals",
                  description: "No coding required. Strategy, domain expertise, and legal knowledge open many doors.",
                },
              ].map((audience, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-md"
                  data-testid={`audience-card-${index}`}
                >
                  <div className="w-9 h-9 rounded-md bg-background border border-border/60 flex items-center justify-center shrink-0">
                    <audience.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {audience.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {audience.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight">
                Ready to explore?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Free to use. Sign in to search, upload your resume, and compare opportunities.
              </p>
              <Button size="lg" asChild className="text-base px-10" data-testid="button-cta-sign-up">
                <a href="/api/login">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Legal Tech Careers
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Connecting legal professionals with technology careers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
