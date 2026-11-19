from fastapi import APIRouter, Depends
from app.models import User
from app.api.deps import get_current_user, get_rag_service
from app.services.rag_service import AdvancedRAGService
from app.services.rag_evaluator import RAGEvaluator, RAGEvalMetrics

router = APIRouter(prefix="/evaluation", tags=["RAG Evaluation"])


@router.post("/benchmark", response_model=RAGEvalMetrics)
async def run_rag_benchmark(
    k: int = 3,
    current_user: User = Depends(get_current_user),
    rag_service: AdvancedRAGService = Depends(get_rag_service)
):
    """
    Executes automated RAG evaluation measuring Recall@K,
    Mean Reciprocal Rank (MRR), Faithfulness, and Relevance.
    """
    metrics = await RAGEvaluator.run_evaluation(
        rag_service=rag_service,
        organization_id=current_user.organization_id,
        user_role=current_user.role,
        user_id=current_user.id,
        k=k
    )
    return metrics
