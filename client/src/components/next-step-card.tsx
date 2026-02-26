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
  hasResume: boolean;
  hasMatch: boolean;
  matchScore: number | null;
  onUploadResume: () => void;
  onOpenRewrite: () => void;
  onSignIn: () => void;
  roleCategory?: string | null;
  jobId?: number;
}

export function NextStepCard({
  isLoggedIn,
  isPro,
  hasResume,
  hasMatch,
  matchScore,
  onUploadResume,
  onOpenRewrite,
  onSignIn,
  roleCategory,
  jobId,
}: NextStepCardProps) {

  const isStretch = hasMatch && matchScore !== null && matchScore < 35;

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

  if (!hasResume) {
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
            Tailor your resume with AI suggestions specific to this role.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" className="gap-1.5" onClick={onOpenRewrite} data-testid="button-next-step-review">
              <PenLine className="h-3.5 w-3.5" />
              Tailor My Resume
            </Button>
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
            Tailor your resume for this role with smart suggestions.
          </p>
          <p className="text-xs text-muted-foreground/70 mb-3">
            Edit inline, review suggestions, and export a polished resume.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" className="gap-1.5" onClick={onOpenRewrite} data-testid="button-next-step-review">
              <PenLine className="h-3.5 w-3.5" />
              Tailor My Resume
            </Button>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" data-testid="button-next-step-pro-hint">
                <Lock className="h-3 w-3" />
                Model resume & Apply Pack
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
          Tailor your resume for this role with inline editing and AI suggestions.
        </p>
        <p className="text-xs text-muted-foreground/70 mb-3">
          Edit, review suggestions, check job requirements, and export as PDF or DOCX.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="gap-1.5" onClick={onOpenRewrite} data-testid="button-next-step-review">
            <PenLine className="h-3.5 w-3.5" />
            Tailor My Resume
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
