import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  LogOut, BarChart3, Bell, FileText, Globe,
  Bookmark, LayoutDashboard, Menu, Calendar, Settings, Activity, Search, CreditCard, Brain, TrendingUp,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Link, useLocation } from "wouter";
import { NotificationBell } from "@/components/notification-bell";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

function NavLink({ href, icon: Icon, label, isActive, testId }: {
  href: string;
  icon: typeof Search;
  label: string;
  isActive: boolean;
  testId: string;
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
        {isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
      </Button>
    </Link>
  );
}

export function Header() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [location] = useLocation();

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

  return (
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
              <NavLink href="/resumes" icon={FileText} label="Resumes" isActive={isResumesActive} testId="link-resumes" />
              <NavLink href="/market-intelligence" icon={TrendingUp} label="Trends" isActive={isActive("/market-intelligence")} testId="link-trends" />
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-0.5">
              <NavLink href="/jobs" icon={Search} label="Jobs" isActive={isJobsActive} testId="link-jobs-public" />
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
                  <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
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
                      <MobileNavItem href="/resumes" icon={FileText} label="Resumes" active={isResumesActive} testId="link-resumes-mobile" />
                      <MobileNavItem href="/market-intelligence" icon={TrendingUp} label="Trends" active={isActive("/market-intelligence")} testId="link-trends-mobile" />
                      <div className="h-px bg-border/40 my-2" />
                      <MobileNavItem href="/opportunity-map" icon={Globe} label="Opportunity Map" active={isActive("/opportunity-map")} testId="link-map-mobile" />
                      <MobileNavItem href="/events" icon={Calendar} label="Events" active={isActive("/events")} testId="link-events-mobile" />
                      <div className="h-px bg-border/40 my-2" />
                      <MobileNavItem href="/saved-jobs" icon={Bookmark} label="Saved Jobs" active={isActive("/saved-jobs")} testId="link-saved-jobs-mobile" />
                      <MobileNavItem href="/alerts" icon={Bell} label="Alerts" active={isActive("/alerts")} testId="link-alerts-mobile" />
                      <div className="h-px bg-border/40 my-2" />
                      <MobileNavItem href="/pricing" icon={CreditCard} label="Pricing" active={isActive("/pricing")} testId="link-pricing-mobile" />
                      {isAdmin && (
                        <MobileNavItem href="/admin" icon={Settings} label="Admin" active={isActive("/admin")} testId="link-admin-mobile" />
                      )}
                    </div>

                    <div className="p-3 border-t">
                      <SheetClose asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-muted-foreground"
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
  );
}

function MobileNavItem({ href, icon: Icon, label, active, testId }: {
  href: string;
  icon: typeof Search;
  label: string;
  active: boolean;
  testId: string;
}) {
  return (
    <SheetClose asChild>
      <Link href={href}>
        <Button
          variant="ghost"
          size="sm"
          className={`w-full justify-start gap-2 ${active ? "bg-muted text-foreground" : "text-muted-foreground"}`}
          data-testid={testId}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      </Link>
    </SheetClose>
  );
}
