import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Target,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Wrench,
  TrendingUp,
  Lightbulb,
  AlertCircle,
  Zap,
  Eye,
  MapPin,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BatchMatchResult {
  jobId: number;
  title: string;
  company: string;
  location: string | null;
  isRemote: boolean | null;
  matchScore: number;
  tweakPercentage: number;
  brutalVerdict: string;
  matchHighlights: string[];
  gapSummary: string;
  topMissingSkills: string[];
}

interface ResumeTweakResult {
  jobId: number;
  overallFit: number;
  tweakPercentage: number;
  brutalAssessment: string;
  descriptionAlignment: Array<{
    requirement: string;
    status: "match" | "partial" | "missing";
    resumeEvidence: string | null;
    tweakSuggestion: string | null;
  }>;
  resumeEdits: Array<{
    section: string;
    currentContent: string;
    suggestedChange: string;
    reason: string;
    impact: "high" | "medium" | "low";
  }>;
  skillsToAdd: Array<{
    skill: string;
    howToFrame: string;
    isRealistic: boolean;
  }>;
  overallStrategy: string;
  honestWarnings: string[];
}

function ScoreBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80)
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    if (score >= 60)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold ${getColor()}`}
    >
      {score}%
    </span>
  );
}

function TweakBadge({ percentage }: { percentage: number }) {
  const getColor = () => {
    if (percentage <= 20)
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    if (percentage <= 50)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  };

  const getLabel = () => {
    if (percentage <= 15) return "Ready to apply";
    if (percentage <= 30) return "Minor tweaks";
    if (percentage <= 50) return "Moderate edits";
    return "Major rewrite";
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getColor()}`}
    >
      <Wrench className="h-3 w-3" />
      {percentage}% tweak - {getLabel()}
    </span>
  );
}

function AlignmentIcon({ status }: { status: string }) {
  switch (status) {
    case "match":
      return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
    case "partial":
      return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
    case "missing":
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function ImpactBadge({ impact }: { impact: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    medium:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <Badge variant="secondary" className={`text-xs ${colors[impact] || ""}`}>
      {impact} impact
    </Badge>
  );
}

function MatchCard({
  match,
  onTweak,
  onViewJob,
}: {
  match: BatchMatchResult;
  onTweak: () => void;
  onViewJob: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className="overflow-visible"
      data-testid={`card-match-${match.jobId}`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3
                  className="font-medium text-foreground"
                  data-testid={`text-match-title-${match.jobId}`}
                >
                  {match.title}
                </h3>
                <ScoreBadge score={match.matchScore} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {match.company}
                </span>
                {(match.location || match.isRemote) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {match.isRemote
                      ? "Remote"
                      : match.location || "Not specified"}
                  </span>
                )}
              </div>
              <TweakBadge percentage={match.tweakPercentage} />
            </div>
          </div>

          <p
            className="text-sm text-foreground"
            data-testid={`text-verdict-${match.jobId}`}
          >
            {match.brutalVerdict}
          </p>

          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground w-full justify-start"
                data-testid={`button-expand-match-${match.jobId}`}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {expanded ? "Less detail" : "More detail"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 pt-2">
                {match.matchHighlights.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      What matches
                    </p>
                    <div className="space-y-1">
                      {match.matchHighlights.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {match.gapSummary && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      What's missing
                    </p>
                    <p className="text-sm text-foreground">
                      {match.gapSummary}
                    </p>
                  </div>
                )}

                {match.topMissingSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {match.topMissingSkills.map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        <XCircle className="h-3 w-3 mr-1 text-red-500" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={onTweak}
              className="gap-1.5"
              data-testid={`button-tweak-resume-${match.jobId}`}
            >
              <Wrench className="h-3.5 w-3.5" />
              Tweak Resume for This Job
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewJob}
              className="gap-1.5"
              data-testid={`button-view-job-${match.jobId}`}
            >
              <Eye className="h-3.5 w-3.5" />
              View Job
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ResumeTweakPanel({
  tweaks,
  isLoading,
  jobTitle,
  company,
}: {
  tweaks: ResumeTweakResult | null;
  isLoading: boolean;
  jobTitle: string;
  company: string;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium text-foreground">
            Analyzing your resume against this job...
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Checking every requirement and finding realistic tweaks
          </p>
        </div>
      </div>
    );
  }

  if (!tweaks) return null;

  const matchCount =
    tweaks.descriptionAlignment?.filter((d) => d.status === "match").length || 0;
  const partialCount =
    tweaks.descriptionAlignment?.filter((d) => d.status === "partial").length || 0;
  const missingCount =
    tweaks.descriptionAlignment?.filter((d) => d.status === "missing").length || 0;
  const totalReqs = tweaks.descriptionAlignment?.length || 1;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <ScoreBadge score={tweaks.overallFit} />
          <TweakBadge percentage={tweaks.tweakPercentage} />
        </div>
        <p
          className="text-sm text-foreground max-w-lg mx-auto"
          data-testid="text-brutal-assessment"
        >
          {tweaks.brutalAssessment}
        </p>
      </div>

      {tweaks.honestWarnings && tweaks.honestWarnings.length > 0 && (
        <Card className="border-red-200 dark:border-red-800/40">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Honest Warnings
                </p>
                <ul className="space-y-1.5">
                  {tweaks.honestWarnings.map((warning, i) => (
                    <li key={i} className="text-sm text-foreground">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-foreground" />
          <h4 className="text-sm font-medium text-foreground">
            Requirements Alignment
          </h4>
        </div>
        <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            {matchCount} match
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            {partialCount} partial
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-500" />
            {missingCount} missing
          </span>
        </div>
        <Progress
          value={(matchCount / totalReqs) * 100}
          className="h-2 mb-4"
          data-testid="progress-alignment"
        />
        <div className="space-y-2">
          {(tweaks.descriptionAlignment || []).map((item, i) => (
            <div
              key={i}
              className="border border-border rounded-md p-3"
              data-testid={`alignment-item-${i}`}
            >
              <div className="flex items-start gap-2">
                <AlignmentIcon status={item.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.requirement}
                  </p>
                  {item.resumeEvidence && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Your resume: {item.resumeEvidence}
                    </p>
                  )}
                  {item.tweakSuggestion && (
                    <div className="mt-1.5 flex items-start gap-1.5">
                      <Lightbulb className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">
                        {item.tweakSuggestion}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {tweaks.resumeEdits && tweaks.resumeEdits.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="h-4 w-4 text-foreground" />
            <h4 className="text-sm font-medium text-foreground">
              Suggested Resume Edits
            </h4>
          </div>
          <div className="space-y-3">
            {tweaks.resumeEdits.map((edit, i) => (
              <Card key={i} data-testid={`edit-suggestion-${i}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">
                      {edit.section}
                    </p>
                    <ImpactBadge impact={edit.impact} />
                  </div>
                  <div className="space-y-2">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-md p-2.5">
                      <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                        Current
                      </p>
                      <p className="text-sm text-foreground line-through opacity-70">
                        {edit.currentContent}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-md p-2.5">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                        Suggested
                      </p>
                      <p className="text-sm text-foreground">
                        {edit.suggestedChange}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {edit.reason}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tweaks.skillsToAdd && tweaks.skillsToAdd.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-foreground" />
              <h4 className="text-sm font-medium text-foreground">
                Skills to Consider
              </h4>
            </div>
            <div className="space-y-2">
              {tweaks.skillsToAdd.map((skill, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 border border-border rounded-md"
                  data-testid={`skill-suggestion-${i}`}
                >
                  {skill.isRealistic ? (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {skill.skill}
                      </span>
                      {skill.isRealistic ? (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        >
                          Can honestly add
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                        >
                          Gap - needs development
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {skill.howToFrame}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tweaks.overallStrategy && (
        <>
          <Separator />
          <Card className="bg-muted/40">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Overall Strategy
                  </p>
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid="text-overall-strategy"
                  >
                    {tweaks.overallStrategy}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export function ResumeMatches({ hasResume }: { hasResume: boolean }) {
  const [, setLocation] = useLocation();
  const [selectedJob, setSelectedJob] = useState<BatchMatchResult | null>(null);
  const [tweakSheetOpen, setTweakSheetOpen] = useState(false);

  const {
    data: matchData,
    isLoading: matchesLoading,
    error: matchesError,
  } = useQuery<{ matches: BatchMatchResult[] }>({
    queryKey: ["/api/resume/match-jobs"],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/resume/match-jobs");
      return res.json();
    },
    enabled: hasResume,
    staleTime: 5 * 60 * 1000,
  });

  const tweakMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/resume/tweak/${jobId}`);
      return res.json() as Promise<ResumeTweakResult>;
    },
  });

  const handleTweak = (match: BatchMatchResult) => {
    setSelectedJob(match);
    setTweakSheetOpen(true);
    tweakMutation.mutate(match.jobId);
  };

  const handleViewJob = (jobId: number) => {
    setLocation(`/jobs/${jobId}`);
  };

  if (!hasResume) return null;

  const matches = matchData?.matches || [];

  return (
    <div className="space-y-4" data-testid="section-resume-matches">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-serif font-medium text-foreground">
            Your Resume Matches
          </h2>
        </div>
        {matchesLoading && (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Analyzing...
          </Badge>
        )}
      </div>

      {matchesLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Matching your resume against all positions...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pre-filtering, scoring, and generating honest assessments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {matchesError && (
        <Card>
          <CardContent className="py-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Could not match your resume right now. Try your search instead.
            </p>
          </CardContent>
        </Card>
      )}

      {!matchesLoading && !matchesError && matches.length === 0 && hasResume && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No strong matches found. Try using the search above for broader
              results.
            </p>
          </CardContent>
        </Card>
      )}

      {!matchesLoading && matches.length > 0 && (
        <AnimatePresence>
          <div className="space-y-3">
            {matches.map((match, idx) => (
              <motion.div
                key={match.jobId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.3 }}
              >
                <MatchCard
                  match={match}
                  onTweak={() => handleTweak(match)}
                  onViewJob={() => handleViewJob(match.jobId)}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      <Sheet open={tweakSheetOpen} onOpenChange={setTweakSheetOpen}>
        <SheetContent
          className="w-full sm:max-w-xl"
          data-testid="sheet-resume-tweaker"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-left">
              <Wrench className="h-5 w-5" />
              Resume Tweaker
            </SheetTitle>
            <SheetDescription className="text-left">
              {selectedJob
                ? `${selectedJob.title} at ${selectedJob.company}`
                : ""}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] mt-4 pr-4">
            <ResumeTweakPanel
              tweaks={tweakMutation.data || null}
              isLoading={tweakMutation.isPending}
              jobTitle={selectedJob?.title || ""}
              company={selectedJob?.company || ""}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
