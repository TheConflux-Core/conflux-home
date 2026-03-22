export type Theme = 'light' | 'dark' | 'system';
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'cyan';

const STORAGE_KEYS = {
  theme: 'conflux-theme',
  accent: 'conflux-accent',
  wallpaper: 'conflux-wallpaper',
} as const;

/**
 * Get the effective theme — resolves 'system' to 'light' or 'dark'.
 */
export function getEffectiveTheme(preference: Theme): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') return preference;
  // 'system' — detect OS preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply theme to document body by toggling the 'dark' class.
 */
export function applyTheme(theme: 'light' | 'dark'): void {
  document.body.classList.toggle('dark', theme === 'dark');
}

/**
 * Apply accent color to document body via data-accent attribute.
 */
export function applyAccent(accent: AccentColor): void {
  document.body.setAttribute('data-accent', accent);
}

/**
 * Apply wallpaper as background-image on an element.
 * Pass empty string to remove wallpaper (falls back to CSS gradient).
 */
export function applyWallpaper(element: HTMLElement, url: string): void {
  if (url) {
    element.style.backgroundImage = `url('${url}')`;
    element.style.backgroundSize = 'cover';
    element.style.backgroundPosition = 'center';
  } else {
    element.style.backgroundImage = '';
    element.style.backgroundSize = '';
    element.style.backgroundPosition = '';
  }
}

/**
 * Listen for system theme changes. Returns an unsubscribe function.
 */
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}

/**
 * Initialize theme from localStorage on app start.
 * Sets dark class and data-accent on document.body.
 */
export function initTheme(): void {
  const storedTheme = localStorage.getItem(STORAGE_KEYS.theme) as Theme | null;
  const effective = getEffectiveTheme(storedTheme ?? 'system');
  applyTheme(effective);

  const storedAccent = localStorage.getItem(STORAGE_KEYS.accent) as AccentColor | null;
  if (storedAccent) {
    applyAccent(storedAccent);
  }
}

/**
 * Save theme preference to localStorage.
 */
export function saveTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

/**
 * Save accent color to localStorage.
 */
export function saveAccent(accent: AccentColor): void {
  localStorage.setItem(STORAGE_KEYS.accent, accent);
}

/**
 * Save wallpaper URL to localStorage.
 */
export function saveWallpaper(url: string): void {
  localStorage.setItem(STORAGE_KEYS.wallpaper, url);
}

/**
 * Get saved wallpaper URL from localStorage.
 */
export function getSavedWallpaper(): string {
  return localStorage.getItem(STORAGE_KEYS.wallpaper) ?? '';
}
