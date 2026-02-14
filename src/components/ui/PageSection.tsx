import { cn } from '@/lib/utils';

export function PageTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h1 className={cn('text-xl font-bold text-gray-900 dark:text-white', className)}>
      {children}
    </h1>
  );
}

export function PageSection({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-4', className)}>
      {title && (
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

const cardBase = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(cardBase, 'p-4 sm:p-5', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('border-b border-gray-200 dark:border-gray-700 pb-3 mb-0', className)}>
      {children}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4" role="alert">
      <p className="text-sm text-red-800 dark:text-red-200">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
        >
          Tekrar dene
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
