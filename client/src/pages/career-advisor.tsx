import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Briefcase, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Lightbulb,
  FileText,
  Scale
} from "lucide-react";

interface JobInput {
  id: string;
  title: string;
  description: string;
}

interface JobAnalysis {
  jobTitle: string;
  mainResponsibilities: string[];
  requiredSkills: string[];
  workType: {
    structured: number;
    ambiguous: number;
    description: string;
  };
  growthOpportunities: string[];
  transitionDifficulty: {
    level: "Easy" | "Moderate" | "Challenging" | "Difficult";
    explanation: string;
  };
  whoSucceeds: string[];
  fitAnalysis?: {
    overallFit: number;
    strengths: string[];
    gaps: string[];
    resumePositioning: string[];
    interviewRisks: string[];
  };
}

interface ComparisonResult {
  jobs: JobAnalysis[];
  recommendation: {
    bestFitNow: {
      jobTitle: string;
      reason: string;
    };
    bestLongTerm: {
      jobTitle: string;
      reason: string;
    };
    biggestShift: {
      jobTitle: string;
      reason: string;
    };
  };
  overallStrategy: string;
}

export default function CareerAdvisor() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobInput[]>([
    { id: "1", title: "", description: "" },
    { id: "2", title: "", description: "" },
  ]);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const { data: resumeData } = useQuery<{ hasResume: boolean; extractedData?: any }>({
    queryKey: ["/api/resume"],
    enabled: isAuthenticated,
  });

  const compareMutation = useMutation({
    mutationFn: async (data: { jobs: JobInput[]; includeResume: boolean }) => {
      const response = await apiRequest("POST", "/api/career-advisor/compare", data);
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: () => {
      toast({
        title: "Analysis failed",
        description: "Please try again with different job descriptions.",
        variant: "destructive",
      });
    },
  });

  const addJob = () => {
    if (jobs.length < 3) {
      setJobs([...jobs, { id: String(Date.now()), title: "", description: "" }]);
    }
  };

  const removeJob = (id: string) => {
    if (jobs.length > 2) {
      setJobs(jobs.filter((j) => j.id !== id));
    }
  };

  const updateJob = (id: string, field: "title" | "description", value: string) => {
    setJobs(jobs.map((j) => (j.id === id ? { ...j, [field]: value } : j)));
  };

  const handleCompare = () => {
    const validJobs = jobs.filter((j) => j.description.trim().length > 50);
    if (validJobs.length < 2) {
      toast({
        title: "Need more job descriptions",
        description: "Please provide at least 2 job descriptions with sufficient detail.",
        variant: "destructive",
      });
      return;
    }
    compareMutation.mutate({ jobs: validJobs, includeResume: resumeData?.hasResume ?? false });
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-normal text-foreground mb-2">
            Career Advisor
          </h1>
          <p className="text-muted-foreground">
            Compare job opportunities and get personalized career guidance
          </p>
        </div>

        {!result ? (
          <div className="space-y-6">
            {resumeData?.hasResume && (
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <CardContent className="flex items-center gap-3 py-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">Resume detected</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Your analysis will include personalized fit assessments for each role
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!resumeData?.hasResume && (
              <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                <CardContent className="flex items-center gap-3 py-4">
                  <FileText className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">No resume uploaded</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Upload a resume from the search page to get personalized fit analysis
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job, index) => (
                <Card key={job.id} data-testid={`card-job-input-${index}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Job {index + 1}</CardTitle>
                      {jobs.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeJob(job.id)}
                          data-testid={`button-remove-job-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Job Title (optional)
                      </label>
                      <Input
                        value={job.title}
                        onChange={(e) => updateJob(job.id, "title", e.target.value)}
                        placeholder="e.g., Senior Product Manager"
                        className="mt-1"
                        data-testid={`input-job-title-${index}`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Job Description
                      </label>
                      <Textarea
                        value={job.description}
                        onChange={(e) => updateJob(job.id, "description", e.target.value)}
                        placeholder="Paste the full job description here..."
                        className="mt-1 min-h-[200px] resize-none"
                        data-testid={`input-job-description-${index}`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {job.description.length} characters
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {jobs.length < 3 && (
                <Card
                  className="border-dashed cursor-pointer hover-elevate flex items-center justify-center min-h-[300px]"
                  onClick={addJob}
                  data-testid="button-add-job"
                >
                  <div className="text-center text-muted-foreground">
                    <Plus className="h-8 w-8 mx-auto mb-2" />
                    <p>Add another job</p>
                    <p className="text-xs">Compare up to 3 roles</p>
                  </div>
                </Card>
              )}
            </div>

            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                onClick={handleCompare}
                disabled={compareMutation.isPending || jobs.filter((j) => j.description.length > 50).length < 2}
                className="gap-2"
                data-testid="button-compare-jobs"
              >
                {compareMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing careers...
                  </>
                ) : (
                  <>
                    <Scale className="h-4 w-4" />
                    Compare Jobs
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <ComparisonResults 
            result={result} 
            onReset={() => setResult(null)} 
            hasResume={resumeData?.hasResume ?? false}
          />
        )}
      </main>
    </div>
  );
}

function ComparisonResults({ 
  result, 
  onReset,
  hasResume 
}: { 
  result: ComparisonResult; 
  onReset: () => void;
  hasResume: boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif">Career Analysis</h2>
        <Button variant="outline" onClick={onReset} data-testid="button-new-comparison">
          New Comparison
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-background rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Best Fit Now</span>
              </div>
              <p className="font-medium">{result.recommendation.bestFitNow.jobTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">{result.recommendation.bestFitNow.reason}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">Best Long-Term</span>
              </div>
              <p className="font-medium">{result.recommendation.bestLongTerm.jobTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">{result.recommendation.bestLongTerm.reason}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-muted-foreground">Biggest Shift</span>
              </div>
              <p className="font-medium">{result.recommendation.biggestShift.jobTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">{result.recommendation.biggestShift.reason}</p>
            </div>
          </div>
          <div className="p-4 bg-background rounded-lg border">
            <p className="text-sm font-medium mb-1">Strategic Advice</p>
            <p className="text-muted-foreground">{result.overallStrategy}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comparison" data-testid="tab-comparison">Side-by-Side Comparison</TabsTrigger>
          <TabsTrigger value="detailed" data-testid="tab-detailed">Detailed Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground w-48">Aspect</th>
                  {result.jobs.map((job, i) => (
                    <th key={i} className="text-left p-4 font-medium">
                      {job.jobTitle}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 font-medium text-muted-foreground">Work Type</td>
                  {result.jobs.map((job, i) => (
                    <td key={i} className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={job.workType.structured > 50 ? "default" : "secondary"}>
                          {job.workType.structured}% Structured
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{job.workType.description}</p>
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium text-muted-foreground">Transition Difficulty</td>
                  {result.jobs.map((job, i) => (
                    <td key={i} className="p-4">
                      <Badge
                        variant={
                          job.transitionDifficulty.level === "Easy" ? "default" :
                          job.transitionDifficulty.level === "Moderate" ? "secondary" :
                          "outline"
                        }
                      >
                        {job.transitionDifficulty.level}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {job.transitionDifficulty.explanation}
                      </p>
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium text-muted-foreground">Key Skills</td>
                  {result.jobs.map((job, i) => (
                    <td key={i} className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {job.requiredSkills.slice(0, 5).map((skill, j) => (
                          <Badge key={j} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium text-muted-foreground">Growth Path</td>
                  {result.jobs.map((job, i) => (
                    <td key={i} className="p-4">
                      <ul className="text-sm space-y-1">
                        {job.growthOpportunities.slice(0, 3).map((opp, j) => (
                          <li key={j} className="flex items-start gap-1">
                            <ArrowRight className="h-3 w-3 mt-1 text-muted-foreground shrink-0" />
                            <span>{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
                {hasResume && result.jobs[0].fitAnalysis && (
                  <tr className="border-b bg-muted/30">
                    <td className="p-4 font-medium text-muted-foreground">Your Fit Score</td>
                    {result.jobs.map((job, i) => (
                      <td key={i} className="p-4">
                        {job.fitAnalysis && (
                          <div className="flex items-center gap-2">
                            <div className="relative w-12 h-12">
                              <svg className="w-12 h-12 transform -rotate-90">
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="text-muted"
                                />
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  strokeDasharray={`${job.fitAnalysis.overallFit * 1.25} 125`}
                                  className={
                                    job.fitAnalysis.overallFit >= 80 ? "text-green-500" :
                                    job.fitAnalysis.overallFit >= 60 ? "text-amber-500" :
                                    "text-red-500"
                                  }
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                                {job.fitAnalysis.overallFit}%
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.jobs.map((job, i) => (
              <Card key={i} data-testid={`card-job-analysis-${i}`}>
                <CardHeader>
                  <CardTitle>{job.jobTitle}</CardTitle>
                  <CardDescription>
                    {job.transitionDifficulty.level} transition
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      Main Responsibilities
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {job.mainResponsibilities.map((resp, j) => (
                        <li key={j}>• {resp}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Who Succeeds</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {job.whoSucceeds.map((trait, j) => (
                        <li key={j}>• {trait}</li>
                      ))}
                    </ul>
                  </div>

                  {hasResume && job.fitAnalysis && (
                    <>
                      <div className="pt-2 border-t">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Your Strengths
                        </h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {job.fitAnalysis.strengths.map((s, j) => (
                            <li key={j}>• {s}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Gaps to Address
                        </h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {job.fitAnalysis.gaps.map((g, j) => (
                            <li key={j}>• {g}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          Interview Risks
                        </h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {job.fitAnalysis.interviewRisks.map((r, j) => (
                            <li key={j}>• {r}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <Lightbulb className="h-4 w-4 text-primary" />
                          Resume Positioning
                        </h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {job.fitAnalysis.resumePositioning.map((p, j) => (
                            <li key={j}>• {p}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
