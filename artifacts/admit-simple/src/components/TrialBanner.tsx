import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Clock, AlertCircle, CreditCard, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TrialBanner() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ["/api/billing/status"],
    queryFn: async () => {
      const r = await fetch("/api/billing/status", { credentials: "include" });
      if (!r.ok) return null;
      return r.json() as Promise<{
        subscriptionStatus: string;
        trialDaysLeft: number;
        trialExpired: boolean;
        hasSubscription: boolean;
      }>;
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (!isAdmin || !data || dismissed) return null;

  const { subscriptionStatus, trialDaysLeft, trialExpired, hasSubscription } = data;

  // Don't show if active subscription
  if (subscriptionStatus === "active" || hasSubscription) return null;

  // Only show when 7 days or fewer remain, or expired
  if (!trialExpired && trialDaysLeft > 7) return null;

  const isExpired = trialExpired || subscriptionStatus === "canceled";
  const isPastDue = subscriptionStatus === "past_due";

  const bgCls = isExpired || isPastDue
    ? "bg-destructive/10 border-b border-destructive/30 text-destructive"
    : "bg-amber-500/10 border-b border-amber-500/30 text-amber-400";

  const Icon = isExpired || isPastDue ? AlertCircle : Clock;

  const message = isExpired
    ? "Your free trial has expired. Set up billing to continue using AdmitSimple."
    : isPastDue
    ? "Your payment is past due. Update your payment method to avoid service interruption."
    : `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""}. Set up billing to continue without interruption.`;

  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm ${bgCls}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs gap-1.5 border-current/30 hover:bg-current/10"
          onClick={() => navigate("/settings?tab=billing")}
        >
          <CreditCard className="w-3 h-3" />
          Set up billing
        </Button>
        {!isExpired && (
          <button onClick={() => setDismissed(true)} className="p-1 hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
