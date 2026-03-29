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

type SettingKey = string;
type SettingMap = Record<SettingKey, string>;

const tabs = [
  { id: "facility", label: "Facility", icon: Building },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai", label: "AI Settings", icon: Brain },
  { id: "integrations", label: "Integrations", icon: Phone },
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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        toast({ title: "Settings saved successfully" });
      },
      onError: () => toast({ title: "Failed to save settings", variant: "destructive" })
    }
  });

  const handleSave = () => {
    const filtered = Object.entries(values)
      .filter(([key]) => {
        const s = data?.find(d => d.key === key);
        return s?.category === activeTab;
      })
      .map(([key, value]) => ({ key, value }));
    bulkUpdate.mutate({ data: { settings: filtered } });
  };

  const set = (key: string, value: string) => setValues(v => ({ ...v, [key]: value }));
  const toggle = (key: string) => setValues(v => ({ ...v, [key]: v[key] === "true" ? "false" : "true" }));

  const [copied, setCopied] = useState(false);
  const webhookUrl = `${window.location.origin}/api/webhooks/ctm`;
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const generateSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const secret = Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    set("ctm_webhook_secret", secret);
  };

  const saveIntegration = () => {
    const secret = values["ctm_webhook_secret"] || "";
    bulkUpdate.mutate({ data: { settings: [{ key: "ctm_webhook_secret", value: secret }] } });
  };

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Configure your facility and system preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          {activeTab === "facility" && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="w-5 h-5 text-primary" />
                  Facility Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Facility Name</Label>
                    <Input value={values["facility_name"] || ""} onChange={e => set("facility_name", e.target.value)} className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Phone Number</Label>
                    <Input value={values["facility_phone"] || ""} onChange={e => set("facility_phone", e.target.value)} className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Fax Number</Label>
                    <Input value={values["facility_fax"] || ""} onChange={e => set("facility_fax", e.target.value)} className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Email</Label>
                    <Input value={values["facility_email"] || ""} onChange={e => set("facility_email", e.target.value)} className="mt-1.5 rounded-xl" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-sm font-medium text-slate-700">Address</Label>
                    <Input value={values["facility_address"] || ""} onChange={e => set("facility_address", e.target.value)} className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Bed Capacity</Label>
                    <Input value={values["facility_bed_capacity"] || ""} onChange={e => set("facility_bed_capacity", e.target.value)} type="number" className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">License Number</Label>
                    <Input value={values["facility_license"] || ""} onChange={e => set("facility_license", e.target.value)} className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">NPI Number</Label>
                    <Input value={values["facility_npi"] || ""} onChange={e => set("facility_npi", e.target.value)} className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Timezone</Label>
                    <Input value={values["facility_timezone"] || ""} onChange={e => set("facility_timezone", e.target.value)} className="mt-1.5 rounded-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {[
                  { key: "notify_new_inquiry", label: "New Inquiry Received", desc: "Alert when a new inquiry is submitted" },
                  { key: "notify_status_change", label: "Status Changes", desc: "Alert when inquiry status is updated" },
                  { key: "notify_daily_digest", label: "Daily Digest Email", desc: "Receive a daily summary every morning" },
                  { key: "notify_assignment", label: "Assignment Notifications", desc: "Alert when an inquiry is assigned to you" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    <Switch
                      checked={values[item.key] === "true"}
                      onCheckedChange={() => toggle(item.key)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "ai" && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-500" />
                  AI Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-indigo-900">
                    <strong>HIPAA Notice:</strong> AI features use only aggregated, de-identified data. PHI is never transmitted to external AI providers.
                  </p>
                </div>
                {[
                  { key: "ai_auto_summarize", label: "Auto-Summarize Inquiries", desc: "Automatically generate AI summaries for new inquiries" },
                  { key: "ai_pipeline_suggestions", label: "Pipeline Optimization Suggestions", desc: "Get AI recommendations for moving inquiries through the pipeline" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                    <Switch
                      checked={values[item.key] === "true"}
                      onCheckedChange={() => toggle(item.key)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-6">
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="w-5 h-5 text-green-500" />
                    Call Tracking Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-sm text-green-900 space-y-1">
                    <p className="font-semibold">How it works</p>
                    <p>When a call comes into your CTM tracking numbers, CTM sends the caller's info to this webhook URL and AdmitSimple automatically creates a new inquiry with the caller details, campaign source, and call notes.</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700">Webhook URL</Label>
                    <p className="text-xs text-slate-500 mb-2">Paste this URL into your Call Tracking Metrics account under <strong>Settings → Webhooks → Add Webhook</strong>.</p>
                    <div className="flex gap-2">
                      <Input
                        value={webhookUrl}
                        readOnly
                        className="mt-0 rounded-xl font-mono text-sm bg-slate-50 text-slate-700 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={copyWebhookUrl}
                        className="shrink-0 rounded-xl px-4 border-slate-200"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700">Webhook Secret Token</Label>
                    <p className="text-xs text-slate-500 mb-2">Set this same value in CTM under your webhook settings as the <strong>X-CTM-Token</strong> custom header. This keeps your webhook secure.</p>
                    <div className="flex gap-2">
                      <Input
                        value={values["ctm_webhook_secret"] || ""}
                        onChange={e => set("ctm_webhook_secret", e.target.value)}
                        placeholder="No secret set — any request will be accepted"
                        className="mt-0 rounded-xl font-mono text-sm flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateSecret}
                        className="shrink-0 rounded-xl px-4 border-slate-200"
                        title="Generate a random secret"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 space-y-2">
                    <p className="font-semibold text-slate-700">Fields mapped from CTM</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs font-mono">
                      <span><strong>caller_number</strong> → Phone</span>
                      <span><strong>caller_name</strong> → First / Last name</span>
                      <span><strong>tracking_label</strong> → Referral source</span>
                      <span><strong>caller_city / state</strong> → Notes</span>
                      <span><strong>call_status</strong> → Notes</span>
                      <span><strong>duration</strong> → Notes</span>
                      <span><strong>agent_name</strong> → Notes</span>
                      <span><strong>recording_url</strong> → Notes</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveIntegration} disabled={bulkUpdate.isPending} className="h-11 px-6 rounded-xl flex gap-2 shadow-md shadow-primary/20">
                      {bulkUpdate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Integration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab !== "integrations" && (
          <div className="flex justify-end mt-4">
            <Button onClick={handleSave} disabled={bulkUpdate.isPending} className="h-11 px-6 rounded-xl flex gap-2 shadow-md shadow-primary/20">
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
