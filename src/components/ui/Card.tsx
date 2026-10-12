import React, { isValidElement } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Base Card ────────────────────────────────────────────────────────────────
interface CardProps {
  className?: string;
  children:   React.ReactNode;
  padding?:   boolean;
  hover?:     boolean;
  onClick?:   () => void;
}

export const Card: React.FC<CardProps> = ({
  className = '',
  children,
  padding = true,
  hover = false,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={[
      'bg-white dark:bg-slate-800 rounded-card shadow-card border border-surface-border dark:border-slate-700',
      padding ? 'p-5' : '',
      hover ? 'hover:shadow-card-md transition-shadow duration-200 cursor-pointer' : '',
      onClick ? 'cursor-pointer' : '',
      className,
    ].join(' ')}
  >
    {children}
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title:       string;
  value:       string | number;
  /** Lucide component (e.g. `Users`) or pre-rendered icon (e.g. `<Users className="..." />`) */
  icon:        React.ElementType | React.ReactElement;
  iconColor?:  string;
  iconBg?:     string;
  change?:     string;
  changeType?: 'positive' | 'negative' | 'neutral';
  description?: string;
  action?:     { label: string; onClick: () => void };
  className?:  string;
  loading?:    boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconColor  = 'text-primary-600',
  iconBg     = 'bg-primary-100',
  change,
  changeType = 'neutral',
  description,
  action,
  className  = '',
  loading    = false,
}) => {
  const changeMeta = {
    positive: { color: 'text-success-600', Icon: TrendingUp },
    negative: { color: 'text-danger-600',  Icon: TrendingDown },
    neutral:  { color: 'text-gray-500',    Icon: Minus },
  }[changeType];

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-card shadow-card border border-surface-border dark:border-slate-700 p-5 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-slate-700 animate-skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded animate-skeleton w-24" />
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded animate-skeleton w-16" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-card shadow-card border border-surface-border dark:border-slate-700 p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2.5 rounded-lg shrink-0 ${iconBg}`}>
            {isValidElement(icon) ? (
              icon
            ) : (
              React.createElement(icon as React.ElementType, {
                className: `w-5 h-5 ${iconColor}`,
                'aria-hidden': true,
              })
            )}
          </div>
          <div className="min-w-0">
            <p className="text-caption text-gray-500 dark:text-slate-400 truncate">{title}</p>
            <p className="text-heading-2 text-gray-900 dark:text-white font-bold mt-0.5">{value}</p>
          </div>
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-medium shrink-0 ml-2 ${changeMeta.color}`}>
            <changeMeta.Icon className="w-3.5 h-3.5" />
            {change}
          </div>
        )}
      </div>
      {description && (
        <p className="mt-3 text-xs text-gray-500 dark:text-slate-400 border-t border-surface-border dark:border-slate-700 pt-3">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 w-full text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium border-t border-surface-border dark:border-slate-700 pt-3 text-left hover:underline"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
};

// ─── Section Card ─────────────────────────────────────────────────────────────
interface SectionCardProps {
  title?:     string;
  subtitle?:  string;
  action?:    React.ReactNode;
  children:   React.ReactNode;
  padding?:   boolean;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  action,
  children,
  padding = true,
  className = '',
}) => (
  <div className={`bg-white dark:bg-slate-800 rounded-card shadow-card border border-surface-border dark:border-slate-700 ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border dark:border-slate-700">
        <div>
          {title && <h3 className="text-heading-3 text-gray-900 dark:text-white">{title}</h3>}
          {subtitle && <p className="text-caption text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className={padding ? 'p-5' : ''}>{children}</div>
  </div>
);

export default Card;
