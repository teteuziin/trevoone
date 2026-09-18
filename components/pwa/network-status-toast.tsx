"use client";

import React, { useEffect, useState } from "react";

export function NetworkStatusToast() {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline && !showRestored) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 transition-all duration-300 animate-in fade-in slide-in-from-top-3 max-w-[90vw] sm:max-w-md ${
        isOffline
          ? "bg-amber-500/90 text-slate-950 border-amber-600/30 backdrop-blur-md"
          : "bg-emerald-600/90 text-white border-emerald-500/30 backdrop-blur-md"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          isOffline ? "bg-amber-900 animate-ping" : "bg-white"
        }`}
      />
      <span>
        {isOffline
          ? "Você está sem conexão com a internet."
          : "Conexão de internet restabelecida."}
      </span>
      {isOffline && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ml-1 underline font-bold hover:text-amber-900 cursor-pointer"
        >
          Recarregar
        </button>
      )}
    </div>
  );
}
