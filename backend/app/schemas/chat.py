from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class CitationItem(BaseModel):
    document_id: str
    document_title: str
    page_number: int
    section_title: Optional[str] = None
    excerpt: str
    relevance_score: Optional[float] = None


class ChatMessageCreate(BaseModel):
    session_id: Optional[str] = None
    message: str
    stream: Optional[bool] = False


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    citations: List[CitationItem] = []
    latency_ms: int = 0
    token_count: int = 0
    created_at: datetime
    feedback: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"


class ChatSessionResponse(BaseModel):
    id: str
    organization_id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[ChatMessageResponse]] = []

    model_config = ConfigDict(from_attributes=True)


class FeedbackCreate(BaseModel):
    message_id: str
    rating: int  # 1 or -1
    feedback_text: Optional[str] = None
