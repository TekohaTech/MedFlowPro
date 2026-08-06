import type { UserProfile } from '../types';

// Profile persistence for useAppState. The cache is only written on a
// successful profile fetch/update, never on logout.
export const PROFILE_STORAGE_KEY = 'medflow_profile';

export const DEMO_PROFILE: UserProfile = {
  name: 'Dr. Rodriguez',
  specialty: 'Cardiología',
  institution: 'Hospital Italiano',
  avatar: 'masc_doctor',
};

const AVATAR_KEYS: readonly UserProfile['avatar'][] = [
  'masc_formal',
  'masc_doctor',
  'masc_scrubs',
  'fem_formal',
  'fem_doctor',
  'fem_scrubs',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Parses and defensively validates a cached profile from localStorage.
// Returns null for missing/invalid data so the caller falls back to DEMO_PROFILE.
export function parseCachedProfile(raw: string | null): UserProfile | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const { name, specialty, institution, avatar } = parsed;
  if (
    typeof name !== 'string' ||
    typeof specialty !== 'string' ||
    typeof institution !== 'string'
  ) {
    return null;
  }
  return {
    name,
    specialty,
    institution,
    avatar:
      typeof avatar === 'string' &&
      (AVATAR_KEYS as readonly string[]).includes(avatar)
        ? (avatar as UserProfile['avatar'])
        : 'masc_doctor',
  };
}

export function saveCachedProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // storage unavailable (private mode, quota) — non-fatal
  }
}

export function loadCachedProfile(): UserProfile | null {
  try {
    return parseCachedProfile(localStorage.getItem(PROFILE_STORAGE_KEY));
  } catch {
    return null;
  }
}

// Maps the backend /api/auth/me payload onto UserProfile with the same
// fallbacks useAppState used before the cache existed.
export function profileFromApi(apiProfile: {
  full_name?: string;
  specialty?: string;
  institution?: string;
  avatar?: string;
}): UserProfile {
  return {
    name: apiProfile.full_name || 'Dr. Usuario',
    specialty: apiProfile.specialty || 'Medicina',
    institution: apiProfile.institution || '',
    avatar: apiProfile.avatar
      ? (apiProfile.avatar as UserProfile['avatar'])
      : 'masc_doctor',
  };
}
