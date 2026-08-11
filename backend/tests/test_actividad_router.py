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
