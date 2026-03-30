import { useGetDashboardAnalytics } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, ClipboardCheck, Activity, TrendingUp, Sparkles, ClipboardList, ChevronRight, Plus, Phone, MessageSquare } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn, getStatusColor, formatDate, groupByDay } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { AdmissionsTaskBoard } from "@/components/AdmissionsTaskBoard";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CreateInquiryForm } from "@/components/CreateInquiryForm";

const COLORS = ['#5BC8DC', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1'];

export default function Dashboard() {
  const { data, isLoading } = useGetDashboardAnalytics();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!data) return <Layout><div>No data available</div></Layout>;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Overview of admissions performance and pipeline.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Inquiry
        </button>

        <Sheet open={showCreate} onOpenChange={setShowCreate}>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0 bg-card border-l border-border">
            <SheetHeader className="p-6 bg-muted border-b border-border sticky top-0 z-10">
              <SheetTitle className="text-xl text-foreground">Create New Inquiry</SheetTitle>
              <SheetDescription className="text-muted-foreground">Enter details manually or use AI to parse a document.</SheetDescription>
            </SheetHeader>
            <div className="p-6">
              <CreateInquiryForm onSuccess={() => setShowCreate(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* KPI Cards — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KpiCard title="Today's Inquiries" value={data.kpi.todaysInquiries} icon={Activity}      href="/inquiries" accent="cyan"    />
        <KpiCard title="Week's Admissions"  value={data.kpi.weeksAdmissions} icon={ClipboardCheck} href="/pipeline"  accent="emerald" />
        <KpiCard title="Current Census"     value={data.kpi.census}           icon={Users}         href="/patients"  accent="purple"  />
        <KpiCard title="Conversion Rate"    value={`${data.kpi.conversionRate}%`} icon={TrendingUp} href="/analytics" accent="amber"   />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* AI Task Board */}
        <Card className="lg:col-span-2 rounded-2xl border-border overflow-hidden flex flex-col min-h-[320px] max-h-[420px]">
          <AdmissionsTaskBoard />
        </Card>

        {/* Status Donut */}
        <Card className="rounded-2xl border-border overflow-hidden">
          <CardHeader className="bg-muted/40 border-b border-border pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Pipeline Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.statusBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="count" nameKey="status">
                  {data.statusBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', background: 'hsl(220,17%,26%)', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-1 pb-2">
              {data.statusBreakdown.slice(0, 4).map((item, i) => (
                <div key={item.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {item.status}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Inquiries */}
      <Card className="rounded-2xl border-border overflow-hidden">
        <CardHeader className="bg-muted/40 border-b border-border pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            Recent Inquiries
          </CardTitle>
          <Link href="/inquiries" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">View All</Link>
        </CardHeader>

        {/* Mobile: card list */}
        <div className="md:hidden divide-y divide-border">
          {data.recentInquiries.length === 0 ? (
            <p className="px-6 py-8 text-center text-muted-foreground text-sm">No recent inquiries found.</p>
          ) : groupByDay(data.recentInquiries).flatMap(({ label, items }) => [
            <div key={`day-${label}`} className="flex items-center gap-3 px-4 pt-3 pb-1">
              <div className="h-px flex-1 bg-border/50" />
              <span className="text-[10px] font-semibold text-muted-foreground/55 uppercase tracking-widest whitespace-nowrap">{label}</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>,
            ...items.map((inq) => (
              <button key={inq.id} onClick={() => navigate(`/inquiries/${inq.id}`)}
                className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-muted/30 transition-colors active:scale-[0.99]">
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                  {inq.firstName?.charAt(0) ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">{inq.firstName} {inq.lastName}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", getStatusColor(inq.status))}>{inq.status}</span>
                    <span className="text-[11px] text-muted-foreground">{inq.levelOfCare || "—"}</span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 ml-auto">
                  {(inq as any).phone && (
                    <>
                      <a
                        href={`tel:${(inq as any).phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`sms:${(inq as any).phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                        title="Text"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    </>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            )),
          ])}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Level of Care</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.recentInquiries.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No recent inquiries found.</td></tr>
              ) : groupByDay(data.recentInquiries).flatMap(({ label, items }) => [
                <tr key={`day-${label}`}>
                  <td colSpan={5} className="px-6 pt-4 pb-1.5">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border/40" />
                      <span className="text-[10px] font-semibold text-muted-foreground/55 uppercase tracking-widest whitespace-nowrap">{label}</span>
                      <div className="h-px flex-1 bg-border/40" />
                    </div>
                  </td>
                </tr>,
                ...items.map((inq) => (
                  <tr key={inq.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/inquiries/${inq.id}`)}>
                    <td className="px-6 py-4 font-medium text-foreground">{inq.firstName} {inq.lastName}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(inq.status))}>{inq.status}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{inq.levelOfCare || '—'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(inq.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {(inq as any).phone && (
                          <>
                            <a
                              href={`tel:${(inq as any).phone}`}
                              onClick={(e) => e.stopPropagation()}
                              title={`Call ${(inq as any).phone}`}
                              className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`sms:${(inq as any).phone}`}
                              onClick={(e) => e.stopPropagation()}
                              title={`Text ${(inq as any).phone}`}
                              className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}
                        <span className="text-primary hover:text-primary/80 font-medium text-sm ml-1">View</span>
                      </div>
                    </td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  );
}

const accentMap: Record<string, { icon: string; bg: string }> = {
  cyan:    { icon: "text-primary",     bg: "bg-primary/15 border border-primary/20" },
  emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/15 border border-emerald-500/20" },
  purple:  { icon: "text-purple-400",  bg: "bg-purple-500/15 border border-purple-500/20" },
  amber:   { icon: "text-amber-400",   bg: "bg-amber-500/15 border border-amber-500/20" },
};

function KpiCard({ title, value, icon: Icon, href, accent }: {
  title: string; value: string | number; icon: any; href: string; accent: string;
}) {
  const { icon, bg } = accentMap[accent] ?? accentMap.cyan;
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate(href)}
      className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:bg-card/70 transition-all group active:scale-[0.98] cursor-pointer"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", bg)}>
          <Icon className={cn("w-4 h-4", icon)} />
        </div>
        <ChevronRight className="ml-auto w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-foreground tracking-tight">{value}</h3>
    </button>
  );
}
