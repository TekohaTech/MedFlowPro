import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api } from './api';
import { PROFILE_STORAGE_KEY } from '../lib/profileCache';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

beforeEach(() => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
});

describe('api.logout', () => {
  it('removes tokens and the cached profile key', () => {
    localStorage.setItem('access_token', 'tok');
    localStorage.setItem('refresh_token', 'rtok');
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ name: 'A' }));

    api.logout();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull();
  });
});

describe('api.getInstitutions — color normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetchJson(json: unknown) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => json,
    }));
  }

  it('normalizes the color field into the Institution', async () => {
    stubFetchJson([{ _id: 'i1', name: 'Madariaga', color: '#ef4444', is_active: true }]);
    const insts = await api.getInstitutions();
    expect(insts[0].color).toBe('#ef4444');
    expect(insts[0].name).toBe('Madariaga');
  });

  it('defaults to null when the API omits color (legacy institution)', async () => {
    stubFetchJson([{ _id: 'i2', name: 'Clínica', is_active: true }]);
    const insts = await api.getInstitutions();
    expect(insts[0].color).toBeNull();
  });
});
