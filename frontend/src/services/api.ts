import {
  User, DocumentItem, DocumentChunk, ChatSession,
  ChatMessage, SearchResult, AnalyticsData, AuditLog,
  RAGEvalMetrics
} from '../types';

const API_BASE = '/api/v1';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  public setToken(token: string) {
    localStorage.setItem('access_token', token);
  }

  public clearToken() {
    localStorage.removeItem('access_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearToken();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async register(data: { email: string; password: string; full_name: string; organization_name: string; role?: string }) {
    const resp = await this.request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(resp.access_token);
    return resp;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Documents
  async listDocuments(category?: string, search?: string): Promise<{ items: DocumentItem[]; total: number }> {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search) params.append('search', search);
    return this.request<{ items: DocumentItem[]; total: number }>(`/documents/?${params.toString()}`);
  }

  async uploadDocument(formData: FormData): Promise<DocumentItem> {
    return this.request<DocumentItem>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getDocument(id: string): Promise<DocumentItem & { chunks: DocumentChunk[] }> {
    return this.request<DocumentItem & { chunks: DocumentChunk[] }>(`/documents/${id}`);
  }

  async previewDocument(id: string): Promise<{
    id: string;
    title: string;
    filename: string;
    file_type: string;
    preview_chunks: Array<{ page: number; section: string; content: string }>;
  }> {
    return this.request(`/documents/${id}/preview`);
  }

  async deleteDocument(id: string): Promise<{ message: string; id: string }> {
    return this.request<{ message: string; id: string }>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async updateDocumentPermissions(id: string, access_level: string, allowed_roles: string): Promise<DocumentItem> {
    return this.request<DocumentItem>(`/documents/${id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ access_level, allowed_roles }),
    });
  }

  // Chat
  async listChatSessions(): Promise<ChatSession[]> {
    return this.request<ChatSession[]>('/chat/sessions');
  }

  async createChatSession(title: string = 'New Conversation'): Promise<ChatSession> {
    return this.request<ChatSession>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async getChatSession(sessionId: string): Promise<ChatSession> {
    return this.request<ChatSession>(`/chat/sessions/${sessionId}`);
  }

  async deleteChatSession(sessionId: string): Promise<{ message: string }> {
    return this.request(`/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async sendMessage(sessionId: string | null, message: string): Promise<ChatMessage> {
    return this.request<ChatMessage>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, message }),
    });
  }

  async submitFeedback(messageId: string, rating: number, feedbackText?: string): Promise<{ message: string }> {
    return this.request('/chat/feedback', {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId, rating, feedback_text: feedbackText }),
    });
  }

  // Search Explorer
  async searchKnowledge(
    query: string,
    searchType: string = 'HYBRID',
    category?: string,
    limit: number = 10
  ): Promise<{
    query: string;
    search_type: string;
    total_results: number;
    latency_ms: number;
    results: SearchResult[];
  }> {
    return this.request('/search/', {
      method: 'POST',
      body: JSON.stringify({
        query,
        search_type: searchType,
        category: category !== 'All' ? category : undefined,
        limit,
      }),
    });
  }

  // Analytics
  async getAnalytics(): Promise<AnalyticsData> {
    return this.request<AnalyticsData>('/analytics/');
  }

  // Users & RBAC
  async listUsers(): Promise<User[]> {
    return this.request<User[]>('/users/');
  }

  async createUser(data: { email: string; password: string; full_name: string; role: string }): Promise<User> {
    return this.request<User>('/users/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    return this.request<User>(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return this.request<AuditLog[]>('/users/audit-logs');
  }

  // Evaluation
  async runEvaluation(k: number = 3): Promise<RAGEvalMetrics> {
    return this.request<RAGEvalMetrics>(`/evaluation/benchmark?k=${k}`, {
      method: 'POST',
    });
  }

  // System Health
  async getHealth(): Promise<{
    status: string;
    version: string;
    vector_store: { collection_name: string; vectors_count: number; status: string };
    gemini_api_active: boolean;
    gemini_model: string;
  }> {
    const res = await fetch('/api/health');
    return res.json();
  }
}

export const api = new ApiClient();
