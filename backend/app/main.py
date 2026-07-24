"""
MedFlow Pro - Backend API
FastAPI + MongoDB (Motor) + Seguridad Máxima + Multi-Tenant
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import logging

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db.mongo import connect, disconnect
from app.limiter import limiter

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("🚀 MedFlow Pro API starting...")
    try:
        await connect()
        logger.info(f"📦 Database: {settings.MONGO_URI.split('@')[-1]}")
    except Exception as e:
        logger.warning(f"⚠️ MongoDB no conectado: {e}")
    logger.info(f"🔐 Token expire: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} min")
    logger.info(f"🌍 Environment: {settings.ENV}")
    if settings.ENV == "production":
        logger.info("🔒 Swagger/ReDoc deshabilitados (producción)")
    yield
    await disconnect()
    logger.info("🛑 MedFlow Pro API shutting down...")


app = FastAPI(
    title="MedFlow Pro API",
    description="Backend Seguro Multi-Tenant para Gestión Médica de Médicos",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENV == "development" else None,
    redoc_url="/redoc" if settings.ENV == "development" else None,
)

# CORS ESTRICTO - Solo orígenes permitidos
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ==================== RATE LIMITING ====================

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ==================== MIDDLEWARE DE SEGURIDAD ====================

@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Agregar headers de seguridad"""
    start_time = time.time()
    response = await call_next(request)
    
    # Headers de seguridad
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Tiempo de respuesta
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    return response


# ==================== HEALTH CHECK ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "version": "1.0.0",
        "service": "MedFlow Pro API",
        "timestamp": time.time()
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MedFlow Pro API",
        "docs": "/docs" if settings.ENV == "development" else "disabled",
        "health": "/health"
    }


# ==================== ERROR HANDLERS ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Manejo de errores HTTP"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Manejo de errores generales"""
    logger.error(f"❌ Error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500
        }
    )


# ==================== ROUTERS (CRUD COMPLETO) ====================

from app.routers import auth, admin, actividades, institutions, notifications

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(actividades.router)
app.include_router(institutions.router)
app.include_router(notifications.router)


# ==================== TEST ENDPOINT ====================

@app.get("/api/test")
async def test_endpoint():
    """Test endpoint público"""
    return {
        "message": "API MedFlow Pro funcionando",
        "security": "headers applied + multi-tenant",
        "endpoints": {
            "auth": ["/api/auth/register", "/api/auth/login", "/api/auth/me"],
            "admin": ["/api/auth/admin/users", "/api/auth/admin/users-with-debts"],
            "actividades": ["/api/actividades", "/api/actividades/stats"]
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )