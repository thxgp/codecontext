import api from './api';
import { Repository, FileTreeNode, FileNode } from '../types';

export const repoService = {
  // Get all imported repos
  getRepos: async (): Promise<Repository[]> => {
    const { data } = await api.get('/repos');
    return data.repositories || [];
  },

  // Get user's GitHub repos for import
  getGitHubRepos: async () => {
    const { data } = await api.get('/repos/github');
    return data.repositories || [];
  },

  // Import a repo
  importRepo: async (repoUrl: string): Promise<Repository> => {
    const { data } = await api.post('/repos', { repoUrl });
    return data.repository;
  },

  // Import from GitHub repo id (fullName)
  importGitHubRepo: async (githubRepoId: string): Promise<Repository> => {
    const { data } = await api.post('/repos', { githubRepoId });
    return data.repository;
  },

  // Get repo details
  getRepo: async (id: string): Promise<Repository> => {
    const { data } = await api.get(`/repos/${id}`);
    return data.repository;
  },

  // Get file structure
  getStructure: async (repoId: string): Promise<FileTreeNode> => {
    const { data } = await api.get(`/repos/${repoId}/structure`);
    return data.structure;
  },

  // Get file content
  getFile: async (repoId: string, filePath: string): Promise<FileNode> => {
    const { data } = await api.get(`/repos/${repoId}/files/${filePath}`);
    return data.file;
  },

  // Delete repo
  deleteRepo: async (id: string): Promise<void> => {
    await api.delete(`/repos/${id}`);
  },

  // Refresh/re-analyze repo
  refreshRepo: async (id: string): Promise<Repository> => {
    const { data } = await api.post(`/repos/${id}/refresh`);
    return data.repo;
  }
};
