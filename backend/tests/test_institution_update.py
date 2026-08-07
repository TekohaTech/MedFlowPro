"""Tests for update_institution — explicit null clears a rate, empty body → 400."""

import pytest
from fastapi import HTTPException

from app.models.institution import InstitutionUpdate
from app.routers.institutions import update_institution

INSTITUTION_ID = "507f1f77bcf86cd799439011"  # valid ObjectId hex


class FakeInstitutionCollection:
    """Minimal async fake for db.institutions (find_one + update_one)."""

    def __init__(self, doc: dict):
        self.doc = dict(doc)

    async def find_one(self, query: dict) -> dict:
        return dict(self.doc)

    async def update_one(self, query: dict, update: dict) -> None:
        for key, value in update.get("$set", {}).items():
            self.doc[key] = value


class FakeDB:
    """Fake database exposing the institutions collection."""

    def __init__(self, feriado_rate):
        self.institutions = FakeInstitutionCollection({
            "_id": INSTITUTION_ID,
            "userId": "user-123",
            "name": "Hospital Test",
            "guardia_semana_rate": 5000,
            "guardia_feriado_rate": feriado_rate,
            "is_active": True,
        })


class TestUpdateInstitutionNullSemantics:
    """PUT semantics: explicit null clears a rate, empty body is rejected."""

    @pytest.mark.asyncio
    async def test_explicit_null_clears_existing_rate(self):
        """PUT {guardia_feriado_rate: null} on a rate that IS set → 200, rate null."""
        db = FakeDB(feriado_rate=9000)
        updated = await update_institution(
            INSTITUTION_ID,
            InstitutionUpdate(guardia_feriado_rate=None),
            "user-123",
            db,
        )
        assert updated["guardia_feriado_rate"] is None
        assert db.institutions.doc["guardia_feriado_rate"] is None

    @pytest.mark.asyncio
    async def test_empty_body_raises_400(self):
        """PUT {} → 400 'No hay campos para actualizar'."""
        db = FakeDB(feriado_rate=9000)
        with pytest.raises(HTTPException) as exc:
            await update_institution(
                INSTITUTION_ID,
                InstitutionUpdate(),
                "user-123",
                db,
            )
        assert exc.value.status_code == 400
        assert "No hay campos" in exc.value.detail

    @pytest.mark.asyncio
    async def test_name_null_is_dropped_and_raises_400(self):
        """PUT {name: null} → name guard drops it, body is empty → 400."""
        db = FakeDB(feriado_rate=9000)
        with pytest.raises(HTTPException) as exc:
            await update_institution(
                INSTITUTION_ID,
                InstitutionUpdate(name=None),
                "user-123",
                db,
            )
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_set_rate_returns_value(self):
        """PUT {guardia_feriado_rate: 5000} → 200, response carries the value."""
        db = FakeDB(feriado_rate=9000)
        updated = await update_institution(
            INSTITUTION_ID,
            InstitutionUpdate(guardia_feriado_rate=5000),
            "user-123",
            db,
        )
        assert updated["guardia_feriado_rate"] == 5000
        assert db.institutions.doc["guardia_feriado_rate"] == 5000

    @pytest.mark.asyncio
    async def test_zero_rate_is_honored(self):
        """PUT {guardia_feriado_rate: 0} → 200, zero is a valid configured rate."""
        db = FakeDB(feriado_rate=None)
        updated = await update_institution(
            INSTITUTION_ID,
            InstitutionUpdate(guardia_feriado_rate=0),
            "user-123",
            db,
        )
        assert updated["guardia_feriado_rate"] == 0
