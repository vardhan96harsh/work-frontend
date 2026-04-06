import { useEffect } from "react";
import { api } from "../api";

export default function GlobalHeartbeat({ auth }) {
  useEffect(() => {
    if (!auth?.token) return;

    const interval = setInterval(() => {
      api("/api/work-sessions/heartbeat", {
        method: "POST",
        token: auth.token,
      }).catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [auth]);

  return null;
}
