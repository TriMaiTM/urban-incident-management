import asyncio
import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to path so app modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.config import settings
from app.core.database import Base, engine
import app.models  # Ensure all models are registered with Base.metadata

SCHEMA_ALTER_STATEMENTS: list[str] = [
    "ALTER TABLE incident_feedback ALTER COLUMN rating DROP NOT NULL;",
    "ALTER TABLE incident_media ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;",
    "ALTER TABLE incident_media ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;",
]


async def apply_schema_migrations(conn) -> None:
    """Run idempotent ALTER TABLE statements safely on existing databases."""
    for stmt in SCHEMA_ALTER_STATEMENTS:
        await conn.execute(text(stmt))


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

        print("3. Applying idempotent schema migrations...")
        await apply_schema_migrations(conn)
        print("   [OK] Schema migrations applied successfully.")

    await engine.dispose()
    print("\nDatabase initialization completed successfully!")


if __name__ == "__main__":
    asyncio.run(init_database())
