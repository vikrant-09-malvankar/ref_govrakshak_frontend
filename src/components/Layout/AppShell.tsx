/**
 * AppShell — the authenticated application wrapper.
 * Replaces the inline layout in App.tsx:
 *   <div className="min-h-screen bg-gray-50">
 *     <Navbar />
 *     <main className="container mx-auto px-4 py-8"> ... </main>
 *   </div>
 *
 * New structure:
 *   <div class="flex h-screen overflow-hidden">
 *     <Sidebar />
 *     <div class="flex flex-col flex-1 overflow-hidden">
 *       <TopBar />
 *       <main class="flex-1 overflow-y-auto"> ... </main>
 *     </div>
 *   </div>
 */
import React, { useState } from 'react';
import { Sidebar }  from './Sidebar';
import TopBar       from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted dark:bg-slate-950">
      {/* Skip to content link — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-btn focus:shadow-modal"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Right panel */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar onMobileMenuToggle={() => setMobileMenuOpen(v => !v)} />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-surface-muted dark:bg-slate-950"
          tabIndex={-1}
        >
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
