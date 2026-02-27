import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { RefreshCw, Loader2, Play, Square, CheckCircle, XCircle, AlertTriangle, Activity, Zap, Bell, LinkIcon, Database, Timer, TrendingUp, ChevronDown, ChevronUp, Shield, Filter } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { apiRequest, queryClient, invalidateJobRelatedQueries } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScrapeRun, ScrapeRunSource, JobRejection } from "@shared/schema";

function formatDuration(ms: number | null): string {
  if (!ms) return '--';
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-emerald-600" data-testid="badge-status-completed"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
    case 'completed_with_errors':
      return <Badge variant="default" className="bg-amber-600" data-testid="badge-status-errors"><AlertTriangle className="w-3 h-3 mr-1" />Completed with errors</Badge>;
    case 'running':
      return <Badge variant="default" className="bg-blue-600" data-testid="badge-status-running"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
    case 'failed':
      return <Badge variant="destructive" data-testid="badge-status-failed"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function SourceStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <Badge variant="default" className="bg-emerald-600 text-[10px] px-1.5 py-0"><CheckCircle className="w-2.5 h-2.5 mr-0.5" />OK</Badge>;
    case 'failed':
      return <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><XCircle className="w-2.5 h-2.5 mr-0.5" />Failed</Badge>;
    case 'circuit_broken':
      return <Badge variant="default" className="bg-amber-600 text-[10px] px-1.5 py-0"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Circuit</Badge>;
    case 'skipped':
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Skipped</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{status}</Badge>;
  }
}

function SuccessRateBar({ rate }: { rate: number }) {
  const color = rate >= 90 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`text-xs font-medium ${rate >= 90 ? 'text-emerald-600' : rate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
        {rate}%
      </span>
    </div>
  );
}

function RunSourcesDetail({ runId }: { runId: number }) {
  const { data: sources = [], isLoading } = useQuery<ScrapeRunSource[]>({
    queryKey: ['/api/admin/scraper/runs', runId, 'sources'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/scraper/runs/${runId}/sources`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  if (isLoading) return <div className="py-2 text-center"><Loader2 className="w-4 h-4 animate-spin inline" /></div>;
  if (sources.length === 0) return <p className="text-xs text-muted-foreground py-2">No per-source data for this run.</p>;

  const failed = sources.filter(s => s.status !== 'success');
  const successful = sources.filter(s => s.status === 'success' && (s.jobsFound || 0) > 0);

  return (
    <div className="mt-3 space-y-2">
      {failed.length > 0 && (
        <div className="p-2 bg-destructive/10 rounded-md">
          <p className="text-xs font-medium text-destructive mb-1">Failed / Circuit Broken ({failed.length})</p>
          <div className="space-y-1">
            {failed.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <SourceStatusBadge status={s.status} />
                  <span className="text-xs">{s.sourceName}</span>
                  <span className="text-[10px] text-muted-foreground">({s.sourceType})</span>
                </div>
                {s.errorMessage && <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{s.errorMessage}</span>}
              </div>
            ))}
            {failed.length > 10 && <p className="text-[10px] text-muted-foreground">...and {failed.length - 10} more</p>}
          </div>
        </div>
      )}
      {successful.length > 0 && (
        <div className="p-2 bg-emerald-500/10 rounded-md">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Sources with Jobs ({successful.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
            {successful.slice(0, 16).map((s) => (
              <div key={s.id} className="text-xs flex items-center gap-1">
                <span className="font-medium">{s.sourceName}</span>
                <span className="text-muted-foreground">({s.jobsFiltered || 0})</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        {sources.length} sources total: {sources.filter(s => s.status === 'success').length} succeeded, {failed.length} failed/blocked
      </p>
    </div>
  );
}

type TabId = 'overview' | 'source-health' | 'rejections';

export default function AdminScraper() {
  usePageTitle("Scraper Dashboard");
  const { toast } = useToast();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
  const [rejectionFilter, setRejectionFilter] = useState<string>('all');

  const { data: monitoring } = useQuery<{
    scheduler: { running: boolean; nextRun: string };
    jobs: { total: number; bySource: Record<string, number> };
    logs: { files: string[]; recent: any[] };
  }>({
    queryKey: ['/api/admin/monitoring'],
    refetchInterval: 15000,
    enabled: isAdmin,
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery<ScrapeRun[]>({
    queryKey: ['/api/admin/scraper/runs'],
    refetchInterval: 10000,
    enabled: isAdmin,
  });

  const { data: sourceHealth = [], isLoading: healthLoading } = useQuery<{
    sourceName: string; sourceType: string; totalRuns: number;
    successes: number; failures: number; successRate: number; lastError: string | null;
  }[]>({
    queryKey: ['/api/admin/scraper/source-health'],
    enabled: isAdmin && activeTab === 'source-health',
  });

  const { data: rejectionReasons = [] } = useQuery<{
    reasonCode: string; phase: string; count: number;
  }[]>({
    queryKey: ['/api/admin/scraper/rejection-reasons'],
    enabled: isAdmin && activeTab === 'rejections',
  });

  const { data: recentRejections = [] } = useQuery<JobRejection[]>({
    queryKey: ['/api/admin/scraper/rejections'],
    enabled: isAdmin && activeTab === 'rejections',
  });

  const schedulerAction = useMutation({
    mutationFn: async (action: string) => {
      const res = await apiRequest('POST', `/api/admin/scheduler/${action}`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message });
      invalidateJobRelatedQueries();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/scraper/runs'] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-muted-foreground">Admin access required.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latestRun = runs[0];
  const completedRuns = runs.filter(r => r.status !== 'running');
  const totalJobsInserted = completedRuns.reduce((sum, r) => sum + (r.inserted || 0), 0);
  const totalCategorized = completedRuns.reduce((sum, r) => sum + (r.categorized || 0), 0);
  const totalAlerts = completedRuns.reduce((sum, r) => sum + (r.alertsTriggered || 0), 0);
  const successRate = completedRuns.length > 0
    ? Math.round((completedRuns.filter(r => r.status === 'completed').length / completedRuns.length) * 100)
    : 0;
  const avgDuration = completedRuns.length > 0
    ? Math.round(completedRuns.reduce((sum, r) => sum + (r.durationMs || 0), 0) / completedRuns.length)
    : 0;

  const totalRejections = rejectionReasons.reduce((sum, r) => sum + r.count, 0);
  const filteredRejections = rejectionFilter === 'all'
    ? recentRejections
    : recentRejections.filter(r => r.phase === rejectionFilter);

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'source-health', label: 'Source Health', icon: Shield },
    { id: 'rejections', label: 'Rejections', icon: XCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Scraper Autopilot" />
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/admin/monitoring'] });
                queryClient.invalidateQueries({ queryKey: ['/api/admin/scraper/runs'] });
                queryClient.invalidateQueries({ queryKey: ['/api/admin/scraper/source-health'] });
                queryClient.invalidateQueries({ queryKey: ['/api/admin/scraper/rejection-reasons'] });
                queryClient.invalidateQueries({ queryKey: ['/api/admin/scraper/rejections'] });
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            {monitoring?.scheduler?.running ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => schedulerAction.mutate('stop')}
                disabled={schedulerAction.isPending}
                data-testid="button-stop-scheduler"
              >
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => schedulerAction.mutate('start')}
                disabled={schedulerAction.isPending}
                data-testid="button-start-scheduler"
              >
                <Play className="w-4 h-4 mr-1" />
                Start
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => schedulerAction.mutate('run-now')}
              disabled={schedulerAction.isPending || latestRun?.status === 'running'}
              data-testid="button-run-now"
            >
              <Zap className="w-4 h-4 mr-1" />
              Run Now
            </Button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card data-testid="card-scheduler-status">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Scheduler</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${monitoring?.scheduler?.running ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                    <span className="text-sm font-semibold" data-testid="text-scheduler-status">
                      {monitoring?.scheduler?.running ? 'Active' : 'Stopped'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {monitoring?.scheduler?.running ? 'Runs every 12h' : 'Not scheduled'}
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-success-rate">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Success Rate</span>
                  </div>
                  <span className="text-lg font-bold" data-testid="text-success-rate">{successRate}%</span>
                  <p className="text-xs text-muted-foreground">{completedRuns.length} runs tracked</p>
                </CardContent>
              </Card>

              <Card data-testid="card-avg-duration">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Avg Duration</span>
                  </div>
                  <span className="text-lg font-bold" data-testid="text-avg-duration">{formatDuration(avgDuration)}</span>
                  <p className="text-xs text-muted-foreground">per scrape run</p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-jobs">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Active Jobs</span>
                  </div>
                  <span className="text-lg font-bold" data-testid="text-active-jobs">{monitoring?.jobs?.total || 0}</span>
                  <p className="text-xs text-muted-foreground">{totalJobsInserted} inserted total</p>
                </CardContent>
              </Card>
            </div>

            {latestRun && (
              <Card data-testid="card-latest-run">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">Latest Run</CardTitle>
                    <StatusBadge status={latestRun.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Started</p>
                      <p className="text-sm font-medium" data-testid="text-latest-started">{formatTimeAgo(latestRun.startedAt as any)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-sm font-medium" data-testid="text-latest-duration">{formatDuration(latestRun.durationMs)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Found</p>
                      <p className="text-sm font-medium" data-testid="text-latest-found">{latestRun.totalFound || 0} jobs</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">New</p>
                      <p className="text-sm font-medium text-emerald-600" data-testid="text-latest-new">{latestRun.inserted || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Updated</p>
                      <p className="text-sm font-medium" data-testid="text-latest-updated">{latestRun.updated || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">AI Categorized</p>
                      <p className="text-sm font-medium text-blue-600" data-testid="text-latest-categorized">{latestRun.categorized || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Alerts Sent</p>
                      <p className="text-sm font-medium text-purple-600" data-testid="text-latest-alerts">{latestRun.alertsTriggered || 0}</p>
                    </div>
                  </div>

                  {latestRun.errors && (latestRun.errors as string[]).length > 0 && (
                    <div className="mt-3 p-2 bg-destructive/10 rounded-md">
                      <p className="text-xs font-medium text-destructive mb-1">Errors ({(latestRun.errors as string[]).length}):</p>
                      {(latestRun.errors as string[]).slice(0, 5).map((err, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{err}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card data-testid="card-pipeline-phases">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Autopilot Pipeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { num: 1, label: 'Scrape Sources', desc: 'Multi-ATS APIs with auto-retry', color: 'blue' },
                    { num: 2, label: 'Smart Upsert', desc: 'Preserves AI data, rejects bad updates', color: 'emerald' },
                    { num: 3, label: 'Stale Detection', desc: 'Deactivates removed jobs (per-source safety)', color: 'amber' },
                    { num: 4, label: 'AI Categorization', desc: 'Auto-classify new jobs with OpenAI', color: 'purple' },
                    { num: 5, label: 'Alert Matching', desc: 'Notify users about matching new jobs', color: 'pink' },
                    { num: 6, label: 'Link Validation', desc: 'Check apply links still work', color: 'emerald' },
                  ].map(step => (
                    <div key={step.num} className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-${step.color}-100 dark:bg-${step.color}-900/30 text-${step.color}-600 text-xs font-bold`}>{step.num}</div>
                      <div>
                        <p className="text-sm font-medium">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card data-testid="card-source-breakdown">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  {monitoring?.jobs?.bySource ? (
                    <div className="space-y-2">
                      {Object.entries(monitoring.jobs.bySource)
                        .sort(([, a], [, b]) => b - a)
                        .map(([source, count]) => (
                          <div key={source} className="flex items-center justify-between" data-testid={`source-${source}`}>
                            <span className="text-sm capitalize">{source}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No source data available</p>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-cumulative-stats">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Cumulative Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm">Jobs Discovered</span>
                    </div>
                    <span className="text-sm font-semibold" data-testid="text-cumulative-inserted">{totalJobsInserted}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">AI Categorized</span>
                    </div>
                    <span className="text-sm font-semibold" data-testid="text-cumulative-categorized">{totalCategorized}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">Alerts Triggered</span>
                    </div>
                    <span className="text-sm font-semibold" data-testid="text-cumulative-alerts">{totalAlerts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-amber-500" />
                      <span className="text-sm">Broken Links Found</span>
                    </div>
                    <span className="text-sm font-semibold" data-testid="text-cumulative-broken">
                      {completedRuns.reduce((sum, r) => sum + (r.brokenLinks || 0), 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-run-history">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Run History</CardTitle>
              </CardHeader>
              <CardContent>
                {runsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : runs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No scrape runs yet. Click "Run Now" to start your first autopilot scrape.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-1">
                      <div className="grid grid-cols-9 gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b">
                        <span>Time</span>
                        <span>Status</span>
                        <span>Duration</span>
                        <span>Found</span>
                        <span>New</span>
                        <span>Updated</span>
                        <span>Sources</span>
                        <span>Alerts</span>
                        <span></span>
                      </div>
                      {runs.map((run) => (
                        <div key={run.id}>
                          <div
                            className="grid grid-cols-9 gap-2 px-2 py-2 text-sm border-b border-border/50 hover:bg-muted/50 rounded cursor-pointer"
                            onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                            data-testid={`row-run-${run.id}`}
                          >
                            <span className="text-xs" title={new Date(run.startedAt).toLocaleString()}>
                              {formatTimeAgo(run.startedAt as any)}
                            </span>
                            <span><StatusBadge status={run.status} /></span>
                            <span className="text-xs">{formatDuration(run.durationMs)}</span>
                            <span className="text-xs">{run.totalFound || 0}</span>
                            <span className="text-xs font-medium text-emerald-600">{run.inserted || 0}</span>
                            <span className="text-xs">{run.updated || 0}</span>
                            <span className="text-xs">
                              <span className="text-emerald-600">{run.sourcesSucceeded || 0}</span>
                              {(run.sourcesFailed || 0) > 0 && <span className="text-red-500 ml-1">/ {run.sourcesFailed}</span>}
                            </span>
                            <span className="text-xs text-purple-600">{run.alertsTriggered || 0}</span>
                            <span className="text-xs">
                              {expandedRunId === run.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </span>
                          </div>
                          {expandedRunId === run.id && (
                            <div className="px-2 pb-2">
                              <RunSourcesDetail runId={run.id} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'source-health' && (
          <>
            <Card data-testid="card-source-health">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Source Health (Last 30 Runs)</CardTitle>
                  <Badge variant="secondary" data-testid="badge-source-count">{sourceHealth.length} sources</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {healthLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : sourceHealth.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No source health data yet. Run a scrape to start tracking.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-0">
                      <div className="grid grid-cols-7 gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground border-b sticky top-0 bg-background">
                        <span className="col-span-2">Source</span>
                        <span>ATS Type</span>
                        <span>Runs</span>
                        <span>Success</span>
                        <span>Rate</span>
                        <span>Last Error</span>
                      </div>
                      {sourceHealth.map((source, i) => (
                        <div
                          key={`${source.sourceName}-${source.sourceType}`}
                          className={`grid grid-cols-7 gap-2 px-2 py-2 text-sm border-b border-border/30 ${
                            source.successRate < 70 ? 'bg-red-50 dark:bg-red-950/20' :
                            source.successRate < 90 ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                          }`}
                          data-testid={`row-source-health-${i}`}
                        >
                          <span className="text-xs font-medium col-span-2 truncate" title={source.sourceName}>{source.sourceName}</span>
                          <span className="text-xs"><Badge variant="outline" className="text-[10px] px-1 py-0">{source.sourceType}</Badge></span>
                          <span className="text-xs">{source.totalRuns}</span>
                          <span className="text-xs">
                            <span className="text-emerald-600">{source.successes}</span>
                            {source.failures > 0 && <span className="text-red-500 ml-0.5">/ {source.failures}</span>}
                          </span>
                          <span><SuccessRateBar rate={source.successRate} /></span>
                          <span className="text-[10px] text-muted-foreground truncate" title={source.lastError || undefined}>
                            {source.lastError?.substring(0, 40) || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card data-testid="card-health-summary-good">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground font-medium">Healthy (90%+)</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-600" data-testid="text-healthy-count">
                    {sourceHealth.filter(s => s.successRate >= 90).length}
                  </span>
                  <p className="text-xs text-muted-foreground">sources</p>
                </CardContent>
              </Card>
              <Card data-testid="card-health-summary-warn">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground font-medium">Warning (70-89%)</span>
                  </div>
                  <span className="text-lg font-bold text-amber-600" data-testid="text-warning-count">
                    {sourceHealth.filter(s => s.successRate >= 70 && s.successRate < 90).length}
                  </span>
                  <p className="text-xs text-muted-foreground">sources</p>
                </CardContent>
              </Card>
              <Card data-testid="card-health-summary-critical">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-muted-foreground font-medium">Critical (&lt;70%)</span>
                  </div>
                  <span className="text-lg font-bold text-red-600" data-testid="text-critical-count">
                    {sourceHealth.filter(s => s.successRate < 70).length}
                  </span>
                  <p className="text-xs text-muted-foreground">sources</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeTab === 'rejections' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card data-testid="card-top-reasons">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Top Rejection Reasons (7 days)</CardTitle>
                    <Badge variant="secondary" data-testid="badge-total-rejections">{totalRejections} total</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {rejectionReasons.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No rejections recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {rejectionReasons.slice(0, 15).map((reason, i) => {
                        const pct = totalRejections > 0 ? Math.round((reason.count / totalRejections) * 100) : 0;
                        return (
                          <div key={`${reason.reasonCode}-${reason.phase}`} data-testid={`row-reason-${i}`}>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-medium">{reason.reasonCode}</span>
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{reason.phase}</Badge>
                              </div>
                              <span className="text-xs font-medium">{reason.count}</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/60"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-phase-breakdown">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">By Phase</CardTitle>
                </CardHeader>
                <CardContent>
                  {rejectionReasons.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No data available.</p>
                  ) : (
                    <div className="space-y-3">
                      {['validation', 'enrichment', 'qa', 'scrape'].map(phase => {
                        const phaseCount = rejectionReasons
                          .filter(r => r.phase === phase)
                          .reduce((sum, r) => sum + r.count, 0);
                        if (phaseCount === 0) return null;
                        const phasePct = totalRejections > 0 ? Math.round((phaseCount / totalRejections) * 100) : 0;
                        const phaseReasons = rejectionReasons.filter(r => r.phase === phase);
                        return (
                          <div key={phase} data-testid={`phase-${phase}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium capitalize">{phase}</span>
                              <span className="text-xs text-muted-foreground">{phaseCount} ({phasePct}%)</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-1.5">
                              <div
                                className={`h-full rounded-full ${
                                  phase === 'validation' ? 'bg-amber-500' :
                                  phase === 'enrichment' ? 'bg-purple-500' :
                                  phase === 'qa' ? 'bg-blue-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${phasePct}%` }}
                              />
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {phaseReasons.map(r => (
                                <Badge key={r.reasonCode} variant="outline" className="text-[10px] px-1 py-0">
                                  {r.reasonCode}: {r.count}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-recent-rejections">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">Recent Rejections</CardTitle>
                  <div className="flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    {['all', 'validation', 'enrichment', 'qa', 'scrape'].map(phase => (
                      <button
                        key={phase}
                        onClick={() => setRejectionFilter(phase)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                          rejectionFilter === phase
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                        data-testid={`filter-${phase}`}
                      >
                        {phase === 'all' ? 'All' : phase.charAt(0).toUpperCase() + phase.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredRejections.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No rejections found.</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-0">
                      <div className="grid grid-cols-6 gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground border-b sticky top-0 bg-background">
                        <span>Time</span>
                        <span>Source</span>
                        <span>Title</span>
                        <span>Company</span>
                        <span>Reason</span>
                        <span>Phase</span>
                      </div>
                      {filteredRejections.map((rej) => (
                        <div key={rej.id} className="grid grid-cols-6 gap-2 px-2 py-1.5 text-xs border-b border-border/30" data-testid={`row-rejection-${rej.id}`}>
                          <span className="text-muted-foreground" title={rej.createdAt ? new Date(rej.createdAt).toLocaleString() : ''}>
                            {formatTimeAgo(rej.createdAt as any)}
                          </span>
                          <span className="truncate" title={rej.sourceName || undefined}>{rej.sourceName || '—'}</span>
                          <span className="truncate" title={rej.title || undefined}>{rej.title || '—'}</span>
                          <span className="truncate" title={rej.company || undefined}>{rej.company || '—'}</span>
                          <span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">{rej.reasonCode}</Badge>
                          </span>
                          <span>
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">{rej.phase}</Badge>
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
