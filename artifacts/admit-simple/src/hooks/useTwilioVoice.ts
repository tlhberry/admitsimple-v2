import { useEffect, useRef, useState } from "react";
import { Device, Call } from "@twilio/voice-sdk";

export function useTwilioVoice() {
  const deviceRef          = useRef<Device | null>(null);
  const outboundCallRef    = useRef<Call | null>(null);
  const durationRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveDurationRef    = useRef(0); // always-current mirror of callDuration

  const [isReady,        setIsReady]        = useState(false);
  const [activeCalls,    setActiveCalls]    = useState<Map<string, Call>>(new Map());

  // Outbound call state
  const [outboundCall,   setOutboundCall]   = useState<Call | null>(null);
  const [outboundTo,     setOutboundTo]     = useState("");
  const [outboundName,   setOutboundName]   = useState("");
  const [outboundStatus, setOutboundStatus] = useState<"idle" | "connecting" | "ringing" | "open">("idle");
  const [isMuted,        setIsMuted]        = useState(false);
  const [callDuration,   setCallDuration]   = useState(0);

  useEffect(() => {
    let device: Device;

    async function setup() {
      try {
        const res = await fetch("/api/calls/token", { credentials: "include" });
        if (!res.ok) return;
        const { token } = await res.json();

        device = new Device(token, { logLevel: 1 });

        device.on("registered",   () => setIsReady(true));
        device.on("unregistered", () => setIsReady(false));

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
        });

        await device.register();
        deviceRef.current = device;
      } catch (err) {
        console.error("Twilio Device setup failed:", err);
      }
    }

    setup();
    return () => { device?.destroy(); };
  }, []);

  // ── Inbound helpers ────────────────────────────────────────────────────────
  function answerCall(callSid: string) {
    const call = activeCalls.get(callSid);
    if (call) call.accept();
  }

  function declineCall(callSid: string) {
    const call = activeCalls.get(callSid);
    if (call) call.reject();
  }

  // ── Outbound call ──────────────────────────────────────────────────────────
  async function makeCall(to: string, name: string) {
    const device = deviceRef.current;
    if (!device) return;

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

      call.on("accept", () => {
        setOutboundStatus("open");
        liveDurationRef.current = 0;
        durationRef.current = setInterval(() => {
          liveDurationRef.current += 1;
          setCallDuration(d => d + 1);
        }, 1000);
      });

      call.on("mute", (muted: boolean) => setIsMuted(muted));

      const onEnd = () => {
        // Capture duration before resetting (use ref — never stale)
        const finalDuration = liveDurationRef.current;
        const finalTo   = to;
        const finalName = name;

        setOutboundStatus("idle");
        setOutboundCall(null);
        outboundCallRef.current = null;
        if (durationRef.current) {
          clearInterval(durationRef.current);
          durationRef.current = null;
        }
        setCallDuration(0);
        setIsMuted(false);

        // Log call activity (best-effort)
        fetch("/api/calls/log", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: finalTo, name: finalName, duration: finalDuration }),
        }).catch(() => {});
      };

      call.on("disconnect", onEnd);
      call.on("cancel",     onEnd);
      call.on("error", (err: Error) => {
        console.error("Outbound call error:", err);
        onEnd();
      });
    } catch (err) {
      console.error("makeCall failed:", err);
      setOutboundStatus("idle");
    }
  }

  function hangUp() {
    outboundCallRef.current?.disconnect();
  }

  function toggleMute() {
    const call = outboundCallRef.current;
    if (!call) return;
    const next = !isMuted;
    call.mute(next);
    setIsMuted(next);
  }

  return {
    isReady,
    activeCalls,
    answerCall,
    declineCall,
    device: deviceRef.current,
    makeCall,
    hangUp,
    toggleMute,
    outboundCall,
    outboundTo,
    outboundName,
    outboundStatus,
    isMuted,
    callDuration,
  };
}
