import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import {
  Menu, Search, Bell, User, LogOut, Settings, Activity,
  ChevronDown, X, Package, ClipboardList, BarChart3,
  Shield, MessageSquare, ShoppingCart, ArrowRight, Loader2, Moon, Sun,
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { ApiService } from '../../services/apiService';

// ── Nav item catalogue (role-gated at runtime) ────────────────────────────────
interface NavItem { label: string; path: string; icon: React.ReactNode; roles: string[] }

const ALL_NAV: NavItem[] = [
  { label: 'Assets',              path: '/assets',                       icon: <Package className="w-4 h-4" />,       roles: ['Super Admin','Buyer','Seller'] },
  { label: 'Procurement',         path: '/procurement',                  icon: <ShoppingCart className="w-4 h-4" />,   roles: ['Super Admin','Buyer'] },
  { label: 'Reports',             path: '/reports',                      icon: <BarChart3 className="w-4 h-4" />,      roles: ['Super Admin','Buyer'] },
  { label: 'Security',            path: '/security',                     icon: <Shield className="w-4 h-4" />,         roles: ['Super Admin'] },
  { label: 'Complaints',          path: '/complaints',                   icon: <MessageSquare className="w-4 h-4" />,  roles: ['Super Admin','Buyer','Seller'] },
  { label: 'Buyer Management',    path: '/superadmin/buyer-management',  icon: <User className="w-4 h-4" />,           roles: ['Super Admin'] },
  { label: 'Seller Management',   path: '/superadmin/seller-management', icon: <User className="w-4 h-4" />,           roles: ['Super Admin'] },
  { label: 'End User Management', path: '/superadmin/enduser-management',icon: <User className="w-4 h-4" />,           roles: ['Super Admin'] },
  { label: 'Orders',              path: '/buyer/orders',                 icon: <ClipboardList className="w-4 h-4" />,  roles: ['Buyer'] },
  { label: 'Seller Orders',       path: '/seller/orders',                icon: <ClipboardList className="w-4 h-4" />,  roles: ['Seller'] },
  { label: 'Custodian Assets',    path: '/custodian/assets',             icon: <Package className="w-4 h-4" />,        roles: ['Custodian'] },
];

interface SearchResults {
  assets: Array<{ id: number; name: string; serialNumber?: string; category?: string; status?: string }>;
  navItems: NavItem[];
}

const EMPTY_RESULTS: SearchResults = { assets: [], navItems: [] };

// ── Tiny helpers ─────────────────────────────────────────────────────────────

interface ResultRowProps {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  focused: boolean;
  onClick: () => void;
}

const ResultRow: React.FC<ResultRowProps> = ({ icon, label, sub, focused, onClick }) => (
  <button
    onClick={onClick}
    className={[
      'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors',
      focused ? 'bg-primary-50 dark:bg-slate-700' : 'hover:bg-surface-subtle dark:hover:bg-slate-700',
    ].join(' ')}
  >
    <span className="text-gray-400 dark:text-gray-500 shrink-0">{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{label}</span>
      {sub && <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{sub}</span>}
    </span>
    <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
  </button>
);

// ── Component ─────────────────────────────────────────────────────────────────

interface TopBarProps {
  onMobileMenuToggle: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMobileMenuToggle }) => {
  const { user, logout }  = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { t }             = useTranslation();
  const navigate          = useNavigate();

  const [userMenuOpen,  setUserMenuOpen]  = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isSearching,   setIsSearching]   = useState(false);
  const [focusedIdx,    setFocusedIdx]    = useState(-1);

  const userMenuRef    = useRef<HTMLDivElement>(null);
  const searchRef      = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  // ── Close handlers ─────────────────────────────────────────────────────────

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(EMPTY_RESULTS);
    setFocusedIdx(-1);
    setIsSearching(false);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchRef.current && !searchRef.current.contains(e.target as Node) &&
        searchPanelRef.current && !searchPanelRef.current.contains(e.target as Node)
      ) {
        closeSearch();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeSearch]);

  // Focus search when opened
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Debounced search ───────────────────────────────────────────────────────

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(EMPTY_RESULTS);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const role    = user?.role ?? '';
        const assets  = await ApiService.searchAssets(q) as any[];
        const navHits = ALL_NAV.filter(n =>
          n.roles.includes(role) &&
          n.label.toLowerCase().includes(q.toLowerCase())
        );
        setSearchResults({
          assets:   Array.isArray(assets) ? assets.slice(0, 6) : [],
          navItems: navHits.slice(0, 3),
        });
        setFocusedIdx(-1);
      } catch {
        setSearchResults(EMPTY_RESULTS);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.role]);

  // ── Keyboard navigation ────────────────────────────────────────────────────

  const totalItems = searchResults.assets.length + searchResults.navItems.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Escape':
        closeSearch();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIdx(i => (i + 1) % Math.max(totalItems, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIdx(i => (i - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIdx >= 0 && focusedIdx < searchResults.assets.length) {
          navigate(`/assets/${searchResults.assets[focusedIdx].id}`);
          closeSearch();
        } else {
          const navIdx = focusedIdx - searchResults.assets.length;
          if (navIdx >= 0 && navIdx < searchResults.navItems.length) {
            navigate(searchResults.navItems[navIdx].path);
            closeSearch();
          }
        }
        break;
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const showPanel = searchOpen && searchQuery.trim().length >= 2;
  const hasResults = searchResults.assets.length > 0 || searchResults.navItems.length > 0;

  const logoHomePath =
    user?.role === 'Buyer'      ? '/buyer'      :
    user?.role === 'Seller'     ? '/seller'     :
    user?.role === 'End User'   ? '/enduser'    :
    user?.role === 'Custodian'  ? '/custodian'  :
    user?.role === 'Super Admin'? '/superadmin' : '/';

  const settingsPath =
    user?.role === 'Super Admin' ? '/superadmin/settings' :
    user?.role === 'Buyer'       ? '/buyer/profile'       :
    user?.role === 'Seller'      ? '/seller/profile'      : '/';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <header className="h-topbar bg-surface-base dark:bg-slate-800 border-b border-surface-border dark:border-slate-700 flex items-center justify-between px-4 gap-3 sticky top-0 z-40 shadow-card">

      {/* Left: hamburger (mobile) + logo (mobile only) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-slate-700 md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Mobile logo */}
        <Link to={logoHomePath} className="md:hidden">
          <img src="/images/govrakshak.png" alt="GovRaksha" className="h-8 w-auto" />
        </Link>
      </div>

      {/* Center: global search */}
      <div className="flex-1 max-w-xl mx-auto relative">
        {searchOpen ? (
          <>
            {/* Search input */}
            <div className="relative">
              {isSearching
                ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 animate-spin pointer-events-none" />
                : <Search   className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              }
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search assets, pages… (↑↓ navigate, Enter open, Esc close)"
                className="w-full pl-9 pr-9 py-2 text-sm border border-primary-400 rounded-btn bg-white dark:bg-slate-700 dark:text-white dark:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="off"
              />
              <button
                onClick={closeSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results panel */}
            {showPanel && (
              <div
                ref={searchPanelRef}
                className="absolute top-full mt-1.5 left-0 right-0 bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-700 rounded-card shadow-modal z-50 overflow-hidden animate-slide-down"
                role="listbox"
              >
                {/* Asset results */}
                {searchResults.assets.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-surface-border dark:border-slate-700 bg-surface-subtle dark:bg-slate-700">
                      Assets
                    </p>
                    {searchResults.assets.map((asset, i) => (
                      <ResultRow
                        key={asset.id}
                        icon={<Package className="w-4 h-4" />}
                        label={asset.name}
                        sub={[asset.serialNumber, asset.category, asset.status].filter(Boolean).join(' · ')}
                        focused={focusedIdx === i}
                        onClick={() => { navigate(`/assets/${asset.id}`); closeSearch(); }}
                      />
                    ))}
                  </div>
                )}

                {/* Navigation suggestions */}
                {searchResults.navItems.length > 0 && (
                  <div className={searchResults.assets.length > 0 ? 'border-t border-surface-border dark:border-slate-700' : ''}>
                    <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-surface-border dark:border-slate-700 bg-surface-subtle dark:bg-slate-700">
                      Pages
                    </p>
                    {searchResults.navItems.map((item, i) => (
                      <ResultRow
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        focused={focusedIdx === searchResults.assets.length + i}
                        onClick={() => { navigate(item.path); closeSearch(); }}
                      />
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {!isSearching && !hasResults && (
                  <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                    No results for "<span className="font-medium text-gray-600 dark:text-gray-400">{searchQuery.trim()}</span>"
                  </div>
                )}

                {/* Loading skeleton */}
                {isSearching && (
                  <div className="px-4 py-4 space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded bg-gray-200 dark:bg-slate-600 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-slate-600 animate-pulse" />
                          <div className="h-2.5 w-1/2 rounded bg-gray-100 dark:bg-slate-700 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer hint */}
                {!isSearching && hasResults && (
                  <div className="px-4 py-2 border-t border-surface-border dark:border-slate-700 bg-surface-subtle dark:bg-slate-700 flex items-center gap-4 text-[10px] text-gray-400 dark:text-gray-500">
                    <span><kbd className="font-mono bg-gray-100 dark:bg-slate-600 border border-gray-200 dark:border-slate-600 rounded px-1 dark:text-gray-400">↑↓</kbd> navigate</span>
                    <span><kbd className="font-mono bg-gray-100 dark:bg-slate-600 border border-gray-200 dark:border-slate-600 rounded px-1 dark:text-gray-400">↵</kbd> open</span>
                    <span><kbd className="font-mono bg-gray-100 dark:bg-slate-600 border border-gray-200 dark:border-slate-600 rounded px-1 dark:text-gray-400">Esc</kbd> close</span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-400 dark:text-gray-500 bg-surface-subtle dark:bg-slate-700 border border-surface-border dark:border-slate-700 rounded-btn hover:border-gray-400 dark:hover:border-slate-600 transition-colors"
            aria-label="Open search"
          >
            <Search className="w-4 h-4" />
            <span>Search assets, pages…</span>
            <span className="ml-auto text-xs bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-mono">⌘K</span>
          </button>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Mobile search button */}
        <button
          onClick={() => setSearchOpen(v => !v)}
          className="sm:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Language switcher */}
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>

        {/* User menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
            aria-label="User menu"
          >
            {user?.avatar ? (
              <img className="h-8 w-8 rounded-full object-cover border-2 border-primary-200" src={user.avatar} alt={user.name} />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div className="hidden md:block text-left max-w-[120px]">
              <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user?.role}</p>
            </div>
            <ChevronDown className={`hidden md:block w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-700 rounded-card shadow-modal py-1 z-50 animate-slide-down">
              {/* User info */}
              <div className="px-4 py-3 border-b border-surface-border dark:border-slate-700">
                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mt-0.5">{user?.role}</p>
              </div>

              {/* Notifications and Theme Toggle */}
              <div className="border-b border-surface-border dark:border-slate-700 space-y-1">
                <button
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-surface-muted dark:hover:bg-slate-700 transition-colors w-full text-left"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span>Notifications</span>
                </button>
                <button
                  onClick={() => toggleTheme()}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-surface-muted dark:hover:bg-slate-700 transition-colors w-full text-left"
                  aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" /> : <Moon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />}
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>

              {/* Settings */}
              <Link
                to={settingsPath}
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-surface-muted dark:hover:bg-slate-700 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                {user?.role === 'Super Admin' ? 'System Settings' : 'Profile Settings'}
              </Link>

              {user?.role === 'Super Admin' && (
                <Link
                  to="/api-status"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-surface-muted dark:hover:bg-slate-700 transition-colors"
                >
                  <Activity className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  API Status
                </Link>
              )}

              <div className="border-t border-surface-border dark:border-slate-700 mt-1">
                <button
                  onClick={() => { setUserMenuOpen(false); logout(); }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-slate-700 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  {t('auth.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
