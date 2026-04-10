import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import logoImg from "@assets/Untitled_design_1775863216400.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoggingIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ data: { username: username.trim().toLowerCase(), password } });
    } catch {
      // Error is handled by the mutation's onError toast — suppress unhandled rejection
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
      </div>

      <div className="w-[90%] max-w-md z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={logoImg}
            alt="AdmitSimple"
            className="h-20 w-auto object-contain max-w-xs"
            style={{ mixBlendMode: "screen" }}
          />
        </div>

        {/* Login form card */}
        <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="px-8 pt-8 pb-2">
            <h2 className="text-xl font-bold text-foreground">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground mt-1">HIPAA-Compliant Admissions CRM</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-5">
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
                <span className="text-xs text-muted-foreground">Contact your administrator to reset</span>
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
              disabled={isLoggingIn}
              className="w-full h-11 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 mt-2"
            >
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isLoggingIn ? "Authenticating..." : "Sign In Securely"}
            </Button>

            <p className="text-xs text-center text-muted-foreground pt-2">
              Authorized personnel only. All access is logged and monitored.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
