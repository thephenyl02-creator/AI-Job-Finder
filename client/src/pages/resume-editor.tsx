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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, ArrowLeft, CheckCircle, AlertTriangle, Undo2, Redo2,
  Download, FileText, FileDown, Package, RotateCcw, X, Sparkles,
} from "lucide-react";
import type { EditorSections, EditorBullet, EditorSkill } from "@shared/schema";

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
  value, onChange, className, tag: Tag = "p", testId,
}: {
  value: string; onChange: (v: string) => void; className?: string; tag?: "p" | "span" | "h1" | "h2" | "h3" | "div"; testId?: string;
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

  return (
    <Tag
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={`outline-none focus:ring-1 focus:ring-primary/20 rounded-md px-1 -mx-1 ${className || ""}`}
      data-testid={testId}
    />
  );
}

function ChangedPopover({
  originalText, reason, grounded, onRevert, children,
}: {
  originalText: string; reason?: string; grounded?: boolean; onRevert: () => void; children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
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
        <Button variant="outline" size="sm" onClick={onRevert} data-testid="button-revert-item">
          <RotateCcw className="w-3 h-3 mr-1" />Revert
        </Button>
      </PopoverContent>
    </Popover>
  );
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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const saveMutation = useMutation({
    mutationFn: async (data: { sections: EditorSections; versionNumber: number }) => {
      const res = await apiRequest("POST", `/api/resume/${resumeId}/editor/save`, {
        sections: data.sections,
        jobId,
        versionNumber: data.versionNumber,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSaveStatus("saved");
      setVersionNumber(data.versionNumber);
    },
    onError: (err: any) => {
      if (err?.message?.includes("409")) {
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

  const downloadFile = useCallback(async (type: "pdf" | "docx" | "apply-pack") => {
    try {
      toast({ title: "Preparing download..." });
      const res = await fetch(`/api/resume/${resumeId}/export/${type}?jobId=${jobId}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(err.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Resume.${type === "apply-pack" ? "zip" : type}`;
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
  }, [resumeId, jobId, toast, editorQuery.data?.job, setLocation]);

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

  const counts = editorQuery.data?.counts || { improvementsApplied: 0, needsConfirmation: 0, missingRequirements: 0 };
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
      {/* Top bar */}
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

        {/* Status bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-1.5 bg-muted/30 text-xs flex-wrap" data-testid="status-bar">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-muted-foreground" data-testid="text-improvements">
              {counts.improvementsApplied} improvements made
            </span>
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

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-8">
          {/* Strength notes */}
          {sections.strengthNotes && sections.strengthNotes.length > 0 && (
            <div className="p-4 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900" data-testid="strength-notes">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-1">Your strengths for this role</p>
              {sections.strengthNotes.map((note, i) => (
                <p key={i} className="text-xs text-emerald-700 dark:text-emerald-400">{note}</p>
              ))}
            </div>
          )}

          {/* Contact */}
          <section data-testid="section-contact">
            <EditableText
              value={sections.contact.fullName}
              onChange={v => updateSections(s => ({ ...s, contact: { ...s.contact, fullName: v } }))}
              tag="h1"
              className="text-2xl font-serif font-bold mb-1"
              testId="editable-name"
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <EditableText value={sections.contact.email} onChange={v => updateSections(s => ({ ...s, contact: { ...s.contact, email: v } }))} tag="span" testId="editable-email" />
              <EditableText value={sections.contact.phone} onChange={v => updateSections(s => ({ ...s, contact: { ...s.contact, phone: v } }))} tag="span" testId="editable-phone" />
              <EditableText value={sections.contact.location} onChange={v => updateSections(s => ({ ...s, contact: { ...s.contact, location: v } }))} tag="span" testId="editable-location" />
              {sections.contact.linkedin && (
                <EditableText value={sections.contact.linkedin} onChange={v => updateSections(s => ({ ...s, contact: { ...s.contact, linkedin: v } }))} tag="span" testId="editable-linkedin" />
              )}
            </div>
          </section>

          <Separator />

          {/* Summary */}
          <section data-testid="section-summary">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Summary</h2>
            <SummaryBlock sections={sections} onUpdate={updateSections} />
          </section>

          <Separator />

          {/* Experience */}
          <section data-testid="section-experience">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Experience</h2>
            {sections.experience.map(exp => (
              <div key={exp.id} className="mb-6" data-testid={`experience-${exp.id}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                  <div>
                    <EditableText
                      value={exp.title}
                      onChange={v => updateSections(s => ({ ...s, experience: s.experience.map(e => e.id === exp.id ? { ...e, title: v } : e) }))}
                      tag="h3"
                      className="text-base font-semibold font-serif inline"
                      testId={`editable-title-${exp.id}`}
                    />
                    <span className="text-muted-foreground mx-1">at</span>
                    <EditableText
                      value={exp.company}
                      onChange={v => updateSections(s => ({ ...s, experience: s.experience.map(e => e.id === exp.id ? { ...e, company: v } : e) }))}
                      tag="span"
                      className="font-medium"
                      testId={`editable-company-${exp.id}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {exp.startDate} - {exp.current ? "Present" : exp.endDate}
                  </span>
                </div>
                {exp.location && <p className="text-xs text-muted-foreground mb-2">{exp.location}</p>}
                <ul className="space-y-1.5">
                  {exp.bullets.map(bullet => (
                    <BulletItem
                      key={bullet.id}
                      bullet={bullet}
                      onUpdate={(updater) => {
                        updateSections(s => ({
                          ...s,
                          experience: s.experience.map(e => e.id === exp.id ? {
                            ...e,
                            bullets: e.bullets.map(b => b.id === bullet.id ? updater(b) : b),
                          } : e),
                        }));
                      }}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <Separator />

          {/* Education */}
          <section data-testid="section-education">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Education</h2>
            {sections.education.map(edu => (
              <div key={edu.id} className="mb-3" data-testid={`education-${edu.id}`}>
                <p className="text-sm font-medium">{edu.degree} in {edu.field}</p>
                <p className="text-sm text-muted-foreground">{edu.institution} - {edu.graduationDate}</p>
                {edu.honors && <p className="text-xs text-muted-foreground italic">{edu.honors}</p>}
              </div>
            ))}
          </section>

          <Separator />

          {/* Skills */}
          <section data-testid="section-skills">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {sections.skills.map((skill, idx) => (
                <SkillBadge
                  key={`${skill.name}-${idx}`}
                  skill={skill}
                  onRemove={() => updateSections(s => ({ ...s, skills: s.skills.filter((_, i) => i !== idx) }))}
                />
              ))}
            </div>
          </section>

          {/* Certifications */}
          {sections.certifications.length > 0 && (
            <>
              <Separator />
              <section data-testid="section-certifications">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Certifications</h2>
                {sections.certifications.map(cert => (
                  <div key={cert.id} className="mb-2" data-testid={`certification-${cert.id}`}>
                    <p className="text-sm font-medium">{cert.name}</p>
                    <p className="text-xs text-muted-foreground">{cert.issuer} - {cert.date}</p>
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryBlock({ sections, onUpdate }: { sections: EditorSections; onUpdate: (updater: (prev: EditorSections) => EditorSections) => void }) {
  const isChanged = !!sections.originalSummary && !sections.summaryReverted;
  const displayText = sections.summaryReverted && sections.originalSummary ? sections.originalSummary : sections.summary;

  const handleRevert = () => {
    onUpdate(s => ({ ...s, summaryReverted: true }));
  };

  if (isChanged) {
    return (
      <ChangedPopover
        originalText={sections.originalSummary!}
        reason={sections.summaryRewriteReason}
        grounded={sections.summaryGrounded}
        onRevert={handleRevert}
      >
        <div className="border-l-2 border-primary bg-primary/5 pl-3 py-1 hover-elevate cursor-pointer" data-testid="summary-changed">
          <EditableText
            value={displayText}
            onChange={v => onUpdate(s => ({ ...s, summary: v }))}
            className="text-sm leading-relaxed"
            testId="editable-summary"
          />
        </div>
      </ChangedPopover>
    );
  }

  return (
    <EditableText
      value={displayText}
      onChange={v => onUpdate(s => ({ ...s, summary: v }))}
      className="text-sm leading-relaxed"
      testId="editable-summary"
    />
  );
}

function BulletItem({ bullet, onUpdate }: { bullet: EditorBullet; onUpdate: (updater: (b: EditorBullet) => EditorBullet) => void }) {
  const isChanged = !!bullet.originalText && !bullet.reverted;
  const displayText = bullet.reverted && bullet.originalText ? bullet.originalText : bullet.text;

  const handleRevert = () => onUpdate(b => ({ ...b, reverted: true }));

  if (isChanged) {
    return (
      <li className="flex items-start gap-2" data-testid={`bullet-${bullet.id}`}>
        <span className="text-muted-foreground mt-1.5 shrink-0 text-xs select-none">-</span>
        <ChangedPopover
          originalText={bullet.originalText!}
          reason={bullet.rewriteReason}
          grounded={bullet.grounded}
          onRevert={handleRevert}
        >
          <div className="flex-1 border-l-2 border-primary bg-primary/5 pl-3 py-0.5 hover-elevate cursor-pointer">
            <EditableText
              value={displayText}
              onChange={v => onUpdate(b => ({ ...b, text: v }))}
              className="text-sm leading-relaxed"
              testId={`editable-bullet-${bullet.id}`}
            />
          </div>
        </ChangedPopover>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2" data-testid={`bullet-${bullet.id}`}>
      <span className="text-muted-foreground mt-1.5 shrink-0 text-xs select-none">-</span>
      <EditableText
        value={displayText}
        onChange={v => onUpdate(b => ({ ...b, text: v }))}
        className="text-sm leading-relaxed flex-1"
        testId={`editable-bullet-${bullet.id}`}
      />
    </li>
  );
}

function SkillBadge({ skill, onRemove }: { skill: EditorSkill; onRemove: () => void }) {
  if (skill.addedByAI) {
    return (
      <Badge variant="secondary" data-testid={`skill-${skill.name}`}>
        {skill.name}
        <button onClick={onRemove} className="ml-1.5 opacity-70" data-testid={`button-remove-skill-${skill.name}`}>
          <Sparkles className="w-3 h-3 text-primary inline" />
          <X className="w-3 h-3 ml-0.5 inline" />
        </button>
      </Badge>
    );
  }
  return <Badge variant="outline" data-testid={`skill-${skill.name}`}>{skill.name}</Badge>;
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
