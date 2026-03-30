import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useGetInquiry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Phone, Clock, Save, CheckCircle2,
  Loader2, XCircle, SendHorizontal, ShieldCheck, CalendarClock,
  PhoneOff,
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
          <button
            type="button"
            onClick={() => onAction("admit")}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15 transition-colors text-sm font-semibold text-left"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <div>Admit Patient</div>
              <div className="text-xs font-normal text-muted-foreground">Open the admission review</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onAction("vob")}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition-colors text-sm font-semibold text-left"
          >
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <div>
              <div>Send / Start VOB</div>
              <div className="text-xs font-normal text-muted-foreground">Begin insurance verification</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onAction("schedule")}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/15 transition-colors text-sm font-semibold text-left"
          >
            <CalendarClock className="w-5 h-5 shrink-0" />
            <div>
              <div>Schedule Appointment</div>
              <div className="text-xs font-normal text-muted-foreground">Set admission date & time</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onAction("refer")}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/15 transition-colors text-sm font-semibold text-left"
          >
            <SendHorizontal className="w-5 h-5 shrink-0" />
            <div>
              <div>Refer Out</div>
              <div className="text-xs font-normal text-muted-foreground">Send to another facility</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onAction("nonadmit")}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/15 transition-colors text-sm font-semibold text-left"
          >
            <XCircle className="w-5 h-5 shrink-0" />
            <div>
              <div>Did Not Admit</div>
              <div className="text-xs font-normal text-muted-foreground">Mark as non-admit</div>
            </div>
          </button>
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

// ── Main Live Call screen ─────────────────────────────────────────────────────
export function LiveCallMode({ id }: { id: number }) {
  const { data: inquiry, refetch } = useGetInquiry(id, { query: { enabled: !!id } });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const timer = useCallTimer();

  const inq = inquiry as any;

  // Local fast-edit state — seeded from inquiry once loaded
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insuranceMemberId, setInsuranceMemberId] = useState("");
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
      setSeeded(true);
    }
  }, [inq, seeded]);

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);

  const save = useCallback(async () => {
    if (!seeded) return;
    setSaveStatus("saving");
    pendingRef.current = false;
    try {
      await fetch(`/api/inquiries/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, dob, insuranceProvider, insuranceMemberId, notes }),
      });
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }, [id, seeded, firstName, lastName, dob, insuranceProvider, insuranceMemberId, notes, queryClient]);

  // Debounced auto-save every 2 seconds after last change
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("idle");
    pendingRef.current = true;
    saveTimer.current = setTimeout(() => {
      if (pendingRef.current) save();
    }, 2000);
  }, [save]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  // "What's Next?" modal
  const [showWhatsNext, setShowWhatsNext] = useState(false);

  const handleEndCall = async () => {
    if (pendingRef.current || saveStatus === "saving") await save();
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

          {/* Active call badge */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-rose-500/40 rounded-full animate-ping" />
              <div className="relative w-2 h-2 bg-rose-500 rounded-full" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Active Call</span>
          </div>

          {/* Save status */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-[56px] justify-end">
            {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Saving</>}
            {saveStatus === "saved" && <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Saved</>}
          </div>
        </div>

        {/* Phone + timer */}
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

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Insurance Provider</Label>
          <Input
            value={insuranceProvider}
            onChange={e => { setInsuranceProvider(e.target.value); scheduleSave(); }}
            placeholder="e.g. Aetna, BlueCross..."
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

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Notes</Label>
          <Textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); scheduleSave(); }}
            placeholder="Type anything said on the call — clinical details, concerns, follow-ups..."
            className="min-h-[160px] rounded-xl bg-muted border-border text-foreground text-base resize-none leading-relaxed"
          />
        </div>

        {/* Manual save button */}
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
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border p-4 pb-safe">
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

      {/* ── What's Next modal ─────────────────────────────────────────────── */}
      {showWhatsNext && (
        <WhatsNextModal
          onClose={() => { setShowWhatsNext(false); window.location.href = `/inquiries/${id}`; }}
          onAction={handleWhatsNextAction}
        />
      )}
    </div>
  );
}
