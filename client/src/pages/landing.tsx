import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Search, Briefcase, TrendingUp, Scale, Users, GraduationCap, ArrowRight, FileText, Target, BookOpen, Rocket, RefreshCw, Building2, FolderOpen } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Smart Search",
    description: "Describe your ideal role in plain English. Find opportunities that match your skills and interests.",
  },
  {
    icon: Target,
    title: "Career Advisor",
    description: "Compare multiple job offers side-by-side. Get strategic career guidance for your transition.",
  },
  {
    icon: FileText,
    title: "Resume Analysis",
    description: "Upload your resume and see how you match against each role. Identify gaps and opportunities.",
  },
];

const audiences = [
  {
    icon: RefreshCw,
    title: "Career Transitioners",
    description: "Moving from traditional practice? Your legal expertise is valuable in legal tech.",
  },
  {
    icon: BookOpen,
    title: "Law Students",
    description: "Start your career at the cutting edge. Find entry-level roles and internships.",
  },
  {
    icon: GraduationCap,
    title: "Attorneys",
    description: "Transition from practice to legal tech product, operations, or consulting roles.",
  },
  {
    icon: Users,
    title: "Paralegals & Legal Ops",
    description: "Leverage your expertise in document review, CLM, and legal operations.",
  },
  {
    icon: TrendingUp,
    title: "Multi-Practice Lawyers",
    description: "Cross-functional experience? Legal tech values versatility across practice areas.",
  },
  {
    icon: Rocket,
    title: "Tech-Curious Legal Pros",
    description: "No coding required. Product, strategy, and domain expert roles need your legal mind.",
  },
];

interface Stats {
  totalJobs: number;
  totalCompanies: number;
  totalCategories: number;
}

export default function Landing() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3" data-testid="logo-landing">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center text-primary-foreground shadow-md">
              <Scale className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-foreground leading-tight tracking-tight">
                Legal Tech Careers
              </span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                For Lawyers Interested in AI
              </span>
            </div>
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
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-muted/20 pointer-events-none" />
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-muted/30 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-36 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
                Legal Tech{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Careers
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Find your next role at the intersection of law and technology.
              </p>

              {/* Live Stats */}
              <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto mb-10">
                <div className="text-center" data-testid="stat-jobs">
                  <div className="text-4xl sm:text-5xl font-bold text-foreground tabular-nums">
                    {stats?.totalJobs ?? "—"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Jobs</div>
                </div>
                <div className="text-center" data-testid="stat-companies">
                  <div className="text-4xl sm:text-5xl font-bold text-foreground tabular-nums">
                    {stats?.totalCompanies ?? "—"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Companies</div>
                </div>
                <div className="text-center" data-testid="stat-categories">
                  <div className="text-4xl sm:text-5xl font-bold text-foreground tabular-nums">
                    {stats?.totalCategories ?? "—"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Categories</div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild className="w-full sm:w-auto text-base px-8 h-12 shadow-lg" data-testid="button-hero-get-started">
                  <a href="/api/login">
                    <Search className="mr-2 h-5 w-5" />
                    Browse Jobs
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 sm:py-28 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
                Tools
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Search, compare, and find the right opportunity for you.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="bg-background border-border/50 hover-elevate group">
                  <CardContent className="p-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                      <feature.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
                For Legal Professionals
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Whether you're transitioning from practice, starting fresh, or expanding your expertise.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {audiences.map((audience, index) => (
                <Card key={index} className="bg-muted/30 border-border/50 hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-background rounded-xl flex items-center justify-center shadow-sm border border-border/50 shrink-0">
                        <audience.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {audience.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {audience.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28 bg-gradient-to-b from-muted/30 to-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-12 sm:p-16 border border-primary/10">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
                Get Started
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
                Free to use. No account required to browse.
              </p>
              <Button size="lg" asChild className="text-base px-10 h-12 shadow-lg" data-testid="button-cta-sign-up">
                <a href="/api/login">
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-10 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center text-primary-foreground">
                <Scale className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  Legal Tech Careers
                </span>
                <span className="text-xs text-muted-foreground">
                  For Lawyers Interested in AI
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Connecting legal talent with the future of law.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
