import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { RepoSearchBar } from './components/RepoSearchBar';
import { FileTree } from './components/FileTree';
import { CodeViewer } from './components/CodeViewer';
import { AiInspector } from './components/AiInspector';
import { ProfileModal } from './components/ProfileModal';
import { TokenQuotaModal } from './components/TokenQuotaModal';
import { QuickSearchModal } from './components/QuickSearchModal';
import { RepoOverviewPage } from './components/RepoOverviewPage';
import {
  ArchitectureMap,
  FileExplanation,
  FileNode,
  GitTreeItem,
  OpenFileTab,
  RepoMeta,
  TokenProfile,
  ChatMessage,
} from './types';
import {
  fetchFileContent,
  fetchRepoBranches,
  fetchRepoMeta,
  fetchRepoTree,
  requestArchitectureMap,
  requestFileExplanation,
  askCodeQuestion,
} from './services/api';
import {
  getActiveProfile,
  getActiveProfileId,
  getRecentRepos,
  getStoredProfiles,
  saveProfiles,
  setActiveProfileId,
  addRecentRepo,
  removeRecentRepo,
  clearRecentRepos,
} from './services/storage';
import {
  auth,
  db,
  signInWithGoogle,
  signOutUser,
  syncUserProfile,
  deductUserTokens,
  refillUserTokens,
  getGuestTokens,
  TokenTransactionRecord,
  StarredRepoItem,
  getGuestStarredRepos,
  toggleStarredRepo,
  handleFirestoreError,
  OperationType,
} from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { buildFileTree, detectLanguage } from './utils/fileTree';
import { AlertTriangle, Sparkles, Terminal, Zap } from 'lucide-react';

const MAX_USER_TOKENS = 50;

export default function App() {
  // Firebase Auth & Token Quota State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [tokensRemaining, setTokensRemaining] = useState<number>(() => getGuestTokens());
  const [transactions, setTransactions] = useState<TokenTransactionRecord[]>([]);
  const [starredRepos, setStarredRepos] = useState<StarredRepoItem[]>(() => getGuestStarredRepos());
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenToast, setTokenToast] = useState<string | null>(null);

  // GitHub Personal Access Token Profiles
  const [profiles, setProfiles] = useState<TokenProfile[]>([]);
  const [activeProfileId, setActiveId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Repo State
  const [repoQuery, setRepoQuery] = useState('expressjs/express');
  const [repoMeta, setRepoMeta] = useState<RepoMeta | null>(null);
  const [branches, setBranches] = useState<{ name: string; commit: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [rawItems, setRawItems] = useState<GitTreeItem[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'explorer'>('overview');
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [isLoadingReadme, setIsLoadingReadme] = useState(false);

  // File Tabs & Content
  const [openTabs, setOpenTabs] = useState<OpenFileTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);

  // AI Inspector
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiDrawerTab, setAiDrawerTab] = useState<'file' | 'architecture' | 'chat'>('file');
  const [fileExplanations, setFileExplanations] = useState<Record<string, FileExplanation>>({});
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [architectureMap, setArchitectureMap] = useState<ArchitectureMap | null>(null);
  const [isLoadingArchitecture, setIsLoadingArchitecture] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Active Profile
  const activeProfile = useMemo(() => {
    if (!activeProfileId) return null;
    return profiles.find((p) => p.id === activeProfileId) || null;
  }, [profiles, activeProfileId]);

  // Firebase Auth listener & Firestore live sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const profile = await syncUserProfile(user);
          setTokensRemaining(profile.tokensRemaining);

          // Listen to user document for live token updates
          const userDocRef = doc(db, 'users', user.uid);
          const unsubUser = onSnapshot(
            userDocRef,
            (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                if (typeof data.tokensRemaining === 'number') {
                  setTokensRemaining(data.tokensRemaining);
                }
              }
            },
            (err) => {
              handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
            }
          );

          // Listen to recent token transactions
          const txQuery = query(
            collection(db, 'users', user.uid, 'transactions'),
            orderBy('createdAt', 'desc'),
            limit(15)
          );
          const unsubTx = onSnapshot(
            txQuery,
            (snap) => {
              const txs: TokenTransactionRecord[] = [];
              snap.forEach((d) => {
                txs.push({ id: d.id, ...(d.data() as any) });
              });
              setTransactions(txs);
            },
            (err) => {
              handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/transactions`);
            }
          );

          // Listen to starred repositories in Firestore
          const starredQuery = query(collection(db, 'users', user.uid, 'starredRepos'));
          const unsubStarred = onSnapshot(
            starredQuery,
            (snap) => {
              const repos: StarredRepoItem[] = [];
              snap.forEach((d) => {
                repos.push(d.data() as StarredRepoItem);
              });
              setStarredRepos(repos);
            },
            (err) => {
              handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/starredRepos`);
            }
          );

          return () => {
            unsubUser();
            unsubTx();
            unsubStarred();
          };
        } catch (e) {
          console.error('Error syncing user profile:', e);
        }
      } else {
        // Guest mode
        setTokensRemaining(getGuestTokens());
        setStarredRepos(getGuestStarredRepos());
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Initial mount: load profiles & recent repos
  useEffect(() => {
    const loadedProfiles = getStoredProfiles();
    const currentActiveId = getActiveProfileId();
    setProfiles(loadedProfiles);
    setActiveId(currentActiveId);
    setRecentRepos(getRecentRepos());
  }, []);

  // Global keyboard shortcuts:
  // 1. Ctrl+P / Cmd+P -> Open file search
  // 2. Ctrl+K / Cmd+K -> Open/toggle AI Inspector
  // 3. Ctrl+Shift+O / Cmd+Shift+O -> Cycle through open tabs
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // 1. Ctrl+Shift+O: Cycle through open tabs
      if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setOpenTabs((currentTabs) => {
          if (currentTabs.length <= 1) return currentTabs;
          const currentIndex = currentTabs.findIndex((t) => t.path === activeTabPath);
          const nextIndex = (currentIndex + 1) % currentTabs.length;
          setActiveTabPath(currentTabs[nextIndex].path);
          return currentTabs;
        });
        return;
      }

      // 2. Ctrl+P: Open file search
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsQuickSearchOpen((prev) => !prev);
        return;
      }

      // 3. Ctrl+K: Open/toggle AI Inspector
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsAiDrawerOpen((prev) => !prev);
        return;
      }

      // Escape: Dismiss active quick search modal
      if (e.key === 'Escape') {
        setIsQuickSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeTabPath]);

  // Parse repo owner and name from arbitrary string/URL
  const parseRepoString = (input: string): { owner: string; repo: string; branch?: string; filePath?: string } | null => {
    let clean = input.trim();
    // Remove query params and hash fragments
    clean = clean.split('?')[0].split('#')[0];
    // Strip protocol and domain
    clean = clean.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/^github\.com\//i, '');
    clean = clean.replace(/\.git$/i, '');
    clean = clean.replace(/^\/+|\/+$/g, '');

    const parts = clean.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const owner = parts[0];
      const repo = parts[1];
      let branch: string | undefined;
      let filePath: string | undefined;

      // Handle github.com/owner/repo/tree/branch or github.com/owner/repo/blob/branch/path/to/file
      if ((parts[2] === 'tree' || parts[2] === 'blob') && parts.length >= 4) {
        branch = parts[3];
        if (parts.length > 4) {
          filePath = parts.slice(4).join('/');
        }
      }

      return { owner, repo, branch, filePath };
    }
    return null;
  };

  // Helper to deduct task tokens
  const tryConsumeTokens = async (cost: number, taskType: string, description: string): Promise<boolean> => {
    if (tokensRemaining < cost) {
      setIsTokenModalOpen(true);
      return false;
    }

    // Flash deduction toast
    setTokenToast(`-${cost} Task Tokens consumed`);
    setTimeout(() => setTokenToast(null), 2500);

    const newBalance = await deductUserTokens(
      firebaseUser,
      cost,
      taskType,
      description,
      tokensRemaining
    );
    setTokensRemaining(newBalance);

    if (!firebaseUser) {
      // Local transaction tracking for guests
      setTransactions((prev) => [
        {
          id: `tx_${Date.now()}`,
          userId: 'guest',
          taskType,
          tokensDeducted: cost,
          remainingBalance: newBalance,
          description,
          createdAt: new Date().toISOString(),
        },
        ...prev.slice(0, 14),
      ]);
    }

    return true;
  };

  // Load Repository
  const loadRepository = useCallback(
    async (query: string, branchOverride?: string) => {
      const parsed = parseRepoString(query);
      if (!parsed) {
        setRepoError('Please enter a valid format: "owner/repo" or full GitHub URL (e.g., https://github.com/facebook/react)');
        return;
      }

      setIsLoadingRepo(true);
      setRepoError(null);
      setOpenTabs([]);
      setActiveTabPath(null);
      setArchitectureMap(null);
      setChatMessages([]);

      try {
        const meta = await fetchRepoMeta(parsed.owner, parsed.repo);
        setRepoMeta(meta);
        setRepoQuery(meta.full_name);
        addRecentRepo(meta.full_name);
        setRecentRepos(getRecentRepos());

        // Fetch branches
        let branchList: { name: string; commit: string }[] = [];
        try {
          branchList = await fetchRepoBranches(parsed.owner, parsed.repo);
          setBranches(branchList);
        } catch {
          branchList = [{ name: meta.default_branch, commit: '' }];
          setBranches(branchList);
        }

        const activeRef = branchOverride || parsed.branch || meta.default_branch;
        setSelectedBranch(activeRef);

        // Fetch tree
        const treeData = await fetchRepoTree(parsed.owner, parsed.repo, activeRef);
        setRawItems(treeData.tree);
        const built = buildFileTree(treeData.tree);
        setFileTree(built);

        // Fetch README.md for the Whole Preview mode
        setReadmeContent(null);
        const readmeItem = treeData.tree.find(
          (item) =>
            item.type === 'blob' &&
            ['readme.md', 'readme', 'readme.txt', 'readme.rst'].includes(
              item.path.toLowerCase()
            )
        );

        if (readmeItem) {
          setIsLoadingReadme(true);
          fetchFileContent(parsed.owner, parsed.repo, readmeItem.path, activeRef)
            .then((res) => setReadmeContent(res.content))
            .catch(() => setReadmeContent(null))
            .finally(() => setIsLoadingReadme(false));
        }

        // If user specifically entered a file URL or requested one
        if (parsed.filePath) {
          loadFile(parsed.owner, parsed.repo, parsed.filePath, activeRef);
          setViewMode('explorer');
        } else {
          // Pre-load default README or entrypoint for when user switches to editor
          const defaultOpen = treeData.tree.find(
            (item) =>
              item.type === 'blob' &&
              ['readme.md', 'package.json', 'index.ts', 'index.js', 'src/index.ts', 'main.py'].includes(
                item.path.toLowerCase()
              )
          );

          if (defaultOpen) {
            loadFile(parsed.owner, parsed.repo, defaultOpen.path, activeRef);
          }
        }
      } catch (err: any) {
        console.error('Error loading repository:', err);
        setRepoError(err.message || 'Failed to fetch repository. Check network or rate limits.');
      } finally {
        setIsLoadingRepo(false);
      }
    },
    []
  );

  // Load file content
  const loadFile = async (owner: string, repo: string, filePath: string, ref: string) => {
    // If tab already open, switch to it
    const existing = openTabs.find((t) => t.path === filePath);
    if (existing) {
      setActiveTabPath(filePath);
      return;
    }

    setIsLoadingContent(true);
    try {
      const fileData = await fetchFileContent(owner, repo, filePath, ref);
      const language = detectLanguage(fileData.name);
      const newTab: OpenFileTab = {
        path: fileData.path,
        name: fileData.name,
        content: fileData.content,
        language,
        size: fileData.size,
      };

      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabPath(fileData.path);
    } catch (err: any) {
      console.error('Error fetching file content:', err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Mount: load default repository
  useEffect(() => {
    loadRepository('expressjs/express');
  }, [loadRepository]);

  // Handle branch switch
  const handleSelectBranch = (branch: string) => {
    setSelectedBranch(branch);
    if (repoMeta) {
      loadRepository(repoMeta.full_name, branch);
    }
  };

  // Handle file select in file tree
  const handleSelectFile = (path: string) => {
    if (!repoMeta) return;
    loadFile(repoMeta.owner.login, repoMeta.name, path, selectedBranch);
  };

  // Handle tab switch & close
  const handleSelectTab = (path: string) => {
    setActiveTabPath(path);
  };

  const handleCloseTab = (path: string) => {
    setOpenTabs((prev) => {
      const remaining = prev.filter((t) => t.path !== path);
      if (activeTabPath === path) {
        setActiveTabPath(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
      }
      return remaining;
    });
  };

  const activeTab = useMemo(() => {
    return openTabs.find((t) => t.path === activeTabPath) || null;
  }, [openTabs, activeTabPath]);

  // Handle AI Explanation request for active file (costs 2 tokens)
  const handleExplainCode = async () => {
    if (!activeTab || !repoMeta) return;

    setIsAiDrawerOpen(true);
    setAiDrawerTab('file');

    if (fileExplanations[activeTab.path]) {
      return;
    }

    const hasTokens = await tryConsumeTokens(2, 'explain_file', `Explained ${activeTab.name}`);
    if (!hasTokens) return;

    setIsLoadingExplanation(true);
    try {
      const explanation = await requestFileExplanation({
        filename: activeTab.name,
        path: activeTab.path,
        code: activeTab.content,
        repoName: repoMeta.full_name,
        language: activeTab.language,
      });

      setFileExplanations((prev) => ({
        ...prev,
        [activeTab.path]: explanation,
      }));
    } catch (err: any) {
      console.error('Error generating file explanation:', err);
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  // Handle AI Architecture Map generation (costs 5 tokens)
  const handleOpenArchitecture = async () => {
    setIsAiDrawerOpen(true);
    setAiDrawerTab('architecture');

    if (architectureMap || !repoMeta) return;

    const hasTokens = await tryConsumeTokens(5, 'architecture_map', `Generated architecture blueprint for ${repoMeta.full_name}`);
    if (!hasTokens) return;

    setIsLoadingArchitecture(true);
    try {
      const filePaths = rawItems.map((i) => i.path);
      const pkgFile = openTabs.find((t) => t.name === 'package.json');
      let manifest: any = null;
      if (pkgFile) {
        try {
          manifest = JSON.parse(pkgFile.content);
        } catch {}
      }

      const map = await requestArchitectureMap({
        repoName: repoMeta.full_name,
        description: repoMeta.description,
        filePaths,
        packageManifest: manifest,
      });

      setArchitectureMap(map);
    } catch (err: any) {
      console.error('Error generating architecture map:', err);
    } finally {
      setIsLoadingArchitecture(false);
    }
  };

  // Handle Chat Message (costs 1 token)
  const handleSendMessage = async (text: string) => {
    const hasTokens = await tryConsumeTokens(1, 'ask_ai', `AI prompt: "${text.slice(0, 35)}..."`);
    if (!hasTokens) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
      filePath: activeTab?.path,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsSendingMessage(true);

    try {
      const answer = await askCodeQuestion({
        repoName: repoMeta?.full_name || 'Repository',
        filePath: activeTab?.path,
        code: activeTab?.content,
        question: text,
        history: chatMessages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      });

      const modelMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'model',
        text: answer,
        timestamp: Date.now(),
        filePath: activeTab?.path,
      };

      setChatMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'model',
        text: `Error: ${err.message || 'Failed to generate answer. Please try again.'}`,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleAskAboutLine = (lineNum: number, lineText: string) => {
    setIsAiDrawerOpen(true);
    setAiDrawerTab('chat');
    handleSendMessage(`What does Line ${lineNum} do? Code snippet:\n\`${lineText.trim()}\``);
  };

  // Breadcrumb folder click handler
  const handleBreadcrumbClick = (folderPath: string) => {
    // If user clicks a breadcrumb directory, select or expand that folder in tree
    console.log('Navigated to folder:', folderPath);
  };

  // Refill tokens
  const handleRefillTokens = async () => {
    const newBal = await refillUserTokens(firebaseUser);
    setTokensRemaining(newBal);
    setIsTokenModalOpen(false);
  };

  // Starred repository calculation & toggle handler
  const isCurrentRepoStarred = useMemo(() => {
    if (!repoMeta) return false;
    return starredRepos.some(
      (r) => r.fullName.toLowerCase() === repoMeta.full_name.toLowerCase()
    );
  }, [starredRepos, repoMeta]);

  const handleToggleStar = async () => {
    if (!repoMeta) return;
    try {
      const nextStarred = await toggleStarredRepo(
        firebaseUser,
        repoMeta,
        isCurrentRepoStarred
      );
      if (!firebaseUser) {
        setStarredRepos(getGuestStarredRepos());
      }
      setTokenToast(
        nextStarred
          ? `Starred ${repoMeta.full_name} ⭐`
          : `Removed star from ${repoMeta.full_name}`
      );
      setTimeout(() => setTokenToast(null), 2500);
    } catch (err) {
      console.error('Failed to toggle star repository:', err);
    }
  };

  // Google Auth actions
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign-in failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  // Profile management handlers
  const handleSaveProfile = (newProfile: TokenProfile) => {
    const updated = [...profiles.filter((p) => p.id !== newProfile.id), newProfile];
    setProfiles(updated);
    saveProfiles(updated);
  };

  const handleSelectActiveProfile = (id: string | null) => {
    setActiveId(id);
    setActiveProfileId(id);
  };

  const handleDeleteProfile = (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    saveProfiles(updated);
    if (activeProfileId === id) {
      setActiveId(null);
      setActiveProfileId(null);
    }
  };

  const handleSelectRecentRepo = (repo: string) => {
    setRepoQuery(repo);
    loadRepository(repo);
  };

  const handleRemoveRecent = (repo: string) => {
    const updated = removeRecentRepo(repo);
    setRecentRepos(updated);
  };

  const handleClearRecents = () => {
    clearRecentRepos();
    setRecentRepos([]);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080C14] text-slate-100 font-sans">
      {/* 3-Zone Header Contract */}
      <Header
        activeProfile={activeProfile}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenArchitecture={handleOpenArchitecture}
        onSelectBenchmark={(bench) => loadRepository(bench)}
        user={firebaseUser}
        onSignInWithGoogle={handleGoogleSignIn}
        onSignOut={handleSignOut}
        tokensRemaining={tokensRemaining}
        maxTokens={MAX_USER_TOKENS}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
        onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        onToggleAiInspector={() => setIsAiDrawerOpen((prev) => !prev)}
      />

      {/* Repo Search Bar & Unboxed Metadata */}
      <RepoSearchBar
        currentInput={repoQuery}
        onSearch={(query) => loadRepository(query)}
        isLoading={isLoadingRepo}
        repoMeta={repoMeta}
        branches={branches}
        selectedBranch={selectedBranch}
        onSelectBranch={handleSelectBranch}
        onOpenArchitecture={handleOpenArchitecture}
        recentRepos={recentRepos}
        isStarred={isCurrentRepoStarred}
        onToggleStar={handleToggleStar}
        starredRepos={starredRepos}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        rawItems={rawItems}
        onSelectFile={(path) => {
          handleSelectFile(path);
          setViewMode('explorer');
        }}
      />

      {/* Floating Token Toast when task is performed */}
      {tokenToast && (
        <div className="fixed top-24 right-6 z-50 bg-amber-500/20 border border-amber-500/40 text-amber-200 px-3.5 py-1.5 rounded-lg shadow-lg text-xs font-mono flex items-center gap-2 backdrop-blur-md animate-fade-in">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{tokenToast}</span>
        </div>
      )}

      {/* Error Banner */}
      {repoError && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-6 py-2 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{repoError}</span>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="text-rose-200 underline font-medium hover:text-white"
          >
            Add Personal Access Token to increase quota
          </button>
        </div>
      )}

      {/* Main Workbench Body: Whole Page Preview OR 3-pane layout */}
      <main className="flex-1 flex overflow-hidden min-h-0 relative">
        {viewMode === 'overview' && repoMeta ? (
          <div className="flex-1 flex overflow-hidden relative">
            <RepoOverviewPage
              repoMeta={repoMeta}
              readmeContent={readmeContent}
              isLoadingReadme={isLoadingReadme}
              rawItems={rawItems}
              fileTree={fileTree}
              onOpenFile={(path) => {
                handleSelectFile(path);
                setViewMode('explorer');
              }}
              onSwitchToExplorer={() => setViewMode('explorer')}
              isStarred={isCurrentRepoStarred}
              onToggleStar={handleToggleStar}
              onOpenArchitecture={handleOpenArchitecture}
              user={firebaseUser}
              tokensRemaining={tokensRemaining}
              maxTokens={MAX_USER_TOKENS}
              starredRepos={starredRepos}
              recentRepos={recentRepos}
              onSelectRepo={handleSelectRecentRepo}
              onRemoveRecent={handleRemoveRecent}
              onClearRecents={handleClearRecents}
              onSignInWithGoogle={handleGoogleSignIn}
              onSignOut={handleSignOut}
              onOpenTokenModal={() => setIsTokenModalOpen(true)}
            />

            {/* Right: Collapsible AI Inspector Drawer */}
            <AiInspector
              isOpen={isAiDrawerOpen}
              onClose={() => setIsAiDrawerOpen(false)}
              activeTab={activeTab}
              fileExplanation={activeTab ? fileExplanations[activeTab.path] : null}
              isLoadingExplanation={isLoadingExplanation}
              onRefreshExplanation={handleExplainCode}
              architectureMap={architectureMap}
              isLoadingArchitecture={isLoadingArchitecture}
              onRefreshArchitecture={handleOpenArchitecture}
              chatMessages={chatMessages}
              onSendMessage={handleSendMessage}
              isSendingMessage={isSendingMessage}
              defaultTab={aiDrawerTab}
              tokensRemaining={tokensRemaining}
              onOpenTokenModal={() => setIsTokenModalOpen(true)}
            />
          </div>
        ) : (
          <>
            {/* Left: Recursive File Tree Explorer */}
            <FileTree
              tree={fileTree}
              rawItems={rawItems}
              activeFilePath={activeTabPath}
              onSelectFile={handleSelectFile}
              isLoading={isLoadingRepo}
            />

            {/* Center: Multi-tab Code Viewer with Line Gutter & Breadcrumb Trail */}
            <CodeViewer
              repoFullName={repoMeta?.full_name || repoQuery}
              openTabs={openTabs}
              activeTabPath={activeTabPath}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
              onExplainCode={handleExplainCode}
              onAskAboutLine={handleAskAboutLine}
              onBreadcrumbClick={handleBreadcrumbClick}
              isLoadingContent={isLoadingContent}
              tokensRemaining={tokensRemaining}
            />

            {/* Right: Collapsible AI Inspector Drawer */}
            <AiInspector
              isOpen={isAiDrawerOpen}
              onClose={() => setIsAiDrawerOpen(false)}
              activeTab={activeTab}
              fileExplanation={activeTab ? fileExplanations[activeTab.path] : null}
              isLoadingExplanation={isLoadingExplanation}
              onRefreshExplanation={handleExplainCode}
              architectureMap={architectureMap}
              isLoadingArchitecture={isLoadingArchitecture}
              onRefreshArchitecture={handleOpenArchitecture}
              chatMessages={chatMessages}
              onSendMessage={handleSendMessage}
              isSendingMessage={isSendingMessage}
              defaultTab={aiDrawerTab}
              tokensRemaining={tokensRemaining}
              onOpenTokenModal={() => setIsTokenModalOpen(true)}
            />
          </>
        )}
      </main>

      {/* Token & Quota Modal */}
      <TokenQuotaModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        tokensRemaining={tokensRemaining}
        maxTokens={MAX_USER_TOKENS}
        user={firebaseUser}
        onRefill={handleRefillTokens}
        onSignInWithGoogle={handleGoogleSignIn}
        transactions={transactions}
      />

      {/* GitHub PAT Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSaveProfile={handleSaveProfile}
        onSelectActiveProfile={handleSelectActiveProfile}
        onDeleteProfile={handleDeleteProfile}
      />

      {/* Quick File Search Modal (Ctrl+P / ⌘P) */}
      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        rawItems={rawItems}
        onSelectFile={handleSelectFile}
      />
    </div>
  );
}
