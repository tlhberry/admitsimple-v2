import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, X, Send, FileText, Copy, CheckCircle2, AlertTriangle, ShieldAlert, Pill } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type FacesheetData = {
  // Demographics
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  email: string;
  // Section 1: Admission Details
  levelOfCare: string;
  admitDate: string;
  eta: string;
  bed: string;
  // Section 2: Financial Snapshot
  insuranceProvider: string;
  insuranceMemberId: string;
  insuranceGroupNumber: string;
  vobVerified: "yes" | "no" | "pending";
  estimatedCost: string;
  paymentDecision: string;
  // Section 3: Risk Flags (toggles)
  detoxRequired: "yes" | "no";
  suicideRisk: "yes" | "no";
  medicalConcern: "yes" | "no";
  // Section 4: Key Notes
  keyNotes: string;
  // Section 5: Logistics
  arrivalMethod: string;
  bringingMedications: "yes" | "no";
  familyContact: string;
};

function buildEmailSubject(data: FacesheetData): string {
  const lastInitial = data.lastName?.charAt(0) || "";
  const admitDateStr = data.admitDate
    ? new Date(data.admitDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "TBD";
  const eta = data.eta || "TBD";
  return `ADMIT ${data.firstName} ${lastInitial} - ${data.levelOfCare || "LOC TBD"} - ${admitDateStr} - ETA ${eta}`;
}

function buildEmailBody(data: FacesheetData): string {
  const line = (label: string, value: string) => `${label}: ${value || "—"}`;
  const flag = (label: string, val: "yes" | "no") => `${val === "yes" ? "⚠ YES" : "✓ No"}  ${label}`;

  const riskSection = [
    flag("Detox Required", data.detoxRequired),
    flag("Suicide Risk", data.suicideRisk),
    flag("Medical Concern", data.medicalConcern),
  ].join("\n");

  const keyNotesFormatted = data.keyNotes
    ? data.keyNotes
        .split("\n")
        .filter(Boolean)
        .map(l => `• ${l.replace(/^[•\-]\s*/, "")}`)
        .join("\n")
    : "—";

  return [
    "===== ADMISSION FACESHEET =====",
    "",
    "── DEMOGRAPHICS ──────────────────────────────",
    line("Full Name", `${data.firstName} ${data.lastName}`),
    line("Date of Birth", data.dob),
    line("Phone", data.phone),
    line("Email", data.email),
    "",
    "── ADMISSION DETAILS ─────────────────────────",
    line("Level of Care", data.levelOfCare),
    line("Admit Date", data.admitDate ? new Date(data.admitDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""),
    line("ETA", data.eta),
    line("Bed Assignment", data.bed),
    "",
    "── FINANCIAL SNAPSHOT ────────────────────────",
    line("Insurance Provider", data.insuranceProvider),
    line("Member ID", data.insuranceMemberId),
    line("Group #", data.insuranceGroupNumber),
    line("Insurance Verified", data.vobVerified),
    line("Estimated Cost", data.estimatedCost),
    line("Payment Decision", data.paymentDecision),
    "",
    "── RISK FLAGS ────────────────────────────────",
    riskSection,
    "",
    "── KEY NOTES ─────────────────────────────────",
    keyNotesFormatted,
    "",
    "── LOGISTICS ─────────────────────────────────",
    line("Arrival Method", data.arrivalMethod),
    line("Bringing Medications", data.bringingMedications),
    line("Family Contact", data.familyContact),
    "",
    "==============================================",
    "Sent via AdmitSimple Admissions CRM",
  ].join("\n");
}

type SectionProps = { title: string; children: React.ReactNode };
function Section({ title, children }: SectionProps) {
  return (
    <div>
      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="flex-1 h-px bg-border" />
        {title}
        <span className="flex-1 h-px bg-border" />
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn(wide && "sm:col-span-2")}>
      <Label className="text-xs font-semibold text-muted-foreground mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function RiskToggle({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: "yes" | "no";
  onChange: (v: "yes" | "no") => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(value === "yes" ? "no" : "yes")}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
        value === "yes"
          ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
          : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
      )}
    >
      <span className={cn("w-4 h-4 shrink-0", value === "yes" ? "text-rose-400" : "text-muted-foreground/50")}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <span className={cn("text-xs font-bold tracking-wide", value === "yes" ? "text-rose-400" : "text-muted-foreground/40")}>
        {value === "yes" ? "YES" : "NO"}
      </span>
    </button>
  );
}

const inputCls = "h-9 rounded-xl bg-muted border-border text-foreground text-sm";
const textareaCls = "rounded-xl bg-muted border-border text-foreground text-sm resize-none";

type Props = {
  inquiry: any;
  onClose: () => void;
};

export function FacesheetModal({ inquiry, onClose }: Props) {
  const { toast } = useToast();

  const { data: settings } = useQuery<any[]>({
    queryKey: ["/api/settings"],
    queryFn: () => fetch("/api/settings", { credentials: "include" }).then(r => r.json()),
    staleTime: 60000,
  });
  const settingsMap = (settings ?? []).reduce<Record<string, string>>((acc, s) => { acc[s.key] = s.value || ""; return acc; }, {});
  const recipient = settingsMap["admission_email_recipient"] || "";

  const todayStr = new Date().toISOString().split("T")[0];

  const preScreening = inquiry?.preScreeningData as any;
  const nursing = inquiry?.nursingAssessmentData as any;
  const vob = inquiry?.vobData as any;

  // Derive risk flags from pre-screening data
  const hasSuicideRisk =
    preScreening?.suicidalIdeation &&
    preScreening.suicidalIdeation !== "None" &&
    preScreening.suicidalIdeation !== "";
  const hasWithdrawal =
    Array.isArray(preScreening?.withdrawalSymptoms) && preScreening.withdrawalSymptoms.length > 0;
  const hasMedicalConcern =
    !!(nursing?.medicalConditions || preScreening?.medicalConditions || nursing?.medicalConcern);

  // Build key notes from pre-assessment summary
  const rawNotes = [
    inquiry?.preAssessmentNotes,
    preScreening?.additionalNotes,
    nursing?.additionalNotes,
  ].filter(Boolean).join("\n");

  const [data, setData] = useState<FacesheetData>({
    firstName: inquiry?.firstName || "",
    lastName: inquiry?.lastName || "",
    dob: inquiry?.dob || "",
    phone: inquiry?.phone || "",
    email: inquiry?.email || "",
    levelOfCare: inquiry?.levelOfCare || "",
    admitDate: inquiry?.appointmentDate
      ? new Date(inquiry.appointmentDate).toISOString().split("T")[0]
      : todayStr,
    eta: "",
    bed: "",
    insuranceProvider: inquiry?.insuranceProvider || vob?.provider || "",
    insuranceMemberId: inquiry?.insuranceMemberId || vob?.memberId || "",
    insuranceGroupNumber: vob?.groupNumber || "",
    vobVerified: vob?.status === "verified" ? "yes" : "pending",
    estimatedCost: vob?.estimatedCost || "",
    paymentDecision: inquiry?.costAcceptance || "",
    detoxRequired: hasWithdrawal ? "yes" : "no",
    suicideRisk: hasSuicideRisk ? "yes" : "no",
    medicalConcern: hasMedicalConcern ? "yes" : "no",
    keyNotes: rawNotes || "",
    arrivalMethod: "",
    bringingMedications: "no",
    familyContact: "",
  });

  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const set = (key: keyof FacesheetData, value: string) =>
    setData(prev => ({ ...prev, [key]: value }));

  const subject = buildEmailSubject(data);
  const body = buildEmailBody(data);

  const handleSendEmail = () => {
    if (!recipient) {
      toast({
        title: "No email recipient configured",
        description: "Please set the Admission Email Recipient in Admin Settings → Admissions.",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
    setTimeout(() => {
      setSending(false);
      toast({ title: "Email client opened", description: `Sending to ${recipient}` });
      onClose();
    }, 500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Facesheet copied to clipboard" });
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-base">Admission Facesheet</h2>
              <p className="text-xs text-muted-foreground">Review and edit before sending to clinical team</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Subject preview */}
        <div className="px-6 py-3 bg-emerald-500/5 border-b border-border">
          <p className="text-xs text-muted-foreground font-semibold mb-0.5">EMAIL SUBJECT</p>
          <p className="text-sm font-mono text-emerald-400 truncate">{subject}</p>
        </div>

        {/* Recipient */}
        <div className="px-6 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground w-16 shrink-0">TO:</span>
            {recipient ? (
              <span className="text-sm text-foreground font-medium">{recipient}</span>
            ) : (
              <span className="text-sm text-amber-400 italic">
                ⚠ No recipient set — configure in Admin Settings → Admissions
              </span>
            )}
          </div>
        </div>

        {/* Editable form */}
        <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[60vh]">

          {/* Demographics */}
          <Section title="Demographics">
            <Field label="First Name">
              <Input value={data.firstName} onChange={e => set("firstName", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Last Name">
              <Input value={data.lastName} onChange={e => set("lastName", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Date of Birth">
              <Input value={data.dob} onChange={e => set("dob", e.target.value)} className={inputCls} placeholder="MM/DD/YYYY" />
            </Field>
            <Field label="Phone">
              <Input value={data.phone} onChange={e => set("phone", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Email" wide>
              <Input value={data.email} onChange={e => set("email", e.target.value)} className={inputCls} type="email" />
            </Field>
          </Section>

          {/* Section 1: Admission Details */}
          <Section title="Admission Details">
            <Field label="Level of Care">
              <Select value={data.levelOfCare || "none"} onValueChange={v => set("levelOfCare", v === "none" ? "" : v)}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select LOC" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="Detox">Detox</SelectItem>
                  <SelectItem value="Residential">Residential (Res)</SelectItem>
                  <SelectItem value="PHP">PHP</SelectItem>
                  <SelectItem value="IOP">IOP</SelectItem>
                  <SelectItem value="OP">Outpatient (OP)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Admit Date">
              <Input type="date" value={data.admitDate} onChange={e => set("admitDate", e.target.value)} className={inputCls} />
            </Field>
            <Field label="ETA">
              <Input value={data.eta} onChange={e => set("eta", e.target.value)} className={inputCls} placeholder="e.g. 3:00 PM" />
            </Field>
            <Field label="Bed Assignment">
              <Input value={data.bed} onChange={e => set("bed", e.target.value)} className={inputCls} placeholder="e.g. 12A" />
            </Field>
          </Section>

          {/* Section 2: Financial Snapshot */}
          <Section title="Financial Snapshot">
            <Field label="Insurance Provider">
              <Input value={data.insuranceProvider} onChange={e => set("insuranceProvider", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Insurance Verified">
              <Select value={data.vobVerified} onValueChange={v => set("vobVerified", v as any)}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="yes">Yes — Verified</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estimated Cost">
              <Input value={data.estimatedCost} onChange={e => set("estimatedCost", e.target.value)} className={inputCls} placeholder="e.g. $1,500 deductible" />
            </Field>
            <Field label="Payment Decision">
              <Select value={data.paymentDecision || "none"} onValueChange={v => set("paymentDecision", v === "none" ? "" : v)}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="Accepts">Accepts Cost</SelectItem>
                  <SelectItem value="Cannot Pay">Cannot Pay</SelectItem>
                  <SelectItem value="Pending">Pending Decision</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Section>

          {/* Section 3: Risk Flags */}
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="flex-1 h-px bg-border" />
              Risk Flags
              <span className="flex-1 h-px bg-border" />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <RiskToggle
                label="Detox Required"
                value={data.detoxRequired}
                onChange={v => set("detoxRequired", v)}
                icon={<Pill className="w-4 h-4" />}
              />
              <RiskToggle
                label="Suicide Risk"
                value={data.suicideRisk}
                onChange={v => set("suicideRisk", v)}
                icon={<ShieldAlert className="w-4 h-4" />}
              />
              <RiskToggle
                label="Medical Concern"
                value={data.medicalConcern}
                onChange={v => set("medicalConcern", v)}
                icon={<AlertTriangle className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Section 4: Key Notes */}
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="flex-1 h-px bg-border" />
              Key Notes
              <span className="flex-1 h-px bg-border" />
            </h3>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Short bullet points — one per line</Label>
              <Textarea
                value={data.keyNotes}
                onChange={e => set("keyNotes", e.target.value)}
                className={cn(textareaCls, "min-h-[80px]")}
                rows={4}
                placeholder={"Daily alcohol use, 8+ years\nHypertension, liver disease\nMitrazapine 15mg nightly"}
              />
            </div>
          </div>

          {/* Section 5: Logistics */}
          <Section title="Logistics">
            <Field label="Arrival Method">
              <Select value={data.arrivalMethod || "none"} onValueChange={v => set("arrivalMethod", v === "none" ? "" : v)}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="How are they arriving?" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="Self">Self — Driving</SelectItem>
                  <SelectItem value="Family">Family — Drop off</SelectItem>
                  <SelectItem value="Uber/Lyft">Uber / Lyft</SelectItem>
                  <SelectItem value="Transport Service">Transport Service</SelectItem>
                  <SelectItem value="Law Enforcement">Law Enforcement</SelectItem>
                  <SelectItem value="Ambulance">Ambulance</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Bringing Medications">
              <Select value={data.bringingMedications} onValueChange={v => set("bringingMedications", v as any)}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Family / Emergency Contact" wide>
              <Input
                value={data.familyContact}
                onChange={e => set("familyContact", e.target.value)}
                className={inputCls}
                placeholder="Name, relationship, phone"
              />
            </Field>
          </Section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied
              ? <><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
              : <><Copy className="w-4 h-4" /> Copy to clipboard</>
            }
          </button>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" className="h-9 px-4 rounded-xl border-border text-foreground hover:bg-muted text-sm">
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sending}
              className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex gap-2 text-sm border-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Admission Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
