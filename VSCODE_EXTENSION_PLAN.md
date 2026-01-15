# VS Code Extension Conversion Plan

This document outlines the steps to convert the existing Codebase Visualizer web tool into a native VS Code extension.

## 1. Update `package.json`
Configure the project manifest to be recognized as a VS Code extension.

- **Add `engines` field**: Specify VS Code compatibility (e.g., `^1.80.0`).
- **Add `activationEvents`**: Define `onCommand:codebase-visualizer.start` to load the extension only when needed.
- **Add `contributes`**: Register the "Open Codebase Visualizer" command in the command palette.
- **Set `main`**: Point to the new `extension.js` entry point.

## 2. Create `extension.js` (The Backend)
Migrate the logic from `server.js` into the VS Code extension host environment.

- **`activate(context)`**: The main entry point.
- **`vscode.window.createWebviewPanel`**: Create the UI panel instead of serving HTML via HTTP.
- **Porting Logic**:
  - Move `scan(dir)` and `getGitStatus()` functions into this file.
  - Use VS Code's `fs` or Node's `fs` (since extensions run in Node) to read files.
- **Messaging System**:
  - Replace HTTP endpoints (like `/api/data`) with message listeners (`webview.onDidReceiveMessage`).
  - Handle a `getData` message from the frontend by running the scan and returning data via `webview.postMessage`.

## 3. Refactor `index.html` (The Frontend)
Update the UI to support both the standalone web mode and the integrated VS Code mode.

- **Adapter Pattern**: create a helper to abstract data fetching.
- **Detection**: Check for `acquireVsCodeApi()` to determine if running inside VS Code.
- **Logic**:
  - **If VS Code**: define `vscode = acquireVsCodeApi()`. Send `{ command: 'getData' }` to request data. Listen for the `message` event to receive the payload.
  - **If Web**: Keep the existing `fetch('/api/data')` logic.
- **Path Handling**: Ensure CSS/JS resources are loaded correctly (VS Code webviews require special URIs for local resources, though currently everything is inline).

## 4. Build and Run
- **Install**: Run `npm install` to ensure dependencies are ready.
- **Debug**: Open the folder in VS Code and press **F5** to launch the Extension Development Host.
- **Test**: Run the "Codebase Visualizer: Open" command to verify the webview loads and displays the git visualization.
