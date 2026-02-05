import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { SearchBar } from "@/components/search-bar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { apiRequest } from "@/lib/queryClient";
import type { JobWithScore } from "@shared/schema";

export default function Search() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/search", { query });
      return response.json();
    },
    onSuccess: (data: JobWithScore[], query: string) => {
      sessionStorage.setItem("searchResults", JSON.stringify(data));
      sessionStorage.setItem("searchQuery", query);
      setLocation("/jobs");
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Session expired",
          description: "Please log in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Search failed",
        description: "Please try again with a different query.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = (query: string) => {
    searchMutation.mutate(query);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Legal Tech Job Intelligence
          </h1>
          <p className="text-lg text-muted-foreground">
            Discover AI-powered job matching across legal technology careers
          </p>
        </div>

        <SearchBar 
          onSearch={handleSearch} 
          isLoading={searchMutation.isPending} 
        />

        <div className="mt-12 text-center">
          <button
            onClick={() => setLocation("/jobs")}
            className="text-primary hover:underline"
            data-testid="link-browse-all"
          >
            Or browse all jobs →
          </button>
        </div>
      </main>
    </div>
  );
}
