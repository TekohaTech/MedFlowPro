"""Tests for es_feriado() — Argentine national holidays."""

from datetime import date, datetime
from app.data.feriados import es_feriado


class TestEsFeriado:
    """es_feriado() pure function — national holiday detection."""

    def test_known_holiday_is_true(self):
        """Monday 2026-05-25 (Revolución de Mayo) is a holiday."""
        assert es_feriado(date(2026, 5, 25)) is True

    def test_regular_day_is_false(self):
        """Tuesday 2026-05-26 is a regular working day."""
        assert es_feriado(date(2026, 5, 26)) is False

    def test_accepts_datetime_with_time(self):
        """A datetime with a time component still resolves to its date."""
        assert es_feriado(datetime(2026, 1, 1, 10, 30)) is True

    def test_weekend_holiday_is_true(self):
        """Saturday 2026-06-20 (Paso a la Inmortalidad de Belgrano) is a holiday."""
        assert es_feriado(date(2026, 6, 20)) is True

    def test_unknown_date_is_false(self):
        """December 31 is not a holiday."""
        assert es_feriado(date(2026, 12, 31)) is False

    def test_trasladado_guemes_lunes_15_de_junio(self):
        """Monday 2026-06-15 (Güemes trasladado al lunes 15) is a holiday."""
        assert es_feriado(date(2026, 6, 15)) is True

    def test_2026_11_20_is_a_regular_friday(self):
        """Friday 2026-11-20 is NOT a holiday (soberanía moved to Monday 23)."""
        assert es_feriado(date(2026, 11, 20)) is False

    def test_trasladado_soberania_lunes_23_de_noviembre(self):
        """Monday 2026-11-23 (Soberanía trasladado al lunes 23) is a holiday."""
        assert es_feriado(date(2026, 11, 23)) is True

    def test_accepts_iso_string_with_time(self):
        """An ISO string with time component (YYYY-MM-DDTHH:MM:SS) resolves to its date."""
        assert es_feriado("2026-05-25T10:30:00") is True
        assert es_feriado("2026-05-26T23:59:59") is False
