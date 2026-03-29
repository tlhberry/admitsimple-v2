import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, Plus, Search, Phone, Globe, MapPin, User, Pencil, Trash2, Sparkles,
  Loader2, ChevronRight, Clock, Activity, UserPlus, X, CalendarDays, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES = [
  { value: "hospital", label: "Hospital" },
  { value: "private_practice", label: "Private Practice" },
  { value: "mat_clinic", label: "MAT Clinic" },
  { value: "outpatient_facility", label: "Outpatient Facility" },
  { value: "residential_facility", label: "Residential Facility" },
  { value: "attorneys", label: "Attorneys" },
  { value: "ed_consultant", label: "Ed Consultant" },
  { value: "community", label: "Community" },
  { value: "other", label: "Other" },
];

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

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  hospital: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  private_practice: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  mat_clinic: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  outpatient_facility: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  residential_facility: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
  attorneys: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  ed_consultant: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  community: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  other: "bg-muted text-muted-foreground border-border",
};

// ── API helpers ───────────────────────────────────────────────────────────────

const apiFetch = (url: string, opts?: RequestInit) =>
  fetch(url, { credentials: "include", ...opts }).then(async r => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    return r.json();
  });

// ── Shared sub-components ─────────────────────────────────────────────────────

function FL({ children }: { children: React.ReactNode }) {
  return <Label className="text-sm font-medium text-foreground">{children}</Label>;
}
const inputCls = "mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground";
const textareaCls = "mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none min-h-[80px]";

// ── Account Form Dialog ───────────────────────────────────────────────────────

function AccountFormDialog({
  open, onClose, account, users,
}: {
  open: boolean;
  onClose: () => void;
  account?: any;
  users: any[];
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: account?.name ?? "",
    type: account?.type ?? "",
    phone: account?.phone ?? "",
    website: account?.website ?? "",
    address: account?.address ?? "",
    notes: account?.notes ?? "",
    assignedBdRepId: account?.assignedBdRepId?.toString() ?? "",
  });

  const isEdit = !!account;

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? apiFetch(`/api/referral-accounts/${account.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      : apiFetch("/api/referral-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/referral-accounts"] });
      toast({ title: isEdit ? "Account updated" : "Account created" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    mutation.mutate({ ...form, assignedBdRepId: form.assignedBdRepId && form.assignedBdRepId !== "unassigned" ? form.assignedBdRepId : null });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEdit ? "Edit Account" : "Add Referral Account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FL>Account Name *</FL>
            <Input value={form.name} onChange={set("name")} required placeholder="Name" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FL>Type</FL>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FL>Assigned BD Rep</FL>
              <Select value={form.assignedBdRepId || "unassigned"} onValueChange={v => setForm(f => ({ ...f, assignedBdRepId: v === "unassigned" ? "" : v }))}>
                <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <FL>Phone</FL>
            <Input value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" className={inputCls} />
          </div>
          <div>
            <FL>Website</FL>
            <Input value={form.website} onChange={set("website")} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <FL>Address</FL>
            <Textarea value={form.address} onChange={set("address")} placeholder="123 Main St..." className={textareaCls} />
          </div>
          <div>
            <FL>Notes</FL>
            <Textarea value={form.notes} onChange={set("notes")} placeholder="Account notes..." className={textareaCls} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-border text-foreground hover:bg-muted">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Update Account" : "Save Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Quick Log Activity Dialog ─────────────────────────────────────────────────

function QuickLogDialog({
  open, onClose, accounts, preSelectedAccountId,
}: {
  open: boolean;
  onClose: () => void;
  accounts: any[];
  preSelectedAccountId?: number;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    accountId: preSelectedAccountId?.toString() ?? "",
    activityType: "face_to_face",
    activityDate: today,
    notes: "",
  });

  const url = preSelectedAccountId
    ? `/api/referral-accounts/${preSelectedAccountId}/activities`
    : "/api/bd-activities";

  const mutation = useMutation({
    mutationFn: (data: any) => apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/referral-accounts"] });
      qc.invalidateQueries({ queryKey: ["/api/bd-activities"] });
      if (preSelectedAccountId) {
        qc.invalidateQueries({ queryKey: [`/api/referral-accounts/${preSelectedAccountId}/activities`] });
      }
      toast({ title: "Activity logged" });
      onClose();
      setForm({ accountId: "", activityType: "face_to_face", activityDate: today, notes: "" });
    },
    onError: (e: any) => toast({ title: "Failed to log", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Log Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!preSelectedAccountId && (
            <div>
              <FL>Account *</FL>
              <Select value={form.accountId} onValueChange={v => setForm(f => ({ ...f, accountId: v }))}>
                <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground"><SelectValue placeholder="Select account..." /></SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {accounts.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <FL>Activity Type *</FL>
            <Select value={form.activityType} onValueChange={v => setForm(f => ({ ...f, activityType: v }))}>
              <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                {ACTIVITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FL>Date *</FL>
            <Input type="date" value={form.activityDate}
              onChange={e => setForm(f => ({ ...f, activityDate: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <FL>Notes</FL>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="What was discussed?" className={textareaCls} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-border text-foreground hover:bg-muted">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Log Activity
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Contact Card ──────────────────────────────────────────────────────────────

function ContactFormDialog({ open, onClose, accountId, contact }: {
  open: boolean; onClose: () => void; accountId: number; contact?: any;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!contact;
  const [form, setForm] = useState({
    name: contact?.name ?? "", position: contact?.position ?? "",
    phone: contact?.phone ?? "", email: contact?.email ?? "", notes: contact?.notes ?? "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? apiFetch(`/api/referral-contacts/${contact.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      : apiFetch(`/api/referral-accounts/${accountId}/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/referral-accounts/${accountId}/contacts`] });
      toast({ title: isEdit ? "Contact updated" : "Contact added" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle className="text-foreground">{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); if (form.name.trim()) mutation.mutate(form); }} className="space-y-4">
          <div><FL>Name *</FL><Input required value={form.name} onChange={set("name")} placeholder="Full name" className={inputCls} /></div>
          <div><FL>Position</FL><Input value={form.position} onChange={set("position")} placeholder="Title / Role" className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><FL>Phone</FL><Input value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" className={inputCls} /></div>
            <div><FL>Email</FL><Input value={form.email} onChange={set("email")} placeholder="email@..." className={inputCls} /></div>
          </div>
          <div><FL>Notes</FL><Textarea value={form.notes} onChange={set("notes")} placeholder="Notes..." className={textareaCls} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-border text-foreground hover:bg-muted">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Update" : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Account Detail Panel ──────────────────────────────────────────────────────

function AccountDetail({ account, onClose, users }: { account: any; onClose: () => void; users: any[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);
  const [logActivityOpen, setLogActivityOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: [`/api/referral-accounts/${account.id}/contacts`],
    queryFn: () => apiFetch(`/api/referral-accounts/${account.id}/contacts`),
  });

  const { data: activities = [] } = useQuery<any[]>({
    queryKey: [`/api/referral-accounts/${account.id}/activities`],
    queryFn: () => apiFetch(`/api/referral-accounts/${account.id}/activities`),
  });

  const deleteContact = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/referral-contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/referral-accounts/${account.id}/contacts`] });
      toast({ title: "Contact deleted" });
    },
  });

  const getAiInsights = async () => {
    setAiLoading(true);
    setAiInsights(null);
    try {
      const data = await apiFetch("/api/ai/referral-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });
      setAiInsights(data.insights);
    } catch (e: any) {
      toast({ title: "Failed to load AI insights", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const typeCls = ACCOUNT_TYPE_COLORS[account.type] || ACCOUNT_TYPE_COLORS.other;

  return (
    <div className="bg-card rounded-2xl border border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border bg-muted/30 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-foreground truncate">{account.name}</h2>
            {account.type && (
              <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-bold border capitalize", typeCls)}>
                {ACCOUNT_TYPES.find(t => t.value === account.type)?.label || account.type}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {account.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{account.phone}</span>}
            {account.website && <a href={account.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="w-3 h-3" />{account.website}</a>}
            {account.assignedBdRepName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{account.assignedBdRepName}</span>}
          </div>
          {account.address && <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1"><MapPin className="w-3 h-3 shrink-0 mt-0.5" />{account.address}</p>}
          {account.notes && <p className="text-xs text-muted-foreground mt-2 italic">{account.notes}</p>}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* AI Insights */}
      <div className="px-5 pt-4">
        <Button variant="outline" size="sm" onClick={getAiInsights} disabled={aiLoading}
          className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5 h-8 rounded-xl w-full sm:w-auto">
          {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          AI Referral Insights
        </Button>
        {aiInsights && (
          <div className="mt-3 p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold text-violet-300">AI Referral Insights</span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{aiInsights}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden px-5 pb-5 pt-3">
        <Tabs defaultValue="contacts" className="h-full flex flex-col">
          <TabsList className="bg-muted/40 border border-border rounded-xl h-9 p-1 mb-4">
            <TabsTrigger value="contacts" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card data-[state=active]:text-foreground">
              Contacts ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="activities" className="rounded-lg text-xs flex-1 data-[state=active]:bg-card data-[state=active]:text-foreground">
              Activity Log ({activities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-0 flex-1 overflow-y-auto space-y-2">
            <Button size="sm" onClick={() => { setEditContact(null); setContactFormOpen(true); }}
              className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl h-8 gap-1.5 text-xs w-full mb-3">
              <UserPlus className="w-3.5 h-3.5" /> Add Contact
            </Button>
            {contacts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
                <User className="w-10 h-10 mb-3 opacity-20" />
                <p>No contacts yet.</p>
              </div>
            )}
            {contacts.map((c: any) => (
              <div key={c.id} className="p-3 rounded-xl border border-border bg-muted/30 hover:border-border/70 transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    {c.position && <p className="text-xs text-muted-foreground">{c.position}</p>}
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                    </div>
                    {c.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">{c.notes}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditContact(c); setContactFormOpen(true); }}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteContact.mutate(c.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="activities" className="mt-0 flex-1 overflow-y-auto space-y-2">
            <Button size="sm" onClick={() => setLogActivityOpen(true)}
              className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl h-8 gap-1.5 text-xs w-full mb-3">
              <Plus className="w-3.5 h-3.5" /> Log Activity
            </Button>
            {activities.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
                <Activity className="w-10 h-10 mb-3 opacity-20" />
                <p>No activities logged yet.</p>
              </div>
            )}
            {activities.map((a: any) => (
              <div key={a.id} className="p-3 rounded-xl border border-border bg-muted/30">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border",
                    ACTIVITY_COLORS[a.activityType] || ACTIVITY_COLORS.other)}>
                    {ACTIVITY_TYPES.find(t => t.value === a.activityType)?.label || a.activityType}
                  </span>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
                      {a.activityDate ? format(new Date(a.activityDate), "MMM d, yyyy") : "—"}
                    </span>
                    {a.userName && <p className="text-[11px] text-muted-foreground/70">{a.userName}</p>}
                  </div>
                </div>
                {a.notes && <p className="text-xs text-muted-foreground leading-relaxed">{a.notes}</p>}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {contactFormOpen && (
        <ContactFormDialog
          open={contactFormOpen}
          onClose={() => { setContactFormOpen(false); setEditContact(null); }}
          accountId={account.id}
          contact={editContact}
        />
      )}
      {logActivityOpen && (
        <QuickLogDialog
          open={logActivityOpen}
          onClose={() => setLogActivityOpen(false)}
          accounts={[account]}
          preSelectedAccountId={account.id}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReferralAccounts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<any | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  const { data: accounts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/referral-accounts"],
    queryFn: () => apiFetch("/api/referral-accounts"),
    staleTime: 30000,
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: () => apiFetch("/api/users"),
    staleTime: 60000,
  });

  const deleteAccount = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/referral-accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/referral-accounts"] });
      if (selectedAccount) setSelectedAccount(null);
      toast({ title: "Account deleted" });
    },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() =>
    accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase())),
    [accounts, search]
  );

  return (
    <Layout>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary" />
            Referral Accounts
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage BD referral accounts, contacts, and activity.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setQuickLogOpen(true)}
            className="rounded-xl h-10 border-border text-foreground hover:bg-muted gap-1.5">
            <Activity className="w-4 h-4" /> Log Activity
          </Button>
          <Button onClick={() => { setEditAccount(null); setAddAccountOpen(true); }}
            className="rounded-xl h-10 bg-primary gap-1.5">
            <Plus className="w-4 h-4" /> Add Account
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..."
          className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground" />
      </div>

      {/* Two-column layout when account selected */}
      <div className={cn("grid gap-5", selectedAccount ? "grid-cols-1 lg:grid-cols-5" : "grid-cols-1")}>
        {/* Account List */}
        <div className={selectedAccount ? "lg:col-span-2" : ""}>
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Building2 className="w-14 h-14 mb-4 opacity-20" />
              <p className="text-sm">{search ? "No accounts match your search." : "No referral accounts yet. Add your first account to get started."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(account => {
                const isSelected = selectedAccount?.id === account.id;
                const typeCls = ACCOUNT_TYPE_COLORS[account.type] || ACCOUNT_TYPE_COLORS.other;
                return (
                  <div
                    key={account.id}
                    onClick={() => setSelectedAccount(isSelected ? null : account)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer group",
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-card hover:border-border/70 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={cn("font-semibold text-sm truncate transition-colors", isSelected ? "text-primary" : "text-foreground group-hover:text-primary")}>
                            {account.name}
                          </p>
                          {account.type && (
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0", typeCls)}>
                              {ACCOUNT_TYPES.find(t => t.value === account.type)?.label || account.type}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {account.assignedBdRepName && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{account.assignedBdRepName}</span>
                          )}
                          {account.phone && (
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{account.phone}</span>
                          )}
                          {account.lastActivityDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(account.lastActivityDate), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={e => { e.stopPropagation(); setEditAccount(account); setAddAccountOpen(true); }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); if (confirm(`Delete "${account.name}"?`)) deleteAccount.mutate(account.id); }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isSelected && "rotate-90 text-primary")} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Account Detail */}
        {selectedAccount && (
          <div className="lg:col-span-3">
            <AccountDetail
              account={selectedAccount}
              onClose={() => setSelectedAccount(null)}
              users={allUsers}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      {addAccountOpen && (
        <AccountFormDialog
          open={addAccountOpen}
          onClose={() => { setAddAccountOpen(false); setEditAccount(null); }}
          account={editAccount}
          users={allUsers}
        />
      )}
      {quickLogOpen && (
        <QuickLogDialog
          open={quickLogOpen}
          onClose={() => setQuickLogOpen(false)}
          accounts={accounts}
        />
      )}
    </Layout>
  );
}
