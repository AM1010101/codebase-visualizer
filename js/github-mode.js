// github-mode.js - GitHub mode UI functions

import { setSourceMode as setSourceModeState, setGitHubRepoInfo, getSourceMode } from './state.js';
import { fetchGitHubCommits, loadGitHubBranches } from './github-adapter.js';
import { fetchData } from './api.js';
import { render } from './render.js';
import { fetchCommits } from './api.js';
import { populateAuthorFilter } from './ui.js';
import { setAllCommits } from './state.js';

/**
 * Switch between local and GitHub source modes
 */
export async function setSourceMode(mode) {
    setSourceModeState(mode);

    // Update UI
    document.getElementById('modeLocal').classList.toggle('active', mode === 'local');
    document.getElementById('modeGitHub').classList.toggle('active', mode === 'github');
    document.getElementById('githubInputs').classList.toggle('hidden', mode === 'local');
    document.getElementById('localStatus').classList.toggle('hidden', mode === 'github');

    if (mode === 'local') {
        // Reload local data
        await fetchCommits();
        populateAuthorFilter();
        await fetchData();
        render();
    }
}

/**
 * Load a GitHub repository
 */
export async function loadGitHubRepo() {
    const urlInput = document.getElementById('githubRepoUrl');
    const branchSelect = document.getElementById('githubBranchSelect');
    const statusDiv = document.getElementById('githubStatus');

    const url = urlInput.value.trim();
    if (!url) {
        statusDiv.textContent = 'Please enter a repository URL';
        statusDiv.style.color = '#ef4444';
        return;
    }

    try {
        statusDiv.textContent = 'Loading repository...';
        statusDiv.style.color = '#6366f1';

        // Parse the URL
        const api = window.GitHubAPI;
        const parsed = api.parseRepoUrl(url);

        // Get repository info
        const repoData = await api.getRepository(parsed.owner, parsed.repo);

        // Set the repo info
        const branch = branchSelect.value || repoData.default_branch;
        setGitHubRepoInfo({
            owner: parsed.owner,
            repo: parsed.repo,
            branch: branch
        });

        // Load branches
        const branches = await loadGitHubBranches();
        branchSelect.innerHTML = branches.map(b =>
            `<option value="${b}" ${b === branch ? 'selected' : ''}>${b}</option>`
        ).join('');

        // Load commits
        const commits = await fetchGitHubCommits();
        setAllCommits(commits);

        // Update commit dropdown
        const commitSelect = document.getElementById('commitSelect');
        commitSelect.innerHTML = '<option value="latest">Latest</option>' +
            commits.map(c => `<option value="${c.hash}">${c.hash} - ${c.msg}</option>`).join('');

        // Populate author filter
        populateAuthorFilter();

        // Load data
        await fetchData();
        render();

        statusDiv.textContent = `Loaded: ${parsed.owner}/${parsed.repo} (${branch})`;
        statusDiv.style.color = '#10b981';
    } catch (error) {
        console.error('Error loading GitHub repo:', error);
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.style.color = '#ef4444';
    }
}

/**
 * Change the selected GitHub branch
 */
export async function changeGitHubBranch() {
    const repoInfo = getGitHubRepoInfo();
    if (!repoInfo) return;

    const branchSelect = document.getElementById('githubBranchSelect');
    const newBranch = branchSelect.value;

    setGitHubRepoInfo({
        ...repoInfo,
        branch: newBranch
    });

    // Reload data for new branch
    await loadGitHubRepo();
}
