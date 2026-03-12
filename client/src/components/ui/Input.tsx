import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium dark:text-dark-300 text-dark-600 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full px-4 py-2.5 rounded-lg',
            'dark:bg-dark-800 bg-white border dark:border-dark-600 border-light-300',
            'dark:text-white text-dark-800 dark:placeholder-dark-400 placeholder-dark-400',
            'focus:outline-none focus:ring-2 dark:focus:ring-neon-cyan focus:ring-orange-500 focus:border-transparent',
            'transition-all',
            error && 'border-red-500 dark:border-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
