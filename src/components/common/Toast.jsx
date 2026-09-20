// Systeme de notifications toast (succes / erreur / info / avertissement).
// Affiche en haut a droite, disparait automatiquement apres `duration` ms.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: {
    border: "border-emerald-500",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    bar: "bg-emerald-500",
  },
  error: {
    border: "border-red-500",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    bar: "bg-red-500",
  },
  warning: {
    border: "border-amber-500",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    bar: "bg-amber-500",
  },
  info: {
    border: "border-blue-500",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    bar: "bg-blue-500",
  },
};

const DEFAULT_DURATION = 4500;

let toastIdCounter = 0;

function ToastItem({ toast, onDismiss }) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const style = STYLES[toast.type] || STYLES.info;
  const Icon = ICONS[toast.type] || Info;

  const handleDismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [handleDismiss, toast.duration]);

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border-l-4 bg-white shadow-lg ring-1 ring-black/5 transition-all duration-200 ease-out ${style.border} ${
        entered && !leaving
          ? "translate-y-0 opacity-100"
          : "-translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3 p-4 pr-8">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.iconBg} ${style.iconColor}`}
        >
          <Icon size={18} />
        </span>
        <p className="mt-0.5 text-sm font-medium leading-snug text-gray-800">
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fermer la notification"
        className="absolute right-2 top-2 cursor-pointer rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <X size={14} />
      </button>
      <div
        className={`absolute bottom-0 left-0 h-1 ${style.bar}`}
        style={{ animation: `toast-progress ${toast.duration}ms linear forwards` }}
      />
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message, opts = {}) => {
    const id = ++toastIdCounter;
    const duration = opts.duration ?? DEFAULT_DURATION;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    return id;
  }, []);

  const api = useRef({
    success: (message, opts) => push("success", message, opts),
    error: (message, opts) => push("error", message, opts),
    warning: (message, opts) => push("warning", message, opts),
    info: (message, opts) => push("info", message, opts),
    dismiss,
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-[9999] flex flex-col gap-3 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast doit etre utilise a l'interieur d'un ToastProvider");
  }
  return ctx;
}
