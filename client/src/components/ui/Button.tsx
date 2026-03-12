import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dark-900 focus:ring-offset-white',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'dark:bg-gradient-to-r dark:from-neon-cyan dark:to-neon-magenta bg-gradient-to-r from-orange-500 to-orange-600 text-white dark:hover:from-neon-cyan/90 dark:hover:to-neon-magenta/90 hover:from-orange-600 hover:to-orange-700 dark:focus:ring-neon-cyan focus:ring-orange-500 shadow-lg dark:shadow-neon-cyan/20 shadow-orange-500/20': variant === 'primary',
            'dark:bg-dark-700 bg-light-200 dark:text-white text-dark-700 dark:hover:bg-dark-600 hover:bg-light-300 dark:focus:ring-dark-500 focus:ring-light-400': variant === 'secondary',
            'bg-transparent dark:text-dark-300 text-dark-600 dark:hover:text-white hover:text-dark-800 dark:hover:bg-dark-700 hover:bg-light-200': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'danger',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
