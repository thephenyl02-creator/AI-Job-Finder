import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Bookmark, DollarSign } from "lucide-react";
import { JobLocation } from "./job-location";
import type { JobWithScore } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface JobCardProps {
  job: JobWithScore;
  showMatchScore?: boolean;
  hasResume?: boolean;
  isSaved?: boolean;
  isAuthenticated?: boolean;
}

function formatSalary(min?: number | null, max?: number | null, currency?: string | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return n.toString();
  };
  const sym = currency === 'GBP' ? '\u00A3' : currency === 'EUR' ? '\u20AC' : currency === 'CAD' ? 'CA$' : currency === 'AUD' ? 'A$' : '$';
  if (min && max && min !== max) return `${sym}${fmt(min)}\u2013${sym}${fmt(max)}`;
  if (min) return `${sym}${fmt(min)}+`;
  if (max) return `Up to ${sym}${fmt(max)}`;
  return null;
}

const COMPANY_DESCRIPTORS: Record<string, string> = {
  "Harvey AI": "Legal AI",
  "Clio": "Legal Practice Management",
  "Spellbook": "AI Contract Drafting",
  "Hebbia": "AI Research Platform",
  "Filevine": "Legal Case Management",
  "Legora": "Legal Intelligence",
  "MarqVision": "IP Protection Tech",
  "Eve Legal": "Legal Workflow Automation",
  "Lawhive": "Legal Services Platform",
  "Mitratech": "Legal GRC Software",
  "OneTrust": "Privacy & Compliance",
  "Anthropic": "AI Safety Research",
  "NetDocuments": "Legal Document Management",
  "Rocket Lawyer": "Online Legal Services",
  "Checkbox": "Legal Automation",
  "DISCO": "eDiscovery Technology",
  "Factor": "Legal Staffing Tech",
  "Notabene": "Legal Tech",
  "Thomson Reuters": "Legal Information Services",
  "Wolters Kluwer": "Legal & Regulatory Tech",
  "LexisNexis": "Legal Research & Analytics",
  "Ironclad": "Contract Lifecycle Management",
  "Relativity": "eDiscovery & Data",
  "Everlaw": "Litigation Technology",
  "Luminance": "AI Legal Intelligence",
  "Kira Systems": "Contract Analysis AI",
  "iManage": "Knowledge Management",
  "Litera": "Legal Document Technology",
  "Lex Machina": "Legal Analytics",
  "Legatics": "Legal Transaction Management",
};

function getCompanyColor(company: string): string {
  let hash = 0;
  for (let i = 0; i < company.length; i++) {
    hash = company.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  ];
  return colors[Math.abs(hash) % colors.length];
}

export function JobCard({ job, isSaved = false, isAuthenticated = false }: JobCardProps) {
  const { toast } = useToast();
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const companyDescriptor = COMPANY_DESCRIPTORS[job.company] || null;
  const avatarColor = getCompanyColor(job.company);

  const getTimeAgo = (date?: Date | string | null) => {
    if (!date) return "Recently";
    const days = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1d ago";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}m ago`;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await apiRequest("DELETE", `/api/saved-jobs/${job.id}`);
      } else {
        await apiRequest("POST", `/api/saved-jobs/${job.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs/ids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
    },
    onError: (error: any) => {
      if (error?.message?.includes("5 jobs") || error?.message?.includes("Upgrade to Pro")) {
        toast({ title: "Save limit reached", description: "Free accounts can save up to 5 jobs. Upgrade to Pro for unlimited saves.", variant: "destructive" });
      }
    },
  });

  const handleApplyClick = () => {
    apiRequest("POST", `/api/jobs/${job.id}/apply-click`).catch(() => {});
  };

  return (
    <Card className="group hover:border-primary/50 transition-all duration-200 hover-elevate" data-testid={`card-job-${job.id}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link to={`/jobs/${job.id}`} className="flex-shrink-0">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg">
              <AvatarImage src={job.companyLogo || undefined} alt={job.company} />
              <AvatarFallback className={`rounded-lg font-semibold text-sm ${avatarColor}`}>
                {job.company.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/jobs/${job.id}`} className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate" data-testid={`text-job-title-${job.id}`}>
                  {job.title}
                </h3>
              </Link>

              <div className="flex items-center gap-1 flex-shrink-0">
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveMutation.mutate(); }}
                    disabled={saveMutation.isPending}
                    data-testid={`button-save-job-${job.id}`}
                    className={isSaved ? "text-primary" : "text-muted-foreground"}
                  >
                    <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                  </Button>
                )}
                {job.applyUrl ? (
                  <Button asChild variant="outline" size="sm" className="gap-1.5" data-testid={`button-apply-${job.id}`}>
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => { e.stopPropagation(); handleApplyClick(); }}
                    >
                      Apply
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground" data-testid={`button-view-${job.id}`}>
                    <Link to={`/jobs/${job.id}`}>View</Link>
                  </Button>
                )}
              </div>
            </div>

            <Link to={`/jobs/${job.id}`}>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5" data-testid={`text-job-company-${job.id}`}>
                <span className="truncate font-medium">{job.company}</span>
                {companyDescriptor && (
                  <>
                    <span className="flex-shrink-0 text-muted-foreground/40">·</span>
                    <span className="flex-shrink-0 text-xs text-muted-foreground/70 truncate max-w-[140px] sm:max-w-[180px]">{companyDescriptor}</span>
                  </>
                )}
                <span className="flex-shrink-0 text-muted-foreground/40">·</span>
                <span className="flex-shrink-0 text-xs">{getTimeAgo(job.postedDate)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <JobLocation
                  location={job.location}
                  locationType={job.locationType}
                  isRemote={job.isRemote}
                  testIdPrefix={`job-${job.id}`}
                />
                {salary && (
                  <Badge variant="outline" className="gap-0.5 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" data-testid={`text-salary-${job.id}`}>
                    <DollarSign className="h-3 w-3" />
                    {salary}
                  </Badge>
                )}
                {job.roleSubcategory && (
                  <Badge variant="secondary" className="bg-primary/5 text-primary/80 border-primary/10 text-xs">
                    {job.roleSubcategory}
                  </Badge>
                )}
              </div>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
