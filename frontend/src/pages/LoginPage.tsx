import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  Database,
  Cpu,
  Sun,
  Moon,
  Layers,
  FileCheck2,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface LoginPageProps {
  onSwitchToRegister?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = () => {
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Mode: 'signin' | 'register'
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRolePill, setSelectedRolePill] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register({
          email,
          password,
          full_name: fullName,
          organization_name: orgName || 'Acme Enterprise',
          role: 'Admin',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoRole = (role: 'Admin' | 'Manager' | 'Employee') => {
    setSelectedRolePill(role);
    setMode('signin');
    if (role === 'Admin') {
      setEmail('admin@enterprise.ai');
      setPassword('Admin@123456');
    } else if (role === 'Manager') {
      setEmail('manager@enterprise.ai');
      setPassword('Manager@123456');
    } else {
      setEmail('employee@enterprise.ai');
      setPassword('Employee@123456');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      {/* Top Floating Theme Switcher */}
      <div className="absolute top-5 right-5 z-50 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 backdrop-blur-md transition shadow-lg"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>
      </div>

      {/* ================= LEFT HERO PANEL ================= */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 lg:p-16 relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 border-r border-slate-800/60 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-[90px] pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 text-white shadow-xl shadow-brand-500/25">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white block">
                Enterprise AI
              </span>
              <span className="text-[11px] font-bold text-brand-400 uppercase tracking-widest">
                Knowledge Assistant
              </span>
            </div>
          </div>
        </div>

        {/* Center Pitch & Highlights */}
        <div className="relative z-10 max-w-lg space-y-8 my-auto py-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span>Next-Gen Advanced RAG Platform</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              Unlock the collective intelligence of your organization.
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Connect company documents (PDF, DOCX, XLSX, CSV) and empower your team to query internal policies, code architecture, and compliance standards with strictly grounded citations.
            </p>
          </div>

          {/* Feature Showcase Cards */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.06] transition">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Zero-Leakage Multi-Tenancy & RBAC</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Vector payloads enforce mandatory organization boundaries and role access controls.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.06] transition">
              <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 shrink-0 mt-0.5">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">12-Step Hybrid RAG + Reciprocal Rank Fusion</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Combines Dense Gemini 768-dim embeddings with Sparse BM25 keyword matching for optimal recall.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.06] transition">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Evidence Verification & Verifiable Citations</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Every AI response points directly to original document names, page numbers, and exact excerpts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Badges */}
        <div className="relative z-10 flex items-center gap-6 pt-6 border-t border-slate-800/60 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>SOC2 Type II Ready</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>AES-256 Encrypted</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-Tenant Isolated</span>
          </span>
        </div>
      </div>

      {/* ================= RIGHT FORM PANEL ================= */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative bg-slate-950">
        <div className="w-full max-w-md relative z-10">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black text-white block">Enterprise AI</span>
              <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">
                Knowledge Assistant
              </span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 mb-8 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In to Workspace
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              New Organization
            </button>
          </div>

          {/* Form Card */}
          <div className="rounded-3xl p-8 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl shadow-black/50">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {mode === 'signin' ? 'Welcome back' : 'Create Enterprise Workspace'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'signin'
                  ? 'Enter your credentials to access your isolated knowledge base'
                  : 'Set up your company workspace with RBAC access control'}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 font-medium flex items-start gap-2 animate-fadeIn">
                <span className="shrink-0 text-rose-400 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Company / Organization Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Acme Corp"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <span className="text-[11px] text-brand-400 hover:text-brand-300 cursor-pointer">
                      Forgot?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
              >
                <span>
                  {loading
                    ? 'Authenticating...'
                    : mode === 'signin'
                    ? 'Sign In to Workspace'
                    : 'Create Enterprise Workspace'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick 1-Click Demo Login Selector */}
            {mode === 'signin' && (
              <div className="mt-8 pt-6 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    1-Click Demo Access
                  </span>
                  <span className="text-[10px] text-brand-400 font-semibold">
                    Click pill to populate
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemoRole('Admin')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedRolePill === 'Admin'
                        ? 'bg-brand-600/20 border-brand-500 text-white shadow-md'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs text-white">
                      <span>Admin</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      Full Access
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoRole('Manager')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedRolePill === 'Manager'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs text-white">
                      <span>Manager</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      Team & Docs
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoRole('Employee')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedRolePill === 'Employee'
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-bold text-xs text-white">
                      <span>Employee</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      Search & Chat
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="mt-6 text-center text-xs text-slate-500">
            <span>Enterprise AI Knowledge Assistant • Multi-Tenant Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
