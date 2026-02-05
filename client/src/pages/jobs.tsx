import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { Job, JobWithScore } from "@shared/schema";
import { JOB_TAXONOMY } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Search, ArrowLeft, MapPin, Building2, Briefcase } from "lucide-react";

export default function Jobs() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterText, setFilterText] = useState("");
  const [searchResults, setSearchResults] = useState<JobWithScore[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("searchResults");
    const query = sessionStorage.getItem("searchQuery");
    if (stored) {
      setSearchResults(JSON.parse(stored));
      setSearchQuery(query);
      sessionStorage.removeItem("searchResults");
      sessionStorage.removeItem("searchQuery");
    }
  }, []);

  const { data: allJobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    enabled: isAuthenticated,
  });

  const handleApplyClick = async (job: Job | JobWithScore) => {
    try {
      await apiRequest("POST", `/api/jobs/${job.id}/apply-click`);
    } catch (e) {
      console.error("Failed to track apply click", e);
    }
    window.open(job.applyUrl, "_blank");
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

  const displayJobs = searchResults || allJobs;

  const filteredJobs = displayJobs.filter((job) => {
    const matchesCategory = selectedCategory === "all" || job.roleCategory === selectedCategory;
    const matchesText = filterText === "" || 
      job.title.toLowerCase().includes(filterText.toLowerCase()) ||
      job.company.toLowerCase().includes(filterText.toLowerCase()) ||
      (job.location?.toLowerCase().includes(filterText.toLowerCase()));
    return matchesCategory && matchesText;
  });

  const getCategoryCount = (category: string) => 
    displayJobs.filter(job => job.roleCategory === category).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              data-testid="button-back-search"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {searchResults ? `Search Results for "${searchQuery}"` : "All Jobs"}
            </h1>
          </div>
          <Badge variant="secondary" className="text-base px-3 py-1">
            {filteredJobs.length} jobs
          </Badge>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by title, company, or location..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              data-testid="input-filter"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[280px]" data-testid="select-category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories ({displayJobs.length})</SelectItem>
              {Object.keys(JOB_TAXONOMY).map((category) => (
                <SelectItem key={category} value={category}>
                  {category} ({getCategoryCount(category)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {searchResults && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchResults(null);
                setSearchQuery(null);
              }}
              data-testid="button-clear-search"
            >
              Clear Search Results
            </Button>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[300px]">Job Title</TableHead>
                <TableHead className="w-[180px]">Company</TableHead>
                <TableHead className="w-[150px]">Location</TableHead>
                <TableHead className="w-[200px]">Category</TableHead>
                {searchResults && <TableHead className="w-[100px]">Match</TableHead>}
                <TableHead className="w-[100px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobsLoading ? (
                <TableRow>
                  <TableCell colSpan={searchResults ? 6 : 5} className="text-center py-8">
                    <div className="animate-pulse text-muted-foreground">Loading jobs...</div>
                  </TableCell>
                </TableRow>
              ) : filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={searchResults ? 6 : 5} className="text-center py-8">
                    <div className="text-muted-foreground">No jobs found</div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                    <TableCell>
                      <div className="font-medium" data-testid={`text-job-title-${job.id}`}>
                        {job.title}
                      </div>
                      {job.roleSubcategory && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {job.roleSubcategory}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span data-testid={`text-job-company-${job.id}`}>{job.company}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span data-testid={`text-job-location-${job.id}`}>
                          {job.location || "Remote"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{job.roleCategory || "Uncategorized"}</span>
                      </div>
                    </TableCell>
                    {searchResults && (
                      <TableCell>
                        {"matchScore" in job && (job as JobWithScore).matchScore && (
                          <Badge 
                            variant={(job as JobWithScore).matchScore! >= 80 ? "default" : "secondary"}
                            data-testid={`badge-match-${job.id}`}
                          >
                            {(job as JobWithScore).matchScore}%
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleApplyClick(job)}
                        data-testid={`button-apply-${job.id}`}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Apply
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
