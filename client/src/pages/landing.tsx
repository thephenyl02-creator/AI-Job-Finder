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
  MapPin,
  Building2,
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
  const { data: stats, dataUpdatedAt } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 10000,
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

      <main className="pt-16">
        <section className="relative dot-grid">
          <GradientOrb className="w-[600px] h-[600px] bg-primary -top-48 -right-48" />
          <GradientOrb className="w-[400px] h-[400px] bg-chart-2 top-32 -left-32" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <div>
                <ScrollReveal delay={0.1} direction="none">
                  <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-5" data-testid="text-hero-label">
                    Legal tech jobs &mdash; finally, in one place
                  </p>
                </ScrollReveal>

                <ScrollReveal delay={0.2}>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-5xl font-serif font-medium text-foreground mb-6 leading-[1.25] tracking-tight" data-testid="text-hero-title">
                    The legal job market has never been this confusing.
                    <br />
                    <span className="relative inline-block mt-3 sm:mt-4 pb-2">
                      Start here.
                      <motion.span
                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary/40 rounded-full"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                        style={{ transformOrigin: "left" }}
                      />
                    </span>
                  </h1>
                </ScrollReveal>

                <ScrollReveal delay={0.35}>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed" data-testid="text-hero-subtitle">
                    Yesterday you knew what your career looked like. Today you're seeing job titles that didn't exist two years ago. We track every legal tech role so you can stop guessing and start applying.
                  </p>
                </ScrollReveal>

                <ScrollReveal delay={0.5}>
                  <div className="flex flex-col sm:flex-row items-start gap-3 mb-4">
                    <Button size="lg" asChild className="text-base px-8" data-testid="button-hero-get-started">
                      <a href="/auth">
                        Find Your Next Role
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
                                      <span className="truncate">{(job.locationType === 'remote' || (!job.locationType && job.isRemote)) ? "Remote" : job.locationType === 'hybrid' ? "Hybrid" : shortenLocation(job.location)}</span>
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
                                {(job.locationType === 'remote' || (!job.locationType && job.isRemote)) ? "Remote" : job.locationType === 'hybrid' ? "Hybrid" : shortenLocation(job.location)}
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

          </div>
        </section>

        <section className="border-t border-border/40 bg-primary/[0.04] dark:bg-primary/[0.08]" data-testid="stats-section">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <div className="flex items-center justify-center gap-2 mb-5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-foreground/80" data-testid="stats-live-label">Live Platform Stats</span>
              {dataUpdatedAt ? (
                <span className="text-xs text-muted-foreground ml-1">
                  Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
              <div className="text-center" data-testid="stat-jobs">
                <div className="text-3xl sm:text-5xl font-serif font-bold text-foreground tabular-nums tracking-tight">
                  {stats?.totalJobs ? (
                    <AnimatedCounter value={stats.totalJobs} duration={2} />
                  ) : (
                    <span className="text-muted-foreground/40">&mdash;</span>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium uppercase tracking-wide">Open Positions</div>
              </div>
              <div className="text-center sm:border-x border-border/40" data-testid="stat-companies">
                <div className="text-3xl sm:text-5xl font-serif font-bold text-foreground tabular-nums tracking-tight">
                  {stats?.totalCompanies ? (
                    <AnimatedCounter value={stats.totalCompanies} duration={1.6} />
                  ) : (
                    <span className="text-muted-foreground/40">&mdash;</span>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium uppercase tracking-wide">Companies Hiring</div>
              </div>
              <div className="text-center" data-testid="stat-categories">
                <div className="text-3xl sm:text-5xl font-serif font-bold text-foreground tabular-nums tracking-tight">
                  {stats?.totalCategories ? (
                    <AnimatedCounter value={stats.totalCategories} duration={1.2} />
                  ) : (
                    <span className="text-muted-foreground/40">&mdash;</span>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium uppercase tracking-wide">Career Paths</div>
              </div>
              <div className="text-center sm:border-l border-border/40" data-testid="stat-events">
                <div className="text-3xl sm:text-5xl font-serif font-bold text-foreground tabular-nums tracking-tight">
                  {stats?.upcomingEvents ? (
                    <AnimatedCounter value={stats.upcomingEvents} duration={1} />
                  ) : (
                    <span className="text-muted-foreground/40">&mdash;</span>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium uppercase tracking-wide">Upcoming Events</div>
              </div>
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
                New job titles every month. No clear path. Sound familiar?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mb-12">
                "Legal Engineer." "CLM Specialist." "Legal Ops Analyst." Three years ago, most of these roles didn't exist. Now they're everywhere &mdash; but good luck finding them on LinkedIn between 500 software engineer postings, or on legal job boards buried under BigLaw associate listings. We built this because neither side gets it.
              </p>
            </ScrollReveal>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.15}>
              {[
                {
                  icon: Search,
                  title: "Search in plain language",
                  description: "Say what you're looking for the way you'd tell a friend. \"I want a remote product role at a legal tech company.\" We'll find exactly that. No keyword games.",
                  testId: "text-feature-search",
                },
                {
                  icon: FileText,
                  title: "See where you actually fit",
                  description: "Upload your resume. We'll match it against open roles and show you a clear fit score &mdash; what transfers, what's missing, and where to focus.",
                  testId: "text-feature-resume",
                },
                {
                  icon: Compass,
                  title: "Compare before you leap",
                  description: "Weighing two offers? Compare roles side by side and see how each one uses your legal background differently. No guessing.",
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

        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <ScrollReveal>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-md bg-muted/40 border border-border/40">
                <p className="text-base text-foreground font-medium text-center sm:text-left" data-testid="text-mid-cta">
                  Ready to see what's out there? It takes 30 seconds.
                </p>
                <Button asChild className="shrink-0" data-testid="button-mid-cta">
                  <a href="/auth">
                    Browse Roles
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
              <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-4">
                Who this is for
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight">
                You don't need to be technical. You need to be ready.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mb-12">
                Every week, roles appear that didn't exist a year ago. They're built for people with legal backgrounds who are curious enough to make a move.
              </p>
            </ScrollReveal>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4" staggerDelay={0.08}>
              {[
                {
                  icon: GraduationCap,
                  title: "Attorneys rethinking their path",
                  description: "Your JD is an asset, not a limitation. Product, strategy, and ops roles where legal thinking is the whole point.",
                },
                {
                  icon: Users,
                  title: "Paralegals and legal ops pros",
                  description: "You already know what's broken in legal workflows. These companies are building the fix &mdash; and they need your perspective.",
                },
                {
                  icon: RefreshCw,
                  title: "Lawyers making a move",
                  description: "Leaving a firm doesn't mean leaving law. Your domain expertise is hard to hire for &mdash; the right company knows that.",
                },
                {
                  icon: BookOpen,
                  title: "Students who see where this is going",
                  description: "Get into legal tech early. Internships and entry-level roles at companies that are shaping how law actually works.",
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

        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <ScrollReveal>
              <div className="max-w-2xl mx-auto text-center">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Badge variant="secondary" className="text-xs font-medium">Free to browse</Badge>
                  <Badge variant="outline" className="text-xs font-medium">Pro from $5/mo</Badge>
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight">
                  Roles are being posted right now.
                  <br />
                  Don't find out about them later.
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
                  Browse and apply for free. Go Pro for resume matching, career comparisons, and alerts the moment a role fits your profile.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button size="lg" asChild className="text-base px-10" data-testid="button-cta-final">
                    <a href="/auth">
                      Find Your Next Role
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
              <ul className="space-y-1">
                <li>
                  <Button variant="ghost" size="sm" asChild className="text-muted-foreground justify-start px-0 text-sm font-normal min-h-[36px]">
                    <a href="/auth" data-testid="footer-link-browse">Browse Jobs</a>
                  </Button>
                </li>
                <li>
                  <Link href="/pricing">
                    <Button variant="ghost" size="sm" className="text-muted-foreground justify-start px-0 text-sm font-normal min-h-[36px]" data-testid="footer-link-pricing">
                      Pricing
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/post-job">
                    <Button variant="ghost" size="sm" className="text-muted-foreground justify-start px-0 text-sm font-normal min-h-[36px]" data-testid="footer-link-post-job">
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
                <li>Deep Job Comparison</li>
                <li>Market Insights</li>
                <li>Job Alerts</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Resources</p>
              <ul className="space-y-1">
                <li>
                  <Link href="/about">
                    <Button variant="ghost" size="sm" className="text-muted-foreground justify-start px-0 text-sm font-normal min-h-[36px]" data-testid="footer-link-about">
                      About
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/terms">
                    <Button variant="ghost" size="sm" className="text-muted-foreground justify-start px-0 text-sm font-normal min-h-[36px]" data-testid="footer-link-terms">
                      Terms of Service
                    </Button>
                  </Link>
                </li>
                <li>
                  <Link href="/privacy">
                    <Button variant="ghost" size="sm" className="text-muted-foreground justify-start px-0 text-sm font-normal min-h-[36px]" data-testid="footer-link-privacy">
                      Privacy Policy
                    </Button>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Account</p>
              <ul className="space-y-1">
                <li>
                  <Button variant="ghost" size="sm" asChild className="text-muted-foreground justify-start px-0 text-sm font-normal min-h-[36px]">
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
              The job board that actually understands legal tech.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
