import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Device, Call } from "@twilio/voice-sdk";

interface TwilioVoiceContextValue {
  isReady: boolean;
  setupError: string | null;
  activeCalls: Map<string, Call>;
  answerCall: (callSid: string) => void;
  declineCall: (callSid: string) => void;
  makeCall: (to: string, name: string) => Promise<void>;
  hangUp: () => void;
  toggleMute: () => void;
  outboundCall: Call | null;
  outboundTo: string;
  outboundName: string;
  outboundStatus: "idle" | "connecting" | "ringing" | "open";
  isMuted: boolean;
  callDuration: number;
}

const TwilioVoiceContext = createContext<TwilioVoiceContextValue | null>(null);

export function TwilioVoiceProvider({ children }: { children: ReactNode }) {
  const deviceRef       = useRef<Device | null>(null);
  const outboundCallRef = useRef<Call | null>(null);
  const durationRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveDurationRef = useRef(0);

  const [isReady,        setIsReady]        = useState(false);
  const [setupError,     setSetupError]     = useState<string | null>(null);
  const [activeCalls,    setActiveCalls]    = useState<Map<string, Call>>(new Map());
  const [outboundCall,   setOutboundCall]   = useState<Call | null>(null);
  const [outboundTo,     setOutboundTo]     = useState("");
  const [outboundName,   setOutboundName]   = useState("");
  const [outboundStatus, setOutboundStatus] = useState<"idle" | "connecting" | "ringing" | "open">("idle");
  const [isMuted,        setIsMuted]        = useState(false);
  const [callDuration,   setCallDuration]   = useState(0);

  useEffect(() => {
    let device: Device;
    let destroyed = false;

    async function setup() {
      try {
        const res = await fetch("/api/calls/token", { credentials: "include" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setSetupError(body.error ?? "Twilio Voice is not configured");
          return;
        }
        const { token } = await res.json();
        if (destroyed) return;

        device = new Device(token, { logLevel: 1 });

        device.on("registered",   () => { setIsReady(true); setSetupError(null); });
        device.on("unregistered", () => setIsReady(false));
        device.on("error", (err: { message?: string }) => {
          setSetupError(err.message ?? "Twilio Device error");
          setIsReady(false);
        });

        device.on("incoming", (call: Call) => {
          const callSid =
            call.parameters?.CallSid ||
            (call as any).customParameters?.get?.("CallSid") ||
            "";

          setActiveCalls(prev => new Map(prev).set(callSid, call));

          const cleanup = () => {
            setActiveCalls(prev => {
              const next = new Map(prev);
              next.delete(callSid);
              return next;
            });
          };
          call.on("disconnect", cleanup);
          call.on("cancel",     cleanup);
          call.on("reject",     cleanup);
        });

        await device.register();
        if (destroyed) { device.destroy(); return; }
        deviceRef.current = device;
      } catch (err: any) {
        console.error("Twilio Device setup failed:", err);
        setSetupError(err?.message ?? "Could not connect to Twilio Voice");
      }
    }

    setup();

    return () => {
      destroyed = true;
      device?.destroy();
    };
  }, []);

  function answerCall(callSid: string) {
    const call = activeCalls.get(callSid);
    if (call) call.accept();
  }

  function declineCall(callSid: string) {
    const call = activeCalls.get(callSid);
    if (call) call.reject();
  }

  async function makeCall(to: string, name: string) {
    const device = deviceRef.current;
    if (!device || !isReady) return;

    try {
      setOutboundTo(to);
      setOutboundName(name);
      setOutboundStatus("connecting");
      setCallDuration(0);
      setIsMuted(false);

      const call = await device.connect({ params: { To: to } });
      outboundCallRef.current = call;
      setOutboundCall(call);

      call.on("ringing", () => setOutboundStatus("ringing"));
      call.on("accept",  () => {
        setOutboundStatus("open");
        liveDurationRef.current = 0;
        durationRef.current = setInterval(() => {
          liveDurationRef.current += 1;
          setCallDuration(d => d + 1);
        }, 1000);
      });
      call.on("mute", (muted: boolean) => setIsMuted(muted));

      const onEnd = () => {
        const finalDuration = liveDurationRef.current;
        const finalTo   = to;
        const finalName = name;

        setOutboundStatus("idle");
        setOutboundCall(null);
        outboundCallRef.current = null;
        if (durationRef.current) { clearInterval(durationRef.current); durationRef.current = null; }
        setCallDuration(0);
        setIsMuted(false);

        fetch("/api/calls/log", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: finalTo, name: finalName, duration: finalDuration }),
        }).catch(() => {});
      };

      call.on("disconnect", onEnd);
      call.on("cancel",     onEnd);
      call.on("error", (err: Error) => { console.error("Outbound call error:", err); onEnd(); });
    } catch (err) {
      console.error("makeCall failed:", err);
      setOutboundStatus("idle");
    }
  }

  function hangUp() { outboundCallRef.current?.disconnect(); }

  function toggleMute() {
    const call = outboundCallRef.current;
    if (!call) return;
    const next = !isMuted;
    call.mute(next);
    setIsMuted(next);
  }

  return (
    <TwilioVoiceContext.Provider value={{
      isReady, setupError, activeCalls,
      answerCall, declineCall,
      makeCall, hangUp, toggleMute,
      outboundCall, outboundTo, outboundName, outboundStatus, isMuted, callDuration,
    }}>
      {children}
    </TwilioVoiceContext.Provider>
  );
}

export function useTwilioVoiceContext() {
  const ctx = useContext(TwilioVoiceContext);
  if (!ctx) throw new Error("useTwilioVoiceContext must be used inside TwilioVoiceProvider");
  return ctx;
}
