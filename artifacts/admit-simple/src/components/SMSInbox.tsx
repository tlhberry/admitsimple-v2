import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLiveEvents } from "@/hooks/use-live-events";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Send, ArrowLeft, Plus, Search,
  Loader2, Phone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SmsMessage {
  id: number;
  phone: string;
  direction: "inbound" | "outbound";
  body: string;
  status: string | null;
  createdAt: string;
  readAt: string | null;
  inquiryId: number | null;
  userId: number | null;
  twilioSid: string | null;
}

interface Thread {
  id: number;
  phone: string;
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
  read_at: string | null;
  first_name: string | null;
  last_name: string | null;
  unread_count: string | number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "now";
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fullTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function contactLabel(thread: Thread): string {
  if (thread.first_name || thread.last_name) {
    return [thread.first_name, thread.last_name].filter(Boolean).join(" ");
  }
  return thread.phone;
}

function groupByDate(messages: SmsMessage[]): Array<{ date: string; msgs: SmsMessage[] }> {
  const groups: Record<string, SmsMessage[]> = {};
  for (const m of messages) {
    const d = new Date(m.createdAt).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
    if (!groups[d]) groups[d] = [];
    groups[d].push(m);
  }
  return Object.entries(groups).map(([date, msgs]) => ({ date, msgs }));
}

// ── Thread List Item ──────────────────────────────────────────────────────────
function ThreadItem({
  thread, selected, onClick,
}: { thread: Thread; selected: boolean; onClick: () => void }) {
  const name = contactLabel(thread);
  const hasRealName = !!(thread.first_name || thread.last_name);
  const unread = Number(thread.unread_count) > 0;
  const isInbound = thread.direction === "inbound";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 border-b border-border transition-all",
        "flex items-start gap-3 hover:bg-muted/40",
        selected && "bg-[#5BC8DC]/8 border-l-2 border-l-[#5BC8DC]",
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold",
        "bg-[#5BC8DC]/15 text-[#5BC8DC]",
      )}>
        {hasRealName ? name[0]?.toUpperCase() : <Phone className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className={cn(
            "text-sm truncate",
            unread ? "font-bold text-foreground" : "font-medium text-foreground/80",
          )}>
            {name}
          </span>
          <span className={cn(
            "text-[10px] flex-shrink-0",
            unread ? "text-[#5BC8DC] font-semibold" : "text-muted-foreground",
          )}>
            {relativeTime(thread.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {!isInbound && (
            <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">You:</span>
          )}
          <p className={cn(
            "text-xs truncate",
            unread ? "text-foreground font-medium" : "text-muted-foreground",
          )}>
            {thread.body}
          </p>
          {unread && (
            <span className="w-2 h-2 rounded-full bg-[#5BC8DC] flex-shrink-0 ml-auto" />
          )}
        </div>
      </div>
    </button>
  );
}

// ── Conversation View ─────────────────────────────────────────────────────────
function ConversationView({
  phone,
  contactName,
  onBack,
}: {
  phone: string;
  contactName: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const maxChars = 160;

  const { data: messages = [], isLoading } = useQuery<SmsMessage[]>({
    queryKey: ["/api/sms/thread", phone],
    queryFn: () =>
      fetch(`/api/sms/thread/${encodeURIComponent(phone)}`, { credentials: "include" })
        .then(r => r.json()),
    refetchInterval: 30000, // fallback polling
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Focus input when view opens
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [phone]);

  const send = useCallback(async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message: body }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast({ title: "Send failed", description: d.error ?? "Unknown error", variant: "destructive" });
        setInput(body); // restore
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/sms/thread", phone] });
        queryClient.invalidateQueries({ queryKey: ["/api/sms/threads"] });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
      setInput(body);
    } finally {
      setSending(false);
    }
  }, [input, phone, sending, toast, queryClient]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const groups = groupByDate(messages);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-full bg-[#5BC8DC]/15 text-[#5BC8DC] flex items-center justify-center text-sm font-bold flex-shrink-0">
          {contactName[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{contactName}</p>
          <p className="text-[11px] text-muted-foreground font-mono">{phone}</p>
        </div>
        <a
          href={`tel:${phone}`}
          className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground"
          title="Call"
        >
          <Phone className="w-4 h-4" />
        </a>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <MessageSquare className="w-10 h-10 opacity-20" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          groups.map(({ date, msgs }) => (
            <div key={date}>
              {/* Date divider */}
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground font-medium">{date}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {msgs.map((msg, idx) => {
                const isOut = msg.direction === "outbound";
                const prev  = idx > 0 ? msgs[idx - 1] : null;
                const sameDirAsPrev = prev?.direction === msg.direction;
                const showTime = !prev || (
                  new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60000
                );

                return (
                  <div key={msg.id} className={cn("flex", isOut ? "justify-end" : "justify-start", sameDirAsPrev ? "mt-0.5" : "mt-3")}>
                    <div className="max-w-[75%]">
                      {showTime && (
                        <p className={cn("text-[10px] text-muted-foreground mb-1", isOut ? "text-right" : "text-left")}>
                          {fullTime(msg.createdAt)}
                        </p>
                      )}
                      <div className={cn(
                        "px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
                        isOut
                          ? "bg-[#5BC8DC] text-white rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm",
                      )}>
                        {msg.body}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value.slice(0, maxChars))}
              onKeyDown={handleKey}
              placeholder="iMessage"
              className={cn(
                "w-full h-10 bg-muted/40 border border-border rounded-full",
                "px-4 text-sm text-foreground placeholder:text-muted-foreground/50",
                "focus:outline-none focus:ring-1 focus:ring-[#5BC8DC] focus:border-[#5BC8DC]",
                "transition-colors pr-14",
              )}
            />
            {input.length > 120 && (
              <span className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono",
                input.length >= maxChars ? "text-red-400" : "text-muted-foreground",
              )}>
                {maxChars - input.length}
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={!input.trim() || sending}
            onClick={send}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
              input.trim() && !sending
                ? "bg-[#5BC8DC] text-white hover:bg-[#4ab8cc] shadow-lg shadow-[#5BC8DC]/25 active:scale-95"
                : "bg-muted text-muted-foreground/40 cursor-not-allowed",
            )}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Thread Modal ──────────────────────────────────────────────────────────
function NewThreadModal({
  onClose,
  onOpen,
}: { onClose: () => void; onOpen: (phone: string) => void }) {
  const [phone, setPhone] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-6 w-80 shadow-2xl">
        <h3 className="text-sm font-bold text-foreground mb-4">New Message</h3>
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
          To (phone number)
        </label>
        <input
          type="tel"
          autoFocus
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && phone.trim()) { onOpen(phone.trim()); onClose(); } }}
          placeholder="+1 (555) 000-0000"
          className="w-full h-10 bg-muted/40 border border-border rounded-xl px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#5BC8DC] focus:border-[#5BC8DC] mb-4"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!phone.trim()}
            onClick={() => { onOpen(phone.trim()); onClose(); }}
            className="flex-1 h-10 rounded-xl bg-[#5BC8DC] text-white text-sm font-bold disabled:opacity-40 hover:bg-[#4ab8cc]"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main SMSInbox Component ───────────────────────────────────────────────────
export function SMSInbox({ initialPhone }: { initialPhone?: string }) {
  const queryClient = useQueryClient();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(initialPhone ?? null);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [showNewModal,  setShowNewModal]  = useState(false);
  const [mobileView,    setMobileView]    = useState<"list" | "chat">(initialPhone ? "chat" : "list");

  const { data: threads = [], isLoading: threadsLoading } = useQuery<Thread[]>({
    queryKey: ["/api/sms/threads"],
    queryFn: () =>
      fetch("/api/sms/threads", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 15000,
  });

  // SSE — refresh when new SMS arrives
  useLiveEvents((event, data: any) => {
    if (event === "sms_message") {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/threads"] });
      if (data?.phone === selectedPhone) {
        queryClient.invalidateQueries({ queryKey: ["/api/sms/thread", selectedPhone] });
      }
    }
  });

  const selectThread = useCallback((phone: string) => {
    setSelectedPhone(phone);
    setMobileView("chat");
    queryClient.invalidateQueries({ queryKey: ["/api/sms/thread", phone] });
    queryClient.invalidateQueries({ queryKey: ["/api/sms/threads"] });
  }, [queryClient]);

  const filteredThreads = threads.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = contactLabel(t).toLowerCase();
    return name.includes(q) || t.phone.includes(q) || t.body.toLowerCase().includes(q);
  });

  const selectedThread = threads.find(t => t.phone === selectedPhone);
  const selectedName = selectedThread
    ? contactLabel(selectedThread)
    : selectedPhone ?? "";

  return (
    <>
      {showNewModal && (
        <NewThreadModal
          onClose={() => setShowNewModal(false)}
          onOpen={selectThread}
        />
      )}

      <div className="flex h-[520px] min-h-0">
        {/* ── Thread List ───────────────────────────────────────────────── */}
        <div className={cn(
          "flex flex-col border-r border-border",
          "w-full md:w-72 lg:w-80 flex-shrink-0",
          mobileView === "chat" ? "hidden md:flex" : "flex",
        )}>
          {/* List header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-bold text-foreground flex-1">Messages</span>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="w-7 h-7 rounded-full bg-[#5BC8DC]/15 text-[#5BC8DC] flex items-center justify-center hover:bg-[#5BC8DC]/25 transition-colors"
              title="New message"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="w-full h-8 bg-muted/40 rounded-lg pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#5BC8DC] border border-transparent focus:border-[#5BC8DC]"
              />
            </div>
          </div>

          {/* Thread rows */}
          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 gap-2 text-muted-foreground">
                <MessageSquare className="w-8 h-8 opacity-20" />
                <p className="text-xs text-center">
                  {searchQuery ? "No results" : "No conversations yet.\nSend the first message!"}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => setShowNewModal(true)}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-[#5BC8DC]/15 text-[#5BC8DC] text-xs font-semibold hover:bg-[#5BC8DC]/25"
                  >
                    + New Message
                  </button>
                )}
              </div>
            ) : (
              filteredThreads.map(thread => (
                <ThreadItem
                  key={thread.phone}
                  thread={thread}
                  selected={thread.phone === selectedPhone}
                  onClick={() => selectThread(thread.phone)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Conversation Panel ────────────────────────────────────────── */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 min-h-0",
          mobileView === "list" ? "hidden md:flex" : "flex",
        )}>
          {selectedPhone ? (
            <ConversationView
              phone={selectedPhone}
              contactName={selectedName}
              onBack={() => setMobileView("list")}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageSquare className="w-12 h-12 opacity-15" />
              <p className="text-sm">Select a conversation</p>
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="px-4 py-2 rounded-xl bg-[#5BC8DC]/15 text-[#5BC8DC] text-sm font-semibold hover:bg-[#5BC8DC]/25 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> New Message
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
