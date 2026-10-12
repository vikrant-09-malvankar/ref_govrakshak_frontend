import React from 'react';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';

interface PageHeaderProps {
  title:         string;
  subtitle?:     string;
  breadcrumbs?:  BreadcrumbItem[];
  actions?:      React.ReactNode;
  icon?:         React.ReactNode;
  className?:    string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  icon,
  className = '',
}) => (
  <div className={`mb-6 ${className}`}>
    {breadcrumbs && breadcrumbs.length > 0 && (
      <Breadcrumb items={breadcrumbs} className="mb-2" />
    )}
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="p-2 bg-primary-100 rounded-lg shrink-0 text-primary-600">{icon}</div>
        )}
        <div className="min-w-0">
          <h1 className="text-heading-1 text-gray-900 dark:text-white truncate">{title}</h1>
          {subtitle && (
            <p className="text-small text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {actions}
        </div>
      )}
    </div>
  </div>
);

export default PageHeader;
