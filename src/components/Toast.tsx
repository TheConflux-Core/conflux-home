import { ToastItem } from '../hooks/useToast';

const TYPE_COLORS: Record<string, string> = {
  success: 'var(--accent-success)',
  error: 'var(--accent-error)',
  info: 'var(--accent-primary)',
};

const TYPE_ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-item"
          style={{ borderLeft: `3px solid ${TYPE_COLORS[t.type]}` }}
          onClick={() => onDismiss(t.id)}
        >
          <span
            className="toast-icon"
            style={{ color: TYPE_COLORS[t.type] }}
          >
            {TYPE_ICONS[t.type]}
          </span>
          <span className="toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
