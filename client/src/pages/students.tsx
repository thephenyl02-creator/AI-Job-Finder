import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  ArrowRight,
  TrendingUp,
  Briefcase,
  Shield,
  MapPin,
  Wifi,
  GraduationCap,
  Building2,
  Brain,
  Users,
  Mail,
  BookOpen,
  Target,
  Compass,
  ExternalLink,
} from "lucide-react";

interface StudentJob {
  id: number;
  title: string;
  company: string;
  location: string | null;
  locationType: string | null;
  seniorityLevel: string | null;
  roleCategory: string | null;
  firstSeenAt: string | null;
  isRemote: boolean;
  applicationUrl: string | null;
}

interface PathBreakdown {
  name: string;
  count: number;
}

interface TopCompany {
  company: string;
  count: number;
}

interface StudentOpportunitiesData {
  totalStudentJobs: number;
  jobs: StudentJob[];
  pathBreakdown: PathBreakdown[];
  topCompanies: TopCompany[];
  remoteCount: number;
}

const SENIORITY_STYLES: Record<string, string> = {
  Intern: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  Fellowship: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  Entry: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Junior: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

function StatsStripSkeleton() {
  return (
    <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function JobCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}

export default function Students() {
  usePageTitle("For Students");

  const { data, isLoading, error, refetch } = useQuery<StudentOpportunitiesData>({
    queryKey: ["/api/student-opportunities"],
  });

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
          <div className="max-w-2xl">
            <p
              className="text-sm font-semibold text-primary tracking-[0.2em] uppercase border-l-2 border-primary pl-3 -ml-3 mb-6"
              data-testid="text-students-label"
            >
              For Law Students
            </p>
            <h1
              className="text-3xl sm:text-[2.75rem] font-serif font-medium text-foreground leading-[1.3]"
              data-testid="text-students-title"
            >
              Launch your legal tech career
            </h1>
            <p
              className="text-base text-muted-foreground mt-6 leading-relaxed max-w-lg"
              data-testid="text-students-subtitle"
            >
              Discover internships, fellowships, and entry-level roles at companies shaping the future of law.
            </p>
            <div className="mt-8 flex items-center gap-4 flex-wrap">
              <Button size="lg" asChild data-testid="button-browse-student-roles">
                <a href="#student-jobs">
                  Browse Student Roles
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Link href="/quiz">
                <Button variant="outline" size="lg" data-testid="button-career-quiz">
                  Take the Career Quiz
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border/30 bg-muted/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
            <div className="text-center mb-8 sm:mb-10">
              <h2
                className="text-xl sm:text-3xl font-serif font-medium text-foreground"
                data-testid="text-why-legal-tech-title"
              >
                Why legal tech?
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 max-w-3xl mx-auto">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-background border border-border/50 flex items-center justify-center mx-auto">
                  <TrendingUp className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground" data-testid="text-why-growing">Growing Fast</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The legal tech market is expanding rapidly. Law firms and corporations are investing heavily in technology to modernize legal work.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-background border border-border/50 flex items-center justify-center mx-auto">
                  <Briefcase className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground" data-testid="text-why-lawyers">Built for Lawyers</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A JD is a competitive advantage. Legal tech companies need people who understand the law and can bridge the gap between lawyers and engineers.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-background border border-border/50 flex items-center justify-center mx-auto">
                  <Shield className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground" data-testid="text-why-future">Future-Proof</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AI is transforming the practice of law. Tech-savvy lawyers who understand both domains will lead the next generation of legal services.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/30" data-testid="stats-strip-section">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
            {isLoading ? (
              <StatsStripSkeleton />
            ) : data ? (
              <div className="flex items-center justify-center gap-6 sm:gap-10 text-sm text-muted-foreground flex-wrap" data-testid="stats-strip">
                <span data-testid="stat-student-jobs">
                  <span className="font-semibold text-foreground">{data.totalStudentJobs}</span> student roles
                </span>
                <span className="text-border hidden sm:inline">&middot;</span>
                <span data-testid="stat-companies-hiring">
                  <span className="font-semibold text-foreground">{data.topCompanies.length}</span> companies hiring
                </span>
                <span className="text-border hidden sm:inline">&middot;</span>
                <span data-testid="stat-career-paths">
                  <span className="font-semibold text-foreground">{data.pathBreakdown.length}</span> career paths
                </span>
                <span className="text-border hidden sm:inline">&middot;</span>
                <span data-testid="stat-remote-roles">
                  <span className="font-semibold text-foreground">{data.remoteCount}</span> remote roles
                </span>
              </div>
            ) : null}
          </div>
        </section>

        <section id="student-jobs" className="border-t border-border/30 bg-muted/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
            <div className="mb-8 sm:mb-10">
              <p
                className="text-sm font-semibold text-primary tracking-[0.2em] uppercase border-l-2 border-primary pl-3 -ml-3 mb-3"
                data-testid="text-featured-label"
              >
                Featured Opportunities
              </p>
              <h2
                className="text-xl sm:text-3xl font-serif font-medium text-foreground"
                data-testid="text-featured-title"
              >
                Student roles hiring now
              </h2>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <JobCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12" data-testid="error-state">
                <p className="text-muted-foreground mb-4">Failed to load student opportunities.</p>
                <Button variant="outline" onClick={() => refetch()} data-testid="button-retry">
                  Try again
                </Button>
              </div>
            ) : data && data.jobs.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="student-jobs-grid">
                  {data.jobs.slice(0, 12).map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`}>
                      <Card className="hover-elevate h-full cursor-pointer" data-testid={`card-student-job-${job.id}`}>
                        <CardContent className="p-5">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {job.seniorityLevel && (
                              <Badge
                                variant="secondary"
                                className={`text-xs no-default-hover-elevate no-default-active-elevate ${SENIORITY_STYLES[job.seniorityLevel] || ""}`}
                                data-testid={`badge-seniority-${job.id}`}
                              >
                                {job.seniorityLevel}
                              </Badge>
                            )}
                            {job.roleCategory && (
                              <Badge
                                variant="outline"
                                className="text-xs no-default-hover-elevate no-default-active-elevate"
                                data-testid={`badge-path-${job.id}`}
                              >
                                {job.roleCategory}
                              </Badge>
                            )}
                            {job.isRemote && (
                              <Badge
                                variant="outline"
                                className="text-xs no-default-hover-elevate no-default-active-elevate"
                                data-testid={`badge-remote-${job.id}`}
                              >
                                <Wifi className="h-2.5 w-2.5 mr-1" />
                                Remote
                              </Badge>
                            )}
                          </div>
                          <h3
                            className="text-sm font-semibold text-foreground leading-snug mb-1"
                            data-testid={`text-job-title-${job.id}`}
                          >
                            {job.title}
                          </h3>
                          <p
                            className="text-sm text-muted-foreground mb-2"
                            data-testid={`text-job-company-${job.id}`}
                          >
                            {job.company}
                          </p>
                          {job.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-job-location-${job.id}`}>
                              <MapPin className="h-3 w-3 shrink-0" />
                              {job.location}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
                <div className="text-center mt-8">
                  <Link href="/jobs?seniority=student">
                    <Button variant="outline" data-testid="button-view-all-student-roles">
                      View all student roles
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-12" data-testid="empty-state">
                <GraduationCap className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No student roles right now</h3>
                <p className="text-sm text-muted-foreground">
                  Check back soon — new opportunities are added regularly.
                </p>
              </div>
            )}
          </div>
        </section>

        {data && data.pathBreakdown.length > 0 && (
          <section className="border-t border-border/30">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
              <div className="mb-8 sm:mb-10">
                <h2
                  className="text-xl sm:text-3xl font-serif font-medium text-foreground"
                  data-testid="text-paths-title"
                >
                  Career paths for students
                </h2>
                <p className="text-sm text-muted-foreground mt-3 max-w-lg">
                  Explore entry-level opportunities across different legal tech career paths.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="paths-grid">
                {data.pathBreakdown.map((path) => (
                  <Link key={path.name} href={`/jobs?category=${encodeURIComponent(path.name)}&seniority=student`}>
                    <Card className="hover-elevate h-full cursor-pointer" data-testid={`card-path-${path.name.toLowerCase().replace(/\s+/g, "-")}`}>
                      <CardContent className="p-5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground">{path.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{path.count} entry-level {path.count === 1 ? "role" : "roles"}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="border-t border-border/30 bg-muted/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
            <div className="text-center mb-8 sm:mb-10">
              <h2
                className="text-xl sm:text-3xl font-serif font-medium text-foreground"
                data-testid="text-not-sure-title"
              >
                Not sure where to start?
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <Card className="card-elev-prominent" data-testid="card-quiz-cta">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-background border border-border/50 flex items-center justify-center mx-auto">
                    <Compass className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Career Quiz</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Answer 4 quick questions and get a personalized career direction in legal tech.
                  </p>
                  <Link href="/quiz">
                    <Button size="sm" data-testid="button-take-quiz">
                      Take the Quiz
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="card-elev-prominent" data-testid="card-diagnostic-cta">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-background border border-border/50 flex items-center justify-center mx-auto">
                    <Brain className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Career Diagnostic</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Have a resume? Upload it and get your readiness score, top paths, and a plan to get there.
                  </p>
                  <Link href="/diagnostic">
                    <Button size="sm" variant="outline" data-testid="button-run-diagnostic">
                      Get Your Score
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t border-border/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24">
            <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-10">
              <p
                className="text-sm font-semibold text-primary tracking-[0.2em] uppercase border-l-2 border-primary pl-3 inline-block mb-3"
                data-testid="text-partnership-label"
              >
                For Law Schools
              </p>
              <h2
                className="text-xl sm:text-3xl font-serif font-medium text-foreground"
                data-testid="text-partnership-title"
              >
                Bring career intelligence to your campus
              </h2>
              <p className="text-sm text-muted-foreground mt-3">
                Help your students discover legal tech career paths with real-time market data and AI-powered career diagnostics.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Real-time job data</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Live listings from legal tech companies, updated daily.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Brain className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">AI career diagnostics</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Students upload a resume and get a personalized readiness report.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Career path mapping</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Show students the full landscape of legal tech career paths.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Market intelligence</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Salary data, demand trends, and hiring signals for career services teams.</p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <Button asChild data-testid="button-partner-with-us">
                <a href="mailto:partnerships@legaltechcareers.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Partner with us
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border/30 bg-muted/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-24 text-center">
            <h2
              className="text-xl sm:text-3xl font-serif font-medium text-foreground mb-4"
              data-testid="text-final-cta-title"
            >
              Your legal career starts here
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
              Browse curated roles, discover your best-fit career path, and take the first step.
            </p>
            <Link href="/jobs">
              <Button size="lg" data-testid="button-explore-all">
                Explore All Opportunities
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
