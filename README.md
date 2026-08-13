# MedFlow Pro

> SaaS de gestión financiera para guardias médicas. Dashboard, calendario y reportes.

MedFlow Pro ayuda a médicos a registrar y dar seguimiento a sus actividades — guardias, procedimientos, interconsultas y extras — con cálculo automático de montos, dashboard financiero y reportes exportables.

## Features

| | |
|---|---|
| 📊 **Dashboard financiero** | Gráfico SVG de rendimiento mensual, actividades del mes, comparativa vs mes anterior, historial de transacciones |
| 📅 **Calendario de guardias** | Vista mensual con detección de superposiciones, totales por día, tooltip hover, edición inline |
| 📋 **Registro de actividades** | Guardias (activa/pasiva), procedimientos, interconsultas, extras con cálculo automático |
| 🏥 **Gestión de instituciones** | CRUD con tarifas por tipo, soporte weekday/finde, soft-delete con reactivación |
| 📄 **Reportes** | Filtros por período, institución, tipo; vista imprimible con nombre de archivo dinámico |
| 🔐 **Roles** | Usuario y administrador con panel de gestión de usuarios |
| 🔔 **Notificaciones** | Sistema de notificaciones push del admin a usuarios |
| 🔍 **Búsqueda** | Modal de búsqueda global de actividades |
| 🌙 **Modo oscuro** | Soporte completo |
| 🌐 **Idioma** | Español e inglés |
| 📱 **Responsive** | Mobile y desktop con protocolo mobile-first (2 tiers: base/lg) |

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4 |
| Backend | FastAPI, Python 3.11, Motor (MongoDB async) |
| Base de datos | MongoDB 7.0 |
| Infraestructura | Docker Compose |

## Inicio rápido

```bash
# 1. Clonar y configurar
cp .env.example .env

# 2. MongoDB + Backend
docker compose up -d

# 3. Frontend (corre local, no en Docker)
cd frontend
npm install
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/docs (Swagger)
- **Backend Health:** http://localhost:8000/health

> **Nota:** El contenedor Docker frontend (`medflow_web`) está roto (falta node_modules). El frontend corre local con Vite.

## Estructura del proyecto

```
sist_med/
├── frontend/
│   ├── components/        # Feature-based components
│   │   ├── Auth/          # Login, Register
│   │   ├── Dashboard/     # Dashboard, chart, stats, transactions, search, notifications
│   │   ├── Calendar/      # Calendar grid, day panel, navigation, overlap detection
│   │   ├── ShiftForm/     # Activity creation form, extras list
│   │   ├── Reports/       # Reports view + filters + print (PDF with dynamic filename)
│   │   ├── Settings/      # Profile, password, preferences
│   │   ├── Admin/         # User management panel
│   │   └── ui/            # Button, Input, Card, Select, ConfirmModal
│   ├── hooks/             # Custom hooks (useAuth, useTransactions, useAppState, useNotifications)
│   ├── lib/               # Pure utilities: chartUtils, format helpers
│   ├── services/          # API client, Gemini (deprecated), mockData
│   └── types.ts           # Shared TypeScript types
├── backend/
│   ├── tests/             # pytest: security, auth, actividades, institutions, notifications
│   └── app/
│       ├── core/          # Security (JWT/bcrypt), dependencies, utilities
│       ├── db/            # MongoDB connection, indexes
│       ├── models/        # Pydantic models (User, Actividad, Institution, Notification)
│       ├── routers/       # API endpoints (auth, admin, actividades, institutions, notifications)
│       └── services/      # Business logic (auth, notification)
├── scripts/
│   └── backup.sh          # Weekly mongodump (30-day retention)
└── docker-compose.yml     # MongoDB + Backend
```

## Desarrollo

### Frontend conventions

- **Components:** objetivo 200 líneas, máx. 250 (cap duro), máx. 3 `useState`, máx. 2 `useEffect`
- **Custom hooks:** toda la lógica de estado va en hooks, no en componentes
- **Forms:** siempre `useActionState` (React 19), nunca `useState` + submit manual
- **Styling:** `cn()` utility (clsx + tailwind-merge), mobile-first (2 tiers: base/lg), dark mode
- **Types:** strict mode, no `any`, Props interface en cada componente
- **Estructura:** feature folders para vistas con 2+ archivos
- **Gráficos:** SVG nativo, sin librerías externas
- **Responsive:** mobile-first con breakpoints base (mobile) y lg: (desktop). Sin md: salvo estrictamente necesario.

### Backend conventions

- **Clean architecture:** routers (HTTP) → services (lógica) → db (datos)
- **Auth:** JWT con access + refresh tokens, bcrypt (12 rounds)
- **Rate limiting:** slowapi por IP en endpoints críticos
- **Multi-tenant:** cada query filtra por `userId` del token
- **Validación:** Pydantic models con regex, rangos, model_validators

### Base de datos

MongoDB 7.0 con Motor async. Colecciones: `users`, `actividades`, `institutions`, `notifications`.

## Tests

```bash
# Frontend (vitest)
cd frontend && npm test

# Backend (pytest)
cd backend && python3 -m pytest tests/ -v
```

## API

Documentación Swagger completa en `/docs` con el servidor corriendo.

| Endpoint | Descripción |
|----------|-------------|
| `POST /api/auth/register` | Registro de usuario |
| `POST /api/auth/login` | Inicio de sesión |
| `POST /api/auth/refresh` | Renovar token |
| `GET /api/auth/me` | Perfil del usuario |
| `PUT /api/auth/me` | Actualizar perfil |
| `POST /api/auth/change-password` | Cambiar contraseña |
| `GET/POST /api/actividades/` | Listar / Crear actividades |
| `GET /api/actividades/stats` | Estadísticas agregadas |
| `GET/PUT/DELETE /api/actividades/{id}` | CRUD actividad individual |
| `GET/POST /api/institutions/` | Listar / Crear instituciones |
| `PUT/DELETE /api/institutions/{id}` | CRUD institución individual |
| `GET/POST /api/auth/notifications` | Listar / Crear notificaciones |
| `PUT /api/auth/notifications/{id}/read` | Marcar notificación como leída |

## Licencia

MIT
