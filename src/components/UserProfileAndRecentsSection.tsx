import React, { useState } from 'react';
import {
  User,
  Clock,
  Zap,
  Star,
  Trash2,
  LogIn,
  LogOut,
  FolderGit2,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { StarredRepoItem } from '../services/firebase';

interface UserProfileAndRecentsSectionProps {
  user: FirebaseUser | null;
  tokensRemaining: number;
  maxTokens: number;
  starredRepos: StarredRepoItem[];
  recentRepos: string[];
  currentRepoFullName: string;
  onSelectRepo: (repoFullName: string) => void;
  onRemoveRecent: (repoFullName: string) => void;
  onClearRecents: () => void;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  onOpenTokenModal: () => void;
}

export const UserProfileAndRecentsSection: React.FC<UserProfileAndRecentsSectionProps> = ({
  user,
  tokensRemaining,
  maxTokens,
  starredRepos,
  recentRepos,
  currentRepoFullName,
  onSelectRepo,
  onRemoveRecent,
  onClearRecents,
  onSignInWithGoogle,
  onSignOut,
  onOpenTokenModal,
}) => {
  const [activeTab, setActiveTab] = useState<'recents' | 'starred'>('recents');

  const popularSuggestions = [
    'facebook/react',
    'vercel/next.js',
    'denoland/deno',
    'nodejs/node',
    'microsoft/vscode',
  ];

  const tokenPercentage = Math.min(100, Math.max(0, (tokensRemaining / Math.max(1, maxTokens)) * 100));

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* Left: Workspace Profile */}
      <div className="lg:col-span-5 bg-[#0C111E] border border-slate-800/90 rounded-xl p-6 flex flex-col justify-between space-y-6">
        <div className="space-y-5">
          {/* Section Title */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
            <h2 className="text-sm font-semibold text-slate-100">Workspace Profile</h2>
            <span className="text-xs text-slate-400">
              {user ? 'Synced Account' : 'Guest Session'}
            </span>
          </div>

          {/* Identity */}
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-12 h-12 rounded-xl ring-1 ring-slate-700 object-cover bg-slate-900"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                <User className="w-5 h-5" />
              </div>
            )}

            <div className="space-y-0.5 min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white truncate">
                {user?.displayName || (user?.email ? user.email.split('@')[0] : 'Guest Developer')}
              </h3>
              <p className="text-xs text-slate-400 truncate font-mono">
                {user?.email || 'Local browser session'}
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 font-mono tabular-nums">
                <span className="text-slate-300">{starredRepos.length} Starred</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-300">{recentRepos.length} Recent</span>
              </div>
            </div>
          </div>

          {/* AI Quota Block */}
          <div className="bg-[#090D18] border border-slate-800/80 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Task Quota</span>
              </span>
              <span className="font-mono font-semibold text-slate-100 tabular-nums">
                {tokensRemaining} <span className="text-slate-500 font-normal">/ {maxTokens}</span>
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  tokenPercentage > 40
                    ? 'bg-sky-400'
                    : tokenPercentage > 15
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${tokenPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <button
                onClick={onOpenTokenModal}
                className="text-xs text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
              >
                View activity log
              </button>

              <button
                onClick={onOpenTokenModal}
                className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
              >
                Manage quota →
              </button>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          {user ? (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={onSignInWithGoogle}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-white text-slate-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in with Google</span>
            </button>
          )}
          <span className="text-[11px] text-slate-500">
            {user ? 'Cloud sync enabled' : 'Local storage mode'}
          </span>
        </div>
      </div>

      {/* Right: Recent & Starred Repositories */}
      <div className="lg:col-span-7 bg-[#0C111E] border border-slate-800/90 rounded-xl p-6 flex flex-col justify-between space-y-5">
        <div className="space-y-4 flex-1 flex flex-col">
          {/* Tabs & Clear Control */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
            <div className="bg-[#080C15] border border-slate-800 p-1 rounded-lg flex items-center text-xs">
              <button
                onClick={() => setActiveTab('recents')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'recents'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Recent ({recentRepos.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('starred')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'starred'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Starred ({starredRepos.length})</span>
              </button>
            </div>

            {activeTab === 'recents' && recentRepos.length > 0 && (
              <button
                onClick={onClearRecents}
                className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear all recent history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Tab 1: Recent Repositories */}
          {activeTab === 'recents' && (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              {recentRepos.length === 0 ? (
                <div className="p-8 text-center bg-[#090D18] border border-slate-800/80 rounded-lg space-y-2">
                  <FolderGit2 className="w-6 h-6 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No repositories explored yet. Enter any GitHub repository above to start.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {recentRepos.map((repo) => {
                    const isActive = repo.toLowerCase() === currentRepoFullName.toLowerCase();
                    return (
                      <div
                        key={repo}
                        className={`px-3.5 py-2.5 rounded-lg border flex items-center justify-between transition-colors group ${
                          isActive
                            ? 'bg-sky-500/10 border-sky-500/35 text-sky-100'
                            : 'bg-[#090D18] border-slate-800/80 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <button
                          onClick={() => onSelectRepo(repo)}
                          className="flex items-center gap-2.5 truncate text-left flex-1 cursor-pointer"
                        >
                          <FolderGit2
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-sky-400'
                            }`}
                          />
                          <div className="truncate">
                            <div className="font-mono text-xs font-medium truncate group-hover:text-white transition-colors">
                              {repo}
                            </div>
                            {isActive && (
                              <span className="text-[11px] text-sky-400">Active repository</span>
                            )}
                          </div>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRecent(repo);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer ml-2 shrink-0"
                          title="Remove from recents"
                          aria-label={`Remove ${repo} from recents`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Benchmark Discovery */}
              <div className="pt-3 border-t border-slate-800/70">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                  <span className="text-slate-500">Explore benchmarks:</span>
                  {popularSuggestions.map((sug) => (
                    <button
                      key={sug}
                      onClick={() => onSelectRepo(sug)}
                      className="font-mono text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Starred Repositories */}
          {activeTab === 'starred' && (
            <div className="flex-1">
              {starredRepos.length === 0 ? (
                <div className="p-8 text-center bg-[#090D18] border border-slate-800/80 rounded-lg space-y-2">
                  <Star className="w-6 h-6 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No starred repositories yet. Click Star in the header banner to bookmark a repository.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {starredRepos.map((starred) => (
                    <button
                      key={starred.id}
                      onClick={() => onSelectRepo(starred.fullName)}
                      className="px-3.5 py-2.5 rounded-lg bg-[#090D18] border border-slate-800/80 hover:border-slate-700 text-left flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div className="truncate mr-2">
                        <div className="font-mono text-xs font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                          {starred.fullName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                          <span>{starred.stars.toLocaleString()} stars</span>
                          {starred.language && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{starred.language}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-sky-400 group-hover:text-sky-300 shrink-0">
                        Open →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
