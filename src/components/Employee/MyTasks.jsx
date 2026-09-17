import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  CalendarDays,
  Play,
  Briefcase,
  AlertCircle,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Check,
} from "lucide-react";

const STATUS_COLORS = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS = {
  open: "Open / Planned",
  in_progress: "In Progress",
  completed: "Completed",
};

function formatMinutes(mins) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDueDateStatus(dueDateStr, status) {
  if (!dueDateStr || status === "completed") return null;
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `Overdue by ${Math.abs(diffDays)}d`, color: "text-rose-600 bg-rose-50 border-rose-200 font-bold" };
  }
  if (diffDays === 0) {
    return { text: "Due Today", color: "text-amber-700 bg-amber-50 border-amber-200 font-bold" };
  }
  if (diffDays <= 3) {
    return { text: `Due in ${diffDays}d`, color: "text-amber-600 bg-amber-50 border-amber-200" };
  }
  return { text: `Due in ${diffDays}d`, color: "text-slate-500 bg-slate-50 border-slate-200" };
}

export default function MyTasks({ auth, onStartTaskTimer }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "open" | "in_progress" | "completed"
  const [projectFilter, setProjectFilter] = useState("all");

  // Load all tasks assigned to the employee
  async function loadTasks() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/tasks/my?includeCompleted=true", {
        token: auth.token,
      });
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      setError("Failed to load your assigned tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, [auth.token]);

  // Update Task Status (employee or admin)
  async function updateStatus(taskId, newStatus) {
    try {
      const updated = await api(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        token: auth.token,
        body: { status: newStatus },
      });
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: updated.status } : t))
      );
      window.dispatchEvent(new Event("taskCount:refresh"));
    } catch (e) {
      setError(e.message || "Could not update status.");
      setTimeout(() => setError(""), 5000);
    }
  }

  // Unique projects list for filter
  const projectOptions = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (t.project && t.project._id) {
        map.set(t.project._id, t.project.name || "Untitled Project");
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      const matchSearch =
        !search.trim() ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
        (t.project?.name && t.project.name.toLowerCase().includes(search.toLowerCase()));

      // Status
      const matchStatus = statusFilter === "all" || t.status === statusFilter;

      // Project
      const matchProject = projectFilter === "all" || t.project?._id === projectFilter;

      return matchSearch && matchStatus && matchProject;
    });
  }, [tasks, search, statusFilter, projectFilter]);

  // Metrics
  const metrics = useMemo(() => {
    let total = tasks.length;
    let open = 0;
    let inProgress = 0;
    let completed = 0;
    let totalMinutes = 0;

    tasks.forEach((t) => {
      if (t.status === "completed") completed++;
      else if (t.status === "in_progress") inProgress++;
      else open++;

      totalMinutes += Number(t.estimatedMinutes) || 0;
    });

    return {
      total,
      open,
      inProgress,
      completed,
      totalHours: (totalMinutes / 60).toFixed(1),
    };
  }, [tasks]);

  return (
    <div className="space-y-4 pb-12">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md">
            <ListTodo size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">My Assigned Tasks</h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                {tasks.length} Assigned
              </span>
            </div>
            <p className="text-xs text-slate-500">
              View your deliverables, update task progress, and launch your timer directly on assigned work.
            </p>
          </div>
        </div>

        <button
          onClick={loadTasks}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs self-start lg:self-auto"
        >
          <Clock size={14} className={loading ? "animate-spin" : ""} />
          Refresh Tasks
        </button>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tasks</p>
          <h3 className="mt-1 text-2xl font-extrabold text-slate-900">{metrics.total}</h3>
          <p className="mt-0.5 text-xs text-slate-500">~{metrics.totalHours} estimated hours</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">In Progress</p>
          <h3 className="mt-1 text-2xl font-extrabold text-blue-700">{metrics.inProgress}</h3>
          <p className="mt-0.5 text-xs text-blue-500">Active tasks being worked on</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Open / Planned</p>
          <h3 className="mt-1 text-2xl font-extrabold text-amber-800">{metrics.open}</h3>
          <p className="mt-0.5 text-xs text-amber-600">Pending tasks to start</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Completed</p>
          <h3 className="mt-1 text-2xl font-extrabold text-emerald-800">{metrics.completed}</h3>
          <p className="mt-0.5 text-xs text-emerald-600">
            {metrics.total ? Math.round((metrics.completed / metrics.total) * 100) : 0}% completion rate
          </p>
        </div>
      </div>

      {/* ── FILTERS BAR ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by task title, description, or project name..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="all">All Projects ({projectOptions.length})</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">Status:</span>
          {[
            { key: "all", label: "All", count: metrics.total },
            { key: "open", label: "Open", count: metrics.open },
            { key: "in_progress", label: "In Progress", count: metrics.inProgress },
            { key: "completed", label: "Completed", count: metrics.completed },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  statusFilter === key ? "bg-white/20 text-white" : "bg-white text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TASKS GRID / LIST ── */}
      <div className="space-y-3">
        {loading && (
          <div className="py-12 text-center text-sm font-medium text-slate-400">
            Loading your assigned tasks...
          </div>
        )}

        {!loading && filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
            <ListTodo size={40} className="text-slate-300 mb-3" />
            <h4 className="text-sm font-bold text-slate-700">No tasks found</h4>
            <p className="mt-1 text-xs text-slate-400">
              {search || statusFilter !== "all" || projectFilter !== "all"
                ? "Try adjusting your search or filter settings."
                : "You have no tasks assigned to you right now."}
            </p>
          </div>
        )}

        {filteredTasks.map((task) => {
          const dueStatus = getDueDateStatus(task.dueDate, task.status);

          return (
            <div
              key={task._id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition space-y-3"
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                {/* Left info */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {task.project && (
                      <span className="flex items-center gap-1 text-xs font-bold text-blue-600">
                        <Briefcase size={13} />
                        {task.project.name}
                        {task.project.code ? ` (${task.project.code})` : ""}
                      </span>
                    )}

                    <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      {task.taskType}
                    </span>

                    {dueStatus && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${dueStatus.color}`}
                      >
                        {dueStatus.text}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{task.title}</h3>

                  {task.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
                  )}
                </div>

                {/* Status Selector */}
                <div className="flex items-center gap-2 self-start">
                  <select
                    value={task.status || "open"}
                    onChange={(e) => updateStatus(task._id, e.target.value)}
                    className={`rounded-2xl border px-3 py-1.5 text-xs font-bold outline-none cursor-pointer shadow-2xs ${
                      STATUS_COLORS[task.status] || "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <option value="open">Open / Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Bottom Details Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <div className="flex flex-wrap items-center gap-4">
                  {task.estimatedMinutes && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock size={13} className="text-slate-400" />
                      Est: <strong>{formatMinutes(task.estimatedMinutes)}</strong>
                    </span>
                  )}

                  {task.dueDate && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <CalendarDays size={13} className="text-slate-400" />
                      Due: {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>

                {/* Quick Start Timer Action */}
                {onStartTaskTimer && task.status !== "completed" && (
                  <button
                    onClick={() => onStartTaskTimer(task)}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-500 transition"
                  >
                    <Play size={12} fill="currentColor" />
                    Start Working
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
