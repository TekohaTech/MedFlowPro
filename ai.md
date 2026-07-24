# MedFlow Pro — AI Context

App de gestión financiera para guardias médicas. Multi-tenant. SaaS. Médicos registran horas, procedimientos, interconsultas y extras; el sistema calcula automáticamente los montos y muestra dashboard + calendario + reportes.

**Stack:** FastAPI + MongoDB (Motor async) | React 19 + Vite + Tailwind 4 | Docker Compose (Mongo + Backend).

## Reglas de negocio (lo que NO se ve en el código)

### Multi-tenant
- Cada usuario ve SOLO sus datos. Todo query lleva `userId` del JWT. No hay datos compartidos entre usuarios.
- Los admins pueden ver TODOS los usuarios, pero NO sus actividades individuales (solo totales de deuda).

### Roles
- **User**: CRUD de sus propias actividades, instituciones, perfil.
- **Admin**: todo lo de user + listar usuarios, suspender/activar/eliminar, resetear passwords, ver deuda agregada, enviar notificaciones.

### Cálculo de montos
- **Guardia**: `hours × hourly_rate`. Puede ser `activa` o `pasiva` (impacta visual, no afecta cálculo). Tarifas区分 `semana` (lun-vie) y `finde` (sáb-dom).
- **Procedimiento**: `quantity × unit_value`.
- **Interconsulta**: monto base + **50% de recargo** si es `extraservicio` o `alta complejidad`.
- **Extra**: monto fijo según concepto. No institution rate — se guarda el `conceptName`.
- El monto se auto-calcula en backend cuando se crea la actividad. El campo `amount` en la BD ya guarda el total calculado.

### Estados de usuario
`active → inactive (manual) → suspended (admin) → deleted (soft, irreversible)`.
- `deleted`: `is_deleted=True`, `status="deleted"`, `is_active=False`. No puede loguearse. Sus datos históricos se conservan.
- `inactive`: default al crear. No puede loguearse hasta que admin lo active.

### Estados de pago
- `pendiente`: no cobrado aún. Aparece en dashboard como pending.
- `pagado`: cobrado. Aparece en dashboard como paid.
- No hay transición automática — el usuario lo cambia manualmente.

### Soft delete
- Usuarios e instituciones usan soft delete (`is_deleted` / `is_active=False`).
- Instituciones eliminadas se **reactivan** si se crea una con el mismo nombre (se actualizan tarifas).
- Actividades se borran físicamente (DELETE real). No hay vuelta atrás.

### Notificaciones
- Admin puede crear notificaciones para usuarios específicos o todos.
- El frontend muestra un dropdown de notificaciones en el dashboard.
- Las notificaciones se marcan como leídas individualmente.

### Rate limiting
- `POST /register`: 3/min por IP
- `POST /login`: 5/min por IP
- Admin endpoints: sin rate limit

## Decisiones de arquitectura

- **Sin router library**: SPA con vistas controladas por `useAppState` (estado + render condicional). Suficiente para la escala actual.
- **useActionState (React 19)** para todos los formularios. No usar `useState` + submit manual.
- **SVG nativo** para gráficos (MonthlyChart). Sin chart libraries.
- **Frontend fuera de Docker**: El dev corre local con Vite (`:5173`). El contenedor Docker frontend (`medflow_web`) está **roto** (no tiene node_modules).
- **Admin usa prefijo `/api/auth`** (no `/api/admin`) para no romper llamadas existentes del frontend.
- **Password reset admin**: genera random, guarda hash, devuelve mensaje. **NUNCA** devuelve el password en texto plano.
- **PDF con nombre dinámico**: `document.title` se setea antes de `window.print()` con formato `MedFlow Pro - DD/MM/YYYY-HH:MMh`.
- **Detección de superposiciones**: `findOverlaps()` compara guardias por rango de fechas/horarios. Advertencia en calendar y dashboard con fechas e instituciones.
- **ENV variable**: controla Swagger/ReDoc. `development` = docs abiertos (`/docs`), `production` = docs deshabilitados (404). Default es `development`. Siempre clonar con `ENV=development`.

## Gotchas

- `InstitutionPicker.tsx` fue refactorizado — ya no viola reglas de useState.
- Backend tiene 30+ endpoints registrados en `main.py`. Si agregás uno nuevo, registralo ahí.
- `gemini.ts` marcado como `@deprecated` — requiere `GEMINI_API_KEY` en `.env` para funcionar. Sin key, el insight financiero cae a fallback hardcoded.
- `outbox.ts` movido a `services/_legacy/` — offline sync queue no conectado al flujo principal.

## Archivos clave

| Archivo | Para qué sirve |
|---------|----------------|
| `backend/app/models/user.py` | 12 modelos Pydantic (User CRUD, Auth, Admin) |
| `backend/app/models/actividad.py` | 7 modelos + 3 enums (ActivityType, PaymentStatus, PatientLocation) |
| `backend/app/models/institution.py` | Modelo de instituciones con tarifas weekday/finde |
| `backend/app/models/notification.py` | Modelo de notificaciones |
| `backend/app/routers/auth.py` | Login, register, refresh, profile, change-password |
| `backend/app/routers/admin.py` | CRUD usuarios admin, deudas, reset-pass |
| `backend/app/routers/actividades.py` | CRUD actividades + stats + extras |
| `backend/app/routers/institutions.py` | CRUD instituciones + soft-delete + reactivación |
| `backend/app/routers/notifications.py` | CRUD notificaciones admin → usuarios |
| `backend/app/core/security.py` | JWT + bcrypt + password validation |
| `frontend/hooks/useAppState.ts` | Orquestador principal |
| `frontend/hooks/useTransactions.ts` | CRUD actividades |
| `frontend/hooks/useAuth.ts` | Sesión JWT |
| `frontend/hooks/useNotifications.ts` | Sistema de notificaciones |
| `frontend/services/api.ts` | Singleton APIService |
| `frontend/types.ts` | Interfaces y enums compartidos |
| `frontend/translations.ts` | Keys ES/EN |
| `frontend/components/Calendar/calendarUtils.ts` | Detección de superposiciones, utilidades de calendario |
| `frontend/components/Reports/ReportsPrintView.tsx` | Vista de impresión PDF con nombre dinámico |

## MongoDB — decisiones e infra

### Por qué MongoDB y no Postgres
- **Actividades polimórficas**: guardia/procedimiento/interconsulta/extra tienen campos distintos. MongoDB los maneja naturalmente (mismo documento, campos opcionales). En Postgres necesitarías JSONB o tablas separadas.
- **Relaciones simples**: user → activities (1:N), user → institutions (1:N). No hay joins complejos.
- **Flexibilidad**: agregar campos nuevos no requiere migration. Útil en etapa temprana.
- Postgres sería mejor con: esquema más rico en relaciones, team grande, necesidad de migraciones estrictas. No es el caso acá.

### Atlas Free Tier — capacidad con 100+ usuarios
- Storage: **512 MB** gratis. Con 100 usuarios activos (~50 actividades/mes c/u) usás ~120-180 MB/año. Alcanza para 2-3 años.
- Conexiones: **500 máx**. FastAPI usa Motor con pool de 10 conexiones. Estás sobrado.
- Sort memory: **32 MB**. Es el límite más riesgoso para queries de deudas agregadas.
- Transfer: **10 GB/semana**. Actividades de ~500 bytes → ~20M requests antes de llegar al límite.

### Mejoras pendientes
1. **Índice** `{status: 1, userId: 1}` en `actividades` — YA AGREGADO.
2. **Evaluar Beanie** (ODM para Motor) — schema explícito sin perder flexibilidad de MongoDB.
3. **Backups automáticos** — Atlas M0 no tiene. Un `mongodump` semanal con cron alcanza.
4. **HTTPS** — necesario para producción. Usar reverse proxy (nginx/caddy) con TLS.
5. **SECRET_KEY** — generar valor real para producción: `python -c "import secrets; print(secrets.token_hex(32))"`

## Comandos

```bash
docker compose up -d          # MongoDB + Backend en :8000
cd frontend && npm run dev    # Frontend en :5173

npx tsc --noEmit              # TypeScript check (frontend)
npm run build                 # Build producción (frontend)
npm test                      # Frontend tests (vitest) — 15 tests

cd backend && python3 -m pytest tests/ -v  # Backend tests (pytest) — 57 tests
```
