const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Config: Folders to ignore
const IGNORE = ['.git', 'node_modules', 'dist', '.next', '.idea', '.vscode', '__pycache__', 'android', 'ios'];

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
            map[file] = status;
        });
        return map;
    } catch (e) { return {}; }
}

const gitMap = getGitStatus();

function scan(dir, relPath = '') {
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
                const child = scan(fullPath, itemRel);
                if (child.value > 0) { // Only add non-empty folders
                    node.children.push(child);
                    node.value += child.value;
                }
            } else {
                // Lookup git status using forward slashes
                const lookup = itemRel.replace(/\\/g, '/');
                const status = gitMap[lookup] || 'clean';
                // Use file size as "value" (proxy for complexity)
                const val = stats.size || 1;

                node.children.push({ name: item, type: 'file', value: val, git_status: status });
                node.value += val;
            }
        } catch (e) { /* skip permission errors */ }
    });
    return node;
}

// Use the first argument from command line, or default to current folder
const targetPath = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const tree = scan(targetPath);
console.log(JSON.stringify(tree));