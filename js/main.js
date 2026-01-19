/**
 * Application initialization and orchestration
 */

import { fetchCommits, fetchData } from './api.js';
import { render } from './render.js';
import { initKeyboardShortcuts } from './navigation.js';
import {
    toggleColorMode,
    updateAgeThreshold,
    updateActivityThreshold,
    setViewMode,
    clearCollapsed,
    toggleCollapse,
    focusFolder,
    addToIgnoreList,
    removeFromIgnoreListUI,
    resetIgnoreList,
    updateIgnoreListDisplay,
    populateAuthorFilter,
    filterCommitsByAuthor,
    updateCommitMessage
} from './ui.js';
import { changeCommit, navigateCommit } from './navigation.js';
import { fetchFileStats, cycleFileSort, openFile, highlightFileInTree, clearFileHighlight, highlightFileInListOnly, clearFileListHighlightOnly } from './fileChanges.js';
import { setSourceMode, loadGitHubRepo, changeGitHubBranch } from './github-mode.js';

/**
 * Initialize the application
 */
async function init() {
    // Initialize ignore list display
    updateIgnoreListDisplay();

    // Fetch initial data
    await fetchCommits();

    // Populate author filter dropdown
    populateAuthorFilter();

    await fetchData();
    render();

    // Setup keyboard shortcuts
    initKeyboardShortcuts();

    // Setup window resize handler
    window.addEventListener('resize', render);
}

// Expose functions to global scope for inline event handlers
// TODO: Refactor to use addEventListener instead of inline handlers
window.toggleColorMode = toggleColorMode;
window.updateAgeThreshold = updateAgeThreshold;
window.updateActivityThreshold = updateActivityThreshold;
window.setViewMode = setViewMode;
window.changeCommit = changeCommit;
window.navigateCommit = navigateCommit;
window.clearCollapsed = clearCollapsed;
window.render = render;
window.addToIgnoreList = addToIgnoreList;
window.removeFromIgnoreListUI = removeFromIgnoreListUI;
window.resetIgnoreList = resetIgnoreList;
window.filterCommitsByAuthor = filterCommitsByAuthor;
window.cycleFileSort = cycleFileSort;
window.openFile = openFile;
window.highlightFileInTree = highlightFileInTree;
window.clearFileHighlight = clearFileHighlight;
window.highlightFileInListOnly = highlightFileInListOnly;
window.clearFileListHighlightOnly = clearFileListHighlightOnly;
window.setSourceMode = setSourceMode;
window.loadGitHubRepo = loadGitHubRepo;
window.changeGitHubBranch = changeGitHubBranch;
window.fetchData = async () => {
    await fetchData();
    await fetchFileStats();
    render();
};

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
