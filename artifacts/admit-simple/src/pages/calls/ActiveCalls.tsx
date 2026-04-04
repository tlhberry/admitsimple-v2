import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { useLiveEvents } from "@/hooks/use-live-events";
import { useAuth } from "@/hooks/use-auth";
import { useTwilioVoice } from "@/hooks/useTwilioVoice";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Phone, UserCheck, Users, ExternalLink, Loader2,
  PhoneOff, Radio, CheckCircle2, AlertTriangle, PhoneMissed,
  PhoneCall, PhoneIncoming, Mic, MicOff,
  MessageSquare, Delete,
} from "lucide-react";
import { SMSInbox } from "@/components/SMSInbox";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatDuration(secs: number | null | undefined): string | null {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function isKnown(name: string): boolean {
  const lower = name.toLowerCase();
  return !lower.includes("unknown") && name.trim().length > 0;
}

// ── Call duration display (live counter) ──────────────────────────────────────
function CallAge({ callDateTime }: { callDateTime: string | null }) {
  const [now, setNow] = useState(Date.now());
  useState(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  });
  if (!callDateTime) return <span className="text-muted-foreground">—</span>;
  const secs = Math.floor((now - new Date(callDateTime).getTime()) / 1000);
  if (secs < 0) return <span className="text-muted-foreground">just now</span>;
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return <span className="font-mono text-rose-400">{m}:{s}</span>;
}

// ── Status badge for live calls ───────────────────────────────────────────────
function liveBadge(status: string | null) {
  if (status === "ringing") return (
    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full">
      <Radio className="w-2.5 h-2.5 animate-pulse" /> Ringing
    </span>
  );
  if (status === "active") return (
    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full">
      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Active
    </span>
  );
  return null;
}

// ── Status badge for log calls ────────────────────────────────────────────────
function logBadge(status: string | null) {
  if (status === "missed") return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-red-400 bg-red-500/10 border-red-500/20">
      <PhoneMissed className="w-2.5 h-2.5" /> Missed
    </span>
  );
  if (status === "completed") return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
      <CheckCircle2 className="w-2.5 h-2.5" /> Answered
    </span>
  );
  if (status === "active") return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-blue-400 bg-blue-500/10 border-blue-500/20">
      <PhoneCall className="w-2.5 h-2.5" /> Active
    </span>
  );
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-muted-foreground bg-muted border-border">
      {status ?? "Unknown"}
    </span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ActiveCall {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  callStatus: string | null;
  isLocked: boolean;
  lockedAt: string | null;
  assignedTo: number | null;
  assignedToName: string | null;
  callDateTime: string | null;
  ctmSource: string | null;
  ctmCallId: string | null;
}

interface LogCall {
  id: number;
  name: string;
  phone: string | null;
  status: string | null;
  duration: number | null;
  callDateTime: string | null;
  source: string | null;
}

type Filter = "all" | "missed" | "answered";
type CommTab = "dialer" | "sms";

// ── Dialer ────────────────────────────────────────────────────────────────────
function Dialer({ onCall }: { onCall: (number: string) => void }) {
  const [digits, setDigits] = useState("");
  const keys = ["1","2","3","4","5","6","7","8","9","*","0","#"];
  const subLabels: Record<string, string> = {
    "2":"ABC","3":"DEF","4":"GHI","5":"JKL","6":"MNO",
    "7":"PQRS","8":"TUV","9":"WXYZ","0":"+","*":"","#":"",
  };

  const press = (k: string) => setDigits(d => (d + k).slice(0, 15));

  return (
    <div className="select-none">
      {/* Display */}
      <div className="h-14 flex items-center justify-center mb-5 relative">
        <span className={cn(
          "font-mono text-2xl tracking-widest font-semibold",
          digits ? "text-foreground" : "text-muted-foreground/40",
        )}>
          {digits || "Enter number"}
        </span>
        {digits && (
          <button
            type="button"
            onClick={() => setDigits(d => d.slice(0, -1))}
            className="absolute right-0 w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Delete className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Keypad grid */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {keys.map(k => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className="h-14 flex flex-col items-center justify-center rounded-2xl bg-muted/40 hover:bg-muted active:scale-95 transition-all border border-border/50"
          >
            <span className="text-lg font-semibold text-foreground leading-none">{k}</span>
            {subLabels[k] && (
              <span className="text-[9px] text-muted-foreground mt-0.5 tracking-widest">{subLabels[k]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Call button */}
      <button
        type="button"
        disabled={!digits}
        onClick={() => digits && onCall(digits)}
        className="w-full h-14 flex items-center justify-center gap-2.5 rounded-2xl bg-[#5BC8DC] hover:bg-[#4ab8cc] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base transition-all active:scale-[0.98] shadow-lg shadow-[#5BC8DC]/20"
      >
        <Phone className="w-5 h-5" />
        Call
      </button>
    </div>
  );
}


// ── Recent call row ───────────────────────────────────────────────────────────
function CallRow({
  call,
  onNavigate,
  onCallBack,
}: {
  call: LogCall;
  onNavigate: (id: number) => void;
  onCallBack?: (phone: string, name: string) => void;
}) {
  const known = isKnown(call.name);
  const dur = formatDuration(call.duration);

  return (
    <div
      className="flex items-center gap-3 py-3 px-4 rounded-xl bg-muted/30 hover:bg-muted/60 active:scale-[0.99] transition-all cursor-pointer"
      onClick={() => onNavigate(call.id)}
    >
      {/* Icon */}
      <div className={cn(
        "shrink-0 w-9 h-9 rounded-full flex items-center justify-center border",
        call.status === "missed"
          ? "bg-red-500/10 border-red-500/20"
          : "bg-emerald-500/10 border-emerald-500/20",
      )}>
        {call.status === "missed"
          ? <PhoneMissed className="w-4 h-4 text-red-400" />
          : <PhoneCall className="w-4 h-4 text-emerald-400" />}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {known ? call.name : (call.phone ?? "Unknown")}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {logBadge(call.status)}
          {dur && <span className="text-[10px] text-muted-foreground">{dur}</span>}
          {call.source && (
            <span className="text-[10px] text-muted-foreground/70 truncate">{call.source}</span>
          )}
        </div>
      </div>

      {/* Time + actions */}
      <div className="shrink-0 flex flex-col items-end gap-1.5" onClick={e => e.stopPropagation()}>
        <span className="text-[10px] text-muted-foreground/60">{timeAgo(call.callDateTime)}</span>
        {call.phone && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onCallBack?.(call.phone!, call.name); }}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <Phone className="w-3 h-3" /> Call Back
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ActiveCallsPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [claiming, setClaiming] = useState<number | null>(null);
  const [filter,   setFilter]   = useState<Filter>("all");
  const [commTab,  setCommTab]  = useState<CommTab>("dialer");
  const [smsPhone, setSmsPhone] = useState<string | undefined>(undefined);

  // Auto-switch to SMS tab when navigated here with ?sms=<phone>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phone = params.get("sms");
    if (phone) {
      setSmsPhone(phone);
      setCommTab("sms");
    }
  }, []);
  const {
    isReady, setupError,
    activeCalls, answerCall, declineCall,
    makeCall, hangUp, toggleMute,
    outboundStatus, outboundTo, outboundName, isMuted, callDuration,
  } = useTwilioVoice();

  // Live active calls
  const { data: calls = [], isLoading: liveLoading } = useQuery<ActiveCall[]>({
    queryKey: ["/api/calls/active"],
    queryFn: () => fetch("/api/calls/active", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 5000,
  });

  // Call log (summary + missed today + recent 30)
  const { data: log, isLoading: logLoading } = useQuery<{
    summary: { total: number; missed: number; answered: number; answerRate: number };
    missedToday: LogCall[];
    recentCalls: LogCall[];
  }>({
    queryKey: ["/api/calls/log"],
    queryFn: () => fetch("/api/calls/log", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Real-time refresh
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/calls/active"] });
    queryClient.invalidateQueries({ queryKey: ["/api/calls/log"] });
  }, [queryClient]);

  useLiveEvents({ incoming_call: refresh, call_claimed: refresh, call_status: refresh });

  const handleClaim = async (inquiryId: number) => {
    setClaiming(inquiryId);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/claim`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        window.location.href = `/inquiries/${inquiryId}?mode=live`;
      } else if (res.status === 409) {
        toast({ title: "Already claimed", description: data.message, variant: "destructive" });
        refresh();
      } else {
        toast({ title: "Failed to claim call", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setClaiming(null);
    }
  };

  const summary = log?.summary ?? { total: 0, missed: 0, answered: 0, answerRate: 100 };
  const missedToday = log?.missedToday ?? [];
  const recentCalls = log?.recentCalls ?? [];

  const filtered = filter === "missed"
    ? recentCalls.filter(c => c.status === "missed")
    : filter === "answered"
      ? recentCalls.filter(c => c.status === "completed" || c.status === "active")
      : recentCalls;

  return (
    <Layout>
      <div className="space-y-5 pb-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="relative">
                {calls.length > 0 && (
                  <div className="absolute inset-0 bg-rose-500/30 rounded-full animate-ping" />
                )}
                <div className={cn(
                  "relative w-10 h-10 rounded-full border flex items-center justify-center",
                  calls.length > 0 ? "bg-rose-500/15 border-rose-500/40" : "bg-muted border-border",
                )}>
                  <Phone className={cn("w-5 h-5", calls.length > 0 ? "text-rose-400" : "text-muted-foreground")} />
                </div>
              </div>
              Active Calls
              {calls.length > 0 && (
                <span className="text-base font-bold text-rose-400 bg-rose-500/15 border border-rose-500/25 px-3 py-1 rounded-full">
                  {calls.length} live
                </span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Real-time view of ringing and active inbound calls — updates every 5 seconds
            </p>
          </div>
        </div>

        {/* ── Twilio setup error banner ────────────────────────────────────── */}
        {setupError && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold">Voice calling unavailable</p>
              <p className="text-amber-300/70 text-xs mt-0.5">{setupError}. To enable browser calling, add a Twilio API Key SID and Secret in your environment settings.</p>
            </div>
          </div>
        )}

        {/* ── Live Active Calls ────────────────────────────────────────────── */}
        {liveLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-card border border-border rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-muted/50 border border-border flex items-center justify-center mb-3">
              <PhoneOff className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-base font-semibold text-foreground">No active calls</p>
            <p className="text-xs text-muted-foreground mt-0.5">New inbound calls will appear here in real time</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {calls.map(call => {
              const isOwned       = call.isLocked && call.assignedTo === (user as any)?.id;
              const isClaimable   = !call.isLocked && call.callStatus === "ringing";
              const isTakenByOther = call.isLocked && call.assignedTo !== (user as any)?.id;

              return (
                <div key={call.id} className={cn(
                  "bg-card border rounded-2xl p-5 space-y-4 transition-all",
                  isOwned ? "border-primary/40 ring-1 ring-primary/20" :
                  isClaimable ? "border-rose-500/30 ring-1 ring-rose-500/10" : "border-border",
                )}>
                  <div className="flex items-center justify-between">
                    {liveBadge(call.callStatus)}
                    <CallAge callDateTime={call.callDateTime} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full border flex items-center justify-center shrink-0",
                      call.callStatus === "ringing" ? "bg-rose-500/15 border-rose-500/30" : "bg-emerald-500/15 border-emerald-500/30",
                    )}>
                      <Phone className={cn("w-5 h-5", call.callStatus === "ringing" ? "text-rose-400" : "text-emerald-400")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground font-mono tracking-tight truncate">
                        {call.phone || "Unknown Number"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[call.firstName, call.lastName].filter(Boolean).join(" ") || "Unknown Caller"}
                        {call.ctmSource && <span className="text-muted-foreground/50 ml-1">· {call.ctmSource}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {call.assignedToName ? (
                      <>
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-foreground font-medium truncate">{call.assignedToName}</span>
                        {isOwned && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full ml-auto shrink-0">You</span>
                        )}
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Unassigned</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {/* Twilio browser answer/decline — only when Device has the incoming call */}
                    {call.callStatus === "ringing" && call.ctmCallId && activeCalls.has(call.ctmCallId) && (
                      <>
                        <button
                          type="button"
                          onClick={() => answerCall(call.ctmCallId!)}
                          className="flex-1 flex items-center justify-center gap-2 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                        >
                          <Phone className="w-4 h-4" /> Answer
                        </button>
                        <button
                          type="button"
                          onClick={() => declineCall(call.ctmCallId!)}
                          className="flex items-center justify-center gap-2 px-3 h-9 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
                        >
                          <PhoneOff className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {isOwned && (
                      <Link href={`/inquiries/${call.id}?mode=live`} className="flex-1 flex items-center justify-center gap-2 h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold transition-colors">
                        <ExternalLink className="w-4 h-4" /> Resume Call
                      </Link>
                    )}
                    {isClaimable && !(call.ctmCallId && activeCalls.has(call.ctmCallId)) && (
                      <button type="button" onClick={() => handleClaim(call.id)} disabled={claiming === call.id}
                        className="flex-1 flex items-center justify-center gap-2 h-9 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
                        {claiming === call.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                        Claim Call
                      </button>
                    )}
                    {isTakenByOther && (
                      <Link href={`/inquiries/${call.id}`} className="flex-1 flex items-center justify-center gap-2 h-9 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 rounded-xl text-sm font-medium transition-colors">
                        <ExternalLink className="w-4 h-4" /> View Inquiry
                      </Link>
                    )}
                    {!isOwned && !isClaimable && !isTakenByOther && !(call.ctmCallId && activeCalls.has(call.ctmCallId)) && (
                      <Link href={`/inquiries/${call.id}`} className="flex-1 flex items-center justify-center gap-2 h-9 border border-border rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground">
                        <ExternalLink className="w-4 h-4" /> View
                      </Link>
                    )}
                    <Link href={`/inquiries/${call.id}`} className="w-9 h-9 flex items-center justify-center border border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Today Summary ────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl px-5 py-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Today</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{summary.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total Calls</p>
            </div>
            <div className="text-center">
              <p className={cn("text-2xl font-bold", summary.missed > 0 ? "text-red-400" : "text-foreground")}>
                {summary.missed}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Missed</p>
            </div>
            <div className="text-center">
              <p className={cn("text-2xl font-bold", summary.answerRate >= 80 ? "text-emerald-400" : summary.answerRate >= 60 ? "text-amber-400" : "text-red-400")}>
                {summary.answerRate}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Answer Rate</p>
            </div>
          </div>
        </div>

        {/* ── Missed Calls — needs follow-up ──────────────────────────────── */}
        {missedToday.length > 0 && (
          <div className="bg-card border border-red-500/20 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-red-500/15 flex items-center justify-between bg-red-500/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-bold text-red-400 uppercase tracking-wider">
                  Missed Calls — Needs Follow-Up
                </span>
              </div>
              <span className="text-xs font-bold text-red-400 bg-red-500/15 border border-red-500/20 px-2 py-0.5 rounded-full">
                {missedToday.length} today
              </span>
            </div>
            <div className="px-4 py-3 space-y-2">
              {missedToday.map(call => (
                <div
                  key={call.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all cursor-pointer"
                  onClick={() => navigate(`/inquiries/${call.id}`)}
                >
                  <PhoneMissed className="w-4 h-4 text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {isKnown(call.name) ? call.name : (call.phone ?? "Unknown")}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {timeAgo(call.callDateTime)}{call.source ? ` · ${call.source}` : ""}
                    </p>
                  </div>
                  {call.phone && (
                    <a
                      href={`tel:${call.phone}`}
                      onClick={e => e.stopPropagation()}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call Back
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent Calls ─────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Section header + filter */}
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneIncoming className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Recent Calls</span>
            </div>
            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              {(["all", "missed", "answered"] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all capitalize",
                    filter === f
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Call list */}
          <div className="px-4 py-3 space-y-1.5">
            {logLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center">
                <PhoneOff className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {filter === "missed" ? "No missed calls" : filter === "answered" ? "No answered calls" : "No call history yet"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">Calls will appear here once CTM sends webhooks</p>
              </div>
            ) : (
              filtered.map(call => (
                <CallRow
                  key={call.id}
                  call={call}
                  onNavigate={(id) => navigate(`/inquiries/${id}`)}
                  onCallBack={(phone, name) => makeCall(phone, name)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Dial & Message ───────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Tab strip */}
          <div className="flex items-center border-b border-border bg-muted/20">
            {([
              { id: "dialer", label: "Dialer",       icon: <Phone       className="w-3.5 h-3.5" /> },
              { id: "sms",    label: "Text Message",  icon: <MessageSquare className="w-3.5 h-3.5" /> },
            ] as { id: CommTab; label: string; icon: ReactNode }[]).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCommTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2",
                  commTab === tab.id
                    ? "border-[#5BC8DC] text-[#5BC8DC] bg-[#5BC8DC]/5"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab body */}
          {commTab === "dialer" ? (
            <div className="px-5 py-5 max-w-sm mx-auto">
              <Dialer onCall={(num) => makeCall(num, num)} />
            </div>
          ) : (
            <SMSInbox initialPhone={smsPhone} />
          )}
        </div>

      </div>

      {/* ── Floating outbound call panel ──────────────────────────────── */}
      {outboundStatus !== "idle" && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[340px] max-w-[calc(100vw-2rem)]">
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header bar */}
            <div className={cn(
              "px-4 py-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
              outboundStatus === "open"       ? "bg-emerald-500/15 text-emerald-400 border-b border-emerald-500/20" :
              outboundStatus === "ringing"    ? "bg-amber-500/15  text-amber-400  border-b border-amber-500/20"  :
                                               "bg-muted/60        text-muted-foreground border-b border-border",
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                outboundStatus === "open"    ? "bg-emerald-400" :
                outboundStatus === "ringing" ? "bg-amber-400"   : "bg-muted-foreground",
              )} />
              {outboundStatus === "connecting" ? "Connecting…" :
               outboundStatus === "ringing"    ? "Ringing…"    :
                                                "Connected"}
              {outboundStatus === "open" && (
                <span className="ml-auto font-mono font-normal">
                  {String(Math.floor(callDuration / 60)).padStart(2, "0")}:{String(callDuration % 60).padStart(2, "0")}
                </span>
              )}
            </div>

            {/* Call info + controls */}
            <div className="px-4 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {outboundName && outboundName !== outboundTo ? outboundName : "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground font-mono truncate">{outboundTo}</p>
              </div>

              {/* Mute */}
              <button
                type="button"
                onClick={toggleMute}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border transition-colors",
                  isMuted
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground",
                )}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Hang up */}
              <button
                type="button"
                onClick={hangUp}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white transition-colors"
                title="Hang up"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
