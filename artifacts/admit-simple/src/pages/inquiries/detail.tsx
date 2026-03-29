import { useParams, Link, useLocation } from "wouter";
import { useGetInquiry, useListActivities } from "@workspace/api-client-react";
import { useAIFeatures } from "@/hooks/use-ai";
import { useInquiriesMutations } from "@/hooks/use-inquiries";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, FileText, Brain, Phone, Mail, Calendar, Activity, Loader2, Sparkles, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { getStatusColor, formatDate, cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { PreAssessmentSection } from "@/components/PreAssessmentForms";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function InquiryDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params?.id || "0");
  const [, navigate] = useLocation();
  const { data: inquiry, isLoading, refetch } = useGetInquiry(id, { query: { enabled: !!id } });
  const { data: activities } = useListActivities({ inquiryId: id }, { query: { enabled: !!id } });
  const { summarizeInquiry } = useAIFeatures();
  const { convertToPatient, updateInquiry } = useInquiriesMutations();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isPreAssessment = inquiry?.status === "Pre-Assessment";
  const defaultTab = isPreAssessment ? "pre_assessment" : "overview";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const tabs = [
    "overview",
    ...(isPreAssessment ? ["pre_assessment"] : []),
    "activities",
    "clinical_ai",
  ];

  const handleGenerateSummary = async () => {
    const res = await summarizeInquiry.mutateAsync({ data: { inquiryId: id } });
    setAiSummary(res.text);
  };

  const handleConvert = async () => {
    if (confirm("Convert this inquiry into an admitted patient?")) {
      await convertToPatient.mutateAsync({
        id,
        data: { levelOfCare: inquiry?.levelOfCare || "Detox", admitDate: new Date().toISOString() }
      });
    }
  };

  const handlePreAssessmentComplete = async (notes: string) => {
    try {
      await fetch(`/api/inquiries/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preAssessmentCompleted: "yes",
          preAssessmentDate: new Date().toISOString(),
          preAssessmentNotes: notes,
          status: "Clinical Assessment",
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/inquiries"] });
      toast({ title: "Pre-Assessment complete! Inquiry moved to Clinical Assessment." });
      await refetch();
      setActiveTab("overview");
    } catch {
      toast({ title: "Failed to complete pre-assessment", variant: "destructive" });
    }
  };

  if (isLoading) return <Layout><div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Layout>;
  if (!inquiry) return <Layout><div className="text-muted-foreground p-8">Not found</div></Layout>;

  const tabLabel = (tab: string) => {
    if (tab === "pre_assessment") return "Pre-Assessment";
    if (tab === "clinical_ai") return "Clinical AI";
    return tab.charAt(0).toUpperCase() + tab.slice(1);
  };

  return (
    <Layout>
      <Link href="/inquiries" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Inquiries
      </Link>

      {/* Header */}
      <div className="bg-card rounded-2xl p-5 md:p-7 border border-border mb-6 flex flex-col md:flex-row md:items-start justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary rounded-l-2xl" />
        <div className="pl-2">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="text-2xl font-bold text-foreground">{inquiry.firstName} {inquiry.lastName}</h1>
            <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border", getStatusColor(inquiry.status))}>
              {inquiry.status}
            </span>
            {inquiry.priority === "High" && (
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/25 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Urgent</span>
            )}
            {isPreAssessment && (
              <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="w-3 h-3" /> Forms Required
              </span>
            )}
            {inquiry.preAssessmentCompleted === "yes" && (
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Pre-Assessment Done
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
            {inquiry.phone && <div className="flex items-center gap-1.5"><Phone className="w-4 h-4" />{inquiry.phone}</div>}
            {inquiry.email && <div className="flex items-center gap-1.5"><Mail className="w-4 h-4" />{inquiry.email}</div>}
            <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />Added {formatDate(inquiry.createdAt)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl h-10 border-border text-foreground hover:bg-muted">Add Activity</Button>
          <Button onClick={handleConvert} disabled={convertToPatient.isPending} className="rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white border-0">
            {convertToPatient.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Convert to Patient
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab === "pre_assessment" && <ClipboardCheck className="w-3.5 h-3.5" />}
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      <div className={cn("grid gap-6", activeTab === "pre_assessment" ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3")}>
        <div className={cn("space-y-5", activeTab === "pre_assessment" ? "" : "lg:col-span-2")}>
          {activeTab === "overview" && (
            <>
              <Card className="rounded-2xl border-border">
                <CardHeader className="bg-muted/40 border-b border-border py-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <FileText className="w-4 h-4 text-muted-foreground" /> Intake Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <DataPoint label="Level of Care" value={inquiry.levelOfCare} />
                    <DataPoint label="Date of Birth" value={inquiry.dob} />
                    <DataPoint label="Insurance Provider" value={inquiry.insuranceProvider} />
                    <DataPoint label="Member ID" value={inquiry.insuranceMemberId} />
                    <DataPoint label="Referral Source" value={inquiry.referralSource} />
                    <DataPoint label="Assigned To" value={inquiry.assignedToName} />
                  </dl>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border">
                <CardHeader className="bg-muted/40 border-b border-border py-4">
                  <CardTitle className="text-sm font-semibold text-foreground">Clinical History</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  <TextBlock label="Primary Diagnosis" text={inquiry.primaryDiagnosis} />
                  <TextBlock label="Substance Use History" text={inquiry.substanceHistory} />
                  <TextBlock label="Medical History" text={inquiry.medicalHistory} />
                  <TextBlock label="Mental Health History" text={inquiry.mentalHealthHistory} />
                </CardContent>
              </Card>

              {/* Pre-assessment completion card shown in overview when done */}
              {inquiry.preAssessmentCompleted === "yes" && (
                <Card className="rounded-2xl border-emerald-500/25 bg-emerald-500/5">
                  <CardContent className="p-5 flex items-start gap-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-400 text-sm">Pre-Assessment Completed</p>
                      {inquiry.preAssessmentDate && <p className="text-xs text-muted-foreground mt-1">{formatDate(inquiry.preAssessmentDate)}</p>}
                      {inquiry.preAssessmentNotes && <p className="text-sm text-muted-foreground mt-2">{inquiry.preAssessmentNotes}</p>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === "pre_assessment" && (
            <PreAssessmentSection
              inquiryId={id}
              currentNotes={inquiry.preAssessmentNotes || ""}
              onComplete={handlePreAssessmentComplete}
            />
          )}

          {activeTab === "clinical_ai" && (
            <Card className="rounded-2xl border-border border-primary/20 overflow-hidden">
              <div className="bg-primary/10 p-5 border-b border-primary/20 flex justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" /> Claude Clinical Summary
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Generates a concise clinical overview for treatment team review.</p>
                </div>
                <Button onClick={handleGenerateSummary} disabled={summarizeInquiry.isPending} className="rounded-xl shadow-md shadow-primary/20 shrink-0">
                  {summarizeInquiry.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate
                </Button>
              </div>
              <CardContent className="p-6 bg-card min-h-[300px]">
                {aiSummary ? (
                  <div className="prose max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground">
                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                    <Brain className="w-14 h-14 mb-4 opacity-20" />
                    <p className="text-sm">Click Generate to create an AI summary from intake notes.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "activities" && (
            <div className="space-y-3 relative before:absolute before:left-5 before:top-0 before:h-full before:w-px before:bg-border">
              {activities?.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No activities recorded yet.</p>}
              {activities?.map((act) => (
                <div key={act.id} className="relative flex gap-4 pl-12">
                  <div className="absolute left-0 w-10 h-10 rounded-full border-2 border-border bg-muted flex items-center justify-center text-muted-foreground z-10">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1 p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-foreground text-sm">{act.type}</span>
                      <time className="text-xs text-muted-foreground">{formatDate(act.createdAt)}</time>
                    </div>
                    <p className="text-sm text-muted-foreground">{act.subject}</p>
                    {act.body && <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded-lg">{act.body}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar — hide on pre_assessment tab to use full width */}
        {activeTab !== "pre_assessment" && (
          <div className="space-y-5">
            <Card className="rounded-2xl border-border">
              <CardHeader className="py-4 border-b border-border">
                <CardTitle className="text-sm text-foreground">Status Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium text-foreground">{formatDate(inquiry.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium text-foreground">{formatDate(inquiry.updatedAt)}</span>
                </div>
                {inquiry.parsedAt && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border text-xs text-primary bg-primary/10 p-2 rounded-lg">
                    <Sparkles className="w-4 h-4" /> AI Parsed Intake
                  </div>
                )}
                {isPreAssessment && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => setActiveTab("pre_assessment")}
                      className="w-full flex items-center gap-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 hover:bg-indigo-500/15 transition-colors"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      Open Pre-Assessment Forms
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

function DataPoint({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col border-b border-border/50 pb-3 sm:border-0 sm:pb-0">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value || "—"}</dd>
    </div>
  );
}

function TextBlock({ label, text }: { label: string; text: any }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2">{label}</h4>
      <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground whitespace-pre-wrap border border-border/60 leading-relaxed">
        {text || "No information provided."}
      </div>
    </div>
  );
}
