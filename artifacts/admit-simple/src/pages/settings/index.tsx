import { useState, useEffect, useRef } from "react";
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
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  MessageSquare, Globe, Bot,
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
  const [activeTab, setActiveTab] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("tab") ?? "facility";
  });
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
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showTwilioGuide, setShowTwilioGuide] = useState(false);
  const [showCtmFields, setShowCtmFields] = useState(false);
  const [savingTwilio, setSavingTwilio] = useState(false);

  const saveTwilioKeys = async () => {
    setSavingTwilio(true);
    try {
      const keysToSave = [
        { key: "twilio_api_key_sid",    value: values["twilio_api_key_sid"]    || "" },
        { key: "twilio_api_key_secret", value: values["twilio_api_key_secret"] || "" },
      ];
      const res = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: keysToSave }),
      });
      if (res.ok) {
        toast({ title: "Twilio API keys saved" });
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      } else {
        toast({ title: "Failed to save", variant: "destructive" });
      }
    } finally {
      setSavingTwilio(false);
    }
  };

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
      { id: "chatbot",    label: "Chatbot",      icon: Bot },
      { id: "admissions", label: "Admissions",   icon: UserPlus },
      { id: "users",      label: "Users",        icon: Users },
      { id: "import",     label: "Import",       icon: Upload },
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <Phone className="w-4 h-4 text-emerald-400" /> Call Tracking Metrics
                  </CardTitle>
                  <button
                    type="button"
                    onClick={() => setShowCtmFields(s => !s)}
                    className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-all"
                  >
                    {showCtmFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showCtmFields ? "Hide Fields" : "Field Reference"}
                  </button>
                </div>
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
                {showCtmFields && (
                  <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/50">
                      <p className="text-sm font-semibold text-foreground">Field Reference</p>
                      <p className="text-xs text-muted-foreground mt-0.5">How CTM webhook fields map into AdmitSimple.</p>
                    </div>
                    <div className="p-4 space-y-4 text-sm">
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
                      <div className="border-t border-border pt-4">
                        <p className="font-semibold text-foreground mb-2">Derived Profile Fields</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-mono text-muted-foreground">
                          <span><strong className="text-foreground">referralSource</strong> — e.g. "Google PPC"</span>
                          <span><strong className="text-foreground">referralDetails</strong> — raw source, e.g. "google_ads"</span>
                          <span><strong className="text-foreground">onlineSource</strong> — e.g. "google_ppc"</span>
                          <span><strong className="text-foreground">referralOrigin</strong> — always "online"</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={() => bulkUpdate.mutate({ data: { settings: [{ key: "ctm_webhook_secret", value: values["ctm_webhook_secret"] || "" }] } })} disabled={bulkUpdate.isPending} className="h-10 px-6 rounded-xl gap-2">
                    {bulkUpdate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Integration
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "integrations" && (
            <Card className="rounded-2xl border-border">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <Phone className="w-4 h-4 text-[#5BC8DC]" /> Twilio Voice — Browser Calling
                  </CardTitle>
                  <button
                    type="button"
                    onClick={() => setShowTwilioGuide(g => !g)}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#5BC8DC] hover:text-[#5BC8DC]/80 bg-[#5BC8DC]/10 hover:bg-[#5BC8DC]/15 border border-[#5BC8DC]/20 px-3 py-1.5 rounded-lg transition-all"
                  >
                    {showTwilioGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showTwilioGuide ? "Hide Guide" : "Setup Guide"}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {showTwilioGuide && (
                  <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/50">
                      <p className="text-sm font-semibold text-foreground">How to set up Twilio Voice browser calling</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Takes about 5 minutes. You'll need access to your Twilio Console.</p>
                    </div>
                    <div className="p-4 space-y-4 text-sm">
                      {[
                        {
                          n: 1,
                          title: "Create a Twilio API Key",
                          body: "In your Twilio Console, go to",
                          link: { href: "https://console.twilio.com/us1/account/keys-credentials/api-keys", label: "Account → API Keys & Tokens" },
                          detail: "Click Create API Key, choose Standard, give it a name (e.g. \"AdmitSimple\"), then click Create.",
                        },
                        {
                          n: 2,
                          title: "Copy the SID and Secret",
                          body: null,
                          link: null,
                          detail: "The SID starts with SK and the Secret is shown only once — copy both immediately before closing the page.",
                        },
                        {
                          n: 3,
                          title: "Create a TwiML App (if you haven't already)",
                          body: "Go to",
                          link: { href: "https://console.twilio.com/us1/develop/voice/manage/twiml-apps", label: "Voice → TwiML Apps" },
                          detail: "Create a new app. Set the Voice Request URL to your webhook endpoint. The TwiML App SID (starts with AP) goes in your server environment as TWILIO_TWIML_APP_SID.",
                        },
                        {
                          n: 4,
                          title: "Paste the API Key SID and Secret below",
                          body: null,
                          link: null,
                          detail: "Enter the SK… SID in the first field and the secret in the second. Click Save Twilio Keys. Browser calling will activate immediately — no restart needed.",
                        },
                      ].map(step => (
                        <div key={step.n} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#5BC8DC]/15 border border-[#5BC8DC]/25 text-[#5BC8DC] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {step.n}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{step.title}</p>
                            <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
                              {step.body && <>{step.body}{" "}</>}
                              {step.link && (
                                <a href={step.link.href} target="_blank" rel="noopener noreferrer" className="text-[#5BC8DC] underline underline-offset-2 hover:text-[#5BC8DC]/80">
                                  {step.link.label}
                                </a>
                              )}
                              {step.link && " — "}
                              {step.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div className="mt-2 pt-3 border-t border-border flex items-start gap-2 text-xs text-amber-300/80">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                        <span>The API Key Secret is shown only once. If you lose it, you'll need to create a new key.</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label className={labelCls}>API Key SID <span className="text-xs text-muted-foreground font-normal">(starts with SK…)</span></Label>
                  <Input
                    value={values["twilio_api_key_sid"] || ""}
                    onChange={e => set("twilio_api_key_sid", e.target.value)}
                    placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className={`${fieldCls} mt-1.5 font-mono text-sm`}
                  />
                </div>

                <div>
                  <Label className={labelCls}>API Key Secret</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      type={showApiSecret ? "text" : "password"}
                      value={values["twilio_api_key_secret"] || ""}
                      onChange={e => set("twilio_api_key_secret", e.target.value)}
                      placeholder="Paste the secret shown once at creation"
                      className={`${fieldCls} font-mono text-sm flex-1 mt-0`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowApiSecret(s => !s)}
                      className="shrink-0 rounded-xl px-3 border-border text-muted-foreground hover:bg-muted"
                    >
                      {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {values["twilio_api_key_sid"] && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    API Key SID is set. Save below to activate browser calling.
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={saveTwilioKeys} disabled={savingTwilio} className="h-10 px-6 rounded-xl gap-2">
                    {savingTwilio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Twilio Keys
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

          {activeTab === "chatbot" && isAdmin && <ChatbotSettings />}

          {activeTab === "import" && isAdmin && <ReferralImport />}

          {activeTab !== "integrations" && activeTab !== "users" && activeTab !== "import" && activeTab !== "chatbot" && (
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

// ─── Chatbot Settings Panel ───────────────────────────────────────────────────

function ChatbotSettings() {
  const { toast } = useToast();
  const [brain, setBrain] = useState("");
  const [notifPhones, setNotifPhones] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPhones, setSavingPhones] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings/chatbot_brain", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.value) setBrain(d.value); })
      .catch(() => {});
    fetch("/api/settings/chatbot_notification_phones", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.value) setNotifPhones(d.value); })
      .catch(() => {});
  }, []);

  const saveBrain = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/chatbot_brain", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: brain }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Chatbot brain saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const savePhones = async () => {
    setSavingPhones(true);
    try {
      const res = await fetch("/api/settings/chatbot_notification_phones", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: notifPhones }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Notification numbers saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSavingPhones(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(text);
          setBrain(typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2));
        } catch {
          setBrain(text);
        }
      } else {
        setBrain(text);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const embedCode = `<!-- AdmitSimple Chat Widget -->
<script>
  (function() {
    var btn = document.createElement('button');
    btn.title = 'Check Insurance';
    btn.style.cssText = 'position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#5BC8DC;border:none;cursor:pointer;z-index:9999;box-shadow:0 4px 16px rgba(91,200,220,0.4);display:flex;align-items:center;justify-content:center';
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d1117" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    var iframe = document.createElement('iframe');
    iframe.src = '${window.location.origin}/chatbot-widget';
    iframe.style.cssText = 'display:none;position:fixed;bottom:92px;right:24px;width:380px;height:580px;max-width:calc(100vw - 48px);border:none;border-radius:16px;z-index:9998;box-shadow:0 8px 40px rgba(0,0,0,0.5)';
    iframe.title = 'Insurance Verification Chat';
    var open = false;
    btn.onclick = function() {
      open = !open;
      iframe.style.display = open ? 'block' : 'none';
    };
    document.body.appendChild(iframe);
    document.body.appendChild(btn);
  })();
</script>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Brain file */}
      <Card className="rounded-2xl border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Brain className="w-4 h-4 text-primary" /> Chatbot Brain
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a .txt or .json file with your admissions playbook — scripts, tone, insurance objection handlers, etc. The AI will use this as its personality and knowledge base.
          </p>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".txt,.json" className="hidden" onChange={handleFileUpload} />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Brain File
            </button>
            <span className="text-xs text-muted-foreground self-center">.txt or .json</span>
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground mb-1.5 block">Brain Content</Label>
            <textarea
              value={brain}
              onChange={e => setBrain(e.target.value)}
              rows={12}
              placeholder="Paste or upload your chatbot instructions here. Examples:&#10;- Tone guidelines&#10;- Common objections and responses&#10;- Insurance-specific scripts&#10;- Treatment program details"
              className="w-full rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm px-4 py-3 resize-y focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <p className="text-xs text-muted-foreground mt-1">{brain.length.toLocaleString()} characters</p>
          </div>
          <div className="flex items-center justify-between">
            <a
              href="/chatbot-widget"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Globe className="w-3.5 h-3.5" /> Preview chatbot
            </a>
            <button
              onClick={saveBrain}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Brain
            </button>
          </div>
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card className="rounded-2xl border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Phone className="w-4 h-4 text-primary" /> Admissions Notification Numbers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            When a visitor sends their first message in the chat widget, we'll text these numbers with a link to view the live conversation inside AdmitSimple.
          </p>
          <div>
            <Label className="text-sm font-medium text-foreground mb-1.5 block">Phone Numbers</Label>
            <Input
              value={notifPhones}
              onChange={e => setNotifPhones(e.target.value)}
              placeholder="+15551234567, +15559876543"
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground mt-1.5">Comma-separated. Use full format: +1XXXXXXXXXX</p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={savePhones}
              disabled={savingPhones}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-all"
            >
              {savingPhones ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Numbers
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Embed code */}
      <Card className="rounded-2xl border-border">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <MessageSquare className="w-4 h-4 text-primary" /> Website Embed Code
            </CardTitle>
            <button
              type="button"
              onClick={() => setShowEmbed(s => !s)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 border border-primary/20 px-3 py-1.5 rounded-lg transition-all"
            >
              {showEmbed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showEmbed ? "Hide Code" : "Show Code"}
            </button>
          </div>
        </CardHeader>
        {showEmbed && (
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste this snippet before the <code className="bg-muted px-1 rounded text-xs">&lt;/body&gt;</code> tag of your website to add the floating chat widget.
            </p>
            <div className="relative">
              <pre className="bg-muted rounded-xl p-4 text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {embedCode}
              </pre>
              <button
                onClick={copyEmbed}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
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

// ─── Referral Source Import ───────────────────────────────────────────────────

const TARGET_FIELDS = [
  { key: "facility_name", label: "Facility Name" },
  { key: "contact_name",  label: "Contact Name" },
  { key: "phone",         label: "Phone" },
  { key: "email",         label: "Email" },
  { key: "address",       label: "Address" },
  { key: "city",          label: "City" },
  { key: "state",         label: "State" },
  { key: "level_of_care", label: "Level of Care" },
  { key: "notes",         label: "Notes" },
] as const;

type TargetKey = typeof TARGET_FIELDS[number]["key"];

function ReferralImport() {
  const { toast } = useToast();
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [skipDupes, setSkipDupes] = useState(true);

  // Data from parse step
  const [headers, setHeaders]     = useState<string[]>([]);
  const [mapping, setMapping]     = useState<Partial<Record<TargetKey, string>>>({});
  const [preview, setPreview]     = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [allRows, setAllRows]     = useState<Record<string, string>[]>([]);

  // Result
  const [result, setResult] = useState<{ added: number; skipped: number; failed: number } | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".csv") && !ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
      toast({ title: "Only CSV, XLSX, and XLS files are supported", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/referral-import", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      setHeaders(data.headers);
      setMapping(data.mapping ?? {});
      setPreview(data.preview ?? []);
      setTotalRows(data.totalRows ?? 0);
      setAllRows(data.allRows ?? data.preview ?? []);
      setStep("preview");
    } catch (e: any) {
      toast({ title: e.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/admin/referral-import/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: allRows, mapping, skipDuplicates: skipDupes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }
      const data = await res.json();
      setResult(data);
      setStep("result");
    } catch (e: any) {
      toast({ title: e.message || "Import failed", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setMapping({});
    setPreview([]);
    setTotalRows(0);
    setAllRows([]);
    setResult(null);
  };

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <FileSpreadsheet className="w-4 h-4 text-primary" /> Referral Source Import
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload a CSV or Excel file — AI will auto-map columns. Review before importing.
        </p>
      </CardHeader>
      <CardContent className="p-6">

        {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
        {step === "upload" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 transition-all",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-muted/30",
            )}
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border", dragging ? "bg-primary/15 border-primary/40" : "bg-muted border-border")}>
              <Upload className={cn("w-6 h-6", dragging ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Drag & drop your file here</p>
              <p className="text-xs text-muted-foreground mt-1">Supports CSV, XLSX, XLS — up to 10 MB</p>
            </div>
            <label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <span className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all",
                uploading
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground",
              )}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Analyzing…" : "Choose File"}
              </span>
            </label>
          </div>
        )}

        {/* ── Step 2: Preview + Mapping ──────────────────────────────────── */}
        {step === "preview" && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Review Import</p>
                <p className="text-xs text-muted-foreground">{totalRows} rows detected — AI mapped the columns below. Adjust if needed.</p>
              </div>
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground underline">Start over</button>
            </div>

            {/* Field mapping */}
            <div className="bg-muted/40 rounded-xl p-4 border border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Column Mapping</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TARGET_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground w-28 shrink-0">{label}</span>
                    <select
                      value={mapping[key] ?? ""}
                      onChange={(e) => setMapping(m => ({ ...m, [key]: e.target.value || undefined }))}
                      className="flex-1 bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="">— Skip —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Duplicate handling */}
            <div className="flex items-center gap-3 px-1">
              <input
                type="checkbox"
                id="skip-dupes"
                checked={skipDupes}
                onChange={(e) => setSkipDupes(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="skip-dupes" className="text-sm text-foreground">
                Skip duplicates (by facility name)
                <span className="text-xs text-muted-foreground ml-1">— uncheck to update existing</span>
              </label>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {TARGET_FIELDS.filter(f => mapping[f.key]).map(f => (
                      <th key={f.key} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((row, i) => (
                    <tr key={i} className={cn("border-b border-border/50", i % 2 === 0 ? "bg-card" : "bg-muted/20")}>
                      {TARGET_FIELDS.filter(f => mapping[f.key]).map(f => (
                        <td key={f.key} className="px-3 py-2 text-foreground/80 max-w-[150px] truncate">
                          {mapping[f.key] ? row[mapping[f.key]!] ?? "" : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 10 && (
                <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t border-border">
                  Showing 10 of {totalRows} rows
                </div>
              )}
            </div>

            {/* Confirm */}
            <div className="flex items-center justify-end gap-3">
              <button onClick={reset} className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={importing || !mapping.facility_name}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-all"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? "Importing…" : `Import ${totalRows} Rows`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Result ─────────────────────────────────────────────── */}
        {step === "result" && result && (
          <div className="space-y-5">
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-lg font-bold text-foreground">Import Complete</p>
              <p className="text-sm text-muted-foreground mt-1">Your referral sources have been imported.</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-4 px-2">
                <p className="text-2xl font-bold text-emerald-400">{result.added}</p>
                <p className="text-xs text-muted-foreground mt-1">Added</p>
              </div>
              <div className="text-center bg-amber-500/10 border border-amber-500/20 rounded-xl py-4 px-2">
                <p className="text-2xl font-bold text-amber-400">{result.skipped}</p>
                <p className="text-xs text-muted-foreground mt-1">Skipped</p>
              </div>
              <div className="text-center bg-red-500/10 border border-red-500/20 rounded-xl py-4 px-2">
                <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                <p className="text-xs text-muted-foreground mt-1">Failed</p>
              </div>
            </div>
            <div className="flex justify-center">
              <button
                onClick={reset}
                className="px-5 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

