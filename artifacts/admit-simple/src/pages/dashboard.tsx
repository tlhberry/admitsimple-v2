import { useGetDashboardAnalytics } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, ClipboardCheck, Activity, TrendingUp, Sparkles, ClipboardList } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn, getStatusColor, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1'];

export default function Dashboard() {
  const { data, isLoading } = useGetDashboardAnalytics();

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of admissions performance and pipeline.</p>
        </div>
        <Link href="/inquiries" className="block">
          <button className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            New Inquiry
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <KpiCard title="Today's Inquiries" value={data.kpi.todaysInquiries} icon={Activity} color="text-blue-500" bg="bg-blue-50" />
        <KpiCard title="Week's Admissions" value={data.kpi.weeksAdmissions} icon={ClipboardCheck} color="text-emerald-500" bg="bg-emerald-50" />
        <KpiCard title="Current Census" value={data.kpi.census} icon={Users} color="text-purple-500" bg="bg-purple-50" />
        <KpiCard title="Conversion Rate" value={`${data.kpi.conversionRate}%`} icon={TrendingUp} color="text-amber-500" bg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 shadow-sm rounded-2xl overflow-hidden border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Inquiries Trend (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.inquiriesByDay} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tickFormatter={(str) => str.split('-').slice(1).join('/')} stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Donut */}
        <Card className="shadow-sm rounded-2xl overflow-hidden border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Pipeline Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 h-[300px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {data.statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {data.statusBreakdown.slice(0,4).map((item, i) => (
                <div key={item.status} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {item.status}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Inquiries Table */}
      <Card className="shadow-sm rounded-2xl overflow-hidden border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-slate-600" />
            Recent Inquiries
          </CardTitle>
          <Link href="/inquiries" className="text-sm font-medium text-primary hover:underline">View All</Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Level of Care</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.recentInquiries.map((inq) => (
                <tr key={inq.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {inq.firstName} {inq.lastName}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(inq.status))}>
                      {inq.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{inq.levelOfCare || '—'}</td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(inq.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/inquiries/${inq.id}`} className="text-primary hover:underline font-medium">View</Link>
                  </td>
                </tr>
              ))}
              {data.recentInquiries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No recent inquiries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  );
}

function KpiCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow group cursor-default">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", bg, color)}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
