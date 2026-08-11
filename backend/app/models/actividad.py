"""
Modelos Pydantic para Actividades Médicas
Actividad: Guardia, Procedimiento, Interconsulta
"""
from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional, List
from datetime import datetime, timedelta
from enum import Enum


# ==================== ENUMS ====================

class ActivityType(str, Enum):
    """Tipos de actividad"""
    GUARDIA = "guardia"
    PROCEDIMIENTO = "procedimiento"
    INTERCONSULTA = "interconsulta"
    EXTRA = "extra"


class PaymentStatus(str, Enum):
    """Estado de pago"""
    PENDIENTE = "pendiente"
    PAGADO = "pagado"


class PatientLocation(str, Enum):
    """Ubicación del paciente para interconsulta"""
    INTRASERVICIO = "intraservicio"
    EXTRASERVICIO = "extraservicio"


# ==================== ESQUEMAS BASE ====================

class ActividadBase(BaseModel):
    """Campos comunes"""
    type: ActivityType = Field(..., description="Tipo de actividad")
    institution: str = Field(..., min_length=1, max_length=200, description="Institución")
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Fecha (YYYY-MM-DD)")
    amount: float = Field(..., ge=0, description="Monto en pesos, con hasta 2 decimales")
    status: PaymentStatus = PaymentStatus.PENDIENTE
    notes: Optional[str] = Field(None, max_length=1000, description="Notas adicionales")


class ActividadCreate(ActividadBase):
    """Schema para crear actividad"""
    # Campos específicos de Extra
    concept_name: Optional[str] = Field(None, max_length=200, description="Nombre del concepto (para tipo extra)")
    weekday_hours: Optional[int] = Field(None, ge=0, description="Horas en día de semana")
    weekend_hours: Optional[int] = Field(None, ge=0, description="Horas en fin de semana")

    # Campos específicos de Guardia
    # Anti-DoS bound (720h = 30 days), NOT a product limit: doctors
    # legitimately work 72h+ guardias, and the per-hour classifier does
    # O(hours) work per request, so an unbounded value means unbounded work.
    hours: Optional[int] = Field(None, ge=1, le=720, description="Horas de guardia")
    hourly_rate: Optional[float] = Field(None, ge=0, description="Valor por hora")
    start_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$", description="Hora inicio")
    end_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$", description="Hora fin")
    end_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Fecha fin (YYYY-MM-DD)")
    
    # Campos específicos de Procedimiento
    procedure_name: Optional[str] = Field(None, max_length=200, description="Nombre del procedimiento")
    quantity: Optional[int] = Field(1, ge=1, description="Cantidad")
    unit_value: Optional[float] = Field(None, ge=0, description="Valor unitario")
    
    # Campos específicos de Interconsulta
    specialty: Optional[str] = Field(None, max_length=100, description="Especialidad solicitante")
    patient_location: Optional[PatientLocation] = Field(None, description="Ubicación del paciente")
    complexity: Optional[bool] = Field(False, description="Alta complejidad")
    
    # Privacidad del paciente
    patient_initials: Optional[str] = Field(None, min_length=0, max_length=3, description="Iniciales del paciente (solo 2-3 letras)")
    
    # Guardia subtype
    shift_subtype: Optional[str] = Field(None, pattern=r"^(activa|pasiva)$", description="Tipo de guardia: activa o pasiva")

    @model_validator(mode="after")
    def _validate_guardia_range(self) -> "ActividadCreate":
        """Range rule for guardias: when a full range (date + start_time →
        end_date + end_time) is declared, the range is the source of truth for
        the amount (the backend computes by medical-day hour classification).

        Reject backwards ranges (end <= start). The 720h bound is an anti-DoS
        guard, NOT a business limit: doctors legitimately work 72h+ guardias,
        and the per-hour classifier iterates one loop per hour, so an unbounded
        end_date would mean unbounded work per request (e.g. end_date
        '2050-01-01' = 210k hours). 720h = 30 days, far above any real guardia.
        """
        if (
            self.type == ActivityType.GUARDIA
            and self.start_time and self.end_date and self.end_time
        ):
            start_dt = datetime.strptime(f"{self.date} {self.start_time}", "%Y-%m-%d %H:%M")
            end_dt = datetime.strptime(f"{self.end_date} {self.end_time}", "%Y-%m-%d %H:%M")
            if end_dt <= start_dt:
                raise ValueError("El fin de la guardia debe ser posterior al inicio")
            if end_dt - start_dt > timedelta(hours=720):
                raise ValueError("La guardia no puede superar las 720 horas (30 días)")
        return self


class ActividadUpdate(BaseModel):
    """Schema para actualizar actividad"""
    institution: Optional[str] = Field(None, min_length=1, max_length=200)
    date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    amount: Optional[float] = Field(None, ge=0)
    status: Optional[PaymentStatus] = None
    notes: Optional[str] = Field(None, max_length=1000)
    concept_name: Optional[str] = Field(None, max_length=200)
    weekday_hours: Optional[int] = Field(None, ge=0)
    weekend_hours: Optional[int] = Field(None, ge=0)
    start_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    end_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    end_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    shift_subtype: Optional[str] = Field(None, pattern=r"^(activa|pasiva)$")


class ActividadResponse(ActividadBase):
    """Schema para respuesta - datos completos"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., alias="_id")
    user_id: str = Field(..., alias="userId")  # EL TENANT ID - CRÍTICO
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Campos específicos
    concept_name: Optional[str] = None
    weekday_hours: Optional[int] = None
    weekend_hours: Optional[int] = None
    hours: Optional[int] = None
    hourly_rate: Optional[float] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    end_date: Optional[str] = None
    procedure_name: Optional[str] = None
    quantity: Optional[int] = None
    unit_value: Optional[float] = None
    specialty: Optional[str] = None
    patient_location: Optional[PatientLocation] = None
    complexity: Optional[bool] = None
    patient_initials: Optional[str] = None
    shift_subtype: Optional[str] = None
    
    @property
    def actividad_id(self) -> str:
        return str(self.id)


# ==================== AGGREGATIONS ====================

class ActividadStats(BaseModel):
    """Estadísticas de actividades"""
    total_ingresos: float
    total_guardias: float
    total_procedimientos: float
    total_interconsultas: float
    Cobrado: float
    Pendiente: float
    mes_actual: str
    anio_actual: int


class MonthlyRow(BaseModel):
    """Una fila de la comparativa mensual"""
    month: str
    total_ingresos: float
    total_guardias: float
    total_procedimientos: float
    total_interconsultas: float
    total_extras: float
    cobrado: float
    pendiente: float


class InstitutionSummary(BaseModel):
    """Resumen por institución"""
    institution: str
    total: float
    count: int
    promedio: float