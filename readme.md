# Codebase Git Visualizer

A lightweight tool to visualize your git repository as an interactive Icicle Chart. It maps your file system and overlays live Git status (Modified, Created, Deleted), helping you spot complexity and review changes visually.

I created this to try and better visualise how my codebase is changing as AI is writing more and more code. 

![Codebase Visualizer Preview](preview.png)

## Features

* **Interactive Icicle Chart:** Visualize your folder structure depth and scope.
* **Git Overlay:** Instantly see which files are Modified (Orange), Created (Green), or Untracked (Blue).
* **Two Sizing Modes:**
  * **File Size:** Quickly identify massive assets or bloated files.
  * **Uniform (Count):** See the architectural complexity by treating every file as equal width.
* **Focus Mode:** Toggle to hide all "Clean" files, isolating only your active changes (perfect for self-code-review).
* **Live Refresh:** No restart required. Just save your code, hit "Refresh" in the browser, and see the map update.
* **Commit Explorer:** Move between commits to see the changes in the codebase over time.

## Prerequisites

* **Node.js** (v12 or higher recommended).
* **Git** installed and available in your terminal.

## Installation

This tool requires** ** **zero** **`npm install`** . It uses standard Node.js libraries (`http`,** **`fs`,** **`child_process`).

1. Create a folder for the tool inside your project (or keep it external):
   **Bash**

   ```
   mkdir codebase-visualizer
   ```
2. Place the** **`server.js` and** **`index.html` files inside that folder.

## Usage

### 1. Start the Server

Run the server from the** ****root** of the codebase you want to scan.

**Bash**

```
# If the tool is inside your project folder:
node codebase-visualizer/server.js

# If the tool is in a totally different folder:
node /path/to/codebase-visualizer/server.js
```

### 2. Open in Browser

Go to** **[http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)

### 3. Workflow

1. Write code in your editor.
2. Switch to the browser and click** ** **"🔄 Refresh Data"** .
3. Use** ****Focus Mode** to check your work before committing.

## Configuration

You can customize the tool by editing the top variables in** **`server.js`:

* **PORT:** Change the default port** **`3000` if needed.
* **IGNORE:** Add folders you want to exclude from the scan (e.g.,** **`coverage`,** **`build`,** **`tmp`).

**JavaScript**

```
const IGNORE = ['.git', 'node_modules', 'dist', '.next', 'codebase-visualizer'];
```

## Troubleshooting

* **"Error loading index.html":** Ensure** **`server.js` and** **`index.html` are in the** ***same* directory.
* **"All files are clean!":** If you are in Focus Mode, this is good! If not, ensure you ran the** **`node` command from the root of a git repository, not from inside a subfolder.
* **"Chart is empty":** Check if your folder is listed in the** **`IGNORE` array in** **`server.js`.
