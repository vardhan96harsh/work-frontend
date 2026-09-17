import React, { useState } from "react";
import { Cake, Sparkles, PartyPopper, ChevronDown, ChevronUp } from "lucide-react";

export default function BirthdayBanner({ todayBirthdays }) {
  const [minimized, setMinimized] = useState(false);

  if (!todayBirthdays?.length) return null;

  const names = todayBirthdays
    .map((u) => u.name)
    .filter(Boolean)
    .join(" & ");

  const firstUser = todayBirthdays[0];
  const initial = firstUser?.name ? firstUser.name.charAt(0).toUpperCase() : "🎉";

  if (minimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 animate-bounce">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-4 py-2 text-white shadow-xl shadow-pink-500/25 ring-2 ring-white hover:scale-105 transition-all duration-200 cursor-pointer font-bold text-xs"
          title="Open Birthday Celebration"
        >
          <Cake size={16} className="animate-spin-slow" />
          <span>🎉 {names}'s Birthday!</span>
          <ChevronUp size={14} />
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Birthday celebration notification"
      className="fixed bottom-5 right-5 z-50 w-80 sm:w-88 rounded-2xl bg-white/95 backdrop-blur-md p-4 shadow-2xl border border-pink-100 ring-1 ring-black/5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
    >
      {/* Background festive glow */}
      <div className="absolute -top-10 -right-10 -z-10 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 -z-10 h-28 w-28 rounded-full bg-amber-400/20 blur-2xl" />

      {/* Card Header with tag & minimize button */}
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-50 to-amber-50 px-2.5 py-0.5 text-[11px] font-extrabold text-pink-700 uppercase tracking-wider border border-pink-200/70 shadow-2xs">
          <PartyPopper size={12} className="text-pink-600" />
          Today's Birthday
        </span>

        <button
          onClick={() => setMinimized(true)}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          title="Minimize card"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Profile & Wish Content */}
      <div className="flex items-center gap-3.5 mb-3">
        {/* Avatar circle with birthday crown/cake badge */}
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 text-white font-extrabold text-lg shadow-md shadow-pink-500/20 ring-2 ring-white">
            {initial}
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-xs ring-2 ring-white text-[11px]">
            🎂
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-gray-900 leading-snug truncate">
            {names}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Sparkles size={11} className="text-amber-500 shrink-0" />
            <span>Celebrate this special day!</span>
          </p>
        </div>
      </div>

      {/* Celebration message */}
      <div className="rounded-xl bg-pink-50/70 border border-pink-100 px-3.5 py-2.5 text-xs text-pink-950 font-medium leading-relaxed">
        🎉 Wishing you a wonderful year ahead filled with happiness and great success! 🎂 ✨
      </div>
    </aside>
  );
}


