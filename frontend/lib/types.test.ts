import { describe, it, expect } from 'vitest';
import { ActivityType, type Actividad, type Institution } from '../types';

describe('ActivityType enum', () => {
  it('should include EXTRA', () => {
    expect(ActivityType.EXTRA).toBe('extra');
  });

  it('should have all original types plus extra', () => {
    const values = Object.values(ActivityType);
    expect(values).toContain('guardia');
    expect(values).toContain('procedimiento');
    expect(values).toContain('interconsulta');
    expect(values).toContain('extra');
  });
});

describe('Institution type', () => {
  it('should accept new dual guardia rate fields', () => {
    const inst: Institution = {
      id: '1',
      name: 'Test Inst',
      guardia_semana_rate: 5000,
      guardia_finde_rate: 8000,
      guardia_rate: 5000,
      procedimiento_rate: 3000,
      interconsulta_rate: 2000,
      is_active: true,
    };
    expect(inst.guardia_semana_rate).toBe(5000);
    expect(inst.guardia_finde_rate).toBe(8000);
  });

  it('should allow guardia_semana_rate to be null', () => {
    const inst: Institution = {
      id: '1',
      name: 'Test Inst',
      guardia_semana_rate: null,
      guardia_finde_rate: null,
      is_active: true,
    };
    expect(inst.guardia_semana_rate).toBeNull();
    expect(inst.guardia_finde_rate).toBeNull();
  });
});

describe('Actividad union with Extra', () => {
  it('should accept extra type actividad', () => {
    const extra: Actividad = {
      id: 'extra-1',
      type: ActivityType.EXTRA,
      institution: 'Test Inst',
      date: '2026-06-15',
      amount: 150000,
      status: 'pendiente' as any,
      conceptName: 'Coordinación SIMES',
      createdAt: '2026-06-15T00:00:00Z',
    };
    expect(extra.type).toBe('extra');
    expect((extra as any).conceptName).toBe('Coordinación SIMES');
  });
});
