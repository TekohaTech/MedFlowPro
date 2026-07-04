# Tasks: Tarifa Semana/Finde, Extra y Comparativa

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 480-550 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 (both to main, independent) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Notes |
|------|------|-----------|------|-------|
| 1 | Guardia Rate + Extra Type | PR 1 | main | Models, routes, RateEditor, ShiftForm, Calendar styling, Reports |
| 2 | Monthly Comparison | PR 2 | main | Independent endpoint, ComparisonTable in StatsView |

## Phase 1: Foundation — Backend Models

- [x] 1.1 Add `guardia_semana_rate`/`guardia_finde_rate` to `InstitutionBase` + `InstitutionUpdate` (`institution.py`)
- [x] 1.2 Add `EXTRA = "extra"` to `ActivityType` + `concept_name` to `ActividadCreate` (`actividad.py`)

## Phase 2: Core — Backend Routes

- [x] 2.1 Add weekday-check guardia amount calc in `crear_actividad()` using `date.weekday()` (`actividades.py`)
- [x] 2.2 Add EXTRA validation: require `concept_name`, reject `hours`, persist manual `amount` (`actividades.py`)
- [ ] 2.3 Add `GET /api/actividades/comparativa` with `ComparativaRow` model + aggregation pipeline (`actividades.py`)  *(Tanda 2)*
- [x] 2.4 Verify new rate fields pass through in `institutions.py` create/update (auto via Pydantic)

## Phase 3: Core — Frontend Types & API

- [x] 3.1 Add `EXTRA` to `ActivityType`, update `Institution` fields, add `ActividadExtra` + `ComparativaRow` types (`types.ts`)
- [ ] 3.2 Add `getComparativa()` to api service (`api.ts`)  *(Tanda 2)*

## Phase 4: Core — Guardia Rate UI

- [x] 4.1 Split guardia rate row in `RateEditor.tsx` into semana/finde rows with tooltip explaining weekday-start rule
- [x] 4.2 Update `useShiftForm.ts` `handleSelectInstitution` to default hourly rate from `guardia_semana_rate`

## Phase 5: Core — Extra Activity UI

- [x] 5.1 Add `activityMode: 'guardia' | 'extra'` state to `useShiftForm.ts` + extra submission payload (`concept_name`, manual `amount`)
- [x] 5.2 Add Guardia/Extra mode toggle in `ShiftForm.tsx` with conditional form sections (hide hours/rate, show concept+amount)
- [x] 5.3 Map `extra` type in `mapApiActivity` + `handleAddTransaction` (`useTransactions.ts`)
- [x] 5.4 Add type-colored dots (amber for extra) in `CalendarGrid.tsx`
- [x] 5.5 Add extra badge in `DayDetailsPanel.tsx`
- [x] 5.6 Add `totalExtras` row in `ReportsPrintView.tsx` + type filter in `useReportsFilters.ts`

## Phase 6: Core — Monthly Comparison UI

- [ ] 6.1 Create `StatsView/ComparisonTable.tsx` with Institution/Current/Prev/Change columns + $/%/Both toggle
- [ ] 6.2 Wire comparativa fetch into `StatsView.tsx`, render `<ComparisonTable>` with color-coded changes

## Phase 7: Testing

- [x] 7.1 Backend test: guardia weekday rate selected Mon-Fri, weekend rate selected Sat-Sun
- [x] 7.2 Backend test: EXTRA rejected without `concept_name`, rejected with `hours`
- [ ] 7.3 Backend test: `/comparativa` — both months, zero prev month, negative change  *(Tanda 2)*
- [ ] 7.4 Frontend test: ComparisonTable renders all three display modes  *(Tanda 2)*
