import { Shield, Settings, LayoutGrid, Calendar, BarChart3, LogOut, Sparkles, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNotifications } from '../hooks/useNotifications';

interface NavButtonProps {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: number;
}

const NavButton = ({ active, label, icon, onClick, badge }: NavButtonProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold",
      active
        ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20 translate-x-1"
        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800",
    )}
  >
    {icon}
    <span className="tracking-tight flex-1 text-left">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
        {badge}
      </span>
    )}
  </button>
);

interface SidebarProps {
  activeView: string;
  isAdmin: boolean;
  insight: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  labels: {
    inicio: string;
    guardias: string;
    ajustes: string;
  };
}

export function Sidebar({ activeView, isAdmin, insight, onNavigate, onLogout, labels }: SidebarProps) {
  const { unreadCount } = useNotifications();

  return (
    <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col p-6 sticky top-0 h-screen transition-colors duration-300 dark:bg-slate-900 dark:border-slate-800 print:hidden">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-black text-xl tracking-tighter block leading-none">
            MedFlow
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">
            Pro Edition
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-3">
        {isAdmin ? (
          <>
            <NavButton
              active={activeView === "admin"}
              onClick={() => onNavigate("admin")}
              label="Admin"
              icon={<Shield className="w-5 h-5" />}
            />
            <NavButton
              active={activeView === "perfil"}
              onClick={() => onNavigate("perfil")}
              label={labels.ajustes}
              icon={<Settings className="w-5 h-5" />}
              badge={unreadCount}
            />
          </>
        ) : (
          <>
            <NavButton
              active={activeView === "inicio"}
              onClick={() => onNavigate("inicio")}
              label={labels.inicio}
              icon={<LayoutGrid className="w-5 h-5" />}
            />
            <NavButton
              active={activeView === "reportes"}
              onClick={() => onNavigate("reportes")}
              label={labels.guardias || "Guardias"}
              icon={<Calendar className="w-5 h-5" />}
            />
            <NavButton
              active={activeView === "stats"}
              onClick={() => onNavigate("stats")}
              label="Estadísticas"
              icon={<BarChart3 className="w-5 h-5" />}
            />
            <NavButton
              active={activeView === "perfil"}
              onClick={() => onNavigate("perfil")}
              label={labels.ajustes}
              icon={<Settings className="w-5 h-5" />}
              badge={unreadCount}
            />
          </>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-slate-400 hover:text-red-500 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          <span className="tracking-tight">Salir</span>
        </button>
      </nav>

      <div className="mt-auto p-5 bg-slate-50 border border-slate-100 rounded-2xl dark:bg-slate-800/50 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
            Smart Insight
          </p>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed font-medium dark:text-slate-400">
          "{insight}"
        </p>
      </div>
    </aside>
  );
}
