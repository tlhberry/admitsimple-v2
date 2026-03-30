import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Plus, Loader2, ClipboardList, ChevronRight, Globe,
  AlertCircle, Zap, CheckCircle2, XCircle, UserCheck, Trash2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn, getStatusColor, formatDate } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { CreateInquiryForm } from "@/components/CreateInquiryForm";
import { useQuery } from "@tanstack/react-query";

// ── Tab definitions ──────────────────────────────────────────────
type TabKey = "active" | "new" | "needs_action" | "admitted" | "discharged" | "did_not_admit" | "all";

const TABS: { key: TabKey; label: string; icon: React.ReactNode; description: string }[] = [
  { key: "active",       label: "Active",         icon: <Zap className="w-3.5 h-3.5" />,         description: "New + in-progress leads" },
  { key: "new",          label: "New",             icon: <Plus className="w-3.5 h-3.5" />,         description: "Last 48 hours" },
  { key: "needs_action", label: "Needs Action",    icon: <AlertCircle className="w-3.5 h-3.5" />,  description: "No activity in 24h" },
  { key: "admitted",     label: "Admitted",        icon: <CheckCircle2 className="w-3.5 h-3.5" />, description: "Recently admitted" },
  { key: "discharged",   label: "Discharged",      icon: <Trash2 className="w-3.5 h-3.5" />,       description: "Completed clients" },
  { key: "did_not_admit",label: "Did Not Admit",   icon: <XCircle className="w-3.5 h-3.5" />,      description: "Lost / referred out" },
  { key: "all",          label: "All",             icon: <ClipboardList className="w-3.5 h-3.5" />,description: "Full database view" },
];

function useInquiriesFiltered(tab: TabKey, search: string) {
  return useQuery<any[]>({
    queryKey: ["/api/inquiries", tab, search],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("tab", tab);
      if (search) params.set("search", search);
      return fetch(`/api/inquiries?${params}`, { credentials: "include" }).then(r => r.json());
    },
    staleTime: 15000,
  });
}

// ── Helpers ───────────────────────────────────────────────────────
function groupByDay(items: any[]) {
  const groups: { label: string; items: any[] }[] = [];
  const map: Record<string, number> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const item of items) {
    const d = new Date(item.createdAt);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    if (map[label] === undefined) {
      map[label] = groups.length;
      groups.push({ label, items: [] });
    }
    groups[map[label]].items.push(item);
  }
  return groups;
}

// ── Component ─────────────────────────────────────────────────────
export default function InquiriesList() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data, isLoading } = useInquiriesFiltered(activeTab, search);

  const currentTab = TABS.find(t => t.key === activeTab)!;

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Inquiries</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Track and manage prospective patient leads.</p>
        </div>
        <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
          <SheetTrigger asChild>
            <Button className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 shrink-0">
              <Plus className="w-4 h-4" /> New Inquiry
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0 bg-card border-l border-border">
            <SheetHeader className="p-6 bg-muted border-b border-border sticky top-0 z-10">
              <SheetTitle className="text-xl text-foreground">Create New Inquiry</SheetTitle>
              <SheetDescription className="text-muted-foreground">Enter details manually or use AI to parse a document.</SheetDescription>
            </SheetHeader>
            <div className="p-6">
              <CreateInquiryForm onSuccess={() => setIsFormOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, INQ number, or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-10 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* ── Filter Tabs ── */}
      <div className="mb-5 -mx-1">
        {/* Mobile: horizontal scroll */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 px-1 scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-muted/60 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && data?.length === 0 && (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            {currentTab.icon}
          </div>
          <h3 className="text-lg font-semibold text-foreground">No {currentTab.label} inquiries</h3>
          <p className="text-muted-foreground mt-1 text-sm">{currentTab.description}</p>
          {activeTab === "active" && (
            <Button className="mt-4 rounded-xl" onClick={() => setIsFormOpen(true)}>Create Inquiry</Button>
          )}
        </div>
      )}

      {/* ── MOBILE: card list ── */}
      {!isLoading && (data?.length ?? 0) > 0 && (
        <div className="md:hidden flex flex-col gap-2">
          {groupByDay(data ?? []).flatMap(({ label, items }) => [
            <div key={`day-${label}`} className="flex items-center gap-3 px-1 pt-2 pb-0.5">
              <div className="h-px flex-1 bg-border/50" />
              <span className="text-[10px] font-semibold text-muted-foreground/55 uppercase tracking-widest whitespace-nowrap">{label}</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>,
            ...items.map((inq: any) => (
              <button
                key={inq.id}
                onClick={() => navigate(`/inquiries/${inq.id}`)}
                className="w-full text-left bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:border-primary/40 hover:bg-card/80 transition-all active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {inq.firstName?.charAt(0) ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-foreground text-sm truncate">{inq.firstName} {inq.lastName}</span>
                    {inq.priority === "High" && (
                      <span className="shrink-0 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />Urgent
                      </span>
                    )}
                  </div>
                  {inq.inquiryNumber && (
                    <span className="text-[10px] font-mono font-semibold text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-md">{inq.inquiryNumber}</span>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold border", getStatusColor(inq.status))}>{inq.status}</span>
                    {inq.levelOfCare && <span className="text-[11px] text-muted-foreground font-medium">{inq.levelOfCare}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-muted-foreground">{formatDate(inq.createdAt)}</div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 ml-auto" />
                </div>
              </button>
            )),
          ])}
        </div>
      )}

      {/* ── DESKTOP: table ── */}
      {!isLoading && (data?.length ?? 0) > 0 && (
        <div className="hidden md:block rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-5 py-3.5 font-semibold w-28">INQ #</th>
                <th className="px-5 py-3.5 font-semibold">Patient Name</th>
                <th className="px-5 py-3.5 font-semibold">Contact</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Level of Care</th>
                <th className="px-5 py-3.5 font-semibold">Referral Source</th>
                <th className="px-5 py-3.5 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {groupByDay(data ?? []).flatMap(({ label, items }) => [
                <tr key={`day-${label}`}>
                  <td colSpan={7} className="px-5 pt-4 pb-1.5 bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border/40" />
                      <span className="text-[10px] font-semibold text-muted-foreground/55 uppercase tracking-widest whitespace-nowrap">{label}</span>
                      <div className="h-px flex-1 bg-border/40" />
                    </div>
                  </td>
                </tr>,
                ...items.map((inq: any) => (
                  <tr
                    key={inq.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/inquiries/${inq.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      {inq.inquiryNumber ? (
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg">{inq.inquiryNumber}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground">{inq.firstName} {inq.lastName}</div>
                      {inq.priority === "High" && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Urgent
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-foreground">{inq.phone || "—"}</div>
                      <div className="text-xs text-muted-foreground">{inq.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", getStatusColor(inq.status))}>{inq.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-foreground font-medium">{inq.levelOfCare || "—"}</td>
                    <td className="px-5 py-3.5">
                      {inq.referralSource?.includes("Google") ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          <Globe className="w-3 h-3" />{inq.referralSource}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{inq.referralSource || "—"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(inq.createdAt)}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
