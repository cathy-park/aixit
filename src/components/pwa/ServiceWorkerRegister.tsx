"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isSecure = window.location.protocol === "https:" || isLocalhost;
    if (!isSecure) return;

    // Register once on mount. (No need to block rendering.)
    void navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("SW registration failed:", err);
      });
  }, []);

  return null;
}

