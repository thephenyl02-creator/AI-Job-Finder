import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, ArrowRight, Loader2, Check, Shield } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface UpgradePromptProps {
  feature: string;
  description: string;
}

const PRO_HIGHLIGHTS = [
  "Resume matching & fit scores",
  "Deep job comparison & analysis",
  "ATS resume review",
  "Full events calendar",
  "Market insights & analytics",
  "Job alerts & notifications",
  "Up to 5 resumes",
];

export function UpgradePrompt({ feature, description }: UpgradePromptProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const checkoutMutation = useMutation({
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
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    },
  });

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-lg w-full" data-testid="card-upgrade-prompt">
        <CardContent className="pt-8 pb-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <Badge variant="secondary" className="text-xs mb-3">Pro Feature</Badge>
            <h2 className="text-xl font-serif font-medium text-foreground mb-2" data-testid="text-upgrade-title">
              {feature}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto" data-testid="text-upgrade-description">
              {description}
            </p>
          </div>

          <div className="border border-border/60 rounded-md p-4 mb-6 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Everything you get with Pro
            </p>
            <ul className="space-y-2">
              {PRO_HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            {isAuthenticated ? (
              <Button
                className="w-full"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                data-testid="button-upgrade-checkout"
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Crown className="h-4 w-4 mr-2" />
                )}
                Upgrade to Pro — $5/mo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button className="w-full" asChild data-testid="button-upgrade-login">
                <a href="/auth">
                  Sign In to Upgrade
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            )}
            <div className="text-center">
              <Link href="/pricing">
                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" data-testid="button-upgrade-compare">
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
