import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Copy,
  Check,
  PenLine,
  ArrowRight,
  Lightbulb,
  Plus,
  Trash2,
  FileText,
  Keyboard,
  AlertCircle,
} from "lucide-react";

interface RewrittenBullet {
  original: string;
  rewritten: string;
  matchedKeywords: string[];
  improvementNote: string;
}

interface RewriteResult {
  bullets: RewrittenBullet[];
  suggestedSkills: string[];
  overallTips: string;
  remaining: number;
}

interface ExtractedBullet {
  text: string;
  source: string;
  experienceIndex: number;
}

interface ExtractResponse {
  bullets: ExtractedBullet[];
  resumeId: number;
  resumeLabel: string;
}

interface ResumeRewriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  jobTitle: string;
  company: string;
}

type InputMode = "resume" | "manual";

export function ResumeRewriteDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  company,
}: ResumeRewriteDialogProps) {
  const { toast } = useToast();
  const [inputMode, setInputMode] = useState<InputMode>("resume");
  const [manualBullets, setManualBullets] = useState<string[]>([""]);
  const [selectedBulletIndices, setSelectedBulletIndices] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractResponse | null>(null);
  const [extractErrorMsg, setExtractErrorMsg] = useState<string | null>(null);

  const extractMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/resume/extract-bullets", {});
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to extract bullets");
      }
      return res.json() as Promise<ExtractResponse>;
    },
    onSuccess: (data) => {
      setExtractedData(data);
      setExtractErrorMsg(null);
      if (data.bullets.length === 0) {
        setInputMode("manual");
        setExtractErrorMsg("No bullet points found in your resume. Use manual entry instead.");
      }
    },
    onError: (err: any) => {
      const msg = err?.message || "Could not load your resume. Use manual entry instead.";
      setExtractErrorMsg(msg);
      setInputMode("manual");
    },
  });

  useEffect(() => {
    if (open) {
      setResult(null);
      setErrorMessage(null);
      setSelectedBulletIndices(new Set());
      setManualBullets([""]);
      setCopiedIdx(null);
      setExtractedData(null);
      setExtractErrorMsg(null);
      setInputMode("resume");
      extractMutation.mutate();
    }
  }, [open]);

  const rewriteMutation = useMutation({
    mutationFn: async (data: { jobId: number; bullets: string[] }) => {
      setErrorMessage(null);
      const res = await apiRequest("POST", "/api/resume/rewrite-for-job", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || "Failed to rewrite bullets");
      }
      return res.json() as Promise<RewriteResult>;
    },
    onSuccess: (data) => {
      if (!data?.bullets || !Array.isArray(data.bullets) || data.bullets.length === 0) {
        setErrorMessage("The AI returned an unexpected response. Please try again.");
        return;
      }
      setResult(data);
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to rewrite bullets";
      setErrorMessage(msg);
      toast({ title: "Rewrite failed", description: msg, variant: "destructive" });
    },
  });

  const addBullet = useCallback(() => {
    if (manualBullets.length < 10) setManualBullets((prev) => [...prev, ""]);
  }, [manualBullets.length]);

  const removeBullet = useCallback((idx: number) => {
    setManualBullets((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateBullet = useCallback((idx: number, value: string) => {
    setManualBullets((prev) => prev.map((b, i) => (i === idx ? value : b)));
  }, []);

  const toggleBulletSelection = useCallback((idx: number) => {
    setSelectedBulletIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else if (next.size < 10) {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const handleSubmit = () => {
    let bulletsToSend: string[];
    if (inputMode === "resume" && extractedData) {
      bulletsToSend = Array.from(selectedBulletIndices)
        .map((idx) => extractedData.bullets[idx]?.text)
        .filter((b): b is string => !!b && b.trim().length >= 5);
    } else {
      bulletsToSend = manualBullets.filter((b) => b.trim().length >= 5);
    }

    if (bulletsToSend.length === 0) {
      toast({
        title: inputMode === "resume" ? "Select bullet points" : "Add bullet points",
        description: inputMode === "resume"
          ? "Select at least one bullet point from your resume."
          : "Enter at least one resume bullet point (minimum 5 characters).",
        variant: "destructive",
      });
      return;
    }

    rewriteMutation.mutate({ jobId, bullets: bulletsToSend });
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const copyAll = () => {
    if (!result) return;
    const text = result.bullets.map((b) => `• ${b.rewritten}`).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Copied all bullets", description: "All rewritten bullets copied to clipboard." });
  };

  const handleReset = () => {
    setResult(null);
    setErrorMessage(null);
  };

  const groupedBullets = extractedData?.bullets.reduce<Record<string, { bullets: ExtractedBullet[]; indices: number[] }>>((acc, bullet, idx) => {
    if (!acc[bullet.source]) {
      acc[bullet.source] = { bullets: [], indices: [] };
    }
    acc[bullet.source].bullets.push(bullet);
    acc[bullet.source].indices.push(idx);
    return acc;
  }, {});

  const hasResumeBullets = extractedData && extractedData.bullets.length > 0;
  const canSubmitResume = inputMode === "resume" && selectedBulletIndices.size > 0;
  const canSubmitManual = inputMode === "manual" && manualBullets.some((b) => b.trim().length >= 5);
  const canSubmit = canSubmitResume || canSubmitManual;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-resume-rewrite">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-rewrite-title">
            <PenLine className="h-5 w-5" />
            Tailor My Resume
          </DialogTitle>
          <DialogDescription data-testid="text-rewrite-description">
            Get your resume bullet points rewritten to align with{" "}
            <span className="font-medium text-foreground">{jobTitle}</span> at{" "}
            <span className="font-medium text-foreground">{company}</span>.
          </DialogDescription>
          <p className="text-sm font-medium text-foreground/80 mt-1" data-testid="text-trust-line">
            We rewrite for alignment, not exaggeration.
          </p>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 mt-2" data-testid="section-rewrite-input">
            {(hasResumeBullets || (!extractMutation.isPending && !extractErrorMsg)) && extractedData && (
              <div className="flex gap-1 rounded-md border p-1" data-testid="section-mode-toggle">
                <Button
                  variant={inputMode === "resume" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setInputMode("resume")}
                  className="flex-1"
                  data-testid="button-mode-resume"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  From Resume
                </Button>
                <Button
                  variant={inputMode === "manual" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setInputMode("manual")}
                  className="flex-1"
                  data-testid="button-mode-manual"
                >
                  <Keyboard className="h-3.5 w-3.5 mr-1.5" />
                  Manual Entry
                </Button>
              </div>
            )}

            {inputMode === "resume" && extractMutation.isPending && (
              <div className="flex items-center justify-center py-8" data-testid="section-loading-bullets">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading your resume...</span>
              </div>
            )}

            {extractErrorMsg && inputMode === "manual" && (
              <div className="flex items-start gap-2 rounded-md border p-3" data-testid="section-extract-fallback">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{extractErrorMsg}</p>
                  <p className="text-xs text-muted-foreground">
                    You can type or paste your bullet points below instead.
                  </p>
                </div>
              </div>
            )}

            {inputMode === "resume" && hasResumeBullets && groupedBullets && (
              <div className="space-y-4" data-testid="section-resume-bullets">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground">
                    Select the bullet points you want tailored for this role ({selectedBulletIndices.size}/10 selected)
                  </p>
                  {extractedData?.resumeLabel && (
                    <Badge variant="secondary" data-testid="badge-resume-source">
                      {extractedData.resumeLabel}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {Object.entries(groupedBullets).map(([source, group]) => (
                    <div key={source} className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{source}</p>
                      {group.bullets.map((bullet, bulletIdx) => {
                        const globalIdx = group.indices[bulletIdx];
                        const isSelected = selectedBulletIndices.has(globalIdx);
                        return (
                          <label
                            key={globalIdx}
                            className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition-colors ${
                              isSelected ? "border-primary/50 bg-primary/5" : "border-transparent hover-elevate"
                            }`}
                            data-testid={`label-bullet-${globalIdx}`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleBulletSelection(globalIdx)}
                              disabled={!isSelected && selectedBulletIndices.size >= 10}
                              className="mt-0.5"
                              data-testid={`checkbox-bullet-${globalIdx}`}
                            />
                            <span className="text-sm leading-relaxed">{bullet.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inputMode === "manual" && (
              <div className="space-y-3" data-testid="section-manual-input">
                {manualBullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-1">
                      <Textarea
                        placeholder={idx === 0 ? "e.g., Managed contract review process for 50+ clients using CLM software" : "Another bullet point..."}
                        value={bullet}
                        onChange={(e) => updateBullet(idx, e.target.value)}
                        className="resize-none text-sm min-h-[60px]"
                        data-testid={`input-bullet-${idx}`}
                      />
                    </div>
                    {manualBullets.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeBullet(idx)}
                        data-testid={`button-remove-bullet-${idx}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addBullet}
                  disabled={manualBullets.length >= 10}
                  data-testid="button-add-bullet"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Bullet ({manualBullets.length}/10)
                </Button>
              </div>
            )}

            <div className="flex items-center justify-end">
              <Button
                onClick={handleSubmit}
                disabled={rewriteMutation.isPending || !canSubmit}
                data-testid="button-rewrite-submit"
              >
                {rewriteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Tailoring...
                  </>
                ) : (
                  <>
                    <PenLine className="h-4 w-4 mr-2" />
                    Tailor {inputMode === "resume" ? `${selectedBulletIndices.size} Bullet${selectedBulletIndices.size !== 1 ? "s" : ""}` : "Selected Lines"}
                  </>
                )}
              </Button>
            </div>

            {errorMessage && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3" data-testid="text-rewrite-error">
                <p className="text-sm text-destructive">{errorMessage}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Your experience stays truthful — we only reframe it to match this job.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-2" data-testid="section-rewrite-results">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge variant="secondary" data-testid="badge-remaining-rewrites">
                {result.remaining} rewrites remaining today
              </Badge>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-rewrite-again">
                  Try Again
                </Button>
                <Button variant="outline" size="sm" onClick={copyAll} data-testid="button-copy-all">
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy All
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {result.bullets.map((item, idx) => (
                <Card key={idx} data-testid={`card-rewrite-result-${idx}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Original</p>
                      <p className="text-sm text-muted-foreground line-through decoration-muted-foreground/30">{item.original}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium text-foreground" data-testid={`text-rewritten-${idx}`}>{item.rewritten}</p>
                        {item.matchedKeywords.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.matchedKeywords.map((kw) => (
                              <Badge key={kw} variant="outline" className="text-xs">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground italic">{item.improvementNote}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(item.rewritten, idx)}
                        data-testid={`button-copy-bullet-${idx}`}
                      >
                        {copiedIdx === idx ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {result.suggestedSkills.length > 0 && (
              <div className="space-y-2" data-testid="section-suggested-skills">
                <p className="text-sm font-medium text-foreground">Skills to Highlight</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {result.suggestedSkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.overallTips && (
              <div className="flex items-start gap-2 rounded-md border p-3" data-testid="section-overall-tips">
                <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{result.overallTips}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
