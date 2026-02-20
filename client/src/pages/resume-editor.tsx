import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ArrowLeft,
  Check,
  X,
  Pencil,
  Download,
  FileText,
  FileDown,
  Package,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  Circle,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  Info,
  Shield,
  Target,
  ClipboardList,
} from "lucide-react";
import type { EditorSections, EditorBullet, RequirementItem, ToConfirmItem } from "@shared/schema";

type SaveStatus = "saved" | "saving" | "unsaved" | "error" | "conflict";

interface EditorData {
  sections: EditorSections;
  jobRequirements: RequirementItem[];
  toConfirmItems: ToConfirmItem[];
  readyToApply: "yes" | "almost" | "not_yet";
  counts: { improvementsApplied: number; needsConfirmation: number; missingRequirements: number };
  job: { id: number; title: string; company: string; description: string; requirements?: string };
  versionNumber: number;
  mode: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function ResumeEditor() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isPro } = useAuth();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(window.location.search);
  const jobId = parseInt(searchParams.get("jobId") || "0");
  const initialMode = searchParams.get("mode") === "model" ? "model" : "my";

  const [mode, setMode] = useState<"my" | "model">(initialMode);
  const [sections, setSections] = useState<EditorSections | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [versionNumber, setVersionNumber] = useState(1);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [highlightedBulletId, setHighlightedBulletId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<EditorSections[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSections[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  usePageTitle("Resume Editor");

  const editorQuery = useQuery<EditorData>({
    queryKey: ["/api/resume", resumeId, "editor", jobId, mode],
    queryFn: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      try {
        const res = await fetch(`/api/resume/${resumeId}/editor?jobId=${jobId}&mode=${mode}`, {
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
          throw new Error("The resume could not be parsed. Please try uploading again or use a different file format.");
        }
        return data;
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === "AbortError") {
          throw new Error("The request took too long. Please try again.");
        }
        throw err;
      }
    },
    enabled: !!resumeId && !!jobId && isAuthenticated,
    retry: 1,
    retryDelay: 2000,
  });

  useEffect(() => {
    if (editorQuery.data?.sections) {
      setSections(editorQuery.data.sections);
      setVersionNumber(editorQuery.data.versionNumber);
    }
  }, [editorQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (data: { sections: EditorSections; versionNumber: number }) => {
      const res = await apiRequest("POST", `/api/resume/${resumeId}/editor/save`, {
        sections: data.sections,
        jobId,
        mode,
        versionNumber: data.versionNumber,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSaveStatus("saved");
      setVersionNumber(data.versionNumber);
      if (editorQuery.data) {
        queryClient.setQueryData(["/api/resume", resumeId, "editor", jobId, mode], {
          ...editorQuery.data,
          readyToApply: data.readyToApply,
          counts: data.counts,
          toConfirmItems: data.toConfirmItems || editorQuery.data.toConfirmItems,
          versionNumber: data.versionNumber,
        });
      }
    },
    onError: (err: any) => {
      if (err?.message?.includes("409") || err?.status === 409) {
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
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      saveMutation.mutate({ sections: newSections, versionNumber });
    }, 800);
  }, [versionNumber, saveMutation]);

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
        return prev;
      });
      return stack.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack(stack => {
      if (stack.length === 0) return stack;
      const next = stack[stack.length - 1];
      setSections(current => {
        if (current) setUndoStack(us => [...us, current]);
        return next;
      });
      return stack.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const switchMode = useCallback((newMode: "my" | "model") => {
    if (newMode === mode) return;
    setMode(newMode);
    setSections(null);
    queryClient.invalidateQueries({ queryKey: ["/api/resume", resumeId, "editor", jobId, newMode] });
    const url = `/resume-editor/${resumeId}?jobId=${jobId}&mode=${newMode}`;
    window.history.replaceState(null, "", url);
  }, [mode, resumeId, jobId]);

  const downloadFile = useCallback(async (type: "pdf" | "docx" | "apply-pack") => {
    try {
      toast({ title: "Preparing download..." });
      const res = await fetch(`/api/resume/${resumeId}/export/${type}?jobId=${jobId}&mode=${mode}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(err.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = type === "apply-pack" ? "zip" : type;
      a.download = `Resume.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded successfully" });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  }, [resumeId, jobId, mode, toast]);

  const readyToApply = editorQuery.data?.readyToApply || "not_yet";
  const counts = editorQuery.data?.counts || { improvementsApplied: 0, needsConfirmation: 0, missingRequirements: 0 };
  const requirements = editorQuery.data?.jobRequirements || [];
  const toConfirmItems = editorQuery.data?.toConfirmItems || [];
  const job = editorQuery.data?.job;

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="editor-auth-required">
        <Card><CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Please sign in to use the resume editor.</p>
          <Button className="mt-4" onClick={() => setLocation("/auth")} data-testid="button-sign-in">Sign In</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (editorQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="editor-error">
        <Card><CardContent className="p-8 text-center max-w-md space-y-4">
          <AlertTriangle className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">{editorQuery.error?.message || "We couldn't load the editor. Please try again."}</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => editorQuery.refetch()} data-testid="button-retry">
              Try again
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.history.back()} data-testid="button-go-back">
              Go back
            </Button>
          </div>
        </CardContent></Card>
      </div>
    );
  }

  if (editorQuery.isLoading || !sections) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="editor-loading">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            {mode === "model" ? "Building your tailored resume..." : "Analyzing your resume against this role..."}
          </p>
          <p className="text-xs text-muted-foreground">This usually takes 10-15 seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="resume-editor">
      <EditorHeader
        job={job}
        mode={mode}
        onSwitchMode={switchMode}
        saveStatus={saveStatus}
        readyToApply={readyToApply}
        counts={counts}
        onDownload={downloadFile}
        onUndo={undo}
        onRedo={redo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        isPro={isPro}
        showConfirm={showConfirm}
        onToggleConfirm={() => setShowConfirm(!showConfirm)}
        confirmCount={toConfirmItems.filter(i => !i.resolved).length}
      />

      <div className="flex flex-1 overflow-hidden">
        {showRequirements && (
          <RequirementsDrawer
            requirements={requirements}
            onClose={() => setShowRequirements(false)}
            onJumpTo={(refs) => {
              if (refs.length > 0) setHighlightedBulletId(refs[0]);
            }}
          />
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-8 px-6">
            {sections.strengthNotes && sections.strengthNotes.length > 0 && (
              <div className="mb-6 p-4 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900" data-testid="strength-notes">
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-1">Your strengths for this role</p>
                    {sections.strengthNotes.map((note, i) => (
                      <p key={i} className="text-xs text-emerald-700 dark:text-emerald-400">{note}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {showConfirm && toConfirmItems.length > 0 && (
              <ConfirmQueue items={toConfirmItems} />
            )}

            <ResumeContent
              sections={sections}
              onUpdate={updateSections}
              highlightedBulletId={highlightedBulletId}
              onClearHighlight={() => setHighlightedBulletId(null)}
              mode={mode}
            />
          </div>
        </div>

        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-card border rounded-r-md shadow-sm"
          onClick={() => setShowRequirements(!showRequirements)}
          data-testid="button-toggle-requirements"
        >
          {showRequirements ? <ChevronLeft className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function EditorHeader({
  job, mode, onSwitchMode, saveStatus, readyToApply, counts, onDownload, onUndo, onRedo, canUndo, canRedo, isPro, showConfirm, onToggleConfirm, confirmCount,
}: {
  job: EditorData["job"] | undefined;
  mode: "my" | "model";
  onSwitchMode: (mode: "my" | "model") => void;
  saveStatus: SaveStatus;
  readyToApply: string;
  counts: EditorData["counts"];
  onDownload: (type: "pdf" | "docx" | "apply-pack") => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isPro: boolean;
  showConfirm: boolean;
  onToggleConfirm: () => void;
  confirmCount: number;
}) {
  const backHref = job ? `/jobs/${job.id}` : "/jobs";

  return (
    <div className="border-b bg-card sticky top-0 z-30" data-testid="editor-header">
      <div className="flex items-center justify-between gap-3 px-4 py-2 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={backHref}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          {job && (
            <Link href={backHref} className="min-w-0">
              <p className="text-sm font-medium truncate hover:underline" data-testid="text-job-title">{job.title}</p>
              <p className="text-xs text-muted-foreground truncate">{job.company}</p>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border rounded-md overflow-visible" data-testid="mode-toggle">
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${mode === "my" ? "bg-primary text-primary-foreground" : "hover-elevate"}`}
              onClick={() => onSwitchMode("my")}
              data-testid="button-mode-my"
            >
              My Resume
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${mode === "model" ? "bg-primary text-primary-foreground" : "hover-elevate"}`}
              onClick={() => onSwitchMode("model")}
              data-testid="button-mode-model"
            >
              Model Resume
            </button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} data-testid="button-undo">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} data-testid="button-redo">
            <Redo2 className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <SaveIndicator status={saveStatus} />

          <Separator orientation="vertical" className="h-6" />

          <Button variant="outline" size="sm" onClick={() => onDownload("pdf")} data-testid="button-download-pdf">
            <FileDown className="w-4 h-4 mr-1" />PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDownload("docx")} data-testid="button-download-docx">
            <FileText className="w-4 h-4 mr-1" />DOCX
          </Button>
          {isPro && (
            <Button variant="outline" size="sm" onClick={() => onDownload("apply-pack")} data-testid="button-download-pack">
              <Package className="w-4 h-4 mr-1" />Apply Pack
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-1.5 bg-muted/30 text-xs flex-wrap">
        <div className="flex items-center gap-4 flex-wrap" data-testid="change-summary-bar">
          <ReadyBadge status={readyToApply} />
          <span className="text-muted-foreground" data-testid="text-improvements">
            {counts.improvementsApplied} improvements applied
          </span>
          {counts.needsConfirmation > 0 && (
            <button
              className="text-amber-600 dark:text-amber-400 hover-elevate px-1 rounded"
              onClick={onToggleConfirm}
              data-testid="button-toggle-confirm-queue"
            >
              {counts.needsConfirmation} needs confirmation
            </button>
          )}
          {counts.missingRequirements > 0 && (
            <span className="text-muted-foreground" data-testid="text-missing">
              {counts.missingRequirements} missing requirements
            </span>
          )}
          {confirmCount > 0 && (
            <button
              className="text-amber-600 dark:text-amber-400 underline text-xs"
              onClick={onToggleConfirm}
              data-testid="button-to-confirm"
            >
              To confirm ({confirmCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  switch (status) {
    case "saving":
      return <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="save-status"><Loader2 className="w-3 h-3 animate-spin" />Saving...</span>;
    case "saved":
      return <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1" data-testid="save-status"><CheckCircle className="w-3 h-3" />Saved</span>;
    case "unsaved":
      return <span className="text-xs text-muted-foreground" data-testid="save-status">Unsaved changes</span>;
    case "error":
      return <span className="text-xs text-red-500 flex items-center gap-1" data-testid="save-status"><AlertTriangle className="w-3 h-3" />Save failed</span>;
    case "conflict":
      return <span className="text-xs text-red-500 flex items-center gap-1" data-testid="save-status"><AlertTriangle className="w-3 h-3" />Conflict</span>;
  }
}

function ReadyBadge({ status }: { status: string }) {
  switch (status) {
    case "yes":
      return <Badge variant="default" className="bg-green-600 text-white" data-testid="badge-ready"><CheckCircle className="w-3 h-3 mr-1" />Ready to Apply</Badge>;
    case "almost":
      return <Badge variant="secondary" className="text-amber-700 dark:text-amber-300" data-testid="badge-ready"><Circle className="w-3 h-3 mr-1" />Almost Ready</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-ready"><AlertTriangle className="w-3 h-3 mr-1" />Not Yet Ready</Badge>;
  }
}

function RequirementsDrawer({
  requirements, onClose, onJumpTo,
}: {
  requirements: RequirementItem[];
  onClose: () => void;
  onJumpTo: (refs: string[]) => void;
}) {
  const grouped = useMemo(() => ({
    must_have: requirements.filter(r => r.category === "must_have"),
    nice_to_have: requirements.filter(r => r.category === "nice_to_have"),
    tools_keywords: requirements.filter(r => r.category === "tools_keywords"),
  }), [requirements]);

  return (
    <div className="w-80 border-r bg-card overflow-y-auto shrink-0" data-testid="requirements-drawer">
      <div className="flex items-center justify-between gap-2 p-3 border-b sticky top-0 bg-card z-10">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Job Requirements</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-requirements">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 space-y-4">
        {grouped.must_have.length > 0 && (
          <RequirementGroup title="Must Have" items={grouped.must_have} onJumpTo={onJumpTo} />
        )}
        {grouped.nice_to_have.length > 0 && (
          <RequirementGroup title="Nice to Have" items={grouped.nice_to_have} onJumpTo={onJumpTo} />
        )}
        {grouped.tools_keywords.length > 0 && (
          <RequirementGroup title="Tools & Keywords" items={grouped.tools_keywords} onJumpTo={onJumpTo} />
        )}
        {requirements.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No requirements extracted yet.</p>
        )}
      </div>
    </div>
  );
}

function RequirementGroup({
  title, items, onJumpTo,
}: {
  title: string;
  items: RequirementItem[];
  onJumpTo: (refs: string[]) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-1.5">
        {items.map(item => (
          <button
            key={item.id}
            className="w-full text-left p-2 rounded-md text-sm hover-elevate flex items-start gap-2"
            onClick={() => onJumpTo(item.evidenceRefs)}
            data-testid={`requirement-${item.id}`}
          >
            <CoverageBadge coverage={item.coverage} />
            <span className="flex-1 leading-snug">{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CoverageBadge({ coverage }: { coverage: string }) {
  switch (coverage) {
    case "covered":
      return <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />;
    case "partial":
      return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
    default:
      return <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />;
  }
}

function ConfirmQueue({ items }: { items: ToConfirmItem[] }) {
  const unresolved = items.filter(i => !i.resolved);
  if (unresolved.length === 0) return null;

  return (
    <Card className="mb-6 border-amber-200 dark:border-amber-800" data-testid="confirm-queue">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">Items to Confirm</span>
        </div>
        <div className="space-y-2">
          {unresolved.map(item => (
            <div key={item.id} className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 text-sm" data-testid={`confirm-item-${item.id}`}>
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p>{item.prompt}</p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {item.severity === "high" ? "Important" : item.severity === "medium" ? "Recommended" : "Optional"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ResumeContent({
  sections, onUpdate, highlightedBulletId, onClearHighlight, mode,
}: {
  sections: EditorSections;
  onUpdate: (updater: (prev: EditorSections) => EditorSections) => void;
  highlightedBulletId: string | null;
  onClearHighlight: () => void;
  mode: "my" | "model";
}) {
  return (
    <div className="space-y-6" data-testid="resume-content">
      <ContactSection contact={sections.contact} onUpdate={onUpdate} />
      <SummarySection
        summary={sections.summary}
        suggestion={sections.summarySuggestion}
        suggestionStatus={sections.summarySuggestionStatus}
        grounded={sections.summarySuggestionGrounded}
        onUpdate={onUpdate}
        mode={mode}
      />
      <ExperienceSection
        experience={sections.experience}
        onUpdate={onUpdate}
        highlightedBulletId={highlightedBulletId}
        onClearHighlight={onClearHighlight}
        mode={mode}
      />
      <EducationSection education={sections.education} onUpdate={onUpdate} />
      <SkillsSection skills={sections.skills} onUpdate={onUpdate} />
      <CertificationsSection certifications={sections.certifications} onUpdate={onUpdate} />
    </div>
  );
}

function InlineEdit({
  value, onChange, className = "", multiline = false, placeholder = "", testId = "",
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  testId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
      lastValueRef.current = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    const text = ref.current?.textContent || "";
    if (text !== lastValueRef.current) {
      lastValueRef.current = text;
      onChange(text);
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
    }
  }, [multiline]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 -mx-1 ${className}`}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
      data-testid={testId}
      style={{ minHeight: "1.5em" }}
    />
  );
}

function ContactSection({
  contact, onUpdate,
}: {
  contact: EditorSections["contact"];
  onUpdate: (updater: (prev: EditorSections) => EditorSections) => void;
}) {
  const updateField = useCallback((field: keyof typeof contact, value: string) => {
    onUpdate(prev => ({ ...prev, contact: { ...prev.contact, [field]: value } }));
  }, [onUpdate]);

  return (
    <div className="text-center space-y-1" data-testid="section-contact">
      <InlineEdit
        value={contact.fullName}
        onChange={(v) => updateField("fullName", v)}
        className="text-xl font-bold"
        placeholder="Your Name"
        testId="edit-fullname"
      />
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground flex-wrap">
        <InlineEdit value={contact.email} onChange={(v) => updateField("email", v)} placeholder="email@example.com" testId="edit-email" />
        {(contact.phone || true) && (
          <>
            <span className="text-muted-foreground">|</span>
            <InlineEdit value={contact.phone} onChange={(v) => updateField("phone", v)} placeholder="Phone" testId="edit-phone" />
          </>
        )}
        {(contact.location || true) && (
          <>
            <span className="text-muted-foreground">|</span>
            <InlineEdit value={contact.location} onChange={(v) => updateField("location", v)} placeholder="Location" testId="edit-location" />
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <div className="border-b border-foreground/20 pb-1 mb-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/70">{children}</h2>
    </div>
  );
}

function SummarySection({
  summary, suggestion, suggestionStatus, grounded, onUpdate, mode,
}: {
  summary: string;
  suggestion?: string;
  suggestionStatus?: string;
  grounded?: boolean;
  onUpdate: (updater: (prev: EditorSections) => EditorSections) => void;
  mode: string;
}) {
  const hasSuggestion = mode === "model" && suggestion && suggestionStatus === "pending";

  return (
    <div data-testid="section-summary">
      <SectionHeading>Professional Summary</SectionHeading>
      {hasSuggestion && (
        <SuggestionBar
          original={summary}
          suggested={suggestion!}
          grounded={grounded !== false}
          onAccept={() => onUpdate(prev => ({
            ...prev,
            summary: suggestion!,
            summarySuggestion: suggestion,
            summarySuggestionStatus: "accepted",
          }))}
          onReject={() => onUpdate(prev => ({
            ...prev,
            summarySuggestionStatus: "rejected",
          }))}
          testId="suggestion-summary"
        />
      )}
      <InlineEdit
        value={suggestionStatus === "accepted" && suggestion ? suggestion : summary}
        onChange={(v) => onUpdate(prev => ({ ...prev, summary: v }))}
        multiline
        className="text-sm leading-relaxed"
        placeholder="Write your professional summary..."
        testId="edit-summary"
      />
    </div>
  );
}

function SuggestionBar({
  original, suggested, grounded, onAccept, onReject, testId,
}: {
  original: string;
  suggested: string;
  grounded: boolean;
  onAccept: () => void;
  onReject: () => void;
  testId: string;
}) {
  return (
    <div className="mb-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs" data-testid={testId}>
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3 text-blue-500" />
          <span className="font-medium">AI Suggestion</span>
          {!grounded && (
            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 text-xs ml-1">Confirm this is true</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onAccept} className="h-6 text-xs" data-testid={`${testId}-accept`}>
            <Check className="w-3 h-3 mr-1" />Accept
          </Button>
          <Button variant="ghost" size="sm" onClick={onReject} className="h-6 text-xs" data-testid={`${testId}-reject`}>
            <X className="w-3 h-3 mr-1" />Keep Original
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground leading-snug">{suggested}</p>
    </div>
  );
}

function ExperienceSection({
  experience, onUpdate, highlightedBulletId, onClearHighlight, mode,
}: {
  experience: EditorSections["experience"];
  onUpdate: (updater: (prev: EditorSections) => EditorSections) => void;
  highlightedBulletId: string | null;
  onClearHighlight: () => void;
  mode: string;
}) {
  const addExperience = useCallback(() => {
    onUpdate(prev => ({
      ...prev,
      experience: [...prev.experience, {
        id: generateId(),
        company: "",
        title: "",
        location: "",
        startDate: "",
        endDate: "Present",
        current: true,
        bullets: [{ id: generateId(), text: "", status: "pending" as const, grounded: true }],
      }],
    }));
  }, [onUpdate]);

  const updateExp = useCallback((expIdx: number, field: string, value: any) => {
    onUpdate(prev => ({
      ...prev,
      experience: prev.experience.map((e, i) => i === expIdx ? { ...e, [field]: value } : e),
    }));
  }, [onUpdate]);

  const removeExp = useCallback((expIdx: number) => {
    onUpdate(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== expIdx),
    }));
  }, [onUpdate]);

  const addBullet = useCallback((expIdx: number) => {
    onUpdate(prev => ({
      ...prev,
      experience: prev.experience.map((e, i) => i === expIdx ? {
        ...e,
        bullets: [...e.bullets, { id: generateId(), text: "", status: "pending" as const, grounded: true }],
      } : e),
    }));
  }, [onUpdate]);

  const updateBullet = useCallback((expIdx: number, bulletIdx: number, text: string) => {
    onUpdate(prev => ({
      ...prev,
      experience: prev.experience.map((e, i) => i === expIdx ? {
        ...e,
        bullets: e.bullets.map((b, j) => j === bulletIdx ? { ...b, text } : b),
      } : e),
    }));
  }, [onUpdate]);

  const removeBullet = useCallback((expIdx: number, bulletIdx: number) => {
    onUpdate(prev => ({
      ...prev,
      experience: prev.experience.map((e, i) => i === expIdx ? {
        ...e,
        bullets: e.bullets.filter((_, j) => j !== bulletIdx),
      } : e),
    }));
  }, [onUpdate]);

  const acceptSuggestion = useCallback((expIdx: number, bulletIdx: number) => {
    onUpdate(prev => ({
      ...prev,
      experience: prev.experience.map((e, i) => i === expIdx ? {
        ...e,
        bullets: e.bullets.map((b, j) => j === bulletIdx && b.suggestion ? { ...b, text: b.suggestion, status: "accepted" as const } : b),
      } : e),
    }));
  }, [onUpdate]);

  const rejectSuggestion = useCallback((expIdx: number, bulletIdx: number) => {
    onUpdate(prev => ({
      ...prev,
      experience: prev.experience.map((e, i) => i === expIdx ? {
        ...e,
        bullets: e.bullets.map((b, j) => j === bulletIdx ? { ...b, status: "rejected" as const } : b),
      } : e),
    }));
  }, [onUpdate]);

  const handleBulletKeyDown = useCallback((e: React.KeyboardEvent, expIdx: number, bulletIdx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBullet(expIdx);
    }
    if (e.key === "Backspace") {
      const target = e.currentTarget as HTMLElement;
      if (target.textContent === "" && experience[expIdx].bullets.length > 1) {
        e.preventDefault();
        removeBullet(expIdx, bulletIdx);
      }
    }
  }, [addBullet, removeBullet, experience]);

  return (
    <div data-testid="section-experience">
      <SectionHeading>Experience</SectionHeading>
      {experience.map((exp, expIdx) => (
        <div key={exp.id} className="mb-5 group" data-testid={`experience-${exp.id}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <InlineEdit
                  value={exp.title}
                  onChange={(v) => updateExp(expIdx, "title", v)}
                  className="font-semibold text-sm"
                  placeholder="Job Title"
                  testId={`edit-exp-title-${expIdx}`}
                />
                <span className="text-muted-foreground text-sm">|</span>
                <InlineEdit
                  value={exp.company}
                  onChange={(v) => updateExp(expIdx, "company", v)}
                  className="text-sm"
                  placeholder="Company"
                  testId={`edit-exp-company-${expIdx}`}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                <InlineEdit value={exp.location} onChange={(v) => updateExp(expIdx, "location", v)} placeholder="Location" testId={`edit-exp-location-${expIdx}`} />
                <span>|</span>
                <InlineEdit value={exp.startDate} onChange={(v) => updateExp(expIdx, "startDate", v)} placeholder="Start" testId={`edit-exp-start-${expIdx}`} />
                <span>-</span>
                <InlineEdit value={exp.endDate} onChange={(v) => updateExp(expIdx, "endDate", v)} placeholder="End" testId={`edit-exp-end-${expIdx}`} />
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={() => removeExp(expIdx)}
              data-testid={`button-remove-exp-${expIdx}`}
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          <div className="mt-2 space-y-1 pl-4">
            {exp.bullets.map((bullet, bIdx) => (
              <BulletItem
                key={bullet.id}
                bullet={bullet}
                isHighlighted={highlightedBulletId === `experience.${expIdx}.bullets.${bIdx}` || highlightedBulletId === bullet.id}
                onClearHighlight={onClearHighlight}
                onChange={(text) => updateBullet(expIdx, bIdx, text)}
                onKeyDown={(e) => handleBulletKeyDown(e, expIdx, bIdx)}
                onAccept={() => acceptSuggestion(expIdx, bIdx)}
                onReject={() => rejectSuggestion(expIdx, bIdx)}
                onRemove={() => removeBullet(expIdx, bIdx)}
                mode={mode}
                testIdPrefix={`exp-${expIdx}-bullet-${bIdx}`}
              />
            ))}
            <button
              className="text-xs text-muted-foreground flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity hover-elevate rounded px-1"
              onClick={() => addBullet(expIdx)}
              data-testid={`button-add-bullet-${expIdx}`}
            >
              <Plus className="w-3 h-3" /> Add bullet
            </button>
          </div>
        </div>
      ))}
      <button
        className="text-xs text-muted-foreground flex items-center gap-1 hover-elevate rounded px-2 py-1"
        onClick={addExperience}
        data-testid="button-add-experience"
      >
        <Plus className="w-3 h-3" /> Add experience
      </button>
    </div>
  );
}

function BulletItem({
  bullet, isHighlighted, onClearHighlight, onChange, onKeyDown, onAccept, onReject, onRemove, mode, testIdPrefix,
}: {
  bullet: EditorBullet;
  isHighlighted: boolean;
  onClearHighlight: () => void;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onAccept: () => void;
  onReject: () => void;
  onRemove: () => void;
  mode: string;
  testIdPrefix: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hasSuggestion = mode === "model" && bullet.suggestion && bullet.status === "pending";

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(onClearHighlight, 2000);
    }
  }, [isHighlighted, onClearHighlight]);

  return (
    <div
      ref={ref}
      className={`group/bullet relative flex items-start gap-1 ${isHighlighted ? "bg-yellow-100 dark:bg-yellow-900/30 rounded" : ""}`}
      data-testid={testIdPrefix}
    >
      <span className="text-muted-foreground mt-1 shrink-0 text-xs select-none">&#8226;</span>
      <div className="flex-1 min-w-0">
        {hasSuggestion && (
          <div className="mb-1 p-1.5 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-xs" data-testid={`${testIdPrefix}-suggestion`}>
            <div className="flex items-center justify-between gap-1 mb-0.5 flex-wrap">
              <div className="flex items-center gap-1">
                <Info className="w-3 h-3 text-blue-500" />
                {!bullet.grounded && (
                  <span className="text-amber-600 dark:text-amber-400 text-xs">Confirm this is true</span>
                )}
                {bullet.improvementNote && (
                  <span className="text-muted-foreground">{bullet.improvementNote}</span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={onAccept} className="text-green-600 hover-elevate rounded p-0.5" data-testid={`${testIdPrefix}-accept`}>
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={onReject} className="text-red-400 hover-elevate rounded p-0.5" data-testid={`${testIdPrefix}-reject`}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-muted-foreground leading-snug">{bullet.suggestion}</p>
          </div>
        )}
        <div
          contentEditable
          suppressContentEditableWarning
          className="outline-none text-sm leading-relaxed focus:ring-1 focus:ring-primary/30 rounded px-1 -mx-1"
          onInput={(e) => onChange((e.target as HTMLElement).textContent || "")}
          onKeyDown={onKeyDown}
          data-testid={`${testIdPrefix}-edit`}
          dangerouslySetInnerHTML={{ __html: bullet.status === "accepted" && bullet.suggestion ? bullet.suggestion : bullet.text }}
        />
        {bullet.status === "needs_confirmation" && (
          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
            <AlertTriangle className="w-3 h-3" />Confirm this is true
          </span>
        )}
      </div>
      <button
        className="opacity-0 group-hover/bullet:opacity-100 text-muted-foreground hover-elevate rounded p-0.5 shrink-0"
        onClick={onRemove}
        data-testid={`${testIdPrefix}-remove`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function EducationSection({
  education, onUpdate,
}: {
  education: EditorSections["education"];
  onUpdate: (updater: (prev: EditorSections) => EditorSections) => void;
}) {
  const addEdu = useCallback(() => {
    onUpdate(prev => ({
      ...prev,
      education: [...prev.education, { id: generateId(), institution: "", degree: "", field: "", graduationDate: "" }],
    }));
  }, [onUpdate]);

  return (
    <div data-testid="section-education">
      <SectionHeading>Education</SectionHeading>
      {education.map((edu, idx) => (
        <div key={edu.id} className="mb-3 group" data-testid={`education-${edu.id}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <InlineEdit
                  value={edu.degree}
                  onChange={(v) => onUpdate(prev => ({
                    ...prev,
                    education: prev.education.map((e, i) => i === idx ? { ...e, degree: v } : e),
                  }))}
                  className="font-semibold text-sm"
                  placeholder="Degree"
                  testId={`edit-edu-degree-${idx}`}
                />
                {edu.field && <span className="text-sm text-muted-foreground">in</span>}
                <InlineEdit
                  value={edu.field}
                  onChange={(v) => onUpdate(prev => ({
                    ...prev,
                    education: prev.education.map((e, i) => i === idx ? { ...e, field: v } : e),
                  }))}
                  className="text-sm"
                  placeholder="Field of Study"
                  testId={`edit-edu-field-${idx}`}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <InlineEdit
                  value={edu.institution}
                  onChange={(v) => onUpdate(prev => ({
                    ...prev,
                    education: prev.education.map((e, i) => i === idx ? { ...e, institution: v } : e),
                  }))}
                  placeholder="Institution"
                  testId={`edit-edu-institution-${idx}`}
                />
                <span>|</span>
                <InlineEdit
                  value={edu.graduationDate}
                  onChange={(v) => onUpdate(prev => ({
                    ...prev,
                    education: prev.education.map((e, i) => i === idx ? { ...e, graduationDate: v } : e),
                  }))}
                  placeholder="Graduation Date"
                  testId={`edit-edu-date-${idx}`}
                />
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 shrink-0"
              onClick={() => onUpdate(prev => ({ ...prev, education: prev.education.filter((_, i) => i !== idx) }))}
              data-testid={`button-remove-edu-${idx}`}
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      ))}
      <button
        className="text-xs text-muted-foreground flex items-center gap-1 hover-elevate rounded px-2 py-1"
        onClick={addEdu}
        data-testid="button-add-education"
      >
        <Plus className="w-3 h-3" /> Add education
      </button>
    </div>
  );
}

function SkillsSection({
  skills, onUpdate,
}: {
  skills: string[];
  onUpdate: (updater: (prev: EditorSections) => EditorSections) => void;
}) {
  const [newSkill, setNewSkill] = useState("");

  const addSkill = useCallback(() => {
    if (!newSkill.trim()) return;
    onUpdate(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
    setNewSkill("");
  }, [newSkill, onUpdate]);

  const removeSkill = useCallback((idx: number) => {
    onUpdate(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== idx) }));
  }, [onUpdate]);

  return (
    <div data-testid="section-skills">
      <SectionHeading>Skills</SectionHeading>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill, idx) => (
          <Badge key={idx} variant="secondary" className="group/skill" data-testid={`skill-${idx}`}>
            {skill}
            <button
              className="ml-1 opacity-0 group-hover/skill:opacity-100"
              onClick={() => removeSkill(idx)}
              data-testid={`button-remove-skill-${idx}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            placeholder="Add skill..."
            className="text-xs bg-transparent border-none outline-none w-24 focus:w-32 transition-all"
            data-testid="input-add-skill"
          />
        </div>
      </div>
    </div>
  );
}

function CertificationsSection({
  certifications, onUpdate,
}: {
  certifications: EditorSections["certifications"];
  onUpdate: (updater: (prev: EditorSections) => EditorSections) => void;
}) {
  const addCert = useCallback(() => {
    onUpdate(prev => ({
      ...prev,
      certifications: [...prev.certifications, { id: generateId(), name: "", issuer: "", date: "" }],
    }));
  }, [onUpdate]);

  return (
    <div data-testid="section-certifications">
      <SectionHeading>Certifications</SectionHeading>
      {certifications.map((cert, idx) => (
        <div key={cert.id} className="flex items-center gap-2 mb-1 group flex-wrap" data-testid={`cert-${cert.id}`}>
          <InlineEdit
            value={cert.name}
            onChange={(v) => onUpdate(prev => ({
              ...prev,
              certifications: prev.certifications.map((c, i) => i === idx ? { ...c, name: v } : c),
            }))}
            className="font-medium text-sm"
            placeholder="Certification Name"
            testId={`edit-cert-name-${idx}`}
          />
          <span className="text-muted-foreground text-sm">-</span>
          <InlineEdit
            value={cert.issuer}
            onChange={(v) => onUpdate(prev => ({
              ...prev,
              certifications: prev.certifications.map((c, i) => i === idx ? { ...c, issuer: v } : c),
            }))}
            className="text-sm"
            placeholder="Issuer"
            testId={`edit-cert-issuer-${idx}`}
          />
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 shrink-0"
            onClick={() => onUpdate(prev => ({
              ...prev,
              certifications: prev.certifications.filter((_, i) => i !== idx),
            }))}
            data-testid={`button-remove-cert-${idx}`}
          >
            <Trash2 className="w-3 h-3 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <button
        className="text-xs text-muted-foreground flex items-center gap-1 hover-elevate rounded px-2 py-1"
        onClick={addCert}
        data-testid="button-add-certification"
      >
        <Plus className="w-3 h-3" /> Add certification
      </button>
    </div>
  );
}
