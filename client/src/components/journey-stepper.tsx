import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Check, FileText, Compass, Briefcase, Pencil, Send, ChevronRight } from "lucide-react";
import { Link } from "wouter";

type JourneyStep = "profile" | "path" | "jobs" | "tailor" | "apply";

interface JourneyState {
  profile: boolean;
  path: boolean;
  jobs: boolean;
  tailor: boolean;
  apply: boolean;
}

const STEPS: { key: JourneyStep; label: string; icon: typeof FileText }[] = [
  { key: "profile", label: "Profile", icon: FileText },
  { key: "path", label: "Path", icon: Compass },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "tailor", label: "Tailor", icon: Pencil },
  { key: "apply", label: "Apply", icon: Send },
];

const STEP_HINTS: Record<JourneyStep, { text: string; action?: string; link?: string }> = {
  profile: { text: "Upload your resume to get started", action: "Upload Resume", link: "/resumes" },
  path: { text: "Discover which career paths match your background", action: "Explore Paths" },
  jobs: { text: "Browse roles that match your profile" },
  tailor: { text: "Pick a job and tailor your resume for it" },
  apply: { text: "Ready? Click Apply on any job you like" },
};

interface JourneyStepperProps {
  currentStep?: JourneyStep;
  onStepClick?: (step: JourneyStep) => void;
}

export function JourneyStepper({ currentStep, onStepClick }: JourneyStepperProps) {
  const { isAuthenticated } = useAuth();

  const { data: journeyState } = useQuery<JourneyState>({
    queryKey: ["/api/journey-state"],
    enabled: isAuthenticated,
  });

  const completedSteps = new Set<JourneyStep>();
  if (journeyState?.profile) completedSteps.add("profile");
  if (journeyState?.path) completedSteps.add("path");
  if (journeyState?.jobs) completedSteps.add("jobs");
  if (journeyState?.tailor) completedSteps.add("tailor");
  if (journeyState?.apply) completedSteps.add("apply");

  let activeStep: JourneyStep = "profile";
  if (currentStep) {
    activeStep = currentStep;
  } else {
    if (!journeyState?.profile) activeStep = "profile";
    else if (!journeyState?.path) activeStep = "path";
    else if (!journeyState?.jobs) activeStep = "jobs";
    else if (!journeyState?.tailor) activeStep = "tailor";
    else if (!journeyState?.apply) activeStep = "apply";
    else activeStep = "apply";
  }

  const activeIndex = STEPS.findIndex((s) => s.key === activeStep);
  const nextIncomplete = STEPS.find((s) => !completedSteps.has(s.key));
  const hintStep = nextIncomplete?.key || activeStep;
  const hint = STEP_HINTS[hintStep];

  const handleStepClick = (step: JourneyStep) => {
    if (onStepClick) {
      onStepClick(step);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto py-2" data-testid="journey-stepper">
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const isCompleted = completedSteps.has(step.key);
          const isActive = step.key === activeStep;
          const isPast = i < activeIndex;
          const isClickable = !!onStepClick;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => handleStepClick(step.key)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-1 group transition-all ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                data-testid={`step-button-${step.key}`}
              >
                <div
                  className={`relative h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "bg-brand text-brand-foreground scale-100"
                      : isActive
                        ? "bg-brand text-brand-foreground ring-2 ring-brand/20 scale-105"
                        : "bg-muted text-muted-foreground/50 border border-foreground/10"
                  } ${isClickable && !isCompleted && !isActive ? "group-hover:border-brand/40 group-hover:text-brand/60 group-hover:scale-105" : ""}`}
                  data-testid={`step-dot-${step.key}`}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5 animate-in zoom-in-50 duration-300" />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5" />
                  )}
                </div>
                <span
                  className={`text-[10px] leading-tight transition-colors ${
                    isActive ? "text-foreground font-semibold" : isCompleted ? "text-brand font-medium" : "text-muted-foreground/60"
                  } ${isClickable && !isCompleted && !isActive ? "group-hover:text-brand/60" : ""}`}
                >
                  {step.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1.5 mt-[-12px] rounded-full transition-colors duration-500 ${
                    isCompleted || isPast ? "bg-brand" : "bg-foreground/8"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {isAuthenticated && hint && hintStep && !completedSteps.has("apply") && (
        <div className="mt-2.5 text-center" data-testid="journey-hint">
          <p className="text-xs text-muted-foreground">
            {hint.text}
            {hint.link && (
              <Link href={hint.link}>
                <span className="inline-flex items-center gap-0.5 ml-1.5 text-brand font-medium hover:underline cursor-pointer" data-testid="journey-hint-link">
                  {hint.action}
                  <ChevronRight className="h-3 w-3" />
                </span>
              </Link>
            )}
            {!hint.link && hint.action && (
              <button
                type="button"
                onClick={() => onStepClick?.(hintStep)}
                className="inline-flex items-center gap-0.5 ml-1.5 text-brand font-medium hover:underline"
                data-testid="journey-hint-action"
              >
                {hint.action}
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
