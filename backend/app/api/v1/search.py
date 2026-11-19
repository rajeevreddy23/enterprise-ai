import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models import User, SearchLog
from app.schemas.search import SearchRequest, SearchResponse
from app.api.deps import get_current_user, get_search_service
from app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["Search"])


@router.post("/", response_model=SearchResponse)
async def search_knowledge(
    req: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    search_service: SearchService = Depends(get_search_service)
):
    result = search_service.search(
        query=req.query,
        organization_id=current_user.organization_id,
        user_role=current_user.role,
        user_id=current_user.id,
        search_type=req.search_type or "HYBRID",
        category=req.category,
        document_id=req.document_id,
        limit=req.limit or 10,
        min_score=req.min_score or 0.0
    )

    # Log query to SearchLog for real-time analytics
    log_entry = SearchLog(
        id=str(uuid.uuid4()),
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        query=req.query,
        search_type=req.search_type or "HYBRID",
        result_count=result.total_results,
        latency_ms=result.latency_ms
    )
    db.add(log_entry)
    await db.commit()

    return result
