import { useState, useEffect } from "react";
import { useListSettings, useBulkUpdateSettings } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Building, Bell, Brain, Shield, Save, Phone, Copy, Check, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SettingMap = Record<string, string>;

const tabs = [
  { id: "facility",      label: "Facility",      icon: Building },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai",            label: "AI Settings",   icon: Brain },
  { id: "integrations",  label: "Integrations",  icon: Phone },
];

export default function Settings() {
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
                      <Input value={values[f.key] || ""} onChange={e => set(f.key, e.target.value)} type={f.type} className={fieldCls} />
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

                <div className="bg-muted/40 rounded-xl border border-border p-4 text-sm space-y-2">
                  <p className="font-semibold text-foreground">Fields mapped from CTM</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs font-mono text-muted-foreground">
                    <span><strong className="text-foreground">caller_number</strong> → Phone</span>
                    <span><strong className="text-foreground">caller_name</strong> → First / Last name</span>
                    <span><strong className="text-foreground">tracking_label</strong> → Referral source</span>
                    <span><strong className="text-foreground">caller_city / state</strong> → Notes</span>
                    <span><strong className="text-foreground">call_status</strong> → Notes</span>
                    <span><strong className="text-foreground">recording_url</strong> → Notes</span>
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

          {activeTab !== "integrations" && (
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
