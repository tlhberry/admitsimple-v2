import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import logoImg from "@assets/Untitled_1775863851436.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSent(true);
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
            <h2 className="text-xl font-bold text-foreground">Reset your password</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your email and we'll send you a reset link</p>
          </div>

          {sent ? (
            <div className="p-8 pt-6">
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <CheckCircle className="w-12 h-12 text-primary" />
                <p className="text-foreground font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  If <strong>{email}</strong> is registered, you'll receive a reset link shortly. It expires in 1 hour.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate("/login")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
                  placeholder="you@admitsimple.com"
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
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
