import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Shield,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  FileCode,
  Tag,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DocumentItem } from '../types';

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [tags, setTags] = useState('');
  const [accessLevel, setAccessLevel] = useState<'PUBLIC' | 'ROLE_RESTRICTED' | 'PRIVATE'>('PUBLIC');
  const [allowedRoles, setAllowedRoles] = useState('Admin,Manager,Employee');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // Permissions modal state
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [editAccessLevel, setEditAccessLevel] = useState<'PUBLIC' | 'ROLE_RESTRICTED' | 'PRIVATE'>('PUBLIC');
  const [editAllowedRoles, setEditAllowedRoles] = useState('Admin,Manager,Employee');

  const CATEGORIES = ['All', 'General', 'HR', 'Engineering', 'Legal', 'Finance'];

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await api.listDocuments(selectedCategory, searchQuery);
      setDocuments(data.items);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [selectedCategory]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', docTitle || selectedFile.name);
    formData.append('category', category);
    formData.append('tags', tags);
    formData.append('access_level', accessLevel);
    formData.append('allowed_roles', allowedRoles);

    try {
      await api.uploadDocument(formData);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setDocTitle('');
      fetchDocs();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This permanently purges vector embeddings.`)) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handlePreview = async (docId: string) => {
    try {
      const data = await api.previewDocument(docId);
      setPreviewDoc(data);
    } catch (err: any) {
      alert(`Preview failed: ${err.message}`);
    }
  };

  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    try {
      const updated = await api.updateDocumentPermissions(
        editingDoc.id,
        editAccessLevel,
        editAllowedRoles
      );
      setDocuments(prev => prev.map(d => (d.id === updated.id ? updated : d)));
      setEditingDoc(null);
    } catch (err: any) {
      alert(`Permission update failed: ${err.message}`);
    }
  };

  const getFileIcon = (ext: string) => {
    const l = ext.toLowerCase();
    if (l.includes('pdf')) return <FileText className="w-4 h-4 text-rose-500" />;
    if (l.includes('doc')) return <FileText className="w-4 h-4 text-blue-500" />;
    if (l.includes('csv') || l.includes('xls')) return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    return <FileCode className="w-4 h-4 text-slate-500" />;
  };

  const canUpload = user?.role === 'Admin' || user?.role === 'Manager';

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Document Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ingest, manage, and configure access permissions for organizational documents
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDocs}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {canUpload && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition"
            >
              <Upload className="w-4 h-4" />
              <span>Ingest Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDocs()}
            placeholder="Search document title..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Document Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No documents found matching the filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Document</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Chunks</th>
                  <th className="px-4 py-3.5">Access Level</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                          {getFileIcon(doc.file_type)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {doc.title}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {doc.filename} • {Math.round(doc.file_size / 1024)} KB
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                        {doc.category}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {doc.chunk_count} chunks
                    </td>

                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => {
                          if (user?.role === 'Admin' || user?.role === 'Manager') {
                            setEditingDoc(doc);
                            setEditAccessLevel(doc.access_level);
                            setEditAllowedRoles(doc.allowed_roles);
                          }
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition"
                      >
                        <Shield className="w-3 h-3 text-brand-500" />
                        <span>{doc.access_level}</span>
                      </button>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          doc.status === 'READY'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                            : doc.status === 'PROCESSING'
                            ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 animate-pulse'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {doc.status === 'READY' && <CheckCircle2 className="w-3 h-3" />}
                        {doc.status}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePreview(doc.id)}
                          title="Preview Text Chunks"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(user?.role === 'Admin' || (user?.role === 'Manager' && doc.uploader_id === user?.id)) && (
                          <button
                            onClick={() => handleDelete(doc.id, doc.title)}
                            title="Delete Document"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Ingest Enterprise Document
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-xs text-rose-600">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4 text-xs">
              {/* Drag and Drop Zone */}
              <div
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-brand-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 dark:bg-slate-800/40 transition"
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedFile ? selectedFile.name : 'Click to select or drag and drop a file'}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Supported formats: PDF, DOCX, TXT, CSV, XLSX (Up to 50MB)
                </p>
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".pdf,.docx,.txt,.csv,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedFile(f);
                      if (!docTitle) setDocTitle(f.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Employee Handbook 2025"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="General">General</option>
                    <option value="HR">HR</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Legal">Legal</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Access Permission
                  </label>
                  <select
                    value={accessLevel}
                    onChange={(e: any) => setAccessLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="PUBLIC">Public (All Employees)</option>
                    <option value="ROLE_RESTRICTED">Role Restricted</option>
                    <option value="PRIVATE">Private (Owner & Admin)</option>
                  </select>
                </div>
              </div>

              {accessLevel === 'ROLE_RESTRICTED' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Allowed Roles (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={allowedRoles}
                    onChange={(e) => setAllowedRoles(e.target.value)}
                    placeholder="Admin,Manager"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isUploading ? 'Chunking & Embedding...' : 'Start Ingestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                Preview: {previewDoc.title}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {previewDoc.preview_chunks?.map((c: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase mb-1">
                    <span>Chunk #{idx + 1} (Page {c.page})</span>
                    <span>{c.section}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {c.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Modify Document Permissions
              </h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePermissions} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Access Level
                </label>
                <select
                  value={editAccessLevel}
                  onChange={(e: any) => setEditAccessLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="PUBLIC">Public (All Employees)</option>
                  <option value="ROLE_RESTRICTED">Role Restricted</option>
                  <option value="PRIVATE">Private (Uploader & Admin only)</option>
                </select>
              </div>

              {editAccessLevel === 'ROLE_RESTRICTED' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Allowed Roles (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editAllowedRoles}
                    onChange={(e) => setEditAllowedRoles(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold"
                >
                  Save Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
