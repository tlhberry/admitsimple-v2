import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { useListReports, useDeleteReport, useGenerateAiReport } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, FileText, Sparkles, Trash2, Brain, Download,
  TableIcon, ExternalLink, AlertCircle,
  BookmarkPlus, CheckCircle2, RefreshCw, Send, User, BarChart2,
} from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type Timeframe = "week" | "month" | "year" | "custom";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  result?: {
    columns: string[];
    rows: any[][];
    summary: string;
    rowCount: number;
    sql: string;
    chartSuggestion: { type: "bar" | "line"; xKey: string; yKey: string } | null;
  };
  error?: string;
}

// ── Admissions Insights — vertical performance feed ──────────────
function AdmissionsInsights() {
  const [, navigate] = useLocation();
  const [timeframe, setTimeframe] = useState<Timeframe>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const perfUrl = (() => {
    const p = new URLSearchParams({ timeframe });
    if (timeframe === "custom" && customStart && customEnd) {
      p.set("startDate", customStart);
      p.set("endDate", customEnd);
    }
    return `/api/admissions-performance?${p.toString()}`;
  })();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["admissions-performance-reports", timeframe, customStart, customEnd],
    queryFn: () => fetch(perfUrl, { credentials: "include" }).then(r => r.json()),
    staleTime: 60000,
    refetchInterval: 60000,
    enabled: timeframe !== "custom" || (!!customStart && !!customEnd),
  });

  const periodLabel = data?.periodLabel ?? (
    timeframe === "week" ? "This Week" :
    timeframe === "month" ? "This Month" :
    timeframe === "year" ? "This Year" : "Custom Range"
  );

  const period = data?.period ?? { leads: 0, admits: 0, conversion: 0 };
  const refs = (data?.referralSources ?? []) as { source: string; leads: number; admits: number; conversion: number }[];
  const payors = (data?.topPayors ?? []) as { provider: string; leads: number; admits: number; conversion: number }[];
  const perf = data?.topPerformers ?? { admissionsRep: null, leadRep: null, bdRep: null };
  const calls = data?.calls ?? { missedToday: 0, totalToday: 0, missedWeek: 0, totalWeek: 0, answerRate: 100 };
  const speed = data?.speed ?? { avgHoursToAdmit: null, sampleSize: 0 };
  const pipe = data?.pipeline ?? { active: 0, vobPending: 0, readyToAdmit: 0 };

  const formatSpeed = (h: number | null) => h === null ? "No data" : h < 48 ? `${h} hrs` : `${Math.round(h / 24)} days`;

  function Section({ title, badge, onClick, children }: { title: string; badge?: string; onClick?: () => void; children: ReactNode }) {
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
      <div className="px-5 py-3 border-b border-border/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["week", "month", "year", "custom"] as Timeframe[]).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
                timeframe === tf
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {tf === "week" ? "Week" : tf === "month" ? "Month" : tf === "year" ? "Year" : "Custom"}
            </button>
          ))}
          {timeframe === "custom" && (
            <div className="flex items-center gap-1.5 mt-1.5 w-full flex-wrap">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
          )}
        </div>
      </div>

      <Section title={periodLabel}>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        ) : (
          <div className="flex gap-6">
            <div>
              <div className="text-2xl font-extrabold text-foreground tabular-nums">{period.leads}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Leads</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">{period.admits}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Admits</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-primary tabular-nums">{period.conversion}%</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Conversion</div>
            </div>
          </div>
        )}
      </Section>

      <Section title={`Top Referral Sources (${periodLabel})`} badge="Sources" onClick={() => navigate("/referrals")}>
        <div className="space-y-2">
          {refs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity for {periodLabel.toLowerCase()}</p>
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

      <Section title={`Top Payors (${periodLabel})`}>
        <div className="space-y-2">
          {payors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payor data for {periodLabel.toLowerCase()}</p>
          ) : payors.slice(0, 6).map((p, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-3">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", p.provider === "Self-Pay" ? "bg-amber-400" : "bg-primary")} />
                <span className="text-sm text-foreground truncate">{p.provider}</span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground shrink-0 tabular-nums">
                {p.leads} → <span className="text-emerald-400">{p.admits}</span>
                <span className="text-muted-foreground/50 ml-1">({p.conversion}%)</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Top Performers (${periodLabel})`} badge="Reps" onClick={() => navigate("/inquiries?tab=admitted")}>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Closer</span>
            <span className="text-sm font-bold text-foreground">
              {perf.admissionsRep ? `${perf.admissionsRep.name} — ${perf.admissionsRep.admits} admits` : "No data"}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Top Credit</span>
            <span className="text-sm font-bold text-foreground">
              {perf.bdRep ? `${perf.bdRep.name} — ${perf.bdRep.leads} admits`
                : perf.leadRep ? `${perf.leadRep.name} — ${perf.leadRep.leads} leads` : "No data"}
            </span>
          </div>
        </div>
      </Section>

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

      <Section title="Speed to Admit">
        <div>
          <div className="text-3xl font-extrabold text-primary tabular-nums">{formatSpeed(speed.avgHoursToAdmit)}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
            avg time · {speed.sampleSize} admit{speed.sampleSize !== 1 ? "s" : ""} · {periodLabel.toLowerCase()}
          </div>
        </div>
      </Section>

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
      const resp = await fetch(`/api/saved-reports/${report.id}/run`, { method: "POST", credentials: "include" });
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || "Query failed"); }
      return resp.json();
    },
    staleTime: 60000,
    refetchInterval: 300000,
    retry: 1,
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const resp = await fetch(`/api/saved-reports/${report.id}`, { method: "DELETE", credentials: "include" });
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
          <button onClick={() => refetch()} disabled={isFetching}
            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors" title="Refresh">
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          </button>
          <button onClick={handleDelete} disabled={isDeleting}
            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Delete">
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
                    <tr key={i} onClick={() => isClickable && navigate(`/inquiries/${inquiryId}`)}
                      className={`transition-colors group ${isClickable ? "cursor-pointer hover:bg-primary/8" : "hover:bg-muted/20"}`}>
                      {row.map((cell, j) => {
                        if (columns[j] === "inquiry_id") return null;
                        return (
                          <td key={j} className="px-4 py-2.5 text-foreground whitespace-nowrap text-xs">
                            {cell === null || cell === undefined ? <span className="text-muted-foreground">—</span> : String(cell)}
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
              <p className="text-xs text-muted-foreground text-center py-2 border-t border-border">Showing 20 of {rows.length} rows</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Inline result table inside chat bubble ──────────────────────────
function ChatResultTable({ result, onNavigate }: {
  result: NonNullable<ChatMessage["result"]>;
  onNavigate: (id: number) => void;
}) {
  const { columns, rows } = result;
  const hasInquiryId = columns.includes("inquiry_id");
  const visibleCols = columns.filter(c => c !== "inquiry_id");

  // Format cell values
  const fmt = (val: any): string => {
    if (val === null || val === undefined) return "—";
    const s = String(val);
    // ISO date → readable
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
      try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return s; }
    }
    return s;
  };

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-border/60">
      <div className="overflow-x-auto max-h-72">
        <table className="w-full text-left">
          <thead className="bg-muted/60 border-b border-border/60 sticky top-0">
            <tr>
              {visibleCols.map(col => (
                <th key={col} className="px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {col.replace(/_/g, " ")}
                </th>
              ))}
              {hasInquiryId && <th className="px-2 py-2 w-6" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.slice(0, 50).map((row, i) => {
              const inquiryIdIdx = columns.indexOf("inquiry_id");
              const inquiryId = inquiryIdIdx >= 0 ? row[inquiryIdIdx] : null;
              const clickable = inquiryId != null;
              return (
                <tr
                  key={i}
                  onClick={() => clickable && onNavigate(Number(inquiryId))}
                  className={cn(
                    "transition-colors group",
                    clickable ? "cursor-pointer hover:bg-primary/10" : "hover:bg-muted/10",
                  )}
                >
                  {row.map((cell, j) => {
                    if (columns[j] === "inquiry_id") return null;
                    const isName = columns[j].includes("name") || columns[j].includes("first") || columns[j].includes("last");
                    return (
                      <td key={j} className="px-3 py-2.5 whitespace-nowrap text-xs">
                        {clickable && isName ? (
                          <span className="font-semibold text-primary group-hover:underline underline-offset-2">
                            {fmt(cell)}
                          </span>
                        ) : (
                          <span className="text-foreground">{fmt(cell)}</span>
                        )}
                      </td>
                    );
                  })}
                  {clickable && (
                    <td className="px-2 py-2.5 w-6">
                      <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length > 50 && (
          <p className="text-xs text-muted-foreground text-center py-2 border-t border-border/40">
            Showing 50 of {rows.length} rows
          </p>
        )}
      </div>
    </div>
  );
}

// ── Inline chart inside chat bubble ──────────────────────────────────
function ChatResultChart({ result }: { result: NonNullable<ChatMessage["result"]> }) {
  const { columns, rows, chartSuggestion } = result;
  if (!chartSuggestion || rows.length === 0) return null;

  const xIdx = columns.indexOf(chartSuggestion.xKey);
  const yIdx = columns.indexOf(chartSuggestion.yKey);
  if (xIdx < 0 || yIdx < 0) return null;

  const fmt = (val: any): string => {
    const s = String(val ?? "");
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
      try { return new Date(s).toLocaleDateString("en-US", { month: "short", year: "2-digit" }); } catch { return s; }
    }
    return s;
  };

  const chartData = rows.map(row => ({
    x: fmt(row[xIdx]),
    y: Number(row[yIdx]) || 0,
  }));

  const barColor = "#5BC8DC";

  return (
    <div className="mt-3 rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart2 className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {chartSuggestion.yKey.replace(/_/g, " ")} by {chartSuggestion.xKey.replace(/_/g, " ")}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        {chartSuggestion.type === "line" ? (
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="x" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#e2e8f0" }} itemStyle={{ color: barColor }} />
            <Line type="monotone" dataKey="y" stroke={barColor} strokeWidth={2} dot={{ fill: barColor, r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="x" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#e2e8f0" }} itemStyle={{ color: barColor }} />
            <Bar dataKey="y" fill={barColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// ── Save-report inline control ────────────────────────────────────
function SaveControl({ result, prompt, onSaved }: {
  result: NonNullable<ChatMessage["result"]>;
  prompt: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const resp = await fetch("/api/saved-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), sqlQuery: result.sql, columns: result.columns, visualizationType: "table" }),
      });
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || "Save failed"); }
      setSaved(true);
      setShow(false);
      toast({ title: `"${name.trim()}" saved` });
      onSaved();
    } catch (err: any) {
      toast({ title: err.message || "Failed to save", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (saved) {
    return (
      <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
      </div>
    );
  }

  if (show) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setShow(false); }}
          placeholder="Name this report..."
          className="h-7 px-2 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-44"
        />
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
        </button>
        <button onClick={() => setShow(false)} className="text-muted-foreground/60 hover:text-foreground text-xs">✕</button>
      </div>
    );
  }

  return (
    <button onClick={() => { setShow(true); setName(prompt.slice(0, 60)); }}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
      <BookmarkPlus className="w-3.5 h-3.5" /> Save report
    </button>
  );
}

// ── Chat Interface ────────────────────────────────────────────────
function ChatInterface({ onReportSaved }: { onReportSaved: () => void }) {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I can query your admissions data and answer any question you have. Try asking things like:\n\n• **Show me all admissions this month with names**\n• **Admits by rep this week**\n• **Top referral sources last 30 days**\n• **Inquiries with no activity in 48 hours**",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;
    setInput("");

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: prompt };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const resp = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Report generation failed");
      }
      const data = await resp.json();
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.summary || "Here are your results.",
        result: data,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: "",
        error: err.message || "Something went wrong. Try rephrasing your question.",
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-[600px] rounded-2xl border border-border overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30 shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">Ask Anything</p>
          <p className="text-xs text-muted-foreground">Natural language queries powered by Claude</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted/60 border border-border/60 rounded-tl-sm",
            )}>
              {msg.error ? (
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{msg.error}</span>
                </div>
              ) : (
                <>
                  <div className={cn(
                    "prose prose-sm max-w-none",
                    msg.role === "user"
                      ? "prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-li:text-primary-foreground"
                      : "prose-p:text-foreground prose-strong:text-foreground prose-li:text-muted-foreground",
                  )}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>

                  {msg.result && (
                    <>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <TableIcon className="w-3 h-3" />
                        {msg.result.rowCount} row{msg.result.rowCount !== 1 ? "s" : ""}
                        {msg.result.chartSuggestion && (
                          <><span>·</span><BarChart2 className="w-3 h-3" /> chart</>
                        )}
                      </div>

                      {msg.result.chartSuggestion && (
                        <ChatResultChart result={msg.result} />
                      )}

                      {msg.result.rows.length > 0 && (
                        <ChatResultTable
                          result={msg.result}
                          onNavigate={id => navigate(`/inquiries/${id}`)}
                        />
                      )}

                      <div className="mt-2">
                        <SaveControl
                          result={msg.result}
                          prompt={messages[messages.indexOf(msg) - 1]?.text ?? ""}
                          onSaved={onReportSaved}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-muted/60 border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 shrink-0 bg-card">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... admits by rep this month, show me all IOP inquiries, top referral sources..."
            rows={1}
            className="flex-1 resize-none rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 max-h-32 overflow-y-auto"
            style={{ minHeight: "42px" }}
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Press Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
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

  const { data: savedReports, refetch: refetchSaved } = useQuery<any[]>({
    queryKey: ["/api/saved-reports"],
    queryFn: () => fetch("/api/saved-reports", { credentials: "include" }).then(r => r.json()),
    staleTime: 30000,
  });

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

      {/* ── Chat Interface ── */}
      <div className="mb-6">
        <ChatInterface onReportSaved={() => refetchSaved()} />
      </div>

      {/* ── Saved Reports Section ── */}
      {savedReports && savedReports.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Saved Reports</h2>
            <span className="text-xs text-muted-foreground">{savedReports.length} report{savedReports.length !== 1 ? "s" : ""} · auto-refreshes with live data</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {savedReports.map(report => (
              <SavedReportCard key={report.id} report={report} onDelete={() => refetchSaved()} />
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
              <button key={report.id} onClick={() => setSelected(report)}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  selected?.id === report.id
                    ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                    : "bg-card border-border hover:border-primary/20 hover:bg-muted/30"
                }`}>
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
                  <button onClick={(e) => { e.stopPropagation(); deleteReport.mutate({ id: report.id }); }}
                    className="text-muted-foreground/40 hover:text-rose-400 transition-colors shrink-0">
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
