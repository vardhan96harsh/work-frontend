import React, { useState } from "react";
import WorkTimer from "./WorkTimer.jsx";
import ManualRemarksPage from "./ManualRemarksPage.jsx";

export default function Employee({ auth, onLogout }) {
  const [page, setPage] = useState("timer");

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* HEADER */}
      <header className="bg-white shadow-sm border-b">
        <div className="mx-auto  flex items-center justify-between px-6 py-3">
          <h1 className="text-xl font-semibold text-gray-800">
            Employee Dashboard
          </h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 font-medium">
              {auth?.user?.name}
            </span>

            <button
              onClick={onLogout}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* SUB NAVIGATION */}
      <nav className="bg-white border-b shadow-sm">
        <div className="mx-auto  px-6 flex items-center gap-6">
          <button
            onClick={() => setPage("timer")}
            className={`py-3 border-b-2 text-sm font-medium ${
              page === "timer"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-600 hover:text-purple-600"
            }`}
          >
            Work Timer
          </button>

          <button
            onClick={() => setPage("manual")}
            className={`py-3 border-b-2 text-sm font-medium ${
              page === "manual"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-600 hover:text-purple-600"
            }`}
          >
           Manual Time Requests
          </button>
        </div>
      </nav>

      {/* PAGE CONTENT */}
      <main className="mx-auto px-6 py-2">
        {page === "timer" ? (
          <WorkTimer auth={auth} />
        ) : (
          <ManualRemarksPage auth={auth} />
        )}
      </main>
    </div>
  );
}
