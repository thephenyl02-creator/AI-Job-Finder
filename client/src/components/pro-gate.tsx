import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, ArrowRight, Loader2, Check, Lock, Shield } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface ProGateProps {
  feature: string;
  description: string;
  highlights?: string[];
  mode?: "full" | "blur";
  children?: React.ReactNode;
  compact?: boolean;
}

const DEFAULT_HIGHLIGHTS = [
  "Full market intelligence dashboard",
  "Career diagnostic & readiness scoring",
  "Resume matching & fit scores",
  "ATS resume review",
  "Market insights & AI analyst",
  "Job alerts & notifications",
  "Up to 5 resumes",
];

function useCheckout() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const pricesRes = await fetch("/api/stripe/prices");
      if (!pricesRes.ok) throw new Error("Failed to fetch prices");
      const pricingData = await pricesRes.json();
      const monthlyPrice = pricingData.prices?.find((p: any) => p.interval === "month");
      if (!monthlyPrice) throw new Error("No monthly price found");

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId: monthlyPrice.id }),
      });
      if (!res.ok) throw new Error("Failed to create checkout session");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: () => {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    },
  });
}

function UpgradeButton({ compact }: { compact?: boolean }) {
  const { isAuthenticated } = useAuth();
  const checkoutMutation = useCheckout();

  if (!isAuthenticated) {
    return (
      <Button className={compact ? "" : "w-full"} asChild data-testid="button-progate-login">
        <a href="/auth">
          Sign In to Upgrade
          <ArrowRight className="h-4 w-4 ml-2" />
        </a>
      </Button>
    );
  }

  return (
    <Button
      className={compact ? "" : "w-full"}
      onClick={() => checkoutMutation.mutate()}
      disabled={checkoutMutation.isPending}
      data-testid="button-progate-checkout"
    >
      {checkoutMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Crown className="h-4 w-4 mr-2" />
      )}
      Upgrade to Pro — $5/mo
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>
  );
}

export function ProGate({ feature, description, highlights, mode = "full", children, compact = false }: ProGateProps) {
  const items = highlights || DEFAULT_HIGHLIGHTS;

  if (mode === "blur" && children) {
    return (
      <div className="relative" data-testid="progate-blur">
        <div className="pointer-events-none select-none blur-[3px] opacity-60">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[1px] rounded-md">
          <div className="flex flex-col items-center gap-2.5 text-center px-4 max-w-sm">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{feature}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
            <UpgradeButton compact />
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <Card className="border-dashed" data-testid="progate-compact">
        <CardContent className="py-6 px-4 sm:px-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">{feature}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <UpgradeButton compact />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center justify-center py-8 sm:py-12" data-testid="progate-full">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 pb-8 px-5 sm:px-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <Badge variant="secondary" className="text-xs mb-3">Pro</Badge>
            <h2 className="text-xl font-serif font-medium text-foreground mb-2" data-testid="text-progate-title">
              {feature}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto" data-testid="text-progate-description">
              {description}
            </p>
          </div>

          <div className="border border-border/60 rounded-md p-4 mb-6 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              What you get with Pro
            </p>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <UpgradeButton />
            <div className="text-center">
              <Link href="/pricing">
                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" data-testid="button-progate-compare">
                  Compare all plans
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-5 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              Cancel anytime
            </span>
            <span className="text-xs text-muted-foreground">
              Save 50% with yearly billing
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
