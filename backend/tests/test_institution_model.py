"""Tests for Institution model — guardia_semana_rate / guardia_finde_rate fields."""

import pytest
from pydantic import ValidationError
from app.models.institution import InstitutionBase, InstitutionUpdate, InstitutionCreate


class TestInstitutionBase:
    """InstitutionBase model with new dual guardia rate fields."""

    def test_accepts_dual_guardia_rates(self):
        """InstitutionBase should accept guardia_semana_rate and guardia_finde_rate."""
        inst = InstitutionBase(
            name="Test Inst",
            guardia_semana_rate=5000,
            guardia_finde_rate=8000,
        )
        assert inst.guardia_semana_rate == 5000
        assert inst.guardia_finde_rate == 8000

    def test_guardia_rate_filled_from_semana(self):
        """guardia_rate should be settable independently for backward compat."""
        inst = InstitutionBase(
            name="Test Inst",
            guardia_rate=6000,
        )
        # New fields should initially be None
        assert inst.guardia_rate == 6000
        assert inst.guardia_semana_rate is None
        assert inst.guardia_finde_rate is None

    def test_rejects_negative_semana_rate(self):
        """Negative guardia_semana_rate should be rejected."""
        with pytest.raises(ValidationError):
            InstitutionBase(
                name="Test Inst",
                guardia_semana_rate=-1000,
            )

    def test_rejects_negative_finde_rate(self):
        """Negative guardia_finde_rate should be rejected."""
        with pytest.raises(ValidationError):
            InstitutionBase(
                name="Test Inst",
                guardia_finde_rate=-500,
            )

    def test_accepts_zero_rates(self):
        """Zero is a valid rate (free service)."""
        inst = InstitutionBase(
            name="Test Inst",
            guardia_semana_rate=0,
            guardia_finde_rate=0,
        )
        assert inst.guardia_semana_rate == 0
        assert inst.guardia_finde_rate == 0

    def test_accepts_decimal_rates(self):
        """Rates support decimals (e.g. 1250.5 pesos/hora)."""
        inst = InstitutionBase(
            name="Test Inst",
            guardia_semana_rate=1250.5,
            guardia_feriado_rate=8000.25,
        )
        assert inst.guardia_semana_rate == 1250.5
        assert inst.guardia_feriado_rate == 8000.25

    def test_accepts_integer_rates_as_float(self):
        """Whole-number rates keep working (Pydantic coerces int → float)."""
        inst = InstitutionBase(
            name="Test Inst",
            guardia_semana_rate=5000,
        )
        assert inst.guardia_semana_rate == 5000


class TestInstitutionUpdate:
    """InstitutionUpdate model should accept the new guardia rate fields."""

    def test_accepts_dual_guardia_rates(self):
        data = InstitutionUpdate(
            guardia_semana_rate=5500,
            guardia_finde_rate=9000,
        )
        assert data.guardia_semana_rate == 5500
        assert data.guardia_finde_rate == 9000

    def test_rejects_negative_semana_rate(self):
        with pytest.raises(ValidationError):
            InstitutionUpdate(guardia_semana_rate=-100)

    def test_allows_none_fields(self):
        data = InstitutionUpdate()
        assert data.guardia_semana_rate is None
        assert data.guardia_finde_rate is None


class TestInstitutionCreate:
    """InstitutionCreate inherits from InstitutionBase, should also carry new fields."""

    def test_accepts_dual_guardia_rates(self):
        data = InstitutionCreate(
            name="New Inst",
            guardia_semana_rate=7000,
            guardia_finde_rate=10000,
            procedimiento_rate=5000,
        )
        assert data.guardia_semana_rate == 7000
        assert data.guardia_finde_rate == 10000
