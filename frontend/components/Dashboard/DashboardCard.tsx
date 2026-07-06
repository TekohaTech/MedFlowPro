import { cn } from '../../lib/utils';

const baseClasses =
  "bg-gradient-to-br from-white via-white to-sky-50/60 dark:bg-slate-800 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 p-6 lg:p-8 rounded-2xl lg:rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group";

export function DashboardCard({
  className,
  children,
  decoration,
}: {
  className?: string;
  children: React.ReactNode;
  decoration?: React.ReactNode;
}) {
  return (
    <div className={cn(baseClasses, "flex flex-col", className)}>
      {decoration && (
        <div className="absolute top-0 right-0 transition-transform group-hover:scale-110">
          {decoration}
        </div>
      )}
      <div className="relative z-10 flex flex-col flex-1 h-full">{children}</div>
    </div>
  );
}
