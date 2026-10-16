from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "API de la plateforme GNF-Token"
        " — Transfert monétaire Guinée ↔ Diaspora.\n\n"
        "⚠️ **Démonstration technique.**"
        " Pas de conformité réglementaire garantie."
    ),
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    debug=settings.APP_DEBUG,
)

register_exception_handlers(app)

# ─── CORS ─────────────────────────────────────────────────────
# allow_credentials=False : on utilise Bearer tokens (localStorage),
# pas de cookies HTTP. Si migration vers httpOnly cookies : repasser à True.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)


# ─── Security headers ─────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "frame-ancestors 'none'"
    return response

# ─── Routes API v1 ────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", include_in_schema=False)
def root():
    return {
        "service": settings.APP_NAME,
        "version": "0.2.0",
        "docs": "/docs",
        "api": settings.API_V1_PREFIX,
        "status": "running",
    }
