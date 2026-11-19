import pytest
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStoreService
from app.services.rag_service import AdvancedRAGService
from app.services.rag_evaluator import RAGEvaluator


@pytest.mark.asyncio
async def test_rag_evaluator_metrics():
    embed_svc = EmbeddingService()
    vec_store = VectorStoreService()
    rag_svc = AdvancedRAGService(embed_svc, vec_store)

    org_id = "org-eval-benchmark"
    docs = [
        ("Employee Handbook", "Employees are entitled to 20 days annual leave and vacation time each year."),
        ("Information Security Policy", "Employees must use company VPN and multi factor authentication."),
        ("Travel & Expense Policy", "Submit travel expense reimbursements with itemized receipts.")
    ]

    for title, text in docs:
        v = embed_svc.embed_text(text)
        vec_store.upsert_chunks([{
            "chunk_id": f"eval-{title[:6]}",
            "document_id": f"doc-{title[:6]}",
            "organization_id": org_id,
            "document_title": title,
            "page_number": 1,
            "section_title": "Policy",
            "content": text,
            "access_level": "PUBLIC",
            "allowed_roles": ["Admin", "Manager", "Employee"],
            "uploader_id": "eval-user",
            "vector": v
        }])

    metrics = await RAGEvaluator.run_evaluation(
        rag_service=rag_svc,
        organization_id=org_id,
        user_role="Employee",
        user_id="eval-user",
        k=3
    )

    assert metrics.total_queries_tested == 3
    assert metrics.recall_at_k > 0.0
    assert metrics.mean_reciprocal_rank > 0.0
    assert metrics.faithfulness_score > 0.0
    assert metrics.answer_relevance_score > 0.0
