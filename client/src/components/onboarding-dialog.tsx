import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { JOB_TAXONOMY } from "@shared/schema";
import {
  Briefcase, ArrowRight,
  CheckCircle, Target, Loader2
} from "lucide-react";
import { useLocation } from "wouter";

const CURRENT_ROLES = [
  "Attorney / Lawyer",
  "Paralegal",
  "Legal Operations",
  "Law Student",
  "Compliance Professional",
  "Contract Manager",
  "Other",
];

const ROLE_CATEGORIES = Object.entries(JOB_TAXONOMY).map(([name, data]) => ({
  name,
  shortName: (data as any).shortName,
}));

export function OnboardingDialog() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [currentRole, setCurrentRole] = useState("");
  const [targetCategories, setTargetCategories] = useState<string[]>([]);

  const { data: onboardingStatus, isLoading } = useQuery<{ completed: boolean }>({
    queryKey: ["/api/onboarding/status"],
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10,
  });

  const completeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/onboarding/complete", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/persona"] });
      setLocation("/jobs");
    },
  });

  const isOpen = isAuthenticated && !isLoading && onboardingStatus?.completed === false;

  const handleComplete = () => {
    completeMutation.mutate({
      currentRole,
      targetRoleTypes: targetCategories,
    });
  };

  const handleSkip = () => {
    completeMutation.mutate({
      onboardingCompleted: true,
    });
  };

  const toggleCategory = (name: string) => {
    setTargetCategories(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-serif" data-testid="text-onboarding-title">
            {step === 0 ? "Welcome — tell us about yourself" : "What kind of roles interest you?"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 0
              ? "This takes 30 seconds and helps us show you the most relevant roles."
              : "Pick the areas that sound interesting. You can always change this later."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-4">
          <div className={`h-1 flex-1 rounded-full ${step >= 0 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
        </div>

        {step === 0 && (
          <div className="space-y-2" data-testid="onboarding-step-role">
            <p className="text-sm font-medium text-foreground">What best describes you?</p>
            <div className="grid grid-cols-1 gap-1.5">
              {CURRENT_ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => setCurrentRole(role)}
                  className={`flex items-center gap-3 p-3 rounded-md text-left text-sm transition-colors ${
                    currentRole === role
                      ? "bg-primary/10 border border-primary/30 text-foreground"
                      : "hover-elevate border border-transparent"
                  }`}
                  data-testid={`button-role-${role.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{role}</span>
                  {currentRole === role && <CheckCircle className="h-4 w-4 ml-auto text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2" data-testid="onboarding-step-interests">
            <p className="text-sm font-medium text-foreground">Select all that sound interesting</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {ROLE_CATEGORIES.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => toggleCategory(cat.name)}
                  className={`flex items-center gap-2 p-2.5 rounded-md text-left text-sm transition-colors ${
                    targetCategories.includes(cat.name)
                      ? "bg-primary/10 border border-primary/30"
                      : "hover-elevate border border-transparent"
                  }`}
                  data-testid={`button-category-${cat.shortName.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{cat.shortName}</span>
                  {targetCategories.includes(cat.name) && <CheckCircle className="h-3.5 w-3.5 ml-auto text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div>
            {step === 0 ? (
              <Button variant="ghost" size="sm" onClick={handleSkip} data-testid="button-skip-onboarding">
                Skip for now
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setStep(0)} data-testid="button-onboarding-back">
                Back
              </Button>
            )}
          </div>
          <div>
            {step === 0 ? (
              <Button onClick={() => setStep(1)} disabled={!currentRole} data-testid="button-onboarding-next">
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={completeMutation.isPending || targetCategories.length === 0}
                data-testid="button-onboarding-finish"
              >
                {completeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Show me jobs
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
