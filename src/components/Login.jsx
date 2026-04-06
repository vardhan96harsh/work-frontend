import React, { useState, useEffect } from "react";
import { api } from "../api.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load saved credentials from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("email");
    const savedPassword = localStorage.getItem("password");

    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
    }
  }, []);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const out = await api("/api/auth/login", { method: "POST", body: { email, password } });
      onLogin(out);

      // Save credentials to localStorage if "Remember Me" is checked
      localStorage.setItem("email", email);
      localStorage.setItem("password", password);
    } catch (err) {
      setError("Login failed. Check your email/password and try again.");
    } finally {
      setLoading(false);
    }
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-tight">ProjectTrack Login</h2>
            <p className="mt-1 text-sm text-gray-500">Sign in to continue to your workspace</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={[
                  "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900/10",
                  email && !emailOk ? "border-red-300" : "border-gray-300",
                ].join(" ")}
                placeholder="you@example.com"
              />
              {email && !emailOk && (
                <p className="mt-1 text-xs text-red-600">Please enter a valid email address.</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <div className="flex items-center gap-2">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={[
                    "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900/10",
                    password && password.length < 6 ? "border-red-300" : "border-gray-300",
                  ].join(" ")}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  title={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>
              {password && password.length < 6 && (
                <p className="mt-1 text-xs text-red-600">Use at least 6 characters.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !emailOk || password.length < 6}
              className="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
