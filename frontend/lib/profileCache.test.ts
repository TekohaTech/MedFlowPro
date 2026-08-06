import { describe, it, expect, beforeEach } from 'vitest';
import type { UserProfile } from '../types';
import { parseCachedProfile, profileFromApi, saveCachedProfile, loadCachedProfile, PROFILE_STORAGE_KEY, DEMO_PROFILE } from './profileCache';

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

describe('parseCachedProfile', () => {
  it('returns null when nothing is cached', () => {
    expect(parseCachedProfile(null)).toBeNull();
    expect(parseCachedProfile('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseCachedProfile('not-json')).toBeNull();
    expect(parseCachedProfile('{broken')).toBeNull();
  });

  it('returns null when the parsed value is not an object', () => {
    expect(parseCachedProfile('"Dr. Rodriguez"')).toBeNull();
    expect(parseCachedProfile('42')).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(parseCachedProfile(JSON.stringify({ name: 'Ana' }))).toBeNull();
    expect(
      parseCachedProfile(JSON.stringify({ name: 'Ana', specialty: 'Clínica' })),
    ).toBeNull();
  });

  it('returns null when required fields have wrong types', () => {
    expect(
      parseCachedProfile(
        JSON.stringify({ name: 123, specialty: 'Clínica', institution: 'X' }),
      ),
    ).toBeNull();
  });

  it('restores a valid cached profile', () => {
    const cached: UserProfile = {
      name: 'Ana García',
      specialty: 'Clínica Médica',
      institution: 'Sanatorio Norte',
      avatar: 'fem_formal',
    };
    expect(parseCachedProfile(JSON.stringify(cached))).toEqual(cached);
  });

  it('defaults to masc_doctor when the avatar key is invalid', () => {
    const parsed = parseCachedProfile(
      JSON.stringify({ name: 'Ana', specialty: 'Clínica', institution: 'X', avatar: 'penguin' }),
    );
    expect(parsed).toEqual({
      name: 'Ana',
      specialty: 'Clínica',
      institution: 'X',
      avatar: 'masc_doctor',
    });
  });
});

describe('profileFromApi', () => {
  it('maps full_name/specialty/institution/avatar from the API response', () => {
    expect(
      profileFromApi({
        full_name: 'Luis Pérez',
        specialty: 'Cardiología',
        institution: 'Hospital Público',
        avatar: 'masc_scrubs',
      }),
    ).toEqual({
      name: 'Luis Pérez',
      specialty: 'Cardiología',
      institution: 'Hospital Público',
      avatar: 'masc_scrubs',
    });
  });

  it('applies fallbacks when API fields are missing', () => {
    expect(profileFromApi({})).toEqual({
      name: 'Dr. Usuario',
      specialty: 'Medicina',
      institution: '',
      avatar: 'masc_doctor',
    });
  });
});

describe('profile cache constants', () => {
  it('uses the exact localStorage key medflow_profile', () => {
    expect(PROFILE_STORAGE_KEY).toBe('medflow_profile');
  });

  it('keeps the demo profile as last-resort fallback', () => {
    expect(DEMO_PROFILE).toEqual({
      name: 'Dr. Rodriguez',
      specialty: 'Cardiología',
      institution: 'Hospital Italiano',
      avatar: 'masc_doctor',
    });
  });
});

describe('saveCachedProfile / loadCachedProfile round-trip', () => {
  it('persists and restores a profile through localStorage', () => {
    const profile: UserProfile = {
      name: 'Ana García',
      specialty: 'Clínica Médica',
      institution: 'Sanatorio Norte',
      avatar: 'fem_formal',
    };
    saveCachedProfile(profile);
    expect(loadCachedProfile()).toEqual(profile);
    localStorage.clear();
  });

  it('returns null when storage is unavailable', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => { throw new Error('storage blocked'); },
        setItem: () => { throw new Error('storage blocked'); },
        removeItem: () => { throw new Error('storage blocked'); },
        clear: () => {},
        key: () => null,
        length: 0,
      },
      configurable: true,
    });
    expect(loadCachedProfile()).toBeNull();
  });
});
