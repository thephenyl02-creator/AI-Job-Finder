import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { ScrollToTop } from "@/components/scroll-to-top";
import { LogoMark } from "@/components/logo";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Jobs from "@/pages/jobs";
import JobDetail from "@/pages/job-detail";
import Admin from "@/pages/admin";
import About from "@/pages/about";
import PostJob from "@/pages/post-job";
import Insights from "@/pages/insights";
import Alerts from "@/pages/alerts";
import Resumes from "@/pages/resumes";
import ResumeBuilder from "@/pages/resume-builder";
import SavedJobs from "@/pages/saved-jobs";
import AdminAnalytics from "@/pages/admin-analytics";
import AdminScraper from "@/pages/admin-scraper";
import AdminEvents from "@/pages/admin-events";
import AdminReports from "@/pages/admin-reports";
import AdminImport from "@/pages/admin-import";
import AdminReview from "@/pages/admin-review";
import AdminUsers from "@/pages/admin-users";
import AdminSources from "@/pages/admin-sources";
import Pricing from "@/pages/pricing";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import EventDetail from "@/pages/event-detail";
import OpportunityMap from "@/pages/opportunity-map";
import ResumeEditor from "@/pages/resume-editor";
import Diagnostic from "@/pages/diagnostic";
import Quiz from "@/pages/quiz";
import MarketIntelligence from "@/pages/market-intelligence";

import { AssistantWidget } from "@/components/assistant-widget";
import { OnboardingDialog } from "@/components/onboarding-dialog";

function ResumeReviewRedirect({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(`/jobs/${params.id}`, { replace: true });
  }, [params.id, setLocation]);
  return null;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Landing />;
  if (isAdmin === false) return <Redirect to="/jobs" />;
  return <Component />;
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-3">
          <LogoMark className="h-6 w-6 text-foreground animate-pulse" />
          <span className="text-base font-semibold text-foreground tracking-tight">
            Legal Tech Careers
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">{isAuthenticated ? <Redirect to="/dashboard" /> : <Landing />}</Route>
      <Route path="/jobs" component={Jobs} />
      <Route path="/jobs/:id" component={JobDetail} />
      <Route path="/admin"><AdminRoute component={Admin} /></Route>
      <Route path="/admin/analytics"><AdminRoute component={AdminAnalytics} /></Route>
      <Route path="/admin/scraper"><AdminRoute component={AdminScraper} /></Route>
      <Route path="/admin/events"><AdminRoute component={AdminEvents} /></Route>
      <Route path="/admin/reports"><AdminRoute component={AdminReports} /></Route>
      <Route path="/admin/import-jobs"><AdminRoute component={AdminImport} /></Route>
      <Route path="/admin/review-jobs"><AdminRoute component={AdminReview} /></Route>
      <Route path="/admin/users"><AdminRoute component={AdminUsers} /></Route>
      <Route path="/admin/sources"><AdminRoute component={AdminSources} /></Route>
      <Route path="/career-advisor"><Redirect to="/jobs" /></Route>
      <Route path="/insights">{isAuthenticated ? <Insights /> : <Landing />}</Route>
      <Route path="/alerts">{isAuthenticated ? <Alerts /> : <Landing />}</Route>
      <Route path="/resumes">{isAuthenticated ? <Resumes /> : <Landing />}</Route>
      <Route path="/resume-builder">{isAuthenticated ? <ResumeBuilder /> : <Landing />}</Route>
      <Route path="/resume-review/:id" component={ResumeReviewRedirect} />
      <Route path="/resume-editor/:resumeId" component={ResumeEditor} />
      <Route path="/saved-jobs">{isAuthenticated ? <SavedJobs /> : <Landing />}</Route>
      <Route path="/diagnostic" component={Diagnostic} />
      <Route path="/quiz" component={Quiz} />
      <Route path="/dashboard">{isAuthenticated ? <Dashboard /> : <Landing />}</Route>
      <Route path="/events" component={Events} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/auth" component={Auth} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/about" component={About} />
      <Route path="/post-job" component={PostJob} />
      <Route path="/opportunity-map" component={OpportunityMap} />
      <Route path="/market-intelligence" component={MarketIntelligence} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="legal-ai-careers-theme">
        <TooltipProvider>
          <AppRouter />
          <OnboardingDialog />
          <AssistantWidget />
          <ScrollToTop />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
