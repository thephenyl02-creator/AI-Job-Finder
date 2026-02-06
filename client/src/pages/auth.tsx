import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { Loader2, ArrowRight, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const { login, register, isLoggingIn, isRegistering, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const { data: providers } = useQuery<{ google: boolean }>({
    queryKey: ["/api/auth/providers"],
    staleTime: 1000 * 60 * 30,
  });

  const isSubmitting = isLoggingIn || isRegistering;
  const googleAvailable = providers?.google === true;

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const error = params.get("error");
    if (error === "google_denied") {
      toast({ title: "Google sign-in was cancelled", variant: "destructive" });
    } else if (error === "google_failed") {
      toast({ title: "Google sign-in failed. Please try again.", variant: "destructive" });
    }
  }, [search, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        if (password.length < 8) {
          toast({ title: "Password must be at least 8 characters", variant: "destructive" });
          return;
        }
        await register({ email, password, firstName: firstName || undefined, lastName: lastName || undefined });
      }
      setLocation("/");
    } catch (err: any) {
      const message = err?.message || "Something went wrong";
      let displayMessage = message;
      try {
        const parsed = JSON.parse(message.replace(/^\d+:\s*/, ""));
        displayMessage = parsed.message || message;
      } catch {
        displayMessage = message;
      }
      toast({ title: displayMessage, variant: "destructive" });
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-8">
          <Logo className="h-8 w-8 text-foreground" />
          <div className="text-center">
            <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight" data-testid="text-auth-title">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login"
                ? "Sign in to access your legal tech career tools"
                : "Join thousands of legal professionals exploring tech careers"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex gap-1">
              <Button
                variant={mode === "login" ? "default" : "ghost"}
                size="sm"
                onClick={() => { setMode("login"); setShowEmailForm(false); }}
                className="flex-1"
                data-testid="button-tab-login"
              >
                Sign In
              </Button>
              <Button
                variant={mode === "register" ? "default" : "ghost"}
                size="sm"
                onClick={() => { setMode("register"); setShowEmailForm(false); }}
                className="flex-1"
                data-testid="button-tab-register"
              >
                Create Account
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {googleAvailable && (
              <>
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] gap-3 text-sm font-medium"
                  onClick={handleGoogleLogin}
                  data-testid="button-google-login"
                >
                  <GoogleIcon className="h-5 w-5" />
                  Continue with Google
                </Button>

                {!showEmailForm && (
                  <Button
                    variant="ghost"
                    className="w-full min-h-[44px] gap-3 text-sm font-medium text-muted-foreground"
                    onClick={() => setShowEmailForm(true)}
                    data-testid="button-show-email"
                  >
                    <Mail className="h-4 w-4" />
                    Continue with Email
                  </Button>
                )}

                {showEmailForm && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {(showEmailForm || !googleAvailable) && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Jane"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Smith"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    data-testid="input-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full min-h-[44px]"
                  disabled={isSubmitting}
                  data-testid="button-submit-auth"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  {mode === "login" ? "Sign In" : "Create Account"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
