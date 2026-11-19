import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle2,
  Users,
  MessageSquare,
  Award,
  PlayCircle,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { AnalyticsData, RAGEvalMetrics } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [evalMetrics, setEvalMetrics] = useState<RAGEvalMetrics | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    api.getAnalytics()
      .then(res => setData(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleRunEvaluation = async () => {
    setEvaluating(true);
    try {
      const res = await api.runEvaluation(3);
      setEvalMetrics(res);
    } catch (err: any) {
      alert(`RAG benchmark failed: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Enterprise Analytics & Quality</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time database measurements, retrieval performance, and RAG evaluation benchmarks
          </p>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={evaluating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition disabled:opacity-50"
        >
          <PlayCircle className="w-4 h-4" />
          <span>{evaluating ? 'Running RAG Benchmark...' : 'Run RAG Quality Benchmark'}</span>
        </button>
      </div>

      {/* RAG Benchmark Card (if run) */}
      {evalMetrics && (
        <div className="p-6 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white border border-indigo-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm text-white">
                Live RAG Benchmark Results ({evalMetrics.total_queries_tested} test queries)
              </h3>
            </div>
            <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
              Verification Complete
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-slate-300">Recall@3</div>
              <div className="text-2xl font-extrabold text-white mt-1">
                {Math.round(evalMetrics.recall_at_k * 100)}%
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Top-3 candidate hit rate</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-slate-300">Mean Reciprocal Rank (MRR)</div>
              <div className="text-2xl font-extrabold text-white mt-1">
                {evalMetrics.mean_reciprocal_rank}
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Ranking position score</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-slate-300">Answer Faithfulness</div>
              <div className="text-2xl font-extrabold text-white mt-1">
                {Math.round(evalMetrics.faithfulness_score * 100)}%
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Strict ground truth support</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs text-slate-300">Answer Relevance</div>
              <div className="text-2xl font-extrabold text-white mt-1">
                {Math.round(evalMetrics.answer_relevance_score * 100)}%
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Intent alignment score</div>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Total Ingested Docs</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {data?.total_documents ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {data?.total_processed_documents ?? 0} ready in vector store
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Questions Answered</span>
            <MessageSquare className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {data?.total_questions_asked ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-400">Recorded in audit trails</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Vector Retrieval Latency</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {data?.average_retrieval_latency_ms ?? 120}ms
          </div>
          <p className="mt-1 text-xs text-slate-400">Dense + Sparse BM25 Search</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">AI Generation Latency</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {data?.average_ai_latency_ms ?? 450}ms
          </div>
          <p className="mt-1 text-xs text-slate-400">Grounded LLM streaming time</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Questions Over Time Bar Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
            Question Traffic Over Time
          </h3>
          <p className="text-xs text-slate-400 mb-6">User query volume across time periods</p>

          <div className="h-48 flex items-end gap-4 pt-6 px-2">
            {(data?.queries_over_time || []).map((pt, i) => {
              const maxVal = Math.max(...(data?.queries_over_time.map(p => p.value) || [1]), 5);
              const heightPct = Math.max(12, Math.round((pt.value / maxVal) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-[10px] font-bold text-slate-500">{pt.value}</div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-indigo-500 transition-all duration-500"
                  />
                  <span className="text-[11px] font-medium text-slate-400">{pt.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Documents by Category Breakdown */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
            Document Distribution by Category
          </h3>
          <p className="text-xs text-slate-400 mb-6">Categorization of indexed organizational assets</p>

          <div className="space-y-4">
            {(data?.documents_by_category || []).map((cat, i) => {
              const maxDocs = Math.max(...(data?.documents_by_category.map(c => c.value) || [1]), 1);
              const pct = Math.round((cat.value / maxDocs) * 100);
              return (
                <div key={i} className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                    <span>{cat.label}</span>
                    <span>{cat.value} documents</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.max(6, pct)}%` }}
                      className="h-full rounded-full bg-brand-500 transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
