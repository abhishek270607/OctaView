import React from 'react';
import {
  History,
  RotateCcw,
  Zap,
  X,
  LogIn,
} from 'lucide-react';
import { TokenTransactionRecord } from '../services/firebase';
import { User as FirebaseUser } from 'firebase/auth';

interface TokenQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokensRemaining: number;
  maxTokens: number;
  user: FirebaseUser | null;
  onRefill: () => void;
  onSignInWithGoogle: () => void;
  transactions: TokenTransactionRecord[];
}

export const TokenQuotaModal: React.FC<TokenQuotaModalProps> = ({
  isOpen,
  onClose,
  tokensRemaining,
  maxTokens,
  user,
  onRefill,
  onSignInWithGoogle,
  transactions,
}) => {
  if (!isOpen) return null;

  const percentage = Math.min(100, Math.max(0, (tokensRemaining / maxTokens) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0A0F1A] border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0D1320]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">AI Task Quota</h3>
              <p className="text-xs text-slate-400">
                {user ? `Synced with ${user.email}` : 'Guest session (stored locally)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close quota dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Quota Meter */}
          <div className="bg-[#0F1524] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Available Balance
              </span>
              <span className="font-mono text-base font-semibold text-slate-100 tabular-nums">
                {tokensRemaining} <span className="text-slate-500 font-normal">/ {maxTokens}</span>
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  percentage > 50
                    ? 'bg-sky-400'
                    : percentage > 20
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-slate-400">
                Reset your daily allowance anytime while exploring repositories.
              </span>
              <button
                onClick={onRefill}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg font-medium text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Refill Quota (50)</span>
              </button>
            </div>
          </div>

          {/* Task Costs Breakdown */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-300">
              Task Usage Breakdown
            </h4>
            <div className="grid grid-cols-3 divide-x divide-slate-800 rounded-xl bg-[#0F1524] border border-slate-800 overflow-hidden">
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-200 font-medium">Explain File</span>
                  <span className="text-amber-400 font-semibold tabular-nums">-2</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Symbol and complexity summary
                </p>
              </div>

              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-200 font-medium">Architecture</span>
                  <span className="text-amber-400 font-semibold tabular-nums">-5</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Full repository topology map
                </p>
              </div>

              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-200 font-medium">Ask Question</span>
                  <span className="text-amber-400 font-semibold tabular-nums">-1</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Interactive code inquiry
                </p>
              </div>
            </div>
          </div>

          {/* Sign In Prompt if Guest */}
          {!user && (
            <div className="p-4 rounded-xl bg-[#0F1524] border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-100">Sync across sessions</div>
                <p className="text-[11px] text-slate-400">
                  Sign in with Google to save your starred repositories and history.
                </p>
              </div>
              <button
                onClick={onSignInWithGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-950 font-semibold rounded-lg text-xs hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          )}

          {/* Recent Activity */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Recent Activity</span>
            </h4>

            {transactions.length === 0 ? (
              <div className="p-5 bg-[#0F1524] border border-slate-800 rounded-xl text-slate-500 text-center text-xs">
                No AI tasks executed yet. Open any file to inspect its architecture or explain code.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-[#0F1524] max-h-48 overflow-y-auto">
                {transactions.map((tx, idx) => (
                  <div
                    key={idx}
                    className="px-3.5 py-2.5 flex items-center justify-between font-mono text-xs"
                  >
                    <div className="truncate mr-3">
                      <div className="text-slate-200 truncate">{tx.description}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span
                        className={`font-semibold ${
                          tx.tokensDeducted > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {tx.tokensDeducted > 0 ? `-${tx.tokensDeducted}` : `+${Math.abs(tx.tokensDeducted)}`}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        ({tx.remainingBalance} left)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
