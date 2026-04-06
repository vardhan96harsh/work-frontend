// frontend/src/api.js
let BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

// ✅ 1. Detect and override for Electron desktop app
if (window.worktracker?.getConfig) {
  // window.worktracker.getConfig() returns { SERVER_URL, machine }
  window.worktracker.getConfig().then((cfg) => {
    if (cfg?.SERVER_URL) {
      BASE = cfg.SERVER_URL;
      console.log("🌐 API base set from Electron config:", BASE);
    }
  });
} else {
  // ✅ 2. Fallback: Production build (web or packaged Electron)
  if (import.meta.env.PROD && BASE.includes("localhost")) {
    // Put your Render URL here 👇
    BASE = "http://13.201.46.13";
  }
}

export async function api(path, { method = "GET", body, token, headers } = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {}),
  };

  const res = await fetch(url, {
    method,
    headers: mergedHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";

  // 🧩 Improved error display for 400s or others
  let data;
  try {
    data = contentType.includes("application/json") ? await res.json() : await res.text();
  } catch {
    data = await res.text();
  }

  if (!res.ok) {
    const msg = typeof data === "object" ? data.error || JSON.stringify(data) : data;
    throw new Error(msg || `HTTP ${res.status}`);
  }

  return contentType.includes("text/csv") ? data : data;
}
