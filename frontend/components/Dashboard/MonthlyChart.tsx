import { useState } from 'react';
import { DashboardCard } from './DashboardCard';
import { cn } from '../../lib/utils';
import { smoothPath, formatY, formatTooltipValue } from '../../lib/chartUtils';
import { translations, Language } from '../../translations';
import { ChartTooltip, type TooltipState } from './ChartTooltip';
import { MonthlyChartHeader } from './MonthlyChartHeader';

interface MonthlyChartProps {
  monthlyData: { label: string; value: number }[];
  year: number;
  currentMonth: number;
  maxVal: number;
  language: Language;
  onYearChange: (year: number) => void;
}

export function MonthlyChart({
  monthlyData,
  year,
  currentMonth,
  maxVal,
  language,
  onYearChange,
}: MonthlyChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const t = translations[language];

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

  const showTooltip = (p: (typeof points)[number]) =>
    setTooltip({ x: p.x, label: p.label, value: formatTooltipValue(p.value) });

  return (
    <DashboardCard>
      <MonthlyChartHeader
        title={t.rendimiento}
        subtitle={t.anio.replace('{year}', String(year))}
        year={year}
        onYearChange={onYearChange}
      />

      {/* ── chart ── */}
      <div className="relative select-none" onPointerDown={() => setTooltip(null)}>
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
              {/* invisible wider hit zone: hover (desktop) + tap (mobile) */}
              <rect
                x={p.x - 22}
                y={pad.top}
                width={44}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => showTooltip(p)}
                onMouseLeave={() => setTooltip(null)}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  showTooltip(p);
                }}
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
        <ChartTooltip tooltip={tooltip} viewBoxWidth={w} />

        {/* month labels */}
        <div className="grid grid-cols-12 mt-1" style={{ paddingLeft: `${(pad.left / w) * 100}%`, paddingRight: `${(pad.right / w) * 100}%` }}>
          {monthlyData.map((d, i) => (
            <span
              key={i}
              onMouseEnter={() => showTooltip(points[i])}
              onMouseLeave={() => setTooltip(null)}
              onPointerDown={(e) => {
                e.stopPropagation();
                showTooltip(points[i]);
              }}
              className={cn(
                'text-[8px] lg:text-[10px] font-bold uppercase tracking-widest text-center cursor-pointer',
                i === currentMonth && isCurrentYear
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400',
              )}
            >
              {d.label.charAt(0)}
            </span>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
