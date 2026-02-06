import { JobCard } from "@/components/job-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Search, Sparkles } from "lucide-react";
import type { JobWithScore } from "@shared/schema";

interface JobListProps {
  jobs: JobWithScore[];
  isLoading?: boolean;
  showMatchScores?: boolean;
  emptyMessage?: string;
  searchQuery?: string;
  hasResume?: boolean;
  savedJobIds?: number[];
  isAuthenticated?: boolean;
}

function JobCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="flex justify-between pt-2 border-t border-border">
            <div className="flex gap-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function JobList({ 
  jobs, 
  isLoading = false, 
  showMatchScores = false,
  emptyMessage = "No jobs found",
  searchQuery,
  hasResume = false,
  savedJobIds = [],
  isAuthenticated = false,
}: JobListProps) {
  const savedSet = new Set(savedJobIds);
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="bg-card/50">
        <CardContent className="p-8 sm:p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            {searchQuery ? (
              <Search className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? "No matching jobs found" : emptyMessage}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {searchQuery 
              ? "Try adjusting your search criteria or browse all available positions."
              : "Check back later for new opportunities in the legal tech space."
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {searchQuery && jobs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Found <strong className="text-foreground">{jobs.length}</strong> matching positions</span>
        </div>
      )}
      {jobs.map((job) => (
        <JobCard 
          key={job.id} 
          job={job} 
          showMatchScore={showMatchScores}
          hasResume={hasResume}
          isSaved={savedSet.has(job.id)}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}
