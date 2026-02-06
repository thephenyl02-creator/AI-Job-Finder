import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export interface UserPersona {
  userId?: string;
  topCategories: string[];
  topSkills: string[];
  preferredLocations: string[];
  remotePreference: string;
  seniorityInterest: string[];
  careerStage: string;
  engagementLevel: string;
  searchPatterns: string[];
  viewedCompanies: string[];
  personaSummary: string | null;
  totalJobViews: number;
  totalSearches: number;
  totalApplyClicks: number;
  lastActiveAt?: string;
}

export function usePersona() {
  const { isAuthenticated } = useAuth();

  const { data: persona, isLoading } = useQuery<UserPersona>({
    queryKey: ["/api/persona"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    persona: persona || null,
    isLoading,
    hasPersona: !!persona && (persona.totalJobViews > 0 || persona.totalSearches > 0),
  };
}
