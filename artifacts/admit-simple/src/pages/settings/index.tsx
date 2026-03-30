import { useState, useEffect } from "react";
import { useListSettings, useBulkUpdateSettings } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Building, Bell, Brain, Shield, Save, Phone, Copy, Check,
  RefreshCw, Users, Plus, Pencil, Power, KeyRound, Trash2, Eye, EyeOff, UserPlus, Mail,
} from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type SettingMap = Record<string, string>;

const ROLES = [
  { value: "admin",      label: "Admin",           desc: "Full system access, manages users" },
  { value: "admissions", label: "Admissions Rep",  desc: "Full operational access" },
  { value: "bd",         label: "BD Rep",           desc: "Referral sourcing & lead generation" },
];

const roleLabel = (role: string) => ROLES.find(r => r.value === role)?.label ?? role;
const roleBadgeCls = (role: string) => {
  if (role === "admin")      return "bg-primary/15 text-primary border-primary/25";
  if (role === "admissions") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
  return "bg-amber-500/15 text-amber-400 border-amber-500/25";
};

function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading } = useListSettings({ category: undefined });
  const [activeTab, setActiveTab] = useState("facility");
  const [values, setValues] = useState<SettingMap>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (data) {
      const map: SettingMap = {};
      data.forEach(s => { map[s.key] = s.value; });
      setValues(map);
    }
  }, [data]);

  const bulkUpdate = useBulkUpdateSettings({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings"] }); toast({ title: "Settings saved" }); },
      onError: () => toast({ title: "Failed to save settings", variant: "destructive" })
    }
  });

  const handleSave = () => {
    const filtered = Object.entries(values)
      .filter(([key]) => data?.find(d => d.key === key)?.category === activeTab)
      .map(([key, value]) => ({ key, value }));
    bulkUpdate.mutate({ data: { settings: filtered } });
  };

  const set    = (key: string, value: string) => setValues(v => ({ ...v, [key]: value }));
  const toggle = (key: string) => setValues(v => ({ ...v, [key]: v[key] === "true" ? "false" : "true" }));

  const [copied, setCopied] = useState(false);
  const webhookUrl = `${window.location.origin}/api/webhooks/ctm`;
  const copyWebhookUrl = () => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const generateSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    set("ctm_webhook_secret", Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
  };

  const tabs = [
    { id: "facility",      label: "Facility",      icon: Building },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "ai",            label: "AI Settings",   icon: Brain },
    { id: "integrations",  label: "Integrations",  icon: Phone },
    ...(isAdmin ? [
      { id: "admissions", label: "Admissions",   icon: UserPlus },
      { id: "users",      label: "Users",        icon: Users },
    ] : []),
  ];

  if (isLoading) return <Layout><div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Layout>;

  const fieldCls = "mt-1.5 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground";
  const labelCls = "text-sm font-medium text-foreground";

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure your facility and system preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab nav */}
        <div className="space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-primary/15 text-primary border border-primary/25"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {activeTab === "facility" && (
            <Card className="rounded-2xl border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Building className="w-4 h-4 text-primary" /> Facility Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { key: "facility_name",         label: "Facility Name" },
                    { key: "facility_phone",        label: "Phone Number" },
                    { key: "facility_fax",          label: "Fax Number" },
                    { key: "facility_email",        label: "Email" },
                    { key: "facility_bed_capacity", label: "Bed Capacity", type: "number" },
                    { key: "facility_license",      label: "License Number" },
                    { key: "facility_npi",          label: "NPI Number" },
                    { key: "facility_timezone",     label: "Timezone" },
                  ].map(f => (
                    <div key={f.key} className={f.key === "facility_address" ? "sm:col-span-2" : ""}>
                      <Label className={labelCls}>{f.label}</Label>
                      <Input value={values[f.key] || ""} onChange={e => set(f.key, e.target.value)} type={(f as any).type} className={fieldCls} />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <Label className={labelCls}>Address</Label>
                    <Input value={values["facility_address"] || ""} onChange={e => set("facility_address", e.target.value)} className={fieldCls} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="rounded-2xl border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Bell className="w-4 h-4 text-amber-400" /> Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {[
                  { key: "notify_new_inquiry",   label: "New Inquiry Received",    desc: "Alert when a new inquiry is submitted" },
                  { key: "notify_status_change", label: "Status Changes",          desc: "Alert when inquiry status is updated" },
                  { key: "notify_daily_digest",  label: "Daily Digest Email",      desc: "Receive a daily summary every morning" },
                  { key: "notify_assignment",    label: "Assignment Notifications",desc: "Alert when an inquiry is assigned to you" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
                    <div>
                      <p className="font-medium text-foreground text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <Switch checked={values[item.key] === "true"} onCheckedChange={() => toggle(item.key)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "ai" && (
            <Card className="rounded-2xl border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Brain className="w-4 h-4 text-primary" /> AI Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 flex items-start gap-3">
                  <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    <strong className="text-primary">HIPAA Notice:</strong>{" "}
                    <span className="text-muted-foreground">AI features use only aggregated, de-identified data. PHI is never transmitted to external AI providers.</span>
                  </p>
                </div>
                {[
                  { key: "ai_auto_summarize",         label: "Auto-Summarize Inquiries",          desc: "Automatically generate AI summaries for new inquiries" },
                  { key: "ai_pipeline_suggestions",   label: "Pipeline Optimization Suggestions", desc: "Get AI recommendations for moving inquiries through the pipeline" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
                    <div>
                      <p className="font-medium text-foreground text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <Switch checked={values[item.key] === "true"} onCheckedChange={() => toggle(item.key)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "integrations" && (
            <Card className="rounded-2xl border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Phone className="w-4 h-4 text-emerald-400" /> Call Tracking Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-sm space-y-1">
                  <p className="font-semibold text-emerald-400">How it works</p>
                  <p className="text-muted-foreground">When a call comes in, CTM sends caller info to this webhook and AdmitSimple automatically creates a new inquiry with the caller details, campaign source, and call notes.</p>
                </div>
                <div>
                  <Label className={labelCls}>Webhook URL</Label>
                  <p className="text-xs text-muted-foreground mb-2">Paste this into your CTM account under <strong className="text-foreground">Settings → Webhooks → Add Webhook</strong>.</p>
                  <div className="flex gap-2">
                    <Input value={webhookUrl} readOnly className="rounded-xl font-mono text-sm bg-muted border-border text-foreground flex-1" />
                    <Button type="button" variant="outline" onClick={copyWebhookUrl} className="shrink-0 rounded-xl px-4 border-border text-foreground hover:bg-muted">
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className={labelCls}>Webhook Secret Token</Label>
                  <p className="text-xs text-muted-foreground mb-2">Set this same value in CTM as the <strong className="text-foreground">X-CTM-Token</strong> custom header.</p>
                  <div className="flex gap-2">
                    <Input value={values["ctm_webhook_secret"] || ""} onChange={e => set("ctm_webhook_secret", e.target.value)} placeholder="No secret set — any request will be accepted" className="rounded-xl font-mono text-sm flex-1 bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                    <Button type="button" variant="outline" onClick={generateSecret} className="shrink-0 rounded-xl px-4 border-border text-foreground hover:bg-muted">
                      <RefreshCw className="w-4 h-4 mr-1" /> Generate
                    </Button>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-xl border border-border p-4 text-sm space-y-4">
                  <div>
                    <p className="font-semibold text-foreground mb-2">CTM Fields → Stored As</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-mono text-muted-foreground">
                      <span><strong className="text-foreground">caller_name</strong> → First / Last Name</span>
                      <span><strong className="text-foreground">caller_number</strong> → Phone</span>
                      <span><strong className="text-foreground">call_id</strong> → CTM Call ID</span>
                      <span><strong className="text-foreground">tracking_number</strong> → CTM Tracking Number</span>
                      <span><strong className="text-foreground">source</strong> → CTM Source (raw)</span>
                      <span><strong className="text-foreground">duration</strong> → Call Duration (seconds)</span>
                      <span><strong className="text-foreground">call_start_time</strong> → Call Date/Time</span>
                      <span><strong className="text-foreground">recording_url</strong> → Recording URL (clickable)</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-2">Derived Profile Fields</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-mono text-muted-foreground">
                      <span><strong className="text-foreground">referralSource</strong> — e.g. "Google PPC"</span>
                      <span><strong className="text-foreground">referralDetails</strong> — raw source, e.g. "google_ads"</span>
                      <span><strong className="text-foreground">onlineSource</strong> — e.g. "google_ppc"</span>
                      <span><strong className="text-foreground">referralOrigin</strong> — always "online"</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => bulkUpdate.mutate({ data: { settings: [{ key: "ctm_webhook_secret", value: values["ctm_webhook_secret"] || "" }] } })} disabled={bulkUpdate.isPending} className="h-10 px-6 rounded-xl gap-2">
                    {bulkUpdate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Integration
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "admissions" && isAdmin && (
            <Card className="rounded-2xl border-border">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Mail className="w-4 h-4 text-primary" /> Admission Email Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div>
                  <Label className={labelCls}>Admission Email Recipient</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">The email address the Admission Facesheet is sent to when a patient is admitted. Only admins can change this.</p>
                  <Input
                    type="email"
                    value={values["admission_email_recipient"] || ""}
                    onChange={e => set("admission_email_recipient", e.target.value)}
                    placeholder="admissions@facility.com"
                    className={fieldCls}
                  />
                </div>
                <div>
                  <Label className={labelCls}>CC Recipients (comma separated)</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">Optional — additional recipients for every admission facesheet.</p>
                  <Input
                    value={values["admission_email_cc"] || ""}
                    onChange={e => set("admission_email_cc", e.target.value)}
                    placeholder="nursing@facility.com, clinical@facility.com"
                    className={fieldCls}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "users" && isAdmin && <UserManagement currentUserId={user?.id} />}

          {activeTab !== "integrations" && activeTab !== "users" && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={bulkUpdate.isPending} className="h-10 px-6 rounded-xl gap-2">
                {bulkUpdate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ─── User Management Panel ────────────────────────────────────────────────────

function UserManagement({ currentUserId }: { currentUserId?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [resetUser, setResetUser] = useState<any>(null);

  const { data: userList = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const r = await fetch("/api/users", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch users");
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/users"] });

  const handleToggle = async (u: any) => {
    try {
      const resp = await fetch(`/api/users/${u.id}/toggle-active`, {
        method: "PATCH", credentials: "include",
      });
      if (!resp.ok) throw new Error((await resp.json()).error);
      invalidate();
      toast({ title: u.isActive ? "User disabled" : "User re-enabled" });
    } catch (e: any) { toast({ title: e.message || "Failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border">
        <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Users className="w-4 h-4 text-primary" /> Team Members
          </CardTitle>
          <Button onClick={() => setShowAdd(true)} size="sm" className="h-8 px-4 rounded-xl gap-1.5 text-sm">
            <Plus className="w-3.5 h-3.5" /> Add User
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="divide-y divide-border">
              {userList.map((u: any) => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {u.initials || u.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{u.name}</span>
                      {u.id === currentUserId && (
                        <span className="text-[10px] font-semibold text-muted-foreground border border-border px-1.5 py-0.5 rounded-md">You</span>
                      )}
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", roleBadgeCls(u.role))}>
                        {roleLabel(u.role)}
                      </span>
                      {!u.isActive && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/25">Disabled</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditUser(u)}
                      title="Edit role"
                      className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setResetUser(u)}
                      title="Reset password"
                      className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => handleToggle(u)}
                        title={u.isActive ? "Disable user" : "Enable user"}
                        className={cn(
                          "p-2 rounded-lg border transition-colors",
                          u.isActive
                            ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                            : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        )}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddUserModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={() => { invalidate(); setShowAdd(false); }} />
      <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSaved={() => { invalidate(); setEditUser(null); }} />
      <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onReset={() => setResetUser(null)} />
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

function AddUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admissions" });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(v => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      toast({ title: "Name, email and password are required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const resp = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!resp.ok) throw new Error((await resp.json()).error);
      toast({ title: `${form.name} added successfully` });
      setForm({ name: "", email: "", password: "", role: "admissions" });
      onCreated();
    } catch (e: any) { toast({ title: e.message || "Failed to create user", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const fieldCls = "mt-1.5 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground h-10";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border text-foreground max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Plus className="w-5 h-5 text-primary" /> Add Team Member
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium text-foreground">Full Name *</Label>
            <Input value={form.name} onChange={setF("name")} placeholder="e.g. Sarah Johnson" className={fieldCls} />
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground">Email *</Label>
            <Input value={form.email} onChange={setF("email")} type="email" placeholder="sarah@facility.com" className={fieldCls} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-medium text-foreground">Password *</Label>
              <button
                type="button"
                onClick={() => setForm(v => ({ ...v, password: generatePassword() }))}
                className="text-xs text-primary hover:text-primary/80 underline"
              >
                Generate
              </button>
            </div>
            <div className="relative">
              <Input
                value={form.password}
                onChange={setF("password")}
                type={showPw ? "text" : "password"}
                placeholder="Min 6 characters"
                className={cn(fieldCls, "pr-10")}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground">Role *</Label>
            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-border text-foreground h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    <div>
                      <p className="font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl border-border text-foreground">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="rounded-xl gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [role, setRole] = useState(user?.role ?? "admissions");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) setRole(user.role); }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const resp = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!resp.ok) throw new Error((await resp.json()).error);
      toast({ title: "Role updated" });
      onSaved();
    } catch (e: any) { toast({ title: e.message || "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!user} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border text-foreground max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Pencil className="w-4 h-4 text-primary" /> Edit {user?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label className="text-sm font-medium text-foreground">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="mt-1.5 rounded-xl bg-muted border-border text-foreground h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              {ROLES.map(r => (
                <SelectItem key={r.value} value={r.value}>
                  <div>
                    <p className="font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl border-border text-foreground">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose, onReset }: { user: any; onClose: () => void; onReset: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!user) setPassword(""); }, [user]);

  const handleReset = async () => {
    if (password.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const resp = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!resp.ok) throw new Error((await resp.json()).error);
      toast({ title: `Password reset for ${user.name}` });
      setPassword("");
      onReset();
    } catch (e: any) { toast({ title: e.message || "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!user} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border text-foreground max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <KeyRound className="w-4 h-4 text-amber-400" /> Reset Password — {user?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-sm font-medium text-foreground">New Password</Label>
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className="text-xs text-primary hover:text-primary/80 underline"
            >
              Generate
            </button>
          </div>
          <div className="relative">
            <Input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type={showPw ? "text" : "password"}
              placeholder="Min 6 characters"
              className="rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl border-border text-foreground">Cancel</Button>
          <Button onClick={handleReset} disabled={saving} className="rounded-xl gap-2 bg-amber-600 hover:bg-amber-700 text-white border-0">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Reset Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

