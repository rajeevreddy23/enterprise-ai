import uuid
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models import ChatSession, ChatMessage, UserFeedback, User
from app.schemas.chat import (
    ChatSessionCreate, ChatSessionResponse, ChatMessageCreate,
    ChatMessageResponse, FeedbackCreate, CitationItem
)
from app.api.deps import get_current_user, get_rag_service
from app.services.rag_service import AdvancedRAGService
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    body: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session = ChatSession(
        id=str(uuid.uuid4()),
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        title=body.title or "New Conversation"
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(ChatSession)
        .where(
            ChatSession.organization_id == current_user.organization_id,
            ChatSession.user_id == current_user.id
        )
        .order_by(desc(ChatSession.updated_at))
    )
    result = await db.execute(query)
    sessions = result.scalars().all()
    return sessions


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.organization_id == current_user.organization_id,
            ChatSession.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Fetch messages
    msg_res = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = msg_res.scalars().all()

    # Parse citations JSON
    resp_messages = []
    for m in messages:
        c_list = []
        if m.citations:
            try:
                c_list = json.loads(m.citations)
            except Exception:
                c_list = []
        
        resp_messages.append(ChatMessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            citations=c_list,
            latency_ms=m.latency_ms,
            token_count=m.token_count,
            created_at=m.created_at
        ))

    return ChatSessionResponse(
        id=session.id,
        organization_id=session.organization_id,
        user_id=session.user_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=resp_messages
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.organization_id == current_user.organization_id,
            ChatSession.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    await db.delete(session)
    await db.commit()
    return {"message": "Session deleted", "id": session_id}


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(
    body: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rag_service: AdvancedRAGService = Depends(get_rag_service)
):
    # Step 1: Ensure valid session
    session_id = body.session_id
    session = None
    if session_id:
        s_res = await db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.organization_id == current_user.organization_id,
                ChatSession.user_id == current_user.id
            )
        )
        session = s_res.scalar_one_or_none()

    if not session:
        # Auto-create session
        title = body.message[:40] + ("..." if len(body.message) > 40 else "")
        session = ChatSession(
            id=str(uuid.uuid4()),
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            title=title
        )
        db.add(session)
        await db.flush()
        session_id = session.id

    # Step 2: Save user message in DB
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=body.message,
        citations="[]",
        latency_ms=0,
        token_count=max(1, len(body.message) // 4)
    )
    db.add(user_msg)
    await db.flush()

    # Step 3: Fetch recent chat history
    hist_res = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .limit(6)
    )
    hist_msgs = hist_res.scalars().all()
    history = [{"role": m.role, "content": m.content} for m in hist_msgs]

    # Step 4: Execute 12-Step RAG pipeline
    rag_result = await rag_service.answer_question(
        query=body.message,
        organization_id=current_user.organization_id,
        user_role=current_user.role,
        user_id=current_user.id,
        conversation_history=history
    )

    # Step 5: Save assistant response in DB
    assistant_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="assistant",
        content=rag_result["answer"],
        citations=json.dumps(rag_result["citations"]),
        latency_ms=rag_result["latency_ms"],
        token_count=rag_result["token_count"]
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    # Log audit
    await AuditService.log_event(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="QUERY",
        resource_type="CHAT",
        resource_id=assistant_msg.id,
        details=f"Query: {body.message[:50]} (Latency: {rag_result['latency_ms']}ms)"
    )

    return ChatMessageResponse(
        id=assistant_msg.id,
        session_id=session_id,
        role="assistant",
        content=assistant_msg.content,
        citations=rag_result["citations"],
        latency_ms=assistant_msg.latency_ms,
        token_count=assistant_msg.token_count,
        created_at=assistant_msg.created_at
    )


@router.get("/stream")
async def stream_chat(
    message: str = Query(...),
    session_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    rag_service: AdvancedRAGService = Depends(get_rag_service)
):
    """
    Server-Sent Events (SSE) streaming endpoint for real-time streaming answers.
    """
    generator = rag_service.stream_answer(
        query=message,
        organization_id=current_user.organization_id,
        user_role=current_user.role,
        user_id=current_user.id,
        conversation_history=[]
    )

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/feedback")
async def submit_feedback(
    body: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(
        select(UserFeedback).where(
            UserFeedback.message_id == body.message_id,
            UserFeedback.user_id == current_user.id
        )
    )
    item = existing.scalar_one_or_none()

    if item:
        item.rating = body.rating
        item.feedback_text = body.feedback_text
    else:
        item = UserFeedback(
            id=str(uuid.uuid4()),
            message_id=body.message_id,
            user_id=current_user.id,
            rating=body.rating,
            feedback_text=body.feedback_text
        )
        db.add(item)

    await db.commit()
    return {"message": "Feedback submitted successfully", "rating": body.rating}
