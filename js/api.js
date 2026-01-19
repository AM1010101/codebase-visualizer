/**
 * API communication with the backend server or GitHub API
 */

import { setAllCommits, setRawData, getEffectiveTarget, getEffectiveBase, getIgnoreList, getSourceMode } from './state.js';
import { fetchGitHubCommits, fetchGitHubData, fetchGitHubFileStats } from './github-adapter.js';

/**
 * Fetch commit history from the server
 */
export async function fetchCommits() {
    const sourceMode = getSourceMode();

    try {
        let commits;

        if (sourceMode === 'github') {
            commits = await fetchGitHubCommits();
        } else {
            const res = await fetch('/api/commits');
            commits = await res.json();
        }

        setAllCommits(commits);

        const select = document.getElementById('commitSelect');
        const baseSelect = document.getElementById('baseCommitSelect');

        // Clear existing options
        select.innerHTML = '';
        baseSelect.innerHTML = '<option value="none">--- Select Base ---</option>';

        commits.forEach((c, idx) => {
            const opt = document.createElement('option');
            opt.value = c.hash;
            opt.innerText = `${c.hash} - ${c.msg}`;
            opt.dataset.author = c.author;
            opt.dataset.date = c.date;
            opt.dataset.msg = c.msg;

            if (idx === 0) {
                const liveOpt = document.createElement('option');
                liveOpt.value = 'latest';
                liveOpt.innerText = 'Latest (Live)';
                select.appendChild(liveOpt);
            }

            select.appendChild(opt);

            const optBase = opt.cloneNode(true);
            baseSelect.appendChild(optBase);
        });

        // Set default dates based on last 50 commits
        if (commits.length > 0) {
            const latestDate = new Date(commits[0].date).toISOString().split('T')[0];
            const oldestDate = new Date(commits[commits.length - 1].date).toISOString().split('T')[0];
            document.getElementById('startDate').value = oldestDate;
            document.getElementById('endDate').value = latestDate;
        }
    } catch (e) {
        console.error("Failed to load commits", e);
    }
}

/**
 * Fetch activity data from the server
 */
export async function fetchActivityData(days = 30) {
    try {
        const res = await fetch(`/api/activity?days=${days}`);
        const activityMap = await res.json();
        return activityMap;
    } catch (e) {
        console.error("Failed to load activity data", e);
        return {};
    }
}

/**
 * Fetch codebase data from the server
 */
export async function fetchData() {
    const sourceMode = getSourceMode();
    const effectiveTarget = getEffectiveTarget();
    const effectiveBase = getEffectiveBase();
    const ignoreList = getIgnoreList();

    if (!effectiveTarget) return;

    let url;
    let isDiff = false;

    // Check if this is a date range query
    if (effectiveTarget.startsWith('dateRange:')) {
        const parts = effectiveTarget.split(':');
        const startDate = parts[1];
        const endDate = parts[2];
        url = `/api/data?startDate=${startDate}&endDate=${endDate}`;
        isDiff = true; // Show as diff mode for UI purposes
    } else {
        url = `/api/data?commit=${effectiveTarget}`;
        isDiff = effectiveBase && effectiveBase !== 'none';
        if (isDiff) {
            url += `&base=${effectiveBase}`;
        }
    }

    const container = document.getElementById("canvas");
    if (!container) return;

    // Remove any existing loading overlay
    const existingLoading = container.querySelector('.loading-overlay');
    if (existingLoading) existingLoading.remove();

    // Create loading overlay (doesn't clear the SVG)
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = `<div class="loading">${isDiff ? 'Calculating differences...' : 'Scanning codebase...'}</div>`;
    container.appendChild(loading);

    try {
        let data;

        if (sourceMode === 'github') {
            // Use GitHub API
            data = await fetchGitHubData({ commit: effectiveTarget, base: effectiveBase });
        } else {
            // Send ignore list via POST request to local server
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ignoreList })
            });
            data = await res.json();
        }

        setRawData(data);

        // Remove loading overlay
        const loadingOverlay = container.querySelector('.loading-overlay');
        if (loadingOverlay) loadingOverlay.remove();

        // Return data so caller can trigger render
        return data;
    } catch (e) {
        const loadingOverlay = container.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = '<div class="loading">Error fetching data. Is server.js running?</div>';
        }
        console.error(e);
        throw e;
    }
}
