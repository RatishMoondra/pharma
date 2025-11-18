from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import logging
import uuid

from app.database.session import engine
from app.models import base
from app.routers import auth, vendors, pi, eopa, po, products, material, users, invoice, analytics, configuration, raw_material, packing_material
from app.routers import countries as countries_router
from app.exceptions.handlers import app_exception_handler, validation_exception_handler
from app.exceptions.base import AppException
from fastapi.exceptions import RequestValidationError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app/logs/app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("pharma")

# Create tables
base.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PharmaFlow 360",
    description="Web-based pharmaceutical procurement, manufacturing, and dispatch workflow system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite and React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(countries_router.router)  # Already has /api/countries prefix
app.include_router(vendors.router, prefix="/api/vendors", tags=["Vendors"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(raw_material.router, prefix="/api", tags=["Raw Materials & BOM"])
app.include_router(packing_material.router, prefix="/api", tags=["Packing Materials & BOM"])
app.include_router(pi.router, prefix="/api/pi", tags=["Proforma Invoice"])
app.include_router(eopa.router, prefix="/api/eopa", tags=["EOPA"])
app.include_router(po.router, prefix="/api/po", tags=["Purchase Orders"])
app.include_router(invoice.router, prefix="/api/invoice", tags=["Vendor Invoices"])
app.include_router(material.router, prefix="/api/material", tags=["Material Management"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics & Insights"])
app.include_router(configuration.router, prefix="/api/config", tags=["Configuration"])

@app.get("/")
async def root():
    return {
        "success": True,
        "message": "PharmaFlow 360 API",
        "data": {
            "version": "1.0.0",
            "status": "running"
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/health")
async def health_check():
    return {
        "success": True,
        "message": "System is healthy",
        "data": {"status": "ok"},
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
