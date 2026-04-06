// import React, { useEffect, useMemo, useState } from "react";
// import { api } from "../../api.js";

// export default function Timesheet({ auth }) {
//   const [companies, setCompanies] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [projects, setProjects] = useState([]);
//   const [rows, setRows] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [submitting, setSubmitting] = useState(false);

//   const [form, setForm] = useState({
//     company: "",
//     category: "",
//     project: "",
//     taskType: "",
//     hours: "",
//     remarks: "",
//     dateLogged: new Date().toISOString().slice(0, 10),
//   });

//   async function loadInit() {
//     setLoading(true);
//     try {
//       const [c, g, t] = await Promise.all([
//         api("/api/companies", { token: auth.token }),
//         api("/api/categories", { token: auth.token }),
//         api("/api/timesheets", { token: auth.token }),
//       ]);
//       setCompanies(c || []);
//       setCategories(g || []);
//       setRows(t || []);
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => { loadInit(); }, []);

//   useEffect(() => {
//     (async () => {
//       if (!form.company || !form.category) return setProjects([]);
//       const list = await api(
//         `/api/projects?company=${form.company}&category=${form.category}`,
//         { token: auth.token }
//       );
//       setProjects(list || []);
//     })();
//   }, [form.company, form.category, auth.token]);

//   const hoursNum = Number(form.hours);
//   const canSubmit =
//     form.company &&
//     form.category &&
//     form.project &&
//     form.taskType &&
//     form.dateLogged &&
//     hoursNum >= 0.5 &&
//     hoursNum <= 16 &&
//     !submitting;

//   async function submit(e) {
//     e.preventDefault();
//     if (!canSubmit) return;
//     setSubmitting(true);
//     try {
//       const body = { ...form, hours: hoursNum };
//       await api("/api/timesheets", { method: "POST", token: auth.token, body });
//       setForm({
//         company: "",
//         category: "",
//         project: "",
//         taskType: "",
//         hours: "",
//         remarks: "",
//         dateLogged: new Date().toISOString().slice(0, 10),
//       });
//       const t = await api("/api/timesheets", { token: auth.token });
//       setRows(t || []);
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   const totalForSelectedDate = useMemo(() => {
//     if (!rows?.length || !form.dateLogged) return 0;
//     return rows
//       .filter((r) => String(r.dateLogged).slice(0, 10) === form.dateLogged)
//       .reduce((acc, r) => acc + Number(r.hours || 0), 0);
//   }, [rows, form.dateLogged]);

//   const sortedRows = useMemo(() => {
//     return [...(rows || [])].sort((a, b) =>
//       String(b.dateLogged).localeCompare(String(a.dateLogged))
//     );
//   }, [rows]);

//   return (
//     <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
//       <p className="text-sm text-gray-600">
//         Please log today’s work hours before shutting down your system.
//       </p>

//       {/* Form */}
//       <form
//         onSubmit={submit}
//         className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2"
//       >
//         <select
//           value={form.company}
//           onChange={(e) => setForm({ ...form, company: e.target.value, project: "" })}
//           className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900/10"
//         >
//           <option value="">Company</option>
//           {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
//         </select>

//         <select
//           value={form.category}
//           onChange={(e) => setForm({ ...form, category: e.target.value, project: "" })}
//           className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900/10"
//         >
//           <option value="">Category</option>
//           {categories.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
//         </select>

//         <select
//           value={form.project}
//           onChange={(e) => setForm({ ...form, project: e.target.value })}
//           disabled={!projects.length}
//           className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900/10"
//         >
//           <option value="">Project</option>
//           {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
//         </select>

//         <select
//           value={form.taskType}
//           onChange={(e) => setForm({ ...form, taskType: e.target.value })}
//           className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900/10"
//         >
//           <option value="">Task Type</option>
//           <option>Alpha Development</option>
//           <option>Beta Development</option>
//           <option>Rework</option>
//         </select>

//         <input
//           type="date"
//           value={form.dateLogged}
//           onChange={(e) => setForm({ ...form, dateLogged: e.target.value })}
//           className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900/10"
//         />

//         <input
//           type="number"
//           step="0.5"
//           min="0.5"
//           max="16"
//           placeholder="Hours (0.5 – 16)"
//           value={form.hours}
//           onChange={(e) => setForm({ ...form, hours: e.target.value })}
//           className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900/10"
//         />

//         <input
//           placeholder="Remarks (optional)"
//           value={form.remarks}
//           onChange={(e) => setForm({ ...form, remarks: e.target.value })}
//           className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2 focus:ring-2 focus:ring-gray-900/10"
//         />

//         <div className="flex items-center justify-between sm:col-span-2">
//           <div className="text-xs text-gray-600">
//             Total hours on <b>{form.dateLogged}</b>: {totalForSelectedDate}
//           </div>
//           <button
//             type="submit"
//             disabled={!canSubmit}
//             className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
//           >
//             {submitting ? "Submitting…" : "Submit"}
//           </button>
//         </div>
//       </form>

//       {/* Entries */}
//       <section className="space-y-3">
//         <h3 className="text-lg font-semibold">My Entries</h3>
//         <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
//           <table className="min-w-full text-left text-sm">
//             <thead className="bg-gray-50 text-gray-700">
//               <tr>
//                 <th className="px-4 py-3">Date</th>
//                 <th className="px-4 py-3">Company</th>
//                 <th className="px-4 py-3">Category</th>
//                 <th className="px-4 py-3">Project</th>
//                 <th className="px-4 py-3">Task</th>
//                 <th className="px-4 py-3">Hours</th>
//                 <th className="px-4 py-3">Remarks</th>
//               </tr>
//             </thead>
//             <tbody>
//               {!sortedRows.length && (
//                 <tr>
//                   <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
//                     {loading ? "Loading…" : "No entries yet. Log your first entry above."}
//                   </td>
//                 </tr>
//               )}
//               {sortedRows.map((r) => (
//                 <tr key={r._id} className="border-t border-gray-100 even:bg-gray-50/40">
//                   <td className="px-4 py-3">{String(r.dateLogged).slice(0, 10)}</td>
//                   <td className="px-4 py-3">{r.company?.name || "—"}</td>
//                   <td className="px-4 py-3">{r.category?.name || "—"}</td>
//                   <td className="px-4 py-3">{r.project?.name || "—"}</td>
//                   <td className="px-4 py-3">{r.taskType}</td>
//                   <td className="px-4 py-3">{r.hours}</td>
//                   <td className="px-4 py-3">{r.remarks || ""}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </section>
//     </main>
//   );
// }
