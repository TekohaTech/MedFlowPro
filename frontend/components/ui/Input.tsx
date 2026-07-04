import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ className, label, error, id, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all",
          error && "border-red-400 focus:ring-red-500/30 focus:border-red-500",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 px-1">{error}</p>}
    </div>
  );
}
