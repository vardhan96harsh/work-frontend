import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import ConfirmModal from "./ConfirmModal.jsx";
import {
  FolderTree, Calendar, Users, Sparkles, Plus, Trash2, Save,
  RefreshCw, CheckCircle2, Clock, ChevronDown, ChevronRight,
  AlertCircle, FileSpreadsheet, Briefcase, X, Check, FileText,
  TrendingUp, BarChart2, Target, Edit2, Building2, Layers, ExternalLink,
} from "lucide-react";


// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const ROLES = [
  { id: "PM",        name: "Project Manager",        color: "#2563eb" },
  { id: "ID",        name: "Instructional Designer", color: "#3b82f6" },
  { id: "DEVELOPER", name: "Course Developer",        color: "#0d9488" },
  { id: "ANIMATOR",  name: "2D/Vyond Animator",       color: "#f59e0b" },
  { id: "DESIGNER",  name: "Visual Designer",          color: "#0284c7" },
  { id: "QA",        name: "QA Specialist",            color: "#10b981" },
  { id: "VO",        name: "Voiceover Artist",         color: "#f97316" },
];

const STATUS_COLORS = {
  not_started: { bg: "bg-slate-100",   text: "text-slate-600",   label: "Not Started" },
  in_progress:  { bg: "bg-blue-100",   text: "text-blue-700",    label: "In Progress"  },
  review:       { bg: "bg-amber-100",  text: "text-amber-700",   label: "Review"       },
  completed:    { bg: "bg-emerald-100",text: "text-emerald-700", label: "Completed"    },
  blocked:      { bg: "bg-rose-100",   text: "text-rose-700",    label: "Blocked"      },
  on_hold:      { bg: "bg-slate-200",  text: "text-slate-700",   label: "On Hold"      },
};

const PRIORITY_COLORS = {
  High:   "bg-rose-50   text-rose-700   border border-rose-200",
  Medium: "bg-amber-50  text-amber-700  border border-amber-200",
  Low:    "bg-slate-50  text-slate-600  border border-slate-200",
};

// Starter WBS templates
const TEMPLATES = {
  "storyline-360": {
    name: "Storyline 360 — Full Production",
    phases: [
      {
        id: "p-1", name: "Phase 1: Project Initiation & HLD", code: "PH-1",
        color: "#3b82f6", expanded: true, tasks: [
          { id:"t-1a", title:"Project Kickoff & Scope Alignment",              role:"Project Manager",        estimatedHours:7,  durationDays:1, startDate:"", endDate:"", status:"not_started", priority:"High",   deliverable:"Kickoff Deck",       assignedTo:[], subtasks:[] },
          { id:"t-1b", title:"Requirement Analysis & Source Material Audit",   role:"Instructional Designer", estimatedHours:14, durationDays:2, startDate:"", endDate:"", status:"not_started", priority:"High",   deliverable:"Source Audit Report",assignedTo:[], subtasks:[] },
          { id:"t-1c", title:"High-Level Design (HLD) & Visual Prototype",     role:"Instructional Designer", estimatedHours:14, durationDays:2, startDate:"", endDate:"", status:"not_started", priority:"Medium", deliverable:"HLD & Style Guide",  assignedTo:[], subtasks:[] },
        ],
      },
      {
        id: "p-2", name: "Phase 2: Instructional Design & Storyboarding", code: "PH-2",
        color: "#0d9488", expanded: true, tasks: [
          { id:"t-2a", title:"Module Content In-Depth Review",                 role:"Instructional Designer", estimatedHours:14, durationDays:2, startDate:"", endDate:"", status:"not_started", priority:"Medium", deliverable:"Content Clarification Matrix", assignedTo:[], subtasks:[] },
          { id:"t-2b", title:"Detailed Storyboard Scripting",                  role:"Instructional Designer", estimatedHours:28, durationDays:4, startDate:"", endDate:"", status:"not_started", priority:"High",   deliverable:"Full Storyboard Script",      assignedTo:[], subtasks:[] },
          { id:"t-2c", title:"Internal & Client Storyboard Review",            role:"Project Manager",        estimatedHours:14, durationDays:2, startDate:"", endDate:"", status:"not_started", priority:"High",   deliverable:"Approved Storyboard",         assignedTo:[], subtasks:[] },
        ],
      },
      {
        id: "p-3", name: "Phase 3: Visual Design & Audio Production", code: "PH-3",
        color: "#0284c7", expanded: true, tasks: [
          { id:"t-3a", title:"Custom UI Graphics & 2D Asset Creation",         role:"Visual Designer",        estimatedHours:21, durationDays:3, startDate:"", endDate:"", status:"not_started", priority:"Medium", deliverable:"Asset Pack & PNG Cuts", assignedTo:[], subtasks:[] },
          { id:"t-3b", title:"Voiceover Recording & Audio Mastering",          role:"Voiceover Artist",       estimatedHours:7,  durationDays:1, startDate:"", endDate:"", status:"not_started", priority:"Medium", deliverable:"WAV / MP3 Audio Cuts",  assignedTo:[], subtasks:[] },
        ],
      },
      {
        id: "p-4", name: "Phase 4: Animation & Storyline Build", code: "PH-4",
        color: "#f59e0b", expanded: true, tasks: [
          { id:"t-4a", title:"Vyond / 2D Motion Animation Production",         role:"2D/Vyond Animator",      estimatedHours:28, durationDays:4, startDate:"", endDate:"", status:"not_started", priority:"High",   deliverable:"MP4 Video Cuts",           assignedTo:[], subtasks:[] },
          { id:"t-4b", title:"Storyline 360 Slide Interactivity Development",  role:"Course Developer",       estimatedHours:35, durationDays:5, startDate:"", endDate:"", status:"not_started", priority:"High",   deliverable:"Alpha Build SCORM Package", assignedTo:[], subtasks:[] },
        ],
      },
      {
        id: "p-5", name: "Phase 5: QA, Testing & Delivery", code: "PH-5",
        color: "#10b981", expanded: true, tasks: [
          { id:"t-5a", title:"Functional, SCORM & Accessibility QA Testing",   role:"QA Specialist",          estimatedHours:14, durationDays:2, startDate:"", endDate:"", status:"not_started", priority:"High",   deliverable:"QA Bug Report",             assignedTo:[], subtasks:[] },
          { id:"t-5b", title:"QA Bug Fixes & Gold Master Packaging",           role:"Course Developer",       estimatedHours:14, durationDays:2, startDate:"", endDate:"", status:"not_started", priority:"High",   deliverable:"Final SCORM Package",       assignedTo:[], subtasks:[] },
        ],
      },
    ],
  },
  "rise-360": {
    name: "Rise 360 — Microlearning",
    phases: [
      {
        id: "p-r1", name: "Phase 1: Content Architecture", code: "PH-1",
        color: "#06b6d4", expanded: true, tasks: [
          { id:"t-r1a", title:"Microlearning Outline & Architecture",          role:"Instructional Designer", estimatedHours:14, durationDays:2, startDate:"", endDate:"", status:"not_started", priority:"High",   deliverable:"Curriculum Map",  assignedTo:[], subtasks:[] },
        ],
      },
      {
        id: "p-r2", name: "Phase 2: Rise Authoring & QA", code: "PH-2",
        color: "#0d9488", expanded: true, tasks: [
          { id:"t-r2a", title:"Rise 360 Blocks & Knowledge Checks Build",      role:"Course Developer",       estimatedHours:21, durationDays:3, startDate:"", endDate:"", status:"not_started", priority:"High",   deliverable:"Rise Review Link", assignedTo:[], subtasks:[] },
          { id:"t-r2b", title:"Responsive Multi-Device QA & LMS Export",       role:"QA Specialist",          estimatedHours:7,  durationDays:1, startDate:"", endDate:"", status:"not_started", priority:"Medium", deliverable:"QA Sign-off",     assignedTo:[], subtasks:[] },
        ],
      },
    ],
  },
  "blank": {
    name: "Blank — Custom WBS",
    phases: [
      {
        id: "p-b1", name: "Phase 1: Planning & Setup", code: "PH-1",
        color: "#2563eb", expanded: true, tasks: [
          { id:"t-b1a", title:"Initial Deliverable Task",                      role:"Instructional Designer", estimatedHours:7,  durationDays:1, startDate:"", endDate:"", status:"not_started", priority:"Medium", deliverable:"Scope Document",  assignedTo:[], subtasks:[] },
        ],
      },
    ],
  },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function isWeekend(d) { const day = d.getDay(); return day === 0 || day === 6; }

function addWorkingDays(startIso, days, holidays = []) {
  const holSet = new Set(holidays.map(h => (h.date || "").slice(0, 10)));
  let date = new Date(startIso);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const iso = date.toISOString().slice(0, 10);
    if (!isWeekend(date) && !holSet.has(iso)) added++;
  }
  return date.toISOString().slice(0, 10);
}

function generateDatesForPhases(phases, startIso, holidays = []) {
  let cur = startIso || new Date().toISOString().slice(0, 10);
  return phases.map(phase => ({
    ...phase,
    tasks: phase.tasks.map(task => {
      const dur = Number(task.durationDays) || Math.max(1, Math.ceil((task.estimatedHours || 7) / 7));
      const tStart = cur;
      const tEnd = addWorkingDays(tStart, dur, holidays);
      cur = tEnd;
      return { ...task, durationDays: dur, startDate: tStart, endDate: tEnd };
    }),
  }));
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

// ─────────────────────────────────────────────
// GANTT VIEW — Exact Project Plan Tool port
// ─────────────────────────────────────────────

const PHASE_COLORS = ["#2563eb","#0d9488","#0284c7","#f59e0b","#10b981","#06b6d4","#f97316","#334155"];

const COMPLEXITY_CONFIG = {
  Low:     { label:"Low",     mult:0.7,  desc:"Simple, template-driven. No custom animation." },
  Medium:  { label:"Medium",  mult:1.0,  desc:"Standard interactive with ~10 mins Vyond per 60 mins." },
  High:    { label:"High",    mult:1.4,  desc:"Rich multimedia, 50% custom animation scenarios." },
  Extreme: { label:"Extreme", mult:1.85, desc:"Heavy animation-led, ~50 mins Vyond per 60 mins content." },
};

function GanttView({ phases, allPhases, holidays, settings, employees, isDark: propIsDark }) {
  const [zoom,          setZoom]          = React.useState("day");
  const [showArrows,    setShowArrows]    = React.useState(true);
  const [ganttSearch,   setGanttSearch]   = React.useState("");
  const [catFilter,     setCatFilter]     = React.useState("ALL");
  const [collapsed,     setCollapsed]     = React.useState(new Set());
  const [complexity,    setComplexity]    = React.useState(settings?.complexity || "Medium");
  const leftRef  = React.useRef(null);
  const rightRef = React.useRef(null);
  const svgRef   = React.useRef(null);

  const isDark = propIsDark !== undefined
    ? propIsDark
    : (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

  // Sync vertical scroll between left and right panels
  React.useEffect(() => {
    const left = leftRef.current; const right = rightRef.current;
    if (!left || !right) return;
    const onR = () => { left.scrollTop = right.scrollTop; };
    const onL = () => { right.scrollTop = left.scrollTop; };
    right.addEventListener("scroll", onR);
    left.addEventListener("scroll",  onL);
    return () => { right.removeEventListener("scroll", onR); left.removeEventListener("scroll", onL); };
  }, []);

  const cellWidth = zoom==="day" ? 36 : zoom==="week" ? 22 : 12;
  const ROW_H = 42; const PHASE_H = 38; const HEADER_H = 52;

  // Build flat task list from all phases with computed hours multiplied by complexity
  const cpxMult = COMPLEXITY_CONFIG[complexity]?.mult || 1;

  const allTasks = React.useMemo(() => {
    const tasks = [];
    allPhases.forEach((ph, phIdx) => {
      const color = ph.color || PHASE_COLORS[phIdx % PHASE_COLORS.length];
      ph.tasks.forEach((t, tIdx) => {
        const q = ganttSearch.toLowerCase().trim();
        const matchQ = !q || t.title.toLowerCase().includes(q) || (t.role||"").toLowerCase().includes(q);
        const matchC = catFilter === "ALL" || t.role === catFilter;
        tasks.push({
          ...t,
          phaseId: ph.id,
          phaseName: ph.name,
          phaseColor: color,
          wbs: `${phIdx+1}.${tIdx+1}`,
          estimatedHours: Math.round((Number(t.estimatedHours)||7) * cpxMult),
          durationDays: Math.max(1, Math.round((Number(t.durationDays)||1) * cpxMult)),
          _show: matchQ && matchC,
        });
      });
    });
    return tasks;
  }, [allPhases, ganttSearch, catFilter, cpxMult]);

  // Date range
  const { dateRange, dateToIdx } = React.useMemo(() => {
    if (allTasks.length === 0) return { dateRange: [], dateToIdx: new Map() };
    let minD = null; let maxD = null;
    allTasks.forEach(t => {
      if (t.startDate) { const d = new Date(t.startDate); if (!minD || d < minD) minD = d; }
      if (t.endDate)   { const d = new Date(t.endDate);   if (!maxD || d > maxD) maxD = d; }
    });
    if (!minD) minD = new Date();
    if (!maxD) maxD = new Date(minD); maxD.setDate(maxD.getDate() + 30);
    minD = new Date(minD); minD.setDate(minD.getDate() - 3);
    maxD = new Date(maxD); maxD.setDate(maxD.getDate() + 8);
    const range = []; let cur = new Date(minD);
    while (cur <= maxD) { range.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    const idx = new Map();
    range.forEach((d, i) => idx.set(d.toISOString().slice(0,10), i));
    return { dateRange: range, dateToIdx: idx };
  }, [allTasks]);

  const totalW = dateRange.length * cellWidth;
  const holSet = React.useMemo(() => new Set((holidays||[]).map(h => (h.date||"").slice(0,10))), [holidays]);
  const todayIso = new Date().toISOString().slice(0,10);

  function isWknd(d) { const day = d.getDay(); return day===0||day===6; }
  function isHol(d)  { return holSet.has(d.toISOString().slice(0,10)); }
  function isToday(d){ return d.toISOString().slice(0,10) === todayIso; }

  // Month + day header rows
  const monthCells = React.useMemo(() => {
    if (!dateRange.length) return [];
    const cells = []; let cur = null; let start = 0; let count = 0;
    dateRange.forEach((d, i) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key !== cur) {
        if (cur !== null) cells.push({ label: cur, width: count * cellWidth });
        cur = key; start = i; count = 0;
      }
      count++;
    });
    if (cur) cells.push({ label: cur, width: count * cellWidth });
    return cells.map(c => {
      const [y, m] = c.label.split("-");
      return { ...c, label: `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m]} ${y}` };
    });
  }, [dateRange, cellWidth]);

  // Layout rows (phases + tasks)
  const layoutRows = React.useMemo(() => {
    const rows = []; let y = 0;
    const phaseMap = new Map(allPhases.map(p => [p.id, p]));
    const seenPhases = new Set();
    allTasks.forEach(t => {
      if (!seenPhases.has(t.phaseId)) {
        seenPhases.add(t.phaseId);
        const ph = phaseMap.get(t.phaseId);
        if (ph) {
          const phTasks = allTasks.filter(tt => tt.phaseId === ph.id);
          const totalH = phTasks.reduce((a,tt) => a+(Number(tt.estimatedHours)||0),0);
          const totalD = phTasks.reduce((a,tt) => a+(Number(tt.durationDays)||0),0);
          rows.push({ type:"phase", ph, y, totalH, totalD });
          y += PHASE_H;
          if (!collapsed.has(ph.id)) {
            phTasks.filter(tt => tt._show).forEach(tt => {
              rows.push({ type:"task", task:tt, y, centerY: y + 21 });
              y += ROW_H;
            });
          }
        }
      }
    });
    return { rows, totalHeight: y };
  }, [allTasks, allPhases, collapsed]);

  const { rows, totalHeight } = layoutRows;

  // Task coordinate map for dependency arrows
  const coordMap = React.useMemo(() => {
    const m = new Map();
    rows.forEach(r => {
      if (r.type !== "task") return;
      const t = r.task;
      const si = dateToIdx.get(t.startDate) ?? 0;
      const ei = dateToIdx.get(t.endDate) ?? si;
      const span = Math.max(1, ei - si + 1);
      const barX = si * cellWidth;
      const barW = Math.max(cellWidth - 4, span * cellWidth - 4);
      m.set(t.id, { x:barX, y:r.centerY, width:barW, startX:barX, endX:barX+barW });
    });
    return m;
  }, [rows, dateToIdx, cellWidth]);

  // Dependency SVG paths
  const svgPaths = React.useMemo(() => {
    const paths = [];
    allTasks.forEach(t => {
      const tc = coordMap.get(t.id); if (!tc) return;
      (t.dependsOn || []).forEach(predId => {
        const pc = coordMap.get(predId); if (!pc) return;
        const sx = pc.endX, sy = pc.y, ex = tc.startX, ey = tc.y;
        let d = "";
        if (ex >= sx + 12) { const mx = sx + 8; d = `M ${sx} ${sy} H ${mx} V ${ey} H ${ex}`; }
        else { const dy = sy + 21; const bx = ex - 10; d = `M ${sx} ${sy} H ${sx+8} V ${dy} H ${bx} V ${ey} H ${ex}`; }
        paths.push({ d, fromId: predId, toId: t.id });
      });
    });
    return paths;
  }, [allTasks, coordMap]);

  const [hoveredTaskId, setHoveredTaskId] = React.useState(null);
  const uniqueRoles = [...new Set(allTasks.map(t => t.role).filter(Boolean))];
  const totalEffortHours = allTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
  const totalDurationDays = allTasks.reduce((acc, t) => acc + (t.durationDays || 0), 0);

  return (
    <div style={{
      width: "100%",
      background: isDark ? "rgba(18,20,42,0.85)" : "#ffffff",
      border: isDark ? "1px solid rgba(139,92,246,0.22)" : "1px solid #e2e8f0",
      borderRadius: "18px",
      display: "flex",
      flexDirection: "column",
      boxShadow: isDark ? "0 10px 30px -5px rgba(0,0,0,0.55)" : "0 4px 20px rgba(0,0,0,0.06)",
      overflow: "hidden",
      height: "760px",
      minHeight: "700px",
      maxHeight: "84vh",
    }}>
      {/* Top Filter & View Bar inside Gantt */}
      <div style={{
        padding: "10px 18px",
        background: isDark ? "rgba(22,25,52,0.85)" : "#f8fafc",
        borderBottom: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Zoom Pills */}
          <div style={{
            display: "inline-flex",
            background: isDark ? "rgba(13,15,33,0.95)" : "#f1f5f9",
            border: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "2px",
          }}>
            {["day", "week", "month"].map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: zoom === z ? "linear-gradient(135deg,#2563eb,#0284c7)" : "transparent",
                  color: zoom === z ? "#fff" : isDark ? "#cbd5e1" : "#64748b",
                  boxShadow: zoom === z ? "0 2px 8px rgba(168,85,247,0.4)" : "none",
                }}
              >
                {z.charAt(0).toUpperCase() + z.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            value={ganttSearch}
            onChange={(e) => setGanttSearch(e.target.value)}
            placeholder="Search tasks…"
            style={{
              width: "200px",
              padding: "6px 12px",
              fontSize: "12px",
              borderRadius: "8px",
              border: isDark ? "1px solid rgba(139,92,246,0.25)" : "1px solid #cbd5e1",
              background: isDark ? "rgba(13,15,33,0.95)" : "#ffffff",
              color: isDark ? "#e2e8f0" : "#1e293b",
              outline: "none",
            }}
          />

          {/* Role filter */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            style={{
              width: "190px",
              padding: "6px 12px",
              fontSize: "12px",
              borderRadius: "8px",
              border: isDark ? "1px solid rgba(139,92,246,0.25)" : "1px solid #cbd5e1",
              background: isDark ? "rgba(13,15,33,0.95)" : "#ffffff",
              color: isDark ? "#e2e8f0" : "#1e293b",
              outline: "none",
            }}
          >
            <option value="ALL">All Roles ({uniqueRoles.length})</option>
            {uniqueRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Dependency arrows checkbox */}
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            color: isDark ? "#cbd5e1" : "#475569",
            userSelect: "none",
          }}>
            <input
              type="checkbox"
              checked={showArrows}
              onChange={(e) => setShowArrows(e.target.checked)}
              style={{ accentColor: "#2563eb", cursor: "pointer", width: "14px", height: "14px" }}
            />
            <span>Dependency Arrows</span>
          </label>

          <span style={{
            fontSize: "11px",
            fontWeight: 700,
            color: isDark ? "#38bdf8" : "#2563eb",
            background: isDark ? "rgba(168,85,247,0.15)" : "#eef2ff",
            padding: "3px 10px",
            borderRadius: "99px",
          }}>
            {allTasks.filter((t) => t._show).length} tasks ({totalDurationDays}d · {totalEffortHours}h)
          </span>
        </div>
      </div>

        {/* Main Split Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* LEFT: Task sidebar (Wider 380px) */}
          <div style={{
            width: "380px",
            minWidth: "380px",
            borderRight: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid #e2e8f0",
            background: isDark ? "rgba(11,13,26,0.92)" : "#ffffff",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 10,
          }}>
            {/* Header */}
            <div style={{
              height: `${HEADER_H}px`,
              padding: "0 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid #e2e8f0",
              background: isDark ? "rgba(22,25,52,0.9)" : "#f8fafc",
              fontSize: "11px",
              fontWeight: 800,
              color: isDark ? "#60a5fa" : "#1d4ed8",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              flexShrink: 0,
            }}>
              <span>Task &amp; Assignee</span>
              <span style={{ fontSize: "11px" }}>Days / Hours</span>
            </div>

            {/* Rows */}
            <div ref={leftRef} style={{ flex: 1, overflowY: "scroll", overflowX: "hidden" }}>
              {rows.map((r, ri) => {
                if (r.type === "phase") {
                  const ph = r.ph;
                  const isCol = collapsed.has(ph.id);
                  const phColor = ph.color || PHASE_COLORS[0];
                  return (
                    <div
                      key={`ph-${ph.id}`}
                      onClick={() => {
                        setCollapsed((prev) => {
                          const next = new Set(prev);
                          next.has(ph.id) ? next.delete(ph.id) : next.add(ph.id);
                          return next;
                        });
                      }}
                      style={{
                        height: `${PHASE_H}px`,
                        padding: "0 16px",
                        background: isDark ? "rgba(30,35,72,0.9)" : "#f1f5f9",
                        borderBottom: isDark ? "1px solid rgba(139,92,246,0.12)" : "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: isDark ? "#fff" : "#1e293b",
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "rgba(40,45,90,0.95)" : "#e2e8f0")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isDark ? "rgba(30,35,72,0.9)" : "#f1f5f9")}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "10px", color: phColor }}>{isCol ? "▶" : "▼"}</span>
                        <span style={{ color: phColor }}>{ph.name}</span>
                      </span>
                      <span style={{ fontSize: "11px", color: isDark ? "#94a3b8" : "#64748b" }}>
                        {r.totalD}d ({r.totalH}h)
                      </span>
                    </div>
                  );
                }

                // Task row
                const t = r.task;
                const isHov = hoveredTaskId === t.id;
                const statusDot = t.status === "completed" ? "#10b981" : t.status === "in_progress" ? "#38bdf8" : t.status === "blocked" ? "#f43f5e" : "#94a3b8";
                const assignedEmps = (t.assignedTo || []).slice(0, 3);
                return (
                  <div
                    key={`tr-${t.id}`}
                    onMouseEnter={() => setHoveredTaskId(t.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    style={{
                      height: `${ROW_H}px`,
                      padding: "0 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      borderBottom: isDark ? "1px solid rgba(139,92,246,0.1)" : "1px solid #f1f5f9",
                      fontSize: "13px",
                      color: isDark ? "#e2e8f0" : "#1e293b",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "background 0.15s",
                      background: isHov ? (isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.06)") : "transparent",
                      borderLeft: isHov ? "3px solid #2563eb" : "3px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", whiteSpace: "nowrap" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: statusDot, flexShrink: 0, boxShadow: `0 0 5px ${statusDot}` }} />
                      <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", fontSize: "12px" }} title={t.title}>
                        {t.title}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: isDark ? "#94a3b8" : "#64748b", flexShrink: 0 }}>
                      {assignedEmps.map((aId, idx) => {
                        const emp = employees?.find((e) => e._id === (typeof aId === "object" && aId ? aId._id : aId));
                        const init = emp ? emp.name[0] : "?";
                        const clr = t.phaseColor || "#2563eb";
                        return (
                          <span
                            key={idx}
                            title={emp?.name}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              fontSize: "9px",
                              fontWeight: 700,
                              background: `${clr}25`,
                              color: clr,
                              border: `1px solid ${clr}40`,
                              marginLeft: idx > 0 ? "-4px" : 0,
                              zIndex: 10 - idx,
                            }}
                          >
                            {init}
                          </span>
                        );
                      })}
                      <span style={{ whiteSpace: "nowrap", marginLeft: "2px" }}>
                        {t.durationDays}d <span style={{ color: isDark ? "#64748b" : "#94a3b8" }}>({t.estimatedHours}h)</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Timeline canvas */}
          <div
            ref={rightRef}
            style={{
              flex: 1,
              overflow: "auto",
              position: "relative",
              background: isDark ? "#060712" : "#fafafa",
            }}
          >
            <div style={{ position: "relative", width: `${totalW}px`, minHeight: "100%" }}>

              {/* Sticky Month + Day Header */}
              <div style={{
                position: "sticky",
                top: 0,
                zIndex: 20,
                background: isDark ? "rgba(22,25,52,0.95)" : "#ffffff",
                backdropFilter: "blur(12px)",
                borderBottom: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid #e2e8f0",
              }}>
                {/* Month row */}
                <div style={{
                  height: "26px",
                  display: "flex",
                  borderBottom: isDark ? "1px solid rgba(139,92,246,0.1)" : "1px solid #f1f5f9",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: isDark ? "#94a3b8" : "#475569",
                  letterSpacing: "0.5px",
                }}>
                  {monthCells.map((mc, mi) => (
                    <div
                      key={mi}
                      style={{
                        width: `${mc.width}px`,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRight: isDark ? "1px solid rgba(139,92,246,0.08)" : "1px solid #e2e8f0",
                      }}
                    >
                      {mc.label}
                    </div>
                  ))}
                </div>

                {/* Day row */}
                <div style={{
                  height: "26px",
                  display: "flex",
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "11px",
                  color: isDark ? "#475569" : "#64748b",
                }}>
                  {dateRange.map((d, di) => {
                    const wknd = isWknd(d); const hol = isHol(d); const tod = isToday(d);
                    return (
                      <div
                        key={di}
                        style={{
                          width: `${cellWidth}px`,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRight: isDark ? "1px solid rgba(139,92,246,0.06)" : "1px solid #f1f5f9",
                          background: tod
                            ? (isDark ? "rgba(139,92,246,0.22)" : "rgba(139,92,246,0.12)")
                            : hol
                            ? (isDark ? "rgba(244,63,94,0.15)" : "rgba(244,63,94,0.1)")
                            : wknd
                            ? (isDark ? "rgba(0,0,0,0.35)" : "rgba(241,245,249,0.7)")
                            : "transparent",
                          color: tod ? "#2563eb" : hol ? "#f43f5e" : wknd ? (isDark ? "#334155" : "#94a3b8") : (isDark ? "#64748b" : "#475569"),
                          fontWeight: tod ? 800 : 400,
                          fontSize: "10px",
                        }}
                      >
                        {zoom === "day" ? d.getDate() : zoom === "week" ? "SMTWTFS"[d.getDay()] : ""}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grid Background Columns */}
              <div style={{ position: "absolute", top: `${HEADER_H}px`, bottom: 0, left: 0, right: 0, display: "flex", pointerEvents: "none" }}>
                {dateRange.map((d, di) => {
                  const wknd = isWknd(d); const hol = isHol(d);
                  return (
                    <div
                      key={di}
                      style={{
                        width: `${cellWidth}px`,
                        flexShrink: 0,
                        height: "100%",
                        borderRight: isDark ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(0,0,0,0.04)",
                        background: hol
                          ? "repeating-linear-gradient(-45deg,rgba(244,63,94,0.06),rgba(244,63,94,0.06) 4px,rgba(244,63,94,0.14) 4px,rgba(244,63,94,0.14) 8px)"
                          : wknd
                          ? (isDark
                            ? "repeating-linear-gradient(45deg,rgba(0,0,0,0.2),rgba(0,0,0,0.2) 4px,rgba(0,0,0,0.35) 4px,rgba(0,0,0,0.35) 8px)"
                            : "repeating-linear-gradient(45deg,rgba(226,232,240,0.4),rgba(226,232,240,0.4) 4px,rgba(241,245,249,0.8) 4px,rgba(241,245,249,0.8) 8px)")
                          : "transparent",
                      }}
                    />
                  );
                })}
              </div>

              {/* SVG Dependency Arrows */}
              {showArrows && (
                <svg
                  ref={svgRef}
                  style={{
                    position: "absolute",
                    top: `${HEADER_H}px`,
                    left: 0,
                    width: `${totalW}px`,
                    height: `${Math.max(600, totalHeight + 100)}px`,
                    pointerEvents: "none",
                    zIndex: 8,
                  }}
                >
                  <defs>
                    <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill={isDark ? "rgba(148,163,184,0.75)" : "rgba(100,116,139,0.75)"} />
                    </marker>
                    <marker id="arrow-hi" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 8 5 L 0 9 z" fill="#818cf8" />
                    </marker>
                  </defs>
                  {svgPaths.map((p, pi) => {
                    const isHi = hoveredTaskId && (p.fromId === hoveredTaskId || p.toId === hoveredTaskId);
                    const isDim = hoveredTaskId && !isHi;
                    return (
                      <path
                        key={pi}
                        d={p.d}
                        fill="none"
                        stroke={isHi ? "#0284c7" : (isDark ? "rgba(2,132,199,0.45)" : "rgba(37,99,235,0.4)")}
                        strokeWidth={isHi ? 2.5 : 1.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        opacity={isDim ? 0.1 : 1}
                        style={{ filter: isHi ? "drop-shadow(0 0 6px rgba(168,85,247,0.8))" : "none", transition: "all 0.2s" }}
                        markerEnd={isHi ? "url(#arrow-hi)" : "url(#arrow-default)"}
                      />
                    );
                  })}
                </svg>
              )}

              {/* Task + Phase Bars */}
              <div style={{ position: "relative", zIndex: 15 }}>
                {rows.map((r, ri) => {
                  if (r.type === "phase") {
                    return (
                      <div
                        key={`pb-${r.ph.id}`}
                        style={{
                          height: `${PHASE_H}px`,
                          background: isDark ? "rgba(0,0,0,0.2)" : "rgba(241,245,249,0.5)",
                          borderBottom: "1px solid transparent",
                        }}
                      />
                    );
                  }
                  const t = r.task;
                  const si = dateToIdx.get(t.startDate) ?? 0;
                  const ei = dateToIdx.get(t.endDate) ?? si;
                  const span = Math.max(1, ei - si + 1);
                  const barX = si * cellWidth;
                  const barW = Math.max(cellWidth - 4, span * cellWidth - 4);
                  const clr = t.phaseColor || "#2563eb";
                  const isHov = hoveredTaskId === t.id;
                  return (
                    <div key={`br-${t.id}`} style={{ height: `${ROW_H}px`, position: "relative", borderBottom: "1px solid transparent" }}>
                      <div
                        onMouseEnter={() => setHoveredTaskId(t.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                        title={`${t.title} | ${t.durationDays}d · ${t.estimatedHours}h | ${t.startDate} → ${t.endDate}`}
                        style={{
                          position: "absolute",
                          top: "8px",
                          left: `${barX}px`,
                          width: `${barW}px`,
                          height: "26px",
                          borderRadius: "9999px",
                          display: "flex",
                          alignItems: "center",
                          padding: "0 12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#fff",
                          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                          cursor: "pointer",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          background: `linear-gradient(135deg,${clr},${clr}cc)`,
                          boxShadow: isHov ? `0 6px 20px rgba(0,0,0,0.4), 0 0 16px ${clr}80` : "0 3px 10px rgba(0,0,0,0.25)",
                          border: "1px solid rgba(255,255,255,0.25)",
                          transform: isHov ? "translateY(-1px) scale(1.01)" : "none",
                          filter: isHov ? "brightness(1.12)" : "none",
                          transition: "all 0.15s ease",
                          zIndex: isHov ? 14 : 10,
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
                        <span style={{ marginLeft: "auto", fontSize: "10px", opacity: 0.9, paddingLeft: "4px", whiteSpace: "nowrap" }}>
                          {t.durationDays}d ({t.estimatedHours}h)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────
export default function ProjectPlanner({ auth, theme: propTheme }) {
  const isDark = propTheme === "dark" || (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

  // Data
  const [projects,   setProjects]   = useState([]);
  const [companies,  setCompanies]  = useState([]);
  const [categories, setCategories] = useState([]);
  const [holidays,   setHolidays]   = useState([]);
  const [employees,  setEmployees]  = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [allPlans,   setAllPlans]   = useState([]);
  const [plansSearchFilter, setPlansSearchFilter] = useState("");

  // Plan state
  const [plan, setPlan] = useState({
    settings: {
      projectType: "storyline-360", complexity: "Medium",
      courseLengthMinutes: 60, moduleCount: 4,
      startDate: new Date().toISOString().slice(0, 10), hoursPerDay: 7,
    },
    phases: [],
  });

  // UI
  const [activeTab,    setActiveTab]    = useState("tree");
  const [ganttZoom,    setGanttZoom]    = useState("day");
  const [searchFilter, setSearchFilter] = useState("");
  const [roleFilter,   setRoleFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving,       setSaving]       = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [msg,          setMsg]          = useState({ text: "", type: "" });

  // New Plan modal
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    companyId: "", categoryId: "", projectId: "", isNewProject: false,
    name: "", code: "", template: "storyline-360",
    startDate: new Date().toISOString().slice(0, 10), description: "",
  });
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, title: "", message: "", confirmLabel: "Delete", danger: true, onConfirm: null });

  // ── Fetch All Plans ──
  async function fetchAllPlans() {
    try {
      const data = await api("/api/project-plans", { token: auth.token });
      const list = Array.isArray(data) ? data : [];
      setAllPlans(list);
      return list;
    } catch (e) {
      console.warn("Fetch all plans error:", e);
      setAllPlans([]);
      return [];
    }
  }

  // ── Init ──
  useEffect(() => {
    (async () => {
      try {
        const [p, co, ca, h, u, plansData] = await Promise.all([
          api("/api/projects",  { token: auth.token }),
          api("/api/companies", { token: auth.token }),
          api("/api/categories",{ token: auth.token }),
          api("/api/holidays",  { token: auth.token }),
          api("/api/users",     { token: auth.token }),
          api("/api/project-plans", { token: auth.token }).catch(() => []),
        ]);
        const validP = (Array.isArray(p) ? p : []).sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        );
        setProjects(validP);
        setCompanies(
          (Array.isArray(co) ? co : []).sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
          )
        );
        setCategories(
          (Array.isArray(ca) ? ca : []).sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
          )
        );
        setHolidays(Array.isArray(h) ? h : []);
        setEmployees(
          (Array.isArray(u) ? u : [])
            .filter(x => x.role === "employee" && x.status !== "inactive")
            .map(x => ({ ...x, _id: x._id || x.id }))
            .sort((a, b) =>
              (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
            )
        );

        const savedPlans = Array.isArray(plansData) ? plansData : [];
        setAllPlans(savedPlans);

        if (savedPlans.length > 0) {
          const firstPlanProjId = savedPlans[0].project?._id || savedPlans[0].project;
          setSelectedId(firstPlanProjId);
        } else {
          // If no plans exist yet in DB, do NOT pre-populate a fake plan
          setSelectedId("");
          setPlan({
            settings: {
              projectType: "storyline-360", complexity: "Medium",
              courseLengthMinutes: 60, moduleCount: 4,
              startDate: new Date().toISOString().slice(0, 10), hoursPerDay: 7,
            },
            phases: [],
          });
        }
      } catch (e) { console.error("Init error:", e); }
    })();
  }, [auth.token]);

  useEffect(() => { if (selectedId) loadPlan(selectedId); }, [selectedId]);

  async function loadPlan(pid) {
    if (!pid) {
      setPlan({
        settings: {
          projectType: "storyline-360", complexity: "Medium",
          courseLengthMinutes: 60, moduleCount: 4,
          startDate: new Date().toISOString().slice(0, 10), hoursPerDay: 7,
        },
        phases: [],
      });
      return;
    }
    setLoading(true);
    setMsg({ text: "", type: "" });
    try {
      const data = await api(`/api/project-plans/${pid}`, { token: auth.token });
      if (data?.phases?.length > 0) {
        // Ensure all phases are open/expanded by default without collapsing
        const openPhases = data.phases.map(ph => ({
          ...ph,
          expanded: true,
        }));
        setPlan({ settings: data.settings || plan.settings, phases: openPhases });
      } else {
        // No saved plan for this project -> keep phases empty
        setPlan({
          settings: {
            projectType: "storyline-360", complexity: "Medium",
            courseLengthMinutes: 60, moduleCount: 4,
            startDate: new Date().toISOString().slice(0, 10), hoursPerDay: 7,
            ...(data?.settings || {}),
          },
          phases: [],
        });
      }
    } catch (e) { console.error("Load plan error:", e); }
    finally { setLoading(false); }
  }

  // ── Create or Initialize Project Plan ──
  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setMsg({ text: "", type: "" });
    try {
      let targetProjectId = modalForm.projectId;
      let targetProjectName = modalForm.name;
      let targetProjectObj = null;

      // If creating a brand new project
      if (modalForm.isNewProject || !targetProjectId) {
        if (!modalForm.name.trim() || !modalForm.companyId || !modalForm.categoryId) {
          setMsg({ text: "Project Name, Company & Category are required.", type: "error" });
          setCreating(false);
          return;
        }
        const proj = await api("/api/projects", {
          method: "POST", token: auth.token,
          body: {
            name: modalForm.name.trim(),
            code: modalForm.code.trim(),
            company: modalForm.companyId,
            category: modalForm.categoryId,
            description: modalForm.description.trim(),
            status: "active"
          },
        });
        targetProjectId = proj._id;
        targetProjectName = proj.name;
        targetProjectObj = proj;
        setProjects(prev =>
          [...prev, proj].sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
          )
        );
      } else {
        const existingProj = projects.find(p => p._id === targetProjectId);
        if (existingProj) {
          targetProjectName = existingProj.name;
          targetProjectObj = existingProj;
        }
      }

      if (!targetProjectId) {
        setMsg({ text: "Please select or create a project.", type: "error" });
        setCreating(false);
        return;
      }

      const tplKey = modalForm.template || "storyline-360";
      const basePhases = (TEMPLATES[tplKey] || TEMPLATES["storyline-360"]).phases;
      const phases = generateDatesForPhases(basePhases, modalForm.startDate, holidays).map(ph => ({
        ...ph,
        expanded: true,
      }));
      const settings = {
        projectType: tplKey,
        complexity: "Medium",
        courseLengthMinutes: 60,
        moduleCount: 4,
        startDate: modalForm.startDate,
        hoursPerDay: 7
      };

      await api(`/api/project-plans/${targetProjectId}`, {
        method: "POST", token: auth.token, body: { settings, phases }
      });

      try {
        await api(`/api/project-plans/${targetProjectId}/sync-tasks`, { method: "POST", token: auth.token });
      } catch (syncErr) {
        console.warn("Auto-sync tasks error on create:", syncErr);
      }

      const createdPlanObj = {
        _id: `plan-${targetProjectId}`,
        project: targetProjectObj || {
          _id: targetProjectId,
          name: targetProjectName,
          code: modalForm.code,
          company: companies.find(c => c._id === modalForm.companyId),
          category: categories.find(c => c._id === modalForm.categoryId),
        },
        settings,
        phases,
        updatedAt: new Date().toISOString(),
      };

      setAllPlans(prev => {
        const filtered = prev.filter(p => (p.project?._id || p.project) !== targetProjectId);
        return [createdPlanObj, ...filtered];
      });

      setSelectedId(targetProjectId);
      setPlan({ settings, phases });
      setShowModal(false);
      setModalForm({
        companyId: "", categoryId: "", projectId: "", isNewProject: false,
        name: "", code: "", template: "storyline-360",
        startDate: new Date().toISOString().slice(0, 10), description: ""
      });
      setMsg({ text: `Project Plan for "${targetProjectName}" created and tasks synced!`, type: "success" });
      fetchAllPlans();
    } catch (err) {
      setMsg({ text: err.message || "Failed to create project plan.", type: "error" });
    } finally {
      setCreating(false);
    }
  }

  // ── Save ──
  async function savePlan() {
    if (!selectedId) return;
    setSaving(true); setMsg({ text: "", type: "" });
    try {
      await api(`/api/project-plans/${selectedId}`, { method: "POST", token: auth.token, body: { settings: plan.settings, phases: plan.phases } });
      try {
        await api(`/api/project-plans/${selectedId}/sync-tasks`, { method: "POST", token: auth.token });
      } catch (syncErr) {
        console.warn("Auto-sync tasks error on save:", syncErr);
      }
      const savedProj = projects.find(p => p._id === selectedId);
      const updatedPlanObj = {
        _id: `plan-${selectedId}`,
        project: savedProj || { _id: selectedId, name: activeProject?.name || "Project" },
        settings: plan.settings,
        phases: plan.phases,
        updatedAt: new Date().toISOString(),
      };
      setAllPlans(prev => {
        const filtered = prev.filter(p => (p.project?._id || p.project) !== selectedId);
        return [updatedPlanObj, ...filtered];
      });
      setMsg({ text: "Project Plan saved & tasks synced!", type: "success" });
      fetchAllPlans();
    } catch (e) { setMsg({ text: e.message || "Save failed.", type: "error" }); }
    finally { setSaving(false); }
  }

  // ── Sync ──
  async function syncPlan() {
    if (!selectedId) return;
    setSyncing(true); setMsg({ text: "", type: "" });
    try {
      await api(`/api/project-plans/${selectedId}`, { method: "POST", token: auth.token, body: { settings: plan.settings, phases: plan.phases } });
      const res = await api(`/api/project-plans/${selectedId}/sync-tasks`, { method: "POST", token: auth.token });
      setMsg({ text: `Synced ${res.createdCount || 0} new + ${res.updatedCount || 0} updated tasks!`, type: "success" });
      fetchAllPlans();
    } catch (e) { setMsg({ text: e.message || "Sync failed.", type: "error" }); }
    finally { setSyncing(false); }
  }

  // ── Delete Plan ──
  function handleDeletePlan(pid, pName) {
    setDeleteConfirm({
      open: true,
      title: "Delete Project Plan",
      message: `Are you sure you want to delete the Project Plan for "${pName || "this project"}"?\n\nNote: The project itself and all employee work times will remain safe.`,
      confirmLabel: "Delete Plan",
      danger: true,
      onConfirm: async () => {
        try {
          await api(`/api/project-plans/${pid}`, { method: "DELETE", token: auth.token });
          const remainingPlans = allPlans.filter(p => (p.project?._id || p.project) !== pid);
          setAllPlans(remainingPlans);
          if (selectedId === pid) {
            if (remainingPlans.length > 0) {
              const nextId = remainingPlans[0].project?._id || remainingPlans[0].project;
              setSelectedId(nextId);
            } else {
              setSelectedId("");
              setPlan({
                settings: {
                  projectType: "storyline-360", complexity: "Medium",
                  courseLengthMinutes: 60, moduleCount: 4,
                  startDate: new Date().toISOString().slice(0, 10), hoursPerDay: 7,
                },
                phases: [],
              });
            }
          }
          setMsg({ text: `Project plan for "${pName || "Project"}" deleted successfully.`, type: "success" });
        } catch (e) {
          setMsg({ text: e.message || "Failed to delete project plan.", type: "error" });
        }
      }
    });
  }

  // ── Export CSV ──
  function exportCSV() {
    const proj = projects.find(p => p._id === selectedId);
    const headers = ["Phase","WBS","Task Title","Deliverable","Role","Assignees","Start","End","Days","Hours","Status","Priority"];
    const rows = [];
    plan.phases.forEach((ph, pi) => {
      ph.tasks.forEach((t, ti) => {
        const assignees = (t.assignedTo || []).map(a => (typeof a === "object" ? a.name : (employees.find(e => e._id === a)?.name || a))).filter(Boolean).join("; ");
        rows.push([`"${ph.name}"`,`${pi+1}.${ti+1}`,`"${t.title}"`,`"${t.deliverable||""}"`,`"${t.role||""}"`,`"${assignees}"`,`"${t.startDate||""}"`,`"${t.endDate||""}"`,t.durationDays||1,t.estimatedHours||0,`"${t.status||""}"`,`"${t.priority||""}"`]);
      });
    });
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url;
    a.download = `${(proj?.name||"Plan").replace(/\s+/g,"_")}_WBS.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function exportExcel() {
    const proj = projects.find(p => p._id === selectedId);
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>body{font-family:Calibri,sans-serif;font-size:11pt}.h{font-size:14pt;font-weight:bold;background:#e0e7ff;color:#1e1b4b}.ph{font-weight:bold;background:#f1f5f9}.th{font-weight:bold;color:#fff;background:#4338ca;text-align:center}</style></head><body><table>`;
    html += `<tr><td colspan="10" class="h">${proj?.name||"Project Plan"} — Master WBS Schedule</td></tr>`;
    html += `<tr><td class="th">WBS</td><td class="th">Task Title</td><td class="th">Deliverable</td><td class="th">Role</td><td class="th">Assignees</td><td class="th">Start</td><td class="th">End</td><td class="th">Days</td><td class="th">Hours</td><td class="th">Status</td></tr>`;
    plan.phases.forEach((ph, pi) => {
      html += `<tr><td colspan="10" class="ph"><b>${pi+1}.0 — ${ph.name}</b></td></tr>`;
      ph.tasks.forEach((t, ti) => {
        const assignees = (t.assignedTo||[]).map(a => (typeof a==="object"?a.name:(employees.find(e=>e._id===a)?.name||a))).filter(Boolean).join(", ");
        html += `<tr><td>${pi+1}.${ti+1}</td><td>${t.title||""}</td><td>${t.deliverable||""}</td><td>${t.role||""}</td><td>${assignees}</td><td>${t.startDate||""}</td><td>${t.endDate||""}</td><td>${t.durationDays||1}</td><td>${t.estimatedHours||0}</td><td>${t.status||""}</td></tr>`;
      });
    });
    html += `</table></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "application/vnd.ms-excel" }));
    const a = document.createElement("a"); a.href = url;
    a.download = `${(proj?.name||"Plan").replace(/\s+/g,"_")}_Schedule.xls`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ── Phase / Task mutations ──
  function togglePhase(id) {
    setPlan(p => ({
      ...p,
      phases: p.phases.map(ph => ph.id === id ? { ...ph, expanded: ph.expanded === false ? true : false } : ph),
    }));
  }
  function expandAll(v) {
    setPlan(p => ({
      ...p,
      phases: p.phases.map(ph => ({ ...ph, expanded: v })),
    }));
  }

  function addPhase() {
    const n = plan.phases.length + 1;
    const newPh = {
      id: `phase-${Date.now()}`, name: `Phase ${n}: New Phase`, code: `PH-${n}`,
      color: "#2563eb", expanded: true, tasks: [],
    };
    setPlan(p => ({ ...p, phases: [...p.phases, newPh] }));
  }

  function deletePhase(id) {
    setDeleteConfirm({
      open: true,
      title: "Delete Phase",
      message: "Are you sure you want to delete this phase and all its tasks?",
      confirmLabel: "Delete Phase",
      danger: true,
      onConfirm: () => {
        setPlan(p => ({ ...p, phases: p.phases.filter(ph => ph.id !== id) }));
      }
    });
  }

  function updatePhaseName(id, name) { setPlan(p => ({ ...p, phases: p.phases.map(ph => ph.id===id ? {...ph, name} : ph) })); }

  function addTask(phId) {
    const start = plan.settings.startDate || new Date().toISOString().slice(0,10);
    const task = {
      id: `task-${Date.now()}`, title: "New Task", role: "Instructional Designer",
      estimatedHours: 7, durationDays: 1,
      startDate: start, endDate: addWorkingDays(start, 1, holidays),
      status: "not_started", priority: "Medium", deliverable: "Draft Deliverable",
      assignedTo: [], subtasks: [],
    };
    setPlan(p => ({ ...p, phases: p.phases.map(ph => ph.id===phId ? {...ph, tasks:[...ph.tasks, task], expanded:true} : ph) }));
  }

  function updateTask(phId, tId, updates) {
    setPlan(p => ({
      ...p,
      phases: p.phases.map(ph => ph.id!==phId ? ph : {
        ...ph,
        tasks: ph.tasks.map(t => t.id!==tId ? t : {...t, ...updates}),
      }),
    }));
  }

  function deleteTask(phId, tId) {
    setPlan(p => ({
      ...p,
      phases: p.phases.map(ph => ph.id!==phId ? ph : {...ph, tasks: ph.tasks.filter(t => t.id!==tId)}),
    }));
  }

  function toggleAssignee(phId, tId, empId) {
    setPlan(p => ({
      ...p,
      phases: p.phases.map(ph => ph.id!==phId ? ph : {
        ...ph,
        tasks: ph.tasks.map(t => {
          if (t.id!==tId) return t;
          const cur = (t.assignedTo||[]).map(a => (typeof a==="object"&&a?a._id:a));
          const next = cur.includes(empId) ? cur.filter(x=>x!==empId) : [...cur, empId];
          return {...t, assignedTo: next};
        }),
      }),
    }));
  }

  function addSubtask(phId, tId) {
    const st = { id:`st-${Date.now()}`, title:"Checklist item", completed:false };
    setPlan(p => ({
      ...p,
      phases: p.phases.map(ph => ph.id!==phId ? ph : {
        ...ph,
        tasks: ph.tasks.map(t => t.id!==tId ? t : {...t, subtasks:[...(t.subtasks||[]), st]}),
      }),
    }));
  }

  function toggleSubtask(phId, tId, stId) {
    setPlan(p => ({
      ...p,
      phases: p.phases.map(ph => ph.id!==phId ? ph : {
        ...ph,
        tasks: ph.tasks.map(t => t.id!==tId ? t : {
          ...t, subtasks:(t.subtasks||[]).map(st => st.id!==stId ? st : {...st, completed:!st.completed}),
        }),
      }),
    }));
  }

  // ── Computed metrics ──
  const metrics = useMemo(() => {
    let total=0, done=0, inprog=0, hours=0;
    const assignees = new Set();
    const roleHours = {};
    plan.phases.forEach(ph => ph.tasks.forEach(t => {
      total++;
      if (t.status==="completed") done++;
      else if (t.status==="in_progress") inprog++;
      hours += Number(t.estimatedHours)||0;
      roleHours[t.role||"Other"] = (roleHours[t.role||"Other"]||0) + (Number(t.estimatedHours)||0);
      (t.assignedTo||[]).forEach(a => assignees.add(typeof a==="object"&&a?a._id:a));
    }));
    const pct = total ? Math.round((done/total)*100) : 0;
    const estDays = Math.ceil(hours / (plan.settings.hoursPerDay||7));
    const endDate = plan.phases.length
      ? plan.phases[plan.phases.length-1].tasks.slice(-1)[0]?.endDate || ""
      : "";
    return { total, done, inprog, hours, pct, estDays, assigneeCount: assignees.size, roleHours, endDate };
  }, [plan]);

  // ── Filtered phases for display ──
  const displayPhases = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    return plan.phases.map(ph => ({
      ...ph,
      tasks: ph.tasks.filter(t => {
        const mq = !q || t.title.toLowerCase().includes(q) || (t.deliverable||"").toLowerCase().includes(q) || (t.role||"").toLowerCase().includes(q);
        const mr = roleFilter==="all" || t.role===roleFilter;
        const ms = statusFilter==="all" || t.status===statusFilter;
        return mq && mr && ms;
      }),
    })).filter(ph => ph.tasks.length > 0 || !q);
  }, [plan.phases, searchFilter, roleFilter, statusFilter]);

  const activeProject = projects.find(p => p._id === selectedId) || null;

  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════
  return (
    <div className="space-y-4 pb-16">

      {/* ── 1. HEADER BAR ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-md">
            <FolderTree size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Project Planner</h2>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 tracking-wide">WBS & GANTT SUITE</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Build WBS trees, schedule deliverables, assign team, and sync to Work Tracker.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeProject && selectedId ? (
            <div className="flex items-center gap-2 rounded-2xl bg-blue-50/80 border border-blue-100 px-3.5 py-2 text-xs font-semibold text-blue-900 shadow-xs">
              <Briefcase size={14} className="text-blue-600 shrink-0" />
              <span className="text-slate-500 font-medium">Active Plan:</span>
              <span className="font-bold text-blue-950 truncate max-w-[220px]">
                {activeProject.name}
              </span>
              {activeProject.code && (
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                  {activeProject.code}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-500">
              <Briefcase size={14} className="text-slate-400 shrink-0" />
              <span>No Plan Selected</span>
            </div>
          )}

          {allPlans.length > 1 && (
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="rounded-2xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs font-bold text-blue-900 outline-none focus:border-blue-500 cursor-pointer shadow-xs"
            >
              {allPlans.map(pl => {
                const pid = pl.project?._id || pl.project;
                const pname = pl.project?.name || "Project Plan";
                return (
                  <option key={pid} value={pid}>
                    Plan: {pname}
                  </option>
                );
              })}
            </select>
          )}

          {/* New Plan Button */}
          <button
            onClick={() => {
              setModalForm({
                companyId: "",
                categoryId: "",
                projectId: "",
                isNewProject: false,
                name: "",
                code: "",
                template: "storyline-360",
                startDate: new Date().toISOString().slice(0, 10),
                description: "",
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
          >
            <Plus size={14} />
            New Project Plan
          </button>
        </div>
      </div>

      {/* ── 2. ALERTS ── */}
      {msg.text && (
        <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${msg.type==="success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {msg.type==="success" ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
          {msg.text}
          <button onClick={() => setMsg({text:"",type:""})} className="ml-auto text-slate-400 hover:text-slate-600"><X size={14}/></button>
        </div>
      )}

      {/* ── 3. KPI DASHBOARD ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Hours</p>
          <h3 className="mt-1 text-2xl font-extrabold text-slate-900">{metrics.hours}<span className="text-sm font-semibold text-slate-400 ml-1">hrs</span></h3>
          <p className="mt-0.5 text-[11px] text-slate-500">≈ {metrics.estDays} working days</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Plan Progress</p>
          <div className="mt-1 flex items-center gap-2">
            <h3 className="text-2xl font-extrabold text-blue-600">{metrics.pct}%</h3>
            <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-blue-500 transition-all rounded-full" style={{width:`${metrics.pct}%`}}/>
            </div>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">{metrics.done}/{metrics.total} tasks completed</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Calculated End</p>
          <h3 className="mt-1 text-base font-extrabold text-emerald-700">{metrics.endDate ? fmtDate(metrics.endDate) : "—"}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">{plan.phases.length} phases in plan</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Assigned Team</p>
          <h3 className="mt-1 text-2xl font-extrabold text-slate-900">{metrics.assigneeCount}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">of {employees.length} active employees</p>
        </div>
      </div>

      {/* Pipeline Ribbon — Exact Project Plan Tool dark glassmorphic design */}
      {plan.phases.length > 0 && (
        <div style={{
          background: isDark ? "rgba(18,20,42,0.85)" : "#ffffff",
          backdropFilter: "blur(18px) saturate(180%)",
          WebkitBackdropFilter: "blur(18px) saturate(180%)",
          border: isDark ? "1px solid rgba(139,92,246,0.22)" : "1px solid #e2e8f0",
          borderRadius: "18px",
          padding: "18px 22px",
          boxShadow: isDark ? "0 10px 30px -5px rgba(0,0,0,0.55), 0 0 15px rgba(139,92,246,0.12)" : "0 4px 20px rgba(0,0,0,0.05)",
        }}>
          {/* Pipeline Header */}
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px", flexWrap:"wrap", gap:"10px"}}>
            <div style={{fontFamily:"'Outfit','Plus Jakarta Sans',sans-serif", fontSize:"14px", fontWeight:700, color: isDark ? "#ffffff" : "#1e293b", display:"flex", alignItems:"center", gap:"8px"}}>
              <BarChart2 size={16} className="text-blue-600"/>
              <span>Parallel Production Pipelining Flow</span>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
              <span style={{fontSize:"12px", color: isDark ? "#cbd5e1" : "#64748b"}}>
                Overall Progress: <strong style={{color:"#10b981"}}>{metrics.pct}%</strong> ({metrics.done}/{metrics.total} tasks)
              </span>
              <div style={{width:"110px", height:"7px", background: isDark ? "rgba(0,0,0,0.35)" : "#f1f5f9", borderRadius:"99px", overflow:"hidden", border: isDark ? "1px solid rgba(255,255,255,0.04)" : "1px solid #e2e8f0"}}>
                <div style={{width:`${metrics.pct}%`, height:"100%", background:"linear-gradient(90deg,#10b981,#34d399)", boxShadow:"0 0 10px rgba(16,185,129,0.6)", transition:"width 0.4s ease"}}/>
              </div>
            </div>
          </div>

          {/* Pipeline Steps */}
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:"6px", overflowX:"auto", paddingBottom:"4px"}}>
            {plan.phases.map((ph, idx) => {
              const phDone  = ph.tasks.filter(t => t.status==="completed").length;
              const phTotal = ph.tasks.length;
              const phPct   = phTotal ? Math.round((phDone/phTotal)*100) : 0;
              const roleLabel = ROLES.find(r => ph.tasks[0]?.role?.includes(r.name.split(" ")[0]))?.name || "Team";
              const statusDot = phDone === phTotal && phTotal > 0 ? "#10b981" : phDone > 0 ? "#38bdf8" : "#94a3b8";
              return (
                <React.Fragment key={ph.id}>
                  <div style={{
                    flex:1, minWidth:"125px",
                    background: isDark ? "rgba(22,25,52,0.8)" : "#f8fafc",
                    border: `1px solid ${ph.color}${isDark ? "38" : "30"}`,
                    borderRadius:"12px",
                    padding:"12px 14px",
                    display:"flex", flexDirection:"column", gap:"4px",
                    transition:"all 0.2s ease",
                    position:"relative", overflow:"hidden",
                    cursor:"default",
                    boxShadow: isDark ? "none" : "0 2px 6px rgba(0,0,0,0.02)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = isDark ? "rgba(30,35,72,0.9)" : "#ffffff";
                    e.currentTarget.style.borderColor = `${ph.color}80`;
                    e.currentTarget.style.boxShadow = `0 4px 16px rgba(139,92,246,0.15)`;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isDark ? "rgba(22,25,52,0.8)" : "#f8fafc";
                    e.currentTarget.style.borderColor = `${ph.color}${isDark ? "38" : "30"}`;
                    e.currentTarget.style.boxShadow = isDark ? "none" : "0 2px 6px rgba(0,0,0,0.02)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}>
                    {/* Glowing top bar */}
                    <div style={{
                      position:"absolute", top:0, left:0, right:0, height:"2px",
                      background:`linear-gradient(90deg, transparent, ${ph.color}, transparent)`,
                      opacity: phDone > 0 ? 1 : 0.4,
                    }}/>

                    <div style={{display:"flex", alignItems:"center", gap:"5px"}}>
                      <div style={{width:"7px", height:"7px", borderRadius:"50%", background:statusDot, flexShrink:0, boxShadow:`0 0 6px ${statusDot}`}}/>
                      <span style={{fontSize:"11px", fontWeight:700, color:ph.color, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                        {ph.name.replace(/Phase \d+:\s*/i,"") || `Phase ${idx+1}`}
                      </span>
                    </div>

                    <span style={{fontSize:"11px", color: isDark ? "#94a3b8" : "#64748b", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                      {ph.tasks[0]?.role || roleLabel}
                    </span>

                    {/* Phase badge */}
                    <span style={{
                      display:"inline-block", alignSelf:"flex-start", marginTop:"2px",
                      fontSize:"9px", fontWeight:800, padding:"2px 8px",
                      background:`${ph.color}22`, color:ph.color,
                      border:`1px solid ${ph.color}44`,
                      borderRadius:"99px", letterSpacing:"0.5px", textTransform:"uppercase",
                    }}>
                      PH-{idx+1} · {phTotal} tasks
                    </span>

                    {/* Progress mini-bar */}
                    <div style={{height:"3px", background: isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0", borderRadius:"99px", overflow:"hidden", marginTop:"4px"}}>
                      <div style={{width:`${phPct}%`, height:"100%", background:`linear-gradient(90deg,${ph.color},${ph.color}aa)`, transition:"width 0.4s ease"}}/>
                    </div>
                    <span style={{fontSize:"9px", color: isDark ? "#64748b" : "#94a3b8", marginTop:"1px"}}>{phDone}/{phTotal} done · {phPct}%</span>
                  </div>

                  {idx < plan.phases.length - 1 && (
                    <span style={{color:"#2563eb", opacity:0.7, fontSize:"16px", flexShrink:0, padding:"0 4px", userSelect:"none"}}>➔</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. TAB BAR + CONTROLS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          {[
            { id:"tree",     label:"WBS Tree",         icon:<FolderTree size={13}/> },
            { id:"gantt",    label:"Gantt Chart",       icon:<Calendar size={13}/> },
            { id:"workload", label:"Workload",           icon:<Users size={13}/> },
            { id:"auto",     label:"Auto-Scheduler",     icon:<Sparkles size={13}/> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${activeTab===tab.id ? (tab.id==="auto" ? "bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-sm" : "bg-blue-600 text-white shadow-sm") : "text-slate-500 hover:bg-slate-100"}`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text" placeholder="Search tasks…" value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700 outline-none focus:border-blue-400 focus:bg-white w-36"
          />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none">
            <option value="all">All Roles</option>
            {ROLES.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none">
            <option value="all">All Status</option>
            {Object.entries(STATUS_COLORS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {activeTab==="tree" && (
            <div className="flex gap-1 border-l border-slate-200 pl-2">
              <button onClick={() => expandAll(true)}  className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100">Expand All</button>
              <button onClick={() => expandAll(false)} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100">Collapse All</button>
            </div>
          )}

          <div className="flex gap-1 border-l border-slate-200 pl-2">
            <button onClick={exportExcel} title="Export Excel" className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100">
              <FileSpreadsheet size={12} className="text-emerald-600"/>XLS
            </button>
            <button onClick={exportCSV} title="Export CSV" className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100">
              <FileText size={12} className="text-blue-600"/>CSV
            </button>
          </div>

          <button onClick={syncPlan} disabled={syncing||!selectedId}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-50 transition">
            <RefreshCw size={12} className={syncing?"animate-spin":""}/>
            {syncing ? "Syncing…" : "Sync to Tracker"}
          </button>
          <button onClick={savePlan} disabled={saving||!selectedId}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition">
            <Save size={12}/>
            {saving ? "Saving…" : "Save Plan"}
          </button>
        </div>
      </div>

      {/* ── 5. TAB: WBS TREE ── */}
      {activeTab==="tree" && (
        <div className="space-y-2">
          {loading && <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400">Loading plan…</div>}

          {!loading && !selectedId && (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-16 text-center space-y-4 shadow-sm">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center shadow-xs">
                <FolderTree size={28} className="text-blue-600"/>
              </div>
              <div className="max-w-md">
                <h4 className="text-base font-bold text-slate-800">No Project Plan Selected</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {allPlans.length > 0
                    ? "Select an existing plan from the list below or dropdown above, or create a new project plan."
                    : "No project plans have been created yet. Click below to create your first WBS project plan."}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalForm({
                    companyId: companies[0]?._id || "",
                    categoryId: categories[0]?._id || "",
                    projectId: projects[0]?._id || "",
                    isNewProject: false,
                    name: "",
                    code: "",
                    template: "storyline-360",
                    startDate: new Date().toISOString().slice(0, 10),
                    description: "",
                  });
                  setShowModal(true);
                }}
                className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition cursor-pointer"
              >
                <Plus size={16}/> New Project Plan
              </button>
            </div>
          )}

          {!loading && selectedId && displayPhases.length === 0 && plan.phases.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-200 bg-white py-16 text-center space-y-4 shadow-sm">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center shadow-xs">
                <FolderTree size={28} className="text-blue-600"/>
              </div>
              <div className="max-w-md">
                <h4 className="text-base font-bold text-slate-800">No WBS Phases in "{activeProject?.name || "This Plan"}"</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Add your first custom phase or load a starter WBS template to begin planning tasks.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={addPhase}
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-sm transition cursor-pointer"
                >
                  <Plus size={14}/> + Add First Phase
                </button>
                <button
                  onClick={() => {
                    const start = plan.settings.startDate || new Date().toISOString().slice(0,10);
                    const phases = generateDatesForPhases(TEMPLATES["storyline-360"].phases, start, holidays).map(ph => ({ ...ph, expanded: true }));
                    setPlan(p => ({ ...p, phases }));
                    setMsg({ text: "Loaded Storyline 360 template phases!", type: "success" });
                  }}
                  className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                >
                  <Sparkles size={14}/> Load Storyline Template
                </button>
              </div>
            </div>
          )}

          {!loading && displayPhases.map((phase, pIdx) => {
            const phHours = phase.tasks.reduce((a,t) => a+(Number(t.estimatedHours)||0), 0);
            const phDone  = phase.tasks.filter(t => t.status==="completed").length;

            return (
              <div key={phase.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                {/* Phase Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition"
                  style={{ borderLeft: `4px solid ${phase.color||"#2563eb"}` }}
                  onClick={() => togglePhase(phase.id)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-400">{phase.expanded !== false ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</span>
                    <input
                      value={phase.name || ""}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updatePhaseName(phase.id, e.target.value)}
                      className="bg-transparent font-bold text-slate-900 text-sm outline-none focus:border-b border-blue-400 min-w-0 w-auto"
                      style={{width: `${Math.max((phase.name || "").length, 20)}ch`}}
                    />
                    <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">{phase.tasks.length} tasks</span>
                  </div>

                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    <span className="text-[11px] text-slate-500 font-semibold">{phHours}h · {phDone}/{phase.tasks.length} done</span>
                    <button
                      onClick={() => addTask(phase.id)}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition shadow-xs"
                    >
                      <Plus size={12}/>Add Task
                    </button>
                    <button onClick={() => deletePhase(phase.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>

                {/* Task Rows */}
                {phase.expanded !== false && (
                  <>
                    {phase.tasks.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">No tasks yet — click <strong>+ Add Task</strong> above.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          {/* Column headers */}
                          <thead className="border-b border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-widest text-slate-400">
                            <tr>
                              <th className="px-4 py-2 text-left w-10">#</th>
                              <th className="px-4 py-2 text-left min-w-[200px]">Task & Deliverable</th>
                              <th className="px-4 py-2 text-left min-w-[155px]">Role</th>
                              <th className="px-4 py-2 text-left min-w-[180px]">Assign Employees</th>
                              <th className="px-4 py-2 text-center w-16">Hours</th>
                              <th className="px-4 py-2 text-left min-w-[120px]">Start Date</th>
                              <th className="px-4 py-2 text-left min-w-[120px]">End Date</th>
                              <th className="px-4 py-2 text-left w-24">Priority</th>
                              <th className="px-4 py-2 text-left w-28">Status</th>
                              <th className="px-4 py-2 text-right w-16">Del</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {phase.tasks.map((task, tIdx) => {
                              const assignedIds = (task.assignedTo||[]).map(a => typeof a==="object"&&a?a._id:a);
                              const statusCfg = STATUS_COLORS[task.status] || STATUS_COLORS.not_started;

                              return (
                                <React.Fragment key={task.id}>
                                  <tr className="hover:bg-slate-50/80 transition">
                                    {/* WBS # */}
                                    <td className="px-4 py-3 font-mono font-bold text-slate-400 text-[10px]">
                                      {pIdx+1}.{tIdx+1}
                                    </td>

                                    {/* Task Title + Deliverable */}
                                    <td className="px-4 py-3">
                                      <input
                                        value={task.title || ""}
                                        onChange={e => updateTask(phase.id, task.id, {title: e.target.value})}
                                        className="w-full font-semibold text-slate-900 bg-transparent outline-none focus:bg-blue-50 rounded px-1 -mx-1"
                                        placeholder="Task title"
                                      />
                                      <input
                                        value={task.deliverable||""}
                                        onChange={e => updateTask(phase.id, task.id, {deliverable: e.target.value})}
                                        className="mt-0.5 w-full text-[10px] text-slate-400 bg-transparent outline-none focus:bg-blue-50 rounded px-1 -mx-1"
                                        placeholder="Deliverable output…"
                                      />
                                    </td>

                                    {/* Role */}
                                    <td className="px-4 py-3">
                                      <select
                                        value={task.role||"Instructional Designer"}
                                        onChange={e => updateTask(phase.id, task.id, {role: e.target.value})}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 outline-none focus:border-blue-400"
                                      >
                                        {ROLES.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                      </select>
                                    </td>

                                    {/* Assignees */}
                                    <td className="px-4 py-3">
                                      <div className="flex flex-wrap gap-1">
                                        {employees.map(emp => {
                                          const on = assignedIds.includes(emp._id);
                                          return (
                                            <button
                                              key={emp._id}
                                              type="button"
                                              onClick={() => toggleAssignee(phase.id, task.id, emp._id)}
                                              title={emp.name}
                                              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition ${on ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                                            >
                                              {on && <Check size={8}/>}
                                              {emp.name.split(" ")[0]}
                                            </button>
                                          );
                                        })}
                                        {employees.length===0 && <span className="text-slate-400 text-[10px]">No employees</span>}
                                      </div>
                                    </td>

                                    {/* Hours */}
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="number" min="1"
                                        value={task.estimatedHours||""}
                                        onChange={e => updateTask(phase.id, task.id, {
                                          estimatedHours: Number(e.target.value)||0,
                                          durationDays: Math.max(1, Math.ceil((Number(e.target.value)||7)/7)),
                                        })}
                                        className="w-14 rounded-xl border border-slate-200 bg-white px-2 py-1 text-center font-bold text-slate-800 outline-none focus:border-blue-400"
                                      />
                                    </td>

                                    {/* Start Date */}
                                    <td className="px-4 py-3">
                                      <input type="date" value={task.startDate||""}
                                        onChange={e => updateTask(phase.id, task.id, {startDate: e.target.value})}
                                        className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 outline-none focus:border-blue-400"
                                      />
                                    </td>

                                    {/* End Date */}
                                    <td className="px-4 py-3">
                                      <input type="date" value={task.endDate||""}
                                        onChange={e => updateTask(phase.id, task.id, {endDate: e.target.value})}
                                        className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-emerald-700 outline-none focus:border-blue-400"
                                      />
                                    </td>

                                    {/* Priority */}
                                    <td className="px-4 py-3">
                                      <select
                                        value={task.priority||"Medium"}
                                        onChange={e => updateTask(phase.id, task.id, {priority: e.target.value})}
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold outline-none ${PRIORITY_COLORS[task.priority]||PRIORITY_COLORS.Medium}`}
                                      >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                      </select>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3">
                                      <select
                                        value={task.status||"not_started"}
                                        onChange={e => updateTask(phase.id, task.id, {status: e.target.value})}
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold outline-none ${statusCfg.bg} ${statusCfg.text}`}
                                      >
                                        {Object.entries(STATUS_COLORS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                                      </select>
                                    </td>

                                    {/* Delete */}
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => addSubtask(phase.id, task.id)} title="Add subtask" className="p-1 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition"><Plus size={12}/></button>
                                        <button onClick={() => deleteTask(phase.id, task.id)} title="Delete task" className="p-1 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition"><Trash2 size={12}/></button>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Subtasks row */}
                                  {task.subtasks && task.subtasks.length > 0 && (
                                    <tr className="bg-slate-50/40">
                                      <td colSpan={10} className="pl-12 pr-4 py-1.5">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Checklist:</span>
                                          {task.subtasks.map(st => (
                                            <label key={st.id} className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
                                              <input type="checkbox" checked={st.completed} onChange={() => toggleSubtask(phase.id, task.id, st.id)} className="h-3 w-3 accent-blue-600 rounded"/>
                                              <span className={st.completed ? "line-through text-slate-400" : ""}>{st.title}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* Add Phase Button — bottom of list only */}
          {!loading && (
            <button
              onClick={addPhase}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 py-4 text-sm font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition"
            >
              <Plus size={18}/>
              Add New Phase / Module to WBS
            </button>
          )}
        </div>
      )}

      {/* ── 6. TAB: GANTT — Exact Project Plan Tool port ── */}
      {activeTab==="gantt" && (
        <GanttView
          phases={displayPhases}
          allPhases={plan.phases}
          holidays={holidays}
          settings={plan.settings}
          employees={employees}
          isDark={isDark}
        />
      )}

      {/* ── 7. TAB: WORKLOAD ── */}
      {activeTab==="workload" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Hours by Role</h3>
            {ROLES.map(r => {
              const hrs = metrics.roleHours[r.name]||0;
              const pct = metrics.hours ? Math.round((hrs/metrics.hours)*100) : 0;
              return (
                <div key={r.id}>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                    <span>{r.name}</span><span>{hrs}h ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${pct}%`, backgroundColor: r.color}}/>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Employee Allocations</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {employees.length===0 && <p className="text-[11px] text-slate-400">No active employees.</p>}
              {employees.map(emp => {
                let cnt=0, hrs=0;
                plan.phases.forEach(ph => ph.tasks.forEach(t => {
                  const ids = (t.assignedTo||[]).map(a => typeof a==="object"&&a?a._id:a);
                  if (ids.includes(emp._id)) { cnt++; hrs+=Number(t.estimatedHours)||0; }
                }));
                return (
                  <div key={emp._id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center">{emp.name[0]}</div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-900">{emp.name}</p>
                        <p className="text-[10px] text-slate-400">{emp.designation||"Employee"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">{hrs}h</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{cnt} tasks</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 8. TAB: AUTO-SCHEDULER ── */}
      {activeTab==="auto" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-600 text-white flex items-center justify-center shadow-md"><Sparkles size={20}/></div>
            <div>
              <h3 className="font-bold text-slate-900">Automated eLearning Schedule Generator</h3>
              <p className="text-[11px] text-slate-400">Select a template and parameters to generate a full working-day WBS plan.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Courseware Template</label>
              <select
                value={plan.settings.projectType||"storyline-360"}
                onChange={e => setPlan(p => ({...p, settings:{...p.settings, projectType: e.target.value}}))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
              >
                <option value="storyline-360">Storyline 360 (Interactive)</option>
                <option value="rise-360">Rise 360 (Microlearning)</option>
                <option value="blank">Blank / Custom Pipeline</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Complexity Level</label>
              <select
                value={plan.settings.complexity||"Medium"}
                onChange={e => setPlan(p => ({...p, settings:{...p.settings, complexity: e.target.value}}))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-400"
              >
                <option value="Low">Low (Simple, Standard UI)</option>
                <option value="Medium">Medium (Branching, Custom Assets)</option>
                <option value="High">High (Gamified, Heavy Animation)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Module Count</label>
              <input type="number" min="1" max="20"
                value={plan.settings.moduleCount||4}
                onChange={e => setPlan(p => ({...p, settings:{...p.settings, moduleCount: Number(e.target.value)||1}}))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Project Start Date</label>
            <input type="date"
              value={plan.settings.startDate||""}
              onChange={e => setPlan(p => ({...p, settings:{...p.settings, startDate: e.target.value}}))}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                const tplKey = plan.settings.projectType || "storyline-360";
                const base = (TEMPLATES[tplKey] || TEMPLATES["storyline-360"]).phases;
                const start = plan.settings.startDate || new Date().toISOString().slice(0,10);
                const phases = generateDatesForPhases(base, start, holidays);
                setPlan(p => ({...p, phases}));
                setActiveTab("tree");
                setMsg({text:"Generated fresh working-day WBS schedule!", type:"success"});
              }}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 transition"
            >
              <Sparkles size={16}/> Generate & Apply Schedule
            </button>
          </div>
        </div>
      )}

      {/* ── 9. ALL CREATED PROJECT PLANS SECTION ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">All Created Project Plans</h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                  {allPlans.length} {allPlans.length === 1 ? "Plan" : "Plans"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Overview of all project schedules, WBS tasks, effort estimations, and progress.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search plans by project, company..."
              value={plansSearchFilter}
              onChange={e => setPlansSearchFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white min-w-[220px]"
            />
          </div>
        </div>

        {allPlans.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Layers size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600">No project plans created yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "New Project Plan" above to create your first WBS plan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Company / Category</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">WBS Scope</th>
                  <th className="px-4 py-3">Total Effort</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allPlans
                  .filter(pl => {
                    const q = plansSearchFilter.toLowerCase().trim();
                    if (!q) return true;
                    const pName = pl.project?.name || "";
                    const pCode = pl.project?.code || "";
                    const cName = pl.project?.company?.name || "";
                    const catName = pl.project?.category?.name || "";
                    return pName.toLowerCase().includes(q) || pCode.toLowerCase().includes(q) || cName.toLowerCase().includes(q) || catName.toLowerCase().includes(q);
                  })
                  .map(pl => {
                    const projId = pl.project?._id || pl.project;
                    const isSelected = projId === selectedId;
                    const projName = pl.project?.name || "Unnamed Project";
                    const projCode = pl.project?.code || "";
                    const compName = pl.project?.company?.name || "—";
                    const catName = pl.project?.category?.name || "—";

                    let totalTasks = 0;
                    let completedTasks = 0;
                    let totalHours = 0;
                    (pl.phases || []).forEach(ph => {
                      (ph.tasks || []).forEach(t => {
                        totalTasks++;
                        if (t.status === "completed") completedTasks++;
                        totalHours += Number(t.estimatedHours) || 0;
                      });
                    });
                    const pct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
                    const estDays = Math.ceil(totalHours / (pl.settings?.hoursPerDay || 7));
                    const startDate = pl.settings?.startDate || "—";
                    const endDate = (pl.phases && pl.phases.length > 0)
                      ? pl.phases[pl.phases.length - 1].tasks?.slice(-1)[0]?.endDate || "—"
                      : "—";

                    return (
                      <tr key={pl._id} className={`hover:bg-blue-50/30 transition ${isSelected ? "bg-blue-50/40" : ""}`}>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{projName}</span>
                            {projCode && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                {projCode}
                              </span>
                            )}
                            {isSelected && (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                ● Currently Editing
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div>{compName}</div>
                          <div className="text-[10px] text-slate-400">{catName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 capitalize">
                            {(pl.settings?.projectType || "storyline-360").replace("-", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {pl.phases?.length || 0} Phases · {totalTasks} Tasks
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {totalHours} hrs <span className="text-[10px] font-normal text-slate-400">({estDays}d)</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-blue-700">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-[11px]">
                          <div>{fmtDate(startDate)} → {fmtDate(endDate)}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedId(projId);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                                isSelected
                                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                              }`}
                            >
                              <ExternalLink size={13} />
                              {isSelected ? "Active Plan" : "Open Plan"}
                            </button>

                            <button
                              onClick={() => handleDeletePlan(projId, projName)}
                              title="Delete this project plan"
                              className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition shadow-xs"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── NEW PLAN MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><FolderTree size={18}/></div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create / Initialize Project Plan</h3>
                  <p className="text-[11px] text-slate-400">Select an existing project or create a new project with a starter WBS plan</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition"><X size={18}/></button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Company *</label>
                  <select
                    required
                    value={modalForm.companyId}
                    onChange={e => {
                      const coId = e.target.value;
                      setModalForm(f => {
                        const curP = projects.find(x => x._id === f.projectId);
                        const curPComp = curP?.company?._id || curP?.company;
                        const keep = coId && curPComp === coId;
                        return { ...f, companyId: coId, projectId: keep ? f.projectId : "", isNewProject: false };
                      });
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">Select Company</option>
                    {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Category *</label>
                  <select
                    required
                    value={modalForm.categoryId}
                    onChange={e => {
                      const catId = e.target.value;
                      setModalForm(f => {
                        const curP = projects.find(x => x._id === f.projectId);
                        const curPCat = curP?.category?._id || curP?.category;
                        const keep = catId && curPCat === catId;
                        return { ...f, categoryId: catId, projectId: keep ? f.projectId : "", isNewProject: false };
                      });
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Project Selection / Creation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Project *</label>
                  <button
                    type="button"
                    onClick={() => setModalForm(f => ({ ...f, isNewProject: !f.isNewProject, projectId: "", name: "" }))}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {modalForm.isNewProject ? "← Select Existing Project" : "+ Create New Project"}
                  </button>
                </div>

                {!modalForm.isNewProject ? (
                  (() => {
                    const availableProjects = projects.filter(p => {
                      const pComp = p.company?._id || p.company;
                      const pCat = p.category?._id || p.category;
                      if (modalForm.companyId && pComp !== modalForm.companyId) return false;
                      if (modalForm.categoryId && pCat !== modalForm.categoryId) return false;
                      return true;
                    });

                    return (
                      <select
                        value={modalForm.projectId}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "__new__") {
                            setModalForm(f => ({ ...f, isNewProject: true, projectId: "", name: "", code: "" }));
                          } else {
                            const p = projects.find(x => x._id === val);
                            setModalForm(f => ({
                              ...f,
                              isNewProject: false,
                              projectId: val,
                              name: p?.name || "",
                              code: p?.code || "",
                              companyId: p?.company?._id || p?.company || f.companyId,
                              categoryId: p?.category?._id || p?.category || f.categoryId,
                            }));
                          }
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                      >
                        <option value="">
                          {availableProjects.length === 0
                            ? "-- No projects found for selected Category --"
                            : `-- Choose an Existing Project (${availableProjects.length} available) --`}
                        </option>
                        {availableProjects.map(p => (
                          <option key={p._id} value={p._id}>
                            {p.name} {p.code ? `(${p.code})` : ""}
                          </option>
                        ))}
                        <option value="__new__">➕ + Create New Project</option>
                      </select>
                    );
                  })()
                ) : (
                  <div className="space-y-3 p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">New Project Name *</label>
                      <input
                        type="text"
                        required={modalForm.isNewProject}
                        placeholder="e.g. Healthcare Compliance Module 2026"
                        value={modalForm.name}
                        onChange={e => setModalForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Project Code</label>
                        <input
                          type="text"
                          placeholder="PRJ-2026-01"
                          value={modalForm.code}
                          onChange={e => setModalForm(f => ({ ...f, code: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
                        <input
                          type="text"
                          placeholder="Short description..."
                          value={modalForm.description}
                          onChange={e => setModalForm(f => ({ ...f, description: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Project Start Date</label>
                <input
                  type="date"
                  value={modalForm.startDate}
                  onChange={e => setModalForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Starter WBS Template</label>
                <select
                  value={modalForm.template}
                  onChange={e => setModalForm(f => ({ ...f, template: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="storyline-360">Storyline 360 — Full Production (5 Phases)</option>
                  <option value="rise-360">Rise 360 — Microlearning (2 Phases)</option>
                  <option value="blank">Blank WBS — Start from scratch</option>
                </select>
              </div>

              {/* Effort Preview */}
              <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 text-[11px] text-blue-800 flex items-center gap-2">
                <Target size={14} className="text-blue-500 shrink-0"/>
                <div>
                  <strong>Template:</strong> {(TEMPLATES[modalForm.template]||TEMPLATES["storyline-360"]).name} &nbsp;·&nbsp;
                  <strong>Phases:</strong> {(TEMPLATES[modalForm.template]||TEMPLATES["storyline-360"]).phases.length} &nbsp;·&nbsp;
                  <strong>Tasks:</strong> {(TEMPLATES[modalForm.template]||TEMPLATES["storyline-360"]).phases.reduce((a,p) => a+p.tasks.length, 0)}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-2xl bg-blue-600 px-5 py-2 text-[11px] font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  {creating ? "Initializing Plan…" : "Create / Initialize Project Plan"}
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
        confirmLabel={deleteConfirm.confirmLabel}
        danger={deleteConfirm.danger}
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
