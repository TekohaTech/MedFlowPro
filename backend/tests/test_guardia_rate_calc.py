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

    def test_decimal_rates_supported_and_rounded(self):
        """Float rates are supported: 7h × 8000.5 = 56003.5, rounded to 2 decimals."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 1),
            hours=7,
            semana_rate=8000.5,
            finde_rate=9000.25,
        )
        assert amount == 56003.5

    def test_inexact_product_is_pinned_to_2_decimals(self):
        """7h × 8000.05 = 56000.3499... → pinned to 56000.35 by round().

        This product is NOT exact in float, so the assertion fails if the
        rounding were ever removed (56000.349999... != 56000.35).
        """
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 1),
            hours=7,
            semana_rate=8000.05,
            finde_rate=9000.25,
        )
        assert amount == 56000.35

    def test_split_override_with_decimal_rates(self):
        """Split override with decimal rates: (8 × 1250.5) + (4 × 9000.25)."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 5),
            hours=12,
            semana_rate=1250.5,
            finde_rate=9000.25,
            weekday_hours=8,
            weekend_hours=4,
        )
        assert amount == (8 * 1250.5) + (4 * 9000.25)

    def test_decimal_feriado_rate(self):
        """Decimal feriado rate on a holiday: 12 × 9500.75."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 5, 25),
            hours=12,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=9500.75,
        )
        assert amount == 12 * 9500.75

    # ===== Holiday rate (feriados argentinos) =====

    def test_weekday_holiday_uses_feriado_rate(self):
        """Monday 2026-05-25 is a national holiday → feriado_rate wins over weekday rule."""
        # Monday 2026-05-25 (weekday() == 0, feriado nacional)
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 5, 25),
            hours=12,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=9000,
        )
        assert amount == 12 * 9000  # 108000

    def test_weekday_holiday_without_feriado_rate_uses_weekday_rule(self):
        """Holiday with no feriado_rate configured → falls back to weekday rule."""
        # Monday 2026-05-25 holiday, no feriado_rate configured
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 5, 25),
            hours=12,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=None,
        )
        assert amount == 12 * 5000  # 60000

    def test_weekend_holiday_uses_feriado_rate(self):
        """Saturday 2026-06-20 is a national holiday → feriado_rate wins over weekend rule."""
        # Saturday 2026-06-20 (weekday() == 5, feriado nacional)
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 20),
            hours=12,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=9000,
        )
        assert amount == 12 * 9000  # 108000

    def test_weekend_holiday_without_feriado_rate_uses_weekend_rule(self):
        """Weekend holiday with no feriado_rate → falls back to weekend rule."""
        # Saturday 2026-06-20 holiday, no feriado_rate configured
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 20),
            hours=12,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=None,
        )
        assert amount == 12 * 8000  # 96000

    def test_regular_weekday_ignores_feriado_rate(self):
        """Non-holiday Tuesday 2026-05-26 ignores feriado_rate entirely."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 5, 26),
            hours=12,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=9000,
        )
        assert amount == 12 * 5000  # 60000

    def test_split_override_wins_over_feriado_rate(self):
        """Explicit split override on a holiday → split wins, feriado_rate not applied."""
        # Monday 2026-05-25 holiday with split override
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 5, 25),
            hours=12,
            semana_rate=5000,
            finde_rate=8000,
            weekday_hours=8,
            weekend_hours=4,
            feriado_rate=9000,
        )
        assert amount == (8 * 5000) + (4 * 8000)  # 72000, NOT 108000
