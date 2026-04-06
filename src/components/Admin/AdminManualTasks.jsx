import React, { useEffect, useState } from "react";
import { api } from "../../api.js";
import DateRangePicker from "../DateRangePicker.jsx";

export default function AdminManualTasks({ auth }) {
  // 🔓 No default date filter → show ALL records
  const [{ from, to }, setRange] = useState({ from: "", to: "" });

  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");

  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editMinutes, setEditMinutes] = useState("");

  /* =========================
     LOAD USERS
     ========================= */
  useEffect(() => {
    async function loadUsers() {
      try {
        const list = await api("/api/users", { token: auth.token });
        setUsers((list || []).filter((u) => u.role !== "admin"));
      } catch {
        setUsers([]);
      }
    }
    loadUsers();
  }, [auth.token]);

  /* =========================
     LOAD MANUAL REMARKS
     ========================= */
  async function load() {
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
      setError("Failed to load manual tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [from, to, userId, status]);

  /* =========================
     UPDATE MINUTES
     ========================= */
  async function saveMinutes(id) {
    await api(`/api/manual-remarks/${id}/update-minutes`, {
      method: "PUT",
      token: auth.token,
      body: { requestedMinutes: Number(editMinutes) },
    });

    setEditingId(null);
    setEditMinutes("");
    load();
  }

  /* =========================
     APPROVE / REJECT
     ========================= */
  async function approve(id) {
    await api(`/api/manual-remarks/${id}/approve`, {
      method: "POST",
      token: auth.token,
    });
    load();
  }

  async function reject(id) {
    await api(`/api/manual-remarks/${id}/reject`, {
      method: "POST",
      token: auth.token,
    });
    load();
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">
          Manual Time Requests (All Users)
        </h2>
        <p className="text-xs text-gray-500">
          Employees’ manual time and task requests
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid sm:grid-cols-4 gap-4 items-end">

          {/* User */}
          <div>
            <label className="text-xs text-gray-500">Employee</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">All Employees</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs text-gray-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Date */}
          <div className="sm:col-span-2">
            <DateRangePicker from={from} to={to} onChange={setRange} />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Employee</th>
              <th className="px-4 py-2 text-left">Task / Remark</th>
              <th className="px-4 py-2 text-left">Requested</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left w-40">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-500">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && remarks.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-500">
                  No manual requests found.
                </td>
              </tr>
            )}

            {remarks.map((r) => (
              <tr key={r._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{r.date}</td>
                <td className="px-4 py-2">{r.userName}</td>
               <td className="px-4 py-2">
  {/* Check if it's a project task */}
  {r.projectName ? (
    <>
      {/* Show project name */}
      <div className="font-medium">{r.projectName}</div>
      
      {/* Display task type if available */}
      {r.taskType && (
        <div className="text-xs text-gray-500">{r.taskType}</div>
      )}
      
      {/* If a remark for the project exists, display it */}
      <div>{r.text || "No specific remark for this project"}</div>
    </>
  ) : r.customTask ? (
    // Display custom tasks for general remarks
    <div>{r.customTask}</div>
  ) : (
    // Fallback for general remarks
    <div>{r.text || "No remark available"}</div>
  )}
</td>


                {/* Editable Minutes */}
                <td className="px-4 py-2">
                  {editingId === r._id ? (
                    <input
                      type="number"
                      className="w-20 border rounded px-2 py-1 text-sm"
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(e.target.value)}
                    />
                  ) : (
                    `${r.requestedMinutes} min`
                  )}
                </td>

                <td className="px-4 py-2 capitalize">{r.status}</td>

                <td className="px-4 py-2">
                  {r.status === "pending" ? (
                    <div className="flex items-center gap-2">

                      {editingId === r._id ? (
                        <>
                          <button
                            onClick={() => saveMinutes(r._id)}
                            className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs hover:bg-blue-100"
                          >
                            Save
                          </button>

                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 rounded bg-gray-50 text-gray-600 text-xs hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(r._id);
                            setEditMinutes(r.requestedMinutes);
                          }}
                          className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-xs hover:bg-indigo-100"
                        >
                          Edit
                        </button>
                      )}

                      <button
                        onClick={() => approve(r._id)}
                        className="px-2 py-1 rounded bg-green-50 text-green-600 text-xs hover:bg-green-100"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => reject(r._id)}
                        className="px-2 py-1 rounded bg-red-50 text-red-600 text-xs hover:bg-red-100"
                      >
                        Reject
                      </button>

                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Locked</span>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500">
        Total requests: {remarks.length}
      </div>
    </div>
  );
}
