import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export function invalidateJobRelatedQueries() {
  queryClient.invalidateQueries({ predicate: (query) => {
    const key = query.queryKey[0] as string;
    return key === "/api/job-density"
      || key === "/api/stats"
      || key === "/api/featured-jobs"
      || key.startsWith("/api/jobs")
      || key.startsWith("/api/admin/jobs")
      || key === "/api/admin/pipeline-stats"
      || key === "/api/admin/monitoring"
      || key === "/api/admin/validation-status"
      || key.startsWith("/api/admin/analytics")
      || key.startsWith("/api/admin/reports")
      || key.startsWith("/api/diagnostics/jobs")
      || key.startsWith("/api/admin/standardization");
  }});
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 60 * 1000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
