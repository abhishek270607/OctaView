import React, { useState } from 'react';
import {
  ArchitectureMap,
  FileExplanation,
  ChatMessage,
  OpenFileTab,
} from '../types';
import {
  Bot,
  BrainCircuit,
  ChevronRight,
  Code2,
  FileCode,
  Layers,
  Lightbulb,
  Loader2,
  Network,
  RefreshCw,
  Send,
  Sparkles,
  Workflow,
  X,
  Zap,
} from 'lucide-react';

interface AiInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: OpenFileTab | null;
  fileExplanation: FileExplanation | null;
  isLoadingExplanation: boolean;
  onRefreshExplanation: () => void;
  architectureMap: ArchitectureMap | null;
  isLoadingArchitecture: boolean;
  onRefreshArchitecture: () => void;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isSendingMessage: boolean;
  defaultTab?: 'file' | 'architecture' | 'chat';
  tokensRemaining: number;
  onOpenTokenModal: () => void;
}

export const AiInspector: React.FC<AiInspectorProps> = ({
  isOpen,
  onClose,
  activeTab,
  fileExplanation,
  isLoadingExplanation,
  onRefreshExplanation,
  architectureMap,
  isLoadingArchitecture,
  onRefreshArchitecture,
  chatMessages,
  onSendMessage,
  isSendingMessage,
  defaultTab = 'file',
  tokensRemaining,
  onOpenTokenModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'file' | 'architecture' | 'chat'>(defaultTab);
  const [chatInput, setChatInput] = useState('');

  if (!isOpen) return null;

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && !isSendingMessage) {
      onSendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const quickPrompts = [
    'How does error handling work in this file?',
    'What are the key exports and how are they used?',
    'Explain the algorithmic complexity of this code',
    'Suggest unit tests for the main function',
  ];

  return (
    <aside className="w-96 shrink-0 border-l border-slate-800 bg-[#090D16] flex flex-col h-full overflow-hidden z-20 shadow-2xl">
      {/* Top Header */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0C121F]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-100 tracking-tight">AI Code Companion</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Token Indicator */}
          <button
            onClick={onOpenTokenModal}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-semibold hover:bg-amber-500/20 transition-colors"
            title="Click to manage task tokens"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{tokensRemaining} ⚡</span>
          </button>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Segmented Sub-tab bar */}
      <div className="grid grid-cols-3 p-1.5 bg-[#0A0E1A] border-b border-slate-800/80 text-xs shrink-0 gap-1">
        <button
          onClick={() => setActiveSubTab('file')}
          className={`py-1.5 rounded text-center font-medium transition-colors ${
            activeSubTab === 'file'
              ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          File Insight
        </button>
        <button
          onClick={() => setActiveSubTab('architecture')}
          className={`py-1.5 rounded text-center font-medium transition-colors ${
            activeSubTab === 'architecture'
              ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Architecture
        </button>
        <button
          onClick={() => setActiveSubTab('chat')}
          className={`py-1.5 rounded text-center font-medium transition-colors ${
            activeSubTab === 'chat'
              ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Ask AI
        </button>
      </div>

      {/* Tab 1: File Insight */}
      {activeSubTab === 'file' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 truncate">
              <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="font-mono text-slate-200 truncate">{activeTab?.name || 'No file selected'}</span>
            </div>
            {activeTab && (
              <button
                onClick={onRefreshExplanation}
                disabled={isLoadingExplanation}
                className="text-slate-400 hover:text-sky-400 transition-colors p-1"
                title="Regenerate explanation (-2 ⚡)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingExplanation ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {!activeTab ? (
            <div className="p-8 text-center text-slate-500">
              Open a file to see its architectural role and functional breakdown.
            </div>
          ) : isLoadingExplanation ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <BrainCircuit className="w-8 h-8 text-purple-400 animate-pulse" />
              <span className="font-mono text-slate-400 text-xs">Gemini is analyzing file contents (-2 ⚡)...</span>
            </div>
          ) : fileExplanation ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Purpose</h4>
                <p className="text-slate-200 leading-relaxed bg-[#111726] border border-slate-800/80 rounded-lg p-3">
                  {fileExplanation.summary}
                </p>
              </div>

              {/* Architecture Role */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Architectural Role</h4>
                <p className="text-slate-300 leading-relaxed bg-[#111726] border border-slate-800/80 rounded-lg p-3">
                  {fileExplanation.architectureRole}
                </p>
              </div>

              {/* Key Components */}
              {fileExplanation.keyComponents?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Key Symbols & Functions ({fileExplanation.keyComponents.length})
                  </h4>
                  <div className="space-y-2">
                    {fileExplanation.keyComponents.map((comp, idx) => (
                      <div key={idx} className="bg-[#111726] border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-sky-300">{comp.name}</span>
                          <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                            {comp.type} {comp.lineRange ? `(${comp.lineRange})` : ''}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-normal">{comp.purpose}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Algorithmic Complexity */}
              {fileExplanation.algorithmicComplexity && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Complexity & Performance</h4>
                  <p className="text-slate-300 font-mono text-[11px] leading-relaxed bg-[#111726] border border-slate-800/80 rounded-lg p-3">
                    {fileExplanation.algorithmicComplexity}
                  </p>
                </div>
              )}

              {/* Dependencies */}
              {fileExplanation.keyDependencies?.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Core Imports</h4>
                  <div className="space-y-1">
                    {fileExplanation.keyDependencies.map((dep, idx) => (
                      <div key={idx} className="flex items-start justify-between bg-[#111726] p-2 rounded border border-slate-800/60 font-mono text-[11px]">
                        <span className="text-sky-400 font-semibold">{dep.module}</span>
                        <span className="text-slate-400 text-right max-w-[180px] truncate">{dep.usage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Engineering Insights */}
              {fileExplanation.insights?.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>Engineering Observations</span>
                  </h4>
                  <ul className="space-y-1.5 bg-[#111726] border border-slate-800/80 rounded-lg p-3 text-slate-300">
                    {fileExplanation.insights.map((ins, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">›</span>
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 space-y-3">
              <p>No explanation generated yet.</p>
              <button
                onClick={onRefreshExplanation}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-medium text-xs hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-1.5 mx-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Analyze File (-2 ⚡)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Architecture Map */}
      {activeSubTab === 'architecture' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="font-semibold text-slate-200">Repository Blueprint</span>
            </div>
            <button
              onClick={onRefreshArchitecture}
              disabled={isLoadingArchitecture}
              className="text-slate-400 hover:text-purple-400 transition-colors p-1"
              title="Re-analyze repository (-5 ⚡)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingArchitecture ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoadingArchitecture ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Network className="w-8 h-8 text-purple-400 animate-pulse" />
              <span className="font-mono text-slate-400 text-xs">Mapping repository architecture (-5 ⚡)...</span>
            </div>
          ) : architectureMap ? (
            <div className="space-y-4">
              {/* High-Level Overview */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">System Overview</h4>
                <p className="text-slate-200 leading-relaxed bg-[#111726] border border-slate-800/80 rounded-lg p-3">
                  {architectureMap.overview}
                </p>
              </div>

              {/* ASCII Topology Diagram */}
              {architectureMap.asciiDiagram && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Topology Diagram</h4>
                  <pre className="bg-[#080B12] border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-sky-300 overflow-x-auto leading-relaxed">
                    {architectureMap.asciiDiagram}
                  </pre>
                </div>
              )}

              {/* Tech Stack */}
              {architectureMap.techStack?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tech Stack</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {architectureMap.techStack.map((tech, idx) => (
                      <div key={idx} className="bg-[#111726] border border-slate-800/80 rounded-lg p-2 space-y-0.5">
                        <span className="text-[10px] font-mono text-purple-400">{tech.category}</span>
                        <div className="font-semibold text-slate-200">{tech.name}</div>
                        <p className="text-[10px] text-slate-400 leading-tight">{tech.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subsystems */}
              {architectureMap.subsystems?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Subsystem Boundaries</h4>
                  <div className="space-y-2">
                    {architectureMap.subsystems.map((sub, idx) => (
                      <div key={idx} className="bg-[#111726] border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{sub.name}</span>
                          <span className="font-mono text-[10px] text-sky-400">{sub.directory}</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{sub.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Entry Points */}
              {architectureMap.keyEntryPoints?.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Primary Entry Points</h4>
                  <div className="space-y-1">
                    {architectureMap.keyEntryPoints.map((ep, idx) => (
                      <div key={idx} className="bg-[#111726] border border-slate-800/60 rounded p-2 flex items-center justify-between">
                        <span className="font-mono text-sky-400 text-[11px]">{ep.path}</span>
                        <span className="text-slate-400 text-[10px]">{ep.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 space-y-3">
              <p>No repository architecture map created yet.</p>
              <button
                onClick={onRefreshArchitecture}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-medium text-xs hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-1.5 mx-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Generate Blueprint (-5 ⚡)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Interactive Ask AI */}
      {activeSubTab === 'chat' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Chat message stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {chatMessages.length === 0 ? (
              <div className="py-6 space-y-4">
                <div className="p-3 bg-[#111726] border border-slate-800 rounded-lg space-y-1 text-slate-300">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Bot className="w-4 h-4 text-sky-400" />
                    <span>Ask anything about this code</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Ask code questions, investigate security, or click any line number in the editor. Each question consumes 1 Task Token (-1 ⚡).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Quick prompts (-1 ⚡)</span>
                  <div className="space-y-1">
                    {quickPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSendMessage(p)}
                        className="w-full text-left p-2 rounded bg-[#0F1524] hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800 transition-colors flex items-center justify-between group"
                      >
                        <span className="truncate">{p}</span>
                        <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-sky-400 shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-sky-500 text-slate-950 font-medium'
                        : 'bg-[#111726] text-slate-200 border border-slate-800/80'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}

            {isSendingMessage && (
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono p-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>Gemini is drafting an answer (-1 ⚡)...</span>
              </div>
            )}
          </div>

          {/* Chat input bar */}
          <form onSubmit={handleChatSubmit} className="p-3 border-t border-slate-800 bg-[#0C121F] shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about this file or function (-1 ⚡)..."
                className="w-full bg-[#111726] border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSendingMessage}
                className="absolute right-1.5 p-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 rounded transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
};
