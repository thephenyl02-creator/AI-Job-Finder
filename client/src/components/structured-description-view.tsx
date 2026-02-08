import type { StructuredDescription } from "@shared/schema";
import { cleanStructuredText } from "@/lib/structured-description";
import { Building2, Briefcase, CheckCircle2, Star, Hash } from "lucide-react";

export function StructuredDescriptionView({ data, compact }: { data: StructuredDescription; compact?: boolean }) {
  const sections = [
    { key: "aboutCompany", title: "About the Company", items: null, text: data.aboutCompany, icon: Building2 },
    { key: "responsibilities", title: "Responsibilities", items: data.responsibilities, text: null, icon: Briefcase },
    { key: "minimumQualifications", title: "Minimum Qualifications", items: data.minimumQualifications, text: null, icon: CheckCircle2 },
    { key: "preferredQualifications", title: "Preferred Qualifications", items: data.preferredQualifications, text: null, icon: Star },
    { key: "skillsRequired", title: "Skills Required", items: data.skillsRequired, text: null, icon: Hash },
  ];

  if (compact) {
    return (
      <div className="space-y-3" data-testid="section-structured-description">
        {sections.map(({ key, title, items, text, icon: Icon }) => {
          const hasText = text && text.trim();
          const hasItems = items && items.length > 0;
          if (!hasText && !hasItems) return null;
          return (
            <div key={key} data-testid={`structured-${key}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">{title}</p>
              </div>
              {hasText ? (
                <p className="text-xs text-muted-foreground leading-relaxed pl-4">{cleanStructuredText(text!)}</p>
              ) : (
                <ul className="space-y-0.5 pl-4">
                  {items!.map((item, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-muted-foreground leading-relaxed">
                      <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span>{cleanStructuredText(item)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="section-structured-description">
      {sections.map(({ key, title, items, text, icon: Icon }) => {
        const hasText = text && text.trim();
        const hasItems = items && items.length > 0;
        if (!hasText && !hasItems) return null;
        return (
          <div key={key} data-testid={`structured-${key}`}>
            <div className="flex items-center gap-2 mb-2.5">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
            </div>
            {hasText ? (
              <p className="text-sm text-muted-foreground leading-relaxed pl-6">{cleanStructuredText(text!)}</p>
            ) : (
              <ul className="space-y-1.5 pl-6">
                {items!.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <span className="text-muted-foreground/40 mt-1.5 shrink-0 w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <span>{cleanStructuredText(item)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
