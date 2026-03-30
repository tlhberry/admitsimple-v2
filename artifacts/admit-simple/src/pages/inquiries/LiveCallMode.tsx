import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
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

// ── "What's Next?" modal ──────────────────────────────────────────────────────
function WhatsNextModal({ onClose, onAction }: {
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">What's Next?</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Call has ended — choose a next step</p>
        </div>
        <div className="p-4 space-y-2.5">
          {[
            { action: "admit", icon: CheckCircle2, label: "Admit Patient", desc: "Open the admission review", color: "emerald" },
            { action: "vob", icon: ShieldCheck, label: "Send / Start VOB", desc: "Begin insurance verification", color: "primary" },
            { action: "schedule", icon: CalendarClock, label: "Schedule Appointment", desc: "Set admission date & time", color: "indigo" },
            { action: "refer", icon: SendHorizontal, label: "Refer Out", desc: "Send to another facility", color: "amber" },
            { action: "nonadmit", icon: XCircle, label: "Did Not Admit", desc: "Mark as non-admit", color: "rose" },
          ].map(({ action, icon: Icon, label, desc, color }) => (
            <button
              key={action}
              type="button"
              onClick={() => onAction(action)}
              className={cn(
                "w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors text-sm font-semibold text-left",
                color === "emerald" && "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15",
                color === "primary" && "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15",
                color === "indigo" && "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/15",
                color === "amber" && "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15",
                color === "rose" && "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/15",
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <div>
                <div>{label}</div>
                <div className="text-xs font-normal text-muted-foreground">{desc}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 pt-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl transition-colors"
          >
            Keep reviewing later
          </button>
        </div>
      </div>
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
const REFERRAL_OPTIONS = ["Google PPC", "Organic Google", "Therapist", "Hospital", "Previous Client", "Other"];
const SUBSTANCE_OPTIONS = ["Alcohol", "Opioids", "Benzos", "Stimulants", "Marijuana", "Multiple", "Other"];
const RELATIONSHIP_OPTIONS = ["Mother", "Father", "Spouse", "Friend", "Other"];

// ── Main Live Call screen ─────────────────────────────────────────────────────
export function LiveCallMode({ id }: { id: number }) {
  const { data: inquiry, refetch } = useGetInquiry(id, { query: { enabled: !!id } });
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
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
  const [referralSource, setReferralSource] = useState("none");
  const [referralSourceOther, setReferralSourceOther] = useState("");
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
      const src = inq.referralSource || inq.ctmSource || "";
      setReferralSource(REFERRAL_OPTIONS.includes(src) ? src : src ? "Other" : "none");
      if (src && !REFERRAL_OPTIONS.includes(src) && src !== "none") setReferralSourceOther(src);
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

    const resolvedReferralSource =
      referralSource === "none" ? "" :
      referralSource === "Other" ? referralSourceOther :
      referralSource;

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
          referralSource: resolvedReferralSource,
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
    referralSource, referralSourceOther, presentingProblem, levelOfCareItems, primarySubstance,
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

  const handleWhatsNextAction = (action: string) => {
    setShowWhatsNext(false);
    const base = `/inquiries/${id}`;
    if (action === "admit") window.location.href = `${base}?intent=admit`;
    else if (action === "vob") window.location.href = `${base}?tab=vob`;
    else if (action === "schedule") window.location.href = `${base}?tab=overview&scroll=appointment`;
    else if (action === "refer") window.location.href = `${base}?intent=refer`;
    else if (action === "nonadmit") window.location.href = `${base}?intent=nonadmit`;
    else window.location.href = base;
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
                Patient Phone Number <span className="text-rose-400">*</span>
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
          <LiveSelect value={referralSource} onChange={v => { setReferralSource(v); scheduleSave(); }}>
            <option value="none">Select source…</option>
            {REFERRAL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </LiveSelect>
          {referralSource === "Other" && (
            <Input
              value={referralSourceOther}
              onChange={e => { setReferralSourceOther(e.target.value); scheduleSave(); }}
              placeholder="Specify source…"
              className="h-11 rounded-xl bg-muted border-border text-foreground text-base mt-2"
            />
          )}
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
          onClose={() => { setShowWhatsNext(false); window.location.href = `/inquiries/${id}`; }}
          onAction={handleWhatsNextAction}
        />
      )}
    </div>
  );
}
