import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from app.core.database import Base


class SearchLog(Base):
    __tablename__ = "search_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    query = Column(String(500), nullable=False)
    search_type = Column(String(50), default="HYBRID")  # VECTOR, KEYWORD, HYBRID
    result_count = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
