import { supabase, FileNode } from '../config/supabase';
import { githubService } from './github.service';
import { nvidiaService } from './nvidia.service';

const CODE_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
  'go', 'rs', 'rb', 'php', 'cs', 'swift', 'kt', 'scala', 'vue',
  'svelte', 'astro', 'json', 'yaml', 'yml', 'toml', 'md', 'mdx',
  'css', 'scss', 'less', 'html', 'sql', 'sh', 'bash', 'dockerfile',
  'graphql', 'gql', 'proto', 'xml'
]);

const IGNORE_PATHS = [
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  'venv', '.venv', 'vendor', 'target', '.idea', '.vscode',
  '.agent', '.github', '.husky', '.devcontainer', '.docker',
  '.cache', '.turbo', '.vercel', '.netlify', '.output',
  'coverage', '.nyc_output', '.pytest_cache', '.tox',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  '.DS_Store', 'thumbs.db',
];

const IGNORE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'avif', 'bmp',
  'mp3', 'mp4', 'wav', 'avi', 'mov', 'webm',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', 'tar', 'gz', 'rar', '7z',
  'exe', 'dll', 'so', 'dylib', 'bin',
  'map', 'min.js', 'min.css',
  'lock', 'log',
]);

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    go: 'go', rs: 'rust', rb: 'ruby', php: 'php', cs: 'csharp',
    swift: 'swift', kt: 'kotlin', scala: 'scala', vue: 'vue',
    svelte: 'svelte', json: 'json', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', mdx: 'markdown'
  };
  return langMap[ext] || ext;
}

function shouldProcessFile(path: string): boolean {
  if (IGNORE_PATHS.some(ignored => path.split('/').some(segment => segment === ignored || path.includes(ignored)))) {
    return false;
  }
  const ext = path.split('.').pop()?.toLowerCase() || '';
  if (IGNORE_EXTENSIONS.has(ext)) return false;
  return CODE_EXTENSIONS.has(ext);
}

interface TreeItem {
  path: string;
  type: string;
  size?: number;
}

interface AnalysisResult {
  languages: Record<string, number>;
  frameworks: string[];
  architecture: 'monolith' | 'microservices' | 'serverless' | 'modular' | 'mvc' | 'unknown';
  totalFiles: number;
}

interface FileNodeInsert {
  repo_id: string;
  path: string;
  name: string;
  type: 'file' | 'directory';
  language?: string | null;
  size?: number;
  content?: string | null;
  imports?: string[];
  exports?: string[];
  summary?: string | null;
  embedding?: number[] | null;
}

export const analyzerService = {
  async analyzeRepository(
    repoId: string,
    fullName: string,
    accessToken: string,
    tree: { tree: TreeItem[] }
  ): Promise<AnalysisResult> {
    // Get languages from GitHub
    const languages = await githubService.getLanguages(fullName, accessToken);

    // Detect frameworks
    const paths = tree.tree.map(t => t.path);
    const frameworks = detectFrameworks(paths);

    // Detect architecture
    const architecture = detectArchitecture(paths);

    // Process files
    const fileNodes: FileNodeInsert[] = [];
    let processedCount = 0;
    const maxFiles = 200;

    for (const item of tree.tree) {
      if (processedCount >= maxFiles) break;

      if (item.type === 'blob' && shouldProcessFile(item.path)) {
        try {
          const content = await githubService.getFileContent(fullName, item.path, accessToken);

          if (content && content.length < 50000) {
            const language = getLanguageFromPath(item.path);
            
            fileNodes.push({
              repo_id: repoId,
              path: item.path,
              name: item.path.split('/').pop() || item.path,
              type: 'file',
              language,
              size: item.size || 0,
              content: content.substring(0, 10000),
              imports: extractImports(content, language),
              exports: extractExports(content, language),
            });

            processedCount++;
          }
        } catch (error) {
          console.error(`Error fetching file ${item.path}:`, error);
        }
      }
    }

    // Insert file nodes in batches
    if (fileNodes.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < fileNodes.length; i += batchSize) {
        const batch = fileNodes.slice(i, i + batchSize);
        const { error } = await supabase.from('file_nodes').insert(batch);
        if (error) {
          console.error('Error inserting file nodes:', error);
        }
      }
    }

    // Generate summaries and embeddings
    await generateSummariesAndEmbeddings(repoId);

    return {
      languages,
      frameworks,
      architecture,
      totalFiles: fileNodes.length,
    };
  },
};

function detectFrameworks(paths: string[]): string[] {
  const frameworks: string[] = [];
  const pathSet = new Set(paths);

  if (pathSet.has('package.json')) {
    if (paths.some(p => p.includes('next.config'))) frameworks.push('nextjs');
    else if (paths.some(p => p.includes('vite.config'))) frameworks.push('vite');
    if (paths.some(p => p.endsWith('.tsx') || p.endsWith('.jsx'))) frameworks.push('react');
    if (paths.some(p => p.endsWith('.vue'))) frameworks.push('vue');
  }
  if (pathSet.has('requirements.txt') || pathSet.has('pyproject.toml')) {
    frameworks.push('python');
    if (paths.some(p => p.includes('django'))) frameworks.push('django');
    if (paths.some(p => p.includes('fastapi'))) frameworks.push('fastapi');
  }
  if (pathSet.has('go.mod')) frameworks.push('go');
  if (pathSet.has('Cargo.toml')) frameworks.push('rust');

  return frameworks;
}

function detectArchitecture(paths: string[]): 'monolith' | 'microservices' | 'serverless' | 'modular' | 'mvc' | 'unknown' {
  const hasControllers = paths.some(p => p.includes('controllers') || p.includes('handlers'));
  const hasModels = paths.some(p => p.includes('models') || p.includes('entities'));
  const hasViews = paths.some(p => p.includes('views') || p.includes('templates') || p.includes('pages'));
  const hasServices = paths.some(p => p.includes('services'));
  const hasServerless = paths.some(p => p.includes('functions') || p.includes('lambda') || p.includes('netlify'));
  const hasMultipleServices = paths.filter(p => p.match(/^services?\/[^/]+\//)).length > 3;

  if (hasServerless) return 'serverless';
  if (hasMultipleServices) return 'microservices';
  if (hasControllers && hasModels && hasViews) return 'mvc';
  if (hasServices && hasModels) return 'modular';
  return 'monolith';
}

function extractImports(content: string, language: string): string[] {
  const imports: string[] = [];

  if (['javascript', 'typescript'].includes(language)) {
    const esImports = content.match(/import\s+.*?from\s+['"](.+?)['"]/g) || [];
    esImports.forEach(imp => {
      const match = imp.match(/from\s+['"](.+?)['"]/);
      if (match) imports.push(match[1]);
    });

    const requires = content.match(/require\s*\(\s*['"](.+?)['"]\s*\)/g) || [];
    requires.forEach(req => {
      const match = req.match(/['"](.+?)['"]/);
      if (match) imports.push(match[1]);
    });
  }

  if (language === 'python') {
    const pyImports = content.match(/^(?:from\s+(\S+)\s+)?import\s+(\S+)/gm) || [];
    pyImports.forEach(imp => {
      const match = imp.match(/(?:from\s+(\S+)\s+)?import\s+(\S+)/);
      if (match) imports.push(match[1] || match[2]);
    });
  }

  return [...new Set(imports)];
}

function extractExports(content: string, language: string): string[] {
  const exports: string[] = [];

  if (['javascript', 'typescript'].includes(language)) {
    const namedExports = content.match(/export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g) || [];
    namedExports.forEach(exp => {
      const match = exp.match(/export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/);
      if (match) exports.push(match[1]);
    });

    if (content.includes('export default')) {
      exports.push('default');
    }
  }

  return [...new Set(exports)];
}

interface FileForSummary {
  id: string;
  path: string;
  language: string | null;
  content: string | null;
  imports: string[];
  exports: string[];
}

async function generateSummariesAndEmbeddings(repoId: string): Promise<void> {
  const { data: files } = await supabase
    .from('file_nodes')
    .select('id, path, language, content, imports, exports')
    .eq('repo_id', repoId)
    .eq('type', 'file')
    .limit(50)
    .returns<FileForSummary[]>();

  if (!files || files.length === 0) return;

  for (const file of files) {
    try {
      const summaryPrompt = `Summarize this code file in 2-3 sentences. Focus on what it does, not implementation details.

File: ${file.path}
Language: ${file.language}
Imports: ${(file.imports || []).slice(0, 10).join(', ')}
Exports: ${(file.exports || []).join(', ')}

Code (first 2000 chars):
${(file.content || '').substring(0, 2000)}`;

      const summary = await nvidiaService.chat([
        { role: 'system', content: 'You are a code analysis assistant. Be concise.' },
        { role: 'user', content: summaryPrompt }
      ], 150);

      const embeddingText = `${file.path}\n${file.language}\n${summary}\n${(file.exports || []).join(' ')}`;
      const embedding = await nvidiaService.generateEmbedding(embeddingText);

      await supabase
        .from('file_nodes')
        .update({ summary, embedding })
        .eq('id', file.id);

    } catch (error) {
      console.error(`Error processing file ${file.path}:`, error);
    }
  }
}

export default analyzerService;
