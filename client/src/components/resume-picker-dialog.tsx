import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Loader2, Star, PenLine } from "lucide-react";
import type { Resume } from "@shared/schema";

interface ResumePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  jobTitle?: string;
}

export function ResumePickerDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
}: ResumePickerDialogProps) {
  const [, setLocation] = useLocation();
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [autoRedirecting, setAutoRedirecting] = useState(false);
  const hasAutoRedirected = useRef(false);

  const { data: resumes = [], isLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      hasAutoRedirected.current = false;
      setAutoRedirecting(false);
    }
  }, [open]);

  const handleContinue = () => {
    if (!selectedResumeId) return;
    onOpenChange(false);
    setLocation(`/resume-editor/${selectedResumeId}?jobId=${jobId}`);
  };

  const handleUpload = () => {
    onOpenChange(false);
    setLocation(jobId ? `/resumes?returnTo=${encodeURIComponent(`/jobs/${jobId}`)}` : "/resumes");
  };

  useEffect(() => {
    if (resumes.length === 1 && open && !isLoading && !hasAutoRedirected.current) {
      hasAutoRedirected.current = true;
      setAutoRedirecting(true);
      const timer = setTimeout(() => {
        onOpenChange(false);
        setLocation(`/resume-editor/${resumes[0].id}?jobId=${jobId}`);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [resumes, open, isLoading, jobId, onOpenChange, setLocation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-resume-picker">
        <DialogHeader>
          <DialogTitle className="text-base" data-testid="heading-resume-picker">
            {autoRedirecting ? "Opening editor..." : "Choose a resume to tailor"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {autoRedirecting
              ? `Taking you to the editor for "${resumes[0]?.label || resumes[0]?.filename || "your resume"}"`
              : jobTitle
                ? `Select which resume to tailor for "${jobTitle}"`
                : "Select which resume you'd like to tailor for this role"}
          </DialogDescription>
        </DialogHeader>

        {isLoading || autoRedirecting ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            {autoRedirecting && (
              <p className="text-xs text-muted-foreground">Preparing your resume editor...</p>
            )}
          </div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              You haven't uploaded a resume yet. Upload one to get started.
            </p>
            <Button onClick={handleUpload} data-testid="button-upload-resume">
              <Upload className="w-4 h-4 mr-1.5" />
              Upload Resume
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup
              value={selectedResumeId}
              onValueChange={setSelectedResumeId}
              className="space-y-2"
            >
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedResumeId === String(resume.id)
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => setSelectedResumeId(String(resume.id))}
                  data-testid={`resume-option-${resume.id}`}
                >
                  <RadioGroupItem
                    value={String(resume.id)}
                    id={`resume-${resume.id}`}
                  />
                  <Label
                    htmlFor={`resume-${resume.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {resume.label || resume.filename || "Resume"}
                      </span>
                      {resume.isPrimary && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Star className="w-2.5 h-2.5 mr-0.5" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    {resume.filename && resume.label !== resume.filename && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {resume.filename}
                      </p>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUpload}
                data-testid="button-upload-new-resume"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload new
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!selectedResumeId}
                data-testid="button-continue-to-editor"
              >
                <PenLine className="w-3.5 h-3.5 mr-1" />
                Tailor Resume
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
