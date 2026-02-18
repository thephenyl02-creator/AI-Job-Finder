import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import {
  ArrowLeft, Upload, FileText, Eye, Save, Send, Loader2,
  CheckCircle, XCircle, AlertTriangle, Plus, Trash2,
} from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { apiRequest, queryClient, invalidateJobRelatedQueries } from "@/lib/queryClient";

interface NormalizedData {
  title: string;
  company: string;
  location: string;
  summary: string;
  responsibilities: string[];
  minimumQualifications: string[];
  preferredQualifications: string[];
  coreSkills: string[];
  compensation: string;
  originalUrl: string;
  originalDescription: string;
  roleCategory: string;
  seniorityLevel: string;
}

interface QAResult {
  qaStatus: "passed" | "needs_review" | "failed";
  errors: { code: string; field: string; message: string }[];
  warnings: { code: string; field: string; message: string }[];
  lawyerFirstScore: number;
  excludeReason: string | null;
}

function EditableList({
  label,
  items,
  onChange,
  testId,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  testId: string;
}) {
  const [newItem, setNewItem] = useState("");

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-1" data-testid={testId}>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const updated = [...items];
                updated[i] = e.target.value;
                onChange(updated);
              }}
              className="flex-1"
              data-testid={`${testId}-item-${i}`}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              data-testid={`${testId}-remove-${i}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={`Add ${label.toLowerCase()}...`}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newItem.trim()) {
              onChange([...items, newItem.trim()]);
              setNewItem("");
            }
          }}
          data-testid={`${testId}-new-input`}
        />
        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            if (newItem.trim()) {
              onChange([...items, newItem.trim()]);
              setNewItem("");
            }
          }}
          data-testid={`${testId}-add`}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function QAStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "passed":
      return (
        <Badge variant="default" className="bg-emerald-600" data-testid="badge-qa-passed">
          <CheckCircle className="w-3 h-3 mr-1" />Passed
        </Badge>
      );
    case "needs_review":
      return (
        <Badge variant="default" className="bg-amber-600" data-testid="badge-qa-review">
          <AlertTriangle className="w-3 h-3 mr-1" />Needs Review
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" data-testid="badge-qa-failed">
          <XCircle className="w-3 h-3 mr-1" />Failed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function AdminImport() {
  usePageTitle("Import Jobs");
  const { toast } = useToast();
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<"import" | "review">("import");
  const [rawText, setRawText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [normalized, setNormalized] = useState<NormalizedData | null>(null);
  const [qaResult, setQaResult] = useState<QAResult | null>(null);

  const normalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/jobs/normalize", {
        title: "",
        company: "",
        location: "",
        originalUrl: jobUrl.trim() || undefined,
        originalDescription: rawText.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setNormalized(data.normalized);
      setQaResult(data.qa);
      setStep("review");
      toast({ title: "Extraction complete", description: "Review and edit the fields below." });
    },
    onError: (err: any) => {
      toast({ title: "Extraction failed", description: err.message, variant: "destructive" });
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!normalized) throw new Error("No data");
      const res = await apiRequest("POST", "/api/admin/jobs/create-draft", {
        title: normalized.title,
        company: normalized.company,
        location: normalized.location,
        summary: normalized.summary,
        responsibilities: normalized.responsibilities,
        minimumQualifications: normalized.minimumQualifications,
        preferredQualifications: normalized.preferredQualifications,
        coreSkills: normalized.coreSkills,
        compensation: normalized.compensation,
        originalUrl: normalized.originalUrl,
        originalDescription: normalized.originalDescription,
        roleCategory: normalized.roleCategory,
        seniorityLevel: normalized.seniorityLevel,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Draft saved", description: `Job ID: ${data.jobId}` });
      invalidateJobRelatedQueries();
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!normalized) throw new Error("No data");
      const draftRes = await apiRequest("POST", "/api/admin/jobs/create-draft", {
        title: normalized.title,
        company: normalized.company,
        location: normalized.location,
        summary: normalized.summary,
        responsibilities: normalized.responsibilities,
        minimumQualifications: normalized.minimumQualifications,
        preferredQualifications: normalized.preferredQualifications,
        coreSkills: normalized.coreSkills,
        compensation: normalized.compensation,
        originalUrl: normalized.originalUrl,
        originalDescription: normalized.originalDescription,
        roleCategory: normalized.roleCategory,
        seniorityLevel: normalized.seniorityLevel,
      });
      const draft = await draftRes.json();
      if (!draft.jobId) throw new Error("Failed to create draft");

      const pubRes = await apiRequest("POST", `/api/admin/jobs/${draft.jobId}/qa-publish`, {
        forceOverride: false,
      });
      return pubRes.json();
    },
    onSuccess: () => {
      toast({ title: "Job published", description: "The job is now visible to users." });
      setStep("import");
      setRawText("");
      setJobUrl("");
      setNormalized(null);
      setQaResult(null);
      invalidateJobRelatedQueries();
    },
    onError: (err: any) => {
      toast({ title: "Publish failed", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading) return null;
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold" data-testid="text-admin-required">Access Denied</h2>
              <p className="text-muted-foreground">Admin access required.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Import Jobs" />
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">

      {step === "import" && (
        <Card data-testid="card-import-step">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Step 1: Paste Job Description or URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job-url">Job URL (optional)</Label>
              <Input
                id="job-url"
                placeholder="https://boards.greenhouse.io/company/jobs/12345"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                data-testid="input-job-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="raw-text">Raw Job Description</Label>
              <Textarea
                id="raw-text"
                placeholder="Paste the full job description here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="min-h-[200px]"
                data-testid="input-raw-description"
              />
            </div>
            <Button
              onClick={() => normalizeMutation.mutate()}
              disabled={normalizeMutation.isPending || (!rawText.trim() && !jobUrl.trim())}
              data-testid="button-extract-preview"
            >
              {normalizeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Extract & Preview
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "review" && normalized && (
        <>
          {qaResult && (
            <Card data-testid="card-qa-status">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <QAStatusBadge status={qaResult.qaStatus} />
                    <span className="text-sm text-muted-foreground">
                      Lawyer relevance: {qaResult.lawyerFirstScore}/100
                    </span>
                  </div>
                  {qaResult.excludeReason && (
                    <span className="text-sm text-destructive">{qaResult.excludeReason}</span>
                  )}
                </div>

                {qaResult.errors.length > 0 && (
                  <div className="mt-3 space-y-1" data-testid="list-qa-errors">
                    {qaResult.errors.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span><strong>{e.field}:</strong> {e.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {qaResult.warnings.length > 0 && (
                  <div className="mt-2 space-y-1" data-testid="list-qa-warnings">
                    {qaResult.warnings.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span><strong>{w.field}:</strong> {w.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-review-step">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Step 2: Review & Edit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={normalized.title}
                    onChange={(e) => setNormalized({ ...normalized, title: e.target.value })}
                    data-testid="input-edit-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-company">Company *</Label>
                  <Input
                    id="edit-company"
                    value={normalized.company}
                    onChange={(e) => setNormalized({ ...normalized, company: e.target.value })}
                    data-testid="input-edit-company"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={normalized.location}
                    onChange={(e) => setNormalized({ ...normalized, location: e.target.value })}
                    data-testid="input-edit-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Role Category</Label>
                  <Input
                    id="edit-category"
                    value={normalized.roleCategory}
                    onChange={(e) => setNormalized({ ...normalized, roleCategory: e.target.value })}
                    data-testid="input-edit-category"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-seniority">Seniority</Label>
                  <Input
                    id="edit-seniority"
                    value={normalized.seniorityLevel}
                    onChange={(e) => setNormalized({ ...normalized, seniorityLevel: e.target.value })}
                    data-testid="input-edit-seniority"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-url">Apply URL</Label>
                  <Input
                    id="edit-url"
                    value={normalized.originalUrl}
                    onChange={(e) => setNormalized({ ...normalized, originalUrl: e.target.value })}
                    data-testid="input-edit-url"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-summary">Summary *</Label>
                <Textarea
                  id="edit-summary"
                  value={normalized.summary}
                  onChange={(e) => setNormalized({ ...normalized, summary: e.target.value })}
                  className="min-h-[80px]"
                  data-testid="input-edit-summary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-compensation">Compensation</Label>
                <Input
                  id="edit-compensation"
                  value={normalized.compensation}
                  onChange={(e) => setNormalized({ ...normalized, compensation: e.target.value })}
                  data-testid="input-edit-compensation"
                />
              </div>

              <EditableList
                label="Core Skills *"
                items={normalized.coreSkills}
                onChange={(items) => setNormalized({ ...normalized, coreSkills: items })}
                testId="list-core-skills"
              />

              <EditableList
                label="Minimum Qualifications"
                items={normalized.minimumQualifications}
                onChange={(items) => setNormalized({ ...normalized, minimumQualifications: items })}
                testId="list-min-quals"
              />

              <EditableList
                label="Preferred Qualifications"
                items={normalized.preferredQualifications}
                onChange={(items) => setNormalized({ ...normalized, preferredQualifications: items })}
                testId="list-pref-quals"
              />

              <EditableList
                label="Responsibilities"
                items={normalized.responsibilities}
                onChange={(items) => setNormalized({ ...normalized, responsibilities: items })}
                testId="list-responsibilities"
              />

              <div className="flex gap-3 flex-wrap pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("import");
                    setNormalized(null);
                    setQaResult(null);
                  }}
                  data-testid="button-back-import"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => saveDraftMutation.mutate()}
                  disabled={saveDraftMutation.isPending}
                  data-testid="button-save-draft"
                >
                  {saveDraftMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Draft
                </Button>
                <Button
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                  data-testid="button-publish"
                >
                  {publishMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Publish
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </div>
  );
}
