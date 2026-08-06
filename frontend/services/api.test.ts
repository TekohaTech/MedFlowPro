import { describe, it, expect, beforeEach } from 'vitest';
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
