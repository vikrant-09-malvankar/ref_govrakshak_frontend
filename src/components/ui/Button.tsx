import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 border-transparent shadow-sm',
  secondary: 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:ring-primary-500 border-surface-border dark:border-slate-700 shadow-sm',
  ghost:     'bg-transparent text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white focus:ring-gray-400 border-transparent',
  danger:    'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500 border-transparent shadow-sm',
  success:   'bg-success-600 text-white hover:bg-success-700 focus:ring-success-600 border-transparent shadow-sm',
  outline:   'bg-transparent text-primary-600 hover:bg-primary-50 focus:ring-primary-500 border-primary-300',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

const iconSizeClasses: Record<ButtonSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      iconLeft,
      iconRight,
      fullWidth = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-medium rounded-btn',
          'border transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <Loader2 className={`animate-spin ${iconSizeClasses[size]}`} />
        ) : (
          iconLeft && <span className={iconSizeClasses[size]}>{iconLeft}</span>
        )}
        {children}
        {!loading && iconRight && (
          <span className={iconSizeClasses[size]}>{iconRight}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
