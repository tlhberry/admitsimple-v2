import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import logoImg from "@assets/Untitled_1775863851436.png";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) setError("Invalid reset link. Please request a new one.");
    else setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
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
          <div className="px-8 pt-8 pb-2">
            <h2 className="text-xl font-bold text-foreground">Set new password</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose a strong password for your account</p>
          </div>

          {success ? (
            <div className="p-8 pt-6">
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <CheckCircle className="w-12 h-12 text-primary" />
                <p className="text-foreground font-medium">Password updated!</p>
                <p className="text-sm text-muted-foreground">Your password has been reset. You can now sign in.</p>
              </div>
              <Button
                className="w-full mt-4 h-11 font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => navigate("/login")}
              >
                Sign In
              </Button>
            </div>
          ) : token === null && error ? (
            <div className="p-8 pt-6">
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <XCircle className="w-12 h-12 text-destructive" />
                <p className="text-foreground font-medium">Invalid reset link</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate("/forgot-password")}
              >
                Request New Link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm font-medium text-foreground">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {loading ? "Updating..." : "Set New Password"}
              </Button>

              <p className="text-xs text-center text-muted-foreground pt-1">
                Minimum 8 characters required.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
