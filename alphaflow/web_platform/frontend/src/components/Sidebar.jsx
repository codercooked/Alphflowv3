import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Landmark,
  Award,
  Settings,
  CandlestickChart,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Stocks', path: '/stocks', icon: BarChart3 },
  { label: 'IPOs', path: '/ipos', icon: Landmark },
  { label: 'Track Record', path: '/track-record', icon: Award },
  { label: 'Options', path: '/options', icon: CandlestickChart },
];

export default function Sidebar({ activePage }) {
  const location = useLocation();

  const isActive = (path) => {
    if (activePage) return activePage === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[var(--border-light)] bg-[var(--bg-primary)]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-brand)] text-sm font-bold text-white">
          α
        </div>
        <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
          AlphaFlow
        </span>
      </div>

      {/* Navigation */}
      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                transition-colors duration-150
                ${
                  active
                    ? 'bg-[var(--accent-brand-light)] text-[var(--accent-brand)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                }
              `}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[var(--border-light)] px-3 py-3">
        <Link
          to="/settings"
          className={`
            flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
            transition-colors duration-150
            ${
              isActive('/settings')
                ? 'bg-[var(--accent-brand-light)] text-[var(--accent-brand)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            }
          `}
        >
          <Settings size={18} strokeWidth={1.8} />
          Settings
        </Link>
        <p className="mt-3 px-3 text-[10px] text-[var(--text-muted)]">
          AlphaFlow v1.0.0
        </p>
      </div>
    </aside>
  );
}
