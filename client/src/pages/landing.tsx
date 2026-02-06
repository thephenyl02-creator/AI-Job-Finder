import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark, Logo } from "@/components/logo";
import {
  Search,
  Users,
  GraduationCap,
  ArrowRight,
  FileText,
  BookOpen,
  RefreshCw,
  Compass,
  Zap,
  Bell,
  BarChart3,
  Target,
  MapPin,
  Building2,
  Crown,
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
  entryLevelJobs: number;
}

interface FeaturedJob {
  id: number;
  title: string;
  company: string;
  location: string | null;
  isRemote: boolean | null;
  roleCategory: string | null;
  seniorityLevel: string | null;
}

function shortenLocation(location: string): string {
  if (location.includes(";")) {
    const parts = location.split(";").map(s => s.trim());
    const first = shortenLocation(parts[0]);
    return parts.length > 1 ? `${first} +${parts.length - 1}` : first;
  }
  if (location.includes("·")) {
    const parts = location.split("·").map(s => s.trim());
    const first = shortenLocation(parts[0]);
    return parts.length > 1 ? `${first} +${parts.length - 1}` : first;
  }
  const commas = location.split(",").map(s => s.trim());
  if (commas.length >= 3) {
    return `${commas[0]}, ${commas[1]}`;
  }
  if (commas.length === 2) {
    return location;
  }
  return location;
}

export default function Landing() {
  usePageTitle();
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 15000,
  });

  const { data: featuredJobs } = useQuery<FeaturedJob[]>({
    queryKey: ["/api/featured-jobs"],
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-background overflow-hidden">
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

      <main className="pt-16">
        <section className="relative dot-grid">
          <GradientOrb className="w-[600px] h-[600px] bg-primary -top-48 -right-48" />
          <GradientOrb className="w-[400px] h-[400px] bg-chart-2 top-32 -left-32" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <div>
                <ScrollReveal delay={0.1} direction="none">
                  <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-5" data-testid="text-hero-label">
                    Built for lawyers moving into tech
                  </p>
                </ScrollReveal>

                <ScrollReveal delay={0.2}>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-5xl font-serif font-medium text-foreground mb-5 leading-[1.15] tracking-tight" data-testid="text-hero-title">
                    Every legal tech role.
                    <br className="hidden sm:block" />
                    <span className="block mt-2 sm:mt-3 relative">
                      One place to find it.
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
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed" data-testid="text-hero-subtitle">
                    Legal tech companies need people who understand the law <em>and</em> technology. That's you. We collect the roles, match them to your experience, and show you exactly where you fit.
                  </p>
                </ScrollReveal>

                <ScrollReveal delay={0.5}>
                  <div className="flex flex-col sm:flex-row items-start gap-3 mb-4">
                    <Button size="lg" asChild className="text-base px-8" data-testid="button-hero-get-started">
                      <a href="/auth">
                        Browse Open Roles
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    <Link href="/pricing">
                      <Button size="lg" variant="outline" className="text-base" data-testid="button-hero-pricing">
                        See Pricing
                      </Button>
                    </Link>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-hero-free-note">
                    Free to browse. No credit card required.
                  </p>
                </ScrollReveal>
              </div>

              <ScrollReveal delay={0.4} direction="none">
                <div className="hidden lg:block" data-testid="hero-job-preview">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live roles</p>
                    {stats?.totalJobs ? (
                      <Badge variant="secondary" className="text-xs" data-testid="badge-job-count">
                        {stats.totalJobs}+ open
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-2.5">
                    {featuredJobs?.slice(0, 5).map((job, i) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                      >
                        <Card className="bg-background/80 backdrop-blur-sm border-border/50" data-testid={`hero-job-card-${i}`}>
                          <CardContent className="p-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground truncate">{job.title}</p>
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Building2 className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{job.company}</span>
                                  </span>
                                  {job.location && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{job.isRemote ? "Remote" : shortenLocation(job.location)}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              {job.roleCategory && (
                                <Badge variant="outline" className="text-[10px] shrink-0 whitespace-nowrap">
                                  {job.roleCategory}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                    {(!featuredJobs || featuredJobs.length === 0) && (
                      <div className="space-y-2.5">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-16 rounded-md bg-muted/40 animate-pulse" />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Sign in to see all roles and apply
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.4} direction="none">
                <div className="lg:hidden mt-8" data-testid="hero-job-preview-mobile">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live roles</p>
                    {stats?.totalJobs ? (
                      <Badge variant="secondary" className="text-xs" data-testid="badge-job-count-mobile">
                        {stats.totalJobs}+ open
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
                    {featuredJobs?.slice(0, 6).map((job, i) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.08, duration: 0.35 }}
                        className="snap-start shrink-0 w-[260px]"
                      >
                        <Card className="bg-background/80 backdrop-blur-sm border-border/50 h-full" data-testid={`hero-job-card-mobile-${i}`}>
                          <CardContent className="p-3">
                            <p className="text-sm font-semibold text-foreground truncate">{job.title}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                <Building2 className="h-3 w-3 shrink-0" />
                                {job.company}
                              </span>
                            </div>
                            {job.location && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1 truncate">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {job.isRemote ? "Remote" : shortenLocation(job.location)}
                              </span>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                    {(!featuredJobs || featuredJobs.length === 0) && (
                      <div className="flex gap-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="shrink-0 w-[260px] h-[76px] rounded-md bg-muted/40 animate-pulse" />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Sign in to see all roles and apply
                  </p>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.6}>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-10 sm:mt-14" data-testid="stats-section">
                <div className="rounded-md bg-primary/10 dark:bg-primary/15 p-3 sm:p-5 text-center" data-testid="stat-jobs">
                  <div className="text-xl sm:text-3xl font-serif font-semibold text-primary tabular-nums">
                    {stats?.totalJobs ? (
                      <AnimatedCounter value={stats.totalJobs} duration={2} />
                    ) : (
                      "\u2014"
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-primary/70 dark:text-primary/60 mt-0.5 font-medium">Open positions</div>
                </div>
                <div className="rounded-md bg-chart-2/10 dark:bg-chart-2/15 p-3 sm:p-5 text-center" data-testid="stat-companies">
                  <div className="text-xl sm:text-3xl font-serif font-semibold text-chart-2 tabular-nums">
                    {stats?.totalCompanies ? (
                      <AnimatedCounter value={stats.totalCompanies} duration={1.6} />
                    ) : (
                      "\u2014"
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-chart-2/70 dark:text-chart-2/60 mt-0.5 font-medium">Companies hiring</div>
                </div>
                <div className="rounded-md bg-chart-4/10 dark:bg-chart-4/15 p-3 sm:p-5 text-center" data-testid="stat-categories">
                  <div className="text-xl sm:text-3xl font-serif font-semibold text-chart-4 tabular-nums">
                    {stats?.totalCategories ? (
                      <AnimatedCounter value={stats.totalCategories} duration={1.2} />
                    ) : (
                      "\u2014"
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-chart-4/70 dark:text-chart-4/60 mt-0.5 font-medium">Career paths</div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <ScrollReveal>
              <div className="flex items-start gap-4 sm:gap-5 max-w-3xl mx-auto" data-testid="curated-highlight">
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-medium italic">
                  Every opportunity is carefully curated and evaluated to ensure relevance, quality, and real career value before being featured on the platform.
                </p>
              </div>
            </ScrollReveal>
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-foreground">Resume Matching</h3>
                      <Badge variant="secondary" className="text-[10px]">
                        <Crown className="h-2.5 w-2.5 mr-0.5" />
                        Pro
                      </Badge>
                    </div>
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-foreground">Job Alerts</h3>
                      <Badge variant="secondary" className="text-[10px]">
                        <Crown className="h-2.5 w-2.5 mr-0.5" />
                        Pro
                      </Badge>
                    </div>
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-foreground">Market Insights</h3>
                      <Badge variant="secondary" className="text-[10px]">
                        <Crown className="h-2.5 w-2.5 mr-0.5" />
                        Pro
                      </Badge>
                    </div>
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-foreground">Resume Tweaks</h3>
                      <Badge variant="secondary" className="text-[10px]">
                        <Crown className="h-2.5 w-2.5 mr-0.5" />
                        Pro
                      </Badge>
                    </div>
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

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4" staggerDelay={0.08}>
              {[
                {
                  icon: GraduationCap,
                  title: "Attorneys exploring what's next",
                  description: "Product, operations, and strategy roles at companies that actually value your JD. No coding required.",
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
                  title: "Students & new grads",
                  description: "Find internships and entry-level roles at companies shaping the future of legal work. Get in early.",
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                <div>
                  <Badge variant="secondary" className="text-xs font-medium mb-4" data-testid="badge-law-students">
                    For law students
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground mb-4 tracking-tight" data-testid="text-law-student-title">
                    Start your legal tech career before you graduate
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-6" data-testid="text-law-student-description">
                    You don't have to wait until you pass the bar to explore legal tech. Internships, fellowships, and entry-level roles at companies building the future of law are designed for people who understand the legal system from the inside. Your 1L summer, clinic experience, and law review skills are more relevant than you think.
                  </p>
                  <div className="flex flex-col sm:flex-row items-start gap-3">
                    <Button asChild data-testid="button-browse-entry-level">
                      <a href="/auth">
                        Browse Student & Entry-Level Roles
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    {stats?.entryLevelJobs ? (
                      <p className="text-sm text-muted-foreground self-center" data-testid="text-entry-level-count">
                        {stats.entryLevelJobs} positions open now
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-3" data-testid="law-student-highlights">
                  {[
                    {
                      title: "Internships & fellowships",
                      description: "We track internships, fellowships, and entry-level roles specifically. Filter by these types to find positions designed for students and recent graduates.",
                    },
                    {
                      title: "Roles that match your studies",
                      description: "Upload your resume and see which open positions align with your coursework, journal focus, or clinic work.",
                    },
                    {
                      title: "Get alerts for new opportunities",
                      description: "Set up notifications for internships, fellowships, and entry-level roles so you're first to know when something opens up.",
                    },
                  ].map((item, i) => (
                    <Card key={item.title} className="bg-background border-border/50" data-testid={`law-student-card-${i}`}>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground text-sm mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <ScrollReveal>
              <div className="max-w-3xl mx-auto text-center">
                <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-4">
                  How it works
                </p>
                <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-12 tracking-tight">
                  Three steps. Five minutes.
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto mb-12">
              <ScrollReveal delay={0.1}>
                <div className="text-center" data-testid="step-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center mx-auto mb-4">
                    1
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Create a free account</h3>
                  <p className="text-sm text-muted-foreground">Sign in with one click. No forms, no credit card.</p>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.2}>
                <div className="text-center" data-testid="step-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center mx-auto mb-4">
                    2
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Upload your resume</h3>
                  <p className="text-sm text-muted-foreground">We extract your skills and experience to find the best matches.</p>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.3}>
                <div className="text-center" data-testid="step-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center mx-auto mb-4">
                    3
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">See your top matches</h3>
                  <p className="text-sm text-muted-foreground">Get a ranked list of roles with fit scores and resume tweaks for each.</p>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.4}>
              <div className="text-center">
                <Button size="lg" asChild className="text-base px-10" data-testid="button-cta-sign-up">
                  <a href="/auth">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <ScrollReveal>
              <div className="max-w-2xl mx-auto text-center">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Badge variant="secondary" className="text-xs font-medium">Free to browse</Badge>
                  <Badge variant="outline" className="text-xs font-medium">Pro from $5/mo</Badge>
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight">
                  Your legal career got you here.
                  <br />
                  Let's figure out what's next.
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
                  Every week, new legal tech roles go live. Browse and apply for free, or upgrade to Pro for resume matching, career comparisons, and personalized alerts.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button size="lg" asChild className="text-base px-10" data-testid="button-cta-final">
                    <a href="/auth">
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="text-base" data-testid="button-cta-pricing">
                      See Plans & Pricing
                    </Button>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Product</p>
              <ul className="space-y-2">
                <li>
                  <Button variant="ghost" size="sm" asChild className="text-muted-foreground h-auto p-0 text-sm font-normal">
                    <a href="/auth" data-testid="footer-link-browse">Browse Jobs</a>
                  </Button>
                </li>
                <li>
                  <Link href="/pricing">
                    <Button variant="ghost" size="sm" className="text-muted-foreground h-auto p-0 text-sm font-normal" data-testid="footer-link-pricing">
                      Pricing
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/post-job">
                    <Button variant="ghost" size="sm" className="text-muted-foreground h-auto p-0 text-sm font-normal" data-testid="footer-link-post-job">
                      Post a Job
                    </Button>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Pro Features</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Resume Matching</li>
                <li>Career Advisor</li>
                <li>Market Insights</li>
                <li>Job Alerts</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Resources</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/about">
                    <Button variant="ghost" size="sm" className="text-muted-foreground h-auto p-0 text-sm font-normal" data-testid="footer-link-about">
                      About
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/terms">
                    <Button variant="ghost" size="sm" className="text-muted-foreground h-auto p-0 text-sm font-normal" data-testid="footer-link-terms">
                      Terms of Service
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/privacy">
                    <Button variant="ghost" size="sm" className="text-muted-foreground h-auto p-0 text-sm font-normal" data-testid="footer-link-privacy">
                      Privacy Policy
                    </Button>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Account</p>
              <ul className="space-y-2">
                <li>
                  <Button variant="ghost" size="sm" asChild className="text-muted-foreground h-auto p-0 text-sm font-normal">
                    <a href="/auth" data-testid="footer-link-signin">Sign In</a>
                  </Button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Logo className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Legal Tech Careers
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Where legal professionals find their next move in technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
