import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuth } from "@/hooks/use-auth";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, ArrowLeft, CheckCircle, AlertTriangle, Undo2, Redo2,
  Download, FileText, FileDown, Package, RotateCcw, X, Sparkles,
  Plus, Diff, Info, PanelRightClose, PanelRightOpen, ChevronLeft,
  ChevronRight, ChevronUp, ChevronDown, CircleCheck, CircleDashed, CircleMinus, Shield,
  Wrench, Star, Eye, EyeOff, ExternalLink, Trash2, HelpCircle,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { EditorSections, EditorBullet, EditorSkill, EditorExperience, EditorEducation, RequirementItem } from "@shared/schema";

type SaveStatus = "saved" | "saving" | "unsaved" | "error" | "conflict";

interface SimilarJob {
  id: number;
  title: string;
  company: string;
  location: string;
  roleCategory?: string;
  roleSubcategory?: string;
  seniorityLevel?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
}

interface EditorData {
  sections: EditorSections;
  jobRequirements: RequirementItem[];
  toConfirmItems: unknown[];
  readyToApply: "yes" | "almost" | "not_yet";
  counts: { improvementsApplied: number; needsConfirmation: number; missingRequirements: number };
  job: { id: number; title: string; company: string; description: string; requirements?: string; applyUrl?: string };
  versionNumber: number;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

const LOADING_STAGES = [
  "Reading your resume...",
  "Analyzing the role requirements...",
  "Tailoring your experience...",
  "Final polish...",
];

function StagedLoading({ job }: { job?: { title: string; company: string } }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage(s => (s < LOADING_STAGES.length - 1 ? s + 1 : s));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const progress = ((stage + 1) / LOADING_STAGES.length) * 100;

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30" data-testid="editor-loading">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardContent className="p-10 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
          {job && (
            <div>
              <p className="text-base font-semibold text-foreground">{job.title}</p>
              <p className="text-sm text-muted-foreground">{job.company}</p>
            </div>
          )}
          <p className="text-sm text-foreground font-medium transition-opacity duration-500" key={stage}>
            {LOADING_STAGES[stage]}
          </p>
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">This usually takes 10–15 seconds</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  switch (status) {
    case "saving":
      return <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="save-status"><Loader2 className="w-3 h-3 animate-spin" />Saving</span>;
    case "saved":
      return <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1" data-testid="save-status"><CheckCircle className="w-3 h-3" />Saved</span>;
    case "unsaved":
      return <span className="text-xs text-muted-foreground" data-testid="save-status">Unsaved</span>;
    case "error":
      return <span className="text-xs text-red-500 flex items-center gap-1" data-testid="save-status"><AlertTriangle className="w-3 h-3" />Save failed</span>;
    case "conflict":
      return <span className="text-xs text-red-500 flex items-center gap-1" data-testid="save-status"><AlertTriangle className="w-3 h-3" />Conflict</span>;
  }
}

function EditableText({
  value, onChange, className, tag: Tag = "p", testId, placeholder,
}: {
  value: string; onChange: (v: string) => void; className?: string; tag?: "p" | "span" | "h1" | "h2" | "h3" | "div"; testId?: string; placeholder?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const lastValue = useRef(value);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
      lastValue.current = value;
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    const text = ref.current?.textContent || "";
    if (text !== lastValue.current) {
      lastValue.current = text;
      onChange(text);
    }
  }, [onChange]);

  const isEmpty = !value || value.trim() === "";

  return (
    <Tag
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={`outline-none focus:ring-1 focus:ring-primary/20 rounded-md px-1 -mx-1 ${isEmpty && placeholder ? "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:pointer-events-none" : ""} ${className || ""}`}
      data-testid={testId}
      data-placeholder={placeholder}
    />
  );
}

function ChangeIndicator({
  originalText, reason, grounded, isReverted, onRevert, onUnrevert,
}: {
  originalText: string; reason?: string; grounded?: boolean; isReverted?: boolean; onRevert: () => void; onUnrevert: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          data-testid="button-view-change"
          onClick={(e) => e.stopPropagation()}
        >
          <Diff className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="start" data-testid="change-popover">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Original</p>
          <p className="text-sm text-muted-foreground italic line-through">{originalText}</p>
        </div>
        {reason && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Why changed</p>
            <p className="text-sm">{reason}</p>
          </div>
        )}
        {grounded === false && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">Added details — please verify accuracy</p>
          </div>
        )}
        {isReverted ? (
          <Button variant="outline" size="sm" onClick={onUnrevert} data-testid="button-unrevert-item">
            <Sparkles className="w-3 h-3 mr-1" />Accept AI version
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onRevert} data-testid="button-revert-item">
            <RotateCcw className="w-3 h-3 mr-1" />Revert to original
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ReadinessBar({ requirements, sections }: { requirements: RequirementItem[]; sections: EditorSections }) {
  const mustHaves = requirements.filter(r => r.category === "must_have");
  const covered = mustHaves.filter(r => r.coverage === "covered").length;
  const partial = mustHaves.filter(r => r.coverage === "partial").length;
  const total = mustHaves.length;
  const ungroundedCount = countUngrounded(sections);

  if (total === 0) return null;

  const score = Math.round(((covered + partial * 0.5) / total) * 100);
  const label = score >= 80 ? "Strong match" : score >= 50 ? "Good foundation" : "Building your case";
  const color = score >= 80 ? "text-emerald-600 dark:text-emerald-400" : score >= 50 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-3 text-xs" data-testid="readiness-bar">
      <div className="flex items-center gap-1.5">
        <span className={`font-medium ${color}`}>{label}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{covered} of {total} key requirements covered</span>
      </div>
      {ungroundedCount > 0 && (
        <>
          <span className="text-muted-foreground">·</span>
          <span className="text-amber-600 dark:text-amber-400" data-testid="text-ungrounded">
            {ungroundedCount} to verify
          </span>
        </>
      )}
    </div>
  );
}

function RequirementCoverageIcon({ coverage }: { coverage: string }) {
  if (coverage === "covered") return <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (coverage === "partial") return <CircleMinus className="w-4 h-4 text-amber-500 shrink-0" />;
  return <CircleDashed className="w-4 h-4 text-muted-foreground/50 shrink-0" />;
}

function RequirementCategoryIcon({ category }: { category: string }) {
  if (category === "must_have") return <Shield className="w-3 h-3 text-red-400" />;
  if (category === "tools_keywords") return <Wrench className="w-3 h-3 text-blue-400" />;
  return <Star className="w-3 h-3 text-muted-foreground" />;
}

function RequirementsPanel({ requirements, isOpen, onToggle }: { requirements: RequirementItem[]; isOpen: boolean; onToggle: () => void }) {
  const mustHaves = requirements.filter(r => r.category === "must_have");
  const niceToHaves = requirements.filter(r => r.category === "nice_to_have");
  const tools = requirements.filter(r => r.category === "tools_keywords");

  const coveredCount = requirements.filter(r => r.coverage === "covered").length;
  const partialCount = requirements.filter(r => r.coverage === "partial").length;
  const missingCount = requirements.filter(r => r.coverage === "missing").length;

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-card border border-r-0 rounded-l-lg p-2 shadow-md hover:bg-muted transition-colors"
        data-testid="button-open-requirements"
      >
        <PanelRightOpen className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="w-80 xl:w-96 border-l bg-card flex flex-col h-full shrink-0" data-testid="requirements-panel">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Job Requirements</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400">{coveredCount} covered</span>
            {partialCount > 0 && <> · <span className="text-amber-600 dark:text-amber-400">{partialCount} partial</span></>}
            {missingCount > 0 && <> · <span className="text-muted-foreground">{missingCount} gaps</span></>}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7" data-testid="button-close-requirements">
          <PanelRightClose className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="p-2.5 rounded-md bg-muted/50 border border-border/50" data-testid="requirements-info">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <Info className="w-3 h-3 inline mr-1 text-primary/60" />
            These are the job's key requirements. Green means your resume covers it, amber means partial coverage, and grey means a gap you could address.
          </p>
        </div>
        {mustHaves.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500/80 mb-2 flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Must Have
            </p>
            <div className="space-y-2">
              {mustHaves.map(r => (
                <div key={r.id} className="flex items-start gap-2" data-testid={`requirement-${r.id}`}>
                  <RequirementCoverageIcon coverage={r.coverage} />
                  <p className={`text-sm leading-snug ${r.coverage === "missing" ? "text-muted-foreground" : "text-foreground"}`}>
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {niceToHaves.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Star className="w-3 h-3" /> Nice to Have
            </p>
            <div className="space-y-2">
              {niceToHaves.map(r => (
                <div key={r.id} className="flex items-start gap-2" data-testid={`requirement-${r.id}`}>
                  <RequirementCoverageIcon coverage={r.coverage} />
                  <p className={`text-sm leading-snug ${r.coverage === "missing" ? "text-muted-foreground" : "text-foreground"}`}>
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tools.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500/80 mb-2 flex items-center gap-1.5">
              <Wrench className="w-3 h-3" /> Tools & Skills
            </p>
            <div className="space-y-2">
              {tools.map(r => (
                <div key={r.id} className="flex items-start gap-2" data-testid={`requirement-${r.id}`}>
                  <RequirementCoverageIcon coverage={r.coverage} />
                  <p className={`text-sm leading-snug ${r.coverage === "missing" ? "text-muted-foreground" : "text-foreground"}`}>
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChangeReviewBar({ sections, currentIdx, onNavigate, onToggle, isVisible }: {
  sections: EditorSections;
  currentIdx: number;
  onNavigate: (idx: number) => void;
  onToggle: () => void;
  isVisible: boolean;
}) {
  const changes = useMemo(() => getChanges(sections), [sections]);
  const total = changes.length;

  if (total === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs" data-testid="change-review-bar">
      <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs px-2" onClick={onToggle} data-testid="button-toggle-changes">
        {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {total} {total === 1 ? "change" : "changes"}
      </Button>
      {isVisible && total > 0 && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onNavigate(Math.max(0, currentIdx - 1))} disabled={currentIdx <= 0} data-testid="button-prev-change">
            <ChevronLeft className="w-3 h-3" />
          </Button>
          <span className="text-muted-foreground tabular-nums min-w-[3ch] text-center">{currentIdx + 1}/{total}</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onNavigate(Math.min(total - 1, currentIdx + 1))} disabled={currentIdx >= total - 1} data-testid="button-next-change">
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ResumeEditor() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isPro } = useAuth();
  const { track } = useActivityTracker();
  const { toast } = useToast();

  useEffect(() => { track({ eventType: "page_view", pagePath: `/resume-editor/${resumeId}` }); }, [resumeId]);

  const searchParams = new URLSearchParams(window.location.search);
  const jobId = parseInt(searchParams.get("jobId") || "0");

  const [sections, setSections] = useState<EditorSections | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [versionNumber, setVersionNumber] = useState(1);
  const [undoStack, setUndoStack] = useState<EditorSections[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSections[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUnsavedRef = useRef(false);
  const [requirementsPanelOpen, setRequirementsPanelOpen] = useState(true);
  const [changesVisible, setChangesVisible] = useState(true);
  const [changeIdx, setChangeIdx] = useState(0);
  const [showPostExport, setShowPostExport] = useState(false);
  const [similarJobs, setSimilarJobs] = useState<SimilarJob[]>([]);
  const [similarJobsLoading, setSimilarJobsLoading] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const prevJobIdRef = useRef(jobId);

  usePageTitle("Resume Editor");

  const editorQuery = useQuery<EditorData>({
    queryKey: ["/api/resume", resumeId, "editor", jobId],
    queryFn: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      try {
        const res = await fetch(`/api/resume/${resumeId}/editor?jobId=${jobId}`, {
          credentials: "include",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Failed to load editor (${res.status})`);
        }
        const data = await res.json();
        if (!data.sections || (!data.sections.contact && !data.sections.summary && (!data.sections.experience || data.sections.experience.length === 0))) {
          throw new Error("We couldn't read this resume. Try a different file format.");
        }
        return data;
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === "AbortError") {
          throw new Error("Taking longer than expected. Please try again.");
        }
        throw err;
      }
    },
    enabled: !!resumeId && !!jobId && isAuthenticated,
    retry: 1,
    retryDelay: 2000,
  });

  const jobRequirements: RequirementItem[] = useMemo(() => {
    const raw = editorQuery.data?.jobRequirements;
    if (!Array.isArray(raw)) return [];
    return raw;
  }, [editorQuery.data?.jobRequirements]);

  useEffect(() => {
    if (jobId !== prevJobIdRef.current) {
      prevJobIdRef.current = jobId;
      setSections(null);
      setUndoStack([]);
      setRedoStack([]);
      setChangeIdx(0);
      setSaveStatus("saved");
      setShowPostExport(false);
      setSimilarJobs([]);
      hasUnsavedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/resume", resumeId, "editor", jobId] });
    }
  }, [jobId, resumeId]);

  useEffect(() => {
    if (editorQuery.data?.sections) {
      setSections(editorQuery.data.sections);
      setVersionNumber(editorQuery.data.versionNumber);
    }
  }, [editorQuery.data]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (data: { sections: EditorSections; versionNumber: number }) => {
      const res = await fetch(`/api/resume/${resumeId}/editor/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sections: data.sections,
          jobId,
          versionNumber: data.versionNumber,
        }),
      });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body.message || "Version conflict") as any;
        err.status = 409;
        throw err;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Save failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSaveStatus("saved");
      hasUnsavedRef.current = false;
      setVersionNumber(data.versionNumber);
    },
    onError: (err: any) => {
      if (err?.status === 409) {
        setSaveStatus("conflict");
        toast({ title: "Version conflict", description: "This resume was edited in another tab. Please refresh.", variant: "destructive" });
      } else {
        setSaveStatus("error");
        toast({ title: "Save failed", description: "Your edits are preserved locally. We'll retry.", variant: "destructive" });
      }
    },
  });

  const debouncedSave = useCallback((newSections: EditorSections) => {
    setSaveStatus("unsaved");
    hasUnsavedRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      saveMutation.mutate({ sections: newSections, versionNumber });
    }, 800);
  }, [versionNumber, saveMutation]);

  const flushSave = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (!hasUnsavedRef.current || !sections) {
        resolve();
        return;
      }
      setSaveStatus("saving");
      saveMutation.mutate({ sections, versionNumber }, {
        onSuccess: () => resolve(),
        onError: () => resolve(),
      });
    });
  }, [sections, versionNumber, saveMutation]);

  const updateSections = useCallback((updater: (prev: EditorSections) => EditorSections) => {
    setSections(prev => {
      if (!prev) return prev;
      setUndoStack(stack => [...stack.slice(-20), prev]);
      setRedoStack([]);
      const next = updater(prev);
      debouncedSave(next);
      return next;
    });
  }, [debouncedSave]);

  const undo = useCallback(() => {
    setUndoStack(stack => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setSections(current => {
        if (current) setRedoStack(rs => [...rs, current]);
        debouncedSave(prev);
        return prev;
      });
      return stack.slice(0, -1);
    });
  }, [debouncedSave]);

  const redo = useCallback(() => {
    setRedoStack(stack => {
      if (stack.length === 0) return stack;
      const next = stack[stack.length - 1];
      setSections(current => {
        if (current) setUndoStack(us => [...us, current]);
        debouncedSave(next);
        return next;
      });
      return stack.slice(0, -1);
    });
  }, [debouncedSave]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      const isEditing = (e.target as HTMLElement)?.isContentEditable || ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);
      if (!isEditing && changesVisible) {
        if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); setChangeIdx(i => i + 1); }
        if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); setChangeIdx(i => Math.max(0, i - 1)); }
      }
      if (e.key === "Escape" && showPostExport) { setShowPostExport(false); }
      if (e.key === "Escape" && showRevertConfirm) { setShowRevertConfirm(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, changesVisible, showPostExport, showRevertConfirm]);

  const contactNameRef = useRef(sections?.contact?.fullName || "");
  useEffect(() => { contactNameRef.current = sections?.contact?.fullName || ""; }, [sections?.contact?.fullName]);

  const downloadFile = useCallback(async (type: "pdf" | "docx" | "apply-pack") => {
    track({ eventType: "resume_export", metadata: { type, resumeId, jobId } });
    try {
      toast({ title: "Saving latest edits..." });
      try {
        await flushSave();
      } catch {
        toast({ title: "Warning", description: "Could not save latest edits. The export may not include your most recent changes.", variant: "destructive" });
      }
      toast({ title: "Preparing download..." });
      const res = await fetch(`/api/resume/${resumeId}/export/${type}?jobId=${jobId}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(err.error);
      }
      const blob = await res.blob();
      if (blob.size < 100) {
        throw new Error("Download produced an empty file. Please try again.");
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const name = contactNameRef.current.replace(/[^a-zA-Z0-9]/g, "_") || "Resume";
      const company = editorQuery.data?.job?.company?.replace(/[^a-zA-Z0-9]/g, "_") || "";
      const baseName = company ? `${name}_${company}` : name;
      a.download = `${baseName}.${type === "apply-pack" ? "zip" : type}`;
      a.click();
      URL.revokeObjectURL(url);

      setSimilarJobsLoading(true);
      setShowPostExport(true);
      fetch(`/api/jobs/${jobId}/similar`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(jobs => setSimilarJobs(Array.isArray(jobs) ? jobs : []))
        .catch(() => setSimilarJobs([]))
        .finally(() => setSimilarJobsLoading(false));
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  }, [resumeId, jobId, toast, editorQuery.data?.job, flushSave]);

  const executeRevertAll = useCallback(() => {
    updateSections(prev => {
      const reverted = { ...prev };
      if (prev.originalSummary) {
        reverted.summaryReverted = true;
      }
      reverted.experience = prev.experience.map(exp => ({
        ...exp,
        bullets: exp.bullets.map(b => b.originalText ? { ...b, reverted: true } : b),
      }));
      reverted.skills = prev.skills.filter(s => !s.addedByAI);
      return reverted;
    });
    setShowRevertConfirm(false);
    toast({ title: "All changes reverted", description: "Your resume is back to its original state." });
  }, [updateSections, toast]);

  const addExperience = useCallback(() => {
    updateSections(s => ({
      ...s,
      experience: [...s.experience, {
        id: generateId(),
        company: "",
        title: "",
        location: "",
        startDate: "",
        endDate: "Present",
        current: true,
        bullets: [{ id: generateId(), text: "", grounded: true }],
      }],
    }));
  }, [updateSections]);

  const addBullet = useCallback((expId: string) => {
    updateSections(s => ({
      ...s,
      experience: s.experience.map(e => e.id === expId ? {
        ...e,
        bullets: [...e.bullets, { id: generateId(), text: "", grounded: true }],
      } : e),
    }));
  }, [updateSections]);

  const removeBullet = useCallback((expId: string, bulletId: string) => {
    updateSections(s => ({
      ...s,
      experience: s.experience.map(e => e.id === expId ? {
        ...e,
        bullets: e.bullets.filter(b => b.id !== bulletId),
      } : e),
    }));
  }, [updateSections]);

  const moveExperience = useCallback((index: number, direction: -1 | 1) => {
    updateSections(s => {
      const arr = [...s.experience];
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= arr.length) return s;
      [arr[index], arr[targetIdx]] = [arr[targetIdx], arr[index]];
      return { ...s, experience: arr };
    });
  }, [updateSections]);

  const moveBullet = useCallback((expId: string, bulletIndex: number, direction: -1 | 1) => {
    updateSections(s => ({
      ...s,
      experience: s.experience.map(e => {
        if (e.id !== expId) return e;
        const arr = [...e.bullets];
        const targetIdx = bulletIndex + direction;
        if (targetIdx < 0 || targetIdx >= arr.length) return e;
        [arr[bulletIndex], arr[targetIdx]] = [arr[targetIdx], arr[targetIdx]];
        [arr[bulletIndex], arr[targetIdx]] = [arr[targetIdx], arr[bulletIndex]];
        return { ...e, bullets: arr };
      }),
    }));
  }, [updateSections]);

  const removeExperience = useCallback((expId: string) => {
    updateSections(s => ({
      ...s,
      experience: s.experience.filter(e => e.id !== expId),
    }));
  }, [updateSections]);

  const removeEducation = useCallback((eduId: string) => {
    updateSections(s => ({
      ...s,
      education: s.education.filter(e => e.id !== eduId),
    }));
  }, [updateSections]);

  const removeCertification = useCallback((certId: string) => {
    updateSections(s => ({
      ...s,
      certifications: s.certifications.filter(c => c.id !== certId),
    }));
  }, [updateSections]);

  const addEducation = useCallback(() => {
    updateSections(s => ({
      ...s,
      education: [...s.education, {
        id: generateId(),
        institution: "",
        degree: "",
        field: "",
        graduationDate: "",
        honors: "",
      }],
    }));
  }, [updateSections]);

  const addCertification = useCallback(() => {
    updateSections(s => ({
      ...s,
      certifications: [...s.certifications, {
        id: generateId(),
        name: "",
        issuer: "",
        date: "",
      }],
    }));
  }, [updateSections]);

  const addSkill = useCallback((name: string) => {
    if (!name.trim()) return;
    updateSections(s => {
      const exists = s.skills.some(sk => sk.name.toLowerCase() === name.toLowerCase());
      if (exists) return s;
      return { ...s, skills: [...s.skills, { name: name.trim() }] };
    });
    setSkillInput("");
  }, [updateSections]);

  const job = editorQuery.data?.job;

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30" data-testid="editor-auth-required">
        <Card className="border-0 shadow-lg"><CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Please sign in to use the resume editor.</p>
          <Button className="mt-4" onClick={() => setLocation("/auth")} data-testid="button-sign-in">Sign In</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (editorQuery.isError) {
    const msg = editorQuery.error?.message || "We couldn't load the editor. Please try again.";
    const isParseError = msg.includes("couldn't read");
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30" data-testid="editor-error">
        <Card className="border-0 shadow-lg"><CardContent className="p-8 text-center max-w-md space-y-4">
          <AlertTriangle className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">{msg}</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => editorQuery.refetch()} data-testid="button-retry">Try again</Button>
            {isParseError ? (
              <Link href="/resumes"><Button variant="ghost" size="sm" data-testid="button-back-resumes">Upload a different file</Button></Link>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => window.history.back()} data-testid="button-go-back">Go back</Button>
            )}
          </div>
        </CardContent></Card>
      </div>
    );
  }

  if (editorQuery.isLoading || !sections) {
    return <StagedLoading job={job ? { title: job.title, company: job.company } : undefined} />;
  }

  return (
    <div className="flex flex-col h-screen bg-muted/30" data-testid="resume-editor">
      <div className="border-b bg-card sticky top-0 z-30 shadow-sm" data-testid="editor-header">
        <div className="flex items-center justify-between gap-3 px-4 h-12">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={job ? `/jobs/${job.id}` : "/jobs"}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            {job && (
              <div className="min-w-0 hidden sm:block">
                <p className="text-sm font-medium truncate" data-testid="text-job-title">
                  Tailoring for <span className="text-primary">{job.title}</span> at {job.company}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={undoStack.length === 0} data-testid="button-undo">
                <Undo2 className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} disabled={redoStack.length === 0} data-testid="button-redo">
                <Redo2 className="w-3.5 h-3.5" />
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1" />
            </div>
            <SaveIndicator status={saveStatus} />
            <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="gap-1.5 h-8" data-testid="button-export">
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadFile("pdf")} data-testid="menu-export-pdf">
                  <FileDown className="w-4 h-4 mr-2" />PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadFile("docx")} data-testid="menu-export-docx">
                  <FileText className="w-4 h-4 mr-2" />DOCX
                </DropdownMenuItem>
                {isPro && (
                  <DropdownMenuItem onClick={() => downloadFile("apply-pack")} data-testid="menu-export-pack">
                    <Package className="w-4 h-4 mr-2" />Apply Pack
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-1.5 bg-muted/40 border-t" data-testid="status-bar">
          <div className="flex items-center gap-3 flex-wrap">
            {jobRequirements.length > 0 && sections && (
              <ReadinessBar requirements={jobRequirements} sections={sections} />
            )}
            {sections && (
              <ChangeReviewBar
                sections={sections}
                currentIdx={changeIdx}
                onNavigate={setChangeIdx}
                onToggle={() => setChangesVisible(!changesVisible)}
                isVisible={changesVisible}
              />
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground" onClick={() => setShowRevertConfirm(true)} data-testid="button-revert-all">
            <RotateCcw className="w-3 h-3 mr-1" />Revert All
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
            <div className="bg-white dark:bg-card rounded-lg shadow-sm border p-6 sm:p-10 space-y-6" data-testid="resume-document">
              {sections.rewriteWarning && (
                <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900" data-testid="rewrite-warning">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-300">{sections.rewriteWarning}</p>
                  </div>
                </div>
              )}

              {sections && (() => {
                const changes = getChanges(sections);
                return changes.length > 0 && changes.length < 20 ? (
                  <div className="p-3 rounded-md bg-primary/5 border border-primary/10" data-testid="selective-rewrite-note">
                    <p className="text-xs text-primary/80">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      We focused on the <span className="font-medium">{changes.length} most impactful changes</span> for this role. Unchanged bullets were already strong.
                    </p>
                  </div>
                ) : null;
              })()}

              {sections.strengthNotes && sections.strengthNotes.length > 0 && (
                <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900" data-testid="strength-notes">
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-1">Your strengths for this role</p>
                  {sections.strengthNotes.map((note, i) => (
                    <p key={i} className="text-xs text-emerald-700 dark:text-emerald-400">· {note}</p>
                  ))}
                </div>
              )}

              <section data-testid="section-contact">
                <EditableText
                  value={sections.contact.fullName}
                  onChange={v => updateSections(s => ({ ...s, contact: { ...s.contact, fullName: v } }))}
                  tag="h1"
                  className="text-2xl font-serif font-bold mb-1"
                  testId="editable-name"
                  placeholder="Your Name"
                />
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <EditableText value={sections.contact.email} onChange={v => updateSections(s => ({ ...s, contact: { ...s.contact, email: v } }))} tag="span" testId="editable-email" placeholder="email@example.com" />
                  <EditableText value={sections.contact.phone} onChange={v => updateSections(s => ({ ...s, contact: { ...s.contact, phone: v } }))} tag="span" testId="editable-phone" placeholder="Phone" />
                  <EditableText value={sections.contact.location} onChange={v => updateSections(s => ({ ...s, contact: { ...s.contact, location: v } }))} tag="span" testId="editable-location" placeholder="Location" />
                  <EditableText value={sections.contact.linkedin || ""} onChange={v => updateSections(s => ({ ...s, contact: { ...s.contact, linkedin: v } }))} tag="span" testId="editable-linkedin" placeholder="LinkedIn" />
                </div>
              </section>

              <Separator />

              <section data-testid="section-summary">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Summary</h2>
                <SummaryBlock sections={sections} onUpdate={updateSections} showChanges={changesVisible} />
              </section>

              <Separator />

              <section data-testid="section-experience">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Experience</h2>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors" data-testid="tooltip-experience-help">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
                        Lead with your most relevant role. Focus each bullet on a specific achievement with measurable impact — the AI tailoring works best with concrete results.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addExperience} data-testid="button-add-experience">
                    <Plus className="w-3 h-3 mr-1" />Add
                  </Button>
                </div>
                {sections.experience.length === 0 && (
                  <div className="py-4 text-center" data-testid="text-no-experience">
                    <p className="text-sm text-muted-foreground">Add your most relevant experience first</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">The AI will help tailor each entry to match the role requirements</p>
                  </div>
                )}
                {sections.experience.map((exp, expIndex) => (
                  <ExperienceBlock
                    key={exp.id}
                    exp={exp}
                    expIndex={expIndex}
                    totalExperiences={sections.experience.length}
                    onUpdate={updateSections}
                    onAddBullet={addBullet}
                    onRemoveBullet={removeBullet}
                    onRemoveExperience={removeExperience}
                    onMoveExperience={moveExperience}
                    onMoveBullet={moveBullet}
                    showChanges={changesVisible}
                  />
                ))}
              </section>

              <Separator />

              <section data-testid="section-education">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Education</h2>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addEducation} data-testid="button-add-education">
                    <Plus className="w-3 h-3 mr-1" />Add
                  </Button>
                </div>
                {sections.education.length === 0 && (
                  <div className="py-3 text-center" data-testid="text-no-education">
                    <p className="text-sm text-muted-foreground">No education entries yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Include degrees, certifications, or relevant coursework</p>
                  </div>
                )}
                {sections.education.map(edu => (
                  <EducationBlock key={edu.id} edu={edu} onUpdate={updateSections} onRemove={() => removeEducation(edu.id)} />
                ))}
              </section>

              <Separator />

              <section data-testid="section-skills">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2 mb-3">
                  {sections.skills.map((skill, idx) => (
                    <SkillBadge
                      key={`${skill.name}-${idx}`}
                      skill={skill}
                      onRemove={() => updateSections(s => ({ ...s, skills: s.skills.filter((_, i) => i !== idx) }))}
                      showChanges={changesVisible}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2" data-testid="skill-input-group">
                  <Input
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    placeholder="Add a skill..."
                    className="max-w-xs h-8 text-sm"
                    data-testid="input-add-skill"
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
                  />
                  <Button variant="outline" size="sm" className="h-8" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim()} data-testid="button-add-skill">
                    <Plus className="w-3 h-3 mr-1" />Add
                  </Button>
                </div>
              </section>

              <Separator />

              <section data-testid="section-certifications">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certifications</h2>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addCertification} data-testid="button-add-certification">
                    <Plus className="w-3 h-3 mr-1" />Add
                  </Button>
                </div>
                {sections.certifications.length === 0 && (
                  <div className="py-3 text-center" data-testid="text-no-certifications">
                    <p className="text-sm text-muted-foreground">No certifications yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Bar admissions, tech certifications, and professional credentials strengthen your profile</p>
                  </div>
                )}
                {sections.certifications.map(cert => (
                  <CertificationBlock key={cert.id} cert={cert} onUpdate={updateSections} onRemove={() => removeCertification(cert.id)} />
                ))}
              </section>

              <WordCountIndicator sections={sections} />
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          {jobRequirements.length > 0 && (
            <RequirementsPanel
              requirements={jobRequirements}
              isOpen={requirementsPanelOpen}
              onToggle={() => setRequirementsPanelOpen(!requirementsPanelOpen)}
            />
          )}
        </div>
      </div>

      <div className="lg:hidden border-t bg-card px-4 py-2 flex items-center justify-between" data-testid="mobile-toolbar">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={undoStack.length === 0}>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={redoStack.length === 0}>
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>
        {jobRequirements.length > 0 && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setRequirementsPanelOpen(!requirementsPanelOpen)} data-testid="button-mobile-requirements">
            <Shield className="w-3 h-3" />
            Requirements
          </Button>
        )}
      </div>

      {requirementsPanelOpen && jobRequirements.length > 0 && (
        <div className="lg:hidden fixed inset-0 z-40 flex" data-testid="mobile-requirements-overlay">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRequirementsPanelOpen(false)} />
          <div className="ml-auto relative bg-card w-80 h-full shadow-xl overflow-y-auto">
            <RequirementsPanel
              requirements={jobRequirements}
              isOpen={true}
              onToggle={() => setRequirementsPanelOpen(false)}
            />
          </div>
        </div>
      )}

      {showRevertConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="dialog-revert-confirm">
          <div className="bg-card rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Revert all changes?</h3>
                <p className="text-sm text-muted-foreground">This will undo every AI change and return your resume to its original state.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="destructive" className="flex-1" onClick={executeRevertAll} data-testid="button-confirm-revert">
                Revert All
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowRevertConfirm(false)} data-testid="button-cancel-revert">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPostExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPostExport(false)} data-testid="dialog-post-export">
          <div className="bg-card rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Resume downloaded</h3>
                <p className="text-sm text-muted-foreground">Tailored for {editorQuery.data?.job?.company || "this role"}</p>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setShowPostExport(false)} data-testid="button-close-dialog">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {editorQuery.data?.job?.applyUrl && (
              <Button
                className="w-full gap-2"
                onClick={() => {
                  window.open(editorQuery.data?.job?.applyUrl, "_blank");
                  setShowPostExport(false);
                }}
                data-testid="button-apply-now"
              >
                Apply Now
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tailor for another role</p>
              {similarJobsLoading ? (
                <div className="flex items-center justify-center py-4 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Finding similar roles...</p>
                </div>
              ) : similarJobs.length > 0 ? (
                similarJobs.slice(0, 3).map((sj) => (
                  <Link
                    key={sj.id}
                    to={resumeId ? `/resume-editor/${resumeId}?jobId=${sj.id}` : `/jobs/${sj.id}`}
                    onClick={() => setShowPostExport(false)}
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`card-suggestion-${sj.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" title={sj.title}>{sj.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate" title={sj.company}>{sj.company}</span>
                          {sj.location && (
                            <>
                              <span className="text-xs text-muted-foreground/40">·</span>
                              <span className="text-xs text-muted-foreground truncate" title={sj.location}>{sj.location}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {sj.roleSubcategory && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/5 text-primary/70">{sj.roleSubcategory}</Badge>
                          )}
                          {sj.seniorityLevel && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{sj.seniorityLevel}</Badge>
                          )}
                          {sj.salaryMin && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              {sj.salaryCurrency === "GBP" ? "£" : sj.salaryCurrency === "EUR" ? "€" : "$"}
                              {Math.round((sj.salaryMin || 0) / 1000)}k{sj.salaryMax ? `–${Math.round(sj.salaryMax / 1000)}k` : "+"}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-2">No similar roles found. Browse all jobs to find your next opportunity.</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowPostExport(false); setLocation("/jobs"); }}
                data-testid="button-browse-jobs"
              >
                Browse all jobs
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowPostExport(false)}
                data-testid="button-close-post-export"
              >
                Keep editing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryBlock({ sections, onUpdate, showChanges }: { sections: EditorSections; onUpdate: (updater: (prev: EditorSections) => EditorSections) => void; showChanges: boolean }) {
  const isChanged = !!sections.originalSummary && !sections.summaryReverted;
  const isReverted = !!sections.originalSummary && !!sections.summaryReverted;
  const displayText = sections.summaryReverted && sections.originalSummary ? sections.originalSummary : sections.summary;

  const handleRevert = () => onUpdate(s => ({ ...s, summaryReverted: true }));
  const handleUnrevert = () => onUpdate(s => ({ ...s, summaryReverted: false }));

  const changeStyle = showChanges
    ? isChanged
      ? "border-l-2 border-primary/60 bg-primary/[0.03] pl-3 py-1 rounded-r"
      : isReverted
        ? "border-l-2 border-muted-foreground/20 pl-3 py-1 opacity-70 rounded-r"
        : ""
    : "";

  return (
    <div className="flex items-start gap-2">
      <div className={`flex-1 ${changeStyle}`}>
        <EditableText
          value={displayText}
          onChange={v => onUpdate(s => ({ ...s, summary: v, summaryReverted: false }))}
          className="text-sm leading-relaxed"
          testId="editable-summary"
          placeholder="Summarize your expertise and what you bring to this role..."
        />
      </div>
      {showChanges && sections.originalSummary && (
        <ChangeIndicator
          originalText={sections.originalSummary}
          reason={sections.summaryRewriteReason}
          grounded={sections.summaryGrounded}
          isReverted={isReverted}
          onRevert={handleRevert}
          onUnrevert={handleUnrevert}
        />
      )}
    </div>
  );
}

function ExperienceBlock({
  exp, expIndex, totalExperiences, onUpdate, onAddBullet, onRemoveBullet, onRemoveExperience, onMoveExperience, onMoveBullet, showChanges,
}: {
  exp: EditorExperience;
  expIndex: number;
  totalExperiences: number;
  onUpdate: (updater: (prev: EditorSections) => EditorSections) => void;
  onAddBullet: (expId: string) => void;
  onRemoveBullet: (expId: string, bulletId: string) => void;
  onRemoveExperience: (expId: string) => void;
  onMoveExperience: (index: number, direction: -1 | 1) => void;
  onMoveBullet: (expId: string, bulletIndex: number, direction: -1 | 1) => void;
  showChanges: boolean;
}) {
  return (
    <div className="mb-6 group/exp relative" data-testid={`experience-${exp.id}`}>
      <div className="invisible group-hover/exp:visible absolute -right-1 -top-1 flex items-center gap-0.5 z-10">
        <button
          onClick={() => onMoveExperience(expIndex, -1)}
          disabled={expIndex === 0}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-card border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          data-testid={`button-move-up-experience-${exp.id}`}
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={() => onMoveExperience(expIndex, 1)}
          disabled={expIndex === totalExperiences - 1}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-card border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          data-testid={`button-move-down-experience-${exp.id}`}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        <button
          onClick={() => onRemoveExperience(exp.id)}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-card border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
          data-testid={`button-remove-experience-${exp.id}`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <div className="flex items-baseline gap-1 flex-wrap">
          <EditableText
            value={exp.title}
            onChange={v => onUpdate(s => ({ ...s, experience: s.experience.map(e => e.id === exp.id ? { ...e, title: v } : e) }))}
            tag="h3"
            className="text-base font-semibold font-serif inline"
            testId={`editable-title-${exp.id}`}
            placeholder="Job Title"
          />
          <span className="text-muted-foreground mx-1">at</span>
          <EditableText
            value={exp.company}
            onChange={v => onUpdate(s => ({ ...s, experience: s.experience.map(e => e.id === exp.id ? { ...e, company: v } : e) }))}
            tag="span"
            className="font-medium"
            testId={`editable-company-${exp.id}`}
            placeholder="Company"
          />
        </div>
        <div className="flex items-baseline gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <EditableText
            value={exp.startDate}
            onChange={v => onUpdate(s => ({ ...s, experience: s.experience.map(e => e.id === exp.id ? { ...e, startDate: v } : e) }))}
            tag="span"
            testId={`editable-startdate-${exp.id}`}
            placeholder="Start"
          />
          <span>–</span>
          <EditableText
            value={exp.current ? "Present" : exp.endDate}
            onChange={v => onUpdate(s => ({ ...s, experience: s.experience.map(e => e.id === exp.id ? { ...e, endDate: v, current: v === "Present" } : e) }))}
            tag="span"
            testId={`editable-enddate-${exp.id}`}
            placeholder="End"
          />
        </div>
      </div>
      <EditableText
        value={exp.location}
        onChange={v => onUpdate(s => ({ ...s, experience: s.experience.map(e => e.id === exp.id ? { ...e, location: v } : e) }))}
        tag="p"
        className="text-xs text-muted-foreground mb-2"
        testId={`editable-location-${exp.id}`}
        placeholder="Location"
      />
      <ul className="space-y-1.5">
        {exp.bullets.map((bullet, bulletIndex) => (
          <BulletItem
            key={bullet.id}
            bullet={bullet}
            bulletIndex={bulletIndex}
            totalBullets={exp.bullets.length}
            expId={exp.id}
            onUpdate={(updater) => {
              onUpdate(s => ({
                ...s,
                experience: s.experience.map(e => e.id === exp.id ? {
                  ...e,
                  bullets: e.bullets.map(b => b.id === bullet.id ? updater(b) : b),
                } : e),
              }));
            }}
            onRemove={() => onRemoveBullet(exp.id, bullet.id)}
            onMoveUp={() => onMoveBullet(exp.id, bulletIndex, -1)}
            onMoveDown={() => onMoveBullet(exp.id, bulletIndex, 1)}
            showChanges={showChanges}
          />
        ))}
      </ul>
      {exp.bullets.length === 0 && (
        <div className="ml-4 py-2" data-testid={`text-no-bullets-${exp.id}`}>
          <p className="text-xs text-muted-foreground">No bullet points yet</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Add accomplishments with measurable results to showcase your impact</p>
        </div>
      )}
      <Button variant="ghost" size="sm" className="mt-2 text-xs h-6" onClick={() => onAddBullet(exp.id)} data-testid={`button-add-bullet-${exp.id}`}>
        <Plus className="w-3 h-3 mr-1" />Add bullet
      </Button>
    </div>
  );
}

function BulletItem({ bullet, bulletIndex, totalBullets, expId, onUpdate, onRemove, onMoveUp, onMoveDown, showChanges }: {
  bullet: EditorBullet;
  bulletIndex: number;
  totalBullets: number;
  expId: string;
  onUpdate: (updater: (b: EditorBullet) => EditorBullet) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  showChanges: boolean;
}) {
  const isChanged = !!(bullet.originalText || bullet.addedByAI) && !bullet.reverted;
  const isReverted = !!(bullet.originalText) && !!bullet.reverted;
  const displayText = bullet.reverted && bullet.originalText ? bullet.originalText : bullet.text;

  const handleRevert = () => onUpdate(b => ({ ...b, reverted: true }));
  const handleUnrevert = () => onUpdate(b => ({ ...b, reverted: false }));

  const changeStyle = showChanges
    ? isChanged
      ? "border-l-2 border-primary/60 bg-primary/[0.03] pl-3 py-0.5 rounded-r"
      : isReverted
        ? "border-l-2 border-muted-foreground/20 pl-3 py-0.5 opacity-70 rounded-r"
        : ""
    : "";

  return (
    <li className="flex items-start gap-2 group" data-testid={`bullet-${bullet.id}`}>
      <span className="text-muted-foreground mt-1.5 shrink-0 text-xs select-none">•</span>
      <div className={`flex-1 ${changeStyle}`}>
        <EditableText
          value={displayText}
          onChange={v => onUpdate(b => ({ ...b, text: v, reverted: false }))}
          className="text-sm leading-relaxed"
          testId={`editable-bullet-${bullet.id}`}
          placeholder="Describe a specific achievement with measurable impact..."
        />
      </div>
      {showChanges && (bullet.originalText || bullet.addedByAI) && (
        <ChangeIndicator
          originalText={bullet.originalText || "(AI generated)"}
          reason={bullet.rewriteReason}
          grounded={bullet.grounded}
          isReverted={isReverted}
          onRevert={handleRevert}
          onUnrevert={handleUnrevert}
        />
      )}
      <div className="invisible group-hover:visible flex items-center gap-0.5 shrink-0 mt-0.5">
        <button
          onClick={onMoveUp}
          disabled={bulletIndex === 0}
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          data-testid={`button-move-up-bullet-${bullet.id}`}
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={bulletIndex === totalBullets - 1}
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          data-testid={`button-move-down-bullet-${bullet.id}`}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        <button
          onClick={onRemove}
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive shrink-0"
          data-testid={`button-remove-bullet-${bullet.id}`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </li>
  );
}

function EducationBlock({ edu, onUpdate, onRemove }: { edu: EditorEducation; onUpdate: (updater: (prev: EditorSections) => EditorSections) => void; onRemove: () => void }) {
  return (
    <div className="mb-3 group/edu relative" data-testid={`education-${edu.id}`}>
      <button
        onClick={onRemove}
        className="invisible group-hover/edu:visible absolute -right-1 -top-1 w-6 h-6 flex items-center justify-center rounded-full bg-card border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors z-10"
        data-testid={`button-remove-education-${edu.id}`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
      <div className="flex items-baseline gap-1 flex-wrap">
        <EditableText
          value={edu.degree}
          onChange={v => onUpdate(s => ({ ...s, education: s.education.map(e => e.id === edu.id ? { ...e, degree: v } : e) }))}
          tag="span"
          className="text-sm font-medium"
          testId={`editable-degree-${edu.id}`}
          placeholder="Degree"
        />
        {(edu.field || edu.degree) && <span className="text-sm text-muted-foreground">in</span>}
        <EditableText
          value={edu.field}
          onChange={v => onUpdate(s => ({ ...s, education: s.education.map(e => e.id === edu.id ? { ...e, field: v } : e) }))}
          tag="span"
          className="text-sm font-medium"
          testId={`editable-field-${edu.id}`}
          placeholder="Field of study"
        />
      </div>
      <div className="flex items-baseline gap-1 flex-wrap">
        <EditableText
          value={edu.institution}
          onChange={v => onUpdate(s => ({ ...s, education: s.education.map(e => e.id === edu.id ? { ...e, institution: v } : e) }))}
          tag="span"
          className="text-sm text-muted-foreground"
          testId={`editable-institution-${edu.id}`}
          placeholder="Institution"
        />
        <span className="text-sm text-muted-foreground">–</span>
        <EditableText
          value={edu.graduationDate}
          onChange={v => onUpdate(s => ({ ...s, education: s.education.map(e => e.id === edu.id ? { ...e, graduationDate: v } : e) }))}
          tag="span"
          className="text-sm text-muted-foreground"
          testId={`editable-graddate-${edu.id}`}
          placeholder="Year"
        />
      </div>
      {edu.honors && (
        <EditableText
          value={edu.honors}
          onChange={v => onUpdate(s => ({ ...s, education: s.education.map(e => e.id === edu.id ? { ...e, honors: v } : e) }))}
          tag="p"
          className="text-xs text-muted-foreground italic"
          testId={`editable-honors-${edu.id}`}
          placeholder="Honors / GPA"
        />
      )}
    </div>
  );
}

function CertificationBlock({ cert, onUpdate, onRemove }: { cert: { id: string; name: string; issuer: string; date: string }; onUpdate: (updater: (prev: EditorSections) => EditorSections) => void; onRemove: () => void }) {
  return (
    <div className="mb-2 group/cert relative" data-testid={`certification-${cert.id}`}>
      <button
        onClick={onRemove}
        className="invisible group-hover/cert:visible absolute -right-1 -top-1 w-6 h-6 flex items-center justify-center rounded-full bg-card border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors z-10"
        data-testid={`button-remove-certification-${cert.id}`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
      <EditableText
        value={cert.name}
        onChange={v => onUpdate(s => ({ ...s, certifications: s.certifications.map(c => c.id === cert.id ? { ...c, name: v } : c) }))}
        tag="p"
        className="text-sm font-medium"
        testId={`editable-certname-${cert.id}`}
        placeholder="Certification name"
      />
      <div className="flex items-baseline gap-1 flex-wrap">
        <EditableText
          value={cert.issuer}
          onChange={v => onUpdate(s => ({ ...s, certifications: s.certifications.map(c => c.id === cert.id ? { ...c, issuer: v } : c) }))}
          tag="span"
          className="text-xs text-muted-foreground"
          testId={`editable-certissuer-${cert.id}`}
          placeholder="Issuer"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <EditableText
          value={cert.date}
          onChange={v => onUpdate(s => ({ ...s, certifications: s.certifications.map(c => c.id === cert.id ? { ...c, date: v } : c) }))}
          tag="span"
          className="text-xs text-muted-foreground"
          testId={`editable-certdate-${cert.id}`}
          placeholder="Date"
        />
      </div>
    </div>
  );
}

function WordCountIndicator({ sections }: { sections: EditorSections }) {
  const wordCount = useMemo(() => {
    let text = "";
    if (sections.contact?.fullName) text += sections.contact.fullName + " ";
    if (sections.contact?.email) text += sections.contact.email + " ";
    if (sections.contact?.phone) text += sections.contact.phone + " ";
    if (sections.contact?.location) text += sections.contact.location + " ";
    if (sections.contact?.linkedin) text += sections.contact.linkedin + " ";
    if (sections.summary) text += sections.summary + " ";
    for (const exp of sections.experience) {
      if (exp.title) text += exp.title + " ";
      if (exp.company) text += exp.company + " ";
      if (exp.location) text += exp.location + " ";
      if (exp.startDate) text += exp.startDate + " ";
      if (exp.endDate) text += exp.endDate + " ";
      for (const b of exp.bullets) {
        if (b.text) text += b.text + " ";
      }
    }
    for (const edu of sections.education) {
      if (edu.degree) text += edu.degree + " ";
      if (edu.field) text += edu.field + " ";
      if (edu.institution) text += edu.institution + " ";
      if (edu.graduationDate) text += edu.graduationDate + " ";
      if (edu.honors) text += edu.honors + " ";
    }
    for (const cert of sections.certifications) {
      if (cert.name) text += cert.name + " ";
      if (cert.issuer) text += cert.issuer + " ";
      if (cert.date) text += cert.date + " ";
    }
    for (const skill of sections.skills) {
      if (skill.name) text += skill.name + " ";
    }
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length;
  }, [sections]);

  const isGood = wordCount >= 300 && wordCount <= 600;
  const isTooShort = wordCount < 300;
  const colorClass = isGood
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-amber-600 dark:text-amber-400";
  const hint = isGood
    ? "Ideal length"
    : isTooShort
      ? "Consider adding more detail"
      : "Consider trimming for conciseness";

  return (
    <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground" data-testid="word-count-indicator">
      <span className={colorClass} data-testid="text-word-count">{wordCount} words</span>
      <span className="text-muted-foreground/40">·</span>
      <span>{hint}</span>
      <span className="text-muted-foreground/40">·</span>
      <span>Optimal: 300–600</span>
    </div>
  );
}

function SkillBadge({ skill, onRemove, showChanges }: { skill: EditorSkill; onRemove: () => void; showChanges: boolean }) {
  const isAI = skill.addedByAI && showChanges;
  return (
    <Badge
      variant={isAI ? "secondary" : "outline"}
      className={isAI ? "border-primary/30 bg-primary/5" : ""}
      data-testid={`skill-${skill.name}`}
    >
      {isAI && <Sparkles className="w-3 h-3 mr-1 text-primary" />}
      {skill.name}
      <button onClick={onRemove} className="ml-1.5 opacity-70 hover:opacity-100" data-testid={`button-remove-skill-${skill.name}`}>
        <X className="w-3 h-3" />
      </button>
    </Badge>
  );
}

function getChanges(sections: EditorSections): Array<{ type: string; id: string }> {
  const changes: Array<{ type: string; id: string }> = [];
  if (sections.originalSummary && !sections.summaryReverted) {
    changes.push({ type: "summary", id: "summary" });
  }
  for (const exp of sections.experience) {
    for (const b of exp.bullets) {
      if ((b.originalText || b.addedByAI) && !b.reverted) {
        changes.push({ type: "bullet", id: b.id });
      }
    }
  }
  for (const s of sections.skills) {
    if (s.addedByAI) {
      changes.push({ type: "skill", id: s.name });
    }
  }
  return changes;
}

function countUngrounded(sections: EditorSections): number {
  let count = 0;
  if (sections.summaryGrounded === false && !sections.summaryReverted) count++;
  for (const exp of sections.experience) {
    for (const b of exp.bullets) {
      if (b.grounded === false && !b.reverted) count++;
    }
  }
  return count;
}
