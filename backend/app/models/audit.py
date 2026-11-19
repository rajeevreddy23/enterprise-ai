import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    action = Column(String(100), nullable=False)  # e.g., "LOGIN", "DOCUMENT_UPLOAD", "DOCUMENT_DELETE", "QUERY", "PERMISSION_CHANGE"
    resource_type = Column(String(50), nullable=False)  # "DOCUMENT", "USER", "CHAT", "AUTH"
    resource_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)  # JSON or descriptive text
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    organization = relationship("Organization", back_populates="audit_logs")
