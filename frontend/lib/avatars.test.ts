import { describe, it, expect } from 'vitest';
import { AVATARS, avatarUrl } from './avatars';

// Approval test: these exact URLs previously lived in both
// Dashboard.tsx and SettingsView.tsx. They are the source of truth
// for the shared avatar map and must not change silently.
const EXPECTED = {
  masc_formal: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=256&h=256&auto=format&fit=crop',
  masc_doctor: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=256&h=256&auto=format&fit=crop',
  masc_scrubs: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=256&h=256&auto=format&fit=crop',
  fem_formal: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&h=256&auto=format&fit=crop',
  fem_doctor: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?q=80&w=256&h=256&auto=format&fit=crop',
  fem_scrubs: 'https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=256&h=256&auto=format&fit=crop',
} as const;

describe('AVATARS', () => {
  it('maps all six avatar keys to their exact Unsplash URLs', () => {
    expect(AVATARS).toEqual(EXPECTED);
  });
});

describe('avatarUrl', () => {
  it('returns the URL for a known key', () => {
    expect(avatarUrl('masc_formal')).toBe(EXPECTED.masc_formal);
    expect(avatarUrl('fem_scrubs')).toBe(EXPECTED.fem_scrubs);
  });

  it('falls back to masc_doctor for an unknown key', () => {
    expect(avatarUrl('dragon_doctor')).toBe(EXPECTED.masc_doctor);
  });

  it('falls back to masc_doctor when key is undefined', () => {
    expect(avatarUrl(undefined)).toBe(EXPECTED.masc_doctor);
  });
});
