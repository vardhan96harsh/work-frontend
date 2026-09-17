import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import ConfirmModal from "./ConfirmModal.jsx";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
  Search,
  Building2,
  Globe,
  Star,
  Layers,
} from "lucide-react";

const HOLIDAY_TYPES = [
  {
    id: "company",
    label: "Company Holiday",
    color: "bg-blue-50/90 text-blue-900 border-blue-200",
    badge: "bg-blue-600",
    pillBg: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: Building2,
  },
  {
    id: "public",
    label: "National / Public",
    color: "bg-emerald-50/90 text-emerald-900 border-emerald-200",
    badge: "bg-emerald-600",
    pillBg: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: Globe,
  },
  {
    id: "optional",
    label: "Optional / Restricted",
    color: "bg-purple-50/90 text-purple-900 border-purple-200",
    badge: "bg-purple-600",
    pillBg: "bg-purple-50 text-purple-700 border border-purple-200",
    icon: Star,
  },
];

export default function AdminSidebarCalendar({ auth, theme: propTheme }) {
  const isDark = propTheme === "dark" || (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  const today = new Date();

  const [current, setCurrent] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, title: "", message: "", onConfirm: null });

  // Form & Modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState("company");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const year = current.getFullYear();
  const month = current.getMonth();

  const monthName = current.toLocaleString("default", { month: "long" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  async function loadHolidays() {
    setLoading(true);
    try {
      const res = await api("/api/holidays", { token: auth.token });
      setHolidays(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load holidays:", err);
      setMsg({ text: "Failed to load holidays from server.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHolidays();
  }, [auth.token]);

  function resetForm() {
    setFormName("");
    setFormDate("");
    setFormType("company");
    setEditId(null);
    setShowModal(false);
  }

  function openAddModal(defaultDate = "") {
    setEditId(null);
    setFormName("");
    setFormDate(defaultDate || `${year}-${String(month + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
    setFormType("company");
    setShowModal(true);
    setMsg({ text: "", type: "" });
  }

  function startEdit(h) {
    setEditId(h._id);
    setFormName(h.name || "");
    setFormDate((h.date || "").slice(0, 10));
    setFormType(h.type || "company");
    setShowModal(true);
    setMsg({ text: "", type: "" });
  }

  async function handleSaveHoliday(e) {
    if (e) e.preventDefault();
    if (!formName.trim() || !formDate) {
      setMsg({ text: "Please enter a holiday name and date.", type: "error" });
      return;
    }

    setSaving(true);
    setMsg({ text: "", type: "" });

    const body = {
      name: formName.trim(),
      date: formDate,
      type: formType || "company",
    };

    try {
      if (editId) {
        await api(`/api/holidays/${editId}`, {
          method: "PUT",
          token: auth.token,
          body,
        });
        setMsg({ text: `Holiday "${formName.trim()}" updated successfully!`, type: "success" });
      } else {
        await api("/api/holidays", {
          method: "POST",
          token: auth.token,
          body,
        });
        setMsg({ text: `Holiday "${formName.trim()}" added for ${formDate}!`, type: "success" });
      }

      resetForm();
      loadHolidays();
    } catch (err) {
      console.error("Save holiday error:", err);
      const errMsg = err?.message || (err?.error ? String(err.error) : "Failed to save holiday. Ensure no duplicate date exists.");
      setMsg({ text: errMsg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteHoliday(id, hName) {
    setDeleteConfirm({
      open: true,
      title: "Delete Holiday",
      message: `Are you sure you want to delete the holiday "${hName || "this holiday"}"?`,
      onConfirm: async () => {
        try {
          await api(`/api/holidays/${id}`, {
            method: "DELETE",
            token: auth.token,
          });
          setMsg({ text: `Holiday "${hName || ""}" deleted successfully.`, type: "success" });
          loadHolidays();
        } catch (err) {
          console.error("Delete holiday error:", err);
          setMsg({ text: err.message || "Failed to delete holiday.", type: "error" });
        }
      }
    });
  }

  function prevMonth() {
    setCurrent(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrent(new Date(year, month + 1, 1));
  }

  function goToday() {
    setCurrent(new Date());
  }

  function dateKey(day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Fast, timezone-safe map of date string -> holiday object
  const holidayMap = useMemo(() => {
    return holidays.reduce((acc, h) => {
      if (h?.date) {
        const key = h.date.slice(0, 10);
        acc[key] = h;
      }
      return acc;
    }, {});
  }, [holidays]);

  // Fast, timezone-safe list of holidays in current selected month
  const targetPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const visibleHolidays = useMemo(() => {
    return holidays
      .filter((h) => (h.date || "").startsWith(targetPrefix))
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [holidays, targetPrefix]);

  // Filtered all-holidays list for the sidebar
  const filteredAllHolidays = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return holidays.filter((h) => {
      const matchQ = !q || (h.name || "").toLowerCase().includes(q) || (h.date || "").includes(q);
      const matchT = typeFilter === "all" || h.type === typeFilter;
      return matchQ && matchT;
    });
  }, [holidays, searchQuery, typeFilter]);

  // Working days count in current month (excluding weekends and company/public holidays)
  const monthStats = useMemo(() => {
    let workingDays = 0;
    let weekendDays = 0;
    let holidayCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(d);
      const dt = new Date(year, month, d);
      const dayOfWeek = dt.getDay();
      const isWknd = dayOfWeek === 0 || dayOfWeek === 6;
      const isHol = Boolean(holidayMap[key]);

      if (isHol) {
        holidayCount++;
      } else if (isWknd) {
        weekendDays++;
      } else {
        workingDays++;
      }
    }

    return { workingDays, weekendDays, holidayCount, totalDays: daysInMonth };
  }, [year, month, daysInMonth, holidayMap]);

  const days = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-4 pb-16">

      {/* ── 1. HEADER BAR ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 shadow-xs">
            <CalendarDays size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Holiday Calendar</h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 tracking-wide border border-blue-100">
                OFFICIAL CALENDAR
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Manage company holidays, public leaves, and track working-day schedules.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={goToday}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs cursor-pointer"
          >
            <Clock size={13} className="text-slate-500" />
            Today
          </button>

          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus size={14} />
            Add Holiday
          </button>
        </div>
      </div>

      {/* ── 2. ALERTS ── */}
      {msg.text && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-xs transition ${
            msg.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.type === "success" ? <CheckCircle2 size={16} className="shrink-0 text-emerald-600" /> : <AlertCircle size={16} className="shrink-0 text-red-600" />}
          <span className="flex-1 text-xs font-semibold">{msg.text}</span>
          <button onClick={() => setMsg({ text: "", type: "" })} className="ml-auto text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── 3. MONTHLY KPI STATS ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Working Days</p>
          <h3 className="mt-1 text-2xl font-extrabold text-slate-900">
            {monthStats.workingDays}
            <span className="text-xs font-normal text-slate-400 ml-1">days</span>
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">In {monthName} {year}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Holidays This Month</p>
          <h3 className="mt-1 text-2xl font-extrabold text-blue-600">
            {visibleHolidays.length}
            <span className="text-xs font-normal text-slate-400 ml-1">off</span>
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">Scheduled for {monthName}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Weekend Days</p>
          <h3 className="mt-1 text-2xl font-extrabold text-slate-700">
            {monthStats.weekendDays}
            <span className="text-xs font-normal text-slate-400 ml-1">days</span>
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">Saturdays & Sundays</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Holidays (Year)</p>
          <h3 className="mt-1 text-2xl font-extrabold text-slate-800">
            {holidays.filter(h => (h.date || "").startsWith(String(year))).length}
            <span className="text-xs font-normal text-slate-400 ml-1">total</span>
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">Recorded for {year}</p>
        </div>
      </div>

      {/* ── 4. CALENDAR & SIDEBAR GRID ── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">

        {/* ── MAIN CALENDAR GRID ── */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col">

          {/* Month Navigation Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-900">
                {monthName} {year}
              </h3>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-100">
                {visibleHolidays.length} {visibleHolidays.length === 1 ? "Holiday" : "Holidays"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                title="Previous Month"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition shadow-xs cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextMonth}
                title="Next Month"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition shadow-xs cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, idx) => (
              <div
                key={d}
                className={`py-3 text-center text-[11px] font-bold uppercase tracking-wider ${
                  idx === 0 || idx === 6 ? "text-blue-600 bg-blue-50/30" : "text-slate-500"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 flex-1">
            {days.map((day, i) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[110px] bg-slate-50/40"
                  />
                );
              }

              const key = dateKey(day);
              const holiday = holidayMap[key];
              const cellDate = new Date(year, month, day);
              const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;

              const isToday =
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();

              const typeConfig = HOLIDAY_TYPES.find(t => t.id === holiday?.type) || HOLIDAY_TYPES[0];

              return (
                <div
                  key={key}
                  onClick={() => {
                    if (holiday) {
                      startEdit(holiday);
                    } else {
                      openAddModal(key);
                    }
                  }}
                  className={`group relative min-h-[110px] p-2.5 transition flex flex-col justify-between cursor-pointer select-none ${
                    holiday
                      ? `${typeConfig.color} shadow-xs`
                      : isWeekend
                      ? "bg-slate-50/50 hover:bg-blue-50/40"
                      : "bg-white hover:bg-blue-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                        isToday
                          ? "bg-blue-600 text-white shadow-sm"
                          : holiday
                          ? "bg-white/90 font-extrabold shadow-xs text-slate-900"
                          : isWeekend
                          ? "text-slate-400 font-semibold"
                          : "text-slate-700 font-semibold"
                      }`}
                    >
                      {day}
                    </span>

                    {/* Hover Quick Add Indicator */}
                    {!holiday && (
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-blue-600 flex items-center gap-0.5 transition">
                        <Plus size={12} />
                      </span>
                    )}

                    {holiday && (
                      <span className={`h-2 w-2 rounded-full ${typeConfig.badge}`} />
                    )}
                  </div>

                  {holiday ? (
                    <div className="mt-1.5 rounded-xl bg-white/95 p-1.5 shadow-xs border border-slate-200/80 flex flex-col gap-0.5">
                      <div className="text-[11px] font-bold text-slate-900 truncate" title={holiday.name}>
                        {holiday.name}
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-medium text-slate-500">
                        <span className="capitalize">{holiday.type || "Company"}</span>
                        <span className="text-blue-600 font-semibold">Off</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-[10px] text-slate-300 font-medium group-hover:text-slate-400 transition">
                      {isWeekend ? "Weekend" : "Work day"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR: THIS MONTH & ALL HOLIDAYS ── */}
        <aside className="space-y-4">

          {/* 1. Holidays in Current Month */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {monthName} Holidays
                </h3>
                <p className="text-[11px] text-slate-400">
                  {visibleHolidays.length} holiday(s) scheduled
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                {visibleHolidays.length}
              </span>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {visibleHolidays.length > 0 ? (
                visibleHolidays.map((h) => {
                  const dayNum = (h.date || "").slice(-2);
                  const typeConfig = HOLIDAY_TYPES.find(t => t.id === h.type) || HOLIDAY_TYPES[0];

                  return (
                    <div
                      key={h._id || h.date}
                      className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-white hover:border-slate-200 hover:shadow-sm transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-700 shadow-xs">
                          <span className="text-[9px] uppercase tracking-widest font-bold opacity-70">{monthName.slice(0, 3)}</span>
                          <span className="text-xs font-extrabold leading-none">{dayNum}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-xs font-bold text-slate-900" title={h.name}>
                            {h.name}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="font-mono">{h.date}</span>
                            <span>•</span>
                            <span className="capitalize">{h.type || "company"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => startEdit(h)}
                            title="Edit Holiday"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteHoliday(h._id, h.name)}
                            title="Delete Holiday"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center space-y-2">
                  <CalendarDays size={24} className="mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">No holidays in {monthName}</p>
                  <button
                    onClick={() => openAddModal()}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    + Add a Holiday
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. All Holidays Directory & Search */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                All Company Holidays
              </h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                {holidays.length} Total
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search holidays…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {filteredAllHolidays.length > 0 ? (
                filteredAllHolidays.map((h) => (
                  <div
                    key={h._id || h.date}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-2 hover:bg-white hover:border-slate-200 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-slate-800" title={h.name}>
                        {h.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {h.date}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={() => startEdit(h)}
                        title="Edit"
                        className="p-1 rounded-lg text-slate-400 hover:text-blue-600 transition cursor-pointer"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteHoliday(h._id, h.name)}
                        title="Delete"
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 transition cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No holidays match search
                </div>
              )}
            </div>
          </div>

        </aside>
      </div>

      {/* ── 5. ADD / EDIT HOLIDAY MODAL ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={(e) => e.target === e.currentTarget && resetForm()}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editId ? "Edit Holiday" : "Add New Holiday"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Set up company holidays and non-working calendar dates
                  </p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali, Independence Day, Christmas"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Holiday Date *
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Holiday Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="company">Company Holiday (Office Closed)</option>
                  <option value="public">National / Public Holiday</option>
                  <option value="optional">Optional / Restricted Leave</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formName.trim() || !formDate}
                  className="rounded-2xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm cursor-pointer"
                >
                  {saving ? "Saving…" : editId ? "Update Holiday" : "Save Holiday"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={() => {
          const fn = deleteConfirm.onConfirm;
          setDeleteConfirm(prev => ({ ...prev, open: false }));
          if (fn) fn();
        }}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}