# Institution Monthly Comparison Specification

## Purpose

Stats view showed aggregate totals but no month-over-month trend per institution. This spec adds a comparison table with current vs previous month earnings, absolute ($) and percentage (%) change, with a toggle to switch display modes.

## Requirements

### Requirement: Comparison Data Endpoint

The system MUST expose `GET /api/actividades/comparativa?month=N&year=Y` returning per-institution earnings for the requested month and the previous month.

The response SHALL be a list of objects with:
- `institution_id`, `institution_name`
- `current_month_total` (sum of amounts for requested month)
- `previous_month_total` (sum of amounts for previous month)
- `change_amount` (current − previous)
- `change_percent` (previous === 0 ? null : (change / previous × 100))

All amounts respect `userId` scoping.

#### Scenario: Both months have data

- GIVEN institution "Hospital Central" had $500k in June 2026 and $400k in May 2026
- WHEN the user requests `GET /api/actividades/comparativa?month=6&year=2026`
- THEN the response for "Hospital Central" SHALL contain `current_month_total: 500000`, `previous_month_total: 400000`, `change_amount: 100000`, `change_percent: 25.0`

#### Scenario: Previous month is zero (no activity)

- GIVEN institution "Nuevo Hospital" had $200k in June 2026 and $0 in May 2026 (new institution)
- WHEN the user requests `GET /api/actividades/comparativa?month=6&year=2026`
- THEN `change_amount` SHALL be `200000`
- AND `change_percent` SHALL be `null` (division by zero avoided)

#### Scenario: Institution with no current month activity

- GIVEN institution "Clínica Sur" had $0 in June 2026 and $100k in May 2026
- WHEN the user requests comparison data
- THEN `current_month_total` SHALL be `0`
- AND `change_amount` SHALL be `-100000`
- AND `change_percent` SHALL be `-100.0`

### Requirement: Comparison Table in StatsView

The StatsView MUST display a per-institution comparison table with columns: Institution, Current Month, Previous Month, Change.

The table MUST support three display modes toggled by the user:
- **$** — shows all monetary values in pesos
- **%** — shows change as percentage only; current/previous month cells show $ values
- **Both** — shows $ amount and % in the Change column (format: `+$100k (+25%)`)

#### Scenario: Table renders with multiple institutions

- GIVEN two institutions both have data for current and previous month
- WHEN the StatsView renders the comparison table
- THEN each institution SHALL appear as a row
- AND each row SHALL show Institution name, Current Month total, Previous Month total, and Change

#### Scenario: Toggle to percentage view

- GIVEN the comparison table is showing in `$` mode
- WHEN the user clicks the `%` toggle button
- THEN the Change column SHALL display only percentage values (e.g. `+25%`)
- AND current/previous month columns SHALL remain in pesos

#### Scenario: Toggle to "Both" view

- GIVEN the comparison table is showing in `%` mode
- WHEN the user clicks the "Both" toggle
- THEN the Change column SHALL display both amount and percentage (e.g. `+$100k (+25%)`)

#### Scenario: Negative change shown correctly

- GIVEN an institution earned less this month than last
- WHEN the comparison table renders
- THEN negative amounts SHALL display with a minus sign
- AND negative percentages SHALL display with a minus sign
- AND both SHALL use red text color for negative values

### Requirement: Multi-tenant Isolation

The comparison endpoint MUST only return data scoped to the authenticated user. Institutions and activities from other users MUST NOT appear in the response.

#### Scenario: User sees only own institutions

- GIVEN User A and User B each have an institution named "Hospital Central"
- WHEN User A requests comparison data
- THEN only User A's institutions and activities SHALL be included in the response
