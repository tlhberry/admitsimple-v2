import { useParams, Link, useLocation, useSearch } from "wouter";
import { useGetInquiry, useListActivities } from "@workspace/api-client-react";
import { useAIFeatures } from "@/hooks/use-ai";
import { useInquiriesMutations } from "@/hooks/use-inquiries";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SMSInbox } from "@/components/SMSInbox";
import {
  ArrowLeft, UserPlus, FileText, Brain, Phone, Mail, Calendar, Activity, MessageSquare,
  Loader2, Sparkles, ClipboardCheck, CheckCircle2, Search, Pencil, X, Check,
  ShieldCheck, XCircle, SendHorizontal, AlertTriangle, Play, ArrowRight,
} from "lucide-react";
import { getStatusColor, formatDate, cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useState, useEffect } from "react";
import { PreAssessmentSection } from "@/components/PreAssessmentForms";
import { VOBForm } from "@/components/VOBForm";
import { AdmitReviewModal } from "@/components/AdmitReviewModal";
import { LiveCallMode } from "./LiveCallMode";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const NON_ADMIT_REASONS = [
  "Insurance – Denied/No Coverage",
  "Insurance – Cannot Afford Copay/Deductible",
  "Financial – Cannot Afford Self-Pay",
  "Clinical – Not Appropriate Level of Care",
  "Clinical – Medical Complexity",
  "Clinical – Psychiatric Complexity",
  "Client – Changed Mind",
  "Client – Not Ready",
  "Client – Chose Another Facility",
  "Client – No Response / Lost Contact",
  "Capacity – No Available Beds",
  "Geographic – Outside Service Area",
  "Legal – Pending Legal Issues",
  "Family – Refused Treatment",
  "Other",
];

// ─── Audit log helpers (must be defined before InquiryDetail) ─────────────────

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function timeAgo(date: string | null | undefined): string {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function auditDotColor(action: string) {
  if (action.startsWith("Created")) return "bg-emerald-400";
  if (action.includes("Stage") || action.startsWith("Updated Stage")) return "bg-primary";
  if (action.startsWith("Did Not Admit")) return "bg-rose-400";
  if (action.startsWith("Referred Out")) return "bg-amber-400";
  if (action.startsWith("Converted")) return "bg-violet-400";
  return "bg-muted-foreground/50";
}

function AuditLogCard({ inquiryId, parsedAt, vobData, onTabChange }: {
  inquiryId: number;
  parsedAt: any;
  vobData: any;
  onTabChange: (tab: string) => void;
}) {
  const { data: log = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/inquiries", inquiryId, "audit-log"],
    queryFn: () => fetch(`/api/inquiries/${inquiryId}/audit-log`, { credentials: "include" }).then(r => r.json()),
    refetchInterval: 15000,
  });

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader className="py-4 border-b border-border">
        <CardTitle className="text-sm text-foreground">Change History</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="pt-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Activity Log</p>
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : log.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No changes recorded yet.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />
              <div className="space-y-3">
                {log.map((entry: any) => {
                  let details: Record<string, any> | null = null;
                  try { details = entry.details ? JSON.parse(entry.details) : null; } catch {}
                  return (
                    <div key={entry.id} className="flex gap-3 pl-1">
                      <div className="flex-shrink-0 w-3.5 flex items-start justify-center mt-1.5">
                        <div className={`w-2 h-2 rounded-full ${auditDotColor(entry.action)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-medium text-foreground leading-tight">{entry.action}</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {entry.userName && (
                              <div
                                className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold border border-primary/20"
                                title={entry.userName}
                              >
                                {getInitials(entry.userName)}
                              </div>
                            )}
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(entry.createdAt)}</span>
                          </div>
                        </div>
                        {details && Object.keys(details).length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {Object.entries(details)
                              .filter(([k]) => !["reason", "notes", "type"].includes(k))
                              .slice(0, 3)
                              .map(([field, val]: any) => (
                                <p key={field} className="text-[10px] text-muted-foreground leading-tight">
                                  <span className="font-medium">{field}:</span>{" "}
                                  {val?.from != null && (
                                    <><span className="line-through opacity-50">{String(val.from).slice(0, 20)}</span>{" → "}</>
                                  )}
                                  <span className="text-foreground/70">
                                    {val?.to != null ? String(val.to).slice(0, 20) : val != null ? String(val).slice(0, 30) : "—"}
                                  </span>
                                </p>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {parsedAt && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border text-xs text-primary bg-primary/10 p-2 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" /> AI Parsed Intake
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Pipeline Stage Tracker ────────────────────────────────────────────────────

const LEGACY_STATUS_MAP: Record<string, string> = {
  new: "New Inquiry",
  contacted: "Initial Contact",
  qualified: "Insurance Verification",
  "Clinical Assessment": "Scheduled to Admit",
};

const STAGE_DISPLAY_NAMES: Record<string, string> = {
  "Insurance Verification": "VOB",
  "Pre-Assessment": "Pre-Screen",
};
const TERMINAL_STAGES = new Set(["Did Not Admit", "Discharged", "Non-Viable"]);

function PipelineStageTracker({ stages, currentStatus }: { stages: any[]; currentStatus: string }) {
  const resolved = LEGACY_STATUS_MAP[currentStatus] ?? currentStatus;
  const isTerminal = TERMINAL_STAGES.has(resolved);

  const mainStages = [...stages]
    .filter(s => !TERMINAL_STAGES.has(s.name))
    .sort((a: any, b: any) => a.order - b.order);

  const currentIdx = mainStages.findIndex((s: any) => s.name === resolved);

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      {isTerminal ? (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {mainStages.map((_: any, i: number) => (
              <div key={i} className="w-2 h-1.5 rounded-full bg-muted-foreground/20" />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Pipeline closed — <span className="font-semibold text-foreground">{resolved}</span></span>
        </div>
      ) : (
        <>
          {/* Stepper — scrollable so it never squishes */}
          <div className="flex items-center gap-0 overflow-x-auto pb-1 min-w-0">
            {mainStages.map((stage: any, idx: number) => {
              const done = idx < currentIdx;
              const active = idx === currentIdx;
              const label = STAGE_DISPLAY_NAMES[stage.name] ?? stage.name;
              return (
                <div key={stage.id} className="flex items-center shrink-0">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                      done
                        ? "bg-primary text-primary-foreground"
                        : active
                        ? "bg-primary text-primary-foreground ring-[3px] ring-primary/25"
                        : "bg-muted border border-border/60 text-muted-foreground/50"
                    )}>
                      {done ? <Check className="w-3 h-3" /> : idx + 1}
                    </div>
                    <span className={cn(
                      "text-[10px] mt-1.5 font-medium text-center whitespace-nowrap",
                      active ? "text-primary font-semibold" :
                      done  ? "text-muted-foreground" :
                              "text-muted-foreground/40"
                    )}>
                      {label}
                    </span>
                  </div>
                  {idx < mainStages.length - 1 && (
                    <div className={cn(
                      "w-8 h-px mx-1 mb-4 shrink-0",
                      idx < currentIdx ? "bg-primary" : "bg-border/60"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Admission Snapshot Card ───────────────────────────────────────────────────

function RiskBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border",
      active
        ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
        : "bg-muted/30 border-border text-muted-foreground/60"
    )}>
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", active ? "bg-rose-400" : "bg-muted-foreground/30")} />
      {label}
    </div>
  );
}

function SnapRow({ label, value }: { label: string; value?: string | number | null | JSX.Element }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-semibold text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

function AdmissionSnapshotCard({ inq }: { inq: any }) {
  const preScreening = inq?.preScreeningData as any;
  const nursing = inq?.nursingAssessmentData as any;
  const vob = inq?.vobData as any;

  // Risk flags derived from pre-screening / nursing assessment
  const detoxRequired = Array.isArray(preScreening?.withdrawalSymptoms) && preScreening.withdrawalSymptoms.length > 0;
  const suicideRisk =
    preScreening?.suicidalIdeation &&
    preScreening.suicidalIdeation !== "None" &&
    preScreening.suicidalIdeation !== "";
  const medicalConcern = !!(nursing?.medicalConditions || preScreening?.medicalConditions);

  const anyRisk = detoxRequired || suicideRisk || medicalConcern;

  // Financial
  const vobVerified = vob?.status === "verified";
  const estimatedCost = vob?.estimatedCost || null;
  const paymentDecision = inq?.costAcceptance || null;

  // Key notes — from pre-assessment or nursing summary
  const keyNotes = [inq?.preAssessmentNotes, preScreening?.additionalNotes, nursing?.additionalNotes]
    .filter(Boolean)
    .join("\n")
    .split("\n")
    .filter(Boolean)
    .slice(0, 5);

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader className="bg-muted/40 border-b border-border py-4">
        <CardTitle className="text-sm font-semibold text-foreground">Admission Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5">

        {/* Section 1: Admission Details */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Admission Details</p>
          <SnapRow label="Level of Care" value={inq?.levelOfCare} />
          <SnapRow
            label="Admit Date"
            value={inq?.appointmentDate
              ? new Date(inq.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : null}
          />
          <SnapRow label="ETA" value={null} />
          <SnapRow label="Bed Assignment" value={null} />
        </div>

        {/* Section 2: Financial Snapshot */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Financial Snapshot</p>
          <SnapRow
            label="Insurance Verified"
            value={
              <span className={cn("font-bold", vobVerified ? "text-emerald-400" : "text-amber-400")}>
                {vob ? (vobVerified ? "Yes" : "Pending") : "—"}
              </span>
            }
          />
          <SnapRow label="Estimated Cost" value={estimatedCost} />
          <SnapRow
            label="Payment Decision"
            value={
              paymentDecision ? (
                <span className={cn("font-bold", paymentDecision === "Cannot Pay" ? "text-rose-400" : "text-emerald-400")}>
                  {paymentDecision}
                </span>
              ) : null
            }
          />
        </div>

        {/* Section 3: Risk Flags */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Risk Flags
            {!anyRisk && <span className="ml-2 normal-case font-normal text-muted-foreground/60">— none flagged</span>}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <RiskBadge label="Detox Required" active={detoxRequired} />
            <RiskBadge label="Suicide Risk" active={!!suicideRisk} />
            <RiskBadge label="Medical Concern" active={medicalConcern} />
          </div>
          {suicideRisk && preScreening?.suicidalIdeation && (
            <p className="text-[10px] text-rose-400 mt-1.5 pl-1">SI: {preScreening.suicidalIdeation}</p>
          )}
        </div>

        {/* Section 4: Key Notes */}
        {keyNotes.length > 0 ? (
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Key Notes</p>
            <ul className="space-y-1">
              {keyNotes.map((note, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                  <span className="text-primary shrink-0 mt-0.5">•</span>
                  <span>{note.replace(/^[•\-]\s*/, "")}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Key Notes</p>
            <p className="text-xs text-muted-foreground/50 italic">Complete pre-screen to populate notes</p>
          </div>
        )}

        {/* Section 5: Logistics */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Logistics</p>
          <SnapRow label="Arrival Method" value={null} />
          <SnapRow label="Bringing Medications" value={null} />
          <SnapRow label="Family Contact" value={null} />
          <p className="text-[10px] text-muted-foreground/50 italic mt-1.5">Edit in Facesheet to record logistics details</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── SMS body with "Read more" truncation ──────────────────────────────────────
function SmsTruncated({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const sentenceRx = /[^.!?]*[.!?]+/g;
  const sentences  = text.match(sentenceRx) ?? [];
  const preview    = sentences.slice(0, 2).join("").trim() || text;
  const needsMore  = sentences.length > 2 || text.length > preview.length + 1;
  return (
    <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded-lg">
      <span style={{ whiteSpace: "pre-wrap" }}>
        {expanded || !needsMore ? text : preview}
      </span>
      {needsMore && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="ml-1 text-[#5BC8DC] font-semibold hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

export default function InquiryDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params?.id || "0");
  const [, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const isLiveMode = searchParams.get("mode") === "live";
  const intentParam = searchParams.get("intent");

  const { data: inquiry, isLoading, refetch } = useGetInquiry(id, { query: { enabled: !!id } });
  const { data: activities } = useListActivities({ inquiryId: id }, { query: { enabled: !!id } });
  const { summarizeInquiry } = useAIFeatures();
  const { convertToPatient, updateInquiry } = useInquiriesMutations();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const isPreAssessment = inquiry?.status === "Pre-Assessment";
  const defaultTab = "overview";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [editingLeadSource, setEditingLeadSource] = useState(false);
  const [leadSourceEdit, setLeadSourceEdit] = useState({ referralSource: "", searchKeywords: "" });
  const [savingLeadSource, setSavingLeadSource] = useState(false);

  // Admit Review modal
  const [showAdmitReview, setShowAdmitReview] = useState(false);

  // Non-Admit modal
  const [showNonAdmit, setShowNonAdmit] = useState(false);
  const [nonAdmitReason, setNonAdmitReason] = useState("none");
  const [nonAdmitNotes, setNonAdmitNotes] = useState("");
  const [submittingNonAdmit, setSubmittingNonAdmit] = useState(false);

  // Appointment scheduling
  const [appointmentInput, setAppointmentInput] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);

  // Refer Out modal
  const [showReferOut, setShowReferOut] = useState(false);
  const [referOutType, setReferOutType] = useState("none");
  const [referOutMessage, setReferOutMessage] = useState("");
  const [generatingMsg, setGeneratingMsg] = useState(false);
  const [submittingReferOut, setSubmittingReferOut] = useState(false);

  const { data: referralSources = [] } = useQuery<any[]>({
    queryKey: ["/api/referrals"],
    queryFn: () => fetch("/api/referrals", { credentials: "include" }).then(r => r.json()),
    staleTime: 60000,
  });

  const { data: pipelineStages = [] } = useQuery<any[]>({
    queryKey: ["/api/pipeline/stages"],
    queryFn: () => fetch("/api/pipeline/stages", { credentials: "include" }).then(r => r.json()),
    staleTime: 60000,
  });

  const [movingStage, setMovingStage] = useState(false);

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: () => fetch("/api/users", { credentials: "include" }).then(r => r.json()),
    staleTime: 60000,
  });

  // Intake Details inline edit
  const [editingIntake, setEditingIntake] = useState(false);
  const [savingIntake, setSavingIntake] = useState(false);
  const [intakeEdit, setIntakeEdit] = useState({
    levelOfCare: "", dob: "", insuranceProvider: "", insuranceMemberId: "", assignedTo: "",
  });

  // Auto-open modals from ?intent= param (set by LiveCallMode "What's Next?")
  useEffect(() => {
    if (!intentParam) return;
    if (intentParam === "admit") setShowAdmitReview(true);
    else if (intentParam === "nonadmit") setShowNonAdmit(true);
    else if (intentParam === "refer") setShowReferOut(true);
  }, [intentParam]);

  // Live Call Mode — full-screen distraction-free intake
  if (isLiveMode) return <LiveCallMode id={id} />;

  const handleStartEditIntake = () => {
    const inq = inquiry as any;
    setIntakeEdit({
      levelOfCare: inq?.levelOfCare ?? "",
      dob: inq?.dob ?? "",
      insuranceProvider: inq?.insuranceProvider ?? "",
      insuranceMemberId: inq?.insuranceMemberId ?? "",
      assignedTo: inq?.assignedTo ? String(inq.assignedTo) : "none",
    });
    setEditingIntake(true);
  };

  const handleSaveIntake = async () => {
    setSavingIntake(true);
    try {
      await fetch(`/api/inquiries/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...intakeEdit,
          assignedTo: intakeEdit.assignedTo === "none" ? null : intakeEdit.assignedTo,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      await refetch();
      setEditingIntake(false);
      toast({ title: "Intake details updated" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSavingIntake(false);
    }
  };

  const handleStartEditLeadSource = () => {
    setLeadSourceEdit({
      referralSource: (inquiry as any)?.referralSource ?? "",
      searchKeywords: (inquiry as any)?.searchKeywords ?? "",
    });
    setEditingLeadSource(true);
  };

  const handleSaveLeadSource = async () => {
    setSavingLeadSource(true);
    try {
      await fetch(`/api/inquiries/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadSourceEdit),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      await refetch();
      setEditingLeadSource(false);
      toast({ title: "Lead source updated" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSavingLeadSource(false);
    }
  };

  const handleNonAdmitSubmit = async () => {
    if (nonAdmitReason === "none") {
      toast({ title: "Please select a reason", variant: "destructive" }); return;
    }
    setSubmittingNonAdmit(true);
    try {
      const resp = await fetch(`/api/inquiries/${id}/non-admit`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: nonAdmitReason, notes: nonAdmitNotes }),
      });
      if (!resp.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/inquiries"] });
      await refetch();
      setShowNonAdmit(false);
      setNonAdmitReason("none");
      setNonAdmitNotes("");
      toast({ title: "Inquiry marked as Did Not Admit" });
    } catch {
      toast({ title: "Failed to record", variant: "destructive" });
    } finally {
      setSubmittingNonAdmit(false);
    }
  };

  const handleGenerateReferOutMessage = async () => {
    setGeneratingMsg(true);
    try {
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Write a brief, professional ${referOutType === "text" ? "text message" : "email"} to refer a patient to another treatment facility.
Patient: ${(inquiry as any)?.firstName} ${(inquiry as any)?.lastName}
Insurance: ${(inquiry as any)?.insuranceProvider || "Unknown"}
Reason for refer-out: ${(inquiry as any)?.nonAdmitReason || "Unable to accommodate at this time"}

Keep it warm, concise, and professional. Include a request for the other facility to reach out directly.`,
        }),
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      setReferOutMessage(data.text || "");
    } catch {
      toast({ title: "Could not generate message", variant: "destructive" });
    } finally {
      setGeneratingMsg(false);
    }
  };

  const handleReferOutSubmit = async () => {
    if (referOutType === "none" || !referOutMessage.trim()) {
      toast({ title: "Select type and enter a message", variant: "destructive" }); return;
    }
    setSubmittingReferOut(true);
    try {
      const resp = await fetch(`/api/inquiries/${id}/refer-out`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: referOutType, message: referOutMessage }),
      });
      if (!resp.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
      await refetch();
      setShowReferOut(false);
      setReferOutType("none");
      setReferOutMessage("");
      toast({ title: "Referral out recorded" });
    } catch {
      toast({ title: "Failed to record", variant: "destructive" });
    } finally {
      setSubmittingReferOut(false);
    }
  };

  const handleSaveAppointment = async () => {
    if (!appointmentInput) return;
    setSavingAppointment(true);
    try {
      await fetch(`/api/inquiries/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentDate: new Date(appointmentInput).toISOString() }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/inquiries"] });
      await refetch();
      setAppointmentInput("");
      toast({ title: "Admission appointment saved!" });
    } catch {
      toast({ title: "Failed to save appointment", variant: "destructive" });
    } finally {
      setSavingAppointment(false);
    }
  };

  const tabs = [
    "overview",
    "vob",
    "activities",
    "messages",
    "clinical_ai",
  ];

  const handleGenerateSummary = async () => {
    const res = await summarizeInquiry.mutateAsync({ data: { inquiryId: id } });
    setAiSummary(res.text);
  };

  const handleConvert = () => {
    setShowAdmitReview(true);
  };

  const handlePreAssessmentComplete = async (notes: string) => {
    try {
      await fetch(`/api/inquiries/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preAssessmentCompleted: "yes",
          preAssessmentDate: new Date().toISOString(),
          preAssessmentNotes: notes,
          status: "Scheduled to Admit",
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/inquiries"] });
      toast({ title: "Pre-Assessment complete! Inquiry moved to Scheduled to Admit." });
      await refetch();
      setActiveTab("overview");
    } catch {
      toast({ title: "Failed to complete pre-assessment", variant: "destructive" });
    }
  };

  if (isLoading) return <Layout><div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></Layout>;
  if (!inquiry) return <Layout><div className="text-muted-foreground p-8">Not found</div></Layout>;

  const inq = inquiry as any;
  const isNonViable = inq.status === "Non-Viable";
  const hasReferralOut = !!inq.referralOutAt;

  // Pipeline stage advancement
  const resolvedStatus = LEGACY_STATUS_MAP[inq.status] ?? inq.status;
  const mainStages = [...pipelineStages]
    .filter((s: any) => !TERMINAL_STAGES.has(s.name))
    .sort((a: any, b: any) => a.order - b.order);
  const currentStageIdx = mainStages.findIndex((s: any) => s.name === resolvedStatus);
  const nextStage = currentStageIdx >= 0 && currentStageIdx < mainStages.length - 1
    ? mainStages[currentStageIdx + 1]
    : null;
  const isTerminalStage = TERMINAL_STAGES.has(resolvedStatus);
  const isAtLastStage = currentStageIdx === mainStages.length - 1;

  const handleMoveToNextStage = async () => {
    if (!nextStage) return;
    // "Scheduled to Admit" → "Admitted" uses the Convert to Patient flow
    if (resolvedStatus === "Scheduled to Admit") {
      await handleConvert();
      return;
    }
    setMovingStage(true);
    try {
      await fetch(`/api/inquiries/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStage.name }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/inquiries"] });
      toast({ title: `Moved to ${nextStage.name}` });
      await refetch();
    } catch {
      toast({ title: "Failed to update stage", variant: "destructive" });
    } finally {
      setMovingStage(false);
    }
  };

  const tabLabel = (tab: string) => {
    if (tab === "clinical_ai") return "Pre-Screen / AI";
    if (tab === "vob") return "Insurance / VOB";
    if (tab === "messages") return "Messages";
    return tab.charAt(0).toUpperCase() + tab.slice(1);
  };

  return (
    <Layout>
      {(() => {
        const fromPipeline = new URLSearchParams(window.location.search).get("from") === "pipeline";
        return (
          <Link
            href={fromPipeline ? "/pipeline" : "/inquiries"}
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {fromPipeline ? "Back to Pipeline" : "Back to Inquiries"}
          </Link>
        );
      })()}

      {/* ── Active call lock banner ───────────────────────────────────────── */}
      {inq.callStatus === "active" && inq.isLocked && inq.assignedTo !== (user as any)?.id && (
        <div className="mb-5 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3.5">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Phone className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-300">Call in Progress</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This inquiry is being handled on a live call by{" "}
              <span className="font-semibold text-foreground">{inq.assignedToName || "a rep"}</span>
              . Avoid editing until the call ends.
            </p>
          </div>
          <Link
            href="/calls/active"
            className="shrink-0 text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            View Active Calls
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="bg-card rounded-2xl p-5 md:p-7 border border-border mb-6 flex flex-col md:flex-row md:items-start justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary rounded-l-2xl" />
        <div className="pl-2">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="text-2xl font-bold text-foreground">{inq.firstName} {inq.lastName}</h1>
            {inq.inquiryNumber && (
              <span className="font-mono text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">{inq.inquiryNumber}</span>
            )}
            <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border", getStatusColor(inq.status))}>
              {inq.status}
            </span>
            {inq.priority === "High" && (
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/25 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Urgent</span>
            )}
            {isPreAssessment && (
              <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="w-3 h-3" /> Forms Required
              </span>
            )}
            {inq.preAssessmentCompleted === "yes" && (
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Pre-Assessment Done
              </span>
            )}
            {inq.costAcceptance === "accepted" && (
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Cost Accepted
              </span>
            )}
            {isNonViable && (
              <span className="bg-rose-500/15 text-rose-400 border border-rose-500/25 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3 h-3" /> Non-Viable
              </span>
            )}
            {hasReferralOut && (
              <span className="bg-amber-500/15 text-amber-400 border border-amber-500/25 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <SendHorizontal className="w-3 h-3" /> Referred Out
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
            {inq.phone && (
              <a href={`tel:${inq.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />{inq.phone}
              </a>
            )}
            {inq.email && (
              <a href={`mailto:${inq.email}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Mail className="w-4 h-4" />{inq.email}
              </a>
            )}
            <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />Added {formatDate(inq.createdAt)}</div>
          </div>
          {pipelineStages.length > 0 && (
            <PipelineStageTracker stages={pipelineStages} currentStatus={inq.status} />
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {/* Primary: Admit Patient — always visible for non-admitted, non-terminal inquiries */}
          {!isTerminalStage && !isNonViable && resolvedStatus !== "Admitted" && (
            <Button
              onClick={() => setShowAdmitReview(true)}
              className="rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-2 font-semibold shadow-sm shadow-emerald-600/20"
            >
              <UserPlus className="w-4 h-4" /> Admit Patient
            </Button>
          )}
          {/* Stage advance — for stages before the final admit step */}
          {nextStage && !isTerminalStage && !isNonViable && !hasReferralOut && resolvedStatus !== "Scheduled to Admit" && (
            <Button
              variant="outline"
              onClick={handleMoveToNextStage}
              disabled={movingStage}
              className="rounded-xl h-10 border-border text-foreground hover:bg-muted gap-2"
            >
              {movingStage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              → {nextStage.name}
            </Button>
          )}
          {/* Secondary actions */}
          {!isTerminalStage && !isNonViable && (
            <Button
              variant="outline"
              onClick={() => setShowNonAdmit(true)}
              className="rounded-xl h-10 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-2"
            >
              <XCircle className="w-4 h-4" /> Did Not Admit
            </Button>
          )}
          {!hasReferralOut && !isTerminalStage && (
            <Button
              variant="outline"
              onClick={() => setShowReferOut(true)}
              className="rounded-xl h-10 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-2"
            >
              <SendHorizontal className="w-4 h-4" /> Refer Out
            </Button>
          )}
        </div>
      </div>

      {/* Non-Viable Banner */}
      {isNonViable && inq.nonAdmitReason && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 p-4 mb-6 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-400 text-sm">Did Not Admit</p>
            <p className="text-sm text-muted-foreground mt-0.5">{inq.nonAdmitReason}</p>
            {inq.nonAdmitNotes && <p className="text-sm text-muted-foreground mt-1 italic">{inq.nonAdmitNotes}</p>}
          </div>
        </div>
      )}

      {/* Referral Out Banner */}
      {hasReferralOut && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 mb-6 flex items-start gap-3">
          <SendHorizontal className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-400 text-sm">
              Referred Out via {inq.referralOutType === "text" ? "Text" : "Email"} — {formatDate(inq.referralOutAt)}
            </p>
            {inq.referralOutMessage && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{inq.referralOutMessage}</p>}
          </div>
        </div>
      )}

      {/* Tabs — select on mobile, underline bar on desktop */}
      <div className="mb-6">
        {/* Mobile: styled select */}
        <div className="md:hidden">
          <select
            value={activeTab}
            onChange={e => setActiveTab(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-muted border border-border text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {tabs.map(tab => (
              <option key={tab} value={tab}>{tabLabel(tab)}</option>
            ))}
          </select>
        </div>
        {/* Desktop: underline tabs */}
        <div className="hidden md:flex gap-0 border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab === "clinical_ai" && <Brain className="w-3.5 h-3.5" />}
              {tab === "vob" && <ShieldCheck className="w-3.5 h-3.5" />}
              {tab === "messages" && <MessageSquare className="w-3.5 h-3.5" />}
              {tabLabel(tab)}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("grid gap-6", (activeTab === "clinical_ai" || activeTab === "vob" || activeTab === "messages") ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3")}>
        <div className={cn("space-y-5", (activeTab === "clinical_ai" || activeTab === "vob" || activeTab === "messages") ? "" : "lg:col-span-2")}>
          {activeTab === "overview" && (
            <>
              {/* ── Scheduled to Admit: Appointment Card ── */}
              {inq.status === "Scheduled to Admit" && (
                <Card className="rounded-2xl border-primary/30 bg-primary/5">
                  <CardHeader className="bg-primary/10 border-b border-primary/20 py-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                      <Calendar className="w-4 h-4" /> Admission Appointment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    {(inq as any).appointmentDate ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">Scheduled For</p>
                          <p className="text-lg font-bold text-foreground">
                            {new Date((inq as any).appointmentDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                          </p>
                          <p className="text-sm text-primary font-medium">
                            {new Date((inq as any).appointmentDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No appointment scheduled yet.</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="datetime-local"
                        value={appointmentInput}
                        onChange={e => setAppointmentInput(e.target.value)}
                        className="flex-1 h-9 px-3 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveAppointment}
                        disabled={!appointmentInput || savingAppointment}
                        className="rounded-xl h-9 px-4"
                      >
                        {savingAppointment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (inq as any).appointmentDate ? "Update" : "Schedule"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70">
                      SMS and calendar reminders require Twilio + Google Calendar integration — contact your admin to enable.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* ── Did Not Admit: Referral Destination ── */}
              {inq.status === "Did Not Admit" && (
                <Card className="rounded-2xl border-rose-500/20 bg-rose-500/5">
                  <CardHeader className="bg-rose-500/10 border-b border-rose-500/15 py-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-rose-400">
                      <XCircle className="w-4 h-4" /> Did Not Admit — Follow-Up
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {(inq as any).referralDestination && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">Referred To</p>
                        <p className="text-sm font-semibold text-foreground">{(inq as any).referralDestination}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Referred to facility / provider..."
                        defaultValue={(inq as any).referralDestination || ""}
                        id="referral-dest-input"
                        className="h-9 rounded-xl text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-9 px-4 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                        onClick={async () => {
                          const val = (document.getElementById("referral-dest-input") as HTMLInputElement)?.value;
                          if (!val) return;
                          await fetch(`/api/inquiries/${id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ referralDestination: val }) });
                          queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
                          await refetch();
                          toast({ title: "Referral destination saved" });
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-2xl border-border">
                <CardHeader className="bg-muted/40 border-b border-border py-4">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between text-foreground">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" /> Intake Details
                    </span>
                    {!editingIntake && (
                      <button
                        onClick={handleStartEditIntake}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-normal"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  {editingIntake ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Level of Care</label>
                          <Select value={intakeEdit.levelOfCare || "none"} onValueChange={v => setIntakeEdit(p => ({ ...p, levelOfCare: v === "none" ? "" : v }))}>
                            <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— None —</SelectItem>
                              <SelectItem value="Detox">Detox</SelectItem>
                              <SelectItem value="Residential">Residential</SelectItem>
                              <SelectItem value="PHP">PHP</SelectItem>
                              <SelectItem value="IOP">IOP</SelectItem>
                              <SelectItem value="OP">Outpatient (OP)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Date of Birth</label>
                          <Input
                            type="date"
                            value={intakeEdit.dob}
                            onChange={e => setIntakeEdit(p => ({ ...p, dob: e.target.value }))}
                            className="h-9 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Insurance Provider</label>
                          <div className="flex gap-1.5 mb-1.5 flex-wrap">
                            {["Self-Pay", "Medicaid", "Medicare", "Tricare"].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setIntakeEdit(prev => ({ ...prev, insuranceProvider: p }))}
                                className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border transition-all"
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                          <Input
                            value={intakeEdit.insuranceProvider}
                            onChange={e => setIntakeEdit(p => ({ ...p, insuranceProvider: e.target.value }))}
                            placeholder="e.g. BlueCross BlueShield"
                            className="h-9 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Member ID</label>
                          <Input
                            value={intakeEdit.insuranceMemberId}
                            onChange={e => setIntakeEdit(p => ({ ...p, insuranceMemberId: e.target.value }))}
                            placeholder="e.g. BCB123456789"
                            className="h-9 rounded-lg text-sm"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Assigned To</label>
                          <Select value={intakeEdit.assignedTo || "none"} onValueChange={v => setIntakeEdit(p => ({ ...p, assignedTo: v }))}>
                            <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue placeholder="Select staff..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Unassigned —</SelectItem>
                              {users.map((u: any) => (
                                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSaveIntake}
                          disabled={savingIntake}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                        >
                          {savingIntake ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save
                        </button>
                        <button
                          onClick={() => setEditingIntake(false)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <DataPoint label="Level of Care" value={inq.levelOfCare} />
                    <DataPoint label="Date of Birth" value={inq.dob} />
                    <DataPoint label="Insurance Provider" value={inq.insuranceProvider} />
                    <DataPoint label="Member ID" value={inq.insuranceMemberId} />
                    <DataPoint label="Assigned To" value={inq.assignedToName} />
                  </dl>
                  )}

                  {/* Lead Source Section */}
                  <div className="mt-5 pt-5 border-t border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5" /> Lead Source
                      </h4>
                      {!editingLeadSource && (
                        <button
                          onClick={handleStartEditLeadSource}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                      )}
                    </div>

                    {editingLeadSource ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Referral Source</label>
                          <Select
                            value={leadSourceEdit.referralSource || "none"}
                            onValueChange={v => setLeadSourceEdit(prev => ({ ...prev, referralSource: v === "none" ? "" : v }))}
                          >
                            <SelectTrigger className="h-9 rounded-lg text-sm">
                              <SelectValue placeholder="Select source..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— None —</SelectItem>
                              {referralSources.map((s: any) => (
                                <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {(leadSourceEdit.referralSource === "Google PPC" || leadSourceEdit.referralSource === "Google Organic") && (
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Search Keywords</label>
                            <Input
                              value={leadSourceEdit.searchKeywords}
                              onChange={e => setLeadSourceEdit(prev => ({ ...prev, searchKeywords: e.target.value }))}
                              placeholder="e.g. drug rehab near me, alcohol treatment"
                              className="h-9 rounded-lg text-sm"
                            />
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleSaveLeadSource}
                            disabled={savingLeadSource}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                          >
                            {savingLeadSource ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Save
                          </button>
                          <button
                            onClick={() => setEditingLeadSource(false)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3 h-3" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-xs font-medium text-muted-foreground mb-1">Source</dt>
                            <dd className="text-sm font-semibold text-foreground">{inq.referralSource || "—"}</dd>
                          </div>
                          {(inq as any).referralOrigin && (
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground mb-1">Origin</dt>
                              <dd className="text-sm font-semibold text-foreground capitalize">{(inq as any).referralOrigin}</dd>
                            </div>
                          )}
                          {(inq as any).referralDetails && (
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground mb-1">Ad Source</dt>
                              <dd className="text-sm font-semibold text-foreground font-mono text-xs">{(inq as any).referralDetails}</dd>
                            </div>
                          )}
                          {(inq as any).onlineSource && (
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground mb-1">Online Source</dt>
                              <dd className="text-sm font-semibold text-foreground font-mono text-xs">{(inq as any).onlineSource}</dd>
                            </div>
                          )}
                          {inq.searchKeywords && (
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-medium text-muted-foreground mb-1">Search Keywords</dt>
                              <dd className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Search className="w-3.5 h-3.5 text-primary shrink-0" />
                                {inq.searchKeywords}
                              </dd>
                            </div>
                          )}
                        </div>

                        {/* CTM Call Details — shown when inquiry came via CTM webhook */}
                        {(inq as any).ctmCallId && (
                          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Phone className="w-3.5 h-3.5 text-primary" />
                              <span className="text-xs font-semibold text-primary uppercase tracking-wider">CTM Call Details</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                              <div>
                                <dt className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Call ID</dt>
                                <dd className="text-xs font-mono text-foreground">{(inq as any).ctmCallId}</dd>
                              </div>
                              {(inq as any).ctmTrackingNumber && (
                                <div>
                                  <dt className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Tracking Number</dt>
                                  <dd className="text-xs font-mono text-foreground">{(inq as any).ctmTrackingNumber}</dd>
                                </div>
                              )}
                              {(inq as any).callDurationSeconds != null && (
                                <div>
                                  <dt className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Duration</dt>
                                  <dd className="text-xs font-semibold text-foreground">
                                    {Math.floor((inq as any).callDurationSeconds / 60)}m {(inq as any).callDurationSeconds % 60}s
                                  </dd>
                                </div>
                              )}
                              {(inq as any).callDateTime && (
                                <div>
                                  <dt className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Call Time</dt>
                                  <dd className="text-xs font-semibold text-foreground">
                                    {new Date((inq as any).callDateTime).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                                  </dd>
                                </div>
                              )}
                              {(inq as any).ctmSource && (
                                <div>
                                  <dt className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">CTM Source</dt>
                                  <dd className="text-xs font-mono text-foreground">{(inq as any).ctmSource}</dd>
                                </div>
                              )}
                            </div>
                            {(inq as any).callRecordingUrl && (
                              <a
                                href={(inq as any).callRecordingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors mt-1"
                              >
                                <Play className="w-3 h-3" /> Listen to Recording
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <AdmissionSnapshotCard inq={inq} />

              {inq.preAssessmentCompleted === "yes" && (
                <Card className="rounded-2xl border-emerald-500/25 bg-emerald-500/5">
                  <CardContent className="p-5 flex items-start gap-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-400 text-sm">Pre-Assessment Completed</p>
                      {inq.preAssessmentDate && <p className="text-xs text-muted-foreground mt-1">{formatDate(inq.preAssessmentDate)}</p>}
                      {inq.preAssessmentNotes && <p className="text-sm text-muted-foreground mt-2">{inq.preAssessmentNotes}</p>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === "vob" && (
            <Card className="rounded-2xl border-border">
              <CardHeader className="bg-muted/40 border-b border-border py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Insurance Verification of Benefits (VOB)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 md:p-7">
                <VOBForm
                  inquiryId={id}
                  inquiry={inq}
                  onVobSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
                    refetch();
                  }}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === "clinical_ai" && (
            <div className="space-y-6">
              {/* ── Pre-Assessment Forms ── */}
              <PreAssessmentSection
                inquiryId={id}
                currentNotes={inq.preAssessmentNotes || ""}
                onComplete={handlePreAssessmentComplete}
                inquiry={inq}
              />

              {/* ── Claude Clinical Summary ── */}
              <Card className="rounded-2xl border-border border-primary/20 overflow-hidden">
                <div className="bg-primary/10 p-5 border-b border-primary/20 flex justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" /> Claude Clinical Summary
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Generates a concise clinical overview for treatment team review.</p>
                  </div>
                  <Button onClick={handleGenerateSummary} disabled={summarizeInquiry.isPending} className="rounded-xl shadow-md shadow-primary/20 shrink-0">
                    {summarizeInquiry.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Generate
                  </Button>
                </div>
                <CardContent className="p-6 bg-card min-h-[300px]">
                  {aiSummary ? (
                    <div className="prose max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground">
                      <ReactMarkdown>{aiSummary}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                      <Brain className="w-14 h-14 mb-4 opacity-20" />
                      <p className="text-sm">Click Generate to create an AI summary from intake notes.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "activities" && (
            <div className="space-y-3 relative before:absolute before:left-5 before:top-0 before:h-full before:w-px before:bg-border">
              {activities?.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No activities recorded yet.</p>}
              {activities?.map((act: any) => {
                const userName: string = act.userName || "";
                const parts = userName.trim().split(/\s+/).filter(Boolean);
                const hasUser = parts.length > 0;
                const initials = hasUser
                  ? parts.length >= 2
                    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                    : parts[0][0].toUpperCase()
                  : null;

                // Type-specific avatar
                const isCall = act.type === "call";
                const isSms  = act.type === "sms";
                const avatarContent = hasUser
                  ? <span className="text-sm font-bold">{initials}</span>
                  : isCall
                    ? <Phone       className="w-4 h-4" />
                    : isSms
                      ? <MessageSquare className="w-4 h-4" />
                      : <Activity className="w-4 h-4" />;
                const avatarClass = isCall
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : isSms
                    ? "bg-[#5BC8DC]/15 text-[#5BC8DC] border-[#5BC8DC]/30"
                    : hasUser
                      ? "bg-primary/20 text-primary border-border"
                      : "bg-muted text-muted-foreground border-border";

                const typeLabel =
                  isCall ? "Call" :
                  isSms  ? "SMS" :
                  act.type.replace(/_/g, " ");

                return (
                  <div key={act.id} className="relative flex gap-4 pl-12">
                    <div className={cn(
                      "absolute left-0 w-10 h-10 rounded-full border-2 flex items-center justify-center z-10",
                      avatarClass,
                    )}>
                      {avatarContent}
                    </div>
                    <div className="flex-1 p-4 rounded-xl border border-border bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm capitalize">{typeLabel}</span>
                          {hasUser && <span className="text-xs text-muted-foreground">· {userName}</span>}
                        </div>
                        <time className="text-xs text-muted-foreground">{formatDate(act.createdAt)}</time>
                      </div>
                      <p className="text-sm text-muted-foreground">{act.subject}</p>
                      {act.body && (
                        isSms
                          ? <SmsTruncated text={act.body} />
                          : <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded-lg">{act.body}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "messages" && (
            <SMSInbox initialPhone={inq.phone ?? undefined} />
          )}
        </div>

        {/* Right sidebar — hide on full-width tabs */}
        {activeTab !== "clinical_ai" && activeTab !== "vob" && activeTab !== "messages" && (
          <div className="space-y-5">
            <AuditLogCard inquiryId={id} parsedAt={inq.parsedAt} vobData={inq.vobData} onTabChange={setActiveTab} />

            {/* VOB Summary Card (in sidebar if VOB has been started) */}
            {inq.vobData && (
              <Card className="rounded-2xl border-border">
                <CardHeader className="py-4 border-b border-border">
                  <CardTitle className="text-sm text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" /> VOB Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-sm">
                  {inq.vobData.inNetworkDeductible && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Deductible</span><span className="font-medium text-foreground">{inq.vobData.inNetworkDeductible}</span></div>
                  )}
                  {inq.vobData.inNetworkCoinsurance && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Coinsurance</span><span className="font-medium text-foreground">{inq.vobData.inNetworkCoinsurance}</span></div>
                  )}
                  {inq.vobData.quotedCost && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Quoted Cost</span><span className="font-medium text-foreground">{inq.vobData.quotedCost}</span></div>
                  )}
                  {inq.vobData.clientResponsibility && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Client Resp.</span><span className="font-medium text-foreground">{inq.vobData.clientResponsibility}</span></div>
                  )}
                  {inq.costAcceptance && (
                    <div className={cn(
                      "mt-2 pt-2 border-t border-border flex items-center gap-2 text-xs font-bold uppercase tracking-wide",
                      inq.costAcceptance === "accepted" ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {inq.costAcceptance === "accepted"
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Cost Accepted</>
                        : <><AlertTriangle className="w-3.5 h-3.5" /> Cannot Pay</>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Did Not Admit Modal */}
      <Dialog open={showNonAdmit} onOpenChange={setShowNonAdmit}>
        <DialogContent className="bg-card border-border text-foreground max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <XCircle className="w-5 h-5 text-rose-400" /> Did Not Admit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Recording this will mark the inquiry as <strong className="text-rose-400">Non-Viable</strong> and move it out of the active pipeline.
            </p>
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">Reason *</Label>
              <Select value={nonAdmitReason} onValueChange={setNonAdmitReason}>
                <SelectTrigger className="rounded-lg bg-muted border-border text-foreground h-10">
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground max-h-72">
                  <SelectItem value="none">Select reason...</SelectItem>
                  {NON_ADMIT_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">Additional Notes (optional)</Label>
              <Textarea
                value={nonAdmitNotes}
                onChange={e => setNonAdmitNotes(e.target.value)}
                placeholder="Any additional context..."
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none min-h-[80px] rounded-lg"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNonAdmit(false)} className="rounded-xl border-border text-foreground">
              Cancel
            </Button>
            <Button
              onClick={handleNonAdmitSubmit}
              disabled={submittingNonAdmit || nonAdmitReason === "none"}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white border-0 gap-2"
            >
              {submittingNonAdmit ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Record Did Not Admit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refer Out Modal */}
      <Dialog open={showReferOut} onOpenChange={setShowReferOut}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <SendHorizontal className="w-5 h-5 text-amber-400" /> Refer Out
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Send a referral to another treatment facility via text or email.</p>
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">Method *</Label>
              <Select value={referOutType} onValueChange={setReferOutType}>
                <SelectTrigger className="rounded-lg bg-muted border-border text-foreground h-10">
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="none">Select method...</SelectItem>
                  <SelectItem value="text">Text Message</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm font-medium text-foreground">Message *</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateReferOutMessage}
                  disabled={generatingMsg || referOutType === "none"}
                  className="h-7 px-2 text-xs text-primary hover:bg-primary/10 gap-1"
                >
                  {generatingMsg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Generate with AI
                </Button>
              </div>
              <Textarea
                value={referOutMessage}
                onChange={e => setReferOutMessage(e.target.value)}
                placeholder="Compose your referral message..."
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none min-h-[120px] rounded-lg"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReferOut(false)} className="rounded-xl border-border text-foreground">
              Cancel
            </Button>
            <Button
              onClick={handleReferOutSubmit}
              disabled={submittingReferOut || referOutType === "none" || !referOutMessage.trim()}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white border-0 gap-2"
            >
              {submittingReferOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
              Record Refer Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admit Review Modal */}
      {showAdmitReview && inquiry && (
        <AdmitReviewModal
          inq={inquiry as any}
          onClose={() => setShowAdmitReview(false)}
          onAdmitted={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/inquiries"] });
            queryClient.invalidateQueries({ queryKey: ["/api/inquiries", id] });
          }}
        />
      )}
    </Layout>
  );
}

function DataPoint({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col border-b border-border/50 pb-3 sm:border-0 sm:pb-0">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value || "—"}</dd>
    </div>
  );
}

function TextBlock({ label, text }: { label: string; text: any }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2">{label}</h4>
      <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground whitespace-pre-wrap border border-border/60 leading-relaxed">
        {text || "No information provided."}
      </div>
    </div>
  );
}

