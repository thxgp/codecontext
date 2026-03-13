import { Link, useLocation } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../../stores';
import { LayoutDashboard, LogOut, Moon, Sun } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();

  return (
    <header className="h-16 shrink-0 glass px-3 sm:px-6 flex items-center justify-between z-50">
      <div className="flex items-center gap-4 sm:gap-8">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <span className="text-xl font-bold gradient-text">CodeContext</span>
        </Link>
        
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            to="/dashboard"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              location.pathname === '/dashboard'
                ? 'dark:bg-neon-cyan/10 bg-light-400/20 dark:text-neon-cyan text-light-400 shadow-sm'
                : 'dark:text-dark-400 text-light-600 dark:hover:text-neon-cyan hover:text-light-400 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg dark:bg-dark-700/50 bg-light-200 dark:hover:bg-neon-cyan/10 hover:bg-light-300 dark:text-neon-cyan text-light-400 transition-all"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4.5 h-4.5" />
          ) : (
            <Moon className="w-4.5 h-4.5" />
          )}
        </button>

        {user && (
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 rounded-lg dark:bg-dark-700/50 bg-light-200">
            <img
              src={user.avatar}
              alt={user.username}
              className="w-7 h-7 rounded-full ring-2 dark:ring-neon-cyan/30 ring-light-400/50"
            />
            <span className="hidden sm:inline text-sm font-medium dark:text-dark-200 text-light-700">{user.username}</span>
          </div>
        )}
        <button
          onClick={logout}
          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center dark:text-dark-500 text-light-500 hover:text-red-400 dark:hover:bg-red-500/10 hover:bg-red-100 rounded-lg transition-all"
          title="Logout"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
}
