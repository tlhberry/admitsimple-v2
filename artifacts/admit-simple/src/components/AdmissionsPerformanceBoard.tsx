import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp, Phone, PhoneMissed, Users, Zap, BarChart3,
  CheckCircle2, Clock, PhoneCall, Award
} from "lucide-react";

interface PerformanceData {
  week: { leads: number; admits: number; conversion: number };
  referralSources: { source: string; leads: number; admits: number; conversion: number }[];
  topPerformers: {
    admissionsRep: { name: string; admits: number } | null;
    leadRep: { name: string; leads: number } | null;
    bdRep: { name: string; leads: number } | null;
  };
  calls: { missedToday: number; totalToday: number; missedWeek: number; totalWeek: number; answerRate: number };
  speed: { avgHoursToAdmit: number | null; sampleSize: number };
  pipeline: { active: number; vobPending: number; readyToAdmit: number };
}

function formatSpeed(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function StatRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${accent ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}

function PerfCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-border">
      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center gap-2 space-y-0">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 divide-y divide-border/50">
        {children}
      </CardContent>
    </Card>
  );
}

export function AdmissionsPerformanceBoard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admissions-performance", { credentials: "include" });
      if (!res.ok) { setError(true); return; }
      setData(await res.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (error) {
    return (
      <Card className="rounded-2xl border-border">
        <CardContent className="px-4 py-8 text-center text-muted-foreground text-sm">
          Unable to load performance data.
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="rounded-2xl border-border animate-pulse">
        <CardContent className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</CardContent>
      </Card>
    );
  }

  const { week, referralSources, topPerformers, calls, speed, pipeline } = data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

      {/* Card 1 — Week Performance */}
      <PerfCard title="Week Performance" icon={TrendingUp}>
        <div className="flex items-end justify-between pt-2 pb-3">
          <div className="text-center flex-1">
            <div className="text-3xl font-extrabold text-foreground tabular-nums">{week.leads}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Leads</div>
          </div>
          <div className="w-px h-10 bg-border/60 self-center" />
          <div className="text-center flex-1">
            <div className="text-3xl font-extrabold text-emerald-400 tabular-nums">{week.admits}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Admits</div>
          </div>
          <div className="w-px h-10 bg-border/60 self-center" />
          <div className="text-center flex-1">
            <div className="text-3xl font-extrabold text-primary tabular-nums">{week.conversion}%</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">CVR</div>
          </div>
        </div>
      </PerfCard>

      {/* Card 2 — Referral Sources */}
      <PerfCard title="Referral Sources (This Week)" icon={BarChart3}>
        {referralSources.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">No referral data this week</p>
        ) : referralSources.slice(0, 5).map(r => (
          <div key={r.source} className="flex items-center justify-between py-1.5">
            <span className="text-xs text-foreground truncate flex-1 pr-2">{r.source}</span>
            <span className="text-xs font-semibold text-muted-foreground tabular-nums shrink-0">
              {r.leads} → <span className="text-emerald-400">{r.admits}</span>
              <span className="text-muted-foreground/60 ml-1">({r.conversion}%)</span>
            </span>
          </div>
        ))}
      </PerfCard>

      {/* Card 3 — Top Performers */}
      <PerfCard title="Top Performers (This Week)" icon={Award}>
        {topPerformers.admissionsRep ? (
          <StatRow
            label={`🏆 Closer · ${topPerformers.admissionsRep.name}`}
            value={`${topPerformers.admissionsRep.admits} admits`}
            accent="text-emerald-400"
          />
        ) : (
          <StatRow label="Closer" value="—" />
        )}
        {topPerformers.bdRep ? (
          <StatRow
            label={`⭐ Top Credit · ${topPerformers.bdRep.name}`}
            value={`${topPerformers.bdRep.leads} admits`}
            accent="text-primary"
          />
        ) : topPerformers.leadRep ? (
          <StatRow
            label={`⭐ Top Rep · ${topPerformers.leadRep.name}`}
            value={`${topPerformers.leadRep.leads} leads`}
            accent="text-primary"
          />
        ) : (
          <StatRow label="Top Credit Rep" value="—" />
        )}
      </PerfCard>

      {/* Card 4 — Call Performance */}
      <PerfCard title="Call Performance" icon={Phone}>
        <StatRow
          label="Missed Today"
          value={calls.missedToday === 0 ? "0 ✓" : `${calls.missedToday} / ${calls.totalToday}`}
          accent={calls.missedToday === 0 ? "text-emerald-400" : "text-rose-400"}
        />
        <StatRow
          label="Missed This Week"
          value={`${calls.missedWeek} / ${calls.totalWeek}`}
          accent={calls.missedWeek === 0 ? "text-emerald-400" : "text-amber-400"}
        />
        <StatRow
          label="Answer Rate"
          value={`${calls.answerRate}%`}
          accent={calls.answerRate >= 80 ? "text-emerald-400" : calls.answerRate >= 60 ? "text-amber-400" : "text-rose-400"}
        />
      </PerfCard>

      {/* Card 5 — Speed to Admit */}
      <PerfCard title="Speed to Admit" icon={Zap}>
        <div className="flex flex-col items-center py-2">
          <div className="text-4xl font-extrabold text-primary tabular-nums">
            {formatSpeed(speed.avgHoursToAdmit)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">avg time to admit this week</div>
          {speed.sampleSize > 0 && (
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">based on {speed.sampleSize} admit{speed.sampleSize !== 1 ? "s" : ""}</div>
          )}
          {speed.avgHoursToAdmit === null && (
            <div className="text-xs text-muted-foreground mt-1">No admits with timing data yet</div>
          )}
        </div>
      </PerfCard>

      {/* Card 6 — Pipeline Snapshot */}
      <PerfCard title="Pipeline Snapshot" icon={Users}>
        <StatRow
          label="Active Inquiries"
          value={pipeline.active}
          accent="text-foreground"
        />
        <StatRow
          label="VOB Pending"
          value={pipeline.vobPending}
          accent={pipeline.vobPending > 5 ? "text-amber-400" : "text-foreground"}
        />
        <StatRow
          label="Ready to Admit"
          value={pipeline.readyToAdmit}
          accent={pipeline.readyToAdmit > 0 ? "text-emerald-400" : "text-foreground"}
        />
      </PerfCard>

    </div>
  );
}
