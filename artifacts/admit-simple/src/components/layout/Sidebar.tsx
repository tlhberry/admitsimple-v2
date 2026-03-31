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
  Phone,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const isBdRole = user?.role === "bd";
  const hasAdmissions = user?.role === "admissions" || isAdmin;

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  // Live call count badge
  const { data: activeCalls = [] } = useQuery<any[]>({
    queryKey: ["/api/calls/active"],
    queryFn: () => fetch("/api/calls/active", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 10000,
    staleTime: 5000,
  });
  const liveCallCount = activeCalls.length;

  const navSections = [
    {
      label: "Admissions",
      items: [
        { icon: Home,          label: "Dashboard",  href: "/" },
        { icon: ClipboardList, label: "Inquiries",  href: "/inquiries" },
        { icon: Users,         label: "Patients",   href: "/patients" },
        { icon: GitBranch,     label: "Pipeline",   href: "/pipeline" },
        { icon: Phone,         label: "Active Calls", href: "/calls/active", badge: liveCallCount > 0 ? String(liveCallCount) : undefined, badgeColor: "rose" as const },
      ],
    },
    {
      label: "Business Development",
      items: [
        { icon: Building2,  label: "Referral Accounts", href: "/referral-accounts" },
        { icon: Activity,   label: "Activity Feed",     href: "/bd-activity-feed" },
        { icon: TrendingUp, label: "BD Reports",        href: "/bd-reports" },
      ],
    },
    {
      label: "Insights",
      items: [
        { icon: BarChart2,  label: "Reports",     href: "/reports" },
        { icon: TrendingUp, label: "Analytics",   href: "/analytics" },
        { icon: Handshake,  label: "Referrals",   href: "/referrals" },
        { icon: Brain,      label: "AI Insights", href: "/ai-insights" },
      ],
    },
    ...(isAdmin ? [{
      label: "System",
      items: [{ icon: Settings, label: "Settings", href: "/settings" }],
    }] : []),
  ];

  const mobileItems = [
    { icon: Home,          label: "Home",      href: "/" },
    { icon: ClipboardList, label: "Inquiries", href: "/inquiries" },
    { icon: GitBranch,     label: "Pipeline",  href: "/pipeline" },
    isBdRole
      ? { icon: Building2, label: "BD",    href: "/referral-accounts", badge: undefined, badgeColor: undefined }
      : { icon: Phone,     label: "Calls", href: "/calls/active", badge: liveCallCount > 0 ? String(liveCallCount) : undefined, badgeColor: "rose" as const },
    { icon: BarChart2, label: "Reports", href: "/reports", badge: undefined, badgeColor: undefined },
  ];

  const userInitials = user?.initials || user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen fixed left-0 top-0 text-sidebar-foreground shadow-xl z-20 transition-all">
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
          {navSections.map(section => (
            <div key={section.label}>
              <p className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest px-3 mb-1">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = isActive(item.href);
                  const anyItem = item as any;
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
                        <span className="text-sm flex-1">{item.label}</span>
                        {anyItem.badge && (
                          <span className={cn(
                            "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                            anyItem.badgeColor === "rose"
                              ? "bg-rose-500 text-white"
                              : "bg-primary text-white"
                          )}>
                            {anyItem.badge}
                          </span>
                        )}
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
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate capitalize">{user?.role === "bd" ? "BD Rep" : user?.role === "admissions" ? "Admissions Rep" : user?.role}</p>
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
          const anyItem = item as any;
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div className="flex flex-col items-center gap-1 p-2 cursor-pointer">
                <div className="relative">
                  <item.icon className={cn("w-5 h-5 transition-colors", active ? "text-primary" : "text-sidebar-foreground")} />
                  {anyItem.badge && (
                    <span className={cn(
                      "absolute -top-1.5 -right-2 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-bold rounded-full px-1",
                      anyItem.badgeColor === "rose" ? "bg-rose-500 text-white" : "bg-primary text-white"
                    )}>
                      {anyItem.badge}
                    </span>
                  )}
                </div>
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
