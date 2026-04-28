import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@assets/Untitled_1775863851436.png";

type Step = "credentials" | "mfa";

export default function Login() {
  const [step, setStep] = useState<Step>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Login failed", description: data.error || "Invalid username or password", variant: "destructive" });
        return;
      }
      if (data.mfaRequired) {
        setStep("mfa");
        return;
      }
      queryClient.setQueryData(["/api/auth/me"], data);
      navigate("/");
      toast({ title: "Welcome back!", description: `Logged in as ${data.name}` });
    } catch {
      toast({ title: "Login failed", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: totpCode.replace(/\s/g, "") }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Verification failed", description: data.error || "Invalid code", variant: "destructive" });
        setTotpCode("");
        return;
      }
      queryClient.setQueryData(["/api/auth/me"], data);
      navigate("/");
      toast({ title: "Welcome back!", description: `Logged in as ${data.name}` });
    } catch {
      toast({ title: "Verification failed", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
      </div>

      <div className="w-[90%] max-w-md z-10">
        <div className="flex justify-center mb-8">
          <img
            src={logoImg}
            alt="AdmitSimple"
            className="h-48 w-auto object-contain max-w-sm"
            style={{ mixBlendMode: "screen" }}
          />
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {step === "credentials" ? (
            <>
              <div className="px-8 pt-8 pb-2">
                <h2 className="text-xl font-bold text-foreground">Sign in to your account</h2>
                <p className="text-sm text-muted-foreground mt-1">HIPAA-Compliant Admissions CRM</p>
              </div>
              <form onSubmit={handleLogin} className="p-8 pt-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-foreground">Username or Email</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
                    placeholder="Username or email address"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 mt-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  {isLoading ? "Authenticating..." : "Sign In Securely"}
                </Button>
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => navigate("/signup")} className="text-primary hover:underline font-medium">
                    Sign up free
                  </button>
                </p>
                <p className="text-xs text-center text-muted-foreground">
                  Authorized personnel only. All access is logged and monitored.
                </p>
              </form>
            </>
          ) : (
            <>
              <div className="px-8 pt-8 pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Two-factor verification</h2>
                    <p className="text-sm text-muted-foreground">Enter the code from your authenticator app</p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleMfaConfirm} className="p-8 pt-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="totp" className="text-sm font-medium text-foreground">6-digit code</Label>
                  <Input
                    id="totp"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    className="h-14 bg-muted border-border text-foreground text-3xl tracking-[0.4em] text-center font-mono focus:border-primary transition-colors"
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || totpCode.length !== 6}
                  className="w-full h-11 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  {isLoading ? "Verifying..." : "Verify"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setTotpCode(""); }}
                  className="w-full text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
