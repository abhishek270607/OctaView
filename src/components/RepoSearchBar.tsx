import React, { useState, useRef, useEffect } from 'react';
import {
  GitBranch,
  GitFork,
  Loader2,
  Search,
  Star,
  AlertCircle,
  ExternalLink,
  Code2,
  Bookmark,
  LayoutTemplate,
  FolderTree,
  FileCode,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { GitTreeItem, RepoMeta } from '../types';
import { StarredRepoItem } from '../services/firebase';
import { formatBytes, getFileCategoryBadge } from '../utils/fileTree';

interface RepoSearchBarProps {
  currentInput: string;
  onSearch: (repoQuery: string) => void;
  isLoading: boolean;
  repoMeta: RepoMeta | null;
  branches: { name: string; commit: string }[];
  selectedBranch: string;
  onSelectBranch: (branch: string) => void;
  onOpenArchitecture: () => void;
  recentRepos: string[];
  isStarred: boolean;
  onToggleStar: () => void;
  starredRepos: StarredRepoItem[];
  viewMode: 'overview' | 'explorer';
  onToggleViewMode: (mode: 'overview' | 'explorer') => void;
  rawItems: GitTreeItem[];
  onSelectFile: (path: string) => void;
}

export const RepoSearchBar: React.FC<RepoSearchBarProps> = ({
  currentInput,
  onSearch,
  isLoading,
  repoMeta,
  branches,
  selectedBranch,
  onSelectBranch,
  onOpenArchitecture,
  recentRepos,
  isStarred,
  onToggleStar,
  starredRepos,
  viewMode,
  onToggleViewMode,
  rawItems,
  onSelectFile,
}) => {
  const [inputVal, setInputVal] = useState(currentInput);
  const [showStarredDropdown, setShowStarredDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync input value with external query
  useEffect(() => {
    setInputVal(currentInput);
  }, [currentInput]);

  // Live matching files based on search input when it looks like a file query
  const liveMatchingFiles = React.useMemo(() => {
    const q = inputVal.trim().toLowerCase();
    if (!q || q.includes('http') || q.includes('github.com') || (q.includes('/') && q.split('/').length === 2 && !q.includes('.'))) {
      // Looks like a repo URL/name, not an in-repo file search
      return [];
    }
    return rawItems
      .filter((i) => i.type === 'blob' && i.path.toLowerCase().includes(q))
      .slice(0, 8);
  }, [inputVal, rawItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (liveMatchingFiles.length > 0 && selectedIndex < liveMatchingFiles.length) {
      // If user typed a file query and hits enter
      onSelectFile(liveMatchingFiles[selectedIndex].path);
      setIsFocused(false);
      onToggleViewMode('explorer');
      return;
    }

    if (inputVal.trim()) {
      onSearch(inputVal.trim());
      setIsFocused(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (liveMatchingFiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < liveMatchingFiles.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : liveMatchingFiles.length - 1));
      } else if (e.key === 'Escape') {
        setIsFocused(false);
      }
    }
  };

  return (
    <div className="border-b border-slate-800/80 bg-[#0A0F1A] px-6 py-2.5 relative select-none">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Repo Input & Live File Search Form */}
        <div className="relative flex-1 max-w-2xl">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  setSelectedIndex(0);
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                onKeyDown={handleKeyDown}
                placeholder="Enter GitHub repo URL, or search files in repository..."
                className="w-full bg-[#111726] border border-slate-800 text-slate-100 text-xs font-mono rounded-lg pl-9 pr-3 py-2 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>{liveMatchingFiles.length > 0 ? 'Open' : 'Explore'}</span>
            </button>
          </form>

          {/* Live File Search Dropdown */}
          {isFocused && liveMatchingFiles.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full mt-1.5 bg-[#090D16] border border-slate-700 rounded-xl shadow-2xl z-50 p-1 space-y-0.5 font-mono text-xs overflow-hidden"
            >
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between border-b border-slate-800">
                <span>Matching Files in Repository</span>
                <span>Press ↵ to open</span>
              </div>
              {liveMatchingFiles.map((file, idx) => {
                const badge = getFileCategoryBadge(file.path);
                const isSelected = idx === selectedIndex;
                const fileName = file.path.split('/').pop() || file.path;
                const dirPath = file.path.includes('/')
                  ? file.path.substring(0, file.path.lastIndexOf('/'))
                  : '';
                return (
                  <div
                    key={file.path}
                    onMouseDown={() => {
                      onSelectFile(file.path);
                      onToggleViewMode('explorer');
                      setIsFocused(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-500/20 text-white border border-sky-500/40'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[10px] font-bold w-5 shrink-0 ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="font-semibold text-slate-100">{fileName}</span>
                      {dirPath && (
                        <span className="text-[11px] text-slate-500 truncate">{dirPath}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        {formatBytes(file.size)}
                      </span>
                      {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-sky-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View Mode Switcher [ Whole Preview | Code Explorer ] & Controls */}
        <div className="flex items-center gap-3">
          {/* View Mode Segmented Controls */}
          {repoMeta && (
            <div className="flex items-center bg-[#111726] border border-slate-800 rounded-lg p-1 text-xs font-medium">
              <button
                onClick={() => onToggleViewMode('overview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  viewMode === 'overview'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Full-page repository landing preview (README & metrics)"
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>Whole Preview</span>
              </button>

              <button
                onClick={() => onToggleViewMode('explorer')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  viewMode === 'explorer'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="3-pane Code Viewer & File Explorer"
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Code Explorer</span>
              </button>
            </div>
          )}

          {/* Starred Repositories dropdown */}
          {starredRepos.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowStarredDropdown((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#111726] hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                title="View your bookmarked repositories"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Bookmarks</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono text-amber-300">
                  {starredRepos.length}
                </span>
              </button>

              {showStarredDropdown && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-64 bg-[#090D16] border border-slate-800 rounded-xl shadow-xl z-40 p-1 space-y-0.5 text-xs font-mono"
                  onClick={() => setShowStarredDropdown(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                    Your Starred Repositories
                  </div>
                  {starredRepos.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setInputVal(item.fullName);
                        onSearch(item.fullName);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">{item.fullName}</span>
                      <span className="flex items-center gap-1 text-[10px] text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {item.stars ? item.stars.toLocaleString() : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Branch Selector */}
          {branches.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#111726] border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
              <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedBranch}
                onChange={(e) => onSelectBranch(e.target.value)}
                className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer pr-1"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name} className="bg-slate-900 text-slate-100">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* AI Architecture Trigger */}
          {repoMeta && (
            <button
              onClick={onOpenArchitecture}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Code2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">AI Architecture</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact Repo Metadata Bar (shown in Code Explorer or when no repo loaded) */}
      {(viewMode === 'explorer' || !repoMeta) && (
        <div
          id={viewMode === 'explorer' ? 'repo-header-compact' : 'repo-header'}
          className="mt-2 pt-2 border-t border-slate-800/50 flex flex-wrap items-center justify-between gap-y-2 text-xs"
        >
          {repoMeta ? (
            <div className="flex flex-wrap items-center gap-2.5 text-slate-400">
              <a
                href={repoMeta.html_url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-slate-100 hover:text-sky-400 transition-colors flex items-center gap-1 text-sm font-mono"
              >
                {repoMeta.full_name}
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>

              <button
                onClick={onToggleStar}
                className={`star-button flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                  isStarred
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-amber-300'
                }`}
                title={
                  isStarred
                    ? 'Remove from starred repositories'
                    : 'Star and bookmark this repository'
                }
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                  }`}
                />
                <span>{isStarred ? 'Starred' : 'Star'}</span>
              </button>

              <span aria-hidden="true" className="text-slate-600">·</span>

              {repoMeta.description && (
                <span className="text-slate-400 max-w-md truncate" title={repoMeta.description}>
                  {repoMeta.description}
                </span>
              )}

              <span aria-hidden="true" className="text-slate-600">·</span>

              <span className="flex items-center gap-1 font-mono tabular-nums text-slate-300">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                {repoMeta.stargazers_count.toLocaleString()}
              </span>

              <span aria-hidden="true" className="text-slate-600">·</span>

              <span className="flex items-center gap-1 font-mono tabular-nums text-slate-300">
                <GitFork className="w-3.5 h-3.5 text-slate-400" />
                {repoMeta.forks_count.toLocaleString()}
              </span>

              {repoMeta.language && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="font-mono text-sky-400">{repoMeta.language}</span>
                </>
              )}

              {repoMeta.license && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400">{repoMeta.license.spdx_id || repoMeta.license.name}</span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-400">
              <span>Popular repositories:</span>
              {recentRepos.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setInputVal(r);
                    onSearch(r);
                  }}
                  className="font-mono text-slate-300 hover:text-sky-400 transition-colors cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
