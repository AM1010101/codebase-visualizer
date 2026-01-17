/**
 * Commit navigation and timeline controls
 */

import {
    getAllCommits,
    getCurrentViewMode,
    setEffectiveTarget,
    setEffectiveBase,
    getEffectiveTarget,
    getEffectiveBase
} from './state.js';
import { fetchData } from './api.js';
import { render } from './render.js';
import { updateCommitMessage } from './ui.js';
import { fetchFileStats } from './fileChanges.js';

/**
 * Handle commit selection changes
 */
export function changeCommit() {
    const select = document.getElementById('commitSelect');
    const baseSelect = document.getElementById('baseCommitSelect');
    const info = document.getElementById('commitInfo');
    const label = document.getElementById('timeline-label');
    const sublabel = document.getElementById('timeline-sublabel');
    const allCommits = getAllCommits();
    const currentViewMode = getCurrentViewMode();

    if (!select || !baseSelect) return;

    if (currentViewMode === 'range') {
        const startStr = document.getElementById('startDate').value;
        const endStr = document.getElementById('endDate').value;

        if (!startStr || !endStr) {
            if (info) info.innerText = "Please select both start and end dates.";
            return;
        }

        // Store the date range in state for API call
        setEffectiveTarget(`dateRange:${startStr}:${endStr}`);
        setEffectiveBase('none');

        if (label) label.innerText = `Date Range`;
        if (info) info.innerText = `Showing files touched between ${startStr} and ${endStr}`;
        if (sublabel) sublabel.innerText = `${startStr} → ${endStr}`;

    } else if (currentViewMode === 'diff') {
        setEffectiveTarget(select.value);
        setEffectiveBase(baseSelect.value);

        const effectiveTarget = getEffectiveTarget();
        const effectiveBase = getEffectiveBase();

        if (effectiveBase !== 'none') {
            const targetText = effectiveTarget === 'latest' ? 'Latest' : effectiveTarget.substring(0, 7);
            const baseText = effectiveBase.substring(0, 7);
            if (label) label.innerText = `${targetText} vs ${baseText}`;
            if (info) info.innerText = `Diffing changes between ${baseText} and ${targetText}`;
            if (sublabel) sublabel.innerText = `Manual Diff Mode`;
        }
    } else {
        setEffectiveTarget(select.value);
        setEffectiveBase('none');

        const effectiveTarget = getEffectiveTarget();

        if (effectiveTarget === 'latest') {
            updateCommitMessage('live');
            if (label) label.innerText = "Latest (Live)";
        } else {
            const opt = select.options[select.selectedIndex];
            const date = new Date(opt.dataset.date).toLocaleDateString();
            updateCommitMessage(opt.dataset.msg, opt.dataset.author, opt.dataset.date);
            if (label) label.innerText = `Commit ${opt.value.substring(0, 7)} (${date})`;
        }
        if (sublabel) sublabel.innerText = "";
    }

    updateNavButtons();
    fetchData().then(() => {
        fetchFileStats();
        render();
    });
}

/**
 * Update navigation button states
 */
export function updateNavButtons() {
    const select = document.getElementById('commitSelect');
    const idx = select.selectedIndex;

    const btnNext = document.getElementById('btnNext');
    const btnPrev = document.getElementById('btnPrev');

    if (btnNext) btnNext.disabled = (idx === 0);
    if (btnPrev) btnPrev.disabled = (idx === select.options.length - 1);
}

/**
 * Navigate through commits
 */
export function navigateCommit(direction) {
    const select = document.getElementById('commitSelect');
    const newIdx = select.selectedIndex + direction;

    if (newIdx >= 0 && newIdx < select.options.length) {
        select.selectedIndex = newIdx;
        changeCommit();
    }
}

/**
 * Initialize keyboard shortcuts
 */
export function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') navigateCommit(1); // Go back in time (down the list)
        if (e.key === 'ArrowRight') navigateCommit(-1); // Go forward in time (up the list)
    });
}
