"""SQLAlchemy async database setup for PostgreSQL."""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

POSTGRES_URL = os.environ["POSTGRES_URL"]

engine = create_async_engine(POSTGRES_URL, echo=False, pool_size=10, max_overflow=20)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session


async def init_db():
    from models import Base as ModelBase  # noqa
    async with engine.begin() as conn:
        await conn.run_sync(ModelBase.metadata.create_all)
