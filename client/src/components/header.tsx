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
import { LogOut, Briefcase, Info, Settings, Compass, BarChart3, Bell, FileText, Crown, Search, Wrench, Bookmark, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/logo";
import { Link, useLocation } from "wouter";
import { NotificationBell } from "@/components/notification-bell";
import { useSubscription } from "@/hooks/use-subscription";
import { Badge } from "@/components/ui/badge";

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

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" data-testid="logo-header">
            <Logo className="h-5 w-5 text-foreground" />
            <span className="text-sm font-semibold text-foreground tracking-tight hidden sm:inline">
              Legal Tech Careers
            </span>
          </Link>

          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-1">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`relative ${isActive("/") ? "text-foreground" : "text-muted-foreground"}`}
                  data-testid="link-search"
                >
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  Search
                  {isActive("/") && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
                </Button>
              </Link>
              <Link href="/jobs">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`relative ${isActive("/jobs") || location.startsWith("/jobs/") ? "text-foreground" : "text-muted-foreground"}`}
                  data-testid="link-jobs"
                >
                  <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                  Jobs
                  {(isActive("/jobs") || location.startsWith("/jobs/")) && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`relative ${isActive("/dashboard") ? "text-foreground" : "text-muted-foreground"}`}
                  data-testid="link-dashboard"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                  Dashboard
                  {isActive("/dashboard") && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {!isPro && (
                <Link href="/pricing">
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-1.5 text-muted-foreground" data-testid="link-upgrade-pro">
                    <Crown className="h-3.5 w-3.5" />
                    Upgrade
                  </Button>
                </Link>
              )}
              <NotificationBell />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="button-user-menu">
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
                  <DropdownMenuGroup className="sm:hidden">
                    <DropdownMenuItem asChild>
                      <Link href="/" className="cursor-pointer" data-testid="link-search-mobile">
                        <Search className="mr-2 h-4 w-4" />
                        <span>Search</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/jobs" className="cursor-pointer" data-testid="link-jobs-mobile">
                        <Briefcase className="mr-2 h-4 w-4" />
                        <span>Jobs</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer" data-testid="link-dashboard-mobile">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="sm:hidden" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/resumes" className="cursor-pointer" data-testid="link-resumes">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Resumes</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/saved-jobs" className="cursor-pointer" data-testid="link-saved-jobs">
                        <Bookmark className="mr-2 h-4 w-4" />
                        <span>Saved Jobs</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/resume-builder" className="cursor-pointer" data-testid="link-resume-builder">
                        <Wrench className="mr-2 h-4 w-4" />
                        <span>Resume Builder</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/alerts" className="cursor-pointer" data-testid="link-alerts">
                        <Bell className="mr-2 h-4 w-4" />
                        <span>Job Alerts</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/career-advisor" className="cursor-pointer" data-testid="link-career-advisor">
                        <Compass className="mr-2 h-4 w-4" />
                        <span>Career Advisor</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/insights" className="cursor-pointer" data-testid="link-insights">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Market Insights</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/pricing" className="cursor-pointer" data-testid="link-pricing">
                        <Crown className="mr-2 h-4 w-4" />
                        <span>Pricing</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/about" className="cursor-pointer" data-testid="link-about">
                        <Info className="mr-2 h-4 w-4" />
                        <span>About</span>
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
