import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

type JourneyStep = "profile" | "path" | "jobs" | "tailor" | "apply";

const STEPS: { key: JourneyStep; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "path", label: "Path" },
  { key: "jobs", label: "Jobs" },
  { key: "tailor", label: "Tailor" },
  { key: "apply", label: "Apply" },
];

interface JourneyStepperProps {
  currentStep?: JourneyStep;
}

export function JourneyStepper({ currentStep }: JourneyStepperProps) {
  const { isAuthenticated } = useAuth();

  const { data: resumes } = useQuery<any[]>({
    queryKey: ["/api/resumes"],
    enabled: isAuthenticated,
  });

  const hasResume = resumes && resumes.length > 0;

  const completedSteps = new Set<JourneyStep>();
  if (isAuthenticated && hasResume) completedSteps.add("profile");

  const activeStep = currentStep || (hasResume ? "path" : "profile");
  const activeIndex = STEPS.findIndex((s) => s.key === activeStep);

  return (
    <div className="flex items-center gap-0 w-full max-w-md mx-auto py-2" data-testid="journey-stepper">
      {STEPS.map((step, i) => {
        const isCompleted = completedSteps.has(step.key) && i < activeIndex;
        const isActive = step.key === activeStep;
        const isPast = i < activeIndex;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`h-2.5 w-2.5 rounded-full border transition-colors ${
                  isCompleted || isPast
                    ? "bg-primary border-primary"
                    : isActive
                      ? "bg-primary border-primary ring-2 ring-primary/20"
                      : "bg-muted border-foreground/15"
                }`}
                data-testid={`step-dot-${step.key}`}
              >
                {isCompleted && (
                  <Check className="h-2 w-2 text-primary-foreground mx-auto mt-px" />
                )}
              </div>
              <span
                className={`text-[9px] leading-tight ${
                  isActive ? "text-foreground font-medium" : "text-muted-foreground/60"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-1 mt-[-10px] ${
                  isPast ? "bg-primary" : "bg-foreground/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
