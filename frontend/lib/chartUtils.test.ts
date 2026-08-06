import { describe, it, expect } from 'vitest';
import { smoothPath, formatY, formatTooltipValue } from './chartUtils';

describe('smoothPath', () => {
  it('returns empty string for no points', () => {
    expect(smoothPath([])).toBe('');
  });

  it('returns M command for single point', () => {
    expect(smoothPath([{ x: 10, y: 20 }])).toBe('M10,20');
  });

  it('returns line for two points (no curve needed)', () => {
    const result = smoothPath([
      { x: 0, y: 100 },
      { x: 100, y: 200 },
    ]);
    // M + C with control points = ~something with C
    expect(result).toContain('C');
    expect(result).toContain('M0,100');
    expect(result).toContain('100,200');
  });

  it('produces valid path segments for 12 points', () => {
    const points = Array.from({ length: 12 }, (_, i) => ({
      x: i * 50,
      y: Math.random() * 200,
    }));
    const path = smoothPath(points);
    expect(path.startsWith('M')).toBe(true);
    // 12 points = 1 M + 11 C segments
    expect((path.match(/C/g) || []).length).toBe(11);
  });
});

describe('formatY', () => {
  it('formats thousands as $XK', () => {
    expect(formatY(79000)).toBe('$79K');
  });

  it('formats millions as $X.XM', () => {
    expect(formatY(1500000)).toBe('$1.5M');
  });

  it('formats small numbers as $X', () => {
    expect(formatY(500)).toBe('$500');
  });

  it('formats zero', () => {
    expect(formatY(0)).toBe('$0');
  });

  it('formats boundary 1000 as $1K', () => {
    expect(formatY(1000)).toBe('$1K');
  });

  it('formats boundary 1000000 as $1.0M', () => {
    expect(formatY(1000000)).toBe('$1.0M');
  });
});

describe('formatTooltipValue', () => {
  it('formats amounts with es-AR thousands separator', () => {
    expect(formatTooltipValue(5000)).toBe('$5.000');
  });

  it('formats large amounts with full separator groups', () => {
    expect(formatTooltipValue(1234567)).toBe('$1.234.567');
  });

  it('formats zero', () => {
    expect(formatTooltipValue(0)).toBe('$0');
  });
});
