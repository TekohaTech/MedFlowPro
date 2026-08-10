import { Plus } from 'lucide-react';

interface EmptyStateProps {
  t: Record<string, string>;
}

export function EmptyState({ t }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700">
      <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-200 dark:text-slate-700 shadow-sm">
        <Plus className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{t.sinRegistros}</p>
        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{t.tocaParaAnadir}</p>
      </div>
    </div>
  );
}
