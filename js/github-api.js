// github-api.js - Client-side GitHub API integration

class GitHubAPI {
    constructor() {
        this.baseUrl = 'https://api.github.com';
        this.token = null; // Optional: for higher rate limits
        this.cache = new Map();
    }

    setToken(token) {
        this.token = token;
    }

    async fetch(url, options = {}) {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
        }

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`GitHub API Error: ${error.message}`);
        }

        return response.json();
    }

    parseRepoUrl(url) {
        // Support various GitHub URL formats
        const patterns = [
            /github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/,
            /github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return {
                    owner: match[1],
                    repo: match[2].replace('.git', ''),
                    branch: match[3] || null
                };
            }
        }

        // Try simple owner/repo format
        const simple = url.match(/^([^\/]+)\/([^\/]+)$/);
        if (simple) {
            return { owner: simple[1], repo: simple[2], branch: null };
        }

        throw new Error('Invalid GitHub repository URL');
    }

    async getRepository(owner, repo) {
        const cacheKey = `repo:${owner}/${repo}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const url = `${this.baseUrl}/repos/${owner}/${repo}`;
        const data = await this.fetch(url);
        this.cache.set(cacheKey, data);
        return data;
    }

    async getBranches(owner, repo) {
        const url = `${this.baseUrl}/repos/${owner}/${repo}/branches`;
        return this.fetch(url);
    }

    async getDefaultBranch(owner, repo) {
        const repoData = await this.getRepository(owner, repo);
        return repoData.default_branch;
    }

    async getTree(owner, repo, branch = null) {
        if (!branch) {
            branch = await this.getDefaultBranch(owner, repo);
        }

        const cacheKey = `tree:${owner}/${repo}:${branch}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Get the tree recursively
        const url = `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
        const data = await this.fetch(url);
        this.cache.set(cacheKey, data);
        return data;
    }

    async getCommits(owner, repo, branch = null, limit = 50) {
        const params = new URLSearchParams({
            per_page: limit.toString(),
        });

        if (branch) {
            params.append('sha', branch);
        }

        const url = `${this.baseUrl}/repos/${owner}/${repo}/commits?${params}`;
        return this.fetch(url);
    }

    async getCommit(owner, repo, sha) {
        const cacheKey = `commit:${owner}/${repo}:${sha}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const url = `${this.baseUrl}/repos/${owner}/${repo}/commits/${sha}`;
        const data = await this.fetch(url);
        this.cache.set(cacheKey, data);
        return data;
    }

    async compareCommits(owner, repo, base, head) {
        const url = `${this.baseUrl}/repos/${owner}/${repo}/compare/${base}...${head}`;
        return this.fetch(url);
    }

    async getCommitsBetweenDates(owner, repo, startDate, endDate, branch = null) {
        const params = new URLSearchParams({
            since: new Date(startDate).toISOString(),
            until: new Date(endDate).toISOString(),
            per_page: '100'
        });

        if (branch) {
            params.append('sha', branch);
        }

        const url = `${this.baseUrl}/repos/${owner}/${repo}/commits?${params}`;
        return this.fetch(url);
    }

    // Transform GitHub tree data to our format
    buildTreeFromGitHub(githubTree, statusMap = {}) {
        const root = {
            name: 'root',
            type: 'folder',
            git_status: 'clean',
            children: [],
            value: 0
        };

        // Sort by path to ensure parents are created before children
        const items = githubTree.tree
            .filter(item => item.type === 'blob') // Only files
            .sort((a, b) => a.path.localeCompare(b.path));

        items.forEach(item => {
            const parts = item.path.split('/');
            let current = root;

            // Create/traverse folder structure
            for (let i = 0; i < parts.length - 1; i++) {
                const folderName = parts[i];
                let folder = current.children.find(c => c.name === folderName && c.type === 'folder');

                if (!folder) {
                    folder = {
                        name: folderName,
                        type: 'folder',
                        git_status: 'clean',
                        children: [],
                        value: 0
                    };
                    current.children.push(folder);
                }
                current = folder;
            }

            // Add file
            const fileName = parts[parts.length - 1];
            const status = statusMap[item.path] || 'clean';
            const size = item.size || 1;

            current.children.push({
                name: fileName,
                type: 'file',
                value: size,
                git_status: status,
                git_code: 'GH' // GitHub source
            });
        });

        // Calculate folder values recursively
        function calcValues(node) {
            if (node.type === 'file') return node.value;
            node.value = node.children.reduce((sum, c) => sum + calcValues(c), 0);
            return node.value;
        }
        calcValues(root);

        return root;
    }

    // Get file changes for a specific commit
    async getCommitChanges(owner, repo, sha) {
        const commit = await this.getCommit(owner, repo, sha);
        const statusMap = {};

        commit.files.forEach(file => {
            let status = 'clean';
            if (file.status === 'modified') status = 'modified';
            else if (file.status === 'added') status = 'created';
            else if (file.status === 'removed') status = 'deleted';
            else if (file.status === 'renamed') status = 'modified';

            statusMap[file.filename] = status;
        });

        return statusMap;
    }

    // Get file stats (additions/deletions) for a commit
    async getCommitStats(owner, repo, sha) {
        const commit = await this.getCommit(owner, repo, sha);

        return commit.files.map(file => ({
            file: file.filename,
            added: file.additions,
            removed: file.deletions,
            status: file.status
        }));
    }

    clearCache() {
        this.cache.clear();
    }
}

// Export singleton instance
window.GitHubAPI = new GitHubAPI();
