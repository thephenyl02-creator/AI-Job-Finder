import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function fetchIsAdmin(): Promise<boolean> {
  const response = await fetch("/api/auth/is-admin", {
    credentials: "include",
  });

  if (response.status === 401) {
    return false;
  }

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.isAdmin === true;
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: isAdmin } = useQuery<boolean>({
    queryKey: ["/api/auth/is-admin"],
    queryFn: fetchIsAdmin,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!user, // Only check admin status if user is logged in
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.setQueryData(["/api/auth/is-admin"], false);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: isAdmin === true,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
