import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { cleanStructuredText } from "@/lib/structured-description";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark, Logo } from "@/components/logo";
import {
  Search,
  ArrowRight,
  FileText,
  Compass,
  MapPin,
  Building2,
  CheckCircle2,
} from "lucide-react";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
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

const careerPaths = [
  "Legal Operations",
  "Privacy & Data",
  "Legal Product",
  "Contract Tech",
  "Compliance / RegTech",
  "Legal Engineering",
  "Knowledge / PSL",
  "Litigation Tech",
  "AI Adoption",
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
            <a href="#career-paths">
              <Button variant="ghost" size="sm" className="text-muted-foreground min-h-[44px] hidden sm:inline-flex" data-testid="link-landing-career-paths">
                Career Paths
              </Button>
            </a>
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
        {/* ── HERO ── */}
        <section className="relative">
          <GradientOrb className="w-[600px] h-[600px] bg-primary/20 -top-48 -right-48" />
          <GradientOrb className="w-[400px] h-[400px] bg-chart-2/20 top-32 -left-32" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-10 sm:pb-12 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <div>
                <ScrollReveal delay={0.1} direction="none">
                  <p className="text-xs font-semibold text-muted-foreground tracking-[0.22em] uppercase mb-4" data-testid="text-hero-label">
                    For lawyers moving into legal tech & AI
                  </p>
                </ScrollReveal>

                <ScrollReveal delay={0.2}>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-5 leading-[1.05] tracking-tight max-w-[560px]" data-testid="text-hero-title">
                    Find legal tech roles that actually fit lawyers.
                  </h1>
                </ScrollReveal>

                <ScrollReveal delay={0.35}>
                  <p className="text-base sm:text-lg text-muted-foreground mb-7 leading-relaxed max-w-[560px]" data-testid="text-hero-subtitle">
                    Curated roles, plain-English role clarity, and a fit check &mdash; so you apply with confidence, not guesses.
                  </p>
                </ScrollReveal>

                <ScrollReveal delay={0.5}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
                    <Button size="lg" asChild className="text-base px-8" data-testid="button-hero-explore">
                      <a href="/jobs">
                        Explore roles
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-hero-upload">
                      <a href="/auth">
                        Upload resume
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground" data-testid="text-hero-trust">
                    Free to browse &bull; No credit card required
                  </p>
                </ScrollReveal>
              </div>

              {/* Desktop Live Roles */}
              <ScrollReveal delay={0.4} direction="none">
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
                        <motion.div
                          key={job.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                        >
                          <Card className="border-border/60 bg-background" data-testid={`hero-job-card-${i}`}>
                            <CardContent className="p-3.5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-foreground truncate">{cleanStructuredText(job.title)}</p>
                                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Building2 className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{cleanStructuredText(job.company)}</span>
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
                                    {cleanStructuredText(job.roleCategory)}
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
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
              </ScrollReveal>

              {/* Mobile Live Roles */}
              <ScrollReveal delay={0.4} direction="none">
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
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.08, duration: 0.35 }}
                        className="snap-start shrink-0 w-[260px]"
                      >
                        <Card className="bg-background/80 backdrop-blur-sm border-border/50 h-full" data-testid={`hero-job-card-mobile-${i}`}>
                          <CardContent className="p-3">
                            <p className="text-sm font-semibold text-foreground truncate">{cleanStructuredText(job.title)}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                <Building2 className="h-3 w-3 shrink-0" />
                                {cleanStructuredText(job.company)}
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
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ── GAP SECTION ── */}
        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
            <ScrollReveal>
              <div className="max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground mb-6 tracking-tight" data-testid="text-gap-title">
                  Job boards weren't built for this market.
                </h2>
                <ul className="space-y-3 mb-6">
                  {[
                    "Legal tech searches return software engineering roles.",
                    "Legal job boards return traditional associate roles.",
                    "New roles are real \u2014 but hard to decode.",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-base text-muted-foreground" data-testid={`text-gap-bullet-${i}`}>
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-base font-medium text-foreground" data-testid="text-gap-closing">
                  We curate the right roles and translate them for lawyers.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── CAREER PATHS ── */}
        <section id="career-paths" className="border-t border-border/40 scroll-mt-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
            <ScrollReveal>
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight" data-testid="text-career-paths-title">
                  Explore by career path &mdash; not job title
                </h2>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5" data-testid="career-paths-chips">
                {careerPaths.map((path) => (
                  <Badge
                    key={path}
                    variant="outline"
                    className="text-sm px-4 py-1.5 no-default-active-elevate"
                    data-testid={`chip-career-path-${path.toLowerCase().replace(/[\s\/&]+/g, "-")}`}
                  >
                    {path}
                  </Badge>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── HOW THIS HELPS ── */}
        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.15}>
              {[
                {
                  icon: Search,
                  title: "Curated roles",
                  description: "Only roles that make sense for legal backgrounds \u2014 tagged by career path.",
                  testId: "text-outcome-curated",
                },
                {
                  icon: FileText,
                  title: "Role clarity",
                  description: "What the role actually is, what transfers from legal work, and what matters next.",
                  testId: "text-outcome-clarity",
                },
                {
                  icon: Compass,
                  title: "Fit check",
                  description: "Resume fit score + gaps + realistic tweaks to increase alignment.",
                  testId: "text-outcome-fit",
                  pro: true,
                },
              ].map((feature) => (
                <StaggerItem key={feature.title}>
                  <Card className="bg-background border-border/60 hover-elevate h-full">
                    <CardContent className="p-6">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-foreground mb-4">
                        <feature.icon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-foreground" data-testid={feature.testId}>
                          {feature.title}
                        </h3>
                        {feature.pro && (
                          <Badge variant="secondary" className="text-[10px]">Pro</Badge>
                        )}
                      </div>
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

        {/* ── METRICS ── */}
        <section className="border-t border-border/40" data-testid="stats-section">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
              <div className="text-center" data-testid="stat-jobs">
                <div className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
                  {stats?.totalJobs ? `${stats.totalJobs}+` : "\u2014"}
                </div>
                <div className="text-sm text-muted-foreground mt-1">roles mapped</div>
              </div>
              <div className="text-center" data-testid="stat-companies">
                <div className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
                  {stats?.totalCompanies ?? "\u2014"}
                </div>
                <div className="text-sm text-muted-foreground mt-1">companies hiring in legal tech</div>
              </div>
              <div className="text-center" data-testid="stat-categories">
                <div className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
                  {stats?.totalCategories ?? "\u2014"}
                </div>
                <div className="text-sm text-muted-foreground mt-1">career paths explained</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="border-t border-border/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <ScrollReveal>
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight" data-testid="text-final-cta-title">
                  Stop guessing. Start applying with clarity.
                </h2>
                <p className="text-base text-muted-foreground mb-8 max-w-lg mx-auto">
                  Browse roles for free. Go Pro for resume matching, fit checks, and job alerts the moment a role fits your profile.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button size="lg" asChild className="text-base px-10" data-testid="button-cta-explore">
                    <a href="/jobs">
                      Explore roles
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-cta-upload">
                    <a href="/auth">
                      Upload resume
                    </a>
                  </Button>
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
                    <a href="/jobs" data-testid="footer-link-browse">Browse Jobs</a>
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
              Career clarity for lawyers moving into legal tech and AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
