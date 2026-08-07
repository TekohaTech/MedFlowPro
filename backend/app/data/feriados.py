"""
Feriados nacionales de Argentina.
Actualizar una vez por año cuando el gobierno publica el calendario oficial
(generalmente en diciembre). Formato: ISO (YYYY-MM-DD).
"""

from datetime import date, datetime

FERIADOS_ARGENTINA_2026: list[str] = [
    "2026-01-01",   # Año Nuevo (inamovible)
    "2026-02-16",   # Carnaval (lunes)
    "2026-02-17",   # Carnaval (martes)
    "2026-03-24",   # Día de la Memoria (inamovible)
    "2026-04-02",   # Malvinas (inamovible)
    "2026-04-03",   # Viernes Santo (inamovible)
    "2026-05-01",   # Día del Trabajador (inamovible)
    "2026-05-25",   # Revolución de Mayo (inamovible)
    "2026-06-15",   # Güemes (trasladado al lunes 15 de junio)
    "2026-06-20",   # Paso a la Inmortalidad (inamovible, cae sábado)
    "2026-07-09",   # Independencia (inamovible)
    "2026-08-17",   # San Martín (trasladable, lunes)
    "2026-10-12",   # Respeto a Diversidad (trasladable, lunes)
    "2026-11-23",   # Soberanía Nacional (trasladado al lunes 23 de noviembre)
    "2026-12-08",   # Inmaculada Concepción (inamovible)
    "2026-12-25",   # Navidad (inamovible)
]


def es_feriado(fecha) -> bool:
    """
    Devuelve True si la fecha (datetime, date o string ISO) es feriado nacional argentino.
    El string ISO acepta 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM:SS'.
    """
    if isinstance(fecha, datetime):
        return fecha.date().isoformat() in FERIADOS_ARGENTINA_2026
    if isinstance(fecha, date):
        return fecha.isoformat() in FERIADOS_ARGENTINA_2026
    # string ISO: 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM:SS' (tomamos los primeros 10 chars)
    if isinstance(fecha, str):
        return fecha[:10] in FERIADOS_ARGENTINA_2026
    return False