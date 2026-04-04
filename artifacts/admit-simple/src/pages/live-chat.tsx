import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { MessageSquare, RefreshCw, ExternalLink, Clock, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMsg {
  role: "user" | "ai";
  content: string;
  ts: string;
}

interface Session {
  sessionId: string;
  messages: ChatMsg[];
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function LiveChat() {
  const [, params] = useRoute("/live-chat/:sessionId");
  const sessionId = params?.sessionId ?? "";
  const [session, setSession] = useState<Session | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  const load = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/chatbot/sessions/${sessionId}`, { credentials: "include" });
      if (res.status === 404) { setNotFound(true); setIsLive(false); return; }
      if (!res.ok) return;
      const data: Session = await res.json();
      setSession(data);
      setLastUpdated(new Date());
      const len = data.messages?.length ?? 0;
      if (len > prevLengthRef.current) {
        prevLengthRef.current = len;
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
      // Stop polling if no new messages in 20 minutes
      const lastMsg = data.messages?.at(-1);
      if (lastMsg) {
        const ageSec = (Date.now() - new Date(lastMsg.ts).getTime()) / 1000;
        if (ageSec > 1200) setIsLive(false);
      }
    } catch {
      setIsLive(false);
    }
  };

  useEffect(() => {
    load();
  }, [sessionId]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [sessionId, isLive]);

  const msgs = session?.messages ?? [];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
              <MessageSquare className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">Live Chat Session</h1>
              <p className="text-xs text-muted-foreground font-mono">{sessionId.slice(0, 18)}…</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isLive ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <Wifi className="w-3 h-3 animate-pulse" />
                Live
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Session ended
              </div>
            )}
            {lastUpdated && (
              <button
                onClick={load}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Updated {timeAgo(lastUpdated.toISOString())}
              </button>
            )}
          </div>
        </div>

        {/* Session meta */}
        {session && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground border border-border rounded-xl px-4 py-2.5 bg-muted/30">
            <span>Started {timeAgo(session.createdAt)}</span>
            <span>·</span>
            <span>{msgs.length} messages</span>
            {session.notifiedAt && (
              <>
                <span>·</span>
                <span className="text-emerald-500">SMS sent {timeAgo(session.notifiedAt)}</span>
              </>
            )}
          </div>
        )}

        {/* Not found */}
        {notFound && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Session not found</p>
            <p className="text-xs mt-1">This chat session may have expired or the link is invalid.</p>
          </div>
        )}

        {/* Empty state */}
        {!notFound && session && msgs.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="flex gap-1 justify-center mb-3">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-sm">Waiting for visitor to send a message…</p>
          </div>
        )}

        {/* Chat messages */}
        {msgs.length > 0 && (
          <div className="border border-border rounded-2xl bg-background overflow-hidden">
            <div className="bg-muted/30 border-b border-border px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversation</span>
              <a
                href="/inquiries"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> View Inquiries
              </a>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {msgs.map((msg, i) => (
                <div key={i} className={cn("flex items-end gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "ai" && (
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mb-0.5">
                      <MessageSquare className="text-primary" style={{ width: 11, height: 11 }} />
                    </div>
                  )}
                  <div className="flex flex-col gap-1" style={{ maxWidth: "75%" }}>
                    <div className={cn(
                      "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                      msg.role === "ai"
                        ? "bg-muted text-foreground rounded-bl-sm"
                        : "bg-primary text-primary-foreground rounded-br-sm",
                    )}>
                      {msg.content.split("\n").map((line, j, arr) => (
                        <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                      ))}
                    </div>
                    <p className={cn("text-[10px] text-muted-foreground/60 px-1", msg.role === "user" ? "text-right" : "text-left")}>
                      {msg.role === "ai" ? "AI Counselor" : "Visitor"} · {timeAgo(msg.ts)}
                    </p>
                  </div>
                </div>
              ))}
              {isLive && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="text-primary" style={{ width: 11, height: 11 }} />
                  </div>
                  <div className="flex gap-1 items-center bg-muted px-3 py-2 rounded-2xl rounded-bl-sm">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>
        )}

        {/* When inquiry is likely submitted */}
        {!isLive && msgs.length > 0 && (
          <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-400">
              Session complete · Check{" "}
              <a href="/inquiries" className="underline font-semibold hover:text-emerald-300">Inquiries</a>{" "}
              if the visitor submitted their information.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
