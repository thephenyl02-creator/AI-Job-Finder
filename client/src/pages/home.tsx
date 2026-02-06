import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { SearchBar } from "@/components/search-bar";
import { JobList } from "@/components/job-list";
import { useAuth } from "@/hooks/use-auth";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { apiRequest } from "@/lib/queryClient";
import type { JobWithScore, Job, JobCategory } from "@shared/schema";
import { JOB_TAXONOMY } from "@shared/schema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, LayoutGrid, Brain, Scale, Building2 } from "lucide-react";

const categoryIcons = {
  "Legal AI Jobs": Brain,
  "Legal Tech Startup Roles": Scale,
  "Law Firm Tech & Innovation": Building2,
} as const;

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { track } = useActivityTracker();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { track({ eventType: "page_view", pagePath: "/" }); }, []);
  const [searchResults, setSearchResults] = useState<JobWithScore[] | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "browse">("search");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: allJobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    enabled: isAuthenticated,
  });

  const { data: resumeData } = useQuery<{ hasResume: boolean }>({
    queryKey: ["/api/resume"],
    enabled: isAuthenticated,
  });

  const { data: savedJobIds = [] } = useQuery<number[]>({
    queryKey: ["/api/saved-jobs/ids"],
    enabled: isAuthenticated,
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/search", { query });
      return response.json();
    },
    onSuccess: (data: JobWithScore[]) => {
      setSearchResults(data);
      setActiveTab("search");
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Session expired",
          description: "Please log in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Search failed",
        description: "Please try again with a different query.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    track({ eventType: "search", metadata: { query } });
    searchMutation.mutate(query);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-14 border-b border-border/40 skeleton-shimmer" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="h-8 w-64 skeleton-shimmer rounded-md" />
            <div className="h-5 w-80 skeleton-shimmer rounded-md" />
          </div>
          <div className="h-12 w-full skeleton-shimmer rounded-md mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 w-full skeleton-shimmer rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const filteredJobs = selectedCategory 
    ? allJobs.filter(job => job.roleCategory === selectedCategory)
    : allJobs;

  const displayedJobs = activeTab === "search" && searchResults 
    ? searchResults 
    : filteredJobs.map(job => ({ ...job, matchScore: undefined, matchReason: undefined } as JobWithScore));

  const getCategoryCount = (category: string) => 
    allJobs.filter(job => job.roleCategory === category).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-serif font-medium text-foreground mb-2 tracking-tight">
            Find Your Next Role
          </h1>
          <p className="text-muted-foreground">
            Search and match across legal technology careers
          </p>
        </div>

        <SearchBar 
          onSearch={handleSearch} 
          isLoading={searchMutation.isPending} 
        />

        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            data-testid="filter-all"
          >
            All Categories
            <Badge variant="secondary" className="ml-2">{allJobs.length}</Badge>
          </Button>
          {Object.entries(JOB_TAXONOMY).map(([category, data]) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons];
            const count = getCategoryCount(category);
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                data-testid={`filter-${category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="h-4 w-4 mr-1" />
                {category}
                <Badge variant="secondary" className="ml-2">{count}</Badge>
              </Button>
            );
          })}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "search" | "browse")}>
              <TabsList>
                <TabsTrigger value="search" className="gap-2" data-testid="tab-search-results">
                  <Sparkles className="h-4 w-4" />
                  {searchResults ? `Results (${searchResults.length})` : "Search Results"}
                </TabsTrigger>
                <TabsTrigger value="browse" className="gap-2" data-testid="tab-all-jobs">
                  <LayoutGrid className="h-4 w-4" />
                  {selectedCategory ? `${selectedCategory} (${filteredJobs.length})` : `All Jobs (${allJobs.length})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <JobList 
            jobs={displayedJobs}
            isLoading={jobsLoading || searchMutation.isPending}
            showMatchScores={activeTab === "search" && searchResults !== null}
            searchQuery={activeTab === "search" ? searchQuery : undefined}
            emptyMessage={activeTab === "search" && !searchResults ? "Enter a search query to find matching jobs" : "No jobs available"}
            hasResume={resumeData?.hasResume ?? false}
            savedJobIds={savedJobIds}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </main>
    </div>
  );
}
