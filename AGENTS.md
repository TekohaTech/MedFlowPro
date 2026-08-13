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
