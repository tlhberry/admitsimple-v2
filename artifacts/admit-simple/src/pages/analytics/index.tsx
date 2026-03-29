import { useGetChartData } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, BarChart2, Users, DollarSign, Building2, Activity } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const COLORS = ['#5BC8DC', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1', '#F97316', '#14B8A6'];
const gridColor  = "hsl(220,18%,29%)";
const axisColor  = "hsl(220,15%,54%)";
const tooltipStyle = { borderRadius: "10px", border: "none", background: "hsl(220,17%,26%)", color: "#fff", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.4)" };

const ACTIVITY_LABELS: Record<string, string> = {
  face_to_face: "Face-to-Face", phone_call: "Phone Call", email: "Email",
  meeting: "Meeting", lunch: "Lunch/Coffee", presentation: "Presentation", other: "Other",
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  hospital: "Hospital", private_practice: "Private Practice", mat_clinic: "MAT Clinic",
  outpatient_facility: "Outpatient", residential_facility: "Residential",
  attorneys: "Attorneys", ed_consultant: "Ed Consultant", community: "Community", other: "Other",
};

export default function Analytics() {
  const { data, isLoading } = useGetChartData({});

  const { data: bdAnalytics } = useQuery<any>({
    queryKey: ["/api/bd-analytics"],
    queryFn: () => fetch("/api/bd-analytics", { credentials: "include" }).then(r => r.json()),
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">Comprehensive performance metrics and trends.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card className="rounded-2xl border-border overflow-hidden">
          <CardHeader className="bg-muted/40 border-b border-border pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <TrendingUp className="w-4 h-4 text-primary" /> Admissions Over Time
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.admissionsOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="date" tickFormatter={(s) => s?.split("-").slice(1).join("/") || s} stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#5BC8DC" strokeWidth={2.5} dot={{ r: 3, fill: "#5BC8DC", stroke: "hsl(220,17%,22%)", strokeWidth: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border overflow-hidden">
          <CardHeader className="bg-muted/40 border-b border-border pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <BarChart2 className="w-4 h-4 text-emerald-400" /> Referral Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.referralPerformance || []} layout="vertical" margin={{ left: 60, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                <XAxis type="number" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="source" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} width={60} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="inquiries" fill="#5BC8DC" radius={[0, 4, 4, 0]} />
                <Bar dataKey="admitted"  fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border overflow-hidden">
          <CardHeader className="bg-muted/40 border-b border-border pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <DollarSign className="w-4 h-4 text-amber-400" /> Payer Mix
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-[260px] flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data?.payerMix || []} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="provider" paddingAngle={3}>
                  {(data?.payerMix || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1">
              {(data?.payerMix || []).slice(0, 5).map((item, i) => (
                <div key={item.provider} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {item.provider}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border overflow-hidden">
          <CardHeader className="bg-muted/40 border-b border-border pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Users className="w-4 h-4 text-purple-400" /> Level of Care Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.levelOfCareDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="levelOfCare" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {(data?.levelOfCareDistribution || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border overflow-hidden">
        <CardHeader className="bg-muted/40 border-b border-border pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <BarChart2 className="w-4 h-4 text-primary" /> Staff Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.staffPerformance || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="name" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="inquiries" fill="#5BC8DC" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Business Development Section ── */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Business Development
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Referral account and BD activity metrics for the last 30 days.</p>
        </div>

        {/* BD Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Card className="rounded-2xl border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Total Referral Accounts</span>
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">{bdAnalytics?.totalAccounts ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Active Accounts (30 days)</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-foreground">{bdAnalytics?.activeAccounts30 ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Total Activities (30 days)</span>
                <BarChart2 className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-foreground">{bdAnalytics?.totalActivities30 ?? "—"}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Activities by Type */}
          <Card className="rounded-2xl border-border overflow-hidden">
            <CardHeader className="bg-muted/40 border-b border-border pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Activity className="w-4 h-4 text-primary" /> Activities by Type (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(bdAnalytics?.activitiesByType || []).map((d: any) => ({
                  name: ACTIVITY_LABELS[d.activityType] || d.activityType,
                  count: d.count,
                }))} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                  <XAxis type="number" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#5BC8DC" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Accounts by Type */}
          <Card className="rounded-2xl border-border overflow-hidden">
            <CardHeader className="bg-muted/40 border-b border-border pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Building2 className="w-4 h-4 text-violet-400" /> Accounts by Type
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 h-[220px] flex flex-col items-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={(bdAnalytics?.accountsByType || []).map((d: any) => ({
                      name: ACCOUNT_TYPE_LABELS[d.type] || d.type || "Unknown",
                      value: d.count,
                    }))}
                    cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" paddingAngle={3}
                  >
                    {(bdAnalytics?.accountsByType || []).map((_: any, i: number) =>
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    )}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {(bdAnalytics?.accountsByType || []).map((d: any, i: number) => (
                  <div key={d.type} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {ACCOUNT_TYPE_LABELS[d.type] || d.type || "Unknown"}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top BD Reps */}
        {(bdAnalytics?.topBdReps?.length > 0) && (
          <Card className="rounded-2xl border-border overflow-hidden">
            <CardHeader className="bg-muted/40 border-b border-border pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Users className="w-4 h-4 text-emerald-400" /> Top BD Reps (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {(bdAnalytics.topBdReps || []).map((rep: any, i: number) => {
                  const max = bdAnalytics.topBdReps[0]?.count || 1;
                  const pct = Math.round((rep.count / max) * 100);
                  return (
                    <div key={rep.userId || i} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground min-w-[140px] truncate">{rep.userName || "Unknown"}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-bold text-foreground min-w-[2rem] text-right">{rep.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
