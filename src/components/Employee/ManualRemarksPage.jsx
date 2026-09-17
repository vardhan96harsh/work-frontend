import React, { useEffect, useState, useMemo } from "react";
import {
  FileClock,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Check,
  X,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  FolderKanban,
  Tag,
  Briefcase,
} from "lucide-react";
import { api } from "../../api.js";
import ConfirmModal from "../ConfirmModal.jsx";

const WORK_TYPES = [
  "Alpha",
  "Beta",
  "CR",
  "Rework",
  "poc",
  "Analysis",
  "Storyboard QA",
  "Output QA",
];

function getLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMinutes(minutes) {
  const m = Number(minutes) || 0;
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export default function ManualRemarksPage({ auth }) {
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, title: "", message: "", onConfirm: null });

  // Form states
  const [text, setText] = useState("");
  const [customTaskName, setCustomTaskName] = useState("");
  const [requestedMinutes, setRequestedMinutes] = useState("");
  const [date, setDate] = useState(getLocalDateStr());
  const [taskType, setTaskType] = useState("Alpha");
  const [editId, setEditId] = useState(null);

  // Mode: "project" | "general"
  const [mode, setMode] = useState("project");

  // Project selection
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);

  const [companyId, setCompanyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [projectId, setProjectId] = useState("");

  /* ================= LOAD DATA ================= */

  async function loadRemarks() {
    setLoading(true);
    try {
      const list = await api("/api/manual-remarks", { token: auth.token });
      setRemarks(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to load your manual requests.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    try {
      const list = await api("/api/companies", { token: auth.token });
      const sorted = Array.isArray(list)
        ? [...list].sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, {
              sensitivity: "base",
            })
          )
        : [];
      setCompanies(sorted);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadCategories() {
    try {
      const list = await api("/api/categories", { token: auth.token });
      setCategories(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadProjects(comp, cat) {
    try {
      const qs = new URLSearchParams({
        ...(comp ? { company: comp } : {}),
        ...(cat ? { category: cat } : {}),
      }).toString();

      const list = await api(`/api/projects${qs ? `?${qs}` : ""}`, {
        token: auth.token,
      });
      setProjects(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setProjects([]);
    }
  }

  useEffect(() => {
    loadRemarks();
    loadCompanies();
    loadCategories();
  }, []);

  useEffect(() => {
    loadProjects(companyId, categoryId);
  }, [companyId, categoryId]);

  /* ================= ADD REQUEST ================= */

  async function add(e) {
    if (e) e.preventDefault();
    if (mode === "general" && !customTaskName.trim() && !text.trim()) {
      setErrorMsg("Please provide a task name or description.");
      return;
    }
    if (mode === "project" && !text.trim()) {
      setErrorMsg("Please provide a description/task remark.");
      return;
    }
    const mins = Number(requestedMinutes);
    if (!mins || mins <= 0) {
      setErrorMsg("Please enter valid requested minutes greater than 0.");
      return;
    }

    if (mode === "project" && !projectId) {
      setErrorMsg("Please select a project for this request.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const taskRemark = text.trim() || customTaskName.trim();
    const body = {
      text: taskRemark,
      requestedMinutes: mins,
      date: date || getLocalDateStr(),
      taskType: taskType || "Alpha",
    };

    if (mode === "project") {
      body.project = projectId;
      body.projectId = projectId;
    } else {
      body.customTask = customTaskName.trim() || text.trim();
    }

    try {
      const res = await api("/api/manual-remarks", {
        method: "POST",
        token: auth.token,
        body,
      });

      setRemarks([res, ...remarks]);
      setText("");
      setCustomTaskName("");
      setRequestedMinutes("");
      setProjectId("");
      setSuccessMsg("Manual time request submitted successfully and is awaiting review.");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to submit manual request.");
    } finally {
      setLoading(false);
    }
  }

  /* ================= START / CANCEL EDIT ================= */

  function startEdit(r) {
    setEditId(r._id);
    setText(r.text || "");
    setCustomTaskName(r.customTask || "");
    setRequestedMinutes(r.requestedMinutes || "");
    setDate(r.date ? r.date.slice(0, 10) : getLocalDateStr());
    setTaskType(r.taskType || "Alpha");
    if (r.project) {
      setMode("project");
      setProjectId(r.project._id || r.project);
    } else {
      setMode("general");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditId(null);
    setText("");
    setCustomTaskName("");
    setRequestedMinutes("");
    setDate(getLocalDateStr());
    setTaskType("Alpha");
    setErrorMsg("");
  }

  /* ================= UPDATE ================= */

  async function update(e) {
    if (e) e.preventDefault();
    if (mode === "general" && !customTaskName.trim() && !text.trim()) {
      setErrorMsg("Please provide a task name or description.");
      return;
    }
    if (mode === "project" && !text.trim()) {
      setErrorMsg("Please provide a description/task remark.");
      return;
    }
    const mins = Number(requestedMinutes);
    if (!mins || mins <= 0) {
      setErrorMsg("Please enter valid requested minutes.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const taskRemark = text.trim() || customTaskName.trim();
    const body = {
      text: taskRemark,
      requestedMinutes: mins,
      taskType,
      date,
    };

    if (mode === "project") {
      body.project = projectId || null;
      body.projectId = projectId || null;
      body.customTask = null;
    } else {
      body.project = null;
      body.projectId = null;
      body.customTask = customTaskName.trim() || text.trim();
    }

    try {
      const res = await api(`/api/manual-remarks/${editId}`, {
        method: "PUT",
        token: auth.token,
        body,
      });

      setRemarks(remarks.map((r) => (r._id === editId ? res : r)));
      cancelEdit();
      setSuccessMsg("Manual time request updated successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to update request.");
    } finally {
      setLoading(false);
    }
  }

  /* ================= DELETE ================= */

  function remove(r) {
    setDeleteConfirm({
      open: true,
      title: "Delete Manual Time Request",
      message: `Are you sure you want to delete this manual request (${r.requestedMinutes} min)?\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        setLoading(true);
        setErrorMsg("");
        try {
          await api(`/api/manual-remarks/${r._id}`, {
            method: "DELETE",
            token: auth.token,
          });
          setRemarks(remarks.filter((item) => item._id !== r._id));
          if (editId === r._id) cancelEdit();
          setSuccessMsg("Manual time request deleted.");
          setTimeout(() => setSuccessMsg(""), 4000);
        } catch (err) {
          console.error(err);
          setErrorMsg(err?.message || "Failed to delete request.");
        } finally {
          setLoading(false);
        }
      }
    });
  }

  // Summary Metrics
  const metrics = useMemo(() => {
    const pending = remarks.filter((r) => r.status === "pending");
    const approved = remarks.filter((r) => r.status === "approved");
    const rejected = remarks.filter((r) => r.status === "rejected");
    const approvedMinutes = approved.reduce(
      (acc, r) => acc + (Number(r.requestedMinutes) || 0),
      0
    );
    const pendingMinutes = pending.reduce(
      (acc, r) => acc + (Number(r.requestedMinutes) || 0),
      0
    );

    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      approvedMinutes,
      pendingMinutes,
    };
  }, [remarks]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-4">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FileClock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Manual Time Requests
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Claim missed hours for offline tasks, power disruptions, or unrecorded work.
              </p>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg("")}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
            <button
              onClick={() => setSuccessMsg("")}
              className="ml-auto text-emerald-500 hover:text-emerald-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Status Metric Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
              <span>Pending Review</span>
              <Clock className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-amber-900">
              {metrics.pendingCount}
            </div>
            <div className="text-[11px] text-amber-700">
              {formatMinutes(metrics.pendingMinutes)} awaiting approval
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
              <span>Approved Time</span>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-emerald-900">
              {formatMinutes(metrics.approvedMinutes)}
            </div>
            <div className="text-[11px] text-emerald-700">
              {metrics.approvedCount} approved requests
            </div>
          </div>

          <div className="rounded-2xl border border-red-200/80 bg-red-50/50 p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-red-800">
              <span>Rejected</span>
              <XCircle className="h-3.5 w-3.5 text-red-600" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-red-900">
              {metrics.rejectedCount}
            </div>
            <div className="text-[11px] text-red-700">Dismissed requests</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Total Requests</span>
              <FileClock className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-900">
              {remarks.length}
            </div>
            <div className="text-[11px] text-slate-500">All submissions</div>
          </div>
        </div>
      </div>

      {/* Request Form Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
              {editId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {editId ? "Edit Pending Request" : "New Time Request"}
            </h3>
          </div>

          {editId && (
            <button
              onClick={cancelEdit}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={editId ? update : add}>
          {/* Mode Switcher */}
          <div className="mb-5 flex max-w-sm rounded-2xl bg-slate-100 p-1">
            {[
              { key: "project", label: "Project Work" },
              { key: "general", label: "General / Internal Task" },
            ].map((item) => (
              <button
                type="button"
                key={item.key}
                onClick={() => setMode(item.key)}
                className={`flex-1 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  mode === item.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* General Mode Task Name */}
          {mode === "general" && (
            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Task / Activity Name *
              </label>
              <input
                type="text"
                value={customTaskName}
                onChange={(e) => setCustomTaskName(e.target.value)}
                placeholder="e.g. Client Discussion, Team Meeting, Asset Creation, Research..."
                className="h-11 w-full rounded-2xl border border-purple-200 bg-purple-50/20 px-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-purple-500 focus:bg-white"
              />
            </div>
          )}

          {/* Project Mode Dropdowns */}
          {mode === "project" && (
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Filter by Company
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="">All Companies</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Filter by Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="">All Categories</option>
                  {categories.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Select Project *
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-blue-200 bg-blue-50/20 px-3.5 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="">Choose Project...</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Date of Work */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Date of Work *
              </label>
              <input
                type="date"
                value={date}
                max={getLocalDateStr()}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Work Type */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Work Type
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                {WORK_TYPES.map((wt) => (
                  <option key={wt} value={wt}>
                    {wt}
                  </option>
                ))}
              </select>
            </div>

            {/* Requested Minutes */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Time (Minutes) *
                </label>
                {requestedMinutes && Number(requestedMinutes) > 0 && (
                  <span className="text-xs font-bold text-blue-600">
                    = {formatMinutes(requestedMinutes)}
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                placeholder="e.g. 120"
                value={requestedMinutes}
                onChange={(e) => setRequestedMinutes(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Quick Minutes Buttons */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Quick Presets
              </label>
              <div className="flex h-11 items-center gap-1.5 overflow-x-auto">
                {[30, 60, 120, 240, 480].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRequestedMinutes(String(m))}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                      Number(requestedMinutes) === m
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {m < 60 ? `${m}m` : `${m / 60}h`}
                  </button>
                ))}
              </div>
            </div>

            {/* Remark / Task Description */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Task Description / Reason *
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  mode === "project"
                    ? "Specify the task worked on and the reason for manual logging…"
                    : "Describe the general task or meeting…"
                }
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5">
            {editId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {editId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{editId ? "Update Request" : "Submit Request"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Submitted Requests Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              My Submitted Requests
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {remarks.length} total
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Project / Task</th>
                <th className="px-5 py-3.5">Work Type</th>
                <th className="px-5 py-3.5">Description / Remark</th>
                <th className="px-5 py-3.5 text-center">Time</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {remarks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <FileClock className="h-6 w-6" />
                    </div>
                    <div className="mt-3 text-sm font-semibold text-slate-900">
                      No manual time requests yet
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Submit any offline or missed work time using the form above.
                    </p>
                  </td>
                </tr>
              )}

              {remarks.map((r) => {
                const isPending = r.status === "pending";
                const isApproved = r.status === "approved";
                const isRejected = r.status === "rejected";

                return (
                  <tr key={r._id} className="transition hover:bg-slate-50/80">
                    {/* Date */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{r.date || "—"}</span>
                      </div>
                    </td>

                    {/* Project / Task */}
                    <td className="px-5 py-4">
                      {r.project || (r.projectName && !r.customTask) ? (
                        <div className="flex items-center gap-1.5">
                          <FolderKanban className="h-4 w-4 text-blue-600 shrink-0" />
                          <span className="font-bold text-blue-700">
                            {r.project?.name || r.projectName || (typeof r.project === "string" ? r.project : "Project Task")}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Briefcase className="h-4 w-4 text-purple-600 shrink-0" />
                          <span className="font-bold text-slate-900">
                            {r.customTask || r.projectName || r.text || "General Task"}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            General
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Work Type */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {r.taskType || "Alpha"}
                      </span>
                    </td>

                    {/* Remark / Text */}
                    <td className="px-5 py-4 max-w-xs text-xs font-medium text-slate-800">
                      <p className="line-clamp-2">{r.text}</p>
                    </td>

                    {/* Time */}
                    <td className="px-5 py-4 text-center">
                      <span className="font-bold text-slate-900">
                        {formatMinutes(r.requestedMinutes)}
                      </span>
                      <span className="ml-1 text-xs text-slate-400">
                        ({r.requestedMinutes}m)
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-center">
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          <CheckCircle className="h-3 w-3" />
                          Approved
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200/80 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700">
                          <XCircle className="h-3 w-3" />
                          Rejected
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
                            className="inline-flex items-center gap-1 rounded-xl border border-blue-200/60 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => remove(r)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200/60 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium italic text-slate-400">
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={() => {
          const fn = deleteConfirm.onConfirm;
          setDeleteConfirm(prev => ({ ...prev, open: false }));
          if (fn) fn();
        }}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
