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
