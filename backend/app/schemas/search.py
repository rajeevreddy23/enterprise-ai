from typing import Optional, List
from pydantic import BaseModel


class SearchRequest(BaseModel):
    query: str
    search_type: Optional[str] = "HYBRID"  # HYBRID, VECTOR, KEYWORD
    category: Optional[str] = None
    document_id: Optional[str] = None
    limit: Optional[int] = 10
    min_score: Optional[float] = 0.0


class SearchResultItem(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    page_number: int
    section_title: Optional[str] = None
    content: str
    score: float
    search_type: str
    category: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    search_type: str
    total_results: int
    latency_ms: int
    results: List[SearchResultItem]
