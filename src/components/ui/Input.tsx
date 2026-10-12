import React from 'react';

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:   string;
  error?:   string;
  hint?:    string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  required?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, iconLeft, iconRight, required, className = '', id, ...props }, ref) => {
    const inputId = id ?? `input-${label?.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-small font-medium text-gray-700 dark:text-slate-300 mb-1.5">
            {label}
            {required && <span className="text-danger-600 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-slate-500">
              {iconLeft}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={[
              'block w-full rounded-btn border px-3 py-2 text-body text-gray-900 dark:text-white',
              'placeholder:text-gray-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'disabled:bg-surface-muted dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed',
              'transition-colors duration-150',
              error
                ? 'border-danger-600 dark:border-danger-500 focus:ring-danger-500 focus:border-danger-600'
                : 'border-surface-border-strong dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600',
              iconLeft  ? 'pl-10' : '',
              iconRight ? 'pr-10' : '',
              className,
            ].join(' ')}
            {...props}
          />
          {iconRight && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-slate-500">
              {iconRight}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger-600 dark:text-danger-400" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectOption { value: string; label: string; disabled?: boolean }

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string;
  error?:    string;
  hint?:     string;
  options:   SelectOption[];
  placeholder?: string;
  required?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, required, className = '', id, ...props }, ref) => {
    const selectId = id ?? `select-${label?.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-small font-medium text-gray-700 dark:text-slate-300 mb-1.5">
            {label}
            {required && <span className="text-danger-600 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={[
            'block w-full rounded-btn border px-3 py-2 text-body text-gray-900 dark:text-white bg-white dark:bg-slate-800',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:bg-surface-muted dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed',
            'transition-colors duration-150 cursor-pointer',
            error
              ? 'border-danger-600 dark:border-danger-500 focus:ring-danger-500'
              : 'border-surface-border-strong dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600',
            className,
          ].join(' ')}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-xs text-danger-600 dark:text-danger-400" role="alert">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:   string;
  error?:   string;
  hint?:    string;
  required?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className = '', id, ...props }, ref) => {
    const textareaId = id ?? `textarea-${label?.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-small font-medium text-gray-700 dark:text-slate-300 mb-1.5">
            {label}
            {required && <span className="text-danger-600 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={!!error}
          className={[
            'block w-full rounded-btn border px-3 py-2 text-body text-gray-900 dark:text-white bg-white dark:bg-slate-800',
            'placeholder:text-gray-400 dark:placeholder:text-slate-500 resize-y min-h-[80px]',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:bg-surface-muted dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors duration-150',
            error
              ? 'border-danger-600 dark:border-danger-500 focus:ring-danger-500'
              : 'border-surface-border-strong dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600',
            className,
          ].join(' ')}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-danger-600 dark:text-danger-400" role="alert">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export default Input;
