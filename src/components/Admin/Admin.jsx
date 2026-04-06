import React, { useState } from "react";
import Companies from "./Companies.jsx";
import Categories from "./Categories.jsx";
import Projects from "./Projects.jsx";
import Users from "./Users.jsx";
import AdminDailyReport from "./AdminDailyReport.jsx";
import AdminManualTasks from "./AdminManualTasks.jsx";

const TABS = [
  { key: "companies", label: "Companies" },
  { key: "categories", label: "Categories" },
  { key: "projects", label: "Projects" },
  { key: "users", label: "Users" },
  { key: "dailyReport", label: "Daily Report" },
  { key: "manualTasks", label: "Manual Time Requests" },
];

export default function Admin({ auth, onLogout }) {
  const [tab, setTab] = useState("companies");

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden text-gray-800">


      {/* HEADER (FIXED) */}
      <header className="h-16 shrink-0 border-b bg-white px-2 shadow-sm">

        <div className="h-full flex items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>

          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="font-medium">{auth?.user?.name}</span>{" "}
              <span className="text-gray-400">
                ({auth?.user?.role})
              </span>
            </div>

            <button
              onClick={onLogout}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR — NEVER SCROLLS */}
        <aside className="w-56 shrink-0 border-r bg-white overflow-hidden">
          <div className="p-2 space-y-1">
            {TABS.map(({ key, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium
                    ${active
                      ? "bg-gray-900 text-white border-l-4 border-blue-500 shadow-sm"


                      : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT CONTENT — ONLY THIS SCROLLS */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-2">
          <div className="mx-auto  space-y-6">


            {tab === "companies" && <Companies auth={auth} />}
            {tab === "categories" && <Categories auth={auth} />}
            {tab === "projects" && <Projects auth={auth} />}
            {tab === "users" && <Users auth={auth} />}
            {tab === "dailyReport" && <AdminDailyReport auth={auth} />}
            {tab === "manualTasks" && <AdminManualTasks auth={auth} />}

          </div>
        </main>

      </div>
    </div>
  );
}
