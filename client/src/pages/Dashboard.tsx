import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ExternalLink, Trash2 } from 'lucide-react';
import { useRepoStore } from '../stores/repoStore';
import { Button, Input, StatusBadge, CursorGlow } from '../components/ui';

export default function Dashboard() {
  const navigate = useNavigate();
  const { repos, isLoading, fetchRepos, importRepo, deleteRepo } = useRepoStore();
  const [showImport, setShowImport] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setImporting(true);
    setError('');

    try {
      const repo = await importRepo(repoUrl);
      setRepoUrl('');
      setShowImport(false);
      navigate(`/repo/${repo.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import repository');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete ${name}? This cannot be undone.`)) {
      await deleteRepo(id);
    }
  };

  return (
    <div className="warm-filter h-full w-full dark:bg-dark-900 bg-light-50 overflow-y-auto">
    <div className="max-w-6xl mx-auto px-6 py-8">
      <CursorGlow />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-light-900">Your Repositories</h1>
          <p className="dark:text-dark-400 text-light-500 mt-1">Import and explore codebases</p>
        </div>
        <Button onClick={() => setShowImport(!showImport)}>
          <Plus className="w-5 h-5 mr-2" />
          Import Repository
        </Button>
      </div>

      {/* Import form */}
      {showImport && (
        <div className="dark:bg-dark-800 bg-white rounded-xl p-6 mb-8 dark:border-neon-cyan/10 border-light-200 border">
          <h2 className="text-lg font-semibold mb-4 dark:text-white text-light-900">Import a Repository</h2>
          <form onSubmit={handleImport} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                error={error}
              />
            </div>
            <Button type="submit" isLoading={importing}>
              Import
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowImport(false)}>
              Cancel
            </Button>
          </form>
        </div>
      )}

      {/* Repos list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 dark:border-neon-cyan border-light-600 border-t-transparent rounded-full" />
        </div>
      ) : repos.length === 0 ? (
        <div className="text-center py-20 dark:bg-dark-800 bg-white rounded-xl dark:border-neon-cyan/10 border-light-200 border">
          <p className="text-xl dark:text-dark-300 text-light-600 mb-4">No repositories yet</p>
          <p className="dark:text-dark-400 text-light-500 mb-6">Import your first repository to get started</p>
          <Button onClick={() => setShowImport(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Import Repository
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="dark:bg-dark-800 bg-white rounded-xl p-6 dark:hover:bg-dark-750 hover:bg-light-50 transition-colors dark:border-neon-cyan/5 border-light-200 border dark:hover:border-neon-cyan/20 hover:border-light-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => navigate(`/repo/${repo.id}`)}
                      className="text-xl font-semibold dark:hover:text-neon-cyan hover:text-light-700 transition-colors dark:text-white text-light-900"
                    >
                      {repo.full_name}
                    </button>
                    <StatusBadge status={repo.status} />
                  </div>
                  
                  {repo.description && (
                    <p className="dark:text-dark-300 text-light-500 mb-3">{repo.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm dark:text-dark-400 text-light-500">
                    {(repo.frameworks || []).length > 0 && (
                      <span className="flex items-center gap-1">
                        {(repo.frameworks || []).slice(0, 3).map((f, i) => (
                          <span key={i} className="dark:bg-neon-cyan/10 bg-light-200 dark:text-neon-cyan text-light-700 px-2 py-0.5 rounded text-xs font-medium">{f}</span>
                        ))}
                      </span>
                    )}
                    <span>{repo.total_files} files</span>
                    {repo.last_analyzed && (
                      <span>Analyzed {new Date(repo.last_analyzed).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 dark:text-dark-400 text-light-500 dark:hover:text-white hover:text-light-800 dark:hover:bg-dark-700 hover:bg-light-200 rounded-lg transition-colors"
                    title="View on GitHub"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <button
                    onClick={() => handleDelete(repo.id, repo.full_name)}
                    className="p-2 dark:text-dark-400 text-light-500 hover:text-red-400 dark:hover:bg-dark-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
