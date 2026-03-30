import { useRoute, useLocation } from "wouter";
import { useGetPatient } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PreAssessmentSection } from "@/components/PreAssessmentForms";
import { Loader2, ArrowLeft, User, Phone, Mail, Calendar, Building2, CreditCard, Stethoscope, ClipboardCheck, AlertCircle } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  active:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  discharged: "bg-muted text-muted-foreground border-border",
  transferred:"bg-blue-500/15 text-blue-400 border-blue-500/25",
};

const locColors: Record<string, string> = {
  Detox: "bg-rose-500/20 text-rose-300",
  RTC:   "bg-purple-500/20 text-purple-300",
  PHP:   "bg-orange-500/20 text-orange-300",
  IOP:   "bg-blue-500/20 text-blue-300",
  OP:    "bg-emerald-500/20 text-emerald-300",
};

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm text-foreground font-medium mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function PatientDetail() {
  const [, params] = useRoute("/patients/:id");
  const [, navigate] = useLocation();
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: patient, isLoading } = useGetPatient(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout>
        <div className="py-20 flex flex-col items-center text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="font-semibold text-foreground">Patient not found</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/patients")}>
            Back to Patients
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/patients")}
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patients
        </Button>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0">
            {patient.firstName?.charAt(0) ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {patient.levelOfCare && (
                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", locColors[patient.levelOfCare] || "bg-muted text-muted-foreground")}>
                  {patient.levelOfCare}
                </span>
              )}
              {patient.status && (
                <Badge variant="outline" className={cn("rounded-full border text-xs", statusColors[patient.status] || statusColors.discharged)}>
                  {patient.status}
                </Badge>
              )}
              {patient.currentStage && (
                <span className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
                  {patient.currentStage}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/60 rounded-xl h-10 mb-6">
          <TabsTrigger value="overview" className="rounded-lg text-sm">Overview</TabsTrigger>
          <TabsTrigger value="clinical" className="rounded-lg text-sm gap-1.5">
            <ClipboardCheck className="w-3.5 h-3.5" /> Clinical
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Info */}
            <Card className="rounded-2xl border-border">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Contact Information
                </h3>
                <InfoRow icon={Phone}    label="Phone"         value={patient.phone} />
                <InfoRow icon={Mail}     label="Email"         value={patient.email} />
                <InfoRow icon={Calendar} label="Date of Birth" value={patient.dob ? formatDate(patient.dob as string) : null} />
              </CardContent>
            </Card>

            {/* Treatment Info */}
            <Card className="rounded-2xl border-border">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-primary" /> Treatment Details
                </h3>
                <InfoRow icon={Calendar}  label="Admit Date"       value={patient.admitDate ? formatDate(patient.admitDate as string) : null} />
                <InfoRow icon={Calendar}  label="Discharge Date"   value={patient.dischargeDate ? formatDate(patient.dischargeDate as string) : null} />
                <InfoRow icon={User}      label="Assigned Clinician" value={patient.assignedClinicianName ?? undefined} />
              </CardContent>
            </Card>

            {/* Insurance */}
            <Card className="rounded-2xl border-border">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Insurance
                </h3>
                <InfoRow icon={Building2}  label="Insurance Provider"  value={patient.insuranceProvider} />
                <InfoRow icon={CreditCard} label="Member ID"           value={patient.insuranceMemberId} />
              </CardContent>
            </Card>

            {/* Notes */}
            {patient.notes && (
              <Card className="rounded-2xl border-border">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground mb-3">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{patient.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Clinical Tab ── */}
        <TabsContent value="clinical">
          {patient.inquiryId ? (
            <PreAssessmentSection
              inquiryId={patient.inquiryId}
              onComplete={(notes) => {}}
            />
          ) : (
            <div className="py-16 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
                <ClipboardCheck className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground">No clinical forms available</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                This patient record is not linked to an inquiry. Clinical pre-assessment forms are completed during the admissions process.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
