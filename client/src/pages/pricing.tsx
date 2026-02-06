import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import {
  Check,
  X,
  Zap,
  Search,
  FileText,
  Compass,
  BarChart3,
  Bell,
  ArrowRight,
  Loader2,
  Crown,
  Scale,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface PriceData {
  id: string;
  amount: number | null;
  currency: string;
  interval: string;
  metadata: Record<string, string>;
}

interface PricingResponse {
  product: { id: string; name: string; description: string };
  prices: PriceData[];
}

const FREE_FEATURES = [
  { text: "Browse all job listings", included: true, icon: Search },
  { text: "Basic keyword search", included: true, icon: Search },
  { text: "View job details & apply links", included: true, icon: FileText },
  { text: "Post job submissions", included: true, icon: FileText },
  { text: "Resume upload (1 resume)", included: true, icon: FileText },
  { text: "Resume matching & tweaks", included: false, icon: Zap },
  { text: "Career Advisor comparisons", included: false, icon: Compass },
  { text: "Market insights & analytics", included: false, icon: BarChart3 },
  { text: "Job alerts & notifications", included: false, icon: Bell },
  { text: "Multi-resume management (5)", included: false, icon: FileText },
  { text: "Guided search with refinement", included: false, icon: Sparkles },
];

const PRO_FEATURES = [
  { text: "Everything in Free", included: true, icon: Check },
  { text: "Resume matching & tweaks", included: true, icon: Zap },
  { text: "Career Advisor comparisons", included: true, icon: Compass },
  { text: "Market insights & analytics", included: true, icon: BarChart3 },
  { text: "Job alerts & notifications", included: true, icon: Bell },
  { text: "Multi-resume management (5)", included: true, icon: FileText },
  { text: "Guided search with refinement", included: true, icon: Sparkles },
  { text: "Priority support", included: true, icon: Crown },
];

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const { isPro, tier, status } = useSubscription();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  const searchParams = new URLSearchParams(window.location.search);
  const checkoutSuccess = searchParams.get("success") === "true";
  const checkoutCanceled = searchParams.get("canceled") === "true";

  if (checkoutSuccess) {
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.history.replaceState({}, "", "/pricing");
    }, 100);
  }

  const { data: pricingData, isLoading: pricesLoading } = useQuery<PricingResponse>({
    queryKey: ["/api/stripe/prices"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/prices");
      if (!res.ok) throw new Error("Failed to fetch prices");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId }),
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

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create portal session");
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

  const monthlyPrice = pricingData?.prices?.find(p => p.interval === "month");
  const yearlyPrice = pricingData?.prices?.find(p => p.interval === "year");
  const selectedPrice = billingInterval === "month" ? monthlyPrice : yearlyPrice;

  const handleUpgrade = () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    if (selectedPrice) {
      checkoutMutation.mutate(selectedPrice.id);
    }
  };

  const monthlySavings = monthlyPrice && yearlyPrice
    ? Math.round(((monthlyPrice.amount! * 12) - yearlyPrice.amount!) / 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated ? (
        <Header />
      ) : (
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
          <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3" data-testid="logo-pricing">
              <Scale className="h-6 w-6 text-foreground" />
              <span className="text-base font-semibold text-foreground tracking-tight">
                Legal Tech Careers
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button asChild data-testid="button-pricing-login">
                <a href="/api/login">Sign In</a>
              </Button>
            </div>
          </nav>
        </header>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {checkoutSuccess && (
          <div className="mb-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-4 text-center" data-testid="checkout-success-banner">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Welcome to Pro! Your subscription is now active. All premium features are unlocked.
            </p>
          </div>
        )}

        {checkoutCanceled && (
          <div className="mb-8 rounded-md bg-amber-500/10 border border-amber-500/20 p-4 text-center" data-testid="checkout-canceled-banner">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Checkout was canceled. No charges were made.
            </p>
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-3 tracking-tight" data-testid="text-pricing-title">
            Simple, Transparent Pricing
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto" data-testid="text-pricing-subtitle">
            Start free and upgrade when you're ready for advanced career tools built specifically for legal professionals.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setBillingInterval("month")}
            className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${
              billingInterval === "month"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover-elevate"
            }`}
            data-testid="button-billing-monthly"
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("year")}
            className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${
              billingInterval === "year"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover-elevate"
            }`}
            data-testid="button-billing-yearly"
          >
            Yearly
            {monthlySavings > 0 && (
              <Badge variant="secondary" className="ml-2">
                Save ${monthlySavings}
              </Badge>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card className="relative" data-testid="card-plan-free">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Free</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">$0</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Browse jobs and get started with your legal tech career search.
              </p>
            </CardHeader>
            <CardContent>
              {!isPro && isAuthenticated && (
                <div className="mb-4">
                  <Badge variant="outline" className="text-xs" data-testid="badge-current-plan-free">Current Plan</Badge>
                </div>
              )}
              <ul className="space-y-3">
                {FREE_FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={feature.included ? "text-foreground" : "text-muted-foreground/60"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="relative border-primary/30" data-testid="card-plan-pro">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-3 py-0.5">
                Recommended
              </Badge>
            </div>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Pro</h3>
              </div>
              <div className="flex items-baseline gap-1">
                {pricesLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <span className="text-3xl font-bold text-foreground" data-testid="text-pro-price">
                      ${selectedPrice ? (selectedPrice.amount! / 100) : billingInterval === "month" ? 29 : 239}
                    </span>
                    <span className="text-sm text-muted-foreground">/{billingInterval === "month" ? "mo" : "yr"}</span>
                  </>
                )}
              </div>
              {billingInterval === "year" && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  That's just ~$20/mo, billed annually
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Full access to every tool for your legal tech career transition.
              </p>
            </CardHeader>
            <CardContent>
              {isPro ? (
                <div className="mb-4 space-y-2">
                  <Badge variant="default" className="text-xs" data-testid="badge-current-plan-pro">
                    <Crown className="h-3 w-3 mr-1" />
                    Active Pro Member
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    data-testid="button-manage-subscription"
                  >
                    {portalMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full mb-4"
                  onClick={handleUpgrade}
                  disabled={checkoutMutation.isPending || pricesLoading}
                  data-testid="button-upgrade-pro"
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {isAuthenticated ? "Upgrade to Pro" : "Sign In to Upgrade"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              <ul className="space-y-3">
                {PRO_FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-foreground">{feature.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-xl font-serif font-medium text-foreground mb-2">
            Questions?
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            All subscriptions can be canceled anytime from your billing portal. No long-term commitments.
            Your data and job search history are always preserved, even if you downgrade.
          </p>
        </div>
      </main>
    </div>
  );
}
