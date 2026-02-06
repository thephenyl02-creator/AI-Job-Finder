import { Switch, Route } from "wouter";
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
import Search from "@/pages/search";
import Jobs from "@/pages/jobs";
import JobDetail from "@/pages/job-detail";
import Admin from "@/pages/admin";
import About from "@/pages/about";
import PostJob from "@/pages/post-job";
import CareerAdvisor from "@/pages/career-advisor";
import Insights from "@/pages/insights";
import Alerts from "@/pages/alerts";
import Resumes from "@/pages/resumes";
import ResumeBuilder from "@/pages/resume-builder";
import Pricing from "@/pages/pricing";
import { AssistantWidget } from "@/components/assistant-widget";

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
      <Route path="/" component={isAuthenticated ? Search : Landing} />
      <Route path="/search">{isAuthenticated ? <Search /> : <Landing />}</Route>
      <Route path="/jobs">{isAuthenticated ? <Jobs /> : <Landing />}</Route>
      <Route path="/jobs/:id">{isAuthenticated ? <JobDetail /> : <Landing />}</Route>
      <Route path="/admin">{isAuthenticated ? <Admin /> : <Landing />}</Route>
      <Route path="/career-advisor">{isAuthenticated ? <CareerAdvisor /> : <Landing />}</Route>
      <Route path="/insights">{isAuthenticated ? <Insights /> : <Landing />}</Route>
      <Route path="/alerts">{isAuthenticated ? <Alerts /> : <Landing />}</Route>
      <Route path="/resumes">{isAuthenticated ? <Resumes /> : <Landing />}</Route>
      <Route path="/resume-builder">{isAuthenticated ? <ResumeBuilder /> : <Landing />}</Route>
      <Route path="/auth" component={Auth} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/about" component={About} />
      <Route path="/post-job" component={PostJob} />
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
          <AssistantWidget />
          <ScrollToTop />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
