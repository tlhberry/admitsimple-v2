import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useLiveEvents } from "@/hooks/use-live-events";
import { useAuth } from "@/hooks/use-auth";
import { Phone, X, UserCheck, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface IncomingCall {
  inquiryId: number;
  phone: string;
  callerName: string;
  source?: string;
  isExisting?: boolean;
  claimable?: boolean;
  assignedUserId?: number | null;
  callStatus?: string;
  timestamp: string;
}

export function IncomingCallBanner() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [calls, setCalls] = useState<IncomingCall[]>([]);
  const { toast } = useToast();

  const handleIncomingCall = useCallback((data: IncomingCall) => {
    const isForMe = data.claimable || data.assignedUserId === (user as any)?.id;
    if (!isForMe) return;

    setCalls(prev => {
      if (prev.some(c => c.inquiryId === data.inquiryId)) return prev;
      return [data, ...prev].slice(0, 3);
    });

    setTimeout(() => {
      setCalls(prev => prev.filter(c => c.inquiryId !== data.inquiryId));
    }, 60000);
  }, [user]);

  const handleCallClaimed = useCallback((data: { inquiryId: number; repId: number; repName: string }) => {
    setCalls(prev => {
      const exists = prev.some(c => c.inquiryId === data.inquiryId);
      if (exists && data.repId !== (user as any)?.id) {
        toast({
          title: `Call claimed by ${data.repName}`,
          description: `INQ #${data.inquiryId} is now handled by ${data.repName}`,
          duration: 4000,
        });
      }
      return prev.filter(c => c.inquiryId !== data.inquiryId);
    });
  }, [user, toast]);

  const handleCallStatus = useCallback((data: { inquiryId: number; status: string }) => {
    if (data.status === "missed" || data.status === "completed") {
      setCalls(prev => prev.filter(c => c.inquiryId !== data.inquiryId));
    }
  }, []);

  useLiveEvents({
    incoming_call: handleIncomingCall,
    call_claimed: handleCallClaimed,
    call_status: handleCallStatus,
  });

  const dismiss = (inquiryId: number) => {
    setCalls(prev => prev.filter(c => c.inquiryId !== inquiryId));
  };

  const openLive = (call: IncomingCall) => {
    dismiss(call.inquiryId);
    navigate(`/inquiries/${call.inquiryId}?mode=live`);
  };

  if (calls.length === 0) return null;

  return (
    <>
      {/* Mobile: full-width slide-down banner at top */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[300] flex flex-col">
        {calls.map(call => (
          <MobileCallBanner
            key={call.inquiryId}
            call={call}
            currentUserId={(user as any)?.id}
            onDismiss={() => dismiss(call.inquiryId)}
            onOpen={() => openLive(call)}
            onClaimed={() => dismiss(call.inquiryId)}
          />
        ))}
      </div>

      {/* Desktop: top-right notification cards */}
      <div className="hidden md:flex fixed top-4 right-4 z-[300] flex-col gap-2 max-w-sm w-full">
        {calls.map(call => (
          <DesktopCallCard
            key={call.inquiryId}
            call={call}
            currentUserId={(user as any)?.id}
            onDismiss={() => dismiss(call.inquiryId)}
            onOpen={() => openLive(call)}
            onClaimed={() => dismiss(call.inquiryId)}
          />
        ))}
      </div>
    </>
  );
}

// ── Mobile full-width banner ───────────────────────────────────────────────────
function MobileCallBanner({ call, currentUserId, onDismiss, onOpen, onClaimed }: {
  call: IncomingCall;
  currentUserId?: number;
  onDismiss: () => void;
  onOpen: () => void;
  onClaimed: () => void;
}) {
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const isDirectlyAssigned = !call.claimable && call.assignedUserId === currentUserId;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch(`/api/inquiries/${call.inquiryId}/claim`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        onClaimed();
        window.location.href = `/inquiries/${call.inquiryId}?mode=live`;
      } else if (res.status === 409) {
        toast({ title: "Already claimed", description: data.message || "Another rep got there first", variant: "destructive", duration: 4000 });
        onDismiss();
      } else {
        toast({ title: "Failed to claim", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className={cn(
      "transition-transform duration-300 ease-out",
      visible ? "translate-y-0" : "-translate-y-full"
    )}>
      {/* Red bar at top */}
      <div className="h-1.5 bg-rose-500 relative overflow-hidden">
        <div className="absolute inset-0 animate-[pulse_1s_ease-in-out_infinite] bg-rose-400" />
      </div>

      {/* Banner body */}
      <div className="bg-[#1a2035] border-b border-rose-500/30 px-4 py-3 flex items-center gap-3">
        {/* Pulsing phone icon */}
        <div className="relative shrink-0">
          <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping" />
          <div className="relative w-11 h-11 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center">
            <Phone className="w-5 h-5 text-rose-400" />
          </div>
        </div>

        {/* Caller info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
              {call.claimable ? "Incoming Call" : "Your Call"}
            </span>
            {call.isExisting && (
              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                Existing
              </span>
            )}
          </div>
          <p className="text-base font-bold text-white tracking-tight font-mono leading-none">
            {call.phone}
          </p>
          {call.callerName && call.callerName !== "Unknown Caller" && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{call.callerName}</p>
          )}
          {call.source && (
            <p className="text-[10px] text-slate-500 truncate">via {call.source}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {call.claimable ? (
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming}
              className="flex items-center gap-1.5 h-10 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-rose-600/30"
            >
              {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              {claiming ? "…" : "Claim"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpen}
              className="flex items-center gap-1.5 h-10 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-rose-600/30"
            >
              <UserCheck className="w-4 h-4" />
              Open
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Desktop notification card (unchanged look) ────────────────────────────────
function DesktopCallCard({ call, currentUserId, onDismiss, onOpen, onClaimed }: {
  call: IncomingCall;
  currentUserId?: number;
  onDismiss: () => void;
  onOpen: () => void;
  onClaimed: () => void;
}) {
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch(`/api/inquiries/${call.inquiryId}/claim`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        onClaimed();
        window.location.href = `/inquiries/${call.inquiryId}?mode=live`;
      } else if (res.status === 409) {
        toast({ title: "Already claimed", description: data.message || "Another rep got there first", variant: "destructive", duration: 4000 });
        onDismiss();
      } else {
        toast({ title: "Failed to claim", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className={cn(
      "bg-card border border-primary/40 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden transition-all duration-300",
      visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
    )}>
      <div className="h-1 bg-rose-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-rose-400 animate-pulse" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-0 bg-rose-500/30 rounded-full animate-ping" />
              <div className="relative w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                <Phone className="w-4 h-4 text-rose-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 rounded-full">
                  {call.claimable ? "Incoming — Tap to Claim" : "Your Call"}
                </span>
              </div>
              <p className="text-base font-bold text-foreground mt-0.5 font-mono tracking-tight">
                {call.phone}
              </p>
              {call.callerName && call.callerName !== "Unknown Caller" && (
                <p className="text-xs text-muted-foreground">{call.callerName}</p>
              )}
              {call.source && (
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">via {call.source}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        {call.claimable ? (
          <button
            type="button"
            onClick={handleClaim}
            disabled={claiming}
            className="w-full flex items-center justify-center gap-2 h-10 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-rose-600/30"
          >
            {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {claiming ? "Claiming..." : "Claim This Call"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="w-full flex items-center justify-center gap-2 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-rose-600/30"
          >
            <UserCheck className="w-4 h-4" />
            Open Live Intake
          </button>
        )}
        {call.isExisting && (
          <p className="text-[10px] text-amber-400 text-center mt-2">
            Existing inquiry found — will update record
          </p>
        )}
      </div>
    </div>
  );
}
