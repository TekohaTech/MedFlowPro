"""Tests for Actividad model — EXTRA type and concept_name field."""

import pytest
from pydantic import ValidationError
from app.models.actividad import ActivityType, ActividadCreate, PaymentStatus


class TestActivityType:
    """ActivityType enum should include EXTRA."""

    def test_extra_is_in_enum(self):
        assert ActivityType.EXTRA == "extra"

    def test_all_types_present(self):
        types = {t.value for t in ActivityType}
        assert "guardia" in types
        assert "procedimiento" in types
        assert "interconsulta" in types
        assert "extra" in types


class TestActividadCreateConceptName:
    """ActividadCreate should accept concept_name field."""

    def test_accepts_concept_name(self):
        data = ActividadCreate(
            type=ActivityType.EXTRA,
            institution="Test Inst",
            date="2026-06-15",
            amount=150000,
            concept_name="Coordinación SIMES",
        )
        assert data.concept_name == "Coordinación SIMES"

    def test_concept_name_optional_for_guardia(self):
        """concept_name should be optional (None by default) for non-extra types."""
        data = ActividadCreate(
            type=ActivityType.GUARDIA,
            institution="Test Inst",
            date="2026-06-15",
            amount=50000,
            hours=10,
            hourly_rate=5000,
        )
        assert data.concept_name is None

    def test_concept_name_max_length(self):
        """concept_name should have max 200 chars."""
        with pytest.raises(ValidationError):
            ActividadCreate(
                type=ActivityType.EXTRA,
                institution="Test Inst",
                date="2026-06-15",
                amount=1000,
                concept_name="x" * 201,
            )

    def test_extra_can_have_zero_amount(self):
        """Extra with zero amount is valid."""
        data = ActividadCreate(
            type=ActivityType.EXTRA,
            institution="Test Inst",
            date="2026-06-15",
            amount=0,
            concept_name="Aclaración sin cargo",
        )
        assert data.amount == 0

    def test_accepts_decimal_amount(self):
        """Amounts are peso values with up to 2 decimals (not integer cents)."""
        data = ActividadCreate(
            type=ActivityType.GUARDIA,
            institution="Test Inst",
            date="2026-06-15",
            amount=56003.5,
            hours=7,
            hourly_rate=8000.5,
        )
        assert data.amount == 56003.5
        assert data.hourly_rate == 8000.5

    def test_accepts_decimal_unit_value(self):
        """unit_value supports decimals for procedimientos."""
        data = ActividadCreate(
            type=ActivityType.PROCEDIMIENTO,
            institution="Test Inst",
            date="2026-06-15",
            amount=1250.5,
            quantity=1,
            unit_value=1250.5,
        )
        assert data.unit_value == 1250.5


class TestActividadCreateGuardiaRange:
    """Guardia range validation: the declared range is the source of truth.

    A full range (date + start_time → end_date + end_time) must be forward
    (end > start). There is NO artificial 48h cap — doctors legitimately work
    72h+ guardias. The only upper bound is a 720h (30 days) anti-DoS guard for
    the per-hour classifier: an unbounded end_date would mean unbounded work
    per request (e.g. end_date '2050-01-01' = 210k hours). Backwards ranges are
    rejected at the model layer (422 via Pydantic).
    """

    def _guardia(self, **overrides) -> ActividadCreate:
        base = dict(
            type=ActivityType.GUARDIA,
            institution="Test Inst",
            date="2026-06-05",
            amount=0,
            hours=24,
            start_time="08:00",
            end_date="2026-06-06",
            end_time="08:00",
        )
        base.update(overrides)
        return ActividadCreate(**base)

    def test_valid_full_range_is_accepted(self):
        """Fri 08:00 → Sat 08:00 (24h, forward) is valid."""
        data = self._guardia()
        assert data.end_date == "2026-06-06"

    def test_72_hour_guardia_is_accepted(self):
        """72h (Fri 08:00 → Mon 08:00) is a legitimate guardia, NOT capped."""
        data = self._guardia(end_date="2026-06-08", end_time="08:00", hours=72)
        assert data.hours == 72

    def test_96_hour_guardia_is_accepted(self):
        """96h (Fri 08:00 → Tue 08:00) is a legitimate guardia, NOT capped."""
        data = self._guardia(end_date="2026-06-09", end_time="08:00", hours=96)
        assert data.hours == 96

    def test_exactly_720_hours_is_accepted(self):
        """Exactly 720h (30 days) is the anti-DoS bound and is still valid."""
        data = self._guardia(end_date="2026-07-05", end_time="08:00", hours=720)
        assert data.hours == 720

    def test_backwards_range_is_rejected(self):
        """end <= start (same-day earlier time) → ValidationError, NOT silent fallback."""
        with pytest.raises(ValidationError) as exc:
            self._guardia(start_time="14:00", end_time="08:00", end_date="2026-06-05")
        assert "posterior al inicio" in str(exc.value)

    def test_same_start_and_end_is_rejected(self):
        """end == start (zero-length range) → ValidationError."""
        with pytest.raises(ValidationError) as exc:
            self._guardia(start_time="08:00", end_time="08:00", end_date="2026-06-05")
        assert "posterior al inicio" in str(exc.value)

    def test_range_over_720_hours_is_rejected(self):
        """Range of 721h (> 30 days) → ValidationError: anti-DoS guard, NOT a cap.

        hours stays in-bounds so the range validator fires: the 720h bound
        protects the per-hour classifier from unbounded work, it is not a
        business limit.
        """
        with pytest.raises(ValidationError) as exc:
            self._guardia(hours=48, end_date="2026-07-05", end_time="09:00")
        assert "720 horas" in str(exc.value)

    def test_huge_unbounded_range_is_rejected(self):
        """end_date '2050-01-01' (210k hours) → ValidationError, no DoS."""
        with pytest.raises(ValidationError) as exc:
            self._guardia(hours=48, end_date="2050-01-01", end_time="08:00")
        assert "720 horas" in str(exc.value)

    def test_partial_range_skips_validation(self):
        """end_date without start_time → no full range declared → legacy path, no error."""
        data = ActividadCreate(
            type=ActivityType.GUARDIA,
            institution="Test Inst",
            date="2026-06-05",
            amount=0,
            hours=12,
            end_date="2050-01-01",
        )
        assert data.end_date == "2050-01-01"

    def test_non_guardia_range_fields_are_not_validated(self):
        """The range rule applies to guardias only."""
        data = ActividadCreate(
            type=ActivityType.EXTRA,
            institution="Test Inst",
            date="2026-06-05",
            amount=1000,
            concept_name="Aclaración sin cargo",
            start_time="14:00",
            end_date="2026-06-05",
            end_time="08:00",
        )
        assert data.concept_name == "Aclaración sin cargo"
