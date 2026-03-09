import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Container } from "@/components/container";
import { CompanyLogo } from "@/components/company-logo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowRight, ArrowLeft, Building2, Briefcase } from "lucide-react";
import { Link } from "wouter";

interface CompanyEntry {
  name: string;
  slug: string;
  jobCount: number;
  topCategory: string | null;
  domain: string | null;
}

interface CompanyDirectoryResponse {
  companies: CompanyEntry[];
  total: number;
  page: number;
  totalPages: number;
}

function CompanyCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Companies() {
  usePageTitle("Legal Tech Companies Hiring | Legal Tech Careers");

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useQuery<CompanyDirectoryResponse>({
    queryKey: ["/api/companies", { page: currentPage, search: debouncedSearch }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/companies?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json();
    },
  });

  const companies = data?.companies ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-6 sm:py-8">
        <Container size="lg">
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-page-title">
                Companies Hiring in Legal Tech
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">
                {isLoading ? "Loading companies..." : `${total} companies with active roles`}
              </p>
            </div>

            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
                data-testid="input-search-companies"
              />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <CompanyCardSkeleton key={i} />
                ))}
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground" data-testid="text-no-results">
                  {debouncedSearch
                    ? `No companies found matching "${debouncedSearch}"`
                    : "No companies with active listings right now"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {companies.map((company) => (
                  <Link key={company.slug} href={`/companies/${company.slug}`}>
                    <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-company-${company.slug}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <CompanyLogo company={company.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate" data-testid={`text-company-name-${company.slug}`}>
                              {company.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge variant="secondary" className="text-[10px] no-default-active-elevate" data-testid={`badge-job-count-${company.slug}`}>
                                <Briefcase className="h-2.5 w-2.5 mr-0.5" />
                                {company.jobCount} {company.jobCount === 1 ? "role" : "roles"}
                              </Badge>
                              {company.topCategory && (
                                <Badge variant="outline" className="text-[10px] no-default-active-elevate truncate max-w-[120px]" data-testid={`badge-category-${company.slug}`}>
                                  {company.topCategory}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4" data-testid="pagination-controls">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  data-testid="button-prev-page"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2" data-testid="text-page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
