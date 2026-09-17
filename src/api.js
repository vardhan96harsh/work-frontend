// frontend/src/api.js

let BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.PROD ? "http://13.201.46.13" : "http://localhost:3001");

let configPromise = null;
let refreshPromise = null;

async function getApiBase() {
  // Electron desktop app
  if (window.worktracker?.getConfig) {
    if (!configPromise) {
      configPromise = window.worktracker
        .getConfig()
        .then((cfg) => {
          if (cfg?.SERVER_URL) {
            BASE = cfg.SERVER_URL;
            console.log("🌐 API base set from Electron config:", BASE);
          }
          return BASE;
        })
        .catch((err) => {
          console.warn("Could not load Electron config, using fallback BASE:", BASE, err);
          return BASE;
        });
    }

    return configPromise;
  }

  // Web / production fallback
  if (import.meta.env.PROD && BASE.includes("localhost")) {
    BASE = "http://13.201.46.13";
  }

  return BASE;
}

/**
 * Perform silent token refresh using stored refreshToken.
 * Deduplicates simultaneous refresh requests with a singleton promise.
 */
async function getRefreshedToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const stored = localStorage.getItem("auth");
      if (!stored) throw new Error("No auth stored");

      let authObj;
      try {
        authObj = JSON.parse(stored);
      } catch {
        throw new Error("Invalid stored auth JSON");
      }

      const refreshToken = authObj?.refreshToken;
      if (!refreshToken) throw new Error("No refresh token available");

      const base = await getApiBase();
      const res = await fetch(`${base}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        throw new Error(`Refresh token rejected with status ${res.status}`);
      }

      const data = await res.json();
      if (!data?.token) {
        throw new Error("No access token returned from refresh");
      }

      const updatedAuth = {
        ...authObj,
        token: data.token,
        refreshToken: data.refreshToken || refreshToken,
        user: data.user || authObj.user,
      };

      localStorage.setItem("auth", JSON.stringify(updatedAuth));

      // Notify React components of new token
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("auth:refreshed", { detail: updatedAuth })
        );
      }

      return updatedAuth.token;
    } catch (err) {
      console.warn("Silent token refresh failed:", err.message);
      localStorage.removeItem("auth");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:expired"));
      }
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function api(path, { method = "GET", body, token, headers, _isRetry = false } = {}) {
  const base = await getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path}`;

  // If token is not provided explicitly, try reading active token from stored auth
  let activeToken = token;
  if (!activeToken && !path.includes("/api/auth/")) {
    try {
      const stored = localStorage.getItem("auth");
      if (stored) activeToken = JSON.parse(stored)?.token;
    } catch {}
  }

  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    ...(headers || {}),
  };

  let res;

  try {
    res = await fetch(url, {
      method,
      headers: mergedHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const networkError = new Error(
      `Network error. Could not connect to server: ${url}`
    );
    networkError.status = 0;
    networkError.isOffline = true;
    networkError.originalError = err;
    throw networkError;
  }

  // 🔄 Transparent Silent Refresh: If 401 Unauthorized and not already retried
  if (res.status === 401 && !_isRetry && !path.includes("/api/auth/login") && !path.includes("/api/auth/refresh")) {
    try {
      const newToken = await getRefreshedToken();
      // Retry original request with newly refreshed token
      return await api(path, {
        method,
        body,
        token: newToken,
        headers,
        _isRetry: true,
      });
    } catch (refreshErr) {
      // Refresh failed -> bubble session expired error
      const sessionError = new Error("Session expired. Please log in again.");
      sessionError.status = 401;
      sessionError.isAuthExpired = true;
      throw sessionError;
    }
  }

  const contentType = res.headers.get("content-type") || "";

  let data;
  try {
    data = contentType.includes("application/json")
      ? await res.json()
      : await res.text();
  } catch {
    data = "";
  }

  if (!res.ok) {
    const msg =
      typeof data === "object"
        ? data.error || data.message || JSON.stringify(data)
        : data;

    const error = new Error(msg || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    error.url = url;
    throw error;
  }

  return data;
}