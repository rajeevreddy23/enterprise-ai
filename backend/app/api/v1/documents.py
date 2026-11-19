import os
import uuid
import shutil
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.config import settings
from app.core.security import RoleEnum
from app.models import Document, DocumentChunk, DocumentStatus, AccessLevel, User
from app.schemas.document import (
    DocumentResponse, DocumentDetailResponse, DocumentListResponse,
    DocumentChunkResponse, DocumentPermissionUpdate
)
from app.api.deps import (
    get_current_user, require_roles,
    get_embedding_service, get_vector_store
)
from app.services.document_processor import DocumentProcessor
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStoreService
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    category: Optional[str] = Form("General"),
    tags: Optional[str] = Form(""),
    access_level: Optional[str] = Form(AccessLevel.PUBLIC),
    allowed_roles: Optional[str] = Form("Admin,Manager,Employee"),
    current_user: User = Depends(require_roles([RoleEnum.ADMIN, RoleEnum.MANAGER])),
    db: AsyncSession = Depends(get_db),
    embed_svc: EmbeddingService = Depends(get_embedding_service),
    vector_store: VectorStoreService = Depends(get_vector_store)
):
    # Step 1: Validate file extension
    filename = file.filename or "unknown"
    _, ext = os.path.splitext(filename)
    ext = ext.lower()

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )

    doc_id = str(uuid.uuid4())
    clean_title = title or filename
    saved_filename = f"{doc_id}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)

    # Save uploaded file to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    file_size = os.path.getsize(file_path)
    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"File exceeds max size limit of {settings.MAX_UPLOAD_SIZE_MB}MB")

    # Step 2: Create DB Document record in PROCESSING state
    document = Document(
        id=doc_id,
        organization_id=current_user.organization_id,
        uploader_id=current_user.id,
        title=clean_title,
        filename=filename,
        file_type=ext,
        file_size=file_size,
        file_path=file_path,
        category=category or "General",
        tags=tags or "",
        status=DocumentStatus.PROCESSING,
        access_level=access_level or AccessLevel.PUBLIC,
        allowed_roles=allowed_roles or "Admin,Manager,Employee",
        chunk_count=0
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Step 3: Extraction & Chunking
    try:
        sections = DocumentProcessor.extract(file_path, ext)
        if not sections:
            raise ValueError("No text content could be extracted from the document")

        chunker = ChunkingService()
        chunks = chunker.chunk_sections(sections, doc_title=clean_title)
        
        if not chunks:
            raise ValueError("Document was empty or produced 0 valid chunks after cleaning")

        # Step 4: Generate Embeddings
        chunk_texts = [c.content for c in chunks]
        embeddings = embed_svc.embed_batch(chunk_texts, is_query=False)

        # Step 5: Store in Qdrant Vector DB with organization payload
        qdrant_payloads = []
        db_chunk_models = []

        allowed_roles_list = [r.strip() for r in (allowed_roles or "Admin,Manager,Employee").split(",") if r.strip()]

        for i, chunk in enumerate(chunks):
            chunk_db_id = str(uuid.uuid4())
            db_chunk_models.append(DocumentChunk(
                id=chunk_db_id,
                document_id=doc_id,
                organization_id=current_user.organization_id,
                chunk_index=chunk.chunk_index,
                page_number=chunk.page_number,
                section_title=chunk.section_title,
                content=chunk.content,
                token_count=chunk.token_count
            ))

            qdrant_payloads.append({
                "chunk_id": chunk_db_id,
                "document_id": doc_id,
                "organization_id": current_user.organization_id,
                "document_title": clean_title,
                "page_number": chunk.page_number,
                "section_title": chunk.section_title,
                "content": chunk.content,
                "category": category or "General",
                "access_level": access_level or AccessLevel.PUBLIC,
                "allowed_roles": allowed_roles_list,
                "uploader_id": current_user.id,
                "vector": embeddings[i]
            })

        # Upsert vectors to Qdrant
        vector_store.upsert_chunks(qdrant_payloads)

        # Persist chunks in SQL DB
        db.add_all(db_chunk_models)
        document.status = DocumentStatus.READY
        document.chunk_count = len(chunks)
        await db.commit()
        await db.refresh(document)

        # Log audit
        await AuditService.log_event(
            db=db,
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="DOCUMENT_UPLOAD",
            resource_type="DOCUMENT",
            resource_id=doc_id,
            details=f"Uploaded {clean_title} ({len(chunks)} chunks)"
        )

        return document

    except Exception as e:
        logger.error(f"Failed processing document {doc_id}: {e}")
        document.status = DocumentStatus.FAILED
        document.error_message = str(e)
        await db.commit()
        await db.refresh(document)
        raise HTTPException(
            status_code=500,
            detail=f"Document uploaded but processing failed: {e}"
        )


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).where(Document.organization_id == current_user.organization_id)

    # Non-admins only see accessible documents
    if current_user.role != RoleEnum.ADMIN:
        # Filter: Public, or matching role in allowed_roles, or uploaded by user
        query = query.where(
            (Document.access_level == AccessLevel.PUBLIC) |
            (Document.uploader_id == current_user.id) |
            (Document.allowed_roles.contains(current_user.role))
        )

    if category and category.lower() != "all":
        query = query.where(Document.category == category)

    if search:
        query = query.where(Document.title.ilike(f"%{search}%"))

    query = query.order_by(desc(Document.created_at))
    result = await db.execute(query)
    docs = result.scalars().all()

    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=len(docs)
    )


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).where(
        Document.id == document_id,
        Document.organization_id == current_user.organization_id
    )
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Access check
    if current_user.role != RoleEnum.ADMIN:
        has_access = (
            doc.access_level == AccessLevel.PUBLIC or
            doc.uploader_id == current_user.id or
            (current_user.role in (doc.allowed_roles or "").split(","))
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied to this document")

    # Load chunks
    chunks_res = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    )
    chunks = chunks_res.scalars().all()

    doc_dict = DocumentResponse.model_validate(doc).model_dump()
    doc_dict["chunks"] = [DocumentChunkResponse.model_validate(c) for c in chunks]
    return DocumentDetailResponse(**doc_dict)


@router.get("/{document_id}/preview")
async def preview_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).where(
        Document.id == document_id,
        Document.organization_id == current_user.organization_id
    )
    result = await db.execute(query)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks_res = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
        .limit(10)
    )
    chunks = chunks_res.scalars().all()

    return {
        "id": doc.id,
        "title": doc.title,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "status": doc.status,
        "category": doc.category,
        "access_level": doc.access_level,
        "preview_chunks": [
            {
                "page": c.page_number,
                "section": c.section_title,
                "content": c.content[:350] + ("..." if len(c.content) > 350 else "")
            }
            for c in chunks
        ]
    }


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(require_roles([RoleEnum.ADMIN, RoleEnum.MANAGER])),
    db: AsyncSession = Depends(get_db),
    vector_store: VectorStoreService = Depends(get_vector_store)
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == current_user.organization_id
        )
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Non-admin managers can only delete their own documents
    if current_user.role == RoleEnum.MANAGER and doc.uploader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Managers can only delete documents they uploaded")

    # Step 1: Remove vectors from Qdrant
    vector_store.delete_document_vectors(document_id, current_user.organization_id)

    # Step 2: Remove physical file if exists
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.warning(f"Failed deleting physical file {doc.file_path}: {e}")

    # Step 3: Remove DB record (cascades to chunks)
    await db.delete(doc)
    await db.commit()

    # Log audit
    await AuditService.log_event(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="DOCUMENT_DELETE",
        resource_type="DOCUMENT",
        resource_id=document_id,
        details=f"Deleted document {doc.title}"
    )

    return {"message": "Document and associated vector embeddings successfully deleted", "id": document_id}


@router.patch("/{document_id}/permissions", response_model=DocumentResponse)
async def update_permissions(
    document_id: str,
    perm: DocumentPermissionUpdate,
    current_user: User = Depends(require_roles([RoleEnum.ADMIN, RoleEnum.MANAGER])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == current_user.organization_id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.access_level = perm.access_level
    if perm.allowed_roles:
        doc.allowed_roles = perm.allowed_roles

    await db.commit()
    await db.refresh(doc)

    await AuditService.log_event(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="PERMISSION_CHANGE",
        resource_type="DOCUMENT",
        resource_id=document_id,
        details=f"Updated permissions to {perm.access_level} ({perm.allowed_roles})"
    )

    return doc
