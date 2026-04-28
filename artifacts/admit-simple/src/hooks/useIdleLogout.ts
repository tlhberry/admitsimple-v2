import { useEffect, useRef, useState, useCallback } from "react";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARN_BEFORE_MS = 2.5 * 60 * 1000;

export function useIdleLogout(onLogout: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const resetTimers = useCallback(() => {
    clearTimeout(logoutTimer.current);
    clearTimeout(warnTimer.current);
    setShowWarning(false);
    warnTimer.current = setTimeout(() => setShowWarning(true), IDLE_TIMEOUT_MS - WARN_BEFORE_MS);
    logoutTimer.current = setTimeout(() => onLogoutRef.current(), IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => document.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();
    return () => {
      events.forEach((e) => document.removeEventListener(e, resetTimers));
      clearTimeout(logoutTimer.current);
      clearTimeout(warnTimer.current);
    };
  }, [resetTimers]);

  return { showWarning, stayLoggedIn: resetTimers };
}
