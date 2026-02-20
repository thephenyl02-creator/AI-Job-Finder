import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  FileText,
  Upload,
  Loader2,
  Star,
  PenLine,
  CheckCircle2,
  ArrowLeft,
  CloudUpload,
} from "lucide-react";
import type { Resume } from "@shared/schema";

interface ResumePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  jobTitle?: string;
}

type DialogView = "pick" | "upload";

export function ResumePickerDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
}: ResumePickerDialogProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [autoRedirecting, setAutoRedirecting] = useState(false);
  const hasAutoRedirected = useRef(false);
  const [view, setView] = useState<DialogView>("pick");
  const [dragOver, setDragOver] = useState(false);
  const [uploadedResumeId, setUploadedResumeId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: resumes = [], isLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("label", file.name.replace(/\.[^/.]+$/, ""));
      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      return res.json() as Promise<{ id: number; filename: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      setUploadedResumeId(data.id);
      setAutoRedirecting(true);
      const timer = setTimeout(() => {
        onOpenChange(false);
        setLocation(`/resume-editor/${data.id}?jobId=${jobId}`);
      }, 1200);
      return () => clearTimeout(timer);
    },
  });

  useEffect(() => {
    if (!open) {
      hasAutoRedirected.current = false;
      setAutoRedirecting(false);
      setView("pick");
      setUploadedResumeId(null);
      setDragOver(false);
      uploadMutation.reset();
    }
  }, [open]);

  const handleContinue = () => {
    if (!selectedResumeId) return;
    onOpenChange(false);
    setLocation(`/resume-editor/${selectedResumeId}?jobId=${jobId}`);
  };

  const handleTailorUploaded = () => {
    if (!uploadedResumeId) return;
    onOpenChange(false);
    setLocation(`/resume-editor/${uploadedResumeId}?jobId=${jobId}`);
  };

  const validateAndUpload = useCallback(
    (file: File) => {
      const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document (.docx).",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB.",
          variant: "destructive",
        });
        return;
      }
      uploadMutation.mutate(file);
    },
    [uploadMutation, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndUpload(file);
    },
    [validateAndUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [validateAndUpload]
  );

  useEffect(() => {
    if (resumes.length === 1 && open && !isLoading && !hasAutoRedirected.current && view === "pick") {
      hasAutoRedirected.current = true;
      setAutoRedirecting(true);
      const timer = setTimeout(() => {
        onOpenChange(false);
        setLocation(`/resume-editor/${resumes[0].id}?jobId=${jobId}`);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [resumes, open, isLoading, jobId, onOpenChange, setLocation, view]);

  const showUploadByDefault = !isLoading && !autoRedirecting && resumes.length === 0;

  const dialogTitle = autoRedirecting
    ? "Opening editor..."
    : view === "upload" || showUploadByDefault
      ? "Upload your resume"
      : "Tailor your resume";

  const dialogDescription = autoRedirecting
    ? `Taking you to the editor for "${resumes[0]?.label || resumes[0]?.filename || "your resume"}"`
    : view === "upload" || showUploadByDefault
      ? jobTitle
        ? `Upload a resume to tailor for "${jobTitle}"`
        : "Upload a PDF or Word document to get started"
      : jobTitle
        ? `Pick a resume to tailor for "${jobTitle}"`
        : "Pick a resume to tailor for this role";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-resume-picker">
        <DialogHeader>
          <DialogTitle className="text-base" data-testid="heading-resume-picker">
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        {isLoading || autoRedirecting ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            {autoRedirecting && (
              <p className="text-xs text-muted-foreground">
                Preparing your resume editor...
              </p>
            )}
          </div>
        ) : view === "upload" || showUploadByDefault ? (
          <UploadView
            dragOver={dragOver}
            setDragOver={setDragOver}
            handleDrop={handleDrop}
            handleFileSelect={handleFileSelect}
            fileInputRef={fileInputRef}
            uploadMutation={uploadMutation}
            uploadedResumeId={uploadedResumeId}
            handleTailorUploaded={handleTailorUploaded}
            showBackButton={resumes.length > 0}
            onBack={() => setView("pick")}
          />
        ) : (
          <PickView
            resumes={resumes}
            selectedResumeId={selectedResumeId}
            setSelectedResumeId={setSelectedResumeId}
            handleContinue={handleContinue}
            onUploadNew={() => setView("upload")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function UploadView({
  dragOver,
  setDragOver,
  handleDrop,
  handleFileSelect,
  fileInputRef,
  uploadMutation,
  uploadedResumeId,
  handleTailorUploaded,
  showBackButton,
  onBack,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  uploadMutation: any;
  uploadedResumeId: number | null;
  handleTailorUploaded: () => void;
  showBackButton: boolean;
  onBack: () => void;
}) {
  if (uploadMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">
          Processing your resume...
        </p>
        <p className="text-xs text-muted-foreground">
          Parsing content and extracting details
        </p>
      </div>
    );
  }

  if (uploadedResumeId) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">
            Resume uploaded successfully
          </p>
          <p className="text-xs text-muted-foreground">
            Opening the tailoring editor...
          </p>
        </div>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (uploadMutation.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">
            Upload failed
          </p>
          <p className="text-xs text-muted-foreground">
            {(uploadMutation.error as Error)?.message || "Something went wrong. Please try again."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => uploadMutation.reset()}
          data-testid="button-retry-upload"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/40"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="dropzone-upload"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-file-upload"
        />
        <CloudUpload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          {dragOver ? "Drop your resume here" : "Drag and drop your resume"}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          or click to browse
        </p>
        <Badge variant="secondary" className="text-[10px]">
          PDF or DOCX, up to 5MB
        </Badge>
      </div>

      {showBackButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="w-full"
          data-testid="button-back-to-picker"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Use an existing resume instead
        </Button>
      )}
    </div>
  );
}

function PickView({
  resumes,
  selectedResumeId,
  setSelectedResumeId,
  handleContinue,
  onUploadNew,
}: {
  resumes: Resume[];
  selectedResumeId: string;
  setSelectedResumeId: (id: string) => void;
  handleContinue: () => void;
  onUploadNew: () => void;
}) {
  return (
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
          onClick={onUploadNew}
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
  );
}
