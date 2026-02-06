import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { apiRequest } from "@/lib/queryClient";
import type { Job, JobWithScore } from "@shared/schema";
import { JOB_TAXONOMY } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/animations";
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
  Layers,
  Target,
  Loader2,
  DollarSign,
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
  const { track } = useActivityTracker();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const levelParam = urlParams.get("level");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>(levelParam && ["entry", "mid", "senior"].includes(levelParam) ? levelParam : "all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [filterText, setFilterText] = useState("");
  const [searchResults, setSearchResults] = useState<JobWithScore[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showCategories, setShowCategories] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  const [locationSearch, setLocationSearch] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { track({ eventType: "page_view", pagePath: "/jobs" }); }, []);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLocationDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const { data: allJobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    enabled: isAuthenticated,
  });

  const { data: resumeData } = useQuery<{ hasResume: boolean }>({
    queryKey: ["/api/resume"],
    enabled: isAuthenticated,
  });

  const { data: locationsData = [] } = useQuery<{ location: string; count: number }[]>({
    queryKey: ["/api/jobs/locations"],
    enabled: isAuthenticated,
  });

  const normalizeLocation = (loc: string) => {
    const lower = loc.toLowerCase();
    const city = lower.split(",")[0].trim();
    return city;
  };

  const locationGroups = locationsData.reduce((acc, item) => {
    const city = normalizeLocation(item.location);
    if (!acc[city]) acc[city] = { display: item.location.split(",")[0].trim(), count: 0 };
    acc[city].count += item.count;
    return acc;
  }, {} as Record<string, { display: string; count: number }>);

  const uniqueLocations = Object.entries(locationGroups)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([key, val]) => ({ key, display: val.display, count: val.count }));

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

  const formatSalaryRange = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) => {
      if (n >= 1000) return `$${Math.round(n / 1000)}K`;
      return `$${n}`;
    };
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    return `Up to ${fmt(max!)}`;
  };

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

    let matchesLocation = true;
    if (selectedLocation === "remote") {
      matchesLocation = !!job.isRemote || (job.location?.toLowerCase().includes("remote") ?? false);
    } else if (selectedLocation !== "all") {
      const jobCity = normalizeLocation(job.location || "");
      matchesLocation = jobCity === selectedLocation;
    }
    
    return matchesCategory && matchesText && matchesLevel && matchesLocation;
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
        <div className="flex items-center gap-2 sm:gap-4 mb-6 flex-wrap">
          {searchResults && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearchResults(null); setSearchQuery(null); }}
              className="min-h-[44px]"
              data-testid="button-back-search"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              All Jobs
            </Button>
          )}
          <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight" data-testid="text-page-title">
            {searchResults ? `Results for "${searchQuery}"` : "Browse Jobs"}
          </h1>
          <span className="text-sm text-muted-foreground" data-testid="text-job-count">
            {filteredJobs.length} jobs
          </span>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-4 mb-6">
          <div className="flex items-center gap-2 w-full sm:flex-1 sm:w-auto sm:min-w-[200px] sm:max-w-md">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Filter by title, company, or location..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="min-h-[44px]"
              data-testid="input-filter"
            />
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 overflow-x-auto w-full sm:w-auto">
            {SENIORITY_LEVELS.map((level) => (
              <Button
                key={level.value}
                variant={selectedLevel === level.value ? "default" : "ghost"}
                size="sm"
                onClick={() => { setSelectedLevel(level.value); track({ eventType: "filter_change", metadata: { filterType: "level", value: level.value } }); }}
                className="min-h-[44px] whitespace-nowrap shrink-0"
                data-testid={`button-level-${level.value}`}
              >
                {level.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
          {selectedCategory === "all" && (
            <Button
              variant={showCategories ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCategories(!showCategories)}
              className="gap-1 min-h-[44px]"
              data-testid="button-browse-categories"
            >
              <Layers className="h-3 w-3" />
              Categories
              {showCategories ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          )}
          <div className="relative" ref={locationDropdownRef}>
            <Button
              variant={selectedLocation !== "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
              className="gap-1 min-h-[44px]"
              data-testid="button-location-filter"
            >
              <MapPin className="h-3 w-3" />
              {selectedLocation === "all" ? "All Locations" : selectedLocation === "remote" ? "Remote Only" : uniqueLocations.find(l => l.key === selectedLocation)?.display || selectedLocation}
            </Button>
            {locationDropdownOpen && (
              <div className="absolute top-full mt-1 left-0 z-50 w-64 max-h-72 bg-card border rounded-lg shadow-lg overflow-hidden">
                <div className="p-2 border-b">
                  <Input
                    placeholder="Search locations..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="h-8 text-sm"
                    data-testid="input-location-search"
                  />
                </div>
                <div className="overflow-y-auto max-h-52">
                  <button
                    className={`w-full text-left px-3 py-2.5 text-sm hover-elevate min-h-[44px] ${selectedLocation === "all" ? "bg-muted font-medium" : ""}`}
                    onClick={() => { setSelectedLocation("all"); setLocationDropdownOpen(false); setLocationSearch(""); track({ eventType: "filter_change", metadata: { filterType: "location", value: "all" } }); }}
                    data-testid="button-location-all"
                  >
                    All Locations
                  </button>
                  <button
                    className={`w-full text-left px-3 py-2.5 text-sm hover-elevate flex items-center justify-between gap-2 min-h-[44px] ${selectedLocation === "remote" ? "bg-muted font-medium" : ""}`}
                    onClick={() => { setSelectedLocation("remote"); setLocationDropdownOpen(false); setLocationSearch(""); track({ eventType: "filter_change", metadata: { filterType: "location", value: "remote" } }); }}
                    data-testid="button-location-remote"
                  >
                    <span>Remote Only</span>
                    <Badge variant="secondary" className="text-xs">{allJobs.filter(j => j.isRemote).length}</Badge>
                  </button>
                  <div className="border-t my-1" />
                  {uniqueLocations
                    .filter(l => locationSearch === "" || l.display.toLowerCase().includes(locationSearch.toLowerCase()))
                    .map((loc) => (
                    <button
                      key={loc.key}
                      className={`w-full text-left px-3 py-2.5 text-sm hover-elevate flex items-center justify-between gap-2 min-h-[44px] ${selectedLocation === loc.key ? "bg-muted font-medium" : ""}`}
                      onClick={() => { setSelectedLocation(loc.key); setLocationDropdownOpen(false); setLocationSearch(""); track({ eventType: "filter_change", metadata: { filterType: "location", value: loc.key } }); }}
                      data-testid={`button-location-${loc.key}`}
                    >
                      <span className="truncate">{loc.display}</span>
                      <Badge variant="secondary" className="text-xs shrink-0 ml-2">{loc.count}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
          {selectedCategory !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="gap-1 min-h-[44px]"
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
          {selectedLocation !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLocation("all")}
              className="gap-1"
              data-testid="button-clear-location"
            >
              <X className="h-3 w-3" />
              {selectedLocation === "remote" ? "Remote" : uniqueLocations.find(l => l.key === selectedLocation)?.display}
            </Button>
          )}
        </div>

        {selectedCategory === "all" && showCategories && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="flex flex-wrap gap-2">
              {Object.entries(JOB_TAXONOMY).map(([category, data]) => {
                const count = getCategoryCount(category);
                const Icon = getCategoryIcon(data.icon);
                return (
                  <Button
                    key={category}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(category);
                      setExpandedCategories(new Set([category]));
                      setShowCategories(false);
                      track({ eventType: "filter_change", metadata: { filterType: "category", value: category } });
                    }}
                    disabled={count === 0}
                    className={`gap-1.5 ${count === 0 ? "opacity-40" : ""}`}
                    data-testid={`button-category-${category.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {data.shortName}
                    <Badge variant="secondary" className="text-xs ml-0.5">{count}</Badge>
                  </Button>
                );
              })}
            </div>
          </motion.div>
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
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] sm:w-auto max-w-lg"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              data-testid="compare-action-bar"
            >
              <Card className="shadow-lg border-primary/20">
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 py-3 px-4 sm:px-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Target className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-medium text-sm sm:text-base">
                      {selectedJobIds.size} job{selectedJobIds.size > 1 ? "s" : ""} selected
                    </span>
                    {selectedJobIds.size < 2 && (
                      <span className="text-xs sm:text-sm text-muted-foreground">(select at least 2)</span>
                    )}
                    {selectedJobIds.size >= 3 && (
                      <span className="text-xs sm:text-sm text-muted-foreground">(max 3)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      className="min-h-[44px] flex-1 sm:flex-none"
                      data-testid="button-clear-selection"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCompareSelected}
                      disabled={selectedJobIds.size < 2}
                      className="min-h-[44px] flex-1 sm:flex-none"
                      data-testid="button-compare-selected"
                    >
                      <Target className="h-4 w-4 mr-1" />
                      Compare
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

  const formatSalaryRange = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) => {
      if (n >= 1000) return `$${Math.round(n / 1000)}K`;
      return `$${n}`;
    };
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    return `Up to ${fmt(max!)}`;
  };

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
        className="w-full text-left min-h-[44px]"
        data-testid={`button-toggle-${category.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <CardHeader className="flex flex-row items-center gap-2 sm:gap-3 py-3 sm:py-4 hover:bg-muted/30 transition-colors">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">{category}</h3>
              <Badge variant="secondary">{jobs.length}</Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{taxonomy.description}</p>
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
              <div className="space-y-6">
                {Object.entries(jobsBySubcategory)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([subcategory, subJobs]) => (
                    <div key={subcategory} data-testid={`subcategory-${subcategory.replace(/\s+/g, '-').toLowerCase()}`}>
                      <div className="flex items-center gap-3 mb-3 px-1 pb-2 border-b border-border">
                        <h4 className="text-sm font-semibold text-foreground">{subcategory}</h4>
                        <Badge variant="outline" className="text-xs">{subJobs.length}</Badge>
                      </div>
                      <div className="grid gap-2">
                        {subJobs.map((job) => {
                          const salaryDisplay = formatSalaryRange(job.salaryMin, job.salaryMax);
                          return (
                            <div
                              key={job.id}
                              className={`p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer ${selectedJobIds.has(job.id) ? "ring-2 ring-primary bg-primary/5" : ""}`}
                              data-testid={`card-job-${job.id}`}
                              onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button, [role="checkbox"], a')) return;
                                onJobClick(job.id);
                              }}
                            >
                              <div className="flex items-start gap-2 sm:gap-3">
                                <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                                  <Checkbox
                                    checked={selectedJobIds.has(job.id)}
                                    onCheckedChange={() => onToggleSelection(job.id)}
                                    disabled={!selectedJobIds.has(job.id) && selectedJobIds.size >= 3}
                                    className="min-h-[20px] min-w-[20px]"
                                    data-testid={`checkbox-job-${job.id}`}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-medium text-foreground text-sm sm:text-base" data-testid={`text-job-title-${job.id}`}>
                                      {job.title}
                                    </h4>
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onApply(job);
                                      }}
                                      className="min-h-[44px] shrink-0 hidden sm:flex"
                                      data-testid={`button-apply-${job.id}`}
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      Apply
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3 shrink-0" />
                                      <span data-testid={`text-job-company-${job.id}`}>{job.company}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      <span data-testid={`text-job-location-${job.id}`}>{job.location || "Not specified"}</span>
                                    </span>
                                    {salaryDisplay && (
                                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                        <DollarSign className="h-3 w-3 shrink-0" />
                                        <span data-testid={`text-salary-${job.id}`}>{salaryDisplay}</span>
                                      </span>
                                    )}
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
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
                                      {job.aiSummary}
                                    </p>
                                  )}
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onApply(job);
                                    }}
                                    className="min-h-[44px] mt-2 sm:hidden w-full"
                                    data-testid={`button-apply-mobile-${job.id}`}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Apply
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
