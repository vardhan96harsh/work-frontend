import React, { useEffect, useRef, useState, useMemo } from "react";
import { api } from "../../api.js";
import DateRangePicker from "../../components/DateRangePicker";
import { offlineManager } from "../../utils/offlineManager.js";
import { Wifi, WifiOff, RefreshCw, ListTodo, FolderKanban, RotateCw } from "lucide-react";

export default function WorkTimer({ auth, initialSelectedTask }) {
  // ---------------- STATES ----------------
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);

  // NEW: Toggle Mode
  const [mode, setMode] = useState("project"); // project | custom

  // Work Type (Project Mode Only)
  const [workTypes, setWorkTypes] = useState([]);
  const [workType, setWorkType] = useState("");

  // ── Assigned Tasks (from Admin task management) ──
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [allMyTasks, setAllMyTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");

  // Filters
  const [companyId, setCompanyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [projectId, setProjectId] = useState("");

  // Custom Task (shown only in custom mode)
  const [customTask, setCustomTask] = useState("");

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  // today | week | month
  // 🔹 View toggle (NEW)
  const [view, setView] = useState("work"); // work | project

  const [expandedProject, setExpandedProject] = useState(null);

  const [projectTotals, setProjectTotals] = useState([]);
  const [projectLoading, setProjectLoading] = useState(false);

  // Stopwatch
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  const activeSessionRef = useRef(null);
  const autoPausedRef = useRef(false);

  const resumeInProgressRef = useRef(false);

  // 🌐 Offline State
  const [isOffline, setIsOffline] = useState(offlineManager.isOffline());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = offlineManager.subscribe((event, data) => {
      if (event === "networkStatus") setIsOffline(data.isOffline);
      if (event === "syncing") setIsSyncing(data);
      if (event === "syncSuccess") {
        setIsOffline(false);
        loadSessionsAndTick();
      }
    });
    return unsub;
  }, []);

  // 🧹 Clean up ticker interval on unmount to prevent memory leaks
  useEffect(() => {
    return () => clearTicker();
  }, []);

  const loadingSessionsRef = useRef(false);

  // ✅ DATE RANGE STATE (ADD THIS)
  const [range, setRange] = useState({
    from: null,
    to: null,
  });

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Machine Info
  const [machine, setMachine] = useState(null);
  useEffect(() => {
    window.worktracker
      ?.getConfig?.()
      .then((cfg) => setMachine(cfg))
      .catch(() => {});
  }, []);

  // ---- helpers ----
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return (
      String(hours).padStart(2, "0") +
      ":" +
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0")
    );
  }

  function minutesToHHMM(mins) {
    const totalSeconds = Math.max(0, Math.round((mins || 0) * 60));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function clearTicker() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function getLocalDateStr(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // ---- loaders ----
async function loadMaster() {
  setError("");

  try {
    const [c, g] = await Promise.all([
      api("/api/companies", { token: auth.token }),
      api("/api/categories", { token: auth.token }),
    ]);

    // Company names in alphabetical order A-Z
    setCompanies(
      [...(c || [])].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        }),
      ),
    );

    setCategories(g || []);
  } catch (e) {
    setError("Could not load master data. Please retry.");
  }
}

  async function loadProjects() {
    setError("");
    if (!companyId || !categoryId) {
      setProjects([]);
      return;
    }
    try {
      const list = await api(
        `/api/projects?company=${companyId}&category=${categoryId}`,
        { token: auth.token },
      );
      setProjects(
        (list || []).sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        )
      );
    } catch (e) {
      setError("Could not load projects.");
    }
  }

  function startLocalTicker(session) {
    clearTicker();
    if (session?.status === "active") {
      const baseMs = Math.max(0, (session.accumulatedMinutes || 0) * 60000);
      const start = new Date(
        session.currentStart || session.createdAt || Date.now()
      ).getTime();

      const update = () => {
        setElapsed(baseMs + Math.max(0, Date.now() - start));
      };

      update();
      timerRef.current = setInterval(update, 1000);
    } else if (session?.status === "paused") {
      setElapsed(Math.max(0, (session.totalMinutes || session.accumulatedMinutes || 0) * 60000));
    } else {
      setElapsed(0);
    }
  }

  async function loadSessionsAndTick() {
    if (loadingSessionsRef.current) return;
    loadingSessionsRef.current = true;
    setLoading(true);

    const prevSessions = sessions;
    const prevActiveSession = activeSession;
    const prevElapsed = elapsed;

    try {
      // 🌐 First, if online and there are queued offline sessions, reconcile with server
      if (!offlineManager.isOffline() && auth?.token) {
        await offlineManager.syncWithServer(auth.token);
      }

      let fromDate = range.from;
      let toDate = range.to;

      const now = new Date();
      if (!fromDate || !toDate) {
        if (dateFilter === "week") {
          const start = new Date(now);
          const day = start.getDay();
          const diff = start.getDate() - day + (day === 0 ? -6 : 1);
          start.setDate(diff);
          fromDate = getLocalDateStr(start);
          toDate = getLocalDateStr(now);
        } else if (dateFilter === "month") {
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          fromDate = getLocalDateStr(start);
          toDate = getLocalDateStr(now);
        } else {
          // "today"
          const todayStr = getLocalDateStr(now);
          fromDate = todayStr;
          toDate = todayStr;
        }
      }

      const sess = await api(
        `/api/work-sessions/my?from=${fromDate}&to=${toDate}`,
        { token: auth.token },
      );

      offlineManager.setOffline(false);
      setIsOffline(false);

      const arr = Array.isArray(sess) ? sess : [];
      setSessions(arr);

      const running = arr.find((x) => x.status === "active");
      const paused = arr.find((x) => x.status === "paused");
      const current = running || paused || null;

      const todayStr = getLocalDateStr(new Date());
      const isTodayIncluded = !range.from || (range.from <= todayStr && (!range.to || range.to >= todayStr));
      if (isTodayIncluded || current) {
        setActiveSession(current);
        activeSessionRef.current = current;
        startLocalTicker(current);
      }
      setError("");
    } catch (e) {
      console.error("LOAD SESSION ERROR 👉", e);

      // 🌐 Check if this is an offline error
      const offlineDetected = e?.isOffline || !navigator.onLine || e?.status === 0;
      if (offlineDetected) {
        offlineManager.setOffline(true);
        setIsOffline(true);

        const offSess = offlineManager.getOfflineSession();
        if (offSess) {
          setActiveSession(offSess);
          activeSessionRef.current = offSess;
          setSessions((prev) => {
            const exists = prev.some((s) => s._id === offSess._id);
            return exists ? prev.map((s) => (s._id === offSess._id ? offSess : s)) : [offSess, ...prev];
          });
          startLocalTicker(offSess);
        } else {
          setSessions(prevSessions);
          setActiveSession(prevActiveSession);
          activeSessionRef.current = prevActiveSession;
          setElapsed(prevElapsed);
        }
        setError(""); // Smooth fallback, no red error alert
      } else {
        setSessions(prevSessions);
        setActiveSession(prevActiveSession);
        activeSessionRef.current = prevActiveSession;
        setElapsed(prevElapsed);

        const status = e?.status || e?.response?.status;
        if (status === 401) {
          setError(
            "Session sync failed because login token expired. Please login again.",
          );
        } else {
          setError("Could not sync sessions. Showing last known session data.");
        }
      }
    } finally {
      setLoading(false);
      loadingSessionsRef.current = false;
    }
  }

  async function loadWorkTypes() {
    try {
      const list = await api("/api/work-sessions/work-types", {
        token: auth.token,
      });
      const arr =
        Array.isArray(list) && list.length
          ? list
          : [
              "Alpha",
              "Beta",
              "CR",
              "Rework",
              "poc",
              "Analysis",
              "Storyboard QA",
              "Output QA",
            ];
      setWorkTypes(arr);
      if (!workType && arr.length) setWorkType(arr[0]);
    } catch (e) {
      const fallback = [
        "Alpha",
        "Beta",
        "CR",
        "Rework",
        "poc",
        "Analysis",
        "Storyboard QA",
        "Output QA",
      ];
      setWorkTypes(fallback);
      if (!workType) setWorkType(fallback[0]);
    }
  }

  // ── Load tasks for the chosen project (assigned to user or in project plan)
  async function loadAssignedTasks(pid) {
    if (!pid) {
      setAssignedTasks([]);
      return;
    }
    try {
      const [projectTasks, myTasks] = await Promise.all([
        api(`/api/tasks?projectId=${pid}`, { token: auth.token }).catch(() => []),
        api(`/api/tasks/my?projectId=${pid}`, { token: auth.token }).catch(() => []),
      ]);

      const myTaskIds = new Set((Array.isArray(myTasks) ? myTasks : []).map((t) => t._id));
      const pList = Array.isArray(projectTasks) ? projectTasks : [];
      const mList = Array.isArray(myTasks) ? myTasks : [];

      // Combine without duplicates
      const seen = new Set();
      const combined = [];

      for (const t of [...mList, ...pList]) {
        if (!seen.has(t._id)) {
          seen.add(t._id);
          combined.push({
            ...t,
            isMyTask: myTaskIds.has(t._id),
          });
        }
      }

      // Sort: user's assigned tasks first, then alphabetically
      combined.sort((a, b) => {
        if (a.isMyTask && !b.isMyTask) return -1;
        if (!a.isMyTask && b.isMyTask) return 1;
        return (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
      });

      setAssignedTasks(combined);
    } catch {
      setAssignedTasks([]);
    }
  }

  // ── Load all assigned tasks for the employee ──
  async function loadAllMyTasks() {
    try {
      const data = await api("/api/tasks/my", { token: auth.token });
      setAllMyTasks(Array.isArray(data) ? data : []);
    } catch {
      setAllMyTasks([]);
    }
  }

  function parseTaskDetails(task) {
    let phase = "";
    let deliverable = "";
    if (task?.description) {
      const pMatch = task.description.match(/Phase:\s*([^|]+)/i);
      if (pMatch) phase = pMatch[1].trim();
      const dMatch = task.description.match(/Deliverable:\s*(.+)/i);
      if (dMatch) deliverable = dMatch[1].trim();
    }
    return {
      phase: phase && phase !== "General" ? phase : null,
      deliverable: deliverable && deliverable !== "N/A" ? deliverable : null,
    };
  }

  function selectAssignedTask(task) {
    if (!task) return;
    setMode("project");
    const p = task.project;
    const pid = typeof p === "object" ? p?._id : p;
    if (pid) {
      if (typeof p === "object") {
        const compId = p.company?._id || p.company;
        const catId = p.category?._id || p.category;
        if (compId) setCompanyId(compId);
        if (catId) setCategoryId(catId);
        if (p.name) {
          setProjects((prev) => (prev.some((x) => x._id === pid) ? prev : [...prev, p]));
        }
      }
      setProjectId(pid);
    }
    setSelectedTaskId(task._id);
    if (pid) {
      localStorage.setItem("lastProjectId", pid);
    }
    if (task.taskType) {
      setWorkType(task.taskType);
    }
  }

  async function safeAutoResume(flagKey) {
    if (resumeInProgressRef.current) return;

    const flag = localStorage.getItem(flagKey);
    if (flag !== "1") return;

    const cur = activeSessionRef.current;
    if (!cur || cur.status !== "paused") return;

    resumeInProgressRef.current = true;
    try {
      await resume();
      localStorage.removeItem(flagKey);
    } finally {
      resumeInProgressRef.current = false;
    }
  }

  // Initial load
  useEffect(() => {
    (async () => {
      await loadMaster();
      await loadWorkTypes();
      await loadAllMyTasks();
      await loadSessionsAndTick();
    })();
    return () => clearTicker();
  }, []);


  useEffect(() => {
    loadProjects();

    if (!companyId || !categoryId) return;

    const interval = setInterval(() => {
      loadProjects(); // 🔥 refresh project list gently
    }, 60000); // every 60 seconds (prevents constant network and CPU churn)

    return () => clearInterval(interval);
  }, [companyId, categoryId]);

  // ── Load assigned tasks whenever project changes ──
  useEffect(() => {
    if (projectId) {
      loadAssignedTasks(projectId);
    } else {
      setAssignedTasks([]);
      setSelectedTaskId("");
    }
  }, [projectId]);

  // ── Pre-select task if launched from "My Tasks" portal ──
  useEffect(() => {
    if (initialSelectedTask) {
      selectAssignedTask(initialSelectedTask);
    }
  }, [initialSelectedTask]);

  // Refresh from other windows
  useEffect(() => {
    const off = window.worktracker?.onSessionsChanged?.(() => {
      loadSessionsAndTick();
    });
    return () => {
      if (typeof off === "function") off();
    };
  }, []);

  // 🔄 Periodic auto-sync (every 15s) to guarantee WorkTimer and Overlay never desync
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!offlineManager.isOffline() && !loadingSessionsRef.current) {
        loadSessionsAndTick();
      }
    }, 15000);

    return () => clearInterval(syncInterval);
  }, [dateFilter, range.from, range.to]);

  // System sleep/idle handlers (unchanged)
  useEffect(() => {
    const handler = () => {
      const cur = activeSessionRef.current;
      if (!cur || cur.status !== "active") return;

      autoPausedRef.current = true;
      localStorage.setItem("wt_auto_paused", "1");

      clearTicker();
      setElapsed((prev) => prev);

      pause();
    };

    const off = window.worktracker?.onSystemSleep?.(handler);
    return () => typeof off === "function" && off();
  }, []);

  useEffect(() => {
    const handler = () => {
      const flag = localStorage.getItem("wt_auto_paused");
      if (flag !== "1") return;

      const cur = activeSessionRef.current;
      if (!cur || cur.status !== "paused") return;

      autoPausedRef.current = false;
      safeAutoResume("wt_auto_paused");
    };

    const off = window.worktracker?.onSystemWake?.(handler);
    return () => typeof off === "function" && off();
  }, []);

  useEffect(() => {
    const handler = () => {
      const cur = activeSessionRef.current;
      if (!cur || cur.status !== "active") return;

      localStorage.setItem("wt_idle_paused", "1");

      clearTicker();
      setElapsed((prev) => prev);

      pause();
    };

    const off = window.worktracker?.onSystemIdle?.(handler);
    return () => typeof off === "function" && off();
  }, []);

  useEffect(() => {
    const handler = () => {
      const flag = localStorage.getItem("wt_idle_paused");
      if (flag !== "1") return;

      const cur = activeSessionRef.current;
      if (!cur || cur.status !== "paused") return;

      safeAutoResume("wt_idle_paused");
    };

    const off = window.worktracker?.onSystemActive?.(handler);
    return () => typeof off === "function" && off();
  }, []);

  useEffect(() => {
    let lastCheck = 0;
    const activityHandler = () => {
      // Throttle: check at most once every 1.5 seconds to prevent freezing on mousemove
      const now = Date.now();
      if (now - lastCheck < 1500) return;
      lastCheck = now;

      const autoPaused = localStorage.getItem("wt_auto_paused");
      const idlePaused = localStorage.getItem("wt_idle_paused");

      if (autoPaused === "1") {
        autoPausedRef.current = false;
        safeAutoResume("wt_auto_paused");
      } else if (idlePaused === "1") {
        safeAutoResume("wt_idle_paused");
      }
    };

    window.addEventListener("mousemove", activityHandler, { passive: true });
    window.addEventListener("keydown", activityHandler, { passive: true });

    return () => {
      window.removeEventListener("mousemove", activityHandler);
      window.removeEventListener("keydown", activityHandler);
    };
  }, []);

  useEffect(() => {
    const off = window.worktracker?.onAppClosing?.(() => {
      // ❌ DO NOT auto-stop session here
      // Only confirm close
      window.worktracker?.confirmAppClose?.();
    });

    return () => typeof off === "function" && off();
  }, []);

  // ⏱️ Synchronize timer running state with Electron and idle alert
  useEffect(() => {
    const isRunning = Boolean(
      activeSession && (activeSession.status === "active" || activeSession.status === "paused")
    );
    window.worktracker?.setTimerRunning?.(isRunning);

    // Actively running (ticking) vs stopped/paused
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

  // 🎯 Highlight and focus start button when reminder "Start Timer Now" is clicked
  useEffect(() => {
    const handleFocusStart = () => {
      const btn = document.getElementById("work-timer-start-btn");
      if (btn) {
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
        btn.focus();
        btn.classList.add("ring-4", "ring-emerald-400", "scale-105");
        setTimeout(() => {
          btn.classList.remove("ring-4", "ring-emerald-400", "scale-105");
        }, 1800);
      }
    };
    window.addEventListener("timer:focusStart", handleFocusStart);
    return () => window.removeEventListener("timer:focusStart", handleFocusStart);
  }, []);

  // 🔥 LOAD SESSIONS WHEN DATE RANGE CHANGES
  useEffect(() => {
    if (range.from && range.to) {
      loadSessionsAndTick();
    }
  }, [range.from, range.to]);

  // 🔥 RELOAD DATA WHEN TODAY / WEEK / MONTH CHANGES
  useEffect(() => {
    // If custom range is active, don't auto reload
    if (range.from && range.to) return;

    loadSessionsAndTick();
  }, [dateFilter]);

  const hasRunning = activeSession?.status === "active";
  const hasPaused = activeSession?.status === "paused";
  const anyCurrent = Boolean(activeSession);

  const activeProjId = activeSession?.projectId || (typeof activeSession?.project === "object" ? activeSession?.project?._id : activeSession?.project);
  const activeTaskId = activeSession?.taskId || (typeof activeSession?.task === "object" ? activeSession?.task?._id : activeSession?.task);
  const activeCustom = activeSession?.customTask || "";

  const isSameContext = anyCurrent && (
    mode === "project"
      ? (activeProjId === projectId && (!selectedTaskId || activeTaskId === selectedTaskId))
      : (mode === "custom" && activeCustom === customTask.trim())
  );

  const selectedProj = projects.find((p) => p._id === projectId);

  // ---- actions ----
  async function start() {
    setError("");

    // NEW VALIDATION
    if (mode === "project" && !projectId) {
      return setError("Please select a project.");
    }

    if (mode === "custom" && !customTask.trim()) {
      return setError("Please enter a custom task.");
    }

    if (mode === "project" && projectId) {
      localStorage.setItem("lastProjectId", projectId);
    }

    const selectedProj = projects.find((p) => p._id === projectId);
    const selectedTaskObj =
      assignedTasks.find((t) => t._id === selectedTaskId) ||
      allMyTasks.find((t) => t._id === selectedTaskId);

    try {
      const body = {
        taskType: mode === "project" ? workType : undefined,
        projectId: mode === "project" ? projectId : null,
        taskId: mode === "project" && selectedTaskId ? selectedTaskId : null,
        taskTitle: mode === "project" && selectedTaskObj ? selectedTaskObj.title : null,
        customTask: mode === "custom" ? customTask.trim() : null,
        remarks: "",
      };

      await api("/api/work-sessions/start", {
        method: "POST",
        token: auth.token,
        body,
      });

      offlineManager.setOffline(false);
      setIsOffline(false);
      window.worktracker?.notifySessionsChanged?.();
      await loadSessionsAndTick();
    } catch (e) {
      // 🌐 OFFLINE FALLBACK: Start session in local cache seamlessly
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        console.log("🌐 Network offline -> starting session in local cache");
        const offSess = offlineManager.startOfflineSession({
          projectId: mode === "project" ? projectId : null,
          projectName: mode === "project" ? selectedProj?.name : "(Custom Task)",
          taskId: mode === "project" && selectedTaskId ? selectedTaskId : null,
          taskTitle: selectedTaskObj?.title || null,
          companyName: selectedProj?.company?.name || "—",
          categoryName: selectedProj?.category?.name || "—",
          customTask: mode === "custom" ? customTask.trim() : null,
          taskType: mode === "project" ? workType : "Alpha",
          remarks: "",
        });

        setActiveSession(offSess);
        activeSessionRef.current = offSess;
        setSessions((prev) => [offSess, ...prev.filter((s) => s._id !== offSess._id)]);
        startLocalTicker(offSess);
        setIsOffline(true);
        window.worktracker?.notifySessionsChanged?.();
      } else {
        setError(e.message || "Failed to start session.");
      }
    }
  }

  async function pause() {
    setError("");
    try {
      await api("/api/work-sessions/pause", {
        method: "POST",
        token: auth.token,
      });

      offlineManager.setOffline(false);
      setIsOffline(false);
      window.worktracker?.notifySessionsChanged?.();
      await loadSessionsAndTick();
    } catch (e) {
      // 🌐 OFFLINE FALLBACK: Pause session in local cache
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        console.log("🌐 Network offline -> pausing session in local cache");
        const pausedSess = offlineManager.pauseOfflineSession();
        if (pausedSess) {
          clearTicker();
          setActiveSession(pausedSess);
          activeSessionRef.current = pausedSess;
          setSessions((prev) => [pausedSess, ...prev.filter((s) => s._id !== pausedSess._id)]);
          setIsOffline(true);
          window.worktracker?.notifySessionsChanged?.();
        }
      } else {
        console.error("Pause failed:", e);
        setError(e?.message || "Failed to pause session.");
      }
    }
  }

  async function resume() {
    setError("");
    const targetSessionId = activeSession?._id || activeSessionRef.current?._id;
    try {
      await api("/api/work-sessions/resume", {
        method: "POST",
        token: auth.token,
        body: {
          sessionId: targetSessionId && !String(targetSessionId).startsWith("temp-") && !String(targetSessionId).startsWith("offline-")
            ? targetSessionId
            : undefined,
        },
      });

      offlineManager.setOffline(false);
      setIsOffline(false);
      window.worktracker?.notifySessionsChanged?.();
      await loadSessionsAndTick();
    } catch (e) {
      // 🌐 OFFLINE FALLBACK: Resume session in local cache
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        console.log("🌐 Network offline -> resuming session in local cache");
        const resumedSess = offlineManager.resumeOfflineSession();
        if (resumedSess) {
          setActiveSession(resumedSess);
          activeSessionRef.current = resumedSess;
          setSessions((prev) => [resumedSess, ...prev.filter((s) => s._id !== resumedSess._id)]);
          startLocalTicker(resumedSess);
          setIsOffline(true);
          window.worktracker?.notifySessionsChanged?.();
        }
      } else {
        console.error("Resume failed:", e);
        setError(e?.message || "Failed to resume session.");
      }
    }
  }

  async function stop() {
    setError("");
    clearTicker();
    setActiveSession(null);
    activeSessionRef.current = null;
    setElapsed(0);

    try {
      await api("/api/work-sessions/stop", {
        method: "POST",
        token: auth.token,
        body: {},
      });

      offlineManager.setOffline(false);
      setIsOffline(false);
      window.worktracker?.notifySessionsChanged?.();
      await loadSessionsAndTick();
    } catch (e) {
      // 🌐 OFFLINE FALLBACK: Stop session in local cache
      if (e?.isOffline || !navigator.onLine || e?.status === 0) {
        console.log("🌐 Network offline -> stopping session in local cache");
        const stoppedSess = offlineManager.stopOfflineSession();
        if (stoppedSess) {
          clearTicker();
          setActiveSession(null);
          activeSessionRef.current = null;
          setElapsed(0);
          setSessions((prev) => [stoppedSess, ...prev.filter((s) => s._id !== stoppedSess._id)]);
          setIsOffline(true);
          window.worktracker?.notifySessionsChanged?.();
        }
      } else {
        console.error("Stop failed:", e);
        setError(e?.message || "Failed to stop session.");
      }
    }
  }

  // ---- derived UI state ----

  function getTodayMs(s, now = Date.now()) {
    let ms = (s.accumulatedMinutes || 0) * 60000;

    if (s.status === "active" && s.currentStart) {
      ms += now - new Date(s.currentStart).getTime();
    }

    return Math.max(0, ms);
  }

  const todaysTotalMs = useMemo(() => {
    const todayStr = getLocalDateStr(new Date());

    let sum = 0;
    for (const s of sessions) {
      if (s.date !== todayStr) continue; // ✅ today only
      sum += getTodayMs(s);
    }

    return sum;
  }, [sessions, elapsed]);

  const todaysSessionsCount = useMemo(() => {
    const todayStr = getLocalDateStr(new Date());
    return sessions.filter((s) => s.date === todayStr).length;
  }, [sessions]);

  const employeeName = auth?.user?.name || "Employee";
  const [expanded, setExpanded] = useState({});

  const groupedSessions = useMemo(() => {
    const map = new Map();
    const now = Date.now();

    for (const s of sessions) {
      const taskKey = s.taskId || s.taskTitle || (s.customTask ? `custom-${s.customTask}` : "none");
      const key = s.projectId
        ? `${s.date}|project|${s.projectId}|${s.taskType || "none"}|${taskKey}`
        : `${s.date}|custom|${s.customTask ? `custom-${s.customTask}` : s._id}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          date: s.date,
          companyName: s.companyName || "—",
          categoryName: s.categoryName || "—",
          projectName: s.projectName || (s.customTask ? "(Custom Task)" : "—"),
          taskTitle: s.taskTitle || (s.customTask ? s.customTask : null),
          customTask: s.customTask || null,
          taskType: s.taskType || "—",
          status: s.status,
          totalMinutes: 0,
          totalMs: 0,
          segments: [],
        });
      }

      const g = map.get(key);
      const sessMs = getTodayMs(s, now);
      g.totalMs += sessMs;
      g.totalMinutes = g.totalMs / 60000;

      if (Array.isArray(s.segments)) {
        g.segments.push(...s.segments.filter((seg) => seg.start && seg.end));
      }

      if (s.status === "active") {
        g.status = "active";
      } else if (g.status !== "active" && s.status === "paused") {
        g.status = "paused";
      }
    }

    return Array.from(map.values());
  }, [sessions, elapsed]);

  const filteredGroupedSessions = useMemo(() => {
    // ✅ IF DATE RANGE IS SELECTED, SHOW EVERYTHING RETURNED BY API
    if (range.from && range.to) {
      return groupedSessions;
    }

    const now = new Date();
    const todayStr = getLocalDateStr(now);

    return groupedSessions.filter((p) => {
      if (!p.date) return false;

      if (dateFilter === "today") {
        return p.date === todayStr;
      }

      const [y, m, day] = p.date.split("-").map(Number);
      const d = new Date(y, m - 1, day);

      if (dateFilter === "week") {
        const startOfWeek = new Date(now);
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        return d >= startOfWeek;
      }

      if (dateFilter === "month") {
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });
  }, [groupedSessions, dateFilter, range.from, range.to]);

  function exportCSV(rows) {
    const headers = [
      "Company",
      "Category",
      "Project",
      "Task",
      "Work Type",
      "Status",
      "Total Minutes",
      "Total Time (HH:MM:SS)",
      "Date",
    ];

    const lines = [headers.join(",")];

    for (const p of rows) {
      // ✅ IMPORTANT: we do NOT include segments/logs at all
      const row = [
        p.companyName ?? "—",
        p.categoryName ?? "—",
        p.projectName ?? "—",
        p.taskTitle ?? "—",
        p.taskType ?? "—",
        p.status ?? "—",
        Math.round(p.totalMinutes || 0),
        minutesToHHMM(p.totalMinutes || 0),
        p.date ?? "",
      ];

      lines.push(
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      );
    }

    const csv = lines.join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download =
      range.from && range.to
        ? `work-logs-${range.from}-to-${range.to}.csv`
        : `work-logs-${dateFilter}.csv`;

    a.click();

    URL.revokeObjectURL(url);
  }

  const projectSummary = useMemo(() => {
    const map = new Map();

    for (const g of filteredGroupedSessions) {
      if (!g.projectName || g.projectName === "—") continue;

      const key = `${g.projectName}|${g.taskType}`;

      if (!map.has(key)) {
        map.set(key, {
          projectName: g.projectName,
          taskType: g.taskType,
          totalMs: 0,
          totalMinutes: 0,
        });
      }

      const item = map.get(key);
      item.totalMs += g.totalMs || 0;
      item.totalMinutes = item.totalMs / 60000;
    }

    return Array.from(map.values());
  }, [filteredGroupedSessions]);

  const projectDailyBreakdown = useMemo(() => {
    const map = new Map();

    for (const g of filteredGroupedSessions) {
      if (!g.projectName || g.projectName === "—") continue;

      const key = `${g.projectName}|${g.taskType}|${g.date}`;

      if (!map.has(key)) {
        map.set(key, {
          projectName: g.projectName,
          taskType: g.taskType,
          date: g.date,
          totalMs: 0,
          totalMinutes: 0,
        });
      }

      const item = map.get(key);
      item.totalMs += g.totalMs || 0;
      item.totalMinutes = item.totalMs / 60000;
    }

    return Array.from(map.values());
  }, [filteredGroupedSessions]);

  // ---- UI ----
  return (
    <div className="min-h-screen bg-[#f7f9fc] ">
      <div className="mx-auto max-w-[1500px] space-y-5">
        {/* Error */}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ---------------- MODE TOGGLE ---------------- */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
  {/* Mode Tabs */}
  <div className="flex items-center gap-1">
    <button
      onClick={() => {
        setMode("project");
        setCustomTask("");
      }}
      className={`border-b-2 px-3 py-1.5 text-sm font-semibold transition ${
        mode === "project"
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      Project Mode
    </button>

    <button
      onClick={() => {
        setMode("custom");
        setCompanyId("");
        setCategoryId("");
        setProjectId("");
        setProjects([]);
      }}
      className={`border-b-2 px-3 py-1.5 text-sm font-semibold transition ${
        mode === "custom"
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      Custom Task
    </button>
  </div>

  {/* Refresh */}
  <button
    onClick={loadSessionsAndTick}
    className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
  >
    ↻ Refresh
  </button>
</div>

        {/* ---------------- SELECT CONTEXT (PROJECT MODE ONLY) ---------------- */}
      {/* ---------------- SELECT CONTEXT (PROJECT MODE ONLY) ---------------- */}
      {mode === "project" && (
        <div className="space-y-4">
          {/* 🌟 ALL ASSIGNED TASKS QUICK-SELECTOR 🌟 */}
          {allMyTasks.length > 0 && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100/80">
                    <ListTodo size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Your Assigned Tasks
                      </h3>
                      <span className="rounded-full bg-blue-50 px-2 py-0.2 text-[11px] font-bold text-blue-700 border border-blue-200/60">
                        {allMyTasks.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Click any task to select it and auto-fill project details
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadAllMyTasks}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 transition cursor-pointer"
                >
                  <RotateCw size={12} />
                  <span>Refresh Tasks</span>
                </button>
              </div>

              <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto pr-1">
                {allMyTasks.map((t) => {
                  const isSelected = selectedTaskId === t._id;
                  const proj = typeof t.project === "object" ? t.project : null;
                  const projName = proj?.name || "Assigned Project";
                  const projCode = proj?.code || "";
                  const compName = proj?.company?.name || "";
                  const catName = proj?.category?.name || "";
                  const details = parseTaskDetails(t);

                  const curProjId = activeSession?.projectId || (typeof activeSession?.project === "object" ? activeSession?.project?._id : activeSession?.project);
                  const curTaskId = activeSession?.taskId || (typeof activeSession?.task === "object" ? activeSession?.task?._id : activeSession?.task);
                  const isActiveTask = activeSession?.status === "active" && (curTaskId === t._id || (!curTaskId && curProjId === proj?._id));
                  const isPausedTask = activeSession?.status === "paused" && (curTaskId === t._id || (!curTaskId && curProjId === proj?._id));

                  return (
                    <div
                      key={t._id}
                      onClick={() => selectAssignedTask(t)}
                      className={`group cursor-pointer text-left rounded-xl border p-3 transition-all duration-150 flex flex-col justify-between gap-2 ${
                        isActiveTask
                          ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-200"
                          : isPausedTask
                          ? "border-amber-400 bg-amber-50/40 shadow-xs ring-2 ring-amber-200"
                          : isSelected
                          ? "border-blue-500 bg-blue-50/50 shadow-xs ring-2 ring-blue-200"
                          : "border-slate-200 bg-slate-50/40 hover:border-blue-300 hover:bg-white shadow-2xs"
                      }`}
                    >
                      {/* TOP ROW: PROJECT NAME & CODE & TYPE */}
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FolderKanban size={15} className="text-blue-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900 truncate" title={projName}>
                            {projName}
                          </span>
                          {projCode && (
                            <span className="rounded bg-slate-200/70 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700 shrink-0">
                              {projCode}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 rounded-md bg-blue-50 border border-blue-200/70 px-1.5 py-0.2 text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                          {t.taskType || "Task"}
                        </span>
                      </div>

                      {/* MIDDLE ROW: Phase Name & Task Title */}
                      <div className="space-y-1">
                        {details.phase && (
                          <div className="flex items-center gap-1">
                            <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700 truncate max-w-full">
                              📌 {details.phase}
                            </span>
                          </div>
                        )}
                        <div className="text-xs font-semibold text-slate-800 line-clamp-1" title={t.title}>
                          {t.title}
                        </div>
                        {details.deliverable && (
                          <div className="text-[10px] text-slate-400 truncate">
                            Deliverable: {details.deliverable}
                          </div>
                        )}
                      </div>

                      {/* BOTTOM ROW: Company/Category & Status Action */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 w-full">
                        <span className="truncate max-w-[130px]" title={compName ? `${compName}${catName ? ` · ${catName}` : ""}` : ""}>
                          {compName ? `${compName}${catName ? ` · ${catName}` : ""}` : "—"}
                        </span>

                        <div className="flex items-center gap-1">
                          {isActiveTask ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800 animate-pulse">
                              ● Running
                            </span>
                          ) : isPausedTask ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectAssignedTask(t);
                                resume();
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 hover:bg-amber-200 px-2 py-0.2 text-[10px] font-bold text-amber-800 transition"
                            >
                              ❚❚ Resume
                            </button>
                          ) : isSelected ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.2 text-[10px] font-bold text-white">
                              Selected ✓
                            </span>
                          ) : (
                            <span className="font-semibold text-blue-600 group-hover:text-blue-800 text-[11px]">
                              Pick Task →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Project & Category Dropdowns */}
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Project Work Details
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select company, category, and project
                </p>
              </div>

              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {projects.length ? `${projects.length} Projects` : "No Projects"}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                {
                  label: "Company",
                  value: companyId,
                  disabled: false,
                  options: companies,
                  placeholder: "Select company",
                  onChange: (value) => {
                    setCompanyId(value);
                    setCategoryId("");
                    setProjectId("");
                    setProjects([]);
                    setSelectedTaskId("");
                  },
                },
                {
                  label: "Category",
                  value: categoryId,
                  disabled: !companyId,
                  options: categories,
                  placeholder: "Select category",
                  onChange: (value) => {
                    setCategoryId(value);
                    setProjectId("");
                    setSelectedTaskId("");
                  },
                },
                {
                  label: "Project",
                  value: projectId,
                  disabled: !companyId || !categoryId || !projects.length,
                  options: projects,
                  placeholder: "Select project",
                  onChange: (value) => {
                    setProjectId(value);
                    if (value) localStorage.setItem("lastProjectId", value);
                    setSelectedTaskId("");
                  },
                },
              ].map((field) => (
                <div key={field.label} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {field.label}
                  </label>

                  <select
                    value={field.value}
                    disabled={field.disabled}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">{field.placeholder}</option>
                    {field.options.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Work Type
                </label>

                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  disabled={!projectId}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {workTypes.map((wt) => (
                    <option key={wt} value={wt}>
                      {wt}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Task dropdown for the chosen project ── */}
              {assignedTasks.length > 0 && (
                <div className="flex flex-col gap-1.5 md:col-span-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tasks for this Project
                    <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                      {assignedTasks.length}
                    </span>
                  </label>

                  <select
                    value={selectedTaskId}
                    disabled={!projectId}
                    onChange={(e) => {
                      const tid = e.target.value;
                      setSelectedTaskId(tid);
                      if (tid) {
                        const task = assignedTasks.find((t) => t._id === tid);
                        if (task?.taskType) setWorkType(task.taskType);
                      }
                    }}
                    className="h-11 rounded-2xl border border-blue-200 bg-blue-50/50 px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Select task (optional)</option>
                    {assignedTasks.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.isMyTask ? "★ " : ""}{t.title} — {t.taskType} {t.isMyTask ? "(Assigned to you)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

{mode === "custom" && (
  <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
    <div className="mb-5">
      <h3 className="text-sm font-bold text-slate-900">
        Custom Task Details
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Add your custom work manually
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Custom Task
        </label>

        <input
          type="text"
          value={customTask}
          onChange={(e) => setCustomTask(e.target.value)}
          placeholder="e.g. Team meeting, code review"
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Work Type
        </label>

        <select
          value={workType}
          onChange={(e) => setWorkType(e.target.value)}
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          {workTypes.map((wt) => (
            <option key={wt} value={wt}>
              {wt}
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>
)}

        {/* ---------------- Premium Timer + Today Summary ---------------- */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          {/* Timer Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                    Current Session
                  </p>

                  {hasRunning && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      ● Running
                    </span>
                  )}

                  {hasPaused && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Paused
                    </span>
                  )}

                  {isOffline && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-800 animate-pulse">
                      <WifiOff size={13} className="text-amber-600" />
                      Offline (Tracking Locally)
                    </span>
                  )}

                  {isSyncing && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      <RefreshCw size={13} className="animate-spin text-blue-600" />
                      Syncing…
                    </span>
                  )}
                </div>

                <h2 className="mt-2 max-w-[420px] truncate text-lg font-semibold text-gray-900" title={
                  anyCurrent
                    ? (activeSession.customTask || activeSession.projectName || activeSession.project?.name || "No Project")
                    : (mode === "project" && selectedProj ? selectedProj.name : "No active session")
                }>
                  {anyCurrent
                    ? (activeSession.customTask || activeSession.projectName || activeSession.project?.name || "No Project")
                    : (mode === "project" && selectedProj ? selectedProj.name : "No active session")}
                </h2>

                {/* Show context switch badge if a different project is selected */}
                {anyCurrent && !isSameContext && selectedProj && (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-900 font-medium">
                    <span className="text-blue-600">Selected to switch:</span>
                    <strong className="font-bold text-blue-950">{selectedProj.name}</strong>
                  </div>
                )}

                <div className="mt-4 font-mono text-5xl font-bold tracking-tight text-gray-950">
                  {formatTime(elapsed)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-stretch">
                {/* 1. FIRST BUTTON: Start Session (idle) / Pause (running) / Resume (paused) */}
                {hasRunning ? (
                  <button
                    onClick={pause}
                    className="group inline-flex items-center justify-center gap-3 rounded-full border-2 border-orange-500 bg-white px-8 py-3 text-sm font-semibold text-slate-800 shadow-[0_6px_18px_rgba(249,115,22,0.16)] transition-all duration-200 hover:bg-orange-50 hover:shadow-[0_8px_24px_rgba(249,115,22,0.24)] active:scale-[0.98]"
                  >
                    <span className="text-2xl font-bold leading-none text-orange-500">
                      ❚❚
                    </span>
                    Pause
                  </button>
                ) : hasPaused ? (
                  <button
                    id="work-timer-start-btn"
                    onClick={resume}
                    className="group inline-flex items-center justify-center gap-3 rounded-full border-2 border-green-600 bg-white px-8 py-3 text-sm font-semibold text-slate-800 shadow-[0_6px_18px_rgba(22,163,74,0.14)] transition-all duration-200 hover:bg-green-50 hover:shadow-[0_8px_24px_rgba(22,163,74,0.22)] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center text-green-600">
                      <svg
                        className="h-5 w-5 fill-green-600"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    Resume
                  </button>
                ) : (
                  <button
                    id="work-timer-start-btn"
                    onClick={start}
                    disabled={
                      (mode === "project" && (!projectId || !workType)) ||
                      (mode === "custom" && !customTask.trim())
                    }
                    className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-green-600 bg-white px-8 py-3 text-sm font-semibold text-slate-800 shadow-[0_6px_18px_rgba(22,163,74,0.14)] transition-all duration-200 hover:bg-green-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span className="inline-flex items-center text-green-600">
                      <svg
                        className="h-5 w-5 fill-green-600"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    Start Session
                  </button>
                )}

                {/* 2. SECOND BUTTON: Stop Session */}
                <button
                  onClick={stop}
                  disabled={!anyCurrent}
                  className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-red-500 bg-white px-8 py-3 text-sm font-semibold text-slate-800 shadow-[0_6px_18px_rgba(239,68,68,0.14)] transition-all duration-200 hover:bg-red-50 hover:shadow-[0_8px_24px_rgba(239,68,68,0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-red-500 text-red-500">
                    ■
                  </span>
                  Stop Session
                </button>
              </div>
            </div>
          </div>

          {/* Today Summary Card */}
          <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Today Total
            </p>

            <div className="mt-4 font-mono text-4xl font-bold text-blue-700">
              {formatTime(todaysTotalMs)}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <p className="text-xs text-gray-500">Status</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {hasRunning ? "Working" : hasPaused ? "Paused" : "Idle"}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <p className="text-xs text-gray-500">Sessions</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {todaysSessionsCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions table (unchanged) */}
   <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] min-h-[580px] flex flex-col">
  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5 rounded-t-3xl">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
        Work Overview
      </p>

      <h3 className="mt-1 text-xl font-extrabold text-slate-900">
        {range.from && range.to
          ? "Custom Date Range"
          : dateFilter === "today"
            ? "Today’s Work Sessions"
            : dateFilter === "week"
              ? "This Week’s Work Sessions"
              : "This Month’s Work Sessions"}
      </h3>
    </div>

    {loading && (
      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 animate-pulse">
        Loading…
      </span>
    )}
  </div>

  <div className="mt-1">
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
      {/* Left Section: Date Range Picker + Date Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2 relative z-30">
        <DateRangePicker
          from={range.from}
          to={range.to}
          onChange={(r) => {
            setRange(r); // Save selected dates and reload sessions
          }}
        />

        {["today", "week", "month"].map((f) => (
          <button
            key={f}
            onClick={() => {
              setRange({ from: null, to: null }); // Clear custom range
              setDateFilter(f);
            }}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              dateFilter === f
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Right Section: View Toggle + Export Button */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View Toggle Buttons */}
        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
          <button
            onClick={() => setView("work")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              view === "work"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Work Sessions
          </button>

          <button
            onClick={() => setView("project")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              view === "project"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Project
          </button>
        </div>

        {/* Export CSV Button */}
        <button
          onClick={() => exportCSV(filteredGroupedSessions)}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
        >
          ⬇ Export CSV
        </button>
      </div>
    </div>

    {/* 🔹 VIEW TOGGLE */}

    {view === "work" && (
      <div className="border-t border-slate-100 bg-slate-50/60 p-4 flex-1 flex flex-col rounded-b-3xl">
        <div className="flex-1 max-h-[56vh] min-h-[360px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <table className="w-full text-sm table-fixed border-separate border-spacing-0 flex-1">
            <thead className="sticky top-0 z-20 bg-white border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left w-[130px] sm:w-[150px]">
                  Company / Category
                </th>
                <th className="px-4 py-3 text-left w-[220px] sm:w-[260px]">
                  Project & Task
                </th>
                <th className="px-4 py-3 text-left w-[90px] sm:w-[100px]">
                  Work Type
                </th>
                <th className="px-4 py-3 text-left w-[100px] sm:w-[110px]">
                  Status
                </th>
                <th className="px-4 py-3 text-left w-[110px] sm:w-[120px]">
                  Total Time
                </th>
                <th className="px-4 py-3 text-left w-[90px] sm:w-[100px]">
                  Date
                </th>
                <th className="px-4 py-3 text-left w-[90px] sm:w-[100px]">
                  Logs
                </th>
              </tr>
            </thead>

            <tbody className="[&_tr]:border-t">
              {(!filteredGroupedSessions || filteredGroupedSessions.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-24 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-gray-500">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl shadow-xs">
                        🗓️
                      </div>
                      <span className="text-base font-bold text-slate-800">No sessions found for this period</span>
                      <span className="text-xs text-slate-400 max-w-sm">
                        Choose a date range using the picker above or start a session to see your activity logs here.
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {filteredGroupedSessions.map((p) => {
                const isRowActive = p.status === "active";
                const isRowPaused = p.status === "paused";

                return (
                  <React.Fragment key={p.key}>
                    <tr className={`transition ${
                      isRowActive 
                        ? "bg-emerald-50/40 hover:bg-emerald-50/70" 
                        : isRowPaused 
                        ? "bg-amber-50/30 hover:bg-amber-50/50" 
                        : "even:bg-gray-50/60 hover:bg-blue-50/40"
                    }`}>
                      {/* Company & Category */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 truncate" title={p.companyName}>
                          {p.companyName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate" title={p.categoryName}>
                          {p.categoryName}
                        </div>
                      </td>

                      {/* Project & Task Title */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm shrink-0">{p.customTask ? "💼" : "📁"}</span>
                          <span className="font-bold text-slate-900 truncate" title={p.projectName || p.customTask}>
                            {p.projectName || p.customTask || "—"}
                          </span>
                          {p.customTask && (
                            <span className="shrink-0 inline-flex items-center rounded-full bg-purple-50 border border-purple-200 px-1.5 py-0.2 text-[9px] font-bold text-purple-700">
                              Custom
                            </span>
                          )}
                        </div>
                        {p.taskTitle && p.taskTitle !== (p.projectName || p.customTask) && (
                          <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 truncate max-w-full" title={p.taskTitle}>
                            <span>🎯</span>
                            <span className="truncate">{p.taskTitle}</span>
                          </div>
                        )}
                      </td>

                      {/* Work Type */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {p.taskType}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isRowActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 animate-pulse shadow-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                            Running
                          </span>
                        ) : isRowPaused ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-xs">
                            ❚❚ Paused
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            ✓ Stopped
                          </span>
                        )}
                      </td>

                      {/* Live Total Time */}
                      <td className="px-4 py-3">
                        <div className={`font-mono text-sm font-bold tracking-tight ${
                          isRowActive ? "text-emerald-700" : "text-slate-900"
                        }`}>
                          {minutesToHHMM(p.totalMinutes)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {Math.round(p.totalMinutes || 0)}m total
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-slate-600">{p.date}</td>

                      {/* Logs */}
                      <td className="px-4 py-3">
                        {p.segments.length > 0 && (
                          <button
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [p.key]: !prev[p.key],
                              }))
                            }
                            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                          >
                            {expanded[p.key]
                              ? "Hide"
                              : `Logs (${p.segments.length})`}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Logs Details */}
                    {expanded[p.key] && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-6 py-3">
                          <div className="text-xs font-semibold text-gray-600 mb-1">
                            Time Logs for {p.projectName}
                          </div>
                          <ul className="space-y-1 text-xs font-mono text-gray-700">
                            {p.segments.map((seg, i) => (
                              <li key={i}>
                                • {new Date(seg.start).toLocaleTimeString()} →{" "}
                                {seg.end ? new Date(seg.end).toLocaleTimeString() : "Running now..."}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {view === "project" && (
      <div className="border-t border-slate-100 bg-slate-50/60 p-4 flex-1 flex flex-col rounded-b-3xl">
        <div className="flex-1 min-h-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-3">
            Project – Work Summary
          </h3>

          {projectSummary.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-20 text-center">
              <div className="inline-flex flex-col items-center gap-2 text-gray-500">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl shadow-xs">
                  📁
                </div>
                <span className="text-base font-bold text-slate-800">No project work found</span>
                <span className="text-xs text-slate-400">
                  Logged project sessions will be summarized here once completed.
                </span>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm table-fixed border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Project</th>
                  <th className="px-3 py-2 text-left">Work Type</th>
                  <th className="px-3 py-2 text-left">Total Hours</th>
                  <th className="px-3 py-2 text-left">Details</th>
                </tr>
              </thead>

              <tbody>
                {projectSummary.map((p) => {
                  const rowKey = `${p.projectName}|${p.taskType}`;
                  const isExpanded = expandedProject === rowKey;

                  return (
                    <React.Fragment key={rowKey}>
                      <tr className="border-t hover:bg-blue-50/40 transition">
                        <td className="px-3 py-2 font-medium">
                          {p.projectName}
                        </td>
                        <td className="px-3 py-2">{p.taskType}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {minutesToHHMM(p.totalMinutes)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 cursor-pointer"
                            onClick={() =>
                              setExpandedProject(isExpanded ? null : rowKey)
                            }
                          >
                            {isExpanded ? "Hide details" : "View details"}
                          </button>
                        </td>
                      </tr>

                      {/* Day-wise details */}
                      {isExpanded && (
                        <tr className="bg-slate-50">
                          <td colSpan={4} className="px-4 py-3">
                            <div className="text-sm font-medium mb-2">
                              Day-wise work – {p.projectName} ({p.taskType})
                            </div>

                            <table className="w-full text-xs overflow-hidden rounded-xl border">
                              <thead className="bg-slate-100">
                                <tr>
                                  <th className="px-2 py-1 text-left">Date</th>
                                  <th className="px-2 py-1 text-left">
                                    Total Hours
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {projectDailyBreakdown
                                  .filter(
                                    (d) =>
                                      d.projectName === p.projectName &&
                                      d.taskType === p.taskType,
                                  )
                                  .map((d, idx) => (
                                    <tr key={idx} className="border-t">
                                      <td className="px-2 py-1">{d.date}</td>
                                      <td className="px-2 py-1">
                                        {minutesToHHMM(d.totalMinutes)}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )}
  </div>
</div>
      </div>
    </div>
  );
}
