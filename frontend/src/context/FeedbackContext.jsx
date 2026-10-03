import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

const FeedbackContext = createContext(null);

const TOAST_DURATION_MS = 4500;

function ConfirmDialog({ title, message, confirmLabel, tone, onClose }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const danger = tone === "danger";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/30 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose(false);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-md rounded-[var(--radius-card)] bg-surface p-6 shadow-xl shadow-slate-400/30"
      >
        <div className="flex gap-4">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"
            }`}
          >
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-base font-semibold text-ink">
              {title}
            </h2>
            {message && (
              <p id="confirm-message" className="mt-1.5 text-sm text-ink-muted">
                {message}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button variant={danger ? "destructive" : "accent"} autoFocus onClick={() => onClose(true)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Toasts({ items, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 print:hidden">
      {items.map((toast) => {
        const error = toast.tone === "error";
        const Icon = error ? XCircle : CheckCircle2;
        return (
          <div
            key={toast.id}
            role={error ? "alert" : "status"}
            className="pointer-events-auto flex items-start gap-3 rounded-[var(--radius-control)] border border-slate-100 bg-surface px-4 py-3 shadow-lg shadow-slate-300/40"
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${error ? "text-danger" : "text-success"}`} />
            <p className="flex-1 text-sm text-ink">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              className="text-ink-subtle hover:text-ink"
              onClick={() => onDismiss(toast.id)}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function FeedbackProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const confirm = useCallback(
    ({ title, message, confirmLabel = "Confirm", tone = "danger" }) =>
      new Promise((resolve) => setDialog({ title, message, confirmLabel, tone, resolve })),
    []
  );

  const closeDialog = useCallback(
    (result) => {
      dialog?.resolve(result);
      setDialog(null);
    },
    [dialog]
  );

  const dismiss = useCallback((id) => setToasts((items) => items.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (message, tone = "success") => {
      const id = ++nextId.current;
      setToasts((items) => [...items.slice(-3), { id, message, tone }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  return (
    <FeedbackContext.Provider value={{ confirm, notify }}>
      {children}
      {dialog && <ConfirmDialog {...dialog} onClose={closeDialog} />}
      <Toasts items={toasts} onDismiss={dismiss} />
    </FeedbackContext.Provider>
  );
}

/** `await confirm({...})` renvoie true/false ; `notify(message, "success" | "error")` affiche un toast. */
export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useFeedback must be used inside FeedbackProvider");
  return context;
}
