import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  LogOut, Settings, Compass, BarChart3, Bell, FileText, Crown, Search,
  Wrench, Bookmark, LayoutDashboard, MoreHorizontal, Menu
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Link, useLocation } from "wouter";
import { NotificationBell } from "@/components/notification-bell";
import { useSubscription } from "@/hooks/use-subscription";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
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
        className={`relative ${isActive ? "text-foreground" : "text-muted-foreground"}`}
        data-testid={testId}
      >
        <Icon className="h-3.5 w-3.5 mr-1.5" />
        {label}
        {isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
      </Button>
    </Link>
  );
}

export function Header() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isPro } = useSubscription();
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
  const isJobsActive = isActive("/jobs") || isActive("/") || location.startsWith("/jobs/");

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" data-testid="logo-header">
            <Logo className="h-5 w-5 text-foreground" />
            <span className="text-sm font-semibold text-foreground tracking-tight hidden sm:inline">
              Legal Tech Careers
            </span>
          </Link>

          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-0.5">
              <NavLink href="/jobs" icon={Search} label="Find Jobs" isActive={isJobsActive} testId="link-jobs" />
              <NavLink href="/saved-jobs" icon={Bookmark} label="Saved" isActive={isActive("/saved-jobs")} testId="link-saved-jobs" />
              <NavLink href="/resumes" icon={FileText} label="Resumes" isActive={isActive("/resumes") || isActive("/resume-builder")} testId="link-resumes" />
              <NavLink href="/career-advisor" icon={Compass} label="Advisor" isActive={isActive("/career-advisor")} testId="link-career-advisor" />
              <NavLink href="/insights" icon={BarChart3} label="Insights" isActive={isActive("/insights")} testId="link-insights" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`relative ${
                      isActive("/dashboard") || isActive("/alerts")
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                    data-testid="button-more-nav"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 mr-1.5" />
                    More
                    {(isActive("/dashboard") || isActive("/alerts")) && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer" data-testid="link-dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/alerts" className="cursor-pointer" data-testid="link-alerts">
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Job Alerts</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/resume-builder" className="cursor-pointer" data-testid="link-resume-builder">
                      <Wrench className="mr-2 h-4 w-4" />
                      <span>Resume Builder</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isAuthenticated ? (
            <>
              {!isPro && (
                <Link href="/pricing">
                  <Button variant="ghost" size="sm" className="hidden md:inline-flex gap-1.5 text-muted-foreground" data-testid="link-upgrade-pro">
                    <Crown className="h-3.5 w-3.5" />
                    Upgrade
                  </Button>
                </Link>
              )}
              <NotificationBell />
              <ThemeToggle />

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" data-testid="button-mobile-menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
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
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {user?.firstName} {user?.lastName}
                            </p>
                            {isPro && (
                              <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0">
                                <Crown className="h-2.5 w-2.5 mr-0.5" />
                                Pro
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2">
                      <MobileNavSection label="Main">
                        <MobileNavItem href="/jobs" icon={Search} label="Find Jobs" active={isJobsActive} testId="link-jobs-mobile" />
                        <MobileNavItem href="/saved-jobs" icon={Bookmark} label="Saved Jobs" active={isActive("/saved-jobs")} testId="link-saved-jobs-mobile" />
                        <MobileNavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive("/dashboard")} testId="link-dashboard-mobile" />
                      </MobileNavSection>

                      <MobileNavSection label="Tools">
                        <MobileNavItem href="/resumes" icon={FileText} label="Resumes" active={isActive("/resumes")} testId="link-resumes-mobile" />
                        <MobileNavItem href="/resume-builder" icon={Wrench} label="Resume Builder" active={isActive("/resume-builder")} testId="link-resume-builder-mobile" />
                        <MobileNavItem href="/career-advisor" icon={Compass} label="Career Advisor" active={isActive("/career-advisor")} testId="link-career-advisor-mobile" />
                        <MobileNavItem href="/insights" icon={BarChart3} label="Market Insights" active={isActive("/insights")} testId="link-insights-mobile" />
                        <MobileNavItem href="/alerts" icon={Bell} label="Job Alerts" active={isActive("/alerts")} testId="link-alerts-mobile" />
                      </MobileNavSection>

                      <MobileNavSection label="Account">
                        <MobileNavItem href="/pricing" icon={Crown} label="Pricing" active={isActive("/pricing")} testId="link-pricing-mobile" />
                        {isAdmin && (
                          <MobileNavItem href="/admin" icon={Settings} label="Admin" active={isActive("/admin")} testId="link-admin-mobile" />
                        )}
                      </MobileNavSection>
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
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full hidden lg:flex" data-testid="button-user-menu">
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">
                          {user?.firstName} {user?.lastName}
                        </p>
                        {isPro && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0" data-testid="badge-pro-user">
                            <Crown className="h-2.5 w-2.5 mr-0.5" />
                            Pro
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/pricing" className="cursor-pointer" data-testid="link-pricing">
                        <Crown className="mr-2 h-4 w-4" />
                        <span>Pricing</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer" data-testid="link-admin">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Admin</span>
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
      </nav>
    </header>
  );
}

function MobileNavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-1">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">{label}</p>
      {children}
    </div>
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
