import { useState, useRef } from "react";
import { useListReports, useDeleteReport, useGenerateAiReport } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, Sparkles, Trash2, Brain, Download, Search, TableIcon, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useLocation } from "wouter";

export default function Reports() {
  const { data: reports, isLoading } = useListReports();
  const [reportType, setReportType] = useState("weekly_summary");
  const [selected, setSelected] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Natural language report builder
  const [nlPrompt, setNlPrompt] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState<{ columns: string[]; rows: any[][]; summary: string; rowCount: number } | null>(null);
  const nlResultRef = useRef<HTMLDivElement>(null);

  const handleNlReport = async () => {
    if (!nlPrompt.trim()) return;
    setNlLoading(true);
    setNlResult(null);
    try {
      const resp = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: nlPrompt.trim() }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Report generation failed");
      }
      const data = await resp.json();
      setNlResult(data);
      setTimeout(() => nlResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err: any) {
      toast({ title: err.message || "Failed to generate report", variant: "destructive" });
    } finally {
      setNlLoading(false);
    }
  };

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
    { value: "weekly_summary",     label: "Weekly Summary" },
    { value: "monthly_report",     label: "Monthly Report" },
    { value: "referral_analysis",  label: "Referral Analysis" },
    { value: "financial_snapshot", label: "Financial Snapshot" },
    { value: "census_report",      label: "Census Report" },
    { value: "conversion_analysis",label: "Conversion Analysis" },
  ];

  const displayContent = selected?.aiNarrative || selected?.narrative || "";

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">AI-generated reports and executive summaries.</p>
        </div>
        <div className="flex gap-3 items-center">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[200px] h-10 rounded-xl border-border bg-muted text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              {reportTypes.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/20 font-semibold flex gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Generate
          </Button>
        </div>
      </div>

      {/* ── Natural Language Report Builder ── */}
      <Card className="rounded-2xl border-primary/20 bg-primary/5 mb-6">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-semibold text-foreground text-sm">Ask Anything</h2>
            <span className="text-xs text-muted-foreground">— natural language report builder powered by Claude</span>
          </div>
          <div className="flex gap-3">
            <Input
              value={nlPrompt}
              onChange={e => setNlPrompt(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !nlLoading && handleNlReport()}
              placeholder="Ask anything... admits by rep this month, top referral sources, face to face meetings last week"
              className="flex-1 h-11 rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground"
              disabled={nlLoading}
            />
            <Button
              onClick={handleNlReport}
              disabled={nlLoading || !nlPrompt.trim()}
              className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20 flex gap-2 shrink-0"
            >
              {nlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Natural Language Results ── */}
      {(nlLoading || nlResult) && (
        <div ref={nlResultRef} className="mb-6">
          {nlLoading ? (
            <Card className="rounded-2xl border-border">
              <CardContent className="flex flex-col items-center justify-center py-16 text-primary space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-20 animate-pulse" />
                  <Brain className="w-10 h-10 relative z-10 animate-bounce" />
                </div>
                <p className="font-semibold text-foreground">Claude is querying the database...</p>
                <p className="text-sm text-muted-foreground">Generating SQL and summarizing results.</p>
              </CardContent>
            </Card>
          ) : nlResult && (
            <Card className="rounded-2xl border-border overflow-hidden">
              <CardHeader className="bg-muted/40 border-b border-border py-4 flex flex-row items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <TableIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{nlResult.summary}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{nlResult.rowCount} row{nlResult.rowCount !== 1 ? "s" : ""} returned</p>
                </div>
              </CardHeader>
              {nlResult.rows.length === 0 ? (
                <CardContent className="py-12 text-center text-muted-foreground text-sm">No results found.</CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/60 text-muted-foreground border-b border-border">
                      <tr>
                        {nlResult.columns.filter(col => col !== "inquiry_id").map(col => (
                          <th key={col} className="px-5 py-3 font-semibold whitespace-nowrap">
                            {col.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </th>
                        ))}
                        {nlResult.columns.includes("inquiry_id") && (
                          <th className="px-3 py-3 w-8 text-primary/60 font-semibold text-xs">→</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {nlResult.rows.map((row, i) => {
                        const inquiryIdIdx = nlResult.columns.indexOf("inquiry_id");
                        const inquiryId = inquiryIdIdx >= 0 ? row[inquiryIdIdx] : null;
                        const isClickable = inquiryId != null;
                        return (
                          <tr
                            key={i}
                            onClick={() => isClickable && navigate(`/inquiries/${inquiryId}`)}
                            className={`transition-colors group ${isClickable ? "cursor-pointer hover:bg-primary/8" : "hover:bg-muted/20"}`}
                          >
                            {row.map((cell, j) => {
                              if (nlResult.columns[j] === "inquiry_id") return null;
                              return (
                                <td key={j} className="px-5 py-3 text-foreground whitespace-nowrap">
                                  {cell === null || cell === undefined
                                    ? <span className="text-muted-foreground">—</span>
                                    : String(cell)}
                                </td>
                              );
                            })}
                            {isClickable && (
                              <td className="px-3 py-3 w-8">
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* History list */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">Report History</h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !reports?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No reports yet. Generate your first one!</p>
            </div>
          ) : (
            reports.map(report => (
              <button
                key={report.id}
                onClick={() => setSelected(report)}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  selected?.id === report.id
                    ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                    : "bg-card border-border hover:border-primary/20 hover:bg-muted/30"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="font-semibold text-foreground text-sm truncate">{report.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">{formatDate(report.createdAt)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteReport.mutate({ id: report.id }); }}
                    className="text-muted-foreground/40 hover:text-rose-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Report viewer */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-border overflow-hidden bg-card min-h-[600px]">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center h-[600px] text-primary space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-20 animate-pulse" />
                  <Brain className="w-14 h-14 relative z-10 animate-bounce" />
                </div>
                <p className="font-semibold text-foreground text-lg">Claude is generating your report...</p>
                <p className="text-sm text-muted-foreground">This may take a moment.</p>
              </div>
            ) : selected ? (
              <>
                <CardHeader className="border-b border-border bg-muted/40 flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-lg text-foreground">{selected.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{formatDate(selected.createdAt)}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl gap-2 border-border text-foreground hover:bg-muted">
                    <Download className="w-4 h-4" /> Export
                  </Button>
                </CardHeader>
                <CardContent className="p-7">
                  <div className="prose max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
                    <ReactMarkdown>{displayContent}</ReactMarkdown>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-5 border border-border">
                  <FileText className="w-9 h-9 opacity-40" />
                </div>
                <p className="text-lg font-semibold text-foreground">Select or Generate a Report</p>
                <p className="text-sm mt-2 max-w-sm text-center">Choose a report type and click Generate to create an AI-powered executive summary.</p>
                <Button onClick={handleGenerate} className="mt-6 h-10 px-6 rounded-xl gap-2">
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
