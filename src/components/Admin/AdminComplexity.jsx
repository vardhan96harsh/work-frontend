import React, { useState, useEffect } from "react";
import { Sparkles, Check, Sliders, RotateCcw, Clock, Layers, Award } from "lucide-react";

export const DEFAULT_COMPLEXITY_CONFIG = {
  hoursPerWorkingDay: 7,
  rates: {
    idRateHoursPerMin: 0.4,       // 4h for 10 min
    idReviewHoursPerMin: 0.15,
    animatorHoursPerMin: 3.5,     // 7h for 2 min
    developerHoursPerMin: 7 / 3,  // 7h for 3 min (~2.333)
    qaHoursPerMin: 0.15,          // 1.5h for 10 min
    visualDesignHoursPerMin: 0.2,
  },
  complexityRatios: {
    Low: {
      name: "Low Complexity",
      animatorRatioPercent: 0,
      developerRatioPercent: 100,
      baselineAnimMinutes: 0,
      baselineDevMinutes: 60,
      description: "Standard template-driven course, 100% developer authored with no custom motion animation.",
    },
    Medium: {
      name: "Medium Complexity",
      animatorRatioPercent: (10 / 60) * 100,
      developerRatioPercent: (50 / 60) * 100,
      baselineAnimMinutes: 10,
      baselineDevMinutes: 50,
      description: "Balanced interactive course with ~10 mins of custom Vyond animations per 60 mins of content.",
    },
    High: {
      name: "High Complexity",
      animatorRatioPercent: 50,
      developerRatioPercent: 50,
      baselineAnimMinutes: 30,
      baselineDevMinutes: 30,
      description: "Rich multimedia course with 50% custom animation scenarios and 50% interactive development.",
    },
    Extreme: {
      name: "Extreme Complexity",
      animatorRatioPercent: (50 / 60) * 100,
      developerRatioPercent: (10 / 60) * 100,
      baselineAnimMinutes: 50,
      baselineDevMinutes: 10,
      description: "Heavy animation-led experience with ~50 mins of custom Vyond/2D animation per 60 mins of content.",
    },
  },
};

export default function AdminComplexity({ auth, theme }) {
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem("elearn_pm_complexity_v1");
      return stored ? JSON.parse(stored) : DEFAULT_COMPLEXITY_CONFIG;
    } catch {
      return DEFAULT_COMPLEXITY_CONFIG;
    }
  });

  const [hoursPerDay, setHoursPerDay] = useState(config.hoursPerWorkingDay || 7);
  const [idHours, setIdHours] = useState(((config.rates?.idRateHoursPerMin || 0.4) * 10).toFixed(1));
  const [animHours, setAnimHours] = useState(((config.rates?.animatorHoursPerMin || 3.5) * 2).toFixed(1));
  const [devHours, setDevHours] = useState(((config.rates?.developerHoursPerMin || (7 / 3)) * 3).toFixed(1));
  const [qaHours, setQaHours] = useState(((config.rates?.qaHoursPerMin || 0.15) * 10).toFixed(1));

  const r = config.complexityRatios || DEFAULT_COMPLEXITY_CONFIG.complexityRatios;
  const [lowAnim, setLowAnim] = useState(r.Low?.baselineAnimMinutes ?? 0);
  const [medAnim, setMedAnim] = useState(r.Medium?.baselineAnimMinutes ?? 10);
  const [highAnim, setHighAnim] = useState(r.High?.baselineAnimMinutes ?? 30);
  const [extAnim, setExtAnim] = useState(r.Extreme?.baselineAnimMinutes ?? 50);

  const [savedMsg, setSavedMsg] = useState(false);

  // Simulation calculations for 60-min reference course
  function calcSim(animMins) {
    const devMins = Math.max(0, 60 - animMins);
    const idRate = Number(idHours) / 10;
    const animRate = Number(animHours) / 2;
    const devRate = Number(devHours) / 3;
    const qaRate = Number(qaHours) / 10;
    const hDay = Number(hoursPerDay) || 7;

    const idTotal = 60 * idRate;
    const animTotal = animMins * animRate;
    const devTotal = devMins * devRate;
    const qaTotal = 60 * qaRate;
    const totalH = Math.round(idTotal + animTotal + devTotal + qaTotal);
    const totalD = (totalH / hDay).toFixed(1);

    return { totalH, totalD, idTotal: Math.round(idTotal), animTotal: Math.round(animTotal), devTotal: Math.round(devTotal), qaTotal: Math.round(qaTotal) };
  }

  const simLow = calcSim(lowAnim);
  const simMed = calcSim(medAnim);
  const simHigh = calcSim(highAnim);
  const simExt = calcSim(extAnim);

  function saveConfig() {
    const newConfig = {
      hoursPerWorkingDay: Number(hoursPerDay) || 7,
      rates: {
        idRateHoursPerMin: Number(idHours) / 10,
        idReviewHoursPerMin: (Number(idHours) / 10) * 0.35,
        animatorHoursPerMin: Number(animHours) / 2,
        developerHoursPerMin: Number(devHours) / 3,
        qaHoursPerMin: Number(qaHours) / 10,
        visualDesignHoursPerMin: 0.2,
      },
      complexityRatios: {
        Low: {
          name: "Low Complexity",
          animatorRatioPercent: (lowAnim / 60) * 100,
          developerRatioPercent: ((60 - lowAnim) / 60) * 100,
          baselineAnimMinutes: lowAnim,
          baselineDevMinutes: 60 - lowAnim,
          description: "Standard template-driven course with minimal custom motion animation.",
        },
        Medium: {
          name: "Medium Complexity",
          animatorRatioPercent: (medAnim / 60) * 100,
          developerRatioPercent: ((60 - medAnim) / 60) * 100,
          baselineAnimMinutes: medAnim,
          baselineDevMinutes: 60 - medAnim,
          description: "Balanced interactive course with custom Vyond animation scenarios.",
        },
        High: {
          name: "High Complexity",
          animatorRatioPercent: (highAnim / 60) * 100,
          developerRatioPercent: ((60 - highAnim) / 60) * 100,
          baselineAnimMinutes: highAnim,
          baselineDevMinutes: 60 - highAnim,
          description: "Rich multimedia course with 50% custom animation scenarios.",
        },
        Extreme: {
          name: "Extreme Complexity",
          animatorRatioPercent: (extAnim / 60) * 100,
          developerRatioPercent: ((60 - extAnim) / 60) * 100,
          baselineAnimMinutes: extAnim,
          baselineDevMinutes: 60 - extAnim,
          description: "Heavy animation-led experience with extensive motion graphic assets.",
        },
      },
    };

    setConfig(newConfig);
    try {
      localStorage.setItem("elearn_pm_complexity_v1", JSON.stringify(newConfig));
    } catch {}

    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  }

  function resetToDefaults() {
    setHoursPerDay(DEFAULT_COMPLEXITY_CONFIG.hoursPerWorkingDay);
    setIdHours("4.0");
    setAnimHours("7.0");
    setDevHours("7.0");
    setQaHours("1.5");
    setLowAnim(0);
    setMedAnim(10);
    setHighAnim(30);
    setExtAnim(50);
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs border border-blue-100">
                <Sliders size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Complexity &amp; Productivity Rates
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure workday capacity standards, ID / Vyond / Developer production speeds, and minute-split ratios.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-white transition cursor-pointer"
            >
              <RotateCcw size={14} className="text-slate-500" />
              <span>Reset Defaults</span>
            </button>
            <button
              onClick={saveConfig}
              className="flex items-center gap-1.5 h-10 px-5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
            >
              <Check size={15} />
              <span>Save Complexity Rules</span>
            </button>
          </div>
        </div>
      </div>

      {savedMsg && (
        <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs">
          <Check size={16} className="text-emerald-600 shrink-0" />
          <span>Complexity &amp; productivity rules successfully saved and active across all project plan schedules!</span>
        </div>
      )}

      {/* Main Grid: Left Controls & Right Live Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* LEFT CONTROLS (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">

          {/* Card 1: Workday Standard */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                <Clock size={18} className="text-blue-600" />
                <span>Working Day Capacity Standard</span>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
                Capacity Standard
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="w-36">
                <input
                  type="number"
                  min="4"
                  max="12"
                  step="0.5"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>
              <span className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Standard full-time working hours per calendar work day (default: <strong className="text-slate-700">7h/day</strong>).
              </span>
            </div>
          </div>

          {/* Card 2: Productivity Rates */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                <Sliders size={18} className="text-blue-600" />
                <span>Productivity Rates (Effort per unit of output)</span>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                Speed Benchmarks
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* ID Rate */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Instructional Design</label>
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
                    ID
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="number"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={idHours}
                    onChange={(e) => setIdHours(e.target.value)}
                    className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <span className="text-xs text-slate-500 font-medium">hours for 10 min output</span>
                </div>
              </div>

              {/* Animator Rate */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Vyond / 2D Animator</label>
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-100">
                    Animator
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="number"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={animHours}
                    onChange={(e) => setAnimHours(e.target.value)}
                    className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <span className="text-xs text-slate-500 font-medium">hours for 2 min output</span>
                </div>
              </div>

              {/* Developer Rate */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Developer (Storyline)</label>
                  <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-100">
                    Developer
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="number"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={devHours}
                    onChange={(e) => setDevHours(e.target.value)}
                    className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <span className="text-xs text-slate-500 font-medium">hours for 3 min output</span>
                </div>
              </div>

              {/* QA Rate */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Quality Assurance (QA)</label>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                    QA
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="number"
                    min="0.2"
                    max="10"
                    step="0.1"
                    value={qaHours}
                    onChange={(e) => setQaHours(e.target.value)}
                    className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <span className="text-xs text-slate-500 font-medium">hours for 10 min output</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Minute-Split Sliders */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                <Layers size={18} className="text-teal-600" />
                <span>Complexity Minute-Split Allocations (per 60-min reference)</span>
              </div>
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-100">
                Ratios
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Low */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-emerald-800 font-extrabold">Low Complexity</span>
                  <span className="text-slate-600 font-semibold">{lowAnim} min Vyond · {60 - lowAnim} min Dev</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={lowAnim}
                  onChange={(e) => setLowAnim(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer h-2 bg-emerald-100 rounded-lg"
                />
              </div>

              {/* Medium */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-blue-800 font-extrabold">Medium Complexity</span>
                  <span className="text-slate-600 font-semibold">{medAnim} min Vyond · {60 - medAnim} min Dev</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={medAnim}
                  onChange={(e) => setMedAnim(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-2 bg-blue-100 rounded-lg"
                />
              </div>

              {/* High */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-amber-800 font-extrabold">High Complexity</span>
                  <span className="text-slate-600 font-semibold">{highAnim} min Vyond · {60 - highAnim} min Dev</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={highAnim}
                  onChange={(e) => setHighAnim(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer h-2 bg-amber-100 rounded-lg"
                />
              </div>

              {/* Extreme */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-rose-800 font-extrabold">Extreme Complexity</span>
                  <span className="text-slate-600 font-semibold">{extAnim} min Vyond · {60 - extAnim} min Dev</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={extAnim}
                  onChange={(e) => setExtAnim(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer h-2 bg-rose-100 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT LIVE SIMULATION (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.04)] space-y-5 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                <Sparkles size={18} className="text-blue-600" />
                <span>Live Impact Simulation (60-min Course)</span>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
                Preview
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Review how current productivity speeds and minute ratios impact total effort and working days across each complexity level.
            </p>

            {/* Sim Cards */}
            <div className="space-y-3">
              {/* Low */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1.5 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-900">Low Complexity</span>
                  <span className="text-xs font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                    {simLow.totalH} hrs · {simLow.totalD} days
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  ID: {simLow.idTotal}h · Vyond: {simLow.animTotal}h · Dev: {simLow.devTotal}h · QA: {simLow.qaTotal}h
                </div>
              </div>

              {/* Medium */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-1.5 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-900">Medium Complexity</span>
                  <span className="text-xs font-extrabold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200">
                    {simMed.totalH} hrs · {simMed.totalD} days
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  ID: {simMed.idTotal}h · Vyond: {simMed.animTotal}h · Dev: {simMed.devTotal}h · QA: {simMed.qaTotal}h
                </div>
              </div>

              {/* High */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-1.5 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-900">High Complexity</span>
                  <span className="text-xs font-extrabold text-amber-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                    {simHigh.totalH} hrs · {simHigh.totalD} days
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  ID: {simHigh.idTotal}h · Vyond: {simHigh.animTotal}h · Dev: {simHigh.devTotal}h · QA: {simHigh.qaTotal}h
                </div>
              </div>

              {/* Extreme */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-1.5 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-900">Extreme Complexity</span>
                  <span className="text-xs font-extrabold text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-rose-200">
                    {simExt.totalH} hrs · {simExt.totalD} days
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  ID: {simExt.idTotal}h · Vyond: {simExt.animTotal}h · Dev: {simExt.devTotal}h · QA: {simExt.qaTotal}h
                </div>
              </div>
            </div>

            <button
              onClick={saveConfig}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition cursor-pointer"
            >
              <Award size={15} />
              <span>Apply Rules to Tracker</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
