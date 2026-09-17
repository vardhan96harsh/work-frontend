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

  // 🔄 Sync auth state whenever tokens are silently refreshed
  useEffect(() => {
    const handleRefreshed = (e) => {
      if (e.detail) setAuth(e.detail);
    };
    const handleExpired = () => {
      setAuth(null);
    };

    window.addEventListener("auth:refreshed", handleRefreshed);
    window.addEventListener("auth:expired", handleExpired);

    return () => {
      window.removeEventListener("auth:refreshed", handleRefreshed);
      window.removeEventListener("auth:expired", handleExpired);
    };
  }, []);

  // 🚪 Global App Close handler: Ensures window always closes smoothly across all screens
  useEffect(() => {
    const off = window.worktracker?.onAppClosing?.(() => {
      window.worktracker?.confirmAppClose?.();
    });
    return () => typeof off === "function" && off();
  }, []);

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

  if (isOverlay)
    return (
      <>
        <GlobalHeartbeat auth={auth} />
        <OverlayWidget />
      </>
    );
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
