"""Tests for guardia rate calculation — weekday-start rule and override split."""

from datetime import datetime
from app.routers.actividades import calculate_guardia_amount, classify_guardia_hours


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


class TestGuardiaAmountByMedicalDay:
    """New official rule: hours classified by medical day (08:00 → 08:00).

    Each hour of the guardia belongs to the medical day where it falls
    (08:00 → 08:00 of the next day; hours 00:00-08:00 belong to the previous
    day's medical day) and is classified as feriado (max priority), finde
    (Sat/Sun) or semana (Mon-Fri). Activated when the full range
    (start_time + end_date + end_time) is provided.
    """

    def test_case_a_friday_8am_to_saturday_8am_all_weekday(self):
        """Case a: 24h guardia Fri 08:00 → Sat 08:00 = 24 weekday hours."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 5),  # Friday
            hours=24,
            semana_rate=5000,
            finde_rate=8000,
            start_time="08:00",
            end_date="2026-06-06",
            end_time="08:00",
        )
        assert amount == 24 * 5000  # 120000

    def test_case_b_saturday_8am_to_sunday_8am_all_weekend(self):
        """Case b: 24h guardia Sat 08:00 → Sun 08:00 = 24 weekend hours."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 6),  # Saturday
            hours=24,
            semana_rate=5000,
            finde_rate=8000,
            start_time="08:00",
            end_date="2026-06-07",
            end_time="08:00",
        )
        assert amount == 24 * 8000  # 192000

    def test_case_c_holiday_8am_to_next_8am_all_holiday(self):
        """Case c: 24h guardia on a national holiday = 24 holiday hours."""
        # Monday 2026-05-25 (feriado nacional)
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 5, 25),
            hours=24,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=9000,
            start_time="08:00",
            end_date="2026-05-26",
            end_time="08:00",
        )
        assert amount == 24 * 9000  # 216000

    def test_case_d_48h_holiday_then_weekday(self):
        """Case d: 48h holiday 08:00 → weekday 08:00 = 24 feriado + 24 semana.

        Validated expected value: 568000.8 (NOT 48 × 6666.7 = 320001.6).
        """
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 5, 25),  # Monday holiday
            hours=48,
            semana_rate=17000,
            finde_rate=19000,
            feriado_rate=6666.7,
            start_time="08:00",
            end_date="2026-05-27",
            end_time="08:00",
        )
        assert amount == 568000.8

    def test_case_e_friday_14h_to_saturday_14h_split(self):
        """Case e: 24h Fri 14:00 → Sat 14:00 = 18 weekday + 6 weekend.

        18 weekday = Fri 14-24 (10h) + Sat 0-8 (8h, Friday's medical day).
        6 weekend = Sat 8-14 (Saturday's medical day).
        """
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 5),  # Friday
            hours=24,
            semana_rate=5000,
            finde_rate=8000,
            start_time="14:00",
            end_date="2026-06-06",
            end_time="14:00",
        )
        assert amount == (18 * 5000) + (6 * 8000)  # 138000

    def test_holiday_on_weekend_counts_as_feriado(self):
        """Holiday on Saturday → feriado wins over finde (feriado > finde)."""
        # Saturday 2026-06-20 (feriado nacional)
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 20),
            hours=24,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=9000,
            start_time="08:00",
            end_date="2026-06-21",
            end_time="08:00",
        )
        assert amount == 24 * 9000  # 216000, NOT 24 * 8000

    def test_holiday_without_feriado_rate_falls_back_to_weekday_rule(self):
        """Holiday with no feriado_rate → holiday hours use weekday/weekend rule."""
        # Monday 2026-05-25 holiday, feriado_rate not configured
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 5, 25),
            hours=24,
            semana_rate=5000,
            finde_rate=8000,
            start_time="08:00",
            end_date="2026-05-26",
            end_time="08:00",
        )
        assert amount == 24 * 5000  # 120000

    def test_hours_0000_to_0800_belong_to_previous_medical_day(self):
        """Sat 00:00 → Sun 00:00: 00-08h → Friday's medical day (weekday)."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 6),  # Saturday
            hours=24,
            semana_rate=5000,
            finde_rate=8000,
            start_time="00:00",
            end_date="2026-06-07",
            end_time="00:00",
        )
        assert amount == (8 * 5000) + (16 * 8000)  # 40000 + 128000 = 168000

    def test_three_medical_days_fri_8am_to_sun_8am(self):
        """48h Fri 08:00 → Sun 08:00 = 24 semana + 24 finde.

        Friday's medical day covers Fri 08:00 → Sat 08:00 (weekday) and
        Saturday's medical day covers Sat 08:00 → Sun 08:00 (weekend).
        """
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 5),  # Friday
            hours=48,
            semana_rate=5000,
            finde_rate=8000,
            start_time="08:00",
            end_date="2026-06-07",
            end_time="08:00",
        )
        assert amount == (24 * 5000) + (24 * 8000)  # 120000 + 192000 = 312000


class TestClassifyGuardiaHours:
    """classify_guardia_hours() pure function — medical day split."""

    def test_case_e_split(self):
        split = classify_guardia_hours(
            datetime(2026, 6, 5, 14, 0),  # Friday 14:00
            datetime(2026, 6, 6, 14, 0),  # Saturday 14:00
        )
        assert split == {"weekday_hours": 18, "weekend_hours": 6, "feriado_hours": 0}

    def test_case_d_split(self):
        split = classify_guardia_hours(
            datetime(2026, 5, 25, 8, 0),  # Monday holiday 08:00
            datetime(2026, 5, 27, 8, 0),  # Wednesday 08:00
        )
        assert split == {"weekday_hours": 24, "weekend_hours": 0, "feriado_hours": 24}

    def test_holiday_on_weekend_has_feriado_priority(self):
        split = classify_guardia_hours(
            datetime(2026, 6, 20, 8, 0),  # Saturday holiday
            datetime(2026, 6, 21, 8, 0),
        )
        assert split == {"weekday_hours": 0, "weekend_hours": 0, "feriado_hours": 24}

    def test_no_feriado_bucket_when_holidays_as_feriado_false(self):
        """Holiday hours fall into their underlying weekday/weekend bucket."""
        split = classify_guardia_hours(
            datetime(2026, 5, 25, 8, 0),  # Monday holiday
            datetime(2026, 5, 26, 8, 0),
            holidays_as_feriado=False,
        )
        assert split == {"weekday_hours": 24, "weekend_hours": 0, "feriado_hours": 0}

    def test_three_medical_days_fri_8am_to_sun_8am(self):
        """Fri 08:00 → Sun 08:00 = 24 weekday (Fri med day) + 24 weekend (Sat med day)."""
        split = classify_guardia_hours(
            datetime(2026, 6, 5, 8, 0),  # Friday
            datetime(2026, 6, 7, 8, 0),  # Sunday
        )
        assert split == {"weekday_hours": 24, "weekend_hours": 24, "feriado_hours": 0}


class TestLongGuardiasCrossingHolidays:
    """Long guardias (72h+) crossing national holidays — medical-day split.

    Mirrors the frontend 'guardias largas que cruzan feriados' cases. No 2026
    holiday falls on a Wednesday, so the "start before a holiday with it
    inside" template uses the real Thursday holiday 2026-07-09 (Wed → Sat).
    """

    def test_72h_starting_before_holiday_with_holiday_inside(self):
        """Wed 2026-07-08 08:00 → Sat 2026-07-11 08:00 with Thu 07-09 holiday.

        24 weekday (Wed med day) + 24 feriado (Thu holiday) + 24 weekday
        (Fri med day) = 456000.
        """
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 7, 8),  # Wednesday
            hours=72,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=9000,
            start_time="08:00",
            end_date="2026-07-11",
            end_time="08:00",
        )
        assert amount == (24 * 5000) + (24 * 9000) + (24 * 5000)  # 456000

    def test_24h_on_monday_holiday(self):
        """Monday 2026-05-25 holiday → 24 × feriado_rate."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 5, 25),  # Monday holiday
            hours=24,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=9000,
            start_time="08:00",
            end_date="2026-05-26",
            end_time="08:00",
        )
        assert amount == 24 * 9000  # 216000

    def test_weekend_holiday_feriado_wins_over_finde(self):
        """Saturday 2026-06-20 holiday → feriado wins over finde (24 × feriado)."""
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 20),  # Saturday holiday
            hours=24,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=9000,
            start_time="08:00",
            end_date="2026-06-21",
            end_time="08:00",
        )
        assert amount == 24 * 9000  # 216000, NOT 24 * 8000

    def test_holiday_without_feriado_rate_falls_back_in_long_range(self):
        """Fri 2026-06-19 08:00 → Mon 2026-06-22 08:00, Sat 06-20 holiday with
        no feriado_rate: holiday hours fall back to the weekend bucket.

        24 weekday (Fri med day) + 24 weekend (Sat holiday → weekend) + 24
        weekend (Sun med day) = 504000.
        """
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 19),  # Friday
            hours=72,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=None,
            start_time="08:00",
            end_date="2026-06-22",
            end_time="08:00",
        )
        assert amount == (24 * 5000) + (48 * 8000)  # 504000

    def test_72h_touching_all_three_factors_weekday_feriado_weekend(self):
        """Fri 2026-06-19 08:00 → Mon 2026-06-22 08:00, Sat 06-20 holiday with
        feriado_rate configured: each factor bills at its own rate.

        24 weekday (Fri med day) + 24 feriado (Sat holiday) + 24 weekend
        (Sun med day) = 24×5000 + 24×9000 + 24×8000 = 528000.
        Mirrors frontend 'guardias largas que cruzan feriados' case at
        frontend/lib/guardiaHours.test.ts:122.
        """
        amount = calculate_guardia_amount(
            start_date=datetime(2026, 6, 19),  # Friday
            hours=72,
            semana_rate=5000,
            finde_rate=8000,
            feriado_rate=9000,
            start_time="08:00",
            end_date="2026-06-22",
            end_time="08:00",
        )
        assert amount == (24 * 5000) + (24 * 9000) + (24 * 8000)  # 528000
