/**
 * Global state management
 */

// View mode state
let currentViewMode = 'single';

// Commit data
let allCommits = [];
let effectiveTarget = 'latest';
let effectiveBase = 'none';

// Codebase data
let rawData = null;

// UI state
let collapsedFolders = new Set();

// Getters
export function getCurrentViewMode() {
    return currentViewMode;
}

export function getAllCommits() {
    return allCommits;
}

export function getEffectiveTarget() {
    return effectiveTarget;
}

export function getEffectiveBase() {
    return effectiveBase;
}

export function getRawData() {
    return rawData;
}

export function getCollapsedFolders() {
    return collapsedFolders;
}

// Setters
export function setCurrentViewMode(mode) {
    currentViewMode = mode;
}

export function setAllCommits(commits) {
    allCommits = commits;
}

export function setEffectiveTarget(target) {
    effectiveTarget = target;
}

export function setEffectiveBase(base) {
    effectiveBase = base;
}

export function setRawData(data) {
    rawData = data;
}

export function addCollapsedFolder(path) {
    collapsedFolders.add(path);
}

export function removeCollapsedFolder(path) {
    collapsedFolders.delete(path);
}

export function clearCollapsedFolders() {
    collapsedFolders.clear();
}

export function hasCollapsedFolder(path) {
    return collapsedFolders.has(path);
}
