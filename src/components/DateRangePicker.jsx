import React, { useMemo, useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, startOfDay, endOfDay } from "date-fns";

function iso(d) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseISOish(s) {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default function DateRangePicker({ from, to, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);

  const selected = useMemo(() => ({
    from: parseISOish(from),
    to:   parseISOish(to),
  }), [from, to]);

  const label = selected.from && selected.to
    ? `${format(selected.from, "dd MMM")} → ${format(selected.to, "dd MMM")}`
    : "Select range";

  function applyRange(r) {
    if (!r?.from || !r?.to) return;
    onChange?.({
      from: iso(startOfDay(r.from)),
      to:   iso(endOfDay(r.to)).slice(0,10),
    });
    setOpen(false);
  }

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block z-40 ${className}`} ref={pickerRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
        title="Pick date range"
      >
        <span>📅</span>
        <span>{label}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white shadow-2xl p-3"
          style={{ width: 330 }}
        >
          <DayPicker
            mode="range"
            numberOfMonths={1}
            defaultMonth={selected.from || new Date()}
            selected={selected}
            onSelect={(range) => applyRange(range)}
          />

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-1">
              <span className="text-gray-500">From</span>
              <input
                type="date"
                value={from || ""}
                onChange={(e) => onChange?.({ from: e.target.value, to })}
                className="rounded-md border px-2 py-1 w-full text-xs"
              />
            </label>
            <label className="flex items-center gap-1">
              <span className="text-gray-500">To</span>
              <input
                type="date"
                value={to || ""}
                onChange={(e) => onChange?.({ from, to: e.target.value })}
                className="rounded-md border px-2 py-1 w-full text-xs"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
