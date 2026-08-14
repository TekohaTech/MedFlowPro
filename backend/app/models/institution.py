from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class InstitutionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Nombre de la institución")
    color: Optional[str] = Field(None, max_length=32, description="Color hex para identificar la institución en el calendario")
    guardia_rate: Optional[float] = Field(None, ge=0, description="Tarifa por hora guardia (alias, retrocompatible)")
    guardia_semana_rate: Optional[float] = Field(None, ge=0, description="Tarifa por hora guardia día de semana")
    guardia_finde_rate: Optional[float] = Field(None, ge=0, description="Tarifa por hora guardia fin de semana")
    guardia_feriado_rate: Optional[float] = Field(None, ge=0, description="Tarifa por hora guardia feriado")
    procedimiento_rate: Optional[float] = Field(None, ge=0, description="Tarifa procedimiento")
    interconsulta_rate: Optional[float] = Field(None, ge=0, description="Tarifa interconsulta")


class InstitutionCreate(InstitutionBase):
    pass


class InstitutionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    color: Optional[str] = Field(None, max_length=32)
    guardia_rate: Optional[float] = Field(None, ge=0)
    guardia_semana_rate: Optional[float] = Field(None, ge=0)
    guardia_finde_rate: Optional[float] = Field(None, ge=0)
    guardia_feriado_rate: Optional[float] = Field(None, ge=0)
    procedimiento_rate: Optional[float] = Field(None, ge=0)
    interconsulta_rate: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None


class InstitutionResponse(InstitutionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., alias="_id")
    user_id: str = Field(..., alias="userId")
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @property
    def institution_id(self) -> str:
        return str(self.id)
