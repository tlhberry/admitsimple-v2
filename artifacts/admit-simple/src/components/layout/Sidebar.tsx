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
  LogOut,
  Building2,
  Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import logoImg from "@assets/ChatGPT_Image_Mar_29,_2026,_08_28_12_AM_1774787305208.png";

const navSections = [
  {
    label: "Admissions",
    items: [
      { icon: Home, label: "Dashboard", href: "/" },
      { icon: ClipboardList, label: "Inquiries", href: "/inquiries" },
      { icon: Users, label: "Patients", href: "/patients" },
      { icon: GitBranch, label: "Pipeline", href: "/pipeline" },
    ],
  },
  {
    label: "Business Development",
    items: [
      { icon: Building2, label: "Referral Accounts", href: "/referral-accounts" },
      { icon: Activity, label: "Activity Feed", href: "/bd-activity-feed" },
      { icon: TrendingUp, label: "BD Reports", href: "/bd-reports" },
    ],
  },
  {
    label: "Insights",
    items: [
      { icon: BarChart2, label: "Reports", href: "/reports" },
      { icon: TrendingUp, label: "Analytics", href: "/analytics" },
      { icon: Handshake, label: "Referrals", href: "/referrals" },
      { icon: Brain, label: "AI Insights", href: "/ai-insights" },
    ],
  },
  {
    label: "System",
    items: [
      { icon: Settings, label: "Settings", href: "/settings" },
    ],
  },
];

// Flat list for mobile bottom bar
const mobileItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: ClipboardList, label: "Inquiries", href: "/inquiries" },
  { icon: GitBranch, label: "Pipeline", href: "/pipeline" },
  { icon: Building2, label: "BD", href: "/referral-accounts" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen fixed left-0 top-0 text-sidebar-foreground shadow-xl z-20 transition-all">
        {/* Logo */}
        <div className="px-3 py-2.5 border-b border-sidebar-border/40 flex items-center">
          <img
            src={logoImg}
            alt="AdmitSimple"
            className="w-full object-contain object-left"
            style={{ maxHeight: "52px", mixBlendMode: "screen" }}
          />
        </div>
        
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
          {navSections.map(section => (
            <div key={section.label}>
              <p className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest px-3 mb-1">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href} className="block">
                      <div className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
                        active
                          ? "bg-primary/15 text-primary font-medium border border-primary/20"
                          : "hover:bg-sidebar-accent/60 hover:text-white"
                      )}>
                        <item.icon className={cn(
                          "w-[18px] h-[18px] shrink-0 transition-colors",
                          active ? "text-primary" : "text-sidebar-foreground group-hover:text-white"
                        )} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
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
        {mobileItems.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div className="flex flex-col items-center gap-1 p-2 cursor-pointer">
                <item.icon className={cn("w-5 h-5 transition-colors", active ? "text-primary" : "text-sidebar-foreground")} />
                <span className={cn("text-[10px] font-medium transition-colors", active ? "text-primary" : "text-sidebar-foreground")}>
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
