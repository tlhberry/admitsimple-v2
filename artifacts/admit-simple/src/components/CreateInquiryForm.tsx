import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { useInquiriesMutations } from "@/hooks/use-inquiries";
import { useAIFeatures } from "@/hooks/use-ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles, Loader2, CheckCircle2, Search, History,
  CreditCard, X, Camera, Plus, Trash2,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateInquiryBody } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dob: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insuranceMemberId: z.string().optional(),
  insuranceGroupNumber: z.string().optional(),
  insuranceCarrierPhone: z.string().optional(),
  levelOfCare: z.string().optional(),
  referralSource: z.string().optional(),
  searchKeywords: z.string().optional(),
  status: z.string().default("New"),
  priority: z.string().default("Medium"),
  primaryDiagnosis: z.string().optional(),
  medicalHistory: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ── Insurance card dropzone ───────────────────────────────────────────────────
function CardDropzone({
  label,
  file,
  onFile,
  onClear,
}: {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors",
        file ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/60"
      )}
      onClick={() => ref.current?.click()}
    >
      <input
        type="file"
        ref={ref}
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
      />
      {file ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-foreground truncate">{file.name}</span>
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClear(); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 py-1 pointer-events-none">
          <Camera className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
      )}
    </div>
  );
}

export function CreateInquiryForm({ onSuccess }: { onSuccess: () => void }) {
  const { createInquiry } = useInquiriesMutations();
  const { parseIntake } = useAIFeatures();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [isParsing, setIsParsing] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);

  // Insurance card scan
  const [cardFront, setCardFront] = useState<File | null>(null);
  const [cardBack, setCardBack] = useState<File | null>(null);
  const [isScanningCard, setIsScanningCard] = useState(false);
  const [cardScanSuccess, setCardScanSuccess] = useState(false);

  // Treatment history — array of entries
  type TxEntry = { facility: string; year: string; types: string[] };
  const emptyEntry = (): TxEntry => ({ facility: "", year: "", types: [] });

  const [hadPreviousTreatment, setHadPreviousTreatment] = useState(false);
  const [txEntries, setTxEntries] = useState<TxEntry[]>([emptyEntry()]);

  const updateEntry = (idx: number, field: keyof TxEntry, value: any) =>
    setTxEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));

  const toggleEntryType = (idx: number, type: string) =>
    setTxEntries(prev => prev.map((e, i) =>
      i === idx
        ? { ...e, types: e.types.includes(type) ? e.types.filter(t => t !== type) : [...e.types, type] }
        : e
    ));

  const addEntry = () => setTxEntries(prev => [...prev, emptyEntry()]);
  const removeEntry = (idx: number) => setTxEntries(prev => prev.filter((_, i) => i !== idx));

  const { data: referralSources = [] } = useQuery<any[]>({
    queryKey: ["/api/referrals"],
    queryFn: () => fetch("/api/referrals", { credentials: "include" }).then(r => r.json()),
    staleTime: 60000,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { status: "New", priority: "Medium" },
  });

  const watchedReferralSource = form.watch("referralSource");

  // ── AI document parse ──────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    try {
      const data = await parseIntake.mutateAsync({ data: { document: file } });
      const newAiFields = new Set<string>();
      Object.entries(data).forEach(([key, value]) => {
        if (value && key !== "fieldsExtracted") {
          form.setValue(key as any, value);
          newAiFields.add(key);
        }
      });
      setAiFields(newAiFields);
      setParseSuccess(true);
      setTimeout(() => setParseSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Insurance card scan ────────────────────────────────────────────────────
  const handleScanCard = async () => {
    if (!cardFront && !cardBack) return;
    setIsScanningCard(true);
    try {
      const formData = new FormData();
      if (cardFront) formData.append("front", cardFront);
      if (cardBack) formData.append("back", cardBack);

      const res = await fetch("/api/ai/parse-insurance-card", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Card scan failed");
      const data = await res.json();

      const cardFields = new Set<string>(aiFields);
      const fieldMap: Record<string, string> = {
        insuranceProvider: "insuranceProvider",
        insuranceMemberId: "insuranceMemberId",
        insuranceGroupNumber: "insuranceGroupNumber",
        insuranceCarrierPhone: "insuranceCarrierPhone",
      };
      Object.entries(fieldMap).forEach(([apiKey, formKey]) => {
        if (data[apiKey]) {
          form.setValue(formKey as any, data[apiKey]);
          cardFields.add(formKey);
        }
      });
      setAiFields(cardFields);
      setCardScanSuccess(true);
      setTimeout(() => setCardScanSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanningCard(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormValues) => {
    const created = await createInquiry.mutateAsync({ data: data as CreateInquiryBody });
    const inquiryId = (created as any)?.id;

    if (inquiryId) {
      const treatmentText = hadPreviousTreatment && txEntries.some(e => e.facility || e.year || e.types.length)
        ? txEntries
            .filter(e => e.facility || e.year || e.types.length)
            .map((e, i) => {
              const typeStr = e.types.length ? ` (${e.types.join("/")})` : "";
              const parts = [e.facility, e.year].filter(Boolean).join(", ");
              return `${i + 1}. ${parts || "Treatment center"}${typeStr}`;
            })
            .join("\n")
        : "";

      // Pre-Cert form
      const preCertSeed: Record<string, any> = {};
      if (data.primaryDiagnosis) preCertSeed.presentingProblem = data.primaryDiagnosis;
      if (treatmentText) preCertSeed.treatmentHistory = treatmentText;

      if (Object.keys(preCertSeed).length > 0) {
        fetch(`/api/inquiries/${inquiryId}/pre-cert-form`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formData: preCertSeed, isComplete: "no" }),
        }).catch(() => {});
      }

      // Pre-Screening form
      const prescreenSeed: Record<string, any> = {};
      if (data.referralSource) prescreenSeed.referralSource = data.referralSource;
      if (data.levelOfCare) prescreenSeed.levelOfCareInterest = data.levelOfCare;
      if (data.insuranceProvider) prescreenSeed.hasInsurance = "Yes";
      if (data.insuranceProvider) prescreenSeed.insuranceType = data.insuranceProvider;
      if (treatmentText) prescreenSeed.previousTreatment = treatmentText;

      if (Object.keys(prescreenSeed).length > 0) {
        fetch(`/api/inquiries/${inquiryId}/pre-screening`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formData: prescreenSeed, isComplete: "no" }),
        }).catch(() => {});
      }

      // Nursing Assessment
      const nursingSeed: Record<string, any> = {};
      if (data.medicalHistory) nursingSeed.additionalNursingNotes = data.medicalHistory;

      if (Object.keys(nursingSeed).length > 0) {
        fetch(`/api/inquiries/${inquiryId}/nursing-assessment`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formData: nursingSeed, isComplete: "no" }),
        }).catch(() => {});
      }
    }

    onSuccess();
  };

  const isAi = (field: string) => aiFields.has(field);

  return (
    <div className="space-y-8 pb-12">
      {/* AI Document Upload Zone */}
      <div className="bg-primary/5 border-2 border-dashed border-primary/25 rounded-2xl p-6 text-center relative hover:bg-primary/10 transition-colors">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,.pdf"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {isParsing ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <p className="text-primary font-medium">Claude is reading the document...</p>
            <p className="text-xs text-muted-foreground mt-1">Extracting patient details securely</p>
          </div>
        ) : parseSuccess ? (
          <div className="flex flex-col items-center justify-center py-4 text-emerald-400">
            <CheckCircle2 className="w-10 h-10 mb-2" />
            <p className="font-semibold text-lg">Document Parsed Successfully!</p>
            <p className="text-sm text-muted-foreground">Please review the auto-filled fields below.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 pointer-events-none">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center shadow-sm text-primary mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">AI Document Parser</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Drag & drop a referral fax, screenshot, or PDF here to instantly auto-fill this form.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Demographics */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" name="firstName" form={form} isAi={isAi("firstName")} required />
          <Field label="Last Name" name="lastName" form={form} isAi={isAi("lastName")} required />
          <Field label="Phone" name="phone" form={form} isAi={isAi("phone")} />
          <Field label="Email" name="email" form={form} isAi={isAi("email")} />
          <Field label="Date of Birth" name="dob" form={form} isAi={isAi("dob")} placeholder="MM/DD/YYYY" />
          <div /> {/* spacer */}
          <Field label="City" name="city" form={form} isAi={isAi("city")} placeholder="City" />
          <Field label="State" name="state" form={form} isAi={isAi("state")} placeholder="e.g. FL" />

          <div className="space-y-1.5">
            <Label className="text-foreground font-medium">Level of Care</Label>
            <Select
              onValueChange={v => form.setValue("levelOfCare", v)}
              defaultValue={form.getValues("levelOfCare")}
            >
              <SelectTrigger className={cn("h-11 rounded-xl bg-muted border-border text-foreground", isAi("levelOfCare") && "border-primary ring-2 ring-primary/20")}>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="Detox">Detox</SelectItem>
                <SelectItem value="RTC">RTC (Residential)</SelectItem>
                <SelectItem value="PHP">PHP (Partial Hospitalization)</SelectItem>
                <SelectItem value="IOP">IOP (Intensive Outpatient)</SelectItem>
                <SelectItem value="OP">OP (Outpatient)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground font-medium">Referral Source</Label>
            <Select
              onValueChange={v => form.setValue("referralSource", v === "none" ? "" : v)}
              defaultValue={form.getValues("referralSource")}
            >
              <SelectTrigger className="h-11 rounded-xl bg-muted border-border text-foreground">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="none">— None —</SelectItem>
                {referralSources.map((s: any) => (
                  <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(watchedReferralSource === "Google PPC" || watchedReferralSource === "Google Organic") && (
            <div className="col-span-2 space-y-1.5">
              <Label className="text-foreground font-medium flex items-center gap-1.5">
                <Search className="w-4 h-4 text-primary" /> Search Keywords
              </Label>
              <Input
                {...form.register("searchKeywords")}
                placeholder="e.g. drug rehab near me, alcohol treatment center"
                className="h-11 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">Keywords the client searched before calling</p>
            </div>
          )}
        </div>

        {/* Insurance */}
        <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Insurance Information
            </h4>
          </div>

          {/* Insurance card scan */}
          <div className="bg-card rounded-lg p-3 border border-border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Scan Insurance Card with AI
            </p>
            <div className="grid grid-cols-2 gap-3">
              <CardDropzone
                label="Front of Card"
                file={cardFront}
                onFile={setCardFront}
                onClear={() => setCardFront(null)}
              />
              <CardDropzone
                label="Back of Card"
                file={cardBack}
                onFile={setCardBack}
                onClear={() => setCardBack(null)}
              />
            </div>
            {(cardFront || cardBack) && (
              <Button
                type="button"
                onClick={handleScanCard}
                disabled={isScanningCard}
                size="sm"
                className="w-full rounded-lg bg-primary text-white h-9"
              >
                {isScanningCard ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Scanning card...</>
                ) : cardScanSuccess ? (
                  <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-300" />Card scanned — fields filled below</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Extract Info from Card</>
                )}
              </Button>
            )}
          </div>

          {/* Quick-select payor shortcuts */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Quick:</span>
            {["Self-Pay", "Medicaid", "Medicare", "Tricare"].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => form.setValue("insuranceProvider", p)}
                className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border transition-all"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Provider / Carrier" name="insuranceProvider" form={form} isAi={isAi("insuranceProvider")} placeholder="e.g. Aetna" />
            <Field label="Member ID" name="insuranceMemberId" form={form} isAi={isAi("insuranceMemberId")} placeholder="Member ID" />
            <Field label="Group Number" name="insuranceGroupNumber" form={form} isAi={isAi("insuranceGroupNumber")} placeholder="Group #" />
            <Field label="Carrier Phone" name="insuranceCarrierPhone" form={form} isAi={isAi("insuranceCarrierPhone")} placeholder="(800) 000-0000" />
          </div>
        </div>

        {/* Clinical */}
        <div className="space-y-4">
          <TextAreaField
            label="Presenting Problem"
            name="primaryDiagnosis"
            form={form}
            isAi={isAi("primaryDiagnosis")}
            placeholder="Describe the client's presenting concern, chief complaint, or reason for seeking treatment..."
          />

          {/* Previous Treatment */}
          <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="hadPreviousTreatment"
                checked={hadPreviousTreatment}
                onCheckedChange={v => setHadPreviousTreatment(!!v)}
                className="border-border"
              />
              <label
                htmlFor="hadPreviousTreatment"
                className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer select-none"
              >
                <History className="w-4 h-4 text-primary" />
                Client has been to treatment before
              </label>
            </div>

            {hadPreviousTreatment && (
              <div className="space-y-3 pt-1">
                {txEntries.map((entry, idx) => (
                  <div key={idx} className="bg-card rounded-lg border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Treatment #{idx + 1}
                      </span>
                      {txEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove this entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-foreground font-medium text-sm">Name of Facility</Label>
                        <Input
                          value={entry.facility}
                          onChange={e => updateEntry(idx, "facility", e.target.value)}
                          placeholder="e.g. Sunrise Recovery"
                          className="h-9 rounded-lg bg-muted border-border text-foreground placeholder:text-muted-foreground text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-foreground font-medium text-sm">Year</Label>
                        <Input
                          value={entry.year}
                          onChange={e => updateEntry(idx, "year", e.target.value)}
                          placeholder="e.g. 2021"
                          className="h-9 rounded-lg bg-muted border-border text-foreground placeholder:text-muted-foreground text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      {["SUD", "MH"].map(type => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer select-none">
                          <Checkbox
                            checked={entry.types.includes(type)}
                            onCheckedChange={() => toggleEntryType(idx, type)}
                            className="border-border"
                          />
                          <span className="text-sm text-foreground">
                            {type === "SUD" ? "Substance Use (SUD)" : "Mental Health (MH)"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEntry}
                  className="w-full h-9 rounded-lg border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Another Treatment Center
                </Button>
                <p className="text-xs text-muted-foreground">
                  All entries will auto-populate the Treatment History section in Pre-Assessment forms.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 flex justify-end gap-3 border-t border-border">
          <Button type="button" variant="outline" onClick={onSuccess} className="rounded-xl h-11 px-6">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createInquiry.isPending}
            className="rounded-xl h-11 px-8 font-semibold shadow-lg shadow-primary/20"
          >
            {createInquiry.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Create Inquiry
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, form, isAi, required, placeholder }: any) {
  return (
    <div className="space-y-1.5 relative">
      <Label className="text-foreground font-medium">
        {label} {required && <span className="text-red-400">*</span>}
      </Label>
      <Input
        {...form.register(name)}
        placeholder={placeholder}
        className={cn(
          "h-11 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground transition-all",
          isAi && "border-primary ring-2 ring-primary/20"
        )}
      />
      {isAi && (
        <span className="absolute right-3 top-[34px] text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded uppercase">
          AI
        </span>
      )}
      {form.formState.errors[name] && (
        <p className="text-xs text-red-400">{form.formState.errors[name].message}</p>
      )}
    </div>
  );
}

function TextAreaField({ label, name, form, isAi, placeholder }: any) {
  return (
    <div className="space-y-1.5 relative">
      <Label className="text-foreground font-medium">{label}</Label>
      <Textarea
        {...form.register(name)}
        placeholder={placeholder}
        className={cn(
          "min-h-[90px] rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground transition-all resize-none",
          isAi && "border-primary ring-2 ring-primary/20"
        )}
      />
      {isAi && (
        <span className="absolute right-3 top-8 text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded uppercase">
          AI
        </span>
      )}
    </div>
  );
}
