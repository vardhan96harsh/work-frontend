import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Building2,
  Globe,
  Star,
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
    color: "bg-amber-50/90 text-amber-900 border-amber-200",
    badge: "bg-amber-500",
    pillBg: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: Star,
  },
];

export default function UserCalendar({ auth }) {
  const today = new Date();

  const [current, setCurrent] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);

  const year = current.getFullYear();
  const month = current.getMonth();

  const monthName = current.toLocaleString("default", { month: "long" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  async function loadHolidays() {
    setLoading(true);
    try {
      const res = await api(`/api/holidays?year=${year}&month=${month + 1}`, {
        token: auth.token,
      });
      setHolidays(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Holiday load error", e);
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHolidays();
  }, [month, year, auth.token]);

  const holidayMap = useMemo(() => {
    return holidays.reduce((acc, h) => {
      if (h?.date) {
        const key = h.date.slice(0, 10);
        acc[key] = h;
      }
      return acc;
    }, {});
  }, [holidays]);

  const days = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function dateKey(day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

  return (
    <div className="space-y-4 pb-16">
      {/* Page Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 shadow-xs">
              <CalendarDays size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Calendar & Schedule</h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
                  OFFICIAL SCHEDULE
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Track official company holidays, public leaves, and work day schedules.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs cursor-pointer"
            >
              <Clock size={13} className="text-slate-500" />
              Today
            </button>

            <button
              onClick={prevMonth}
              title="Previous Month"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={nextMonth}
              title="Next Month"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Layout */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Main Calendar */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {monthName} {year}
              </h3>
              <p className="text-xs text-slate-500">
                {loading
                  ? "Loading holidays..."
                  : `${holidays.length} holiday(s) this month`}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="font-semibold text-slate-600">Today</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="font-semibold text-slate-600">Holiday</span>
              </div>
            </div>
          </div>

          {/* Week Header */}
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

          {/* Days */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 flex-1">
            {days.map((day, i) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[105px] bg-slate-50/40"
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
                  className={`relative min-h-[105px] p-2.5 transition flex flex-col justify-between select-none ${
                    holiday
                      ? `${typeConfig.color} shadow-xs`
                      : isWeekend
                      ? "bg-slate-50/50 hover:bg-slate-100/50"
                      : "bg-white hover:bg-slate-50"
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
                    <div className="mt-2 text-[10px] text-slate-300 font-medium">
                      {isWeekend ? "Weekend" : "Work day"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel */}
        <aside className="space-y-4">
          {/* Holidays */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {monthName} Holidays
              </h3>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                {holidays.length}
              </span>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {holidays.length > 0 ? (
                holidays.map((h) => {
                  const dayNum = (h.date || "").slice(-2);
                  const typeConfig = HOLIDAY_TYPES.find(t => t.id === h.type) || HOLIDAY_TYPES[0];

                  return (
                    <div
                      key={h._id || h.date}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-white hover:border-slate-200 hover:shadow-xs transition"
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
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center space-y-2">
                  <CalendarDays size={24} className="mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">No holidays in {monthName}</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}