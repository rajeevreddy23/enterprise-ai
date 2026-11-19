import React, { useState } from 'react';
import { Search, Sparkles, Filter, Clock, FileText, ChevronRight, Hash, Layers } from 'lucide-react';
import { api } from '../services/api';
import { SearchResult } from '../types';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'HYBRID' | 'VECTOR' | 'KEYWORD'>('HYBRID');
  const [category, setCategory] = useState('All');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const CATEGORIES = ['All', 'General', 'HR', 'Engineering', 'Legal', 'Finance'];

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const resp = await api.searchKnowledge(query, searchType, category, 12);
      setResults(resp.results);
      setLatencyMs(resp.latency_ms);
      setTotalResults(resp.total_results);
    } catch (err: any) {
      console.error('Search failed', err);
      alert(`Search error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Enterprise Search Explorer</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Search across organizational knowledge with hybrid vector retrieval, BM25 scoring, and RRF reranking
        </p>
      </div>

      {/* Search Input Box */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search policies, compliance guidelines, code architecture, or benefits..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-500/20 transition disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Search Mode & Category Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Search Mode Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setSearchType('HYBRID')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                searchType === 'HYBRID'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Hybrid (Vector + BM25)
            </button>
            <button
              type="button"
              onClick={() => setSearchType('VECTOR')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                searchType === 'VECTOR'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Dense Vector
            </button>
            <button
              type="button"
              onClick={() => setSearchType('KEYWORD')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                searchType === 'KEYWORD'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Keyword (BM25)
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search Results Summary */}
      {hasSearched && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Found <strong>{totalResults}</strong> relevant chunks across documents</span>
          {latencyMs !== null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Search completed in {latencyMs}ms</span>
            </span>
          )}
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Running hybrid retrieval across indexed vectors...
          </div>
        ) : results.length === 0 && hasSearched ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No matching document chunks found for "{query}".</p>
          </div>
        ) : (
          results.map((res, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-brand-500/50 transition space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {res.document_title}
                  </span>
                  <span className="text-xs text-slate-400">• Page {res.page_number}</span>
                  {res.section_title && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                      {res.section_title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 text-[10px] font-bold">
                    Score: {res.score}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    {res.search_type}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                {res.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
