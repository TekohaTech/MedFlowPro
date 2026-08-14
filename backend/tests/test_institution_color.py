"""Tests for the institution color contract — create, update and reactivate flows."""

from types import SimpleNamespace

import pytest

from app.models.institution import InstitutionCreate, InstitutionUpdate
from app.routers.institutions import create_institution, update_institution

INSTITUTION_ID = "507f1f77bcf86cd799439011"  # valid ObjectId hex
NEW_INSTITUTION_ID = "507f1f77bcf86cd799439012"


class FakeInstitutionCollection:
    """Minimal async fake for db.institutions (find_one/update_one/insert_one).

    Mirrors the FakeInstitutionCollection style in test_institution_update.py,
    extended with insert_one for the create/reactivate flows and is_active-aware
    find_one so the router's active/inactive lookups behave correctly.
    """

    def __init__(self, doc=None):
        self.doc = dict(doc) if doc else None

    async def find_one(self, query: dict):
        if self.doc is None:
            return None
        is_active_q = query.get("is_active")
        if is_active_q is not None and self.doc.get("is_active") is not is_active_q:
            return None
        return dict(self.doc)

    async def update_one(self, query: dict, update: dict) -> None:
        for key, value in update.get("$set", {}).items():
            self.doc[key] = value

    async def insert_one(self, doc: dict):
        self.doc = dict(doc)
        return SimpleNamespace(inserted_id=NEW_INSTITUTION_ID)


class FakeDB:
    """Fake database exposing the institutions collection."""

    def __init__(self, doc=None):
        self.institutions = FakeInstitutionCollection(doc)


def base_doc(**overrides):
    doc = {
        "_id": INSTITUTION_ID,
        "userId": "user-123",
        "name": "Hospital Test",
        "color": "#ef4444",
        "is_active": True,
    }
    doc.update(overrides)
    return doc


class TestUpdateColorContract:
    """PUT semantics: omitted color is preserved, explicit null clears it."""

    @pytest.mark.asyncio
    async def test_put_without_color_preserves_stored_color(self):
        """PUT {guardia_feriado_rate: 5000} on an institution with a color → color untouched."""
        db = FakeDB(base_doc())
        updated = await update_institution(
            INSTITUTION_ID,
            InstitutionUpdate(guardia_feriado_rate=5000),
            "user-123",
            db,
        )
        assert updated["color"] == "#ef4444"
        assert db.institutions.doc["color"] == "#ef4444"

    @pytest.mark.asyncio
    async def test_put_with_explicit_null_clears_color(self):
        """PUT {color: null} → 200, color cleared back to unset."""
        db = FakeDB(base_doc())
        updated = await update_institution(
            INSTITUTION_ID,
            InstitutionUpdate(color=None),
            "user-123",
            db,
        )
        assert updated["color"] is None
        assert db.institutions.doc["color"] is None

    @pytest.mark.asyncio
    async def test_put_with_new_color_updates_it(self):
        """PUT {color: '#3b82f6'} → 200, color updated."""
        db = FakeDB(base_doc())
        updated = await update_institution(
            INSTITUTION_ID,
            InstitutionUpdate(color="#3b82f6"),
            "user-123",
            db,
        )
        assert updated["color"] == "#3b82f6"
        assert db.institutions.doc["color"] == "#3b82f6"


class TestCreateColorContract:
    """POST create stores color; reactivate keeps or updates the stored color."""

    @pytest.mark.asyncio
    async def test_create_stores_color(self):
        """POST with color on a fresh name → 201, color persisted."""
        db = FakeDB(None)  # no existing institution with this name
        created = await create_institution(
            InstitutionCreate(name="Nuevo Hospital", color="#22c55e"),
            "user-123",
            db,
        )
        assert created["color"] == "#22c55e"
        assert db.institutions.doc["color"] == "#22c55e"

    @pytest.mark.asyncio
    async def test_reactivate_updates_stored_color_when_provided(self):
        """POST same name on an INACTIVE institution with a new color → color updated."""
        db = FakeDB(base_doc(is_active=False))
        updated = await create_institution(
            InstitutionCreate(name="Hospital Test", color="#8b5cf6"),
            "user-123",
            db,
        )
        assert updated["is_active"] is True
        assert updated["color"] == "#8b5cf6"
        assert db.institutions.doc["color"] == "#8b5cf6"

    @pytest.mark.asyncio
    async def test_reactivate_without_color_keeps_stored_color(self):
        """POST same name on an INACTIVE institution omitting color → stored color preserved."""
        db = FakeDB(base_doc(is_active=False))
        updated = await create_institution(
            InstitutionCreate(name="Hospital Test"),
            "user-123",
            db,
        )
        assert updated["is_active"] is True
        assert updated["color"] == "#ef4444"
        assert db.institutions.doc["color"] == "#ef4444"
