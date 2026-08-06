import { LayoutGrid, Calendar, BarChart3, Settings, LogOut, Plus, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNotifications } from '../hooks/useNotifications';

interface MobileNavProps {
  activeView: string;
  isAdmin: boolean;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  labels: {
    inicio: string;
    turnos: string;
    estadisticas: string;
    ajustes: string;
  };
}

export function MobileNav({ activeView, isAdmin, onNavigate, onLogout, labels }: MobileNavProps) {
  const { unreadCount } = useNotifications();

  const tabs = isAdmin
    ? [
        { view: "admin", label: "Admin", icon: <Shield className="w-[18px] h-[18px]" /> },
        { view: "perfil", label: labels.ajustes, icon: <Settings className="w-[18px] h-[18px]" />, badge: unreadCount },
      ]
    : [
        { view: "inicio", label: labels.inicio, icon: <LayoutGrid className="w-[18px] h-[18px]" /> },
        { view: "reportes", label: labels.turnos, icon: <Calendar className="w-[18px] h-[18px]" /> },
        { view: "stats", label: labels.estadisticas, icon: <BarChart3 className="w-[18px] h-[18px]" /> },
        { view: "perfil", label: labels.ajustes, icon: <Settings className="w-[18px] h-[18px]" />, badge: unreadCount },
      ];

  return (
    <nav className="lg:hidden fixed bottom-6 left-6 right-6 z-50 print:hidden">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-2 border-slate-300/60 dark:border-slate-600/50 rounded-[2rem] h-14 flex items-center justify-around shadow-2xl shadow-slate-300/40 dark:shadow-black/40">
        {tabs.map(({ view, label, icon, badge }) => (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 relative",
              activeView === view
                ? "text-blue-600 dark:text-blue-400 scale-105"
                : "text-slate-500 dark:text-slate-400",
            )}
          >
            {icon}
            <span className="text-[8px] font-black uppercase tracking-[0.1em]">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-blue-600 text-white text-[7px] font-bold px-1 py-0.5 rounded-full min-w-[12px] text-center leading-none">
                {badge}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-1 px-2 py-1 text-[8px] font-bold text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Salir</span>
        </button>
      </div>
    </nav>
  );
}

interface MobileFabProps {
  visible: boolean;
  onClick: () => void;
}

export function MobileFab({ visible, onClick }: MobileFabProps) {
  if (!visible) return null;
  return (
    <div className="lg:hidden fixed bottom-28 right-6 z-40 print:hidden">
      <button
        onClick={onClick}
        className="w-16 h-16 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl"
      >
        <Plus className="w-8 h-8 contrast-150" />
      </button>
    </div>
  );
}
