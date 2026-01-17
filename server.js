// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const url = require('url');

// --- CONFIGURATION ---
const PORT = 3000;
const IGNORE = ['.git', 'node_modules', 'dist', '.next', '.idea', '.vscode', '__pycache__', 'coverage', 'android', 'ios'];

// --- LIVE SCAN (Current State) ---
function getGitStatus() {
    try {
        const output = execSync('git status --porcelain', { encoding: 'utf8' });
        const map = {};
        output.split('\n').forEach(line => {
            if (!line) return;
            const code = line.substring(0, 2);
            const file = line.substring(3).trim();
            let status = 'clean';
            if (code.includes('M')) status = 'modified';
            else if (code.includes('A')) status = 'created';
            else if (code.includes('D')) status = 'deleted';
            else if (code.includes('??')) status = 'untracked';
            map[file] = { status, code };
        });
        return map;
    } catch (e) { return {}; }
}

function scan(dir, relPath = '', gitMap) {
    const name = path.basename(dir);
    const node = { name: name || 'root', type: 'folder', git_status: 'clean', children: [], value: 0 };

    let items;
    try { items = fs.readdirSync(dir); } catch (e) { return node; }

    items.forEach(item => {
        if (IGNORE.includes(item)) return;
        const fullPath = path.join(dir, item);
        const itemRel = path.join(relPath, item);

        try {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                const child = scan(fullPath, itemRel, gitMap);
                if (child.value > 0) {
                    node.children.push(child);
                    node.value += child.value;
                }
            } else {
                const lookup = itemRel.replace(/\\/g, '/');
                const statusData = gitMap[lookup] || { status: 'clean', code: '  ' };
                const val = stats.size || 1;
                node.children.push({
                    name: item,
                    type: 'file',
                    value: val,
                    git_status: statusData.status,
                    git_code: statusData.code,
                    last_modified: stats.mtime
                });
                node.value += val;
            }
        } catch (e) { }
    });


    // Calculate folder's last_modified based on most recent child
    if (node.children.length > 0) {
        const latestChild = node.children.reduce((latest, child) => {
            const childTime = new Date(child.last_modified).getTime();
            const latestTime = latest ? new Date(latest).getTime() : 0;
            return childTime > latestTime ? child.last_modified : latest;
        }, null);
        node.last_modified = latestChild;
    } else {
        // Empty folder or no children with dates? Use folder's own mtime
        try {
            node.last_modified = fs.statSync(dir).mtime;
        } catch (e) { }
    }

    return node;
}

// --- HISTORY SCAN (Past Commits) ---
function getCommitChanges(hash, base = null) {
    try {
        let command;
        if (base) {
            // Diff between two commits: git diff --name-status base hash
            command = `git diff --name-status ${base} ${hash === 'latest' ? 'HEAD' : hash}`;
        } else {
            // Changes in a single commit: git show --name-status
            command = `git show --name-status --format="" ${hash}`;
        }

        const output = execSync(command, { encoding: 'utf8' });
        const map = {};
        output.split('\n').forEach(line => {
            if (!line) return;
            const parts = line.split('\t');
            const code = parts[0][0]; // M, A, D, etc.
            const file = parts[1];

            let status = 'clean';
            if (code === 'M') status = 'modified';
            else if (code === 'A') status = 'created';
            else if (code === 'D') status = 'deleted';
            map[file] = status;
        });
        return map;
    } catch (e) { return {}; }
}

// Get all files touched by commits in a date range
function getDateRangeChanges(startDate, endDate) {
    try {
        // Get all commits in the date range
        const command = `git log --since="${startDate}" --until="${endDate}" --name-status --pretty=format:"%h" --no-merges`;
        const output = execSync(command, { encoding: 'utf8' });

        const map = {};
        const lines = output.split('\n');
        let commitCount = 0;

        console.log(`Date range query: ${startDate} to ${endDate}`);

        for (const line of lines) {
            // Skip empty lines
            if (!line.trim()) continue;

            // Check if this is a commit hash line (6-8 hex chars, nothing else)
            if (line.match(/^[0-9a-f]{6,8}$/)) {
                commitCount++;
                continue;
            }

            const parts = line.split('\t');
            if (parts.length < 2) continue;

            const statusCode = parts[0].trim();
            const file = parts[1].trim();

            // Skip if not a valid status code
            if (!statusCode || statusCode.length === 0) continue;

            const code = statusCode[0]; // M, A, D, etc.

            // Track the "most significant" change for each file
            // Priority: deleted > created > modified
            let status = 'clean';
            if (code === 'M') status = 'modified';
            else if (code === 'A') status = 'created';
            else if (code === 'D') status = 'deleted';
            else continue; // Skip unknown status codes

            // Update if this is a more significant change
            const existing = map[file];
            if (!existing ||
                (status === 'deleted') ||
                (status === 'created' && existing !== 'deleted') ||
                (status === 'modified' && existing === 'clean')) {
                map[file] = status;
            }
        }

        console.log(`Found ${commitCount} commits with ${Object.keys(map).length} unique files changed`);

        return map;
    } catch (e) {
        console.error('Error getting date range changes:', e);
        return {};
    }
}

function scanCommit(hash, base = null) {
    console.log(`Scanning commit ${hash}${base ? ` relative to ${base}` : ''}...`);
    const statusMap = getCommitChanges(hash, base); // What changed in this range

    // Get full file tree at that commit with sizes
    // Format: <mode> <type> <object> <size> <tab> <file>
    const output = execSync(`git ls-tree -r -l --full-tree ${hash}`, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });

    const root = { name: 'root', type: 'folder', git_status: 'clean', children: [], value: 0 };
    const items = [];

    // Parse ls-tree output
    output.split('\n').forEach(line => {
        if (!line) return;
        // Example: 100644 blob <hash> 1234\tpath/to/file.js
        const [meta, filePath] = line.split('\t');
        const metaParts = meta.split(' ');
        const size = parseInt(metaParts[3] || '0', 10); // Size is the last part before tab

        // Filter ignores
        const parts = filePath.split('/');
        if (parts.some(p => IGNORE.includes(p))) return;

        items.push({ path: filePath, size: size });
    });

    // Build tree structure
    items.forEach(item => {
        const parts = item.path.split('/');
        let current = root;

        // Traverse/Create folders
        for (let i = 0; i < parts.length - 1; i++) {
            const folderName = parts[i];
            let folder = current.children.find(c => c.name === folderName);
            if (!folder) {
                folder = { name: folderName, type: 'folder', git_status: 'clean', children: [], value: 0 };
                current.children.push(folder);
            }
            current = folder;
        }

        // Add file
        const fileName = parts[parts.length - 1];
        const status = statusMap[item.path] || 'clean';

        current.children.push({
            name: fileName,
            type: 'file',
            value: item.size,
            git_status: status,
            git_code: 'C ' // C for Committed
        });
    });

    // Recalculate folder values recursively
    function calcValues(node) {
        if (node.type === 'file') return node.value;
        node.value = node.children.reduce((sum, c) => sum + calcValues(c), 0);
        return node.value;
    }
    calcValues(root);

    return root;
}

// --- SERVER LOGIC ---
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // 1. Serve HTML
    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            }
        });
    }
    // 1b. Serve new modular HTML
    else if (parsedUrl.pathname === '/index-new.html') {
        fs.readFile(path.join(__dirname, 'index-new.html'), (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index-new.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            }
        });
    }
    // 1c. Serve static files (CSS, JS)
    else if (parsedUrl.pathname.startsWith('/styles/') || parsedUrl.pathname.startsWith('/js/')) {
        const filePath = path.join(__dirname, parsedUrl.pathname);
        const extname = path.extname(filePath);
        const contentType = {
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json'
        }[extname] || 'text/plain';

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    }
    // 2. API: Get Commits
    else if (parsedUrl.pathname === '/api/commits') {
        try {
            // Get last 50 commits
            const output = execSync('git log -n 50 --pretty=format:"%h|%s|%an|%ad" --date=iso', { encoding: 'utf8' });
            const commits = output.split('\n').map(line => {
                const [hash, msg, author, date] = line.split('|');
                return { hash, msg, author, date };
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(commits));
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        }
    }
    // 3. API: Get Data (Current or Historic)
    else if (parsedUrl.pathname === '/api/data') {
        const commit = parsedUrl.query.commit;
        const base = parsedUrl.query.base;
        const startDate = parsedUrl.query.startDate;
        const endDate = parsedUrl.query.endDate;

        let tree;

        // Date Range Mode: Show all files touched by commits in the range
        if (startDate && endDate) {
            console.log(`Scanning date range: ${startDate} to ${endDate}...`);
            try {
                const statusMap = getDateRangeChanges(startDate, endDate);

                // Get the file tree at the end date
                const endCommitOutput = execSync(`git log -1 --until="${endDate}" --pretty=format:"%h"`, { encoding: 'utf8' });
                const endCommit = endCommitOutput.trim();

                if (!endCommit) {
                    tree = { name: 'error', value: 0, children: [], error: 'No commits found in date range' };
                } else {
                    // Get full file tree at end commit
                    const output = execSync(`git ls-tree -r -l --full-tree ${endCommit}`, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });

                    const root = { name: 'root', type: 'folder', git_status: 'clean', children: [], value: 0 };
                    const items = [];

                    // Parse ls-tree output
                    output.split('\n').forEach(line => {
                        if (!line) return;
                        const [meta, filePath] = line.split('\t');
                        const metaParts = meta.split(' ');
                        const size = parseInt(metaParts[3] || '0', 10);

                        // Filter ignores
                        const parts = filePath.split('/');
                        if (parts.some(p => IGNORE.includes(p))) return;

                        items.push({ path: filePath, size: size });
                    });

                    // Build tree structure
                    items.forEach(item => {
                        const parts = item.path.split('/');
                        let current = root;

                        // Traverse/Create folders
                        for (let i = 0; i < parts.length - 1; i++) {
                            const folderName = parts[i];
                            let folder = current.children.find(c => c.name === folderName);
                            if (!folder) {
                                folder = { name: folderName, type: 'folder', git_status: 'clean', children: [], value: 0 };
                                current.children.push(folder);
                            }
                            current = folder;
                        }

                        // Add file with status from date range
                        const fileName = parts[parts.length - 1];
                        const status = statusMap[item.path] || 'clean';

                        current.children.push({
                            name: fileName,
                            type: 'file',
                            value: item.size,
                            git_status: status,
                            git_code: 'DR' // DR for Date Range
                        });
                    });

                    // Recalculate folder values recursively
                    function calcValues(node) {
                        if (node.type === 'file') return node.value;
                        node.value = node.children.reduce((sum, c) => sum + calcValues(c), 0);
                        return node.value;
                    }
                    calcValues(root);

                    tree = root;
                }
            } catch (e) {
                console.error("Error scanning date range:", e);
                tree = { name: 'error', value: 0, children: [], error: e.message };
            }
        }
        // Diff Mode: Compare target with base
        else if (base && base !== 'none') {
            try {
                tree = scanCommit(commit || 'latest', base);
            } catch (e) {
                console.error("Error scanning diff:", e);
                tree = { name: 'error', value: 0, children: [] };
            }
        }
        // Single Commit Mode
        else if (commit && commit !== 'latest') {
            try {
                tree = scanCommit(commit);
            } catch (e) {
                console.error("Error scanning commit:", e);
                tree = { name: 'error', value: 0, children: [] };
            }
        }
        // Live Mode
        else {
            console.log("Scanning live codebase...");
            const gitMap = getGitStatus();
            tree = scan(process.cwd(), '', gitMap);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(tree));
    }
    else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`\nVisualize your codebase at: http://localhost:${PORT}`);
    console.log(`Watching: ${process.cwd()}`);
});