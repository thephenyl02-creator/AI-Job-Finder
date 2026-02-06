import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { JOB_TAXONOMY } from "@shared/schema";
import type { JobAlert } from "@shared/schema";
import {
  Bell,
  Plus,
  Trash2,
  Loader2,
  Pause,
  Play,
  X,
} from "lucide-react";

const SENIORITY_OPTIONS = ["Entry", "Mid", "Senior", "Lead", "Director", "VP"];
const CATEGORY_NAMES = Object.keys(JOB_TAXONOMY);

function CreateAlertForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [selectedSeniority, setSelectedSeniority] = useState<string[]>([]);
  const [isRemoteOnly, setIsRemoteOnly] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/alerts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alert created", description: "You'll be notified when matching jobs appear." });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create alert", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name required", description: "Give your alert a name.", variant: "destructive" });
      return;
    }
    const keywords = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    createMutation.mutate({
      name: name.trim(),
      categories: selectedCategories.length > 0 ? selectedCategories : null,
      keywords: keywords.length > 0 ? keywords : null,
      seniorityLevels: selectedSeniority.length > 0 ? selectedSeniority : null,
      isRemoteOnly,
      isActive: true,
    });
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleSeniority = (level: string) => {
    setSelectedSeniority((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-medium">New Job Alert</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-alert-form">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Choose what kind of jobs you want to be notified about.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="alert-name">Alert Name *</Label>
            <Input
              id="alert-name"
              placeholder='e.g. "AI roles at senior level"'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              data-testid="input-alert-name"
            />
          </div>

          <div>
            <Label className="mb-2 block">Categories</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Leave empty to match all categories.
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_NAMES.map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCategories.includes(cat) ? "default" : "outline"}
                  className="cursor-pointer toggle-elevate"
                  onClick={() => toggleCategory(cat)}
                  data-testid={`badge-category-${cat.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {(JOB_TAXONOMY as any)[cat]?.shortName || cat}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="alert-keywords">Keywords</Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              Comma-separated. Matches job title, description, and skills.
            </p>
            <Input
              id="alert-keywords"
              placeholder="e.g. AI, machine learning, Python"
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              data-testid="input-alert-keywords"
            />
          </div>

          <div>
            <Label className="mb-2 block">Seniority Levels</Label>
            <div className="flex flex-wrap gap-2">
              {SENIORITY_OPTIONS.map((level) => (
                <Badge
                  key={level}
                  variant={selectedSeniority.includes(level) ? "default" : "outline"}
                  className="cursor-pointer toggle-elevate"
                  onClick={() => toggleSeniority(level)}
                  data-testid={`badge-seniority-${level.toLowerCase()}`}
                >
                  {level}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="remote-only"
              checked={isRemoteOnly}
              onCheckedChange={(checked) => setIsRemoteOnly(!!checked)}
              data-testid="checkbox-remote-only"
            />
            <Label htmlFor="remote-only" className="text-sm cursor-pointer">
              Remote positions only
            </Label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-alert">
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Create Alert
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} data-testid="button-cancel-alert">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AlertCard({ alert }: { alert: JobAlert }) {
  const { toast } = useToast();

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/alerts/${alert.id}`, {
        isActive: !alert.isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: alert.isActive ? "Alert paused" : "Alert resumed",
        description: alert.isActive
          ? "You won't receive notifications for this alert."
          : "You'll start receiving notifications again.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/alerts/${alert.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alert deleted" });
    },
  });

  return (
    <Card className={!alert.isActive ? "opacity-60" : ""} data-testid={`card-alert-${alert.id}`}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-sm font-medium text-foreground" data-testid={`text-alert-name-${alert.id}`}>
                {alert.name}
              </h3>
              {!alert.isActive && (
                <Badge variant="secondary" className="text-xs">Paused</Badge>
              )}
            </div>

            <div className="space-y-1.5">
              {alert.categories && alert.categories.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">Categories:</span>
                  {alert.categories.map((cat) => (
                    <Badge key={cat} variant="outline" className="text-xs py-0 px-1.5">
                      {(JOB_TAXONOMY as any)[cat]?.shortName || cat}
                    </Badge>
                  ))}
                </div>
              )}

              {alert.keywords && alert.keywords.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">Keywords:</span>
                  {alert.keywords.map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs py-0 px-1.5">
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}

              {alert.seniorityLevels && alert.seniorityLevels.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">Seniority:</span>
                  {alert.seniorityLevels.map((level) => (
                    <Badge key={level} variant="outline" className="text-xs py-0 px-1.5">
                      {level}
                    </Badge>
                  ))}
                </div>
              )}

              {alert.isRemoteOnly && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Remote only</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              data-testid={`button-toggle-alert-${alert.id}`}
            >
              {alert.isActive ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-alert-${alert.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Alerts() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const { data: alerts = [], isLoading } = useQuery<JobAlert[]>({
    queryKey: ["/api/alerts"],
    enabled: isAuthenticated,
  });

  if (authLoading) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight mb-1" data-testid="text-alerts-title">
              Job Alerts
            </h1>
            <p className="text-muted-foreground text-sm">
              Get notified when new jobs matching your interests are posted.
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} data-testid="button-new-alert">
              <Plus className="h-4 w-4 mr-2" />
              New Alert
            </Button>
          )}
        </div>

        {showForm && (
          <div className="mb-6">
            <CreateAlertForm onClose={() => setShowForm(false)} />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-14 h-14 bg-muted/60 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-medium text-foreground mb-2" data-testid="text-no-alerts">
                No alerts yet
              </h2>
              <p className="text-muted-foreground text-sm mb-5 max-w-sm mx-auto">
                Create an alert to get notified when jobs matching your criteria are posted to the platform.
              </p>
              {!showForm && (
                <Button onClick={() => setShowForm(true)} data-testid="button-create-first-alert">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Alert
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3" data-testid="section-alerts-list">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
