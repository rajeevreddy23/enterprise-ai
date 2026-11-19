import React, { useEffect, useState } from 'react';
import { Menu, Sun, Moon, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { PageId } from './Sidebar';
import { api } from '../../services/api';

interface HeaderProps {
  currentPage: PageId;
  onOpenMobileSidebar: () => void;
}

const PAGE_TITLES: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: { title: 'Executive Overview', subtitle: 'Enterprise knowledge health and real-time operations' },
  chat: { title: 'AI Chat Workspace', subtitle: 'Conversational retrieval with strict citations and evidence checks' },
  documents: { title: 'Document Management', subtitle: 'Secure multi-format ingestion with document-level RBAC' },
  kb: { title: 'Knowledge Base', subtitle: 'Qdrant vector collection explorer and chunk index inspector' },
  search: { title: 'Search Explorer', subtitle: 'Hybrid semantic & BM25 keyword search with match highlights' },
  analytics: { title: 'Enterprise Analytics', subtitle: 'Real-time database metrics, latencies, and query distributions' },
  users: { title: 'User & Role Access', subtitle: 'Manage organization memberships and role-based permissions' },
  settings: { title: 'Platform Settings', subtitle: 'System configurations, API credentials, and deployment details' },
};

export const Header: React.FC<HeaderProps> = ({ currentPage, onOpenMobileSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<{
    gemini_api_active: boolean;
    gemini_model: string;
    vector_store: { vectors_count: number };
  } | null>(null);

  useEffect(() => {
    api.getHealth()
      .then(res => setHealth(res))
      .catch(() => setHealth(null));
  }, []);

  const pageInfo = PAGE_TITLES[currentPage] || { title: 'Enterprise AI', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
            {pageInfo.title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
            {pageInfo.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Gemini Engine Status Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          {health?.gemini_api_active ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Gemini 1.5 Flash (Live)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400" title="Add GEMINI_API_KEY in backend/.env for live cloud model">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Grounded Local Engine</span>
            </span>
          )}
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            {health?.vector_store?.vectors_count ?? 0} Chunks
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
