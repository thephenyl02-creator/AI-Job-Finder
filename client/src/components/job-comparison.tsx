import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Scale,
  MapPin,
  DollarSign,
  Briefcase,
  TrendingUp,
  Lightbulb,
  FileText
} from "lucide-react";
import { useState } from "react";

interface SkillMatch {
  skill: string;
  status: 'match' | 'partial' | 'missing';
  resumeEvidence?: string;
}

interface ComparisonResult {
  overallScore: number;
  matchSummary: string;
  gapAnalysis: string;
  skillsComparison: SkillMatch[];
  experienceMatch: {
    status: 'match' | 'overqualified' | 'underqualified';
    required: string;
    yours: string;
    explanation: string;
  };
  locationMatch: {
    status: 'match' | 'partial' | 'mismatch';
    jobLocation: string;
    yourPreference: string;
    explanation: string;
  };
  salaryMatch: {
    status: 'match' | 'above' | 'below' | 'unknown';
    jobRange: string;
    yourRange: string;
    explanation: string;
  };
  seniorityMatch: {
    status: 'match' | 'overqualified' | 'underqualified';
    jobLevel: string;
    yourLevel: string;
    explanation: string;
  };
  recommendations: string[];
}

interface JobComparisonProps {
  jobId: number;
  jobTitle: string;
  company: string;
  hasResume: boolean;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'match':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'partial':
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case 'missing':
    case 'mismatch':
    case 'underqualified':
    case 'below':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'overqualified':
    case 'above':
      return <TrendingUp className="h-5 w-5 text-blue-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
}

function ScoreCircle({ score }: { score: number }) {
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="relative w-24 h-24 mx-auto" data-testid="comparison-score-circle">
      <svg className="w-24 h-24 transform -rotate-90">
        <circle
          cx="48"
          cy="48"
          r="40"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-muted/30"
        />
        <circle
          cx="48"
          cy="48"
          r="40"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeDasharray={251.2}
          strokeDashoffset={251.2 - (251.2 * score) / 100}
          className={getScoreColor()}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-2xl font-bold ${getScoreColor()}`} data-testid="text-match-score">{score}%</span>
      </div>
    </div>
  );
}

export function JobComparison({ jobId, jobTitle, company, hasResume }: JobComparisonProps) {
  const [open, setOpen] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  const compareMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/compare/${jobId}`);
      return res.json();
    },
    onSuccess: (data) => {
      setComparison(data);
    },
  });

  const handleCompare = () => {
    if (!comparison) {
      compareMutation.mutate();
    }
  };

  if (!hasResume) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        disabled 
        className="gap-1"
        data-testid="button-compare-disabled"
      >
        <Scale className="h-4 w-4" />
        <span className="hidden sm:inline">Compare</span>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCompare}
          className="gap-1"
          data-testid={`button-compare-job-${jobId}`}
        >
          <Scale className="h-4 w-4" />
          <span className="hidden sm:inline">Compare</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Resume vs Job Comparison
          </DialogTitle>
          <DialogDescription>
            {jobTitle} at {company}
          </DialogDescription>
        </DialogHeader>

        {compareMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing your fit for this role...</p>
          </div>
        )}

        {compareMutation.error && (
          <div className="flex flex-col items-center justify-center py-8 gap-4" data-testid="comparison-error">
            <XCircle className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="font-medium text-destructive">Comparison Failed</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(compareMutation.error as any)?.message || "Please try again"}
              </p>
            </div>
            <Button onClick={() => compareMutation.mutate()} variant="outline" data-testid="button-retry-comparison">
              Try Again
            </Button>
          </div>
        )}

        {comparison && (
          <div className="space-y-6" data-testid="comparison-results">
            <div className="text-center">
              <ScoreCircle score={comparison.overallScore} />
              <p className="mt-3 text-sm text-muted-foreground" data-testid="text-match-summary">{comparison.matchSummary}</p>
            </div>

            <div className="grid gap-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Skills Match
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-4">
                  <div className="space-y-2">
                    {comparison.skillsComparison.length > 0 ? (
                      comparison.skillsComparison.map((skill, i) => (
                        <div key={i} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={skill.status} />
                            <span className="text-sm">{skill.skill}</span>
                          </div>
                          {skill.resumeEvidence && (
                            <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {skill.resumeEvidence}
                            </span>
                          )}
                          {skill.status === 'missing' && (
                            <Badge variant="secondary" className="text-xs">Missing</Badge>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No skills data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                    <div className="flex items-start gap-2">
                      <StatusIcon status={comparison.experienceMatch.status} />
                      <div>
                        <div className="flex gap-4 text-sm">
                          <span><strong>Required:</strong> {comparison.experienceMatch.required}</span>
                          <span><strong>Yours:</strong> {comparison.experienceMatch.yours}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {comparison.experienceMatch.explanation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                    <div className="flex items-start gap-2">
                      <StatusIcon status={comparison.locationMatch.status} />
                      <div>
                        <div className="flex flex-col gap-1 text-sm">
                          <span><strong>Job:</strong> {comparison.locationMatch.jobLocation}</span>
                          <span><strong>You:</strong> {comparison.locationMatch.yourPreference}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {comparison.locationMatch.explanation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Salary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                    <div className="flex items-start gap-2">
                      <StatusIcon status={comparison.salaryMatch.status} />
                      <div>
                        <div className="flex flex-col gap-1 text-sm">
                          <span><strong>Job:</strong> {comparison.salaryMatch.jobRange}</span>
                          <span><strong>You:</strong> {comparison.salaryMatch.yourRange}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {comparison.salaryMatch.explanation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Seniority
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                    <div className="flex items-start gap-2">
                      <StatusIcon status={comparison.seniorityMatch.status} />
                      <div>
                        <div className="flex gap-4 text-sm">
                          <span><strong>Job:</strong> {comparison.seniorityMatch.jobLevel}</span>
                          <span><strong>You:</strong> {comparison.seniorityMatch.yourLevel}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {comparison.seniorityMatch.explanation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {comparison.gapAnalysis && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Gap Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                    <p className="text-sm text-muted-foreground">{comparison.gapAnalysis}</p>
                  </CardContent>
                </Card>
              )}

              {comparison.recommendations.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                    <ul className="space-y-2">
                      {comparison.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
