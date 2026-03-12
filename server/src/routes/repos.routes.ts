import { Router, Request, Response } from 'express';
import { supabase, Repository, FileNode, User } from '../config/supabase';
import { authMiddleware } from '../middleware';
import { githubService, analyzerService } from '../services';

const router = Router();

// Get all repositories for user
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data: repos, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })
      .returns<Repository[]>();

    if (error) throw error;

    res.json({ repositories: repos || [] });
  } catch (error) {
    console.error('Get repositories error:', error);
    res.status(500).json({ error: 'Failed to get repositories' });
  }
});

// Get repositories from GitHub
router.get('/github', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('access_token')
      .eq('id', req.userId!)
      .single<Pick<User, 'access_token'>>();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const repos = await githubService.getUserRepos(user.access_token);
    res.json({ repositories: repos });
  } catch (error) {
    console.error('Get GitHub repositories error:', error);
    res.status(500).json({ error: 'Failed to get GitHub repositories' });
  }
});

// Import a repository
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    let { repoUrl, githubRepoId, name, fullName, description, defaultBranch } = req.body;

    // Get user's access token first (needed for GitHub API)
    const { data: user } = await supabase
      .from('users')
      .select('access_token')
      .eq('id', req.userId!)
      .single<Pick<User, 'access_token'>>();

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // If only URL provided, parse it and fetch repo info from GitHub
    if (repoUrl && !fullName) {
      const parsed = githubService.parseRepoUrl(repoUrl);
      if (!parsed) {
        return res.status(400).json({ error: 'Invalid GitHub repository URL' });
      }

      try {
        const repoInfo = await githubService.getRepoInfo(parsed, user.access_token);
        fullName = repoInfo.full_name;
        name = repoInfo.name;
        githubRepoId = String(repoInfo.id);
        description = repoInfo.description;
        defaultBranch = repoInfo.default_branch;
        repoUrl = repoInfo.html_url;
      } catch {
        return res.status(404).json({ error: 'Repository not found on GitHub' });
      }
    }

    if (!fullName) {
      return res.status(400).json({ error: 'Repository URL or full name is required' });
    }

    // Check if already imported
    const { data: existing } = await supabase
      .from('repositories')
      .select('id')
      .eq('user_id', req.userId!)
      .eq('full_name', fullName)
      .single<Pick<Repository, 'id'>>();

    if (existing) {
      return res.status(400).json({ error: 'Repository already imported' });
    }

    // Create repository record
    const { data: repo, error } = await supabase
      .from('repositories')
      .insert({
        user_id: req.userId!,
        github_repo_id: String(githubRepoId),
        name,
        full_name: fullName,
        description: description || null,
        url: repoUrl,
        default_branch: defaultBranch || 'main',
        status: 'processing',
      })
      .select()
      .single<Repository>();

    if (error || !repo) {
      throw new Error('Failed to create repository');
    }

    // Start analysis in background
    analyzeRepository(repo.id, fullName, user.access_token, defaultBranch || 'main');

    res.status(201).json({ repository: repo });
  } catch (error) {
    console.error('Import repository error:', error);
    res.status(500).json({ error: 'Failed to import repository' });
  }
});

// Background analysis function
async function analyzeRepository(repoId: string, fullName: string, accessToken: string, branch: string) {
  try {
    // Get file tree from GitHub
    const tree = await githubService.getRepoTree(fullName, accessToken, branch);
    
    // Analyze the repository
    const analysis = await analyzerService.analyzeRepository(repoId, fullName, accessToken, tree);

    // Update repository with analysis results
    await supabase
      .from('repositories')
      .update({
        languages: analysis.languages,
        frameworks: analysis.frameworks,
        architecture: analysis.architecture,
        total_files: analysis.totalFiles,
        last_analyzed: new Date().toISOString(),
        status: 'ready',
      })
      .eq('id', repoId);

  } catch (error) {
    console.error('Repository analysis error:', error);
    await supabase
      .from('repositories')
      .update({ status: 'failed' })
      .eq('id', repoId);
  }
}

// Get single repository
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data: repo, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single<Repository>();

    if (error || !repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    res.json({ repository: repo });
  } catch (error) {
    console.error('Get repository error:', error);
    res.status(500).json({ error: 'Failed to get repository' });
  }
});

// Get repository file structure
router.get('/:id/structure', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data: repo } = await supabase
      .from('repositories')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single<Pick<Repository, 'id'>>();

    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const { data: files, error } = await supabase
      .from('file_nodes')
      .select('id, path, name, type, language, size')
      .eq('repo_id', req.params.id)
      .order('path')
      .returns<Pick<FileNode, 'id' | 'path' | 'name' | 'type' | 'language' | 'size'>[]>();

    if (error) throw error;

    // Build tree structure
    const tree = buildFileTree(files || []);
    res.json({ structure: tree });
  } catch (error) {
    console.error('Get structure error:', error);
    res.status(500).json({ error: 'Failed to get file structure' });
  }
});

// Helper to build tree from flat file list
interface FileTreeItem {
  id?: string;
  name: string;
  type: string;
  path: string;
  language?: string | null;
  size?: number;
  children?: FileTreeItem[];
}

function buildFileTree(files: Pick<FileNode, 'id' | 'path' | 'name' | 'type' | 'language' | 'size'>[]): FileTreeItem[] {
  const root: FileTreeItem = { name: 'root', type: 'directory', path: '', children: [] };
  
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let current = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      
      let child = current.children?.find((c) => c.name === part);
      
      if (!child) {
        child = isLast
          ? { ...file, children: file.type === 'directory' ? [] : undefined }
          : { name: part, type: 'directory', path: parts.slice(0, i + 1).join('/'), children: [] };
        current.children = current.children || [];
        current.children.push(child);
      }
      
      current = child;
    }
  }
  
  return root.children || [];
}

// Get file content
router.get('/:id/files/*', authMiddleware, async (req: Request, res: Response) => {
  try {
    const filePath = req.params[0];

    const { data: repo } = await supabase
      .from('repositories')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single<Pick<Repository, 'id'>>();

    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const { data: file, error } = await supabase
      .from('file_nodes')
      .select('*')
      .eq('repo_id', req.params.id)
      .eq('path', filePath)
      .single<FileNode>();

    if (error || !file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ file });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// Delete repository
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data: repo } = await supabase
      .from('repositories')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single<Pick<Repository, 'id'>>();

    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Delete repository (cascades to file_nodes and chat_histories)
    const { error } = await supabase
      .from('repositories')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Repository deleted' });
  } catch (error) {
    console.error('Delete repository error:', error);
    res.status(500).json({ error: 'Failed to delete repository' });
  }
});

// Refresh repository analysis
router.post('/:id/refresh', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data: repo } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single<Repository>();

    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Get user's access token
    const { data: user } = await supabase
      .from('users')
      .select('access_token')
      .eq('id', req.userId!)
      .single<Pick<User, 'access_token'>>();

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Update status to processing
    await supabase
      .from('repositories')
      .update({ status: 'processing' })
      .eq('id', req.params.id);

    // Delete existing file nodes
    await supabase
      .from('file_nodes')
      .delete()
      .eq('repo_id', req.params.id);

    // Start re-analysis
    analyzeRepository(repo.id, repo.full_name, user.access_token, repo.default_branch);

    res.json({ message: 'Refresh started' });
  } catch (error) {
    console.error('Refresh repository error:', error);
    res.status(500).json({ error: 'Failed to refresh repository' });
  }
});

export default router;
