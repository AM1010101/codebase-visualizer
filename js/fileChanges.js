/**
 * File changes list functionality
 */

import { getEffectiveTarget, getEffectiveBase, setHoveredFilePath } from './state.js';
import { render } from './render.js';

let currentFileStats = [];
let currentSortMode = 'changes'; // 'changes', 'name', 'added', 'removed'

/**
 * Fetch file statistics from the server
 */
export async function fetchFileStats() {
    const effectiveTarget = getEffectiveTarget();
    const effectiveBase = getEffectiveBase();

    if (!effectiveTarget) return;

    let url;

    // Check if this is a date range query
    if (effectiveTarget.startsWith('dateRange:')) {
        const parts = effectiveTarget.split(':');
        const startDate = parts[1];
        const endDate = parts[2];
        url = `/api/file-stats?startDate=${startDate}&endDate=${endDate}`;
    } else {
        url = `/api/file-stats?commit=${effectiveTarget}`;
        if (effectiveBase && effectiveBase !== 'none') {
            url += `&base=${effectiveBase}`;
        }
    }

    try {
        const res = await fetch(url);
        const fileStats = await res.json();
        currentFileStats = fileStats;
        renderFileChangesList();
    } catch (e) {
        console.error('Failed to fetch file stats:', e);
        showFileChangesError();
    }
}

/**
 * Render the file changes list
 */
function renderFileChangesList() {
    const container = document.getElementById('fileChangesList');
    if (!container) return;

    if (!currentFileStats || currentFileStats.length === 0) {
        container.innerHTML = '<div class="loading-text">No file changes found</div>';
        return;
    }

    // Sort the files based on current sort mode
    const sortedFiles = [...currentFileStats].sort((a, b) => {
        switch (currentSortMode) {
            case 'changes':
                const totalA = a.added + a.removed;
                const totalB = b.added + b.removed;
                return totalB - totalA;
            case 'name':
                return a.file.localeCompare(b.file);
            case 'added':
                return b.added - a.added;
            case 'removed':
                return b.removed - a.removed;
            default:
                return 0;
        }
    });

    // Build HTML
    let html = `
        <div class="file-changes-header">
            <div class="file-changes-count">${sortedFiles.length} file${sortedFiles.length !== 1 ? 's' : ''} changed</div>
            <button class="file-changes-sort" onclick="window.cycleFileSort()" title="Sort by: ${getSortLabel()}">
                ${getSortLabel()} ↓
            </button>
        </div>
    `;

    sortedFiles.forEach(stat => {
        const total = stat.added + stat.removed;
        const escapedPath = escapeHtml(stat.file);
        html += `
            <div class="file-item" 
                onclick="window.openFile('${escapedPath}')"
                onmouseover="window.highlightFileInTree('${escapedPath}')"
                onmouseout="window.clearFileHighlight()">
                <div class="file-item-name">${escapedPath}</div>
                <div class="file-item-stats">
                    <span class="stat-added">+${stat.added}</span>
                    <span class="stat-removed">-${stat.removed}</span>
                    <span class="stat-total">${total} change${total !== 1 ? 's' : ''}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Show error message in file changes list
 */
function showFileChangesError() {
    const container = document.getElementById('fileChangesList');
    if (container) {
        container.innerHTML = '<div class="loading-text">Error loading file changes</div>';
    }
}

/**
 * Get the current sort mode label
 */
function getSortLabel() {
    switch (currentSortMode) {
        case 'changes':
            return 'Changes';
        case 'name':
            return 'Name';
        case 'added':
            return 'Added';
        case 'removed':
            return 'Removed';
        default:
            return 'Changes';
    }
}

/**
 * Cycle through sort modes
 */
export function cycleFileSort() {
    const modes = ['changes', 'name', 'added', 'removed'];
    const currentIndex = modes.indexOf(currentSortMode);
    currentSortMode = modes[(currentIndex + 1) % modes.length];
    renderFileChangesList();
}

/**
 * Open a file (attempt to open in VS Code or show path)
 */
export function openFile(filePath) {
    // Try to open in VS Code using the vscode:// protocol
    const vscodeUrl = `vscode://file/${window.location.pathname.replace(/\/[^/]*$/, '')}/${filePath}`;

    // Create a temporary link and click it
    const link = document.createElement('a');
    link.href = vscodeUrl;
    link.click();

    // Also copy the file path to clipboard as a fallback
    navigator.clipboard.writeText(filePath).then(() => {
        console.log('File path copied to clipboard:', filePath);
    }).catch(err => {
        console.error('Failed to copy file path:', err);
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Reset the file changes list
 */
export function resetFileChangesList() {
    const container = document.getElementById('fileChangesList');
    if (container) {
        container.innerHTML = '<div class="loading-text">Select a commit to view file changes</div>';
    }
    currentFileStats = [];
}

/**
 * Highlight a file in the treemap
 */
export function highlightFileInTree(filePath) {
    console.log('=== highlightFileInTree called ===');
    console.log('File path:', filePath);
    console.log('Setting hovered file path...');
    setHoveredFilePath(filePath);

    // Also highlight the file item in the list
    highlightFileInList(filePath);

    console.log('Triggering re-render...');
    render();
}

/**
 * Clear file highlight in the treemap
 */
export function clearFileHighlight() {
    console.log('Clearing file highlight');
    setHoveredFilePath(null);

    // Also clear highlight in the list
    clearFileListHighlight();

    render();
}

/**
 * Highlight a file item in the file list
 */
function highlightFileInList(filePath) {
    // Remove previous highlights
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('file-item-highlighted');
    });

    // Add highlight to matching file
    if (filePath) {
        document.querySelectorAll('.file-item').forEach(item => {
            const itemName = item.querySelector('.file-item-name');
            if (itemName && itemName.textContent === filePath) {
                item.classList.add('file-item-highlighted');
            }
        });
    }
}

/**
 * Clear all file list highlights
 */
function clearFileListHighlight() {
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('file-item-highlighted');
    });
}

/**
 * Highlight a file in the list only (called from treemap hover)
 * Does NOT trigger re-render to avoid infinite loops
 */
export function highlightFileInListOnly(filePath) {
    console.log('Highlighting file in list only:', filePath);
    highlightFileInList(filePath);
}

/**
 * Clear file list highlight only (called from treemap hover)
 * Does NOT trigger re-render to avoid infinite loops
 */
export function clearFileListHighlightOnly() {
    console.log('Clearing file list highlight only');
    clearFileListHighlight();
}
