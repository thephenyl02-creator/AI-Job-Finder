import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  ArrowRight,
  Upload,
  PenLine,
  Lock,
  LogIn,
  Search,
} from "lucide-react";

interface NextStepCardProps {
  isLoggedIn: boolean;
  isPro: boolean;
  hasMatch: boolean;
  matchScore: number | null;
  onUploadResume: () => void;
  onOpenStrategy: () => void;
  onOpenRewrite: () => void;
  onSignIn: () => void;
  roleCategory?: string | null;
  jobId?: number;
}

export function NextStepCard({
  isLoggedIn,
  isPro,
  hasMatch,
  matchScore,
  onUploadResume,
  onOpenStrategy,
  onOpenRewrite,
  onSignIn,
  roleCategory,
  jobId,
}: NextStepCardProps) {

  const isStretch = hasMatch && matchScore !== null && matchScore < 35;
  const reviewHref = jobId ? `/resume-review/${jobId}` : "/resumes";

  if (!isLoggedIn) {
    return (
      <Card className="border-border/50" data-testid="card-next-step">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground" data-testid="heading-next-step">Your Next Step</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3" data-testid="text-next-step-message">
            Sign in to see your fit for this role and get lawyer-friendly guidance.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" className="gap-1.5" onClick={onSignIn} data-testid="button-next-step-signin">
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" data-testid="link-browse-roles">
                <Search className="h-3 w-3 mr-1" />
                Browse roles without signing in
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasMatch) {
    return (
      <Card className="border-border/50" data-testid="card-next-step">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground" data-testid="heading-next-step">Your Next Step</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3" data-testid="text-next-step-message">
            Upload your resume to see your fit score and get tailored suggestions for this role.
          </p>
          <Button size="sm" className="gap-1.5" onClick={onUploadResume} data-testid="button-next-step-upload">
            <Upload className="h-3.5 w-3.5" />
            Upload Resume
          </Button>
          <p className="text-xs text-muted-foreground mt-2" data-testid="text-next-step-helper">Takes ~30 seconds.</p>
        </CardContent>
      </Card>
    );
  }

  if (isStretch) {
    const browseHref = roleCategory
      ? `/jobs?category=${encodeURIComponent(roleCategory)}`
      : "/jobs";
    return (
      <Card className="border-border/50" data-testid="card-next-step">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground" data-testid="heading-next-step">Your Next Step</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-1" data-testid="text-next-step-message">
            This role is a stretch right now, but you can still review what to improve.
          </p>
          <p className="text-xs text-muted-foreground/70 mb-3">
            See specific line-by-line suggestions to strengthen your resume.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={reviewHref}>
              <Button size="sm" className="gap-1.5" data-testid="button-next-step-review">
                <PenLine className="h-3.5 w-3.5" />
                Improve My Resume
              </Button>
            </Link>
            <Link href={browseHref}>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" data-testid="link-explore-similar">
                <Search className="h-3 w-3 mr-1" />
                Explore similar roles
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isPro) {
    return (
      <Card className="border-border/50" data-testid="card-next-step">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground" data-testid="heading-next-step">Your Next Step</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-1" data-testid="text-next-step-message">
            See exactly what to change in your resume for this role.
          </p>
          <p className="text-xs text-muted-foreground/70 mb-3">
            Line-by-line suggestions you can accept or reject — like track changes.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={reviewHref}>
              <Button size="sm" className="gap-1.5" data-testid="button-next-step-review">
                <PenLine className="h-3.5 w-3.5" />
                Improve My Resume
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" data-testid="button-next-step-pro-hint">
                <Lock className="h-3 w-3" />
                Full suggestions
                <Badge variant="secondary" className="text-[10px] ml-0.5">Pro</Badge>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50" data-testid="card-next-step">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground" data-testid="heading-next-step">Your Next Step</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-1" data-testid="text-next-step-message">
          Review line-by-line suggestions to align your resume with this role.
        </p>
        <p className="text-xs text-muted-foreground/70 mb-3">
          Accept or reject each change — like track changes in a document.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={reviewHref}>
            <Button size="sm" className="gap-1.5" data-testid="button-next-step-review">
              <PenLine className="h-3.5 w-3.5" />
              Improve My Resume
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
