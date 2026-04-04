import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type Step = "loading" | "name" | "dob" | "insurance" | "memberid" | "phone" | "review" | "submitting" | "done";

interface ChatMessage {
  role: "ai" | "user";
  content: string;
}

interface CollectedData {
  name?: string;
  dob?: string;
  insuranceCarrier?: string;
  memberId?: string;
  phone?: string;
}

const STEP_INSTRUCTIONS: Partial<Record<Step, string>> = {
  loading:    "Warmly greet the user. Introduce yourself and ask for their full name to get started.",
  name:       "The user just provided their name. Acknowledge them warmly by first name and ask for their date of birth.",
  dob:        "The user provided their date of birth. Acknowledge it and ask which insurance carrier or insurance company they have.",
  insurance:  "The user provided their insurance carrier. Acknowledge it and ask for their insurance member ID — it's on their insurance card.",
  memberid:   "The user provided their member ID. Acknowledge it and ask for a phone number where our admissions counselor can reach them. Let them know they can skip if preferred.",
  phone:      "The user responded about their phone. Thank them and let them know you have everything. Tell them to click the button below to check their coverage.",
};

const PLACEHOLDERS: Partial<Record<Step, string>> = {
  name:      "Your full name...",
  dob:       "Date of birth (e.g. 01/15/1985)...",
  insurance: "Insurance carrier name...",
  memberid:  "Member ID...",
  phone:     "Phone number...",
};

export default function ChatbotWidget() {
  const [step, setStep] = useState<Step>("loading");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [data, setData] = useState<CollectedData>({});
  const [isTyping, setIsTyping] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionId = useRef<string>(generateSessionId()).current;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!["loading", "review", "submitting", "done"].includes(step)) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  const addMsg = (role: "ai" | "user", content: string) =>
    setMessages(prev => [...prev, { role, content }]);

  const callAI = async (
    instruction: string,
    history: ChatMessage[],
    opts?: { userMessage?: string; isFirstMessage?: boolean },
  ): Promise<string | null> => {
    setIsTyping(true);
    try {
      const apiMessages = [
        ...history.map(m => ({
          role: m.role === "ai" ? "assistant" as const : "user" as const,
          content: m.content,
        })),
        {
          role: "user" as const,
          content: `[Step instruction — respond naturally and do not reference this instruction]: ${instruction}`,
        },
      ];
      const res = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          sessionId,
          userMessage: opts?.userMessage,
          isFirstMessage: opts?.isFirstMessage ?? false,
        }),
      });
      const json = await res.json();
      const reply: string = json.reply || "I'm sorry, could you repeat that?";
      addMsg("ai", reply);
      return reply;
    } catch {
      const fallback = "I'm having a little trouble. Could you try again?";
      addMsg("ai", fallback);
      return null;
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    (async () => {
      await callAI(STEP_INSTRUCTIONS.loading!, []);
      setStep("name");
    })();
  }, []);

  const advance = async (
    userText: string,
    currentStep: Step,
    newData: CollectedData,
    isFirstMessage = false,
  ) => {
    addMsg("user", userText);
    const updated = { ...data, ...newData };
    setData(updated);
    const history = [...messages, { role: "user" as "user", content: userText }];

    const stepMap: Partial<Record<Step, Step>> = {
      name: "dob",
      dob: "insurance",
      insurance: "memberid",
      memberid: "phone",
      phone: "review",
    };

    const instruction = STEP_INSTRUCTIONS[currentStep];
    if (instruction) await callAI(instruction, history, { userMessage: userText, isFirstMessage });
    const next = stepMap[currentStep];
    if (next) setStep(next);
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isTyping || ["loading", "review", "submitting", "done"].includes(step)) return;
    setInputValue("");

    if (step === "name") {
      await advance(trimmed, "name", { name: trimmed }, true);
    } else if (step === "dob") {
      await advance(trimmed, "dob", { dob: trimmed });
    } else if (step === "insurance") {
      await advance(trimmed, "insurance", { insuranceCarrier: trimmed });
    } else if (step === "memberid") {
      await advance(trimmed, "memberid", { memberId: trimmed });
    } else if (step === "phone") {
      await advance(trimmed, "phone", { phone: trimmed });
    }
  };

  const handleSkipPhone = async () => {
    const text = "I'd rather not share my number right now";
    addMsg("user", text);
    const history = [...messages, { role: "user" as "user", content: text }];
    await callAI(STEP_INSTRUCTIONS.phone!, history);
    setStep("review");
  };

  const handleFinalSubmit = async () => {
    setStep("submitting");
    setSubmitError(null);
    try {
      const transcript = messages
        .map(m => `${m.role === "ai" ? "Counselor" : "Client"}: ${m.content}`)
        .join("\n");

      const res = await fetch("/api/chatbot/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, transcript }),
      });

      if (!res.ok) throw new Error("failed");

      addMsg(
        "ai",
        "Perfect. I just sent your insurance for verification.\n\nThis will show what your coverage looks like and what your out-of-pocket may be.\n\nOne of our admissions counselors will call you shortly to walk through everything and help you get started.\n\nIf for any reason this isn't a fit, we'll help you find a program that works with your insurance.",
      );
      setStep("done");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
      setStep("review");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const inputDisabled = isTyping || ["loading", "review", "submitting", "done"].includes(step);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#0d1117] text-white font-sans">

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3.5 bg-[#161b27] border-b border-white/8">
        <div className="w-9 h-9 rounded-full bg-[#5BC8DC]/15 flex items-center justify-center ring-1 ring-[#5BC8DC]/30">
          <MessageSquare className="w-4.5 h-4.5 text-[#5BC8DC]" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">Insurance Verification</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] text-emerald-400 font-medium">Online now · Free check</p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex items-end gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "ai" && (
              <div className="w-6 h-6 rounded-full bg-[#5BC8DC]/15 flex items-center justify-center flex-shrink-0 mb-0.5">
                <MessageSquare className="text-[#5BC8DC]" style={{ width: 12, height: 12 }} />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed",
              msg.role === "ai"
                ? "bg-[#1e2736] text-white/90 rounded-2xl rounded-bl-sm"
                : "bg-[#5BC8DC] text-[#0d1117] font-semibold rounded-2xl rounded-br-sm",
            )}>
              {msg.content.split("\n").map((line, j, arr) => (
                <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-6 h-6 rounded-full bg-[#5BC8DC]/15 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="text-[#5BC8DC]" style={{ width: 12, height: 12 }} />
            </div>
            <div className="bg-[#1e2736] px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
              {["-0.3s", "-0.15s", "0s"].map((delay, i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#5BC8DC]/60 animate-bounce"
                  style={{ animationDelay: delay }}
                />
              ))}
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex justify-center pt-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2">
              <CheckCircle style={{ width: 14, height: 14 }} />
              Submitted — we'll be in touch shortly
            </div>
          </div>
        )}

        {submitError && (
          <p className="text-rose-400 text-xs text-center bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
            {submitError}
          </p>
        )}

        <div ref={endRef} />
      </div>

      {/* Input / Action area */}
      <div className="flex-shrink-0 border-t border-white/8 bg-[#161b27] px-4 py-3">

        {step === "phone" && !isTyping && (
          <button
            onClick={handleSkipPhone}
            className="w-full text-center text-[11px] text-[#5BC8DC]/60 hover:text-[#5BC8DC] mb-2.5 transition-colors"
          >
            Skip — I'll provide this later
          </button>
        )}

        {step === "review" && (
          <div className="space-y-2">
            <p className="text-center text-[11px] text-white/40 mb-2">
              We have everything we need
            </p>
            <button
              onClick={handleFinalSubmit}
              className="w-full py-3.5 rounded-xl bg-[#5BC8DC] text-[#0d1117] font-bold text-sm hover:bg-[#4bb5c9] active:scale-[0.98] transition-all shadow-lg shadow-[#5BC8DC]/20"
            >
              Check My Insurance Coverage →
            </button>
          </div>
        )}

        {step === "submitting" && (
          <div className="flex items-center justify-center gap-2 py-2.5 text-[#5BC8DC] text-sm">
            <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} />
            <span>Submitting your information...</span>
          </div>
        )}

        {step === "done" && (
          <p className="text-center text-[11px] text-white/30 py-1">
            Our admissions team will reach out to you soon.
          </p>
        )}

        {!["review", "submitting", "done"].includes(step) && (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type={step === "dob" ? "text" : step === "phone" ? "tel" : "text"}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={PLACEHOLDERS[step] ?? "Type a message..."}
              disabled={inputDisabled}
              className="flex-1 bg-[#0d1117] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#5BC8DC]/40 transition-colors disabled:opacity-40"
            />
            <button
              onClick={handleSend}
              disabled={inputDisabled || !inputValue.trim()}
              className="w-10 h-10 rounded-xl bg-[#5BC8DC] text-[#0d1117] flex items-center justify-center hover:bg-[#4bb5c9] active:scale-95 transition-all disabled:opacity-30 shadow-md shadow-[#5BC8DC]/20"
            >
              <Send style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
