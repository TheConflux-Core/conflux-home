import { useState, useEffect, useCallback, useRef } from 'react';
import type { FairyNudge } from './ConfluxPresence';
import './NudgeToast.css';

interface ToastItem extends FairyNudge {
  toastId: number;
  exiting: boolean;
}

const AUTO_DISMISS_MS = 5000;
const MAX_VISIBLE = 3;

export default function NudgeToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((toastId: number) => {
    setToasts(prev => prev.map(t => t.toastId === toastId ? { ...t, exiting: true } : t));
    // Remove from DOM after exit animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }, 300);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const nudge = (e as CustomEvent<FairyNudge>).detail;
      const toastId = ++counterRef.current;

      const newToast: ToastItem = { ...nudge, toastId, exiting: false };

      setToasts(prev => {
        const next = [...prev, newToast];
        // Enforce max visible — remove oldest if over limit
        if (next.length > MAX_VISIBLE) {
          return next.slice(next.length - MAX_VISIBLE);
        }
        return next;
      });

      // Auto-dismiss
      setTimeout(() => dismiss(toastId), AUTO_DISMISS_MS);
    };

    window.addEventListener('conflux:fairy-nudge', handler);
    return () => window.removeEventListener('conflux:fairy-nudge', handler);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="nudge-toast-container">
      {toasts.map(toast => (
        <div
          key={toast.toastId}
          className={`nudge-toast nudge-toast-${toast.priority ?? 'info'} ${toast.exiting ? 'exiting' : ''}`}
          onClick={() => dismiss(toast.toastId)}
        >
          <div className="nudge-toast-icon">
            {toast.priority === 'urgent' ? '🔴' : toast.priority === 'warn' ? '⚠️' : '💬'}
          </div>
          <div className="nudge-toast-body">
            <div className="nudge-toast-text">{toast.text}</div>
            {toast.app && <div className="nudge-toast-app">{toast.app}</div>}
          </div>
          <button className="nudge-toast-dismiss" onClick={(e) => { e.stopPropagation(); dismiss(toast.toastId); }}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
