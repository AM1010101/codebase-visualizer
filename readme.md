# Codebase Visualizer

A powerful D3-based treemap visualization tool for exploring git repositories, supporting both **local repositories** and **public GitHub repositories**.

![Codebase Visualizer](https://img.shields.io/badge/visualization-D3.js-orange)
![Mode](https://img.shields.io/badge/mode-local%20%7C%20github-blue)

## Features

✅ **Dual Mode Support**
- 🖥️ **Local Mode**: Analyze repositories on your machine with full git command access
- 🌐 **GitHub Mode**: Analyze any public GitHub repository without cloning

✅ **Time Travel**
- View any commit in history
- Compare between commits (diff mode)
- Filter by date range
- Filter by author

✅ **Visual Styles**
- Color by git status (modified, created, deleted)
- Color by file age (recency)
- Color by activity (change frequency)
- Adjustable sizing (file size vs uniform)

✅ **Interactive Features**
- Hover to see file details
- Click folders to collapse/expand
- Highlight files in treemap from file list
- Smooth D3 animations between states

✅ **File Analysis**
- View all changed files with +/- line counts
- Expand folders with modifications
- Visual distinction for deletions (striped pattern)

## Getting Started

### Local Mode (Default)

1. **Start the server:**
   ```bash
   node server.js
   ```

2. **Open in browser:**
   ```
   http://localhost:3000
   ```

3. **The tool will automatically scan your current directory's git repository**

### GitHub Mode

1. **Switch to GitHub Mode:**
   - Click the "GitHub Repo" button in the "Source Mode" section

2. **Enter a repository:**
   - Full URL: `https://github.com/facebook/react`
   - Short form: `facebook/react`
   - With branch: `https://github.com/facebook/react/tree/main`

3. **Select a branch** (optional):
   - Choose from the dropdown after loading
   - Defaults to the repository's default branch

4. **Click "Load"** to visualize the repository

## Usage Examples

### Analyzing a Public Repository

```
Repository URL: d3/d3
Branch: main
```

This will visualize the D3.js repository structure and commit history.

### Comparing Commits

1. Switch to "Manual Diff" mode
2. Select a target commit
3. Select a base commit to compare against
4. View the differences in the treemap

### Filtering by Date Range

1. Switch to "Date Range" mode
2. Select start and end dates
3. View all files changed during that period

### Filtering by Author

1. Select an author from the "Filter by Author" dropdown
2. Only commits by that author will be shown in the timeline

## Configuration

### Ignore List

Customize which folders/files to exclude:
- Add items via the "Ignore List" section
- Stored in browser localStorage
- Default ignores: `.git`, `node_modules`, `dist`, etc.

### GitHub API Rate Limits

- **Unauthenticated**: 60 requests/hour
- **With token**: 5,000 requests/hour

To use a GitHub token (optional):
```javascript
// In browser console
window.GitHubAPI.setToken('your_github_token_here');
```

## Architecture

### Local Mode
```
Browser → Node.js Server → Git Commands → Local Repository
```

### GitHub Mode
```
Browser → GitHub REST API → Public Repository
```

### Key Files

- `server.js` - Node.js backend for local git operations
- `js/github-api.js` - GitHub API client
- `js/github-adapter.js` - Transforms GitHub data to match local format
- `js/github-mode.js` - UI functions for GitHub mode
- `js/api.js` - Unified API layer (routes to local or GitHub)
- `js/render.js` - D3 treemap visualization
- `js/state.js` - Global state management

## Keyboard Shortcuts

- `←` / `→` - Navigate through commits
- `Escape` - Clear collapsed folders

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari

## Dependencies

- **D3.js v7** - Visualization library
- **Node.js** - For local mode server

## Tips

### For Large Repositories

- Use the ignore list to exclude large folders
- GitHub mode is faster for initial exploration (no cloning needed)
- Local mode provides more detailed git information

### For Analysis

- Use "Activity" color mode to find frequently changed files
- Use "Age" color mode to find recently modified areas
- Compare commits to see specific changes between versions

## Troubleshooting

### "Error fetching data. Is server.js running?"
- Make sure you're in local mode and the server is running
- Check that you're in a git repository directory

### GitHub API Rate Limit Exceeded
- Wait for the rate limit to reset (shown in error message)
- Add a GitHub personal access token for higher limits

### Repository Not Loading
- Verify the repository URL is correct
- Ensure the repository is public (private repos not supported in GitHub mode)
- Check browser console for detailed error messages

## Future Enhancements

- Private repository support (with OAuth)
- GitLab/Bitbucket support
- Export visualizations as images
- Custom color schemes
- File content preview

## License

MIT

## Contributing

Contributions welcome! Feel free to open issues or submit pull requests.
