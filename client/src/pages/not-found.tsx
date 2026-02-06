import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";
import { ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  usePageTitle("Page Not Found");
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <LogoMark className="h-10 w-10 text-foreground mx-auto mb-6" />
        <h1 className="text-5xl font-serif font-semibold text-foreground tracking-tight mb-3" data-testid="text-404-title">
          404
        </h1>
        <p className="text-lg text-muted-foreground mb-2">
          Page not found
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/">
            <Button size="lg" className="gap-2" data-testid="button-404-home">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link href="/jobs">
            <Button size="lg" variant="outline" className="gap-2" data-testid="button-404-jobs">
              <Search className="h-4 w-4" />
              Browse Jobs
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
