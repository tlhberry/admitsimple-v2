import { useRoute, Link } from "wouter";
import { useGetInquiry, useListActivities } from "@workspace/api-client-react";
import { useAIFeatures } from "@/hooks/use-ai";
import { useInquiriesMutations } from "@/hooks/use-inquiries";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserPlus, FileText, Brain, Phone, Mail, Calendar, Activity, Loader2, Sparkles } from "lucide-react";
import { getStatusColor, formatDate, formatDateTime, cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

export default function InquiryDetail() {
  const [, params] = useRoute("/inquiries/:id");
  const id = parseInt(params?.id || "0");
  const { data: inquiry, isLoading } = useGetInquiry(id, { query: { enabled: !!id } });
  const { data: activities } = useListActivities({ inquiryId: id }, { query: { enabled: !!id } });
  
  const { summarizeInquiry } = useAIFeatures();
  const { convertToPatient } = useInquiriesMutations();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    const res = await summarizeInquiry.mutateAsync({ data: { inquiryId: id } });
    setAiSummary(res.text);
  };

  const handleConvert = async () => {
    if (confirm("Are you sure you want to convert this inquiry into an admitted patient?")) {
      await convertToPatient.mutateAsync({ 
        id, 
        data: { levelOfCare: inquiry?.levelOfCare || "Detox", admitDate: new Date().toISOString() } 
      });
      // Would redirect to patient page here ideally
    }
  };

  if (isLoading) return <Layout><div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Layout>;
  if (!inquiry) return <Layout><div>Not found</div></Layout>;

  return (
    <Layout>
      <Link href="/inquiries" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Inquiries
      </Link>

      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">{inquiry.firstName} {inquiry.lastName}</h1>
            <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border", getStatusColor(inquiry.status))}>
              {inquiry.status}
            </span>
            {inquiry.priority === 'High' && <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Urgent</span>}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm mt-4">
            {inquiry.phone && <div className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {inquiry.phone}</div>}
            {inquiry.email && <div className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {inquiry.email}</div>}
            <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Added {formatDate(inquiry.createdAt)}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl shadow-sm h-11 bg-white">Add Activity</Button>
          <Button onClick={handleConvert} disabled={convertToPatient.isPending} className="rounded-xl shadow-md h-11 bg-emerald-600 hover:bg-emerald-700 text-white border-0">
            {convertToPatient.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Convert to Patient
          </Button>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto hide-scrollbar">
        {["overview", "activities", "clinical_ai"].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap capitalize",
              activeTab === tab 
                ? "border-primary text-primary" 
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            )}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "overview" && (
            <>
              <Card className="rounded-2xl shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <FileText className="w-5 h-5 text-slate-400" /> Intake Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                    <DataPoint label="Level of Care" value={inquiry.levelOfCare} />
                    <DataPoint label="Date of Birth" value={inquiry.dob} />
                    <DataPoint label="Insurance Provider" value={inquiry.insuranceProvider} />
                    <DataPoint label="Member ID" value={inquiry.insuranceMemberId} />
                    <DataPoint label="Referral Source" value={inquiry.referralSource} />
                    <DataPoint label="Assigned To" value={inquiry.assignedToName} />
                  </dl>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                  <CardTitle className="text-base text-slate-800">Clinical History</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <TextBlock label="Primary Diagnosis" text={inquiry.primaryDiagnosis} />
                  <TextBlock label="Substance Use History" text={inquiry.substanceHistory} />
                  <TextBlock label="Medical History" text={inquiry.medicalHistory} />
                  <TextBlock label="Mental Health History" text={inquiry.mentalHealthHistory} />
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "clinical_ai" && (
            <Card className="rounded-2xl shadow-sm border-slate-200 border-2 border-primary/20 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Brain className="w-6 h-6 text-primary" /> Claude Clinical Summary
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">Generates a concise clinical overview for treatment team review.</p>
                </div>
                <Button 
                  onClick={handleGenerateSummary} 
                  disabled={summarizeInquiry.isPending}
                  className="rounded-xl shadow-md shadow-primary/20"
                >
                  {summarizeInquiry.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Now
                </Button>
              </div>
              <CardContent className="p-8 bg-white min-h-[300px]">
                {aiSummary ? (
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                    <Brain className="w-16 h-16 mb-4 opacity-20" />
                    <p>Click generate to create an AI summary based on intake notes.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "activities" && (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {activities?.length === 0 && <p className="text-center text-slate-500 py-8">No activities recorded yet.</p>}
              {activities?.map((act) => (
                <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 text-sm">{act.type}</span>
                      <time className="text-xs font-medium text-slate-500">{formatDate(act.createdAt)}</time>
                    </div>
                    <p className="text-sm text-slate-600">{act.subject}</p>
                    {act.body && <p className="text-xs text-slate-500 mt-2 p-2 bg-slate-50 rounded-lg">{act.body}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - At a glance info */}
        <div className="space-y-6">
          <Card className="rounded-2xl shadow-sm border-slate-200 bg-slate-50/50">
            <CardHeader className="py-4 border-b border-slate-200 bg-white rounded-t-2xl">
              <CardTitle className="text-sm">Status Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-sm text-slate-600 space-y-3">
               <div className="flex justify-between items-center">
                 <span>Created</span>
                 <span className="font-medium text-slate-900">{formatDate(inquiry.createdAt)}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span>Last Updated</span>
                 <span className="font-medium text-slate-900">{formatDate(inquiry.updatedAt)}</span>
               </div>
               {inquiry.parsedAt && (
                 <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 text-xs text-indigo-600 bg-indigo-50/50 p-2 rounded-lg">
                   <Sparkles className="w-4 h-4" /> AI Parsed Intake
                 </div>
               )}
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
}

function DataPoint({ label, value }: { label: string, value: any }) {
  return (
    <div className="flex flex-col border-b border-slate-100 pb-3 sm:border-0 sm:pb-0">
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900">{value || '—'}</dd>
    </div>
  );
}

function TextBlock({ label, text }: { label: string, text: any }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900 mb-2">{label}</h4>
      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100 leading-relaxed">
        {text || 'No information provided.'}
      </div>
    </div>
  );
}
