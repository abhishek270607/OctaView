import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Download,
  FileCode,
  FileText,
  Folder,
  Link2,
  Loader2,
  Scissors,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import { marked } from 'marked';
import { OpenFileTab } from '../types';
import { formatBytes, getFileCategoryBadge } from '../utils/fileTree';
import { copyTextToClipboard } from '../utils/clipboard';

interface CodeViewerProps {
  repoFullName: string;
  openTabs: OpenFileTab[];
  activeTabPath: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onExplainCode: () => void;
  onAskAboutLine: (lineNumber: number, lineText: string) => void;
  onBreadcrumbClick?: (folderPath: string) => void;
  isLoadingContent: boolean;
  tokensRemaining: number;
}

type CopyStatus = 'idle' | 'copied' | 'error';

interface CopyToast {
  id: number;
  title: string;
  detail: string;
  tone: 'success' | 'error';
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  repoFullName,
  openTabs,
  activeTabPath,
  onSelectTab,
  onCloseTab,
  onExplainCode,
  onAskAboutLine,
  onBreadcrumbClick,
  isLoadingContent,
  tokensRemaining,
}) => {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const [pathCopied, setPathCopied] = useState(false);
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedSnippet, setSelectedSnippet] = useState('');
  const [copyToast, setCopyToast] = useState<CopyToast | null>(null);

  const menuContainerRef = useRef<HTMLDivElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<number | null>(null);
  const pathTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const activeTab = useMemo(() => {
    return openTabs.find((t) => t.path === activeTabPath) || null;
  }, [openTabs, activeTabPath]);

  const isMarkdown = useMemo(() => {
    if (!activeTab) return false;
    return activeTab.name.endsWith('.md') || activeTab.name.endsWith('.mdx');
  }, [activeTab]);

  const isImage = useMemo(() => {
    if (!activeTab) return false;
    const ext = activeTab.name.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext || '');
  }, [activeTab]);

  const isCopyDisabled = isLoadingContent || isImage || !activeTab;

  const lines = useMemo(() => {
    if (!activeTab) return [];
    return activeTab.content.split('\n');
  }, [activeTab]);

  const renderedMarkdown = useMemo(() => {
    if (!activeTab || !isMarkdown) return '';
    try {
      return marked.parse(activeTab.content) as string;
    } catch {
      return activeTab.content;
    }
  }, [activeTab, isMarkdown]);

  const breadcrumbSegments = useMemo(() => {
    if (!activeTab) return [];
    const parts = activeTab.path.split('/');
    const segments: { name: string; fullPath: string; isFile: boolean }[] = [];
    let current = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      current = current ? `${current}/${part}` : part;
      segments.push({
        name: part,
        fullPath: current,
        isFile: i === parts.length - 1,
      });
    }
    return segments;
  }, [activeTab]);

  const triggerToast = useCallback((title: string, detail: string, tone: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setCopyToast({ id: Date.now(), title, detail, tone });
    toastTimerRef.current = window.setTimeout(() => {
      setCopyToast(null);
    }, 2600);
  }, []);

  const triggerButtonFeedback = useCallback((status: 'copied' | 'error') => {
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
    }
    setCopyStatus(status);
    copyTimerRef.current = window.setTimeout(() => {
      setCopyStatus('idle');
    }, 2000);
  }, []);

  const captureCurrentSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !codeContainerRef.current) {
      return '';
    }
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if (
      anchorNode &&
      focusNode &&
      codeContainerRef.current.contains(anchorNode) &&
      codeContainerRef.current.contains(focusNode)
    ) {
      return selection.toString().trimEnd();
    }
    return '';
  }, []);

  const executeCopy = useCallback(
    async (text: string, title: string, detail: string) => {
      const ok = await copyTextToClipboard(text);
      setIsCopyMenuOpen(false);
      if (ok) {
        triggerButtonFeedback('copied');
        triggerToast(title, detail, 'success');
      } else {
        triggerButtonFeedback('error');
        triggerToast('Clipboard unavailable', 'Select text manually and press Ctrl/Cmd+C.', 'error');
      }
    },
    [triggerButtonFeedback, triggerToast]
  );

  const handleCopyFullFile = useCallback(() => {
    if (!activeTab || isCopyDisabled) return;
    const lineLabel = lines.length === 1 ? '1 line' : `${lines.length.toLocaleString()} lines`;
    void executeCopy(activeTab.content, 'Copied to clipboard', `${lineLabel} · ${activeTab.name}`);
  }, [activeTab, isCopyDisabled, lines.length, executeCopy]);

  const handleCopySelectionOrLine = useCallback(() => {
    if (!activeTab || isCopyDisabled) return;
    const snippet = selectedSnippet || captureCurrentSelection();
    if (snippet) {
      const snippetLines = snippet.split('\n').length;
      const lineLabel = snippetLines === 1 ? '1 line' : `${snippetLines} lines`;
      void executeCopy(snippet, 'Copied selected snippet', `${lineLabel} · ${snippet.length} chars`);
      return;
    }
    if (selectedLine !== null && lines[selectedLine - 1] !== undefined) {
      void executeCopy(
        lines[selectedLine - 1],
        `Copied Line ${selectedLine}`,
        `${activeTab.name}#L${selectedLine}`
      );
    }
  }, [activeTab, isCopyDisabled, selectedSnippet, captureCurrentSelection, selectedLine, lines, executeCopy]);

  const handleCopyMarkdownBlock = useCallback(() => {
    if (!activeTab || isCopyDisabled) return;
    const snippet = selectedSnippet || captureCurrentSelection();
    const targetCode = snippet || activeTab.content;
    const targetLines = targetCode.split('\n').length;
    const langTag = activeTab.language === 'plaintext' ? '' : activeTab.language;
    const header = `// ${activeTab.path}${selectedLine && !snippet ? `#L${selectedLine}` : ''}`;
    const fenced = `\`\`\`${langTag}\n${header}\n${targetCode}\n\`\`\``;
    const scope = snippet ? `Selection (${targetLines} lines)` : `Full file (${targetLines} lines)`;
    void executeCopy(fenced, 'Copied Markdown block', `${scope} · ${activeTab.name}`);
  }, [activeTab, isCopyDisabled, selectedSnippet, captureCurrentSelection, selectedLine, executeCopy]);

  const handleCopyPath = useCallback(async () => {
    if (!activeTab) return;
    const ok = await copyTextToClipboard(activeTab.path);
    setIsCopyMenuOpen(false);
    if (ok) {
      if (pathTimerRef.current) window.clearTimeout(pathTimerRef.current);
      setPathCopied(true);
      pathTimerRef.current = window.setTimeout(() => setPathCopied(false), 2000);
      triggerToast('Copied file path', activeTab.path, 'success');
    } else {
      triggerToast('Clipboard unavailable', 'Could not copy relative path.', 'error');
    }
  }, [activeTab, triggerToast]);

  const handleCopyRepoReference = useCallback(() => {
    if (!activeTab) return;
    const refText = `${repoFullName}:${activeTab.path}${selectedLine ? `#L${selectedLine}` : ''}`;
    void executeCopy(refText, 'Copied repo reference', refText);
  }, [activeTab, repoFullName, selectedLine, executeCopy]);

  const handleDownload = useCallback(() => {
    if (!activeTab || isCopyDisabled) return;
    const blob = new Blob([activeTab.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab.name;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeTab, isCopyDisabled]);

  // Syntax highlight code when activeTab or viewMode changes
  useEffect(() => {
    if (activeTab && (!isMarkdown || viewMode === 'code')) {
      Prism.highlightAll();
    }
  }, [activeTab, viewMode, isMarkdown]);

  // Reset per-tab transient state cleanly when switching tabs
  useEffect(() => {
    setSelectedLine(null);
    setSelectedSnippet('');
    setIsCopyMenuOpen(false);
    setCopyStatus('idle');
    setPathCopied(false);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    if (pathTimerRef.current) window.clearTimeout(pathTimerRef.current);
  }, [activeTabPath]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      if (pathTimerRef.current) window.clearTimeout(pathTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Track highlighted text inside the code viewport
  useEffect(() => {
    const handleSelectionChange = () => {
      if (isCopyMenuOpen) return;
      const snippet = captureCurrentSelection();
      setSelectedSnippet(snippet);
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [captureCurrentSelection, isCopyMenuOpen]);

  // Dismiss copy menu on outside click or Escape key
  useEffect(() => {
    if (!isCopyMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setIsCopyMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCopyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCopyMenuOpen]);

  // Keyboard shortcut: Ctrl+Shift+C / Cmd+Shift+C copies active file
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (isCopyDisabled) return;
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        ) {
          return;
        }
        event.preventDefault();
        handleCopyFullFile();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [isCopyDisabled, handleCopyFullFile]);

  if (!activeTab) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0B101D] text-slate-500 select-none">
        <FileCode className="w-12 h-12 text-slate-700 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300 mb-1">No file selected</h3>
        <p className="text-xs text-slate-500 max-w-sm text-center">
          Choose a file from the explorer on the left to preview its code, extract snippets, and run AI analysis.
        </p>
      </div>
    );
  }

  const prismLanguage = activeTab.language === 'typescript' ? 'tsx' : activeTab.language;
  const badge = getFileCategoryBadge(activeTab.name);
  const hasSnippetTarget = Boolean(selectedSnippet) || selectedLine !== null;
  const snippetLineCount = selectedSnippet ? selectedSnippet.split('\n').length : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B101D] overflow-hidden min-w-0 relative">
      {/* Row 1: IDE Tab Strip */}
      <div className="flex items-center h-[38px] bg-[#090D16] border-b border-slate-800/80 overflow-x-auto no-scrollbar shrink-0">
        {openTabs.map((tab) => {
          const isActive = tab.path === activeTabPath;
          const tabBadge = getFileCategoryBadge(tab.name);
          return (
            <div
              key={tab.path}
              onClick={() => onSelectTab(tab.path)}
              className={`flex items-center gap-2 h-full px-3.5 border-r border-slate-800/80 cursor-pointer text-xs font-mono transition-colors shrink-0 group ${
                isActive
                  ? 'bg-[#0B101D] text-slate-100 border-t-2 border-t-sky-400 font-medium'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-t-2 border-t-transparent'
              }`}
            >
              <span className={`text-[10px] font-bold shrink-0 ${tabBadge.color}`}>{tabBadge.label}</span>
              <span className="truncate max-w-[150px]">{tab.name}</span>
              <button
                type="button"
                aria-label={`Close ${tab.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.path);
                }}
                className={`text-slate-500 hover:text-slate-100 hover:bg-slate-800 rounded p-0.5 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 ${
                  isActive ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {openTabs.length > 1 && (
          <div className="ml-auto pr-3.5 hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap shrink-0">
            <span>Cycle tabs</span>
            <kbd className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] text-slate-400 border border-slate-800 font-mono">
              Ctrl+Shift+O
            </kbd>
          </div>
        )}
      </div>

      {/* Row 2: Unified Workspace Toolbar (Breadcrumbs + Unboxed Metadata + Refined Action Cluster) */}
      <div className="flex items-center justify-between min-h-[44px] px-4 py-1.5 border-b border-slate-800/80 bg-[#0D1322] gap-4 shrink-0">
        {/* Left Zone: Interactive Breadcrumb Trail */}
        <nav
          aria-label="Breadcrumb navigation"
          className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 truncate flex-1 min-w-0 select-none"
        >
          <span className="flex items-center gap-1.5 text-slate-300 shrink-0 font-sans font-semibold">
            <Terminal className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate max-w-[120px]">{repoFullName.split('/')[1] || repoFullName}</span>
          </span>

          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" aria-hidden="true" />

          {breadcrumbSegments.map((seg, idx) => {
            const isLast = idx === breadcrumbSegments.length - 1;
            return (
              <React.Fragment key={seg.fullPath}>
                {seg.isFile ? (
                  <span className="flex items-center gap-1.5 text-slate-100 font-semibold truncate">
                    <span className={`text-[10px] font-mono shrink-0 ${badge.color}`}>{badge.label}</span>
                    <span className="truncate">{seg.name}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onBreadcrumbClick?.(seg.fullPath)}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-100 hover:underline transition-colors truncate focus-visible:outline-none focus-visible:text-sky-300"
                    title={`Browse folder: ${seg.fullPath}`}
                  >
                    <Folder className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{seg.name}</span>
                  </button>
                )}

                {!isLast && (
                  <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" aria-hidden="true" />
                )}
              </React.Fragment>
            );
          })}

          <button
            type="button"
            onClick={handleCopyPath}
            title="Copy relative file path"
            aria-label="Copy relative file path"
            className="ml-1 p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800/70 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400"
          >
            {pathCopied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </nav>

        {/* Right Zone: Quiet Unboxed File Metadata + Primary Action Cluster */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Unboxed Tabular File Metadata */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono text-slate-400 whitespace-nowrap shrink-0 select-none">
            <span className="tabular-nums text-slate-300">{lines.length.toLocaleString()} lines</span>
            {activeTab.size ? (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="tabular-nums text-slate-300">{formatBytes(activeTab.size)}</span>
              </>
            ) : null}
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-300 capitalize">{activeTab.language}</span>
          </div>

          <div className="hidden xl:block h-4 w-px bg-slate-800 shrink-0" aria-hidden="true" />

          {/* Markdown View Segmented Control */}
          {isMarkdown && (
            <div className="flex items-center bg-[#090D16] border border-slate-800 rounded-md p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'preview'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setViewMode('code')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'code'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Raw
              </button>
            </div>
          )}

          {/* Split Copy to Clipboard Control + Snippet Copy Menu */}
          <div ref={menuContainerRef} className="relative flex items-center shrink-0">
            <div
              className={`inline-flex items-stretch rounded-md border transition-colors duration-150 ${
                copyStatus === 'copied'
                  ? 'border-emerald-500/40 bg-emerald-500/15'
                  : copyStatus === 'error'
                  ? 'border-rose-500/40 bg-rose-500/15'
                  : isCopyDisabled
                  ? 'border-slate-800 bg-slate-900/60 opacity-50'
                  : 'border-slate-200/90 bg-slate-100 shadow-xs'
              }`}
            >
              <button
                type="button"
                disabled={isCopyDisabled}
                onClick={handleCopyFullFile}
                title="Copy entire file to clipboard (Ctrl+Shift+C)"
                className={`flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 text-xs font-semibold rounded-l-[5px] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed ${
                  copyStatus === 'copied'
                    ? 'text-emerald-300'
                    : copyStatus === 'error'
                    ? 'text-rose-300'
                    : isCopyDisabled
                    ? 'text-slate-500'
                    : 'text-slate-950 hover:bg-white'
                }`}
              >
                {copyStatus === 'copied' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : copyStatus === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {copyStatus === 'copied'
                    ? 'Copied'
                    : copyStatus === 'error'
                    ? 'Copy Failed'
                    : 'Copy to Clipboard'}
                </span>
              </button>

              <span
                aria-hidden="true"
                className={`w-px my-1 ${
                  copyStatus === 'copied'
                    ? 'bg-emerald-500/30'
                    : copyStatus === 'error'
                    ? 'bg-rose-500/30'
                    : isCopyDisabled
                    ? 'bg-slate-800'
                    : 'bg-slate-300'
                }`}
              />

              <button
                type="button"
                disabled={isCopyDisabled}
                aria-label="More copy snippet options"
                aria-haspopup="menu"
                aria-expanded={isCopyMenuOpen}
                onMouseDown={(e) => {
                  // Prevent clearing the user's code text selection before capturing it
                  e.preventDefault();
                }}
                onClick={() => {
                  if (isCopyDisabled) return;
                  if (!isCopyMenuOpen) {
                    const liveSelection = captureCurrentSelection();
                    if (liveSelection) {
                      setSelectedSnippet(liveSelection);
                    }
                  }
                  setIsCopyMenuOpen((prev) => !prev);
                }}
                className={`flex items-center justify-center px-2 py-1.5 rounded-r-[5px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed ${
                  copyStatus === 'copied'
                    ? 'text-emerald-300 hover:bg-emerald-500/20'
                    : copyStatus === 'error'
                    ? 'text-rose-300 hover:bg-rose-500/20'
                    : isCopyDisabled
                    ? 'text-slate-500'
                    : 'text-slate-800 hover:bg-white'
                }`}
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    isCopyMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* Snippet Copy Dropdown Menu */}
            {isCopyMenuOpen && (
              <div
                role="menu"
                aria-label="Copy snippet options"
                className="absolute right-0 top-full mt-1.5 w-72 rounded-lg bg-[#111827] border border-slate-700/80 shadow-2xl shadow-black/60 py-1.5 z-50"
              >
                <div className="px-3 py-1.5 border-b border-slate-800/90 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-400 truncate">
                    Extract from {activeTab.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 tabular-nums shrink-0">
                    {lines.length.toLocaleString()}L
                  </span>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCopyFullFile}
                    className="w-full px-3 py-2 text-left flex items-center justify-between gap-3 text-xs text-slate-200 hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:bg-slate-800"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium truncate">Copy full file</span>
                    </span>
                    <kbd className="text-[10px] font-mono text-slate-500 shrink-0">Ctrl+Shift+C</kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    disabled={!hasSnippetTarget}
                    onClick={handleCopySelectionOrLine}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-3 text-xs transition-colors focus-visible:outline-none ${
                      hasSnippetTarget
                        ? 'text-slate-200 hover:bg-slate-800/80 focus-visible:bg-slate-800'
                        : 'text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Scissors
                        className={`w-3.5 h-3.5 shrink-0 ${
                          hasSnippetTarget ? 'text-sky-400' : 'text-slate-600'
                        }`}
                      />
                      <span className="flex flex-col min-w-0">
                        <span className="font-medium truncate">
                          {selectedSnippet
                            ? 'Copy selected snippet'
                            : selectedLine !== null
                            ? `Copy Line ${selectedLine}`
                            : 'Copy selected snippet'}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">
                          {selectedSnippet
                            ? `${snippetLineCount} ${snippetLineCount === 1 ? 'line' : 'lines'} · ${selectedSnippet.length} chars`
                            : selectedLine !== null
                            ? `Active gutter selection`
                            : 'Highlight code or click a line number'}
                        </span>
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCopyMarkdownBlock}
                    className="w-full px-3 py-2 text-left flex items-center justify-between gap-3 text-xs text-slate-200 hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:bg-slate-800"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Code2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="flex flex-col min-w-0">
                        <span className="font-medium truncate">Copy as Markdown block</span>
                        <span className="text-[10px] text-slate-500 truncate">
                          {selectedSnippet
                            ? 'Fenced snippet with file path'
                            : 'Fenced file with language tag'}
                        </span>
                      </span>
                    </span>
                  </button>
                </div>

                <div className="my-1 border-t border-slate-800/90" />

                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCopyPath}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-xs text-slate-200 hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:bg-slate-800"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="flex flex-col min-w-0">
                      <span className="font-medium">Copy relative path</span>
                      <span className="text-[10px] font-mono text-slate-500 truncate">
                        {activeTab.path}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCopyRepoReference}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-xs text-slate-200 hover:bg-slate-800/80 transition-colors focus-visible:outline-none focus-visible:bg-slate-800"
                  >
                    <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="flex flex-col min-w-0">
                      <span className="font-medium">Copy repo reference</span>
                      <span className="text-[10px] font-mono text-slate-500 truncate">
                        {repoFullName}:{activeTab.path}
                        {selectedLine ? `#L${selectedLine}` : ''}
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Download Button */}
          <button
            type="button"
            disabled={isCopyDisabled}
            onClick={handleDownload}
            className="p-1.5 text-slate-300 hover:text-white bg-[#090D16] hover:bg-slate-800/80 rounded-md border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
            title="Download file"
            aria-label={`Download ${activeTab.name}`}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Refined AI Explain Action */}
          <button
            type="button"
            onClick={onExplainCode}
            title={
              tokensRemaining < 2
                ? 'Needs 2 tokens — click to open quota manager'
                : 'Generate AI architectural breakdown for this file (2 tokens)'
            }
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400/50 text-sky-200 hover:text-white rounded-md font-medium text-xs transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Explain</span>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">· 2t</span>
          </button>
        </div>
      </div>

      {/* Editor Content Viewport */}
      <div
        ref={codeContainerRef}
        className="flex-1 overflow-auto bg-[#0B101D] relative font-mono text-[13px] leading-relaxed"
      >
        {isLoadingContent ? (
          <div className="flex items-center justify-center h-full text-slate-400 gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            <span className="text-xs font-sans">Fetching file contents...</span>
          </div>
        ) : isMarkdown && viewMode === 'preview' ? (
          <div
            className="p-8 prose prose-invert max-w-4xl mx-auto prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-headings:text-slate-100 prose-a:text-sky-400"
            dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
          />
        ) : isImage ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
            <p className="text-xs font-sans mb-4">Image preview for {activeTab.name}</p>
            <img
              src={`https://raw.githubusercontent.com/${repoFullName}/HEAD/${activeTab.path}`}
              alt={activeTab.name}
              className="max-h-96 rounded-lg border border-slate-800 shadow-lg object-contain bg-slate-900/40 p-4"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="flex min-w-full">
            {/* Line numbers gutter */}
            <div className="py-4 pl-3 pr-4 select-none text-right text-slate-600 bg-[#090D16] border-r border-slate-800/80 sticky left-0 z-10 shrink-0 font-mono text-xs tabular-nums leading-relaxed">
              {lines.map((_, idx) => {
                const lineNum = idx + 1;
                const isSelected = selectedLine === lineNum;
                return (
                  <div
                    key={lineNum}
                    onClick={() => {
                      setSelectedLine(lineNum);
                      onAskAboutLine(lineNum, lines[idx]);
                    }}
                    title={`Click to select Line ${lineNum} and ask AI (1 token)`}
                    className={`cursor-pointer hover:text-sky-400 px-1 rounded transition-colors ${
                      isSelected ? 'text-sky-400 font-bold bg-sky-500/10' : ''
                    }`}
                  >
                    {lineNum}
                  </div>
                );
              })}
            </div>

            {/* Code syntax highlighted text */}
            <pre className="py-4 px-6 flex-1 text-slate-200 overflow-visible m-0 bg-transparent">
              <code className={`language-${prismLanguage}`}>{activeTab.content}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Subtle Floating Copy Confirmation Toast */}
      {copyToast && (
        <div
          key={copyToast.id}
          role="status"
          aria-live="polite"
          className={`absolute bottom-4 right-4 z-40 flex items-center gap-2.5 pl-3 pr-2.5 py-2 rounded-lg border shadow-xl shadow-black/50 backdrop-blur-md transition-all duration-150 max-w-sm ${
            copyToast.tone === 'success'
              ? 'bg-[#0F172A]/95 border-emerald-500/35 text-slate-100'
              : 'bg-[#0F172A]/95 border-rose-500/40 text-slate-100'
          }`}
        >
          {copyToast.tone === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-100 leading-tight">{copyToast.title}</div>
            <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{copyToast.detail}</div>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setCopyToast(null)}
            className="ml-1 p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800/70 transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
