import { type ReactNode } from "react";
import { Layout } from "@/components/layout/Layout";
import { Loader2, Plus, Phone, MessageSquare, ChevronRight, UserPlus, Zap, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CreateInquiryForm } from "@/components/CreateInquiryForm";
import { useAuth } from "@/hooks/use-auth";

type Timeframe = "week" | "month" | "year" | "custom";

// ── helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatApptDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusLabel(status: string): string {
  const map: Record<string,string> = {
    new: "New",
    initial_contact: "Contacted",
    insurance_verification: "VOB",
    pre_assessment: "Pre-Assess",
    scheduled_to_admit: "Scheduled",
    admitted: "Admitted",
  };
  return map[status] ?? status;
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({
  title, badge, onClick, accent = false, children,
}: { title: string; badge?: string | number; onClick?: () => void; accent?: boolean; children: ReactNode }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "px-4 py-4 border-b border-border/60 last:border-b-0",
        onClick && "cursor-pointer hover:bg-muted/20 active:bg-muted/30 transition-colors",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className={cn(
          "text-[11px] font-bold uppercase tracking-widest",
          accent ? "text-primary" : "text-muted-foreground",
        )}>
          {title}
        </p>
        {badge !== undefined && onClick && (
          <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
            {badge} <ChevronRight className="w-3 h-3" />
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate]     = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [refForm, setRefForm] = useState({ name: "", type: "marketing" });
  const [actForm, setActForm] = useState({ inquiryId: "", type: "note", subject: "", body: "" });
  const [refSaving, setRefSaving] = useState(false);
  const [actSaving, setActSaving] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("week");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd,   setCustomEnd]   = useState<string>("");
  const qc = useQueryClient();
  const { user } = useAuth();
  const role = user?.role ?? "admissions";

  const perfUrl = useMemo(() => {
    const params = new URLSearchParams({ timeframe });
    if (timeframe === "custom" && customStart && customEnd) {
      params.set("startDate", customStart);
      params.set("endDate", customEnd);
    }
    return `/api/admissions-performance?${params.toString()}`;
  }, [timeframe, customStart, customEnd]);

  const { data: perf, isLoading: perfLoading } = useQuery<any>({
    queryKey: ["admissions-performance", timeframe, customStart, customEnd],
    queryFn: () => fetch(perfUrl, { credentials: "include" }).then(r => r.json()),
    staleTime: 60000,
    refetchInterval: 60000,
    enabled: timeframe !== "custom" || (!!customStart && !!customEnd),
  });

  const { data: cc, isLoading: ccLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/command-center"],
    queryFn: () => fetch("/api/dashboard/command-center", { credentials: "include" }).then(r => r.json()),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const isLoading = perfLoading || ccLoading;

  const period   = perf?.period    ?? { leads: 0, admits: 0, conversion: 0 };
  const periodLabel = perf?.periodLabel ?? (timeframe === "week" ? "This Week" : timeframe === "month" ? "This Month" : timeframe === "year" ? "This Year" : "Custom Range");
  const refs     = (perf?.referralSources ?? []) as any[];
  const perf_    = perf?.topPerformers ?? { admissionsRep: null, bdRep: null, leadRep: null };
  const calls    = perf?.calls    ?? { missedToday: 0, missedWeek: 0, answerRate: 100 };
  const speed    = perf?.speed    ?? { avgHoursToAdmit: null, sampleSize: 0 };
  const pipe     = perf?.pipeline ?? { active: 0, vobPending: 0, readyToAdmit: 0 };

  const recentInqs  = (cc?.recentInquiries ?? []) as any[];
  const ready       = (cc?.readyToAdmit ?? []) as any[];
  const stuck       = cc?.stuckLeads ?? { vob: 0, preAssess: 0, initialContact: 0, total: 0 };
  const missedCalls = (cc?.missedCalls ?? []) as any[];

  const formatSpeed = (h: number | null) =>
    h === null ? "No data" : h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Command Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Live admissions feed</p>
        </div>
        <div className="flex items-center gap-2">
          {/* + New Inquiry */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
          {/* + Referral Source */}
          <button
            onClick={() => setShowReferral(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border hover:bg-muted text-foreground rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
            title="Add Referral Source"
          >
            <UserPlus className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Referral</span>
          </button>
          {/* + Activity (compact) */}
          <button
            onClick={() => setShowActivity(true)}
            className="flex items-center gap-1 px-2.5 py-2 bg-card border border-border hover:bg-muted text-muted-foreground rounded-xl text-sm transition-all active:scale-[0.97]"
            title="Log Activity"
          >
            <Zap className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* New Inquiry Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0 bg-card border-l border-border">
          <SheetHeader className="p-6 bg-muted border-b border-border sticky top-0 z-10">
            <SheetTitle className="text-xl text-foreground">Create New Inquiry</SheetTitle>
            <SheetDescription className="text-muted-foreground">Enter details manually or use AI to parse a document.</SheetDescription>
          </SheetHeader>
          <div className="p-6">
            <CreateInquiryForm onSuccess={() => setShowCreate(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* New Referral Source Sheet */}
      <Sheet open={showReferral} onOpenChange={(o) => { setShowReferral(o); if (!o) setRefForm({ name: "", type: "marketing" }); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 bg-card border-l border-border">
          <SheetHeader className="p-6 bg-muted border-b border-border sticky top-0 z-10">
            <SheetTitle className="text-xl text-foreground">Add Referral Source</SheetTitle>
            <SheetDescription className="text-muted-foreground">Create a new referral source for tracking leads.</SheetDescription>
          </SheetHeader>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Name <span className="text-red-400">*</span></label>
              <input
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Google PPC, Desert Hope..."
                value={refForm.name}
                onChange={(e) => setRefForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
              <select
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={refForm.type}
                onChange={(e) => setRefForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="marketing">Marketing</option>
                <option value="physician">Physician</option>
                <option value="hospital">Hospital</option>
                <option value="treatment_center">Treatment Center</option>
                <option value="alumni">Alumni</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button
              disabled={!refForm.name.trim() || refSaving}
              onClick={async () => {
                setRefSaving(true);
                try {
                  await fetch("/api/referrals", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(refForm) });
                  qc.invalidateQueries({ queryKey: ["/api/referrals"] });
                  setShowReferral(false);
                  setRefForm({ name: "", type: "marketing" });
                } finally { setRefSaving(false); }
              }}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
            >
              {refSaving ? "Saving…" : "Save Referral Source"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Log Activity Sheet */}
      <Sheet open={showActivity} onOpenChange={(o) => { setShowActivity(o); if (!o) setActForm({ inquiryId: "", type: "note", subject: "", body: "" }); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 bg-card border-l border-border">
          <SheetHeader className="p-6 bg-muted border-b border-border sticky top-0 z-10">
            <SheetTitle className="text-xl text-foreground">Log Activity</SheetTitle>
            <SheetDescription className="text-muted-foreground">Record a call, note, or touchpoint.</SheetDescription>
          </SheetHeader>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Link to Inquiry (optional)</label>
              <select
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={actForm.inquiryId}
                onChange={(e) => setActForm(f => ({ ...f, inquiryId: e.target.value }))}
              >
                <option value="">— None —</option>
                {recentInqs.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
              <select
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={actForm.type}
                onChange={(e) => setActForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
              <input
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Brief summary…"
                value={actForm.subject}
                onChange={(e) => setActForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
              <textarea
                rows={4}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Details, outcome, next steps…"
                value={actForm.body}
                onChange={(e) => setActForm(f => ({ ...f, body: e.target.value }))}
              />
            </div>
            <button
              disabled={!actForm.subject.trim() || actSaving}
              onClick={async () => {
                setActSaving(true);
                try {
                  await fetch("/api/activities", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
                    inquiryId: actForm.inquiryId || null,
                    type: actForm.type,
                    subject: actForm.subject,
                    body: actForm.body,
                  }) });
                  qc.invalidateQueries({ queryKey: ["/api/activities"] });
                  setShowActivity(false);
                  setActForm({ inquiryId: "", type: "note", subject: "", body: "" });
                } finally { setActSaving(false); }
              }}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
            >
              {actSaving ? "Saving…" : "Save Activity"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">

          {/* ── 0. Recent Inquiries ─────────────────────────────────────── */}
          <Section title="Recent Inquiries" badge="All" onClick={() => navigate("/inquiries")}>
            {recentInqs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active inquiries</p>
            ) : (
              <div className="space-y-2">
                {recentInqs.map((r: any) => (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/inquiries/${r.id}`)}
                    className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-muted/40 hover:bg-muted/70 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {/* Name + source */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.referralSource ?? "No source"}</p>
                    </div>
                    {/* Time + status */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[10px] text-muted-foreground/60 leading-none">{timeAgo(r.createdAt)}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border leading-none",
                        r.status === "admitted"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                          : r.status === "new"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted text-muted-foreground border-border",
                      )}>
                        {statusLabel(r.status)}
                      </span>
                    </div>
                    {/* Call / Text actions */}
                    {r.phone && (
                      <div className="shrink-0 flex items-center gap-1.5 ml-1" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`tel:${r.phone}`}
                          className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          title={`Call ${r.phone}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => navigate(`/active-calls?sms=${encodeURIComponent(r.phone)}`)}
                          className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                          title={`Text ${r.phone}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── 1. Ready to Admit ─────────────────────────────────────── */}
          <Section
            title="🔥 Ready to Admit"
            badge={ready.length > 0 ? `${ready.length} leads` : undefined}
            onClick={() => navigate("/pipeline")}
            accent
          >
            {ready.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads scheduled yet</p>
            ) : (
              <div className="space-y-2">
                {ready.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={(e) => { e.stopPropagation(); navigate(`/inquiries/${r.id}`); }}
                    className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/40 hover:bg-muted/70 active:scale-[0.98] transition-all"
                  >
                    <div className="text-left min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{statusLabel(r.status)} · {timeAgo(r.updatedAt)}</p>
                    </div>
                    <div className="shrink-0 ml-3 text-right">
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
                      )}>
                        {formatApptDate(r.appointmentDate)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* ── 2. Period Stats + Timeframe Picker ──────────────────────── */}
          <Section title={periodLabel}>
            {/* Timeframe pills */}
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
              {(["week", "month", "year", "custom"] as Timeframe[]).map(tf => (
                <button
                  key={tf}
                  onClick={(e) => { e.stopPropagation(); setTimeframe(tf); }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
                    timeframe === tf
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
                  )}
                >
                  {tf === "week" ? "Week" : tf === "month" ? "Month" : tf === "year" ? "Year" : "Custom"}
                </button>
              ))}
              {timeframe === "custom" && (
                <div className="flex items-center gap-1.5 mt-1.5 w-full flex-wrap">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              )}
            </div>
            {/* Stats */}
            {perfLoading ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading…</span>
              </div>
            ) : (
              <div className="flex gap-8">
                <div>
                  <div className="text-3xl font-extrabold text-foreground tabular-nums">{period.leads}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Leads</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-emerald-400 tabular-nums">{period.admits}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Admits</div>
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-primary tabular-nums">{period.conversion}%</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">CVR</div>
                </div>
              </div>
            )}
          </Section>

          {/* ── 3. Referral Sources ─────────────────────────────────────── */}
          <Section title={`Referral Sources (${periodLabel})`} badge="All" onClick={() => navigate("/referrals")}>
            {refs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity for {periodLabel.toLowerCase()}</p>
            ) : (
              <div className="space-y-2.5">
                {refs.slice(0, 6).map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-foreground truncate flex-1 pr-3">{r.source}</span>
                    <span className="text-xs font-semibold tabular-nums shrink-0 text-right">
                      <span className="text-muted-foreground">{r.leads} → </span>
                      <span className="text-emerald-400">{r.admits}</span>
                      <span className="text-muted-foreground/50 ml-1">({r.conversion}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── 4. Call Performance ─────────────────────────────────────── */}
          <Section title="Call Performance" onClick={() => navigate("/calls/active")}>
            <div className="flex gap-8">
              <div>
                <div className={cn("text-3xl font-extrabold tabular-nums", calls.missedToday > 0 ? "text-rose-400" : "text-foreground")}>
                  {calls.missedToday}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Missed Today</div>
              </div>
              <div>
                <div className={cn("text-3xl font-extrabold tabular-nums", calls.missedWeek > 0 ? "text-amber-400" : "text-foreground")}>
                  {calls.missedWeek}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Missed Week</div>
              </div>
              <div>
                <div className={cn("text-3xl font-extrabold tabular-nums", calls.answerRate >= 80 ? "text-emerald-400" : "text-rose-400")}>
                  {calls.answerRate}%
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Answer Rate</div>
              </div>
            </div>
          </Section>

          {/* ── 5. Top Performers ───────────────────────────────────────── */}
          <Section title={`Top Performers (${periodLabel})`} onClick={() => navigate("/inquiries?tab=admitted")}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground w-20 shrink-0">Closer</span>
                <span className="text-sm font-bold text-foreground text-right">
                  {perf_.admissionsRep
                    ? `${perf_.admissionsRep.name} · ${perf_.admissionsRep.admits} admits`
                    : <span className="text-muted-foreground font-normal">—</span>}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground w-20 shrink-0">Top Credit</span>
                <span className="text-sm font-bold text-foreground text-right">
                  {perf_.bdRep
                    ? <><span className="text-amber-400">★</span> {perf_.bdRep.name} · {perf_.bdRep.leads} admits</>
                    : perf_.leadRep
                      ? `${perf_.leadRep.name} · ${perf_.leadRep.leads} leads`
                      : <span className="text-muted-foreground font-normal">—</span>}
                </span>
              </div>
            </div>
          </Section>

          {/* ── 6. Speed to Admit ───────────────────────────────────────── */}
          <Section title="Speed to Admit">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-primary tabular-nums">
                {formatSpeed(speed.avgHoursToAdmit)}
              </span>
              <div>
                <p className="text-xs text-muted-foreground">avg time to admit</p>
                <p className="text-[10px] text-muted-foreground/60">based on {speed.sampleSize} admit{speed.sampleSize !== 1 ? "s" : ""} · {periodLabel.toLowerCase()}</p>
              </div>
            </div>
          </Section>

          {/* ── 7. Pipeline ─────────────────────────────────────────────── */}
          <Section title="Pipeline" onClick={() => navigate("/pipeline")}>
            <div className="flex gap-8">
              <div>
                <div className="text-3xl font-extrabold text-foreground tabular-nums">{pipe.active}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Active</div>
              </div>
              <div>
                <div className={cn("text-3xl font-extrabold tabular-nums", pipe.vobPending > 5 ? "text-amber-400" : "text-foreground")}>
                  {pipe.vobPending}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">VOB</div>
              </div>
              <div>
                <div className={cn("text-3xl font-extrabold tabular-nums", pipe.readyToAdmit > 0 ? "text-emerald-400" : "text-foreground")}>
                  {pipe.readyToAdmit}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                  Ready {pipe.readyToAdmit > 0 ? "🔥" : ""}
                </div>
              </div>
            </div>
          </Section>

          {/* ── 8. Stuck > 24hrs ────────────────────────────────────────── */}
          <Section
            title="⚠ Stuck > 24 hrs"
            onClick={stuck.total > 0 ? () => navigate("/inquiries?tab=needs_action") : undefined}
          >
            {stuck.total === 0 ? (
              <p className="text-sm text-emerald-400 font-medium">All leads moving ✓</p>
            ) : (
              <div className="space-y-2">
                {stuck.vob > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">In VOB</span>
                    <span className="text-sm font-bold text-amber-400 tabular-nums">{stuck.vob}</span>
                  </div>
                )}
                {stuck.preAssess > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">In Pre-Assess</span>
                    <span className="text-sm font-bold text-amber-400 tabular-nums">{stuck.preAssess}</span>
                  </div>
                )}
                {stuck.initialContact > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">No contact (48h+)</span>
                    <span className="text-sm font-bold text-rose-400 tabular-nums">{stuck.initialContact}</span>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ── 9. Missed Calls ─────────────────────────────────────────── */}
          <Section title="Missed Calls" badge={missedCalls.length > 0 ? `${missedCalls.length}` : undefined} onClick={() => navigate("/calls/active")}>
            {missedCalls.length === 0 ? (
              <p className="text-sm text-emerald-400 font-medium">No missed calls ✓</p>
            ) : (
              <div className="space-y-2">
                {missedCalls.slice(0, 6).map((c: any) => (
                  <button
                    key={c.id}
                    onClick={(e) => { e.stopPropagation(); navigate(`/inquiries/${c.id}`); }}
                    className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/40 hover:bg-rose-500/10 active:scale-[0.98] transition-all group"
                  >
                    <div className="text-left min-w-0 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-rose-500/15 border border-rose-500/20 flex items-center justify-center shrink-0">
                        <Phone className="w-3 h-3 text-rose-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone ?? "Unknown"}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground/60 shrink-0 ml-3">{timeAgo(c.callDateTime)}</span>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* ── Settings (role-based) ────────────────────────────────────── */}
          <div className="px-4 py-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Settings</p>
            <div className="space-y-1">
              {role === "admin" && (
                <>
                  <SettingsLink label="Facility & System" sub="Name, address, system config" onClick={() => navigate("/settings?tab=facility")} />
                  <SettingsLink label="User Management" sub="Add, edit or deactivate users" onClick={() => navigate("/settings?tab=users")} />
                  <SettingsLink label="Admissions Config" sub="Facesheet email, pipeline defaults" onClick={() => navigate("/settings?tab=admissions")} />
                  <SettingsLink label="AI Settings" sub="Claude prompts and model config" onClick={() => navigate("/settings?tab=ai")} />
                  <SettingsLink label="Notifications" sub="Alerts and call routing" onClick={() => navigate("/settings?tab=notifications")} />
                  <SettingsLink label="Integrations" sub="Twilio, webhooks, third-party" onClick={() => navigate("/settings?tab=integrations")} />
                </>
              )}
              {role === "admissions" && (
                <>
                  <SettingsLink label="Notifications" sub="Call alerts and reminders" onClick={() => navigate("/settings?tab=notifications")} />
                  <SettingsLink label="AI Settings" sub="AI assist preferences" onClick={() => navigate("/settings?tab=ai")} />
                </>
              )}
              {role === "bd" && (
                <>
                  <SettingsLink label="My Accounts" sub="Referral sources and contacts" onClick={() => navigate("/referrals")} />
                  <SettingsLink label="Notifications" sub="Lead alerts and reminders" onClick={() => navigate("/settings?tab=notifications")} />
                </>
              )}
            </div>
          </div>

        </div>
      )}
    </Layout>
  );
}

function SettingsLink({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted/40 active:scale-[0.98] transition-all group"
    >
      <div className="text-left">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
    </button>
  );
}
