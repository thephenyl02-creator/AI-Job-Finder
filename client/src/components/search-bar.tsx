import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Loader2, Upload, FileText, X, CheckCircle2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ResumeExtractedData } from "@shared/schema";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

const exampleSearches = [
  "Product manager, 5-7 years, remote, $150K+",
  "Legal engineer with 3+ years",
  "Senior AI researcher in legal tech",
  "Entry-level legal operations",
];

export function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"text" | "resume">("text");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedResume, setUploadedResume] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<ResumeExtractedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingResume();
  }, []);

  const checkExistingResume = async () => {
    try {
      const response = await fetch("/api/resume");
      if (response.ok) {
        const data = await response.json();
        if (data.hasResume) {
          setUploadedResume(data.filename);
          setResumeData(data.extractedData);
        }
      }
    } catch (error) {
      console.error("Error checking resume:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setSearchMode("resume");

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + 15;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        clearInterval(progressInterval);
        setUploadProgress(100);
        setUploadedResume(file.name);
        setResumeData(data.parsedData);
        setQuery(data.searchQuery);

        toast({
          title: "Resume uploaded",
          description: "We've analyzed your resume and generated a search query.",
        });

        setTimeout(() => {
          onSearch(data.searchQuery);
        }, 500);
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const switchMode = (mode: "text" | "resume") => {
    setSearchMode(mode);
    if (mode === "resume" && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeResume = async () => {
    try {
      await fetch("/api/resume", { method: "DELETE" });
      setUploadedResume(null);
      setResumeData(null);
      setQuery("");
      setSearchMode("text");
      toast({
        title: "Resume removed",
        description: "You can upload a new resume or search with text.",
      });
    } catch (error) {
      console.error("Error removing resume:", error);
    }
  };

  const fillExample = (example: string) => {
    setQuery(example);
    setSearchMode("text");
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex justify-center gap-2 mb-6">
        <Button
          variant={searchMode === "text" ? "default" : "outline"}
          size="sm"
          onClick={() => switchMode("text")}
          className="rounded-full gap-2"
          data-testid="button-mode-text"
        >
          <Pencil className="h-4 w-4" />
          Write prompt
        </Button>
        <Button
          variant={searchMode === "resume" ? "default" : "outline"}
          size="sm"
          onClick={() => switchMode("resume")}
          className="rounded-full gap-2"
          disabled={isUploading}
          data-testid="button-mode-resume"
        >
          <Upload className="h-4 w-4" />
          Upload resume
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          onChange={handleFileUpload}
          className="hidden"
          data-testid="input-file-resume"
        />
      </div>

      {isUploading && (
        <div className="mb-6 p-4 bg-card border border-card-border rounded-xl" data-testid="upload-progress">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-foreground">Analyzing your resume...</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {uploadProgress < 30 && "Extracting text..."}
            {uploadProgress >= 30 && uploadProgress < 60 && "Reading experience..."}
            {uploadProgress >= 60 && uploadProgress < 90 && "Identifying skills..."}
            {uploadProgress >= 90 && "Generating search..."}
          </p>
        </div>
      )}

      {uploadedResume && !isUploading && (
        <div className="mb-6 p-4 bg-accent/30 border border-accent rounded-xl" data-testid="resume-status">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{uploadedResume}</span>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                {resumeData && (
                  <div className="flex flex-wrap gap-1.5">
                    {resumeData.preferredRoles?.slice(0, 2).map((role, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                    {resumeData.totalYearsExperience && (
                      <Badge variant="secondary" className="text-xs">
                        {resumeData.totalYearsExperience} years exp
                      </Badge>
                    )}
                    {resumeData.isOpenToRemote && (
                      <Badge variant="secondary" className="text-xs">
                        Open to remote
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeResume}
              className="flex-shrink-0"
              data-testid="button-remove-resume"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-card border border-card-border rounded-xl shadow-sm p-5 transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground mb-1">
                {uploadedResume ? "Search based on your resume" : "AI-Powered Search"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {uploadedResume
                  ? "Edit the query below or let AI match you with jobs"
                  : "Describe your ideal role in natural language"}
              </p>
            </div>
          </div>

          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              uploadedResume
                ? "AI-generated query based on your resume. Feel free to edit..."
                : "Example: I'm looking for a product manager role with 5-7 years experience, remote work, at a Series A or B startup in legal tech, with a salary around $150K-180K."
            }
            className="min-h-[100px] resize-none text-base border-border focus:border-primary focus:ring-primary/20"
            disabled={isLoading || isUploading}
            data-testid="input-search"
          />

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">{query.length} / 500</span>

            <Button
              type="submit"
              disabled={isLoading || isUploading || !query.trim()}
              className="gap-2"
              data-testid="button-search"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {!uploadedResume && (
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground mb-3">Try searching:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleSearches.map((example, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => fillExample(example)}
                className="rounded-full text-xs transition-all duration-200"
                data-testid={`button-example-${idx}`}
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
