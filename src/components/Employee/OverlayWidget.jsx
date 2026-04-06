import React, { useEffect, useRef, useState } from "react";
import { api } from "../../api";

export default function OverlayWidget() {
  // 🔹 get auth (employee only)
  const [auth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("auth") || "null");
    } catch {
      return null;
    }
  });
  if (!auth || auth?.user?.role !== "employee") return null;

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  const timerRef = useRef(null);
  const cardRef = useRef(null);

  // keep a ref to current activeSession (for debugging / future use)
  const activeSessionRef = useRef(null);
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // ---------- helpers ----------
  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const cc = Math.floor((ms % 1000) / 10);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(ss).padStart(2, "0")}.${String(cc).padStart(2, "0")}`;
  };

  function clearTicker() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ---------- load + start/stop ticker based on backend state ----------
  async function loadSessions() {
    setError("");
    try {
      const today = new Date().toISOString().slice(0, 10);

      const list = await api(
        `/api/work-sessions/my?from=${today}&to=${today}`,
        { token: auth.token }
      );
      const arr = Array.isArray(list) ? list : [];
      setSessions(arr);

      const running = arr.find((x) => x.status === "active");
      const paused = arr.find((x) => x.status === "paused");
      const cur = running || paused || null;
      setActiveSession(cur);

      // 🔹 reset local timer based on new state
      clearTicker();

      if (running) {
        const baseMs = Math.max(0, (running.accumulatedMinutes || 0) * 60000);
        const start = new Date(
          running.currentStart || running.createdAt
        ).getTime();

        const tick = () => {
          setElapsed(baseMs + Math.max(0, Date.now() - start));
        };

        // run once immediately
        tick();
        // start interval
        timerRef.current = setInterval(tick, 100);
      } else {
        // no active session → just show persisted minutes
        setElapsed(Math.max(0, (paused?.totalMinutes || 0) * 60000));
      }
    } catch (e) {
      console.error("Overlay: error loading sessions", e);
      setError("Overlay: could not load sessions");
      clearTicker();
    }
  }

  // ---------- mount / unmount ----------
  useEffect(() => {
    loadSessions();
    return () => clearTicker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- respond to sessions:changed from WorkTimer / main window ----------
  useEffect(() => {
    const off = window.worktracker?.onSessionsChanged?.(() => {
      // whenever any renderer says "sessions changed", reload + restart ticker
      loadSessions();
    });

    return () => {
      if (typeof off === "function") off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- auto-fit HEIGHT only ----------
// ---------- MANUAL FIXED OVERLAY SIZE ----------
useEffect(() => {
  window.worktracker?.resizeOverlay?.({
    width: 180,
    height: 28, // 👈 FIXED HEIGHT (you can change 32 to 34 or 36)
  });
}, []);


  // 🔥 AUTO-PAUSE WHEN SYSTEM IS IDLE (overlay side)
// useEffect(() => {
//   const handler = () => {
//     console.log("Overlay: system:idle → auto pause");

//     const cur = activeSessionRef.current;
//     if (!cur || cur.status !== "active") return;

//     // share the same idle flag as WorkTimer
//     localStorage.setItem("wt_idle_paused", "1");

//     clearTicker();
//     setElapsed((prev) => prev);

//     // pause backend (idempotent) + sessions:changed + reload
//     doPause();
//   };

//   const off = window.worktracker?.onSystemIdle?.(handler);
//   return () => {
//     if (typeof off === "function") off();
//   };
// }, []);

// 🔥 AUTO-RESUME WHEN USER BECOMES ACTIVE (overlay side)
// useEffect(() => {
//   const handler = () => {
//     const flag = localStorage.getItem("wt_idle_paused");
//     if (flag !== "1") return;

//     console.log("Overlay: system:active → idle auto-resume");

//     // clear flag so it only runs once
//     localStorage.removeItem("wt_idle_paused");

//     // resume backend session + sessions:changed
//     // loadSessions() in finally will restart local ticker
//     doResume();
//   };

//   const off = window.worktracker?.onSystemActive?.(handler);
//   return () => {
//     if (typeof off === "function") off();
//   };
// }, []);


  // ---------- actions (manual buttons) ----------
  async function doStart() {
    const lastProjectId = localStorage.getItem("lastProjectId");
    if (!lastProjectId) {
      alert("Open main app once and choose a project before starting.");
      return;
    }
    try {
      await api("/api/work-sessions/start", {
        method: "POST",
        token: auth.token,
        body: { projectId: lastProjectId },
      });
    } finally {
      window.worktracker?.notifySessionsChanged?.();
      loadSessions();
    }
  }

  async function doPause() {
    try {
      await api("/api/work-sessions/pause", {
        method: "POST",
        token: auth.token,
      });
    } finally {
      window.worktracker?.notifySessionsChanged?.();
      loadSessions();
    }
  }

  async function doResume() {
    try {
      await api("/api/work-sessions/resume", {
        method: "POST",
        token: auth.token,
      });
    } finally {
      window.worktracker?.notifySessionsChanged?.();
      loadSessions();
    }
  }

  async function doStop() {
    try {
      await api("/api/work-sessions/stop", {
        method: "POST",
        token: auth.token,
      });
    } finally {
      window.worktracker?.notifySessionsChanged?.();
      loadSessions();
    }
  }

  // ---------- state flags / primary button ----------
  const hasRunning = activeSession?.status === "active";
  const hasPaused = activeSession?.status === "paused";
  const anyCurrent = Boolean(activeSession);
  const lastProjectId = localStorage.getItem("lastProjectId");

  const primaryIcon = hasRunning ? "❚❚" : hasPaused ? "►" : "▶";
  const primaryDisabled = !hasRunning && !hasPaused && !lastProjectId;
  const primaryAction = hasRunning ? doPause : hasPaused ? doResume : doStart;

return (
 <div
  ref={cardRef}
  className="rounded-lg flex items-center overflow-hidden"
  style={{
    WebkitAppRegion: "drag",
    height: "28px",
    paddingLeft: "6px",
    paddingRight: "6px",
    backgroundColor: "#F8FAFC",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
  }}
>

    <div className="flex items-center gap-1 w-full">
      {/* TIMER */}
      <div
        style={{ WebkitAppRegion: "no-drag", color: "#2563EB" }}
        className="flex-1 text-center font-mono text-[14px] leading-none tracking-tight cursor-pointer select-none"
        onClick={() => window.worktracker?.openMain?.()}
      >
        {fmt(elapsed)}
      </div>

      {/* START / PAUSE / RESUME */}
      <button
        style={{ WebkitAppRegion: "no-drag" }}
        className={`w-[18px] h-[18px] flex items-center justify-center rounded text-[9px] leading-none text-white disabled:opacity-40 ${
          hasRunning
            ? "bg-yellow-400 hover:bg-yellow-500"
            : hasPaused
            ? "bg-blue-500 hover:bg-blue-600"
            : "bg-emerald-500 hover:bg-emerald-600"
        }`}
        disabled={primaryDisabled}
        onClick={primaryAction}
      >
        {primaryIcon}
      </button>

      {/* STOP */}
      <button
        style={{ WebkitAppRegion: "no-drag" }}
        className="w-[18px] h-[18px] flex items-center justify-center rounded bg-red-500 hover:bg-red-600 text-[9px] leading-none text-white disabled:opacity-40"
        disabled={!anyCurrent}
        onClick={doStop}
      >
        ■
      </button>
    </div>
  </div>
);


}
