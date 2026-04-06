import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";

export default function Users({ auth }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Create form
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    status: "active",
    gender: "",
    designation: "",
  });
  const [showPwd, setShowPwd] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "employee",
    status: "active",
    gender: "",
    designation: "",
    password: "", // optional (only if admin wants to reset)
  });

  // Filters
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const rows = await api("/api/users", { token: auth.token });
      setItems(rows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* ---------- helpers ---------- */
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
    !loading;

  /* ---------- create user ---------- */
  async function add() {
    if (!canAdd) return;
    setLoading(true);
    try {
      await api("/api/users", {
        method: "POST",
        token: auth.token,
        body: form,
      });
      setForm({
        name: "",
        email: "",
        password: "",
        role: "employee",
        status: "active",
      });
      await load();
    } finally {
      setLoading(false);
    }
  }

  /* ---------- delete user ---------- */
  async function del(id) {
    if (!confirm("Delete this user?")) return;
    setLoading(true);
    try {
      await api(`/api/users/${id}`, {
        method: "DELETE",
        token: auth.token,
      });
      await load();
    } finally {
      setLoading(false);
    }
  }

  /* ---------- start edit ---------- */
  function startEdit(user) {
    const id = user._id || user.id;
    setEditingId(id);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "employee",
      status: user.status || "active",
      gender: user.gender || "",
      designation: user.designation || "",
      password: "", // blank by default – only send if admin sets
    });
  }

  /* ---------- cancel edit ---------- */
  function cancelEdit() {
    setEditingId(null);
    setEditForm({
      name: "",
      email: "",
      role: "employee",
      status: "active",
      password: "",
    });
  }

  /* ---------- save edit ---------- */
  async function saveEdit() {
    if (!editingId || !canSaveEdit) return;
    setLoading(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        status: editForm.status,
        gender: editForm.gender || null,
        designation: editForm.designation || null,
      };
      if (editForm.password && editForm.password.length >= 6) {
        payload.password = editForm.password;
      }

      const updated = await api(`/api/users/${editingId}`, {
        method: "PUT",
        token: auth.token,
        body: payload,
      });

      // Update local list without full reload
      setItems((prev) =>
        (prev || []).map((u) => {
          const id = u._id || u.id;
          if (id === editingId) {
            // backend returns { id, name, email, role, status }
            return {
              ...u,
              id: updated.id,
              name: updated.name,
              email: updated.email,
              role: updated.role,
              status: updated.status,
              gender: updated.gender,
              designation: updated.designation,
            };
          }
          return u;
        })
      );

      cancelEdit();
    } finally {
      setLoading(false);
    }
  }

  /* ---------- filtered list ---------- */
  const filtered = useMemo(() => {
    return (items || []).filter((it) => {
      const byRole = roleFilter ? it.role === roleFilter : true;
      const byStatus = statusFilter ? it.status === statusFilter : true;
      const s = q.toLowerCase();
      const byQuery = q
        ? (it.name || "").toLowerCase().includes(s) ||
        (it.email || "").toLowerCase().includes(s)
        : true;
      return byRole && byStatus && byQuery;
    });
  }, [items, q, roleFilter, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Users</h3>
        {loading && <span className="text-xs text-gray-500">Loading…</span>}
      </div>

      {/* Create form */}
      <div className="grid gap-3 sm:grid-cols-[1.5fr,1.8fr,1.5fr,1fr,1fr,auto] sm:items-center">

        <div className="flex items-center gap-2">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-1/2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900/10"
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={[
              "w-1/2 rounded-lg border bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900/10",
              emailOk ? "border-gray-300" : "border-red-300",
            ].join(" ")}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Password (min 6)"
            type={showPwd ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={[
              "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900/10",
              form.password.length >= 6 ? "border-gray-300" : "border-red-300",
            ].join(" ")}
          />
          <button
            type="button"
            onClick={() => setShowPwd((s) => !s)}
            className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs text-gray-700 hover:bg-gray-50"
            title={showPwd ? "Hide password" : "Show password"}
          >
            {showPwd ? "Hide" : "Show"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-1/2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="employee">employee</option>
            <option value="admin">admin</option>
          </select>

          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-1/2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
<div className="flex items-center gap-2">
        <select
          value={form.gender}
          onChange={(e) => setForm({ ...form, gender: e.target.value })}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <select
          value={form.designation}
          onChange={(e) => setForm({ ...form, designation: e.target.value })}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Designation</option>
          <option value="Instructional Designer">Instructional Designer</option>
          <option value="Quality Analyst">Quality Analyst</option>
          <option value="Storyline Developer">Storyline Developer</option>
          <option value="Graphic Designer">Graphic Designer</option>
          <option value="Animator">Animator</option>
          <option value="Manager">Manager</option>
          <option value="Software Developer">Software Developer</option>
        </select>
</div>




        <button
          onClick={add}
          disabled={!canAdd}
          className="h-10 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white shadow transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
        >
          <option value="">Filter by role</option>
          <option value="employee">employee</option>
          <option value="admin">admin</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
        >
          <option value="">Filter by status</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>

        <div className="ms-auto w-full max-w-sm">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Gender</th>
              <th className="px-4 py-3 font-medium">Designation</th>

              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  {q || roleFilter || statusFilter
                    ? "No users match your filters."
                    : "No users yet. Add the first user above."}
                </td>
              </tr>
            )}

            {filtered.map((it, i) => {
              const key = it._id || it.id; // support both shapes
              const isEditing = editingId === key;

              if (isEditing) {
                // 🔧 Inline edit row
                return (
                  <tr key={key} className="border-t border-gray-100 bg-yellow-50/20">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-gray-900/20"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, email: e.target.value }))
                        }
                        className={[
                          "w-full rounded-lg border bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-gray-900/20",
                          editEmailOk ? "border-gray-300" : "border-red-300",
                        ].join(" ")}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editForm.role}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, role: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-gray-900/20"
                      >
                        <option value="employee">employee</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                       <select
                        value={editForm.status}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, status: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-gray-900/20"
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                       <select
                        value={editForm.gender}
                        onChange={(e) => setEditForm(f => ({ ...f, gender: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value="">Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>

                      </td>



                    <td className="px-4 py-3">
                     

                     

                      <select
                        value={editForm.designation}
                        onChange={(e) => setEditForm(f => ({ ...f, designation: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value="">Designation</option>
                        <option value="Instructional Designer">Instructional Designer</option>
                        <option value="Quality Analyst">Quality Analyst</option>
                        <option value="Storyline Developer">Storyline Developer</option>
                        <option value="Graphic Designer">Graphic Designer</option>
                        <option value="Animator">Animator</option>
                        <option value="Manager">Manager</option>
                        <option value="Software Developer">Software Developer</option>
                      </select>

                      <div className="mt-1 text-[10px] text-gray-500">
                        Leave password blank to keep existing.
                      </div>
                      <input
                        type="password"
                        placeholder="New password (optional)"
                        value={editForm.password}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, password: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-gray-900/20"
                      />
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={saveEdit}
                        disabled={!canSaveEdit}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              }

              // 🔍 Normal read-only row
              return (
                <tr key={key} className="border-t border-gray-100 even:bg-gray-50/40">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3">{it.name}</td>
                  <td className="px-4 py-3">{it.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        it.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700",
                      ].join(" ")}
                    >
                      {it.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        it.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700",
                      ].join(" ")}
                    >
                      {it.status}
                    </span>
                  </td>

                  <td className="px-4 py-3">{it.gender || "-"}</td>
                  <td className="px-4 py-3">{it.designation || "-"}</td>


                  <td className="px-4 py-3 text-right flex space-x-2">
                    <button
                      onClick={() => startEdit(it)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => {
                        if (it.role === "admin") {
                          alert("You cannot delete admin users.");
                          return;
                        }
                        del(key);
                      }}
                      disabled={it.role === "admin"}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${it.role === "admin"
                        ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "border-red-300 bg-white text-red-600 hover:bg-red-50"
                        }`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-500">
        Showing <span className="font-medium">{filtered.length}</span> of{" "}
        <span className="font-medium">{items.length}</span> users
      </div>
    </div>
  );
}
