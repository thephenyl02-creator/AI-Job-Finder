import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isSubmitting = isLoggingIn || isRegistering;

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
      setLocation("/jobs");
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
                onClick={() => setMode("login")}
                className="flex-1"
                data-testid="button-tab-login"
              >
                Sign In
              </Button>
              <Button
                variant={mode === "register" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode("register")}
                className="flex-1"
                data-testid="button-tab-register"
              >
                Create Account
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                className="w-full"
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
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
