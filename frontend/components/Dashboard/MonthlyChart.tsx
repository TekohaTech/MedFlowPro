import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { cn } from '../../lib/utils';
import { smoothPath, formatY } from '../../lib/chartUtils';

interface MonthlyChartProps {
  monthlyData: { label: string; value: number }[];
  year: number;
  currentMonth: number;
  maxVal: number;
  onYearChange: (year: number) => void;
}

export function MonthlyChart({
  monthlyData,
  year,
  currentMonth,
  maxVal,
  onYearChange,
}: MonthlyChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; label: string; value: string } | null>(null);

  const isCurrentYear = year === new Date().getFullYear();

  // chart layout
  const pad = { top: 16, right: 8, bottom: 32, left: 40 };
  const w = 600;
  const h = 220;
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  // grid lines (3 horizontal)
  const gridVals = [0, maxVal / 2, maxVal].map(v => Math.round(v / 1000) * 1000 || 1000);

  // map data → SVG coords
  const points = monthlyData.map((d, i) => ({
    x: pad.left + (i / Math.max(monthlyData.length - 1, 1)) * chartW,
    y: pad.top + chartH - (maxVal > 0 ? (d.value / maxVal) * chartH : 0),
    value: d.value,
    label: d.label,
    isCurrent: i === currentMonth && isCurrentYear,
  }));

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L${points[points.length - 1].x},${pad.top + chartH} L${points[0].x},${pad.top + chartH} Z`;

  return (
    <DashboardCard>
      {/* ── header ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg lg:text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Rendimiento
          </h2>
              <p className="text-[9px] lg:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Año {year}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onYearChange(year - 1)}
            className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="text-sm font-black text-slate-900 dark:text-white min-w-[44px] text-center">
            {year}
          </span>
          <button
            onClick={() => onYearChange(year + 1)}
            disabled={year >= new Date().getFullYear()}
            className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* ── chart ── */}
      <div className="relative select-none">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto overflow-visible"
          style={{ maxHeight: 180 }}
        >
          <defs>
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* grid lines */}
          {gridVals.map((val, i) => {
            const y = pad.top + chartH - (val / maxVal) * chartH;
            return (
              <g key={i}>
                <line
                  x1={pad.left}
                  x2={w - pad.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-300 dark:text-slate-600"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={pad.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 dark:fill-slate-400"
                  fontSize="10"
                >
                  {formatY(val)}
                </text>
              </g>
            );
          })}

          {/* area fill */}
          {monthlyData.some(d => d.value > 0) && (
            <path
              d={areaPath}
              fill="url(#area-grad)"
            />
          )}

          {/* line */}
          {monthlyData.some(d => d.value > 0) && (
            <path
              d={linePath}
              fill="none"
              className="text-blue-600"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* dots + hit zones */}
          {points.map((p, i) => (
            <g key={i}>
              {/* invisible wider hit zone for hover */}
              <rect
                x={p.x - 22}
                y={pad.top}
                width={44}
                height={chartH}
                fill="transparent"
                onMouseEnter={() =>
                  setTooltip({ x: p.x, label: p.label, value: `$${p.value.toLocaleString('es-AR')}` })
                }
                onMouseLeave={() => setTooltip(null)}
                className="cursor-pointer"
              />
              {p.value > 0 && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.isCurrent ? 5 : 3.5}
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth={p.isCurrent ? 3 : 2}
                  className={cn(
                    'transition-all duration-200',
                    p.isCurrent ? 'text-blue-600' : 'text-blue-400',
                  )}
                />
              )}
            </g>
          ))}
        </svg>

        {/* tooltip */}
        {tooltip && (
          <div
            className="absolute -translate-x-1/2 pointer-events-none z-20 transition-all duration-150"
            style={{
              left: `${(tooltip.x / w) * 100}%`,
              top: '-8px',
            }}
          >
            <div className="bg-slate-900 dark:bg-slate-700 text-white text-[10px] lg:text-xs font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
              {tooltip.label}: {tooltip.value}
            </div>
          </div>
        )}

        {/* month labels */}
        <div className="flex justify-between px-0 mt-1" style={{ paddingLeft: `${(pad.left / w) * 100}%`, paddingRight: `${(pad.right / w) * 100}%` }}>
          {monthlyData.map((d, i) => (
            <span
              key={i}
              className={cn(
                'text-[8px] lg:text-[10px] font-bold uppercase tracking-widest text-center',
                  i === currentMonth && isCurrentYear
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 dark:text-slate-400',
              )}
            >
              <span className="lg:hidden">{d.label.charAt(0)}</span>
              <span className="hidden lg:inline">{d.label}</span>
            </span>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
