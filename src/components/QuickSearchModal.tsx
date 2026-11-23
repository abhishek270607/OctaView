import React, { useState, useEffect, useRef } from 'react';
import { Search, FileCode, X, CornerDownLeft, ArrowUpDown } from 'lucide-react';
import { GitTreeItem } from '../types';
import { getFileCategoryBadge, formatBytes } from '../utils/fileTree';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawItems: GitTreeItem[];
  onSelectFile: (path: string) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  rawItems,
  onSelectFile,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter items: blobs only
  const filteredFiles = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const blobs = rawItems.filter((i) => i.type === 'blob');
    if (!q) return blobs.slice(0, 30);
    return blobs.filter((i) => i.path.toLowerCase().includes(q)).slice(0, 50);
  }, [rawItems, query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation within list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredFiles.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredFiles.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredFiles[selectedIndex]) {
        onSelectFile(filteredFiles[selectedIndex].path);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll selected into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#090D16] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-[#0C121F] gap-3">
          <Search className="w-4 h-4 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a file name or path to jump to... (Ctrl+P / ⌘P)"
            className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 font-mono text-xs focus:outline-none"
          />
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-0.5 text-xs font-mono">
          {filteredFiles.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No matching files found for &quot;{query}&quot;
            </div>
          ) : (
            filteredFiles.map((file, idx) => {
              const badge = getFileCategoryBadge(file.path);
              const isSelected = idx === selectedIndex;
              const fileName = file.path.split('/').pop() || file.path;
              const dirPath = file.path.includes('/')
                ? file.path.substring(0, file.path.lastIndexOf('/'))
                : '';

              return (
                <div
                  key={file.path}
                  onClick={() => {
                    onSelectFile(file.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-500/20 text-white border border-sky-500/40'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
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
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-[#0C121F] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="bg-slate-800 px-1 rounded text-[10px] text-slate-300">↑</span>
              <span className="bg-slate-800 px-1 rounded text-[10px] text-slate-300">↓</span>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-slate-800 px-1 rounded text-[10px] text-slate-300">↵</span>
              <span>Open</span>
            </span>
          </div>
          <span className="text-slate-500">
            {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>
    </div>
  );
};
