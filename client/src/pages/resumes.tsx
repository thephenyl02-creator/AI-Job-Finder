import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Resume, ResumeExtractedData } from "@shared/schema";
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  Star,
  Plus,
  X,
  Pencil,
  Check,
  Target,
  TrendingUp,
  Briefcase,
  MapPin,
  Building2,
  Eye,
  ChevronDown,
  ChevronRight,
  Wrench,
  Zap,
  ArrowRight,
} from "lucide-react";

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

interface ResumeMatchResult {
  resumeId: number;
  label: string;
  matches: BatchMatchResult[];
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getColor()}`}
    >
      {score}%
    </span>
  );
}

function ResumeCard({
  resume,
  onDelete,
  onSetPrimary,
  onEditLabel,
  isDeleting,
}: {
  resume: Resume;
  onDelete: (id: number) => void;
  onSetPrimary: (id: number) => void;
  onEditLabel: (id: number, label: string) => void;
  isDeleting: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(resume.label);
  const extracted = resume.extractedData as ResumeExtractedData | null;

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== resume.label) {
      onEditLabel(resume.id, editValue.trim());
    }
    setEditing(false);
  };

  return (
    <Card
      className="overflow-visible"
      data-testid={`card-resume-${resume.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              {editing ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-7 text-sm w-40"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    autoFocus
                    data-testid={`input-edit-label-${resume.id}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSave}
                    data-testid={`button-save-label-${resume.id}`}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <span
                  className="font-medium text-foreground text-sm truncate cursor-pointer hover:underline"
                  onClick={() => {
                    setEditValue(resume.label);
                    setEditing(true);
                  }}
                  data-testid={`text-resume-label-${resume.id}`}
                >
                  {resume.label}
                </span>
              )}
              {resume.isPrimary && (
                <Badge variant="secondary" className="text-xs" data-testid={`badge-primary-${resume.id}`}>
                  <Star className="h-3 w-3 mr-1" />
                  Primary
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {resume.filename}
            </p>
            {extracted?.skills && extracted.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {extracted.skills.slice(0, 5).map((skill: string) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="text-xs"
                  >
                    {skill}
                  </Badge>
                ))}
                {extracted.skills.length > 5 && (
                  <span className="text-xs text-muted-foreground">
                    +{extracted.skills.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!editing && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setEditValue(resume.label);
                  setEditing(true);
                }}
                data-testid={`button-edit-label-${resume.id}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {!resume.isPrimary && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onSetPrimary(resume.id)}
                data-testid={`button-set-primary-${resume.id}`}
              >
                <Star className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(resume.id)}
              disabled={isDeleting}
              data-testid={`button-delete-resume-${resume.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MatchJobCard({
  match,
  resumeLabels,
}: {
  match: BatchMatchResult & { resumeId?: number; resumeLabel?: string; allScores?: Array<{ resumeId: number; label: string; score: number }> };
  resumeLabels?: Map<number, string>;
}) {
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className="overflow-visible"
      data-testid={`card-match-job-${match.jobId}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4
                className="font-medium text-foreground text-sm"
                data-testid={`text-match-job-title-${match.jobId}`}
              >
                {match.title}
              </h4>
              <ScoreBadge score={match.matchScore} />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {match.company}
              </span>
              {match.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {match.location}
                </span>
              )}
              {match.isRemote && (
                <Badge variant="outline" className="text-xs">Remote</Badge>
              )}
            </div>
            {match.allScores && match.allScores.length > 1 && (
              <div className="mt-2">
                <button
                  className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => setExpanded(!expanded)}
                  data-testid={`button-expand-scores-${match.jobId}`}
                >
                  {expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Scores across {match.allScores.length} resumes
                </button>
                {expanded && (
                  <div className="mt-1.5 space-y-1">
                    {match.allScores
                      .sort((a, b) => b.score - a.score)
                      .map((s) => (
                        <div
                          key={s.resumeId}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="text-muted-foreground truncate max-w-[120px]">
                            {s.label}
                          </span>
                          <div className="flex-1 max-w-[100px]">
                            <Progress
                              value={s.score}
                              className="h-1.5"
                            />
                          </div>
                          <ScoreBadge score={s.score} />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 italic">
              {match.brutalVerdict}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/jobs/${match.jobId}`)}
            data-testid={`button-view-job-${match.jobId}`}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadForm({
  onClose,
  existingCount,
}: {
  onClose: () => void;
  existingCount: number;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, label }: { file: File; label: string }) => {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("label", label);
      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      toast({ title: "Resume uploaded", description: "Your resume has been parsed and saved." });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: "No file selected", description: "Please select a resume file.", variant: "destructive" });
      return;
    }
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF or Word document.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }
    uploadMutation.mutate({
      file,
      label: label.trim() || file.name.replace(/\.[^/.]+$/, ""),
    });
  };

  return (
    <Card className="overflow-visible" data-testid="card-upload-form">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Upload Resume</h3>
            <Button
              size="icon"
              variant="ghost"
              type="button"
              onClick={onClose}
              data-testid="button-close-upload"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Litigation Tech Focus, Compliance Resume"
              className="text-sm"
              data-testid="input-resume-label"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Give it a name that describes its focus or target role
            </p>
          </div>
          <div
            className={`border-2 border-dashed rounded-md p-6 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone-resume"
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.docx,.doc"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) setFile(selected);
              }}
              data-testid="input-resume-file"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm text-foreground font-medium">
                  {file.name}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Drop your resume here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF or Word documents, max 5MB
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!file || uploadMutation.isPending}
              data-testid="button-upload-resume"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MatchDashboard({ results }: { results: ResumeMatchResult[] }) {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"by-resume" | "best-fit">("best-fit");
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);

  const activeResults = results.filter((r) => r.matches.length > 0);

  if (activeResults.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          No matches found. Try uploading resumes with different focuses.
        </p>
      </div>
    );
  }

  const resumeStats = activeResults.map((r) => {
    const strongMatches = r.matches.filter((m) => m.matchScore >= 70);
    const avgScore =
      r.matches.length > 0
        ? Math.round(
            r.matches.reduce((sum, m) => sum + m.matchScore, 0) /
              r.matches.length,
          )
        : 0;
    const topCategories = new Map<string, number>();
    r.matches.forEach((m) => {
      const key = m.company;
      topCategories.set(key, (topCategories.get(key) || 0) + 1);
    });
    return {
      resumeId: r.resumeId,
      label: r.label,
      totalMatches: r.matches.length,
      strongMatches: strongMatches.length,
      avgScore,
      bestMatch: r.matches[0],
    };
  });

  const bestFitByJob = new Map<
    number,
    {
      jobId: number;
      title: string;
      company: string;
      location: string | null;
      isRemote: boolean | null;
      bestScore: number;
      bestResumeId: number;
      bestResumeLabel: string;
      brutalVerdict: string;
      matchHighlights: string[];
      gapSummary: string;
      topMissingSkills: string[];
      tweakPercentage: number;
      allScores: Array<{ resumeId: number; label: string; score: number }>;
    }
  >();

  activeResults.forEach((r) => {
    r.matches.forEach((m) => {
      const existing = bestFitByJob.get(m.jobId);
      const scoreEntry = { resumeId: r.resumeId, label: r.label, score: m.matchScore };
      if (!existing) {
        bestFitByJob.set(m.jobId, {
          jobId: m.jobId,
          title: m.title,
          company: m.company,
          location: m.location,
          isRemote: m.isRemote,
          bestScore: m.matchScore,
          bestResumeId: r.resumeId,
          bestResumeLabel: r.label,
          brutalVerdict: m.brutalVerdict,
          matchHighlights: m.matchHighlights,
          gapSummary: m.gapSummary,
          topMissingSkills: m.topMissingSkills,
          tweakPercentage: m.tweakPercentage,
          allScores: [scoreEntry],
        });
      } else {
        existing.allScores.push(scoreEntry);
        if (m.matchScore > existing.bestScore) {
          existing.bestScore = m.matchScore;
          existing.bestResumeId = r.resumeId;
          existing.bestResumeLabel = r.label;
          existing.brutalVerdict = m.brutalVerdict;
          existing.matchHighlights = m.matchHighlights;
          existing.gapSummary = m.gapSummary;
          existing.topMissingSkills = m.topMissingSkills;
          existing.tweakPercentage = m.tweakPercentage;
        }
      }
    });
  });

  const sortedBestFit = Array.from(bestFitByJob.values()).sort(
    (a, b) => b.bestScore - a.bestScore,
  );

  const multiResumeJobs = sortedBestFit.filter(
    (j) => j.allScores.length > 1,
  );

  const selectedResume = selectedResumeId
    ? activeResults.find((r) => r.resumeId === selectedResumeId)
    : activeResults[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {resumeStats.map((stat) => (
          <Card
            key={stat.resumeId}
            className={`overflow-visible cursor-pointer transition-colors ${
              view === "by-resume" && selectedResume?.resumeId === stat.resumeId
                ? "ring-2 ring-primary"
                : ""
            }`}
            onClick={() => {
              setView("by-resume");
              setSelectedResumeId(stat.resumeId);
            }}
            data-testid={`card-resume-stat-${stat.resumeId}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {stat.label}
                </span>
                <span className="text-lg font-bold text-foreground">
                  {stat.avgScore}%
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {stat.totalMatches} matches
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {stat.strongMatches} strong
                </span>
              </div>
              {stat.bestMatch && (
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  Best: {stat.bestMatch.title} ({stat.bestMatch.matchScore}%)
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={view === "best-fit" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("best-fit")}
          data-testid="button-view-best-fit"
        >
          <Target className="h-4 w-4 mr-1" />
          Best Resume per Job
        </Button>
        <Button
          variant={view === "by-resume" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setView("by-resume");
            if (!selectedResumeId && activeResults.length > 0) {
              setSelectedResumeId(activeResults[0].resumeId);
            }
          }}
          data-testid="button-view-by-resume"
        >
          <FileText className="h-4 w-4 mr-1" />
          By Resume
        </Button>
      </div>

      {view === "best-fit" && (
        <div className="space-y-4">
          {multiResumeJobs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Jobs matched by multiple resumes
              </h3>
              <p className="text-xs text-muted-foreground">
                These roles fit you from multiple angles -- strong signals
              </p>
              <div className="space-y-2">
                {multiResumeJobs.slice(0, 5).map((job) => (
                  <MatchJobCard
                    key={`multi-${job.jobId}`}
                    match={{
                      jobId: job.jobId,
                      title: job.title,
                      company: job.company,
                      location: job.location,
                      isRemote: job.isRemote,
                      matchScore: job.bestScore,
                      tweakPercentage: job.tweakPercentage,
                      brutalVerdict: job.brutalVerdict,
                      matchHighlights: job.matchHighlights,
                      gapSummary: job.gapSummary,
                      topMissingSkills: job.topMissingSkills,
                      resumeId: job.bestResumeId,
                      resumeLabel: job.bestResumeLabel,
                      allScores: job.allScores,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {multiResumeJobs.length > 0 && sortedBestFit.length > multiResumeJobs.length && (
            <Separator />
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              All jobs ranked by best match
            </h3>
            <div className="space-y-2">
              {sortedBestFit.slice(0, 15).map((job) => (
                <MatchJobCard
                  key={`best-${job.jobId}`}
                  match={{
                    jobId: job.jobId,
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    isRemote: job.isRemote,
                    matchScore: job.bestScore,
                    tweakPercentage: job.tweakPercentage,
                    brutalVerdict: job.brutalVerdict,
                    matchHighlights: job.matchHighlights,
                    gapSummary: job.gapSummary,
                    topMissingSkills: job.topMissingSkills,
                    resumeId: job.bestResumeId,
                    resumeLabel: job.bestResumeLabel,
                    allScores: job.allScores,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "by-resume" && selectedResume && (
        <div className="space-y-3">
          {activeResults.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeResults.map((r) => (
                <Button
                  key={r.resumeId}
                  variant={
                    selectedResume.resumeId === r.resumeId
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedResumeId(r.resumeId)}
                  data-testid={`button-select-resume-${r.resumeId}`}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          )}
          <h3 className="text-sm font-medium text-foreground">
            Top matches for "{selectedResume.label}"
          </h3>
          <div className="space-y-2">
            {selectedResume.matches.slice(0, 15).map((match) => (
              <MatchJobCard
                key={match.jobId}
                match={match}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Resumes() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showUpload, setShowUpload] = useState(false);

  const {
    data: userResumes = [],
    isLoading: resumesLoading,
  } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
    enabled: isAuthenticated,
  });

  const {
    data: matchResults,
    isLoading: matchLoading,
    refetch: runMatch,
    isFetching: matchFetching,
  } = useQuery<{ results: ResumeMatchResult[] }>({
    queryKey: ["/api/resumes/match-all"],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/resumes/match-all");
      return res.json();
    },
    enabled: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/resumes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      toast({ title: "Resume deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/resumes/${id}/set-primary`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      toast({ title: "Primary resume updated" });
    },
  });

  const editLabelMutation = useMutation({
    mutationFn: async ({ id, label }: { id: number; label: string }) => {
      await apiRequest("PATCH", `/api/resumes/${id}`, { label });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h1
            className="text-2xl font-bold text-foreground tracking-tight font-serif"
            data-testid="text-resumes-title"
          >
            My Resumes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload different versions of your resume to see which jobs match each one best.
            Lawyers often have multiple career angles -- see which path has the strongest opportunities.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">
                Resumes ({userResumes.length}/5)
              </h2>
              {userResumes.length < 5 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUpload(true)}
                  data-testid="button-add-resume"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>

            {showUpload && (
              <UploadForm
                onClose={() => setShowUpload(false)}
                existingCount={userResumes.length}
              />
            )}

            {resumesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : userResumes.length === 0 && !showUpload ? (
              <Card className="overflow-visible">
                <CardContent className="p-6 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p
                    className="text-sm text-muted-foreground mb-3"
                    data-testid="text-no-resumes"
                  >
                    No resumes uploaded yet
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowUpload(true)}
                    data-testid="button-upload-first"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload Your First Resume
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {userResumes.map((resume) => (
                  <ResumeCard
                    key={resume.id}
                    resume={resume}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onSetPrimary={(id) => setPrimaryMutation.mutate(id)}
                    onEditLabel={(id, label) =>
                      editLabelMutation.mutate({ id, label })
                    }
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            )}

            {userResumes.length >= 1 && (
              <Button
                className="w-full"
                onClick={() => runMatch()}
                disabled={matchLoading || matchFetching}
                data-testid="button-run-match"
              >
                {matchLoading || matchFetching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing matches...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Find Matching Jobs
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="lg:col-span-2">
            {matchLoading || matchFetching ? (
              <Card className="overflow-visible">
                <CardContent className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-sm font-medium text-foreground">
                    Matching your resumes against available jobs...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This may take a moment depending on how many resumes you have
                  </p>
                </CardContent>
              </Card>
            ) : matchResults?.results ? (
              <MatchDashboard results={matchResults.results} />
            ) : (
              <Card className="overflow-visible">
                <CardContent className="p-8 text-center">
                  <Target className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <h3
                    className="font-medium text-foreground mb-1"
                    data-testid="text-match-prompt"
                  >
                    Ready to find your best matches
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    {userResumes.length === 0
                      ? "Upload at least one resume, then click \"Find Matching Jobs\" to see which positions fit you best."
                      : userResumes.length === 1
                        ? "You have 1 resume. Upload additional versions targeting different roles to compare results, or click \"Find Matching Jobs\" to start."
                        : `You have ${userResumes.length} resumes. Click "Find Matching Jobs" to see which positions match each version best.`}
                  </p>
                  {userResumes.length > 0 && (
                    <Button
                      onClick={() => runMatch()}
                      disabled={matchLoading || matchFetching}
                      data-testid="button-run-match-main"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Find Matching Jobs
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
