import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, FileText, CheckCircle2, Layers, Search, Cpu } from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, DocumentChunk } from '../types';

export const KnowledgeBasePage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.listDocuments(),
      api.getHealth()
    ]).then(([docData, healthData]) => {
      setDocuments(docData.items);
      setHealth(healthData);
      if (docData.items.length > 0) {
        loadDocChunks(docData.items[0].id);
      }
      setLoading(false);
    });
  }, []);

  const loadDocChunks = async (docId: string) => {
    setSelectedDocId(docId);
    setLoadingChunks(true);
    try {
      const data = await api.getDocument(docId);
      setChunks(data.chunks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChunks(false);
    }
  };

  const selectedDoc = documents.find(d => d.id === selectedDocId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Knowledge Base & Vector Store</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Inspect Qdrant vector collection, chunk payload indexing, and high-dimensional embeddings
        </p>
      </div>

      {/* Vector Store Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <Database className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>Qdrant Collection</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {health?.vector_store?.collection_name || 'enterprise_knowledge'}
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>HNSW Index Ready (Cosine)</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Total Vector Points</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {health?.vector_store?.vectors_count ?? chunks.length} Chunks
          </div>
          <p className="text-xs text-slate-400 mt-1">
            768-dim embeddings
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>AI Embeddings Engine</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {health?.gemini_embedding_model || 'text-embedding-004'}
          </div>
          <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">
            {health?.gemini_api_active ? 'Live Gemini Embedding' : 'Grounded Deterministic Engine'}
          </p>
        </div>
      </div>

      {/* Two Column Layout: Document Picker on Left, Chunks Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Selector */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[600px]">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Documents</h3>
          <p className="text-xs text-slate-400 mb-3">Select a document to inspect indexed chunks</p>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {documents.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                No documents found.
              </div>
            ) : (
              documents.map(d => {
                const isSelected = selectedDocId === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => loadDocChunks(d.id)}
                    className={`w-full text-left p-3 rounded-xl transition border text-xs ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 font-semibold'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="truncate font-bold mb-1">{d.title}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{d.category}</span>
                      <span>{d.chunk_count} chunks</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chunk Inspector */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Chunk Payload Inspector: {selectedDoc?.title || 'None Selected'}
              </h3>
              <p className="text-xs text-slate-400">
                {chunks.length} chunks indexed with page numbers & heading tags
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loadingChunks ? (
              <div className="text-center py-12 text-xs text-slate-400">
                Loading chunk payloads...
              </div>
            ) : chunks.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                No chunks available for this document.
              </div>
            ) : (
              chunks.map((c, idx) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between text-[11px] gap-2 pb-2 border-b border-slate-200/50 dark:border-slate-700/50 text-slate-500">
                    <span className="font-bold text-brand-600 dark:text-brand-400">
                      Chunk #{idx + 1}
                    </span>
                    <span>Page {c.page_number}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                      Section: {c.section_title || 'General'}
                    </span>
                    <span>~{c.token_count} tokens</span>
                  </div>

                  <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
                    {c.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
