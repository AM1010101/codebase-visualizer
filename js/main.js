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
    updateIgnoreListDisplay
} from './ui.js';
import { changeCommit, navigateCommit } from './navigation.js';

/**
 * Initialize the application
 */
async function init() {
    // Initialize ignore list display
    updateIgnoreListDisplay();

    // Fetch initial data
    await fetchCommits();
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
window.fetchData = async () => {
    await fetchData();
    render();
};

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
