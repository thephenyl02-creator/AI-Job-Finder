import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Job, SavedJob } from "@shared/schema";
import { formatSalary } from "@/lib/format-salary";
import {
  Bookmark,
  BookmarkX,
  Briefcase,
  Check,
  Clock,
  Crown,
  DollarSign,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Scale,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { JobLocation, JobLocationInline } from "@/components/job-location";
import { Link } from "wouter";
import { Footer } from "@/components/footer";

type SavedJobWithJob = SavedJob & { job: Job };

function getDaysAgo(date: Date | string | null | undefined): number {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function getPostingAge(date: Date | string | null | undefined): string {
  const days = getDaysAgo(date);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function getUrgencyLevel(postedDate: Date | string | null | undefined): "urgent" | "warning" | "normal" {
  const days = getDaysAgo(postedDate);
  if (days >= 25) return "urgent";
  if (days >= 14) return "warning";
  return "normal";
}



function getLegalFitLabel(score: number | null | undefined): string | null {
  if (!score || score < 8) return null;
  if (score >= 9) return "JD Preferred";
  return "Legal Background Valued";
}

const MAX_COMPARE = 3;
const FREE_SAVE_LIMIT = 5;

function CompareView({ jobs, onClose }: { jobs: Job[]; onClose: () => void }) {
  const rows: { label: string; render: (job: Job) => React.ReactNode }[] = [
    {
      label: "Company",
      render: (job) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 rounded-md">
            <AvatarImage src={job.companyLogo || undefined} alt={job.company} />
            <AvatarFallback className="rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
              {job.company.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground">{job.company}</span>
        </div>
      ),
    },
    {
      label: "Location",
      render: (job) => (
        <div className="space-y-1">
          <JobLocationInline location={job.location} locationType={job.locationType} isRemote={job.isRemote} className="text-sm text-foreground/80" />
        </div>
      ),
    },
    {
      label: "Salary",
      render: (job) => {
        const salary = formatSalary(job.salaryMin, job.salaryMax, (job as any).salaryCurrency);
        return salary
          ? <span className="text-sm font-medium text-green-600 dark:text-green-400">{salary}</span>
          : <span className="text-sm text-muted-foreground">Not listed</span>;
      },
    },
    {
      label: "Level",
      render: (job) => (
        <span className="text-sm text-foreground/80">{job.seniorityLevel || "Not specified"}</span>
      ),
    },
    {
      label: "Legal Fit",
      render: (job) => {
        const label = getLegalFitLabel(job.legalRelevanceScore);
        if (!label) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <Badge variant="secondary" className={`text-[10px] gap-0.5 ${
            job.legalRelevanceScore! >= 9
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
              : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
          }`}>
            <Scale className="h-2.5 w-2.5" />
            {label}
          </Badge>
        );
      },
    },
    {
      label: "Key Skills",
      render: (job) => (
        <div className="flex flex-wrap gap-1">
          {job.keySkills && job.keySkills.length > 0
            ? job.keySkills.slice(0, 5).map((skill, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{skill}</Badge>
              ))
            : <span className="text-sm text-muted-foreground">-</span>
          }
        </div>
      ),
    },
    {
      label: "Posted",
      render: (job) => (
        <span className="text-sm text-foreground/80">{getPostingAge(job.postedDate)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4" data-testid="section-compare-view">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-serif font-medium text-foreground" data-testid="heading-compare">
          Compare {jobs.length} Jobs
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5" data-testid="button-close-compare">
          <X className="h-4 w-4" />
          Close
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24 sm:w-32 align-top" />
                  {jobs.map((job) => (
                    <th key={job.id} className="p-3 align-top min-w-[180px]">
                      <Link href={`/jobs/${job.id}`} className="hover:text-primary transition-colors">
                        <span className="text-sm font-semibold text-foreground leading-snug line-clamp-2" data-testid={`compare-title-${job.id}`}>
                          {job.title}
                        </span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={row.label} className={ri < rows.length - 1 ? "border-b border-border/50" : ""}>
                    <td className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap">
                      {row.label}
                    </td>
                    {jobs.map((job) => (
                      <td key={job.id} className="p-3 align-top" data-testid={`compare-${row.label.toLowerCase().replace(/\s/g, '-')}-${job.id}`}>
                        {row.render(job)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="p-3" />
                  {jobs.map((job) => (
                    <td key={job.id} className="p-3">
                      <Button asChild size="sm" className="gap-1.5 w-full" data-testid={`compare-apply-${job.id}`}>
                        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                          Apply
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SavedJobs() {
  usePageTitle("Saved Jobs");
  const { isAuthenticated } = useAuth();
  const { isFree } = useSubscription();
  const { track } = useActivityTracker();
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => { track({ eventType: "page_view", pagePath: "/saved-jobs" }); }, []);

  const { data: savedJobs = [], isLoading } = useQuery<SavedJobWithJob[]>({
    queryKey: ["/api/saved-jobs"],
    enabled: isAuthenticated,
  });

  const remaining = Math.max(0, FREE_SAVE_LIMIT - savedJobs.length);

  const unsaveMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("DELETE", `/api/saved-jobs/${jobId}`);
      track({ eventType: "unsave_job", entityType: "job", entityId: String(jobId) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs/ids"] });
    },
  });

  const urgentJobs = savedJobs.filter(sj => getUrgencyLevel(sj.job.postedDate) === "urgent");
  const warningJobs = savedJobs.filter(sj => getUrgencyLevel(sj.job.postedDate) === "warning");

  const toggleSelect = (jobId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else if (next.size < MAX_COMPARE) {
        next.add(jobId);
      }
      return next;
    });
  };

  const selectedJobs = savedJobs
    .filter(sj => selectedIds.has(sj.job.id))
    .map(sj => sj.job);

  const exitCompare = () => {
    setCompareMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold font-serif text-foreground" data-testid="text-saved-jobs-title">
              Your saved roles
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {savedJobs.length} {savedJobs.length === 1 ? "job" : "jobs"} saved
              {isFree && !isLoading && (
                <span className="ml-1" data-testid="text-saved-jobs-remaining">
                  ({remaining} of {FREE_SAVE_LIMIT} saves remaining)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {savedJobs.length >= 2 && !compareMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCompareMode(true)}
                className="gap-1.5"
                data-testid="button-enter-compare"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Compare
              </Button>
            )}
            {compareMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={exitCompare}
                className="gap-1.5"
                data-testid="button-exit-compare"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            )}
            {isFree && remaining === 0 && (
              <Button size="sm" asChild data-testid="button-upgrade-saved-jobs">
                <Link href="/pricing" className="gap-1.5">
                  <Crown className="h-3.5 w-3.5" />
                  Upgrade for Unlimited
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/jobs" data-testid="link-browse-jobs">
                <Briefcase className="h-4 w-4 mr-2" />
                Browse Jobs
              </Link>
            </Button>
          </div>
        </div>

        {compareMode && (
          <div className="mb-4 rounded-md bg-muted/50 border border-border/30 px-4 py-3 flex items-center gap-3 flex-wrap" data-testid="compare-instructions">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">
              {selectedIds.size < 2
                ? `Select 2\u20133 jobs to compare side by side (${selectedIds.size} selected)`
                : `Comparing ${selectedIds.size} jobs \u2014 select up to ${MAX_COMPARE}`}
            </p>
          </div>
        )}

        {compareMode && selectedIds.size >= 2 && (
          <div className="mb-6">
            <CompareView jobs={selectedJobs} onClose={exitCompare} />
          </div>
        )}

        {(urgentJobs.length > 0 || warningJobs.length > 0) && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground" data-testid="text-expiry-warning">
                    {urgentJobs.length > 0
                      ? `${urgentJobs.length} saved ${urgentJobs.length === 1 ? "job" : "jobs"} may expire soon`
                      : `${warningJobs.length} saved ${warningJobs.length === 1 ? "job is" : "jobs are"} getting older`}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Older job postings are more likely to close. Apply before they expire.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : savedJobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                <Bookmark className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-no-saved-jobs">
                No saved jobs yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                Save jobs you're interested in by clicking the bookmark icon. We'll remind you to apply before they expire.
              </p>
              <Button asChild>
                <Link href="/jobs" data-testid="link-browse-empty">Browse Jobs</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {savedJobs.map((sj) => {
              const urgency = getUrgencyLevel(sj.job.postedDate);
              const salary = formatSalary(sj.job.salaryMin, sj.job.salaryMax, (sj.job as any).salaryCurrency);
              const isSelected = selectedIds.has(sj.job.id);
              const atLimit = selectedIds.size >= MAX_COMPARE && !isSelected;
              return (
                <Card
                  key={sj.id}
                  className={`hover-elevate transition-all ${
                    isSelected
                      ? "ring-2 ring-primary/50 border-primary/30"
                      : urgency === "urgent"
                      ? "border-destructive/40"
                      : urgency === "warning"
                      ? "border-yellow-500/40"
                      : ""
                  }`}
                  data-testid={`card-saved-job-${sj.job.id}`}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {compareMode && (
                        <button
                          onClick={() => toggleSelect(sj.job.id)}
                          disabled={atLimit}
                          className={`mt-1 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : atLimit
                              ? "border-muted-foreground/30 cursor-not-allowed"
                              : "border-muted-foreground/40 hover:border-primary/60"
                          }`}
                          data-testid={`checkbox-compare-${sj.job.id}`}
                          aria-label={`Select ${sj.job.title} for comparison`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </button>
                      )}

                      <Avatar className="h-11 w-11 rounded-lg flex-shrink-0">
                        <AvatarImage src={sj.job.companyLogo || undefined} alt={sj.job.company} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                          {sj.job.company.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground mb-0.5">{sj.job.company}</p>
                            <Link href={`/jobs/${sj.job.id}`}>
                              <h3
                                className="text-base font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 cursor-pointer leading-snug"
                                data-testid={`text-saved-job-title-${sj.job.id}`}
                              >
                                {sj.job.title}
                              </h3>
                            </Link>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {urgency === "urgent" && (
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                May Expire
                              </Badge>
                            )}
                            {urgency === "warning" && (
                              <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 text-[10px]">
                                <Clock className="h-3 w-3 mr-1" />
                                Getting Older
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-xs text-muted-foreground">
                          <JobLocation location={sj.job.location} locationType={sj.job.locationType} isRemote={sj.job.isRemote} />
                          {salary && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {salary}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Posted {getPostingAge(sj.job.postedDate)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <Button asChild size="sm" className="gap-1.5" data-testid={`button-apply-saved-${sj.job.id}`}>
                            <a href={sj.job.applyUrl} target="_blank" rel="noopener noreferrer">
                              Apply Now
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unsaveMutation.mutate(sj.job.id)}
                            disabled={unsaveMutation.isPending}
                            className="text-muted-foreground gap-1.5"
                            data-testid={`button-unsave-${sj.job.id}`}
                          >
                            <BookmarkX className="h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
