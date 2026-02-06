import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface UpgradePromptProps {
  feature: string;
  description: string;
}

export function UpgradePrompt({ feature, description }: UpgradePromptProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full" data-testid="card-upgrade-prompt">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-serif font-medium text-foreground mb-2" data-testid="text-upgrade-title">
            {feature}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto" data-testid="text-upgrade-description">
            {description}
          </p>
          <Link href="/pricing">
            <Button data-testid="button-upgrade-cta">
              Upgrade to Pro
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-3">
            Starting at $29/month. Cancel anytime.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
