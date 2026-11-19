export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'Admin' | 'Manager' | 'Employee';
  organization_id: string;
  is_active: boolean;
  created_at: string;
  organization?: Organization;
}

export interface DocumentItem {
  id: string;
  organization_id: string;
  uploader_id?: string;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  category: string;
  tags?: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  access_level: 'PUBLIC' | 'ROLE_RESTRICTED' | 'PRIVATE';
  allowed_roles: string;
  chunk_count: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  page_number: number;
  section_title?: string;
  content: string;
  token_count: number;
  created_at: string;
}

export interface Citation {
  document_id: string;
  document_title: string;
  page_number: number;
  section_title?: string;
  excerpt: string;
  relevance_score?: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[];
  latency_ms: number;
  token_count: number;
  created_at: string;
  feedback?: {
    rating: number;
    feedback_text?: string;
  };
}

export interface ChatSession {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_title: string;
  page_number: number;
  section_title?: string;
  content: string;
  score: number;
  search_type: string;
  category?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface AnalyticsData {
  total_documents: number;
  total_processed_documents: number;
  total_users: number;
  total_questions_asked: number;
  processing_success_rate: number;
  average_retrieval_latency_ms: number;
  average_ai_latency_ms: number;
  most_searched_topics: ChartDataPoint[];
  most_accessed_documents: ChartDataPoint[];
  documents_by_category: ChartDataPoint[];
  queries_over_time: ChartDataPoint[];
  user_activity_breakdown: ChartDataPoint[];
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  timestamp: string;
}

export interface RAGEvalMetrics {
  recall_at_k: number;
  mean_reciprocal_rank: number;
  faithfulness_score: number;
  answer_relevance_score: number;
  total_queries_tested: number;
  sample_details: Array<{
    question: string;
    expected: string;
    retrieved_count: number;
    rank_found: number;
    verified: boolean;
    latency_ms: number;
  }>;
}
