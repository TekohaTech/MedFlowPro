"""Tests for recalculate_pending_activities — the pending-guardia batch recalc.

The endpoint iterates the user's PENDIENTE guardias from a date and rewrites
each amount with the CURRENT institution rates through
calculate_guardia_amount: full-range records use the medical-day rule,
range-less legacy records fall back to the legacy rule, and corrupt records
(declared range with end <= start) are skipped, not silently recomputed.
"""

import pytest

from app.routers.institutions import recalculate_pending_activities

INSTITUTION_ID = "507f1f77bcf86cd799439011"  # valid ObjectId hex


class FakeActividadesCollection:
    """Minimal async fake for db.actividades (find + update_one)."""

    def __init__(self, docs: list[dict]):
        self.docs = [dict(d) for d in docs]
        self.updated: list[dict] = []

    def find(self, query: dict):
        return _AsyncCursor([d for d in self.docs if _matches(d, query)])

    async def update_one(self, query: dict, update: dict) -> None:
        self.updated.append(dict(update.get("$set", {})))


class _AsyncCursor:
    """Async-iterable wrapper around a plain list, mimicking a Motor cursor."""

    def __init__(self, docs: list[dict]):
        self.docs = docs

    def __aiter__(self):
        async def gen():
            for doc in self.docs:
                yield dict(doc)
        return gen()


def _matches(doc: dict, query: dict) -> bool:
    """Tiny Mongo-style equality + $gte filter (enough for this endpoint)."""
    for key, cond in query.items():
        if isinstance(cond, dict) and "$gte" in cond:
            if not (doc.get(key) or "") >= cond["$gte"]:
                return False
        elif doc.get(key) != cond:
            return False
    return True


class FakeInstitutionCollection:
    """Minimal async fake for db.institutions.find_one."""

    def __init__(self, doc: dict):
        self.doc = dict(doc)

    async def find_one(self, query: dict) -> dict:
        return dict(self.doc)


class FakeDB:
    """Fake database exposing the institutions + actividades collections."""

    def __init__(self, actividades: list[dict], feriado_rate=None):
        self.institutions = FakeInstitutionCollection({
            "_id": INSTITUTION_ID,
            "userId": "user-123",
            "name": "Hospital Test",
            "guardia_semana_rate": 5000,
            "guardia_finde_rate": 8000,
            "guardia_feriado_rate": feriado_rate,
            "is_active": True,
        })
        self.actividades = FakeActividadesCollection(actividades)


def _guardia(**overrides) -> dict:
    doc = {
        "_id": "act-1",
        "userId": "user-123",
        "type": "guardia",
        "institution": "Hospital Test",
        "date": "2026-06-01",
        "amount": 0,
        "status": "pendiente",
        "hours": 12,
        "start_time": None,
        "end_time": None,
        "end_date": None,
    }
    doc.update(overrides)
    return doc


class TestRecalculatePendingActivities:
    """Batch recalc applies the current rates to pending guardias."""

    @pytest.mark.asyncio
    async def test_full_range_uses_medical_day_rule(self):
        """Pending guardia with a full range → recalc uses the medical-day rule.

        Fri 2026-06-05 14:00 → Sat 2026-06-06 14:00 = 18 semana + 6 finde
        → 18 × 5000 + 6 × 8000 = 138000.
        """
        db = FakeDB([_guardia(
            _id="act-range",
            date="2026-06-05",
            hours=24,
            start_time="14:00",
            end_date="2026-06-06",
            end_time="14:00",
        )])
        result = await recalculate_pending_activities(
            INSTITUTION_ID, "2026-01-01", "user-123", db,
        )
        assert result["updated_count"] == 1
        assert db.actividades.updated[0]["amount"] == 138000

    @pytest.mark.asyncio
    async def test_legacy_without_range_falls_back_to_weekday_start_rule(self):
        """Legacy record without range → legacy rule, no crash.

        Monday 2026-06-01, 12h, no range and no split → 12 × 5000 = 60000.
        """
        db = FakeDB([_guardia(date="2026-06-01", hours=12)])
        result = await recalculate_pending_activities(
            INSTITUTION_ID, "2026-01-01", "user-123", db,
        )
        assert result["updated_count"] == 1
        assert db.actividades.updated[0]["amount"] == 12 * 5000

    @pytest.mark.asyncio
    async def test_legacy_split_override_wins(self):
        """Legacy record carrying an explicit weekday/weekend split → split wins."""
        db = FakeDB([_guardia(
            date="2026-06-05",
            hours=12,
            weekday_hours=8,
            weekend_hours=4,
        )])
        result = await recalculate_pending_activities(
            INSTITUTION_ID, "2026-01-01", "user-123", db,
        )
        assert result["updated_count"] == 1
        assert db.actividades.updated[0]["amount"] == (8 * 5000) + (4 * 8000)

    @pytest.mark.asyncio
    async def test_feriado_and_finde_in_range(self):
        """Range spanning a holiday AND a weekend day.

        Sat 2026-06-20 (holiday) 08:00 → Mon 2026-06-22 08:00:
        24 feriado (Sat medical day) + 24 finde (Sun medical day)
        → 24 × 9000 + 24 × 8000 = 408000.
        """
        db = FakeDB(
            [_guardia(
                _id="act-hol",
                date="2026-06-20",
                hours=48,
                start_time="08:00",
                end_date="2026-06-22",
                end_time="08:00",
            )],
            feriado_rate=9000,
        )
        result = await recalculate_pending_activities(
            INSTITUTION_ID, "2026-01-01", "user-123", db,
        )
        assert result["updated_count"] == 1
        assert db.actividades.updated[0]["amount"] == (24 * 9000) + (24 * 8000)

    @pytest.mark.asyncio
    async def test_corrupt_range_is_skipped_not_fallback(self):
        """Record with a declared-but-backwards range (end <= start) is skipped.

        The old silent fallback applied the legacy weekday-start rule here;
        the new behavior skips the record and keeps its stored amount.
        """
        db = FakeDB([_guardia(
            _id="act-corrupt",
            date="2026-06-05",
            hours=24,
            start_time="14:00",
            end_date="2026-06-05",  # same day, earlier time → end <= start
            end_time="08:00",
        )])
        result = await recalculate_pending_activities(
            INSTITUTION_ID, "2026-01-01", "user-123", db,
        )
        assert result["updated_count"] == 0
        assert db.actividades.updated == []

    @pytest.mark.asyncio
    async def test_mixed_batch_updates_valid_and_skips_corrupt(self):
        """One valid + one corrupt record: valid is updated, corrupt is skipped."""
        db = FakeDB([
            _guardia(_id="act-ok", date="2026-06-05", hours=24,
                     start_time="14:00", end_date="2026-06-06", end_time="14:00"),
            _guardia(_id="act-bad", date="2026-06-06", hours=24,
                     start_time="14:00", end_date="2026-06-06", end_time="08:00"),
        ])
        result = await recalculate_pending_activities(
            INSTITUTION_ID, "2026-01-01", "user-123", db,
        )
        assert result["updated_count"] == 1
        assert len(db.actividades.updated) == 1
        assert db.actividades.updated[0]["amount"] == 138000

    @pytest.mark.asyncio
    async def test_from_date_filters_older_guardias(self):
        """Guardias before from_date are NOT recalculated."""
        db = FakeDB([
            _guardia(_id="act-old", date="2025-12-01", hours=12),
            _guardia(_id="act-new", date="2026-06-01", hours=12),
        ])
        result = await recalculate_pending_activities(
            INSTITUTION_ID, "2026-01-01", "user-123", db,
        )
        assert result["updated_count"] == 1
        assert db.actividades.updated[0]["amount"] == 12 * 5000
        assert len(db.actividades.updated) == 1
