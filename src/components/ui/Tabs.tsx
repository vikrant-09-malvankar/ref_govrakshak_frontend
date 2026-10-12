import React, { createContext, useContext } from 'react';

// ─── Context ──────────────────────────────────────────────────────────────────
interface TabsContextValue {
  value:    string;
  onChange: (v: string) => void;
  variant:  'underline' | 'pills' | 'segment';
}

const TabsContext = createContext<TabsContextValue>({
  value: '',
  onChange: () => {},
  variant: 'underline',
});

// ─── Root ─────────────────────────────────────────────────────────────────────
interface TabsProps {
  value:    string;
  onChange: (v: string) => void;
  variant?: 'underline' | 'pills' | 'segment';
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onChange,
  variant = 'underline',
  children,
  className = '',
}) => (
  <TabsContext.Provider value={{ value, onChange, variant }}>
    <div className={className}>{children}</div>
  </TabsContext.Provider>
);

// ─── Tab List ─────────────────────────────────────────────────────────────────
interface TabListProps {
  children:   React.ReactNode;
  className?: string;
}

const TABLIST_VARIANT: Record<string, string> = {
  underline: 'flex border-b border-surface-border gap-1',
  pills:     'flex gap-1',
  segment:   'flex bg-surface-subtle rounded-btn p-1 gap-1',
};

export const TabList: React.FC<TabListProps> = ({ children, className = '' }) => {
  const { variant } = useContext(TabsContext);
  return (
    <div role="tablist" className={`${TABLIST_VARIANT[variant]} ${className}`}>
      {children}
    </div>
  );
};

// ─── Tab ──────────────────────────────────────────────────────────────────────
interface TabProps {
  value:      string;
  children:   React.ReactNode;
  icon?:      React.ReactNode;
  badge?:     string | number;
  disabled?:  boolean;
}

const TAB_ACTIVE: Record<string, string> = {
  underline: 'border-b-2 border-primary-600 text-primary-600 font-medium',
  pills:     'bg-primary-100 text-primary-700 font-medium',
  segment:   'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-card dark:border dark:border-slate-700 font-medium',
};

const TAB_INACTIVE: Record<string, string> = {
  underline: 'border-b-2 border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600',
  pills:     'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700',
  segment:   'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200',
};

export const Tab: React.FC<TabProps> = ({ value, children, icon, badge, disabled }) => {
  const { value: selected, onChange, variant } = useContext(TabsContext);
  const isActive = selected === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      disabled={disabled}
      onClick={() => !disabled && onChange(value)}
      className={[
        'flex items-center gap-2 px-3 py-2 text-sm rounded-btn transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        isActive ? TAB_ACTIVE[variant] : TAB_INACTIVE[variant],
      ].join(' ')}
    >
      {icon && <span className="w-4 h-4 shrink-0">{icon}</span>}
      {children}
      {badge !== undefined && (
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
          isActive ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
};

// ─── Tab Panel ────────────────────────────────────────────────────────────────
interface TabPanelProps {
  value:      string;
  children:   React.ReactNode;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({ value, children, className = '' }) => {
  const { value: selected } = useContext(TabsContext);
  if (selected !== value) return null;
  return (
    <div
      id={`tabpanel-${value}`}
      role="tabpanel"
      aria-labelledby={`tab-${value}`}
      className={`animate-fade-in ${className}`}
    >
      {children}
    </div>
  );
};

export default Tabs;
