import { cn } from '@/lib/utils';

const VARIANTS = {
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
  fulfilled: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
} as const;

export default function StatusBadge({
  children,
  variant = 'pending',
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex px-2 py-0.5 text-xs font-medium rounded',
        VARIANTS[variant] ?? VARIANTS.pending,
        className
      )}
    >
      {children}
    </span>
  );
}
