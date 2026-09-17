import React, { useEffect, useState } from "react";
import {
  Building2,
  Tags,
  FolderKanban,
  CalendarRange,
  Sliders,
  Users as UsersIcon,
  BarChart3,
  FileClock,
  CalendarDays,
  LogOut,
} from "lucide-react";
import { api } from "../../api.js";
import Companies from "./Companies.jsx";
import Categories from "./Categories.jsx";
import Projects from "./Projects.jsx";
import Users from "./Users.jsx";
import AdminDailyReport from "./AdminDailyReport.jsx";
import AdminManualTasks from "./AdminManualTasks.jsx";
import AdminCalendar from "./AdminSidebarCalendar.jsx";
import ProjectPlanner from "./ProjectPlanner.jsx";
import AdminComplexity from "./AdminComplexity.jsx";
import BirthdayBanner from "../Employee/Worktimer/BirthdayBanner.jsx";
import logoImg from "../../assets/logo.png";

const TABS = [
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "categories", label: "Categories", icon: Tags },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "planner", label: "Project Planner", icon: CalendarRange },
  { key: "complexity", label: "Complexity Adjustment", icon: Sliders },
  { key: "users", label: "Users", icon: UsersIcon },
  { key: "dailyReport", label: "Daily Report", icon: BarChart3 },
  { key: "manualTasks", label: "Manual Time Requests", icon: FileClock },
  { key: "calendar", label: "Holiday Calendar", icon: CalendarDays },
];

export default function Admin({ auth, onLogout }) {
  const [tab, setTab] = useState("companies");
  const [pendingManualCount, setPendingManualCount] = useState(0);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("wt_theme") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    if (!auth?.token) return;
    let isMounted = true;

    async function loadPendingCount() {
      try {
        const res = await api("/api/manual-remarks/admin/pending-count", {
          token: auth.token,
        });
        if (isMounted && typeof res?.count === "number") {
          setPendingManualCount(res.count);
        }
      } catch (err) {
        console.error("Failed to load pending manual count:", err);
      }
    }

    async function loadBirthdays() {
      try {
        const res = await api("/api/users/birthdays/today", { token: auth.token });
        if (isMounted && Array.isArray(res)) {
          setTodayBirthdays(res);
        }
      } catch (err) {
        console.log("Birthday load error:", err);
      }
    }

    loadPendingCount();
    loadBirthdays();
    const interval = setInterval(loadPendingCount, 25000);
    const handleRefresh = () => loadPendingCount();
    window.addEventListener("manualRemarks:refresh", handleRefresh);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("manualRemarks:refresh", handleRefresh);
    };
  }, [auth?.token]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("wt_theme", theme);
    } catch {}
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden text-gray-800">

      {/* HEADER - MATCHING USER SIDE */}
      <header className="h-16 flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="h-full flex items-center justify-between px-6">

          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="WorkTracker"
              className="w-9 h-9 rounded-xl object-contain shadow-xs border border-gray-100 bg-white"
            />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              WorkTracker
            </h1>
          </div>

          {/* User Info + Logout */}
          <div className="flex items-center gap-4">
            {auth?.user?.name && (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gray-100 border border-gray-200 text-gray-700 rounded-full flex items-center justify-center font-semibold">
                  {auth.user.name[0].toUpperCase()}
                </div>
                <span className="font-medium text-sm text-gray-800">
                  {auth.user.name}
                </span>
              </div>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors duration-200 cursor-pointer"
            >
              <LogOut size={17} strokeWidth={2} />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR - MATCHING USER SIDE */}
        <aside className="w-56 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-3 space-y-1">
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = tab === key;

              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-blue-50 text-blue-700 shadow-sm font-semibold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {Icon && (
                      <Icon
                        size={18}
                        strokeWidth={2}
                        className={active ? "text-blue-600" : "text-gray-500"}
                      />
                    )}
                    <span className="truncate">{label}</span>
                  </div>

                  {key === "manualTasks" && pendingManualCount > 0 && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-800"
                      } shadow-sm shrink-0 ml-1.5`}
                      title={`${pendingManualCount} pending requests`}
                    >
                      {pendingManualCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-3">

          <div className="mx-auto space-y-3">

            {tab === "companies" && (
              <Companies auth={auth} />
            )}

            {tab === "categories" && (
              <Categories auth={auth} />
            )}

            {tab === "projects" && (
              <Projects auth={auth} />
            )}

            {tab === "planner" && (
              <ProjectPlanner auth={auth} theme={theme} />
            )}

            {tab === "complexity" && (
              <AdminComplexity auth={auth} theme={theme} />
            )}

            {tab === "users" && (
              <Users auth={auth} />
            )}

            {tab === "dailyReport" && (
              <AdminDailyReport auth={auth} />
            )}

            {tab === "manualTasks" && (
              <AdminManualTasks auth={auth} />
            )}

            {tab === "calendar" && (
              <AdminCalendar auth={auth} />
            )}

          </div>
        </main>

      </div>

      {/* FLOATING BIRTHDAY CELEBRATION CARD */}
      <BirthdayBanner todayBirthdays={todayBirthdays} />
    </div>
  );
}