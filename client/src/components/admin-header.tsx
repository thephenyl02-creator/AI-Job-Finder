import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import {
  ArrowLeft,
  Settings,
  Activity,
  BarChart3,
  Calendar,
  ShieldAlert,
  Upload,
  ClipboardCheck,
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "Jobs", icon: Settings, testId: "link-admin-jobs" },
  { href: "/admin/scraper", label: "Scraper", icon: Activity, testId: "link-admin-scraper" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, testId: "link-admin-analytics" },
  { href: "/admin/events", label: "Events", icon: Calendar, testId: "link-admin-events-nav" },
  { href: "/admin/reports", label: "Reports", icon: ShieldAlert, testId: "link-admin-reports-nav" },
  { href: "/admin/import-jobs", label: "Import", icon: Upload, testId: "link-admin-import" },
  { href: "/admin/review-jobs", label: "Review", icon: ClipboardCheck, testId: "link-admin-review" },
];

interface AdminHeaderProps {
  title: string;
  description?: string;
}

export function AdminHeader({ title, description }: AdminHeaderProps) {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
        <Link href="/jobs">
          <Button variant="ghost" size="icon" data-testid="button-admin-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="logo-admin">
          <Logo className="h-5 w-5 text-foreground" />
          <span className="text-sm font-semibold text-foreground tracking-tight hidden sm:inline">
            Admin
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-0.5 ml-2">
          {ADMIN_NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={`relative ${isActive(item.href) ? "text-foreground" : "text-muted-foreground"}`}
                data-testid={item.testId}
              >
                <item.icon className="h-3.5 w-3.5 mr-1.5" />
                {item.label}
                {isActive(item.href) && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
              </Button>
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-3 lg:hidden">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {ADMIN_NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                size="sm"
                className="shrink-0 text-xs"
                data-testid={`${item.testId}-mobile`}
              >
                <item.icon className="h-3 w-3 mr-1" />
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
