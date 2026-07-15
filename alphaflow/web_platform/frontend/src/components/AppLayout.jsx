import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import SearchModal from './SearchModal';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/stocks': 'Stocks',
  '/ipos': 'IPOs',
  '/track-record': 'Track Record',
  '/options': 'Options',
  '/settings': 'Settings',
};

export default function AppLayout({ children }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Derive page title from current route
  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    location.pathname
      .split('/')
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' / ') ||
    'Dashboard';

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigate = useNavigate();

  const handleSearchSelect = useCallback((symbol) => {
    navigate(`/stocks/${symbol}`);
    setSearchOpen(false);
  }, [navigate]);

  return (
    <div className="flex h-screen bg-transparent">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full w-60">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-light)] bg-[var(--bg-primary)]/80 backdrop-blur-md px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] lg:hidden"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <h1 className="text-base font-semibold text-[var(--text-primary)]">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              <Search size={14} />
              <span className="hidden sm:inline">Search stocks...</span>
              <kbd className="hidden rounded border border-[var(--border-light)] bg-[var(--bg-primary)] px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
                ⌘K
              </kbd>
            </button>

            {/* Notification bell */}
            <button className="relative rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]">
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ef4444]" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Search Modal */}
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleSearchSelect}
      />
    </div>
  );
}
