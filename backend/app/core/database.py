import uuid
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Engine configuration
# Handles both sqlite+aiosqlite and postgresql+asyncpg
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    from app.models import (
        User, Organization, Document, DocumentChunk,
        ChatSession, ChatMessage, UserFeedback, AuditLog, SearchLog
    )
    from app.core.security import get_password_hash, RoleEnum
    from sqlalchemy import select

    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

    # Seed initial demo organization and administrator if not exists
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Organization).limit(1))
        existing_org = result.scalar_one_or_none()

        if not existing_org:
            default_org = Organization(
                id=str(uuid.uuid4()),
                name="Acme Enterprise",
                slug="acme-corp"
            )
            session.add(default_org)
            await session.flush()

            # Seed Admin User
            admin_user = User(
                id=str(uuid.uuid4()),
                email="admin@enterprise.ai",
                hashed_password=get_password_hash("Admin@123456"),
                full_name="Enterprise Administrator",
                role=RoleEnum.ADMIN,
                organization_id=default_org.id,
                is_active=True
            )
            session.add(admin_user)

            # Seed Manager User
            manager_user = User(
                id=str(uuid.uuid4()),
                email="manager@enterprise.ai",
                hashed_password=get_password_hash("Manager@123456"),
                full_name="Knowledge Manager",
                role=RoleEnum.MANAGER,
                organization_id=default_org.id,
                is_active=True
            )
            session.add(manager_user)

            # Seed Employee User
            employee_user = User(
                id=str(uuid.uuid4()),
                email="employee@enterprise.ai",
                hashed_password=get_password_hash("Employee@123456"),
                full_name="Enterprise Employee",
                role=RoleEnum.EMPLOYEE,
                organization_id=default_org.id,
                is_active=True
            )
            session.add(employee_user)

            await session.commit()
