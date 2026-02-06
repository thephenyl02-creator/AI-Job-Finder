import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import type { Job, JobWithScore } from "@shared/schema";
import { JOB_TAXONOMY } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/animations";
import {
  ExternalLink,
  Search,
  ArrowLeft,
  MapPin,
  Building2,
  ChevronRight,
  ChevronDown,
  Brain,
  Lightbulb,
  BookOpen,
  Settings,
  FileText,
  Shield,
  Scale,
  TrendingUp,
  GraduationCap,
  Newspaper,
  Landmark,
  Microscope,
  Sparkles,
  X,
  LayoutGrid,
  List,
  Target,
  Loader2,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, typeof Brain> = {
  "Brain": Brain,
  "Lightbulb": Lightbulb,
  "BookOpen": BookOpen,
  "Settings": Settings,
  "FileText": FileText,
  "Shield": Shield,
  "Scale": Scale,
  "TrendingUp": TrendingUp,
  "GraduationCap": GraduationCap,
  "Newspaper": Newspaper,
  "Landmark": Landmark,
  "Microscope": Microscope,
  "Sparkles": Sparkles,
};

const SENIORITY_LEVELS = [
  { value: "all", label: "All Levels" },
  { value: "entry", label: "Entry Level", match: ["Entry", "Junior", "Associate", "Intern", "Fellowship"] },
  { value: "mid", label: "Mid Level", match: ["Mid"] },
  { value: "senior", label: "Senior+", match: ["Senior", "Lead", "Director", "VP", "Principal", "Staff"] },
];

export default function Jobs() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const levelParam = urlParams.get("level");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>(levelParam && ["entry", "mid", "senior"].includes(levelParam) ? levelParam : "all");
  const [filterText, setFilterText] = useState("");
  const [searchResults, setSearchResults] = useState<JobWithScore[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const level = params.get("level");
    if (level && ["entry", "mid", "senior"].includes(level)) {
      setSelectedLevel(level);
    }
  }, [searchString]);

  const toggleJobSelection = (jobId: number) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else if (next.size < 3) {
        next.add(jobId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedJobIds(new Set());
  };

  const getSelectedJobs = () => {
    const allDisplayJobs = searchResults || allJobs;
    return allDisplayJobs.filter((job) => selectedJobIds.has(job.id));
  };

  const handleCompareSelected = () => {
    const selectedJobs = getSelectedJobs();
    if (selectedJobs.length < 2) return;
    
    // Store selected jobs in sessionStorage for Career Advisor to pick up
    const jobsForComparison = selectedJobs.map((job) => ({
      id: String(job.id),
      title: job.title,
      description: job.description,
      company: job.company,
      location: job.location || undefined,
      portalJobId: job.id,
    }));
    sessionStorage.setItem("compareJobs", JSON.stringify(jobsForComparison));
    setLocation("/career-advisor");
  };

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

  const { data: resumeData } = useQuery<{ hasResume: boolean }>({
    queryKey: ["/api/resume"],
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

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </motion.div>
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
    
    let matchesLevel = true;
    if (selectedLevel !== "all") {
      const levelConfig = SENIORITY_LEVELS.find(l => l.value === selectedLevel);
      if (levelConfig && "match" in levelConfig && levelConfig.match) {
        const matchPatterns = levelConfig.match;
        matchesLevel = matchPatterns.some(m => 
          job.seniorityLevel?.toLowerCase().includes(m.toLowerCase()) ||
          job.title.toLowerCase().includes(m.toLowerCase())
        );
      }
    }
    
    return matchesCategory && matchesText && matchesLevel;
  });

  const getCategoryCount = (category: string) => 
    displayJobs.filter(job => job.roleCategory === category).length;

  const jobsByCategory = Object.entries(JOB_TAXONOMY).reduce((acc, [category]) => {
    acc[category] = filteredJobs.filter(job => job.roleCategory === category);
    return acc;
  }, {} as Record<string, (Job | JobWithScore)[]>);

  const uncategorizedJobs = filteredJobs.filter(job => 
    !job.roleCategory || !Object.keys(JOB_TAXONOMY).includes(job.roleCategory)
  );

  const categoriesWithJobs = Object.entries(jobsByCategory)
    .filter(([_, jobs]) => jobs.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = CATEGORY_ICONS[iconName] || Brain;
    return IconComponent;
  };

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
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              {searchResults ? `Results for "${searchQuery}"` : "Browse Jobs"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cards")}
              data-testid="button-view-cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
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
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {SENIORITY_LEVELS.map((level) => (
              <Button
                key={level.value}
                variant={selectedLevel === level.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedLevel(level.value)}
                data-testid={`button-level-${level.value}`}
              >
                {level.label}
              </Button>
            ))}
          </div>
          {selectedCategory !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="gap-1"
              data-testid="button-clear-category"
            >
              <X className="h-3 w-3" />
              {selectedCategory}
            </Button>
          )}
          {selectedLevel !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLevel("all")}
              className="gap-1"
              data-testid="button-clear-level"
            >
              <X className="h-3 w-3" />
              {SENIORITY_LEVELS.find(l => l.value === selectedLevel)?.label}
            </Button>
          )}
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
          <span className="text-sm text-muted-foreground self-center">
            {filteredJobs.length} jobs
          </span>
        </div>

        {selectedCategory === "all" && viewMode === "cards" && (
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8" staggerDelay={0.06}>
            {Object.entries(JOB_TAXONOMY).map(([category, data]) => {
              const count = getCategoryCount(category);
              const Icon = getCategoryIcon(data.icon);
              return (
                <StaggerItem key={category}>
                  <motion.button
                    onClick={() => {
                      setSelectedCategory(category);
                      setExpandedCategories(new Set([category]));
                    }}
                    className={`w-full p-4 rounded-lg border text-left transition-colors hover:border-primary/50 hover:bg-muted/30 ${
                      count === 0 ? "opacity-50" : ""
                    }`}
                    disabled={count === 0}
                    whileHover={count > 0 ? { y: -2 } : undefined}
                    whileTap={count > 0 ? { scale: 0.98 } : undefined}
                    transition={{ duration: 0.15 }}
                    data-testid={`button-category-${category.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-sm text-foreground line-clamp-2">{data.shortName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{count} jobs</p>
                  </motion.button>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}

        {jobsLoading ? (
          <div className="text-center py-12">
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading jobs...</span>
            </motion.div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-muted-foreground">No jobs found</div>
          </motion.div>
        ) : viewMode === "list" ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-3 w-10">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="text-left p-3 font-medium text-sm">Job Title</th>
                  <th className="text-left p-3 font-medium text-sm">Company</th>
                  <th className="text-left p-3 font-medium text-sm">Location</th>
                  <th className="text-left p-3 font-medium text-sm">Category</th>
                  {searchResults && <th className="text-left p-3 font-medium text-sm">Match</th>}
                  <th className="text-right p-3 font-medium text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr 
                    key={job.id} 
                    className={`border-b hover:bg-muted/30 cursor-pointer ${selectedJobIds.has(job.id) ? "bg-primary/5" : ""}`} 
                    data-testid={`row-job-${job.id}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button, [role="checkbox"], a')) return;
                      setLocation(`/jobs/${job.id}`);
                    }}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedJobIds.has(job.id)}
                        onCheckedChange={() => toggleJobSelection(job.id)}
                        disabled={!selectedJobIds.has(job.id) && selectedJobIds.size >= 3}
                        data-testid={`checkbox-job-${job.id}`}
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium" data-testid={`text-job-title-${job.id}`}>
                        {job.title}
                      </div>
                      {job.roleSubcategory && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {job.roleSubcategory}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span data-testid={`text-job-company-${job.id}`}>{job.company}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span data-testid={`text-job-location-${job.id}`}>
                          {job.location || "Remote"}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm">{job.roleCategory || "Uncategorized"}</span>
                    </td>
                    {searchResults && (
                      <td className="p-3">
                        {"matchScore" in job && (job as JobWithScore).matchScore && (
                          <Badge 
                            variant={(job as JobWithScore).matchScore! >= 80 ? "default" : "secondary"}
                            data-testid={`badge-match-${job.id}`}
                          >
                            {(job as JobWithScore).matchScore}%
                          </Badge>
                        )}
                      </td>
                    )}
                    <td className="p-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyClick(job);
                          }}
                          data-testid={`button-apply-${job.id}`}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Apply
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedCategory !== "all" ? (
              <CategorySection
                category={selectedCategory}
                jobs={filteredJobs}
                taxonomy={JOB_TAXONOMY[selectedCategory as keyof typeof JOB_TAXONOMY]}
                expanded={true}
                onToggle={() => {}}
                onApply={handleApplyClick}
                hasResume={resumeData?.hasResume ?? false}
                searchResults={searchResults}
                getCategoryIcon={getCategoryIcon}
                selectedJobIds={selectedJobIds}
                onToggleSelection={toggleJobSelection}
                onJobClick={(id) => setLocation(`/jobs/${id}`)}
              />
            ) : (
              <>
                {categoriesWithJobs.map(([category, jobs]) => {
                  const taxonomy = JOB_TAXONOMY[category as keyof typeof JOB_TAXONOMY];
                  return (
                    <CategorySection
                      key={category}
                      category={category}
                      jobs={jobs}
                      taxonomy={taxonomy}
                      expanded={expandedCategories.has(category)}
                      onToggle={() => toggleCategory(category)}
                      onApply={handleApplyClick}
                      hasResume={resumeData?.hasResume ?? false}
                      searchResults={searchResults}
                      getCategoryIcon={getCategoryIcon}
                      selectedJobIds={selectedJobIds}
                      onToggleSelection={toggleJobSelection}
                      onJobClick={(id) => setLocation(`/jobs/${id}`)}
                    />
                  );
                })}
                {uncategorizedJobs.length > 0 && (
                  <CategorySection
                    category="Other"
                    jobs={uncategorizedJobs}
                    taxonomy={{ icon: "Sparkles", shortName: "Other", description: "Uncategorized jobs", subcategories: [] }}
                    expanded={expandedCategories.has("Other")}
                    onToggle={() => toggleCategory("Other")}
                    onApply={handleApplyClick}
                    hasResume={resumeData?.hasResume ?? false}
                    searchResults={searchResults}
                    getCategoryIcon={getCategoryIcon}
                    selectedJobIds={selectedJobIds}
                    onToggleSelection={toggleJobSelection}
                    onJobClick={(id) => setLocation(`/jobs/${id}`)}
                  />
                )}
              </>
            )}
          </div>
        )}

        <AnimatePresence>
          {selectedJobIds.size > 0 && (
            <motion.div
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              data-testid="compare-action-bar"
            >
              <Card className="shadow-lg border-primary/20">
                <CardContent className="flex items-center gap-4 py-3 px-5">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      {selectedJobIds.size} job{selectedJobIds.size > 1 ? "s" : ""} selected
                    </span>
                    {selectedJobIds.size < 2 && (
                      <span className="text-sm text-muted-foreground">(select at least 2)</span>
                    )}
                    {selectedJobIds.size >= 3 && (
                      <span className="text-sm text-muted-foreground">(max 3)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      data-testid="button-clear-selection"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCompareSelected}
                      disabled={selectedJobIds.size < 2}
                      data-testid="button-compare-selected"
                    >
                      <Target className="h-4 w-4 mr-1" />
                      Compare Selected
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function CategorySection({
  category,
  jobs,
  taxonomy,
  expanded,
  onToggle,
  onApply,
  hasResume,
  searchResults,
  getCategoryIcon,
  selectedJobIds,
  onToggleSelection,
  onJobClick,
}: {
  category: string;
  jobs: (Job | JobWithScore)[];
  taxonomy: { icon: string; shortName: string; description: string; subcategories: readonly string[] };
  expanded: boolean;
  onToggle: () => void;
  onApply: (job: Job | JobWithScore) => void;
  hasResume: boolean;
  searchResults: JobWithScore[] | null;
  getCategoryIcon: (icon: string) => typeof Brain;
  selectedJobIds: Set<number>;
  onToggleSelection: (jobId: number) => void;
  onJobClick: (jobId: number) => void;
}) {
  const Icon = getCategoryIcon(taxonomy.icon);

  const jobsBySubcategory = jobs.reduce((acc, job) => {
    const sub = job.roleSubcategory || "Other";
    if (!acc[sub]) acc[sub] = [];
    acc[sub].push(job);
    return acc;
  }, {} as Record<string, (Job | JobWithScore)[]>);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left"
        data-testid={`button-toggle-${category.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <CardHeader className="flex flex-row items-center gap-3 py-4 hover:bg-muted/30 transition-colors">
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{category}</h3>
              <Badge variant="secondary">{jobs.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{taxonomy.description}</p>
          </div>
          {expanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
        </CardHeader>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 pb-4">
              <div className="space-y-4">
                {Object.entries(jobsBySubcategory)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([subcategory, subJobs]) => (
                    <div key={subcategory}>
                      <div className="flex items-center gap-2 mb-2 px-2">
                        <span className="text-sm font-medium text-muted-foreground">{subcategory}</span>
                        <span className="text-xs text-muted-foreground">({subJobs.length})</span>
                      </div>
                      <div className="grid gap-2">
                        {subJobs.map((job) => (
                      <div
                        key={job.id}
                        className={`p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer ${selectedJobIds.has(job.id) ? "ring-2 ring-primary bg-primary/5" : ""}`}
                        data-testid={`card-job-${job.id}`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button, [role="checkbox"], a')) return;
                          onJobClick(job.id);
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedJobIds.has(job.id)}
                                onCheckedChange={() => onToggleSelection(job.id)}
                                disabled={!selectedJobIds.has(job.id) && selectedJobIds.size >= 3}
                                className="mt-1"
                                data-testid={`checkbox-job-${job.id}`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-foreground" data-testid={`text-job-title-${job.id}`}>
                                {job.title}
                              </h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                <span data-testid={`text-job-company-${job.id}`}>{job.company}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span data-testid={`text-job-location-${job.id}`}>{job.location || "Remote"}</span>
                              </span>
                              {job.seniorityLevel && (
                                <Badge variant="outline" className="text-xs">
                                  {job.seniorityLevel}
                                </Badge>
                              )}
                              {searchResults && "matchScore" in job && (job as JobWithScore).matchScore && (
                                <Badge 
                                  variant={(job as JobWithScore).matchScore! >= 80 ? "default" : "secondary"}
                                  data-testid={`badge-match-${job.id}`}
                                >
                                  {(job as JobWithScore).matchScore}% match
                                </Badge>
                              )}
                            </div>
                            {job.aiSummary && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {job.aiSummary}
                              </p>
                            )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onApply(job);
                              }}
                              data-testid={`button-apply-${job.id}`}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Apply
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
