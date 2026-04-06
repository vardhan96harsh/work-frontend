import React, { useEffect, useState } from "react";
import { api } from "../../api.js";

export default function Companies({ auth }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  /* ================= LOAD ================= */
  async function load() {
    setLoading(true);
    try {
      const rows = await api("/api/companies", {
        token: auth.token,
      });
      setItems(rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* ================= ADD ================= */
  async function add() {
    if (!name.trim()) return;

    try {
      const created = await api("/api/companies", {
        method: "POST",
        body: { name: name.trim() },
        token: auth.token,
      });

      setItems((prev) => [...prev, created]);
      setName("");
    } catch (e) {
      console.error(e);
    }
  }

  /* ================= UPDATE ================= */
  async function update(id) {
    if (!editName.trim()) return;

    try {
      await api(`/api/companies/${id}`, {
        method: "PUT",
        body: { name: editName.trim() },
        token: auth.token,
      });

      setItems((prev) =>
        prev.map((it) =>
          it._id === id ? { ...it, name: editName.trim() } : it
        )
      );

      setEditId(null);
      setEditName("");
    } catch (e) {
      console.error(e);
    }
  }

  /* ================= DELETE ================= */
  async function del(id) {
    try {
      await api(`/api/companies/${id}`, {
        method: "DELETE",
        token: auth.token,
      });

      setItems((prev) => prev.filter((it) => it._id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  const filtered = items.filter((it) =>
    it.name?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-gray-900">
Companies</h3>
        {loading && <span className="text-xs text-gray-500">Loading…</span>}
      </div>

      {/* Add + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2 w-full max-w-sm">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Company name"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          <button
            onClick={add}
            disabled={!name.trim()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-sm hover:bg-black disabled:opacity-50"

          >
            Add
          </button>
        </div>

        <div className="ms-auto w-full max-w-xs">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search companies…"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">

            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Company Name</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((it, i) => (
              <tr
                key={it._id}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="px-4 py-3 text-gray-500">{i + 1}</td>

                <td className="px-4 py-3">
                  {editId === it._id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                      autoFocus
                    />
                  ) : (
                    it.name
                  )}
                </td>

                <td className="px-4 py-3 flex gap-2">
                  {editId === it._id ? (
                    <>
                      <button
                        onClick={() => update(it._id)}
                        className="rounded border border-green-300 px-3 py-1 text-xs text-green-700 hover:bg-green-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditId(null);
                          setEditName("");
                        }}
                        className="rounded border px-3 py-1 text-xs hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditId(it._id);
                          setEditName(it.name);
                        }}
                        className="rounded border border-blue-300 px-3 py-1 text-xs text-blue-600 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => del(it._id)}
                        className="rounded border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
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
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No companies found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
