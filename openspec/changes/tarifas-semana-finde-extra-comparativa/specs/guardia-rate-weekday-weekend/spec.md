# Guardia Rate Weekday/Weekend Specification

## Purpose

Institutions with different on-call rates for weekdays vs weekends. A single-rate model underpaid weekend time; this split lets users set `guardia_semana_rate` and `guardia_finde_rate` independently, with a weekday-start rule determining which rate applies to multi-day shifts.

## Requirements

### Requirement: Dual Guardia Rate Storage

The `Institution` model MUST store two distinct guardia rates: `guardia_semana_rate` (weekday) and `guardia_finde_rate` (weekend).

The system MUST keep `guardia_rate` as a read-compatible alias during migration. On read, if both split rates are equal, `guardia_rate` returns their common value. On write, setting `guardia_rate` sets both split rates to the same value.

#### Scenario: Set different weekday and weekend rates

- GIVEN an institution with `guardia_semana_rate = 5000` and `guardia_finde_rate = 8000`
- WHEN the institution is fetched via API
- THEN the response includes both `guardia_semana_rate: 5000` and `guardia_finde_rate: 8000`
- AND `guardia_rate` also returns `5000` (semana_rate value, backward compat)

#### Scenario: Dual inputs in RateEditor

- GIVEN the user opens the RateEditor for an institution
- WHEN the editor renders
- THEN two labeled fields SHALL appear: "Guardia semana ($/h)" and "Guardia finde ($/h)"
- AND the user MUST be able to set different values for each

#### Scenario: Backward-compatible single value

- GIVEN existing data where `guardia_rate = 6000` was set before this change
- WHEN the migration runs
- THEN `guardia_semana_rate` SHALL be filled with `6000` and `guardia_finde_rate` with `6000`
- AND `guardia_rate` continues to return `6000`

### Requirement: Weekday-Start Rate Rule

When computing guardia payment, the system MUST use the weekday or weekend rate based on the **start day** of the guardia, not the day each hour was worked.

- Start day Mon–Fri (weekday) → entire guardia uses `guardia_semana_rate`
- Start day Sat–Sun (weekend) → entire guardia uses `guardia_finde_rate`

The UI MUST display a tooltip beside the rate fields explaining this rule: "La tarifa se define según el día de inicio de la guardia, no por cada día trabajado."

#### Scenario: Friday-start guardia uses weekday rate

- GIVEN an institution with `guardia_semana_rate = 5000` and `guardia_finde_rate = 8000`
- WHEN a guardia is created starting Friday 20:00, ending Saturday 08:00 (12 hours)
- THEN the computed amount SHALL be `5000 × 12 = 60000` (weekday rate, not weekend)

#### Scenario: Saturday-start guardia uses weekend rate

- GIVEN the same institution
- WHEN a guardia is created starting Saturday 20:00, ending Sunday 08:00 (12 hours)
- THEN the computed amount SHALL be `8000 × 12 = 96000` (weekend rate)

#### Scenario: Rate tooltip visible

- GIVEN the user is editing guardia rates
- WHEN hovering over the info icon beside the rate fields
- THEN a tooltip SHALL display the weekday-start rule explanation in Spanish

### Requirement: Input Validation

The system MUST reject institution updates where either guardia rate is missing, negative, or NaN. Both rates MUST be positive numbers or zero.

#### Scenario: Negative weekday rate rejected

- GIVEN the user attempts to set `guardia_semana_rate = -1000`
- WHEN the institution is saved
- THEN the system SHALL return a validation error
- AND the previous rate SHALL be preserved
