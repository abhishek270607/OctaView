import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  ExternalLink,
  Key,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { TokenProfile } from '../types';
import { testGithubToken } from '../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: TokenProfile[];
  activeProfileId: string | null;
  onSaveProfile: (profile: TokenProfile) => void;
  onSelectActiveProfile: (id: string | null) => void;
  onDeleteProfile: (id: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSaveProfile,
  onSelectActiveProfile,
  onDeleteProfile,
}) => {
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    user?: any;
    scopes?: string[];
    rateLimit?: any;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const res = await testGithubToken(token.trim());
      setValidationResult(res);

      if (res.valid) {
        const newProfile: TokenProfile = {
          id: `profile_${Date.now()}`,
          name: name.trim() || res.user?.login || 'GitHub Profile',
          token: token.trim(),
          createdAt: Date.now(),
          lastValidated: Date.now(),
          username: res.user?.login,
          avatarUrl: res.user?.avatar_url,
          scopes: res.scopes,
          rateLimit: res.rateLimit
            ? {
                limit: res.rateLimit.limit,
                remaining: res.rateLimit.remaining,
                reset: res.rateLimit.reset,
              }
            : undefined,
        };

        onSaveProfile(newProfile);
        onSelectActiveProfile(newProfile.id);
        setName('');
        setToken('');
      }
    } catch (err: any) {
      setValidationResult({ valid: false, error: err.message || 'Validation failed' });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#090D16] border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0C121F]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">GitHub Token & Profile Manager</h3>
              <p className="text-xs text-slate-400">
                Unlock 5,000 requests/hr and access your private repositories.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Active / Saved Profiles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                Saved Accounts & Profiles ({profiles.length})
              </span>
              <button
                onClick={() => onSelectActiveProfile(null)}
                className={`text-[11px] font-mono transition-colors ${
                  activeProfileId === null ? 'text-sky-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Use Anonymous / Public Mode
              </button>
            </div>

            {profiles.length === 0 ? (
              <div className="p-4 bg-[#111726] border border-slate-800 rounded-lg text-slate-400 text-center">
                No profiles saved yet. Add a GitHub Personal Access Token below to save your access.
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map((p) => {
                  const isActive = p.id === activeProfileId;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-sky-500/10 border-sky-500/40 text-white'
                          : 'bg-[#111726] border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        {p.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={p.username || p.name}
                            className="w-8 h-8 rounded-full ring-1 ring-slate-700"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">{p.name}</span>
                            {p.username && <span className="font-mono text-slate-400">@{p.username}</span>}
                            {isActive && (
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>Token: {p.token.slice(0, 7)}•••••</span>
                            {p.rateLimit && (
                              <>
                                <span>·</span>
                                <span className="text-emerald-400 tabular-nums">
                                  {p.rateLimit.remaining}/{p.rateLimit.limit} reqs
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isActive ? (
                          <button
                            onClick={() => onSelectActiveProfile(p.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors"
                          >
                            Activate
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                            <Check className="w-3.5 h-3.5" />
                            <span>In Use</span>
                          </span>
                        )}
                        <button
                          onClick={() => onDeleteProfile(p.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors"
                          title="Remove profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Profile Form */}
          <form onSubmit={handleTestAndSave} className="space-y-4 pt-4 border-t border-slate-800">
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Connect New GitHub Token</span>
            </span>

            <div className="space-y-1.5">
              <label className="text-slate-400 block font-medium">Profile Name (e.g. Personal Dev, Work)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My GitHub Account"
                className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-400 font-medium">Personal Access Token (classic or fine-grained)</label>
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  Generate on GitHub
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx or github_pat_xxxxxxxxxxxx"
                className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-colors"
                required
              />
              <p className="text-[11px] text-slate-500 leading-normal">
                Tokens are stored locally in your browser. For public repos, no special scopes are required. For private repos, select the <code className="text-slate-300">repo</code> scope.
              </p>
            </div>

            {/* Validation Feedback */}
            {validationResult && (
              <div
                className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                  validationResult.valid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {validationResult.valid ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">
                    {validationResult.valid
                      ? `Token verified! Connected as @${validationResult.user?.login}`
                      : 'Validation Failed'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {validationResult.valid
                      ? `Rate limit: ${validationResult.rateLimit?.remaining || 5000} requests remaining.`
                      : validationResult.error || 'Please check token string and permissions.'}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isValidating || !token.trim()}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating with GitHub...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Validate & Save Profile</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
