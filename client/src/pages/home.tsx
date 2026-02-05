import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { SearchBar } from "@/components/search-bar";
import { JobList } from "@/components/job-list";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { apiRequest } from "@/lib/queryClient";
import type { JobWithScore, Job } from "@shared/schema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, LayoutGrid } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<JobWithScore[] | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "browse">("search");

  const { data: allJobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
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
          window.location.href = "/api/login";
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
    searchMutation.mutate(query);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const displayedJobs = activeTab === "search" && searchResults 
    ? searchResults 
    : allJobs.map(job => ({ ...job, matchScore: undefined, matchReason: undefined } as JobWithScore));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Find Your Next Opportunity
          </h1>
          <p className="text-muted-foreground">
            Describe your ideal role and let AI find the best matches
          </p>
        </div>

        <SearchBar 
          onSearch={handleSearch} 
          isLoading={searchMutation.isPending} 
        />

        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "search" | "browse")}>
              <TabsList>
                <TabsTrigger value="search" className="gap-2" data-testid="tab-search-results">
                  <Sparkles className="h-4 w-4" />
                  {searchResults ? `Results (${searchResults.length})` : "Search Results"}
                </TabsTrigger>
                <TabsTrigger value="browse" className="gap-2" data-testid="tab-all-jobs">
                  <LayoutGrid className="h-4 w-4" />
                  All Jobs ({allJobs.length})
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
          />
        </div>
      </main>
    </div>
  );
}
