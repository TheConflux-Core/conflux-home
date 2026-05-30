import { useState, useRef, useEffect } from 'react';

interface InputModalProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function InputModal({ isOpen, title, placeholder = '', defaultValue = '', confirmLabel = 'Create', onConfirm, onCancel }: InputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  return (
    <div className="vault-modal-overlay" onClick={onCancel}>
      <div className="vault-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="vault-modal-title">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="vault-modal-input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="vault-modal-actions">
            <button type="button" className="vault-btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="vault-btn-primary" disabled={!value.trim()}>{confirmLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
