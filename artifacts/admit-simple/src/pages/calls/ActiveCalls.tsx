import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { useLiveEvents } from "@/hooks/use-live-events";
import { useAuth } from "@/hooks/use-auth";
import { useCallback, useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Phone, Clock, UserCheck, Users, ExternalLink, Loader2,
  PhoneOff, Radio, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Call duration display ─────────────────────────────────────────────────────
function CallAge({ callDateTime }: { callDateTime: string | null }) {
  const [now, setNow] = useState(Date.now());
  // Refresh every second
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
}

function statusBadge(status: string | null) {
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

export default function ActiveCallsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [claiming, setClaiming] = useState<number | null>(null);

  const { data: calls = [], isLoading } = useQuery<ActiveCall[]>({
    queryKey: ["/api/calls/active"],
    queryFn: () => fetch("/api/calls/active", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 5000,
  });

  // Real-time updates
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/calls/active"] });
  }, [queryClient]);

  useLiveEvents({
    incoming_call: refresh,
    call_claimed: refresh,
    call_status: refresh,
  });

  const handleClaim = async (inquiryId: number) => {
    setClaiming(inquiryId);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/claim`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = `/inquiries/${inquiryId}?mode=live`;
      } else if (res.status === 409) {
        toast({
          title: "Already claimed",
          description: data.message,
          variant: "destructive",
        });
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="relative">
                {calls.length > 0 && (
                  <div className="absolute inset-0 bg-rose-500/30 rounded-full animate-ping" />
                )}
                <div className={cn(
                  "relative w-10 h-10 rounded-full border flex items-center justify-center",
                  calls.length > 0
                    ? "bg-rose-500/15 border-rose-500/40"
                    : "bg-muted border-border"
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

        {/* Call list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 border border-border flex items-center justify-center mb-4">
              <PhoneOff className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-semibold text-foreground">No active calls</p>
            <p className="text-sm text-muted-foreground mt-1">New inbound calls will appear here in real time</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {calls.map(call => {
              const isOwned = call.isLocked && call.assignedTo === (user as any)?.id;
              const isClaimable = !call.isLocked && call.callStatus === "ringing";
              const isTakenByOther = call.isLocked && call.assignedTo !== (user as any)?.id;

              return (
                <div
                  key={call.id}
                  className={cn(
                    "bg-card border rounded-2xl p-5 space-y-4 transition-all",
                    isOwned ? "border-primary/40 ring-1 ring-primary/20" :
                    isClaimable ? "border-rose-500/30 ring-1 ring-rose-500/10" :
                    "border-border"
                  )}
                >
                  {/* Top row: status + age */}
                  <div className="flex items-center justify-between">
                    {statusBadge(call.callStatus)}
                    <CallAge callDateTime={call.callDateTime} />
                  </div>

                  {/* Caller info */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full border flex items-center justify-center shrink-0",
                      call.callStatus === "ringing"
                        ? "bg-rose-500/15 border-rose-500/30"
                        : "bg-emerald-500/15 border-emerald-500/30"
                    )}>
                      <Phone className={cn(
                        "w-5 h-5",
                        call.callStatus === "ringing" ? "text-rose-400" : "text-emerald-400"
                      )} />
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

                  {/* Rep assignment */}
                  <div className="flex items-center gap-2 text-sm">
                    {call.assignedToName ? (
                      <>
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-foreground font-medium truncate">{call.assignedToName}</span>
                        {isOwned && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full ml-auto shrink-0">
                            You
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Unassigned</span>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {isOwned && (
                      <Link
                        href={`/inquiries/${call.id}?mode=live`}
                        className="flex-1 flex items-center justify-center gap-2 h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" /> Resume Call
                      </Link>
                    )}
                    {isClaimable && (
                      <button
                        type="button"
                        onClick={() => handleClaim(call.id)}
                        disabled={claiming === call.id}
                        className="flex-1 flex items-center justify-center gap-2 h-9 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
                      >
                        {claiming === call.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Phone className="w-4 h-4" />}
                        Claim Call
                      </button>
                    )}
                    {isTakenByOther && (
                      <Link
                        href={`/inquiries/${call.id}`}
                        className="flex-1 flex items-center justify-center gap-2 h-9 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 rounded-xl text-sm font-medium transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" /> View Inquiry
                      </Link>
                    )}
                    {!isOwned && !isClaimable && !isTakenByOther && (
                      <Link
                        href={`/inquiries/${call.id}`}
                        className="flex-1 flex items-center justify-center gap-2 h-9 border border-border rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ExternalLink className="w-4 h-4" /> View
                      </Link>
                    )}
                    <Link
                      href={`/inquiries/${call.id}`}
                      className="w-9 h-9 flex items-center justify-center border border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0"
                      title="View inquiry"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
