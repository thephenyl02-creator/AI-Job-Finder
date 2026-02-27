import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Bell, Check, Briefcase, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface Notification {
  id: number;
  userId: string;
  alertId: number | null;
  jobId: number | null;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export function NotificationBell() {
  const { isAuthenticated } = useAuth();

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    staleTime: 15000,
    enabled: isAuthenticated,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = countData?.count || 0;
  const recentNotifications = notifications.slice(0, 10);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notification-bell">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 tabular-nums"
              data-testid="text-unread-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-muted-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                markAllReadMutation.mutate();
              }}
              data-testid="button-mark-all-read"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {recentNotifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-notifications">
              No notifications yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Set up job alerts to get notified
            </p>
          </div>
        ) : (
          <>
            {recentNotifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={`flex flex-col items-start gap-1 py-3 px-3 cursor-pointer ${
                  !notif.isRead ? "bg-muted/30" : ""
                }`}
                onClick={() => {
                  if (!notif.isRead) markReadMutation.mutate(notif.id);
                }}
                data-testid={`notification-item-${notif.id}`}
              >
                <div className="flex items-start gap-2 w-full">
                  <div className="shrink-0 mt-0.5">
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                    {notif.isRead && (
                      <div className="w-2 h-2" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight truncate" title={notif.title}>
                      {notif.title}
                    </p>
                    {notif.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                      {formatTimeAgo(notif.createdAt)}
                    </p>
                  </div>
                  {notif.jobId && (
                    <Link
                      href={`/jobs/${notif.jobId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    >
                      <Button variant="ghost" size="icon" data-testid={`button-view-job-${notif.id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/alerts" className="cursor-pointer flex items-center justify-center gap-1.5 py-2" data-testid="link-manage-alerts">
            <Briefcase className="h-3.5 w-3.5" />
            <span className="text-sm">Manage Job Alerts</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
