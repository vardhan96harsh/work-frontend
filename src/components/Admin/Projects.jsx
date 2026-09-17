import React, { useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  Plus,
  Search,
  X,
  Check,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  Building2,
  Tag,
  CheckCircle,
  Clock,
} from "lucide-react";
import { api } from "../../api.js";
import ConfirmModal from "./ConfirmModal.jsx";

export default function Projects({ auth }) {
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  // Form State
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("active");
  const [description, setDescription] = useState("");

  // Filters State
  const [filterCompany, setFilterCompany] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [q, setQ] = useState("");

  // Inline Edit State
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editCompany, setEditCompany] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // In-app non-blocking confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function loadMeta() {
    try {
      const [c, g] = await Promise.all([
        api("/api/companies", { token: auth.token }),
        api("/api/categories", { token: auth.token }),
      ]);

      setCompanies(
        (c || []).sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        )
      );
      setCategories(
        (g || []).sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        )
      );
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to load companies or categories.");
    }
  }

  async function loadProjects() {
    setLoading(true);
    setErrorMsg("");
    try {
      const p = await api("/api/projects", { token: auth.token });
      const sorted = (p || []).sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      );
      setItems(sorted);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    await Promise.all([loadMeta(), loadProjects()]);
  }

  useEffect(() => {
    refreshAll();
  }, [auth.token]);

  const canAdd = name.trim() && company && category && !loading;

  function getCompanyObject(companyValue, fallbackId) {
    if (companyValue && typeof companyValue === "object") {
      return companyValue;
    }
    return companies.find((c) => c._id === fallbackId || c._id === companyValue);
  }

  function getCategoryObject(categoryValue, fallbackId) {
    if (categoryValue && typeof categoryValue === "object") {
      return categoryValue;
    }
    return categories.find(
      (g) => g._id === fallbackId || g._id === categoryValue
    );
  }

  async function add(e) {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg("Please enter a project name.");
      return;
    }
    if (!company) {
      setErrorMsg("Please select a company for this project.");
      return;
    }
    if (!category) {
      setErrorMsg("Please select a category for this project.");
      return;
    }
    if (loading) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const created = await api("/api/projects", {
        method: "POST",
        token: auth.token,
        body: {
          name: trimmed,
          code: code.trim(),
          status,
          company,
          category,
          description: description.trim(),
        },
      });

      const populatedProject = {
        ...created,
        company: getCompanyObject(created.company, company),
        category: getCategoryObject(created.category, category),
        code: created.code || code.trim(),
        status: created.status || status,
        description: created.description || description.trim(),
      };

      setItems((prev) =>
        [...prev, populatedProject].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        )
      );

      setName("");
      setCode("");
      setStatus("active");
      setCompany("");
      setCategory("");
      setDescription("");
      setSuccessMsg(`Project "${populatedProject.name}" created successfully.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to add project.");
    } finally {
      setLoading(false);
    }
  }

  function del(it) {
    setDeleteTarget(it);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = typeof deleteTarget === "object" ? deleteTarget._id : deleteTarget;
    const projectName = typeof deleteTarget === "object" ? deleteTarget.name : "this project";

    setDeleting(true);
    setErrorMsg("");

    if (editingId === id) {
      cancelEdit();
    }

    try {
      await api(`/api/projects/${id}`, {
        method: "DELETE",
        token: auth.token,
      });

      setItems((prev) => prev.filter((item) => item._id !== id));
      setSuccessMsg(`Project "${projectName}" deleted.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to delete project.");
    } finally {
      setDeleting(false);
    }
  }

  function startEdit(it) {
    setEditingId(it._id);
    setEditName(it.name || "");
    setEditCode(it.code || "");
    setEditStatus(it.status || "active");
    setEditCompany(
      typeof it.company === "object" ? it.company?._id || "" : it.company || ""
    );
    setEditCategory(
      typeof it.category === "object"
        ? it.category?._id || ""
        : it.category || ""
    );
    setEditDescription(it.description || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditCode("");
    setEditStatus("active");
    setEditCompany("");
    setEditCategory("");
    setEditDescription("");
  }

  async function saveEdit(id) {
    const trimmed = editName.trim();
    if (!trimmed) {
      setErrorMsg("Project name cannot be empty.");
      return;
    }
    if (!editCompany) {
      setErrorMsg("Please select a company for this project.");
      return;
    }
    if (!editCategory) {
      setErrorMsg("Please select a category for this project.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const updated = await api(`/api/projects/${id}`, {
        method: "PUT",
        token: auth.token,
        body: {
          name: trimmed,
          code: editCode.trim(),
          status: editStatus,
          company: editCompany,
          category: editCategory,
          description: editDescription.trim(),
        },
      });

      setItems((prev) =>
        prev.map((it) =>
          it._id === id
            ? {
                ...it,
                ...updated,
                name: updated.name || trimmed,
                code:
                  updated.code !== undefined ? updated.code : editCode.trim(),
                status: updated.status || editStatus,
                company: getCompanyObject(updated.company, editCompany),
                category: getCategoryObject(updated.category, editCategory),
                description:
                  updated.description !== undefined
                    ? updated.description
                    : editDescription.trim(),
              }
            : it
        )
      );

      setSuccessMsg("Project updated successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
      cancelEdit();
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to update project.");
    } finally {
      setLoading(false);
    }
  }

  // Filtered list
  const filtered = useMemo(() => {
    return items
      .filter((it) => {
        const itemCompanyId =
          typeof it.company === "object" ? it.company?._id : it.company;

        const itemCategoryId =
          typeof it.category === "object" ? it.category?._id : it.category;

        const byCompany = filterCompany ? itemCompanyId === filterCompany : true;
        const byCategory = filterCategory
          ? itemCategoryId === filterCategory
          : true;
        const byStatus = filterStatus ? it.status === filterStatus : true;

        const search = q.toLowerCase().trim();
        const byQuery = search
          ? (it.name || "").toLowerCase().includes(search) ||
            (it.code || "").toLowerCase().includes(search) ||
            (it.status || "").toLowerCase().includes(search) ||
            (it.description || "").toLowerCase().includes(search) ||
            (it.company?.name || "").toLowerCase().includes(search) ||
            (it.category?.name || "").toLowerCase().includes(search)
          : true;

        return byCompany && byCategory && byStatus && byQuery;
      })
      .sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      );
  }, [items, filterCompany, filterCategory, filterStatus, q]);

  // Metrics
  const metrics = useMemo(() => {
    const total = items.length;
    const active = items.filter((p) => p.status === "active").length;
    const completed = items.filter((p) => p.status === "completed").length;
    const hold = items.filter((p) => p.status === "hold").length;
    return { total, active, completed, hold };
  }, [items]);

  const hasActiveFilters = Boolean(
    filterCompany || filterCategory || filterStatus || q
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FolderKanban className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                Projects
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Create and organize client projects, project codes, and delivery statuses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshAll}
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

        {/* Summary Metric Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="text-xs font-semibold text-slate-500">Total Projects</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{metrics.total}</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5">
            <div className="text-xs font-semibold text-emerald-700">Active Projects</div>
            <div className="mt-1 text-2xl font-bold text-emerald-800">{metrics.active}</div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5">
            <div className="text-xs font-semibold text-blue-700">Completed</div>
            <div className="mt-1 text-2xl font-bold text-blue-800">{metrics.completed}</div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5">
            <div className="text-xs font-semibold text-amber-700">On Hold</div>
            <div className="mt-1 text-2xl font-bold text-amber-800">{metrics.hold}</div>
          </div>
        </div>
      </div>

      {/* Add New Project Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Plus className="h-4 w-4" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Add New Project</h4>
          </div>
          <span className="text-xs text-slate-400">* Required fields</span>
        </div>

        <form onSubmit={add}>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Company Select */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Company *
              </label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Select */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Select Category</option>
                {categories.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Name */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Project Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Compliance Training"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Project Code */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Project Code
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. PRJ-101"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="active">Active</option>
                <option value="hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Description */}
            <div className="lg:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Description / Scope
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary or scope of deliverables…"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Project</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter Bar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Company Filter */}
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Search Query */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by project, code, company…"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilterCompany("");
                setFilterCategory("");
                setFilterStatus("");
                setQ("");
              }}
              className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Project Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-slate-900">Project Directory</h4>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {filtered.length} {filtered.length === 1 ? "project" : "projects"}
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
                <th className="px-5 py-3.5">Company</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Project</th>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <FolderKanban className="h-6 w-6" />
                    </div>
                    <div className="mt-3 text-sm font-semibold text-slate-900">
                      No projects found
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {hasActiveFilters
                        ? "Try clearing or adjusting your search filters above."
                        : "No projects have been added yet. Create your first project above."}
                    </p>
                  </td>
                </tr>
              )}

              {filtered.map((it) => {
                const isEditing = editingId === it._id;

                return (
                  <tr
                    key={it._id}
                    className={`transition hover:bg-slate-50/80 ${
                      isEditing ? "bg-blue-50/30" : ""
                    }`}
                  >
                    {/* Company */}
                    <td className="px-5 py-4 font-medium text-slate-700">
                      {isEditing ? (
                        <select
                          value={editCompany}
                          onChange={(e) => setEditCompany(e.target.value)}
                          className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-500"
                        >
                          {companies.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {typeof it.company === "object"
                              ? it.company?.name || "-"
                              : getCompanyObject(it.company)?.name || "-"}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4 text-slate-600">
                      {isEditing ? (
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-500"
                        >
                          {categories.map((g) => (
                            <option key={g._id} value={g._id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {typeof it.category === "object"
                              ? it.category?.name || "-"
                              : getCategoryObject(it.category)?.name || "-"}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Project Name */}
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 w-full rounded-xl border border-blue-500 bg-white px-2.5 text-xs outline-none ring-2 ring-blue-500/20"
                        />
                      ) : (
                        it.name
                      )}
                    </td>

                    {/* Code */}
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <input
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="h-8 w-24 rounded-xl border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-500"
                        />
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                          {it.code || "-"}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-500"
                        >
                          <option value="active">Active</option>
                          <option value="hold">Hold</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                            it.status === "active"
                              ? "border border-emerald-200/80 bg-emerald-50 text-emerald-700"
                              : it.status === "completed"
                              ? "border border-blue-200/80 bg-blue-50 text-blue-700"
                              : it.status === "hold"
                              ? "border border-amber-200/80 bg-amber-50 text-amber-700"
                              : "border border-rose-200/80 bg-rose-50 text-rose-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              it.status === "active"
                                ? "bg-emerald-500"
                                : it.status === "completed"
                                ? "bg-blue-500"
                                : it.status === "hold"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {it.status || "active"}
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-5 py-4 max-w-xs text-xs text-slate-600">
                      {isEditing ? (
                        <input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="h-8 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-500"
                        />
                      ) : (
                        <p className="truncate">{it.description || "-"}</p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(it._id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Save</span>
                            </button>

                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Cancel</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(it)}
                              className="inline-flex items-center gap-1 rounded-xl border border-blue-200/60 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => del(it)}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200/60 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-app non-blocking confirmation dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Project"
        message={`Are you sure you want to delete "${
          typeof deleteTarget === "object" ? deleteTarget?.name : "this project"
        }"?\n\nWarning: Tasks and logged hours associated with this project may be affected.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        isDanger={true}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}