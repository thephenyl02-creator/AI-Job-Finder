import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { JobApplicationWithJob } from "@shared/schema";
import {
  Briefcase,
  MessageSquare,
  Award,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Kanban,
} from "lucide-react";

const STATUS_CONFIG = {
  applied: { label: "Applied", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800", headerColor: "border-blue-400 dark:border-blue-500", icon: Briefcase },
  interviewing: { label: "Interviewing", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", headerColor: "border-amber-400 dark:border-amber-500", icon: MessageSquare },
  offer: { label: "Offer", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800", headerColor: "border-green-400 dark:border-green-500", icon: Award },
  rejected: { label: "Rejected", color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800", headerColor: "border-red-400 dark:border-red-500", icon: XCircle },
} as const;

type AppStatus = keyof typeof STATUS_CONFIG;
const STATUSES: AppStatus[] = ["applied", "interviewing", "offer", "rejected"];

function getRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getInitials(company: string): string {
  return company.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function ApplicationCard({ app, onStatusChange, onNotesChange, onDelete }: {
  app: JobApplicationWithJob;
  onStatusChange: (id: number, status: string) => void;
  onNotesChange: (id: number, notes: string) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(app.notes || "");

  return (
    <Card className="hover-elevate" data-testid={`card-application-${app.id}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <Link href={`/jobs/${app.jobId}`}>
            <Avatar className="h-8 w-8 shrink-0 cursor-pointer">
              <AvatarImage src={app.job?.companyLogo || undefined} alt={app.job?.company} />
              <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium">
                {getInitials(app.job?.company || "?")}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/jobs/${app.jobId}`}>
              <p className="text-sm font-medium text-foreground truncate cursor-pointer hover:underline" data-testid={`text-app-title-${app.id}`}>
                {app.job?.title || "Unknown Job"}
              </p>
            </Link>
            <p className="text-xs text-muted-foreground truncate" data-testid={`text-app-company-${app.id}`}>
              {app.job?.company || "Unknown Company"}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {getRelativeTime(app.appliedDate || app.createdAt)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
            data-testid={`button-expand-app-${app.id}`}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {app.notes && !expanded && (
          <p className="text-[11px] text-muted-foreground mt-1.5 truncate pl-[42px]">
            {app.notes}
          </p>
        )}

        {expanded && (
          <div className="mt-3 space-y-2 pl-[42px]">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <Select
                value={app.status}
                onValueChange={(val) => onStatusChange(app.id, val)}
              >
                <SelectTrigger className="h-8 text-xs mt-0.5" data-testid={`select-status-${app.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
              {editingNotes ? (
                <Textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onBlur={() => {
                    setEditingNotes(false);
                    if (notesValue !== (app.notes || "")) {
                      onNotesChange(app.id, notesValue);
                    }
                  }}
                  className="text-xs mt-0.5 min-h-[60px]"
                  autoFocus
                  data-testid={`textarea-notes-${app.id}`}
                />
              ) : (
                <p
                  className="text-xs text-muted-foreground mt-0.5 cursor-pointer hover:text-foreground min-h-[24px] py-1"
                  onClick={() => setEditingNotes(true)}
                  data-testid={`text-notes-${app.id}`}
                >
                  {app.notes || "Click to add notes..."}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              {app.job?.applyUrl && (
                <a href={app.job.applyUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-xs gap-1" data-testid={`button-view-listing-${app.id}`}>
                    <ExternalLink className="h-3 w-3" />
                    View Listing
                  </Button>
                </a>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-destructive"
                onClick={() => onDelete(app.id)}
                data-testid={`button-delete-app-${app.id}`}
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Pipeline() {
  usePageTitle("My Pipeline");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const { data: applications = [], isLoading } = useQuery<JobApplicationWithJob[]>({
    queryKey: ["/api/applications"],
    enabled: isAuthenticated,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PATCH", `/api/applications/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
    onError: () => {
      toast({ title: "Failed to update", description: "Please try again.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/applications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      setDeleteTarget(null);
      toast({ title: "Removed from pipeline" });
    },
    onError: () => {
      toast({ title: "Failed to remove", description: "Please try again.", variant: "destructive" });
    },
  });

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({ id, data: { status } });
  };

  const handleNotesChange = (id: number, notes: string) => {
    updateMutation.mutate({ id, data: { notes } });
  };

  const grouped = STATUSES.reduce((acc, status) => {
    acc[status] = applications.filter(a => (a.status || "applied") === status);
    return acc;
  }, {} as Record<AppStatus, JobApplicationWithJob[]>);

  const stats = STATUSES.map(s => `${grouped[s].length} ${STATUS_CONFIG[s].label}`).join(" · ");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <Container className="py-6 sm:py-8">
          <div className="flex items-center gap-3 mb-1">
            <Kanban className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl sm:text-2xl font-serif font-medium text-foreground tracking-tight" data-testid="text-pipeline-title">
              My Pipeline
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6" data-testid="text-pipeline-stats">
            {applications.length > 0 ? stats : "Track your job applications from apply to offer."}
          </p>

          {isLoading || authLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STATUSES.map(s => (
                <div key={s} className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <Card data-testid="card-pipeline-empty">
              <CardContent className="p-8 text-center">
                <Kanban className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-medium text-foreground mb-1">No applications tracked yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  Apply to jobs and they'll appear here automatically. You can also manually track applications from any job detail page.
                </p>
                <Link href="/jobs">
                  <Button data-testid="button-browse-jobs">Browse Jobs</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-pipeline-columns">
              {STATUSES.map(status => {
                const config = STATUS_CONFIG[status];
                const Icon = config.icon;
                const items = grouped[status];
                return (
                  <div key={status} className="space-y-2">
                    <div className={`flex items-center gap-2 pb-2 border-b-2 ${config.headerColor}`}>
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{config.label}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px]" data-testid={`badge-count-${status}`}>
                        {items.length}
                      </Badge>
                    </div>
                    <div className="space-y-2 min-h-[80px]">
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground/50 text-center py-4">
                          No applications
                        </p>
                      ) : (
                        items.map(app => (
                          <ApplicationCard
                            key={app.id}
                            app={app}
                            onStatusChange={handleStatusChange}
                            onNotesChange={handleNotesChange}
                            onDelete={setDeleteTarget}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Container>
      </main>
      <Footer />

      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Pipeline</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this application from your pipeline? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget !== null && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
