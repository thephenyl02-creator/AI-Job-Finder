import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AdminHeader } from "@/components/admin-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { Flag, CheckCircle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface JobReport {
  id: number;
  jobId: number;
  reporterUserId: string | null;
  reportType: string;
  details: string | null;
  createdAt: string;
  status: string;
  adminNotes: string | null;
  resolvedAt: string | null;
  jobTitle?: string;
  jobCompany?: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  broken_link: "Broken Link",
  duplicate: "Duplicate",
  wrong_category: "Wrong Category",
  outdated: "Outdated",
  spam: "Spam",
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "resolved", label: "Resolved" },
];

function getStatusBadgeVariant(status: string): "destructive" | "outline" | "secondary" {
  switch (status) {
    case "new": return "destructive";
    case "reviewed": return "outline";
    case "resolved": return "secondary";
    default: return "outline";
  }
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ReportRow({ report }: { report: JobReport }) {
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState(report.status);
  const [adminNotes, setAdminNotes] = useState(report.adminNotes || "");
  const [expanded, setExpanded] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/reports/${id}`, { status, adminNotes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string).startsWith("/api/admin/reports") });
      toast({ title: "Report updated" });
      setExpanded(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update report", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card data-testid={`report-row-${report.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Flag className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs" data-testid={`badge-report-type-${report.id}`}>
                  {REPORT_TYPE_LABELS[report.reportType] || report.reportType}
                </Badge>
                <Badge variant={getStatusBadgeVariant(report.status)} className="text-xs" data-testid={`badge-status-${report.id}`}>
                  {report.status}
                </Badge>
              </div>
              <p className="text-sm font-medium mt-1" data-testid={`text-job-title-${report.id}`}>
                {report.jobTitle || `Job #${report.jobId}`}
              </p>
              <p className="text-xs text-muted-foreground" data-testid={`text-company-${report.id}`}>
                {report.jobCompany || "Unknown company"}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground" data-testid={`text-reported-at-${report.id}`}>
              {formatDate(report.createdAt)}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-toggle-${report.id}`}
            >
              {expanded ? "Collapse" : "Manage"}
            </Button>
          </div>
        </div>

        {report.details && (
          <p className="text-sm text-foreground/80 pl-6" data-testid={`text-details-${report.id}`}>
            {report.details}
          </p>
        )}

        {expanded && (
          <div className="pl-6 space-y-3 border-t pt-3" data-testid={`form-update-${report.id}`}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-40">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger data-testid={`select-status-${report.id}`}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Admin notes..."
              className="text-sm"
              rows={2}
              data-testid={`textarea-notes-${report.id}`}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => updateMutation.mutate({ id: report.id, status: newStatus, adminNotes })}
                disabled={updateMutation.isPending}
                data-testid={`button-save-${report.id}`}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(false)}
                data-testid={`button-cancel-${report.id}`}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminReportsPage() {
  usePageTitle("Admin Reports");
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");

  const queryUrl = statusFilter === "all"
    ? "/api/admin/reports"
    : `/api/admin/reports?status=${statusFilter}`;

  const { data: reports, isLoading: loadingReports } = useQuery<JobReport[]>({
    queryKey: ["/api/admin/reports", statusFilter],
    queryFn: async () => {
      const res = await fetch(queryUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: allReports } = useQuery<JobReport[]>({
    queryKey: ["/api/admin/reports", "all"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reports", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    enabled: isAdmin,
  });

  const countByStatus = (status: string) => {
    if (!allReports) return 0;
    if (status === "all") return allReports.length;
    return allReports.filter((r) => r.status === status).length;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold" data-testid="text-access-denied">Access Denied</h2>
              <p className="text-muted-foreground">Admin access required.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Job Reports" />
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-end gap-4 flex-wrap">
            <Link href="/admin">
              <Button variant="outline" size="sm" data-testid="link-back-admin">
                Back to Admin
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 flex-wrap" data-testid="filter-tabs">
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
                data-testid={`filter-${filter.value}`}
              >
                {filter.label}
                <Badge
                  variant={statusFilter === filter.value ? "secondary" : "outline"}
                  className="ml-1.5 text-xs"
                >
                  {countByStatus(filter.value)}
                </Badge>
              </Button>
            ))}
          </div>

          {loadingReports ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports && reports.length > 0 ? (
            <div className="space-y-3" data-testid="reports-list">
              {reports.map((report) => (
                <ReportRow key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Flag className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground" data-testid="text-no-reports">
                  No reports found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}