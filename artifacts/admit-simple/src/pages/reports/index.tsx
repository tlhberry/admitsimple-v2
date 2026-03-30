import { useState, useRef, useEffect, type ReactNode } from "react";
import { useListReports, useDeleteReport, useGenerateAiReport } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, FileText, Sparkles, Trash2, Brain, Download, Search,
  TableIcon, ExternalLink, AlertCircle,
  BookmarkPlus, CheckCircle2, RefreshCw,
} from "lucide-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

// ── Admissions Insights — vertical performance feed ──────────────
function AdmissionsInsights() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admissions-performance"],
    queryFn: () => fetch("/api/admissions-performance", { credentials: "include" }).then(r => r.json()),
    staleTime: 60000,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  const week   = data?.week   ?? { leads: 0, admits: 0, conversion: 0 };
  const refs   = (data?.referralSources ?? []) as { source: string; leads: number; admits: number; conversion: number }[];
  const perf   = data?.topPerformers ?? { admissionsRep: null, leadRep: null, bdRep: null };
  const calls  = data?.calls  ?? { missedToday: 0, totalToday: 0, missedWeek: 0, totalWeek: 0, answerRate: 100 };
  const speed  = data?.speed  ?? { avgHoursToAdmit: null, sampleSize: 0 };
  const pipe   = data?.pipeline ?? { active: 0, vobPending: 0, readyToAdmit: 0 };

  const formatSpeed = (h: number | null) => h === null ? "No data" : h < 48 ? `${h} hrs` : `${Math.round(h / 24)} days`;

  function Section({
    title, badge, onClick, children,
  }: { title: string; badge?: string; onClick?: () => void; children: ReactNode }) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "px-5 py-4 border-b border-border/60 last:border-b-0",
          onClick && "cursor-pointer hover:bg-muted/20 active:bg-muted/40 transition-colors",
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
          {badge && <span className="text-[10px] text-muted-foreground/60">{badge} →</span>}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/0">
      {/* 1 — This Week */}
      <Section title="This Week">
        <div className="flex gap-6">
          <div>
            <div className="text-2xl font-extrabold text-foreground tabular-nums">{week.leads}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Leads</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">{week.admits}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Admits</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-primary tabular-nums">{week.conversion}%</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Conversion</div>
          </div>
        </div>
      </Section>

      {/* 2 — Referral Sources */}
      <Section title="Top Referral Sources" badge="Sources" onClick={() => navigate("/referrals")}>
        <div className="space-y-2">
          {refs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity this week</p>
          ) : refs.slice(0, 6).map((r, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-foreground truncate flex-1 pr-3">{r.source}</span>
              <span className="text-xs font-semibold text-muted-foreground shrink-0 tabular-nums">
                {r.leads} → <span className="text-emerald-400">{r.admits}</span>
                <span className="text-muted-foreground/50 ml-1">({r.conversion}%)</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* 3 — Top Performers */}
      <Section title="Top Performers" badge="Reps" onClick={() => navigate("/inquiries?tab=admitted")}>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Closer</span>
            <span className="text-sm font-bold text-foreground">
              {perf.admissionsRep
                ? `${perf.admissionsRep.name} — ${perf.admissionsRep.admits} admits`
                : "No data this week"}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Top Credit</span>
            <span className="text-sm font-bold text-foreground">
              {perf.bdRep
                ? `${perf.bdRep.name} — ${perf.bdRep.leads} admits`
                : perf.leadRep
                  ? `${perf.leadRep.name} — ${perf.leadRep.leads} leads`
                  : "No data this week"}
            </span>
          </div>
        </div>
      </Section>

      {/* 4 — Call Performance */}
      <Section title="Calls" badge="Calls" onClick={() => navigate("/calls/active")}>
        <div className="flex gap-6">
          <div>
            <div className={cn("text-2xl font-extrabold tabular-nums", calls.missedToday > 0 ? "text-rose-400" : "text-foreground")}>{calls.missedToday}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Missed Today</div>
          </div>
          <div>
            <div className={cn("text-2xl font-extrabold tabular-nums", calls.missedWeek > 0 ? "text-amber-400" : "text-foreground")}>{calls.missedWeek}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Missed Week</div>
          </div>
          <div>
            <div className={cn("text-2xl font-extrabold tabular-nums", calls.answerRate >= 80 ? "text-emerald-400" : "text-amber-400")}>{calls.answerRate}%</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Answer Rate</div>
          </div>
        </div>
      </Section>

      {/* 5 — Speed */}
      <Section title="Speed to Admit">
        <div>
          <div className="text-3xl font-extrabold text-primary tabular-nums">{formatSpeed(speed.avgHoursToAdmit)}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
            avg time · {speed.sampleSize} admit{speed.sampleSize !== 1 ? "s" : ""} this week
          </div>
        </div>
      </Section>

      {/* 6 — Pipeline */}
      <Section title="Pipeline" badge="Pipeline" onClick={() => navigate("/pipeline")}>
        <div className="flex gap-6">
          <div>
            <div className="text-2xl font-extrabold text-foreground tabular-nums">{pipe.active}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</div>
          </div>
          <div>
            <div className={cn("text-2xl font-extrabold tabular-nums", pipe.vobPending > 5 ? "text-amber-400" : "text-foreground")}>{pipe.vobPending}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">VOB</div>
          </div>
          <div>
            <div className={cn("text-2xl font-extrabold tabular-nums", pipe.readyToAdmit > 0 ? "text-emerald-400" : "text-foreground")}>{pipe.readyToAdmit}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Ready {pipe.readyToAdmit > 0 ? "🔥" : ""}</div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Saved Report Card ──────────────────────────────────────────────
function SavedReportCard({ report, onDelete }: { report: any; onDelete: () => void }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<any>({
    queryKey: ["/api/saved-reports", report.id, "run"],
    queryFn: async () => {
      const resp = await fetch(`/api/saved-reports/${report.id}/run`, {
        method: "POST",
        credentials: "include",
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Query failed");
      }
      return resp.json();
    },
    staleTime: 60000,
    refetchInterval: 300000, // refresh every 5 min
    retry: 1,
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const resp = await fetch(`/api/saved-reports/${report.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Delete failed");
      onDelete();
      toast({ title: `"${report.name}" deleted` });
    } catch {
      toast({ title: "Failed to delete report", variant: "destructive" });
      setIsDeleting(false);
    }
  };

  const columns: string[] = data?.columns ?? (report.columns as string[] | null) ?? [];
  const rows: any[][] = data?.rows ?? [];

  return (
    <Card className="rounded-2xl border-border overflow-hidden flex flex-col">
      <CardHeader className="bg-muted/40 border-b border-border py-3 px-4 flex flex-row items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
          <TableIcon className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{report.name}</p>
          <p className="text-xs text-muted-foreground">Saved {formatDate(report.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </CardHeader>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading…
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-8 gap-2 text-rose-400 text-sm">
            <AlertCircle className="w-4 h-4" /> Failed to load data
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No results</div>
        ) : (
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground border-b border-border sticky top-0">
                <tr>
                  {columns.filter(c => c !== "inquiry_id").map(col => (
                    <th key={col} className="px-4 py-2.5 font-semibold whitespace-nowrap text-xs">
                      {col.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </th>
                  ))}
                  {columns.includes("inquiry_id") && <th className="px-2 py-2.5 w-6" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {rows.slice(0, 20).map((row, i) => {
                  const inquiryIdIdx = columns.indexOf("inquiry_id");
                  const inquiryId = inquiryIdIdx >= 0 ? row[inquiryIdIdx] : null;
                  const isClickable = inquiryId != null;
                  return (
                    <tr
                      key={i}
                      onClick={() => isClickable && navigate(`/inquiries/${inquiryId}`)}
                      className={`transition-colors group ${isClickable ? "cursor-pointer hover:bg-primary/8" : "hover:bg-muted/20"}`}
                    >
                      {row.map((cell, j) => {
                        if (columns[j] === "inquiry_id") return null;
                        return (
                          <td key={j} className="px-4 py-2.5 text-foreground whitespace-nowrap text-xs">
                            {cell === null || cell === undefined
                              ? <span className="text-muted-foreground">—</span>
                              : String(cell)}
                          </td>
                        );
                      })}
                      {isClickable && (
                        <td className="px-2 py-2.5 w-6">
                          <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > 20 && (
              <p className="text-xs text-muted-foreground text-center py-2 border-t border-border">
                Showing 20 of {rows.length} rows
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Main Reports Page ──────────────────────────────────────────────
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
  const [nlResult, setNlResult] = useState<{
    columns: string[]; rows: any[][]; summary: string; rowCount: number; sql: string;
  } | null>(null);
  const nlResultRef = useRef<HTMLDivElement>(null);

  // Save report state
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);

  // Saved reports list
  const { data: savedReports, refetch: refetchSaved } = useQuery<any[]>({
    queryKey: ["/api/saved-reports"],
    queryFn: () => fetch("/api/saved-reports", { credentials: "include" }).then(r => r.json()),
    staleTime: 30000,
  });

  const handleNlReport = async () => {
    if (!nlPrompt.trim()) return;
    setNlLoading(true);
    setNlResult(null);
    setShowSaveInput(false);
    setSavedJustNow(false);
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

  const handleSaveReport = async () => {
    if (!nlResult || !saveName.trim()) return;
    setIsSaving(true);
    try {
      const resp = await fetch("/api/saved-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: saveName.trim(),
          sqlQuery: nlResult.sql,
          columns: nlResult.columns,
          visualizationType: "table",
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }
      refetchSaved();
      setSavedJustNow(true);
      setShowSaveInput(false);
      setSaveName("");
      toast({ title: `"${saveName.trim()}" saved to your dashboard` });
    } catch (err: any) {
      toast({ title: err.message || "Failed to save report", variant: "destructive" });
    } finally {
      setIsSaving(false);
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
                {/* Save button area */}
                <div className="shrink-0 flex items-center gap-2">
                  {savedJustNow ? (
                    <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Saved!
                    </div>
                  ) : showSaveInput ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={saveName}
                        onChange={e => setSaveName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleSaveReport();
                          if (e.key === "Escape") setShowSaveInput(false);
                        }}
                        placeholder="Report name..."
                        className="h-8 w-48 rounded-lg bg-card border-border text-foreground text-sm"
                        autoFocus
                      />
                      <Button
                        onClick={handleSaveReport}
                        disabled={isSaving || !saveName.trim()}
                        size="sm"
                        className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                      </Button>
                      <button
                        onClick={() => setShowSaveInput(false)}
                        className="text-muted-foreground/60 hover:text-foreground text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => { setShowSaveInput(true); setSaveName(nlPrompt.trim()); }}
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 rounded-lg border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold flex gap-1.5"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      Save Report
                    </Button>
                  )}
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

      {/* ── Saved Reports Section ── */}
      {savedReports && savedReports.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Saved Reports</h2>
            <span className="text-xs text-muted-foreground">{savedReports.length} report{savedReports.length !== 1 ? "s" : ""} · auto-refreshes with live data</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {savedReports.map(report => (
              <SavedReportCard
                key={report.id}
                report={report}
                onDelete={() => refetchSaved()}
              />
            ))}
          </div>
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
              <AdmissionsInsights />
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
