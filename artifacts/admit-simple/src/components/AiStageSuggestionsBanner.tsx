import { useState, useEffect } from "react";
import { Brain, ChevronRight, Check, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLiveEvents } from "@/hooks/use-live-events";
import { cn } from "@/lib/utils";

interface Suggestion {
  suggestion: {
    id: number;
    inquiryId: number;
    currentStage: string;
    suggestedStage: string;
    reasoning: string;
    confidence: string;
    status: string;
    createdAt: string;
  };
  inquiry: {
    id: number;
    firstName: string;
    lastName: string;
    status: string;
  } | null;
}

export function AiStageSuggestionsBanner() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();

  const fetchSuggestions = async () => {
    try {
      const r = await fetch("/api/ai-suggestions", { credentials: "include" });
      if (r.ok) setSuggestions(await r.json());
    } catch {}
  };

  useEffect(() => { fetchSuggestions(); }, []);

  useLiveEvents({
    ai_stage_suggestion: (data: any) => {
      setSuggestions(prev => {
        const exists = prev.find(s => s.suggestion.id === data.suggestion.id);
        if (exists) return prev;
        return [{ suggestion: data.suggestion, inquiry: data.suggestion.inquiry }, ...prev];
      });
      setExpanded(true);
    },
    ai_suggestion_resolved: (data: any) => {
      setSuggestions(prev => prev.filter(s => s.suggestion.id !== data.suggestionId));
    },
  });

  const handle = async (id: number, action: "accept" | "dismiss") => {
    setLoading(l => ({ ...l, [id]: true }));
    try {
      const r = await fetch(`/api/ai-suggestions/${id}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed");
      setSuggestions(prev => prev.filter(s => s.suggestion.id !== id));
      toast({
        title: action === "accept" ? "Stage advanced" : "Suggestion dismissed",
        description: action === "accept"
          ? "Inquiry moved to the next stage."
          : "AI suggestion has been dismissed.",
      });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, [id]: false }));
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col gap-2">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-[#5BC8DC]/10 border border-[#5BC8DC]/30 text-[#5BC8DC] hover:bg-[#5BC8DC]/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">
            AI Stage Suggestions
            <span className="ml-2 bg-[#5BC8DC] text-[#0a1628] text-xs font-bold px-1.5 py-0.5 rounded-full">
              {suggestions.length}
            </span>
          </span>
        </div>
        <ChevronRight className={cn("w-4 h-4 transition-transform", expanded ? "rotate-90" : "")} />
      </button>

      {/* Suggestion cards */}
      {expanded && suggestions.map(({ suggestion, inquiry }) => (
        <div
          key={suggestion.id}
          className="bg-card border border-border rounded-xl p-4 shadow-lg shadow-black/20 space-y-3 animate-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5 p-1.5 rounded-lg bg-[#5BC8DC]/10">
              <Brain className="w-3.5 h-3.5 text-[#5BC8DC]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {inquiry?.firstName} {inquiry?.lastName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted truncate max-w-[120px]">
                  {suggestion.currentStage}
                </span>
                <ChevronRight className="w-3 h-3 text-[#5BC8DC] shrink-0" />
                <span className="text-xs text-[#5BC8DC] font-medium px-1.5 py-0.5 rounded bg-[#5BC8DC]/10 truncate max-w-[120px]">
                  {suggestion.suggestedStage}
                </span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded font-medium",
                  suggestion.confidence === "high"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-yellow-500/10 text-yellow-400"
                )}>
                  {suggestion.confidence} confidence
                </span>
              </div>
            </div>
          </div>

          {suggestion.reasoning && (
            <p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 rounded-lg px-3 py-2">
              {suggestion.reasoning}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 rounded-lg text-xs gap-1.5 bg-[#5BC8DC] hover:bg-[#5BC8DC]/90 text-[#0a1628] font-semibold"
              disabled={loading[suggestion.id]}
              onClick={() => handle(suggestion.id, "accept")}
            >
              {loading[suggestion.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Accept & Move
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 rounded-lg text-xs border-border gap-1.5"
              disabled={loading[suggestion.id]}
              onClick={() => handle(suggestion.id, "dismiss")}
            >
              <X className="w-3 h-3" />
              Dismiss
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
