import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, UploadCloud } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const inputCls = "mt-1.5 rounded-lg bg-muted border-border text-foreground placeholder:text-muted-foreground h-9";
const textareaCls = "mt-1.5 rounded-lg bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none min-h-[80px]";
const selectTriggerCls = "mt-1.5 rounded-lg bg-muted border-border text-foreground h-9";

function FL({ children }: { children: React.ReactNode }) {
  return <Label className="text-sm font-medium text-foreground">{children}</Label>;
}

function SH({ title }: { title: string }) {
  return (
    <div className="border-b border-border pb-2 mb-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
  );
}

const DEFAULT_VOB = {
  inNetworkDeductible: "", inNetworkDeductibleMet: "",
  inNetworkOopMax: "", inNetworkOopMet: "",
  inNetworkCoinsurance: "", inNetworkCopay: "",
  facilityType: "",
  hasOon: "Yes",
  oonDeductible: "", oonDeductibleMet: "",
  oonOopMax: "", oonOopMet: "",
  oonCoinsurance: "",
  preCertRequired: "No", preAuthRequired: "No",
  preCertDetails: "",
  substanceUseBenefits: "", mentalHealthBenefits: "",
  geographicRestrictions: "", additionalNotes: "",
  coverageSummary: "", quotedCost: "", clientResponsibility: "",
};

interface VOBFormProps {
  inquiryId: number;
  inquiry: any;
  onVobSaved?: () => void;
}

export function VOBForm({ inquiryId, inquiry, onVobSaved }: VOBFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existing = inquiry?.vobData as any;
  const [vob, setVob] = useState<typeof DEFAULT_VOB>({ ...DEFAULT_VOB, ...(existing || {}) });
  const [vobText, setVobText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiHighlighted, setAiHighlighted] = useState<Set<string>>(new Set());

  const costAcceptance: string | null = inquiry?.costAcceptance ?? null;

  const set = (key: keyof typeof DEFAULT_VOB) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setVob(v => ({ ...v, [key]: e.target.value }));
  const setVal = (key: keyof typeof DEFAULT_VOB, val: string) =>
    setVob(v => ({ ...v, [key]: val }));

  const handleFillWithAI = async (imageFile?: File) => {
    if (!vobText.trim() && !imageFile) {
      toast({ title: "Paste document text or upload an image first", variant: "destructive" });
      return;
    }
    setParsing(true);
    try {
      const formData = new FormData();
      if (vobText.trim()) formData.append("text", vobText.trim());
      if (imageFile) formData.append("image", imageFile);

      const resp = await fetch("/api/ai/vob-parse", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!resp.ok) throw new Error("Parse failed");
      const data = await resp.json();
      const highlighted = new Set<string>();
      const merged = { ...vob };
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === "string" && k in merged) {
          (merged as any)[k] = v;
          highlighted.add(k);
        }
      }
      setVob(merged);
      setAiHighlighted(highlighted);
      toast({ title: "VOB auto-filled from document" });
    } catch {
      toast({ title: "AI parse failed", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFillWithAI(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const resp = await fetch(`/api/inquiries/${inquiryId}/vob`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vobData: vob }),
      });
      if (!resp.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", inquiryId] });
      toast({ title: "VOB saved" });
      onVobSaved?.();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCostAcceptance = async (acceptance: "accepted" | "cannot_pay") => {
    setSubmitting(true);
    try {
      const resp = await fetch(`/api/inquiries/${inquiryId}/vob`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vobData: vob, costAcceptance: acceptance }),
      });
      if (!resp.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", inquiryId] });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/inquiries"] });
      toast({
        title: acceptance === "accepted"
          ? "Cost accepted — pipeline continues"
          : "Cannot pay — inquiry moved to Non-Viable",
      });
      onVobSaved?.();
    } catch {
      toast({ title: "Failed to record decision", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const ai = (key: string) => aiHighlighted.has(key);

  const field = (key: keyof typeof DEFAULT_VOB, label: string, placeholder?: string) => (
    <div>
      <FL>{label}</FL>
      <Input
        value={vob[key]}
        onChange={set(key)}
        placeholder={placeholder ?? `e.g. ${label}`}
        className={cn(inputCls, ai(key) && "border-primary ring-2 ring-primary/20")}
      />
    </div>
  );

  const selectField = (key: keyof typeof DEFAULT_VOB, label: string, options: string[]) => (
    <div>
      <FL>{label}</FL>
      <Select value={vob[key] || "none"} onValueChange={v => setVal(key, v === "none" ? "" : v)}>
        <SelectTrigger className={cn(selectTriggerCls, ai(key) && "border-primary ring-2 ring-primary/20")}>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent className="bg-card border-border text-foreground">
          <SelectItem value="none">Select...</SelectItem>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-7">
      {/* Header with insurance info */}
      {(inquiry?.insuranceProvider || inquiry?.insuranceMemberId) && (
        <div className="bg-amber-400/10 border border-amber-400/25 rounded-xl p-3 flex items-center gap-3">
          <span className="text-xs text-amber-300 font-medium">
            Insurance: {inquiry.insuranceProvider || "Unknown"} {inquiry.insuranceMemberId ? `| Policy: ${inquiry.insuranceMemberId}` : ""}
          </span>
        </div>
      )}

      {/* AI Document Parser */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <FL>VOB Results / Paste Document Text *</FL>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*,.pdf"
                className="hidden"
              />
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                <UploadCloud className="w-3.5 h-3.5" /> Upload Image
              </span>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFillWithAI()}
              disabled={parsing || !vobText.trim()}
              className="h-8 px-3 text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
            >
              {parsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Fill with AI
            </Button>
          </div>
        </div>
        <Textarea
          value={vobText}
          onChange={e => setVobText(e.target.value)}
          placeholder="Paste the VOB document text here, then click 'Fill with AI' to automatically extract key information..."
          className={cn(textareaCls, "min-h-[140px]")}
        />
        {aiHighlighted.size > 0 && (
          <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> {aiHighlighted.size} fields auto-filled — review and edit as needed
          </p>
        )}
      </div>

      {/* In-Network Benefits */}
      <div>
        <SH title="In-Network Benefits" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("inNetworkDeductible", "Deductible", "e.g., $2,500")}
          {field("inNetworkDeductibleMet", "Deductible Met / Remaining", "e.g., $1,000 met, $1,500 remaining")}
          {field("inNetworkOopMax", "Out-of-Pocket Max", "e.g., $6,000")}
          {field("inNetworkOopMet", "OOP Met / Remaining", "e.g., $500 met, $5,500 remaining")}
          {field("inNetworkCoinsurance", "Coinsurance", "e.g., 20%")}
          {field("inNetworkCopay", "Copay", "e.g., $50")}
          {field("facilityType", "Facility Type", "e.g., In-Network Residential")}
        </div>
      </div>

      {/* Out-of-Network Benefits */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground border-b border-border pb-2 flex-1">Out-of-Network Benefits</h3>
          <div className="ml-3 flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">Has OON?</span>
            <Select value={vob.hasOon || "Yes"} onValueChange={v => setVal("hasOon", v)}>
              <SelectTrigger className="h-7 w-20 rounded-lg bg-muted border-border text-foreground text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {vob.hasOon !== "No" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("oonDeductible", "OON Deductible", "e.g., $5,000")}
            {field("oonDeductibleMet", "OON Deductible Met / Remaining", "e.g., $0 met, $5,000 remaining")}
            {field("oonOopMax", "OON Out-of-Pocket Max", "e.g., $12,000")}
            {field("oonOopMet", "OON OOP Met / Remaining", "e.g., $0 met, $12,000 remaining")}
            {field("oonCoinsurance", "OON Coinsurance", "e.g., 40%")}
          </div>
        )}
      </div>

      {/* Pre-Cert / Auth */}
      <div>
        <SH title="Pre-Certification / Authorization" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {selectField("preCertRequired", "Pre-Certification Required?", ["Yes", "No", "Unknown"])}
          {selectField("preAuthRequired", "Pre-Authorization Required?", ["Yes", "No", "Unknown"])}
        </div>
        <div className="mt-4">
          <FL>Pre-Cert/Auth Details & Mandatory Requirements</FL>
          <Textarea
            value={vob.preCertDetails}
            onChange={set("preCertDetails")}
            placeholder="Timeline, phone numbers, required forms, mandatory stipulations..."
            className={cn(textareaCls, ai("preCertDetails") && "border-primary ring-2 ring-primary/20")}
          />
        </div>
      </div>

      {/* Coverage & Restrictions */}
      <div>
        <SH title="Coverage & Restrictions" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {selectField("substanceUseBenefits", "Substance Use Benefits?", ["Yes – Full", "Yes – Limited", "No", "Unknown"])}
          {selectField("mentalHealthBenefits", "Mental Health Benefits?", ["Yes – Full", "Yes – Limited", "No", "Unknown"])}
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <FL>State or Geographic Restrictions</FL>
            <Input
              value={vob.geographicRestrictions}
              onChange={set("geographicRestrictions")}
              placeholder="e.g., In-state only, excludes certain states..."
              className={cn(inputCls, ai("geographicRestrictions") && "border-primary ring-2 ring-primary/20")}
            />
          </div>
          <div>
            <FL>Additional Benefit Notes</FL>
            <Textarea
              value={vob.additionalNotes}
              onChange={set("additionalNotes")}
              placeholder="Exclusions, limitations, special conditions..."
              className={cn(textareaCls, ai("additionalNotes") && "border-primary ring-2 ring-primary/20")}
            />
          </div>
        </div>
      </div>

      {/* Quote Information */}
      <div>
        <SH title="Quote Information" />
        <div className="space-y-4">
          <div>
            <FL>Coverage Summary</FL>
            <Textarea
              value={vob.coverageSummary}
              onChange={set("coverageSummary")}
              placeholder="Summary of coverage details..."
              className={cn(textareaCls, ai("coverageSummary") && "border-primary ring-2 ring-primary/20")}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("quotedCost", "Quoted Cost", "e.g., $15,000")}
            {field("clientResponsibility", "Client Responsibility", "e.g., $3,000")}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="pt-2 flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="h-10 px-6 rounded-xl bg-primary font-semibold gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Save VOB
        </Button>
      </div>

      {/* Cost Decision Step */}
      {vob.quotedCost && (
        <div className={cn(
          "rounded-2xl border-2 p-5 space-y-4",
          costAcceptance === "accepted" ? "border-emerald-500/40 bg-emerald-500/8"
            : costAcceptance === "cannot_pay" ? "border-rose-500/40 bg-rose-500/8"
            : "border-primary/30 bg-primary/5"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              costAcceptance ? "bg-muted" : "bg-primary/20"
            )}>
              {costAcceptance === "accepted" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                : costAcceptance === "cannot_pay" ? <AlertTriangle className="w-5 h-5 text-rose-400" />
                : <Sparkles className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <p className="font-bold text-foreground">
                {costAcceptance === "accepted" ? "Client Accepted Cost"
                  : costAcceptance === "cannot_pay" ? "Client Cannot Pay"
                  : "Cost Decision Required"}
              </p>
              <p className="text-sm text-muted-foreground">
                Quoted: <strong className="text-foreground">{vob.quotedCost}</strong>
                {vob.clientResponsibility && <> · Client responsibility: <strong className="text-foreground">{vob.clientResponsibility}</strong></>}
              </p>
            </div>
          </div>

          {!costAcceptance ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleCostAcceptance("accepted")}
                disabled={submitting}
                className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Accepts Cost
              </Button>
              <Button
                onClick={() => handleCostAcceptance("cannot_pay")}
                disabled={submitting}
                variant="outline"
                className="h-12 rounded-xl border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-bold text-sm gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                Cannot Pay
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Decision recorded.{" "}
              <button
                onClick={() => handleCostAcceptance(costAcceptance === "accepted" ? "cannot_pay" : "accepted")}
                className="text-primary underline hover:no-underline"
              >
                Change decision
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
