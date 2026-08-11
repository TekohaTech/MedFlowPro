import { Bell, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { avatarUrl } from '../../lib/avatars';
import type { Language } from '../../translations';
import type { UserProfile } from '../../types';
import { NotificationsDropdown } from './NotificationsDropdown';

interface DashboardHeaderProps {
  userProfile: UserProfile;
  darkMode: boolean;
  greeting: string;
  unreadCount: number;
  language: Language;
  showNotifDropdown: boolean;
  onOpenSearch: () => void;
  onToggleNotifications: () => void;
  onCloseNotifications: () => void;
}

export function DashboardHeader({
  userProfile,
  darkMode,
  greeting,
  unreadCount,
  language,
  showNotifDropdown,
  onOpenSearch,
  onToggleNotifications,
  onCloseNotifications,
}: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative group">
          <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
          <img src={avatarUrl(userProfile.avatar)}
            className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl border-2 border-white dark:border-slate-700 shadow-xl relative z-10 bg-slate-50 dark:bg-slate-800 object-cover" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white dark:border-slate-900 rounded-full z-20" />
        </div>
        <div>
          <h1 className={cn("text-xl lg:text-2xl font-black leading-tight tracking-tight", darkMode ? "text-white" : "text-slate-900")}>
            {greeting}
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{userProfile.specialty}</p>
        </div>
      </div>
      <div className="flex gap-2 lg:gap-3">
        <button onClick={onOpenSearch}
          className="w-11 h-11 lg:w-12 lg:h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 dark:hover:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all shadow-sm group">
          <Search className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
        <div className="relative">
          <button onClick={onToggleNotifications}
            className="w-11 h-11 lg:w-12 lg:h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 dark:hover:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all shadow-sm relative group">
            <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 lg:-top-2 lg:-right-2 min-w-[20px] h-5 rounded-full bg-red-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-white px-1 leading-none shadow-lg">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifDropdown && (
            <NotificationsDropdown
              language={language}
              onClose={onCloseNotifications}
            />
          )}
        </div>
      </div>
    </header>
  );
}
