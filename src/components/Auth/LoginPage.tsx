import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, ChevronDown, Moon, Sun } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { login, loading, loginError, isAuthenticated, user } = useAuth();
  const { t } = useTranslation();

  // Redirect authenticated users to role-specific dashboard
  if (isAuthenticated) {
    let redirectPath = "/";
    
    if (user?.role === 'Seller') {
      redirectPath = "/seller";
    } else if (user?.role === 'Buyer') {
      redirectPath = "/buyer";
    } else if (user?.role === 'Super Admin') {
      redirectPath = "/superadmin";
    } else if (user?.role === 'End User') {
      redirectPath = "/enduser";
    } else if (user?.role === 'Custodian') {
      redirectPath = "/custodian";
    }
    
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(credentials);
    } catch {
      // Handle unexpected errors during login
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  

  // Component rendering
  
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-10 transition-colors dark:bg-slate-950 sm:px-6 lg:px-8">
      <button
        type="button"
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-700 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
        onClick={() => toggleTheme()}
      >
        {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="grid w-full max-w-4xl overflow-visible rounded-2xl border border-gray-200 bg-white shadow-[0_0_24px_rgba(59,130,246,0.18)] transition-colors dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_0_24px_rgba(59,130,246,0.12)] md:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col items-center justify-center border-b border-gray-200 px-6 py-10 text-center dark:border-slate-700 md:border-b-0 md:border-r md:px-10">
          <img
            src="/images/govrakshak.png"
            alt="GovRakshak"
            className="h-auto w-full max-w-[15rem] object-contain"
          />
          <p className="mt-6 max-w-xs text-sm leading-6 text-gray-500 dark:text-slate-400">
            Secure procurement and asset management for your organization.
          </p>
        </div>

        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t('auth.login')}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Sign in to continue to your GovRakshak account
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="email"
                type="email"
                required
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-3 pl-10 text-sm text-gray-900 placeholder-gray-500 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 dark:focus:bg-slate-700"
                placeholder={t('auth.enterEmail')}
                value={credentials.email}
                onChange={handleChange}
                onFocus={() => setIsAccountMenuOpen(false)}
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-3 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-500 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 dark:focus:bg-slate-700"
                placeholder={t('auth.enterPassword')}
                value={credentials.password}
                onChange={handleChange}
                onFocus={() => setIsAccountMenuOpen(false)}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 z-20 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {loginError && (
            <div className="rounded-md bg-red-50 p-4 dark:bg-red-950/40">
              <div className="text-sm text-red-700 dark:text-red-300">
                <strong>Error:</strong> {loginError}
              </div>
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('auth.login')}
            </button>
          </div>
          </form>

          <div className="mt-7 border-t border-gray-100 pt-6 dark:border-slate-700">
          <label htmlFor="account-type" className="block text-sm text-gray-600 dark:text-slate-400">
            New to GovRakshak? <span className="font-medium text-gray-900 dark:text-white">Sign up as</span>
          </label>
          <div className="relative mt-3">
            <button
              id="account-type"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isAccountMenuOpen}
              className="flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50/40 px-4 py-3 text-left text-sm font-semibold text-gray-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
              onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
            >
              <span>Select account type</span>
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 text-blue-600 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isAccountMenuOpen && (
              <div
                role="listbox"
                aria-labelledby="account-type"
                className="absolute bottom-full z-10 mb-2 w-full overflow-hidden rounded-lg border border-blue-100 bg-white p-1.5 shadow-lg shadow-blue-100/70 dark:border-slate-600 dark:bg-slate-800 dark:shadow-black/30"
              >
                <button
                  type="button"
                  role="option"
                  className="block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-blue-300"
                  onClick={() => navigate('/register')}
                >
                  Buyer
                </button>
                <button
                  type="button"
                  role="option"
                  className="block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-blue-300"
                  onClick={() => navigate('/seller-register')}
                >
                  Seller
                </button>
                <button
                  type="button"
                  role="option"
                  className="block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-blue-300"
                  onClick={() => navigate('/enduser-register')}
                >
                  End User Device Registration
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
