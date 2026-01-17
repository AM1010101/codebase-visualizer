/**
 * UI controls and interactions
 */

import {
    getCurrentViewMode,
    setCurrentViewMode,
    getCollapsedFolders,
    addCollapsedFolder,
    removeCollapsedFolder,
    clearCollapsedFolders,
    getIgnoreList,
    addToIgnoreList as addToIgnoreListState,
    removeFromIgnoreList,
    resetIgnoreList as resetIgnoreListState,
    getSelectedAuthor,
    setSelectedAuthor,
    getAllAuthors,
    setAllAuthors,
    getAllCommits
} from './state.js';
import { render } from './render.js';
import { changeCommit } from './navigation.js';
import { fetchData } from './api.js';

/**
 * Toggle between git status and age color modes
 */
export function toggleColorMode() {
    const colorModeGroup = document.querySelector('input[name="colorMode"]:checked');
    if (!colorModeGroup) return;

    const colorMode = colorModeGroup.value;
    const ageContainer = document.getElementById('ageThresholdContainer');
    const activityContainer = document.getElementById('activityThresholdContainer');

    if (ageContainer) {
        ageContainer.classList.toggle('active', colorMode === 'age');
    }
    if (activityContainer) {
        activityContainer.classList.toggle('active', colorMode === 'activity');
    }
    render();
}

/**
 * Update age threshold slider value
 */
export function updateAgeThreshold(val) {
    const valSpan = document.getElementById('ageThresholdValue');
    if (valSpan) valSpan.innerText = val;
    render();
}

/**
 * Update activity threshold slider value
 */
export function updateActivityThreshold(val) {
    const valSpan = document.getElementById('activityThresholdValue');
    if (valSpan) valSpan.innerText = val;
    render();
}

/**
 * Set view mode (single, diff, or range)
 */
export function setViewMode(mode) {
    setCurrentViewMode(mode);

    const singleBtn = document.getElementById('viewModeSingle');
    const diffBtn = document.getElementById('viewModeDiff');
    const rangeBtn = document.getElementById('viewModeRange');

    const targetGroup = document.getElementById('targetCommitGroup');
    const baseGroup = document.getElementById('baseCommitGroup');
    const rangeInputs = document.getElementById('rangeInputs');
    const sublabel = document.getElementById('timeline-sublabel');

    // Remove active class from all buttons
    [singleBtn, diffBtn, rangeBtn].forEach(btn => {
        if (btn) {
            btn.classList.remove('active');
        }
    });

    // Add active class to the selected button
    const activeBtn = document.getElementById(`viewMode${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    if (mode === 'single') {
        if (targetGroup) targetGroup.classList.remove('hidden');
        if (baseGroup) baseGroup.classList.add('hidden');
        if (rangeInputs) rangeInputs.classList.remove('active');
        if (sublabel) sublabel.classList.remove('active');
    } else if (mode === 'diff') {
        if (targetGroup) targetGroup.classList.remove('hidden');
        if (baseGroup) baseGroup.classList.remove('hidden');
        if (rangeInputs) rangeInputs.classList.remove('active');
        if (sublabel) sublabel.classList.add('active');

        const baseSelect = document.getElementById('baseCommitSelect');
        if (baseSelect && baseSelect.value === 'none' && baseSelect.options.length > 2) {
            baseSelect.selectedIndex = 2;
        }
    } else if (mode === 'range') {
        if (targetGroup) targetGroup.classList.add('hidden');
        if (baseGroup) baseGroup.classList.add('hidden');
        if (rangeInputs) rangeInputs.classList.add('active');
        if (sublabel) sublabel.classList.add('active');
    }
    changeCommit();
}

/**
 * Toggle folder collapse state
 */
export function toggleCollapse(path) {
    const collapsedFolders = getCollapsedFolders();

    if (collapsedFolders.has(path)) {
        removeCollapsedFolder(path);
    } else {
        addCollapsedFolder(path);
    }

    updateCollapsedList();
    render();
}

/**
 * Focus on a specific folder (collapse siblings, expand self)
 */
export function focusFolder(d) {
    if (!d.parent) return; // Root cannot be focused this way

    // 1. Collapse all siblings
    d.parent.children.forEach(sibling => {
        if (sibling.data.path !== d.data.path && sibling.data.type === 'folder') {
            addCollapsedFolder(sibling.data.path);
        }
    });

    // 2. Expand self
    removeCollapsedFolder(d.data.path);

    updateCollapsedList();
    render();
}

/**
 * Clear all collapsed folders
 */
export function clearCollapsed() {
    clearCollapsedFolders();
    updateCollapsedList();
    render();
}

/**
 * Update the collapsed folders list display
 */
export function updateCollapsedList() {
    const list = document.getElementById('collapsedList');
    const collapsedFolders = getCollapsedFolders();

    if (collapsedFolders.size === 0) {
        list.innerText = 'None';
    } else {
        list.innerText = Array.from(collapsedFolders).join(', ');
    }
}

/**
 * Add item to ignore list
 */
export async function addToIgnoreList() {
    const input = document.getElementById('ignoreInput');
    if (!input) return;

    const value = input.value.trim();
    if (!value) return;

    const success = addToIgnoreListState(value);
    if (success) {
        input.value = '';
        updateIgnoreListDisplay();
        // Refresh data with new ignore list
        await fetchData();
        render();
    } else {
        alert(`"${value}" is already in the ignore list`);
    }
}

/**
 * Remove item from ignore list
 */
export async function removeFromIgnoreListUI(item) {
    const success = removeFromIgnoreList(item);
    if (success) {
        updateIgnoreListDisplay();
        // Refresh data with new ignore list
        await fetchData();
        render();
    }
}

/**
 * Reset ignore list to defaults
 */
export async function resetIgnoreList() {
    if (confirm('Reset ignore list to default values?')) {
        resetIgnoreListState();
        updateIgnoreListDisplay();
        // Refresh data with new ignore list
        await fetchData();
        render();
    }
}

/**
 * Update the ignore list display
 */
export function updateIgnoreListDisplay() {
    const listContainer = document.getElementById('ignoreList');
    if (!listContainer) return;

    const ignoreList = getIgnoreList();

    if (ignoreList.length === 0) {
        listContainer.innerHTML = '<div style="color: #94a3b8; font-style: italic;">No items in ignore list</div>';
        return;
    }

    listContainer.innerHTML = ignoreList.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #334155;">
            <span style="font-family: 'Courier New', monospace; font-size: 13px;">${item}</span>
            <button onclick="removeFromIgnoreListUI('${item}')" 
                style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;"
                title="Remove from ignore list">×</button>
        </div>
    `).join('');
}

/**
 * Populate author filter dropdown
 */
export function populateAuthorFilter() {
    const allCommits = getAllCommits();
    const committerSelect = document.getElementById('committerSelect');

    if (!committerSelect || !allCommits) return;

    // Extract unique authors
    const authorsSet = new Set();
    allCommits.forEach(commit => {
        if (commit.author) {
            authorsSet.add(commit.author);
        }
    });

    const authors = Array.from(authorsSet).sort();
    setAllAuthors(authors);

    // Clear existing options except "All Authors"
    committerSelect.innerHTML = '<option value="all">All Authors</option>';

    // Add author options
    authors.forEach(author => {
        const option = document.createElement('option');
        option.value = author;
        option.textContent = author;
        committerSelect.appendChild(option);
    });
}

/**
 * Filter commits by selected author
 */
export function filterCommitsByAuthor() {
    const committerSelect = document.getElementById('committerSelect');
    const commitSelect = document.getElementById('commitSelect');
    const baseCommitSelect = document.getElementById('baseCommitSelect');

    if (!committerSelect || !commitSelect) return;

    const selectedAuthor = committerSelect.value;
    setSelectedAuthor(selectedAuthor);

    const allCommits = getAllCommits();

    // Clear commit selects
    commitSelect.innerHTML = '';
    baseCommitSelect.innerHTML = '<option value="none">--- Select Base ---</option>';

    // Add "Latest (Live)" option
    const liveOpt = document.createElement('option');
    liveOpt.value = 'latest';
    liveOpt.innerText = 'Latest (Live)';
    commitSelect.appendChild(liveOpt);

    // Filter and add commits
    allCommits.forEach(c => {
        if (selectedAuthor === 'all' || c.author === selectedAuthor) {
            const opt = document.createElement('option');
            opt.value = c.hash;
            opt.innerText = `${c.hash} - ${c.msg}`;
            opt.dataset.author = c.author;
            opt.dataset.date = c.date;
            opt.dataset.msg = c.msg;
            commitSelect.appendChild(opt);

            const optBase = opt.cloneNode(true);
            baseCommitSelect.appendChild(optBase);
        }
    });

    // Trigger update
    changeCommit();
}

/**
 * Update file count display
 */
export function updateFileCount(totalFiles, modifiedFiles, createdFiles, deletedFiles) {
    const fileCountElement = document.getElementById('fileCount');
    if (!fileCountElement) return;

    const parts = [];

    if (totalFiles !== undefined) {
        parts.push(`${totalFiles} file${totalFiles !== 1 ? 's' : ''} total`);
    }

    const changes = [];
    if (modifiedFiles > 0) changes.push(`${modifiedFiles} modified`);
    if (createdFiles > 0) changes.push(`${createdFiles} created`);
    if (deletedFiles > 0) changes.push(`${deletedFiles} deleted`);

    if (changes.length > 0) {
        parts.push(changes.join(', '));
    }

    fileCountElement.textContent = parts.join(' • ');
}

/**
 * Update commit message display with better formatting
 */
export function updateCommitMessage(message, author, date) {
    const commitMessageElement = document.getElementById('commitMessage');
    if (!commitMessageElement) return;

    if (message === 'live') {
        commitMessageElement.innerHTML = 'Viewing live local changes';
    } else {
        const formattedDate = date ? new Date(date).toLocaleString() : '';
        const authorInfo = author ? `<span style="opacity: 0.7; font-size: 11px;">by ${author}</span>` : '';
        const dateInfo = formattedDate ? `<span style="opacity: 0.7; font-size: 11px;">${formattedDate}</span>` : '';

        commitMessageElement.innerHTML = `
            <div style="font-weight: 500; margin-bottom: 4px;">${message}</div>
            ${authorInfo ? `<div>${authorInfo}</div>` : ''}
            ${dateInfo ? `<div>${dateInfo}</div>` : ''}
        `;
    }
}
