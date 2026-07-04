# Proposal: Tarifa Semana/Finde, Extra, y Comparativa

## Intent

Three independent UX gaps surfaced: (1) guardias spanning weekdays → weekends use a single rate, underpaying weekend time; (2) non-billable ad-hoc items ("Coordinación SIMES: $150k") have no dedicated type, forcing misuse of procedimiento/interconsulta; (3) stats show aggregate totals but no month-over-month trend per institution.

## Scope

### In Scope
- Split `guardia_semana_rate` / `guardia_finde_rate` in institution model + UI
- New `extra` activity type in backend + frontend
- Month-over-month comparison table in StatsView with $/%/both toggle
- Multi-tenant safety (userId scoping) maintained throughout

### Out of Scope
- Holidays as a third rate tier (just weekend rule for now)
- Bulk import/export of extras
- Trend graphs or charts for comparison data
- Notifications/reminders for unpaid extras

## Capabilities

### New Capabilities
- `guardia-rate-weekday-weekend`: Dual rate (semana/finde) per institution with weekday-start rule for multi-day shifts
- `extra-activity`: Free-form activity type with concept name + manual amount + calendar styling
- `institution-monthly-comparison`: Month-over-month earnings table per institution with $/%/both toggles

### Modified Capabilities

None — no existing spec files found in `openspec/specs/`.

## Approach

**Backend**: Add `guardia_semana_rate` / `guardia_finde_rate` to `InstitutionBase` (keep `guardia_rate` as alias for migration). Add `EXTRA = "extra"` to `ActivityType` enum. New GET `/api/actividades/comparativa?month=N&year=Y` endpoint for comparison data. Amount calc in POST: if guardia starts Mon-Fri, use `guardia_semana_rate` × hours; if Sat-Sun, use `guardia_finde_rate`.

**Frontend**: Add `ActividadExtra` discriminated type. Replace `guardia_rate` with dual inputs in `RateEditor`. New `ExtraForm` component (institution + concept + amount + date + status). Add comparison table to `StatsView` with toggle buttons. Calendar shows extras with distinct background color (e.g. amber/teal).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/app/models/actividad.py` | Modified | Add EXTRA type, concept_name field |
| `backend/app/models/institution.py` | Modified | Add guardia_semana_rate, guardia_finde_rate fields |
| `backend/app/routers/actividades.py` | Modified | Handle EXTRA type creation + rate logic + comparativa endpoint |
| `backend/app/routers/institutions.py` | Modified | Accept new rate fields |
| `frontend/types.ts` | Modified | Add ActividadExtra, update Institution |
| `frontend/services/api.ts` | Modified | Add comparativa fetch, update institution payload |
| `frontend/components/RateEditor.tsx` | Modified | Dual guardia rate inputs |
| `frontend/components/ShiftForm/ShiftForm.tsx` | Modified | Add "Extra" tab/button |
| `frontend/components/ShiftForm/useShiftForm.ts` | Modified | Extra form state + submission |
| `frontend/components/Calendar/CalendarGrid.tsx` | Modified | Extra-specific dot/styling |
| `frontend/components/Calendar/DayDetailsPanel.tsx` | Modified | Show extra type badge |
| `frontend/components/StatsView.tsx` | Modified | Add comparison table with toggle |
| `frontend/hooks/useTransactions.ts` | Modified | Map extra type from API |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backward compat: existing guardia_rate in prod institutions | Low | Keep `guardia_rate` as alias; migration fills semana=finde=old rate on read |
| Weekday-start rule misunderstood | Low | Document rule in UI tooltip beside rate fields |
| Extra type filter omitted from calendar aggregates | Low | Include extra in all totals; add type filter to reports |

## Rollback Plan

1. Git revert commits in reverse order (frontend first, then backend)
2. If migration ran: re-run backward-compatible code that sets `guardia_rate` from `guardia_semana_rate`
3. Existing data with `extra` type remains in DB but is ignored by old frontend (no crash due to discriminated union fallback)

## Dependencies

- MongoDB schema must accept new fields without migration (schemaless)
- No external dependencies

## Success Criteria

- [ ] User can set different weekday/weekend rates per institution
- [ ] Guardia starting on weekday uses weekday rate even if it ends Saturday
- [ ] User can create an "extra" item with concept name + amount only
- [ ] Extra items render in calendar with distinct styling
- [ ] Stats view shows per-institution table with this month vs last month, $ and % change
- [ ] Toggle between $, %, and both views works
- [ ] All existing functionality unchanged (guardias, procedimientos, interconsultas)
