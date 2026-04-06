import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";

export default function Projects({ auth }) {
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");

  const [filterCompany, setFilterCompany] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [q, setQ] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const [loading, setLoading] = useState(false);

  /* ================= LOAD MASTER DATA (ONCE) ================= */
  useEffect(() => {
    (async () => {
      try {
        const [c, g] = await Promise.all([
          api("/api/companies", { token: auth.token }),
          api("/api/categories", { token: auth.token }),
        ]);
        setCompanies(c || []);
        setCategories(g || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [auth.token]);

  /* ================= LOAD PROJECTS (ONLY LOADING OWNER) ================= */
  async function loadProjects() {
    setLoading(true);
    try {
      const p = await api("/api/projects", { token: auth.token });
      setItems(p || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const canAdd = name.trim() && company && category && !loading;

  /* ================= ADD ================= */
  async function add() {
    if (!canAdd) return;

    try {
      const created = await api("/api/projects", {
        method: "POST",
        token: auth.token,
        body: { name: name.trim(), company, category },
      });

      // ✅ IMPORTANT: populate company & category manually
      const populatedProject = {
        ...created,
        company: companies.find((c) => c._id === company),
        category: categories.find((g) => g._id === category),
      };

      setItems((prev) => [...prev, populatedProject]);

      setName("");
      setCompany("");
      setCategory("");
    } catch (e) {
      console.error(e);
    }
  }

  /* ================= DELETE ================= */
  async function del(id) {
    try {
      await api(`/api/projects/${id}`, {
        method: "DELETE",
        token: auth.token,
      });

      setItems((prev) => prev.filter((it) => it._id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  /* ================= EDIT ================= */
  function startEdit(it) {
    setEditingId(it._id);
    setEditName(it.name);
    setEditCompany(it.company?._id || "");
    setEditCategory(it.category?._id || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditCompany("");
    setEditCategory("");
  }

  async function saveEdit(id) {
    if (!editName.trim() || !editCompany || !editCategory) return;

    try {
      await api(`/api/projects/${id}`, {
        method: "PUT",
        token: auth.token,
        body: {
          name: editName.trim(),
          company: editCompany,
          category: editCategory,
        },
      });

      setItems((prev) =>
        prev.map((it) =>
          it._id === id
            ? {
                ...it,
                name: editName.trim(),
                company: companies.find((c) => c._id === editCompany),
                category: categories.find((g) => g._id === editCategory),
              }
            : it
        )
      );

      cancelEdit();
    } catch (e) {
      console.error(e);
    }
  }

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    return items.filter((it) => {
      const byCompany = filterCompany ? it.company?._id === filterCompany : true;
      const byCategory = filterCategory ? it.category?._id === filterCategory : true;
      const byQuery = q
        ? (it.name || "").toLowerCase().includes(q.toLowerCase()) ||
          (it.company?.name || "").toLowerCase().includes(q.toLowerCase()) ||
          (it.category?.name || "").toLowerCase().includes(q.toLowerCase())
        : true;
      return byCompany && byCategory && byQuery;
    });
  }, [items, filterCompany, filterCategory, q]);

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold tracking-tight">Projects</h3>

      {/* Create */}
      <div className="grid gap-3 sm:grid-cols-[1fr,1fr,2fr,auto]">
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Company</option>
          {companies.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Category</option>
          {categories.map((g) => (
            <option key={g._id} value={g._id}>
              {g.name}
            </option>
          ))}
        </select>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />

        <button
          onClick={add}
          disabled={!canAdd}
          className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm shadow-sm hover:bg-black disabled:opacity-50"

        >
          Add
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All categories</option>
          {categories.map((g) => (
            <option key={g._id} value={g._id}>
              {g.name}
            </option>
          ))}
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="border rounded-lg px-3 py-2 flex-1"
        />
      </div>

      {/* Table */}
      <div className="border rounded-xl bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
  <tr>
    <th className="px-4 py-3 text-left">Company</th>
    <th className="px-4 py-3 text-left">Category</th>
    <th className="px-4 py-3 text-left">Project</th>
    <th className="px-4 py-3 text-left">Actions</th>
  </tr>
</thead>

          <tbody>
            {filtered.map((it) => (
              <tr key={it._id} className="border-t">
                <td className="px-4 py-2">{it.company?.name}</td>
                <td className="px-4 py-2">{it.category?.name}</td>
                <td className="px-4 py-2">
                  {editingId === it._id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                    />
                  ) : (
                    it.name
                  )}
                </td>
                <td className="px-4 py-2 space-x-1 flex">
                  {editingId === it._id ? (
                    <>
                      <button
                        onClick={() => saveEdit(it._id)}
                        className="text-green-600 text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-gray-500 text-xs"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(it)}
                      className="rounded border border-blue-300 px-3 py-1 text-xs text-blue-600 hover:bg-blue-50"

                      >
                        Edit
                      </button>
                      <button
                        onClick={() => del(it._id)}
                        className="text-red-600 text-xs ml-2"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No projects found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
