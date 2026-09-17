import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText,
  confirmLabel,
  cancelText = "Cancel",
  isDanger = true,
  danger,
  onConfirm,
  onCancel,
  onClose,
  loading = false,
}) {
  const effectiveDanger = danger !== undefined ? danger : isDanger;
  const effectiveConfirmText = confirmLabel || confirmText || (effectiveDanger ? "Delete" : "Confirm");
  const handleCancel = onCancel || onClose || (() => {});

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape" && !loading) {
        handleCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, handleCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) handleCancel();
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              effectiveDanger ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 ${
              effectiveDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Processing..." : effectiveConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
