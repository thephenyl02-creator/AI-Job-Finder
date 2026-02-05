import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw, Building2, Globe, Loader2, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

export default function AdminPage() {
  const { toast } = useToast();
  const [lastResult, setLastResult] = useState<ScrapeResult | null>(null);

  const { data: companies, isLoading: loadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/admin/scraper/companies"],
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
