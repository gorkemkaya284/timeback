'use client';

/**
 * Appearance settings: theme (light/dark/system) and accent color.
 * Changes apply instantly via ThemeProvider; stored in localStorage only (no auth).
 */
import { useTheme } from '@/components/theme/ThemeProvider';
import { THEME_OPTIONS, ACCENT_OPTIONS } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function AppearanceSettingsPage() {
  const { theme, accent, setTheme, setAccent } = useTheme();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Appearance
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Customize how Timeback looks. Your choices are saved on this device.
      </p>

      {/* Theme: Light / Dark / System */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Theme
        </h2>
        <div className="flex flex-wrap gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                theme === opt.value
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          System follows your device light/dark preference.
        </p>
      </section>

      {/* Accent color swatches */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Accent color
        </h2>
        <div className="flex flex-wrap gap-4">
          {ACCENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAccent(opt.value)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                accent === opt.value
                  ? 'border-accent ring-2 ring-accent/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              )}
              title={opt.label}
            >
              <span
                className="w-10 h-10 rounded-full shrink-0"
                style={{ backgroundColor: opt.hex }}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Affects buttons, links, and highlights across the app.
        </p>
      </section>
    </div>
  );
}
