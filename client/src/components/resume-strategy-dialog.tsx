import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Target,
  Search,
} from "lucide-react";

interface StrategyResult {
  job: { id: number; title: string; company: string; location: string };
  strategy: {
    topStrengths: string[];
    keyGaps: string[];
    reorderSuggestions: string[];
    emphasisSuggestions: string[];
    addSpecificityPrompts: string[];
  };
}

interface ResumeStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  jobTitle: string;
  company: string;
}

export function ResumeStrategyDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  company,
}: ResumeStrategyDialogProps) {
  const { toast } = useToast();
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const strategyMutation = useMutation({
    mutationFn: async (data: { jobId: number }) => {
      setErrorMessage(null);
      const res = await apiRequest("POST", "/api/resume/strategy-for-job", data);
      return res.json() as Promise<StrategyResult>;
    },
    onSuccess: (data) => {
      if (!data?.strategy) {
        setErrorMessage("The AI returned an unexpected response. Please try again.");
        return;
      }
      setResult(data);
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to generate strategy";
      setErrorMessage(msg);
      toast({ title: "Strategy failed", description: msg, variant: "destructive" });
    },
  });

  const handleGenerate = () => {
    strategyMutation.mutate({ jobId });
  };

  const handleReset = () => {
    setResult(null);
    setErrorMessage(null);
  };

  const sections = result
    ? [
        {
          title: "Your Strengths",
          icon: CheckCircle2,
          items: result.strategy.topStrengths,
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-900/20",
        },
        {
          title: "Key Gaps to Address",
          icon: AlertTriangle,
          items: result.strategy.keyGaps,
          color: "text-amber-600 dark:text-amber-400",
          bgColor: "bg-amber-50 dark:bg-amber-900/20",
        },
        {
          title: "Reorder Your Resume",
          icon: ArrowUpDown,
          items: result.strategy.reorderSuggestions,
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
        },
        {
          title: "What to Emphasize",
          icon: Target,
          items: result.strategy.emphasisSuggestions,
          color: "text-violet-600 dark:text-violet-400",
          bgColor: "bg-violet-50 dark:bg-violet-900/20",
        },
        {
          title: "Add Specificity",
          icon: Search,
          items: result.strategy.addSpecificityPrompts,
          color: "text-indigo-600 dark:text-indigo-400",
          bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
        },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-resume-strategy">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-strategy-title">
            <Compass className="h-5 w-5" />
            Resume Strategy for This Role
          </DialogTitle>
          <DialogDescription data-testid="text-strategy-description">
            Structured guidance on what to emphasize, reorder, or clarify to fit{" "}
            <span className="font-medium text-foreground">{jobTitle}</span> at{" "}
            <span className="font-medium text-foreground">{company}</span> — without rewriting your resume.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 mt-2" data-testid="section-strategy-prompt">
            <div className="rounded-md border border-border/40 p-4">
              <p className="text-sm text-foreground mb-1">
                We'll analyze your primary resume against this role and give you actionable advice on:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1.5 mt-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                  <span>Strengths you already bring to this role</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                  <span>Gaps you should address</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                  <span>What to move higher or lower in your resume</span>
                </li>
                <li className="flex items-start gap-2">
                  <Target className="h-3.5 w-3.5 mt-0.5 text-violet-500 shrink-0" />
                  <span>What to emphasize more prominently</span>
                </li>
                <li className="flex items-start gap-2">
                  <Search className="h-3.5 w-3.5 mt-0.5 text-indigo-500 shrink-0" />
                  <span>Where to add specific details you may have left out</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={handleGenerate}
                disabled={strategyMutation.isPending}
                data-testid="button-generate-strategy"
              >
                {strategyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Compass className="h-4 w-4 mr-2" />
                    View Strategy
                  </>
                )}
              </Button>
            </div>

            {errorMessage && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3" data-testid="text-strategy-error">
                <p className="text-sm text-destructive">{errorMessage}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 mt-2" data-testid="section-strategy-results">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge variant="secondary" data-testid="badge-strategy-job">
                {result.job.title} at {result.job.company}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-strategy-again">
                Run Again
              </Button>
            </div>

            <div className="space-y-3">
              {sections
                .filter((s) => s.items && s.items.length > 0)
                .map((section) => (
                  <Card key={section.title} data-testid={`card-strategy-${section.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-1 rounded ${section.bgColor}`}>
                          <section.icon className={`h-3.5 w-3.5 ${section.color}`} />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
                      </div>
                      <ul className="space-y-2">
                        {section.items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-muted-foreground/50 shrink-0 font-mono text-xs mt-0.5">{idx + 1}.</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
            </div>

            <p className="text-xs text-muted-foreground italic">
              These suggestions are based on your uploaded resume. They focus on positioning and emphasis — no rewrites are made here.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
