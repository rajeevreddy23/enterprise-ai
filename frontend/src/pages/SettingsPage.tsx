import React, { useState, useEffect } from 'react';
import { Settings, Shield, Key, Database, Sparkles, CheckCircle2, AlertCircle, Info, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api.getHealth()
      .then(res => setHealth(res))
      .catch(() => null);
  }, []);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings & Configurations</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage workspace settings, Gemini LLM integrations, and security parameters
        </p>
      </div>

      {/* User Profile Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          User & Organization Profile
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Full Name</span>
            <div className="font-semibold text-slate-900 dark:text-white text-sm">
              {user?.full_name}
            </div>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Email Address</span>
            <div className="font-semibold text-slate-900 dark:text-white text-sm">
              {user?.email}
            </div>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Organization Workspace</span>
            <div className="font-semibold text-slate-900 dark:text-white text-sm">
              {user?.organization?.name || 'Enterprise'} ({user?.organization?.slug})
            </div>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Assigned Role</span>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-bold text-[11px] uppercase">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Google Gemini Configuration Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Google Gemini API Integration
            </h3>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
              health?.gemini_api_active
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
            }`}
          >
            {health?.gemini_api_active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {health?.gemini_api_active ? 'Gemini 1.5 Flash Connected' : 'Grounded Local Engine Active'}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The backend automatically switches between live Google Gemini models (when <code>GEMINI_API_KEY</code> is present in <code>backend/.env</code>) and a deterministic offline synthesis engine for local testing.
        </p>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1 text-slate-700 dark:text-slate-300">
          <div className="text-[11px] text-slate-400 font-sans font-bold uppercase mb-1">
            Environment Setup in backend/.env:
          </div>
          <div>GEMINI_API_KEY="your-google-gemini-api-key-here"</div>
          <div>GEMINI_MODEL="gemini-1.5-flash"</div>
          <div>GEMINI_EMBEDDING_MODEL="models/text-embedding-004"</div>
        </div>
      </div>

      {/* Vector Store Configuration Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Qdrant Vector Database Parameters
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Active Collection</span>
            <div className="font-semibold text-slate-900 dark:text-white">
              {health?.vector_store?.collection_name || 'enterprise_knowledge'}
            </div>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Vector Dimensions</span>
            <div className="font-semibold text-slate-900 dark:text-white">
              768 (Cosine Distance)
            </div>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Multi-Tenancy Index</span>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
              Payload-Isolated
            </div>
          </div>
        </div>
      </div>

      {/* Appearance Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          Appearance & Preferences
        </h3>
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">Theme Mode</div>
            <div className="text-slate-400">Toggle between Light and Dark enterprise dashboard</div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span className="capitalize">{theme} Theme</span>
          </button>
        </div>
      </div>
    </div>
  );
};
