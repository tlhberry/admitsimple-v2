import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, RefreshCw, CheckCircle2, Circle, Phone, FileSearch, ClipboardList, Star, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface TaskItem {
  inquiry_id: number;
  patient_name: string;
  task_type: string;
  last_activity_time: string | null;
  completed: boolean;
}

interface TasksResponse {
  urgent_callbacks: TaskItem[];
  vobs_needed: TaskItem[];
  prescreens_needed: TaskItem[];
  ready_to_admit: TaskItem[];
  generatedAt: string;
}

async function fetchTasks(): Promise<TasksResponse> {
  const res = await fetch("/api/ai/tasks", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load tasks");
  return res.json();
}

async function completeTask(inquiryId: number, taskType: string) {
  await fetch("/api/ai/tasks/complete", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inquiryId, taskType }),
  });
}

async function uncompleteTask(inquiryId: number, taskType: string) {
  await fetch(`/api/ai/tasks/complete/${inquiryId}/${taskType}`, {
    method: "DELETE",
    credentials: "include",
  });
}

async function regenerateTasks() {
  await fetch("/api/ai/tasks/regenerate", { method: "POST", credentials: "include" });
}

const sections = [
  {
    key: "urgent_callbacks" as const,
    label: "Urgent Callbacks",
    dot: "bg-rose-500",
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/25",
    icon: Phone,
    iconColor: "text-rose-400",
    emptyMsg: "No urgent callbacks",
  },
  {
    key: "vobs_needed" as const,
    label: "VOBs Needed",
    dot: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    icon: FileSearch,
    iconColor: "text-amber-400",
    emptyMsg: "All VOBs up to date",
  },
  {
    key: "prescreens_needed" as const,
    label: "Pre-Screens Needed",
    dot: "bg-blue-500",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    icon: ClipboardList,
    iconColor: "text-blue-400",
    emptyMsg: "All pre-screens done",
  },
  {
    key: "ready_to_admit" as const,
    label: "Ready to Admit",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    icon: Star,
    iconColor: "text-emerald-400",
    emptyMsg: "No one ready to admit yet",
  },
];

function timeAgo(ts: string | null) {
  if (!ts) return null;
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return null;
  }
}

function TaskRow({ task, onToggle }: { task: TaskItem; onToggle: (t: TaskItem) => void }) {
  const [, navigate] = useLocation();
  const age = timeAgo(task.last_activity_time);

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group",
      task.completed ? "opacity-40" : "hover:bg-muted/40"
    )}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(task); }}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors mt-0.5"
      >
        {task.completed
          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          : <Circle className="w-4 h-4" />}
      </button>
      <button
        className={cn("flex-1 text-left min-w-0", task.completed && "line-through")}
        onClick={() => navigate(`/inquiries/${task.inquiry_id}`)}
      >
        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {task.patient_name}
        </span>
      </button>
      {age && (
        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{age}</span>
      )}
    </div>
  );
}

export function AdmissionsTaskBoard() {
  const qc = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admissions-tasks"],
    queryFn: fetchTasks,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const toggleMutation = useMutation({
    mutationFn: async (task: TaskItem) => {
      if (task.completed) {
        await uncompleteTask(task.inquiry_id, task.task_type);
      } else {
        await completeTask(task.inquiry_id, task.task_type);
      }
    },
    onMutate: async (task) => {
      await qc.cancelQueries({ queryKey: ["admissions-tasks"] });
      const prev = qc.getQueryData<TasksResponse>(["admissions-tasks"]);
      if (prev) {
        const toggle = (items: TaskItem[]) =>
          items.map(t => t.inquiry_id === task.inquiry_id && t.task_type === task.task_type
            ? { ...t, completed: !t.completed } : t);
        qc.setQueryData<TasksResponse>(["admissions-tasks"], {
          ...prev,
          urgent_callbacks:  toggle(prev.urgent_callbacks),
          vobs_needed:       toggle(prev.vobs_needed),
          prescreens_needed: toggle(prev.prescreens_needed),
          ready_to_admit:    toggle(prev.ready_to_admit),
        });
      }
      return { prev };
    },
    onError: (_err, _task, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admissions-tasks"], ctx.prev);
    },
  });

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    await regenerateTasks();
    await qc.invalidateQueries({ queryKey: ["admissions-tasks"] });
    setRegenerating(false);
  }, [qc]);

  const totalTasks = data
    ? (data.urgent_callbacks.length + data.vobs_needed.length + data.prescreens_needed.length + data.ready_to_admit.length)
    : 0;
  const completedCount = data
    ? [...data.urgent_callbacks, ...data.vobs_needed, ...data.prescreens_needed, ...data.ready_to_admit]
        .filter(t => t.completed).length
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border bg-muted/40 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Today's Admissions Tasks</h3>
          {data && totalTasks > 0 && (
            <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium">
              {completedCount}/{totalTasks}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegenerate}
          disabled={regenerating || isLoading}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Regenerate tasks"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", (regenerating || isLoading) && "animate-spin")} />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {isLoading || regenerating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">AI is analyzing your pipeline…</p>
              <p className="text-xs text-muted-foreground mt-0.5">Building your task list for today</p>
            </div>
            <Loader2 className="w-4 h-4 animate-spin text-primary mt-1" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <p className="text-sm text-muted-foreground">Could not generate tasks. Try refreshing.</p>
          </div>
        ) : totalTasks === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <p className="text-sm font-medium text-foreground">All clear!</p>
            <p className="text-xs text-muted-foreground">No outstanding tasks for today.</p>
          </div>
        ) : (
          sections.map(({ key, label, dot, badge, icon: Icon, iconColor, emptyMsg }) => {
            const items = data?.[key] ?? [];
            const pending = items.filter(t => !t.completed);
            const done = items.filter(t => t.completed);
            const all = [...pending, ...done];
            if (all.length === 0) return null;
            return (
              <div key={key} className="mb-1">
                {/* Section header */}
                <div className="flex items-center gap-2 px-2 py-1.5 mb-0.5">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", dot)} />
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border", badge)}>
                    {label}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-auto">{pending.length} left</span>
                </div>
                {all.map(task => (
                  <TaskRow
                    key={`${task.inquiry_id}-${task.task_type}`}
                    task={task}
                    onToggle={(t) => toggleMutation.mutate(t)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Footer: generated time */}
      {data && (
        <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground/60 text-right rounded-b-2xl">
          Generated {timeAgo(data.generatedAt)}
        </div>
      )}
    </div>
  );
}
