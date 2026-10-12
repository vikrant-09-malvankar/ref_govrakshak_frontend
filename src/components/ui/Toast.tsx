/**
 * Global Toast / notification system
 * Mount <Toaster /> once in App.tsx.
 * Use the useToast() hook anywhere.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id:          string;
  type:        ToastType;
  title:       string;
  description?: string;
  duration:    number;  // ms; 0 = persistent
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'> & { duration?: number }) => void;
  dismiss: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider (mount once in App.tsx) ────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, 'id'> & { duration?: number }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = opts.duration ?? 4500;
    setToasts(prev => [...prev, { ...opts, id, duration }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ─── Visual toast item ────────────────────────────────────────────────────────
const ICON: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const STYLES: Record<ToastType, string> = {
  success: 'border-success-600/30 dark:border-success-600/50 bg-success-50 dark:bg-success-900/30 text-success-800 dark:text-success-200',
  error:   'border-danger-600/30 dark:border-danger-600/50 bg-danger-50 dark:bg-danger-900/30 text-danger-800 dark:text-danger-200',
  warning: 'border-warning-600/30 dark:border-warning-600/50 bg-warning-50 dark:bg-warning-900/30 text-warning-800 dark:text-warning-200',
  info:    'border-info-600/30 dark:border-info-600/50 bg-info-50 dark:bg-info-900/30 text-info-800 dark:text-info-200',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-success-600 dark:text-success-400',
  error:   'text-danger-600 dark:text-danger-400',
  warning: 'text-warning-600 dark:text-warning-400',
  info:    'text-info-600 dark:text-info-400',
};

interface ToastItemProps {
  t: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ t, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const Icon = ICON[t.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(t.id), 200);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'flex items-start gap-3 w-full max-w-sm p-4 rounded-card border shadow-card-md',
        'transition-all duration-200',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        STYLES[t.type],
      ].join(' ')}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${ICON_STYLES[t.type]}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{t.title}</p>
        {t.description && <p className="text-xs mt-0.5 opacity-80">{t.description}</p>}
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─── Toaster container ────────────────────────────────────────────────────────
interface ToasterProps {
  toasts:    Toast[];
  onDismiss: (id: string) => void;
}

const Toaster: React.FC<ToasterProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem t={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

export default ToastProvider;
