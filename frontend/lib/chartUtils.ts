export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;

  const [first, ..._rest] = points;
  let d = `M${first.x},${first.y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const prev = points[i - 1] || a;
    const next = points[i + 2] || b;
    const cp1x = a.x + (b.x - prev.x) / 6;
    const cp1y = a.y + (b.y - prev.y) / 6;
    const cp2x = b.x - (next.x - a.x) / 6;
    const cp2y = b.y - (next.y - a.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${b.x},${b.y}`;
  }
  return d;
}

export function formatY(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${Math.round(val / 1000)}K`;
  return `$${val}`;
}

// Tooltip amount for MonthlyChart: es-AR thousands separator, no decimals.
export function formatTooltipValue(value: number): string {
  return `$${value.toLocaleString('es-AR')}`;
}
