import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
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
  Sparkles,
  ChevronDown,
  ChevronUp,
  Building2,
  Briefcase,
  Shield,
  CalendarDays,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";

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
  { text: "Browse all job listings", included: true },
  { text: "Basic keyword search", included: true },
  { text: "View job details & apply links", included: true },
  { text: "Submit job postings", included: true },
  { text: "Upload 1 resume", included: true },
  { text: "Career Diagnostic (top 2 paths)", included: true },
  { text: "3 smart searches", included: true },
  { text: "2 career advisor chats per day", included: true },
  { text: "Full Career Diagnostic & 30-day plan", included: false },
  { text: "Per-job fit scores & match analysis", included: false },
  { text: "Resume tailoring & ATS review", included: false },
  { text: "Market insights & analytics", included: false },
  { text: "Job alerts & notifications", included: false },
  { text: "Multi-resume management (up to 5)", included: false },
  { text: "Unlimited smart search & advisor chats", included: false },
];

const PRO_FEATURES = [
  { text: "Everything in Free", included: true },
  { text: "Full Career Diagnostic", included: true, detail: "Complete readiness report with all career paths, detailed skill gaps, and a personalized 30-day transition plan" },
  { text: "Per-job fit scores", included: true, detail: "See your match percentage for every role, broken down by skills, experience, domain, and seniority" },
  { text: "Resume matching & tailoring", included: true, detail: "Rewrite your bullet points to match each employer's language and pass ATS screening" },
  { text: "Deep job comparison & analysis", included: true, detail: "Compare roles side by side with career trajectory insights" },
  { text: "Market insights & analytics", included: true, detail: "Salary data, hiring trends, and demand by category" },
  { text: "Job alerts & notifications", included: true, detail: "Get notified when roles matching your profile are posted" },
  { text: "Up to 5 resumes", included: true, detail: "Tailor different resumes for different role types" },
  { text: "Unlimited smart search", included: true, detail: "Describe what you want and we find your best matches, with follow-up questions" },
  { text: "Unlimited career advisor chats", included: true, detail: "Ask anything about your transition, as many times as you need" },
  { text: "Priority support", included: true },
];

const FAQ_ITEMS = [
  {
    q: "Can I really use the platform for free?",
    a: "Yes. Browse every job, search by keyword, view full details, and apply directly. Free accounts never expire.",
  },
  {
    q: "What does Pro add that's worth paying for?",
    a: "Pro unlocks the full Career Diagnostic (all career paths, detailed skill gaps, and a 30-day transition plan), per-job fit scores for every listing, resume tailoring and ATS review, job alerts, market insights, unlimited smart searches, and unlimited career advisor chats. These tools save hours of manual research and give you a clear action plan.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your billing portal with one click. No cancellation fees, no questions. Your account stays active until the end of your billing period, and your data is preserved even after downgrading.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Everything is preserved. Your resumes, search history, and saved preferences stay in your account. You just lose access to Pro features until you resubscribe.",
  },
  {
    q: "Is the yearly plan worth it?",
    a: "If you're actively job searching, yes. You save 50% compared to monthly billing. That's $2.50/mo instead of $5/mo for the same full access.",
  },
];

export default function Pricing() {
  usePageTitle("Pricing");
  const { isAuthenticated } = useAuth();
  const { isPro } = useSubscription();
  const { track } = useActivityTracker();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    track({ eventType: "page_view", pagePath: "/pricing" });
    if (!isAuthenticated) {
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "pricing_page_view" }) }).catch(() => {});
    }
  }, []);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [checkoutSuccess] = useState(() => new URLSearchParams(window.location.search).get("success") === "true");
  const [checkoutCanceled] = useState(() => new URLSearchParams(window.location.search).get("canceled") === "true");

  useEffect(() => {
    if (!checkoutSuccess || !isAuthenticated) return;

    let cancelled = false;
    const syncSubscription = async () => {
      try {
        const syncRes = await fetch("/api/stripe/confirm-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const syncData = await syncRes.json();

        if (!cancelled && syncData.tier === "pro") {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          window.history.replaceState({}, "", "/pricing");
          return;
        }

        let attempts = 0;
        const poll = setInterval(async () => {
          if (cancelled || attempts >= 10) {
            clearInterval(poll);
            if (!cancelled) {
              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              window.history.replaceState({}, "", "/pricing");
            }
            return;
          }
          attempts++;
          try {
            const res = await fetch("/api/stripe/confirm-checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
            });
            const data = await res.json();
            if (!cancelled && data.tier === "pro") {
              clearInterval(poll);
              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              window.history.replaceState({}, "", "/pricing");
            }
          } catch {}
        }, 2000);
      } catch {
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          window.history.replaceState({}, "", "/pricing");
        }
      }
    };

    syncSubscription();
    return () => { cancelled = true; };
  }, [checkoutSuccess, isAuthenticated]);

  const { data: pricingData, isLoading: pricesLoading } = useQuery<PricingResponse>({
    queryKey: ["/api/stripe/prices"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/prices");
      if (!res.ok) throw new Error("Failed to fetch prices");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: stats } = useQuery<{
    totalJobs: number;
    totalCompanies: number;
    totalCategories: number;
    upcomingEvents: number;
  }>({
    queryKey: ["/api/stats"],
    staleTime: 1000 * 60 * 5,
  });

  const { data: socialProof, isLoading: socialProofLoading } = useQuery<{
    diagnosticsRun: number;
    totalUsers: number;
    jobsCurated: number;
    companiesTracked: number;
  }>({
    queryKey: ["/api/stats/social-proof"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create checkout session");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({ title: "Checkout Error", description: error.message || "Something went wrong. Please try again.", variant: "destructive" });
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
      window.location.href = "/auth";
      return;
    }
    track({ eventType: "upgrade_click", metadata: { interval: billingInterval, priceId: selectedPrice?.id } });
    if (selectedPrice) {
      checkoutMutation.mutate(selectedPrice.id);
    }
  };

  const monthlySavings = monthlyPrice && yearlyPrice
    ? Math.round(((monthlyPrice.amount! * 12) - yearlyPrice.amount!) / 100)
    : 0;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {isAuthenticated ? (
        <Header />
      ) : (
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
          <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer" data-testid="logo-pricing">
                <LogoMark className="h-6 w-6 text-foreground" />
                <span className="text-base font-semibold text-foreground tracking-tight">
                  Legal Tech Careers
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/auth">
                <Button data-testid="button-pricing-login">Sign In</Button>
              </Link>
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

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-3 tracking-tight" data-testid="text-pricing-title">
            Less than a coffee. More than a job board.
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto" data-testid="text-pricing-subtitle">
            Browse for free, forever. Upgrade to Pro when you're ready for tools that actually help you land the right role.
          </p>
        </div>

        {stats && (
          <div className="flex items-center justify-center gap-4 sm:gap-10 mb-8 flex-wrap" data-testid="section-social-proof">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4 shrink-0" />
              <span><span className="font-semibold text-foreground">{stats.totalJobs}+</span> active roles</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 shrink-0" />
              <span><span className="font-semibold text-foreground">{stats.totalCompanies}</span> legal tech companies</span>
            </div>
            {stats.upcomingEvents > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span><span className="font-semibold text-foreground">{stats.upcomingEvents}</span> upcoming events</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-1 mb-10 bg-muted rounded-md p-1 w-fit mx-auto" data-testid="billing-toggle">
          <button
            type="button"
            onClick={() => setBillingInterval("month")}
            className={`text-sm font-medium px-4 py-2.5 rounded-md transition-colors min-h-[44px] ${
              billingInterval === "month"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            data-testid="button-billing-monthly"
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("year")}
            className={`text-sm font-medium px-4 py-2.5 rounded-md transition-colors flex items-center gap-2 min-h-[44px] ${
              billingInterval === "year"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            data-testid="button-billing-yearly"
          >
            Yearly
            <Badge variant="secondary" className="text-[10px]">
              Save 50%
            </Badge>
            <Badge variant="secondary" className="text-[10px]" data-testid="badge-most-popular">
              Most popular
            </Badge>
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
                <span className="text-sm text-muted-foreground">/forever</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Search, browse, and apply to every listing. No credit card needed.
              </p>
            </CardHeader>
            <CardContent>
              {!isPro && isAuthenticated && (
                <div className="mb-4">
                  <Badge variant="outline" className="text-xs" data-testid="badge-current-plan-free">Current Plan</Badge>
                </div>
              )}
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  className="w-full mb-4"
                  asChild
                  data-testid="button-get-started-free"
                >
                  <a href="/auth">
                    Get Started
                  </a>
                </Button>
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
                Most Popular
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
                      ${selectedPrice ? (selectedPrice.amount! / 100) : billingInterval === "month" ? 5 : 30}
                    </span>
                    <span className="text-sm text-muted-foreground">/{billingInterval === "month" ? "mo" : "yr"}</span>
                  </>
                )}
              </div>
              {billingInterval === "year" && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1" data-testid="text-yearly-breakdown">
                  Just $2.50/mo, billed annually
                </p>
              )}
              {billingInterval === "month" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Or save 50% with yearly billing
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Resume matching, career comparisons, alerts, and market data. Everything you need to land the right role.
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
                <>
                  <Button
                    className="w-full mb-2"
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
                  <p className="text-xs text-muted-foreground text-center mb-4" data-testid="text-social-proof-pricing">
                    {socialProofLoading ? (
                      <Skeleton className="h-3 w-48 mx-auto inline-block" />
                    ) : socialProof ? (
                      <>Join {socialProof.totalUsers} professionals already on the platform</>
                    ) : null}
                  </p>
                </>
              )}
              <ul className="space-y-3">
                {PRO_FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-foreground">{feature.text}</span>
                      {feature.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feature.detail}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-center gap-4 sm:gap-10 mt-8 flex-wrap" data-testid="section-trust-signals">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>Cancel anytime, no questions asked</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>Instant access after upgrade</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Crown className="h-3.5 w-3.5 shrink-0" />
            <span>Save 50% with yearly billing</span>
          </div>
        </div>

        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-serif font-medium text-foreground mb-2 text-center tracking-tight" data-testid="text-faq-title">
            Common questions
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Straightforward answers. No fine print.
          </p>

          <div className="space-y-2" data-testid="faq-section">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="border border-border/60 rounded-md overflow-hidden"
                data-testid={`faq-item-${i}`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-4 text-left hover-elevate"
                  data-testid={`button-faq-${i}`}
                >
                  <span className="text-sm font-medium text-foreground">{item.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                <div
                  className="grid transition-all duration-200 ease-in-out"
                  style={{ gridTemplateRows: openFaq === i ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            All subscriptions can be canceled anytime. No long-term commitments.
            Your data and search history are always preserved, even if you downgrade.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
