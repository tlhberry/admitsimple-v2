import { useState } from "react";
import { useListInquiries } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Filter, Loader2, Sparkles, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import { cn, getStatusColor, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { CreateInquiryForm } from "@/components/CreateInquiryForm";

export default function InquiriesList() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListInquiries({ search: search || undefined });
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inquiries</h1>
          <p className="text-slate-500 mt-1">Manage and track prospective patient leads.</p>
        </div>
        
        <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
          <SheetTrigger asChild>
            <Button className="px-5 py-2.5 h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Inquiry
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0 border-l-0">
            <SheetHeader className="p-6 bg-slate-50 border-b sticky top-0 z-10">
              <SheetTitle className="text-xl">Create New Inquiry</SheetTitle>
              <SheetDescription>Enter details manually or use AI to parse a document.</SheetDescription>
            </SheetHeader>
            <div className="p-6">
              <CreateInquiryForm onSuccess={() => setIsFormOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by name, phone, or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-white border-slate-200"
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto h-10 rounded-xl flex gap-2 text-slate-600 border-slate-200">
            <Filter className="w-4 h-4" /> Filter
          </Button>
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
                  <th className="px-6 py-4 font-semibold">Patient Name</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Level of Care</th>
                  <th className="px-6 py-4 font-semibold">Created Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data?.map((inq) => (
                  <tr key={inq.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => window.location.href = `${import.meta.env.BASE_URL}inquiries/${inq.id}`}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{inq.firstName} {inq.lastName}</div>
                      {inq.priority === 'High' && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Urgent
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{inq.phone || '—'}</div>
                      <div className="text-xs text-slate-400">{inq.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", getStatusColor(inq.status))}>
                        {inq.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{inq.levelOfCare || '—'}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(inq.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {data?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <ClipboardList className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No inquiries found</h3>
                        <p className="text-slate-500 mt-1">Try adjusting your search or create a new inquiry.</p>
                        <Button className="mt-4 rounded-xl" onClick={() => setIsFormOpen(true)}>Create Inquiry</Button>
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
