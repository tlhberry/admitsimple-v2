import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Activity, Building2, User, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ACTIVITY_TYPES = [
  { value: "face_to_face", label: "Face-to-Face Visit" },
  { value: "phone_call", label: "Phone Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "lunch", label: "Lunch/Coffee" },
  { value: "presentation", label: "Presentation" },
  { value: "other", label: "Other" },
];

const ACTIVITY_COLORS: Record<string, string> = {
  face_to_face: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  phone_call: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  email: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  meeting: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  lunch: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  presentation: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  other: "bg-muted text-muted-foreground border-border",
};

const apiFetch = (url: string) =>
  fetch(url, { credentials: "include" }).then(r => r.json());

export default function BDActivityFeed() {
  const [filterType, setFilterType] = useState("all");
  const [filterRep, setFilterRep] = useState("all");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  const { data: activities = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bd-activities"],
    queryFn: () => apiFetch("/api/bd-activities"),
    staleTime: 30000,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: () => apiFetch("/api/users"),
    staleTime: 60000,
  });

  const filtered = activities.filter(a => {
    if (filterType !== "all" && a.activityType !== filterType) return false;
    if (filterRep !== "all" && String(a.userId) !== filterRep) return false;
    if (filterStart && new Date(a.activityDate) < new Date(filterStart)) return false;
    if (filterEnd && new Date(a.activityDate) > new Date(filterEnd + "T23:59:59")) return false;
    return true;
  });

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Activity className="w-7 h-7 text-primary" />
          BD Activity Feed
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">All Business Development activity across accounts.</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="bg-card border-border text-foreground h-9">
            <SelectValue placeholder="Activity type" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All Types</SelectItem>
            {ACTIVITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterRep} onValueChange={setFilterRep}>
          <SelectTrigger className="bg-card border-border text-foreground h-9">
            <SelectValue placeholder="BD Rep" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-foreground">
            <SelectItem value="all">All Reps</SelectItem>
            {users.map((u: any) => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
          placeholder="Start date" className="bg-card border-border text-foreground h-9" />
        <Input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
          placeholder="End date" className="bg-card border-border text-foreground h-9" />
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "activity" : "activities"}</span>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Activity className="w-14 h-14 mb-4 opacity-20" />
          <p className="text-sm">No activities found.</p>
        </div>
      ) : (
        <div className="space-y-3 relative before:absolute before:left-5 before:top-0 before:h-full before:w-px before:bg-border">
          {filtered.map(a => (
            <div key={a.id} className="relative flex gap-4 pl-12">
              {/* Timeline dot */}
              <div className={cn(
                "absolute left-0 w-10 h-10 rounded-full border-2 border-border flex items-center justify-center z-10",
                ACTIVITY_COLORS[a.activityType]?.split(" ")[0] || "bg-muted"
              )}>
                <Activity className={cn("w-4 h-4",
                  ACTIVITY_COLORS[a.activityType]?.split(" ")[1] || "text-muted-foreground"
                )} />
              </div>

              <div className="flex-1 p-4 rounded-xl border border-border bg-card hover:border-border/70 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border",
                      ACTIVITY_COLORS[a.activityType] || ACTIVITY_COLORS.other)}>
                      {ACTIVITY_TYPES.find(t => t.value === a.activityType)?.label || a.activityType}
                    </span>
                    {a.accountName && (
                      <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        {a.accountName}
                      </span>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {a.activityDate ? format(new Date(a.activityDate), "MMM d, yyyy") : "—"}
                    </div>
                    {a.userName && (
                      <div className="flex items-center gap-1 mt-0.5 justify-end">
                        <User className="w-3 h-3" />
                        {a.userName}
                      </div>
                    )}
                  </div>
                </div>
                {a.notes && <p className="text-sm text-muted-foreground leading-relaxed">{a.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
