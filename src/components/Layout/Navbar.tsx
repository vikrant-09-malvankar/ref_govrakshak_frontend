import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  Settings, 
  LogOut,
  User,
  Users,
  ShoppingCart,
  Building2,
  AlertCircle,
  Laptop,
  Store,
  Monitor,
  Activity,
  ClipboardList
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

const Navbar: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const logoHomePath =
    user?.role === 'Buyer'
      ? '/buyer'
      : user?.role === 'Seller'
        ? '/seller'
        : user?.role === 'End User'
          ? '/enduser'
          : user?.role === 'Custodian'
            ? '/custodian'
            : '/';

  const menuItems = user?.role === 'Buyer' ? [
    {
      path: '/buyer',
      icon: LayoutDashboard,
      label: 'Overview',
      module: 'dashboard'
    },
    {
      path: '/buyer/orders',
      icon: ShoppingCart,
      label: 'Order Management',
      module: 'procurement'
    },
    {
      path: '/buyer/assets',
      icon: Package,
      label: 'Asset Tracking',
      module: 'assets'
    },
    {
      path: '/buyer/reports',
      icon: BarChart3,
      label: 'Reports',
      module: 'reports'
    },
    {
      path: '/buyer/custodians',
      icon: Users,
      label: 'Custodians',
      module: 'dashboard'
    },
    {
      path: '/buyer/escalation',
      icon: AlertCircle,
      label: 'Escalation',
      module: 'procurement'
    }
  ] : user?.role === 'Seller' ? [
    {
      path: '/seller',
      icon: LayoutDashboard,
      label: 'Dashboard',
      module: 'dashboard'
    },
    {
      path: '/seller/orders',
      icon: ShoppingCart,
      label: 'Add Order',
      module: 'sales'
    },
    {
      path: '/seller/delivery',
      icon: Package,
      label: 'Delivery Management',
      module: 'sales'
    },
    {
      path: '/seller/reports',
      icon: BarChart3,
      label: 'Reports',
      module: 'reports'
    },
  ] : user?.role === 'End User' ? [
    {
      path: '/enduser',
      icon: LayoutDashboard,
      label: 'Dashboard',
      module: 'devices'
    },
    {
      path: '/enduser/devices',
      icon: Laptop,
      label: 'My Devices',
      module: 'devices'
    }
  ] : user?.role === 'Custodian' ? [
    {
      path: '/custodian',
      icon: LayoutDashboard,
      label: 'Dashboard',
      module: 'dashboard'
    },
    {
      path: '/custodian/deliveries',
      icon: Package,
      label: 'My Deliveries',
      module: 'deliveries'
    },
    {
      path: '/custodian/assets',
      icon: ClipboardList,
      label: 'Asset status',
      module: 'deliveries'
    }
  ] : user?.role === 'Super Admin' ? [
    // Dashboard
    {
      path: '/superadmin',
      icon: User,
      label: 'Dashboard',
      module: 'superadmin'
    },
    // Order Management
    {
      path: '/superadmin/order-management',
      icon: ShoppingCart,
      label: 'Order Management',
      module: 'procurement'
    },
    // User Management
    {
      path: '/superadmin/buyer-management',
      icon: Users,
      label: 'Buyer Management',
      module: 'superadmin'
    },
    {
      path: '/superadmin/seller-management',
      icon: Store,
      label: 'Seller Management',
      module: 'superadmin'
    },
    {
      path: '/superadmin/enduser-management',
      icon: Monitor,
      label: 'End User Management',
      module: 'superadmin'
    },
    // Operations
    {
      path: '/superadmin/assets',
      icon: Package,
      label: 'Asset Management',
      module: 'assets'
    },
    // Analytics
    {
      path: '/superadmin/reports',
      icon: BarChart3,
      label: 'Reports',
      module: 'superadmin'
    },
    
  ] : [
    // Default navigation for other roles
    {
      path: '/',
      icon: LayoutDashboard,
      label: t('navigation.dashboard'),
      module: 'dashboard'
    },
    {
      path: '/assets',
      icon: Package,
      label: t('navigation.assets'),
      module: 'assets'
    },

    {
      path: '/procurement',
      icon: ShoppingCart,
      label: t('navigation.procurement'),
      module: 'procurement'
    },
    {
      path: '/buyer',
      icon: Building2,
      label: 'Central Procurement',
      module: 'procurement'
    },
    {
      path: '/reports',
      icon: BarChart3,
      label: t('navigation.reports'),
      module: 'reports'
    },
    {
      path: '/settings',
      icon: Settings,
      label: t('navigation.settings'),
      module: 'settings'
    }
  ];

  // Filter menu items based on user permissions
  const filteredMenuItems = menuItems.filter(item => {
    const hasAccess = hasPermission(item.module, 'view');
    return hasAccess;
  });

  return (
    <nav className="bg-[#fbfaf6] shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className={`${user?.role === 'Super Admin' || user?.role === 'Buyer' || user?.role === 'Seller' || user?.role === 'End User' || user?.role === 'Custodian' ? 'w-full px-4 sm:px-6 lg:px-8' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
        <div className="flex justify-between h-24 items-center flex-nowrap overflow-visible">
          <div className="flex items-center flex-shrink-0">
            <Link to={logoHomePath} className="flex items-center transition-colors duration-200 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-2 py-0.5">
              <img 
                src="/images/govrakshak.png" 
                alt="GovRakshak" 
                className="h-12 w-auto max-w-[min(100%,18rem)] sm:h-14 sm:max-w-[min(100%,24rem)] md:h-16 md:max-w-[min(100%,30rem)] lg:h-[4.75rem] lg:max-w-[min(100%,38rem)]"
              />
            </Link>
          </div>
          {/* Desktop Menu */}
          <div className="hidden md:flex md:flex-1 md:justify-center space-x-1">
            <div className="flex items-center justify-center space-x-1 md:space-x-4 lg:space-x-6 xl:space-x-8">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = (user?.role === 'Buyer' && item.path.startsWith('/buyer')) || 
                  (user?.role === 'Seller' && item.path.startsWith('/seller')) ||
                  (user?.role === 'End User' && item.path.startsWith('/enduser')) ||
                  (user?.role === 'Custodian' && item.path.startsWith('/custodian')) ||
                  (user?.role === 'Super Admin' && item.path.startsWith('/superadmin'))
                  ? location.pathname === item.path.split('?')[0] && location.search === item.path.split('?')[1]
                  : location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-blue-700'
                    }`}
                    tabIndex={0}
                  >
                    <Icon className="w-4 h-4 mr-2 align-middle" />
                    <span className="align-middle">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          {/* Mobile Hamburger */}
          <div className="md:hidden flex items-center">
            <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`inline-flex items-center justify-center p-2 rounded-md transition-colors duration-200 text-gray-400 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${mobileMenuOpen ? 'bg-blue-100' : ''}`}
                aria-label="Open main menu"
              >
                <svg className="h-6 w-6 transition-transform duration-200" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

          <div className="flex items-center relative flex-nowrap min-w-0 overflow-visible">
            {/* Language Switcher */}
            <div className="z-40 flex-shrink-0 pl-0 md:pl-4 md:border-l md:border-gray-200"><LanguageSwitcher /></div>
            {/* User Menu Dropdown */}
            <div className="relative z-50 flex-shrink-0 min-w-0 ml-4 md:ml-8">
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0 group"
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
              >
                {user?.avatar ? (
                  <img className="h-8 w-8 rounded-full border-2 border-blue-200 group-hover:border-blue-400 transition-all duration-200" src={user.avatar} alt={user.name} />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center border-2 border-blue-200 group-hover:border-blue-400 transition-all duration-200">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className="hidden md:block text-left min-w-0 max-w-[120px] truncate">
                  <div className="text-sm font-semibold text-gray-700 truncate">{user?.name}</div>
                  <div className="text-xs text-gray-500 truncate">{user?.role}</div>
                </div>
                <svg className={`w-4 h-4 ml-1 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-2xl py-1 z-50 animate-fade-in">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b font-medium">{user?.email}</div>
                  {user?.role === 'Seller' && (
                    <Link
                      to="/seller/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors duration-150"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                  )}
                  {user?.role === 'Buyer' && (
                    <Link
                      to="/buyer/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors duration-150"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                  )}
                  {user?.role === 'Super Admin' && (
                    <>
                      <Link
                        to="/superadmin/system"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors duration-150"
                      >
                        <Settings className="w-4 h-4" />
                        System Settings
                      </Link>
                      <Link
                        to="/api-status"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors duration-150 border-b border-gray-100"
                      >
                        <Activity className="w-4 h-4" />
                        API Status
                      </Link>
                    </>
                  )}
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors duration-150 rounded-b-xl"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('auth.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-20 z-40 animate-fade-in" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="md:hidden mt-2 pb-2 border-b border-gray-200 z-50 relative animate-slide-down">
              <div className="flex flex-col space-y-3 px-3 py-3">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = (user?.role === 'Buyer' && item.path.startsWith('/buyer')) ||
                    (user?.role === 'Seller' && item.path.startsWith('/seller')) ||
                    (user?.role === 'End User' && item.path.startsWith('/enduser')) ||
                    (user?.role === 'Custodian' && item.path.startsWith('/custodian')) ||
                    (user?.role === 'Super Admin' && item.path.startsWith('/superadmin'))
                    ? location.pathname === item.path.split('?')[0] && location.search === item.path.split('?')[1]
                    : location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 shadow-sm'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-blue-700'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="w-5 h-5 mr-3 align-middle" />
                      <span className="align-middle">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
        {/* Mobile Language Switcher below menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 pb-2 border-b border-gray-200 z-50 relative animate-slide-down">
            <div className="mt-2 border-t pt-2"><LanguageSwitcher /></div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;