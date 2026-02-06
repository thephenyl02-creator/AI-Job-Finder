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
} from "@/components/ui/dropdown-menu";
import { LogOut, Briefcase, Info, Settings, Compass, Scale, BarChart3, Bell, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { NotificationBell } from "@/components/notification-bell";

export function Header() {
  const { user, isAuthenticated, isAdmin } = useAuth();
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
            <Scale className="h-5 w-5 text-foreground" />
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
                  className={isActive("/") ? "text-foreground" : "text-muted-foreground"}
                  data-testid="link-search"
                >
                  Search
                </Button>
              </Link>
              <Link href="/jobs">
                <Button
                  variant="ghost"
                  size="sm"
                  className={isActive("/jobs") ? "text-foreground" : "text-muted-foreground"}
                  data-testid="link-jobs"
                >
                  Jobs
                </Button>
              </Link>
              <Link href="/career-advisor">
                <Button
                  variant="ghost"
                  size="sm"
                  className={isActive("/career-advisor") ? "text-foreground" : "text-muted-foreground"}
                  data-testid="link-career-advisor"
                >
                  Career Advisor
                </Button>
              </Link>
              <Link href="/insights">
                <Button
                  variant="ghost"
                  size="sm"
                  className={isActive("/insights") ? "text-foreground" : "text-muted-foreground"}
                  data-testid="link-insights"
                >
                  Insights
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link href="/post-job" className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="link-post-job">
                  Post a Job
                </Button>
              </Link>
              <NotificationBell />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
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
                  <DropdownMenuItem asChild className="sm:hidden">
                    <Link href="/career-advisor" className="cursor-pointer" data-testid="link-career-advisor-mobile">
                      <Compass className="mr-2 h-4 w-4" />
                      <span>Career Advisor</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="sm:hidden">
                    <Link href="/insights" className="cursor-pointer" data-testid="link-insights-mobile">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      <span>Insights</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="sm:hidden">
                    <Link href="/post-job" className="cursor-pointer" data-testid="link-post-job-mobile">
                      <Briefcase className="mr-2 h-4 w-4" />
                      <span>Post a Job</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/resumes" className="cursor-pointer" data-testid="link-resumes">
                      <FileText className="mr-2 h-4 w-4" />
                      <span>My Resumes</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/alerts" className="cursor-pointer" data-testid="link-alerts">
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Job Alerts</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/about" className="cursor-pointer" data-testid="link-about">
                      <Info className="mr-2 h-4 w-4" />
                      <span>About</span>
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer" data-testid="link-admin">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Admin</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/api/logout" className="cursor-pointer" data-testid="button-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Button asChild data-testid="button-login">
                <a href="/api/login">Sign In</a>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
