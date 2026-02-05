import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, DollarSign, Clock, ExternalLink, Sparkles, Building2, Briefcase } from "lucide-react";
import type { JobWithScore } from "@shared/schema";

interface JobCardProps {
  job: JobWithScore;
  showMatchScore?: boolean;
}

export function JobCard({ job, showMatchScore = false }: JobCardProps) {
  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null;
    const formatNum = (num: number) => `$${(num / 1000).toFixed(0)}K`;
    if (min && max) return `${formatNum(min)} - ${formatNum(max)}`;
    if (min) return `${formatNum(min)}+`;
    return `Up to ${formatNum(max!)}`;
  };

  const formatExperience = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `${min}-${max} years`;
    if (min) return `${min}+ years`;
    return `Up to ${max} years`;
  };

  const getTimeAgo = (date?: Date | string | null) => {
    if (!date) return "Recently";
    const days = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1d ago";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}m ago`;
  };

  const getMatchScoreColor = (score?: number) => {
    if (!score) return "bg-muted text-muted-foreground";
    if (score >= 85) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    if (score >= 70) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
    return "bg-muted text-muted-foreground";
  };

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const experience = formatExperience(job.experienceMin, job.experienceMax);

  return (
    <Card className="group hover:border-primary/50 transition-all duration-200 hover-elevate" data-testid={`card-job-${job.id}`}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg flex-shrink-0">
                <AvatarImage src={job.companyLogo || undefined} alt={job.company} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                  {job.company.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground truncate">
                    {job.company}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    {getTimeAgo(job.postedDate)}
                  </span>
                </div>
                
                <h3 className="text-lg sm:text-xl font-semibold text-foreground group-hover:text-primary transition-colors truncate" data-testid={`text-job-title-${job.id}`}>
                  {job.title}
                </h3>
              </div>
            </div>
            
            {showMatchScore && job.matchScore && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0 ${getMatchScoreColor(job.matchScore)}`} data-testid={`badge-match-score-${job.id}`}>
                <Sparkles className="h-3.5 w-3.5" />
                {job.matchScore}%
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {job.location && (
              <Badge variant="secondary" className="gap-1.5">
                <MapPin className="h-3 w-3" />
                {job.location}
              </Badge>
            )}
            {job.isRemote && (
              <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                Remote
              </Badge>
            )}
            {job.roleType && (
              <Badge variant="secondary" className="gap-1.5">
                <Briefcase className="h-3 w-3" />
                {job.roleType}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-job-description-${job.id}`}>
            {job.description}
          </p>

          {job.matchReason && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
              <p className="text-xs text-primary font-medium mb-1">Why this matches:</p>
              <p className="text-sm text-foreground">{job.matchReason}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {salary && (
                <span className="flex items-center gap-1.5" data-testid={`text-salary-${job.id}`}>
                  <DollarSign className="h-4 w-4" />
                  {salary}
                </span>
              )}
              {experience && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {experience}
                </span>
              )}
            </div>
            
            <Button asChild size="sm" className="gap-2" data-testid={`button-apply-${job.id}`}>
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                Apply Now
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
