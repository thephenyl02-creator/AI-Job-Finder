import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Job, SavedJob } from "@shared/schema";
import {
  Bookmark,
  BookmarkX,
  Briefcase,
  Clock,
  DollarSign,
  ExternalLink,
  Loader2,
  MapPin,
  AlertTriangle,
} from "lucide-react";
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

function formatSalary(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${(n / 1000).toFixed(0)}K`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

export default function SavedJobs() {
  usePageTitle("Saved Jobs");
  const { isAuthenticated } = useAuth();

  const { data: savedJobs = [], isLoading } = useQuery<SavedJobWithJob[]>({
    queryKey: ["/api/saved-jobs"],
    enabled: isAuthenticated,
  });

  const unsaveMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("DELETE", `/api/saved-jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs/ids"] });
    },
  });

  const urgentJobs = savedJobs.filter(sj => getUrgencyLevel(sj.job.postedDate) === "urgent");
  const warningJobs = savedJobs.filter(sj => getUrgencyLevel(sj.job.postedDate) === "warning");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold font-serif text-foreground" data-testid="text-saved-jobs-title">
              Saved Jobs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {savedJobs.length} {savedJobs.length === 1 ? "job" : "jobs"} saved
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/jobs" data-testid="link-browse-jobs">
              <Briefcase className="h-4 w-4 mr-2" />
              Browse Jobs
            </Link>
          </Button>
        </div>

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
              const salary = formatSalary(sj.job.salaryMin, sj.job.salaryMax);
              return (
                <Card
                  key={sj.id}
                  className={`hover-elevate transition-all ${
                    urgency === "urgent"
                      ? "border-destructive/40"
                      : urgency === "warning"
                      ? "border-yellow-500/40"
                      : ""
                  }`}
                  data-testid={`card-saved-job-${sj.job.id}`}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <Avatar className="h-11 w-11 rounded-lg flex-shrink-0">
                        <AvatarImage src={sj.job.companyLogo || undefined} alt={sj.job.company} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                          {sj.job.company.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground mb-0.5">{sj.job.company}</p>
                            <Link href={`/jobs/${sj.job.id}`}>
                              <h3
                                className="text-base font-semibold text-foreground hover:text-primary transition-colors truncate cursor-pointer"
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

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {sj.job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {sj.job.location}
                            </span>
                          )}
                          {sj.job.isRemote && (
                            <Badge variant="secondary" className="text-[10px]">Remote</Badge>
                          )}
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
