import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/container";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  LogOut, BarChart3, Bell, FileText, Globe,
  Bookmark, LayoutDashboard, Menu, Calendar, Settings, Activity, Search, CreditCard, Brain, TrendingUp, X, Kanban, Mail, Building2,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Link, useLocation } from "wouter";
import { NotificationBell } from "@/components/notification-bell";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface EmailPrefs {
  weeklyDigest: boolean;
  alertEmails: boolean;
}

function EmailPreferencesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: emailPrefs } = useQuery<EmailPrefs>({
    queryKey: ["/api/user/email-preferences"],
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (prefs: Partial<EmailPrefs>) => {
      const res = await apiRequest("PATCH", "/api/user/email-preferences", prefs);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/email-preferences"] });
      toast({ title: "Preferences updated" });
    },
    onError: () => {
      toast({ title: "Failed to update preferences", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email Preferences</DialogTitle>
          <DialogDescription>
            Manage your email notification settings
          </DialogDescription>
        </DialogHeader>
        {user?.email && (
          <p className="text-xs text-muted-foreground truncate" data-testid="text-email-address">{user.email}</p>
        )}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-foreground">Weekly Digest</p>
              <p className="text-xs text-muted-foreground">Top new roles + market pulse every Sunday</p>
            </div>
            <Switch
              checked={emailPrefs?.weeklyDigest ?? true}
              onCheckedChange={(checked) => mutation.mutate({ weeklyDigest: checked })}
              disabled={mutation.isPending}
              data-testid="switch-weekly-digest"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-foreground">Job Alert Emails</p>
              <p className="text-xs text-muted-foreground">Get emailed when alerts match new jobs</p>
            </div>
            <Switch
              checked={emailPrefs?.alertEmails ?? true}
              onCheckedChange={(checked) => mutation.mutate({ alertEmails: checked })}
              disabled={mutation.isPending}
              data-testid="switch-alert-emails"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NavLink({ href, icon: Icon, label, isActive, testId, badgeCount }: {
  href: string;
  icon: typeof Search;
  label: string;
  isActive: boolean;
  testId: string;
  badgeCount?: number;
}) {
  return (
    <Link href={href}>
      <Button
        variant="ghost"
        size="sm"
        className={`relative text-xs px-2.5 h-8 ${isActive ? "text-foreground" : "text-muted-foreground"}`}
        data-testid={testId}
      >
        <Icon className="h-3.5 w-3.5 mr-1" />
        {label}
        {badgeCount != null && badgeCount > 0 && (
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] leading-4 no-default-active-elevate" data-testid="badge-pipeline-count">
            {badgeCount}
          </Badge>
        )}
        {isActive && <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />}
      </Button>
    </Link>
  );
}

function usePipelineCount(isAuthenticated: boolean) {
  const { data } = useQuery<{ id: number; status: string }[]>({
    queryKey: ["/api/applications"],
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  if (!data) return 0;
  return data.filter((a) => a.status !== "rejected").length;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const NUDGE_KEY = "proNudgeDismissed";

function useProNudgeBanner(isAuthenticated: boolean, isPro: boolean, isAdmin: boolean) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || isPro || isAdmin) {
      setVisible(false);
      return;
    }
    const stored = localStorage.getItem(NUDGE_KEY);
    if (stored) {
      const elapsed = Date.now() - Number(stored);
      if (elapsed < THREE_DAYS_MS) {
        setVisible(false);
        return;
      }
      localStorage.removeItem(NUDGE_KEY);
    }
    setVisible(true);
  }, [isAuthenticated, isPro, isAdmin]);

  const dismiss = useCallback(() => {
    localStorage.setItem(NUDGE_KEY, String(Date.now()));
    setVisible(false);
  }, []);

  return { visible, dismiss };
}

export function Header() {
  const { user, isAuthenticated, isPro, isAdmin, logout } = useAuth();
  const [location] = useLocation();
  const nudge = useProNudgeBanner(isAuthenticated, isPro, isAdmin);
  const pipelineCount = usePipelineCount(isAuthenticated);
  const [emailPrefsOpen, setEmailPrefsOpen] = useState(false);

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const isActive = (path: string) => location === path;
  const isJobsActive = isActive("/jobs") || location.startsWith("/jobs/");
  const isDashboardActive = isActive("/dashboard");
  const isResumesActive = isActive("/resumes") || isActive("/resume-builder") || location.startsWith("/resume-editor/");
  const isDiagnosticActive = isActive("/diagnostic");
  const isPipelineActive = isActive("/pipeline");

  return (
    <>
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40 header-elev">
      <Container className="h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" data-testid="logo-header">
            <Logo className="h-5 w-5 text-foreground" />
            <span className="text-sm font-semibold text-foreground tracking-tight hidden sm:inline">
              Legal Tech Careers
            </span>
          </Link>

          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-0.5">
              <NavLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" isActive={isDashboardActive} testId="link-dashboard" />
              <NavLink href="/jobs" icon={Search} label="Jobs" isActive={isJobsActive} testId="link-jobs" />
              <NavLink href="/diagnostic" icon={Brain} label="Diagnostic" isActive={isDiagnosticActive} testId="link-diagnostic" />
              <NavLink href="/pipeline" icon={Kanban} label="Pipeline" isActive={isPipelineActive} testId="link-pipeline" badgeCount={pipelineCount} />
              <NavLink href="/resumes" icon={FileText} label="Resumes" isActive={isResumesActive} testId="link-resumes" />
              <NavLink href="/companies" icon={Building2} label="Companies" isActive={isActive("/companies") || location.startsWith("/companies/")} testId="link-companies" />
              <NavLink href="/market-intelligence" icon={TrendingUp} label="Trends" isActive={isActive("/market-intelligence")} testId="link-trends" />
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-0.5">
              <NavLink href="/jobs" icon={Search} label="Jobs" isActive={isJobsActive} testId="link-jobs-public" />
              <NavLink href="/companies" icon={Building2} label="Companies" isActive={isActive("/companies") || location.startsWith("/companies/")} testId="link-companies-public" />
              <NavLink href="/market-intelligence" icon={TrendingUp} label="Trends" isActive={isActive("/market-intelligence")} testId="link-trends-public" />
              <NavLink href="/pricing" icon={CreditCard} label="Pricing" isActive={isActive("/pricing")} testId="link-pricing-public" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <ThemeToggle />

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden min-h-[44px] min-w-[44px]" data-testid="button-mobile-menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 max-w-[calc(100vw-3rem)] p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                    <SheetDescription>Main navigation and account options</SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                            {getInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" title={`${user?.firstName} ${user?.lastName}`}>
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate" title={user?.email ?? undefined}>{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
                      <MobileNavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={isDashboardActive} testId="link-dashboard-mobile" />
                      <MobileNavItem href="/jobs" icon={Search} label="Jobs" active={isJobsActive} testId="link-jobs-mobile" />
                      <MobileNavItem href="/diagnostic" icon={Brain} label="Diagnostic" active={isDiagnosticActive} testId="link-diagnostic-mobile" />
                      <MobileNavItem href="/pipeline" icon={Kanban} label="Pipeline" active={isPipelineActive} testId="link-pipeline-mobile" badgeCount={pipelineCount} />
                      <MobileNavItem href="/resumes" icon={FileText} label="Resumes" active={isResumesActive} testId="link-resumes-mobile" />
                      <MobileNavItem href="/companies" icon={Building2} label="Companies" active={isActive("/companies") || location.startsWith("/companies/")} testId="link-companies-mobile" />
                      <MobileNavItem href="/market-intelligence" icon={TrendingUp} label="Trends" active={isActive("/market-intelligence")} testId="link-trends-mobile" />
                      <div className="h-px bg-border/40 my-2" />
                      <MobileNavItem href="/opportunity-map" icon={Globe} label="Opportunity Map" active={isActive("/opportunity-map")} testId="link-map-mobile" />
                      <MobileNavItem href="/events" icon={Calendar} label="Events" active={isActive("/events")} testId="link-events-mobile" />
                      <div className="h-px bg-border/40 my-2" />
                      <MobileNavItem href="/saved-jobs" icon={Bookmark} label="Saved Jobs" active={isActive("/saved-jobs")} testId="link-saved-jobs-mobile" />
                      <MobileNavItem href="/alerts" icon={Bell} label="Alerts" active={isActive("/alerts")} testId="link-alerts-mobile" />
                      <div className="h-px bg-border/40 my-2" />
                      <MobileNavItem href="/pricing" icon={CreditCard} label="Pricing" active={isActive("/pricing")} testId="link-pricing-mobile" />
                      <div className="h-px bg-border/40 my-2" />
                      <SheetClose asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2 min-h-[44px] text-muted-foreground"
                          onClick={() => setEmailPrefsOpen(true)}
                          data-testid="button-email-preferences-mobile"
                        >
                          <Mail className="h-4 w-4" />
                          Email Preferences
                        </Button>
                      </SheetClose>
                      {isAdmin && (
                        <MobileNavItem href="/admin" icon={Settings} label="Admin" active={isActive("/admin")} testId="link-admin-mobile" />
                      )}
                    </div>

                    <div className="p-3 border-t">
                      <SheetClose asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-muted-foreground min-h-[44px]"
                          onClick={() => logout()}
                          data-testid="button-logout-mobile"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Log out
                        </Button>
                      </SheetClose>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hidden md:flex" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/pipeline" className="cursor-pointer" data-testid="link-pipeline-dropdown">
                        <Kanban className="mr-2 h-4 w-4" />
                        <span>Pipeline</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/saved-jobs" className="cursor-pointer" data-testid="link-saved-jobs-dropdown">
                        <Bookmark className="mr-2 h-4 w-4" />
                        <span>Saved Jobs</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/alerts" className="cursor-pointer" data-testid="link-alerts-dropdown">
                        <Bell className="mr-2 h-4 w-4" />
                        <span>Alerts</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/insights" className="cursor-pointer" data-testid="link-insights">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Market Insights</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/diagnostic" className="cursor-pointer" data-testid="link-diagnostic-dropdown">
                        <Brain className="mr-2 h-4 w-4" />
                        <span>Career Diagnostic</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      data-testid="button-email-preferences"
                      onClick={() => setEmailPrefsOpen(true)}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      <span>Email Preferences</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/pricing" className="cursor-pointer" data-testid="link-pricing">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Pricing</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Admin</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer" data-testid="link-admin">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Job Management</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/scraper" className="cursor-pointer" data-testid="link-admin-scraper">
                          <Activity className="mr-2 h-4 w-4" />
                          <span>Scraper</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/analytics" className="cursor-pointer" data-testid="link-admin-analytics">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          <span>Analytics</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/events" className="cursor-pointer" data-testid="link-admin-events">
                          <Calendar className="mr-2 h-4 w-4" />
                          <span>Events</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/reports" className="cursor-pointer" data-testid="link-admin-reports">
                          <Bell className="mr-2 h-4 w-4" />
                          <span>Reports</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    data-testid="button-logout"
                    onClick={() => logout()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link href="/auth">
                <Button data-testid="button-login">Sign In</Button>
              </Link>
            </>
          )}
        </div>
      </Container>
    </header>
    {nudge.visible && (
      <div
        data-testid="banner-pro-nudge"
        className="sticky top-14 z-50 bg-primary/5 border-b border-primary/10 py-1.5 px-4 text-xs text-muted-foreground text-center"
      >
        <div className="flex items-center justify-center gap-2">
          <span>
            You're on Free — Upgrade to Pro for full career intelligence, unlimited searches, and AI tools.{" "}
            <Link href="/pricing" data-testid="link-nudge-pricing" className="font-medium text-foreground underline underline-offset-2">
              View Plans &rarr;
            </Link>
          </span>
          <button
            onClick={nudge.dismiss}
            data-testid="button-dismiss-nudge"
            className="ml-2 p-0.5 rounded hover-elevate text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )}
    {isAuthenticated && <EmailPreferencesDialog open={emailPrefsOpen} onOpenChange={setEmailPrefsOpen} />}
    </>
  );
}

function MobileNavItem({ href, icon: Icon, label, active, testId, badgeCount }: {
  href: string;
  icon: typeof Search;
  label: string;
  active: boolean;
  testId: string;
  badgeCount?: number;
}) {
  return (
    <SheetClose asChild>
      <Link href={href}>
        <Button
          variant="ghost"
          size="sm"
          className={`w-full justify-start gap-2 min-h-[44px] ${active ? "bg-muted text-foreground" : "text-muted-foreground"}`}
          data-testid={testId}
        >
          <Icon className="h-4 w-4" />
          {label}
          {badgeCount != null && badgeCount > 0 && (
            <Badge variant="secondary" className="ml-auto px-1.5 py-0 text-[10px] leading-4 no-default-active-elevate" data-testid="badge-pipeline-count-mobile">
              {badgeCount}
            </Badge>
          )}
        </Button>
      </Link>
    </SheetClose>
  );
}
