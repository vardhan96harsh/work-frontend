import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import DateRangePicker from "../../components/DateRangePicker.jsx";
import ExportProjectExcel from "../../components/ExportProjectExcel";

/* ---------- helpers ---------- */
function hhmmssccFromMinutes(mins) {
  const ms = Math.max(0, mins) * 60000;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function formatHHMMSS(mins) {
  const totalSeconds = Math.round((mins || 0) * 60);

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return (
    String(h).padStart(2, "0") + ":" +
    String(m).padStart(2, "0") + ":" +
    String(s).padStart(2, "0")
  );
}

function time12(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
}
function iso(d) { return d.toISOString().slice(0, 10); }
function defaultRange(days = 5) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { from: iso(start), to: iso(end) };
}
function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // Monday as start if you prefer: change this
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfWeek(d = new Date()) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return e;
}

export default function AdminDailyReport({ auth }) {
  /* ---------- state ---------- */
  const [{ from, to }, setRange] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { from: today, to: today };
  });

  const [unit, setUnit] = useState("minutes"); // "minutes" | "hours"

  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [machines, setMachines] = useState([]);

  const [filters, setFilters] = useState({
    company: "",
    category: "",
    project: "",
    user: "",
    machine: "",
  });

  const [tab, setTab] = useState("raw"); // raw | user | project
  const [rows, setRows] = useState([]);
  const [sumUser, setSumUser] = useState([]);
  const [sumProject, setSumProject] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [downloading, setDownloading] = useState(false);
  const [expandedUser, setExpandedUser] = useState({});
  const [expandedProject, setExpandedProject] = useState({});
  const [expandedProjectUser, setExpandedProjectUser] = useState({});

  /* ---------- Export CSV ---------- */
  async function handleExportCSV() {
    try {
      setDownloading(true);

      const qs = new URLSearchParams({
        from,
        to,
        group: "compact",                    // easier to read
        unit,                                // minutes | hours
        ...(filters.company ? { company: filters.company } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.project ? { project: filters.project } : {}),
        ...(filters.user ? { user: filters.user } : {}),
        ...(filters.machine ? { machine: filters.machine } : {}),
      }).toString();

      const csvText = await api(`/api/work-sessions/export?${qs}`, { token: auth.token });
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `work-sessions_${from}_to_${to}_${unit}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Export failed. Check console for details.");
    } finally {
      setDownloading(false);
    }
  }

  /* ---------- masters ---------- */
  async function loadMasters() {
    const [c, g, u] = await Promise.all([
      api("/api/companies", { token: auth.token }),
      api("/api/categories", { token: auth.token }),
      api("/api/users", { token: auth.token }),
    ]);
    setCompanies(c || []);
    setCategories(g || []);
    setUsers(
      (u || [])
        .filter((x) => x.role !== "admin")
        .map(x => ({ ...x, _id: x._id ?? x.id })) // normalize id
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  async function loadMachines() {
    try {
      const list = await api("/api/machines/options", { token: auth.token });
      setMachines(list || []);
    } catch {
      setMachines([]);
    }
  }

  async function loadProjects() {
    if (!filters.company || !filters.category) {
      setProjects([]);
      return;
    }
    const list = await api(
      `/api/projects?company=${filters.company}&category=${filters.category}`,
      { token: auth.token }
    );
    setProjects(list || []);
  }

  /* ---------- data ---------- */
  async function loadRaw() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        from, to,
        ...(filters.company ? { company: filters.company } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.project ? { project: filters.project } : {}),
        ...(filters.user ? { user: filters.user } : {}),
        ...(filters.machine ? { machine: filters.machine } : {}),
      }).toString();

      const data = await api(`/api/work-sessions/admin/list?${qs}`, { token: auth.token });
      setRows(data || []);
      setExpanded({});
    } finally {
      setLoading(false);
    }
  }

  async function loadSummaries() {
    const q = new URLSearchParams({
      from,
      to,
      ...(filters.company && { company: filters.company }),
      ...(filters.category && { category: filters.category }),
      ...(filters.project && { project: filters.project }),
      ...(filters.user && { user: filters.user }),
      ...(filters.machine && { machine: filters.machine }),
    }).toString();

    const [byUser, byProject] = await Promise.all([
      api(`/api/reports/summary?${q}&dim=user`, { token: auth.token }),
      api(`/api/reports/summary?${q}&dim=project`, { token: auth.token }),
    ]);

    // reports/summary returns hours → keep hours, also compute minutes
    const toUser = (byUser || []).map(r => ({
      key: r.key ?? r.label,
      label: r.label,
      email: r.email || "",
      hours: r.totalHours || 0,
      minutes: Math.round((r.totalHours || 0) * 60),
    }));
    const toProject = (byProject || []).map(r => ({
      key: r.key ?? r.label,
      label: r.label,
      hours: r.totalHours || 0,
      minutes: Math.round((r.totalHours || 0) * 60),
    }));

    setSumUser(toUser.sort((a, b) => b[unit === "hours" ? "hours" : "minutes"] - a[unit === "hours" ? "hours" : "minutes"]));
    setSumProject(toProject.sort((a, b) => b[unit === "hours" ? "hours" : "minutes"] - a[unit === "hours" ? "hours" : "minutes"]));
  }

  /* ---------- effects ---------- */
  useEffect(() => {
    loadMasters();
    loadMachines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.company, filters.category]);

  // Manual reload on filter change
  useEffect(() => {
    loadRaw();
    loadSummaries();
  }, [from, to, unit, filters.company, filters.category, filters.project, filters.user, filters.machine]);

  // Auto refresh ONLY once
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     loadRaw();
  //     loadSummaries();
  //   }, 120000);

  //   return () => clearInterval(interval);
  // }, []);


  /* ---------- grouping for RAW ---------- */
  const grouped = useMemo(() => {
    const map = new Map();

    for (const r of rows || []) {
      // ✅ group by DATE + USER only
      const key = [r.date || "", r.userId || ""].join("|");

      if (!map.has(key)) {
        map.set(key, {
          key,
          date: r.date,
          userName: r.userName || "",
          companyName: r.companyName || "—",
          categoryName: r.categoryName || "—",
          totalMinutes: 0,
          reason: r.reason || "",
          projects: {},
        });
      }

      const g = map.get(key);
      g.totalMinutes += r.totalMinutes || 0;

      const pid = r.projectId || "unknown";

      if (!g.projects[pid]) {
        g.projects[pid] = {
          projectName: r.projectName || "—",
          totalMinutes: 0,
          sessions: [],
        };
      }

      g.projects[pid].totalMinutes += r.totalMinutes || 0;

      g.projects[pid].sessions.push({
        status: r.status,
        remarks: r.remarks || "",
        segments: r.segments || [],
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.date > b.date ? -1 : 1
    );
  }, [rows]);

  // ✅ SUMMARY FOR "BY USER" TAB
  const byUserSummary = useMemo(() => {
    const map = new Map();

    for (const r of rows || []) {
      if (!r.userId) continue;

      if (!map.has(r.userId)) {
        map.set(r.userId, {
          userId: r.userId,
          userName: r.userName || "—",
          totalMinutes: 0,
        });
      }

      map.get(r.userId).totalMinutes += r.totalMinutes || 0;
    }

    return Array.from(map.values()).sort(
      (a, b) => b.totalMinutes - a.totalMinutes
    );
  }, [rows]);


  // ✅ BY USER → PROJECT BREAKDOWN (NEW)
  const byUserWithProjects = useMemo(() => {
    const map = new Map();

    for (const r of rows || []) {
      if (!r.userId) continue;

      if (!map.has(r.userId)) {
        map.set(r.userId, {
          userId: r.userId,
          userName: r.userName || "—",
          totalMinutes: 0,
          projects: new Map(),
        });
      }

      const user = map.get(r.userId);
      user.totalMinutes += r.totalMinutes || 0;

      const pid = r.projectId || "custom";
      const pname = r.projectName || "(Custom Task)";

      if (!user.projects.has(pid)) {
        user.projects.set(pid, {
          projectId: pid,
          projectName: pname,
          totalMinutes: 0,
        });
      }

      user.projects.get(pid).totalMinutes += r.totalMinutes || 0;
    }

    return Array.from(map.values()).map(u => ({
      ...u,
      projects: Array.from(u.projects.values()),
    }));
  }, [rows]);

  const projectsTree = useMemo(() => {
    const map = new Map();

    for (const r of rows || []) {
      const pid = r.projectId || "custom";
      const pname = r.projectName || "(Custom Task)";
      const cname = r.companyName || "—";
      const uid = r.userId || r.userName;
      const uname = r.userName || "—";

      if (!map.has(pid)) {
        map.set(pid, {
          projectId: pid,
          projectName: pname,
          companyName: cname,
          totalMinutes: 0,
          users: new Map(),
        });
      }

      const proj = map.get(pid);
      proj.totalMinutes += r.totalMinutes || 0;

      if (!proj.users.has(uid)) {
        proj.users.set(uid, {
          userId: uid,
          userName: uname,
          totalMinutes: 0,
          dates: [],
        });
      }

      const user = proj.users.get(uid);
      user.totalMinutes += r.totalMinutes || 0;

      user.dates.push({
        date: r.date,
        minutes: r.totalMinutes || 0,
      });
    }

    return Array.from(map.values()).map(p => ({
      ...p,
      users: Array.from(p.users.values()),
    })).sort((a, b) => b.totalMinutes - a.totalMinutes);

  }, [rows]);


  // ✅ EXPORT "BY USER" CSV
  function exportByUserCSV() {
    if (!byUserSummary || byUserSummary.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["User", unit === "hours" ? "TotalHours" : "TotalMinutes"];
    const lines = [headers.join(",")];

    byUserSummary.forEach((u) => {
      const value =
        unit === "hours"
          ? Math.round((u.totalMinutes / 60) * 100) / 100
          : Math.round(u.totalMinutes);

      lines.push(`"${u.userName}",${value}`);
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `by-user_${from}_to_${to}_${unit}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }




  const convertValue = (minutes) => (unit === "hours" ? (Math.round((minutes / 60) * 100) / 100) : Math.round(minutes));

  /* ---------- UI ---------- */
  return (
    <div className="space-y-6">
      {/* Header + Date Range + Export */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">

        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Daily Work Report
          </h2>

          <p className="text-xs text-gray-500">Range: {from} → {to}</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker from={from} to={to} onChange={(r) => setRange(r)} />
          {/* Quick Range */}
          <div className="flex gap-1">
            <button
              onClick={() => {
                const d = new Date();
                const t = iso(d);
                setRange({ from: t, to: t });
              }}
              className="rounded border px-3 py-1 text-xs bg-white hover:bg-gray-50"
              title="Show only today"
            >
              Today
            </button>
            <button
              onClick={() => {
                const s = startOfWeek(new Date());
                const e = endOfWeek(new Date());
                setRange({ from: iso(s), to: iso(e) });
              }}
              className="rounded border px-3 py-1 text-xs bg-white hover:bg-gray-50"
              title="Show this calendar week"
            >
              This Week
            </button>
          </div>
          {/* Units */}
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-xs"
            title="Display + export units"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
          </select>

          <button
            onClick={handleExportCSV}
            disabled={downloading}
            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-black disabled:opacity-60"
          >
            {downloading ? "Exporting…" : "Export CSV"}
          </button>
        </div>


      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Company</label>
            <select
              value={filters.company}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  company: e.target.value,
                  category: "",
                  project: "",
                })
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {companies.map((c) => (
                <option key={c._id ?? c.id ?? c.name} value={c._id ?? c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Category</label>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value, project: "" })
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={!filters.company}
            >
              <option value="">All</option>
              {categories.map((g) => (
                <option key={g._id ?? g.id ?? g.name} value={g._id ?? g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Project</label>
            <select
              value={filters.project}
              onChange={(e) =>
                setFilters({ ...filters, project: e.target.value })
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={!projects.length}
            >
              <option value="">All</option>
              {projects.map((p) => (
                <option key={p._id ?? p.id ?? p.name} value={p._id ?? p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Employee</label>
            <select
              value={filters.user}
              onChange={(e) =>
                setFilters({ ...filters, user: e.target.value })
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {users.map((u) => {
                const key = u._id ?? u.id ?? u.email ?? u.name;
                const value = u._id ?? u.id ?? u.email;
                return (
                  <option key={String(key)} value={value}>
                    {u.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Machine (PC)</label>
            <select
              value={filters.machine}
              onChange={(e) =>
                setFilters({ ...filters, machine: e.target.value })
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {machines.map((m) => (
                <option key={String(m.value)} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">

        {["raw", "user", "project"].map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg px-3 py-1.5 text-sm border ${tab === k
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white border-gray-300"
              }`}
          >
            {k === "raw" ? "Raw Sessions" : k === "user" ? "By User" : "By Project"}
          </button>
        ))}
      </div>

      {/* Raw Sessions */}
      {tab === "raw" && (

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-auto">
          <p className="text-sm text-gray-500 px-10">
            Sessions
          </p>

          <table className=" text-sm border-separate border-spacing-y-1">

            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 text-left"
                >Date</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 text-left"
                >User</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 text-left"
                >Company</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 text-left"
                >Category</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 text-left"
                >Project</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 text-left"
                >PC</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Total ({unit === "hours" ? "h" : "min"})
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 text-left"
                >Status</th>

                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 text-left"
                >Elapsed (hh:mm:ss.cc)</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 text-left"
                >Sessions</th>
              </tr>
            </thead>

            <tbody>
              {(!grouped || !grouped.length) && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {loading ? "Loading…" : "No data"}
                  </td>
                </tr>
              )}

              {grouped.map((g) => {
                const statuses = Object.values(g.projects || {})
                  .flatMap(p => p.sessions || [])
                  .map(s => s.status)
                  .filter(Boolean);

                // ✅ FIND LATEST PROJECT BASED ON LAST SEGMENT END TIME
                let latestProject = "—";
                let latestEndTime = 0;

                Object.values(g.projects || {}).forEach((p) => {
                  p.sessions?.forEach((s) => {
                    s.segments?.forEach((seg) => {
                      if (seg.end) {
                        const end = new Date(seg.end).getTime();
                        if (end > latestEndTime) {
                          latestEndTime = end;
                          latestProject = p.projectName;
                        }
                      }
                    });
                  });
                });


                let latestStatus = "—";
                if (statuses.includes("active")) latestStatus = "active";
                else if (statuses.includes("paused")) latestStatus = "paused";
                else if (statuses.includes("stopped")) latestStatus = "stopped";


                const isOpen = !!expanded[g.key];
                const sessionCount = Object.values(g.projects || {}).reduce(
                  (acc, p) => acc + (p.sessions?.length || 0),
                  0
                );

                const totalConverted = convertValue(g.totalMinutes || 0);

                return (
                  <React.Fragment key={g.key}>
                    <tr className="bg-white shadow-sm rounded-md">

                      <td className="px-3 py-2 align-top"
                      >{g.date}</td>
                      <td className="px-3 py-2 align-top"
                      >{g.userName}</td>
                      <td className="px-3 py-2 align-top"
                      >{g.companyName}</td>
                      <td className="px-3 py-2 align-top"
                      >{g.categoryName}</td>
                      <td className="px-3 py-2 align-top"
                      >{latestProject}</td>

                      <td className="px-3 py-2 align-top"
                      >{g.hostnameStr}</td>
                      <td className="px-3 py-2 align-top"
                      >{totalConverted}</td>
                      <td className="px-3 py-2 align-top"
                      >
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${latestStatus === "active"
                            ? "bg-green-100 text-green-700"
                            : latestStatus === "paused"
                              ? "bg-yellow-100 text-yellow-700"
                              : latestStatus === "stopped"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                        >
                          {latestStatus}
                        </span>
                        {g.reason && (
                          <div className="text-[10px] text-gray-500 mt-1">
                            ({g.reason.replace("_", " ")})
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono">
                        {hhmmssccFromMinutes(g.totalMinutes || 0)}
                      </td>
                      <td className="px-3 py-2 align-top"
                      >
                        <button
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [g.key]: !prev[g.key] }))
                          }
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          {isOpen ? "Hide times" : `View times (${sessionCount})`}
                        </button>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="bg-gray-100">

                        <td colSpan={9} className="px-4 py-4">
                          <div className="space-y-4">
                            {Object.values(g.projects || {}).map((p, idx) => {
                              // ✅ Flatten all segments into ONE list
                              const allSegments = p.sessions
                                .flatMap(s => s.segments || [])
                                .filter(seg => seg.start && seg.end);

                              // ✅ Remove exact duplicates (start+end)
                              const uniqueSegments = Array.from(
                                new Map(
                                  allSegments.map(seg => [
                                    `${seg.start}-${seg.end}`,
                                    seg
                                  ])
                                ).values()
                              );

                              // ✅ Sort by start time
                              uniqueSegments.sort(
                                (a, b) => new Date(a.start) - new Date(b.start)
                              );

                              return (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-gray-200 bg-white p-4"
                                >
                                  {/* Project Header */}
                                  <div className="mb-2 font-medium text-gray-800">
                                    Project: {p.projectName}
                                  </div>

                                  {/* Numbered Sessions */}
                                  <ol className="list-decimal pl-5 text-xs space-y-1 text-gray-700">

                                    {uniqueSegments.map((seg, i) => (
                                      <li key={i} className="font-mono">
                                        {time12(seg.start)} → {time12(seg.end)}

                                        {seg.manual && (
                                          <>
                                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                              Manual
                                            </span>
                                            {seg.remarkText && (
                                              <div className="text-xs text-gray-500 mt-1">
                                                Remark: {seg.remarkText}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </li>

                                    ))}
                                  </ol>
                                </div>
                              );
                            })}

                          </div>
                        </td>
                      </tr>
                    )}

                  </React.Fragment>
                );
              })}
            </tbody>

            {grouped.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t">
                  <td className="px-4 py-3 font-medium" colSpan={6}>
                    Total
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {convertValue(
                      grouped.reduce((acc, g) => acc + (g.totalMinutes || 0), 0)
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {hhmmssccFromMinutes(
                      grouped.reduce((acc, g) => acc + (g.totalMinutes || 0), 0)
                    )}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* By User */}
      {tab === "user" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-auto">

          <div className="flex items-center justify-end px-4 py-2">

            
              <button
                onClick={exportByUserCSV}
                className="rounded-lg bg-gray-900 text-white px-4 py-1 text-sm hover:bg-black"
              >
                Export By User
              </button>
          

          </div>


          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 text-left"
                >User</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 text-left"
                >
                  Total ({unit === "hours" ? "Hours" : "Minutes"})
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 text-left"
                >Details</th>
              </tr>
            </thead>


            <tbody>
              {byUserWithProjects.map((u) => {
                const isOpen = expandedUser[u.userId];

                return (
                  <React.Fragment key={u.userId}>
                    {/* USER ROW */}
                    <tr className="border-t bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {u.userName}
                      </td>

                      <td className="px-3 py-2 align-top"
                      >
                        {unit === "hours"
                          ? Math.round((u.totalMinutes / 60) * 100) / 100
                          : Math.round(u.totalMinutes)}
                      </td>

                      <td className="px-3 py-2 align-top"
                      >
                        <button
                          onClick={() =>
                            setExpandedUser(prev => ({
                              ...prev,
                              [u.userId]: !prev[u.userId],
                            }))
                          }
                          className="rounded border px-2 py-1 text-xs"
                        >
                          {isOpen ? "Hide Projects" : "View Projects"}
                        </button>
                      </td>
                    </tr>

                    {/* PROJECT ROWS */}
                    {isOpen && (
                      <tr>
                        <td colSpan={3} className="px-6 py-3">
                          <table className="min-w-full text-sm border">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left">Project</th>
                                <th className="px-3 py-2 text-left">
                                  Total ({unit === "hours" ? "Hours" : "Minutes"})
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {u.projects.map((p) => (
                                <tr key={p.projectId} className="border-t">
                                  <td className="px-3 py-2">{p.projectName}</td>
                                  <td className="px-3 py-2">
                                    {unit === "hours"
                                      ? Math.round((p.totalMinutes / 60) * 100) / 100
                                      : Math.round(p.totalMinutes)}
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
        </div>
      )}


      {/* By Project */}
      {tab === "project" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-auto">

          <div className="flex justify-end px-4 py-2">
            <ExportProjectExcel projectsTree={projectsTree} from={from} to={to} unit={unit} />

          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Project</th>
                <th className="px-3 py-2 text-left">
                  Total 
                </th>
                <th className="px-3 py-2 text-left">Details</th>
              </tr>
            </thead>

            <tbody>
              {!projectsTree.length && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    No data
                  </td>
                </tr>
              )}

              {projectsTree.map((p) => {
                const openProject = expandedProject[p.projectId];

                return (
                  <React.Fragment key={p.projectId}>

                    {/* PROJECT ROW */}
                    <tr className="border-t bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="font-medium">{p.projectName}</div>
                        <div className="text-xs text-gray-500">{p.companyName}</div>
                      </td>

                      <td className="px-3 py-2">
                        {formatHHMMSS(p.totalMinutes)}
                      </td>

                      <td className="px-3 py-2">
                        <button
                          onClick={() =>
                            setExpandedProject(prev => ({
                              ...prev,
                              [p.projectId]: !prev[p.projectId],
                            }))
                          }
                          className="rounded border px-2 py-1 text-xs"
                        >
                          {openProject ? "Hide Users" : "View Users"}
                        </button>
                      </td>
                    </tr>

                    {/* USERS TABLE */}
                    {openProject && (
                      <tr>
                        <td colSpan={3} className="px-6 py-3 bg-gray-50">
                          <table className="min-w-full text-sm border">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left">User</th>
                                <th className="px-3 py-2 text-left">
                                  Total ({unit === "hours" ? "h" : "min"})
                                </th>
                                <th className="px-3 py-2 text-left">Dates</th>
                              </tr>
                            </thead>

                            <tbody>
                              {p.users.map(u => {
                                const key = `${p.projectId}_${u.userId}`;
                                const openUser = expandedProjectUser[key];

                                return (
                                  <React.Fragment key={key}>

                                    {/* USER ROW */}
                                    <tr className="border-t bg-white">
                                      <td className="px-3 py-2">{u.userName}</td>
                                      <td className="px-3 py-2">
                                        {formatHHMMSS(u.totalMinutes)}
                                      </td>

                                      <td className="px-3 py-2">
                                        <button
                                          onClick={() =>
                                            setExpandedProjectUser(prev => ({
                                              ...prev,
                                              [key]: !prev[key],
                                            }))
                                          }
                                          className="rounded border px-2 py-1 text-xs"
                                        >
                                          {openUser ? "Hide Dates" : "View Dates"}
                                        </button>
                                      </td>
                                    </tr>

                                    {/* DATE ROWS */}
                                    {openUser && (
                                      <tr>
                                        <td colSpan={3} className="px-6 py-3">
                                          <table className="min-w-full text-sm border">
                                            <thead className="bg-gray-100">
                                              <tr>
                                                <th className="px-3 py-2 text-left">Date</th>
                                                <th className="px-3 py-2 text-left">
                                                  Time ({unit === "hours" ? "h" : "min"})
                                                </th>
                                              </tr>
                                            </thead>

                                            <tbody>
                                              {u.dates.map((d, i) => (
                                                <tr key={i} className="border-t">
                                                  <td className="px-3 py-2">{d.date}</td>
                                                  <td className="px-3 py-2">
                                                    {formatHHMMSS(d.minutes)}
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
                        </td>
                      </tr>
                    )}

                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
