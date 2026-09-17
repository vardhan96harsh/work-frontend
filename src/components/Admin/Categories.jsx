import React, { useEffect, useMemo, useState } from "react";
import {
  Tags,
  Tag,
  Plus,
  Search,
  X,
  Check,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { api } from "../../api.js";
import ConfirmModal from "./ConfirmModal.jsx";

function getInitials(name) {
  if (!name) return "CT";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Categories({ auth }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // In-app non-blocking confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ================= LOAD ================= */
  async function load() {
    setLoading(true);
    setErrorMsg("");
    try {
      const rows = await api("/api/categories", {
        token: auth.token,
      });
      const sorted = (rows || []).sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      );
      setItems(sorted);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* ================= ADD ================= */
  async function add(e) {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || loading) return;

    // Check duplicate locally
    const exists = items.some(
      (it) => it.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setErrorMsg(`A category with the name "${trimmed}" already exists.`);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const created = await api("/api/categories", {
        method: "POST",
        body: { name: trimmed },
        token: auth.token,
      });

      setItems((prev) =>
        [...prev, created].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        )
      );
      setName("");
      setSuccessMsg(`Category "${created.name}" created successfully.`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to create category.");
    } finally {
      setLoading(false);
    }
  }

  /* ================= UPDATE ================= */
  async function update(id) {
    const trimmed = editName.trim();
    if (!trimmed || savingEdit) return;

    // Check duplicate
    const exists = items.some(
      (it) => it._id !== id && it.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setErrorMsg(`A category with the name "${trimmed}" already exists.`);
      return;
    }

    setSavingEdit(true);
    setErrorMsg("");
    try {
      await api(`/api/categories/${id}`, {
        method: "PUT",
        body: { name: trimmed },
        token: auth.token,
      });

      setItems((prev) =>
        prev
          .map((it) =>
            it._id === id ? { ...it, name: trimmed } : it
          )
          .sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
          )
      );

      setEditId(null);
      setEditName("");
      setSuccessMsg("Category updated successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to update category.");
    } finally {
      setSavingEdit(false);
    }
  }

  /* ================= DELETE ================= */
  function del(category) {
    setDeleteTarget(category);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setErrorMsg("");

    // If currently editing this category, reset edit state
    if (editId === deleteTarget._id) {
      setEditId(null);
      setEditName("");
    }

    try {
      await api(`/api/categories/${deleteTarget._id}`, {
        method: "DELETE",
        token: auth.token,
      });

      setItems((prev) => prev.filter((it) => it._id !== deleteTarget._id));
      setSuccessMsg(`Category "${deleteTarget.name}" deleted.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to delete category.");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const search = q.toLowerCase().trim();
    return items
      .filter((it) => (it.name || "").toLowerCase().includes(search))
      .sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      );
  }, [items, q]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Tags className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                Categories
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Organize deliverables, modules, and work types across projects.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-600">
              <span className="font-bold text-slate-900">{items.length}</span> Total Categories
            </div>
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
      </div>

      {/* Add Category & Search Bar */}
      <div className="grid gap-4 md:grid-cols-12">
        {/* Add Category Form */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-7">
          <h4 className="mb-3 text-sm font-bold text-slate-900">Add New Category</h4>
          <form onSubmit={add} className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter category name (e.g. E-Learning, ILT, Simulation)…"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Search Filter */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-5">
          <h4 className="mb-3 text-sm font-bold text-slate-900">Search Categories</h4>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by name…"
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
        </div>
      </div>

      {/* Categories Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-slate-900">Registered Categories</h4>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
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
                <th className="w-16 px-5 py-3.5">#</th>
                <th className="px-5 py-3.5">Category Name</th>
                <th className="w-48 px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Tags className="h-6 w-6" />
                    </div>
                    <div className="mt-3 text-sm font-semibold text-slate-900">
                      No categories found
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {q
                        ? "No categories match your search query."
                        : "No categories added yet. Create your first category above."}
                    </p>
                  </td>
                </tr>
              )}

              {filtered.map((it, i) => {
                const isEditing = editId === it._id;

                return (
                  <tr
                    key={it._id}
                    className={`transition hover:bg-slate-50/80 ${
                      isEditing ? "bg-blue-50/30" : ""
                    }`}
                  >
                    {/* Index */}
                    <td className="px-5 py-4 text-xs font-semibold text-slate-400">
                      {i + 1}
                    </td>

                    {/* Category Name / Edit Input */}
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <div className="flex items-center gap-2 max-w-md">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") update(it._id);
                              if (e.key === "Escape") {
                                setEditId(null);
                                setEditName("");
                              }
                            }}
                            className="h-9 w-full rounded-xl border border-blue-500 bg-white px-3 text-sm font-medium text-slate-900 outline-none ring-2 ring-blue-500/20"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                            <Tag className="h-4 w-4 text-slate-500" />
                          </div>
                          <span className="font-semibold text-slate-900">
                            {it.name}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => update(it._id)}
                              disabled={savingEdit || !editName.trim()}
                              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditId(null);
                                setEditName("");
                              }}
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
                              onClick={() => {
                                setEditId(it._id);
                                setEditName(it.name);
                              }}
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
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?\n\nWarning: Any projects associated with this category may be affected.`}
        confirmText="Delete Category"
        cancelText="Cancel"
        isDanger={true}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
