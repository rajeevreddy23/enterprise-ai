from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DocumentBase(BaseModel):
    title: str
    category: Optional[str] = "General"
    tags: Optional[str] = ""
    access_level: Optional[str] = "PUBLIC"  # PUBLIC, ROLE_RESTRICTED, PRIVATE
    allowed_roles: Optional[str] = "Admin,Manager,Employee"


class DocumentCreate(DocumentBase):
    pass


class DocumentPermissionUpdate(BaseModel):
    access_level: str
    allowed_roles: Optional[str] = "Admin,Manager,Employee"


class DocumentChunkResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    page_number: int
    section_title: Optional[str] = None
    content: str
    token_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentResponse(DocumentBase):
    id: str
    organization_id: str
    uploader_id: Optional[str] = None
    filename: str
    file_type: str
    file_size: int
    status: str
    chunk_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentDetailResponse(DocumentResponse):
    chunks: Optional[List[DocumentChunkResponse]] = []


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
