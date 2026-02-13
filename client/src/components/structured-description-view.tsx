import type { StructuredDescription } from "@shared/schema";
import { cleanStructuredText } from "@/lib/structured-description";
import { Building2, Briefcase, CheckCircle2, Star, Hash, TrendingUp, Layers, Bot, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const EMPTY_MESSAGES: Record<string, string> = {
  aboutCompany: "Company details not available.",
  responsibilities: "Responsibilities not listed.",
  minimumQualifications: "Requirements not specified.",
  preferredQualifications: "No preferred qualifications listed.",
  skillsRequired: "Skills not specified.",
  lawyerTransitionNotes: "Transition notes not yet available.",
};

function MetaBadges({ data, compact }: { data: StructuredDescription; compact?: boolean }) {
  const hasMeta = !!(data.seniority || data.legalTechCategory || data.aiRelevanceScore || data.lawyerTransitionFriendly);
  if (!hasMeta) return null;

  const iconSize = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  const badgeSize = compact ? "text-[10px]" : "text-xs";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "mb-2" : "mb-4"}`} data-testid="structured-meta-badges">
      {data.seniority && (
        <Badge variant="secondary" className={badgeSize} data-testid="badge-seniority">
          <TrendingUp className={`${iconSize} mr-1`} />
          {data.seniority}
        </Badge>
      )}
      {data.legalTechCategory && (
        <Badge variant="secondary" className={badgeSize} data-testid="badge-legal-tech-category">
          <Layers className={`${iconSize} mr-1`} />
          {data.legalTechCategory}
        </Badge>
      )}
      {data.aiRelevanceScore && (
        <Badge variant="secondary" className={badgeSize} data-testid="badge-ai-relevance">
          <Bot className={`${iconSize} mr-1`} />
          AI: {data.aiRelevanceScore}
        </Badge>
      )}
      {data.lawyerTransitionFriendly && (
        <Badge variant="outline" className={`${badgeSize} border-green-500/30 text-green-700 dark:text-green-400`} data-testid="badge-lawyer-friendly">
          <Scale className={`${iconSize} mr-1`} />
          Lawyer-Friendly Transition
        </Badge>
      )}
    </div>
  );
}

interface SectionDef {
  key: string;
  title: string;
  items: string[] | null;
  text: string | null;
  icon: typeof Building2;
  renderAsBadges?: boolean;
  alwaysShow?: boolean;
}

export function StructuredDescriptionView({ data, compact }: { data: StructuredDescription; compact?: boolean }) {
  const safeArray = (arr: unknown): string[] => Array.isArray(arr) ? arr : [];

  const sections: SectionDef[] = [
    { key: "aboutCompany", title: "About the Company", items: null, text: data.aboutCompany || null, icon: Building2 },
    { key: "responsibilities", title: "What You'll Do", items: safeArray(data.responsibilities), text: null, icon: Briefcase, alwaysShow: true },
    { key: "minimumQualifications", title: "Requirements", items: safeArray(data.minimumQualifications), text: null, icon: CheckCircle2, alwaysShow: true },
    { key: "preferredQualifications", title: "Nice to Have", items: safeArray(data.preferredQualifications), text: null, icon: Star, alwaysShow: true },
    { key: "skillsRequired", title: "Key Skills", items: safeArray(data.skillsRequired), text: null, icon: Hash, renderAsBadges: true, alwaysShow: true },
    { key: "lawyerTransitionNotes", title: "For Lawyers Considering This Role", items: safeArray(data.lawyerTransitionNotes), text: null, icon: Scale },
  ];

  if (compact) {
    return (
      <div className="space-y-3" data-testid="section-structured-description">
        {data.summary && (
          <p className="text-xs text-muted-foreground italic leading-relaxed" data-testid="structured-summary">{cleanStructuredText(data.summary)}</p>
        )}
        <MetaBadges data={data} compact />
        {sections.map(({ key, title, items, text, icon: Icon, renderAsBadges, alwaysShow }) => {
          const hasText = text && text.trim();
          const hasItems = items && items.length > 0;
          if (!hasText && !hasItems && !alwaysShow) return null;
          return (
            <div key={key} data-testid={`structured-${key}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">{title}</p>
              </div>
              {hasText ? (
                <p className="text-xs text-muted-foreground leading-relaxed pl-4">{cleanStructuredText(text!)}</p>
              ) : hasItems && renderAsBadges ? (
                <div className="flex flex-wrap gap-1 pl-4">
                  {items!.map((item, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {cleanStructuredText(item)}
                    </Badge>
                  ))}
                </div>
              ) : hasItems ? (
                <ul className="space-y-0.5 pl-4">
                  {items!.map((item, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-muted-foreground leading-relaxed">
                      <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span>{cleanStructuredText(item)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic pl-4" data-testid={`empty-${key}`}>
                  {EMPTY_MESSAGES[key] || "Not listed."}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="section-structured-description">
      {data.summary && (
        <p className="text-sm text-muted-foreground italic leading-relaxed" data-testid="structured-summary">{cleanStructuredText(data.summary)}</p>
      )}
      <MetaBadges data={data} />
      {sections.map(({ key, title, items, text, icon: Icon, renderAsBadges, alwaysShow }) => {
        const hasText = text && text.trim();
        const hasItems = items && items.length > 0;
        if (!hasText && !hasItems && !alwaysShow) return null;
        return (
          <div key={key} data-testid={`structured-${key}`}>
            <div className="flex items-center gap-2 mb-2.5">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
            </div>
            {hasText ? (
              <p className="text-sm text-muted-foreground leading-relaxed pl-6">{cleanStructuredText(text!)}</p>
            ) : hasItems && renderAsBadges ? (
              <div className="flex flex-wrap gap-1.5 pl-6">
                {items!.map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-xs" data-testid={`badge-skill-${i}`}>
                    {cleanStructuredText(item)}
                  </Badge>
                ))}
              </div>
            ) : hasItems ? (
              <ul className="space-y-1.5 pl-6">
                {items!.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <span className="text-muted-foreground/40 mt-1.5 shrink-0 w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <span>{cleanStructuredText(item)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic pl-6" data-testid={`empty-${key}`}>
                {EMPTY_MESSAGES[key] || "Not listed."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
