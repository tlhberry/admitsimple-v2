import { useEffect, useRef } from "react";

type EventHandler = (data: any) => void;

/**
 * Subscribes to server-sent events from /api/events.
 * Automatically reconnects on connection loss.
 * Pass a stable handlers object (use useCallback or useMemo on values).
 */
export function useLiveEvents(handlers: Record<string, EventHandler>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    const connect = () => {
      if (!active) return;

      try {
        es = new EventSource("/api/events", { withCredentials: true });

        es.addEventListener("incoming_call", (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            handlersRef.current["incoming_call"]?.(data);
          } catch {}
        });

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
