import time
import re
from typing import List, Dict, Any, Optional
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStoreService
from app.schemas.search import SearchResponse, SearchResultItem
from rank_bm25 import BM25Okapi


class SearchService:
    def __init__(
        self,
        embedding_service: Optional[EmbeddingService] = None,
        vector_store: Optional[VectorStoreService] = None,
    ):
        self.embed_svc = embedding_service or EmbeddingService()
        self.vector_store = vector_store or VectorStoreService()

    def search(
        self,
        query: str,
        organization_id: str,
        user_role: str,
        user_id: str,
        search_type: str = "HYBRID",  # HYBRID, VECTOR, KEYWORD
        category: Optional[str] = None,
        document_id: Optional[str] = None,
        limit: int = 10,
        min_score: float = 0.0
    ) -> SearchResponse:
        start_time = time.time()
        search_type = search_type.upper()

        # Step 1: Fetch vector candidates from Qdrant
        query_vector = self.embed_svc.embed_text(query, is_query=True)
        raw_hits = self.vector_store.search_vectors(
            query_vector=query_vector,
            organization_id=organization_id,
            user_role=user_role,
            user_id=user_id,
            category=category,
            document_id=document_id,
            limit=limit * 2
        )

        results: List[SearchResultItem] = []

        if not raw_hits:
            latency_ms = int((time.time() - start_time) * 1000)
            return SearchResponse(
                query=query,
                search_type=search_type,
                total_results=0,
                latency_ms=latency_ms,
                results=[]
            )

        if search_type == "VECTOR":
            for hit in raw_hits[:limit]:
                score = hit.get("score", 0.0)
                if score >= min_score:
                    results.append(self._to_search_item(hit, score, "VECTOR", query))

        elif search_type == "KEYWORD":
            # Keyword BM25 ranking over candidate contents
            corpus = [h.get("content", "") for h in raw_hits]
            tokenized = [c.lower().split() for c in corpus]
            bm25 = BM25Okapi(tokenized)
            scores = bm25.get_scores(query.lower().split())
            
            ranked_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
            for idx in ranked_idx[:limit]:
                score = float(scores[idx])
                if score >= min_score:
                    results.append(self._to_search_item(raw_hits[idx], score, "KEYWORD", query))

        else:  # HYBRID (default)
            corpus = [h.get("content", "") for h in raw_hits]
            tokenized = [c.lower().split() for c in corpus]
            try:
                bm25 = BM25Okapi(tokenized)
                bm25_scores = bm25.get_scores(query.lower().split())
                sparse_ranked = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)
            except Exception:
                sparse_ranked = list(range(len(raw_hits)))

            # Reciprocal Rank Fusion
            k = 60
            fused_scores = {}
            for rank_dense, _ in enumerate(raw_hits):
                fused_scores[rank_dense] = 1.0 / (k + rank_dense + 1)
            for rank_sparse, idx in enumerate(sparse_ranked):
                fused_scores[idx] = fused_scores.get(idx, 0.0) + (1.0 / (k + rank_sparse + 1))

            ranked = sorted(fused_scores.keys(), key=lambda i: fused_scores[i], reverse=True)
            for idx in ranked[:limit]:
                score = round(fused_scores[idx] * 10, 3)  # Scale for display
                if score >= min_score:
                    results.append(self._to_search_item(raw_hits[idx], score, "HYBRID", query))

        latency_ms = int((time.time() - start_time) * 1000)
        return SearchResponse(
            query=query,
            search_type=search_type,
            total_results=len(results),
            latency_ms=latency_ms,
            results=results
        )

    def _to_search_item(self, hit: Dict[str, Any], score: float, stype: str, query: str) -> SearchResultItem:
        content = hit.get("content", "")
        # Highlight match terms if found
        highlighted = self._highlight_text(content, query)
        
        return SearchResultItem(
            chunk_id=hit.get("chunk_id", ""),
            document_id=hit.get("document_id", ""),
            document_title=hit.get("document_title", ""),
            page_number=hit.get("page_number", 1),
            section_title=hit.get("section_title"),
            content=highlighted,
            score=round(score, 3),
            search_type=stype,
            category=hit.get("category", "General")
        )

    def _highlight_text(self, text: str, query: str) -> str:
        words = [w for w in re.split(r"\W+", query) if len(w) > 2]
        if not words:
            return text[:400]
        
        # Find first occurrence of any query word
        lower_text = text.lower()
        first_pos = -1
        for w in words:
            pos = lower_text.find(w.lower())
            if pos != -1 and (first_pos == -1 or pos < first_pos):
                first_pos = pos

        start = max(0, first_pos - 60) if first_pos != -1 else 0
        end = min(len(text), start + 400)
        snippet = text[start:end]
        if start > 0:
            snippet = "..." + snippet
        if end < len(text):
            snippet = snippet + "..."
        return snippet
