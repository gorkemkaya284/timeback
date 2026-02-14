'use client';

/**
 * Shown only when DEV_MODE=true (auth bypass). Rendered from app layout.
 */
export default function DevModeBanner() {
  return (
    <div
      className="flex-shrink-0 bg-amber-500 text-amber-900 text-center py-1.5 px-2 text-sm font-medium"
      role="status"
      aria-live="polite"
    >
      DEV MODE (auth bypass)
    </div>
  );
}
