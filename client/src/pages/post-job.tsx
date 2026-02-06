import { Header } from "@/components/header";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Send, Briefcase, CheckCircle, XCircle, AlertCircle, Upload, FileText, Sparkles } from "lucide-react";
import { useState, useRef } from "react";

const postJobSchema = z.object({
  title: z.string().min(5, "Job title must be at least 5 characters"),
  company: z.string().min(2, "Company name is required"),
  companyWebsite: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  location: z.string().min(2, "Location is required"),
  isRemote: z.boolean().default(false),
  salaryRange: z.string().optional(),
  description: z.string().min(50, "Description must be at least 50 characters"),
  applyUrl: z.string().url("Please enter a valid apply URL"),
  contactEmail: z.string().email("Please enter a valid email address"),
});

type PostJobFormData = z.infer<typeof postJobSchema>;

export default function PostJob() {
  usePageTitle("Post a Job");
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [urlValidation, setUrlValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid';
    error?: string;
  }>({ status: 'idle' });
  const [isParsing, setIsParsing] = useState(false);
  const [parsedFileName, setParsedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PostJobFormData>({
    resolver: zodResolver(postJobSchema),
    defaultValues: {
      title: "",
      company: "",
      companyWebsite: "",
      location: "",
      isRemote: false,
      salaryRange: "",
      description: "",
      applyUrl: "",
      contactEmail: "",
    },
  });

  const validateUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/validate-url", { url });
      return response.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: PostJobFormData) => {
      const response = await apiRequest("POST", "/api/job-submissions", data);
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Job submitted!",
        description: "We'll review your listing and add it to our platform soon.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a PDF or Word document (.pdf, .docx)",
        variant: "destructive",
      });
      return;
    }

    setIsParsing(true);
    setParsedFileName(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-job-file", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to parse file");
      }

      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        if (d.title) form.setValue("title", d.title);
        if (d.company) form.setValue("company", d.company);
        if (d.location) form.setValue("location", d.location);
        if (d.isRemote) form.setValue("isRemote", d.isRemote);
        if (d.salaryRange) form.setValue("salaryRange", d.salaryRange);
        if (d.description) form.setValue("description", d.description);
        if (d.applyUrl) form.setValue("applyUrl", d.applyUrl);

        setParsedFileName(file.name);
        toast({
          title: "Job details extracted",
          description: "We've filled in the form from your file. Please review and complete any missing fields.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Could not parse file",
        description: error.message || "Please try a different file or fill in the details manually.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: PostJobFormData) => {
    setUrlValidation({ status: 'validating' });
    try {
      const result = await validateUrlMutation.mutateAsync(data.applyUrl);
      if (!result.valid) {
        setUrlValidation({ status: 'invalid', error: result.error || 'The apply URL appears to be broken or inaccessible' });
        toast({
          title: "Invalid Apply URL",
          description: "Please check that the apply URL is correct and accessible.",
          variant: "destructive",
        });
        return;
      }
      setUrlValidation({ status: 'valid' });
    } catch (error) {
      setUrlValidation({ status: 'invalid', error: 'Could not validate URL' });
      toast({
        title: "URL Validation Failed",
        description: "Could not verify the apply URL. Please check it's correct.",
        variant: "destructive",
      });
      return;
    }
    
    submitMutation.mutate(data);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <Card>
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-medium text-foreground mb-2">
                Thank you for your submission!
              </h2>
              <p className="text-muted-foreground mb-6">
                We'll review your job listing and add it to Legal Tech Careers within 24-48 hours.
              </p>
              <Button onClick={() => setSubmitted(false)} variant="outline" data-testid="button-submit-another">
                Submit Another Job
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-medium text-foreground mb-2 tracking-tight">
            Post a Job
          </h1>
          <p className="text-muted-foreground">
            Reach legal professionals exploring technology careers
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Have a job description file? Upload it to auto-fill the form.
              </div>
              <p className="text-xs text-muted-foreground max-w-md">
                Upload a PDF or Word document and we'll extract the job details automatically. You can review and edit everything before submitting.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="gap-2"
                data-testid="button-upload-job-file"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting job details...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Job Description
                  </>
                )}
              </Button>
              {parsedFileName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  Extracted from: {parsedFileName}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>
              All fields marked with * are required. Jobs are reviewed before publishing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Senior Legal Engineer" {...field} data-testid="input-job-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your company" {...field} data-testid="input-company" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyWebsite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} data-testid="input-website" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. San Francisco, CA" {...field} data-testid="input-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="salaryRange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary Range</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. $120K - $150K" {...field} data-testid="input-salary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isRemote"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-remote"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Remote position</FormLabel>
                        <FormDescription>This job can be done remotely</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the role, responsibilities, and requirements..."
                          className="min-h-[150px]"
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Include key responsibilities, requirements, and what makes this opportunity unique.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applyUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apply URL *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="https://careers.example.com/job/123" 
                            {...field} 
                            data-testid="input-apply-url"
                            onChange={(e) => {
                              field.onChange(e);
                              setUrlValidation({ status: 'idle' });
                            }}
                          />
                          {urlValidation.status === 'validating' && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          {urlValidation.status === 'valid' && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </div>
                          )}
                          {urlValidation.status === 'invalid' && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <XCircle className="h-4 w-4 text-destructive" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Direct link where candidates can apply for this position
                      </FormDescription>
                      {urlValidation.status === 'invalid' && urlValidation.error && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {urlValidation.error}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="hiring@example.com" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormDescription>
                        We'll notify you when your listing is live
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={submitMutation.isPending || validateUrlMutation.isPending}
                  data-testid="button-submit-job"
                >
                  {validateUrlMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Validating URL...
                    </>
                  ) : submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Job Listing
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
