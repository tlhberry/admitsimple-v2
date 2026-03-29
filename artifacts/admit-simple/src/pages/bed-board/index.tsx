import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, BedDouble, Brain, AlertTriangle, Sparkles, RefreshCw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn, formatDate } from "@/lib/utils";

type Bed = {
  id: number;
  name: string;
  unit: string;
  status: "available" | "occupied" | "reserved";
  currentPatientName: string | null;
  gender: string | null;
  expectedDischargeDate: string | null;
  notes: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  available: "border-emerald-500/40 bg-emerald-500/8",
  occupied:  "border-rose-500/40 bg-rose-500/8",
  reserved:  "border-amber-400/40 bg-amber-400/8",
};

const STATUS_BADGE: Record<string, string> = {
  available: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  occupied:  "bg-rose-500/20 text-rose-400 border-rose-500/30",
  reserved:  "bg-amber-400/20 text-amber-400 border-amber-400/30",
};

const STATUS_DOT: Record<string, string> = {
  available: "bg-emerald-400",
  occupied:  "bg-rose-400",
  reserved:  "bg-amber-400",
};

export default function BedBoard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filterUnit, setFilterUnit] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [groupBy, setGroupBy] = useState<"unit" | "status" | "gender" | null>("unit");

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: "answer" | "prediction"; text: string } | null>(null);

  const { data: beds, isLoading } = useQuery<Bed[]>({
    queryKey: ["/api/beds"],
    queryFn: async () => {
      const resp = await fetch("/api/beds", { credentials: "include" });
      if (!resp.ok) throw new Error("Failed to fetch beds");
      return resp.json();
    },
    refetchInterval: 30000,
  });

  const allBeds = beds ?? [];

  // Apply filters
  const filtered = allBeds.filter(b => {
    if (filterUnit !== "all" && b.unit.toLowerCase() !== filterUnit.toLowerCase()) return false;
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (filterGender !== "all" && (b.gender ?? "").toLowerCase() !== filterGender.toLowerCase()) return false;
    return true;
  });

  const total = allBeds.length;
  const available = allBeds.filter(b => b.status === "available").length;
  const occupied = allBeds.filter(b => b.status === "occupied").length;
  const reserved = allBeds.filter(b => b.status === "reserved").length;
  const pct = total > 0 ? available / total : 0;
  const availColor = pct > 0.5 ? "text-emerald-400" : pct > 0.2 ? "text-amber-400" : "text-rose-400";
  const availBg = pct > 0.5 ? "bg-emerald-500/10 border-emerald-500/30" : pct > 0.2 ? "bg-amber-400/10 border-amber-400/30" : "bg-rose-500/10 border-rose-500/30";

  const units = [...new Set(allBeds.map(b => b.unit))].sort();

  const upcomingDischarges = allBeds.filter(b => {
    if (!b.expectedDischargeDate || b.status !== "occupied") return false;
    const d = new Date(b.expectedDischargeDate);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 2);
    return d <= tomorrow;
  });

  // Group filtered beds
  const grouped = (() => {
    if (!groupBy) return { All: filtered };
    return filtered.reduce<Record<string, Bed[]>>((acc, b) => {
      const key = groupBy === "unit" ? b.unit
        : groupBy === "status" ? b.status
        : b.gender ?? "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    }, {});
  })();

  const handleAskAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const resp = await fetch("/api/ai/bedboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      if (!resp.ok) throw new Error("AI request failed");
      const data = await resp.json();

      if (data.type === "filter" && data.filters) {
        const f = data.filters;
        if (f.unit !== undefined) setFilterUnit(f.unit ?? "all");
        if (f.status !== undefined) setFilterStatus(f.status ?? "all");
        if (f.gender !== undefined) setFilterGender(f.gender ?? "all");
        toast({ title: "Filters applied", description: "Board updated based on your request." });
      } else if (data.type === "group" && data.groupBy) {
        setGroupBy(data.groupBy);
        toast({ title: "View updated", description: `Grouped by ${data.groupBy}` });
      } else if (data.type === "answer") {
        setAiMessage({ type: "answer", text: data.answer });
      } else if (data.type === "prediction") {
        setAiMessage({ type: "prediction", text: data.answer });
      }
    } catch (err: any) {
      toast({ title: "AI request failed", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const clearFilters = () => {
    setFilterUnit("all");
    setFilterStatus("all");
    setFilterGender("all");
    setAiMessage(null);
  };

  const hasActiveFilters = filterUnit !== "all" || filterStatus !== "all" || filterGender !== "all";

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BedDouble className="w-7 h-7 text-primary" /> Bed Board
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time bed availability and census tracking.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/beds"] })}
          className="gap-2 rounded-xl border-border"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Card className={cn("rounded-2xl border", availBg)}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Available</p>
            <p className={cn("text-3xl font-bold", availColor)}>{available}<span className="text-base text-muted-foreground font-normal"> / {total}</span></p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Occupied</p>
            <p className="text-3xl font-bold text-rose-400">{occupied}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-amber-400/20 bg-amber-400/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Reserved</p>
            <p className="text-3xl font-bold text-amber-400">{reserved}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Occupancy</p>
            <p className="text-3xl font-bold text-foreground">{total > 0 ? Math.round((occupied / total) * 100) : 0}<span className="text-base text-muted-foreground font-normal">%</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {available <= 2 && (
        <div className="mb-4 flex items-center gap-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span><strong>Low availability:</strong> Only {available} bed{available !== 1 ? "s" : ""} remaining.</span>
        </div>
      )}
      {upcomingDischarges.length > 0 && (
        <div className="mb-4 flex items-center gap-3 p-3 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span><strong>{upcomingDischarges.length} discharge{upcomingDischarges.length !== 1 ? "s" : ""} in the next 48 hrs:</strong> {upcomingDischarges.map(b => b.currentPatientName).join(", ")}.</span>
        </div>
      )}

      {/* AI insight message */}
      {aiMessage && (
        <div className={cn(
          "mb-4 flex items-start gap-3 p-4 rounded-xl border text-sm",
          aiMessage.type === "prediction"
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-muted/40 text-foreground"
        )}>
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
          <p className="flex-1">{aiMessage.text}</p>
          <button onClick={() => setAiMessage(null)} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI input + Filters row */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        {/* AI input */}
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Brain className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
            <Input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !aiLoading && handleAskAI()}
              placeholder="Ask anything about beds... How many detox beds open? Show female beds. Group by unit."
              className="pl-9 h-10 rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground"
              disabled={aiLoading}
            />
          </div>
          <Button
            onClick={handleAskAI}
            disabled={aiLoading || !aiPrompt.trim()}
            className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shrink-0 flex gap-2"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Ask AI
          </Button>
        </div>

        {/* Manual filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={filterUnit} onValueChange={setFilterUnit}>
            <SelectTrigger className="w-36 h-10 rounded-xl bg-muted border-border text-foreground text-sm">
              <SelectValue placeholder="All Units" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="all">All Units</SelectItem>
              {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-10 rounded-xl bg-muted border-border text-foreground text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterGender} onValueChange={setFilterGender}>
            <SelectTrigger className="w-32 h-10 rounded-xl bg-muted border-border text-foreground text-sm">
              <SelectValue placeholder="Any Gender" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="all">Any Gender</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy ?? "none"} onValueChange={v => setGroupBy(v === "none" ? null : v as any)}>
            <SelectTrigger className="w-36 h-10 rounded-xl bg-muted border-border text-foreground text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="unit">Group by Unit</SelectItem>
              <SelectItem value="status">Group by Status</SelectItem>
              <SelectItem value="gender">Group by Gender</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 px-3 rounded-xl text-muted-foreground hover:text-foreground gap-1">
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Bed grid — grouped */}
      {!isLoading && (
        <div className="space-y-8">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([group, groupBeds]) => (
            <div key={group}>
              {groupBy && (
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{group}</h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{groupBeds.filter(b => b.status === "available").length} available</span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {groupBeds.map(bed => (
                  <div
                    key={bed.id}
                    className={cn(
                      "rounded-2xl border-2 p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-lg",
                      STATUS_COLORS[bed.status] ?? "border-border bg-card"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-foreground text-sm">{bed.name}</span>
                      <span className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        STATUS_BADGE[bed.status]
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[bed.status])} />
                        {bed.status}
                      </span>
                    </div>

                    {!groupBy && (
                      <p className="text-[10px] text-muted-foreground font-medium mb-2">{bed.unit}</p>
                    )}

                    {bed.status === "occupied" && bed.currentPatientName ? (
                      <div className="mt-1 space-y-1">
                        <p className="text-xs text-foreground font-semibold truncate">{bed.currentPatientName}</p>
                        {bed.gender && (
                          <p className="text-[10px] text-muted-foreground capitalize">{bed.gender}</p>
                        )}
                        {bed.expectedDischargeDate && (
                          <p className="text-[10px] text-muted-foreground">
                            DC: {new Date(bed.expectedDischargeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        )}
                      </div>
                    ) : bed.status === "reserved" ? (
                      <div className="mt-1">
                        <p className="text-[10px] text-amber-400 font-medium">Reserved</p>
                        {bed.gender && <p className="text-[10px] text-muted-foreground capitalize">{bed.gender}</p>}
                        {bed.expectedDischargeDate && (
                          <p className="text-[10px] text-muted-foreground">
                            Admit: {new Date(bed.expectedDischargeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <p className="text-[10px] text-emerald-400 font-semibold">Open</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <BedDouble className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-semibold text-foreground">No beds match your filters</p>
              <p className="text-sm mt-1">Try adjusting or clearing the filters above.</p>
              <Button variant="outline" onClick={clearFilters} className="mt-4 rounded-xl">Clear Filters</Button>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
