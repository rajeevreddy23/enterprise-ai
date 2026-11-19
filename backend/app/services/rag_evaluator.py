import time
from typing import List, Dict, Any
from pydantic import BaseModel
from app.services.rag_service import AdvancedRAGService


class EvalSample(BaseModel):
    question: str
    expected_doc_title: str
    expected_keywords: List[str]


class RAGEvalMetrics(BaseModel):
    recall_at_k: float  # e.g., Recall@3
    mean_reciprocal_rank: float  # MRR
    faithfulness_score: float
    answer_relevance_score: float
    total_queries_tested: int
    sample_details: List[Dict[str, Any]]


class RAGEvaluator:
    """
    Automated evaluation harness for RAG retrieval and generation.
    Computes Recall@K, MRR, Faithfulness, and Answer Relevance.
    """

    BENCHMARK_DATASET = [
        EvalSample(
            question="What is the employee annual leave entitlement?",
            expected_doc_title="Employee Handbook",
            expected_keywords=["leave", "vacation", "days", "annual"]
        ),
        EvalSample(
            question="What are the remote work and security compliance standards?",
            expected_doc_title="Information Security Policy",
            expected_keywords=["security", "vpn", "authentication", "encryption"]
        ),
        EvalSample(
            question="How do employees submit travel expense reimbursements?",
            expected_doc_title="Travel & Expense Policy",
            expected_keywords=["expense", "receipt", "reimbursement", "approval"]
        ),
    ]

    @classmethod
    async def run_evaluation(
        cls,
        rag_service: AdvancedRAGService,
        organization_id: str,
        user_role: str,
        user_id: str,
        k: int = 3
    ) -> RAGEvalMetrics:
        reciprocal_ranks: List[float] = []
        recall_hits = 0
        faithfulness_scores: List[float] = []
        relevance_scores: List[float] = []
        details: List[Dict[str, Any]] = []

        for sample in cls.BENCHMARK_DATASET:
            # Step 1: Evaluate Retrieval (Recall@K & MRR)
            retrieved = rag_service.hybrid_retrieve(
                query=sample.question,
                organization_id=organization_id,
                user_role=user_role,
                user_id=user_id,
                top_k=k
            )

            found_rank = 0
            for rank, chunk in enumerate(retrieved, start=1):
                chunk_title = chunk.get("document_title", "").lower()
                expected = sample.expected_doc_title.lower()
                content = chunk.get("content", "").lower()
                
                # Check if expected title or keywords match
                if expected in chunk_title or any(kw in content for kw in sample.expected_keywords):
                    found_rank = rank
                    break

            if found_rank > 0:
                recall_hits += 1
                reciprocal_ranks.append(1.0 / found_rank)
            else:
                reciprocal_ranks.append(0.0)

            # Step 2: Evaluate Generation (Faithfulness & Relevance)
            result = await rag_service.answer_question(
                query=sample.question,
                organization_id=organization_id,
                user_role=user_role,
                user_id=user_id
            )

            answer = result["answer"].lower()
            verified = result.get("verified", False)
            faithfulness_scores.append(1.0 if verified else 0.5)

            # Measure relevance: query keyword presence in answer
            q_keywords = [w.lower() for w in sample.question.split() if len(w) > 3]
            match_count = sum(1 for kw in q_keywords if kw in answer)
            rel_score = match_count / max(1, len(q_keywords))
            relevance_scores.append(min(1.0, rel_score))

            details.append({
                "question": sample.question,
                "expected": sample.expected_doc_title,
                "retrieved_count": len(retrieved),
                "rank_found": found_rank,
                "verified": verified,
                "latency_ms": result.get("latency_ms", 0)
            })

        num_samples = len(cls.BENCHMARK_DATASET)
        mrr = sum(reciprocal_ranks) / max(1, num_samples)
        recall_at_k = recall_hits / max(1, num_samples)
        avg_faithfulness = sum(faithfulness_scores) / max(1, num_samples)
        avg_relevance = sum(relevance_scores) / max(1, num_samples)

        return RAGEvalMetrics(
            recall_at_k=round(recall_at_k, 3),
            mean_reciprocal_rank=round(mrr, 3),
            faithfulness_score=round(avg_faithfulness, 3),
            answer_relevance_score=round(avg_relevance, 3),
            total_queries_tested=num_samples,
            sample_details=details
        )
