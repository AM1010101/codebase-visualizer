/**
 * Data filtering and transformation logic
 */

import { COLLAPSED_MIN_VALUE } from './config.js';
import { getCollapsedFolders } from './state.js';

/**
 * Build full path for a node
 */
export function getNodePath(node, parentPath = '') {
    return parentPath ? `${parentPath}/${node.name}` : node.name;
}

/**
 * Check if a node or its children have changes
 */
export function getAggregateStatus(n) {
    if (n.git_status && n.git_status !== 'clean') return n.git_status;
    if (!n.children) return 'clean';

    for (let c of n.children) {
        const status = getAggregateStatus(c);
        if (status !== 'clean') return status; // Propagate dirty status up
    }

    return 'clean';
}

/**
 * Filter and transform data based on current settings
 */
export function filterNode(node, parentPath = '', options = {}) {
    const {
        mode = 'count',
        hideClean = false,
        showUnstaged = true,
        collapseClean = false,
        sortMode = 'alpha',
        foldersFirst = true
    } = options;

    const nodePath = getNodePath(node, parentPath);
    const collapsedFolders = getCollapsedFolders();

    // --- HANDLE UNSTAGED LOGIC ---
    // Clone node so we don't mutate original
    let tempNode = {
        ...node
    };

    // Map git_status based on showUnstaged setting
    if (!showUnstaged && tempNode.type === 'file') {
        const code = tempNode.git_code || '';

        // 1. Untracked files are purely unstaged
        if (tempNode.git_status === 'untracked') {
            tempNode.git_status = 'clean';
        }

        // 2. Modified files: Only hide if exclusively unstaged (' M')
        // 'M ' is staged, 'MM' is mixed (keep visible as it has staged content)
        else if (tempNode.git_status === 'modified' && code === ' M') {
            tempNode.git_status = 'clean';
        }
    }

    const newNode = {
        ...tempNode,
        path: nodePath
    };

    // Determine collapsed state
    let isCollapsed = collapsedFolders.has(nodePath);

    // If "Collapse Clean Folders" is on, check if this folder (recursively) is clean
    let aggregateStatus = 'clean';
    if (node.type === 'folder') {
        aggregateStatus = getAggregateStatus(node);
        if (collapseClean && aggregateStatus === 'clean') {
            isCollapsed = true;
        }
    }
    newNode.aggregateStatus = aggregateStatus; // Save for coloring later

    if (newNode.children && !isCollapsed) {
        newNode.children = newNode.children.map(child => filterNode(child, nodePath, options)).filter(child => {
            if (child === null) return false;
            if (!hideClean) return true;
            // Keep if unclean OR if it has meaningful children
            return child.git_status !== 'clean' || (child.children && child.value > 0);
        });

        // Sort children based on sort mode and filters
        newNode.children.sort((a, b) => {
            // If folders first is enabled, sort folders before files
            if (foldersFirst) {
                if (a.type === 'folder' && b.type !== 'folder') return -1;
                if (a.type !== 'folder' && b.type === 'folder') return 1;
            }

            // Then apply the selected sort mode
            if (sortMode === 'alpha') {
                return a.name.localeCompare(b.name);
            }

            // For 'size' sort, sort by value descending
            return b.value - a.value;
        });
    } else if (isCollapsed) {
        newNode.collapsedStatus = aggregateStatus;
        // Remove children for collapsed folders
        newNode.children = [];
    }

    // Recalculate value
    if (newNode.type === 'file') {
        if (mode === 'size') {
            let baseValue = node.value || 0;

            // Boost non-clean files to minimum size for visibility
            if (node.git_status !== 'clean') {
                const MIN_DIRTY_FILE_SIZE = 5000; // 5KB minimum
                baseValue = Math.max(baseValue, MIN_DIRTY_FILE_SIZE);
            }

            newNode.value = baseValue;
        } else {
            // Uniform mode: give non-clean files more weight
            if (node.git_status !== 'clean') {
                newNode.value = 5; // 5x weight for dirty files
            } else {
                newNode.value = 1; // Normal weight for clean files
            }
        }
    } else if (isCollapsed) {
        // Collapsed folders get a minimum fixed value
        newNode.value = COLLAPSED_MIN_VALUE;
    } else {
        newNode.value = newNode.children ? newNode.children.reduce((sum, c) => sum + c.value, 0) : 0;
    }

    return newNode;
}
