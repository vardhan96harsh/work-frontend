import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";

/* ---------- helpers ---------- */
function last30() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}
function initials(name = "") {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "U";
}
function Avatar({ name }) {
  return (
    <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
      {initials(name)}
    </div>
  );
}

export default function Reports({ auth }) {
  const [{ from, to, dim }, setFilters] = useState(() => ({
    ...last30(),
    dim: "user", // default to Employee so names appear
  }));

  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");

  // drawer state
  const [drawer, setDrawer] = useState({
    open: false,
    title: "",
    userId: "",
    userName: "",
    tab: "projects", // "projects" | "entries"
    loading: false,
    projects: [],
    entries: [],
  });

  const dimTitle =
    {
      user: "Employee",
      project: "Project",
      company: "Company",
      category: "Category",
    }[dim] || "Employee";

  /* ---------- load summary ---------- */
  async function run() {
    setLoading(true);
    try {
      const q = new URLSearchParams({ from, to, dim }).toString();
      const rows = await api(`/api/reports/summary?${q}`, { token: auth.token });

      const normalized = (Array.isArray(rows) ? rows : []).map((r) => ({
        key: r.key ?? r._id ?? "",
        label: r.label ?? r.name ?? r.projectName ?? r._id ?? "",
        email: r.email ?? r.userEmail ?? null,
        totalHours: Number(r.totalHours ?? 0),
        entries: Number(r.entries ?? 0),
      }));
      setSummary(normalized);
    } catch (e) {
      console.error("Failed to load summary:", e);
      setSummary([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initial load

  /* ---------- export CSV ---------- */
  async function exportCsv() {
    const q = new URLSearchParams({ from, to, dim }).toString();
    const csv = await api(`/api/reports/export?${q}`, { token: auth.token });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets_${dim}_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- client search/sort ---------- */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = term
      ? summary.filter(
          (r) =>
            (r.label || "").toLowerCase().includes(term) ||
            (r.email || "").toLowerCase().includes(term) ||
            (r.key || "").toLowerCase().includes(term)
        )
      : summary;
    const sorted = [...base].sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0));
    return showAll ? sorted : sorted.slice(0, 25);
  }, [summary, search, showAll]);

  const totals = useMemo(
    () => ({
      hours: summary.reduce((s, r) => s + (Number(r.totalHours) || 0), 0),
      entries: summary.reduce((s, r) => s + (Number(r.entries) || 0), 0),
    }),
    [summary]
  );

  /* ---------- open employee details ---------- */
  async function openEmployeeDetails(row) {
    // only valid for Employee grouping
    const userId = row.key;
    const userName = row.label;
    setDrawer({
      open: true,
      title: `Employee: ${userName}`,
      userId,
      userName,
      tab: "projects",
      loading: true,
      projects: [],
      entries: [],
    });

    try {
      // 1) projects breakdown for this user
      const qp = new URLSearchParams({ user: userId, from, to }).toString();
      const projects = await api(`/api/reports/user-breakdown?${qp}`, { token: auth.token });

      // 2) recent raw entries (limit 20) – reuse existing /api/timesheets if you have it
      const keyMap = { user: "user" };
      const params = new URLSearchParams({ from, to, limit: 20 });
      params.append(keyMap["user"], userId);
      const entries = await api(`/api/timesheets?${params.toString()}`, { token: auth.token });

      setDrawer((d) => ({
        ...d,
        loading: false,
        projects: Array.isArray(projects) ? projects : [],
        entries: Array.isArray(entries) ? entries : [],
      }));
    } catch (e) {
      console.error(e);
      setDrawer((d) => ({ ...d, loading: false }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-2xl font-semibold text-slate-800">Reports</h3>
        <div className="flex gap-2">
          <button
            onClick={run}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Running…" : "Run"}
          </button>
          <button
            onClick={exportCsv}
            className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
        <div className="flex flex-col">
          <label className="text-sm text-slate-600">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-slate-600">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-slate-600">Group by</label>
          <select
            value={dim}
            onChange={(e) => setFilters((f) => ({ ...f, dim: e.target.value }))}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          >
            <option value="user">Employee</option>
            <option value="project">Project</option>
            <option value="company">Company</option>
            <option value="category">Category</option>
          </select>
        </div>
        <div className="flex flex-col md:col-span-2">
          <label className="text-sm text-slate-600">Search</label>
          <input
            type="text"
            placeholder={`Search ${dimTitle} / ID / Email`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Date Range</p>
          <p className="mt-1 text-sm text-slate-700">
            {from} → {to}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Hours</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">
            {totals.hours.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Entries</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">
            {totals.entries.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Groups</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{summary.length}</p>
          <p className="mt-1 text-xs text-slate-500">Grouped by {dimTitle}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">{dimTitle}</th>
                <th className="px-4 py-3 font-semibold">ID</th>
                {dim === "user" && <th className="px-4 py-3 font-semibold">Email</th>}
                <th className="px-4 py-3 text-right font-semibold">Total Hours</th>
                <th className="px-4 py-3 text-right font-semibold">Entries</th>
                {dim === "user" && <th className="px-4 py-3 text-right font-semibold">Details</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-slate-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-slate-500">
                    No data found.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((r, i) => (
                  <tr
                    key={`${r.key}-${i}`}
                    className={`border-t border-slate-100 ${i % 2 ? "bg-white" : "bg-slate-50/30"}`}
                  >
                    <td className="px-4 py-3">
                      {dim === "user" ? (
                        <div className="flex items-center gap-3">
                          <Avatar name={r.label} />
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{r.label || "Unknown"}</span>
                            <span className="text-xs text-slate-500">Employee</span>
                          </div>
                        </div>
                      ) : (
                        <span className="font-medium text-slate-800">{r.label || "Unknown"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.key}</td>
                    {dim === "user" && (
                      <td className="px-4 py-3 text-slate-600">{r.email || "—"}</td>
                    )}
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {Number(r.totalHours || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {Number(r.entries || 0).toLocaleString()}
                    </td>
                    {dim === "user" && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEmployeeDetails(r)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Details
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
            {summary.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">Totals</td>
                  <td className="px-4 py-3">—</td>
                  {dim === "user" && <td className="px-4 py-3">—</td>}
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {totals.hours.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {totals.entries.toLocaleString()}
                  </td>
                  {dim === "user" && <td className="px-4 py-3" />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Drawer: Employee breakdown */}
      {drawer.open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() =>
              setDrawer({
                open: false,
                title: "",
                userId: "",
                userName: "",
                tab: "projects",
                loading: false,
                projects: [],
                entries: [],
              })
            }
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-800">{drawer.title}</h4>
                <p className="text-xs text-slate-500">
                  Date range: {from} → {to}
                </p>
              </div>
              <button
                onClick={() =>
                  setDrawer({
                    open: false,
                    title: "",
                    userId: "",
                    userName: "",
                    tab: "projects",
                    loading: false,
                    projects: [],
                    entries: [],
                  })
                }
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 px-4 pt-2">
              {["projects", "entries"].map((t) => (
                <button
                  key={t}
                  onClick={() => setDrawer((d) => ({ ...d, tab: t }))}
                  className={`rounded-t-md px-3 py-2 text-sm ${
                    drawer.tab === t
                      ? "bg-white font-medium text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t === "projects" ? "Projects" : "Entries"}
                </button>
              ))}
            </div>

            <div className="p-4">
              {drawer.loading && <p className="text-slate-600">Loading…</p>}

              {!drawer.loading && drawer.tab === "projects" && (
                <>
                  {drawer.projects.length === 0 ? (
                    <p className="text-slate-600">No projects found for this employee.</p>
                  ) : (
                    <div className="overflow-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Project</th>
                            <th className="px-3 py-2 font-semibold">Company</th>
                            <th className="px-3 py-2 font-semibold">Category</th>
                            <th className="px-3 py-2 text-right font-semibold">Total Hours</th>
                            <th className="px-3 py-2 text-right font-semibold">Entries</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drawer.projects.map((p) => (
                            <tr key={p.key} className="border-t border-slate-100">
                              <td className="px-3 py-2">{p.projectName}</td>
                              <td className="px-3 py-2">{p.companyName || "—"}</td>
                              <td className="px-3 py-2">{p.categoryName || "—"}</td>
                              <td className="px-3 py-2 text-right">{p.totalHours}</td>
                              <td className="px-3 py-2 text-right">{p.entries}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {!drawer.loading && drawer.tab === "entries" && (
                <>
                  {drawer.entries.length === 0 ? (
                    <p className="text-slate-600">No recent entries.</p>
                  ) : (
                    <div className="overflow-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Date</th>
                            <th className="px-3 py-2 font-semibold">Company</th>
                            <th className="px-3 py-2 font-semibold">Category</th>
                            <th className="px-3 py-2 font-semibold">Project</th>
                            <th className="px-3 py-2 font-semibold">Task</th>
                            <th className="px-3 py-2 text-right font-semibold">Hours</th>
                            <th className="px-3 py-2 font-semibold">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drawer.entries.map((t) => (
                            <tr key={t._id} className="border-t border-slate-100">
                              <td className="px-3 py-2">{t.dateLogged?.slice(0, 10) || ""}</td>
                              <td className="px-3 py-2">{t.companyName || t.company?.name || "—"}</td>
                              <td className="px-3 py-2">{t.categoryName || t.category?.name || "—"}</td>
                              <td className="px-3 py-2">{t.projectName || t.project?.name || "—"}</td>
                              <td className="px-3 py-2">{t.taskType}</td>
                              <td className="px-3 py-2 text-right">{t.hours}</td>
                              <td className="px-3 py-2">{t.remarks || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-slate-500">
                    Showing up to 20 most recent entries for this employee.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
