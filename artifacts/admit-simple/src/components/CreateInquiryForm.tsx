import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useInquiriesMutations } from "@/hooks/use-inquiries";
import { useAIFeatures } from "@/hooks/use-ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateInquiryBody } from "@workspace/api-client-react";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dob: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insuranceMemberId: z.string().optional(),
  levelOfCare: z.string().optional(),
  status: z.string().default("New"),
  priority: z.string().default("Medium"),
  primaryDiagnosis: z.string().optional(),
  substanceHistory: z.string().optional(),
  medicalHistory: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateInquiryForm({ onSuccess }: { onSuccess: () => void }) {
  const { createInquiry } = useInquiriesMutations();
  const { parseIntake } = useAIFeatures();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [isParsing, setIsParsing] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { status: "New", priority: "Medium" }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const data = await parseIntake.mutateAsync({ data: { document: file } });
      
      const newAiFields = new Set<string>();
      
      // Auto-fill form and track which fields were AI generated
      Object.entries(data).forEach(([key, value]) => {
        if (value && key !== 'fieldsExtracted') {
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: FormValues) => {
    await createInquiry.mutateAsync({ data: data as CreateInquiryBody });
    onSuccess();
  };

  const isAi = (field: string) => aiFields.has(field);

  return (
    <div className="space-y-8 pb-12">
      {/* AI Document Upload Zone */}
      <div className="bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-2xl p-6 text-center relative hover:bg-blue-50 transition-colors">
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
            <p className="text-xs text-slate-500 mt-1">Extracting patient details securely</p>
          </div>
        ) : parseSuccess ? (
          <div className="flex flex-col items-center justify-center py-4 text-emerald-600">
            <CheckCircle2 className="w-10 h-10 mb-2" />
            <p className="font-semibold text-lg">Document Parsed Successfully!</p>
            <p className="text-sm">Please review the auto-filled fields below.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 pointer-events-none">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-primary mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">AI Document Parser</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">
              Drag & drop a referral fax, screenshot, or PDF here to instantly auto-fill this form.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" name="firstName" form={form} isAi={isAi('firstName')} required />
          <Field label="Last Name" name="lastName" form={form} isAi={isAi('lastName')} required />
          <Field label="Phone" name="phone" form={form} isAi={isAi('phone')} />
          <Field label="Email" name="email" form={form} isAi={isAi('email')} />
          <Field label="Date of Birth" name="dob" form={form} isAi={isAi('dob')} placeholder="MM/DD/YYYY" />
          
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">Level of Care</Label>
            <Select onValueChange={(v) => form.setValue("levelOfCare", v)} defaultValue={form.getValues("levelOfCare")}>
              <SelectTrigger className={cn("h-11 rounded-xl", isAi('levelOfCare') && "border-primary bg-blue-50/30 ring-2 ring-primary/20")}>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Detox">Detox</SelectItem>
                <SelectItem value="RTC">RTC (Residential)</SelectItem>
                <SelectItem value="PHP">PHP (Partial Hospitalization)</SelectItem>
                <SelectItem value="IOP">IOP (Intensive Outpatient)</SelectItem>
                <SelectItem value="OP">OP (Outpatient)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
            Insurance Information
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Provider" name="insuranceProvider" form={form} isAi={isAi('insuranceProvider')} />
            <Field label="Member ID" name="insuranceMemberId" form={form} isAi={isAi('insuranceMemberId')} />
          </div>
        </div>

        <div className="space-y-4">
          <TextAreaField label="Primary Diagnosis" name="primaryDiagnosis" form={form} isAi={isAi('primaryDiagnosis')} />
          <TextAreaField label="Substance Use History" name="substanceHistory" form={form} isAi={isAi('substanceHistory')} />
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t">
          <Button type="button" variant="outline" onClick={onSuccess} className="rounded-xl h-11 px-6">Cancel</Button>
          <Button type="submit" disabled={createInquiry.isPending} className="rounded-xl h-11 px-8 font-semibold shadow-lg shadow-primary/20">
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
      <Label className="text-slate-700 font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input 
        {...form.register(name)} 
        placeholder={placeholder}
        className={cn("h-11 rounded-xl transition-all", isAi && "border-primary bg-blue-50/30 ring-2 ring-primary/20")}
      />
      {isAi && <span className="absolute right-3 top-[34px] text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded uppercase">AI</span>}
      {form.formState.errors[name] && <p className="text-xs text-red-500">{form.formState.errors[name].message}</p>}
    </div>
  );
}

function TextAreaField({ label, name, form, isAi }: any) {
  return (
    <div className="space-y-1.5 relative">
      <Label className="text-slate-700 font-medium">{label}</Label>
      <Textarea 
        {...form.register(name)} 
        className={cn("min-h-[100px] rounded-xl transition-all resize-none", isAi && "border-primary bg-blue-50/30 ring-2 ring-primary/20")}
      />
      {isAi && <span className="absolute right-3 top-8 text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded uppercase">AI</span>}
    </div>
  );
}
