import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const { login, isLoggingIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ data: { username, password } });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-50">
      {/* Background Image/Pattern */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/login-bg.png`} 
          alt="Background" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-slate-800/80 backdrop-blur-[2px]" />
      </div>

      <Card className="w-[90%] max-w-md z-10 shadow-2xl shadow-black/20 border-0 rounded-2xl overflow-hidden">
        <div className="bg-primary p-6 text-center text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-inner border border-white/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">AdmitSimple</CardTitle>
            <CardDescription className="text-primary-foreground/80 mt-2 text-sm max-w-xs mx-auto">
              HIPAA-Conscious Admissions CRM for Treatment Centers
            </CardDescription>
          </div>
        </div>
        
        <CardContent className="p-8 bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-600 font-medium">Username</Label>
              <Input 
                id="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-lg"
                placeholder="Enter your username"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-slate-600 font-medium">Password</Label>
                <a href="#" className="text-xs text-primary font-medium hover:underline">Forgot?</a>
              </div>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-lg"
                placeholder="••••••••"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isLoggingIn ? "Authenticating..." : "Sign In Securely"}
            </Button>
            
            <p className="text-xs text-center text-slate-400 pt-4">
              Authorized personnel only. All access is logged and monitored.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
