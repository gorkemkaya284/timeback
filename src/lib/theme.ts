/**
 * Theme system: light/dark/auto + accent color.
 * All state is stored in localStorage only (no auth, no DB). DEV MODE friendly.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'blue' | 'green' | 'purple' | 'orange';

export const THEME_STORAGE_KEY = 'timeback-theme';
export const ACCENT_STORAGE_KEY = 'timeback-accent';

export const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export const ACCENT_OPTIONS: { value: AccentColor; label: string; hex: string }[] = [
  { value: 'blue', label: 'Blue', hex: '#3b82f6' },
  { value: 'green', label: 'Green', hex: '#22c55e' },
  { value: 'purple', label: 'Purple', hex: '#a855f7' },
  { value: 'orange', label: 'Orange', hex: '#f97316' },
];

/** RGB values for CSS var(--accent) usage with opacity */
export const ACCENT_RGB: Record<AccentColor, string> = {
  blue: '59 130 246',
  green: '34 197 94',
  purple: '168 85 247',
  orange: '249 115 22',
};
