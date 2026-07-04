"""Tests for guardia rate calculation — weekday-start rule and override split."""

from datetime import datetime
from app.routers.actividades import calculate_guardia_amount


class TestCalculateGuardiaAmount:
    """calculate_guardia_amount() pure function — weekday-start rule + override split."""

    def test_weekday_start_uses_semana_rate(self):
        """Monday-Friday start uses guardia_semana_rate."""
        # Monday 2026-06-01 (weekday() == 0)
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 1),
            hours=12,
            semana_rate=5000,
            finde_rate=8000,
        )
        assert amount == 12 * 5000  # 60000

    def test_weekend_start_uses_finde_rate(self):
        """Saturday-Sunday start uses guardia_finde_rate."""
        # Saturday 2026-06-06 (weekday() == 5)
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 6),
            hours=12,
            semana_rate=5000,
            finde_rate=8000,
        )
        assert amount == 12 * 8000  # 96000

    def test_sunday_start_uses_finde_rate(self):
        """Sunday start (weekday() == 6) uses guardia_finde_rate."""
        # Sunday 2026-06-07
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 7),
            hours=10,
            semana_rate=5000,
            finde_rate=8000,
        )
        assert amount == 10 * 8000  # 80000

    def test_friday_start_uses_semana_rate(self):
        """Friday start (weekday() == 4) uses guardia_semana_rate."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 5),
            hours=12,
            semana_rate=5000,
            finde_rate=8000,
        )
        assert amount == 12 * 5000  # 60000 (weekday rule — even though it spans weekend)

    def test_override_split_hours(self):
        """When weekday_hours and weekend_hours provided, use split calculation."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 5),  # Friday
            hours=12,
            semana_rate=5000,
            finde_rate=8000,
            weekday_hours=8,
            weekend_hours=4,
        )
        assert amount == (8 * 5000) + (4 * 8000)  # 40000 + 32000 = 72000

    def test_override_with_zero_weekend_hours(self):
        """Override with zero weekend hours should still work."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 6),
            hours=12,
            semana_rate=5000,
            finde_rate=8000,
            weekday_hours=12,
            weekend_hours=0,
        )
        assert amount == (12 * 5000)  # Only weekday hours

    def test_zero_rates(self):
        """Zero rates should result in zero amount."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 1),
            hours=12,
            semana_rate=0,
            finde_rate=0,
        )
        assert amount == 0

    def test_none_rates_default_to_zero(self):
        """None rates should default to 0."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 1),
            hours=12,
            semana_rate=None,
            finde_rate=None,
        )
        assert amount == 0
