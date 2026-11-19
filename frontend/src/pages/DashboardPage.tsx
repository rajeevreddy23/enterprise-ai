import React, { useEffect, useState } from 'react';
import {
  FileText,
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Database,
  Upload,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { PageId } from '../components/layout/Sidebar';
import { api } from '../services/api';
import { DocumentItem, AnalyticsData } from '../types';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAnalytics().catch(() => null),
      api.listDocuments().catch(() => ({ items: [], total: 0 })),
    ]).then(([anaData, docData]) => {
      if (anaData) setAnalytics(anaData);
      if (docData) setDocuments(docData.items.slice(0, 5));
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 text-white p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-brand-200 text-xs font-semibold mb-4 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-brand-300" />
            <span>AI Knowledge Infrastructure Ready</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome to Enterprise AI Assistant
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Upload internal enterprise documents, query company knowledge with strictly grounded citations, and enforce granular role-based access policies with zero cross-tenant leakage.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => onNavigate('chat')}
              className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold shadow-lg shadow-brand-500/25 flex items-center gap-2 transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Start AI Chat Session</span>
            </button>
            <button
              onClick={() => onNavigate('documents')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 flex items-center gap-2 transition"
            >
              <Upload className="w-4 h-4" />
              <span>Ingest Documents</span>
            </button>
            <button
              onClick={() => onNavigate('search')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 flex items-center gap-2 transition"
            >
              <Search className="w-4 h-4" />
              <span>Search Explorer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Indexed Documents</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : analytics?.total_documents ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{analytics?.total_processed_documents ?? 0} fully processed</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Processing Success</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : `${analytics?.processing_success_rate ?? 100}%`}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Automated cleaning & chunking
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Questions Answered</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : analytics?.total_questions_asked ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across active sessions
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg RAG Latency</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : `${analytics?.average_ai_latency_ms ?? 350}ms`}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Retrieval + Generation time
          </p>
        </div>
      </div>

      {/* Two Column Layout: Recent Docs & Frequent Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Documents (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Documents</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Latest ingested organizational knowledge</p>
            </div>
            <button
              onClick={() => onNavigate('documents')}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No documents uploaded yet.</p>
              <button
                onClick={() => onNavigate('documents')}
                className="mt-3 px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 text-xs font-semibold"
              >
                Upload your first document
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.map((doc) => (
                <div key={doc.id} className="py-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold shrink-0 uppercase">
                      {doc.file_type.replace('.', '')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {doc.title}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                          {doc.category}
                        </span>
                        <span>•</span>
                        <span>{doc.chunk_count} chunks</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${
                      doc.status === 'READY'
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                        : doc.status === 'PROCESSING'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 animate-pulse'
                        : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Frequent Search Queries & Vector Health (1 col) */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Top Searched Topics
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Frequent queries across your team
            </p>

            <div className="space-y-2.5">
              {(analytics?.most_searched_topics || []).map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                    {t.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 text-[10px] font-bold">
                    {t.value} queries
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Vector Architecture
              </h3>
            </div>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span>Vector Engine</span>
                <span className="font-semibold text-slate-900 dark:text-white">Qdrant HNSW</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span>Embedding Model</span>
                <span className="font-semibold text-slate-900 dark:text-white">text-embedding-004</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span>Dimensions</span>
                <span className="font-semibold text-slate-900 dark:text-white">768 Float32</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Reranking</span>
                <span className="font-semibold text-slate-900 dark:text-white">RRF (Dense + BM25)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
