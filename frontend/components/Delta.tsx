import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DeltaProps {
  value: number | null;
}

export function Delta({ value }: DeltaProps) {
  if (value === null) return <span className="text-slate-300 dark:text-slate-600 text-[10px]">—</span>;
  if (value > 0) return (
    <span className="text-green-600 dark:text-green-400 text-[10px] font-bold flex items-center gap-1">
      <TrendingUp className="w-3 h-3" />+{value.toFixed(0)}%
    </span>
  );
  if (value < 0) return (
    <span className="text-red-500 dark:text-red-400 text-[10px] font-bold flex items-center gap-1">
      <TrendingDown className="w-3 h-3" />{value.toFixed(0)}%
    </span>
  );
  return (
    <span className="text-slate-400 text-[10px] flex items-center gap-1">
      <Minus className="w-3 h-3" />0%
    </span>
  );
}
