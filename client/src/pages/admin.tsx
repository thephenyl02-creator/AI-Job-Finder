import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw, Building2, Globe, Loader2, CheckCircle, XCircle, Sparkles, Activity, FileText, Play, Square, LinkIcon, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Company {
  name: string;
  type: string;
  careerUrl: string;
  hasApi: boolean;
}

interface ScrapeResult {
  success: boolean;
  message: string;
  stats?: { company: string; found: number; filtered: number; categorized?: number }[];
  inserted: number;
  updated: number;
  totalScraped?: number;
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  category: string;
  message: string;
  details?: Record<string, any>;
}

interface MonitoringData {
  scheduler: {
    running: boolean;
    nextRun: string;
  };
  jobs: {
    total: number;
    bySource: Record<string, number>;
  };
  logs: {
    files: { filename: string; date: string; size: number }[];
    recent: LogEntry[];
  };
}

export default function AdminPage() {
  const { toast } = useToast();
  const [lastResult, setLastResult] = useState<ScrapeResult | null>(null);

  const { data: companies, isLoading: loadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/admin/scraper/companies"],
  });

  const { data: monitoring, isLoading: loadingMonitoring, refetch: refetchMonitoring } = useQuery<MonitoringData>({
    queryKey: ["/api/admin/monitoring"],
    refetchInterval: 30000,
  });

  const schedulerMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop' | 'run-now') => {
      const res = await apiRequest("POST", `/api/admin/scheduler/${action}`);
      return res.json();
    },
    onSuccess: (data) => {
      refetchMonitoring();
      toast({
        title: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scheduler action failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateLinksMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/validate-links");
      return res.json();
    },
    onSuccess: (data) => {
      refetchMonitoring();
      toast({
        title: "Link validation complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Validation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scrapeAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/scraper/run");
      return res.json() as Promise<ScrapeResult>;
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Scraping Complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scraping Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scrapeWithAIMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/scraper/run-with-ai");
      return res.json() as Promise<ScrapeResult>;
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "AI Scraping Complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "AI Scraping Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scrapeCompanyMutation = useMutation({
    mutationFn: async (companyName: string) => {
      const res = await apiRequest("POST", `/api/admin/scraper/company/${encodeURIComponent(companyName)}`);
      return res.json() as Promise<ScrapeResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Company Scraped",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scraping Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Job Scraper Admin</h1>
              <p className="text-sm text-muted-foreground">
                Scrape legal tech jobs from career websites
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Scheduler & Monitoring
              </CardTitle>
              <CardDescription>
                View scheduler status, job statistics, and recent logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMonitoring ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Scheduler Status
                        </h4>
                        <Badge variant={monitoring?.scheduler.running ? "default" : "secondary"}>
                          {monitoring?.scheduler.running ? "Running" : "Stopped"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {monitoring?.scheduler.nextRun}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {monitoring?.scheduler.running ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => schedulerMutation.mutate('stop')}
                            disabled={schedulerMutation.isPending}
                            data-testid="button-stop-scheduler"
                          >
                            <Square className="h-3 w-3 mr-1" />
                            Stop
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => schedulerMutation.mutate('start')}
                            disabled={schedulerMutation.isPending}
                            data-testid="button-start-scheduler"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => schedulerMutation.mutate('run-now')}
                          disabled={schedulerMutation.isPending}
                          data-testid="button-run-now"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Run Now
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Building2 className="h-4 w-4" />
                        Job Statistics
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Active Jobs</span>
                          <span className="font-medium">{monitoring?.jobs.total || 0}</span>
                        </div>
                        {monitoring?.jobs.bySource && Object.entries(monitoring.jobs.bySource).map(([source, count]) => (
                          <div key={source} className="flex justify-between text-sm text-muted-foreground">
                            <span className="capitalize">{source}</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => validateLinksMutation.mutate()}
                        disabled={validateLinksMutation.isPending}
                        data-testid="button-validate-links"
                      >
                        {validateLinksMutation.isPending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <LinkIcon className="h-3 w-3 mr-1" />
                        )}
                        Validate Apply Links
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4" />
                      Recent Logs
                    </h4>
                    {monitoring?.logs.recent && monitoring.logs.recent.length > 0 ? (
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-1 text-xs font-mono">
                          {monitoring.logs.recent.map((log, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="text-muted-foreground whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                              <Badge 
                                variant={
                                  log.level === 'ERROR' ? 'destructive' : 
                                  log.level === 'WARN' ? 'secondary' : 
                                  log.level === 'SUCCESS' ? 'default' : 
                                  'outline'
                                }
                                className="text-[10px] h-4 px-1"
                              >
                                {log.level}
                              </Badge>
                              <span className="text-muted-foreground">[{log.category}]</span>
                              <span className="truncate">{log.message}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No logs yet. Run the scheduler to generate logs.
                      </p>
                    )}
                    {monitoring?.logs.files && monitoring.logs.files.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Log files ({monitoring.logs.files.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {monitoring.logs.files.slice(0, 5).map((file) => (
                            <Badge key={file.filename} variant="outline" className="text-xs">
                              {file.date} ({(file.size / 1024).toFixed(1)}KB)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Scrape All Companies
              </CardTitle>
              <CardDescription>
                Run the scraper on all configured legal tech companies. This may take a few minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => scrapeAllMutation.mutate()}
                  disabled={scrapeAllMutation.isPending || scrapeWithAIMutation.isPending}
                  variant="outline"
                  data-testid="button-scrape-all"
                >
                  {scrapeAllMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Quick Scrape (No AI)
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => scrapeWithAIMutation.mutate()}
                  disabled={scrapeAllMutation.isPending || scrapeWithAIMutation.isPending}
                  data-testid="button-scrape-with-ai"
                >
                  {scrapeWithAIMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI Scraping... (This takes a while)
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Scrape with AI Categorization
                    </>
                  )}
                </Button>
              </div>

              {lastResult && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Last Result</h4>
                  <p className="text-sm text-muted-foreground mb-2">{lastResult.message}</p>
                  {lastResult.stats && (
                    <div className="space-y-1">
                      {lastResult.stats.map((stat) => (
                        <div key={stat.company} className="flex items-center gap-2 text-sm">
                          {stat.filtered > 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{stat.company}:</span>
                          <span className="text-muted-foreground">
                            {stat.found} found, {stat.filtered} legal tech
                            {stat.categorized !== undefined && `, ${stat.categorized} AI categorized`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Configured Companies
              </CardTitle>
              <CardDescription>
                Companies configured for job scraping. Click to scrape individually.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCompanies ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-3">
                  {companies?.map((company) => (
                    <div
                      key={company.name}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <a
                              href={company.careerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              Career Page
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={company.hasApi ? "default" : "secondary"}>
                          {company.hasApi ? "API" : "HTML"}
                        </Badge>
                        <Badge variant="outline">{company.type}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => scrapeCompanyMutation.mutate(company.name)}
                          disabled={scrapeCompanyMutation.isPending}
                          data-testid={`button-scrape-${company.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {scrapeCompanyMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Scrape"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
