import { useEffect, useRef } from "react";

type EventHandler = (data: any) => void;

/**
 * Subscribes to server-sent events from /api/events.
 * Supported events: incoming_call, call_claimed, call_status, ping
 * Automatically reconnects on connection loss.
 */
export function useLiveEvents(handlers: Record<string, EventHandler>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    const EVENTS = ["incoming_call", "call_claimed", "call_status", "call_status_update"];

    const connect = () => {
      if (!active) return;

      try {
        es = new EventSource("/api/events", { withCredentials: true });

        for (const eventName of EVENTS) {
          es.addEventListener(eventName, (e: MessageEvent) => {
            try {
              const data = JSON.parse(e.data);
              handlersRef.current[eventName]?.(data);
            } catch {}
          });
        }

        es.onerror = () => {
          es?.close();
          if (active) {
            reconnectTimer = setTimeout(connect, 5000);
          }
        };
      } catch {
        if (active) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      active = false;
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);
}
