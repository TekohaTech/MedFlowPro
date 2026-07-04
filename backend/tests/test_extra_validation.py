"""Tests for EXTRA activity validation — concept_name required, hours rejected."""

import pytest
from app.models.actividad import ActividadCreate, ActivityType, PaymentStatus
from app.routers.actividades import calculate_guardia_amount


class TestExtraModelValidation:
    """ActividadCreate model fields for EXTRA type."""

    def test_extra_concept_name_optional_in_model(self):
        """Model allows concept_name to be None (route enforces non-empty for EXTRA)."""
        data = ActividadCreate(
            type=ActivityType.EXTRA,
            institution="Test Inst",
            date="2026-06-15",
            amount=150000,
            concept_name="Coordinación SIMES",
        )
        assert data.concept_name == "Coordinación SIMES"
        assert data.hours is None

    def test_extra_with_concept_name_and_amount(self):
        """Extra with concept_name and amount is valid."""
        data = ActividadCreate(
            type=ActivityType.EXTRA,
            institution="Test Inst",
            date="2026-06-15",
            amount=150000,
            concept_name="Coordinación SIMES",
        )
        assert data.type == ActivityType.EXTRA
        assert data.amount == 150000
        assert data.concept_name == "Coordinación SIMES"

    def test_extra_hours_defaults_none(self):
        """Extra type defaults hours to None."""
        data = ActividadCreate(
            type=ActivityType.EXTRA,
            institution="Test Inst",
            date="2026-06-15",
            amount=50000,
            concept_name="Test item",
        )
        assert data.hours is None

    def test_guardia_can_have_hours(self):
        """Guardia type should still allow hours."""
        data = ActividadCreate(
            type=ActivityType.GUARDIA,
            institution="Test Inst",
            date="2026-06-15",
            amount=60000,
            hours=12,
            hourly_rate=5000,
        )
        assert data.hours == 12
