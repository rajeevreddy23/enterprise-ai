import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    @classmethod
    async def log_event(
        cls,
        db: AsyncSession,
        organization_id: str,
        user_id: Optional[str],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        try:
            entry = AuditLog(
                organization_id=organization_id,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details,
                ip_address=ip_address
            )
            db.add(entry)
            await db.commit()
            return entry
        except Exception as e:
            logger.error(f"Audit log failed: {e}")
            await db.rollback()
            return None
