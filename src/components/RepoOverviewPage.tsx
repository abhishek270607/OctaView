import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Code2,
  ExternalLink,
  Folder,
  GitBranch,
  Loader2,
  Search,
  Star,
  Zap,
} from 'lucide-react';
import { marked } from 'marked';
import { FileNode, GitTreeItem, RepoMeta } from '../types';
import { formatBytes, getFileCategoryBadge } from '../utils/fileTree';
import { resolveRepoBanner } from '../utils/repoBanner';
import { RepoStarTrendChart } from './RepoStarTrendChart';
import { UserProfileAndRecentsSection } from './UserProfileAndRecentsSection';
import { User as FirebaseUser } from 'firebase/auth';
import { StarredRepoItem } from '../services/firebase';

interface RepoOverviewPageProps {
  repoMeta: RepoMeta;
  readmeContent: string | null;
  isLoadingReadme: boolean;
  rawItems: GitTreeItem[];
  fileTree: FileNode[];
  onOpenFile: (path: string) => void;
  onSwitchToExplorer: () => void;
  isStarred: boolean;
  onToggleStar: () => void;
  onOpenArchitecture: () => void;
  user: FirebaseUser | null;
  tokensRemaining: number;
  maxTokens: number;
  starredRepos: StarredRepoItem[];
  recentRepos: string[];
  onSelectRepo: (repo: string) => void;
  onRemoveRecent: (repo: string) => void;
  onClearRecents: () => void;
  onSignInWithGoogle: () => void;
  onSignOut: () => void;
  onOpenTokenModal: () => void;
}

export const RepoOverviewPage: React.FC<RepoOverviewPageProps> = ({
  repoMeta,
  readmeContent,
  isLoadingReadme,
  rawItems,
  fileTree,
  onOpenFile,
  onSwitchToExplorer,
  isStarred,
  onToggleStar,
  onOpenArchitecture,
  user,
  tokensRemaining,
  maxTokens,
  starredRepos,
  recentRepos,
  onSelectRepo,
  onRemoveRecent,
  onClearRecents,
  onSignInWithGoogle,
  onSignOut,
  onOpenTokenModal,
}) => {
  const [bannerLoadError, setBannerLoadError] = useState(false);

  // Resolve tailored architectural tech banner from repository language / name
  const banner = useMemo(
    () =>
      resolveRepoBanner({
        full_name: repoMeta.full_name,
        language: repoMeta.language,
        topics: repoMeta.topics,
      }),
    [repoMeta.full_name, repoMeta.language, repoMeta.topics]
  );

  // Reset image fallback state when repository changes
  useEffect(() => {
    setBannerLoadError(false);
  }, [banner.src]);

  // Parse markdown into HTML safely
  const renderedReadme = useMemo(() => {
    if (!readmeContent) return '';
    try {
      return marked.parse(readmeContent) as string;
    } catch {
      return readmeContent;
    }
  }, [readmeContent]);

  // Root directory items
  const rootFiles = useMemo(() => {
    return fileTree.slice(0, 20);
  }, [fileTree]);

  // Compute total file count & total repo blob size
  const totalBlobFiles = useMemo(() => {
    return rawItems.filter((i) => i.type === 'blob').length;
  }, [rawItems]);

  const totalRepoSize = useMemo(() => {
    return rawItems
      .filter((i) => i.type === 'blob')
      .reduce((acc, curr) => acc + (curr.size || 0), 0);
  }, [rawItems]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'code' | 'docs' | 'config'>('all');

  const matchingFilesInRepo = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const blobs = rawItems.filter((i) => i.type === 'blob');
    if (!q) return [];

    return blobs
      .filter((file) => {
        const matchesQuery = file.path.toLowerCase().includes(q);
        if (!matchesQuery) return false;

        if (selectedFilter === 'code') {
          return /\.(ts|tsx|js|jsx|py|go|rs|cpp|c|java|rb|php|swift|kt)$/i.test(file.path);
        }
        if (selectedFilter === 'docs') {
          return /\.(md|markdown|txt|rst|adoc|pdf)$/i.test(file.path);
        }
        if (selectedFilter === 'config') {
          return /\.(json|ya?ml|toml|env|config\.|rc|lock)$/i.test(file.path);
        }
        return true;
      })
      .slice(0, 15);
  }, [searchQuery, rawItems, selectedFilter]);

  const quickKeyFiles = useMemo(() => {
    const candidates = [
      'package.json',
      'tsconfig.json',
      'README.md',
      'index.ts',
      'src/index.ts',
      'index.js',
      'main.py',
      'Cargo.toml',
      'go.mod',
      'Dockerfile',
      'Makefile',
      'vite.config.ts',
    ];
    return rawItems
      .filter(
        (item) =>
          item.type === 'blob' &&
          candidates.some((c) => item.path.toLowerCase().endsWith(c.toLowerCase()))
      )
      .slice(0, 6);
  }, [rawItems]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#080C14] text-slate-100">
      <div className="max-w-6xl mx-auto w-full px-6 lg:px-8 py-6 lg:py-8 space-y-7">
        {/* 1. Stylized Tech-Themed Repository Header Banner */}
        <section
          id="repo-header"
          className="relative rounded-2xl overflow-hidden border border-slate-800/90 bg-[#0B101B] min-h-[268px] sm:min-h-[304px] flex flex-col justify-between shadow-2xl"
        >
          {/* Generated Tech Banner Artwork + Zero-Broken-Image CSS Fallback */}
          {!bannerLoadError ? (
            <img
              src={banner.src}
              alt={banner.alt}
              referrerPolicy="no-referrer"
              onError={() => setBannerLoadError(true)}
              className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
            />
          ) : (
            <div
              aria-hidden="true"
              className={`absolute inset-0 bg-gradient-to-br ${banner.fallbackGradient}`}
            />
          )}

          {/* Measured Multi-Layer Contrast Scrims (WCAG AA 4.5:1+ legibility) */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#080C14] via-[#080C14]/75 to-[#080C14]/25 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#080C14]/90 via-[#080C14]/45 to-transparent pointer-events-none"
          />

          {/* Top Metadata Strip (Unboxed Editorial Typography) */}
          <div className="relative z-10 px-6 lg:px-8 pt-5 flex items-center justify-between gap-4 text-xs text-slate-300/90">
            <div className="flex items-center gap-2 font-medium tracking-wide">
              <span className="text-slate-200">{banner.eyebrow}</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="text-slate-400">{banner.themeLabel}</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-300/80 tabular-nums">
              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              <span>{repoMeta.default_branch}</span>
              {totalRepoSize > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>{formatBytes(totalRepoSize)}</span>
                </>
              )}
            </div>
          </div>

          {/* Bottom-Anchored Hero Content */}
          <div className="relative z-10 px-6 lg:px-8 pb-6 lg:pb-8 pt-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              {repoMeta.owner.avatar_url && (
                <img
                  src={repoMeta.owner.avatar_url}
                  alt={repoMeta.owner.login}
                  className="w-14 h-14 rounded-xl ring-1 ring-white/15 bg-slate-900 object-cover shrink-0 shadow-lg"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white font-mono text-balance">
                    {repoMeta.full_name}
                  </h1>

                  <button
                    onClick={onToggleStar}
                    className={`star-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isStarred
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                        : 'bg-[#0C1220]/85 hover:bg-slate-800/90 border-slate-700/80 text-slate-200'
                    }`}
                    title={isStarred ? 'Remove from starred repositories' : 'Star and bookmark repository'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    <span>{isStarred ? 'Starred' : 'Star'}</span>
                  </button>
                </div>

                {repoMeta.description && (
                  <p className="text-slate-200/90 text-sm sm:text-[15px] max-w-2xl leading-relaxed">
                    {repoMeta.description}
                  </p>
                )}

                {repoMeta.topics && repoMeta.topics.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-xs text-slate-400 font-mono">
                    {repoMeta.topics.slice(0, 6).map((topic, idx) => (
                      <React.Fragment key={topic}>
                        {idx > 0 && (
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                        )}
                        <span>{topic}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Cluster: Single Dominant Primary CTA + Quiet Secondary Links */}
            <div className="flex flex-wrap md:flex-col items-stretch gap-2 shrink-0">
              <button
                onClick={onSwitchToExplorer}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg transition-colors text-xs whitespace-nowrap cursor-pointer shadow-lg"
              >
                <Code2 className="w-4 h-4" />
                <span>Explore Code</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenArchitecture}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0D1322]/90 hover:bg-slate-800/95 border border-slate-700/80 text-slate-200 font-medium rounded-lg transition-colors text-xs whitespace-nowrap cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-sky-400" />
                  <span>Architecture</span>
                </button>

                <a
                  href={repoMeta.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0D1322]/90 hover:bg-slate-800/95 border border-slate-700/80 text-slate-300 hover:text-white rounded-lg transition-colors text-xs whitespace-nowrap cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Unified Key Metrics Strip */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80 bg-[#0C111E] border border-slate-800/90 rounded-xl overflow-hidden">
          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-400">Stars</div>
            <div className="text-lg font-semibold text-slate-100 font-mono tabular-nums">
              {repoMeta.stargazers_count.toLocaleString()}
            </div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-400">Forks</div>
            <div className="text-lg font-semibold text-slate-100 font-mono tabular-nums">
              {repoMeta.forks_count.toLocaleString()}
            </div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-400">Open Issues</div>
            <div className="text-lg font-semibold text-slate-100 font-mono tabular-nums">
              {repoMeta.open_issues_count.toLocaleString()}
            </div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-400">Total Files</div>
            <div className="text-lg font-semibold text-slate-100 font-mono tabular-nums">
              {totalBlobFiles.toLocaleString()}
            </div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-400">Primary Language</div>
            <div className="text-lg font-semibold text-sky-300 font-mono truncate">
              {repoMeta.language || 'Multi'}
            </div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-400">License</div>
            <div className="text-lg font-semibold text-slate-200 font-mono truncate">
              {repoMeta.license?.spdx_id || repoMeta.license?.name || 'Custom'}
            </div>
          </div>
        </section>

        {/* 3. Recharts Star History & Growth Chart */}
        <RepoStarTrendChart repoMeta={repoMeta} />

        {/* 4. User Profile & Recent Repositories */}
        <UserProfileAndRecentsSection
          user={user}
          tokensRemaining={tokensRemaining}
          maxTokens={maxTokens}
          starredRepos={starredRepos}
          recentRepos={recentRepos}
          currentRepoFullName={repoMeta.full_name}
          onSelectRepo={onSelectRepo}
          onRemoveRecent={onRemoveRecent}
          onClearRecents={onClearRecents}
          onSignInWithGoogle={onSignInWithGoogle}
          onSignOut={onSignOut}
          onOpenTokenModal={onOpenTokenModal}
        />

        {/* 5. Repository File Search */}
        <section className="bg-[#0C111E] border border-slate-800/90 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Search Repository Files
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Filter across {totalBlobFiles.toLocaleString()} indexed files in {repoMeta.full_name}
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#080C15] border border-slate-800 p-1 rounded-lg text-xs">
              {(['all', 'code', 'docs', 'config'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1 rounded-md capitalize font-medium transition-colors cursor-pointer ${
                    selectedFilter === filter
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter files by path or extension (e.g., index.ts, config, package.json)..."
              className="w-full bg-[#090D18] border border-slate-800 text-slate-100 text-xs font-mono rounded-lg pl-10 pr-16 py-2.5 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {searchQuery.trim() && (
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#090D18]">
              <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>{matchingFilesInRepo.length} matching files</span>
                <span>Select any file to open in Code Explorer</span>
              </div>

              {matchingFilesInRepo.length > 0 ? (
                <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto font-mono text-xs">
                  {matchingFilesInRepo.map((file) => {
                    const badge = getFileCategoryBadge(file.path);
                    return (
                      <div
                        key={file.path}
                        onClick={() => {
                          onOpenFile(file.path);
                          onSwitchToExplorer();
                        }}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/40 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className={`text-[10px] font-semibold w-5 text-center ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-slate-200 group-hover:text-sky-400 transition-colors truncate">
                            {file.path}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 text-slate-500 text-[11px] tabular-nums">
                          <span>{formatBytes(file.size)}</span>
                          <span className="text-sky-400">Open →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No files matched &ldquo;{searchQuery}&rdquo; under the {selectedFilter} filter.
                </div>
              )}
            </div>
          )}

          {quickKeyFiles.length > 0 && !searchQuery.trim() && (
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 mr-1">Key entrypoints:</span>
              {quickKeyFiles.map((f) => {
                const badge = getFileCategoryBadge(f.path);
                return (
                  <button
                    key={f.path}
                    onClick={() => {
                      onOpenFile(f.path);
                      onSwitchToExplorer();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[#090D18] hover:bg-slate-800/80 border border-slate-800 rounded-md text-xs font-mono text-slate-300 hover:text-sky-300 transition-colors cursor-pointer"
                  >
                    <span className={`text-[10px] font-semibold ${badge.color}`}>{badge.label}</span>
                    <span>{f.path}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* 6. Root Directory Structure */}
        <section className="bg-[#0C111E] border border-slate-800/90 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                Root Directory
              </h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                ({rootFiles.length} items)
              </span>
            </div>
            <button
              onClick={onSwitchToExplorer}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer"
            >
              Open full tree →
            </button>
          </div>

          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {rootFiles.map((node) => {
              const isFolder = node.type === 'tree';
              const badge = !isFolder ? getFileCategoryBadge(node.name) : null;
              return (
                <div
                  key={node.path}
                  onClick={() => {
                    onOpenFile(node.path);
                    onSwitchToExplorer();
                  }}
                  className="flex items-center justify-between px-6 py-2.5 hover:bg-slate-800/35 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {isFolder ? (
                      <Folder className="w-4 h-4 text-sky-400/90 shrink-0" />
                    ) : (
                      <span className={`text-[10px] font-semibold w-4 text-center ${badge?.color}`}>
                        {badge?.label}
                      </span>
                    )}
                    <span className="font-medium text-slate-200 group-hover:text-sky-300 transition-colors">
                      {node.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-slate-500 text-[11px] tabular-nums">
                    {node.size !== undefined && <span>{formatBytes(node.size)}</span>}
                    <span className="text-slate-600 group-hover:text-slate-300 transition-colors">View</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. Rendered README.md */}
        <section className="bg-[#0C111E] border border-slate-800/90 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-200">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>README.md</span>
            </div>
            <button
              onClick={() => {
                onOpenFile('README.md');
                onSwitchToExplorer();
              }}
              className="text-xs text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              View raw source
            </button>
          </div>

          <div className="p-6 lg:p-10">
            {isLoadingReadme ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                <span className="text-xs">Loading repository documentation...</span>
              </div>
            ) : renderedReadme ? (
              <div
                className="prose prose-invert max-w-none text-slate-300 leading-relaxed
                  prose-headings:text-slate-100 prose-headings:font-semibold prose-headings:tracking-tight
                  prose-h1:text-2xl prose-h1:border-b prose-h1:border-slate-800 prose-h1:pb-3
                  prose-h2:text-xl prose-h2:border-b prose-h2:border-slate-800 prose-h2:pb-2
                  prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline
                  prose-code:text-sky-300 prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono
                  prose-pre:bg-[#070A11] prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl prose-pre:p-4
                  prose-img:rounded-xl prose-img:border prose-img:border-slate-800
                  prose-table:border-collapse prose-th:border prose-th:border-slate-800 prose-th:p-2.5 prose-th:bg-slate-900/60
                  prose-td:border prose-td:border-slate-800 prose-td:p-2.5"
                dangerouslySetInnerHTML={{ __html: renderedReadme }}
              />
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                No README.md found in this repository.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
