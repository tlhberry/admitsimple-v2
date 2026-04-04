import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Clock, Loader2, Download, ClipboardCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ReferralSourceInput, ReferralContactInput } from "@/components/ReferralSourceInput";

// ── Simple debounce hook ─────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function fetchForm(inquiryId: number, path: string) {
  const res = await fetch(`/api/inquiries/${inquiryId}/${path}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load form");
  return res.json();
}

async function saveForm(inquiryId: number, path: string, formData: Record<string, any>, isComplete: string) {
  const res = await fetch(`/api/inquiries/${inquiryId}/${path}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formData, isComplete }),
  });
  if (!res.ok) throw new Error("Failed to save form");
  return res.json();
}

// ── Status badge ──────────────────────────────────────────────────────────────
function TabBadge({ complete }: { complete: boolean }) {
  return complete ? (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 mt-0.5"><CheckCircle2 className="w-3 h-3" /></span>
  ) : (
    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mt-0.5" />
  );
}

// ── Save indicator ────────────────────────────────────────────────────────────
function SaveStatus({ status }: { status: "idle" | "saving" | "saved" }) {
  if (status === "idle") return null;
  return (
    <span className={cn("text-xs flex items-center gap-1", status === "saving" ? "text-muted-foreground" : "text-emerald-400")}>
      {status === "saving" ? <><Loader2 className="w-3 h-3 animate-spin" />Saving...</> : <>✓ Saved</>}
    </span>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-border pb-2 mb-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
  );
}

// ── Field label ───────────────────────────────────────────────────────────────
function FL({ children }: { children: React.ReactNode }) {
  return <Label className="text-sm font-medium text-foreground">{children}</Label>;
}

const inputCls = "mt-1.5 rounded-lg bg-muted border-border text-foreground placeholder:text-muted-foreground h-9";
const textareaCls = "mt-1.5 rounded-lg bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none min-h-[80px]";
const selectTriggerCls = "mt-1.5 rounded-lg bg-muted border-border text-foreground h-9";

// ════════════════════════════════════════════════════════════════════════════════
// FORM 1: RB Pre-Cert / Clinical Pre-Assessment
// ════════════════════════════════════════════════════════════════════════════════
const DEFAULT_PRECERT = {
  presentingProblem: "",
  primarySubstance: "", lastUsed: "", firstUsed: "", frequency: "",
  amount: "", route: "", method: "", treatmentHistory: "",
  severityOfIllness: "", withdrawalSymptoms: [] as string[], withdrawalNotes: "",
  psychosocialNotes: "", medicalConditions: "", medications: "", allergies: "",
  mentalHealthHistory: "", suicidalIdeation: "", homicidalIdeation: "",
  legalIssues: "", familyHistory: "", additionalNotes: "",
};

const WITHDRAWAL_SYMPTOMS = [
  "Tremors", "Sweating", "Nausea/Vomiting", "Anxiety", "Insomnia",
  "Agitation", "Hallucinations", "Seizure History", "Elevated HR", "Elevated BP",
];

function Form1PreCert({ inquiryId, onComplete, inquiry }: { inquiryId: number; onComplete: (done: boolean) => void; inquiry?: any }) {
  const [data, setData] = useState(DEFAULT_PRECERT);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isComplete, setIsComplete] = useState(false);
  const debouncedData = useDebounce(data, 1000);
  const { toast } = useToast();
  const initialized = useQuery({
    queryKey: ["pre-cert-form", inquiryId],
    queryFn: () => fetchForm(inquiryId, "pre-cert-form"),
    staleTime: 0,
  });

  useEffect(() => {
    if (initialized.data) {
      const existing = initialized.data.formData || {};
      const seeded: Partial<typeof DEFAULT_PRECERT> = {};
      if (!existing.presentingProblem && inquiry?.notes) seeded.presentingProblem = inquiry.notes;
      if (!existing.primarySubstance && inquiry?.substanceHistory) seeded.primarySubstance = inquiry.substanceHistory;
      if (!existing.mentalHealthHistory && inquiry?.mentalHealthHistory) seeded.mentalHealthHistory = inquiry.mentalHealthHistory;
      if (!existing.medicalConditions && inquiry?.medicalHistory) seeded.medicalConditions = inquiry.medicalHistory;
      setData({ ...DEFAULT_PRECERT, ...seeded, ...existing });
      setIsComplete(initialized.data.isComplete === "yes");
      onComplete(initialized.data.isComplete === "yes");
    }
  }, [initialized.data]);

  const isFirstRender = useState(true);
  useEffect(() => {
    if (isFirstRender[0]) { isFirstRender[1](false); return; }
    if (!initialized.data) return;
    setSaveStatus("saving");
    saveForm(inquiryId, "pre-cert-form", debouncedData, isComplete ? "yes" : "no")
      .then(() => { setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); })
      .catch(() => setSaveStatus("idle"));
  }, [debouncedData]);

  const handleMarkComplete = async () => {
    try {
      setSaveStatus("saving");
      await saveForm(inquiryId, "pre-cert-form", data, "yes");
      setIsComplete(true);
      onComplete(true);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      toast({ title: "Pre-Cert form marked complete" });
    } catch { toast({ title: "Failed to save", variant: "destructive" }); setSaveStatus("idle"); }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setData(d => ({ ...d, [key]: e.target.value }));

  const setVal = (key: string, val: string) => setData(d => ({ ...d, [key]: val }));

  const toggleSymptom = (sym: string) =>
    setData(d => ({
      ...d,
      withdrawalSymptoms: d.withdrawalSymptoms.includes(sym)
        ? d.withdrawalSymptoms.filter(s => s !== sym)
        : [...d.withdrawalSymptoms, sym],
    }));

  if (initialized.isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-7">
      <SectionHeader title="Presenting Problem" />
      <div>
        <FL>Presenting Problem / Chief Complaint</FL>
        <Textarea value={data.presentingProblem} onChange={set("presentingProblem")} placeholder="Auto-populated from intake form. Describe the client's presenting concern or reason for seeking treatment..." className={textareaCls} />
      </div>

      <SectionHeader title="Substance Use History" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          ["primarySubstance", "Primary Substance", "Substance"],
          ["lastUsed", "Last Used", "Last Used"],
          ["firstUsed", "First Used", "First Used"],
          ["frequency", "Frequency", "Frequency"],
          ["amount", "Amount", "Amount"],
          ["route", "Route", "Route"],
          ["method", "Method", "Method"],
        ].map(([key, label, placeholder]) => (
          <div key={key}>
            <FL>{label}</FL>
            <Input value={(data as any)[key]} onChange={set(key)} placeholder={placeholder} className={inputCls} />
          </div>
        ))}
      </div>

      <SectionHeader title="Treatment History" />
      <div>
        <FL>Previous Treatment</FL>
        <Textarea value={data.treatmentHistory} onChange={set("treatmentHistory")} placeholder="Previous treatment episodes, dates, facilities, outcomes..." className={textareaCls} />
      </div>

      <SectionHeader title="Severity of Illness" />
      <div>
        <FL>Severity</FL>
        <Select value={data.severityOfIllness} onValueChange={v => setVal("severityOfIllness", v)}>
          <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select severity..." /></SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="passive">Passive</SelectItem>
            <SelectItem value="active_no_plan">Active – No Plan</SelectItem>
            <SelectItem value="active_with_plan">Active – With Plan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <SectionHeader title="Withdrawal Symptoms" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {WITHDRAWAL_SYMPTOMS.map(sym => (
          <label key={sym} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border cursor-pointer hover:bg-muted/60 transition-colors">
            <Checkbox
              checked={data.withdrawalSymptoms.includes(sym)}
              onCheckedChange={() => toggleSymptom(sym)}
              className="border-border"
            />
            <span className="text-sm text-foreground">{sym}</span>
          </label>
        ))}
      </div>
      <div>
        <FL>Additional Withdrawal Notes</FL>
        <Textarea value={data.withdrawalNotes} onChange={set("withdrawalNotes")} placeholder="Additional withdrawal notes..." className={textareaCls} />
      </div>

      <SectionHeader title="Psychosocial Information" />
      <div className="space-y-4">
        <div><FL>Psychosocial Notes</FL><Textarea value={data.psychosocialNotes} onChange={set("psychosocialNotes")} placeholder="Living situation, employment, support system, stressors..." className={textareaCls} /></div>
        <div><FL>Medical Conditions</FL><Textarea value={data.medicalConditions} onChange={set("medicalConditions")} placeholder="Current medical conditions..." className={textareaCls} /></div>
        <div><FL>Current Medications</FL><Textarea value={data.medications} onChange={set("medications")} placeholder="List current medications..." className={textareaCls} /></div>
        <div><FL>Allergies</FL><Textarea value={data.allergies} onChange={set("allergies")} placeholder="Known allergies..." className={textareaCls} /></div>
        <div><FL>Mental Health History</FL><Textarea value={data.mentalHealthHistory} onChange={set("mentalHealthHistory")} placeholder="Prior diagnoses, hospitalizations..." className={textareaCls} /></div>
        <div>
          <FL>Suicidal Ideation</FL>
          <Select value={data.suicidalIdeation} onValueChange={v => setVal("suicidalIdeation", v)}>
            <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Passive">Passive</SelectItem>
              <SelectItem value="Active – No Plan">Active – No Plan</SelectItem>
              <SelectItem value="Active – With Plan">Active – With Plan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FL>Homicidal Ideation</FL>
          <Select value={data.homicidalIdeation} onValueChange={v => setVal("homicidalIdeation", v)}>
            <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Passive">Passive</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><FL>Legal Issues</FL><Textarea value={data.legalIssues} onChange={set("legalIssues")} placeholder="Pending charges, probation, court dates..." className={textareaCls} /></div>
        <div><FL>Family History</FL><Textarea value={data.familyHistory} onChange={set("familyHistory")} placeholder="Family history of substance use, mental health..." className={textareaCls} /></div>
        <div><FL>Additional Notes</FL><Textarea value={data.additionalNotes} onChange={set("additionalNotes")} placeholder="Any other relevant information..." className={textareaCls} /></div>
      </div>

      <div className="pt-2 border-t border-border flex justify-between items-center">
        <SaveStatus status={saveStatus} />
        <Button
          onClick={handleMarkComplete}
          disabled={isComplete}
          className={cn("rounded-xl h-10 px-6", isComplete ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : "bg-primary")}
        >
          {isComplete ? <><CheckCircle2 className="w-4 h-4 mr-2" />Pre-Cert Complete</> : "Mark Pre-Cert Complete"}
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// FORM 2: Nursing Admission Assessment
// ════════════════════════════════════════════════════════════════════════════════
const DEFAULT_NURSING = {
  bloodPressure: "", heartRate: "", temperature: "", respiratoryRate: "",
  oxygenSaturation: "", weight: "", height: "",
  allergies: "", allergiesNotes: "",
  reviewOfSystemsNotes: "", reviewOfSystemsFindings: "",
  painLocation: "", painLevel: "", painNotes: "",
  suicideRiskLevel: "", suicideRiskNotes: "",
  nutritionalNotes: "", dietaryRestrictions: "",
  generalAppearanceNotes: "", orientationStatus: "",
  additionalNursingNotes: "",
};

function Form2Nursing({ inquiryId, onComplete }: { inquiryId: number; onComplete: (done: boolean) => void }) {
  const [data, setData] = useState(DEFAULT_NURSING);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isComplete, setIsComplete] = useState(false);
  const debouncedData = useDebounce(data, 1000);
  const { toast } = useToast();

  const initialized = useQuery({
    queryKey: ["nursing-assessment", inquiryId],
    queryFn: () => fetchForm(inquiryId, "nursing-assessment"),
    staleTime: 0,
  });

  useEffect(() => {
    if (initialized.data) {
      setData({ ...DEFAULT_NURSING, ...(initialized.data.formData || {}) });
      setIsComplete(initialized.data.isComplete === "yes");
      onComplete(initialized.data.isComplete === "yes");
    }
  }, [initialized.data]);

  const isFirstRender = useState(true);
  useEffect(() => {
    if (isFirstRender[0]) { isFirstRender[1](false); return; }
    if (!initialized.data) return;
    setSaveStatus("saving");
    saveForm(inquiryId, "nursing-assessment", debouncedData, isComplete ? "yes" : "no")
      .then(() => { setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); })
      .catch(() => setSaveStatus("idle"));
  }, [debouncedData]);

  const handleMarkComplete = async () => {
    try {
      setSaveStatus("saving");
      await saveForm(inquiryId, "nursing-assessment", data, "yes");
      setIsComplete(true);
      onComplete(true);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      toast({ title: "Nursing Assessment marked complete" });
    } catch { toast({ title: "Failed to save", variant: "destructive" }); setSaveStatus("idle"); }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setData(d => ({ ...d, [key]: e.target.value }));
  const setVal = (key: string, val: string) => setData(d => ({ ...d, [key]: val }));

  if (initialized.isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-7">
      <SectionHeader title="Vital Signs" />
      <div className="grid grid-cols-2 gap-4">
        {[
          ["bloodPressure", "Blood Pressure", "120/80"],
          ["heartRate", "Heart Rate", "72 bpm"],
          ["temperature", "Temperature", "98.6°F"],
          ["respiratoryRate", "Respiratory Rate", "16/min"],
          ["oxygenSaturation", "Oxygen Saturation", "98%"],
          ["weight", "Weight", "165 lbs"],
          ["height", "Height", "5ft 10in"],
        ].map(([key, label, placeholder]) => (
          <div key={key}>
            <FL>{label}</FL>
            <Input value={(data as any)[key]} onChange={set(key)} placeholder={placeholder} className={inputCls} />
          </div>
        ))}
      </div>

      <SectionHeader title="Allergies" />
      <div><FL>Allergies</FL><Textarea value={data.allergies} onChange={set("allergies")} placeholder="List all known allergies and reactions..." className={textareaCls} /></div>

      <SectionHeader title="Review of Systems" />
      <div className="space-y-4">
        <div>
          <FL>Findings</FL>
          <Select value={data.reviewOfSystemsFindings} onValueChange={v => setVal("reviewOfSystemsFindings", v)}>
            <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="abnormal">Abnormal</SelectItem>
              <SelectItem value="not_assessed">Not Assessed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><FL>Notes</FL><Textarea value={data.reviewOfSystemsNotes} onChange={set("reviewOfSystemsNotes")} placeholder="Notes on any abnormal findings..." className={textareaCls} /></div>
      </div>

      <SectionHeader title="Pain Screen" />
      <div className="space-y-4">
        <div>
          <FL>Pain Level</FL>
          <Select value={data.painLevel} onValueChange={v => setVal("painLevel", v)}>
            <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select level..." /></SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="No Pain">No Pain</SelectItem>
              {Array.from({ length: 10 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><FL>Location</FL><Input value={data.painLocation} onChange={set("painLocation")} placeholder="Location..." className={inputCls} /></div>
        <div><FL>Notes</FL><Textarea value={data.painNotes} onChange={set("painNotes")} placeholder="Pain notes..." className={textareaCls} /></div>
      </div>

      <SectionHeader title="Suicide Risk Questionnaire" />
      <div className="space-y-4">
        <div>
          <FL>Risk Level</FL>
          <Select value={data.suicideRiskLevel} onValueChange={v => setVal("suicideRiskLevel", v)}>
            <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Moderate">Moderate</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Imminent">Imminent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><FL>Notes</FL><Textarea value={data.suicideRiskNotes} onChange={set("suicideRiskNotes")} placeholder="Risk assessment notes, safety plan..." className={textareaCls} /></div>
      </div>

      <SectionHeader title="Nutritional Screen" />
      <div className="space-y-4">
        <div><FL>Nutritional Notes</FL><Textarea value={data.nutritionalNotes} onChange={set("nutritionalNotes")} placeholder="Nutritional status, eating patterns, concerns..." className={textareaCls} /></div>
        <div><FL>Dietary Restrictions</FL><Textarea value={data.dietaryRestrictions} onChange={set("dietaryRestrictions")} placeholder="Dietary restrictions..." className={textareaCls} /></div>
      </div>

      <SectionHeader title="General Appearance" />
      <div className="space-y-4">
        <div><FL>General Appearance Notes</FL><Textarea value={data.generalAppearanceNotes} onChange={set("generalAppearanceNotes")} placeholder="Hygiene, grooming, affect..." className={textareaCls} /></div>
        <div>
          <FL>Orientation Status</FL>
          <Select value={data.orientationStatus} onValueChange={v => setVal("orientationStatus", v)}>
            <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="Oriented x4">Oriented x4</SelectItem>
              <SelectItem value="Oriented x3">Oriented x3</SelectItem>
              <SelectItem value="Confused">Confused</SelectItem>
              <SelectItem value="Unresponsive">Unresponsive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SectionHeader title="Additional Nursing Notes" />
      <div><FL>Additional Nursing Observations</FL><Textarea value={data.additionalNursingNotes} onChange={set("additionalNursingNotes")} placeholder="Additional nursing observations and notes..." className={textareaCls} /></div>

      <div className="pt-2 border-t border-border flex justify-between items-center">
        <SaveStatus status={saveStatus} />
        <Button onClick={handleMarkComplete} disabled={isComplete} className={cn("rounded-xl h-10 px-6", isComplete ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : "bg-primary")}>
          {isComplete ? <><CheckCircle2 className="w-4 h-4 mr-2" />Nursing Assessment Complete</> : "Mark Nursing Assessment Complete"}
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// FORM 3: Pre-Screening
// ════════════════════════════════════════════════════════════════════════════════
const DEFAULT_PRESCREENING = {
  referralSource: "", referralSourceOther: "", referralContact: "", referralPhone: "",
  levelOfCareInterest: "", insuranceType: "", hasInsurance: "",
  hasLegalIssues: "", isCourtOrdered: "", isOnProbation: "", hasRegisteredOffenses: "", legalDetails: "",
  mentalHealthDiagnoses: "", psychiatricHospitalizations: "", currentMedications: "",
  primarySubstance: "", lastUseDate: "", substanceUseHistory: "", previousTreatment: "",
  motivationLevel: "", barriers: "",
  programRecommendation: "", recommendationNotes: "", screeningNotes: "",
};

const REFERRAL_SOURCE_OPTIONS = [
  "Self-Referral", "Family/Friend", "Hospital/ER", "Therapist/Counselor",
  "Doctor/Physician", "Detox/Treatment Center", "Court/Probation",
  "Employer/EAP", "Online/Website", "Insurance Company", "Other",
];

function Form3PreScreening({ inquiryId, onComplete, inquiry }: { inquiryId: number; onComplete: (done: boolean) => void; inquiry?: any }) {
  const [data, setData] = useState(DEFAULT_PRESCREENING);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isComplete, setIsComplete] = useState(false);
  const debouncedData = useDebounce(data, 1000);
  const { toast } = useToast();

  const initialized = useQuery({
    queryKey: ["pre-screening", inquiryId],
    queryFn: () => fetchForm(inquiryId, "pre-screening"),
    staleTime: 0,
  });

  useEffect(() => {
    if (initialized.data) {
      const existing = initialized.data.formData || {};
      const seeded: Partial<typeof DEFAULT_PRESCREENING> = {};
      if (!existing.referralSource && inquiry?.referralSource) seeded.referralSource = inquiry.referralSource;
      if (!existing.referralContact && inquiry?.referralContact) seeded.referralContact = inquiry.referralContact;
      if (!existing.primarySubstance && inquiry?.substanceHistory) seeded.primarySubstance = inquiry.substanceHistory;
      if (!existing.mentalHealthDiagnoses && inquiry?.mentalHealthHistory) seeded.mentalHealthDiagnoses = inquiry.mentalHealthHistory;
      if (!existing.currentMedications && inquiry?.medicalHistory) seeded.currentMedications = inquiry.medicalHistory;
      if (!existing.levelOfCareInterest && inquiry?.levelOfCare) seeded.levelOfCareInterest = inquiry.levelOfCare;
      if (!existing.substanceUseHistory && inquiry?.substanceHistory) seeded.substanceUseHistory = inquiry.substanceHistory;
      setData({ ...DEFAULT_PRESCREENING, ...seeded, ...existing });
      setIsComplete(initialized.data.isComplete === "yes");
      onComplete(initialized.data.isComplete === "yes");
    }
  }, [initialized.data]);

  const isFirstRender = useState(true);
  useEffect(() => {
    if (isFirstRender[0]) { isFirstRender[1](false); return; }
    if (!initialized.data) return;
    setSaveStatus("saving");
    saveForm(inquiryId, "pre-screening", debouncedData, isComplete ? "yes" : "no")
      .then(() => { setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); })
      .catch(() => setSaveStatus("idle"));
  }, [debouncedData]);

  const handleMarkComplete = async () => {
    try {
      setSaveStatus("saving");
      await saveForm(inquiryId, "pre-screening", data, "yes");
      setIsComplete(true);
      onComplete(true);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      toast({ title: "Pre-Screening marked complete" });
    } catch { toast({ title: "Failed to save", variant: "destructive" }); setSaveStatus("idle"); }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setData(d => ({ ...d, [key]: e.target.value }));
  const setVal = (key: string, val: string) => setData(d => ({ ...d, [key]: val }));

  if (initialized.isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const YesNo = ({ label, fieldKey }: { label: string; fieldKey: string }) => (
    <div>
      <FL>{label}</FL>
      <Select value={(data as any)[fieldKey]} onValueChange={v => setVal(fieldKey, v)}>
        <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select..." /></SelectTrigger>
        <SelectContent className="bg-card border-border text-foreground">
          <SelectItem value="Yes">Yes</SelectItem>
          <SelectItem value="No">No</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-7">
      <SectionHeader title="Referral Source" />
      <div className="space-y-4">
        <div>
          <FL>Referral Source</FL>
          <ReferralSourceInput
            value={data.referralSource}
            onChange={(name, opt) => {
              setVal("referralSource", name);
              if (opt?.contact && !data.referralContact) setVal("referralContact", opt.contact);
              if (opt?.phone && !data.referralPhone) setVal("referralPhone", opt.phone);
            }}
            placeholder="Type to search referral sources…"
            inputClassName={cn(inputCls, "pl-9")}
          />
        </div>
        <div>
          <FL>Referral Contact Name</FL>
          <ReferralContactInput
            value={data.referralContact}
            onChange={v => setVal("referralContact", v)}
            referralSourceName={data.referralSource}
            placeholder="Contact name…"
            inputClassName={inputCls}
          />
        </div>
        <div><FL>Referral Phone</FL><Input value={data.referralPhone} onChange={set("referralPhone")} placeholder="(555) 000-0000" className={inputCls} /></div>
      </div>

      <SectionHeader title="Level of Care Interest" />
      <div className="space-y-4">
        <div>
          <FL>Level of Care</FL>
          <Select value={data.levelOfCareInterest} onValueChange={v => setVal("levelOfCareInterest", v)}>
            <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="Detox">Detox</SelectItem>
              <SelectItem value="RTC">Residential (RTC)</SelectItem>
              <SelectItem value="PHP">Partial Hospitalization (PHP)</SelectItem>
              <SelectItem value="IOP">Intensive Outpatient (IOP)</SelectItem>
              <SelectItem value="OP">Outpatient (OP)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FL>Insurance Type</FL>
          <Select value={data.insuranceType} onValueChange={v => setVal("insuranceType", v)}>
            <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="Private">Private Insurance</SelectItem>
              <SelectItem value="Medicaid">Medicaid</SelectItem>
              <SelectItem value="Medicare">Medicare</SelectItem>
              <SelectItem value="Self-Pay">Self-Pay</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <YesNo label="Has Active Insurance" fieldKey="hasInsurance" />
      </div>

      <SectionHeader title="Legal Status" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <YesNo label="Has Legal Issues" fieldKey="hasLegalIssues" />
        <YesNo label="Is Court Ordered" fieldKey="isCourtOrdered" />
        <YesNo label="On Probation/Parole" fieldKey="isOnProbation" />
        <YesNo label="Has Registered Offenses" fieldKey="hasRegisteredOffenses" />
      </div>
      {data.hasLegalIssues === "Yes" && (
        <div><FL>Legal Details</FL><Textarea value={data.legalDetails} onChange={set("legalDetails")} placeholder="Legal issue details..." className={textareaCls} /></div>
      )}

      <SectionHeader title="Mental Health History" />
      <div className="space-y-4">
        <div><FL>Current/Past Mental Health Diagnoses</FL><Textarea value={data.mentalHealthDiagnoses} onChange={set("mentalHealthDiagnoses")} placeholder="Current or past diagnoses..." className={textareaCls} /></div>
        <div><FL>Psychiatric Hospitalizations</FL><Textarea value={data.psychiatricHospitalizations} onChange={set("psychiatricHospitalizations")} placeholder="Dates, facilities, reasons..." className={textareaCls} /></div>
        <div><FL>Current Medications</FL><Textarea value={data.currentMedications} onChange={set("currentMedications")} placeholder="List medications..." className={textareaCls} /></div>
      </div>

      <SectionHeader title="Substance Use Summary" />
      <div className="space-y-4">
        <div><FL>Primary Substance</FL><Input value={data.primarySubstance} onChange={set("primarySubstance")} placeholder="Primary substance..." className={inputCls} /></div>
        <div><FL>Last Use Date</FL><Input value={data.lastUseDate} onChange={set("lastUseDate")} placeholder="Last use date..." className={inputCls} /></div>
        <div><FL>Substance Use History</FL><Textarea value={data.substanceUseHistory} onChange={set("substanceUseHistory")} placeholder="Brief substance use history..." className={textareaCls} /></div>
        <div><FL>Previous Treatment</FL><Textarea value={data.previousTreatment} onChange={set("previousTreatment")} placeholder="Previous treatment attempts..." className={textareaCls} /></div>
      </div>

      <SectionHeader title="Motivation Level" />
      <div className="space-y-4">
        <div>
          <FL>Motivation Level</FL>
          <Select value={data.motivationLevel} onValueChange={v => setVal("motivationLevel", v)}>
            <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="Pre-Contemplation">Pre-Contemplation</SelectItem>
              <SelectItem value="Contemplation">Contemplation</SelectItem>
              <SelectItem value="Preparation">Preparation</SelectItem>
              <SelectItem value="Action">Action</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><FL>Barriers to Treatment</FL><Textarea value={data.barriers} onChange={set("barriers")} placeholder="Financial, transportation, childcare..." className={textareaCls} /></div>
      </div>

      <SectionHeader title="Program Recommendation" />
      <div className="space-y-4">
        <div>
          <FL>Recommended Program</FL>
          <Select value={data.programRecommendation} onValueChange={v => setVal("programRecommendation", v)}>
            <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="Detox">Detox</SelectItem>
              <SelectItem value="RTC">Residential (RTC)</SelectItem>
              <SelectItem value="PHP">PHP</SelectItem>
              <SelectItem value="IOP">IOP</SelectItem>
              <SelectItem value="OP">Outpatient</SelectItem>
              <SelectItem value="Not Appropriate">Not Clinically Appropriate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><FL>Recommendation Notes</FL><Textarea value={data.recommendationNotes} onChange={set("recommendationNotes")} placeholder="Recommendation notes and rationale..." className={textareaCls} /></div>
        <div><FL>Additional Screening Notes</FL><Textarea value={data.screeningNotes} onChange={set("screeningNotes")} placeholder="Any additional screening notes..." className={textareaCls} /></div>
      </div>

      <div className="pt-2 border-t border-border flex justify-between items-center">
        <SaveStatus status={saveStatus} />
        <Button onClick={handleMarkComplete} disabled={isComplete} className={cn("rounded-xl h-10 px-6", isComplete ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : "bg-primary")}>
          {isComplete ? <><CheckCircle2 className="w-4 h-4 mr-2" />Pre-Screening Complete</> : "Mark Pre-Screening Complete"}
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN: PreAssessmentSection (used in inquiry detail)
// ════════════════════════════════════════════════════════════════════════════════
interface PreAssessmentSectionProps {
  inquiryId: number;
  currentNotes?: string;
  onComplete: (notes: string) => void;
  inquiry?: any;
}

export function PreAssessmentSection({ inquiryId, currentNotes = "", onComplete, inquiry }: PreAssessmentSectionProps) {
  const [form1Done, setForm1Done] = useState(false);
  const [form2Done, setForm2Done] = useState(false);
  const [form3Done, setForm3Done] = useState(false);
  const [notes, setNotes] = useState(currentNotes);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const allDone = form1Done && form2Done && form3Done;
  const completedCount = [form1Done, form2Done, form3Done].filter(Boolean).length;

  const handleComplete = () => {
    if (!allDone) return;
    onComplete(notes);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/download-pre-assessment-forms`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || "Nothing to download yet", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const filename = cd.match(/filename="([^"]+)"/)?.[1] || "PreAssessmentForms.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Pre-Assessment Forms</p>
            <p className="text-xs text-muted-foreground">{completedCount}/3 forms complete</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Form completion summary */}
          <div className="flex items-center gap-2 text-xs">
            {[["Pre-Cert", form1Done], ["Nursing", form2Done], ["Screening", form3Done]].map(([label, done]) => (
              <span key={label as string} className={cn("flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-medium",
                done ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-muted text-muted-foreground border-border"
              )}>
                {done ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {label as string}
              </span>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading} className="rounded-xl border-border text-foreground hover:bg-muted gap-1.5 h-8">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Card className="rounded-2xl border-border">
        <CardContent className="p-0">
          <Tabs defaultValue="form1">
            <TabsList className="w-full rounded-t-2xl rounded-b-none border-b border-border bg-muted/40 h-auto p-1 gap-0.5">
              <TabsTrigger value="form1" className="flex-1 rounded-xl data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm py-2.5 px-1">
                <div className="flex flex-col items-center gap-0.5 leading-tight">
                  <span className="text-[11px] font-bold">Pre-Cert</span>
                  <span className="text-[10px] text-muted-foreground leading-none">Clinical</span>
                  <TabBadge complete={form1Done} />
                </div>
              </TabsTrigger>
              <TabsTrigger value="form2" className="flex-1 rounded-xl data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm py-2.5 px-1">
                <div className="flex flex-col items-center gap-0.5 leading-tight">
                  <span className="text-[11px] font-bold">Nursing</span>
                  <span className="text-[10px] text-muted-foreground leading-none">Assessment</span>
                  <TabBadge complete={form2Done} />
                </div>
              </TabsTrigger>
              <TabsTrigger value="form3" className="flex-1 rounded-xl data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm py-2.5 px-1">
                <div className="flex flex-col items-center gap-0.5 leading-tight">
                  <span className="text-[11px] font-bold">Pre</span>
                  <span className="text-[10px] text-muted-foreground leading-none">Screening</span>
                  <TabBadge complete={form3Done} />
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="form1" className="p-6 mt-0">
              <Form1PreCert inquiryId={inquiryId} onComplete={setForm1Done} inquiry={inquiry} />
            </TabsContent>
            <TabsContent value="form2" className="p-6 mt-0">
              <Form2Nursing inquiryId={inquiryId} onComplete={setForm2Done} />
            </TabsContent>
            <TabsContent value="form3" className="p-6 mt-0">
              <Form3PreScreening inquiryId={inquiryId} onComplete={setForm3Done} inquiry={inquiry} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Additional notes + complete button */}
      <Card className="rounded-2xl border-border">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-sm text-foreground">Additional Assessment Notes</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Additional notes for the pre-assessment..."
            className={cn(textareaCls, "min-h-[100px]")}
          />

          <div className={cn(
            "p-3 rounded-xl border flex items-center gap-3 text-sm",
            allDone ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-muted/40 border-border text-muted-foreground"
          )}>
            {allDone ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {allDone
              ? "All 3 forms are complete. Ready to schedule admission."
              : `Complete all 3 forms to proceed. (${completedCount}/3 done)`}
          </div>

          <Button
            onClick={handleComplete}
            disabled={!allDone}
            className={cn(
              "w-full rounded-xl h-12 font-semibold gap-2 text-sm",
              allDone
                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            title={!allDone ? "Complete all 3 forms to continue" : undefined}
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            Mark Pre-Assessment Complete
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
