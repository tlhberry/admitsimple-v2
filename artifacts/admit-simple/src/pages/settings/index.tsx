import { useState, useEffect } from "react";
import { useListSettings, useBulkUpdateSettings } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Building, Bell, Brain, Shield, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type SettingKey = string;
type SettingMap = Record<SettingKey, string>;

const tabs = [
  { id: "facility", label: "Facility", icon: Building },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai", label: "AI Settings", icon: Brain },
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

          <div className="flex justify-end mt-4">
            <Button onClick={handleSave} disabled={bulkUpdate.isPending} className="h-11 px-6 rounded-xl flex gap-2 shadow-md shadow-primary/20">
              {bulkUpdate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
