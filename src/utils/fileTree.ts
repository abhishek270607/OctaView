import { FileNode, GitTreeItem } from '../types';

export function buildFileTree(items: GitTreeItem[]): FileNode[] {
  const root: FileNode = { path: '', name: '', type: 'tree', children: [] };

  for (const item of items) {
    const parts = item.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1 && item.type === 'blob';
      const currentPath = parts.slice(0, i + 1).join('/');

      if (!current.children) {
        current.children = [];
      }

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          path: currentPath,
          name: part,
          type: isFile ? 'blob' : 'tree',
          sha: item.sha,
          size: isFile ? item.size : undefined,
          children: isFile ? undefined : [],
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  // Sort: folders first alphabetically, then files alphabetically
  function sortNodes(nodes: FileNode[]) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'tree' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    for (const node of nodes) {
      if (node.children) {
        sortNodes(node.children);
      }
    }
  }

  if (root.children) {
    sortNodes(root.children);
    return root.children;
  }
  return [];
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'json':
      return 'json';
    case 'py':
      return 'python';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'hpp':
    case 'cc':
      return 'cpp';
    case 'cs':
      return 'csharp';
    case 'html':
      return 'html';
    case 'css':
    case 'scss':
      return 'css';
    case 'md':
    case 'mdx':
      return 'markdown';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'sh':
    case 'bash':
      return 'bash';
    case 'sql':
      return 'sql';
    case 'rb':
      return 'ruby';
    case 'php':
      return 'php';
    case 'dockerfile':
      return 'docker';
    default:
      return 'plaintext';
  }
}

export function getFileCategoryBadge(filename: string): { label: string; color: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['ts', 'tsx'].includes(ext)) return { label: 'TS', color: 'text-sky-400' };
  if (['js', 'jsx'].includes(ext)) return { label: 'JS', color: 'text-yellow-400' };
  if (['py'].includes(ext)) return { label: 'PY', color: 'text-blue-400' };
  if (['rs'].includes(ext)) return { label: 'RS', color: 'text-orange-400' };
  if (['go'].includes(ext)) return { label: 'GO', color: 'text-cyan-400' };
  if (['json'].includes(ext)) return { label: '{}', color: 'text-amber-400' };
  if (['md', 'mdx'].includes(ext)) return { label: 'MD', color: 'text-slate-300' };
  if (['css', 'scss'].includes(ext)) return { label: '#', color: 'text-pink-400' };
  if (['html'].includes(ext)) return { label: '<>', color: 'text-rose-400' };
  if (['yml', 'yaml'].includes(ext)) return { label: 'YML', color: 'text-purple-400' };
  if (['sql'].includes(ext)) return { label: 'SQL', color: 'text-emerald-400' };
  if (['sh', 'bash'].includes(ext)) return { label: 'SH', color: 'text-lime-400' };
  return { label: 'FILE', color: 'text-slate-400' };
}
