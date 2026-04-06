import React, { useMemo, useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, startOfDay, endOfDay } from "date-fns";

function iso(d) { return d.toISOString().slice(0,10); }
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
    <div className={`relative inline-block ${className}`} ref={pickerRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
        title="Pick date range"
      >
        📅 {label}
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-xl p-2"
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
