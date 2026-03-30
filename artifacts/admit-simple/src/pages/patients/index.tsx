import { useState } from "react";
import { useListPatients } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Loader2, UserCheck, Calendar, Activity, ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useLocation } from "wouter";

const statusColors: Record<string, string> = {
  active:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  discharged: "bg-muted text-muted-foreground border-border",
  transferred:"bg-blue-500/15 text-blue-400 border-blue-500/25",
};

const locColors: Record<string, string> = {
  Detox: "bg-rose-500/20 text-rose-300",
  RTC:   "bg-purple-500/20 text-purple-300",
  PHP:   "bg-orange-500/20 text-orange-300",
  IOP:   "bg-blue-500/20 text-blue-300",
  OP:    "bg-emerald-500/20 text-emerald-300",
};

export default function Patients() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListPatients({ search: search || undefined });
  const [, navigate] = useLocation();

  const active     = data?.filter(p => p.status === "active").length ?? 0;
  const inDetox    = data?.filter(p => p.levelOfCare === "Detox" && p.status === "active").length ?? 0;
  const inRTC      = data?.filter(p => p.levelOfCare === "RTC" && p.status === "active").length ?? 0;
  const discharged = data?.filter(p => p.status === "discharged").length ?? 0;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Patients</h1>
        <p className="text-muted-foreground mt-1 text-sm">Current census and treatment management.</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { icon: UserCheck, label: "Active Census",  value: active,     color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
          { icon: Activity,  label: "In Detox",       value: inDetox,    color: "text-rose-400",    bg: "bg-rose-500/15 border-rose-500/20" },
          { icon: UserCheck, label: "In RTC",         value: inRTC,      color: "text-purple-400",  bg: "bg-purple-500/15 border-purple-500/20" },
          { icon: Calendar,  label: "Discharged",     value: discharged, color: "text-primary",     bg: "bg-primary/15 border-primary/20" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label} className="rounded-2xl border-border p-4">
            <div className="flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border", bg)}>
                <Icon className={cn("w-4 h-4", color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-2xl font-bold text-foreground">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {isLoading && (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Mobile card list */}
      {!isLoading && (data?.length ?? 0) > 0 && (
        <div className="md:hidden flex flex-col gap-2">
          {data?.map((patient) => (
            <div key={patient.id} onClick={() => navigate(`/patients/${patient.id}`)} className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors">
              <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                {patient.firstName?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm truncate">{patient.firstName} {patient.lastName}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {patient.levelOfCare && (
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", locColors[patient.levelOfCare] || "bg-muted text-muted-foreground")}>
                      {patient.levelOfCare}
                    </span>
                  )}
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", statusColors[patient.status] || statusColors.discharged)}>
                    {patient.status}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs text-muted-foreground">{patient.admitDate ? formatDate(patient.admitDate as string) : "—"}</div>
                <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      {!isLoading && (data?.length ?? 0) > 0 && (
        <div className="hidden md:block rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Patient</th>
                <th className="px-6 py-3.5 font-semibold">Level of Care</th>
                <th className="px-6 py-3.5 font-semibold">Current Stage</th>
                <th className="px-6 py-3.5 font-semibold">Admit Date</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {data?.map((patient) => (
                <tr key={patient.id} onClick={() => navigate(`/patients/${patient.id}`)} className="hover:bg-muted/30 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{patient.firstName} {patient.lastName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{patient.phone || patient.email || "—"}</div>
                  </td>
                  <td className="px-6 py-4">
                    {patient.levelOfCare ? (
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", locColors[patient.levelOfCare] || "bg-muted text-muted-foreground")}>
                        {patient.levelOfCare}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{patient.currentStage || "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{patient.admitDate ? formatDate(patient.admitDate as string) : "—"}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", statusColors[patient.status] || statusColors.discharged)}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary" onClick={(e) => { e.stopPropagation(); navigate(`/patients/${patient.id}`); }}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <div className="py-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <UserCheck className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No patients found</p>
          <p className="text-sm text-muted-foreground mt-1">Convert an inquiry to add a patient to the census.</p>
        </div>
      )}
    </Layout>
  );
}
