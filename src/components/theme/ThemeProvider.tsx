'use client';

/**
 * Applies theme (light/dark/auto) and accent color from localStorage to the document.
 * Persists changes to localStorage. No auth, no DB. Instant preview.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  THEME_STORAGE_KEY,
  ACCENT_STORAGE_KEY,
  type ThemeMode,
  type AccentColor,
} from '@/lib/theme';

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const v = localStorage.getItem(THEME_STORAGE_KEY);
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'system';
}

function getStoredAccent(): AccentColor {
  if (typeof window === 'undefined') return 'blue';
  const v = localStorage.getItem(ACCENT_STORAGE_KEY);
  if (v === 'blue' || v === 'green' || v === 'purple' || v === 'orange') return v;
  return 'blue';
}

function prefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && prefersDark());
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(dark ? 'dark' : 'light');
}

function applyAccent(accent: AccentColor) {
  document.documentElement.setAttribute('data-accent', accent);
}

type ThemeContextValue = {
  theme: ThemeMode;
  accent: AccentColor;
  setTheme: (t: ThemeMode) => void;
  setAccent: (a: AccentColor) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [accent, setAccentState] = useState<AccentColor>('blue');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getStoredTheme());
    setAccentState(getStoredAccent());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    applyAccent(accent);
  }, [mounted, theme, accent]);

  useEffect(() => {
    if (!mounted) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme === 'system') applyTheme('system');
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [mounted, theme]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem(THEME_STORAGE_KEY, t);
    applyTheme(t);
  }, []);

  const setAccent = useCallback((a: AccentColor) => {
    setAccentState(a);
    localStorage.setItem(ACCENT_STORAGE_KEY, a);
    applyAccent(a);
  }, []);

  if (!mounted) {
    applyTheme(getStoredTheme());
    applyAccent(getStoredAccent());
  }

  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
