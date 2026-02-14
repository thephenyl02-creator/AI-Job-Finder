import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Bookmark } from "lucide-react";
import { JobLocation } from "./job-location";
import type { JobWithScore } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface JobCardProps {
  job: JobWithScore;
  showMatchScore?: boolean;
  hasResume?: boolean;
  isSaved?: boolean;
  isAuthenticated?: boolean;
}

export function JobCard({ job, isSaved = false, isAuthenticated = false }: JobCardProps) {
  const { toast } = useToast();

  const getTimeAgo = (date?: Date | string | null) => {
    if (!date) return "Recently";
    const days = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1d ago";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}m ago`;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await apiRequest("DELETE", `/api/saved-jobs/${job.id}`);
      } else {
        await apiRequest("POST", `/api/saved-jobs/${job.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs/ids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
    },
    onError: (error: any) => {
      if (error?.message?.includes("5 jobs") || error?.message?.includes("Upgrade to Pro")) {
        toast({ title: "Save limit reached", description: "Free accounts can save up to 5 jobs. Upgrade to Pro for unlimited saves.", variant: "destructive" });
      }
    },
  });

  const handleApplyClick = () => {
    apiRequest("POST", `/api/jobs/${job.id}/apply-click`).catch(() => {});
  };

  return (
    <Card className="group hover:border-primary/50 transition-all duration-200 hover-elevate" data-testid={`card-job-${job.id}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link to={`/jobs/${job.id}`} className="flex-shrink-0">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg">
              <AvatarImage src={job.companyLogo || undefined} alt={job.company} />
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                {job.company.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/jobs/${job.id}`} className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate" data-testid={`text-job-title-${job.id}`}>
                  {job.title}
                </h3>
              </Link>

              <div className="flex items-center gap-1 flex-shrink-0">
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveMutation.mutate(); }}
                    disabled={saveMutation.isPending}
                    data-testid={`button-save-job-${job.id}`}
                    className={isSaved ? "text-primary" : "text-muted-foreground"}
                  >
                    <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                  </Button>
                )}
                <Button asChild variant="outline" size="sm" className="gap-1.5" data-testid={`button-apply-${job.id}`}>
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.stopPropagation(); handleApplyClick(); }}
                  >
                    Apply
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>

            <Link to={`/jobs/${job.id}`}>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <span className="truncate">{job.company}</span>
                <span className="flex-shrink-0">·</span>
                <span className="flex-shrink-0">{getTimeAgo(job.postedDate)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <JobLocation
                  location={job.location}
                  locationType={job.locationType}
                  isRemote={job.isRemote}
                  testIdPrefix={`job-${job.id}`}
                />
                {job.roleCategory && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {job.roleSubcategory || job.roleCategory}
                  </Badge>
                )}
              </div>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
