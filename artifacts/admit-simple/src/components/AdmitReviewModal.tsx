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
  User, Shield, ClipboardCheck, Calendar, ChevronDown, ChevronUp,
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
  { key: "firstName",            label: "First Name",              check: i => !!i.firstName,                   critical: true },
  { key: "lastName",             label: "Last Name",               check: i => !!i.lastName,                    critical: true },
  { key: "dob",                  label: "Date of Birth",           check: i => !!i.dob,                         critical: true },
  { key: "phone",                label: "Phone Number",            check: i => !!i.phone,                       critical: false },
  { key: "insuranceProvider",    label: "Insurance Provider",      check: i => !!i.insuranceProvider,           critical: true },
  { key: "insuranceMemberId",    label: "Insurance Member ID",     check: i => !!i.insuranceMemberId,           critical: true },
  { key: "levelOfCare",          label: "Level of Care",           check: (_i, e) => !!e.levelOfCare,           critical: true },
  { key: "admitDate",            label: "Admit Date",              check: (_i, e) => !!e.admitDate,             critical: true },
  { key: "preAssessment",        label: "Pre-Assessment Complete", check: i => i.preAssessmentCompleted === "yes", critical: false },
  { key: "vob",                  label: "Insurance Verification",  check: i => !!i.vobData && Object.keys(i.vobData || {}).length > 0, critical: false },
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

      {/* Progress bar */}
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
                {f.critical && isMissing && <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 px-1 rounded">Required</span>}
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
          <AlertTriangle className="w-3 h-3 shrink-0" /> Missing — please update inquiry
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
    <div className="flex items-center gap-2 pt-2">
      <div className="text-primary">{icon}</div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex-1 h-px bg-border/60" />
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
  const [admitDate, setAdmitDate] = useState<string>("");
  const [admitNotes, setAdmitNotes] = useState<string>(inq.notes || "");
  const [isConfirming, setIsConfirming] = useState(false);
  const [admitted, setAdmitted] = useState(false);
  const [showMeterDetails, setShowMeterDetails] = useState(false);

  const extra = { levelOfCare, admitDate };

  // Calculate readiness
  const { score, missing } = useMemo(() => {
    const missing = REQUIRED_FIELDS.filter(f => !f.check(inq, extra));
    const score = Math.round(((REQUIRED_FIELDS.length - missing.length) / REQUIRED_FIELDS.length) * 100);
    return { score, missing };
  }, [inq, extra, levelOfCare, admitDate]);

  const hasCriticalMissing = missing.some(f => f.critical);
  const isMissing = (key: string) => missing.some(f => f.key === key);

  const handleConfirm = async () => {
    if (!admitDate) {
      toast({ title: "Please select an admit date", variant: "destructive" });
      return;
    }
    setIsConfirming(true);
    try {
      await convertToPatient.mutateAsync({
        id: inq.id,
        data: {
          levelOfCare: levelOfCare || inq.levelOfCare || "Detox",
          admitDate: new Date(admitDate).toISOString(),
        },
      });

      // Save notes if changed
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

  // Success screen
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
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
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
            {inq.vobData && Object.keys(inq.vobData || {}).length > 0 && (
              <div className="col-span-2 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Insurance Verification on file
              </div>
            )}
            {isMissing("vob") && (
              <div className="col-span-2 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> No VOB on file — verify insurance before admitting
              </div>
            )}
          </div>

          {/* Clinical */}
          <SectionHead icon={<ClipboardCheck className="w-4 h-4" />} title="Clinical" />
          <div className="space-y-3">
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

          {/* Editable admission fields */}
          <SectionHead icon={<Calendar className="w-4 h-4" />} title="Admission Details" />
          <div className="space-y-3">
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

            <div className="space-y-1.5">
              <Label className={cn("text-sm font-medium", isMissing("admitDate") ? "text-rose-400" : "text-foreground")}>
                Admit Date <span className="text-rose-400">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={admitDate}
                onChange={e => setAdmitDate(e.target.value)}
                className={cn(
                  "h-10 rounded-xl bg-muted border-border text-foreground",
                  isMissing("admitDate") && "border-rose-500/60 ring-2 ring-rose-500/20"
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Admission Notes</Label>
              <Textarea
                value={admitNotes}
                onChange={e => setAdmitNotes(e.target.value)}
                placeholder="Any final notes for the admission..."
                className="min-h-[70px] rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-5 space-y-2 shrink-0">
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || !admitDate}
            className={cn(
              "w-full h-12 rounded-xl font-semibold text-base gap-2 shadow-lg transition-all",
              hasCriticalMissing
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            )}
          >
            {isConfirming ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Admitting patient...</>
            ) : (
              <><UserPlus className="w-5 h-5" /> Confirm & Admit Patient</>
            )}
          </Button>
          {hasCriticalMissing && (
            <p className="text-xs text-amber-400 text-center">
              Some required fields are missing. You can still admit, but update the record afterward.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
