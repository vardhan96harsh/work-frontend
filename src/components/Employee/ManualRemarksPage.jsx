import React, { useEffect, useState } from "react";
import { api } from "../../api.js";

export default function ManualRemarksPage({ auth }) {
  const [remarks, setRemarks] = useState([]);

  const [text, setText] = useState("");
  const [requestedMinutes, setRequestedMinutes] = useState("");
  const [editId, setEditId] = useState(null);

  /* ===== NEW: MODE TOGGLE ===== */
  const [mode, setMode] = useState("general"); // general | project

  /* ===== PROJECT SELECTION ===== */
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);

  const [companyId, setCompanyId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [projectId, setProjectId] = useState("");

  /* ================= LOAD DATA ================= */

  async function loadRemarks() {
    const list = await api("/api/manual-remarks", { token: auth.token });
    setRemarks(Array.isArray(list) ? list : []);
  }

  async function loadCompanies() {
    const list = await api("/api/companies", { token: auth.token });
    setCompanies(Array.isArray(list) ? list : []);
  }

  async function loadCategories(cid) {
    if (!cid) return setCategories([]);
    const list = await api(`/api/categories?company=${cid}`, {
      token: auth.token,
    });
    setCategories(Array.isArray(list) ? list : []);
  }

  async function loadProjects(cat) {
    if (!cat) return setProjects([]);
    const list = await api(`/api/projects?category=${cat}`, {
      token: auth.token,
    });
    setProjects(Array.isArray(list) ? list : []);
  }

  useEffect(() => {
    loadRemarks();
    loadCompanies();
  }, []);

  useEffect(() => {
    loadCategories(companyId);
    setCategoryId("");
    setProjectId("");
  }, [companyId]);

  useEffect(() => {
    loadProjects(categoryId);
    setProjectId("");
  }, [categoryId]);

  /* ================= ADD REQUEST ================= */

  async function add() {
    if (!text.trim() || !requestedMinutes) return;

    const body = {
      text: text.trim(),
      requestedMinutes: Number(requestedMinutes),
    };

    if (mode === "project") {
      if (!projectId) return alert("Please select a project");
      body.project = projectId;
    } else {
      body.customTask = text.trim();
    }

    const res = await api("/api/manual-remarks", {
      method: "POST",
      token: auth.token,
      body,
    });

    setRemarks([res, ...remarks]);

    setText("");
    setRequestedMinutes("");
    setProjectId("");
    setCategoryId("");
    setCompanyId("");
  }

  /* ================= UPDATE ================= */

  async function update() {
    const res = await api(`/api/manual-remarks/${editId}`, {
      method: "PUT",
      token: auth.token,
      body: { text: text.trim() },
    });

    setRemarks(remarks.map((r) => (r._id === editId ? res : r)));
    setEditId(null);
    setText("");
  }

  /* ================= DELETE ================= */

  async function remove(id) {
    await api(`/api/manual-remarks/${id}`, {
      method: "DELETE",
      token: auth.token,
    });
    setRemarks(remarks.filter((r) => r._id !== id));
  }

  /* ================= UI ================= */

  return (
    <div className="p-6 max-w-5xl mx-auto">

      <h2 className="text-lg font-semibold mb-6">Manual Time Requests</h2>

      {/* ===== MODE TOGGLE ===== */}
      <div className="flex gap-6 mb-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={mode === "general"}
            onChange={() => setMode("general")}
          />
          General Task
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={mode === "project"}
            onChange={() => setMode("project")}
          />
          Project Task
        </label>
      </div>

      {/* ===== FORM ===== */}
      <div className="space-y-3 mb-6">

        <input
          type="text"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder={
            mode === "project"
              ? "Remark about project work"
              : "Describe general task"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex gap-3">
          <input
            type="number"
            min="1"
            className="w-40 border rounded-lg px-3 py-2 text-sm"
            placeholder="Minutes"
            value={requestedMinutes}
            onChange={(e) => setRequestedMinutes(e.target.value)}
            disabled={!!editId}
          />

          <button
            onClick={editId ? update : add}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            {editId ? "Update" : "Request"}
          </button>
        </div>

        {/* ===== PROJECT SELECTORS ===== */}
        {mode === "project" && (
          <div className="grid sm:grid-cols-3 gap-3">

            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select Company</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
              disabled={!companyId}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
              disabled={!categoryId}
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>

          </div>
        )}
      </div>

      {/* ===== TABLE ===== */}
      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-2 text-left">Task</th>
              <th className="px-4 py-2 text-left">Project</th>
              <th className="px-4 py-2">Requested</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2 w-32">Actions</th>
            </tr>
          </thead>

          <tbody>
            {remarks.map((r) => (
              <tr key={r._id} className="border-b">

                <td className="px-4 py-2">{r.text}</td>

                <td className="px-4 py-2">
                  {r.project ? (
                    <span className="text-blue-700 font-medium">
                      {r.project.name}
                    </span>
                  ) : (
                    <span className="text-gray-500 italic">General</span>
                  )}
                </td>

                <td className="px-4 py-2 text-center">
                  {r.requestedMinutes} min
                </td>

                <td className="px-4 py-2 text-center">{r.status}</td>

                <td className="px-4 py-2 text-gray-500">{r.date}</td>

                <td className="px-4 py-2 text-center">
                  {r.status === "pending" ? (
                    <>
                      <button
                        className="text-blue-600 text-xs mr-2"
                        onClick={() => {
                          setEditId(r._id);
                          setText(r.text);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 text-xs"
                        onClick={() => remove(r._id)}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      Locked
                    </span>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
