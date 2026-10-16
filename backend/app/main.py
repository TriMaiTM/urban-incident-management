import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings


UPLOAD_PUBLIC_DIR = os.path.join(settings.UPLOAD_DIR, "public")
UPLOAD_PRIVATE_DIR = os.path.join(settings.UPLOAD_DIR, "private")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Upload directories are initialized upon startup
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for Danang Urban Infrastructure Incident Management Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount public uploads static directory (private directory is protected from direct public access)
os.makedirs(UPLOAD_PUBLIC_DIR, exist_ok=True)
os.makedirs(UPLOAD_PRIVATE_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_PUBLIC_DIR), name="uploads")


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "version": "1.0.0"
    }


# Include API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)
