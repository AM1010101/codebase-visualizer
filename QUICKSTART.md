# Quick Start Guide

## Try It Out in 30 Seconds!

### Option 1: Analyze a Public GitHub Repository (No Setup Required!)

1. **Open the tool:**
   ```bash
   # Just open index.html in your browser as a static file
   # OR run the server for local mode too:
   node server.js
   # Then visit: http://localhost:3000
   ```

2. **Switch to GitHub Mode:**
   - Click the **"GitHub Repo"** button at the top

3. **Load a repository:**
   - Try one of these popular repos:
     - `facebook/react`
     - `microsoft/vscode`
     - `d3/d3`
     - `torvalds/linux`
   - Or enter any public GitHub repo URL

4. **Click "Load"** and explore!

### Option 2: Analyze Your Local Repository

1. **Navigate to your git repository:**
   ```bash
   cd /path/to/your/git/repo
   ```

2. **Start the visualizer:**
   ```bash
   node /path/to/codebase-visualizer/server.js
   ```

3. **Open in browser:**
   ```
   http://localhost:3000
   ```

4. **Explore your codebase!**

## What to Try

### 🎨 Visual Modes
- **Color by Git Status** - See what's modified, created, or deleted
- **Color by Age** - Find recently changed files (blue = recent, orange = old)
- **Color by Activity** - See which files change most frequently

### ⏰ Time Travel
- **Single Commit** - View any point in history
- **Manual Diff** - Compare two specific commits
- **Date Range** - See all changes in a time period

### 🔍 Filters
- **Filter by Author** - Focus on specific contributors
- **Hide Clean Files** - Only show changed files
- **Collapse Clean Folders** - Minimize unchanged areas

### 📊 File Analysis
- View the **File Changes** panel to see:
  - All changed files
  - Lines added/removed per file
  - Click to copy path
  - Hover to highlight in treemap

## Example Workflows

### "What changed in the last week?"
1. Switch to **Date Range** mode
2. Set dates to last 7 days
3. View the treemap colored by git status

### "What has Alice been working on?"
1. Select **Alice** from the author filter
2. Browse through her commits
3. See the file changes for each

### "Which files change most often?"
1. Switch color mode to **Activity**
2. Adjust the activity window (e.g., 30 days)
3. Red/hot areas = frequently changed files

### "Compare two releases"
1. Switch to **Manual Diff** mode
2. Select the newer release as target
3. Select the older release as base
4. See all changes between versions

## Tips

- **Hover** over any file/folder to see details
- **Click** folders to collapse/expand them
- Use **keyboard arrows** (← →) to navigate commits
- The **ignore list** helps exclude large folders like `node_modules`

## Troubleshooting

**GitHub Mode:**
- If you hit rate limits, add a token: `window.GitHubAPI.setToken('your_token')`
- Make sure the repository is public
- Check the status message for errors

**Local Mode:**
- Make sure you're in a git repository
- Check that Node.js is installed
- Verify the server is running on port 3000

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [IMPLEMENTATION.md](IMPLEMENTATION.md) for technical details
- Explore the codebase itself using the visualizer! (meta!)

Enjoy exploring your code! 🚀
