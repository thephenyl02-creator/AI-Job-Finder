import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/animations";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { Job } from "@shared/schema";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Building2,
  Briefcase,
  DollarSign,
  Clock,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const BULLET_PATTERN = /^(?:[-•*]\s|(?:\d+)[.)]\s)/;

function isBulletLine(line: string): boolean {
  return BULLET_PATTERN.test(line.trim());
}

function stripBulletPrefix(line: string): string {
  return line.trim().replace(/^(?:[-•*]\s+|(?:\d+)[.)]\s+)/, '');
}

function isLikelyHeading(text: string): boolean {
  const t = text.trim();
  if (t.length > 80 || t.length < 2) return false;
  if (t.endsWith(':')) return true;
  if (t === t.toUpperCase() && t.length > 3 && /[A-Z]/.test(t)) return true;
  return false;
}

function DescriptionContent({ text, testId }: { text?: string | null; testId: string }) {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks: { type: 'paragraph' | 'heading' | 'bullet'; content: string }[] = [];
  let currentParagraph = '';

  const flushParagraph = () => {
    const trimmed = currentParagraph.trim();
    if (trimmed) {
      blocks.push({ type: 'paragraph', content: trimmed });
    }
    currentParagraph = '';
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushParagraph();
      continue;
    }

    if (isBulletLine(trimmedLine)) {
      flushParagraph();
      blocks.push({ type: 'bullet', content: stripBulletPrefix(trimmedLine) });
      continue;
    }

    if (isLikelyHeading(trimmedLine) && !currentParagraph.trim()) {
      flushParagraph();
      blocks.push({ type: 'heading', content: trimmedLine });
      continue;
    }

    if (currentParagraph) {
      currentParagraph += ' ' + trimmedLine;
    } else {
      currentParagraph = trimmedLine;
    }
  }
  flushParagraph();

  return (
    <div className="max-w-none text-foreground leading-relaxed space-y-2" data-testid={testId}>
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <p key={i} className="font-medium text-foreground pt-3 first:pt-0">
              {block.content}
            </p>
          );
        }
        if (block.type === 'bullet') {
          return (
            <div key={i} className="flex gap-2 pl-1 py-0.5">
              <span className="text-muted-foreground shrink-0">&#8226;</span>
              <span>{block.content}</span>
            </div>
          );
        }
        return <p key={i}>{block.content}</p>;
      })}
    </div>
  );
}

export default function JobDetail() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: [`/api/jobs/${jobId}`],
    enabled: isAuthenticated && !!jobId,
  });

  const handleApplyClick = async () => {
    if (!job) return;
    try {
      await apiRequest("POST", `/api/jobs/${job.id}/apply-click`);
    } catch (e) {
      console.error("Failed to track apply click", e);
    }
    window.open(job.applyUrl, "_blank");
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading job details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Job Not Found</h1>
          <p className="text-muted-foreground mb-6">This job listing may have been removed or is no longer available.</p>
          <Button onClick={() => setLocation("/jobs")} data-testid="button-back-jobs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
  };

  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/jobs")}
          className="mb-6"
          data-testid="button-back-jobs"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>

        <ScrollReveal>
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  {job.companyLogo && (
                    <img
                      src={job.companyLogo}
                      alt={`${job.company} logo`}
                      className="w-12 h-12 rounded-lg object-contain bg-muted p-1"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}
                  <div>
                    <h1
                      className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight"
                      data-testid="text-job-detail-title"
                    >
                      {job.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium" data-testid="text-job-detail-company">{job.company}</span>
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span data-testid="text-job-detail-location">{job.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {job.seniorityLevel && (
                    <Badge variant="secondary" data-testid="badge-seniority">
                      {job.seniorityLevel}
                    </Badge>
                  )}
                  {job.roleCategory && (
                    <Badge variant="outline" data-testid="badge-category">
                      {job.roleCategory}
                    </Badge>
                  )}
                  {job.roleSubcategory && (
                    <Badge variant="outline" data-testid="badge-subcategory">
                      {job.roleSubcategory}
                    </Badge>
                  )}
                  {job.isRemote && (
                    <Badge variant="secondary">Remote</Badge>
                  )}
                  {job.roleType && (
                    <Badge variant="outline">{job.roleType}</Badge>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <Button
                  size="lg"
                  onClick={handleApplyClick}
                  data-testid="button-apply-detail"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apply Now
                </Button>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {job.aiSummary && (
              <Card>
                <CardContent className="pt-5 pb-5">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Summary</h2>
                  <p className="text-foreground leading-relaxed" data-testid="text-job-summary">
                    {job.aiSummary}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-5 pb-5">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Full Description</h2>
                <DescriptionContent text={job.description} testId="text-job-description" />
              </CardContent>
            </Card>

            {job.requirements && (
              <Card>
                <CardContent className="pt-5 pb-5">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Requirements</h2>
                  <DescriptionContent text={job.requirements} testId="text-job-requirements" />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-5 pb-5 space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h2>

                {salary && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Salary</p>
                      <p className="text-sm font-medium text-foreground" data-testid="text-salary">{salary}</p>
                    </div>
                  </div>
                )}

                {(job.experienceMin || job.experienceMax) && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Experience</p>
                      <p className="text-sm font-medium text-foreground" data-testid="text-experience">
                        {job.experienceMin && job.experienceMax
                          ? `${job.experienceMin}-${job.experienceMax} years`
                          : job.experienceMin
                          ? `${job.experienceMin}+ years`
                          : `Up to ${job.experienceMax} years`}
                      </p>
                    </div>
                  </div>
                )}

                {job.source && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Source</p>
                      <p className="text-sm font-medium text-foreground capitalize">{job.source}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {job.keySkills && job.keySkills.length > 0 && (
              <Card>
                <CardContent className="pt-5 pb-5">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Key Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.keySkills.map((skill, i) => (
                      <Badge key={i} variant="secondary" data-testid={`badge-skill-${i}`}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleApplyClick}
              data-testid="button-apply-detail-bottom"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Apply Now
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}