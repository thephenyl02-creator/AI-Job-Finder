import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { JobApplicationWithJob, ApplicationStatus } from "@shared/schema";
import { APPLICATION_STATUSES } from "@shared/schema";
import { Link } from "wouter";
import {
  Bookmark, Send, MessageSquare, Award, XCircle,
  Briefcase, MapPin, DollarSign, ExternalLink,
  Loader2, Trash2, StickyNote, ChevronDown, ChevronUp,
  ClipboardList, ArrowRight
} from "lucide-react";

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; icon: typeof Bookmark; color: string }> = {
  saved: { label: "Saved", icon: Bookmark, color: "bg-muted text-muted-foreground" },
  applied: { label: "Applied", icon: Send, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  interviewing: { label: "Interviewing", icon: MessageSquare, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  offer: { label: "Offer", icon: Award, color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  rejected: { label: "Not Moving Forward", icon: XCircle, color: "bg-red-500/10 text-red-500 dark:text-red-400" },
};

function formatSalary(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${(n / 1000).toFixed(0)}K`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function ApplicationCard({ app, onStatusChange, onDelete, onNotesChange }: {
  app: JobApplicationWithJob;
  onStatusChange: (id: number, status: ApplicationStatus) => void;
  onDelete: (id: number) => void;
  onNotesChange: (id: number, notes: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(app.notes || "");
  const statusInfo = STATUS_CONFIG[app.status as ApplicationStatus] || STATUS_CONFIG.saved;
  const salary = formatSalary(app.job.salaryMin, app.job.salaryMax);
  const StatusIcon = statusInfo.icon;

  return (
    <Card data-testid={`card-application-${app.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link href={`/jobs/${app.job.id}`}>
              <h3 className="font-medium text-foreground text-sm leading-snug hover:text-primary transition-colors cursor-pointer truncate" data-testid={`text-app-title-${app.id}`}>
                {app.job.title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {app.job.company}
              </span>
              {app.job.location && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {app.job.location}
                </span>
              )}
              {salary && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {salary}
                </span>
              )}
            </div>
            {app.appliedDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Applied {new Date(app.appliedDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={app.status}
              onValueChange={(v) => onStatusChange(app.id, v as ApplicationStatus)}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs" data-testid={`select-status-${app.id}`}>
                <div className="flex items-center gap-1.5">
                  <StatusIcon className="h-3 w-3" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUSES.map(s => {
                  const cfg = STATUS_CONFIG[s];
                  const Icon = cfg.icon;
                  return (
                    <SelectItem key={s} value={s}>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotes(!showNotes)}
            className="text-xs gap-1"
            data-testid={`button-toggle-notes-${app.id}`}
          >
            <StickyNote className="h-3 w-3" />
            Notes
            {showNotes ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          {app.job.applyUrl && (
            <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
              <a href={app.job.applyUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-apply-${app.id}`}>
                <ExternalLink className="h-3 w-3" />
                View Posting
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(app.id)}
            className="text-xs gap-1 text-destructive ml-auto"
            data-testid={`button-delete-app-${app.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {showNotes && (
          <div className="mt-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== (app.notes || "")) {
                  onNotesChange(app.id, notes);
                }
              }}
              placeholder="Add notes about this opportunity..."
              className="text-sm min-h-[60px] resize-none"
              data-testid={`textarea-notes-${app.id}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Applications() {
  usePageTitle("Application Tracker");
  const { isAuthenticated } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: applications = [], isLoading } = useQuery<JobApplicationWithJob[]>({
    queryKey: ["/api/applications"],
    enabled: isAuthenticated,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/applications/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/applications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
  });

  const handleStatusChange = (id: number, status: ApplicationStatus) => {
    updateMutation.mutate({ id, data: { status } });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleNotesChange = (id: number, notes: string) => {
    updateMutation.mutate({ id, data: { notes } });
  };

  const filtered = filterStatus === "all"
    ? applications
    : applications.filter(a => a.status === filterStatus);

  const statusCounts = APPLICATION_STATUSES.reduce((acc, s) => {
    acc[s] = applications.filter(a => a.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-medium text-foreground tracking-tight" data-testid="text-applications-title">
            Application Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your job applications from saved through offer.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center text-center py-16 px-6">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <ClipboardList className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-medium text-foreground mb-2" data-testid="text-no-applications">
                No applications tracked yet
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                Start tracking your job applications to stay organized. You can add any job from the job detail page.
              </p>
              <Button asChild data-testid="button-browse-to-track">
                <Link href="/jobs">
                  Browse Jobs
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
                data-testid="button-filter-all"
              >
                All ({applications.length})
              </Button>
              {APPLICATION_STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s];
                const cnt = statusCounts[s] || 0;
                if (cnt === 0) return null;
                const Icon = cfg.icon;
                return (
                  <Button
                    key={s}
                    variant={filterStatus === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus(s)}
                    className="gap-1"
                    data-testid={`button-filter-${s}`}
                  >
                    <Icon className="h-3 w-3" />
                    {cfg.label} ({cnt})
                  </Button>
                );
              })}
            </div>

            <div className="space-y-2">
              {filtered.map(app => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onNotesChange={handleNotesChange}
                />
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No applications with this status.
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
