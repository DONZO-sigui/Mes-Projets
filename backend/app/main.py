from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.api.v1.router import api_router
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401

_MIGRATIONS = [
    # Add phone_number to users
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone_number ON users (phone_number) WHERE phone_number IS NOT NULL",
    # Add cross-currency columns to transactions
    "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receiver_devise VARCHAR(3)",
    "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS montant_converti NUMERIC(18,4)",
    "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS taux_applique NUMERIC(18,6)",
    # Expand devise constraints to include GBP and XOF
    "ALTER TABLE transactions DROP CONSTRAINT IF EXISTS ck_transactions_devise",
    "ALTER TABLE transactions ADD CONSTRAINT ck_transactions_devise "
    "CHECK (devise IN ('GNF','EUR','USD','GBP','XOF'))",
    "ALTER TABLE transactions DROP CONSTRAINT IF EXISTS ck_transactions_receiver_devise",
    "ALTER TABLE transactions ADD CONSTRAINT ck_transactions_receiver_devise "
    "CHECK (receiver_devise IS NULL OR receiver_devise IN ('GNF','EUR','USD','GBP','XOF'))",
    "ALTER TABLE wallets DROP CONSTRAINT IF EXISTS ck_wallets_devise",
    "ALTER TABLE wallets ADD CONSTRAINT ck_wallets_devise "
    "CHECK (devise IN ('GNF','EUR','USD','GBP','XOF'))",
    "ALTER TABLE mnbc_reserves DROP CONSTRAINT IF EXISTS ck_mnbc_reserves_devise",
    "ALTER TABLE mnbc_reserves ADD CONSTRAINT ck_mnbc_reserves_devise "
    "CHECK (devise IN ('GNF','EUR','USD','GBP','XOF'))",
    "ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ck_ledger_entries_devise",
    "ALTER TABLE ledger_entries ADD CONSTRAINT ck_ledger_entries_devise "
    "CHECK (devise IN ('GNF','EUR','USD','GBP','XOF'))",
]

_SEED_RATES = """
INSERT INTO mnbc_reserves (id, devise, reserve, taux, statut)
VALUES
    (gen_random_uuid(), 'GNF', 0, 1.000000,     'ACTIVE'),
    (gen_random_uuid(), 'EUR', 0, 11850.000000,  'ACTIVE'),
    (gen_random_uuid(), 'USD', 0, 10950.000000,  'ACTIVE'),
    (gen_random_uuid(), 'GBP', 0, 13500.000000,  'ACTIVE'),
    (gen_random_uuid(), 'XOF', 0, 18.075000,     'ACTIVE')
ON CONFLICT (devise) DO UPDATE SET
    taux   = EXCLUDED.taux,
    statut = 'ACTIVE',
    updated_at = NOW();
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables, then run incremental migrations
    try:
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            for sql in _MIGRATIONS:
                try:
                    conn.execute(text(sql))
                except Exception as e:
                    print(f"[DB] Migration skipped: {e}")
            conn.execute(text(_SEED_RATES))
            conn.commit()
    except Exception as e:
        print(f"[DB] Startup migration error: {e}")
    yield


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
    lifespan=lifespan,
)

register_exception_handlers(app)

# ─── CORS ─────────────────────────────────────────────────────
# allow_credentials=False : on utilise Bearer tokens (localStorage),
# pas de cookies HTTP. Si migration vers httpOnly cookies : repasser à True.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)


# ─── Security headers ─────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
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
