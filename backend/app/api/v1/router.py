from fastapi import APIRouter
from app.api.v1.endpoints import auth, categories, departments, incidents, zones

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(zones.router)
api_router.include_router(categories.router)
api_router.include_router(departments.router)
api_router.include_router(incidents.router)


@api_router.get("/ping", tags=["Health"])
async def ping():
    return {"message": "pong", "service": "api_v1"}
