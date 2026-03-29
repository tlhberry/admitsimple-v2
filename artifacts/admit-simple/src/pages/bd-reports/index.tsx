import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, Calendar, Award, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface RepMetric {
  userId: number;
  name: string;
  initials: string;
  role: string;
  f2fThisWeek: number;
  f2fThisMonth: number;
  creditedAdmissions: number;
  admissionsBySource: { source: string | null; count: number }[];
}

const INITIALS_COLORS = [
  "bg-primary/20 text-primary",
  "bg-purple-500/20 text-purple-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-amber-500/20 text-amber-300",
  "bg-rose-500/20 text-rose-300",
  "bg-blue-500/20 text-blue-300",
];

export default function BDReports() {
  const { data: metrics = [], isLoading } = useQuery<RepMetric[]>({
    queryKey: ["/api/bd-reports"],
    queryFn: () => fetch("/api/bd-reports", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const [expandedReps, setExpandedReps] = useState<Set<number>>(new Set());

  const toggleExpanded = (userId: number) => {
    setExpandedReps(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const totalF2FWeek = metrics.reduce((s, r) => s + r.f2fThisWeek, 0);
  const totalF2FMonth = metrics.reduce((s, r) => s + r.f2fThisMonth, 0);
  const totalAdmits = metrics.reduce((s, r) => s + r.creditedAdmissions, 0);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">BD Reports</h1>
        <p className="text-muted-foreground mt-1 text-sm">Per-rep activity and credited admissions metrics.</p>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">F2F This Week</p>
              <p className="text-2xl font-bold text-foreground">{totalF2FWeek}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">F2F This Month</p>
              <p className="text-2xl font-bold text-foreground">{totalF2FMonth}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Credited Admits</p>
              <p className="text-2xl font-bold text-foreground">{totalAdmits}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-rep table */}
      <Card className="rounded-2xl border-border">
        <CardHeader className="bg-muted/40 border-b border-border py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Users className="w-4 h-4 text-muted-foreground" /> Per-Rep Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : metrics.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">No staff data available yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                <span>Rep</span>
                <span className="text-right w-20">F2F / Week</span>
                <span className="text-right w-20">F2F / Month</span>
                <span className="text-right w-24">Credited Admits</span>
                <span className="w-6"></span>
              </div>

              {metrics.map((rep, idx) => {
                const colorClass = INITIALS_COLORS[idx % INITIALS_COLORS.length];
                const isExpanded = expandedReps.has(rep.userId);
                const hasSources = rep.admissionsBySource.length > 0;

                return (
                  <div key={rep.userId}>
                    <div
                      className={cn(
                        "grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center",
                        hasSources && "cursor-pointer hover:bg-muted/30 transition-colors"
                      )}
                      onClick={() => hasSources && toggleExpanded(rep.userId)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0", colorClass)}>
                          {rep.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{rep.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{rep.role.replace("_", " ")}</p>
                        </div>
                      </div>

                      <div className="text-right w-20">
                        <span className={cn(
                          "text-sm font-bold",
                          rep.f2fThisWeek > 0 ? "text-primary" : "text-muted-foreground"
                        )}>
                          {rep.f2fThisWeek}
                        </span>
                      </div>

                      <div className="text-right w-20">
                        <span className={cn(
                          "text-sm font-bold",
                          rep.f2fThisMonth > 0 ? "text-purple-400" : "text-muted-foreground"
                        )}>
                          {rep.f2fThisMonth}
                        </span>
                      </div>

                      <div className="text-right w-24">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold",
                          rep.creditedAdmissions > 0
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <Award className="w-3 h-3" />
                          {rep.creditedAdmissions}
                        </span>
                      </div>

                      <div className="w-6 flex justify-center">
                        {hasSources && (
                          isExpanded
                            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded: admissions by source */}
                    {isExpanded && hasSources && (
                      <div className="px-5 pb-4 bg-muted/20 border-t border-border/40">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-3 mb-2">
                          Admissions by Referral Source
                        </p>
                        <div className="space-y-1.5">
                          {rep.admissionsBySource
                            .sort((a, b) => b.count - a.count)
                            .map(s => (
                              <div key={s.source} className="flex items-center justify-between">
                                <span className="text-sm text-foreground">{s.source || "Unknown"}</span>
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                                  {s.count} admit{s.count !== 1 ? "s" : ""}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
