import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { Link } from "wouter";

interface ReadinessDisplayProps {
  score: number;
  matched: string[];
  missing: string[];
  totalSkills: number;
  isPro: boolean;
}

function getReadinessLevel(score: number): { label: string; color: string; bgColor: string; borderColor: string } {
  if (score >= 70) return { label: "Ready", color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-950/30", borderColor: "border-emerald-200 dark:border-emerald-800" };
  if (score >= 40) return { label: "Almost", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30", borderColor: "border-amber-200 dark:border-amber-800" };
  return { label: "Not Yet", color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-50 dark:bg-slate-900/30", borderColor: "border-slate-200 dark:border-slate-700" };
}

export function ReadinessDisplay({ score, matched, missing, totalSkills, isPro }: ReadinessDisplayProps) {
  const readiness = getReadinessLevel(score);
  const matchedPct = totalSkills > 0 ? (matched.length / totalSkills) * 100 : 0;
  const missingPct = totalSkills > 0 ? (missing.length / totalSkills) * 100 : 0;

  return (
    <div data-testid="readiness-display" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Your readiness</span>
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${readiness.color} ${readiness.bgColor} ${readiness.borderColor}`}
          data-testid="readiness-pill"
        >
          {readiness.label}
        </Badge>
        <span className="text-[10px] text-muted-foreground ml-auto">{score}% match</span>
      </div>

      <div className="flex h-2 rounded-full overflow-hidden bg-muted/30 border border-foreground/5" data-testid="readiness-bar">
        <div
          className="bg-emerald-500 transition-all duration-500"
          style={{ width: `${matchedPct}%` }}
          title={`${matched.length} matched skills`}
        />
        <div
          className="bg-slate-300 dark:bg-slate-600 transition-all duration-500"
          style={{ width: `${missingPct}%` }}
          title={`${missing.length} missing skills`}
        />
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {matched.length} matched
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          {missing.length} to build
        </span>
      </div>

      {isPro && missing.length > 0 && (
        <div className="space-y-1" data-testid="readiness-improvements">
          <p className="text-[10px] text-muted-foreground font-medium">Focus on these to improve:</p>
          <div className="flex flex-wrap gap-1">
            {missing.slice(0, 3).map((skill, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-[10px] bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50"
                data-testid={`badge-improvement-${i}`}
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!isPro && missing.length > 0 && (
        <div data-testid="readiness-pro-preview">
          <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Skills to develop:</p>
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50"
            >
              {missing[0]}
            </Badge>
            {missing.length > 1 && (
              <div className="relative flex flex-wrap gap-1">
                {missing.slice(1, 3).map((skill, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[10px] border-foreground/5 blur-[3px] select-none"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Link href="/pricing" className="flex items-center gap-1.5 text-[10px] text-primary hover:underline" data-testid="link-readiness-upgrade">
            <Lock className="h-2.5 w-2.5" />
            Unlock all {missing.length} improvement areas
          </Link>
        </div>
      )}
    </div>
  );
}
