from fastapi import APIRouter
from app.api.v1.endpoints import zones

api_router = APIRouter()

api_router.include_router(zones.router)


@api_router.get("/ping", tags=["Health"])
async def ping():
    return {"message": "pong", "service": "api_v1"}
