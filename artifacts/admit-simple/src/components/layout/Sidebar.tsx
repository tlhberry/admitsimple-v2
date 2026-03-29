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
import logoImg from "@assets/0C81D426-83A5-43FF-9228-B4A59CE7AF61_1774786596683.jpeg";

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
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border/40">
          <img
            src={logoImg}
            alt="AdmitSimple"
            className="h-8 w-auto object-contain"
          />
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="block">
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
                  isActive 
                    ? "bg-primary/15 text-primary font-medium border border-primary/20" 
                    : "hover:bg-sidebar-accent/60 hover:text-white"
                )}>
                  <item.icon className={cn(
                    "w-[18px] h-[18px] shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-sidebar-foreground group-hover:text-white"
                  )} />
                  <span className="text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border/40">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {user?.name.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground truncate capitalize">{user?.role}</p>
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex justify-around p-2 pb-safe z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        {[navItems[0], navItems[1], navItems[3], navItems[4], navItems[8]].map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div className="flex flex-col items-center gap-1 p-2 cursor-pointer">
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-sidebar-foreground")} />
                <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-primary" : "text-sidebar-foreground")}>
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
