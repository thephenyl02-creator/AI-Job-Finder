import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import { useIsMobile } from "@/hooks/use-mobile";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Container } from "@/components/container";
import { CompanyLogo } from "@/components/company-logo";
import { JobLocation } from "@/components/job-location";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  GENERIC_PALETTE,
  SHARED_AXIS_STYLE,
  SHARED_GRID_STYLE,
  SHARED_TOOLTIP_STYLE,
} from "@/lib/chart-theme";
import {
  ExternalLink,
  Briefcase,
  TrendingUp,
  Globe,
  Building2,
  ArrowLeft,
  Sparkles,
  Compass,
  CalendarDays,
  Users,
  Laptop,
  MapPin,
} from "lucide-react";

interface CompanyProfile {
  name: string;
  domain: string | null;
  logoUrl: string | null;
  totalJobs: number;
  categories: { name: string; count: number }[];
  seniority: { entry: number; mid: number; senior: number };
  topHardSkills: string[];
  topSoftSkills: string[];
  workModeSplit: { remote: number; hybrid: number; onsite: number };
  activeJobs: {
    id: number;
    title: string;
    location: string | null;
    seniorityLevel: string | null;
    postedDate: string | null;
    roleCategory: string | null;
  }[];
  companyIntel: {
    summary: string | null;
    product: string | null;
    fundingStage: string | null;
    growthSignals: string[] | null;
    recentNews: string[] | null;
  } | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDominantWorkMode(split: { remote: number; hybrid: number; onsite: number }): string {
  const max = Math.max(split.remote, split.hybrid, split.onsite);
  if (max === 0) return "Mixed";
  if (split.remote === max) return "Remote";
  if (split.hybrid === max) return "Hybrid";
  return "On-site";
}

function getPrimarySeniority(seniority: { entry: number; mid: number; senior: number }): string {
  const max = Math.max(seniority.entry, seniority.mid, seniority.senior);
  if (max === 0) return "Various";
  if (seniority.senior === max) return "Senior";
  if (seniority.mid === max) return "Mid-level";
  return "Entry-level";
}

export default function CompanyProfile() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const isMobile = useIsMobile();

  const { data: profile, isLoading, error } = useQuery<CompanyProfile>({
    queryKey: ["/api/companies", slug],
  });

  usePageTitle(
    profile ? `${profile.name} Legal Tech Jobs` : "Company Profile"
  );

  const truncateLabel = (label: string, maxLength: number = 14): string => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength - 1) + "…";
  };

  useEffect(() => {
    if (!profile) return;
    const topCats = profile.categories.slice(0, 3).map(c => c.name).join(", ");
    const topSkills = profile.topHardSkills.slice(0, 5).join(", ");

    const metaDesc = document.querySelector('meta[name="description"]');
    const descContent = `Explore ${profile.totalJobs} legal tech roles at ${profile.name}. Categories: ${topCats}. Skills: ${topSkills}.`;
    if (metaDesc) {
      metaDesc.setAttribute("content", descContent);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = descContent;
      document.head.appendChild(meta);
    }

    const orgLd: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: profile.name,
      description: profile.companyIntel?.summary || `${profile.name} - Legal tech company with ${profile.totalJobs} open roles`,
    };
    if (profile.domain) {
      orgLd.url = `https://${profile.domain}`;
    }
    if (profile.logoUrl) {
      orgLd.logo = profile.logoUrl;
    }

    const jobPostings = profile.activeJobs.slice(0, 20).map(job => ({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: job.title,
      datePosted: job.postedDate ? new Date(job.postedDate).toISOString().split("T")[0] : undefined,
      hiringOrganization: {
        "@type": "Organization",
        name: profile.name,
        ...(profile.domain ? { sameAs: `https://${profile.domain}` } : {}),
      },
      jobLocation: job.location ? {
        "@type": "Place",
        address: job.location,
      } : undefined,
    }));

    const scriptEl = document.createElement("script");
    scriptEl.type = "application/ld+json";
    scriptEl.id = "company-structured-data";
    scriptEl.textContent = JSON.stringify([orgLd, ...jobPostings]);
    document.head.appendChild(scriptEl);

    return () => {
      const el = document.getElementById("company-structured-data");
      if (el) el.remove();
    };
  }, [profile]);

  const topCategory = useMemo(() => {
    if (!profile?.categories?.length) return "N/A";
    return profile.categories[0].name;
  }, [profile]);

  const dominantWorkMode = useMemo(() => {
    if (!profile) return "Mixed";
    return getDominantWorkMode(profile.workModeSplit);
  }, [profile]);

  const primarySeniority = useMemo(() => {
    if (!profile) return "Various";
    return getPrimarySeniority(profile.seniority);
  }, [profile]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1">
          <Container size="lg" className="py-8">
            <div className="flex items-center gap-4 mb-8">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-md" />
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold" data-testid="text-company-not-found">
              Company not found
            </h2>
            <p className="text-sm text-muted-foreground">
              This company profile doesn't exist or has no active listings.
            </p>
            <Link href="/companies">
              <Button variant="outline" data-testid="link-back-companies">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Companies
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Container size="lg" className="py-6 sm:py-8 space-y-8">
          <div className="flex items-start gap-2 mb-2">
            <Link href="/companies">
              <Button variant="ghost" size="sm" data-testid="link-back-companies">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Companies
              </Button>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
            <CompanyLogo
              company={profile.name}
              logo={profile.logoUrl}
              size="md"
            />
            <div className="flex-1 min-w-0 space-y-2">
              <h1
                className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight"
                data-testid="text-company-name"
              >
                {profile.name}
              </h1>
              {profile.domain && (
                <a
                  href={`https://${profile.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-company-domain"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {profile.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {profile.companyIntel?.summary && (
                <p
                  className="text-sm text-muted-foreground leading-relaxed max-w-2xl"
                  data-testid="text-company-summary"
                >
                  {profile.companyIntel.summary}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card data-testid="stat-total-jobs">
              <CardContent className="p-4 text-center space-y-1">
                <Briefcase className="h-5 w-5 mx-auto text-muted-foreground" />
                <div className="text-2xl font-bold">{profile.totalJobs}</div>
                <div className="text-xs text-muted-foreground">Active Jobs</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-top-category">
              <CardContent className="p-4 text-center space-y-1">
                <Sparkles className="h-5 w-5 mx-auto text-muted-foreground" />
                <div className="text-sm font-semibold truncate px-1">{topCategory}</div>
                <div className="text-xs text-muted-foreground">Top Category</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-seniority">
              <CardContent className="p-4 text-center space-y-1">
                <Users className="h-5 w-5 mx-auto text-muted-foreground" />
                <div className="text-sm font-semibold">{primarySeniority}</div>
                <div className="text-xs text-muted-foreground">Primary Level</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-work-mode">
              <CardContent className="p-4 text-center space-y-1">
                <Laptop className="h-5 w-5 mx-auto text-muted-foreground" />
                <div className="text-sm font-semibold">{dominantWorkMode}</div>
                <div className="text-xs text-muted-foreground">Work Mode</div>
              </CardContent>
            </Card>
          </div>

          {profile.categories.length > 0 && (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-base font-semibold mb-4" data-testid="heading-category-breakdown">
                  Job Categories
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={profile.categories}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        horizontal={false}
                        {...SHARED_GRID_STYLE}
                      />
                      <XAxis type="number" {...SHARED_AXIS_STYLE} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={isMobile ? 100 : 140}
                        {...SHARED_AXIS_STYLE}
                        tick={{ ...SHARED_AXIS_STYLE.tick, fontSize: 12 }}
                        tickFormatter={isMobile ? (label: string) => truncateLabel(label, 14) : undefined}
                      />
                      <Tooltip {...SHARED_TOOLTIP_STYLE} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                        {profile.categories.map((_entry, index) => (
                          <Cell
                            key={index}
                            fill={GENERIC_PALETTE[index % GENERIC_PALETTE.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {(profile.topHardSkills.length > 0 || profile.topSoftSkills.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.topHardSkills.length > 0 && (
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base font-semibold mb-3" data-testid="heading-hard-skills">
                      Top Hard Skills
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {profile.topHardSkills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          data-testid={`badge-hard-skill-${skill.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {profile.topSoftSkills.length > 0 && (
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base font-semibold mb-3" data-testid="heading-soft-skills">
                      Top Soft Skills
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {profile.topSoftSkills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          data-testid={`badge-soft-skill-${skill.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {profile.companyIntel && (profile.companyIntel.fundingStage || (profile.companyIntel.growthSignals && profile.companyIntel.growthSignals.length > 0) || (profile.companyIntel.recentNews && profile.companyIntel.recentNews.length > 0)) && (
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <h2 className="text-base font-semibold flex items-center gap-2" data-testid="heading-growth-signals">
                  <TrendingUp className="h-4 w-4" />
                  Company Intelligence
                </h2>
                {profile.companyIntel.fundingStage && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Funding Stage
                    </span>
                    <p className="text-sm mt-1" data-testid="text-funding-stage">
                      {profile.companyIntel.fundingStage}
                    </p>
                  </div>
                )}
                {profile.companyIntel.product && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Product
                    </span>
                    <p className="text-sm mt-1" data-testid="text-product">
                      {profile.companyIntel.product}
                    </p>
                  </div>
                )}
                {profile.companyIntel.growthSignals && profile.companyIntel.growthSignals.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Growth Signals
                    </span>
                    <ul className="mt-1 space-y-1">
                      {profile.companyIntel.growthSignals.map((signal, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" data-testid={`text-growth-signal-${i}`}>
                          <TrendingUp className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          {signal}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {profile.companyIntel.recentNews && profile.companyIntel.recentNews.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Recent News
                    </span>
                    <ul className="mt-1 space-y-1">
                      {profile.companyIntel.recentNews.map((news, i) => (
                        <li key={i} className="text-sm text-muted-foreground" data-testid={`text-recent-news-${i}`}>
                          {news}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {profile.activeJobs.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-4" data-testid="heading-active-listings">
                Active Listings ({profile.activeJobs.length})
              </h2>
              <div className="space-y-3">
                {profile.activeJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <Card
                      className="hover-elevate cursor-pointer transition-colors"
                      data-testid={`card-job-${job.id}`}
                    >
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium truncate" data-testid={`text-job-title-${job.id}`}>
                            {job.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {job.location}
                              </span>
                            )}
                            {job.seniorityLevel && (
                              <span>{job.seniorityLevel}</span>
                            )}
                            {job.postedDate && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {formatDate(job.postedDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        {job.roleCategory && (
                          <Badge variant="secondary" className="self-start sm:self-center shrink-0 truncate max-w-[140px]">
                            {job.roleCategory}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 sm:p-6 text-center space-y-3">
              <Compass className="h-8 w-8 mx-auto text-primary" />
              <h2 className="text-lg font-semibold" data-testid="heading-diagnostic-cta">
                How do you match {profile.name}'s roles?
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Take the Career Diagnostic to see how your skills align with {profile.name}'s open positions and get personalized recommendations.
              </p>
              <Link href="/diagnostic">
                <Button data-testid="button-diagnostic-cta">
                  Take the Career Diagnostic
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
