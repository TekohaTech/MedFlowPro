export interface TooltipState {
  x: number;
  label: string;
  value: string;
}

interface ChartTooltipProps {
  tooltip: TooltipState | null;
  viewBoxWidth: number;
}

export function ChartTooltip({ tooltip, viewBoxWidth }: ChartTooltipProps) {
  if (!tooltip) return null;
  return (
    <div
      className="absolute -translate-x-1/2 pointer-events-none z-20 transition-all duration-150"
      style={{
        left: `${(tooltip.x / viewBoxWidth) * 100}%`,
        top: '-8px',
      }}
    >
      <div className="bg-slate-900 dark:bg-slate-700 text-white text-[10px] lg:text-xs font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
        {tooltip.label}: {tooltip.value}
      </div>
    </div>
  );
}
