import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Search from "@/pages/search";
import Jobs from "@/pages/jobs";
import Admin from "@/pages/admin";
import About from "@/pages/about";
import PostJob from "@/pages/post-job";
import CareerAdvisor from "@/pages/career-advisor";

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={isAuthenticated ? Search : Landing} />
      <Route path="/jobs">{isAuthenticated ? <Jobs /> : <Landing />}</Route>
      <Route path="/admin">{isAuthenticated ? <Admin /> : <Landing />}</Route>
      <Route path="/career-advisor">{isAuthenticated ? <CareerAdvisor /> : <Landing />}</Route>
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
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
