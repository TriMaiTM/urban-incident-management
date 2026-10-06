from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/ping", tags=["Health"])
async def ping():
    return {"message": "pong", "service": "api_v1"}
