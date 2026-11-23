import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode,
  Search,
  Filter,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { FileNode, GitTreeItem } from '../types';
import { formatBytes, getFileCategoryBadge } from '../utils/fileTree';

interface FileTreeProps {
  tree: FileNode[];
  rawItems: GitTreeItem[];
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  isLoading: boolean;
}

export const FileTree: React.FC<FileTreeProps> = ({
  tree,
  rawItems,
  activeFilePath,
  onSelectFile,
  isLoading,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'src': true,
    'lib': true,
    'packages': true,
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'tree') {
          next[node.path] = true;
          if (node.children) traverse(node.children);
        }
      }
    };
    traverse(tree);
    setExpandedFolders(next);
  };

  const collapseAll = () => {
    setExpandedFolders({});
  };

  // Filtered files when user types in search
  const filteredFlatFiles = useMemo(() => {
    if (!filterQuery.trim()) return null;
    const q = filterQuery.toLowerCase();
    return rawItems.filter(
      (item) => item.type === 'blob' && item.path.toLowerCase().includes(q)
    ).slice(0, 100);
  }, [rawItems, filterQuery]);

  const renderNode = (node: FileNode, depth = 0) => {
    const isFolder = node.type === 'tree';
    const isExpanded = !!expandedFolders[node.path];
    const isActive = activeFilePath === node.path;
    const badge = !isFolder ? getFileCategoryBadge(node.name) : null;

    return (
      <div key={node.path} className="select-none text-xs">
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
            } else {
              onSelectFile(node.path);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`flex items-center justify-between py-1.5 pr-3 cursor-pointer group rounded-md mx-1 transition-colors ${
            isActive
              ? 'bg-sky-500/15 text-sky-200 font-medium'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {isFolder ? (
              <span className="text-slate-500 group-hover:text-slate-300 shrink-0">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}

            {isFolder ? (
              isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )
            ) : (
              <span className={`text-[10px] font-mono font-semibold shrink-0 w-4 text-center ${badge?.color}`}>
                {badge?.label}
              </span>
            )}

            <span className="truncate font-mono text-[11px]">{node.name}</span>
          </div>

          {!isFolder && node.size !== undefined && (
            <span className="text-[10px] text-slate-500 font-mono tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
              {formatBytes(node.size)}
            </span>
          )}
        </div>

        {isFolder && isExpanded && node.children && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-[#090D16] flex flex-col h-full overflow-hidden">
      {/* File Tree Header */}
      <div className="p-3 border-b border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="uppercase tracking-wider text-[10px] text-slate-400 font-bold">Explorer</span>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              title="Expand all folders"
              className="hover:text-slate-200 transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button
              onClick={collapseAll}
              title="Collapse all folders"
              className="hover:text-slate-200 transition-colors"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Tree Search filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter files..."
            className="w-full bg-[#111726] border border-slate-800 text-slate-200 text-xs font-mono rounded pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-sky-500 placeholder:text-slate-600 transition-colors"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="p-4 text-xs text-slate-500 font-mono space-y-2">
            <div className="h-4 bg-slate-800/50 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-slate-800/40 rounded animate-pulse w-1/2" />
            <div className="h-4 bg-slate-800/50 rounded animate-pulse w-5/6" />
            <div className="h-4 bg-slate-800/30 rounded animate-pulse w-2/3" />
          </div>
        ) : filteredFlatFiles ? (
          <div className="px-2 space-y-0.5">
            <div className="text-[10px] font-mono text-slate-400 px-2 py-1">
              Matching files ({filteredFlatFiles.length})
            </div>
            {filteredFlatFiles.map((file) => {
              const badge = getFileCategoryBadge(file.path);
              const isActive = activeFilePath === file.path;
              return (
                <div
                  key={file.path}
                  onClick={() => onSelectFile(file.path)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs font-mono transition-colors ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-200'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`text-[10px] font-semibold w-4 ${badge.color}`}>{badge.label}</span>
                    <span className="truncate">{file.path}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0 ml-2">{formatBytes(file.size)}</span>
                </div>
              );
            })}
          </div>
        ) : tree.length > 0 ? (
          <div>{tree.map((node) => renderNode(node, 0))}</div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-500">
            No files found in repository
          </div>
        )}
      </div>
    </aside>
  );
};
