import { useEffect, useRef, useState } from "react";
import { Device, Call } from "@twilio/voice-sdk";

export function useTwilioVoice() {
  const deviceRef = useRef<Device | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeCalls, setActiveCalls] = useState<Map<string, Call>>(new Map());

  useEffect(() => {
    let device: Device;

    async function setup() {
      try {
        const res = await fetch("/api/calls/token", { credentials: "include" });
        if (!res.ok) return;
        const { token } = await res.json();

        device = new Device(token, { logLevel: 1 });

        device.on("registered", () => setIsReady(true));
        device.on("unregistered", () => setIsReady(false));

        device.on("incoming", (call: Call) => {
          const callSid =
            call.parameters?.CallSid ||
            (call as any).customParameters?.get?.("CallSid") ||
            "";

          setActiveCalls(prev => new Map(prev).set(callSid, call));

          call.on("disconnect", () => {
            setActiveCalls(prev => {
              const next = new Map(prev);
              next.delete(callSid);
              return next;
            });
          });

          call.on("cancel", () => {
            setActiveCalls(prev => {
              const next = new Map(prev);
              next.delete(callSid);
              return next;
            });
          });
        });

        await device.register();
        deviceRef.current = device;
      } catch (err) {
        console.error("Twilio Device setup failed:", err);
      }
    }

    setup();

    return () => {
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

  return {
    isReady,
    activeCalls,
    answerCall,
    declineCall,
    device: deviceRef.current,
  };
}
