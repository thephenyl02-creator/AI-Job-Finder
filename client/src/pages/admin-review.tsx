import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle,
  Send, Eye, Filter,
} from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QAItem {
  code: string;
  field: string;
  message: string;
}

interface ReviewJob {
  id: number;
  title: string;
  company: string;
  location: string | null;
  roleCategory: string | null;
  source: string | null;
  pipelineStatus: string | null;
  qualityScore: number | null;
  legalRelevanceScore: number | null;
  structuredStatus: string | null;
  createdAt: string | null;
  qa: {
    qaStatus: string;
    errors: QAItem[];
    warnings: QAItem[];
    lawyerFirstScore: number;
    excludeReason: string | null;
  };
}

function QAStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "passed":
      return (
        <Badge variant="default" className="bg-emerald-600" data-testid="badge-qa-passed">
          <CheckCircle className="w-3 h-3 mr-1" />Passed
        </Badge>
      );
    case "needs_review":
      return (
        <Badge variant="default" className="bg-amber-600" data-testid="badge-qa-review">
          <AlertTriangle className="w-3 h-3 mr-1" />Review
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" data-testid="badge-qa-failed">
          <XCircle className="w-3 h-3 mr-1" />Failed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function AdminReview() {
  usePageTitle("Review Queue");
  const { toast } = useToast();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, refetch } = useQuery<{ total: number; jobs: ReviewJob[] }>({
    queryKey: ["/api/admin/jobs/review-queue", filter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/jobs/review-queue?filter=${filter}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !authLoading && !!user && !!isAdmin,
  });

  const bulkPublishMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/admin/jobs/bulk-qa-publish", { jobIds: ids });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk publish complete",
        description: `${data.published} of ${data.total} jobs published`,
      });
      setSelectedIds(new Set());
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (err: any) => {
      toast({ title: "Publish failed", description: err.message, variant: "destructive" });
    },
  });

  const publishSingleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/jobs/${id}/qa-publish`, { forceOverride: false });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Job published" });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (err: any) => {
      toast({ title: "Publish failed", description: err.message, variant: "destructive" });
    },
  });

  const forcePublishMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/jobs/${id}/qa-publish`, { forceOverride: true });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Job force-published" });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (err: any) => {
      toast({ title: "Force publish failed", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading) return null;
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold" data-testid="text-admin-required">Access Denied</h2>
              <p className="text-muted-foreground">Admin access required.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobs = data?.jobs || [];
  const passedJobs = jobs.filter((j) => j.qa.qaStatus === "passed");
  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };
  const selectAllPassed = () => {
    setSelectedIds(new Set(passedJobs.map((j) => j.id)));
  };

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "passed", label: "Passed" },
    { value: "needs_review", label: "Needs Review" },
    { value: "failed", label: "Failed" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Review Queue" />
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {data && (
              <Badge variant="secondary" data-testid="badge-total-count">
                {data.total} unpublished
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2" data-testid="filter-buttons">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {filterOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={filter === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(opt.value)}
              data-testid={`button-filter-${opt.value}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {passedJobs.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllPassed}
                data-testid="button-select-passed"
              >
                Select All Passed ({passedJobs.length})
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => bulkPublishMutation.mutate(Array.from(selectedIds))}
                  disabled={bulkPublishMutation.isPending}
                  data-testid="button-bulk-publish"
                >
                  {bulkPublishMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-1" />
                  )}
                  Publish Selected ({selectedIds.size})
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-empty-queue">
            No unpublished jobs matching this filter.
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-240px)]">
          <div className="space-y-3">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className={`transition-colors ${selectedIds.has(job.id) ? "ring-2 ring-primary/50" : ""}`}
                data-testid={`card-review-job-${job.id}`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {job.qa.qaStatus === "passed" && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(job.id)}
                            onChange={() => toggleSelect(job.id)}
                            className="w-4 h-4"
                            data-testid={`checkbox-job-${job.id}`}
                          />
                        )}
                        <span className="font-medium truncate" data-testid={`text-job-title-${job.id}`}>
                          {job.title}
                        </span>
                        <QAStatusBadge status={job.qa.qaStatus} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span>{job.company}</span>
                        {job.location && <span>{job.location}</span>}
                        {job.roleCategory && <Badge variant="secondary">{job.roleCategory}</Badge>}
                        {job.source && <Badge variant="outline">{job.source}</Badge>}
                        <span>Score: {job.qa.lawyerFirstScore}/100</span>
                      </div>

                      {job.qa.errors.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {job.qa.errors.slice(0, 3).map((e, i) => (
                            <div key={i} className="text-xs text-destructive flex items-center gap-1">
                              <XCircle className="w-3 h-3 shrink-0" />
                              {e.message}
                            </div>
                          ))}
                        </div>
                      )}
                      {job.qa.warnings.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {job.qa.warnings.slice(0, 2).map((w, i) => (
                            <div key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {w.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/admin?editJob=${job.id}`}>
                        <Button variant="ghost" size="icon" data-testid={`button-edit-${job.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      {job.qa.qaStatus === "passed" && (
                        <Button
                          size="sm"
                          onClick={() => publishSingleMutation.mutate(job.id)}
                          disabled={publishSingleMutation.isPending}
                          data-testid={`button-publish-${job.id}`}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Publish
                        </Button>
                      )}
                      {job.qa.qaStatus === "needs_review" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => forcePublishMutation.mutate(job.id)}
                          disabled={forcePublishMutation.isPending}
                          data-testid={`button-force-publish-${job.id}`}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Force Publish
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
      </div>
    </div>
  );
}
