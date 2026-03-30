import { useState, useMemo } from "react";
import { useInquiriesMutations } from "@/hooks/use-inquiries";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  X, CheckCircle2, AlertTriangle, Loader2, UserPlus,
  User, Shield, ClipboardCheck, Calendar, ChevronDown, ChevronUp, CalendarCheck, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Required fields definition ─────────────────────────────────────────────────
interface ReqField {
  key: string;
  label: string;
  check: (inq: any, extra: any) => boolean;
  critical?: boolean;
}

const REQUIRED_FIELDS: ReqField[] = [
  { key: "firstName",         label: "First Name",              check: i => !!i.firstName,                        critical: true },
  { key: "lastName",          label: "Last Name",               check: i => !!i.lastName,                         critical: true },
  { key: "dob",               label: "Date of Birth",           check: i => !!i.dob,                              critical: true },
  { key: "phone",             label: "Phone Number",            check: i => !!i.phone,                            critical: false },
  { key: "insuranceProvider", label: "Insurance Provider",      check: i => !!i.insuranceProvider,                critical: true },
  { key: "insuranceMemberId", label: "Insurance Member ID",     check: i => !!i.insuranceMemberId,                critical: true },
  { key: "levelOfCare",       label: "Level of Care",           check: (_i, e) => !!e.levelOfCare,                critical: true },
  { key: "appointment",       label: "Admission Appointment",   check: (_i, e) => !!e.appointmentDate,            critical: true },
  { key: "preAssessment",     label: "Pre-Assessment Complete", check: i => i.preAssessmentCompleted === "yes",   critical: false },
  { key: "vob",               label: "Insurance Verification",  check: i => !!i.vobData && Object.keys(i.vobData || {}).length > 0, critical: false },
];

// ── Readiness meter ────────────────────────────────────────────────────────────
function ReadinessMeter({ score, missing, showDetails, onToggle }: {
  score: number;
  missing: ReqField[];
  showDetails: boolean;
  onToggle: () => void;
}) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";
  const textColor = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admission Readiness</p>
          <p className={cn("text-2xl font-bold mt-0.5", textColor)}>{score}%</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showDetails ? "Hide" : "Details"}
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${score}%` }}
        />
      </div>

      {showDetails && (
        <div className="space-y-1.5 pt-1">
          {REQUIRED_FIELDS.map(f => {
            const isMissing = missing.some(m => m.key === f.key);
            return (
              <div key={f.key} className={cn("flex items-center gap-2 text-xs", isMissing ? "text-rose-400" : "text-muted-foreground")}>
                {isMissing ? (
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
                )}
                {f.label}
                {f.critical && isMissing && (
                  <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 px-1 rounded">Required</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Read-only row ──────────────────────────────────────────────────────────────
function InfoRow({ label, value, missing }: { label: string; value?: string | null; missing?: boolean }) {
  return (
    <div className={cn("space-y-0.5 p-2.5 rounded-lg", missing ? "bg-rose-500/8 border border-rose-500/25" : "bg-muted/30")}>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      {missing ? (
        <p className="text-xs text-rose-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0" /> Missing — update inquiry
        </p>
      ) : (
        <p className="text-sm font-medium text-foreground">{value || "—"}</p>
      )}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="text-primary">{icon}</div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

// ── Appointment Scheduler sub-component ───────────────────────────────────────
function AppointmentScheduler({ inqId, appointmentDate, onSaved }: {
  inqId: number;
  appointmentDate: string | null;
  onSaved: (isoDate: string) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(!appointmentDate);
  const [input, setInput] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleSchedule = async () => {
    if (!input) return;
    setSaving(true);
    try {
      const isoDate = new Date(input).toISOString();
      const resp = await fetch(`/api/inquiries/${inqId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentDate: isoDate }),
      });
      if (!resp.ok) throw new Error();
      onSaved(isoDate);
      setEditing(false);
      setInput("");
      toast({ title: "Admission appointment saved" });
    } catch {
      toast({ title: "Failed to save appointment", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (appointmentDate && !editing) {
    const dt = new Date(appointmentDate);
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-emerald-500/8 border border-emerald-500/25 rounded-xl">
        <div className="flex items-center gap-2.5">
          <CalendarCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scheduled</p>
            <p className="text-sm font-semibold text-foreground">
              {dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              {" at "}
              {dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
        >
          <Pencil className="w-3.5 h-3.5" /> Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 p-3 bg-rose-500/8 border border-rose-500/30 rounded-xl">
      <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        {appointmentDate ? "Change appointment" : "No appointment scheduled — required before admitting"}
      </div>
      <div className="flex gap-2">
        <Input
          type="datetime-local"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="h-9 flex-1 rounded-xl bg-muted border-border text-foreground text-sm"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleSchedule}
          disabled={!input || saving}
          className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-0 shrink-0 px-4"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Schedule"}
        </Button>
        {appointmentDate && editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setEditing(false); setInput(""); }}
            className="h-9 rounded-xl border-border text-foreground shrink-0"
          >
            Cancel
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground/70">
        SMS and calendar reminders require Twilio + Google Calendar integration.
      </p>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export function AdmitReviewModal({ inq, onClose, onAdmitted }: {
  inq: any;
  onClose: () => void;
  onAdmitted: () => void;
}) {
  const { convertToPatient } = useInquiriesMutations();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [levelOfCare, setLevelOfCare] = useState<string>(inq.levelOfCare || "");
  const [appointmentDate, setAppointmentDate] = useState<string | null>(inq.appointmentDate || null);
  const [admitNotes, setAdmitNotes] = useState<string>(inq.notes || "");
  const [isConfirming, setIsConfirming] = useState(false);
  const [admitted, setAdmitted] = useState(false);
  const [showMeterDetails, setShowMeterDetails] = useState(false);

  const extra = { levelOfCare, appointmentDate };

  const { score, missing } = useMemo(() => {
    const missing = REQUIRED_FIELDS.filter(f => !f.check(inq, extra));
    const score = Math.round(((REQUIRED_FIELDS.length - missing.length) / REQUIRED_FIELDS.length) * 100);
    return { score, missing };
  }, [inq, levelOfCare, appointmentDate]);

  const hasCriticalMissing = missing.some(f => f.critical);
  const isMissing = (key: string) => missing.some(f => f.key === key);

  // Appointment is the hard gate — must be set to confirm
  const hasAppointment = !!appointmentDate;

  const handleConfirm = async () => {
    if (!hasAppointment) {
      toast({ title: "Schedule an admission appointment first", variant: "destructive" });
      return;
    }
    setIsConfirming(true);
    try {
      await convertToPatient.mutateAsync({
        id: inq.id,
        data: {
          levelOfCare: levelOfCare || inq.levelOfCare || "Detox",
          admitDate: appointmentDate,
        },
      });

      if (admitNotes !== inq.notes) {
        await fetch(`/api/inquiries/${inq.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: admitNotes }),
        }).catch(() => {});
      }

      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", inq.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });

      setAdmitted(true);
      setTimeout(() => {
        onAdmitted();
        onClose();
      }, 2000);
    } catch {
      // error already toasted by mutation
    } finally {
      setIsConfirming(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (admitted) {
    return (
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-card rounded-2xl border border-emerald-500/30 shadow-2xl w-full max-w-sm p-8 text-center space-y-4 animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Patient Admitted Successfully</h2>
          <p className="text-sm text-muted-foreground">
            {inq.firstName} {inq.lastName} has been admitted and moved to the patient roster.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">Review & Send Admission</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Auto-filled from intake. Only fix anything missing.</p>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            data-testid="close-admit-modal"
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 p-1 rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Readiness meter */}
          <ReadinessMeter
            score={score}
            missing={missing}
            showDetails={showMeterDetails}
            onToggle={() => setShowMeterDetails(v => !v)}
          />

          {/* Patient Info */}
          <SectionHead icon={<User className="w-4 h-4" />} title="Patient Information" />
          <div className="grid grid-cols-2 gap-2">
            <InfoRow label="First Name" value={inq.firstName} />
            <InfoRow label="Last Name" value={inq.lastName} />
            <InfoRow label="Date of Birth" value={inq.dob} missing={isMissing("dob")} />
            <InfoRow label="Phone" value={inq.phone} missing={isMissing("phone")} />
            {(inq.city || inq.state) && (
              <InfoRow label="Location" value={[inq.city, inq.state].filter(Boolean).join(", ")} />
            )}
            {inq.email && <InfoRow label="Email" value={inq.email} />}
          </div>

          {/* Insurance */}
          <SectionHead icon={<Shield className="w-4 h-4" />} title="Insurance" />
          <div className="grid grid-cols-2 gap-2">
            <InfoRow label="Provider" value={inq.insuranceProvider} missing={isMissing("insuranceProvider")} />
            <InfoRow label="Member ID" value={inq.insuranceMemberId} missing={isMissing("insuranceMemberId")} />
            {inq.insuranceGroupNumber && <InfoRow label="Group #" value={inq.insuranceGroupNumber} />}
            {inq.insuranceCarrierPhone && <InfoRow label="Carrier Phone" value={inq.insuranceCarrierPhone} />}
            {inq.vobData && Object.keys(inq.vobData || {}).length > 0 ? (
              <div className="col-span-2 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Insurance Verification on file
              </div>
            ) : (
              <div className="col-span-2 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> No VOB on file — verify insurance before admitting
              </div>
            )}
          </div>

          {/* Clinical */}
          <SectionHead icon={<ClipboardCheck className="w-4 h-4" />} title="Clinical" />
          <div className="space-y-2">
            {inq.primaryDiagnosis && (
              <InfoRow label="Presenting Problem" value={inq.primaryDiagnosis} />
            )}
            {inq.preAssessmentCompleted === "yes" ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Pre-Assessment complete
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Pre-Assessment not yet completed
              </div>
            )}
          </div>

          {/* Admission Details */}
          <SectionHead icon={<Calendar className="w-4 h-4" />} title="Admission Details" />
          <div className="space-y-3">
            {/* Admission Appointment — hard required */}
            <div className="space-y-1.5">
              <Label className={cn(
                "text-sm font-semibold flex items-center gap-1.5",
                !hasAppointment ? "text-rose-400" : "text-foreground"
              )}>
                <CalendarCheck className="w-4 h-4" />
                Admission Appointment <span className="text-rose-400">*</span>
              </Label>
              <AppointmentScheduler
                inqId={inq.id}
                appointmentDate={appointmentDate}
                onSaved={(iso) => {
                  setAppointmentDate(iso);
                  queryClient.invalidateQueries({ queryKey: ["/api/inquiries", inq.id] });
                }}
              />
            </div>

            {/* Level of Care */}
            <div className="space-y-1.5">
              <Label className={cn("text-sm font-medium", isMissing("levelOfCare") ? "text-rose-400" : "text-foreground")}>
                Level of Care {isMissing("levelOfCare") && <span className="text-rose-400">*</span>}
              </Label>
              <Select value={levelOfCare} onValueChange={setLevelOfCare}>
                <SelectTrigger className={cn(
                  "h-10 rounded-xl bg-muted border-border text-foreground",
                  isMissing("levelOfCare") && "border-rose-500/60 ring-2 ring-rose-500/20"
                )}>
                  <SelectValue placeholder="Select level of care" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {["Detox", "RTC", "PHP", "IOP", "OP"].map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Admission Notes</Label>
              <Textarea
                value={admitNotes}
                onChange={e => setAdmitNotes(e.target.value)}
                placeholder="Any final notes for the admission..."
                className="min-h-[60px] rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-5 space-y-2 shrink-0">
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || !hasAppointment}
            className={cn(
              "w-full h-12 rounded-xl font-semibold text-base gap-2 shadow-lg transition-all",
              !hasAppointment
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : hasCriticalMissing
                  ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            )}
          >
            {isConfirming ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Admitting patient...</>
            ) : !hasAppointment ? (
              <><CalendarCheck className="w-5 h-5" /> Schedule an appointment first</>
            ) : (
              <><UserPlus className="w-5 h-5" /> Confirm & Admit Patient</>
            )}
          </Button>
          {!hasAppointment && (
            <p className="text-xs text-rose-400 text-center flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              An admission appointment must be scheduled before confirming.
            </p>
          )}
          {hasAppointment && hasCriticalMissing && (
            <p className="text-xs text-amber-400 text-center">
              Some required fields are missing — update the record after admitting.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
