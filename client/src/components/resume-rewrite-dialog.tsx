import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Sparkles,
  ArrowRight,
  Lightbulb,
  Plus,
  Trash2,
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

interface ResumeRewriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  jobTitle: string;
  company: string;
}

export function ResumeRewriteDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  company,
}: ResumeRewriteDialogProps) {
  const { toast } = useToast();
  const [bullets, setBullets] = useState<string[]>([""]);
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rewriteMutation = useMutation({
    mutationFn: async (data: { jobId: number; bullets: string[] }) => {
      setErrorMessage(null);
      const res = await apiRequest("POST", "/api/resume/rewrite-for-job", data);
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
    if (bullets.length < 10) setBullets((prev) => [...prev, ""]);
  }, [bullets.length]);

  const removeBullet = useCallback((idx: number) => {
    setBullets((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateBullet = useCallback((idx: number, value: string) => {
    setBullets((prev) => prev.map((b, i) => (i === idx ? value : b)));
  }, []);

  const handleSubmit = () => {
    const filtered = bullets.filter((b) => b.trim().length >= 5);
    if (filtered.length === 0) {
      toast({ title: "Add bullet points", description: "Enter at least one resume bullet point (minimum 5 characters).", variant: "destructive" });
      return;
    }
    rewriteMutation.mutate({ jobId, bullets: filtered });
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
    setBullets([""]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-resume-rewrite">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-rewrite-title">
            <Sparkles className="h-5 w-5" />
            Rewrite Bullets for This Role
          </DialogTitle>
          <DialogDescription data-testid="text-rewrite-description">
            Paste your resume bullet points below and get AI-powered rewrites tailored for{" "}
            <span className="font-medium text-foreground">{jobTitle}</span> at{" "}
            <span className="font-medium text-foreground">{company}</span>.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 mt-2" data-testid="section-rewrite-input">
            <div className="space-y-3">
              {bullets.map((bullet, idx) => (
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
                  {bullets.length > 1 && (
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
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addBullet}
                disabled={bullets.length >= 10}
                data-testid="button-add-bullet"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Bullet ({bullets.length}/10)
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={rewriteMutation.isPending || bullets.every((b) => b.trim().length < 5)}
                data-testid="button-rewrite-submit"
              >
                {rewriteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rewriting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Rewrite for This Role
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
              Your experience stays truthful — we only rephrase to better match this role's language and keywords.
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
