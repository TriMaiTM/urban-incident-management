import asyncio
import sys
import os

# Add backend directory to path so app modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.config import settings
from app.core.database import Base, engine
import app.models  # Ensure all models are registered with Base.metadata


async def init_database():
    print(f"Connecting to database: {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}...")
    async with engine.begin() as conn:
        print("1. Activating PostGIS and UUID extensions...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
        
        postgis_ver = await conn.execute(text("SELECT PostGIS_Version();"))
        version_str = postgis_ver.scalar()
        print(f"   [OK] PostGIS Version: {version_str}")

        print("2. Creating database tables from SQLAlchemy models...")
        await conn.run_sync(Base.metadata.create_all)
        print("   [OK] Tables created successfully:")
        for table_name in Base.metadata.tables.keys():
            print(f"        - {table_name}")

    await engine.dispose()
    print("\nDatabase initialization completed successfully!")


if __name__ == "__main__":
    asyncio.run(init_database())
