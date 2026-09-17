import React, { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { offlineManager } from "../../utils/offlineManager";

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
  const [isOffline, setIsOffline] = useState(offlineManager.isOffline());

  const timerRef = useRef(null);
  const cardRef = useRef(null);
  const activeSessionRef = useRef(null);

  // Sync state with Electron main process and other windows
  useEffect(() => {
    activeSessionRef.current = activeSession;
    const isRunning = Boolean(
      activeSession && (activeSession.status === "active" || activeSession.status === "paused")
    );
    window.worktracker?.setTimerRunning?.(isRunning);

    const isTimerActive = Boolean(activeSession && activeSession.status === "active");
    window.dispatchEvent(
      new CustomEvent("timer:statusChanged", {
        detail: {
          isRunning: isTimerActive,
          status: activeSession?.status || "stopped",
        },
      })
    );
  }, [activeSession]);

  useEffect(() => {
    const unsub = offlineManager.subscribe((event, data) => {
      if (event === "networkStatus") setIsOffline(data.isOffline);
      if (event === "syncSuccess") loadSessions();
    });
    return unsub;
  }, []);

  // ---------- helpers ----------
  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(ss).padStart(2, "0")}`;
  };

  function clearTicker() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function loadSessions(retryCount = 0) {
    setError("");

    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const today = `${y}-${m}-${d}`;

      const list = await api(`/api/work-sessions/my?from=${today}&to=${today}`, { token: auth.token });
      offlineManager.setOffline(false);
      setIsOffline(false);

      const arr = Array.isArray(list) ? list : [];
      setSessions(arr);

      const running = arr.find((x) => x.status === "active");
      const paused = arr.find((x) => x.status === "paused");

      // Strictly resolve to running/paused or null (never keep stale active session when stopped)
      const cur = running || paused || null;
      setActiveSession(cur);
      activeSessionRef.current = cur;

      clearTicker();

      if (running) {
        const baseMs = Math.max(0, (running.accumulatedMinutes || 0) * 60000);
        const start = new Date(running.currentStart || running.createdAt).getTime();
        const tick = () => setElapsed(baseMs + Math.max(0, Date.now() - start));
        tick();
        timerRef.current = setInterval(tick, 1000);
      } else if (paused) {
        setElapsed(Math.max(0, (paused.totalMinutes || 0) * 60000));
      } else {
        setElapsed(0);
      }
    } catch (e) {
      console.error("Overlay: error loading sessions", e);

      // Check if offline
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        offlineManager.setOffline(true);
        setIsOffline(true);

        const offSess = offlineManager.getOfflineSession();
        if (offSess && (offSess.status === "active" || offSess.status === "paused")) {
          setActiveSession(offSess);
          activeSessionRef.current = offSess;
          clearTicker();
          if (offSess.status === "active") {
            const baseMs = Math.max(0, (offSess.accumulatedMinutes || 0) * 60000);
            const start = new Date(offSess.currentStart || offSess.createdAt).getTime();
            const tick = () => setElapsed(baseMs + Math.max(0, Date.now() - start));
            tick();
            timerRef.current = setInterval(tick, 1000);
          } else if (offSess.status === "paused") {
            setElapsed(Math.max(0, (offSess.totalMinutes || offSess.accumulatedMinutes || 0) * 60000));
          }
          return;
        } else {
          setActiveSession(null);
          activeSessionRef.current = null;
          clearTicker();
          setElapsed(0);
          return;
        }
      }

      if (e.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (retryCount < 2 && !offlineManager.isOffline()) {
        setTimeout(() => loadSessions(retryCount + 1), 2000);
      }
    }
  }

  // ---------- mount / unmount ----------
  useEffect(() => {
    loadSessions();
    return () => clearTicker();
  }, []);

  // 🔄 Periodic auto-sync every 10 seconds to ensure overlay never desyncs from backend
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!offlineManager.isOffline()) {
        loadSessions();
      }
    }, 10000);

    return () => clearInterval(syncInterval);
  }, []);

  // ---------- respond to sessions:changed from WorkTimer / main window ----------
  useEffect(() => {
    const off = window.worktracker?.onSessionsChanged?.(() => {
      loadSessions();
    });

    return () => {
      if (typeof off === "function") off();
    };
  }, []);

  useEffect(() => {
    window.worktracker?.resizeOverlay?.({
      width: 180,
      height: 28,
    });
  }, []);

  // ---------- actions (manual buttons) with offline fallbacks ----------
  async function doStart() {
    const lastProjectId = localStorage.getItem("lastProjectId");
    if (!lastProjectId) {
      setError("Choose project in main app first");
      setTimeout(() => setError(""), 4000);
      return;
    }
    try {
      await api("/api/work-sessions/start", {
        method: "POST",
        token: auth.token,
        body: { projectId: lastProjectId },
      });
      offlineManager.setOffline(false);
      setIsOffline(false);
    } catch (e) {
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        offlineManager.startOfflineSession({
          projectId: lastProjectId,
          projectName: "Project",
        });
        setIsOffline(true);
      }
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
      offlineManager.setOffline(false);
      setIsOffline(false);
    } catch (e) {
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        offlineManager.pauseOfflineSession();
        setIsOffline(true);
      }
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
      offlineManager.setOffline(false);
      setIsOffline(false);
    } catch (e) {
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        offlineManager.resumeOfflineSession();
        setIsOffline(true);
      }
    } finally {
      window.worktracker?.notifySessionsChanged?.();
      loadSessions();
    }
  }

  async function doStop() {
    clearTicker();
    setActiveSession(null);
    activeSessionRef.current = null;
    setElapsed(0);

    try {
      await api("/api/work-sessions/stop", {
        method: "POST",
        token: auth.token,
      });
      offlineManager.setOffline(false);
      setIsOffline(false);
    } catch (e) {
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        offlineManager.stopOfflineSession();
        setIsOffline(true);
      }
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
          style={{
            WebkitAppRegion: "no-drag",
            color: isOffline ? "#D97706" : "#2563EB",
          }}
          className="flex-1 text-center font-mono text-[14px] leading-none tracking-tight cursor-pointer select-none flex items-center justify-center gap-1"
          onClick={() => window.worktracker?.openMain?.()}
          title={isOffline ? "Offline Mode - Saved Locally" : "Online"}
        >
          {isOffline && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
          <span>{fmt(elapsed)}</span>
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
