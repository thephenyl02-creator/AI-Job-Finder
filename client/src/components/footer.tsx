import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useAuth } from "@/hooks/use-auth";

export function Footer() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <footer className="border-t border-border/40 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <span>Legal Tech Careers</span>
            <span className="hidden sm:inline">&middot;</span>
            <Link href="/trust" className="hover:text-foreground transition-colors" data-testid="footer-link-trust">
              How We Curate
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="footer-link-terms">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="footer-link-privacy">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-border/40 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Logo className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Legal Tech Careers
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/60 max-w-[280px]" data-testid="text-footer-trust-line">
              We never sell candidate data. Delete your resume anytime.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
            <Link href="/about">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs font-normal" data-testid="footer-link-about">
                About
              </Button>
            </Link>
            <Link href="/trust">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs font-normal" data-testid="footer-link-trust">
                How We Curate
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs font-normal" data-testid="footer-link-pricing">
                Pricing
              </Button>
            </Link>
            <Link href="/post-job">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs font-normal" data-testid="footer-link-post-job">
                Post a Job
              </Button>
            </Link>
            <Link href="/market-intelligence">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs font-normal" data-testid="footer-link-trends">
                Trends
              </Button>
            </Link>
            <Link href="/opportunity-map">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs font-normal" data-testid="footer-link-map">
                Map
              </Button>
            </Link>
            <Link href="/events">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs font-normal" data-testid="footer-link-events">
                Events
              </Button>
            </Link>
            <Link href="/terms">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs font-normal" data-testid="footer-link-terms">
                Terms
              </Button>
            </Link>
            <Link href="/privacy">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs font-normal" data-testid="footer-link-privacy">
                Privacy
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
