import { useGetChartData } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, BarChart2, Users, DollarSign } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const COLORS = ['#5BC8DC', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1', '#F97316', '#14B8A6'];
const gridColor  = "hsl(220,18%,29%)";
const axisColor  = "hsl(220,15%,54%)";
const tooltipStyle = { borderRadius: "10px", border: "none", background: "hsl(220,17%,26%)", color: "#fff", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.4)" };

export default function Analytics() {
  const { data, isLoading } = useGetChartData({});

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
    </Layout>
  );
}
