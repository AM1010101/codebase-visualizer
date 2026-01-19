// github-adapter.js - Adapter to use GitHub API with existing codebase visualizer

import { getGitHubRepoInfo } from './state.js';

/**
 * Fetch data from GitHub API (mirrors the local /api/data endpoint)
 */
export async function fetchGitHubData(params = {}) {
    const repoInfo = getGitHubRepoInfo();
    if (!repoInfo) {
        throw new Error('No GitHub repository configured');
    }

    const { owner, repo, branch } = repoInfo;
    const api = window.GitHubAPI;

    try {
        // Get the tree for the specified branch
        const tree = await api.getTree(owner, repo, branch || null);

        // Build the tree structure
        const builtTree = api.buildTreeFromGitHub(tree);

        return builtTree;
    } catch (error) {
        console.error('Error fetching GitHub data:', error);
        throw error;
    }
}

/**
 * Fetch commits from GitHub (mirrors the local /api/commits endpoint)
 */
export async function fetchGitHubCommits() {
    const repoInfo = getGitHubRepoInfo();
    if (!repoInfo) {
        throw new Error('No GitHub repository configured');
    }

    const { owner, repo, branch } = repoInfo;
    const api = window.GitHubAPI;

    try {
        const commits = await api.getCommits(owner, repo, branch || null, 50);

        // Transform to match local format
        return commits.map(commit => ({
            hash: commit.sha.substring(0, 7),
            msg: commit.commit.message.split('\n')[0], // First line only
            author: commit.commit.author.name,
            date: commit.commit.author.date
        }));
    } catch (error) {
        console.error('Error fetching GitHub commits:', error);
        throw error;
    }
}

/**
 * Fetch file stats from GitHub (mirrors the local /api/file-stats endpoint)
 */
export async function fetchGitHubFileStats(params = {}) {
    const repoInfo = getGitHubRepoInfo();
    if (!repoInfo) {
        throw new Error('No GitHub repository configured');
    }

    const { owner, repo } = repoInfo;
    const api = window.GitHubAPI;
    const { commit } = params;

    try {
        if (!commit || commit === 'latest') {
            // For latest, we'd need to get the default branch's latest commit
            const commits = await api.getCommits(owner, repo, null, 1);
            const latestSha = commits[0].sha;
            return await api.getCommitStats(owner, repo, latestSha);
        } else {
            return await api.getCommitStats(owner, repo, commit);
        }
    } catch (error) {
        console.error('Error fetching GitHub file stats:', error);
        throw error;
    }
}

/**
 * Fetch data for a specific commit from GitHub
 */
export async function fetchGitHubCommitData(commitHash, baseHash = null) {
    const repoInfo = getGitHubRepoInfo();
    if (!repoInfo) {
        throw new Error('No GitHub repository configured');
    }

    const { owner, repo } = repoInfo;
    const api = window.GitHubAPI;

    try {
        // Get the commit to find the tree
        const commit = await api.getCommit(owner, repo, commitHash);
        const treeSha = commit.commit.tree.sha;

        // Get the full tree at this commit
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`;
        const treeData = await api.fetch(treeUrl);

        // Get the changes for this commit
        const statusMap = await api.getCommitChanges(owner, repo, commitHash);

        // Build tree with status
        const tree = api.buildTreeFromGitHub(treeData, statusMap);

        return tree;
    } catch (error) {
        console.error('Error fetching GitHub commit data:', error);
        throw error;
    }
}

/**
 * Load available branches for the current GitHub repo
 */
export async function loadGitHubBranches() {
    const repoInfo = getGitHubRepoInfo();
    if (!repoInfo) {
        throw new Error('No GitHub repository configured');
    }

    const { owner, repo } = repoInfo;
    const api = window.GitHubAPI;

    try {
        const branches = await api.getBranches(owner, repo);
        return branches.map(b => b.name);
    } catch (error) {
        console.error('Error loading GitHub branches:', error);
        throw error;
    }
}
