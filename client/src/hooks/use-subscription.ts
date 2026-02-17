import { useAuth } from "@/hooks/use-auth";

export function useSubscription() {
  const { user, isLoading, isPro, isFree, subscriptionTier, subscriptionStatus } = useAuth();

  return {
    tier: subscriptionTier,
    status: subscriptionStatus,
    isPro,
    isFree,
    currentPeriodEnd: null,
    isLoading,
  };
}
