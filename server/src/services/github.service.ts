import axios from 'axios';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  language: string | null;
  private: boolean;
}

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

const GITHUB_API = 'https://api.github.com';

function getHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json'
  };
}

export const githubService = {
  async getUserRepos(accessToken: string): Promise<GitHubRepo[]> {
    const response = await axios.get<GitHubRepo[]>(`${GITHUB_API}/user/repos`, {
      headers: getHeaders(accessToken),
      params: { sort: 'updated', per_page: 100 }
    });
    return response.data;
  },

  async getRepoInfo(fullName: string, accessToken: string): Promise<GitHubRepo> {
    const response = await axios.get<GitHubRepo>(
      `${GITHUB_API}/repos/${fullName}`,
      { headers: getHeaders(accessToken) }
    );
    return response.data;
  },

  parseRepoUrl(url: string): string | null {
    const match = url.match(/github\.com\/([^\/]+\/[^\/]+?)(?:\.git)?(?:\/.*)?$/);
    return match ? match[1] : null;
  },

  async getRepoTree(fullName: string, accessToken: string, branch: string): Promise<GitHubTree> {
    const response = await axios.get<GitHubTree>(
      `${GITHUB_API}/repos/${fullName}/git/trees/${branch}?recursive=1`,
      { headers: getHeaders(accessToken) }
    );
    return response.data;
  },

  async getFileContent(fullName: string, path: string, accessToken: string): Promise<string> {
    try {
      const response = await axios.get(
        `${GITHUB_API}/repos/${fullName}/contents/${path}`,
        { headers: getHeaders(accessToken) }
      );
      
      if (response.data.encoding === 'base64') {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }
      return response.data.content;
    } catch {
      return '';
    }
  },

  async getLanguages(fullName: string, accessToken: string): Promise<Record<string, number>> {
    const response = await axios.get<Record<string, number>>(
      `${GITHUB_API}/repos/${fullName}/languages`,
      { headers: getHeaders(accessToken) }
    );
    return response.data;
  }
};

export default githubService;
