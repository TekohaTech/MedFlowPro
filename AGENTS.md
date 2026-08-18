# MedFlow Pro — React 19 Rules

## CRITICAL: Follow these at all times

### Component Size
- **200 lines** per component is the target. **250 lines is the hard cap** — over 250 → extract subcomponents.
- Max **3 useState** per component. Over 3 → custom hook.
- Max **2 useEffect** per component. Over 2 → custom hook.
- One component = one file. Never define components inside other components.

### Form Pattern (React 19)
- **ALWAYS use `useActionState`** for forms, never `useState` + manual submit.
- Provides `[state, formAction, isPending]` out of the box.
- Pass `formAction` to `<form action={formAction}>`.

### Props & Types
- Destructure props in function signature: `function X({ a, b }: Props)`
- No `React.FC` — use plain functions.
- No `any` — use `unknown` and narrow.
- `strict: true` in tsconfig.

### Purity
- No mutations during render. No modifying props/outer variables.
- Side effects only in event handlers. `useEffect` is last resort.

### Separation
- Components = presentation only. Custom hooks = stateful logic. Utils = pure functions.
- API calls never inside components — extract to custom hook or service.

### Code Quality
- No duplicated logic → shared utility function.
- No `confirm()` → custom modal.
- No inline translations → shared `translations.ts`.
- Use `cn()` for conditional/merged Tailwind classes; static class strings are fine.

## Calendar UI — Approved Visual Language (DO NOT regress)

### Duration Lines (per cell, per institution)
- **Dot + amount + segment** on start days: colored circle (w-2 h-2) + amount (`hidden lg:inline text-[7px]`) + flex segment (`h-[3px] flex-1 rounded-r-full` when endsToday).
- **Segment only** on coverage-only days (no dot, no amount).
- **Segment + vertical end marker** on the end day: segment stops short (`mr-1 rounded-r-full`) + thin marker (`w-[2px] h-2 rounded-full`).
- Amount is intentionally CSS-hidden on mobile (`hidden lg:inline`) — mobile uses a `lg:hidden` count badge instead.
- Z-index: `relative z-[5]` so lines paint ABOVE the gap-px grid background.
- End marker is **per guardia** (`endDate === dayStr`), not per institution.
- **Persistent slots**: every line keeps its vertical position across days via positional spacers (`h-2` children). Lines NEVER jump. Logic lives in `durationLineSlots.ts` (pure module).
- Known limitation (documented + pinned): 1-day + multi-day guardia of the SAME institution starting the SAME day can collide (shared anchor key).

### Grid Lines
- Gap-px (`gap-px bg-slate-200`) — background shows through 1px gaps, NOT borders on each cell. Duration lines paint over the background.
- Cells paint their own opaque background (`bg-white dark:bg-slate-800`).

### Count Badge (Mobile)
- `lg:hidden` — visible only on mobile. Shows count of starting ACTIVE guardias.
- Now `aria-hidden` — decorative; SR users get info from the sr-only per-cell summary.

### Guardia Breakdown Popover
- Shows formatting breakdown: `48h × $17.000 (semana) + 24h × $17.000,33 (fin de semana)`.
- Highlight treatment needed (see pending styling work).
