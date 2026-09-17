import React, { useEffect, useMemo, useState } from "react";
import {
  RotateCw,
  Building2,
  FolderKanban,
  Users as UsersIcon,
  Clock,
  Download,
  Search,
  X,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
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

function formatHoursAndMins(mins) {
  const m = Math.round(mins || 0);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h === 0) return `${remM}m`;
  if (remM === 0) return `${h}h`;
  return `${h}h ${remM}m`;
}

function time12(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
}

function getLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

function endOfWeek(d = new Date()) {
  const s = startOfWeek(d);
  const e = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  e.setDate(s.getDate() + 6);
  return e;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export default function AdminDailyReport({ auth }) {
  /* ---------- state ---------- */
  const [{ from, to }, setRange] = useState(() => {
    const today = getLocalDateStr(new Date());
    return { from: today, to: today };
  });

  const [unit, setUnit] = useState("hours"); // default hours for management clarity

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

  // Tabs: "raw" | "company" | "project" | "user"
  const [tab, setTab] = useState("raw");
  const [tableSearch, setTableSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [downloading, setDownloading] = useState(false);

  const [expandedCompany, setExpandedCompany] = useState({});
  const [expandedUser, setExpandedUser] = useState({});
  const [expandedProject, setExpandedProject] = useState({});
  const [expandedProjectUser, setExpandedProjectUser] = useState({});
  const [toastMsg, setToastMsg] = useState("");

  function showToast(text) {
    setToastMsg(text);
    setTimeout(() => setToastMsg(""), 4000);
  }

  /* ---------- Export Raw CSV ---------- */
  async function handleExportCSV() {
    try {
      setDownloading(true);

      const qs = new URLSearchParams({
        from,
        to,
        group: "compact",
        unit,
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
      showToast("Export failed. Please check connection.");
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
        .map((x) => ({ ...x, _id: x._id ?? x.id }))
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
    try {
      const qs = new URLSearchParams({
        ...(filters.company ? { company: filters.company } : {}),
        ...(filters.category ? { category: filters.category } : {}),
      }).toString();
      const list = await api(
        `/api/projects${qs ? `?${qs}` : ""}`,
        { token: auth.token }
      );
      setProjects(list || []);
    } catch {
      setProjects([]);
    }
  }

  /* ---------- data ---------- */
  async function loadRaw() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        from,
        to,
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

  /* ---------- effects ---------- */
  useEffect(() => {
    loadMasters();
    loadMachines();
    loadProjects();
  }, []);

  useEffect(() => {
    loadProjects();
  }, [filters.company, filters.category]);

  useEffect(() => {
    loadRaw();
  }, [from, to, filters.company, filters.category, filters.project, filters.user, filters.machine]);

  const convertValue = (minutes) =>
    unit === "hours"
      ? Math.round((minutes / 60) * 100) / 100
      : Math.round(minutes);

  /* ---------- KPI METRICS ---------- */
  const kpis = useMemo(() => {
    const totalMinutes = (rows || []).reduce((acc, r) => acc + (r.totalMinutes || 0), 0);
    const uniqueCompanies = new Set(
      (rows || []).map((r) => r.companyName).filter((c) => c && c !== "—")
    ).size;
    const uniqueProjects = new Set(
      (rows || []).map((r) => r.projectName).filter((p) => p && p !== "—")
    ).size;
    const uniqueUsers = new Set(
      (rows || []).map((r) => r.userId).filter(Boolean)
    ).size;
    const totalSessions = (rows || []).length;

    return {
      totalMinutes,
      uniqueCompanies,
      uniqueProjects,
      uniqueUsers,
      totalSessions,
    };
  }, [rows]);

  /* ---------- grouping for RAW ---------- */
  const grouped = useMemo(() => {
    const map = new Map();

    for (const r of rows || []) {
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
          pcs: new Set(),
          hostnameStr: "—",
          projects: {},
        });
      }

      const g = map.get(key);
      g.totalMinutes += r.totalMinutes || 0;

      const pc = r.machineInfo?.hostname || r.machineId || r.hostname || "";
      if (pc) {
        g.pcs.add(pc);
      }

      const pid = r.projectId || "unknown";
      const projKey = `${pid}_${r.taskId || r.taskTitle || "none"}`;

      if (!g.projects[projKey]) {
        g.projects[projKey] = {
          projectName: r.projectName || (r.customTask ? "(Custom Task)" : "—"),
          taskTitle: r.taskTitle || (r.customTask ? r.customTask : null),
          totalMinutes: 0,
          sessions: [],
        };
      }

      g.projects[projKey].totalMinutes += r.totalMinutes || 0;

      g.projects[projKey].sessions.push({
        status: r.status,
        taskTitle: r.taskTitle,
        remarks: r.remarks || "",
        manualRemarks: r.manualRemarks || [],
        segments: r.segments || [],
      });
    }

    for (const g of map.values()) {
      g.hostnameStr = g.pcs.size > 0 ? Array.from(g.pcs).join(", ") : "—";
    }

    let list = Array.from(map.values()).sort((a, b) => (a.date > b.date ? -1 : 1));

    if (tableSearch.trim()) {
      const s = tableSearch.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.userName.toLowerCase().includes(s) ||
          g.companyName.toLowerCase().includes(s) ||
          g.categoryName.toLowerCase().includes(s) ||
          Object.values(g.projects).some((p) => p.projectName.toLowerCase().includes(s))
      );
    }

    return list;
  }, [rows, tableSearch]);

  /* ---------- BY COMPANY TREE (NEW & POWERFUL) ---------- */
  const companiesTree = useMemo(() => {
    const map = new Map();

    for (const r of rows || []) {
      const cname = r.companyName && r.companyName !== "—" ? r.companyName : "General / Internal";
      const pid = r.projectId || "custom";
      const pname = r.projectName || (r.customTask ? "(Custom Task)" : "General Project");
      const uid = r.userId || r.userName || "unknown";
      const uname = r.userName || "Unknown";

      if (!map.has(cname)) {
        map.set(cname, {
          companyName: cname,
          totalMinutes: 0,
          projects: new Map(),
        });
      }

      const comp = map.get(cname);
      comp.totalMinutes += r.totalMinutes || 0;

      if (!comp.projects.has(pid)) {
        comp.projects.set(pid, {
          projectId: pid,
          projectName: pname,
          totalMinutes: 0,
          users: new Map(),
        });
      }

      const proj = comp.projects.get(pid);
      proj.totalMinutes += r.totalMinutes || 0;

      if (!proj.users.has(uid)) {
        proj.users.set(uid, {
          userId: uid,
          userName: uname,
          totalMinutes: 0,
        });
      }

      proj.users.get(uid).totalMinutes += r.totalMinutes || 0;
    }

    let list = Array.from(map.values())
      .map((c) => ({
        ...c,
        projects: Array.from(c.projects.values()).map((p) => ({
          ...p,
          users: Array.from(p.users.values()).sort((a, b) => b.totalMinutes - a.totalMinutes),
        })).sort((a, b) => b.totalMinutes - a.totalMinutes),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    if (tableSearch.trim()) {
      const s = tableSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.companyName.toLowerCase().includes(s) ||
          c.projects.some((p) => p.projectName.toLowerCase().includes(s))
      );
    }

    return list;
  }, [rows, tableSearch]);

  /* ---------- EXPORT COMPANY REPORT (EXCEL) ---------- */
  function exportCompanyExcel() {
    if (!companiesTree || companiesTree.length === 0) {
      showToast("No company data available to export.");
      return;
    }

    const exportRows = [];
    exportRows.push([
      "Company Name",
      "Project Name",
      "Team Contributors (Hours)",
      `Total (${unit === "hours" ? "Hours" : "Minutes"})`,
      "Formatted Time (HH:MM:SS)",
    ]);

    companiesTree.forEach((comp) => {
      // Company Summary Row
      exportRows.push([
        comp.companyName,
        `[ALL PROJECTS - ${comp.projects.length} Total]`,
        comp.projects.flatMap((p) => p.users.map((u) => u.userName)).filter((v, i, a) => a.indexOf(v) === i).join(", "),
        unit === "hours"
          ? Math.round((comp.totalMinutes / 60) * 100) / 100
          : Math.round(comp.totalMinutes),
        formatHHMMSS(comp.totalMinutes),
      ]);

      // Individual Projects
      comp.projects.forEach((proj) => {
        const teamStr = proj.users
          .map((u) => `${u.userName} (${formatHHMMSS(u.totalMinutes)})`)
          .join("; ");

        exportRows.push([
          `  ${comp.companyName}`,
          proj.projectName,
          teamStr,
          unit === "hours"
            ? Math.round((proj.totalMinutes / 60) * 100) / 100
            : Math.round(proj.totalMinutes),
          formatHHMMSS(proj.totalMinutes),
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(exportRows);
    ws["!cols"] = [{ wch: 28 }, { wch: 34 }, { wch: 55 }, { wch: 20 }, { wch: 25 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Company Work Hours");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `company_work_hours_${from}_to_${to}.xlsx`
    );
  }

  /* ---------- BY USER WITH PROJECTS ---------- */
  const byUserWithProjects = useMemo(() => {
    const map = new Map();

    for (const r of rows || []) {
      if (!r.userId) continue;

      if (!map.has(r.userId)) {
        map.set(r.userId, {
          userId: r.userId,
          userName: r.userName || "—",
          companyName: r.companyName || "—",
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

    let list = Array.from(map.values()).map((u) => ({
      ...u,
      projects: Array.from(u.projects.values()).sort((a, b) => b.totalMinutes - a.totalMinutes),
    })).sort((a, b) => b.totalMinutes - a.totalMinutes);

    if (tableSearch.trim()) {
      const s = tableSearch.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.userName.toLowerCase().includes(s) ||
          u.projects.some((p) => p.projectName.toLowerCase().includes(s))
      );
    }

    return list;
  }, [rows, tableSearch]);

  /* ---------- PROJECTS TREE ---------- */
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

    let list = Array.from(map.values())
      .map((p) => ({
        ...p,
        users: Array.from(p.users.values()).sort((a, b) => b.totalMinutes - a.totalMinutes),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    if (tableSearch.trim()) {
      const s = tableSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.projectName.toLowerCase().includes(s) ||
          p.companyName.toLowerCase().includes(s) ||
          p.users.some((u) => u.userName.toLowerCase().includes(s))
      );
    }

    return list;
  }, [rows, tableSearch]);

  // EXPORT BY USER CSV
  function exportByUserCSV() {
    if (!byUserWithProjects || byUserWithProjects.length === 0) {
      showToast("No user data available to export.");
      return;
    }

    const lines = [];
    lines.push(`"Employee","Projects","Total ${unit === "hours" ? "Hours" : "Minutes"}","Formatted Time"`);

    byUserWithProjects.forEach((u) => {
      const value =
        unit === "hours"
          ? Math.round((u.totalMinutes / 60) * 100) / 100
          : Math.round(u.totalMinutes);
      const projList = u.projects.map((p) => p.projectName).join("; ");
      lines.push(`"${u.userName}","${projList}",${value},"${formatHHMMSS(u.totalMinutes)}"`);
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

  const hasActiveFilters = Boolean(
    filters.company || filters.category || filters.project || filters.user || filters.machine
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Daily Work & Hours Report
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Detailed breakdown of company billing hours, project timelines, and employee activities.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Date Range & Control Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker from={from} to={to} onChange={(r) => setRange(r)} />

            <button
              onClick={() => {
                const t = getLocalDateStr(new Date());
                setRange({ from: t, to: t });
              }}
              className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Today
            </button>

            <button
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                const yt = getLocalDateStr(y);
                setRange({ from: yt, to: yt });
              }}
              className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Yesterday
            </button>

            <button
              onClick={() => {
                const s = startOfWeek(new Date());
                const e = endOfWeek(new Date());
                setRange({ from: getLocalDateStr(s), to: getLocalDateStr(e) });
              }}
              className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              This Week
            </button>

            <button
              onClick={() => {
                const s = startOfMonth(new Date());
                const e = endOfMonth(new Date());
                setRange({ from: getLocalDateStr(s), to: getLocalDateStr(e) });
              }}
              className="h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              This Month
            </button>

            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="hours">Hours (h)</option>
              <option value="minutes">Minutes (m)</option>
            </select>

            <button
              onClick={loadRaw}
              disabled={loading}
              title="Refresh Report Data"
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={downloading}
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloading ? "Exporting…" : "Export All CSV"}</span>
            </button>
          </div>
        </div>

        {/* 5 Top Summary Metric Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-blue-200/70 bg-blue-50/50 p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-blue-700">
              <span>Total Hours Logged</span>
              <Clock className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="mt-1 text-2xl font-extrabold text-blue-900">
              {formatHoursAndMins(kpis.totalMinutes)}
            </div>
            <div className="text-[11px] font-semibold text-blue-700/80">
              {formatHHMMSS(kpis.totalMinutes)} elapsed
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>Active Companies</span>
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-900">
              {kpis.uniqueCompanies}
            </div>
            <div className="text-[11px] text-emerald-700/80">Client organizations</div>
          </div>

          <div className="rounded-2xl border border-sky-200/70 bg-sky-50/50 p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-sky-700">
              <span>Active Projects</span>
              <FolderKanban className="h-3.5 w-3.5 text-sky-600" />
            </div>
            <div className="mt-1 text-2xl font-extrabold text-sky-900">
              {kpis.uniqueProjects}
            </div>
            <div className="text-[11px] text-sky-700/80">Projects with activity</div>
          </div>

          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-amber-700">
              <span>Active Employees</span>
              <UsersIcon className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="mt-1 text-2xl font-extrabold text-amber-900">
              {kpis.uniqueUsers}
            </div>
            <div className="text-[11px] text-amber-700/80">Logged work in range</div>
          </div>

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 sm:col-span-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Recorded Sessions</span>
              <Layers className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">
              {kpis.totalSessions}
            </div>
            <div className="text-[11px] text-slate-500">Timer segments</div>
          </div>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Filter Records</h3>
            {hasActiveFilters && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                Filters Active
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilters({
                  company: "",
                  category: "",
                  project: "",
                  user: "",
                  machine: "",
                });
                setTableSearch("");
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
            >
              <X className="h-3.5 w-3.5" />
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Company */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Company
            </label>
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
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Companies ({companies.length})</option>
              {companies.map((c) => (
                <option key={c._id ?? c.id ?? c.name} value={c._id ?? c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value, project: "" })
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((g) => (
                <option key={g._id ?? g.id ?? g.name} value={g._id ?? g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Project
            </label>
            <select
              value={filters.project}
              onChange={(e) =>
                setFilters({ ...filters, project: e.target.value })
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p._id ?? p.id ?? p.name} value={p._id ?? p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Employee
            </label>
            <select
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Employees ({users.length})</option>
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

          {/* Machine */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Machine / PC
            </label>
            <select
              value={filters.machine}
              onChange={(e) =>
                setFilters({ ...filters, machine: e.target.value })
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Machines ({machines.length})</option>
              {machines.map((m) => (
                <option key={String(m.value)} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs + Search Box */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap rounded-2xl bg-slate-100 p-1.5">
          {[
            { id: "raw", label: "Raw Sessions", count: grouped.length },
            { id: "company", label: "By Company", count: companiesTree.length },
            { id: "project", label: "By Project", count: projectsTree.length },
            { id: "user", label: "By User", count: byUserWithProjects.length },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                tab === item.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  tab === item.id
                    ? "bg-slate-800 text-slate-200"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {/* In-report instant search box */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Search in visible records…"
            className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500"
          />
          {tableSearch && (
            <button
              onClick={() => setTableSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/* TAB 1: RAW SESSIONS                                       */}
      {/* ========================================================== */}
      {tab === "raw" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-bold text-slate-900">Session Logs</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {grouped.length} Grouped Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">Company</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Project</th>
                  <th className="px-4 py-3.5">Task Name</th>
                  <th className="px-4 py-3.5">PC</th>
                  <th className="px-4 py-3.5">
                    Total ({unit === "hours" ? "h" : "min"})
                  </th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Elapsed</th>
                  <th className="px-4 py-3.5 text-right">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {grouped.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-16 text-center text-slate-400">
                      {loading ? "Loading sessions…" : "No session records found matching your filters."}
                    </td>
                  </tr>
                )}

                {grouped.map((g) => {
                  const statuses = Object.values(g.projects || {})
                    .flatMap((p) => p.sessions || [])
                    .map((s) => s.status)
                    .filter(Boolean);

                  let latestProject = "—";
                  let latestTaskTitle = "—";
                  let latestTime = 0;

                  Object.values(g.projects || {}).forEach((p) => {
                    if (latestProject === "—" && p.projectName) {
                      latestProject = p.projectName;
                      latestTaskTitle = p.taskTitle || "—";
                    }
                    p.sessions?.forEach((s) => {
                      if (s.status === "active") {
                        latestProject = p.projectName;
                        latestTaskTitle = p.taskTitle || "—";
                      }
                      s.segments?.forEach((seg) => {
                        const t = new Date(seg.end || seg.start || 0).getTime();
                        if (t > latestTime) {
                          latestTime = t;
                          latestProject = p.projectName;
                          latestTaskTitle = p.taskTitle || "—";
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

                  return (
                    <React.Fragment key={g.key}>
                      <tr className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                          {g.date}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900">
                          {g.userName}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{g.companyName}</td>
                        <td className="px-4 py-3.5 text-slate-600">{g.categoryName}</td>
                        <td className="px-4 py-3.5 font-semibold text-blue-700">
                          {latestProject}
                        </td>
                        <td className="px-4 py-3.5">
                          {latestTaskTitle && latestTaskTitle !== "—" ? (
                            <span className="inline-flex items-center rounded-lg border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              {latestTaskTitle}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs">
                          {g.hostnameStr}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {convertValue(g.totalMinutes || 0)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                              latestStatus === "active"
                                ? "border border-emerald-200/80 bg-emerald-50 text-emerald-700"
                                : latestStatus === "paused"
                                ? "border border-amber-200/80 bg-amber-50 text-amber-700"
                                : latestStatus === "stopped"
                                ? "border border-rose-200/80 bg-rose-50 text-rose-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {latestStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-700">
                          {hhmmssccFromMinutes(g.totalMinutes || 0)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [g.key]: !prev[g.key],
                              }))
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            {isOpen ? "Hide times" : `View times (${sessionCount})`}
                          </button>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={11} className="px-6 py-4">
                            <div className="space-y-3">
                              {Object.values(g.projects || {}).map((p, idx) => {
                                const allSegments = p.sessions
                                  .flatMap((s) => s.segments || [])
                                  .filter((seg) => seg && seg.start);

                                const uniqueSegments = Array.from(
                                  new Map(
                                    allSegments.map((seg) => [
                                      `${seg.start}-${seg.end || "running"}`,
                                      seg,
                                    ])
                                  ).values()
                                );

                                uniqueSegments.sort(
                                  (a, b) => new Date(a.start) - new Date(b.start)
                                );

                                return (
                                  <div
                                    key={idx}
                                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                                  >
                                    <div className="mb-2.5 flex flex-wrap items-center gap-2 font-bold text-slate-900">
                                      <span>Project: {p.projectName}</span>
                                      {p.taskTitle && (
                                        <span className="rounded-lg border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                          Task: {p.taskTitle}
                                        </span>
                                      )}
                                    </div>

                                    <ol className="list-decimal space-y-1.5 pl-5 text-xs text-slate-700 font-mono">
                                      {uniqueSegments.map((seg, i) => (
                                        <li key={i}>
                                          {time12(seg.start)} →{" "}
                                          {seg.end ? (
                                            time12(seg.end)
                                          ) : (
                                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 animate-pulse font-sans">
                                              Running now...
                                            </span>
                                          )}

                                          {seg.manual && (
                                            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 font-sans">
                                              Manual Entry
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                    </ol>

                                    {p.sessions.some(
                                      (s) =>
                                        s.remarks ||
                                        (s.manualRemarks && s.manualRemarks.length > 0)
                                    )}
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
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <td className="px-4 py-3.5" colSpan={7}>
                      Total Summary ({grouped.length} Records)
                    </td>
                    <td className="px-4 py-3.5">
                      {convertValue(
                        grouped.reduce((acc, g) => acc + (g.totalMinutes || 0), 0)
                      )}
                    </td>
                    <td />
                    <td className="px-4 py-3.5 font-mono">
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
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 2: BY COMPANY (NEW - FULL COMPANY BREAKDOWN)          */}
      {/* ========================================================== */}
      {tab === "company" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-900">
                Company Working Hours
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {companiesTree.length} Companies
              </span>
            </div>

            <button
              onClick={exportCompanyExcel}
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Company Report (Excel)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Company Name</th>
                  <th className="px-5 py-3.5">Projects Count</th>
                  <th className="px-5 py-3.5">
                    Total ({unit === "hours" ? "Hours" : "Minutes"})
                  </th>
                  <th className="px-5 py-3.5">Elapsed Time</th>
                  <th className="px-5 py-3.5 text-right">Project Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {companiesTree.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                      {loading ? "Loading company hours…" : "No company work records found."}
                    </td>
                  </tr>
                )}

                {companiesTree.map((c) => {
                  const isOpen = expandedCompany[c.companyName];

                  return (
                    <React.Fragment key={c.companyName}>
                      <tr className="transition hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span>{c.companyName}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                            {c.projects.length} {c.projects.length === 1 ? "project" : "projects"}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-extrabold text-blue-700">
                          {unit === "hours"
                            ? Math.round((c.totalMinutes / 60) * 100) / 100
                            : Math.round(c.totalMinutes)}
                        </td>

                        <td className="px-5 py-4 font-mono font-semibold text-slate-700">
                          {formatHHMMSS(c.totalMinutes)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() =>
                              setExpandedCompany((prev) => ({
                                ...prev,
                                [c.companyName]: !prev[c.companyName],
                              }))
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            <span>{isOpen ? "Hide Projects" : "View Projects"}</span>
                            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Projects under this company */}
                      {isOpen && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={5} className="px-8 py-4">
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                              <table className="min-w-full text-sm">
                                <thead className="bg-slate-100/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                                  <tr>
                                    <th className="px-4 py-3 text-left">Project Name</th>
                                    <th className="px-4 py-3 text-left">Team Contributors</th>
                                    <th className="px-4 py-3 text-left">
                                      Project Hours ({unit === "hours" ? "h" : "m"})
                                    </th>
                                    <th className="px-4 py-3 text-left">Elapsed Time</th>
                                  </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                  {c.projects.map((p) => (
                                    <tr key={p.projectId} className="hover:bg-slate-50">
                                      <td className="px-4 py-3 font-bold text-blue-700">
                                        <div className="flex items-center gap-1.5">
                                          <FolderKanban className="h-3.5 w-3.5 text-blue-500" />
                                          <span>{p.projectName}</span>
                                        </div>
                                      </td>

                                      <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1.5">
                                          {p.users.map((u) => (
                                            <span
                                              key={u.userId}
                                              className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
                                            >
                                              {u.userName} ({formatHHMMSS(u.totalMinutes)})
                                            </span>
                                          ))}
                                        </div>
                                      </td>

                                      <td className="px-4 py-3 font-extrabold text-slate-900">
                                        {unit === "hours"
                                          ? Math.round((p.totalMinutes / 60) * 100) / 100
                                          : Math.round(p.totalMinutes)}
                                      </td>

                                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-600">
                                        {formatHHMMSS(p.totalMinutes)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>

              {companiesTree.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <td className="px-5 py-4" colSpan={2}>
                      Grand Total ({companiesTree.length} Companies)
                    </td>
                    <td className="px-5 py-4 text-blue-700">
                      {unit === "hours"
                        ? Math.round((companiesTree.reduce((acc, c) => acc + (c.totalMinutes || 0), 0) / 60) * 100) / 100
                        : Math.round(companiesTree.reduce((acc, c) => acc + (c.totalMinutes || 0), 0))}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {formatHHMMSS(
                        companiesTree.reduce((acc, c) => acc + (c.totalMinutes || 0), 0)
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 3: BY PROJECT                                         */}
      {/* ========================================================== */}
      {tab === "project" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-900">
                Project Working Hours
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {projectsTree.length} Projects
              </span>
            </div>

            <ExportProjectExcel
              projectsTree={projectsTree}
              from={from}
              to={to}
              unit={unit}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Project Name</th>
                  <th className="px-5 py-3.5">Company</th>
                  <th className="px-5 py-3.5">
                    Total ({unit === "hours" ? "Hours" : "Minutes"})
                  </th>
                  <th className="px-5 py-3.5">Elapsed Time</th>
                  <th className="px-5 py-3.5 text-right">Team Breakdown</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {projectsTree.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                      {loading ? "Loading project hours…" : "No project records found."}
                    </td>
                  </tr>
                )}

                {projectsTree.map((p) => {
                  const openProject = expandedProject[p.projectId];

                  return (
                    <React.Fragment key={p.projectId}>
                      <tr className="transition hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-blue-600" />
                            <span>{p.projectName}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-600">
                          {p.companyName}
                        </td>

                        <td className="px-5 py-4 font-extrabold text-blue-700">
                          {unit === "hours"
                            ? Math.round((p.totalMinutes / 60) * 100) / 100
                            : Math.round(p.totalMinutes)}
                        </td>

                        <td className="px-5 py-4 font-mono font-bold text-slate-800">
                          {formatHHMMSS(p.totalMinutes)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() =>
                              setExpandedProject((prev) => ({
                                ...prev,
                                [p.projectId]: !prev[p.projectId],
                              }))
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            <span>{openProject ? "Hide Users" : "View Users"}</span>
                            {openProject ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {openProject && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={5} className="px-8 py-4">
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                              <table className="min-w-full text-sm">
                                <thead className="bg-slate-100/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                                  <tr>
                                    <th className="px-4 py-3 text-left">Team Member</th>
                                    <th className="px-4 py-3 text-left">
                                      Total ({unit === "hours" ? "h" : "m"})
                                    </th>
                                    <th className="px-4 py-3 text-left">Elapsed Time</th>
                                    <th className="px-4 py-3 text-right">Dates</th>
                                  </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                  {p.users.map((u) => {
                                    const key = `${p.projectId}_${u.userId}`;
                                    const openUser = expandedProjectUser[key];

                                    return (
                                      <React.Fragment key={key}>
                                        <tr className="hover:bg-slate-50">
                                          <td className="px-4 py-3 font-semibold text-slate-900">
                                            {u.userName}
                                          </td>
                                          <td className="px-4 py-3 font-bold text-slate-800">
                                            {unit === "hours"
                                              ? Math.round((u.totalMinutes / 60) * 100) / 100
                                              : Math.round(u.totalMinutes)}
                                          </td>
                                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                            {formatHHMMSS(u.totalMinutes)}
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <button
                                              onClick={() =>
                                                setExpandedProjectUser((prev) => ({
                                                  ...prev,
                                                  [key]: !prev[key],
                                                }))
                                              }
                                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                                            >
                                              {openUser ? "Hide Dates" : "View Dates"}
                                            </button>
                                          </td>
                                        </tr>

                                        {openUser && (
                                          <tr className="bg-slate-50">
                                            <td colSpan={4} className="px-6 py-3">
                                              <div className="flex flex-wrap gap-2">
                                                {u.dates.map((d, i) => (
                                                  <span
                                                    key={i}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs"
                                                  >
                                                    <span className="font-semibold text-slate-700">{d.date}</span>
                                                    <span className="font-mono font-bold text-blue-700">{formatHHMMSS(d.minutes)}</span>
                                                  </span>
                                                ))}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>

              {projectsTree.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <td className="px-5 py-4" colSpan={2}>
                      Grand Total ({projectsTree.length} Projects)
                    </td>
                    <td className="px-5 py-4 text-blue-700">
                      {unit === "hours"
                        ? Math.round((projectsTree.reduce((acc, p) => acc + (p.totalMinutes || 0), 0) / 60) * 100) / 100
                        : Math.round(projectsTree.reduce((acc, p) => acc + (p.totalMinutes || 0), 0))}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {formatHHMMSS(
                        projectsTree.reduce((acc, p) => acc + (p.totalMinutes || 0), 0)
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 4: BY USER                                            */}
      {/* ========================================================== */}
      {tab === "user" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-900">
                Employee Working Hours
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {byUserWithProjects.length} Employees
              </span>
            </div>

            <button
              onClick={exportByUserCSV}
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-slate-900 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export By User (CSV)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Employee Name</th>
                  <th className="px-5 py-3.5">Projects Worked</th>
                  <th className="px-5 py-3.5">
                    Total ({unit === "hours" ? "Hours" : "Minutes"})
                  </th>
                  <th className="px-5 py-3.5">Elapsed Time</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {byUserWithProjects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                      {loading ? "Loading employee hours…" : "No user work records found."}
                    </td>
                  </tr>
                )}

                {byUserWithProjects.map((u) => {
                  const isOpen = expandedUser[u.userId];

                  return (
                    <React.Fragment key={u.userId}>
                      <tr className="transition hover:bg-slate-50/80">
                        <td className="px-5 py-4 font-bold text-slate-900">
                          {u.userName}
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-600">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-bold">
                            {u.projects.length} {u.projects.length === 1 ? "project" : "projects"}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-extrabold text-blue-700">
                          {unit === "hours"
                            ? Math.round((u.totalMinutes / 60) * 100) / 100
                            : Math.round(u.totalMinutes)}
                        </td>

                        <td className="px-5 py-4 font-mono font-semibold text-slate-700">
                          {formatHHMMSS(u.totalMinutes)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() =>
                              setExpandedUser((prev) => ({
                                ...prev,
                                [u.userId]: !prev[u.userId],
                              }))
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            <span>{isOpen ? "Hide Projects" : "View Projects"}</span>
                            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={5} className="px-8 py-4">
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                              <table className="min-w-full text-sm">
                                <thead className="bg-slate-100/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                                  <tr>
                                    <th className="px-4 py-3 text-left">Project</th>
                                    <th className="px-4 py-3 text-left">
                                      Total ({unit === "hours" ? "Hours" : "Minutes"})
                                    </th>
                                    <th className="px-4 py-3 text-left">Elapsed Time</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {u.projects.map((p) => (
                                    <tr key={p.projectId} className="hover:bg-slate-50">
                                      <td className="px-4 py-3 font-semibold text-blue-700">
                                        {p.projectName}
                                      </td>
                                      <td className="px-4 py-3 font-bold text-slate-800">
                                        {unit === "hours"
                                          ? Math.round((p.totalMinutes / 60) * 100) / 100
                                          : Math.round(p.totalMinutes)}
                                      </td>
                                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                        {formatHHMMSS(p.totalMinutes)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>

              {byUserWithProjects.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <td className="px-5 py-4" colSpan={2}>
                      Grand Total ({byUserWithProjects.length} Employees)
                    </td>
                    <td className="px-5 py-4 text-blue-700">
                      {unit === "hours"
                        ? Math.round((byUserWithProjects.reduce((acc, u) => acc + (u.totalMinutes || 0), 0) / 60) * 100) / 100
                        : Math.round(byUserWithProjects.reduce((acc, u) => acc + (u.totalMinutes || 0), 0))}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {formatHHMMSS(
                        byUserWithProjects.reduce((acc, u) => acc + (u.totalMinutes || 0), 0)
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 border border-slate-700 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          <AlertCircle size={15} className="text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
          <button type="button" onClick={() => setToastMsg("")} className="ml-2 text-slate-400 hover:text-white transition">✕</button>
        </div>
      )}
    </div>
  );
}
