import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Job, StructuredDescription } from "@shared/schema";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Layers,
  TrendingUp,
  Scale,
  Bot,
  Stethoscope,
  Copy,
  Check,
  X,
  Info,
} from "lucide-react";

interface QueueData {
  jobs: Job[];
  counts: {
    missing: number;
    generated: number;
    edited: number;
    approved: number;
    published: number;
    total: number;
  };
}

interface ValidationResult {
  valid: boolean;
  issues: string[];
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    missing: { label: "Missing", className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" },
    generated: { label: "Generated", className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" },
    edited: { label: "Edited", className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
    approved: { label: "Approved", className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
  };
  const v = variants[status] || variants.missing;
  return <Badge className={v.className}>{v.label}</Badge>;
}

function QualityChecklist({ sd }: { sd: StructuredDescription | null }) {
  if (!sd) return <p className="text-xs text-muted-foreground">No structured description to validate.</p>;
  const checks = [
    { label: "Summary present (max 350 chars)", pass: !!(sd.summary && sd.summary.trim().length > 0 && sd.summary.length <= 350) },
    { label: "About Company filled", pass: !!(sd.aboutCompany && sd.aboutCompany.trim().length > 0) },
    { label: "Responsibilities (4+ items)", pass: !!(sd.responsibilities && sd.responsibilities.length >= 4) },
    { label: "Min Qualifications (3+ items)", pass: !!(sd.minimumQualifications && sd.minimumQualifications.length >= 3) },
    { label: "Skills Required (6+ items)", pass: !!(sd.skillsRequired && sd.skillsRequired.length >= 6) },
    { label: "Seniority level set", pass: !!(sd.seniority && sd.seniority.trim().length > 0) },
    { label: "Legal Tech category set", pass: !!(sd.legalTechCategory && sd.legalTechCategory.trim().length > 0) },
  ];
  const passCount = checks.filter(c => c.pass).length;

  return (
    <div className="space-y-1.5" data-testid="quality-checklist">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-foreground">{passCount}/{checks.length} checks passed</span>
        {passCount === checks.length && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
      </div>
      {checks.map((c, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          {c.pass ? (
            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
          )}
          <span className={c.pass ? "text-muted-foreground" : "text-foreground"}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

interface DiagnosticsResult {
  jobId: number;
  publiclyVisible: boolean;
  reasons: string[];
  recommendedFixes: string[];
  checks: {
    exists: boolean;
    isPublished: boolean;
    isActive: boolean;
    status: string | null;
    expiresAt: string | null;
    isExpired: boolean;
    structuredDescriptionPresent: boolean;
    structuredDescriptionValid: boolean;
    structuredFieldsMissing: string[];
    source: string | null;
  };
  publicEndpointWouldReturn404: boolean;
  publicRule: string;
  now: string;
}

function DiagnosticsModal({ jobId, jobTitle, open, onClose }: { jobId: number; jobTitle: string; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery<DiagnosticsResult>({
    queryKey: ["/api/diagnostics/jobs", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/diagnostics/jobs/${jobId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch diagnostics");
      return res.json();
    },
    enabled: open,
  });

  const handleCopy = () => {
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      toast({ title: "Copied diagnostics JSON to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Job Diagnostics
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive py-4">Failed to load diagnostics.</p>
        )}

        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-medium truncate max-w-[280px]" data-testid="diagnostics-job-title">{jobTitle}</p>
                <p className="text-xs text-muted-foreground">ID: {data.jobId}</p>
              </div>
              {data.publiclyVisible ? (
                <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" data-testid="diagnostics-visibility-badge">
                  <Eye className="h-3 w-3 mr-1" /> Visible
                </Badge>
              ) : (
                <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" data-testid="diagnostics-visibility-badge">
                  <EyeOff className="h-3 w-3 mr-1" /> Not Visible
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Checks</h4>
                <div className="space-y-1" data-testid="diagnostics-checks">
                  {[
                    { label: "Exists in DB", pass: data.checks.exists },
                    { label: "Published", pass: data.checks.isPublished },
                    { label: "Active", pass: data.checks.isActive },
                    { label: "Structured Description Present", pass: data.checks.structuredDescriptionPresent },
                    { label: "Structured Description Valid", pass: data.checks.structuredDescriptionValid },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-2 text-xs">
                      {c.pass ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-red-500 shrink-0" />
                      )}
                      <span className={c.pass ? "text-muted-foreground" : "text-foreground"}>{c.label}</span>
                    </div>
                  ))}
                  {data.checks.status && (
                    <div className="flex items-center gap-2 text-xs">
                      <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Status: {data.checks.status}</span>
                    </div>
                  )}
                  {data.checks.source && (
                    <div className="flex items-center gap-2 text-xs">
                      <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Source: {data.checks.source}</span>
                    </div>
                  )}
                </div>
              </div>

              {data.checks.structuredFieldsMissing.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Missing Fields</h4>
                  <div className="space-y-0.5" data-testid="diagnostics-missing-fields">
                    {data.checks.structuredFieldsMissing.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.reasons.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Reasons Not Visible</h4>
                  <div className="space-y-0.5" data-testid="diagnostics-reasons">
                    {data.reasons.map((r, i) => (
                      <div key={i} className="text-xs font-mono bg-muted/50 rounded px-2 py-1">{r}</div>
                    ))}
                  </div>
                </div>
              )}

              {data.recommendedFixes.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Recommended Fixes</h4>
                  <div className="space-y-1" data-testid="diagnostics-fixes">
                    {data.recommendedFixes.map((f, i) => (
                      <div key={i} className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.reasons.length === 0 && (
                <p className="text-xs text-green-600 dark:text-green-400">This job passes all visibility checks.</p>
              )}

              <div className="pt-2 border-t border-border/30 flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[10px] text-muted-foreground font-mono">
                  Rule: {data.publicRule}
                </p>
                <Button size="sm" variant="outline" onClick={handleCopy} data-testid="button-copy-diagnostics">
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copied" : "Copy JSON"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function JobQueueRow({ job, onRefreshQueue }: { job: Job; onRefreshQueue: () => void }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const sd = job.structuredDescription as StructuredDescription | null;
  const status = (job.structuredStatus || "missing") as string;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/jobs/${job.id}/generate-structured`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Structured description generated", description: data.validation?.valid ? "All quality checks passed." : `${data.validation?.issues?.length || 0} quality issue(s) found.` });
      onRefreshQueue();
    },
    onError: () => toast({ title: "Generation failed", variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/jobs/${job.id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Job approved" });
      onRefreshQueue();
    },
    onError: (err: any) => toast({ title: "Cannot approve", description: err?.message || "Quality checks not met", variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/jobs/${job.id}/publish`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Job published" });
      onRefreshQueue();
    },
    onError: (err: any) => toast({ title: "Cannot publish", description: err?.message || "Must be approved first", variant: "destructive" }),
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/jobs/${job.id}/unpublish`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Job unpublished" });
      onRefreshQueue();
    },
    onError: () => toast({ title: "Failed to unpublish", variant: "destructive" }),
  });

  const anyPending = generateMutation.isPending || approveMutation.isPending || publishMutation.isPending || unpublishMutation.isPending;

  return (
    <div className="border border-border/50 rounded-md p-3" data-testid={`queue-job-${job.id}`}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate max-w-[300px]" data-testid={`text-queue-title-${job.id}`}>{job.title}</span>
            <StatusBadge status={status} />
            {job.isPublished && <Badge variant="outline" className="text-[10px]">Published</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{job.company} {job.location ? `\u2022 ${job.location}` : ""}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {status === "missing" && (
            <Button size="sm" onClick={() => generateMutation.mutate()} disabled={anyPending} data-testid={`button-generate-${job.id}`}>
              {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              Generate
            </Button>
          )}
          {(status === "generated" || status === "edited") && (
            <>
              <Button size="sm" variant="outline" onClick={() => generateMutation.mutate()} disabled={anyPending} data-testid={`button-regenerate-${job.id}`}>
                {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                Regenerate
              </Button>
              <Button size="sm" onClick={() => approveMutation.mutate()} disabled={anyPending} data-testid={`button-approve-${job.id}`}>
                {approveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Approve
              </Button>
            </>
          )}
          {status === "approved" && !job.isPublished && (
            <Button size="sm" onClick={() => publishMutation.mutate()} disabled={anyPending} data-testid={`button-publish-${job.id}`}>
              {publishMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
              Publish
            </Button>
          )}
          {job.isPublished && (
            <Button size="sm" variant="outline" onClick={() => unpublishMutation.mutate()} disabled={anyPending} data-testid={`button-unpublish-${job.id}`}>
              {unpublishMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />}
              Unpublish
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => setShowDiagnostics(true)} data-testid={`button-diagnose-${job.id}`}>
            <Stethoscope className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setExpanded(!expanded)} data-testid={`button-expand-${job.id}`}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <DiagnosticsModal jobId={job.id} jobTitle={job.title} open={showDiagnostics} onClose={() => setShowDiagnostics(false)} />

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quality Checklist</h4>
              <QualityChecklist sd={sd} />
            </div>
            {sd && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Preview</h4>
                {sd.summary && <p className="text-xs italic text-muted-foreground">{sd.summary}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {sd.seniority && (
                    <Badge variant="secondary" className="text-[10px]">
                      <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                      {sd.seniority}
                    </Badge>
                  )}
                  {sd.legalTechCategory && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Layers className="h-2.5 w-2.5 mr-0.5" />
                      {sd.legalTechCategory}
                    </Badge>
                  )}
                  {sd.aiRelevanceScore && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Bot className="h-2.5 w-2.5 mr-0.5" />
                      AI: {sd.aiRelevanceScore}
                    </Badge>
                  )}
                  {sd.lawyerTransitionFriendly && (
                    <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-700 dark:text-green-400">
                      <Scale className="h-2.5 w-2.5 mr-0.5" />
                      Lawyer-Friendly
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>{sd.responsibilities?.length || 0} responsibilities, {sd.minimumQualifications?.length || 0} min quals, {sd.preferredQualifications?.length || 0} preferred, {sd.skillsRequired?.length || 0} skills</p>
                  {sd.lawyerTransitionNotes && sd.lawyerTransitionNotes.length > 0 && (
                    <p>{sd.lawyerTransitionNotes.length} transition notes</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminStandardizationQueue() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, refetch } = useQuery<QueueData>({
    queryKey: ["/api/admin/standardization-queue", statusFilter !== "all" ? statusFilter : undefined],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/standardization-queue${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch queue");
      return res.json();
    },
  });

  const bulkPublishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/jobs/bulk-publish");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Bulk publish complete", description: `${data.published} jobs published` });
      refetch();
    },
    onError: () => toast({ title: "Bulk publish failed", variant: "destructive" }),
  });

  const counts = data?.counts || { missing: 0, generated: 0, edited: 0, approved: 0, published: 0, total: 0 };
  const jobs = data?.jobs || [];

  const filteredJobs = statusFilter === "all"
    ? jobs
    : statusFilter === "published"
      ? jobs.filter(j => j.isPublished)
      : jobs.filter(j => (j.structuredStatus || "missing") === statusFilter);

  return (
    <Card data-testid="card-standardization-queue">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Standardization Queue
          </CardTitle>
          <CardDescription>
            Generate, review, and approve structured job descriptions before publishing.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {counts.approved > 0 && (
            <Button
              size="sm"
              onClick={() => bulkPublishMutation.mutate()}
              disabled={bulkPublishMutation.isPending}
              data-testid="button-bulk-publish"
            >
              {bulkPublishMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
              Publish All Approved
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4" data-testid="status-counters">
          {[
            { key: "all", label: "All", count: counts.total },
            { key: "missing", label: "Missing", count: counts.missing },
            { key: "generated", label: "Generated", count: counts.generated },
            { key: "edited", label: "Edited", count: counts.edited },
            { key: "approved", label: "Approved", count: counts.approved },
            { key: "published", label: "Published", count: counts.published },
          ].map(({ key, label, count }) => (
            <Button
              key={key}
              size="sm"
              variant={statusFilter === key ? "default" : "outline"}
              onClick={() => setStatusFilter(key)}
              className="gap-1.5"
              data-testid={`button-filter-${key}`}
            >
              {label}
              <Badge variant="secondary" className="text-[10px] ml-0.5">{count}</Badge>
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No jobs match this filter.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1" data-testid="queue-jobs-list">
            {filteredJobs.map(job => (
              <JobQueueRow key={job.id} job={job} onRefreshQueue={refetch} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
