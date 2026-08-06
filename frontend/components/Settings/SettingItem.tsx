import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SettingItemProps {
  icon: ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

export function SettingItem({ icon, label, value, onClick, href, disabled = false }: SettingItemProps) {
  const classes = cn(
    'w-full flex items-center justify-between p-4 rounded-2xl transition-all',
    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-900 group',
  );

  const content = (
    <>
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">{label}</div>
          {value && (
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">{value}</div>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 ml-2" />
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={classes}>
      {content}
    </button>
  );
}
