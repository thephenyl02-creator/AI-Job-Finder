import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdminHeader } from "@/components/admin-header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Users,
  Crown,
  DollarSign,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
  ShieldOff,
  CreditCard,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Receipt,
  CalendarDays,
  TrendingUp,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
  createdAt: string | null;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

interface SubStats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  monthlyRevenue: number;
  recentCharges: number;
}

interface PaymentEntry {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description: string | null;
  invoiceUrl: string | null;
  receiptUrl: string | null;
}

interface SubscriptionDetail {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  plan: { interval: string; amount: number } | null;
}

interface PaymentHistoryResponse {
  payments: PaymentEntry[];
  subscription: SubscriptionDetail | null;
  message?: string;
}

function formatCurrency(cents: number, currency: string = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(timestamp: number | string | null) {
  if (!timestamp) return "N/A";
  const d = typeof timestamp === "number" ? new Date(timestamp * 1000) : new Date(timestamp);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatsCards() {
  const { data: stats, isLoading } = useQuery<SubStats>({
    queryKey: ["/api/admin/subscription-stats"],
    staleTime: 1000 * 60 * 2,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="py-6 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      testId: "stat-total-users",
    },
    {
      label: "Pro Subscribers",
      value: stats.proUsers,
      icon: Crown,
      testId: "stat-pro-users",
    },
    {
      label: "Free Users",
      value: stats.freeUsers,
      icon: Users,
      testId: "stat-free-users",
    },
    {
      label: "Revenue (30d)",
      value: formatCurrency(stats.monthlyRevenue),
      icon: DollarSign,
      testId: "stat-monthly-revenue",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-semibold mt-0.5" data-testid={card.testId}>
                  {card.value}
                </p>
              </div>
              <card.icon className="h-5 w-5 text-muted-foreground/60" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PaymentHistory({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery<PaymentHistoryResponse>({
    queryKey: ["/api/admin/users", userId, "payment-history"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}/payment-history`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch payment history");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {data.subscription && (
        <div className="p-3 border rounded-md space-y-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Active Subscription</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge
                variant={data.subscription.status === "active" ? "default" : "secondary"}
                data-testid="badge-sub-status"
              >
                {data.subscription.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p data-testid="text-sub-plan">
                {data.subscription.plan
                  ? `${formatCurrency(data.subscription.plan.amount)} / ${data.subscription.plan.interval}`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Period</p>
              <p data-testid="text-sub-period">
                {formatDate(data.subscription.currentPeriodStart)} - {formatDate(data.subscription.currentPeriodEnd)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Auto-Renew</p>
              <p data-testid="text-sub-renew">
                {data.subscription.cancelAtPeriodEnd ? "Cancels at end" : "Yes"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Payment History</span>
        </div>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {data.message || "No payments found"}
          </p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden md:table-cell">Description</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Links</th>
                </tr>
              </thead>
              <tbody>
                {data.payments
                  .sort((a, b) => b.created - a.created)
                  .map((payment) => (
                    <tr key={payment.id} className="border-b last:border-b-0" data-testid={`payment-row-${payment.id}`}>
                      <td className="py-2 px-3">{formatDate(payment.created)}</td>
                      <td className="py-2 px-3 font-medium">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="py-2 px-3 hidden sm:table-cell">
                        <Badge
                          variant={payment.status === "succeeded" || payment.status === "paid" ? "default" : "secondary"}
                        >
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 hidden md:table-cell text-muted-foreground truncate max-w-[200px]">
                        {payment.description || "-"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {payment.invoiceUrl && (
                            <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" data-testid={`button-invoice-${payment.id}`}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          )}
                          {payment.receiptUrl && (
                            <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" data-testid={`button-receipt-${payment.id}`}>
                                <Receipt className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const toggleProMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/users/${user.id}/toggle-pro`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-stats"] });
      toast({
        title: `Subscription Updated`,
        description: `User is now ${data.tier === "pro" ? "Pro" : "Free"}`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update subscription", variant: "destructive" });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/users/${user.id}/toggle-admin`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Admin status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update admin status", variant: "destructive" });
    },
  });

  const isPro = user.subscriptionTier === "pro";
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "No name";

  return (
    <div className="border rounded-md" data-testid={`user-row-${user.id}`}>
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover-elevate"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-expand-user-${user.id}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate" data-testid={`text-user-name-${user.id}`}>
              {displayName}
            </span>
            {user.isAdmin && (
              <Badge variant="outline" className="text-xs">
                Admin
              </Badge>
            )}
            {isPro ? (
              <Badge data-testid={`badge-pro-${user.id}`}>
                <Crown className="h-3 w-3 mr-1" />
                Pro
              </Badge>
            ) : (
              <Badge variant="secondary" data-testid={`badge-free-${user.id}`}>
                Free
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate" data-testid={`text-user-email-${user.id}`}>
            {user.email || "No email"}
          </p>
        </div>

        <div className="hidden sm:block text-xs text-muted-foreground text-right shrink-0">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDate(user.createdAt)}
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {expanded && (
        <div className="border-t px-3 py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isPro ? "secondary" : "default"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleProMutation.mutate();
              }}
              disabled={toggleProMutation.isPending}
              data-testid={`button-toggle-pro-${user.id}`}
            >
              {toggleProMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : isPro ? (
                <ToggleRight className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <ToggleLeft className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isPro ? "Revoke Pro" : "Grant Pro"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleAdminMutation.mutate();
              }}
              disabled={toggleAdminMutation.isPending}
              data-testid={`button-toggle-admin-${user.id}`}
            >
              {toggleAdminMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : user.isAdmin ? (
                <ShieldOff className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              )}
              {user.isAdmin ? "Remove Admin" : "Make Admin"}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="text-xs font-mono truncate">{user.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stripe Customer</p>
              <p className="text-xs font-mono truncate">{user.stripeCustomerId || "None"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subscription Status</p>
              <p className="text-xs">{user.subscriptionStatus || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="text-xs">{formatDate(user.createdAt)}</p>
            </div>
          </div>

          {user.stripeCustomerId && <PaymentHistory userId={user.id} />}
          {!user.stripeCustomerId && (
            <p className="text-sm text-muted-foreground">No Stripe account linked to this user.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminUsers() {
  usePageTitle("User Management - Admin");

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    tier: tierFilter,
    ...(search && { search }),
  });

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["/api/admin/users", search, tierFilter, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?${queryParams.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    staleTime: 1000 * 30,
  });

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="User Management" />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <StatsCards />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              All Users
            </CardTitle>
            {data && (
              <span className="text-sm text-muted-foreground" data-testid="text-total-users-count">
                {data.total} user{data.total !== 1 ? "s" : ""}
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                  data-testid="input-user-search"
                />
              </div>
              <Select
                value={tierFilter}
                onValueChange={(v) => {
                  setTierFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]" data-testid="select-tier-filter">
                  <SelectValue placeholder="Filter by tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="pro">Pro Only</SelectItem>
                  <SelectItem value="free">Free Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : data && data.users.length > 0 ? (
              <>
                <div className="space-y-2">
                  {data.users.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </div>

                {data.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      Page {data.page} of {data.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= (data?.totalPages || 1)}
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">
                  {search ? "No users match your search" : "No users found"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
