import { ArchitectureMap, FileExplanation, GitTreeItem, RepoMeta } from '../types';
import { getActiveProfile } from './storage';

function getHeaders(): HeadersInit {
  const activeProfile = getActiveProfile();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (activeProfile?.token) {
    headers['x-github-token'] = activeProfile.token;
  }
  return headers;
}

export async function fetchRepoMeta(owner: string, repo: string): Promise<RepoMeta> {
  const res = await fetch(`/api/github/repo?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch repository' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRepoBranches(owner: string, repo: string): Promise<{ name: string; commit: string }[]> {
  const res = await fetch(`/api/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch branches');
  }
  return res.json();
}

export async function fetchRepoTree(owner: string, repo: string, ref: string): Promise<{ tree: GitTreeItem[]; truncated: boolean }> {
  const res = await fetch(`/api/github/tree?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&ref=${encodeURIComponent(ref)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch repository tree' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchFileContent(owner: string, repo: string, path: string, ref?: string): Promise<{ name: string; path: string; content: string; size: number }> {
  const refParam = ref ? `&ref=${encodeURIComponent(ref)}` : '';
  const res = await fetch(`/api/github/content?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}${refParam}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch file content' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRateLimit(): Promise<any> {
  const res = await fetch('/api/github/rate-limit', {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch rate limit');
  }
  return res.json();
}

export async function testGithubToken(token: string): Promise<{
  valid: boolean;
  user?: {
    login: string;
    name: string;
    avatar_url: string;
    public_repos: number;
    total_private_repos?: number;
  };
  scopes?: string[];
  rateLimit?: { limit: number; remaining: number; reset: number };
  error?: string;
}> {
  const res = await fetch('/api/github/test-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export async function requestFileExplanation(params: {
  filename: string;
  path: string;
  code: string;
  repoName: string;
  language: string;
}): Promise<FileExplanation> {
  const res = await fetch('/api/ai/explain-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate explanation' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function requestArchitectureMap(params: {
  repoName: string;
  description?: string | null;
  filePaths: string[];
  packageManifest?: any;
}): Promise<ArchitectureMap> {
  const res = await fetch('/api/ai/architecture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to analyze architecture' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function askCodeQuestion(params: {
  repoName: string;
  filePath?: string;
  code?: string;
  question: string;
  history?: { role: 'user' | 'model'; text: string }[];
}): Promise<string> {
  const res = await fetch('/api/ai/ask-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to answer question' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.answer;
}
