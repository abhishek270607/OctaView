import React from 'react';
import {
  Key,
  LogIn,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  User,
  Zap,
} from 'lucide-react';
import { TokenProfile } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  activeProfile: TokenProfile | null;
  onOpenProfileModal: () => void;
  onOpenArchitecture: () => void;
  onSelectBenchmark: (repo: string) => void;
  user: FirebaseUser | null;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  tokensRemaining: number;
  maxTokens: number;
  onOpenTokenModal: () => void;
  onOpenQuickSearch: () => void;
  onToggleAiInspector: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeProfile,
  onOpenProfileModal,
  onOpenArchitecture,
  onSelectBenchmark,
  user,
  onSignInWithGoogle,
  onSignOut,
  tokensRemaining,
  maxTokens,
  onOpenTokenModal,
  onOpenQuickSearch,
  onToggleAiInspector,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3 border-b border-slate-800/90 bg-[#080C14] select-none sticky top-0 z-30">
      {/* Zone 1: Clean Brand Wordmark */}
      <a
        href="/"
        className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-slate-100 hover:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
      >
        <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center text-sky-400">
          <Terminal className="w-3.5 h-3.5" />
        </span>
        <span>OctoView</span>
      </a>

      {/* Zone 2: Concise Single-Line Navigation */}
      <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-slate-400">
        <button
          onClick={() => onSelectBenchmark('expressjs/express')}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Express.js
        </button>
        <button
          onClick={() => onSelectBenchmark('tailwindlabs/tailwindcss')}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Tailwind CSS
        </button>
        <button
          onClick={() => onSelectBenchmark('shadcn/ui')}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          shadcn/ui
        </button>
        <button
          onClick={onOpenArchitecture}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Architecture Map
        </button>

        <span aria-hidden="true" className="h-3.5 w-px bg-slate-800" />

        <button
          onClick={onOpenQuickSearch}
          className="flex items-center gap-2 px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-slate-300 hover:text-white rounded-md transition-colors text-xs whitespace-nowrap shrink-0 cursor-pointer"
          title="Quick file search (Ctrl+P / ⌘P)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Quick Open</span>
          <kbd className="text-[10px] text-slate-500 font-mono">Ctrl+P</kbd>
        </button>

        <button
          onClick={onToggleAiInspector}
          className="flex items-center gap-1.5 text-slate-300 hover:text-sky-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Toggle AI Inspector (Ctrl+K / ⌘K)"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>AI Inspector</span>
        </button>
      </nav>

      {/* Zone 3: Workspace Controls & Account */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* AI Usage Quota */}
        <button
          onClick={onOpenTokenModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            tokensRemaining <= 5
              ? 'bg-rose-500/10 border-rose-500/35 text-rose-300'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
          }`}
          title="View AI task quota and activity log"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold tabular-nums text-slate-100">{tokensRemaining}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400 tabular-nums">{maxTokens}</span>
        </button>

        {/* GitHub PAT Manager */}
        <button
          onClick={onOpenProfileModal}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeProfile
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
          }`}
          title={activeProfile ? `Active GitHub PAT: ${activeProfile.name}` : 'Connect GitHub Personal Access Token'}
        >
          {activeProfile ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-[11px] truncate max-w-[96px]">{activeProfile.name}</span>
            </>
          ) : (
            <>
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>GitHub Token</span>
            </>
          )}
        </button>

        {/* Google Auth with Firebase */}
        {user ? (
          <div className="flex items-center gap-1.5 pl-0.5">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg py-1 px-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-5 h-5 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-xs text-slate-200 font-medium truncate max-w-[110px] hidden md:inline">
                {user.displayName || user.email?.split('@')[0]}
              </span>
            </div>
            <button
              onClick={onSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onSignInWithGoogle}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-white text-slate-950 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
