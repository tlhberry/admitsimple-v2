import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Home, 
  ClipboardList, 
  Users, 
  GitBranch, 
  BarChart2, 
  TrendingUp, 
  Handshake, 
  Brain, 
  Settings,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: ClipboardList, label: "Inquiries", href: "/inquiries" },
  { icon: Users, label: "Patients", href: "/patients" },
  { icon: GitBranch, label: "Pipeline", href: "/pipeline" },
  { icon: BarChart2, label: "Reports", href: "/reports" },
  { icon: TrendingUp, label: "Analytics", href: "/analytics" },
  { icon: Handshake, label: "Referrals", href: "/referrals" },
  { icon: Brain, label: "AI Insights", href: "/ai-insights" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen fixed left-0 top-0 text-sidebar-foreground shadow-xl z-20 transition-all">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30">
            A
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">AdmitSimple</h1>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="block">
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-md" 
                    : "hover:bg-sidebar-accent/50 hover:text-white"
                )}>
                  <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-sidebar-foreground group-hover:text-white")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border/50 bg-sidebar-accent/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center text-white font-medium border border-sidebar-border">
              {user?.name.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground truncate">{user?.role}</p>
            </div>
            <button 
              onClick={() => logout()}
              className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground hover:text-white"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 pb-safe z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {[navItems[0], navItems[1], navItems[3], navItems[4], navItems[8]].map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div className="flex flex-col items-center gap-1 p-2 cursor-pointer">
                <item.icon className={cn("w-6 h-6 transition-colors", isActive ? "text-primary" : "text-slate-400")} />
                <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-primary" : "text-slate-400")}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
