import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { JOB_TAXONOMY } from "@shared/schema";
import {
  Briefcase, MapPin, GraduationCap, ArrowRight, ArrowLeft,
  CheckCircle, Target, Loader2
} from "lucide-react";

const EXPERIENCE_LEVELS = [
  { value: "student", label: "Student / Recent Graduate", description: "Still in school or just finished" },
  { value: "entry", label: "Early Career (0-3 years)", description: "Building foundational experience" },
  { value: "mid", label: "Mid-Level (3-7 years)", description: "Established professional" },
  { value: "senior", label: "Senior (7-15 years)", description: "Deep expertise and leadership" },
  { value: "executive", label: "Executive (15+ years)", description: "C-suite or senior leadership" },
];

const CURRENT_ROLES = [
  "Attorney / Lawyer",
  "Paralegal",
  "Legal Operations",
  "Law Student",
  "Compliance Professional",
  "Contract Manager",
  "Legal Analyst",
  "Tech Professional (entering legal)",
  "Other",
];

const ROLE_CATEGORIES = Object.entries(JOB_TAXONOMY).map(([name, data]) => ({
  name,
  shortName: (data as any).shortName,
  icon: (data as any).icon,
}));

export function OnboardingDialog() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [currentRole, setCurrentRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [targetCategories, setTargetCategories] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [remoteOnly, setRemoteOnly] = useState(false);

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
      queryClient.invalidateQueries({ queryKey: ["/api/search/suggestions"] });
    },
  });

  const isOpen = isAuthenticated && !isLoading && onboardingStatus?.completed === false;

  const handleComplete = () => {
    completeMutation.mutate({
      currentRole,
      targetRoleTypes: targetCategories,
      experienceLevel,
      locationPreferences: locations,
      remoteOnly,
    });
  };

  const handleSkip = () => {
    completeMutation.mutate({
      onboardingCompleted: true,
    });
  };

  const addLocation = () => {
    const trimmed = locationInput.trim();
    if (trimmed && !locations.includes(trimmed)) {
      setLocations([...locations, trimmed]);
      setLocationInput("");
    }
  };

  const toggleCategory = (name: string) => {
    setTargetCategories(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  const totalSteps = 4;
  const canProceed = step === 0
    ? !!currentRole
    : step === 1
    ? !!experienceLevel
    : step === 2
    ? targetCategories.length > 0
    : true;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-serif" data-testid="text-onboarding-title">
            {step === 0 && "Tell us about yourself"}
            {step === 1 && "Your experience level"}
            {step === 2 && "What interests you?"}
            {step === 3 && "Where do you want to work?"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 0 && "This helps us find the most relevant roles for you."}
            {step === 1 && "So we can match you with the right seniority level."}
            {step === 2 && "Select the areas of legal tech that appeal to you."}
            {step === 3 && "Location preferences help us prioritize your results."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-2" data-testid="onboarding-step-role">
            <Label className="text-sm font-medium">What best describes your current role?</Label>
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
          <div className="space-y-2" data-testid="onboarding-step-experience">
            <Label className="text-sm font-medium">How much experience do you have?</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {EXPERIENCE_LEVELS.map(level => (
                <button
                  key={level.value}
                  onClick={() => setExperienceLevel(level.value)}
                  className={`flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
                    experienceLevel === level.value
                      ? "bg-primary/10 border border-primary/30"
                      : "hover-elevate border border-transparent"
                  }`}
                  data-testid={`button-experience-${level.value}`}
                >
                  <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{level.label}</p>
                    <p className="text-xs text-muted-foreground">{level.description}</p>
                  </div>
                  {experienceLevel === level.value && <CheckCircle className="h-4 w-4 ml-auto text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2" data-testid="onboarding-step-interests">
            <Label className="text-sm font-medium">Which areas interest you? (Select all that apply)</Label>
            <div className="grid grid-cols-2 gap-1.5">
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

        {step === 3 && (
          <div className="space-y-4" data-testid="onboarding-step-location">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preferred locations (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. New York, San Francisco"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())}
                  data-testid="input-location"
                />
                <Button variant="outline" onClick={addLocation} data-testid="button-add-location">Add</Button>
              </div>
              {locations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {locations.map(loc => (
                    <Badge key={loc} variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {loc}
                      <button
                        onClick={() => setLocations(locations.filter(l => l !== loc))}
                        className="ml-1 text-muted-foreground"
                        data-testid={`button-remove-location-${loc}`}
                      >
                        x
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remote-only"
                checked={remoteOnly}
                onCheckedChange={(v) => setRemoteOnly(v === true)}
                data-testid="checkbox-remote-only"
              />
              <Label htmlFor="remote-only" className="text-sm cursor-pointer">
                I'm only interested in remote positions
              </Label>
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
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} data-testid="button-onboarding-back">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div>
            {step < totalSteps - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed} data-testid="button-onboarding-next">
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={completeMutation.isPending}
                data-testid="button-onboarding-finish"
              >
                {completeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Get Started
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
