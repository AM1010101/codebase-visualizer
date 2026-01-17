/**
 * UI controls and interactions
 */

import {
    getCurrentViewMode,
    setCurrentViewMode,
    getCollapsedFolders,
    addCollapsedFolder,
    removeCollapsedFolder,
    clearCollapsedFolders
} from './state.js';
import { render } from './render.js';
import { changeCommit } from './navigation.js';

/**
 * Toggle between git status and age color modes
 */
export function toggleColorMode() {
    const colorModeGroup = document.querySelector('input[name="colorMode"]:checked');
    if (!colorModeGroup) return;

    const colorMode = colorModeGroup.value;
    const container = document.getElementById('ageThresholdContainer');
    if (container) {
        container.classList.toggle('active', colorMode === 'age');
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
