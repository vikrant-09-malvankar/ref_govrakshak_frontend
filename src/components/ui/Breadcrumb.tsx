import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items:      BreadcrumbItem[];
  showHome?:  boolean;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  showHome = true,
  className = '',
}) => (
  <nav aria-label="Breadcrumb" className={`flex items-center ${className}`}>
    <ol className="flex items-center gap-1 text-small text-gray-500 dark:text-slate-400 flex-wrap">
      {showHome && (
        <>
          <li>
            <Link
              to="/"
              className="flex items-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400 transition-colors"
              aria-label="Home"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
          </li>
          {items.length > 0 && (
            <li aria-hidden="true">
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600" />
            </li>
          )}
        </>
      )}
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            <li>
              {isLast ? (
                <span
                  className="text-gray-900 dark:text-white font-medium flex items-center gap-1"
                  aria-current="page"
                >
                  {item.icon && <span className="w-3.5 h-3.5">{item.icon}</span>}
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                >
                  {item.icon && <span className="w-3.5 h-3.5">{item.icon}</span>}
                  {item.label}
                </Link>
              ) : (
                <span className="flex items-center gap-1">
                  {item.icon && <span className="w-3.5 h-3.5">{item.icon}</span>}
                  {item.label}
                </span>
              )}
            </li>
            {!isLast && (
              <li aria-hidden="true">
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600" />
              </li>
            )}
          </React.Fragment>
        );
      })}
    </ol>
  </nav>
);

export default Breadcrumb;
