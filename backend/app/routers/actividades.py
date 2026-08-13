"""
Rutas de Actividades (CRUD)
Multi-tenant: CADA consulta incluye userId del token JWT
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from app.config import settings
from app.data.feriados import es_feriado
from app.models.actividad import (
    ActividadCreate, ActividadResponse, ActividadUpdate,
    ActividadStats, MonthlyRow, ActivityType, PaymentStatus
)
from app.core.security import decode_token
from app.core.object_id_utils import safe_object_id
from app.db.mongo import get_database


def _medical_day(hour_ts: datetime) -> datetime:
    """Calendar date of the medical day (08:00 → 08:00) containing the hour.

    Hours between 00:00 and 08:00 belong to the previous day's medical day.
    """
    day = hour_ts.date()
    if hour_ts.hour < 8:
        day = day - timedelta(days=1)
    return day


def classify_guardia_hours(
    start: datetime,
    end: datetime,
    holidays_as_feriado: bool = True,
) -> dict[str, int]:
    """Classify each hour of a guardia by the medical day where it falls.

    Medical day = 08:00 → 08:00 of the next day; hours 00:00-08:00 belong to
    the previous day's medical day. Every hour is counted as feriado (max
    priority), finde (Sat/Sun) or semana (Mon-Fri). With holidays_as_feriado
    False (no feriado rate configured) holiday hours fall back into their
    underlying weekday/weekend bucket.
    """
    weekday_hours = weekend_hours = feriado_hours = 0
    cursor = start
    while cursor < end:
        day = _medical_day(cursor)
        if es_feriado(day) and holidays_as_feriado:
            feriado_hours += 1
        elif day.weekday() >= 5:
            weekend_hours += 1
        else:
            weekday_hours += 1
        cursor += timedelta(hours=1)
    return {
        "weekday_hours": weekday_hours,
        "weekend_hours": weekend_hours,
        "feriado_hours": feriado_hours,
    }


def _combine_time(date_part: datetime, time_part: str) -> datetime:
    """Combine a date with an 'HH:MM' time string into a datetime."""
    hh, mm = map(int, time_part.split(":"))
    return date_part.replace(hour=hh, minute=mm, second=0, microsecond=0)


def calculate_guardia_amount(
    start_date: datetime,
    hours: int,
    semana_rate: float | None,
    finde_rate: float | None,
    weekday_hours: int | None = None,
    weekend_hours: int | None = None,
    feriado_rate: float | None = None,
    start_time: str | None = None,
    end_date: str | None = None,
    end_time: str | None = None,
) -> float:
    """Calculate guardia amount by medical-day hour classification.

    Official rule (applied when the full range is available: start_time +
    end_date + end_time): each hour is assigned to its medical day (08:00 →
    08:00 of the next day; hours 00:00-08:00 belong to the previous day's
    medical day) and classified as feriado (max priority), finde or semana.
    Amount = weekday_hours × semana_rate + weekend_hours × finde_rate +
    feriado_hours × feriado_rate, rounded to 2 decimals. The real start hour
    only determines how many hours fall on each medical day — it never changes
    the hourly rate.

    Legacy fallback (no full range): explicit weekday_hours/weekend_hours split
    override wins, then the holiday rule on the start date, then the
    weekday-start rule. When feriado_rate is not configured, holiday hours fall
    back to the weekday/weekend rate of their medical day. Rates may be floats;
    results are rounded to 2 decimals so stored amounts carry no float noise.
    """
    semana_rate = semana_rate or 0
    finde_rate = finde_rate or 0

    if start_time and end_date and end_time:
        start_dt = _combine_time(start_date, start_time)
        end_dt = _combine_time(datetime.strptime(end_date, "%Y-%m-%d"), end_time)
        if end_dt <= start_dt:
            # Explicit rejection, NOT a silent fallback to the legacy rule:
            # a declared-but-backwards range is a client/data error.
            raise ValueError("El fin de la guardia debe ser posterior al inicio")
        split = classify_guardia_hours(start_dt, end_dt, feriado_rate is not None)
        amount = (
            split["weekday_hours"] * semana_rate
            + split["weekend_hours"] * finde_rate
            + split["feriado_hours"] * (feriado_rate or 0)
        )
        return round(amount, 2)

    if weekday_hours is not None and weekend_hours is not None:
        # Override mode: use provided split hours
        amount = (weekday_hours * semana_rate) + (weekend_hours * finde_rate)
    elif feriado_rate is not None and es_feriado(start_date):
        # Holiday rule: feriado_rate wins when configured and date is a holiday
        amount = hours * feriado_rate
    else:
        # Default weekday-start rule
        rate = semana_rate if start_date.weekday() < 5 else finde_rate
        amount = hours * rate

    return round(amount, 2)

router = APIRouter(prefix="/api/actividades", tags=["🏥 Actividades"])
logger = logging.getLogger(__name__)
security = HTTPBearer()


async def get_current_user_id(credentials = Depends(security)) -> str:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(401, detail="Token inválido")
    return payload.get("sub")


async def verify_user_active(user_id: str = Depends(get_current_user_id), db: AsyncIOMotorDatabase = Depends(get_database)):
    user = await db.users.find_one({"_id": safe_object_id(user_id)})
    if not user:
        raise HTTPException(status_code=403, detail="Usuario no encontrado")
    if user.get("is_deleted", False):
        raise HTTPException(status_code=403, detail="Cuenta eliminada")
    if user.get("status", "active") != "active" or not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Cuenta suspendida - No puede realizar esta acción")


@router.post("/", response_model=ActividadResponse, status_code=201)
async def crear_actividad(
    actividad: ActividadCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
    _ = Depends(verify_user_active)
):
    """Crear nueva actividad - SIEMPRE asociada al userId del token"""
    
    # Validar tipo EXTRA
    if actividad.type == ActivityType.EXTRA:
        if not actividad.concept_name or not actividad.concept_name.strip():
            raise HTTPException(status_code=422, detail="El campo 'concept_name' es obligatorio para actividades tipo 'extra'")
        if actividad.hours is not None:
            raise HTTPException(status_code=422, detail="Las actividades tipo 'extra' no pueden tener horas")
        # Amount is user-provided, no auto-calc
    
    # Calcular monto guardia con regla semana/finde
    if actividad.type == ActivityType.GUARDIA and actividad.hours:
        inst = await db.institutions.find_one({"name": actividad.institution, "userId": user_id})
        if inst:
            start_date_dt = datetime.strptime(actividad.date, "%Y-%m-%d")
            # Fallback a guardia_rate (legacy) si los campos nuevos son None
            semana_rate = inst.get("guardia_semana_rate")
            if semana_rate is None:
                semana_rate = inst.get("guardia_rate")
            finde_rate = inst.get("guardia_finde_rate")
            if finde_rate is None:
                finde_rate = inst.get("guardia_rate")
            feriado_rate = inst.get("guardia_feriado_rate")
            # Institution with NO configured rates (all three None) → respect
            # the client-sent amount (flat manual $/Hora applies to every hour).
            # Institution with ≥1 configured rate → backend is authoritative:
            # calculate_guardia_amount recomputes by hour classification.
            if semana_rate is not None or finde_rate is not None or feriado_rate is not None:
                actividad.amount = calculate_guardia_amount(
                    start_date=start_date_dt,
                    hours=actividad.hours,
                    semana_rate=semana_rate,
                    finde_rate=finde_rate,
                    weekday_hours=actividad.weekday_hours,
                    weekend_hours=actividad.weekend_hours,
                    feriado_rate=feriado_rate,
                    start_time=actividad.start_time,
                    end_date=actividad.end_date,
                    end_time=actividad.end_time,
                )
        # Fallback manual-rate path: only when NO amount was provided at all.
        # 0 is a VALID stored amount (e.g. a holiday with a configured
        # feriado_rate of 0) — it must never be recomputed here.
        if actividad.amount is None:
            if actividad.hourly_rate:
                actividad.amount = round(actividad.hours * actividad.hourly_rate, 2)
    
    # Calcular monto si es procedimiento
    if actividad.type == ActivityType.PROCEDIMIENTO and actividad.quantity and actividad.unit_value:
        actividad.amount = round(actividad.quantity * actividad.unit_value, 2)
    
    # Aplicar recargo 50% si es extraservicio o alta complejidad
    if actividad.type == ActivityType.INTERCONSULTA:
        if actividad.patient_location == "extraservicio" or actividad.complexity:
            actividad.amount = round(actividad.amount * 1.5, 2)
    
    doc = {
        "userId": user_id,  # 🔐 CRÍTICO: Aisla datos por médico
        "type": actividad.type.value,
        "institution": actividad.institution,
        "date": actividad.date,
        "amount": actividad.amount,
        "status": actividad.status.value if actividad.status else PaymentStatus.PENDIENTE.value,
        "notes": actividad.notes,
        # Extra
        "concept_name": actividad.concept_name,
        "weekday_hours": actividad.weekday_hours,
        "weekend_hours": actividad.weekend_hours,
        # Guardia
        "hours": actividad.hours,
        "hourly_rate": actividad.hourly_rate,
        "start_time": actividad.start_time,
        "end_time": actividad.end_time,
        "end_date": actividad.end_date,
        # Procedimiento
        "procedure_name": actividad.procedure_name,
        "quantity": actividad.quantity,
        "unit_value": actividad.unit_value,
        # Interconsulta
        "specialty": actividad.specialty,
        "patient_location": actividad.patient_location.value if actividad.patient_location else None,
        "complexity": actividad.complexity,
        "patient_initials": actividad.patient_initials,
        "shift_subtype": actividad.shift_subtype,
        # Timestamps
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.actividades.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["userId"] = user_id

    logger.info(f"✅ Actividad creada: {actividad.type} por usuario {user_id}")
    return doc


@router.get("/", response_model=List[ActividadResponse])
async def listar_actividades(
    tipo: Optional[str] = None,
    status_filter: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Listar actividades - SOLO del médico actual (userId)"""
    
    # 🔐 FILTRO OBLIGATORIO: Solo datos del usuario actual
    query = {"userId": user_id}
    
    if tipo:
        query["type"] = tipo
    if status_filter:
        query["status"] = status_filter
    if year and month:
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year+1}-01-01"
        else:
            end_date = f"{year}-{month+1:02d}-01"
        query["date"] = {"$gte": start_date, "$lt": end_date}
    
    cursor = db.actividades.find(query).sort("date", -1).limit(100)
    actividades = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        actividades.append(doc)
    
    return actividades


@router.get("/stats", response_model=ActividadStats)
async def obtener_estadisticas(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Estadísticas del médico actual"""
    
    # Aggregations filtradas por userId
    pipeline = [
        {"$match": {"userId": user_id}},
        {"$group": {
            "_id": "$type",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    
    results = await db.actividades.aggregate(pipeline).to_list(10)
    
    # Calcular totales
    total_guardias = sum(r["total"] for r in results if r["_id"] == "guardia")
    total_procedimientos = sum(r["total"] for r in results if r["_id"] == "procedimiento")
    total_interconsultas = sum(r["total"] for r in results if r["_id"] == "interconsulta")
    
    # Totales generales (usando aggregation para performance)
    status_pipeline = [
        {"$match": {"userId": user_id}},
        {"$group": {
            "_id": "$status",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    status_results = await db.actividades.aggregate(status_pipeline).to_list(10)
    total_ingresos = sum(r["total"] for r in status_results)
    cobrado = sum(r["total"] for r in status_results if r["_id"] == "pagado")
    pendiente = sum(r["total"] for r in status_results if r["_id"] == "pendiente")
    
    now = datetime.utcnow()
    
    return ActividadStats(
        total_ingresos=total_ingresos,
        total_guardias=total_guardias,
        total_procedimientos=total_procedimientos,
        total_interconsultas=total_interconsultas,
        Cobrado=cobrado,
        Pendiente=pendiente,
        mes_actual=now.strftime("%m"),
        anio_actual=now.year
    )


@router.get("/stats/monthly", response_model=List[MonthlyRow])
async def obtener_comparativa_mensual(
    year: Optional[int] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Comparativa mensual: totales agrupados por mes para un año específico."""
    if year is None:
        year = datetime.utcnow().year

    year_prefix = f"{year}-"

    pipeline = [
        {"$match": {
            "userId": user_id,
            "date": {"$regex": f"^{year_prefix}"}
        }},
        {"$group": {
            "_id": {"$substr": ["$date", 0, 7]},
            "total_ingresos": {"$sum": "$amount"},
            "total_guardias": {"$sum": {"$cond": [{"$eq": ["$type", "guardia"]}, 1, 0]}},
            "total_procedimientos": {"$sum": {"$cond": [{"$eq": ["$type", "procedimiento"]}, 1, 0]}},
            "total_interconsultas": {"$sum": {"$cond": [{"$eq": ["$type", "interconsulta"]}, 1, 0]}},
            "total_extras": {"$sum": {"$cond": [{"$eq": ["$type", "extra"]}, 1, 0]}},
            "cobrado": {"$sum": {"$cond": [{"$eq": ["$status", "pagado"]}, "$amount", 0]}},
            "pendiente": {"$sum": {"$cond": [{"$eq": ["$status", "pendiente"]}, "$amount", 0]}},
        }},
        {"$sort": {"_id": 1}}
    ]

    results = await db.actividades.aggregate(pipeline).to_list(12)
    return [
        MonthlyRow(
            month=r["_id"],
            total_ingresos=r["total_ingresos"],
            total_guardias=r["total_guardias"],
            total_procedimientos=r["total_procedimientos"],
            total_interconsultas=r["total_interconsultas"],
            total_extras=r["total_extras"],
            cobrado=r["cobrado"],
            pendiente=r["pendiente"],
        ) for r in results
    ]


@router.get("/{actividad_id}", response_model=ActividadResponse)
async def obtener_actividad(
    actividad_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Obtener una actividad específica - SOLO del propio médico"""
    doc = await db.actividades.find_one({
        "_id": safe_object_id(actividad_id),
        "userId": user_id  # 🔐 SEGURIDAD: Verifica propiedad
    })
    
    if not doc:
        raise HTTPException(404, detail="Actividad no encontrada")
    
    doc["_id"] = str(doc["_id"])
    return doc


@router.put("/{actividad_id}", response_model=ActividadResponse)
async def actualizar_actividad(
    actividad_id: str,
    data: ActividadUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
    _ = Depends(verify_user_active)
):
    """Actualizar actividad - SOLO del propio médico"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.actividades.find_one_and_update(
        {"_id": safe_object_id(actividad_id), "userId": user_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(404, detail="Actividad no encontrada")
    
    result["_id"] = str(result["_id"])
    return result


@router.delete("/{actividad_id}")
async def eliminar_actividad(
    actividad_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
    _ = Depends(verify_user_active)
):
    """Eliminar actividad - SOLO del propio médico"""
    result = await db.actividades.delete_one({
        "_id": safe_object_id(actividad_id),
        "userId": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(404, detail="Actividad no encontrada")
    
    return {"message": "Actividad eliminada"}