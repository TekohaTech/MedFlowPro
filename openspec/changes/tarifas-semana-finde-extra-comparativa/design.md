# Design: Tarifa Semana/Finde, Extra, y Comparativa

## Overview

Three independent features modifying backend models, routers, frontend types, and components. All changes are `userId`-scoped (multi-tenant). No migration needed (MongoDB schemaless).

---

## 1. Guardia Rate Weekday/Weekend

### Backend: `backend/app/models/institution.py`

Add two new fields to `InstitutionBase`:

```python
guardia_semana_rate: Optional[int] = Field(None, ge=0)
guardia_finde_rate: Optional[int] = Field(None, ge=0)
```

Keep `guardia_rate` as read-compat alias: on read, return `guardia_semana_rate`. On write via legacy clients, set both split rates to the given value. Add same fields to `InstitutionUpdate`.

### Backend: `backend/app/routers/actividades.py`

In `crear_actividad()`, replace the guardia amount calc:

```python
if actividad.type == ActivityType.GUARDIA and actividad.hours:
    inst = await db.institutions.find_one({"name": actividad.institution, "userId": user_id})
    if inst:
        start_date = datetime.strptime(actividad.date, "%Y-%m-%d")
        rate = inst["guardia_semana_rate"] if start_date.weekday() < 5 else inst["guardia_finde_rate"]
        actividad.amount = actividad.hours * (rate or 0)
```

Only `date` matters for weekday check — **not** `end_date`. This implements the weekday-start rule.

### Backend: `backend/app/routers/institutions.py`

Update `create_institution` and `update_institution` to accept the new fields from `InstitutionCreate`/`InstitutionUpdate` — already handled by Pydantic after model change.

### Frontend: `frontend/types.ts`

Add to `Institution`:
```typescript
guardia_semana_rate?: number | null;
guardia_finde_rate?: number | null;
```

### Frontend: `frontend/components/RateEditor.tsx`

Replace single `guardia_rate` row with two rows: "Guardia semana ($/h)" and "Guardia finde ($/h)". Add info icon with tooltip: *"La tarifa se define según el día de inicio de la guardia, no por cada día trabajado."*

The `editingRateType` state gains two new values: `guardia_semana_rate` and `guardia_finde_rate`.

### Frontend: `frontend/components/ShiftForm/useShiftForm.ts`

Update `handleSelectInstitution` to set `hourlyRate` from `guardia_semana_rate` (default to weekday rate).

---

## 2. Extra Activity Type

### Backend: `backend/app/models/actividad.py`

Add to `ActivityType`:
```python
EXTRA = "extra"
```

Add `concept_name: Optional[str]` to `ActividadCreate` (max 200 chars, required for extra type).

### Backend: `backend/app/routers/actividades.py`

In `crear_actividad()`:
- If `type == EXTRA`: validate `concept_name` is present, `hours` is null. Amount is user-provided (no auto-calc).
- Persist `concept_name` in the MongoDB doc.

No changes to auto-calc for guardia/procedimiento/interconsulta.

### Frontend: `frontend/types.ts`

Add `ActividadExtra` discriminated type:
```typescript
export interface ActividadExtra extends BaseActividad {
  type: ActivityType.EXTRA;
  conceptName: string;
}
```

Update `Actividad` union:
```typescript
export type Actividad = ActividadGuardia | ActividadProcedimiento | ActividadInterconsulta | ActividadExtra;
```

Add `EXTRA = "extra"` to `ActivityType` enum.

### Frontend: `frontend/hooks/useTransactions.ts`

In `mapApiActivity`, handle `a.type === "extra"` → map to a dedicated `ShiftType` (add `ShiftType.EXTRA = "extra"` to the enum, or map to `ShiftType.PASSIVE` with type metadata).

Update `handleAddTransaction` to send `extra` type with `concept_name` field.

### Frontend: `frontend/components/ShiftForm/ShiftForm.tsx`

Add a tab/button row above the form for type selection: **Guardia** | **Extra**. Default is Guardia.

When "Extra" selected:
- Hide `ActivaPasivaToggle`, hours/rate grid, `DateTimeInputs` (only date needed)
- Show simplified fields: Institution picker, concept name input, amount input, notes, status toggle
- Use a separate state or repurpose existing state with type discriminator

### Frontend: `frontend/components/ShiftForm/useShiftForm.ts`

Add `activityMode: 'guardia' | 'extra'` state. When `extra`:
- Set hours to 0, skip hour/rate effects
- `addExtra` is not used (no sub-extras for extras)
- Submission sends type `EXTRA`, `concept_name`, and manual `amount`

### Frontend: Calendar styling

In `CalendarGrid.tsx`, replace the uniform blue dots with type-colored dots:
```typescript
const dotColors: Record<string, string> = {
  guardia: "bg-blue-500",
  procedimiento: "bg-purple-500",
  interconsulta: "bg-green-500",
  extra: "bg-amber-500",
};
```

In `DayDetailsPanel.tsx`, add an amber badge for extra type:
```typescript
shift.type === 'extra' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/40' : ...
label: 'Extra'
```

Update `getShiftsForDay` in `calendarUtils.ts` to include `ShiftType.EXTRA` in the multi-day filter guard (extras are single-day, so just the `tx.date === dateString` match applies).

### Reports

In `ReportsPrintView.tsx`, add an "Extras" row in the summary section. Add `totalExtras` prop and render it alongside existing type totals.

In `useReportsFilters.ts`, add `totalExtras` to filtered totals. Include `ShiftType.EXTRA` in the type filter mapping.

---

## 3. Institution Monthly Comparison

### Backend: `backend/app/routers/actividades.py`

New endpoint:

```python
@router.get("/comparativa", response_model=List[ComparativaRow])
async def comparativa_instituciones(
    month: int, year: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
```

Use MongoDB aggregation pipeline per institution:
1. Match activities where `userId == user_id` and date is in month `[year, month]`
2. Group by institution → `current_month_total`
3. Same for previous month `[prev_year, prev_month]`
4. For each institution (from user's active list), compute `change_amount` and `change_percent`

Response model (`ComparativaRow`):
```python
class ComparativaRow(BaseModel):
    institution_id: str
    institution_name: str
    current_month_total: int
    previous_month_total: int
    change_amount: int
    change_percent: Optional[float]  # None when prev = 0
```

### Frontend: `frontend/types.ts`

Add `ComparativaRow` interface.

### Frontend: `frontend/services/api.ts`

Add:
```typescript
async getComparativa(month: number, year: number): Promise<ComparativaRow[]>
```

### Frontend: `frontend/components/StatsView.tsx`

Add comparison table below the stat cards:
- Fetch `comparativa` data on mount alongside stats
- Table columns: Institution | Current Month | Previous Month | Change
- Three toggle buttons: `$` | `%` | `Ambos`
- `$` mode: all values in pesos
- `%` mode: Change column shows percentage only
- `Ambos` mode: Change column shows `+$100k (+25%)`
- Negative changes in red text (Tailwind: `text-red-600`)
- Positive changes in green (`text-green-600`)

Use `useMemo` for display mode formatting. Since `StatsView` is currently 180 lines and will exceed 200, extract the comparison table to `StatsView/ComparisonTable.tsx`.

---

## File Change Summary

| File | Change |
|------|--------|
| `backend/app/models/actividad.py` | Add `EXTRA` to `ActivityType`, add `concept_name` to `ActividadCreate` |
| `backend/app/models/institution.py` | Add `guardia_semana_rate`, `guardia_finde_rate` to `InstitutionBase`/`InstitutionUpdate` |
| `backend/app/routers/actividades.py` | New amount calc for guardia (weekday check), EXTRA validation, `/comparativa` endpoint |
| `backend/app/routers/institutions.py` | Pass-through for new rate fields (auto via Pydantic) |
| `frontend/types.ts` | Add `EXTRA`, `ActividadExtra`, `ComparativaRow`, update `Institution` |
| `frontend/services/api.ts` | Add `getComparativa()`, accept new fields in institution calls |
| `frontend/hooks/useTransactions.ts` | Handle extra type in `mapApiActivity` and `handleAddTransaction` |
| `frontend/components/RateEditor.tsx` | Split guardia row into semana/finde with tooltip |
| `frontend/components/ShiftForm/ShiftForm.tsx` | Add Guardia/Extra tab, conditional form sections |
| `frontend/components/ShiftForm/useShiftForm.ts` | Add `activityMode` state, extra submission logic |
| `frontend/components/Calendar/CalendarGrid.tsx` | Type-colored dots for extra (amber) |
| `frontend/components/Calendar/DayDetailsPanel.tsx` | Extra badge styling |
| `frontend/components/StatsView.tsx` | Add comparison table, extract to subcomponent |
| `frontend/components/Reports/ReportsPrintView.tsx` | Add extras row |
| `frontend/components/Reports/useReportsFilters.ts` | Add `totalExtras` |
