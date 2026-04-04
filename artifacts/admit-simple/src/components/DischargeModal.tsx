import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, ChevronRight, ChevronLeft, Search, Loader2,
  LogOut, Stethoscope, MapPin, AlertCircle, Building2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  levelOfCare?: string | null;
  status?: string;
}

interface ReferralSourceOption {
  id: number;
  name: string;
  type?: string | null;
  contact?: string | null;
  phone?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DISCHARGE_TYPES = [
  { value: "completed", label: "Completed Successfully", icon: "✅" },
  { value: "ama", label: "Left AMA", icon: "⚠️" },
  { value: "administrative", label: "Administrative Discharge", icon: "📋" },
  { value: "clinical_transfer", label: "Clinical Transfer", icon: "🏥" },
];

const LOC_OPTIONS = ["Detox", "RTC", "PHP", "IOP", "OP", "Other"];

const DESTINATION_OPTIONS = [
  "Home",
  "IOP",
  "Sober Living",
  "Private Practice Therapist",
  "Other",
];

// ── Referral source typeahead ──────────────────────────────────────────────────
function ReferralSourceTypeahead({
  value,
  selectedId,
  onChange,
  placeholder = "Search referral sources…",
}: {
  value: string;
  selectedId?: number | null;
  onChange: (name: string, id?: number) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<ReferralSourceOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/referral-sources/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
        const data = await res.json();
        setOptions(data);
        setOpen(true);
      } catch {}
      setLoading(false);
    }, 300);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value, undefined); search(e.target.value); }}
          onFocus={() => { search(query); }}
          placeholder={placeholder}
          className="h-10 rounded-xl bg-muted border-border text-foreground pl-9"
        />
      </div>
      {open && options.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={() => { setQuery(opt.name); onChange(opt.name, opt.id); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-start gap-2"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{opt.name}</div>
                {opt.type && <div className="text-xs text-muted-foreground">{opt.type}{opt.contact ? ` · ${opt.contact}` : ""}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i < step ? "bg-primary w-6" : i === step ? "bg-primary w-10" : "bg-muted-foreground/30 w-6"
          )}
        />
      ))}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
interface DischargeModalProps {
  patient: Patient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DischargeModal({ patient, open, onOpenChange, onSuccess }: DischargeModalProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [dischargeType, setDischargeType] = useState("");
  const [levelOfCare, setLevelOfCare] = useState(patient.levelOfCare || "");
  const [levelOfCareOther, setLevelOfCareOther] = useState("");
  const [destinationType, setDestinationType] = useState("");
  const [referralSourceName, setReferralSourceName] = useState("");
  const [referralSourceId, setReferralSourceId] = useState<number | null>(null);
  const [hospitalName, setHospitalName] = useState("");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState(false);

  const isClinicalTransfer = dischargeType === "clinical_transfer";
  const needsReferral = !isClinicalTransfer && destinationType && destinationType !== "Home";

  // Validation per step
  const step0Valid = !!dischargeType;
  const step1Valid = !!levelOfCare && (levelOfCare !== "Other" || !!levelOfCareOther);
  const step2Valid = isClinicalTransfer
    ? !!hospitalName
    : !!destinationType && (!needsReferral || !!referralSourceName);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(0);
      setDischargeType("");
      setLevelOfCare(patient.levelOfCare || "");
      setLevelOfCareOther("");
      setDestinationType("");
      setReferralSourceName("");
      setReferralSourceId(null);
      setHospitalName("");
      setNotes("");
      setFollowUp(false);
    }
  }, [open, patient]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/discharges", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          dischargeType,
          levelOfCare: levelOfCare === "Other" ? null : levelOfCare,
          levelOfCareOther: levelOfCare === "Other" ? levelOfCareOther : null,
          destinationType: isClinicalTransfer ? null : destinationType,
          referralSourceId: referralSourceId || null,
          referralSourceName: referralSourceName || null,
          hospitalName: hospitalName || null,
          clinicalTransfer: isClinicalTransfer,
          notes,
          followUp,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Patient discharged", description: `${patient.firstName} ${patient.lastName} has been discharged and added to alumni.` });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", patient.id] });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Discharge failed", description: err.message || "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Discharge Patient</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{patient.firstName} {patient.lastName}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5">
          <StepDots step={step} total={3} />

          {/* ── Step 0: Outcome Type ── */}
          {step === 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <LogOut className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Outcome Type</h3>
              </div>
              <div className="space-y-2">
                {DISCHARGE_TYPES.map(dt => (
                  <button
                    key={dt.value}
                    type="button"
                    onClick={() => setDischargeType(dt.value)}
                    className={cn(
                      "w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all flex items-center gap-3",
                      dischargeType === dt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <span className="text-lg">{dt.icon}</span>
                    <span className="font-medium text-sm">{dt.label}</span>
                    {dischargeType === dt.value && (
                      <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1: Level of Care ── */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Level of Care at Discharge</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LOC_OPTIONS.map(loc => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => { setLevelOfCare(loc); if (loc !== "Other") setLevelOfCareOther(""); }}
                    className={cn(
                      "px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                      levelOfCare === loc
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {loc}
                  </button>
                ))}
              </div>
              {levelOfCare === "Other" && (
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Specify Level of Care</Label>
                  <Input
                    value={levelOfCareOther}
                    onChange={e => setLevelOfCareOther(e.target.value)}
                    placeholder="e.g. Outpatient MAT, Partial Hospitalization…"
                    className="h-10 rounded-xl bg-muted border-border text-foreground"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Destination ── */}
          {step === 2 && (
            <div className="space-y-4">
              {isClinicalTransfer ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Clinical Transfer Details</h3>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Hospital / Facility Name *</Label>
                    <Input
                      value={hospitalName}
                      onChange={e => setHospitalName(e.target.value)}
                      placeholder="Hospital or facility name…"
                      className="h-10 rounded-xl bg-muted border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Referral Source (optional)</Label>
                    <ReferralSourceTypeahead
                      value={referralSourceName}
                      selectedId={referralSourceId}
                      onChange={(name, id) => { setReferralSourceName(name); setReferralSourceId(id ?? null); }}
                      placeholder="Search referral sources…"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Discharge Destination</h3>
                  </div>
                  <div className="space-y-2">
                    {DESTINATION_OPTIONS.map(dest => (
                      <button
                        key={dest}
                        type="button"
                        onClick={() => { setDestinationType(dest); if (dest === "Home") { setReferralSourceName(""); setReferralSourceId(null); } }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-between",
                          destinationType === dest
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        <span>{dest}</span>
                        {destinationType === dest && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                  {needsReferral && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        Referral Destination *
                        <span className="ml-1 text-amber-400">(required for {destinationType})</span>
                      </Label>
                      <ReferralSourceTypeahead
                        value={referralSourceName}
                        selectedId={referralSourceId}
                        onChange={(name, id) => { setReferralSourceName(name); setReferralSourceId(id ?? null); }}
                        placeholder="Search referral sources…"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Notes & follow-up */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional discharge notes…"
                  className="h-20 rounded-xl bg-muted border-border text-foreground resize-none text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => setFollowUp(v => !v)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-between",
                  followUp
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40"
                )}
              >
                <span>📅 Follow-up needed</span>
                {followUp && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </button>
            </div>
          )}

          {/* ── Confirm screen (step 3) ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-foreground">Confirm Discharge</h3>
              </div>
              <div className="bg-muted/60 rounded-xl p-4 space-y-2.5 text-sm">
                <Row label="Patient" value={`${patient.firstName} ${patient.lastName}`} />
                <Row label="Outcome" value={DISCHARGE_TYPES.find(d => d.value === dischargeType)?.label ?? dischargeType} />
                <Row label="Level of Care" value={levelOfCare === "Other" ? levelOfCareOther : levelOfCare} />
                {!isClinicalTransfer && <Row label="Destination" value={destinationType} />}
                {isClinicalTransfer && <Row label="Hospital" value={hospitalName} />}
                {referralSourceName && <Row label="Referral" value={referralSourceName} />}
                {followUp && <Row label="Follow-up" value="Yes" />}
                {notes && <Row label="Notes" value={notes} />}
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300">
                This will set the patient status to <strong>discharged</strong> and mark them as an <strong>alumni</strong>. This action cannot be undone automatically.
              </div>
            </div>
          )}
        </div>

        {/* ── Footer navigation ── */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="gap-1.5 text-muted-foreground">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground">Cancel</Button>
          )}

          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 ? !step0Valid : step === 1 ? !step1Valid : !step2Valid}
              className="gap-1.5 bg-[#5BC8DC] hover:bg-[#4ab5c9] text-white"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={submitting}
              className="gap-1.5 bg-rose-500 hover:bg-rose-600 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm Discharge
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}
