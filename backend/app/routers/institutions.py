from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime
import logging

from app.models.institution import InstitutionCreate, InstitutionUpdate, InstitutionResponse
from app.models.actividad import PaymentStatus
from app.core.security import decode_token
from app.core.object_id_utils import safe_object_id
from app.db.mongo import get_database
from app.routers.actividades import calculate_guardia_amount

router = APIRouter(prefix="/api/institutions", tags=["🏥 Instituciones"])
logger = logging.getLogger(__name__)
security = HTTPBearer()


async def get_current_user_id(credentials = Depends(security)) -> str:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(401, detail="Token inválido")
    return payload.get("sub")


@router.get("/", response_model=List[InstitutionResponse])
async def list_institutions(
    active_only: bool = True,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {"userId": user_id}
    if active_only:
        query["is_active"] = True

    institutions = []
    async for doc in db.institutions.find(query).sort("name", 1):
        doc["_id"] = str(doc["_id"])
        institutions.append(doc)
    return institutions


@router.post("/", response_model=InstitutionResponse, status_code=201)
async def create_institution(
    data: InstitutionCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    active = await db.institutions.find_one({"userId": user_id, "name": data.name, "is_active": True})
    if active:
        raise HTTPException(400, detail="Ya existe una institución activa con ese nombre")

    inactive = await db.institutions.find_one({"userId": user_id, "name": data.name, "is_active": False})
    if inactive:
        # Reactivar con las nuevas tarifas (y color, preservando el guardado
        # cuando el payload no lo incluye — mismo contrato que los rates).
        update_data = {
            "guardia_rate": data.guardia_rate,
            "guardia_semana_rate": data.guardia_semana_rate,
            "guardia_finde_rate": data.guardia_finde_rate,
            "guardia_feriado_rate": data.guardia_feriado_rate,
            "procedimiento_rate": data.procedimiento_rate,
            "interconsulta_rate": data.interconsulta_rate,
            "color": data.color or inactive.get("color"),
            "is_active": True,
            "updated_at": datetime.utcnow(),
        }
        await db.institutions.update_one({"_id": inactive["_id"]}, {"$set": update_data})
        updated = await db.institutions.find_one({"_id": inactive["_id"]})
        updated["_id"] = str(updated["_id"])
        logger.info(f"✅ Institución reactivada: {data.name}")
        return updated

    doc = {
        "userId": user_id,
        "name": data.name,
        "color": data.color,
        "guardia_rate": data.guardia_rate,
        "guardia_semana_rate": data.guardia_semana_rate,
        "guardia_finde_rate": data.guardia_finde_rate,
        "guardia_feriado_rate": data.guardia_feriado_rate,
        "procedimiento_rate": data.procedimiento_rate,
        "interconsulta_rate": data.interconsulta_rate,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db.institutions.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    logger.info(f"✅ Institución creada: {data.name}")
    return doc


@router.put("/{institution_id}", response_model=InstitutionResponse)
async def update_institution(
    institution_id: str,
    data: InstitutionUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    target = await db.institutions.find_one({"_id": safe_object_id(institution_id), "userId": user_id})

    if not target:
        raise HTTPException(404, detail="Institución no encontrada")

    # exclude_unset keeps explicit nulls so a rate can be cleared back to unset;
    # a truly empty body (no fields sent) still raises 400.
    update_data = data.model_dump(exclude_unset=True)
    # `name` must never be nulled — only rate fields may be cleared.
    if "name" in update_data and update_data["name"] is None:
        del update_data["name"]
    if not update_data:
        raise HTTPException(400, detail="No hay campos para actualizar")

    update_data["updated_at"] = datetime.utcnow()
    await db.institutions.update_one({"_id": target["_id"]}, {"$set": update_data})

    updated = await db.institutions.find_one({"_id": target["_id"]})
    updated["_id"] = str(updated["_id"])
    logger.info(f"✅ Institución actualizada: {updated['name']}")
    return updated


@router.post("/{institution_id}/recalculate-pending")
async def recalculate_pending_activities(
    institution_id: str,
    from_date: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Recalcula guardias PENDIENTE desde una fecha usando las tarifas actuales de la institución."""
    target = await db.institutions.find_one({"_id": safe_object_id(institution_id), "userId": user_id})
    if not target:
        raise HTTPException(404, detail="Institución no encontrada")

    semana_rate = target.get("guardia_semana_rate") or target.get("guardia_rate")
    finde_rate = target.get("guardia_finde_rate") or target.get("guardia_rate")
    feriado_rate = target.get("guardia_feriado_rate")

    cursor = db.actividades.find({
        "type": "guardia",
        "institution": target["name"],
        "status": PaymentStatus.PENDIENTE.value,
        "date": {"$gte": from_date},
        "userId": user_id,
    })

    updated_count = 0
    async for act in cursor:
        act_date = datetime.strptime(act["date"], "%Y-%m-%d")
        hours = act.get("hours", 0) or 0
        weekday_hours = act.get("weekday_hours")
        weekend_hours = act.get("weekend_hours")

        try:
            new_amount = calculate_guardia_amount(
                act_date, hours,
                semana_rate, finde_rate,
                weekday_hours=weekday_hours,
                weekend_hours=weekend_hours,
                feriado_rate=feriado_rate,
                start_time=act.get("start_time"),
                end_date=act.get("end_date"),
                end_time=act.get("end_time"),
            )
        except ValueError as exc:
            # Corrupt record (declared range with end <= start): skip it
            # instead of applying the legacy rule silently or crashing the
            # whole batch. The amount stays untouched.
            logger.warning(
                "⚠️ Guardia %s con rango inválido, se omite del recálculo: %s",
                act.get("_id"), exc,
            )
            continue

        await db.actividades.update_one(
            {"_id": act["_id"]},
            {"$set": {"amount": new_amount, "updated_at": datetime.utcnow()}}
        )
        updated_count += 1

    logger.info(f"🔄 Recalculadas {updated_count} guardias pendientes en '{target['name']}' desde {from_date}")
    return {"updated_count": updated_count, "institution": target["name"]}


@router.delete("/{institution_id}")
async def soft_delete_institution(
    institution_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    target = await db.institutions.find_one({"_id": safe_object_id(institution_id), "userId": user_id})

    if not target:
        raise HTTPException(404, detail="Institución no encontrada")

    await db.institutions.update_one(
        {"_id": target["_id"]},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    logger.info(f"🗑️ Institución desactivada: {target['name']} (actividades conservadas)")
    return {"message": f"Institución '{target['name']}' desactivada. Las actividades históricas se conservan."}
