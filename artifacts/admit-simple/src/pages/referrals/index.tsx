import { useState } from "react";
import { useListReferrals, useCreateReferral, useUpdateReferral } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Loader2, Handshake, Phone, Mail, Building, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const typeColors: Record<string, string> = {
  hospital: "bg-blue-100 text-blue-700",
  detox: "bg-rose-100 text-rose-700",
  therapist: "bg-purple-100 text-purple-700",
  insurance: "bg-amber-100 text-amber-700",
  physician: "bg-green-100 text-green-700",
  other: "bg-slate-100 text-slate-700",
};

export default function Referrals() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "hospital", contact: "", phone: "", email: "" });
  const { data, isLoading } = useListReferrals({ search: search || undefined });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createReferral = useCreateReferral({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
        toast({ title: "Referral source added" });
        setOpen(false);
        setForm({ name: "", type: "hospital", contact: "", phone: "", email: "" });
      },
      onError: () => toast({ title: "Failed to add referral source", variant: "destructive" })
    }
  });

  const toggleActive = useUpdateReferral({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
      }
    }
  });

  const handleCreate = () => {
    if (!form.name) return;
    createReferral.mutate({ data: { name: form.name, type: form.type, contact: form.contact || undefined, phone: form.phone || undefined, email: form.email || undefined, isActive: true } });
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Referral Sources</h1>
          <p className="text-slate-500 mt-1">Track and manage referral relationships.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="px-5 py-2.5 h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-md shadow-primary/20 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Add Referral Source</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-sm font-medium text-slate-700">Organization Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Phoenix General Hospital" className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["hospital", "detox", "therapist", "insurance", "physician", "other"].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Contact Name</Label>
                <Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Primary contact" className="mt-1.5 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Email</Label>
                  <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@org.com" className="mt-1.5 rounded-xl" />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createReferral.isPending} className="w-full h-11 rounded-xl mt-2">
                {createReferral.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Source"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search referral sources..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl bg-white border-slate-200" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {data?.map((ref) => (
              <div key={ref.id} className={cn("bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md", ref.isActive ? "border-slate-200" : "border-slate-100 opacity-60")}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Building className="w-5 h-5 text-slate-500" />
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold capitalize", typeColors[ref.type] || typeColors.other)}>
                      {ref.type}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleActive.mutate({ id: ref.id, data: { isActive: !ref.isActive } })}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    title={ref.isActive ? "Deactivate" : "Activate"}
                  >
                    {ref.isActive ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{ref.name}</h3>
                {ref.contact && <p className="text-sm text-slate-600 mb-2">{ref.contact}</p>}
                <div className="space-y-1 mt-3">
                  {ref.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone className="w-3.5 h-3.5" />{ref.phone}
                    </div>
                  )}
                  {ref.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail className="w-3.5 h-3.5" />{ref.email}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(!data || data.length === 0) && (
              <div className="col-span-3 p-16 text-center text-slate-500">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Handshake className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-medium">No referral sources found</p>
                  <p className="text-sm mt-1">Add your first referral source to get started.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </Layout>
  );
}
