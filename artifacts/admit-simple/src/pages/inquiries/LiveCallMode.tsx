import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useGetInquiry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLiveEvents } from "@/hooks/use-live-events";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Phone, Clock, Save, CheckCircle2,
  Loader2, XCircle, SendHorizontal, ShieldCheck, CalendarClock,
  PhoneOff, Lock, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReferralSourceInput } from "@/components/ReferralSourceInput";

// ── Call timer ────────────────────────────────────────────────────────────────
function useCallTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const s = (elapsed % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── "What's Next?" post-call automation modal ────────────────────────────────
const DNA_REASONS = [
  "Not clinically appropriate",
  "Insurance issue",
  "Financial",
  "Not ready",
  "Other",
];

const REFER_LOC_OPTIONS = ["Detox", "Residential", "PHP", "IOP"];

function WhatsNextModal({
  inquiryId, patientName, dob, phone, email,
  insuranceProvider, insuranceMemberId, referralSource, notes,
  onClose,
}: {
  inquiryId: number;
  patientName: string;
  dob: string;
  phone: string;
  email: string;
  insuranceProvider: string;
  insuranceMemberId: string;
  referralSource: string;
  notes: string;
  onClose: () => void;
}) {
  type Step =
    | "menu"
    | "vob_success"
    | "refer_loc" | "refer_search" | "refer_message" | "refer_success"
    | "dna_reason" | "dna_success";

  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("menu");
  const [loading, setLoading] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralSearch, setReferralSearch] = useState("");
  const [selectedLOC, setSelectedLOC] = useState("");
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [dnaReason, setDnaReason] = useState("none");

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  // ── VOB ──────────────────────────────────────────────────────────────────
  const handleVOB = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/call-outcome`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vob_sent" }),
      });
      const data = await res.json();
      const billingEmail = data.billingEmail || "";
      const subject = encodeURIComponent(`New VOB Request – ${patientName}`);
      const body = encodeURIComponent(
        `New VOB Request\n\n` +
        `Patient: ${patientName}\n` +
        `DOB: ${dob}\n` +
        `Insurance: ${insuranceProvider}\n` +
        `Member ID: ${insuranceMemberId}\n` +
        `Phone: ${phone}\n` +
        `Referral Source: ${referralSource}\n\n` +
        `Notes:\n${notes}`
      );
      window.open(`mailto:${billingEmail}?subject=${subject}&body=${body}`, "_blank");
      setStep("vob_success");
    } catch {}
    setLoading(false);
  };

  // ── Refer Out ─────────────────────────────────────────────────────────────
  const startRefer = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referrals", { credentials: "include" });
      const data = await res.json();
      setReferrals(data);
    } catch {}
    setLoading(false);
    setStep("refer_loc");
  };

  const filteredReferrals = referrals.filter(r =>
    !referralSearch || r.name?.toLowerCase().includes(referralSearch.toLowerCase())
      || r.city?.toLowerCase().includes(referralSearch.toLowerCase())
  );

  const sendReferralMsg = (r: any) => {
    const msg =
      `Hi! Here's a treatment option we discussed:\n\n` +
      `${r.name}` +
      (r.phone ? `\n📞 ${r.phone}` : "") +
      (r.address ? `\n📍 ${r.address}` : "") +
      `\n\nLet me know if you'd like help getting started.`;
    if (isMobile) {
      navigate(`/active-calls?sms=${encodeURIComponent(phone)}`);
    } else {
      const subject = encodeURIComponent(`Treatment Referral – ${r.name}`);
      window.open(`mailto:${email || ""}?subject=${subject}&body=${encodeURIComponent(msg)}`, "_blank");
    }
  };

  const handleReferSelect = (r: any) => {
    setSelectedReferral(r);
    setStep("refer_message");
  };

  const handleCreateReferral = async () => {
    const name = referralSearch.trim();
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: "facility" }),
      });
      const created = await res.json();
      setReferrals(prev => [...prev, created]);
      handleReferSelect(created);
    } catch {}
    setLoading(false);
  };

  const handleReferSend = async () => {
    if (!selectedReferral) return;
    sendReferralMsg(selectedReferral);
    await fetch(`/api/inquiries/${inquiryId}/call-outcome`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "referred_out", referralSourceName: selectedReferral.name, levelOfCare: selectedLOC }),
    });
    setStep("refer_success");
  };

  // ── Did Not Admit ─────────────────────────────────────────────────────────
  const handleDNA = async () => {
    const msg = `Thanks for calling today. If anything changes or you need help in the future, feel free to reach out. We're here when you're ready.`;
    if (isMobile) {
      navigate(`/active-calls?sms=${encodeURIComponent(phone)}`);
    } else {
      window.open(`mailto:${email || ""}?body=${encodeURIComponent(msg)}`, "_blank");
    }
    await fetch(`/api/inquiries/${inquiryId}/call-outcome`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "did_not_admit", reason: dnaReason === "none" ? "" : dnaReason }),
    });
    setStep("dna_success");
  };

  // ── Shared UI helpers ─────────────────────────────────────────────────────
  const ModalShell = ({ title, subtitle, back, children }: {
    title: string; subtitle?: string; back?: () => void; children: React.ReactNode;
  }) => (
    <div className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl w-full max-w-sm">
      <div className="p-5 border-b border-border flex items-center gap-3">
        {back && (
          <button type="button" onClick={back} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );

  const SuccessView = ({ icon: Icon, color, title, subtitle }: { icon: any; color: string; title: string; subtitle: string }) => (
    <div className="p-8 flex flex-col items-center text-center gap-4">
      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center",
        color === "primary" ? "bg-primary/15 border border-primary/30" : "",
        color === "emerald" ? "bg-emerald-500/15 border border-emerald-500/30" : "",
        color === "amber" ? "bg-amber-500/15 border border-amber-500/30" : "",
        color === "rose" ? "bg-rose-500/15 border border-rose-500/30" : "",
      )}>
        <Icon className={cn("w-8 h-8",
          color === "primary" ? "text-primary" : "",
          color === "emerald" ? "text-emerald-400" : "",
          color === "amber" ? "text-amber-400" : "",
          color === "rose" ? "text-rose-400" : "",
        )} />
      </div>
      <div>
        <p className="font-bold text-foreground text-base">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={() => window.location.href = `/inquiries/${inquiryId}`}
        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-sm transition-colors"
      >
        View Inquiry
      </button>
    </div>
  );

  // ── Render steps ─────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── MENU ────────────────────────────────────────────────────── */}
      {step === "menu" && (
        <ModalShell title="What's Next?" subtitle="Call has ended — choose a next step">
          <div className="p-4 space-y-2.5">
            <button
              type="button"
              onClick={handleVOB}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border bg-primary/10 border-primary/20 text-primary hover:bg-primary/15 transition-colors text-sm font-semibold text-left disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : <ShieldCheck className="w-5 h-5 shrink-0" />}
              <div>
                <div>Send / Start VOB</div>
                <div className="text-xs font-normal text-muted-foreground">Email billing + move to Insurance stage</div>
              </div>
            </button>
            <button
              type="button"
              onClick={startRefer}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15 transition-colors text-sm font-semibold text-left disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : <SendHorizontal className="w-5 h-5 shrink-0" />}
              <div>
                <div>Refer Out</div>
                <div className="text-xs font-normal text-muted-foreground">Find a facility + send patient info</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStep("dna_reason")}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/15 transition-colors text-sm font-semibold text-left"
            >
              <XCircle className="w-5 h-5 shrink-0" />
              <div>
                <div>Did Not Admit</div>
                <div className="text-xs font-normal text-muted-foreground">Close + send follow-up message</div>
              </div>
            </button>
          </div>
          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-10 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl transition-colors"
            >
              Keep reviewing later
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── VOB SUCCESS ──────────────────────────────────────────────── */}
      {step === "vob_success" && (
        <ModalShell title="VOB Sent">
          <SuccessView icon={ShieldCheck} color="primary" title="VOB email opened" subtitle="Inquiry moved to Insurance Verification. Complete the email in your mail app." />
        </ModalShell>
      )}

      {/* ── REFER: Step 1 — Level of Care ────────────────────────────── */}
      {step === "refer_loc" && (
        <ModalShell title="Refer Out" subtitle="What level of care are they looking for?" back={() => setStep("menu")}>
          <div className="p-4 space-y-2">
            {REFER_LOC_OPTIONS.map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => { setSelectedLOC(loc); setStep("refer_search"); }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/40 hover:bg-muted hover:border-primary/30 transition-colors text-sm font-semibold text-foreground text-left"
              >
                {loc}
                <ChevronDown className="w-4 h-4 text-muted-foreground rotate-[-90deg]" />
              </button>
            ))}
          </div>
        </ModalShell>
      )}

      {/* ── REFER: Step 2 — Search facilities ────────────────────────── */}
      {step === "refer_search" && (
        <ModalShell title={`Find ${selectedLOC} Facility`} subtitle="Search your referral network" back={() => setStep("refer_loc")}>
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={referralSearch}
                onChange={e => setReferralSearch(e.target.value)}
                placeholder="Search by name or city…"
                autoFocus
                className="w-full h-11 rounded-xl bg-muted border border-border text-foreground text-sm pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {filteredReferrals.length === 0 && !referralSearch.trim() && (
                <p className="text-center text-muted-foreground text-sm py-6">Type to search your referral network</p>
              )}
              {filteredReferrals.slice(0, 20).map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleReferSelect(r)}
                  className="w-full text-left p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted hover:border-primary/30 transition-colors"
                >
                  <div className="font-semibold text-sm text-foreground">{r.name}</div>
                  {(r.address || r.phone) && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.address && <span>{r.address}</span>}
                      {r.address && r.phone && " · "}
                      {r.phone && <span>{r.phone}</span>}
                    </div>
                  )}
                </button>
              ))}
            </div>
            {referralSearch.trim().length >= 2 && (
              <button
                type="button"
                onClick={handleCreateReferral}
                disabled={loading}
                className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-colors text-left"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm leading-none">+</span>
                  </div>
                )}
                <div>
                  <span className="text-sm font-semibold text-primary">Add &ldquo;{referralSearch.trim()}&rdquo;</span>
                  <span className="text-xs text-muted-foreground block">Create new referral account</span>
                </div>
              </button>
            )}
          </div>
        </ModalShell>
      )}

      {/* ── REFER: Step 3 — Confirm & send ───────────────────────────── */}
      {step === "refer_message" && selectedReferral && (
        <ModalShell title="Send Referral" subtitle={isMobile ? "Opens your SMS app" : "Opens your email client"} back={() => setStep("refer_search")}>
          <div className="p-4 space-y-4">
            <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-1">
              <p className="font-semibold text-foreground text-sm">{selectedReferral.name}</p>
              {selectedReferral.phone && <p className="text-xs text-muted-foreground">📞 {selectedReferral.phone}</p>}
              {selectedReferral.address && <p className="text-xs text-muted-foreground">📍 {selectedReferral.address}</p>}
            </div>
            <div className="bg-muted/20 border border-border/50 rounded-xl p-3.5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                "Hi! Here's a treatment option we discussed:<br /><br />
                <span className="font-semibold text-foreground">{selectedReferral.name}</span>
                {selectedReferral.phone && <><br />📞 {selectedReferral.phone}</>}
                <br /><br />Let me know if you'd like help getting started."
              </p>
            </div>
            <button
              type="button"
              onClick={handleReferSend}
              className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <SendHorizontal className="w-4 h-4" />
              {isMobile ? "Send Text" : "Send Email"}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── REFER SUCCESS ─────────────────────────────────────────────── */}
      {step === "refer_success" && (
        <ModalShell title="Referred Out">
          <SuccessView icon={SendHorizontal} color="amber" title="Referral sent" subtitle={`Patient referred to ${selectedReferral?.name}. Inquiry marked as Referred Out.`} />
        </ModalShell>
      )}

      {/* ── DID NOT ADMIT: Step 1 — Reason ───────────────────────────── */}
      {step === "dna_reason" && (
        <ModalShell title="Did Not Admit" subtitle="Optional: select a reason" back={() => setStep("menu")}>
          <div className="p-4 space-y-3">
            <LiveSelect value={dnaReason} onChange={setDnaReason}>
              <option value="none">Select reason (optional)…</option>
              {DNA_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </LiveSelect>
            <p className="text-xs text-muted-foreground px-1">
              A follow-up message will be {isMobile ? "texted" : "emailed"} to the {phone ? "caller" : "inquiry"}.
            </p>
            <button
              type="button"
              onClick={handleDNA}
              className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Close &amp; Send Follow-Up
            </button>
            <button
              type="button"
              onClick={async () => {
                await fetch(`/api/inquiries/${inquiryId}/call-outcome`, {
                  method: "POST", credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "did_not_admit", reason: dnaReason === "none" ? "" : dnaReason }),
                });
                window.location.href = `/inquiries/${inquiryId}`;
              }}
              className="w-full h-10 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl transition-colors"
            >
              Mark without messaging
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── DID NOT ADMIT SUCCESS ─────────────────────────────────────── */}
      {step === "dna_success" && (
        <ModalShell title="Did Not Admit">
          <SuccessView icon={XCircle} color="rose" title="Marked as Did Not Admit" subtitle="Follow-up message sent. Inquiry updated." />
        </ModalShell>
      )}
    </div>
  );
}

// ── Read-only lock banner ─────────────────────────────────────────────────────
function LockedByOtherBanner({ repName, inquiryId }: { repName: string; inquiryId: number }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 bg-background border-b border-border/60 px-4 py-3 flex items-center justify-between">
        <Link
          href={`/inquiries/${inquiryId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Inquiry
        </Link>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full">
          Read Only
        </span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <Lock className="w-10 h-10 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Call Locked</h2>
          <p className="text-muted-foreground mt-2 max-w-xs">
            This call is currently being handled by{" "}
            <span className="text-foreground font-semibold">{repName}</span>.
            You can view the inquiry but cannot edit it during the live call.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/inquiries/${inquiryId}`}
            className="flex items-center gap-2 h-11 px-6 border border-border rounded-xl text-sm font-medium text-foreground hover:border-primary/40 transition-colors"
          >
            View Inquiry
          </Link>
          <Link
            href="/calls/active"
            className="flex items-center gap-2 h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold transition-colors"
          >
            <Phone className="w-4 h-4" /> Active Calls
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-1">
      <div className="h-px flex-1 bg-border/50" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">{label}</span>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

// ── Styled select ─────────────────────────────────────────────────────────────
function LiveSelect({ value, onChange, children, disabled }: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-12 rounded-xl bg-muted border border-border text-foreground text-base px-3 pr-9 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}

const LOC_OPTIONS = ["Detox", "Residential", "PHP", "IOP"] as const;
const SUBSTANCE_OPTIONS = ["Alcohol", "Opioids", "Benzos", "Stimulants", "Marijuana", "Multiple", "Other"];
const RELATIONSHIP_OPTIONS = ["Mother", "Father", "Spouse", "Friend", "Other"];

// ── Main Live Call screen ─────────────────────────────────────────────────────
export function LiveCallMode({ id }: { id: number }) {
  const { data: inquiry, refetch } = useGetInquiry(id, { query: { enabled: !!id } });
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const timer = useCallTimer();

  const inq = inquiry as any;
  const currentUserId = (user as any)?.id;

  // Ownership state
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [isOwnedByOther, setIsOwnedByOther] = useState(false);
  const [claimAttempted, setClaimAttempted] = useState(false);

  // Auto-claim when entering live mode (if unclaimed)
  useEffect(() => {
    if (!inq || claimAttempted) return;
    setClaimAttempted(true);

    const doCheck = async () => {
      if (inq.isLocked && inq.assignedTo && inq.assignedTo !== currentUserId) {
        setOwnerName(inq.assignedToName || "Another rep");
        setIsOwnedByOther(true);
        return;
      }

      if (!inq.isLocked) {
        try {
          const res = await fetch(`/api/inquiries/${id}/claim`, {
            method: "POST",
            credentials: "include",
          });
          if (res.status === 409) {
            const data = await res.json();
            setOwnerName(data.claimedBy || "Another rep");
            setIsOwnedByOther(true);
          }
        } catch {}
      }
    };

    doCheck();
  }, [inq, id, currentUserId, claimAttempted]);

  // Listen for call_claimed events
  useLiveEvents({
    call_claimed: useCallback((data: any) => {
      if (data.inquiryId === id && data.repId !== currentUserId) {
        setOwnerName(data.repName);
        setIsOwnedByOther(true);
        toast({
          title: "Call claimed by another rep",
          description: `${data.repName} has taken this call`,
          variant: "destructive",
        });
      }
    }, [id, currentUserId, toast]),
  });

  // ── Form state ───────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");

  // "Caller is NOT the patient" toggle
  const [callerIsNotPatient, setCallerIsNotPatient] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [callerRelationship, setCallerRelationship] = useState("none");
  const [patientPhone, setPatientPhone] = useState("");

  // Call intake
  const [referralSource, setReferralSource] = useState("");
  const [presentingProblem, setPresentingProblem] = useState("");
  const [levelOfCareItems, setLevelOfCareItems] = useState<string[]>([]);
  const [primarySubstance, setPrimarySubstance] = useState("none");

  // Insurance
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insuranceMemberId, setInsuranceMemberId] = useState("");

  // Notes
  const [notes, setNotes] = useState("");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (inq && !seeded) {
      setFirstName(inq.firstName || "");
      setLastName(inq.lastName || "");
      setDob(inq.dob || "");
      setInsuranceProvider(inq.insuranceProvider || "");
      setInsuranceMemberId(inq.insuranceMemberId || "");
      setNotes(inq.notes || "");

      // Caller toggle
      setCallerIsNotPatient(inq.callerIsNotPatient || false);
      setCallerName(inq.callerName || "");
      setCallerPhone(inq.phone || ""); // auto-fill from CTM phone
      setCallerRelationship(inq.callerRelationship || "none");
      setPatientPhone(inq.patientPhone || "");

      // Call intake
      setReferralSource(inq.referralSource || inq.ctmSource || "");
      setPresentingProblem(inq.presentingProblem || "");
      const loc = inq.levelOfCare || "";
      setLevelOfCareItems(loc ? loc.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
      setPrimarySubstance(inq.primarySubstance || "none");

      setSeeded(true);
    }
  }, [inq, seeded]);

  // ── Auto-save ────────────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);

  const save = useCallback(async () => {
    if (!seeded || isOwnedByOther) return;
    setSaveStatus("saving");
    pendingRef.current = false;

    try {
      await fetch(`/api/inquiries/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, dob,
          insuranceProvider, insuranceMemberId, notes,
          // Caller toggle
          callerIsNotPatient,
          callerName: callerIsNotPatient ? callerName : "",
          callerRelationship: callerIsNotPatient ? (callerRelationship === "none" ? "" : callerRelationship) : "",
          patientPhone: callerIsNotPatient ? patientPhone : "",
          // Call intake
          referralSource,
          presentingProblem,
          levelOfCare: levelOfCareItems.join(", "),
          primarySubstance: primarySubstance === "none" ? "" : primarySubstance,
        }),
      });
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }, [
    id, seeded, isOwnedByOther,
    firstName, lastName, dob, insuranceProvider, insuranceMemberId, notes,
    callerIsNotPatient, callerName, callerPhone, callerRelationship, patientPhone,
    referralSource, presentingProblem, levelOfCareItems, primarySubstance,
    queryClient,
  ]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("idle");
    pendingRef.current = true;
    saveTimer.current = setTimeout(() => {
      if (pendingRef.current) save();
    }, 2000);
  }, [save]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const [showWhatsNext, setShowWhatsNext] = useState(false);

  const handleEndCall = async () => {
    if (pendingRef.current || saveStatus === "saving") await save();
    try {
      await fetch(`/api/inquiries/${id}/complete-call`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    setShowWhatsNext(true);
  };


  // ── Level of care toggle helper ──────────────────────────────────────────
  const toggleLOC = (option: string) => {
    setLevelOfCareItems(prev =>
      prev.includes(option) ? prev.filter(x => x !== option) : [...prev, option]
    );
    scheduleSave();
  };

  if (isOwnedByOther) {
    return <LockedByOtherBanner repName={ownerName || "Another rep"} inquiryId={id} />;
  }

  const phone = inq?.phone || "Unknown Number";
  const name = [inq?.firstName, inq?.lastName].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background border-b border-border/60">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href={`/inquiries/${id}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-rose-500/40 rounded-full animate-ping" />
              <div className="relative w-2 h-2 bg-rose-500 rounded-full" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Active Call</span>
            <span className="text-xs text-muted-foreground ml-1">— You own this</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-[56px] justify-end">
            {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Saving</>}
            {saveStatus === "saved" && <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Saved</>}
          </div>
        </div>

        <div className="px-4 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground font-mono tracking-tight truncate">{phone}</p>
            {name && <p className="text-xs text-muted-foreground">{name}</p>}
          </div>
          <div className="flex items-center gap-1.5 text-rose-400 font-mono font-bold text-lg shrink-0">
            <Clock className="w-4 h-4" />
            {timer}
          </div>
        </div>
      </div>

      {/* ── Fast entry form ───────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-5 space-y-4 max-w-lg mx-auto w-full pb-32">

        {/* ── Patient Info ─────────────────────────────────────── */}
        <SectionHeader label="Patient Info" />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">First Name</Label>
            <Input
              value={firstName}
              onChange={e => { setFirstName(e.target.value); scheduleSave(); }}
              placeholder="First"
              className="h-12 rounded-xl bg-muted border-border text-foreground text-base"
              autoComplete="given-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">Last Name</Label>
            <Input
              value={lastName}
              onChange={e => { setLastName(e.target.value); scheduleSave(); }}
              placeholder="Last"
              className="h-12 rounded-xl bg-muted border-border text-foreground text-base"
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Date of Birth</Label>
          <Input
            type="date"
            value={dob}
            onChange={e => { setDob(e.target.value); scheduleSave(); }}
            className="h-12 rounded-xl bg-muted border-border text-foreground text-base"
          />
        </div>

        {/* Caller is NOT the patient toggle */}
        <label className="flex items-center gap-3 cursor-pointer bg-muted/40 border border-border rounded-xl px-4 py-3 hover:bg-muted/60 transition-colors">
          <input
            type="checkbox"
            checked={callerIsNotPatient}
            onChange={e => {
              setCallerIsNotPatient(e.target.checked);
              scheduleSave();
            }}
            className="w-4 h-4 rounded accent-primary cursor-pointer"
          />
          <span className="text-sm font-semibold text-foreground">Caller is NOT the patient</span>
        </label>

        {callerIsNotPatient && (
          <div className="space-y-3 pl-4 border-l-2 border-primary/30">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primary Contact (Caller)</p>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Caller Name</Label>
              <Input
                value={callerName}
                onChange={e => { setCallerName(e.target.value); scheduleSave(); }}
                placeholder="Full name of caller"
                className="h-12 rounded-xl bg-muted border-border text-foreground text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Caller Phone</Label>
              <Input
                value={callerPhone}
                onChange={e => { setCallerPhone(e.target.value); scheduleSave(); }}
                placeholder="Caller's phone number"
                className="h-12 rounded-xl bg-muted border-border text-foreground text-base font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Relationship to Patient</Label>
              <LiveSelect value={callerRelationship} onChange={v => { setCallerRelationship(v); scheduleSave(); }}>
                <option value="none">Select relationship…</option>
                {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </LiveSelect>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">
                Patient Phone Number <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                value={patientPhone}
                onChange={e => { setPatientPhone(e.target.value); scheduleSave(); }}
                placeholder="Patient's direct number"
                className="h-12 rounded-xl bg-muted border-border text-foreground text-base font-mono"
              />
            </div>
          </div>
        )}

        {/* ── Call Intake ──────────────────────────────────────── */}
        <SectionHeader label="Call Intake" />

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Referral Source</Label>
          <ReferralSourceInput
            value={referralSource}
            onChange={name => { setReferralSource(name); scheduleSave(); }}
            placeholder="Type to search or enter free text…"
            inputClassName="h-12 rounded-xl bg-muted border-border text-foreground text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Presenting Problem</Label>
          <Textarea
            value={presentingProblem}
            onChange={e => { setPresentingProblem(e.target.value); scheduleSave(); }}
            placeholder="Why are they calling?"
            className="min-h-[72px] max-h-[96px] rounded-xl bg-muted border-border text-foreground text-base resize-none leading-relaxed"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">What are they calling about?</Label>
          <div className="grid grid-cols-2 gap-2">
            {LOC_OPTIONS.map(opt => {
              const checked = levelOfCareItems.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleLOC(opt)}
                  className={cn(
                    "flex items-center gap-2.5 h-11 px-4 rounded-xl border text-sm font-semibold transition-colors text-left",
                    checked
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                    checked ? "bg-primary border-primary" : "border-muted-foreground/40"
                  )}>
                    {checked && <CheckCircle2 className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Primary Substance</Label>
          <LiveSelect value={primarySubstance} onChange={v => { setPrimarySubstance(v); scheduleSave(); }}>
            <option value="none">Select substance…</option>
            {SUBSTANCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </LiveSelect>
        </div>

        {/* ── Insurance ────────────────────────────────────────── */}
        <SectionHeader label="Insurance" />

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Insurance Provider</Label>
          <Input
            value={insuranceProvider}
            onChange={e => { setInsuranceProvider(e.target.value); scheduleSave(); }}
            placeholder="e.g. Aetna, BlueCross…"
            className="h-12 rounded-xl bg-muted border-border text-foreground text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Member ID</Label>
          <Input
            value={insuranceMemberId}
            onChange={e => { setInsuranceMemberId(e.target.value); scheduleSave(); }}
            placeholder="Insurance member ID"
            className="h-12 rounded-xl bg-muted border-border text-foreground text-base font-mono"
          />
        </div>

        {/* ── Call Tracking Notes (bottom, de-emphasized) ───────── */}
        <SectionHeader label="Call Tracking Notes" />

        <Textarea
          value={notes}
          onChange={e => { setNotes(e.target.value); scheduleSave(); }}
          placeholder="CTM metadata, call details, follow-ups…"
          className="min-h-[80px] max-h-[120px] rounded-xl bg-muted/60 border-border/70 text-muted-foreground text-sm resize-none leading-relaxed"
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => save()}
          disabled={saveStatus === "saving"}
          className="w-full h-11 rounded-xl border-border text-foreground gap-2"
        >
          {saveStatus === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Now
        </Button>
      </div>

      {/* ── Sticky "End Call" footer ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border p-4">
        <div className="max-w-lg mx-auto">
          <Button
            type="button"
            onClick={handleEndCall}
            className="w-full h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white border-0 gap-3 font-bold text-base shadow-lg shadow-rose-600/25"
          >
            <PhoneOff className="w-5 h-5" />
            End Call — What's Next?
          </Button>
        </div>
      </div>

      {showWhatsNext && (
        <WhatsNextModal
          inquiryId={id}
          patientName={[firstName, lastName].filter(Boolean).join(" ") || inq?.firstName || "Patient"}
          dob={dob}
          phone={callerPhone || patientPhone || inq?.phone || ""}
          email={inq?.email || ""}
          insuranceProvider={insuranceProvider}
          insuranceMemberId={insuranceMemberId}
          referralSource={referralSource}
          notes={notes}
          onClose={() => { setShowWhatsNext(false); window.location.href = `/inquiries/${id}`; }}
        />
      )}
    </div>
  );
}
