# Extra Activity Specification

## Purpose

Non-billable ad-hoc items (e.g. "Coordinación SIMES: $150k") previously had no dedicated type, forcing users to misuse procedimiento or interconsulta. The `extra` activity type provides a free-form entry with concept name and manual amount, no hours or institution rate required.

## Requirements

### Requirement: Extra Activity Type

The `ActivityType` enum MUST include `EXTRA = "extra"` as a valid type alongside existing types (`GUARDIA`, `PROCEDIMIENTO`, `INTERCONSULTA`).

An extra activity:
- MUST have a `concept_name` (free-form text, max 200 chars)
- MUST have an `amount` (manual numeric input, positive or zero)
- MUST NOT require `hours`, `institution_rate`, or `patient_reference`
- MUST include `institution_id` and `date`
- MUST respect `userId` scoping (multi-tenant)

#### Scenario: Create an extra with concept and amount

- GIVEN a user with an active institution
- WHEN the user creates an activity with type `extra`, concept_name `"Coordinación SIMES"`, amount `150000`, and a valid date
- THEN the activity SHALL be persisted
- AND the response SHALL include the extra-specific fields (`concept_name`, `amount`)
- AND `hours` SHALL be null

#### Scenario: Extra with zero amount

- GIVEN a user creating an extra item
- WHEN the user sets amount = `0` and concept_name = `"Aclaración sin cargo"`
- THEN the activity SHALL be created successfully (zero is a valid amount)

#### Scenario: Reject missing concept_name

- GIVEN a user creating an extra item
- WHEN the user submits with an empty or missing `concept_name`
- THEN the system SHALL return a validation error
- AND the activity SHALL NOT be created

#### Scenario: Reject extra with hours

- GIVEN a user creating an extra item
- WHEN the user submits with `hours` set to a non-null value
- THEN the system SHALL return a validation error
- AND the activity SHALL NOT be created

### Requirement: Extra Visual Styling in Calendar

The calendar MUST render extra-type activities with a distinct visual style (amber/teal background) to differentiate them from guardias, procedimientos, and interconsultas.

The DayDetailsPanel MUST show an "Extra" badge on extra-type entries.

#### Scenario: Extra dot in calendar grid

- GIVEN a day that contains an extra activity
- WHEN the calendar grid renders that day
- THEN the day SHALL display a dot/indicator with the extra-specific color (e.g. amber)
- AND the dot SHALL be visually distinct from guardia (blue), procedimiento (purple), and interconsulta (green) dots

#### Scenario: Extra badge in day details

- GIVEN the user opens the DayDetailsPanel for a day containing an extra
- WHEN the panel renders the activity list
- THEN the extra entry SHALL display an "Extra" badge
- AND the badge SHALL use the same distinct color as the calendar dot

### Requirement: Extra in Aggregates

Extra activity amounts MUST be included in all calendar and stats aggregate totals (monthly totals, per-institution totals). The backend MUST filter by type when the frontend requests type-specific reports.

#### Scenario: Extra included in monthly total

- GIVEN a month with guardias totaling $500k and one extra of $150k
- WHEN the user views the monthly summary
- THEN the total SHALL be $650k (includes extra)
