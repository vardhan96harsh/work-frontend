import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  FileClock,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Edit2,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Filter,
} from "lucide-react";
import { api } from "../../api.js";
import DateRangePicker from "../DateRangePicker.jsx";
import ConfirmModal from "./ConfirmModal.jsx";

function formatMinutes(minutes) {
  const m = Number(minutes) || 0;
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminManualTasks({ auth }) {
  // Filters
  const [{ from, to }, setRange] = useState({ from: "", to: "" });
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");

  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editMinutes, setEditMinutes] = useState("");
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, title: "", message: "", confirmLabel: "Confirm", danger: false, onConfirm: null });

  /* =========================
     LOAD USERS
     ========================= */
  useEffect(() => {
    async function loadUsers() {
      try {
        const list = await api("/api/users", { token: auth.token });
        const sorted = (list || [])
          .filter((u) => u.role !== "admin")
          .sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
          );
        setUsers(sorted);
      } catch {
        setUsers([]);
      }
    }
    loadUsers();
  }, [auth.token]);

  /* =========================
     LOAD MANUAL REMARKS
     ========================= */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const qs = new URLSearchParams({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(userId ? { user: userId } : {}),
        ...(status ? { status } : {}),
      }).toString();

      const res = await api(`/api/manual-remarks/admin?${qs}`, {
        token: auth.token,
      });

      setRemarks(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load manual time requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [auth.token, from, to, userId, status]);

  // ✅ Trigger load whenever filters (date range, user, status) change
  useEffect(() => {
    load();
  }, [load]);

  /* =========================
     UPDATE MINUTES
     ========================= */
  async function saveMinutes(id) {
    const mins = Number(editMinutes);
    if (!mins || mins <= 0) {
      setError("Please enter a valid number of minutes (> 0).");
      return;
    }

    setSavingMinutes(true);
    setError("");
    try {
      await api(`/api/manual-remarks/${id}/update-minutes`, {
        method: "PUT",
        token: auth.token,
        body: { requestedMinutes: mins },
      });

      setEditingId(null);
      setEditMinutes("");
      setSuccessMsg(`Requested time updated to ${formatMinutes(mins)} (${mins} min).`);
      setTimeout(() => setSuccessMsg(""), 4000);
      await load();
      window.dispatchEvent(new Event("manualRemarks:refresh"));
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to update requested minutes.");
    } finally {
      setSavingMinutes(false);
    }
  }

  /* =========================
     APPROVE / REJECT
     ========================= */
  function approve(e, remark) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    setConfirmState({
      open: true,
      title: "Approve Manual Time Request",
      message: `Approve manual time request for ${remark.userName}?\n\nTask: ${remark.projectName || remark.customTask || "Manual task"}\nTime: ${formatMinutes(remark.requestedMinutes)} (${remark.requestedMinutes} min)`,
      confirmLabel: "Approve Request",
      danger: false,
      onConfirm: async () => {
        setLoading(true);
        setError("");
        try {
          await api(`/api/manual-remarks/${remark._id}/approve`, {
            method: "POST",
            token: auth.token,
          });

          setSuccessMsg(`Request for ${remark.userName} approved successfully.`);
          setTimeout(() => setSuccessMsg(""), 4000);
          await load();
          window.dispatchEvent(new Event("manualRemarks:refresh"));
        } catch (err) {
          console.error(err);
          setError(err?.message || "Failed to approve request.");
        } finally {
          setLoading(false);
        }
      }
    });
  }

  function reject(e, remark) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    setConfirmState({
      open: true,
      title: "Reject Manual Time Request",
      message: `Reject manual time request for ${remark.userName}?\n\nThis will lock the request as rejected.`,
      confirmLabel: "Reject Request",
      danger: true,
      onConfirm: async () => {
        setLoading(true);
        setError("");
        try {
          await api(`/api/manual-remarks/${remark._id}/reject`, {
            method: "POST",
            token: auth.token,
          });

          setSuccessMsg(`Request for ${remark.userName} rejected.`);
          setTimeout(() => setSuccessMsg(""), 4000);
          await load();
          window.dispatchEvent(new Event("manualRemarks:refresh"));
        } catch (err) {
          console.error(err);
          setError(err?.message || "Failed to reject request.");
        } finally {
          setLoading(false);
        }
      }
    });
  }

  // Summary statistics
  const metrics = useMemo(() => {
    const pending = remarks.filter((r) => r.status === "pending");
    const approved = remarks.filter((r) => r.status === "approved");
    const rejected = remarks.filter((r) => r.status === "rejected");
    const totalMinutes = remarks.reduce(
      (sum, r) => sum + (Number(r.requestedMinutes) || 0),
      0
    );
    const pendingMinutes = pending.reduce(
      (sum, r) => sum + (Number(r.requestedMinutes) || 0),
      0
    );
    return {
      total: remarks.length,
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      totalMinutes,
      pendingMinutes,
    };
  }, [remarks]);

  const hasActiveFilters = Boolean(from || to || userId || status);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FileClock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                Manual Time Requests
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Review, adjust hours, approve, or reject employee offline time claims.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
            <button
              onClick={() => setError("")}
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

        {/* Metric Summary Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
              <span>Pending Review</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-900">
              {metrics.pendingCount}
            </div>
            <div className="mt-0.5 text-xs text-amber-700">
              {formatMinutes(metrics.pendingMinutes)} requested
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
              <span>Approved</span>
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-900">
              {metrics.approvedCount}
            </div>
            <div className="mt-0.5 text-xs text-emerald-700">
              Recorded in worklogs
            </div>
          </div>

          <div className="rounded-2xl border border-red-200/80 bg-red-50/60 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-red-800">
              <span>Rejected</span>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-red-900">
              {metrics.rejectedCount}
            </div>
            <div className="mt-0.5 text-xs text-red-700">Locked / dismissed</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Total Time</span>
              <FileClock className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatMinutes(metrics.totalMinutes)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {metrics.total} total requests
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Employee Select */}
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Employee
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Employees ({users.length})</option>
              {users.map((u) => (
                <option key={u._id || u.id} value={u._id || u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Select */}
          <div className="w-full sm:w-48">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Date Range Picker */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Date Range
            </label>
            <DateRangePicker from={from} to={to} onChange={setRange} />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setRange({ from: "", to: "" });
                setUserId("");
                setStatus("");
              }}
              className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-slate-900">Submitted Requests</h4>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {remarks.length} {remarks.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {loading && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Loading requests…
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Project</th>
                <th className="px-5 py-3.5">Work Type</th>
                <th className="px-5 py-3.5">Task / Remark</th>
                <th className="px-5 py-3.5">Requested Time</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && remarks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      <span>Loading manual requests…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && remarks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <FileClock className="h-6 w-6" />
                    </div>
                    <div className="mt-3 text-sm font-semibold text-slate-900">
                      No manual requests found
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {hasActiveFilters
                        ? "Try clearing or adjusting your search filters above."
                        : "No manual requests have been submitted yet."}
                    </p>
                  </td>
                </tr>
              )}

              {remarks.map((r) => {
                const isEditing = editingId === r._id;
                const isPending = r.status === "pending";
                const isApproved = r.status === "approved";
                const isRejected = r.status === "rejected";

                return (
                  <tr
                    key={r._id}
                    className={`transition hover:bg-slate-50/80 ${
                      isEditing ? "bg-blue-50/30" : ""
                    }`}
                  >
                    {/* Date */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-slate-600">
                      {r.date}
                    </td>

                    {/* Employee */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                          {getInitials(r.userName)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">
                            {r.userName || "Unknown"}
                          </div>
                          {r.userEmail && (
                            <div className="truncate text-xs text-slate-400">
                              {r.userEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Project / Task */}
                    <td className="px-5 py-4">
                      {r.projectId || (r.projectName && !r.customTask) ? (
                        <span className="font-semibold text-blue-700">{r.projectName || "Project Task"}</span>
                      ) : r.customTask || r.projectName ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{r.customTask || r.projectName}</span>
                          <span className="text-[11px] font-semibold text-purple-600">(General Task)</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Work Type */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {r.taskType || "General"}
                      </span>
                    </td>

                    {/* Task / Remark */}
                    <td className="px-5 py-4 max-w-xs text-xs font-medium text-slate-700">
                      <p className="line-clamp-2">
                        {r.text || r.customTask || "No remark"}
                      </p>
                    </td>

                    {/* Requested Time */}
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            value={editMinutes}
                            onChange={(e) => setEditMinutes(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveMinutes(r._id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="h-8 w-20 rounded-xl border border-blue-500 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none ring-2 ring-blue-500/20"
                          />
                          <span className="text-xs text-slate-400">min</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-slate-900">
                            {formatMinutes(r.requestedMinutes)}
                          </span>
                          <span className="ml-1 text-xs text-slate-400">
                            ({r.requestedMinutes}m)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
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
                      {r.status !== "rejected" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveMinutes(r._id)}
                                disabled={savingMinutes || !editMinutes}
                                className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Cancel</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(r._id);
                                setEditMinutes(r.requestedMinutes);
                              }}
                              title="Edit requested time"
                              className="inline-flex items-center gap-1 rounded-xl border border-blue-200/60 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                          )}

                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => approve(e, r)}
                                title="Approve manual time"
                                className="inline-flex items-center gap-1 rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => reject(e, r)}
                                title="Reject manual time"
                                className="inline-flex items-center gap-1 rounded-xl border border-red-200/80 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-right text-xs font-medium italic text-slate-400">
                          Locked
                        </div>
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
        isOpen={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        danger={confirmState.danger}
        onConfirm={() => {
          const fn = confirmState.onConfirm;
          setConfirmState(prev => ({ ...prev, open: false }));
          if (fn) fn();
        }}
        onClose={() => setConfirmState(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
