"""Tests for crear_actividad — amount sentinel semantics.

0 is a VALID stored amount (e.g. a holiday with a configured feriado_rate of 0).
The old `amount is None or amount == 0` sentinel recomputed a computed 0 from
the manual hourly_rate, causing a display/stored mismatch. Only `amount is
None` means "not calculated → compute from rates".
"""

import pytest

from app.models.actividad import ActividadCreate, ActivityType
from app.routers.actividades import crear_actividad

INSTITUTION_ID = "507f1f77bcf86cd799439011"  # valid ObjectId hex


class FakeInstitutionCollection:
    """Minimal async fake for db.institutions.find_one."""

    def __init__(self, doc: dict | None):
        self.doc = dict(doc) if doc is not None else None

    async def find_one(self, query: dict) -> dict | None:
        return None if self.doc is None else dict(self.doc)


class FakeActividadesCollection:
    """Minimal async fake for db.actividades.insert_one."""

    def __init__(self):
        self.doc = None

    async def insert_one(self, doc: dict):
        self.doc = dict(doc)
        return _InsertResult(inserted_id=doc.get("_id", INSTITUTION_ID))


class _InsertResult:
    """Mimics pymongo's InsertOneResult (router reads .inserted_id)."""

    def __init__(self, inserted_id: str):
        self.inserted_id = inserted_id


class FakeDB:
    def __init__(self, feriado_rate):
        self.institutions = FakeInstitutionCollection({
            "_id": INSTITUTION_ID,
            "userId": "user-123",
            "name": "Hospital Test",
            "guardia_semana_rate": 5000,
            "guardia_finde_rate": 8000,
            "guardia_feriado_rate": feriado_rate,
            "is_active": True,
        })
        self.actividades = FakeActividadesCollection()


class FakeDBNoRates:
    """Institution with NO configured rates — Path B bug fixture.

    The old `semana_rate or 0` coercion in calculate_guardia_amount turned a
    missing rate into 0 and recomputed the amount to 0, stomping the client's
    manual amount. This fake mirrors an institution where the user never
    configured any rate.
    """

    def __init__(self):
        self.institutions = FakeInstitutionCollection({
            "_id": INSTITUTION_ID,
            "userId": "user-123",
            "name": "Hospital Test",
            "is_active": True,
            # No guardia_semana_rate / guardia_finde_rate / guardia_feriado_rate.
        })
        self.actividades = FakeActividadesCollection()


class TestGuardiaAmountSentinel:
    """0 is a valid stored amount; the sentinel must never recompute an explicit 0.

    ActividadBase.amount is a required float (ge=0), so the API only ever
    receives explicit amounts — `amount is None` is a defensive branch that
    survives schema changes but is unreachable through Pydantic. The bug this
    guards: frontend previews a holiday with feriado_rate=0 as amount=0, and
    the old `amount is None or amount == 0` sentinel recomputed it from
    hourly_rate (12 × 9000 = 108000).
    """

    @pytest.mark.asyncio
    async def test_holiday_with_feriado_rate_zero_stores_zero(self):
        """Holiday + feriado_rate=0 → stored amount is 0, NOT recomputed from hourly_rate.

        Regression: the backend computes 0 via calculate_guardia_amount, but
        the old sentinel treated that computed 0 as "not calculated" and
        stored hours × hourly_rate instead.
        """
        db = FakeDB(feriado_rate=0)
        actividad = ActividadCreate(
            type=ActivityType.GUARDIA,
            institution="Hospital Test",
            date="2026-05-25",  # lunes feriado nacional
            amount=0,
            hours=12,
            hourly_rate=9000,  # would win under the old sentinel
        )
        result = await crear_actividad(actividad, "user-123", db)
        assert result["amount"] == 0

    @pytest.mark.asyncio
    async def test_backend_recomputes_from_rates_when_institution_known(self):
        """Known institution → backend is authoritative: client's advisory
        amount (the UI preview) is overwritten by calculate_guardia_amount."""
        db = FakeDB(feriado_rate=9000)
        actividad = ActividadCreate(
            type=ActivityType.GUARDIA,
            institution="Hospital Test",
            date="2026-05-25",  # lunes feriado nacional
            amount=0,  # client preview, advisory only
            hours=12,
        )
        result = await crear_actividad(actividad, "user-123", db)
        assert result["amount"] == 12 * 9000  # 108000

    @pytest.mark.asyncio
    async def test_unknown_institution_preserves_explicit_zero(self):
        """Unknown institution + amount=0 → stored 0, NOT hours × hourly_rate.

        The old sentinel recomputed an explicit 0 even when there was no
        institution to derive a rate from.
        """
        db = FakeDB(feriado_rate=9000)
        db.institutions.doc = None  # unknown institution
        actividad = ActividadCreate(
            type=ActivityType.GUARDIA,
            institution="Inst Desconocida",
            date="2026-05-26",
            amount=0,
            hours=8,
            hourly_rate=7000.5,
        )
        result = await crear_actividad(actividad, "user-123", db)
        assert result["amount"] == 0

    @pytest.mark.asyncio
    async def test_none_amount_falls_back_to_hourly_rate(self):
        """Defensive branch (unreachable via Pydantic: amount is required):
        None means "not calculated" → hours × hourly_rate, rounded."""
        db = FakeDB(feriado_rate=9000)
        db.institutions.doc = None  # unknown institution
        actividad = ActividadCreate.model_construct(
            type=ActivityType.GUARDIA,
            institution="Inst Desconocida",
            date="2026-05-26",
            amount=None,
            hours=8,
            hourly_rate=7000.5,
        )
        result = await crear_actividad(actividad, "user-123", db)
        assert result["amount"] == round(8 * 7000.5, 2)


class TestLongGuardiaContract:
    """72h+ guardias are accepted through the full create contract.

    Regression: the frontend removed its 48h cap, so the UI advertises
    amounts for 72h+ guardias that the backend used to reject with 422 at
    the model layer. The 720h bound that replaced the cap is an anti-DoS
    guard for the per-hour classifier, NOT a business limit.
    """

    @pytest.mark.asyncio
    async def test_72h_guardia_with_holiday_inside_is_accepted(self):
        """72h guardia (Wed 08:00 → Sat 08:00, Thu 07-09 holiday inside) is
        accepted end-to-end and the stored amount uses the medical-day split.

        Wed med day (24 weekday) + Thu holiday (24 feriado) + Fri med day
        (24 weekday) = (24 × 5000) + (24 × 9000) + (24 × 5000) = 456000.
        """
        db = FakeDB(feriado_rate=9000)
        actividad = ActividadCreate(
            type=ActivityType.GUARDIA,
            institution="Hospital Test",
            date="2026-07-08",  # miércoles, antes del feriado del jueves
            amount=0,
            hours=72,
            start_time="08:00",
            end_date="2026-07-11",
            end_time="08:00",
        )
        result = await crear_actividad(actividad, "user-123", db)
        assert result["amount"] == (24 * 5000) + (24 * 9000) + (24 * 5000)  # 456000

    @pytest.mark.asyncio
    async def test_96h_guardia_is_accepted_through_route(self):
        """96h guardia passes model validation and reaches the route."""
        db = FakeDB(feriado_rate=9000)
        actividad = ActividadCreate(
            type=ActivityType.GUARDIA,
            institution="Hospital Test",
            date="2026-06-05",  # viernes
            amount=0,
            hours=96,
            start_time="08:00",
            end_date="2026-06-09",
            end_time="08:00",
        )
        result = await crear_actividad(actividad, "user-123", db)
        assert result["hours"] == 96


class TestInstitutionWithoutRates:
    """Path B regression: institution known but WITHOUT configured rates.

    Bug protected: when guardia_semana_rate / guardia_finde_rate /
    guardia_feriado_rate were all absent, calculate_guardia_amount coerced
    each `None` to 0 via `semana_rate or 0` (backend/app/routers/actividades.py
    calculate_guardia_amount body) and recomputed the amount to 0, stomping the
    client-sent manual amount (e.g. 12h × $5.000 manual → stored 0).

    Fix in crear_actividad: when all three rates are None, do NOT call
    calculate_guardia_amount — respect the client-sent amount. The manual
    fallback (amount is None → hours × hourly_rate) remains for the
    amount=None edge case.
    """

    @pytest.mark.asyncio
    async def test_known_institution_without_rates_respects_client_amount(self):
        """Institution known but rate-less + client amount=60000 → stored 60000.

        Regression: the old code ran calculate_guardia_amount anyway, which
        coerced the missing rates to 0 and overwrote 60000 with 0.
        """
        db = FakeDBNoRates()
        actividad = ActividadCreate(
            type=ActivityType.GUARDIA,
            institution="Hospital Test",
            date="2026-05-26",  # martes
            amount=60000,  # 12h × $5.000 manual
            hours=12,
            hourly_rate=5000,
        )
        result = await crear_actividad(actividad, "user-123", db)
        assert result["amount"] == 60000
        # Verify the stored doc carries the preserved amount (not 0).
        assert db.actividades.doc["amount"] == 60000

    @pytest.mark.asyncio
    async def test_known_institution_without_rates_and_none_amount_uses_manual_fallback(self):
        """Rate-less institution + amount=None → hours × hourly_rate fallback.

        The manual fallback (amount is None) still applies even when the
        institution is rate-less: 12 × 5000 = 60000.
        """
        db = FakeDBNoRates()
        actividad = ActividadCreate.model_construct(
            type=ActivityType.GUARDIA,
            institution="Hospital Test",
            date="2026-05-26",  # martes
            amount=None,  # not calculated
            hours=12,
            hourly_rate=5000,
        )
        result = await crear_actividad(actividad, "user-123", db)
        assert result["amount"] == round(12 * 5000, 2)  # 60000.0

    @pytest.mark.asyncio
    async def test_known_institution_without_rates_preserves_explicit_zero(self):
        """Rate-less institution + amount=0 → stored 0, NOT hours × hourly_rate.

        The `amount is None` sentinel must NOT recompute an explicit 0; a
        hand-entered 0 is a valid amount (e.g. unpaid training shift).
        """
        db = FakeDBNoRates()
        actividad = ActividadCreate(
            type=ActivityType.GUARDIA,
            institution="Hospital Test",
            date="2026-05-26",
            amount=0,
            hours=12,
            hourly_rate=5000,
        )
        result = await crear_actividad(actividad, "user-123", db)
        assert result["amount"] == 0


class TestInstitutionWithRatesStillAuthoritative:
    """Path A regression: institution WITH ≥1 rate must still recompute.

    The Path B fix added a `all rates None` guard around calculate_guardia_amount.
    This guards that the guard does NOT accidentally skip recomputation when at
    least one rate IS configured (e.g. only feriado_rate set).
    """

    @pytest.mark.asyncio
    async def test_only_feriado_rate_configured_recomputes_on_holiday(self):
        """Institution with ONLY guardia_feriado_rate → backend still recomputes."""
        # Custom fake: only the feriado rate is set (weekday/weekend absent).
        db = FakeDB.__new__(FakeDB)
        db.institutions = FakeInstitutionCollection({
            "_id": INSTITUTION_ID,
            "userId": "user-123",
            "name": "Hospital Test",
            "guardia_feriado_rate": 9000,
            "is_active": True,
            # No guardia_semana_rate / guardia_finde_rate.
        })
        db.actividades = FakeActividadesCollection()
        actividad = ActividadCreate(
            type=ActivityType.GUARDIA,
            institution="Hospital Test",
            date="2026-05-25",  # lunes feriado nacional
            amount=0,  # advisory preview, overwritten by backend
            hours=12,
        )
        result = await crear_actividad(actividad, "user-123", db)
        # 12h × 9000 (feriado) = 108000 — backend is authoritative.
        assert result["amount"] == 12 * 9000
