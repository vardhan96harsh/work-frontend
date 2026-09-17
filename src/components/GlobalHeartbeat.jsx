import { useEffect } from "react";
import { api } from "../api";

export default function GlobalHeartbeat({ auth }) {
  useEffect(() => {
    if (!auth?.token) return;

    const sendHeartbeat = async () => {
      try {
        const res = await api("/api/work-sessions/heartbeat", {
          method: "POST",
          token: auth.token,
        });

        // If server says 0 active sessions were updated, notify windows to verify/sync state
        if (res && res.ok && res.updated === 0) {
          window.worktracker?.notifySessionsChanged?.();
        }
      } catch (err) {
        if (err?.status === 401 || err?.response?.status === 401) {
          console.warn("Heartbeat skipped: token expired or unauthorized");
          return;
        }

        console.error("Heartbeat failed:", err.message);
      }
    };

    // Send immediately after component starts
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(interval);
  }, [auth?.token]);

  return null;
}