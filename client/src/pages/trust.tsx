import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  Database,
  Filter,
  Search,
  Globe,
  Lock,
  BarChart3,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface DataQualityStats {
  curation: {
    totalScreened: number;
    totalPublished: number;
    passRate: number;
    totalRejected: number;
    rejectedPct: number;
    filterCategories: number;
    uniqueCompanies: number;
    uniqueSources: number;
  };
  quality: {
    avgQualityScore: number;
    avgRelevanceScore: number;
  };
  market: {
    entryAccessiblePct: number;
    salaryTransparencyPct: number;
    uniqueCountries: number;
    uniqueRegions: number;
  };
}

function StatCard({ label, value, testId }: { label: string; value: string | number; testId: string }) {
  return (
    <div className="text-center" data-testid={testId}>
      <p className="text-2xl sm:text-3xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="text-center">
      <Skeleton className="h-8 w-16 mx-auto mb-1" />
      <Skeleton className="h-4 w-24 mx-auto" />
    </div>
  );
}

export default function Trust() {
  usePageTitle("How We Curate");

  const { data: stats, isLoading } = useQuery<DataQualityStats>({
    queryKey: ["/api/stats/data-quality"],
  });

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-12">
          <Badge variant="secondary" className="mb-4" data-testid="badge-trust-label">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Data Integrity
          </Badge>
          <h1
            className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight"
            data-testid="text-trust-title"
          >
            How We Curate Legal Tech Jobs
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Every listing on Legal Tech Careers is screened, scored, and verified before it
            reaches you. Here's exactly how our pipeline works — no black boxes.
          </p>
        </div>

        {isLoading ? (
          <Card className="mb-12">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </div>
            </CardContent>
          </Card>
        ) : stats ? (
          <Card className="mb-12" data-testid="card-live-stats">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground text-center mb-4 uppercase tracking-wider font-medium">
                Live Platform Stats
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <StatCard
                  label="Jobs Screened"
                  value={stats.curation.totalScreened.toLocaleString()}
                  testId="stat-total-screened"
                />
                <StatCard
                  label="Published"
                  value={stats.curation.totalPublished.toLocaleString()}
                  testId="stat-total-published"
                />
                <StatCard
                  label="Pass Rate"
                  value={`${stats.curation.passRate}%`}
                  testId="stat-pass-rate"
                />
                <StatCard
                  label="Companies"
                  value={stats.curation.uniqueCompanies.toLocaleString()}
                  testId="stat-companies"
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        <section className="mb-10" data-testid="section-sources">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-foreground shrink-0">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Where Jobs Come From</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Direct from employer systems — never scraped from behind logins.
              </p>
            </div>
          </div>
          <div className="prose prose-sm text-muted-foreground space-y-3 ml-12">
            <p>
              We pull listings directly from Applicant Tracking Systems (ATS) including
              Greenhouse, Lever, Workday, Ashby, iCIMS, and SmartRecruiters.
              We also monitor employer career pages and curated company directories
              focused on legal technology.
            </p>
            <p>
              Each source is validated to ensure it belongs to a company operating
              in the legal technology space — from pure-play legal AI startups to
              law firms with dedicated innovation teams, courts modernizing their
              systems, and legal aid organizations leveraging technology.
            </p>
            {stats && (
              <p className="text-xs">
                Currently tracking{" "}
                <span className="font-medium text-foreground">{stats.curation.uniqueSources}</span>{" "}
                verified sources across{" "}
                <span className="font-medium text-foreground">{stats.market.uniqueCountries}</span>{" "}
                countries.
              </p>
            )}
          </div>
        </section>

        <section className="mb-10" data-testid="section-quality-filters">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-foreground shrink-0">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Our Quality Filters</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {stats
                  ? `${stats.curation.filterCategories} filter categories keep noise out of your feed.`
                  : "Multiple filter categories keep noise out of your feed."}
              </p>
            </div>
          </div>
          <div className="ml-12 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Duplicate Detection", desc: "Near-duplicate and exact-match deduplication across sources" },
                { label: "Relevance Scoring", desc: "AI-powered screening for legal tech relevance" },
                { label: "Title Standardization", desc: "Normalizes titles to consistent taxonomy" },
                { label: "Description Completeness", desc: "Filters out stubs, garbage, and placeholder listings" },
                { label: "Location Normalization", desc: "Standardizes locations to country, region, and remote status" },
                { label: "Sanity Checks", desc: "Catches anomalies in salary, seniority, and company data" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {stats && (
              <p className="text-xs text-muted-foreground">
                Of{" "}
                <span className="font-medium text-foreground">
                  {stats.curation.totalScreened.toLocaleString()}
                </span>{" "}
                jobs screened,{" "}
                <span className="font-medium text-foreground">
                  {stats.curation.rejectedPct}%
                </span>{" "}
                were filtered out for quality or relevance issues.
              </p>
            )}
          </div>
        </section>

        <section className="mb-10" data-testid="section-verified-source">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-foreground shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">What "Verified Source" Means</h2>
              <p className="text-sm text-muted-foreground mt-1">
                A trust signal, not a paid placement.
              </p>
            </div>
          </div>
          <div className="prose prose-sm text-muted-foreground space-y-3 ml-12">
            <p>
              When you see the "Verified" badge on a job listing, it means the listing was
              pulled directly from the employer's own Applicant Tracking System — not a
              third-party aggregator, not a job board repost. The application link points
              straight to the employer.
            </p>
            <p>
              We regularly validate that verified links are still active, removing listings
              where the application page returns errors or has been taken down. No company
              pays for verified status — it's earned by having a direct, accessible ATS feed.
            </p>
          </div>
        </section>

        <section className="mb-10" data-testid="section-relevance-score">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-foreground shrink-0">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Legal Tech Relevance Score</h2>
              <p className="text-sm text-muted-foreground mt-1">
                How we determine if a role belongs on this platform.
              </p>
            </div>
          </div>
          <div className="prose prose-sm text-muted-foreground space-y-3 ml-12">
            <p>
              Every job receives a relevance score based on three signals: the type of
              company posting the role (legal AI startup vs. general tech), the job title
              (legal engineer vs. generic software engineer), and description content
              (mentions of legal workflows, compliance, contracts, e-discovery, etc.).
            </p>
            <p>
              Jobs that score below our threshold are automatically filtered out or flagged
              for manual review. This ensures you're seeing roles where a legal background
              is genuinely valued — not generic tech positions that happen to mention
              "legal" once.
            </p>
            {stats && (
              <p className="text-xs">
                Average relevance score across published jobs:{" "}
                <span className="font-medium text-foreground">{stats.quality.avgRelevanceScore}/100</span>.
                Average quality score:{" "}
                <span className="font-medium text-foreground">{stats.quality.avgQualityScore}/100</span>.
              </p>
            )}
          </div>
        </section>

        <section className="mb-10" data-testid="section-what-we-dont-do">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-foreground shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">What We Don't Do</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Principles we hold ourselves to.
              </p>
            </div>
          </div>
          <div className="ml-12 space-y-2">
            {[
              "We never scrape behind logins or paywalls",
              "We never sell candidate data to third parties",
              "We never accept payment to rank or feature jobs",
              "Resumes you upload can be deleted at any time — permanently",
              "No ghost jobs: listings are validated and stale posts are removed",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {stats && (
          <section className="mb-12" data-testid="section-additional-stats">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-foreground shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Market Coverage</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Breadth and accessibility of our listings.
                </p>
              </div>
            </div>
            <div className="ml-12">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  label="Countries"
                  value={stats.market.uniqueCountries}
                  testId="stat-countries"
                />
                <StatCard
                  label="Regions"
                  value={stats.market.uniqueRegions}
                  testId="stat-regions"
                />
                <StatCard
                  label="Entry-to-Mid Level"
                  value={`${stats.market.entryAccessiblePct}%`}
                  testId="stat-entry-pct"
                />
                <StatCard
                  label="Salary Disclosed"
                  value={`${stats.market.salaryTransparencyPct}%`}
                  testId="stat-salary-pct"
                />
              </div>
            </div>
          </section>
        )}

        <Card className="bg-muted/30 border-border/60">
          <CardContent className="p-6 sm:p-8 text-center">
            <Globe className="h-5 w-5 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-xl font-serif font-medium text-foreground mb-2">
              See the data for yourself
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Our Data Quality dashboard shows live curation statistics, quality distributions,
              and market coverage — open to everyone.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" asChild className="text-base" data-testid="button-trust-browse">
                <Link href="/jobs">
                  Browse Jobs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-trust-data-quality">
                <Link href="/market-intelligence">
                  View Data Quality
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
