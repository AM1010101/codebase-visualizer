# Dual-Mode Implementation Summary

## Overview
Successfully implemented dual-mode support for the Codebase Visualizer, allowing users to choose between:
- **Local Mode**: Analyze local git repositories via Node.js server
- **GitHub Mode**: Analyze public GitHub repositories via GitHub REST API (client-side only)

## Files Created

### 1. `js/github-api.js`
- Client-side GitHub REST API wrapper
- Handles authentication (optional token support)
- Provides methods for:
  - Repository metadata
  - Branch listing
  - Commit history
  - File tree retrieval
  - Commit details and diffs
  - File statistics
- Includes caching for performance
- Transforms GitHub API responses to match local format

### 2. `js/github-adapter.js`
- Adapter layer between GitHub API and existing codebase
- Exports functions that mirror local API endpoints:
  - `fetchGitHubData()` - Get repository tree
  - `fetchGitHubCommits()` - Get commit history
  - `fetchGitHubFileStats()` - Get file change statistics
  - `fetchGitHubCommitData()` - Get specific commit data
  - `loadGitHubBranches()` - Get available branches

### 3. `js/github-mode.js`
- UI functions for GitHub mode
- `setSourceMode(mode)` - Switch between local/GitHub
- `loadGitHubRepo()` - Load a GitHub repository
- `changeGitHubBranch()` - Switch branches

### 4. `README.md`
- Comprehensive documentation
- Usage examples for both modes
- Configuration instructions
- Troubleshooting guide
- Architecture overview

## Files Modified

### 1. `index.html`
- Added "Source Mode" section with toggle buttons
- Added GitHub repository URL input
- Added branch selector dropdown
- Added status display for GitHub operations
- Added script tag for `github-api.js`

### 2. `js/state.js`
- Added `sourceMode` state variable ('local' or 'github')
- Added `githubRepoInfo` state (owner, repo, branch)
- Added getters/setters:
  - `getSourceMode()` / `setSourceMode()`
  - `getGitHubRepoInfo()` / `setGitHubRepoInfo()`

### 3. `js/main.js`
- Imported GitHub mode functions
- Exposed functions to global scope:
  - `window.setSourceMode`
  - `window.loadGitHubRepo`
  - `window.changeGitHubBranch`

### 4. `js/api.js`
- Updated `fetchCommits()` to check source mode
- Updated `fetchData()` to route to GitHub API when in GitHub mode
- Clears dropdowns properly when switching modes
- Maintains backward compatibility with local mode

### 5. `js/fileChanges.js`
- Updated `fetchFileStats()` to support GitHub mode
- Routes to `fetchGitHubFileStats()` when in GitHub mode
- Maintains same UI/UX for both modes

## How It Works

### Mode Switching Flow
```
User clicks "GitHub Repo" button
  ↓
setSourceMode('github') called
  ↓
UI updates (show GitHub inputs, hide local status)
  ↓
State updated (sourceMode = 'github')
```

### GitHub Repository Loading Flow
```
User enters repo URL and clicks "Load"
  ↓
loadGitHubRepo() called
  ↓
Parse URL (supports multiple formats)
  ↓
Fetch repository metadata from GitHub API
  ↓
Load available branches
  ↓
Fetch commits for selected branch
  ↓
Update UI (populate dropdowns)
  ↓
Fetch tree data
  ↓
Render visualization
```

### Data Fetching Flow (GitHub Mode)
```
fetchData() called
  ↓
Check sourceMode === 'github'
  ↓
Call fetchGitHubData()
  ↓
GitHub API: GET /repos/:owner/:repo/git/trees/:sha?recursive=1
  ↓
Transform to local format
  ↓
Render treemap
```

## Key Features

### URL Format Support
- Full URL: `https://github.com/facebook/react`
- Short form: `facebook/react`
- With branch: `https://github.com/facebook/react/tree/main`

### Branch Selection
- Automatically loads available branches
- Defaults to repository's default branch
- Can switch branches without re-entering URL

### Rate Limiting
- Unauthenticated: 60 requests/hour
- With token: 5,000 requests/hour
- Token can be set via: `window.GitHubAPI.setToken('token')`

### Caching
- GitHub API responses are cached in memory
- Reduces redundant API calls
- Improves performance

## Testing Checklist

- [ ] Switch from Local to GitHub mode
- [ ] Load a public repository (e.g., `facebook/react`)
- [ ] View commit history
- [ ] Select different commits
- [ ] View file changes list
- [ ] Switch branches
- [ ] Hover over files in treemap
- [ ] Click files in file list
- [ ] Switch back to Local mode
- [ ] Verify local mode still works

## Future Enhancements

1. **Private Repository Support**
   - Implement OAuth flow
   - Store token securely

2. **GitLab/Bitbucket Support**
   - Create adapters for other platforms
   - Unified interface

3. **Offline Mode**
   - Use isomorphic-git for full offline support
   - Clone repos to IndexedDB

4. **Performance Optimizations**
   - Implement pagination for large repos
   - Virtual scrolling for file lists
   - Web Workers for data processing

5. **Enhanced Features**
   - Compare branches
   - View pull requests
   - Search within repository
   - Export visualizations

## Known Limitations

1. **GitHub Mode**
   - Only supports public repositories
   - Subject to API rate limits
   - Cannot access local uncommitted changes
   - No support for date range queries yet (GitHub API limitation)

2. **File Stats**
   - GitHub API provides stats per commit
   - Date range aggregation not yet implemented for GitHub mode

3. **Activity Mode**
   - Activity color mode not yet supported in GitHub mode
   - Would require fetching all commits in time window

## Notes

- All GitHub API calls are made client-side (no server proxy needed)
- GitHub mode can be used as a standalone static site
- Local mode still requires Node.js server
- Both modes share the same visualization and UI components
- State management ensures clean separation between modes
