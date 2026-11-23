export interface RepoMeta {
  id?: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  html_url: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  topics: string[];
  license: { name: string; spdx_id: string } | null;
  updated_at: string;
}

export interface GitTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size: number;
}

export interface FileNode {
  path: string;
  name: string;
  type: 'blob' | 'tree';
  sha?: string;
  size?: number;
  children?: FileNode[];
}

export interface OpenFileTab {
  path: string;
  name: string;
  content: string;
  language: string;
  size?: number;
  sha?: string;
}

export interface TokenProfile {
  id: string;
  name: string;
  token: string;
  createdAt: number;
  lastValidated?: number;
  username?: string;
  avatarUrl?: string;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
  scopes?: string[];
}

export interface FileExplanation {
  summary: string;
  architectureRole: string;
  keyComponents: {
    name: string;
    type: string;
    lineRange?: string;
    purpose: string;
  }[];
  algorithmicComplexity: string;
  keyDependencies: {
    module: string;
    usage: string;
  }[];
  insights: string[];
}

export interface ArchitectureMap {
  overview: string;
  techStack: {
    category: string;
    name: string;
    description: string;
  }[];
  keyEntryPoints: {
    path: string;
    role: string;
  }[];
  subsystems: {
    name: string;
    directory: string;
    description: string;
  }[];
  asciiDiagram: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  filePath?: string;
}
