/**
 * Keyboard shortcut manager for Conflux Home
 * Registers global keydown handlers for navigation and actions.
 */

export type View = 'dashboard' | 'chat' | 'marketplace' | 'settings';

interface ShortcutHandlers {
  onNavigate: (view: View) => void;
  onClose: () => void;
  onFocusSearch: () => void;
  onSelectFirstAgent: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

function getModifier(e: KeyboardEvent): boolean {
  return isMac ? e.metaKey : e.ctrlKey;
}

// Keys that are browser-reserved (we don't override these)
const BROWSER_RESERVED = new Set(['t', 'w', 'n', 'r', 'l', 'j', 'd', 'h', 'q', 'p']);

export function registerShortcuts(handlers: ShortcutHandlers): () => void {
  function handleKeyDown(e: KeyboardEvent) {
    const mod = getModifier(e);

    // Escape — close panel/modal (no modifier needed)
    if (e.key === 'Escape' && !mod) {
      e.preventDefault();
      handlers.onClose();
      return;
    }

    if (!mod) return;

    // Don't override browser-reserved shortcuts
    if (BROWSER_RESERVED.has(e.key.toLowerCase())) return;

    switch (e.key) {
      case ',':
        // Cmd/Ctrl + , → Settings
        e.preventDefault();
        handlers.onNavigate('settings');
        break;

      case '1':
        // Cmd/Ctrl + 1 → Dashboard
        e.preventDefault();
        handlers.onNavigate('dashboard');
        break;

      case '2':
        // Cmd/Ctrl + 2 → Chat (select first agent)
        e.preventDefault();
        handlers.onSelectFirstAgent();
        handlers.onNavigate('chat');
        break;

      case '3':
        // Cmd/Ctrl + 3 → Marketplace
        e.preventDefault();
        handlers.onNavigate('marketplace');
        break;

      case '4':
        // Cmd/Ctrl + 4 → Settings
        e.preventDefault();
        handlers.onNavigate('settings');
        break;

      case 'k':
        // Cmd/Ctrl + K → Focus search / open marketplace
        e.preventDefault();
        handlers.onNavigate('marketplace');
        // Small delay to let view render before focusing
        setTimeout(() => handlers.onFocusSearch(), 100);
        break;
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}
