from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class MetricCard(BaseModel):
    label: str
    value: Any
    change_pct: Optional[float] = None
    trend: Optional[str] = "neutral"  # up, down, neutral


class ChartDataPoint(BaseModel):
    label: str
    value: float


class SystemAnalyticsResponse(BaseModel):
    total_documents: int
    total_processed_documents: int
    total_users: int
    total_questions_asked: int
    processing_success_rate: float
    average_retrieval_latency_ms: float
    average_ai_latency_ms: float
    most_searched_topics: List[ChartDataPoint]
    most_accessed_documents: List[ChartDataPoint]
    documents_by_category: List[ChartDataPoint]
    queries_over_time: List[ChartDataPoint]
    user_activity_breakdown: List[ChartDataPoint]
