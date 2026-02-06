import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Search,
  TrendingUp,
  Scale,
  Users,
  GraduationCap,
  ArrowRight,
  FileText,
  BookOpen,
  RefreshCw,
  Rocket,
  Compass,
  Zap,
  Bell,
  BarChart3,
  Target,
} from "lucide-react";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
  AnimatedCounter,
  GradientOrb,
} from "@/components/animations";
import { motion } from "framer-motion";

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
    <div className="min-h-screen bg-background overflow-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3" data-testid="logo-landing">
            <Scale className="h-6 w-6 text-foreground" />
            <span className="text-base font-semibold text-foreground tracking-tight">
              Legal Tech Careers
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="link-landing-pricing">
                Pricing
              </Button>
            </Link>
            <ThemeToggle />
            <Button asChild data-testid="button-header-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </nav>
      </header>

      <main className="pt-16">
        <section className="relative dot-grid">
          <GradientOrb className="w-[600px] h-[600px] bg-primary -top-48 -right-48" />
          <GradientOrb className="w-[400px] h-[400px] bg-chart-2 top-32 -left-32" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-32 pb-16 sm:pb-24 relative">
            <div className="max-w-3xl">
              <ScrollReveal delay={0.1} direction="none">
                <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-6" data-testid="text-hero-label">
                  The Job Board That Actually Gets Lawyers
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium text-foreground mb-6 leading-[1.15] tracking-tight" data-testid="text-hero-title">
                  You studied law.
                  <br />
                  <span className="relative">
                    Now build what's next.
                    <motion.span
                      className="absolute -bottom-1 left-0 h-[3px] bg-primary/30 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                    />
                  </span>
                </h1>
              </ScrollReveal>

              <ScrollReveal delay={0.35}>
                <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed" data-testid="text-hero-subtitle">
                  Legal tech companies need people who understand the law <em>and</em> technology. That's you. We collect the roles, match them to your experience, and show you exactly where you fit.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.5}>
                <div className="flex flex-col sm:flex-row items-start gap-3 mb-16">
                  <Button size="lg" asChild className="text-base px-8" data-testid="button-hero-get-started">
                    <a href="/api/login">
                      Browse Open Roles
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-hero-post-job">
                    <a href="/post-job">
                      Post a Job
                    </a>
                  </Button>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.6}>
                <div className="flex items-center gap-8 sm:gap-12" data-testid="stats-section">
                  <div data-testid="stat-jobs">
                    <div className="text-3xl sm:text-4xl font-serif font-medium text-foreground tabular-nums">
                      {stats?.totalJobs ? (
                        <AnimatedCounter value={stats.totalJobs} duration={2} />
                      ) : (
                        "\u2014"
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">Open positions</div>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div data-testid="stat-companies">
                    <div className="text-3xl sm:text-4xl font-serif font-medium text-foreground tabular-nums">
                      {stats?.totalCompanies ? (
                        <AnimatedCounter value={stats.totalCompanies} duration={1.6} />
                      ) : (
                        "\u2014"
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">Companies hiring</div>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div data-testid="stat-categories">
                    <div className="text-3xl sm:text-4xl font-serif font-medium text-foreground tabular-nums">
                      {stats?.totalCategories ? (
                        <AnimatedCounter value={stats.totalCategories} duration={1.2} />
                      ) : (
                        "\u2014"
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">Career paths</div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <ScrollReveal>
              <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-4">
                Why this exists
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight">
                Most job boards don't speak your language
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mb-12">
                You search "legal tech" on LinkedIn and get 500 software engineer roles. You search on legal job boards and get associate positions at BigLaw. Neither understands what you're actually looking for. We do.
              </p>
            </ScrollReveal>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.15}>
              {[
                {
                  icon: Search,
                  title: "Tell us what you want",
                  description: "Describe your ideal role in plain language. \"I want a product role at a legal tech company, ideally remote.\" That's it. No boolean operators. No keyword guessing.",
                  testId: "text-feature-search",
                },
                {
                  icon: FileText,
                  title: "Let your resume do the work",
                  description: "Upload your resume and we'll match it against every open role. You'll see a clear fit score, what transfers, and what gaps to address before applying.",
                  testId: "text-feature-resume",
                },
                {
                  icon: Compass,
                  title: "Compare before you leap",
                  description: "Considering multiple offers? Our Career Advisor lays them side by side, showing how each role leverages your legal background differently.",
                  testId: "text-feature-advisor",
                },
              ].map((feature) => (
                <StaggerItem key={feature.title}>
                  <Card className="bg-background border-border/60 hover-elevate h-full">
                    <CardContent className="p-6">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-foreground mb-4">
                        <feature.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2" data-testid={feature.testId}>
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <ScrollReveal>
              <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-4">
                What you get
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight">
                Tools that save you hours every week
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mb-12">
                Stop scrolling through irrelevant listings. Start with a focused search and let the platform surface what matters to you.
              </p>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ScrollReveal delay={0.1}>
                <div className="flex items-start gap-4 p-5 rounded-lg border border-border/50 bg-background" data-testid="feature-card-0">
                  <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Resume Matching</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      See a percentage score for every job. Know instantly if your litigation background transfers to that compliance tech role, and get specific suggestions to improve your odds.
                    </p>
                  </div>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.15}>
                <div className="flex items-start gap-4 p-5 rounded-lg border border-border/50 bg-background" data-testid="feature-card-1">
                  <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Job Alerts</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Set your criteria once. When a new role matches, you'll know about it before the posting gets buried. Filter by category, seniority, remote, or keywords.
                    </p>
                  </div>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.2}>
                <div className="flex items-start gap-4 p-5 rounded-lg border border-border/50 bg-background" data-testid="feature-card-2">
                  <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Market Insights</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Understand which legal tech categories are hiring the most, what salary ranges look like, and where demand is growing. Real data, not guesswork.
                    </p>
                  </div>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.25}>
                <div className="flex items-start gap-4 p-5 rounded-lg border border-border/50 bg-background" data-testid="feature-card-3">
                  <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Resume Tweaks</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Don't rewrite your resume from scratch for every application. See exactly what to adjust for each specific role so your experience reads the way hiring managers expect.
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <ScrollReveal>
              <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-4">
                Who this is for
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight">
                If any of this sounds like you
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mb-12">
                You don't need to be technical. You need to be curious about where law is headed.
              </p>
            </ScrollReveal>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" staggerDelay={0.08}>
              {[
                {
                  icon: GraduationCap,
                  title: "Practicing attorneys",
                  description: "You're good at your job but wonder what else is out there. Product, operations, strategy roles at companies that actually value your JD.",
                },
                {
                  icon: Users,
                  title: "Paralegals & legal ops",
                  description: "You've been streamlining workflows for years. Legal tech companies are building exactly what you've been wishing existed.",
                },
                {
                  icon: RefreshCw,
                  title: "Career changers",
                  description: "Leaving traditional practice doesn't mean leaving law behind. Your domain expertise is rare and valuable in the right company.",
                },
                {
                  icon: BookOpen,
                  title: "Law students",
                  description: "You see where the industry is going. Find internships and entry-level roles at companies shaping the future of legal work.",
                },
                {
                  icon: TrendingUp,
                  title: "In-house counsel",
                  description: "You've seen legal tech from the buyer's side. Companies building these tools want people who understand how firms actually work.",
                },
                {
                  icon: Rocket,
                  title: "Curious professionals",
                  description: "No coding required. Many of the best roles in legal tech are in sales, marketing, customer success, and consulting.",
                },
              ].map((audience, index) => (
                <StaggerItem key={audience.title}>
                  <div
                    className="flex items-start gap-4 p-4 rounded-md hover-elevate"
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
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <ScrollReveal>
              <div className="max-w-3xl mx-auto text-center">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Badge variant="secondary" className="text-xs font-medium">Free to start</Badge>
                  <Badge variant="outline" className="text-xs font-medium">Pro from $5/mo</Badge>
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight">
                  Start for free. Upgrade when it's worth it.
                </h2>
                <p className="text-lg text-muted-foreground mb-4 max-w-xl mx-auto">
                  Browse every job and search for free. When you want resume matching, career comparisons, and personalized alerts, Pro is $5 a month.
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  No credit card required to get started. Cancel anytime.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button size="lg" asChild className="text-base px-10" data-testid="button-cta-sign-up">
                    <a href="/api/login">
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="text-base" data-testid="button-cta-pricing">
                      See Full Pricing
                    </Button>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <ScrollReveal>
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight">
                  Your legal career got you here.
                  <br />
                  Let's figure out what's next.
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
                  Every week, new legal tech roles go live. The ones that fit your background might already be waiting.
                </p>
                <Button size="lg" asChild className="text-base px-10" data-testid="button-cta-final">
                  <a href="/api/login">
                    Browse Jobs Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </ScrollReveal>
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
              Where legal professionals find their next move in technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
