import React, { useEffect, useMemo, useState } from "react";
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Filter,
  X,
  Check,
  Edit2,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Briefcase,
  Calendar,
  Key,
} from "lucide-react";
import { api } from "../../api.js";
import ConfirmModal from "./ConfirmModal.jsx";

const DESIGNATIONS = [
  "Instructional Designer",
  "Quality Analyst",
  "Storyline Developer",
  "Graphic Designer",
  "Animator",
  "Manager",
  "Software Developer",
];

function formatDob(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.slice(0, 10);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr.slice(0, 10);
  }
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Users({ auth }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    status: "active",
    gender: "",
    designation: "",
    dob: "",
  });
  const [showPwd, setShowPwd] = useState(false);

  // Edit modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "employee",
    status: "active",
    gender: "",
    designation: "",
    dob: "",
    password: "",
  });
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState("");

  // In-app non-blocking confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");

  async function load() {
    setLoading(true);
    setErrorMsg("");
    try {
      const rows = await api("/api/users", { token: auth.token });
      const sorted = (rows || []).sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      );
      setItems(sorted);
    } catch (err) {
      console.error("Failed to load users:", err);
      setErrorMsg(err?.message || "Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Validation helpers
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || "");
  const canAdd =
    form.name.trim() &&
    emailOk &&
    form.password.length >= 6 &&
    form.role &&
    form.status &&
    !loading;

  const editEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email || "");
  const canSaveEdit =
    editForm.name.trim() &&
    editEmailOk &&
    editForm.role &&
    editForm.status &&
    !savingEdit;

  /* ---------- create user ---------- */
  async function add(e) {
    if (e) e.preventDefault();
    if (!canAdd) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api("/api/users", {
        method: "POST",
        token: auth.token,
        body: {
          ...form,
          name: form.name.trim(),
          email: form.email.trim(),
          gender: form.gender || null,
          designation: form.designation || null,
          dob: form.dob || null,
        },
      });
      setForm({
        name: "",
        email: "",
        password: "",
        role: "employee",
        status: "active",
        gender: "",
        designation: "",
        dob: "",
      });
      setSuccessMsg("User account created successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
      await load();
    } catch (err) {
      console.error("Failed to add user:", err);
      setErrorMsg(err?.message || "Failed to create user. Please verify input.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- delete user ---------- */
  function del(user) {
    if (user.role === "admin") {
      setErrorMsg("Admin accounts cannot be deleted.");
      return;
    }
    setDeleteTarget(user);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget._id || deleteTarget.id;

    setDeleting(true);
    setErrorMsg("");
    try {
      await api(`/api/users/${id}`, {
        method: "DELETE",
        token: auth.token,
      });
      setSuccessMsg(`User "${deleteTarget.name}" deleted.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error("Failed to delete user:", err);
      setErrorMsg(err?.message || "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  }

  /* ---------- edit modal handlers ---------- */
  function startEdit(user) {
    setEditingUser(user);
    setEditErrorMsg("");
    setShowEditPwd(false);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "employee",
      status: user.status || "active",
      gender: user.gender || "",
      designation: user.designation || "",
      dob: user.dob ? user.dob.slice(0, 10) : "",
      password: "", // blank = keep existing password
    });
  }

  function cancelEdit() {
    setEditingUser(null);
    setEditErrorMsg("");
  }

  async function saveEdit() {
    if (!editingUser || !canSaveEdit) return;
    setSavingEdit(true);
    setEditErrorMsg("");

    const id = editingUser._id || editingUser.id;
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        status: editForm.status,
        gender: editForm.gender || null,
        designation: editForm.designation || null,
        dob: editForm.dob || null,
      };
      if (editForm.password && editForm.password.length >= 6) {
        payload.password = editForm.password;
      }

      const updated = await api(`/api/users/${id}`, {
        method: "PUT",
        token: auth.token,
        body: payload,
      });

      // Update local items state
      setItems((prev) =>
        (prev || []).map((u) => {
          const uId = u._id || u.id;
          if (uId === id) {
            return {
              ...u,
              id: updated.id,
              name: updated.name,
              email: updated.email,
              role: updated.role,
              status: updated.status,
              gender: updated.gender,
              designation: updated.designation,
              dob: updated.dob,
            };
          }
          return u;
        })
      );

      setSuccessMsg(`User "${updated.name}" updated successfully.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      cancelEdit();
    } catch (err) {
      console.error("Failed to update user:", err);
      setEditErrorMsg(err?.message || "Failed to update user account.");
    } finally {
      setSavingEdit(false);
    }
  }

  /* ---------- filtered users list ---------- */
  const filtered = useMemo(() => {
    return (items || [])
      .filter((it) => {
        const byRole = roleFilter ? it.role === roleFilter : true;
        const byStatus = statusFilter ? it.status === statusFilter : true;
        const byDesignation = designationFilter
          ? it.designation === designationFilter
          : true;
        const s = q.toLowerCase().trim();
        const byQuery = s
          ? (it.name || "").toLowerCase().includes(s) ||
            (it.email || "").toLowerCase().includes(s)
          : true;
        return byRole && byStatus && byDesignation && byQuery;
      })
      .sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      );
  }, [items, q, roleFilter, statusFilter, designationFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = items.length;
    const active = items.filter((u) => u.status === "active").length;
    const inactive = total - active;
    const admins = items.filter((u) => u.role === "admin").length;
    const employees = items.filter((u) => u.role === "employee").length;
    return { total, active, inactive, admins, employees };
  }, [items]);

  const hasActiveFilters = Boolean(q || roleFilter || statusFilter || designationFilter);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <UsersIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                Users Management
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Provision new accounts, assign roles, designations, and manage access.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Metric Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="text-xs font-semibold text-slate-500">Total Users</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{metrics.total}</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5">
            <div className="text-xs font-semibold text-emerald-700">Active Accounts</div>
            <div className="mt-1 text-2xl font-bold text-emerald-800">{metrics.active}</div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5">
            <div className="text-xs font-semibold text-amber-700">Inactive Accounts</div>
            <div className="mt-1 text-2xl font-bold text-amber-800">{metrics.inactive}</div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5">
            <div className="text-xs font-semibold text-blue-700">Administrators</div>
            <div className="mt-1 text-2xl font-bold text-blue-800">{metrics.admins}</div>
          </div>
          <div className="col-span-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:col-span-1">
            <div className="text-xs font-semibold text-slate-500">Employees</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">{metrics.employees}</div>
          </div>
        </div>
      </div>

      {/* Add New User Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
              <UserPlus className="h-4 w-4" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Add New User</h4>
          </div>
          <span className="text-xs text-slate-400">* Required fields</span>
        </div>

        <form onSubmit={add}>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Full Name */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Full Name *
              </label>
              <input
                placeholder="e.g. Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Email Address *
              </label>
              <input
                type="email"
                placeholder="e.g. user@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`h-11 w-full rounded-2xl border bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white ${
                  !form.email || emailOk ? "border-slate-200" : "border-red-300 bg-red-50/20"
                }`}
              />
            </div>

            {/* Initial Password */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Password * (min 6 chars)
              </label>
              <div className="relative">
                <input
                  placeholder="At least 6 characters"
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`h-11 w-full rounded-2xl border bg-slate-50 pl-3.5 pr-10 text-sm outline-none transition focus:border-blue-500 focus:bg-white ${
                    !form.password || form.password.length >= 6
                      ? "border-slate-200"
                      : "border-red-300 bg-red-50/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Date of Birth
              </label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Role */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                System Role *
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="employee">Employee</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Account Status *
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Designation */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Designation
              </label>
              <select
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Select Designation</option>
                {DESIGNATIONS.map((des) => (
                  <option key={des} value={des}>
                    {des}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={!canAdd}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add User</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filters & Search */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email address…"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Roles</option>
            <option value="employee">Employee</option>
            <option value="admin">Administrator</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Designation Filter */}
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Designations</option>
            {DESIGNATIONS.map((des) => (
              <option key={des} value={des}>
                {des}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setQ("");
                setRoleFilter("");
                setStatusFilter("");
                setDesignationFilter("");
              }}
              className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-slate-900">User Directory</h4>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {filtered.length} {filtered.length === 1 ? "user" : "users"}
            </span>
          </div>

          {filtered.length !== items.length && (
            <span className="text-xs text-slate-400">
              Filtered from {items.length} total
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">#</th>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Designation</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Gender</th>
                <th className="px-5 py-3.5">Date of Birth</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <UsersIcon className="h-6 w-6" />
                    </div>
                    <div className="mt-3 text-sm font-semibold text-slate-900">
                      No users found
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {hasActiveFilters
                        ? "Try clearing or adjusting your search filters above."
                        : "No users exist in the system yet. Add the first one above."}
                    </p>
                  </td>
                </tr>
              )}

              {filtered.map((it, i) => {
                const key = it._id || it.id;
                const isAdmin = it.role === "admin";
                const isActive = it.status === "active";

                return (
                  <tr
                    key={key}
                    className="transition hover:bg-slate-50/80"
                  >
                    {/* Index */}
                    <td className="px-5 py-4 text-xs font-semibold text-slate-400">
                      {i + 1}
                    </td>

                    {/* User Avatar + Name + Email */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                          {getInitials(it.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">
                            {it.name}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {it.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Designation */}
                    <td className="px-5 py-4">
                      {it.designation ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                          {it.designation}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                          Employee
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Gender */}
                    <td className="px-5 py-4 text-xs font-medium text-slate-600">
                      {it.gender || "-"}
                    </td>

                    {/* Date of Birth */}
                    <td className="px-5 py-4 text-xs font-medium text-slate-600">
                      {it.dob ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDob(it.dob)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(it)}
                          title="Edit user details"
                          className="inline-flex items-center gap-1 rounded-xl border border-blue-200/60 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => del(it)}
                          disabled={isAdmin}
                          title={
                            isAdmin
                              ? "Admin accounts cannot be deleted"
                              : "Delete user account"
                          }
                          className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                            isAdmin
                              ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 opacity-60"
                              : "border border-red-200/60 bg-red-50 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal Dialog */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingEdit) {
              cancelEdit();
            }
          }}
        >
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Edit User Account
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update profile, role permissions, or reset account password.
                  </p>
                </div>
              </div>

              <button
                onClick={cancelEdit}
                disabled={savingEdit}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Error */}
            {editErrorMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{editErrorMsg}</span>
              </div>
            )}

            {/* Modal Form */}
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Name */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Full Name *
                  </label>
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className={`h-11 w-full rounded-2xl border bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white ${
                      editEmailOk ? "border-slate-200" : "border-red-300 bg-red-50/20"
                    }`}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Role */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    System Role *
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, role: e.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Account Status *
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, status: e.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Gender */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Gender
                  </label>
                  <select
                    value={editForm.gender}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, gender: e.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                {/* Designation */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Designation
                  </label>
                  <select
                    value={editForm.designation}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        designation: e.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">Select Designation</option>
                    {DESIGNATIONS.map((des) => (
                      <option key={des} value={des}>
                        {des}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* DOB */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, dob: e.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* Password Reset */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Reset Password (optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPwd ? "text" : "password"}
                      placeholder="Leave blank to keep current"
                      value={editForm.password}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, password: e.target.value }))
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-3.5 pr-10 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPwd((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title={showEditPwd ? "Hide password" : "Show password"}
                    >
                      {showEditPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Leave blank to keep existing password unchanged.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={savingEdit}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveEdit}
                disabled={!canSaveEdit}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingEdit ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app non-blocking confirmation dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete User Account"
        message={`Are you sure you want to delete user "${deleteTarget?.name}"?\n\nThis action cannot be undone.`}
        confirmText="Delete User"
        cancelText="Cancel"
        isDanger={true}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
