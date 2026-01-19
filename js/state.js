/**
 * Global state management
 */

// Default ignore list
const DEFAULT_IGNORE_LIST = ['.git', 'node_modules', 'dist', '.next', '.idea', '.vscode', '__pycache__', 'coverage', 'android', 'ios'];

// Source mode state
let sourceMode = 'local'; // 'local' or 'github'
let githubRepoInfo = null; // { owner, repo, branch }

// View mode state
let currentViewMode = 'single';

// Commit data
let allCommits = [];
let effectiveTarget = 'latest';
let effectiveBase = 'none';

// Codebase data
let rawData = null;

// Activity data (file change counts)
let activityData = null;

// UI state
let collapsedFolders = new Set();

// Ignore list state (loaded from localStorage)
let ignoreList = loadIgnoreListFromStorage();

// Author filter state
let selectedAuthor = 'all';
let allAuthors = [];

// Hovered file state (for highlighting in treemap)
let hoveredFilePath = null;

/**
 * Load ignore list from localStorage
 */
function loadIgnoreListFromStorage() {
    try {
        const stored = localStorage.getItem('codebase-visualizer-ignore-list');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load ignore list from localStorage', e);
    }
    return [...DEFAULT_IGNORE_LIST];
}

/**
 * Save ignore list to localStorage
 */
function saveIgnoreListToStorage() {
    try {
        localStorage.setItem('codebase-visualizer-ignore-list', JSON.stringify(ignoreList));
    } catch (e) {
        console.error('Failed to save ignore list to localStorage', e);
    }
}

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

export function getActivityData() {
    return activityData;
}

export function getCollapsedFolders() {
    return collapsedFolders;
}

export function getIgnoreList() {
    return ignoreList;
}

export function getDefaultIgnoreList() {
    return [...DEFAULT_IGNORE_LIST];
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

export function setActivityData(data) {
    activityData = data;
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

// Ignore list management
export function addToIgnoreList(item) {
    if (!item || item.trim() === '') return false;
    const trimmedItem = item.trim();
    if (!ignoreList.includes(trimmedItem)) {
        ignoreList.push(trimmedItem);
        saveIgnoreListToStorage();
        return true;
    }
    return false;
}

export function removeFromIgnoreList(item) {
    const index = ignoreList.indexOf(item);
    if (index > -1) {
        ignoreList.splice(index, 1);
        saveIgnoreListToStorage();
        return true;
    }
    return false;
}

export function resetIgnoreList() {
    ignoreList = [...DEFAULT_IGNORE_LIST];
    saveIgnoreListToStorage();
}

// Author filter management
export function getSelectedAuthor() {
    return selectedAuthor;
}

export function setSelectedAuthor(author) {
    selectedAuthor = author;
}

export function getAllAuthors() {
    return allAuthors;
}

export function setAllAuthors(authors) {
    allAuthors = authors;
}

// Hovered file management
export function getHoveredFilePath() {
    return hoveredFilePath;
}

export function setHoveredFilePath(path) {
    hoveredFilePath = path;
}

// Source mode management
export function getSourceMode() {
    return sourceMode;
}

export function setSourceMode(mode) {
    sourceMode = mode;
}

export function getGitHubRepoInfo() {
    return githubRepoInfo;
}

export function setGitHubRepoInfo(info) {
    githubRepoInfo = info;
}

