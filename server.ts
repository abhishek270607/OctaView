import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveServerConfig() {
  const args = process.argv.slice(2);
  let cliPort: number | undefined;
  let cliHost: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--port' || arg === '-p') && args[i + 1]) {
      const parsed = parseInt(args[i + 1], 10);
      if (!Number.isNaN(parsed)) cliPort = parsed;
      i++;
    } else if (arg.startsWith('--port=')) {
      const parsed = parseInt(arg.slice('--port='.length), 10);
      if (!Number.isNaN(parsed)) cliPort = parsed;
    } else if (arg === '--host' && args[i + 1]) {
      cliHost = args[i + 1];
      i++;
    } else if (arg.startsWith('--host=')) {
      cliHost = arg.slice('--host='.length);
    }
  }

  const isProd = process.env.NODE_ENV === 'production';
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
  const port =
    cliPort ??
    (isProd && envPort && !Number.isNaN(envPort) ? envPort : 3000);
  const host = cliHost || process.env.HOST || '0.0.0.0';

  return { port, host, isProd };
}

const { port: PORT, host: HOST, isProd: IS_PROD } = resolveServerConfig();

const app = express();

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Lazily initialized Gemini AI instance so missing API key never breaks server startup
let cachedAi: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!cachedAi) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }
    cachedAi = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAi;
}

// Helper for GitHub headers
function getGithubHeaders(customToken?: string | null) {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'OctoView-Explorer/1.0',
  };
  if (customToken && customToken.trim()) {
    headers['Authorization'] = `Bearer ${customToken.trim()}`;
  }
  return headers;
}

// ----------------- GitHub Proxy Endpoints -----------------

// Rate limit check
app.get('/api/github/rate-limit', async (req: Request, res: Response) => {
  try {
    const customToken = (req.headers['x-github-token'] as string) || null;
    const response = await fetch('https://api.github.com/rate_limit', {
      headers: getGithubHeaders(customToken),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch rate limits' });
  }
});

// Test token validity & user profile
app.post('/api/github/test-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const [userRes, rateRes] = await Promise.all([
      fetch('https://api.github.com/user', {
        headers: getGithubHeaders(token),
      }),
      fetch('https://api.github.com/rate_limit', {
        headers: getGithubHeaders(token),
      }),
    ]);

    if (!userRes.ok) {
      return res.status(userRes.status).json({
        valid: false,
        error: 'Invalid token or insufficient scopes',
      });
    }

    const userData = await userRes.json();
    const rateData = rateRes.ok ? await rateRes.json() : null;
    const scopesHeader = userRes.headers.get('x-oauth-scopes') || '';

    return res.json({
      valid: true,
      user: {
        login: userData.login,
        name: userData.name,
        avatar_url: userData.avatar_url,
        public_repos: userData.public_repos,
        total_private_repos: userData.total_private_repos,
      },
      scopes: scopesHeader.split(',').map((s) => s.trim()).filter(Boolean),
      rateLimit: rateData?.resources?.core || null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Token verification failed' });
  }
});

// Repository metadata
app.get('/api/github/repo', async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.query as { owner: string; repo: string };
    if (!owner || !repo) {
      return res.status(400).json({ error: 'owner and repo query params are required' });
    }

    const customToken = (req.headers['x-github-token'] as string) || null;
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers: getGithubHeaders(customToken),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      return res.status(response.status).json({ error: err.message || 'Repository not found' });
    }

    const data = await response.json();
    return res.json({
      id: data.id,
      name: data.name,
      full_name: data.full_name,
      owner: {
        login: data.owner?.login,
        avatar_url: data.owner?.avatar_url,
        html_url: data.owner?.html_url,
      },
      html_url: data.html_url,
      description: data.description,
      private: data.private,
      fork: data.fork,
      default_branch: data.default_branch,
      stargazers_count: data.stargazers_count,
      forks_count: data.forks_count,
      open_issues_count: data.open_issues_count,
      language: data.language,
      topics: data.topics || [],
      license: data.license ? { name: data.license.name, spdx_id: data.license.spdx_id } : null,
      updated_at: data.updated_at,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch repository metadata' });
  }
});

// Branches
app.get('/api/github/branches', async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.query as { owner: string; repo: string };
    if (!owner || !repo) {
      return res.status(400).json({ error: 'owner and repo required' });
    }

    const customToken = (req.headers['x-github-token'] as string) || null;
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`, {
      headers: getGithubHeaders(customToken),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch branches' });
    }

    const data = await response.json();
    return res.json(data.map((b: any) => ({ name: b.name, commit: b.commit?.sha })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list branches' });
  }
});

// Recursive Tree
app.get('/api/github/tree', async (req: Request, res: Response) => {
  try {
    const { owner, repo, ref } = req.query as { owner: string; repo: string; ref: string };
    if (!owner || !repo || !ref) {
      return res.status(400).json({ error: 'owner, repo, and ref are required' });
    }

    const customToken = (req.headers['x-github-token'] as string) || null;
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`;

    const response = await fetch(url, {
      headers: getGithubHeaders(customToken),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      return res.status(response.status).json({ error: err.message || 'Failed to fetch tree' });
    }

    const data = await response.json();
    return res.json({
      sha: data.sha,
      truncated: data.truncated,
      tree: data.tree.map((item: any) => ({
        path: item.path,
        mode: item.mode,
        type: item.type, // 'blob' or 'tree'
        sha: item.sha,
        size: item.size || 0,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch git tree' });
  }
});

// File Content
app.get('/api/github/content', async (req: Request, res: Response) => {
  try {
    const { owner, repo, path: filePath, ref } = req.query as {
      owner: string;
      repo: string;
      path: string;
      ref?: string;
    };

    if (!owner || !repo || !filePath) {
      return res.status(400).json({ error: 'owner, repo, and path are required' });
    }

    const customToken = (req.headers['x-github-token'] as string) || null;
    const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}${refParam}`;

    const response = await fetch(url, {
      headers: getGithubHeaders(customToken),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      return res.status(response.status).json({ error: err.message || 'Failed to fetch file content' });
    }

    const data = await response.json();

    // If it's a file
    if (data.type === 'file') {
      let content = '';
      if (data.encoding === 'base64' && data.content) {
        content = Buffer.from(data.content, 'base64').toString('utf-8');
      } else if (data.download_url) {
        // Fallback to download URL if too large for contents API
        const rawRes = await fetch(data.download_url, {
          headers: getGithubHeaders(customToken),
        });
        content = await rawRes.text();
      }

      return res.json({
        name: data.name,
        path: data.path,
        sha: data.sha,
        size: data.size,
        download_url: data.download_url,
        content,
      });
    }

    return res.status(400).json({ error: 'Specified path is not a file' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch content' });
  }
});

// ----------------- Gemini AI Endpoints -----------------

// Explain File
app.post('/api/ai/explain-file', async (req: Request, res: Response) => {
  try {
    const { filename, path: filePath, code, repoName, language } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code content is required' });
    }

    // Limit code payload to reasonable token limit (~30,000 characters)
    const truncatedCode = code.length > 30000 ? code.slice(0, 30000) + '\n\n// ... [Truncated for analysis]' : code;

    const prompt = `You are a principal software engineer and expert code reviewer.
Analyze this code file from repository "${repoName || 'Unknown Repo'}".
File path: "${filePath || filename}"
Language: "${language || 'plaintext'}"

\`\`\`${language || ''}
${truncatedCode}
\`\`\`

Provide a deep, clear, and highly useful engineering breakdown formatted as valid JSON adhering to this schema.`;

    const response = await getAiClient().models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You analyze source code with extreme clarity, precision, and architectural insight. Always output strict JSON matching the requested schema. No markdown wrapping outside the JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'Concise 2-3 sentence overview of what this file does, its core responsibility, and how it is consumed.',
            },
            architectureRole: {
              type: Type.STRING,
              description: 'Explanation of where this file sits in the overall project architecture (e.g. controller, utility, hook, configuration, data layer).',
            },
            keyComponents: {
              type: Type.ARRAY,
              description: 'List of primary functions, classes, interfaces, or exports.',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, description: 'function, class, hook, interface, constant, or type' },
                  lineRange: { type: Type.STRING, description: 'Approximate lines, e.g. L12-L34' },
                  purpose: { type: Type.STRING, description: 'What this component accomplishes' },
                },
                required: ['name', 'type', 'purpose'],
              },
            },
            algorithmicComplexity: {
              type: Type.STRING,
              description: 'Time/space complexity analysis or performance characteristics of key algorithms or workflows in this file.',
            },
            keyDependencies: {
              type: Type.ARRAY,
              description: 'Notable external or internal imports and what they are used for.',
              items: {
                type: Type.OBJECT,
                properties: {
                  module: { type: Type.STRING },
                  usage: { type: Type.STRING },
                },
                required: ['module', 'usage'],
              },
            },
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-4 practical engineering observations, potential edge cases, or notable design patterns in this code.',
            },
          },
          required: ['summary', 'architectureRole', 'keyComponents', 'algorithmicComplexity', 'keyDependencies', 'insights'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('AI explanation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate file explanation' });
  }
});

// Repository Architecture Map
app.post('/api/ai/architecture', async (req: Request, res: Response) => {
  try {
    const { repoName, description, filePaths, packageManifest } = req.body;

    if (!filePaths || !Array.isArray(filePaths)) {
      return res.status(400).json({ error: 'filePaths array is required' });
    }

    // Sample top ~150 informative files (filter out large test fixtures/artifacts)
    const sampleFiles = filePaths
      .filter((p: string) => !p.includes('/node_modules/') && !p.includes('/dist/') && !p.includes('/.git/'))
      .slice(0, 160);

    const prompt = `Analyze this GitHub repository structure:
Repository: ${repoName}
Description: ${description || 'None provided'}
Package Manifest / Config: ${packageManifest ? JSON.stringify(packageManifest).slice(0, 1500) : 'None'}

Sample files (${sampleFiles.length} files):
${sampleFiles.join('\n')}

Provide an architectural blueprint, tech stack breakdown, and topology map for this repository.`;

    const response = await getAiClient().models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an enterprise software architect analyzing repository topologies. Output structured JSON adhering strictly to the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: {
              type: Type.STRING,
              description: 'Comprehensive high-level summary of the repository architecture and purpose.',
            },
            techStack: {
              type: Type.ARRAY,
              description: 'Detected technologies, libraries, and frameworks.',
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: 'e.g. Frontend, Backend, Database, Build Tool, Testing, CI/CD' },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['category', 'name', 'description'],
              },
            },
            keyEntryPoints: {
              type: Type.ARRAY,
              description: 'Primary entry points into the codebase.',
              items: {
                type: Type.OBJECT,
                properties: {
                  path: { type: Type.STRING },
                  role: { type: Type.STRING },
                },
                required: ['path', 'role'],
              },
            },
            subsystems: {
              type: Type.ARRAY,
              description: 'Major subsystems or directory domains.',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  directory: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['name', 'directory', 'description'],
              },
            },
            asciiDiagram: {
              type: Type.STRING,
              description: 'Clean ASCII box diagram showing how the subsystems communicate and relate.',
            },
          },
          required: ['overview', 'techStack', 'keyEntryPoints', 'subsystems', 'asciiDiagram'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Architecture error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate architecture map' });
  }
});

// Interactive Q&A on Code
app.post('/api/ai/ask-question', async (req: Request, res: Response) => {
  try {
    const { repoName, filePath, code, question, history } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const truncatedCode = code && code.length > 25000 ? code.slice(0, 25000) + '\n\n// ... [Truncated]' : code || '';

    let prompt = `You are an expert AI code companion embedded inside the OctoView GitHub Explorer.
Repository: ${repoName || 'Current Repo'}
Active File: ${filePath || 'None selected'}

${truncatedCode ? `Current File Code:\n\`\`\`\n${truncatedCode}\n\`\`\`\n` : ''}

User Question: ${question}

Provide a direct, accurate, and insightful response. Reference specific line numbers or patterns if relevant. Keep code snippets concise and formatted.`;

    // Incorporate recent chat history if available
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const turn of history.slice(-6)) {
        contents.push({
          role: turn.role === 'model' ? 'model' : 'user',
          parts: [{ text: turn.text }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const response = await getAiClient().models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: 'You are a senior staff engineer answering code questions inside a developer IDE. Answer directly with high technical rigor, referencing file symbols, error handling, performance implications, and concrete examples.',
      },
    });

    return res.json({ answer: response.text });
  } catch (err: any) {
    console.error('Ask question error:', err);
    return res.status(500).json({ error: err.message || 'Failed to answer code question' });
  }
});

// ----------------- Vite Integration & Server Startup -----------------

async function startServer() {
  let viteServer: { close: () => Promise<void> } | null = null;

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(disableHmr ? { hmr: false, ws: false, watch: null } : {}),
      },
      appType: 'spa',
    });
    viteServer = vite;
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, HOST, () => {
    console.log(`OctoView server running at http://${HOST}:${PORT}`);
  });

  httpServer.on('error', (err: Error) => {
    console.error('Failed to start HTTP server:', err);
    process.exit(1);
  });

  const shutdown = async () => {
    httpServer.close();
    if (viteServer) {
      await viteServer.close().catch(() => {});
    }
    process.exit(0);
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
