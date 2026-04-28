import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, User, Mail, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@assets/Untitled_1775863851436.png";

export default function Signup() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [form, setForm] = useState({
    facilityName: "",
    adminName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError(null);
  };

  const passwordChecks = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
  };
  const passwordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = form.password === form.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.facilityName.trim() || !form.adminName.trim() || !form.email.trim() || !form.password) {
      setError("All fields are required.");
      return;
    }
    if (!passwordValid) {
      setError("Password does not meet the requirements.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreedToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          facilityName: form.facilityName.trim(),
          adminName: form.adminName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed. Please try again.");
        return;
      }

      queryClient.setQueryData(["/api/auth/me"], data);
      toast({ title: "Welcome to AdmitSimple!", description: `Account created for ${data.name}.` });
      navigate("/");
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden py-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
      </div>

      <div className="w-[90%] max-w-lg z-10">
        <div className="flex justify-center mb-6">
          <img
            src={logoImg}
            alt="AdmitSimple"
            className="h-36 w-auto object-contain max-w-xs"
            style={{ mixBlendMode: "screen" }}
          />
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="px-8 pt-8 pb-2">
            <h2 className="text-xl font-bold text-foreground">Start your free trial</h2>
            <p className="text-sm text-muted-foreground mt-1">Set up your treatment center in 60 seconds. No credit card required.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-5">
            {/* Facility name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                Treatment Center Name
              </Label>
              <Input
                value={form.facilityName}
                onChange={set("facilityName")}
                placeholder="Sunrise Recovery Center"
                className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
                autoFocus
              />
            </div>

            {/* Admin name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <User className="w-3.5 h-3.5 text-primary" />
                Your Full Name
              </Label>
              <Input
                value={form.adminName}
                onChange={set("adminName")}
                placeholder="Jane Smith"
                className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Mail className="w-3.5 h-3.5 text-primary" />
                Work Email
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="jane@yourfacility.com"
                className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Lock className="w-3.5 h-3.5 text-primary" />
                Password
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={set("password")}
                placeholder="••••••••"
                className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
              />
              {form.password && (
                <div className="space-y-1 pt-1">
                  {[
                    { ok: passwordChecks.length, label: "At least 8 characters" },
                    { ok: passwordChecks.upper, label: "At least one uppercase letter" },
                    { ok: passwordChecks.number, label: "At least one number" },
                  ].map(({ ok, label }) => (
                    <div key={label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-400" : "text-muted-foreground"}`}>
                      <CheckCircle2 className={`w-3 h-3 ${ok ? "text-green-400" : "text-border"}`} />
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Lock className="w-3.5 h-3.5 text-primary" />
                Confirm Password
              </Label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                placeholder="••••••••"
                className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
              />
              {form.confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>

            {/* Terms agreement */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border text-primary accent-primary cursor-pointer flex-shrink-0"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I agree to the{" "}
                <a
                  href="https://admitsimple.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="https://admitsimple.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  Privacy Policy
                </a>
                , including the Business Associate Agreement governing protected health information.
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 mt-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isLoading ? "Creating your account..." : "Create Free Account"}
            </Button>

            <p className="text-xs text-center text-muted-foreground pt-1">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </p>

            <p className="text-xs text-center text-muted-foreground">
              HIPAA-compliant. All data is encrypted. SOC 2 certified infrastructure.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
