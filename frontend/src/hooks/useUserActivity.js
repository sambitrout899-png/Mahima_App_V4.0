import { useEffect } from "react";
import { API_BASE } from "../api";

// Foreground use, with a five-minute idle cutoff. Time is confirmed by the server.
export function useUserActivity(token) {
  useEffect(() => {
    if (!token) return;
    let clientId = crypto.randomUUID();
    let lastInteraction = Date.now();
    let active = false;
    let pending = false;
    const controller = new AbortController();
    const tick = async () => {
      const nextActive = document.visibilityState === "visible" && Date.now() - lastInteraction < 300000;
      if (!nextActive) { active = false; return; }
      if (pending) return;
      if (!active) clientId = crypto.randomUUID();
      active = true;
      pending = true;
      try {
        await fetch(`${API_BASE}/user-activity/heartbeat`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
          signal: controller.signal,
        });
      } catch { /* A later heartbeat retries; offline gaps are not counted. */ }
      finally { pending = false; }
    };
    const interact = () => { lastInteraction = Date.now(); if (!active) tick(); };
    const visibility = () => {
      if (document.visibilityState === "visible") lastInteraction = Date.now();
      tick();
    };
    const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, interact, { passive: true }));
    document.addEventListener("visibilitychange", visibility);
    tick();
    const timer = window.setInterval(tick, 15000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      events.forEach(event => window.removeEventListener(event, interact));
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [token]);
}
