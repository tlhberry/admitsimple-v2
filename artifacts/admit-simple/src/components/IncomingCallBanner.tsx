import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useLiveEvents } from "@/hooks/use-live-events";
import { Phone, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface IncomingCall {
  inquiryId: number;
  phone: string;
  callerName: string;
  source?: string;
  isExisting?: boolean;
  timestamp: string;
}

export function IncomingCallBanner() {
  const [, navigate] = useLocation();
  const [calls, setCalls] = useState<IncomingCall[]>([]);

  const handleIncomingCall = useCallback((data: IncomingCall) => {
    setCalls(prev => {
      // Deduplicate by inquiryId
      if (prev.some(c => c.inquiryId === data.inquiryId)) return prev;
      return [data, ...prev].slice(0, 3); // max 3 notifications
    });

    // Auto-dismiss after 60 seconds
    setTimeout(() => {
      setCalls(prev => prev.filter(c => c.inquiryId !== data.inquiryId));
    }, 60000);
  }, []);

  useLiveEvents({ incoming_call: handleIncomingCall });

  const dismiss = (inquiryId: number) => {
    setCalls(prev => prev.filter(c => c.inquiryId !== inquiryId));
  };

  const openLive = (call: IncomingCall) => {
    dismiss(call.inquiryId);
    navigate(`/inquiries/${call.inquiryId}?mode=live`);
  };

  if (calls.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 max-w-sm w-full">
      {calls.map(call => (
        <CallNotification
          key={call.inquiryId}
          call={call}
          onDismiss={() => dismiss(call.inquiryId)}
          onOpen={() => openLive(call)}
        />
      ))}
    </div>
  );
}

function CallNotification({ call, onDismiss, onOpen }: {
  call: IncomingCall;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={cn(
        "bg-card border border-primary/40 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      )}
    >
      {/* Color bar + pulse */}
      <div className="h-1 bg-rose-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-rose-400 animate-pulse" />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            {/* Pulsing phone icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-rose-500/30 rounded-full animate-ping" />
              <div className="relative w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                <Phone className="w-4 h-4 text-rose-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 rounded-full">
                  Incoming Call
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
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 rounded-lg hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="w-full flex items-center justify-center gap-2 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-rose-600/30"
        >
          <ExternalLink className="w-4 h-4" />
          Open Live Intake
        </button>
        {call.isExisting && (
          <p className="text-[10px] text-amber-400 text-center mt-2">Existing inquiry found — updating record</p>
        )}
      </div>
    </div>
  );
}
