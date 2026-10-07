import pytest_asyncio
import httpx
from app.main import app
from app.core.database import engine


@pytest_asyncio.fixture(autouse=True)
async def cleanup_db_connections():
    yield
    # Dispose connection pool so connections bound to a closed loop aren't reused
    await engine.dispose()


@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
