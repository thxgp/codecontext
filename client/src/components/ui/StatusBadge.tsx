import clsx from 'clsx';

interface StatusBadgeProps {
  status: 'pending' | 'processing' | 'ready' | 'failed';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'dark:bg-yellow-500/20 bg-yellow-100 dark:text-yellow-400 text-yellow-700': status === 'pending',
          'dark:bg-neon-cyan/20 bg-orange-100 dark:text-neon-cyan text-orange-700': status === 'processing',
          'dark:bg-green-500/20 bg-green-100 dark:text-green-400 text-green-700': status === 'ready',
          'dark:bg-red-500/20 bg-red-100 dark:text-red-400 text-red-700': status === 'failed',
        }
      )}
    >
      {status === 'processing' && (
        <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
