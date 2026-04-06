import React, { useEffect, useRef, useState, useMemo } from "react";
import { api } from "../../api.js";
import DateRangePicker from "../../components/DateRangePicker";


export default function WorkTimer({ auth }) {
  // ---------------- STATES ----------------
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);

  // NEW: Toggle Mode
  const [mode, setMode] = useState("project"); // project | custom

  // Work Type (Project Mode Only)
  const [workTypes, setWorkTypes] = useState([]);
  const [workType, setWorkType] = useState("");

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
    window.worktracker?.getConfig?.()
      .then(cfg => setMachine(cfg))
      .catch(() => { });
  }, []);

  // ---- helpers ----
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return (
      String(hours).padStart(2, "0") +
      ":" +
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0") +
      "." +
      String(centis).padStart(2, "0")
    );
  }

  function minutesToHHMM(mins) {
    const totalSeconds = Math.round(mins * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }



  function clearTicker() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ---- loaders ----
  async function loadMaster() {
    setError("");
    try {
      const [c, g] = await Promise.all([
        api("/api/companies", { token: auth.token }),
        api("/api/categories", { token: auth.token }),
      ]);
      setCompanies(c || []);
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
        { token: auth.token }
      );
      setProjects(list || []);
    } catch (e) {
      setError("Could not load projects.");
    }
  }

  async function loadSessionsAndTick() {
    if (loadingSessionsRef.current) return;
    loadingSessionsRef.current = true;

    setError("");
    setLoading(true);

    try {
      // ✅ USE DATE RANGE IF SELECTED
      let fromDate, toDate;

      if (range.from && range.to) {
        fromDate = range.from;
        toDate = range.to;
      } else {
        // fallback = last 7 days
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 7);
        fromDate = from.toISOString().slice(0, 10);
        toDate = to.toISOString().slice(0, 10);
      }

      const sess = await api(
        `/api/work-sessions/my?from=${fromDate}&to=${toDate}`,
        { token: auth.token }
      );

      const arr = Array.isArray(sess) ? sess : [];
      setSessions(arr);

      const running = arr.find(x => x.status === "active");
      const paused = arr.find(x => x.status === "paused");
      const current = running || paused || null;

      clearTicker();
      setActiveSession(current);

      if (running) {
        const baseMs = (running.accumulatedMinutes || 0) * 60000;
        const start = new Date(running.currentStart || running.createdAt).getTime();

        const update = () => {
          setElapsed(baseMs + (Date.now() - start));
        };

        update();
        timerRef.current = setInterval(update, 100);
      } else {
        setElapsed((paused?.totalMinutes || 0) * 60000);
      }
    } catch {
      setError("Could not load sessions.");
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
          : ["Alpha", "Beta", "CR", "Rework", "poc", "Analysis", "Storyboard QA", "Output QA"];
      setWorkTypes(arr);
      if (!workType && arr.length) setWorkType(arr[0]);
    } catch (e) {
      const fallback = ["Alpha", "Beta", "CR", "Rework", "poc", "Analysis", "Storyboard QA", "Output QA"];
      setWorkTypes(fallback);
      if (!workType) setWorkType(fallback[0]);
    }
  }


  async function safeAutoResume(flagKey) {
    if (resumeInProgressRef.current) return;

    const flag = localStorage.getItem(flagKey);
    if (flag !== "1") return;

    const cur = activeSessionRef.current;
    if (!cur || cur.status !== "paused") return;

    resumeInProgressRef.current = true;
    localStorage.removeItem(flagKey);

    try {
      await resume();
    } finally {
      setTimeout(() => {
        resumeInProgressRef.current = false;
      }, 500);
    }
  }


  // ---- effects ----
  useEffect(() => {
    (async () => {
      await loadMaster();
      await loadWorkTypes();
      await loadSessionsAndTick();
    })();
    return () => clearTicker();
  }, []);

  // 🔥 AUTO REFRESH ONLY WHEN NO DATE RANGE IS SELECTED
  useEffect(() => {
    if (range.from && range.to) return; // ⛔ stop auto refresh

    const interval = setInterval(() => {
      loadSessionsAndTick();
    }, 10000);

    return () => clearInterval(interval);
  }, [range.from, range.to]);


  useEffect(() => {
    loadProjects();

    if (!companyId || !categoryId) return;

    const interval = setInterval(() => {
      loadProjects(); // 🔥 refresh project list
    }, 20000); // every 20 seconds

    return () => clearInterval(interval);
  }, [companyId, categoryId]);


  // Keyboard shortcuts
  // useEffect(() => {
  //   const onKey = (e) => {
  //     if (
  //       e.target.tagName === "INPUT" ||
  //       e.target.tagName === "SELECT" ||
  //       e.target.tagName === "TEXTAREA"
  //     )
  //       return;
  //     const k = e.key.toLowerCase();
  //     if (k === "s") start();
  //     if (k === "p" || k === " ") {
  //       e.preventDefault();
  //       if (activeSession?.status === "active") pause();
  //       else if (activeSession?.status === "paused") resume();
  //     }
  //     if (k === "r") resume();
  //     if (k === "x") stop();
  //   };
  //   window.addEventListener("keydown", onKey);
  //   return () => window.removeEventListener("keydown", onKey);
  // }, [activeSession, projectId, elapsed]);

  // Refresh from other windows
  useEffect(() => {
    const off = window.worktracker?.onSessionsChanged?.(() => {
      loadSessionsAndTick();
    });
    return () => {
      if (typeof off === "function") off();
    };
  }, []);

  // System sleep/idle handlers (unchanged)
  useEffect(() => {
    const handler = () => {
      const cur = activeSessionRef.current;
      if (!cur || cur.status !== "active") return;

      autoPausedRef.current = true;
      localStorage.setItem("wt_auto_paused", "1");

      clearTicker();
      setElapsed(prev => prev);

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
      setElapsed(prev => prev);

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
    const activityHandler = () => {
      const flag = localStorage.getItem("wt_auto_paused");
      if (flag !== "1") return;

      autoPausedRef.current = false;
      safeAutoResume("wt_auto_paused");


    };

    window.addEventListener("mousemove", activityHandler);
    window.addEventListener("keydown", activityHandler);

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

  ///  // 🔥 HEARTBEAT: ping backend every 30 seconds if session is running
  // useEffect(() => {
  //   if (!hasRunning) return;

  //   const interval = setInterval(() => {
  //     api("/api/work-sessions/heartbeat", {
  //       method: "POST",
  //       token: auth.token,
  //     }).then(() => {
  //       console.log("💓 Heartbeat sent");
  //     })
  //       .catch((err) => {
  //         console.log("❌ Heartbeat failed:", err.message);
  //       });

  //   }, 30_000); // every 30 seconds

  //   return () => clearInterval(interval);
  // }, [hasRunning]);



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

    try {
      const body = {
        taskType: mode === "project" ? workType : undefined,
        projectId: mode === "project" ? projectId : null,
        customTask: mode === "custom" ? customTask.trim() : null,
        remarks: "",
      };

      await api("/api/work-sessions/start", {
        method: "POST",
        token: auth.token,
        body,
      });

      window.worktracker?.notifySessionsChanged?.();
      await loadSessionsAndTick();
    } catch (e) {
      setError(e.message || "Failed to start session.");
    }
  }

  async function pause() {
    setError("");
    try {
      await api("/api/work-sessions/pause", {
        method: "POST",
        token: auth.token,
      });
      window.worktracker?.notifySessionsChanged?.();
      await loadSessionsAndTick();
    } catch {
      setError("Failed to pause session.");
    }
  }

  async function resume() {
    setError("");
    try {
      await api("/api/work-sessions/resume", {
        method: "POST",
        token: auth.token,
      });
      window.worktracker?.notifySessionsChanged?.();
      await loadSessionsAndTick();
    } catch {
      setError("Failed to resume session.");
    }
  }

  async function stop() {
    setError("");
    try {
      await api("/api/work-sessions/stop", {
        method: "POST",
        token: auth.token,
        body: {},
      });
      window.worktracker?.notifySessionsChanged?.();
      await loadSessionsAndTick();
    } catch {
      setError("Failed to stop session.");
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
    const todayStr = new Date().toISOString().slice(0, 10);

    let sum = 0;
    for (const s of sessions) {
      if (s.date !== todayStr) continue; // ✅ today only
      sum += getTodayMs(s);
    }

    return sum;
  }, [sessions, elapsed]);




  const employeeName = auth?.user?.name || "Employee";
  const [expanded, setExpanded] = useState({});

  const groupedSessions = useMemo(() => {
    const map = new Map();

    for (const s of sessions) {
      const key =
        s.projectId
          ? `${s.date}|project|${s.projectId}|${s.taskType || "none"}`
          : `${s.date}|custom|${s._id}`;


      if (!map.has(key)) {
        map.set(key, {
          key,
          date: s.date,
          companyName: s.companyName || "—",
          categoryName: s.categoryName || "—",
          projectName: s.projectName || s.customTask || "—",
          taskType: s.taskType || "—",
          status: s.status,
          totalMinutes: 0,
          segments: [],
        });
      }

      const g = map.get(key);

      g.totalMinutes += s.totalMinutes || 0;

      if (Array.isArray(s.segments)) {
        g.segments.push(
          ...s.segments.filter(seg => seg.start && seg.end)
        );
      }

      if (s.status === "active") g.status = "active";
    }

    return Array.from(map.values());
  }, [sessions]);

  const filteredGroupedSessions = useMemo(() => {
    // ✅ IF DATE RANGE IS SELECTED, SHOW EVERYTHING RETURNED BY API
    if (range.from && range.to) {
      return groupedSessions;
    }

    const now = new Date();

    return groupedSessions.filter(p => {
      const d = new Date(p.date);

      if (dateFilter === "today") {
        return d.toDateString() === now.toDateString();
      }

      if (dateFilter === "week") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
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
      "Work Type",
      "Status",
      "Total Minutes",
      "Total Hours",
      "Date",
    ];

    const lines = [headers.join(",")];

    for (const p of rows) {
      // ✅ IMPORTANT: we do NOT include segments/logs at all
      const row = [
        p.companyName ?? "—",
        p.categoryName ?? "—",
        p.projectName ?? "—",
        p.taskType ?? "—",
        p.status ?? "—",
        Math.round(p.totalMinutes || 0),
        minutesToHHMM(p.totalMinutes || 0),
        p.date ?? "",
      ];

      lines.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }

    const csv = lines.join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = range.from && range.to
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
          totalMinutes: 0,
        });
      }

      map.get(key).totalMinutes += g.totalMinutes || 0;
    }

    return Array.from(map.values());
  }, [filteredGroupedSessions]);


  const projectDailyBreakdown = useMemo(() => {
    const map = new Map();

    for (const g of filteredGroupedSessions) {
      if (!g.projectName || g.projectName === "—") continue;

      const key = `${g.projectName}|${g.date}`;

      if (!map.has(key)) {
        map.set(key, {
          projectName: g.projectName,
          date: g.date,
          totalMinutes: 0,
        });
      }

      map.get(key).totalMinutes += g.totalMinutes || 0;
    }

    return Array.from(map.values());
  }, [filteredGroupedSessions]);


  // ---- UI ----
  return (
<div className="mx-auto px-4 py-4 space-y-4">


      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {/* <p className="text-xs text-gray-500 ">
            Press <span className="font-semibold">S</span> to Start,&nbsp;
            <span className="font-semibold">P/Space</span> to Pause/Resume,&nbsp;
            <span className="font-semibold">X</span> to Stop
          </p> */}
        </div>

      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ---------------- MODE TOGGLE ---------------- */}
<div className="flex justify-between items-center border-b pb-2">

  {/* Mode Tabs */}
  <div className="flex bg-gray-100 rounded-lg p-1">
    <button
      onClick={() => {
        setMode("project");
        setCustomTask("");
      }}
      className={`px-4 py-1.5 text-sm rounded-md font-medium transition
      ${mode === "project"
          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow"
          : "text-gray-600 hover:bg-white"
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
      className={`px-4 py-1.5 text-sm rounded-md font-medium transition
      ${mode === "custom"
          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow"
          : "text-gray-600 hover:bg-white"
        }`}
    >
      Custom Task Mode
    </button>
  </div>

  {/* Refresh */}
  <button
    onClick={loadSessionsAndTick}
    className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
  >
    ↻ Refresh
  </button>
</div>


      {/* ---------------- SELECT CONTEXT (PROJECT MODE ONLY) ---------------- */}
      {mode === "project" && (
       <div className="bg-gray-50/70 border border-gray-200 rounded-lg px-3 py-3">


          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">
              Select Context
            </div>
            <div className="text-xs text-gray-500">
              {projects.length ? `${projects.length} project(s)` : "No projects"}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {/* Company */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Company</label>
              <select
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setCategoryId("");
                  setProjectId("");
                  setProjects([]);
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Category</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setProjectId("");
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                disabled={!companyId}
              >
                <option value="">Select category</option>
                {categories.map((g) => (
                  <option key={g._id} value={g._id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                disabled={!companyId || !categoryId || !projects.length}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Work Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Work Type</label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                disabled={!projectId}
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

      {/* ---------------- CUSTOM TASK MODE ---------------- */}
      {mode === "custom" && (
        <div className="mt-4">
          <label className="text-xs text-gray-500">Custom Task</label>
          <input
            type="text"
            value={customTask}
            onChange={(e) => setCustomTask(e.target.value)}
            placeholder="Enter custom task"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
      )}

      {/* ---------------- Stopwatch + Controls ---------------- */}
   <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]">

        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">

          {/* Left side */}
          <div className="text-center sm:text-left">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Current
            </div>
            <div className="text-gray-900 font-medium">
              {anyCurrent
                ? activeSession.projectName ||
                activeSession.project?.name ||
                activeSession.customTask ||
                "Unknown"
                : "No active session"}
            </div>

            <div className="mt-1 text-xs text-gray-500">
              Today total:
              <span className="font-semibold"> {formatTime(todaysTotalMs)}</span>
            </div>
          </div>

          {/* Timer center */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <div
                className={`absolute inset-0 rounded-xl blur-md transition ${hasRunning ? "bg-blue-200/60" : "bg-gray-200/40"
                  }`}
              />
              <div className="relative rounded-xl px-4 py-2 font-mono text-4xl sm:text-5xl font-semibold tracking-tight text-blue-700">
                {formatTime(elapsed)}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            <button
              onClick={start}
              className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-40"
              disabled={
                (mode === "project" && (!projectId || !workType)) ||
                (mode === "custom" && !customTask.trim()) ||
                anyCurrent
              }
            >
              ▶ Start
            </button>

            <button
              onClick={pause}
              className="rounded-lg bg-yellow-500 text-white px-3 py-2 text-sm font-medium hover:bg-yellow-600 disabled:opacity-40"
              disabled={!hasRunning}
            >
              ❚❚ Pause
            </button>

            <button
              onClick={resume}
              className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
              disabled={!hasPaused}
            >
              ► Resume
            </button>

            <button
              onClick={stop}
              className="rounded-lg bg-red-600 text-white px-3 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-40"
              disabled={!anyCurrent}
            >
              ◼ Stop
            </button>
          </div>
        </div>
      </div>

      {/* Sessions table (unchanged) */}
      <div className="rounded-xl border border-gray-200 bg-white p-0 shadow-sm">
        <div className="flex items-center justify-between px-4 pt-4">
          <h3 className="text-lg font-semibold">
            {range.from && range.to
              ? "Custom Date Range"
              : dateFilter === "today"
                ? "Today’s Work Sessions"
                : dateFilter === "week"
                  ? "This Week’s Work Sessions"
                  : "This Month’s Work Sessions"}
          </h3>
          {loading && (
            <span className="text-xs text-gray-500 animate-pulse">
              Loading…
            </span>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between px-4 pt-2">
            {/* Left Section: Date Range Picker + Date Filter Buttons */}
            <div className="flex items-center gap-2">
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
                  className={`px-3 py-1 text-xs font-medium rounded 
          ${dateFilter === f ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Right Section: View Toggle + Export Button */}
            <div className="flex items-center gap-2">
              {/* View Toggle Buttons */}
              <button
                onClick={() => setView("work")}
                className={`px-4 py-2 rounded-sm text-sm font-medium 
        ${view === "work" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
              >
                Work Sessions
              </button>

              <button
                onClick={() => setView("project")}
                className={`px-4 py-2 rounded-sm text-sm font-medium 
        ${view === "project" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
              >
                Project
              </button>

              {/* Export CSV Button */}
              <button
                onClick={() => exportCSV(filteredGroupedSessions)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50"
              >
                ⬇ Export CSV
              </button>
            </div>
          </div>


          {/* 🔹 VIEW TOGGLE */}


          {view === "work" && (
            <div className="mt-3 max-h-[52vh] overflow-auto border-t">
              <table className="w-full text-sm table-fixed border-separate border-spacing-0">
                <thead className="sticky top-0 z-20 bg-white border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left w-[120px] sm:w-[140px]">Company</th>
                    <th className="px-4 py-3 text-left w-[100px] sm:w-[120px]">Category</th>
                    <th className="px-4 py-3 text-left w-[200px] sm:w-[260px]">Project</th>
                    <th className="px-4 py-3 text-left w-[120px] sm:w-[140px]">Work Type</th>
                    <th className="px-4 py-3 text-left w-[100px] sm:w-[110px]">Status</th>
                    <th className="px-4 py-3 text-left w-[120px] sm:w-[140px]">Elapsed</th>
                    <th className="px-4 py-3 text-left w-[100px] sm:w-[120px]">Total</th>
                    <th className="px-4 py-3 text-left w-[100px] sm:w-[120px]">Date</th>
                    <th className="px-4 py-3 text-left w-[110px] sm:w-[120px]">Logs</th>
                  </tr>
                </thead>

                <tbody className="[&_tr]:border-t">
                  {(!sessions || sessions.length === 0) && (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center">
                        <div className="inline-flex flex-col items-center gap-1 text-gray-500">
                          <span className="text-2xl">🗓️</span>
                          <span>No sessions yet today</span>
                          <span className="text-xs">Start a session to see it here.</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {filteredGroupedSessions.map((p) => (
                    <React.Fragment key={p.key}>
                      <tr className="even:bg-gray-50/60">
                        <td className="px-4 py-3">{p.companyName}</td>
                        <td className="px-4 py-3">{p.categoryName}</td>
                        <td className="px-4 py-3 font-medium truncate" title={p.projectName}>
                          {p.projectName}
                        </td>
                        <td className="px-4 py-3">{p.taskType}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs
                  ${p.status === "active" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-blue-700">
                          {formatTime(p.totalMinutes * 60000)}
                        </td>
                        <td className="px-4 py-3">{minutesToHHMM(p.totalMinutes)}</td>
                        <td className="px-4 py-3">{p.date}</td>
                        <td className="px-4 py-3">
                          {p.segments.length > 0 && (
                            <button
                              onClick={() => setExpanded(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                              className="text-xs text-blue-600 underline"
                            >
                              {expanded[p.key] ? "Hide logs" : `View logs (${p.segments.length})`}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Logs */}
                      {expanded[p.key] && (
                        <tr className="bg-gray-50">
                          <td colSpan={9} className="px-6 py-3">
                            <div className="text-xs font-semibold text-gray-600 mb-1">
                              Time Logs
                            </div>
                            <ul className="space-y-1 text-xs font-mono text-gray-700">
                              {p.segments.map((seg, i) => (
                                <li key={i}>
                                  • {new Date(seg.start).toLocaleTimeString()} →{" "}
                                  {new Date(seg.end).toLocaleTimeString()}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === "project" && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm mt-4">
              <h3 className="text-lg font-semibold mb-3">Project – Work Summary</h3>
              {projectSummary.length === 0 ? (
                <p className="text-sm text-gray-500">No project work found</p>
              ) : (
                <table className="w-full text-sm table-fixed border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Project</th>
                      <th className="px-3 py-2 text-left">Work Type</th>
                      <th className="px-3 py-2 text-left">Total Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectSummary.map((p, i) => (
                      <React.Fragment key={i}>
                        <tr className="border-t">
                          <td className="px-3 py-2 font-medium">{p.projectName}</td>
                          <td className="px-3 py-2">{p.taskType}</td>
                          <td className="px-3 py-2">{minutesToHHMM(p.totalMinutes)}</td>
                          <td className="px-3 py-2">
                            <button
                              className="text-xs text-blue-600 underline"
                              onClick={() => setExpandedProject(expandedProject === p.projectName ? null : p.projectName)}
                            >
                              {expandedProject === p.projectName ? "Hide details" : "View details"}
                            </button>
                          </td>
                        </tr>

                        {/* Day-wise details */}
                        {expandedProject === p.projectName && (
                          <tr className="bg-gray-50">
                            <td colSpan={4} className="px-4 py-3">
                              <div className="text-sm font-medium mb-2">
                                Day-wise work – {p.projectName}
                              </div>
                              <table className="w-full text-xs border rounded">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-2 py-1 text-left">Date</th>
                                    <th className="px-2 py-1 text-left">Total Hours</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {projectDailyBreakdown
                                    .filter(d => d.projectName === p.projectName)
                                    .map((d, idx) => (
                                      <tr key={idx} className="border-t">
                                        <td className="px-2 py-1">{d.date}</td>
                                        <td className="px-2 py-1">{minutesToHHMM(d.totalMinutes)}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
