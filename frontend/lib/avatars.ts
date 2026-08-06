// Shared avatar URL map. Key set mirrors the avatar union in types.ts.
// Previously duplicated in Dashboard.tsx and SettingsView.tsx.
export const AVATARS: Record<string, string> = {
  masc_formal: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=256&h=256&auto=format&fit=crop',
  masc_doctor: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=256&h=256&auto=format&fit=crop',
  masc_scrubs: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=256&h=256&auto=format&fit=crop',
  fem_formal: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&h=256&auto=format&fit=crop',
  fem_doctor: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?q=80&w=256&h=256&auto=format&fit=crop',
  fem_scrubs: 'https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=256&h=256&auto=format&fit=crop',
};

export function avatarUrl(key: string | undefined): string {
  return AVATARS[key ?? ''] ?? AVATARS.masc_doctor;
}
