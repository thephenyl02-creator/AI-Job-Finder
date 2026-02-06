import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, X, ExternalLink, Bookmark } from "lucide-react";
import { Link } from "wouter";
import type { Job, SavedJob } from "@shared/schema";

type SavedJobWithJob = SavedJob & { job: Job };

export function ExpiringJobsReminder() {
  const { isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const key = "expiring_jobs_dismissed_at";
    const lastDismissed = sessionStorage.getItem(key);
    if (lastDismissed) {
      const hoursAgo = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60);
      if (hoursAgo < 12) {
        setDismissed(true);
      }
    }
    setSessionChecked(true);
  }, []);

  const { data: expiringJobs = [] } = useQuery<SavedJobWithJob[]>({
    queryKey: ["/api/saved-jobs/expiring"],
    enabled: isAuthenticated && sessionChecked && !dismissed,
  });

  const dismissMutation = useMutation({
    mutationFn: async (savedJobId: number) => {
      await apiRequest("POST", `/api/saved-jobs/${savedJobId}/dismiss-reminder`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs/expiring"] });
    },
  });

  if (dismissed || !sessionChecked || expiringJobs.length === 0) return null;

  const handleDismissAll = () => {
    sessionStorage.setItem("expiring_jobs_dismissed_at", Date.now().toString());
    setDismissed(true);
    expiringJobs.forEach(sj => dismissMutation.mutate(sj.id));
  };

  const getDaysAgo = (date: Date | string | null | undefined) => {
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300" data-testid="expiring-jobs-reminder">
      <Card className="border-destructive/50 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <h4 className="text-sm font-semibold text-foreground" data-testid="text-reminder-title">
                Don't forget to apply!
              </h4>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              onClick={handleDismissAll}
              data-testid="button-dismiss-reminder"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            {expiringJobs.length} saved {expiringJobs.length === 1 ? "job" : "jobs"} may close soon:
          </p>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {expiringJobs.slice(0, 3).map(sj => (
              <div key={sj.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <Link href={`/jobs/${sj.job.id}`}>
                    <span className="text-foreground font-medium hover:text-primary cursor-pointer truncate block text-xs" data-testid={`text-expiring-job-${sj.job.id}`}>
                      {sj.job.title}
                    </span>
                  </Link>
                  <span className="text-[10px] text-muted-foreground">
                    {sj.job.company} · Posted {getDaysAgo(sj.job.postedDate)} days ago
                  </span>
                </div>
                <Button asChild size="sm" className="shrink-0 h-7 text-xs px-2">
                  <a href={sj.job.applyUrl} target="_blank" rel="noopener noreferrer" data-testid={`button-apply-expiring-${sj.job.id}`}>
                    Apply
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            ))}
          </div>

          {expiringJobs.length > 3 && (
            <p className="text-[10px] text-muted-foreground mt-2">
              + {expiringJobs.length - 3} more
            </p>
          )}

          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t">
            <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs h-7">
              <Link href="/saved-jobs" data-testid="link-view-saved-jobs">
                <Bookmark className="h-3 w-3" />
                View All Saved Jobs
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissAll}
              className="text-xs h-7 text-muted-foreground"
              data-testid="button-dismiss-all"
            >
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
