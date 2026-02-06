import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface SubscriptionData {
  tier: string;
  status: string;
  currentPeriodEnd: number | null;
}

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/stripe/subscription"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/subscription", { credentials: "include" });
      if (!res.ok) return { tier: "free", status: "inactive", currentPeriodEnd: null };
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });

  const isPro = data?.tier === "pro" && data?.status === "active";

  return {
    tier: data?.tier || "free",
    status: data?.status || "inactive",
    isPro,
    isFree: !isPro,
    currentPeriodEnd: data?.currentPeriodEnd || null,
    isLoading,
  };
}
