import { useState } from "react";
import { useListReports, useDeleteReport, useGenerateAiReport } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Sparkles, Trash2, Brain, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export default function Reports() {
  const { data: reports, isLoading } = useListReports();
  const [reportType, setReportType] = useState("weekly_summary");
  const [selected, setSelected] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generateReport = useGenerateAiReport({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
        setSelected({
          title: reportType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          aiNarrative: data.narrative,
          createdAt: data.generatedAt,
        });
        toast({ title: "Report generated successfully" });
        setIsGenerating(false);
      },
      onError: () => {
        toast({ title: "Failed to generate report", variant: "destructive" });
        setIsGenerating(false);
      }
    }
  });

  const deleteReport = useDeleteReport({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
        if (selected?.id) setSelected(null);
        toast({ title: "Report deleted" });
      }
    }
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    generateReport.mutate({
      data: {
        reportType,
        dateRangeStart: thirtyDaysAgo.toISOString().split("T")[0],
        dateRangeEnd: now.toISOString().split("T")[0],
      }
    });
  };

  const reportTypes = [
    { value: "weekly_summary", label: "Weekly Summary" },
    { value: "monthly_report", label: "Monthly Report" },
    { value: "referral_analysis", label: "Referral Analysis" },
    { value: "financial_snapshot", label: "Financial Snapshot" },
    { value: "census_report", label: "Census Report" },
    { value: "conversion_analysis", label: "Conversion Analysis" },
  ];

  const displayContent = selected?.aiNarrative || selected?.narrative || "";

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-slate-500 mt-1">AI-generated reports and executive summaries.</p>
        </div>
        <div className="flex gap-3 items-center">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[200px] h-11 rounded-xl border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="h-11 px-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl shadow-md border-0 font-semibold flex gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1">Report History</h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !reports?.length ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p className="text-sm">No reports yet. Generate your first one!</p>
            </div>
          ) : (
            reports.map(report => (
              <div
                key={report.id}
                onClick={() => setSelected(report)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${
                  selected?.id === report.id
                    ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-500/10'
                    : 'bg-white border-slate-200 hover:shadow-sm hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <p className="font-semibold text-slate-900 text-sm truncate">{report.title}</p>
                    </div>
                    <p className="text-xs text-slate-400 pl-8">{formatDate(report.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteReport.mutate({ id: report.id }); }}
                    className="text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          <Card className="rounded-2xl shadow-lg border-0 ring-1 ring-slate-200 overflow-hidden bg-white min-h-[600px]">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center h-[600px] text-indigo-400 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
                  <Brain className="w-16 h-16 relative z-10 animate-bounce" />
                </div>
                <p className="font-medium text-indigo-900 text-lg">Claude is generating your report...</p>
                <p className="text-sm text-slate-500">This may take a moment.</p>
              </div>
            ) : selected ? (
              <>
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-xl">{selected.title}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">{formatDate(selected.createdAt)}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl gap-2 text-slate-600">
                    <Download className="w-4 h-4" /> Export
                  </Button>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="prose prose-slate prose-headings:text-indigo-900 max-w-none">
                    <ReactMarkdown>{displayContent}</ReactMarkdown>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[600px] text-slate-400">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                  <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-xl font-semibold text-slate-600">Select or Generate a Report</p>
                <p className="text-sm mt-2 max-w-sm text-center">Choose a report type and click Generate to create an AI-powered executive summary.</p>
                <Button onClick={handleGenerate} className="mt-6 h-11 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2">
                  <Brain className="w-4 h-4" /> Generate Report
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
