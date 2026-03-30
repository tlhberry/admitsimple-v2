import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, BedDouble, Brain, AlertTriangle, Sparkles, RefreshCw, X,
  UserPlus, LogOut, BookmarkCheck, Info, Clock, ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Bed = {
  id: number;
  name: string;
  unit: string;
  status: "available" | "occupied" | "reserved";
  currentPatientName: string | null;
  gender: string | null;
  expectedDischargeDate: string | null;
  notes: string | null;
  updatedAt: string | null;
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

// ── Assign Patient Dialog ─────────────────────────────────────────────────────
function AssignModal({
  bed,
  mode,
  onClose,
  onDone,
}: {
  bed: Bed;
  mode: "assign" | "reserve";
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [patientName, setPatientName] = useState("");
  const [gender, setGender] = useState("");
  const [dateField, setDateField] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const isAssign = mode === "assign";
  const dateLabel = isAssign ? "Expected Discharge Date" : "Scheduled Admit Date";
  const endpoint = isAssign ? `/api/beds/${bed.id}/assign` : `/api/beds/${bed.id}/reserve`;

  const handleSubmit = async () => {
    if (!patientName.trim() && isAssign) {
      toast({ title: "Patient name is required", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const body = isAssign
        ? { patientName: patientName.trim(), gender: gender || null, expectedDischargeDate: dateField || null, notes: notes || null }
        : { patientName: patientName.trim() || null, gender: gender || null, scheduledAdmitDate: dateField || null, notes: notes || null };
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error("Request failed");
      toast({ title: isAssign ? `${patientName} assigned to ${bed.name}` : `${bed.name} reserved` });
      onDone();
    } catch {
      toast({ title: "Failed to update bed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-base">
              {isAssign ? "Assign Patient" : "Reserve Bed"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Bed {bed.name} · {bed.unit}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Patient Name {isAssign && <span className="text-rose-400">*</span>}
            </label>
            <Input
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              placeholder={isAssign ? "Full name" : "Optional — pending name"}
              className="h-9 rounded-xl bg-muted border-border text-foreground"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Gender</label>
            <Select value={gender || "unassigned"} onValueChange={v => setGender(v === "unassigned" ? "" : v)}>
              <SelectTrigger className="h-9 rounded-xl bg-muted border-border text-foreground">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="unassigned">Not specified</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{dateLabel}</label>
            <Input
              type="date"
              value={dateField}
              onChange={e => setDateField(e.target.value)}
              className="h-9 rounded-xl bg-muted border-border text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Notes</label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="h-9 rounded-xl bg-muted border-border text-foreground"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isAssign ? "Assign Patient" : "Reserve Bed"}
          </Button>
          <Button onClick={onClose} variant="outline" className="h-9 px-4 rounded-xl border-border text-foreground hover:bg-muted text-sm">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Bed Card ─────────────────────────────────────────────────────────────────
function BedCard({ bed, groupBy, onAction }: { bed: Bed; groupBy: string | null; onAction: (bed: Bed, action: "assign" | "reserve") => void; }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dischargeConfirm, setDischargeConfirm] = useState(false);
  const [discharging, setDischarging] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleDischarge = async () => {
    setDischarging(true);
    try {
      const resp = await fetch(`/api/beds/${bed.id}/discharge`, { method: "POST", credentials: "include" });
      if (!resp.ok) throw new Error("Discharge failed");
      queryClient.invalidateQueries({ queryKey: ["/api/beds"] });
      toast({ title: `${bed.currentPatientName} discharged from ${bed.name}` });
      setDischargeConfirm(false);
    } catch {
      toast({ title: "Discharge failed", variant: "destructive" });
    } finally {
      setDischarging(false);
    }
  };

  const handleClearReservation = async () => {
    setClearing(true);
    try {
      const resp = await fetch(`/api/beds/${bed.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "available" }),
      });
      if (!resp.ok) throw new Error("Clear failed");
      queryClient.invalidateQueries({ queryKey: ["/api/beds"] });
      toast({ title: `${bed.name} is now available` });
    } catch {
      toast({ title: "Failed to clear reservation", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const handleAdmitFromReserve = () => onAction(bed, "assign");

  return (
    <div className={cn(
      "rounded-2xl border-2 p-3.5 flex flex-col gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg",
      STATUS_COLORS[bed.status] ?? "border-border bg-card"
    )}>
      {/* Top row: name + badge */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground text-sm">{bed.name}</span>
        <span className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
          STATUS_BADGE[bed.status]
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[bed.status])} />
          {bed.status}
        </span>
      </div>

      {/* Unit label if not grouped by unit */}
      {!groupBy && (
        <p className="text-[10px] text-muted-foreground font-medium -mt-1">{bed.unit}</p>
      )}

      {/* Content by status */}
      {bed.status === "occupied" && bed.currentPatientName ? (
        <div className="space-y-0.5 flex-1">
          <p className="text-xs text-foreground font-semibold truncate">{bed.currentPatientName}</p>
          {bed.gender && <p className="text-[10px] text-muted-foreground capitalize">{bed.gender}</p>}
          {bed.expectedDischargeDate && (
            <p className="text-[10px] text-muted-foreground">
              DC: {new Date(bed.expectedDischargeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
          {bed.notes && <p className="text-[10px] text-muted-foreground/70 italic truncate">{bed.notes}</p>}
        </div>
      ) : bed.status === "reserved" ? (
        <div className="space-y-0.5 flex-1">
          <p className="text-[10px] text-amber-400 font-semibold">Reserved</p>
          {bed.currentPatientName && <p className="text-xs text-foreground font-medium truncate">{bed.currentPatientName}</p>}
          {bed.gender && <p className="text-[10px] text-muted-foreground capitalize">{bed.gender}</p>}
          {bed.expectedDischargeDate && (
            <p className="text-[10px] text-muted-foreground">
              Admit: {new Date(bed.expectedDischargeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
          {bed.notes && <p className="text-[10px] text-muted-foreground/70 italic truncate">{bed.notes}</p>}
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <p className="text-[10px] text-emerald-400 font-semibold">Open</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-auto pt-1 border-t border-white/5">
        {bed.status === "available" && (
          <div className="flex gap-1.5">
            <button
              onClick={() => onAction(bed, "assign")}
              className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            >
              <UserPlus className="w-3 h-3" /> Assign
            </button>
            <button
              onClick={() => onAction(bed, "reserve")}
              className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors"
            >
              <BookmarkCheck className="w-3 h-3" /> Reserve
            </button>
          </div>
        )}

        {bed.status === "occupied" && (
          dischargeConfirm ? (
            <div className="flex gap-1.5">
              <button
                onClick={handleDischarge}
                disabled={discharging}
                className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-lg bg-rose-500/30 text-rose-300 hover:bg-rose-500/40 transition-colors"
              >
                {discharging ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm DC"}
              </button>
              <button
                onClick={() => setDischargeConfirm(false)}
                className="flex-1 text-[10px] py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDischargeConfirm(true)}
              className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors"
            >
              <LogOut className="w-3 h-3" /> Discharge Patient
            </button>
          )
        )}

        {bed.status === "reserved" && (
          <div className="flex gap-1.5">
            <button
              onClick={handleAdmitFromReserve}
              className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            >
              <UserPlus className="w-3 h-3" /> Admit Now
            </button>
            <button
              onClick={handleClearReservation}
              disabled={clearing}
              className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3" /> Clear</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
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

  const [modal, setModal] = useState<{ bed: Bed; mode: "assign" | "reserve" } | null>(null);

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
    const twoDaysOut = new Date(); twoDaysOut.setDate(twoDaysOut.getDate() + 2);
    return d <= twoDaysOut;
  });

  // Last updated timestamp (most recent bed update)
  const lastUpdated = allBeds.reduce<Date | null>((latest, b) => {
    if (!b.updatedAt) return latest;
    const d = new Date(b.updatedAt);
    return !latest || d > latest ? d : latest;
  }, null);

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
    } catch {
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
      {/* ── Internal Tracking Banner ── */}
      <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <BedDouble className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-foreground">Admissions Bed Board</h1>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                <ShieldCheck className="w-3 h-3" /> Internal Tracking
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Info className="w-3 h-3 shrink-0" />
              This board is managed by the admissions team and is not synced with the EMR.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:shrink-0">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Last updated: {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/beds"] })}
            className="gap-1.5 rounded-xl border-border text-xs h-8"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Card className={cn("rounded-2xl border", availBg)}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Available</p>
            <p className={cn("text-3xl font-bold", availColor)}>
              {available}<span className="text-base text-muted-foreground font-normal"> / {total}</span>
            </p>
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
            <p className="text-3xl font-bold text-foreground">
              {total > 0 ? Math.round((occupied / total) * 100) : 0}
              <span className="text-base text-muted-foreground font-normal">%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {available <= 2 && available < total && (
        <div className="mb-4 flex items-center gap-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span><strong>Low availability:</strong> Only {available} bed{available !== 1 ? "s" : ""} remaining.</span>
        </div>
      )}
      {upcomingDischarges.length > 0 && (
        <div className="mb-4 flex items-center gap-3 p-3 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>{upcomingDischarges.length} discharge{upcomingDischarges.length !== 1 ? "s" : ""} in the next 48 hrs:</strong>{" "}
            {upcomingDischarges.map(b => b.currentPatientName).join(", ")}.
          </span>
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

      {/* Bed grid */}
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
                  <BedCard
                    key={bed.id}
                    bed={bed}
                    groupBy={groupBy}
                    onAction={(b, mode) => setModal({ bed: b, mode })}
                  />
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

      {/* Assign / Reserve modal */}
      {modal && (
        <AssignModal
          bed={modal.bed}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            queryClient.invalidateQueries({ queryKey: ["/api/beds"] });
          }}
        />
      )}
    </Layout>
  );
}
