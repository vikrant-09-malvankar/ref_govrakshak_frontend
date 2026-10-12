import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Package, BarChart3, ShoppingCart, Users, Store,
  Monitor, AlertCircle, Laptop, ClipboardList, ChevronRight,
  Settings, Activity, Shield, FileText, Building2, UserCheck,
  ChevronLeft, X,
} from 'lucide-react';

// ─── Nav item types ───────────────────────────────────────────────────────────
interface NavItem {
  label:   string;
  path:    string;
  icon:    React.ElementType;
  module:  string;
  badge?:  number;
}

interface NavGroup {
  label:   string;
  items:   NavItem[];
}

// ─── Role-based navigation config ────────────────────────────────────────────
const NAV_CONFIG: Record<string, NavGroup[]> = {
  'Super Admin': [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard',         path: '/superadmin',                    icon: LayoutDashboard, module: 'superadmin' },
      ],
    },
    {
      label: 'User Management',
      items: [
        { label: 'Buyer Management',    path: '/superadmin/buyers',           icon: Building2,  module: 'superadmin' },
        { label: 'Seller Management',   path: '/superadmin/sellers',          icon: Store,      module: 'superadmin' },
        { label: 'End User Management', path: '/superadmin/endusers',         icon: Monitor,    module: 'superadmin' },
        { label: 'Custodian Management',path: '/superadmin/custodians',       icon: UserCheck,  module: 'superadmin' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Order Management',    path: '/superadmin/orders',           icon: ShoppingCart, module: 'procurement' },
        { label: 'Asset Management',    path: '/superadmin/assets',           icon: Package,      module: 'assets'      },
        { label: 'Registrations',       path: '/superadmin/registrations',    icon: Users,        module: 'superadmin'  },
      ],
    },
    {
      label: 'Analytics',
      items: [
        { label: 'Reports',             path: '/superadmin/reports',          icon: BarChart3,  module: 'superadmin' },
        { label: 'Audit Logs',          path: '/superadmin/audit',            icon: FileText,   module: 'superadmin' },
      ],
    },
    {
      label: 'System',
      items: [
        { label: 'System Settings',     path: '/superadmin/settings',         icon: Settings,   module: 'system'  },
        { label: 'API Status',          path: '/api-status',                  icon: Activity,   module: 'system'  },
        { label: 'Security',            path: '/security',                    icon: Shield,     module: 'system'  },
      ],
    },
  ],

  'Buyer': [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard',         path: '/buyer',                         icon: LayoutDashboard, module: 'dashboard'  },
      ],
    },
    {
      label: 'Procurement',
      items: [
        { label: 'Order Management',  path: '/buyer/orders',                  icon: ShoppingCart,    module: 'procurement' },
        { label: 'Asset Tracking',    path: '/buyer/assets',                  icon: Package,         module: 'assets'     },
      ],
    },
    {
      label: 'Management',
      items: [
        { label: 'Custodians',        path: '/buyer/custodians',              icon: Users,           module: 'dashboard'  },
        { label: 'Escalations',       path: '/buyer/escalations',             icon: AlertCircle,     module: 'procurement'},
      ],
    },
    {
      label: 'Analytics',
      items: [
        { label: 'Reports',           path: '/buyer/reports',                 icon: BarChart3,       module: 'reports'    },
      ],
    },
  ],

  'Seller': [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard',         path: '/seller',                        icon: LayoutDashboard, module: 'dashboard' },
      ],
    },
    {
      label: 'Orders',
      items: [
        { label: 'My Orders',         path: '/seller/orders',                 icon: ShoppingCart,    module: 'sales'     },
        { label: 'Delivery Mgmt',     path: '/seller/delivery',               icon: Package,         module: 'sales'     },
      ],
    },
    {
      label: 'Analytics',
      items: [
        { label: 'Reports',           path: '/seller/reports',                icon: BarChart3,       module: 'reports'   },
      ],
    },
  ],

  'Custodian': [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard',         path: '/custodian',                     icon: LayoutDashboard, module: 'dashboard' },
      ],
    },
    {
      label: 'My Work',
      items: [
        { label: 'My Deliveries',     path: '/custodian/deliveries',          icon: Package,         module: 'deliveries' },
        { label: 'Asset Status',      path: '/custodian/assets',              icon: ClipboardList,   module: 'deliveries' },
      ],
    },
  ],

  'End User': [
    {
      label: 'My Devices',
      items: [
        { label: 'Dashboard',         path: '/enduser',                       icon: LayoutDashboard, module: 'devices' },
        { label: 'My Devices',        path: '/enduser/devices',               icon: Laptop,          module: 'devices' },
      ],
    },
  ],
};

// ─── NavItem component ────────────────────────────────────────────────────────
const NavItemLink: React.FC<{
  item:       NavItem;
  collapsed:  boolean;
  onClick?:   () => void;
}> = ({ item, collapsed, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === item.path ||
    (item.path !== '/superadmin' && item.path !== '/buyer' && item.path !== '/seller' &&
     item.path !== '/custodian' && item.path !== '/enduser' &&
     location.pathname.startsWith(item.path));

  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={[
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'text-primary-500 hover:text-primary-400'
          : 'text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white',
        collapsed ? 'justify-center px-2' : '',
      ].join(' ')}
    >
      <Icon className="w-4.5 h-4.5 shrink-0 w-[18px] h-[18px]" aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto text-xs font-bold bg-danger-600 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  );
};

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
interface SidebarProps {
  mobileOpen:    boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const { user, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const groups = NAV_CONFIG[user.role] ?? [];

  // Filter by permissions
  const filteredGroups = groups.map(g => ({
    ...g,
    items: g.items.filter(item => hasPermission(item.module, 'view')),
  })).filter(g => g.items.length > 0);

  const logoHomePath =
    user.role === 'Buyer'       ? '/buyer'      :
    user.role === 'Seller'      ? '/seller'     :
    user.role === 'End User'    ? '/enduser'    :
    user.role === 'Custodian'   ? '/custodian'  :
    user.role === 'Super Admin' ? '/superadmin' : '/';

  const sidebarContent = (
    <div className={`flex flex-col h-full bg-sidebar-bg transition-all duration-300 ${collapsed ? 'w-16' : 'w-sidebar'}`}>
      {/* Background logo - full section */}
      <div className="absolute inset-0 opacity-20 dark:opacity-25 pointer-events-none overflow-hidden">
        <img src="/images/govrakshak.png" alt="" className="w-full h-full object-contain" />
      </div>

      {/* Content wrapper - relative positioning */}
      <div className="relative z-10 flex flex-col h-full">
      {/* Logo area with collapse button */}
      <div
        className={[
          'flex shrink-0',
          collapsed
            ? 'flex-col items-center justify-center gap-1 py-2 px-1'
            : 'items-center justify-between h-topbar px-3 gap-2',
        ].join(' ')}
      >
        <Link
          to={logoHomePath}
          title="GovRaksha"
          className={`flex items-center shrink-0 rounded-lg bg-white shadow-sm ${collapsed ? 'p-1' : 'px-2 py-1.5'}`}
        >
          <img
            src="/images/govrakshak.png"
            alt="GovRaksha"
            className={collapsed ? 'h-7 w-7 object-contain' : 'h-9 w-auto max-w-[130px] object-contain'}
          />
        </Link>
        <button
          onClick={() => setCollapsed(v => !v)}
          className="p-1.5 text-sidebar-text hover:text-white hover:bg-sidebar-bg-hover rounded-lg transition-colors hidden md:flex shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft  className="w-4 h-4" />
          }
        </button>
        {/* Mobile close */}
        <button onClick={onMobileClose} className="p-1.5 text-sidebar-text hover:text-white hover:bg-sidebar-bg-hover rounded-lg transition-colors md:hidden">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5" aria-label="Main navigation">
        {filteredGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-bold text-sidebar-text uppercase tracking-widest opacity-60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItemLink
                  key={item.path}
                  item={item}
                  collapsed={collapsed}
                  onClick={onMobileClose}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Role badge at bottom */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-text opacity-60 truncate">{user.role}</p>
          <p className="text-xs text-white font-medium truncate">{user.name}</p>
        </div>
      )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col shadow-sidebar h-full sticky top-0 overflow-hidden" aria-label="Sidebar">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar (drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} aria-hidden="true" />
          <aside className="relative z-10 animate-slide-in-left" aria-label="Sidebar">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
