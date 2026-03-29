import { useState } from "react";
import { useListPatients } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Loader2, UserCheck, Calendar, Activity } from "lucide-react";
import { Link } from "wouter";
import { cn, formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  discharged: "bg-slate-50 text-slate-600 border-slate-200",
  transferred: "bg-blue-50 text-blue-700 border-blue-200",
};

const locColors: Record<string, string> = {
  Detox: "bg-rose-100 text-rose-700",
  RTC: "bg-purple-100 text-purple-700",
  PHP: "bg-orange-100 text-orange-700",
  IOP: "bg-blue-100 text-blue-700",
  OP: "bg-green-100 text-green-700",
};

export default function Patients() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListPatients({ search: search || undefined });

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Patients</h1>
          <p className="text-slate-500 mt-1">Current census and treatment management.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="rounded-2xl border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Census</p>
              <p className="text-2xl font-bold text-slate-900">{data?.filter(p => p.status === "active").length ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">In Detox</p>
              <p className="text-2xl font-bold text-slate-900">{data?.filter(p => p.levelOfCare === "Detox" && p.status === "active").length ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">In RTC</p>
              <p className="text-2xl font-bold text-slate-900">{data?.filter(p => p.levelOfCare === "RTC" && p.status === "active").length ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Discharged</p>
              <p className="text-2xl font-bold text-slate-900">{data?.filter(p => p.status === "discharged").length ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-white border-slate-200"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Patient</th>
                  <th className="px-6 py-4 font-semibold">Level of Care</th>
                  <th className="px-6 py-4 font-semibold">Current Stage</th>
                  <th className="px-6 py-4 font-semibold">Admit Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data?.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{patient.firstName} {patient.lastName}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{patient.phone || patient.email || "—"}</div>
                    </td>
                    <td className="px-6 py-4">
                      {patient.levelOfCare ? (
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", locColors[patient.levelOfCare] || "bg-slate-100 text-slate-600")}>
                          {patient.levelOfCare}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{patient.currentStage || "—"}</td>
                    <td className="px-6 py-4 text-slate-500">{patient.admitDate ? formatDate(patient.admitDate as string) : "—"}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", statusColors[patient.status] || "bg-slate-50 text-slate-600 border-slate-200")}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!data || data.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <UserCheck className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="font-medium">No patients found</p>
                        <p className="text-sm mt-1">Convert an inquiry to add a patient to the census.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Layout>
  );
}
