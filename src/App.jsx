import React, { useEffect, useState } from "react";
import { api } from "./api.js";
import Login from "./components/Login.jsx";
import Admin from "./components/Admin/Admin.jsx";
import Employee from "./components/Employee/Employee.jsx";
import OverlayWidget from "./components/Employee/OverlayWidget.jsx";
import GlobalHeartbeat from "./components/GlobalHeartbeat";


export default function App() {
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("auth") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (auth) localStorage.setItem("auth", JSON.stringify(auth));
    else localStorage.removeItem("auth");

    const isEmployee = !!auth && auth.user?.role === "employee";
    window.worktracker?.setOverlayEnabled?.(isEmployee);
  }, [auth]);

  async function handleLogout() {
    try {
      await api("/api/work-sessions/stop", {
        method: "POST",
        token: auth?.token,
        body: { remarks: "Stopped on logout" },
      });
    } catch {
      // ignore if no session
    } finally {
      setAuth(null);
    }
  }

  const isOverlay =
    typeof window !== "undefined" &&
    window.location.hash.includes("/overlay");

  if (isOverlay) return <OverlayWidget />;
  if (!auth) return <Login onLogin={setAuth} />;

  if (auth.user?.role === "admin")
    return <Admin auth={auth} onLogout={handleLogout} />;

  return (
  <>
    <GlobalHeartbeat auth={auth} />   {/* 🔥 IMPORTANT */}
    <Employee auth={auth} onLogout={handleLogout} />
  </>
);

}
