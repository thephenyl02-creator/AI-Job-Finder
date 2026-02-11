import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLocation, useSearch, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { Loader2, ArrowRight, ArrowLeft, Mail, KeyRound, CheckCircle2, Briefcase, Scale, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { GradientOrb } from "@/components/animations";

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

type AuthView = "login" | "register" | "forgot" | "reset";

export default function Auth() {
  usePageTitle("Sign In");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [view, setView] = useState<AuthView>("login");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    const params = new URLSearchParams(search);
    const error = params.get("error");
    const token = params.get("token");
    if (error === "google_denied") {
      toast({ title: "Google sign-in was cancelled", variant: "destructive" });
    } else if (error === "google_failed") {
      toast({ title: "Google sign-in failed. Please try again.", variant: "destructive" });
    }
    if (token) {
      setResetToken(token);
      setView("reset");
    }
  }, [search, toast]);

  const rawReturnTo = new URLSearchParams(search).get("returnTo") || "/";
  const returnTo = rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") ? rawReturnTo : "/";

  useEffect(() => {
    if (isAuthenticated && view !== "reset") {
      setLocation(returnTo);
    }
  }, [isAuthenticated, view, setLocation, returnTo]);

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
      setLocation(returnTo);
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
    const googleUrl = returnTo && returnTo !== "/" 
      ? `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`
      : "/api/auth/google";
    window.location.href = googleUrl;
  };

  const forgotMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      return res.json();
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", data);
      return res.json();
    },
  });

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await forgotMutation.mutateAsync(forgotEmail);
      if (result.resetToken) {
        setResetToken(result.resetToken);
        setView("reset");
        toast({ title: "Email verified. Set your new password below." });
      } else {
        toast({ title: "If an account exists with that email, you'll be able to reset your password. Please try again or contact support." });
      }
    } catch (err: any) {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    try {
      await resetMutation.mutateAsync({ token: resetToken, newPassword });
      setNewPassword("");
      setConfirmPassword("");
      setResetToken("");
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

  const switchToView = (newView: AuthView) => {
    setView(newView);
    if (newView === "login" || newView === "register") {
      setMode(newView);
    }
  };

  if (view === "forgot") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-4 mb-8">
            <Logo className="h-8 w-8 text-foreground" />
            <div className="text-center">
              <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight" data-testid="text-forgot-title">
                Reset Your Password
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your email to verify your account and set a new password
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    data-testid="input-forgot-email"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={forgotMutation.isPending}
                  data-testid="button-forgot-submit"
                >
                  {forgotMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Continue
                </Button>
              </form>
              <Button
                variant="ghost"
                className="w-full gap-2"
                onClick={() => switchToView("login")}
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (view === "reset") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-4 mb-8">
            <Logo className="h-8 w-8 text-foreground" />
            <div className="text-center">
              <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight" data-testid="text-reset-title">
                Set New Password
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a strong password for your account
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              {resetMutation.isSuccess ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-foreground font-medium mb-2" data-testid="text-reset-success">
                    Password updated successfully
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    You can now sign in with your new password.
                  </p>
                  <Button onClick={() => { switchToView("login"); resetMutation.reset(); }} className="w-full" data-testid="button-go-to-login">
                    Sign In
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={resetMutation.isPending}
                    data-testid="button-reset-submit"
                  >
                    {resetMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <KeyRound className="h-4 w-4 mr-2" />
                    )}
                    Reset Password
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full gap-2"
                    onClick={() => switchToView("login")}
                    data-testid="button-reset-back-to-login"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Sign In
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const valueProps = [
    { icon: Briefcase, text: "Curated legal tech opportunities" },
    { icon: Scale, text: "Built for lawyers & law students" },
    { icon: TrendingUp, text: "Resume matching & career insights" },
  ];

  return (
    <div className="min-h-screen bg-background flex relative">
      <GradientOrb className="w-[500px] h-[500px] bg-primary -top-32 -left-32" />
      <GradientOrb className="w-[400px] h-[400px] bg-chart-2 bottom-0 right-0" />

      <div className="hidden lg:flex lg:flex-1 items-center justify-center p-12 relative">
        <div className="max-w-md animate-fade-in">
          <Logo className="h-10 w-10 text-foreground mb-8" />
          <h2 className="text-3xl font-serif font-medium text-foreground tracking-tight mb-3" data-testid="text-auth-hero">
            Your legal tech career starts here
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Join legal professionals who are discovering opportunities at the intersection of law and technology.
          </p>
          <div className="space-y-4">
            {valueProps.map((item, i) => (
              <div key={i} className={`flex items-center gap-3 animate-fade-in-up opacity-0 stagger-${i + 2}`}>
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-foreground/80">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative">
        <div className="w-full max-w-sm animate-scale-in">
          <div className="flex flex-col items-center gap-4 mb-8 lg:hidden">
            <Logo className="h-8 w-8 text-foreground" />
          </div>
          <div className="text-center mb-6">
            <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight" data-testid="text-auth-title">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login"
                ? "Sign in to access your legal tech career tools"
                : "Join thousands of legal professionals exploring tech careers"}
            </p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex gap-1">
                <Button
                  variant={mode === "login" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => { setMode("login"); setView("login"); setShowEmailForm(false); }}
                  className="flex-1"
                  data-testid="button-tab-login"
                >
                  Sign In
                </Button>
                <Button
                  variant={mode === "register" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => { setMode("register"); setView("register"); setShowEmailForm(false); }}
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => switchToView("forgot")}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          data-testid="link-forgot-password"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
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
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
