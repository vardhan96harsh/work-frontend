import React, { useEffect, useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { api } from "../../api.js";

const TEN_MINUTES_MS = 10 * 60 * 1000; // 10 minutes

function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(783.99, now + 0.18); // G5
    gain2.gain.setValueAtTime(0.25, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.8);
  } catch {
    // Ignore audio permission or browser restriction
  }
}

export default function TimerIdleReminder({ auth, onStartTimer }) {
  const [showPopup, setShowPopup] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(10);
  const isRunningRef = useRef(false);

  // Helper to get or initialize the timestamp from which the 10-minute countdown runs
  const getLastAlertTime = useCallback(() => {
    const val = localStorage.getItem("worktracker:lastAlertTime") || localStorage.getItem("worktracker:timerStoppedSince");
    if (val && !isNaN(Number(val))) return Number(val);
    const now = Date.now();
    localStorage.setItem("worktracker:lastAlertTime", String(now));
    return now;
  }, []);

  const resetAlertTime = useCallback(() => {
    const now = Date.now();
    localStorage.setItem("worktracker:lastAlertTime", String(now));
    localStorage.setItem("worktracker:timerStoppedSince", String(now));
  }, []);

  // Check active session on server periodically or when mounted
  const checkServerSession = useCallback(async () => {
    if (!auth?.token) return;
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const today = `${y}-${m}-${d}`;
      const list = await api(`/api/work-sessions/my?from=${today}&to=${today}`, {
        token: auth.token,
      });
      const arr = Array.isArray(list) ? list : [];
      const hasActive = arr.some((s) => s.status === "active");

      isRunningRef.current = hasActive;
      localStorage.setItem("worktracker:isTimerRunning", hasActive ? "true" : "false");

      if (hasActive) {
        localStorage.removeItem("worktracker:lastAlertTime");
        localStorage.removeItem("worktracker:timerStoppedSince");
        setShowPopup(false);
      } else {
        if (!localStorage.getItem("worktracker:lastAlertTime") && !localStorage.getItem("worktracker:timerStoppedSince")) {
          resetAlertTime();
        }
      }
    } catch {
      // offline or network error; rely on local state
    }
  }, [auth?.token, resetAlertTime]);

  // Handle timer status events from WorkTimer and OverlayWidget
  useEffect(() => {
    const handleStatusChanged = (e) => {
      const isRunning = Boolean(e?.detail?.isRunning);
      isRunningRef.current = isRunning;

      if (isRunning) {
        localStorage.removeItem("worktracker:lastAlertTime");
        localStorage.removeItem("worktracker:timerStoppedSince");
        setShowPopup(false);
      } else {
        resetAlertTime();
      }
    };

    window.addEventListener("timer:statusChanged", handleStatusChanged);
    return () => window.removeEventListener("timer:statusChanged", handleStatusChanged);
  }, [resetAlertTime]);

  // Main 5-second interval loop:
  // Triggers alert every 10 minutes whether user dismissed, minimized, or left open
  useEffect(() => {
    checkServerSession();

    const interval = setInterval(() => {
      // If timer is currently running, nothing to pop up
      if (isRunningRef.current) return;

      const lastAlert = getLastAlertTime();
      const elapsed = Date.now() - lastAlert;

      if (elapsed >= TEN_MINUTES_MS) {
        const mins = Math.max(10, Math.floor(elapsed / 60000));
        setIdleMinutes(mins);

        // Reset the alert benchmark timestamp to now so the next alert will fire in 10 minutes
        resetAlertTime();

        // Show popup, play chime, and bring window to front / flash taskbar
        setShowPopup(true);
        playChime();
        window.worktracker?.alertTimerReminder?.();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [checkServerSession, getLastAlertTime, resetAlertTime]);

  // When user dismisses the popup (remind in 10 minutes)
  const handleDismiss = () => {
    setShowPopup(false);
    resetAlertTime();
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150">
        {/* Top-Right Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3.5 top-3.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          aria-label="Close"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Clean Professional Title */}
        <div className="pr-6">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            Work Tracker is Off
          </h3>
          <p className="mt-2 text-sm text-slate-600 leading-normal">
            Your timer is currently not running. Please turn on your tracker to record your work hours.
          </p>
        </div>

        {/* Simple Dismiss / OK Button */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition active:scale-[0.98]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
