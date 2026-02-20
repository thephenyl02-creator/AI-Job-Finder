import { useState, useCallback, useEffect, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, ArrowLeft, CheckCircle, AlertTriangle, Undo2, Redo2,
  Download, FileText, FileDown, Package, RotateCcw, X, Sparkles,
  Plus, Diff, Info,
} from "lucide-react";
import type { EditorSections, EditorBullet, EditorSkill, EditorExperience, EditorEducation } from "@shared/schema";

type SaveStatus = "saved" | "saving" | "unsaved" | "error" | "conflict";

interface EditorData {
  sections: EditorSections;
  jobRequirements: unknown[];
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
  "Analyzing the role...",
  "Rewriting your experience...",
  "Final polish...",
];

function StagedLoading() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage(s => (s < LOADING_STAGES.length - 1 ? s + 1 : s));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const progress = ((stage + 1) / LOADING_STAGES.length) * 100;

  return (
    <div className="flex items-center justify-center min-h-screen" data-testid="editor-loading">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8 text-center space-y-6">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-foreground font-medium transition-opacity duration-500" key={stage}>
            {LOADING_STAGES[stage]}
          </p>
          <Progress value={progress} className="h-1" />
          <p className="text-xs text-muted-foreground">This usually takes 10-15 seconds</p>
        </CardContent>
      </Card>
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
      return <span className="text-xs text-red-500 flex items-center gap-1" data-testid="save-status"><AlertTriangle className="w-3 h-3" />Conflict - refresh</span>;
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
          className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 text-primary opacity-70 hover:opacity-100 transition-opacity"
          data-testid="button-view-change"
          onClick={(e) => e.stopPropagation()}
        >
          <Diff className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="start" data-testid="change-popover">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Original</p>
          <p className="text-sm text-muted-foreground italic">{originalText}</p>
        </div>
        {reason && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Why it changed</p>
            <p className="text-sm">{reason}</p>
          </div>
        )}
        {grounded === false && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">We added details -- please verify accuracy</p>
          </div>
        )}
        {isReverted ? (
          <Button variant="outline" size="sm" onClick={onUnrevert} data-testid="button-unrevert-item">
            <Sparkles className="w-3 h-3 mr-1" />Accept AI version
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onRevert} data-testid="button-revert-item">
            <RotateCcw className="w-3 h-3 mr-1" />Revert
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ImprovementsBar({ sections }: { sections: EditorSections }) {
  const breakdown = sections.changeBreakdown;
  if (!breakdown) {
    const count = sections.changedCount || 0;
    if (count === 0) return <span className="text-muted-foreground" data-testid="text-improvements">No changes yet</span>;
    return <span className="text-muted-foreground" data-testid="text-improvements">{count} improvements made</span>;
  }

  const parts: string[] = [];
  if (breakdown.summaryRewritten) parts.push("Summary rewritten");
  if (breakdown.bulletsSharpened > 0) parts.push(`${breakdown.bulletsSharpened} bullet${breakdown.bulletsSharpened === 1 ? "" : "s"} sharpened`);
  if (breakdown.bulletsGenerated > 0) parts.push(`${breakdown.bulletsGenerated} bullet${breakdown.bulletsGenerated === 1 ? "" : "s"} generated`);
  if (breakdown.skillsAdded > 0) parts.push(`${breakdown.skillsAdded} skill${breakdown.skillsAdded === 1 ? "" : "s"} added`);

  if (parts.length === 0) return <span className="text-muted-foreground" data-testid="text-improvements">No changes yet</span>;

  return <span className="text-muted-foreground" data-testid="text-improvements">{parts.join(", ")}</span>;
}

export default function ResumeEditor() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isPro } = useAuth();
  const { toast } = useToast();

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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const downloadFile = useCallback(async (type: "pdf" | "docx" | "apply-pack") => {
    try {
      toast({ title: "Preparing download..." });
      await flushSave();
      const res = await fetch(`/api/resume/${resumeId}/export/${type}?jobId=${jobId}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(err.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const name = sections?.contact?.fullName?.replace(/[^a-zA-Z0-9]/g, "_") || "Resume";
      const company = editorQuery.data?.job?.company?.replace(/[^a-zA-Z0-9]/g, "_") || "";
      const baseName = company ? `${name}_${company}` : name;
      a.download = `${baseName}.${type === "apply-pack" ? "zip" : type}`;
      a.click();
      URL.revokeObjectURL(url);

      const job = editorQuery.data?.job;
      toast({
        title: "Download complete",
        description: "Your resume has been downloaded.",
        action: (
          <div className="flex items-center gap-2">
            {(job as any)?.applyUrl && (
              <Button size="sm" variant="default" onClick={() => window.open((job as any).applyUrl, "_blank")} data-testid="button-apply-now">
                Apply Now
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setLocation("/jobs")} data-testid="button-tailor-another">
              Another role
            </Button>
          </div>
        ),
      });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  }, [resumeId, jobId, toast, editorQuery.data?.job, setLocation, flushSave, sections]);

  const revertAll = useCallback(() => {
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
    toast({ title: "All changes reverted" });
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
  const ungroundedCount = sections ? countUngrounded(sections) : 0;

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
    const msg = editorQuery.error?.message || "We couldn't load the editor. Please try again.";
    const isParseError = msg.includes("couldn't read");
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="editor-error">
        <Card><CardContent className="p-8 text-center max-w-md space-y-4">
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
    return <StagedLoading />;
  }

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="resume-editor">
      <div className="border-b bg-card sticky top-0 z-30" data-testid="editor-header">
        <div className="flex items-center justify-between gap-3 px-4 py-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <Link href={job ? `/jobs/${job.id}` : "/jobs"}>
              <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            {job && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" data-testid="text-job-title">Resume for {job.title} at {job.company}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="icon" onClick={undo} disabled={undoStack.length === 0} data-testid="button-undo">
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={redo} disabled={redoStack.length === 0} data-testid="button-redo">
              <Redo2 className="w-4 h-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <SaveIndicator status={saveStatus} />
            <Separator orientation="vertical" className="h-6" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-export">
                  <Download className="w-4 h-4 mr-1" />Export
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

        <div className="flex items-center justify-between gap-3 px-4 py-1.5 bg-muted/30 text-xs flex-wrap" data-testid="status-bar">
          <div className="flex items-center gap-4 flex-wrap">
            <ImprovementsBar sections={sections} />
            {ungroundedCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400" data-testid="text-ungrounded">
                {ungroundedCount} {ungroundedCount === 1 ? "item" : "items"} to verify
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={revertAll} data-testid="button-revert-all">
            <RotateCcw className="w-3 h-3 mr-1" />Revert All
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-8">
          {sections.rewriteWarning && (
            <div className="p-4 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900" data-testid="rewrite-warning">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">{sections.rewriteWarning}</p>
              </div>
            </div>
          )}

          {sections.strengthNotes && sections.strengthNotes.length > 0 && (
            <div className="p-4 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900" data-testid="strength-notes">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-1">Your strengths for this role</p>
              {sections.strengthNotes.map((note, i) => (
                <p key={i} className="text-xs text-emerald-700 dark:text-emerald-400">{note}</p>
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
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Summary</h2>
            <SummaryBlock sections={sections} onUpdate={updateSections} />
          </section>

          <Separator />

          <section data-testid="section-experience">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Experience</h2>
              <Button variant="ghost" size="sm" onClick={addExperience} data-testid="button-add-experience">
                <Plus className="w-3 h-3 mr-1" />Add
              </Button>
            </div>
            {sections.experience.length === 0 && (
              <p className="text-sm text-muted-foreground italic" data-testid="text-no-experience">No experience entries yet. Click Add to create one.</p>
            )}
            {sections.experience.map(exp => (
              <ExperienceBlock
                key={exp.id}
                exp={exp}
                onUpdate={updateSections}
                onAddBullet={addBullet}
                onRemoveBullet={removeBullet}
              />
            ))}
          </section>

          <Separator />

          <section data-testid="section-education">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Education</h2>
              <Button variant="ghost" size="sm" onClick={addEducation} data-testid="button-add-education">
                <Plus className="w-3 h-3 mr-1" />Add
              </Button>
            </div>
            {sections.education.length === 0 && (
              <p className="text-sm text-muted-foreground italic" data-testid="text-no-education">No education entries yet.</p>
            )}
            {sections.education.map(edu => (
              <EducationBlock key={edu.id} edu={edu} onUpdate={updateSections} />
            ))}
          </section>

          <Separator />

          <section data-testid="section-skills">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {sections.skills.map((skill, idx) => (
                <SkillBadge
                  key={`${skill.name}-${idx}`}
                  skill={skill}
                  onRemove={() => updateSections(s => ({ ...s, skills: s.skills.filter((_, i) => i !== idx) }))}
                />
              ))}
            </div>
            <div className="flex items-center gap-2" data-testid="skill-input-group">
              <Input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                placeholder="Add a skill..."
                className="max-w-xs"
                data-testid="input-add-skill"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
              />
              <Button variant="outline" size="sm" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim()} data-testid="button-add-skill">
                <Plus className="w-3 h-3 mr-1" />Add
              </Button>
            </div>
          </section>

          <Separator />

          <section data-testid="section-certifications">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Certifications</h2>
              <Button variant="ghost" size="sm" onClick={addCertification} data-testid="button-add-certification">
                <Plus className="w-3 h-3 mr-1" />Add
              </Button>
            </div>
            {sections.certifications.length === 0 && (
              <p className="text-sm text-muted-foreground italic" data-testid="text-no-certifications">No certifications yet.</p>
            )}
            {sections.certifications.map(cert => (
              <CertificationBlock key={cert.id} cert={cert} onUpdate={updateSections} />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryBlock({ sections, onUpdate }: { sections: EditorSections; onUpdate: (updater: (prev: EditorSections) => EditorSections) => void }) {
  const isChanged = !!sections.originalSummary && !sections.summaryReverted;
  const isReverted = !!sections.originalSummary && !!sections.summaryReverted;
  const displayText = sections.summaryReverted && sections.originalSummary ? sections.originalSummary : sections.summary;

  const handleRevert = () => onUpdate(s => ({ ...s, summaryReverted: true }));
  const handleUnrevert = () => onUpdate(s => ({ ...s, summaryReverted: false }));

  return (
    <div className="flex items-start gap-2">
      <div className={`flex-1 ${isChanged ? "border-l-2 border-primary bg-primary/5 pl-3 py-1" : isReverted ? "border-l-2 border-muted-foreground/30 pl-3 py-1 opacity-80" : ""}`}>
        <EditableText
          value={displayText}
          onChange={v => onUpdate(s => ({ ...s, summary: v, summaryReverted: false }))}
          className="text-sm leading-relaxed"
          testId="editable-summary"
          placeholder="Write a professional summary..."
        />
      </div>
      {sections.originalSummary && (
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
  exp, onUpdate, onAddBullet, onRemoveBullet,
}: {
  exp: EditorExperience;
  onUpdate: (updater: (prev: EditorSections) => EditorSections) => void;
  onAddBullet: (expId: string) => void;
  onRemoveBullet: (expId: string, bulletId: string) => void;
}) {
  return (
    <div className="mb-6" data-testid={`experience-${exp.id}`}>
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
          <span>-</span>
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
        {exp.bullets.map(bullet => (
          <BulletItem
            key={bullet.id}
            bullet={bullet}
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
          />
        ))}
      </ul>
      {exp.bullets.length === 0 && (
        <p className="text-xs text-muted-foreground italic ml-4" data-testid={`text-no-bullets-${exp.id}`}>No bullet points yet.</p>
      )}
      <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => onAddBullet(exp.id)} data-testid={`button-add-bullet-${exp.id}`}>
        <Plus className="w-3 h-3 mr-1" />Add bullet
      </Button>
    </div>
  );
}

function BulletItem({ bullet, expId, onUpdate, onRemove }: {
  bullet: EditorBullet;
  expId: string;
  onUpdate: (updater: (b: EditorBullet) => EditorBullet) => void;
  onRemove: () => void;
}) {
  const isChanged = !!(bullet.originalText || bullet.addedByAI) && !bullet.reverted;
  const isReverted = !!(bullet.originalText) && !!bullet.reverted;
  const displayText = bullet.reverted && bullet.originalText ? bullet.originalText : bullet.text;

  const handleRevert = () => onUpdate(b => ({ ...b, reverted: true }));
  const handleUnrevert = () => onUpdate(b => ({ ...b, reverted: false }));

  return (
    <li className="flex items-start gap-2 group" data-testid={`bullet-${bullet.id}`}>
      <span className="text-muted-foreground mt-1.5 shrink-0 text-xs select-none">-</span>
      <div className={`flex-1 ${isChanged ? "border-l-2 border-primary bg-primary/5 pl-3 py-0.5" : isReverted ? "border-l-2 border-muted-foreground/30 pl-3 py-0.5 opacity-80" : ""}`}>
        <EditableText
          value={displayText}
          onChange={v => onUpdate(b => ({ ...b, text: v, reverted: false }))}
          className="text-sm leading-relaxed"
          testId={`editable-bullet-${bullet.id}`}
          placeholder="Describe an accomplishment..."
        />
      </div>
      {(bullet.originalText || bullet.addedByAI) && (
        <ChangeIndicator
          originalText={bullet.originalText || "(AI generated)"}
          reason={bullet.rewriteReason}
          grounded={bullet.grounded}
          isReverted={isReverted}
          onRevert={handleRevert}
          onUnrevert={handleUnrevert}
        />
      )}
      <button
        onClick={onRemove}
        className="invisible group-hover:visible w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
        data-testid={`button-remove-bullet-${bullet.id}`}
      >
        <X className="w-3 h-3" />
      </button>
    </li>
  );
}

function EducationBlock({ edu, onUpdate }: { edu: EditorEducation; onUpdate: (updater: (prev: EditorSections) => EditorSections) => void }) {
  return (
    <div className="mb-3" data-testid={`education-${edu.id}`}>
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
        <span className="text-sm text-muted-foreground">-</span>
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

function CertificationBlock({ cert, onUpdate }: { cert: { id: string; name: string; issuer: string; date: string }; onUpdate: (updater: (prev: EditorSections) => EditorSections) => void }) {
  return (
    <div className="mb-2" data-testid={`certification-${cert.id}`}>
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
        <span className="text-xs text-muted-foreground">-</span>
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

function SkillBadge({ skill, onRemove }: { skill: EditorSkill; onRemove: () => void }) {
  return (
    <Badge variant={skill.addedByAI ? "secondary" : "outline"} data-testid={`skill-${skill.name}`}>
      {skill.addedByAI && <Sparkles className="w-3 h-3 mr-1 text-primary" />}
      {skill.name}
      <button onClick={onRemove} className="ml-1.5 opacity-70 hover:opacity-100" data-testid={`button-remove-skill-${skill.name}`}>
        <X className="w-3 h-3" />
      </button>
    </Badge>
  );
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
