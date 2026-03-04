import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AdminHeader } from "@/components/admin-header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, Loader2, CheckCircle, AlertTriangle,
  XCircle, Link2, FileText, Play, Ban, Globe, Database, Radar, Shield,
} from "lucide-react";

interface FirmSource {
  id: number;
  firmName: string;
  careerUrl: string;
  discoveredPortalUrl: string | null;
  atsType: string;
  fetchMode: string;
  status: string;
  atsConfig: Record<string, string> | null;
  lastSuccessAt: string | null;
  lastErrorMessage: string | null;
  jobCount: number;
  createdAt: string;
}

interface ParsedJob {
  title: string;
  company: string;
  location: string;
  applyUrl: string;
  department?: string;
}

interface AutoDetectResult {
  scanned: number;
  detected: { name: string; careerUrl: string; type: string; atsType: string; config: Record<string, string>; confidence: number; evidence: string; scrapeSupported: boolean; jobCount: number; validated: boolean }[];
  blocked: { name: string; careerUrl: string; reason: string }[];
  noAts: { name: string; careerUrl: string }[];
  errors: { name: string; careerUrl: string; error: string }[];
  summary: { detected: number; blocked: number; noAts: number; errors: number };
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge variant="default" className="bg-emerald-600" data-testid="badge-status-active"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    case "needs_review":
      return <Badge variant="default" className="bg-amber-600" data-testid="badge-status-review"><AlertTriangle className="w-3 h-3 mr-1" />Needs Setup</Badge>;
    case "classification_only":
      return <Badge variant="secondary" data-testid="badge-status-classification"><Ban className="w-3 h-3 mr-1" />Classification Only</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function ATSBadge({ atsType }: { atsType: string }) {
  const colors: Record<string, string> = {
    greenhouse: "bg-green-600",
    lever: "bg-blue-600",
    workday: "bg-orange-600",
    icims: "bg-purple-600",
    ashby: "bg-indigo-600",
    smartrecruiters: "bg-cyan-600",
    bamboohr: "bg-lime-700",
    rippling: "bg-pink-600",
    workable: "bg-teal-600",
    ultipro: "bg-amber-700",
    virecruit: "bg-rose-700",
    jobvite: "bg-violet-600",
    taleo: "bg-sky-700",
    personio: "bg-fuchsia-600",
    teamtailor: "bg-emerald-700",
    manual: "bg-slate-600",
    unknown: "bg-gray-500",
  };
  return <Badge variant="default" className={colors[atsType] || "bg-gray-500"} data-testid={`badge-ats-${atsType}`}>{atsType}</Badge>;
}

function FetchModeBadge({ mode }: { mode: string }) {
  switch (mode) {
    case "ats_api":
      return <Badge variant="outline" className="text-emerald-700 border-emerald-300" data-testid="badge-mode-api"><Database className="w-3 h-3 mr-1" />API</Badge>;
    case "manual_html":
      return <Badge variant="outline" className="text-blue-700 border-blue-300" data-testid="badge-mode-manual"><FileText className="w-3 h-3 mr-1" />Manual</Badge>;
    case "needs_setup":
      return <Badge variant="outline" className="text-amber-700 border-amber-300" data-testid="badge-mode-setup"><AlertTriangle className="w-3 h-3 mr-1" />Setup</Badge>;
    default:
      return <Badge variant="outline">{mode}</Badge>;
  }
}

export default function AdminSources() {
  usePageTitle("Firm Sources");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [discoverModal, setDiscoverModal] = useState<FirmSource | null>(null);
  const [htmlModal, setHtmlModal] = useState<FirmSource | null>(null);
  const [portalUrl, setPortalUrl] = useState("");
  const [pastedHtml, setPastedHtml] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsedJob[] | null>(null);
  const [autoDetectResults, setAutoDetectResults] = useState<AutoDetectResult | null>(null);
  const [showAutoDetectModal, setShowAutoDetectModal] = useState(false);

  const { data: sources = [], isLoading } = useQuery<FirmSource[]>({
    queryKey: ["/api/admin/sources"],
  });

  const autoDetectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/sources/auto-detect");
      return res.json() as Promise<AutoDetectResult>;
    },
    onSuccess: (data) => {
      setAutoDetectResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sources"] });
      toast({
        title: "Scan Complete",
        description: `Scanned ${data.scanned} companies: ${data.summary.detected} detected, ${data.summary.blocked} blocked, ${data.summary.errors} errors`,
      });
    },
    onError: () => toast({ title: "Auto-Detect Failed", variant: "destructive" }),
  });

  const discoverMutation = useMutation({
    mutationFn: async ({ id, url }: { id: number; url: string }) => {
      const res = await apiRequest("POST", `/api/admin/sources/${id}/discover`, { url });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sources"] });
      if (data.atsType !== "unknown") {
        toast({ title: "ATS Detected", description: `Found ${data.atsType} with ${data.validation?.jobCount ?? 0} jobs` });
      } else {
        toast({ title: "No ATS Detected", description: "Set to manual HTML import mode", variant: "destructive" });
      }
      setDiscoverModal(null);
      setPortalUrl("");
    },
    onError: () => toast({ title: "Discovery Failed", variant: "destructive" }),
  });

  const parseHtmlMutation = useMutation({
    mutationFn: async ({ id, html, confirm }: { id: number; html: string; confirm?: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/sources/${id}/parse-html`, { html, confirm });
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (variables.confirm) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/sources"] });
        toast({ title: "Jobs Imported", description: `${data.imported} jobs sent to enrichment pipeline` });
        setHtmlModal(null);
        setPastedHtml("");
        setParsedPreview(null);
      } else {
        setParsedPreview(data.jobs);
      }
    },
    onError: () => toast({ title: "Parse Failed", variant: "destructive" }),
  });

  const testScrapeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/sources/${id}/test-scrape`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sources"] });
      toast({ title: "Test Scrape Complete", description: `Found ${data.jobCount} jobs. Samples: ${data.sampleTitles?.slice(0, 3).join(", ") || "none"}` });
    },
    onError: (err: any) => toast({ title: "Test Scrape Failed", description: err.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/sources/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sources"] });
      toast({ title: "Status Updated" });
    },
  });

  const filtered = sources.filter((s) => {
    if (search && !s.firmName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const counts = {
    total: sources.length,
    active: sources.filter((s) => s.status === "active").length,
    needsSetup: sources.filter((s) => s.status === "needs_review").length,
    classificationOnly: sources.filter((s) => s.status === "classification_only").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Firm Sources" description="Manage scrape source configurations for law firms" />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card data-testid="card-total-sources">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold" data-testid="text-total-count">{counts.total}</div>
              <div className="text-xs text-muted-foreground">Total Firms</div>
            </CardContent>
          </Card>
          <Card data-testid="card-active-sources">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600" data-testid="text-active-count">{counts.active}</div>
              <div className="text-xs text-muted-foreground">Active (Scraping)</div>
            </CardContent>
          </Card>
          <Card data-testid="card-setup-sources">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600" data-testid="text-setup-count">{counts.needsSetup}</div>
              <div className="text-xs text-muted-foreground">Needs Setup</div>
            </CardContent>
          </Card>
          <Card data-testid="card-classification-sources">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-500" data-testid="text-classification-count">{counts.classificationOnly}</div>
              <div className="text-xs text-muted-foreground">Classification Only</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search firms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-firms"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", "needs_review", "active", "classification_only"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
                data-testid={`button-filter-${s}`}
              >
                {s === "all" ? "All" : s === "needs_review" ? "Needs Setup" : s === "active" ? "Active" : "Classification"}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAutoDetectModal(true); autoDetectMutation.mutate(); }}
              disabled={autoDetectMutation.isPending}
              data-testid="button-batch-auto-detect"
            >
              {autoDetectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Radar className="h-3.5 w-3.5 mr-1" />}
              Scan All Unconfigured
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((source) => (
              <Card key={source.id} className="overflow-hidden" data-testid={`card-source-${source.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate" data-testid={`text-firm-name-${source.id}`}>{source.firmName}</span>
                        <StatusBadge status={source.status} />
                        <ATSBadge atsType={source.atsType} />
                        <FetchModeBadge mode={source.fetchMode} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <a href={source.careerUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1 truncate max-w-[300px]" data-testid={`link-career-url-${source.id}`}>
                          <Globe className="h-3 w-3 shrink-0" />{source.careerUrl}
                        </a>
                        {source.jobCount > 0 && (
                          <span className="text-emerald-600 font-medium" data-testid={`text-job-count-${source.id}`}>{source.jobCount} jobs</span>
                        )}
                        {source.lastSuccessAt && (
                          <span>Last: {new Date(source.lastSuccessAt).toLocaleDateString()}</span>
                        )}
                        {source.lastErrorMessage && (
                          <span className="text-red-500 truncate max-w-[200px]" title={source.lastErrorMessage}>{source.lastErrorMessage}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setDiscoverModal(source); setPortalUrl(source.discoveredPortalUrl || ""); }}
                        data-testid={`button-discover-${source.id}`}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1" />Discover ATS
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setHtmlModal(source); setPastedHtml(""); setParsedPreview(null); }}
                        data-testid={`button-import-html-${source.id}`}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />Import HTML
                      </Button>
                      {source.status === "active" && source.fetchMode === "ats_api" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testScrapeMutation.mutate(source.id)}
                          disabled={testScrapeMutation.isPending}
                          data-testid={`button-test-scrape-${source.id}`}
                        >
                          {testScrapeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                          Test
                        </Button>
                      )}
                      {source.status !== "classification_only" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: source.id, status: "classification_only" })}
                          data-testid={`button-classify-only-${source.id}`}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {source.status === "classification_only" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: source.id, status: "needs_review" })}
                          data-testid={`button-reactivate-${source.id}`}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No firms match your filters</div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showAutoDetectModal} onOpenChange={() => setShowAutoDetectModal(false)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radar className="h-5 w-5" />
              Batch ATS Auto-Detection
            </DialogTitle>
            <DialogDescription>
              Scanning all unconfigured companies to detect their ATS platforms automatically.
            </DialogDescription>
          </DialogHeader>

          {autoDetectMutation.isPending && (
            <div className="flex flex-col items-center py-12 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-sm text-muted-foreground">Scanning career pages... This may take a few minutes.</div>
              <div className="text-xs text-muted-foreground">Fetching pages in batches of 3 with delays to avoid rate limiting.</div>
            </div>
          )}

          {autoDetectResults && !autoDetectMutation.isPending && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-600" data-testid="text-detected-count">{autoDetectResults.summary.detected}</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">ATS Detected</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-600" data-testid="text-blocked-count">{autoDetectResults.summary.blocked}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-400">Cloudflare Blocked</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-500" data-testid="text-noats-count">{autoDetectResults.summary.noAts}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">No ATS Found</div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-red-500" data-testid="text-errors-count">{autoDetectResults.summary.errors}</div>
                  <div className="text-xs text-red-700 dark:text-red-400">Errors</div>
                </div>
              </div>

              {autoDetectResults.detected.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">Detected ({autoDetectResults.detected.length})</span>
                  </div>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {autoDetectResults.detected.map((d, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded text-sm" data-testid={`detected-item-${i}`}>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{d.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <ATSBadge atsType={d.atsType} />
                            {d.validated && <span className="text-emerald-600">{d.jobCount} jobs</span>}
                            {!d.scrapeSupported && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">No API</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {autoDetectResults.blocked.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium">Cloudflare Blocked ({autoDetectResults.blocked.length})</span>
                  </div>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {autoDetectResults.blocked.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-sm" data-testid={`blocked-item-${i}`}>
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{b.name}</span>
                        <a href={b.careerUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">Check manually</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {autoDetectResults.errors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Errors ({autoDetectResults.errors.length})</span>
                  </div>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {autoDetectResults.errors.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm" data-testid={`error-item-${i}`}>
                        <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <span className="truncate font-medium">{e.name}</span>
                        <span className="text-xs text-red-500 truncate" title={e.error}>{e.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {autoDetectResults.noAts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-muted-foreground">No ATS Found ({autoDetectResults.noAts.length})</span>
                  </div>
                  <div className="text-xs text-muted-foreground max-h-[100px] overflow-y-auto">
                    {autoDetectResults.noAts.map((n) => n.name).join(", ")}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoDetectModal(false)} data-testid="button-close-autodetect">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!discoverModal} onOpenChange={() => { setDiscoverModal(null); setPortalUrl(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Discover ATS for {discoverModal?.firmName}</DialogTitle>
            <DialogDescription>
              Visit <a href={discoverModal?.careerUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary">{discoverModal?.firmName}'s career page</a> in your browser. Click through to where actual job listings appear. Copy the URL from your browser's address bar and paste it below.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Paste the job portal URL here..."
            value={portalUrl}
            onChange={(e) => setPortalUrl(e.target.value)}
            data-testid="input-portal-url"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscoverModal(null)} data-testid="button-cancel-discover">Cancel</Button>
            <Button
              onClick={() => discoverModal && discoverMutation.mutate({ id: discoverModal.id, url: portalUrl })}
              disabled={!portalUrl || discoverMutation.isPending}
              data-testid="button-submit-discover"
            >
              {discoverMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Auto-Detect ATS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!htmlModal} onOpenChange={() => { setHtmlModal(null); setPastedHtml(""); setParsedPreview(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import HTML for {htmlModal?.firmName}</DialogTitle>
            <DialogDescription>
              Visit <a href={htmlModal?.careerUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary">{htmlModal?.firmName}'s career page</a> in your browser. Right-click &rarr; "View Page Source" or press Ctrl+U. Copy all the HTML and paste it below.
            </DialogDescription>
          </DialogHeader>

          {!parsedPreview ? (
            <>
              <Textarea
                placeholder="Paste the full HTML source here..."
                value={pastedHtml}
                onChange={(e) => setPastedHtml(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
                data-testid="textarea-paste-html"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setHtmlModal(null)} data-testid="button-cancel-html">Cancel</Button>
                <Button
                  onClick={() => htmlModal && parseHtmlMutation.mutate({ id: htmlModal.id, html: pastedHtml })}
                  disabled={!pastedHtml || parseHtmlMutation.isPending}
                  data-testid="button-preview-html"
                >
                  {parseHtmlMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                  Preview Extracted Jobs
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="text-sm font-medium">Found {parsedPreview.length} jobs:</div>
                {parsedPreview.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">No jobs could be extracted from this HTML. Try copying the page source when job listings are visible.</div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-1.5">
                    {parsedPreview.map((job, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm" data-testid={`parsed-job-${i}`}>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{job.title}</div>
                          <div className="text-xs text-muted-foreground">{job.location}{job.department ? ` · ${job.department}` : ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setParsedPreview(null)} data-testid="button-back-html">Back</Button>
                {parsedPreview.length > 0 && (
                  <Button
                    onClick={() => htmlModal && parseHtmlMutation.mutate({ id: htmlModal.id, html: pastedHtml, confirm: true })}
                    disabled={parseHtmlMutation.isPending}
                    data-testid="button-confirm-import"
                  >
                    {parseHtmlMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Import {parsedPreview.length} Jobs
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
