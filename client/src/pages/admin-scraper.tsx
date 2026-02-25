import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { RefreshCw, Loader2, Play, Square, Clock, CheckCircle, XCircle, AlertTriangle, Activity, Zap, Bell, LinkIcon, Database, Timer, TrendingUp } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { apiRequest, queryClient, invalidateJobRelatedQueries } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScrapeRun } from "@shared/schema";

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

export default function AdminScraper() {
  usePageTitle("Scraper Dashboard");
  const { toast } = useToast();
  const { user, isAdmin, isLoading: authLoading } = useAuth();

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

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Scraper Autopilot" />
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/admin/monitoring'] });
                queryClient.invalidateQueries({ queryKey: ['/api/admin/scraper/runs'] });
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
                Stop Scheduler
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
                Start Scheduler
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
                {monitoring?.scheduler?.running ? 'Runs every 24h' : 'Not scheduled'}
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
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-bold">1</div>
                <div>
                  <p className="text-sm font-medium">Scrape Sources</p>
                  <p className="text-xs text-muted-foreground">Greenhouse + Lever APIs with auto-retry</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-bold">2</div>
                <div>
                  <p className="text-sm font-medium">Smart Upsert</p>
                  <p className="text-xs text-muted-foreground">Preserves AI data, rejects bad updates</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-xs font-bold">3</div>
                <div>
                  <p className="text-sm font-medium">Stale Detection</p>
                  <p className="text-xs text-muted-foreground">Deactivates removed jobs (per-source safety)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 text-xs font-bold">4</div>
                <div>
                  <p className="text-sm font-medium">AI Categorization</p>
                  <p className="text-xs text-muted-foreground">Auto-classify new jobs with OpenAI</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 text-xs font-bold">5</div>
                <div>
                  <p className="text-sm font-medium">Alert Matching</p>
                  <p className="text-xs text-muted-foreground">Notify users about matching new jobs</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-bold">6</div>
                <div>
                  <p className="text-sm font-medium">Link Validation</p>
                  <p className="text-xs text-muted-foreground">Check apply links still work</p>
                </div>
              </div>
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
                    <span>Categorized</span>
                    <span>Alerts</span>
                    <span>Trigger</span>
                  </div>
                  {runs.map((run) => (
                    <div key={run.id} className="grid grid-cols-9 gap-2 px-2 py-2 text-sm border-b border-border/50 hover-elevate rounded" data-testid={`row-run-${run.id}`}>
                      <span className="text-xs" title={new Date(run.startedAt).toLocaleString()}>
                        {formatTimeAgo(run.startedAt as any)}
                      </span>
                      <span><StatusBadge status={run.status} /></span>
                      <span className="text-xs">{formatDuration(run.durationMs)}</span>
                      <span className="text-xs">{run.totalFound || 0}</span>
                      <span className="text-xs font-medium text-emerald-600">{run.inserted || 0}</span>
                      <span className="text-xs">{run.updated || 0}</span>
                      <span className="text-xs text-blue-600">{run.categorized || 0}</span>
                      <span className="text-xs text-purple-600">{run.alertsTriggered || 0}</span>
                      <span className="text-xs">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{run.triggeredBy || 'scheduler'}</Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}