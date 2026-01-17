/**
 * D3 visualization rendering logic
 */

import { COLORS } from './config.js';
import { getRawData, getCollapsedFolders, getActivityData, setActivityData } from './state.js';
import { filterNode } from './filters.js';
import { toggleCollapse, focusFolder, updateFileCount } from './ui.js';
import { fetchActivityData } from './api.js';

/**
 * Main render function - creates the D3 treemap visualization
 */
export async function render() {
    const rawData = getRawData();
    if (!rawData) return;

    const container = document.getElementById("canvas");
    const tooltip = document.getElementById('tooltip');
    const controls = document.getElementById('timeline-controls');

    const width = container.clientWidth;
    const height = container.clientHeight;
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const sortMode = document.querySelector('input[name="sort"]:checked').value;
    const foldersFirst = document.getElementById('foldersFirst').checked;
    const hideClean = document.getElementById('filterClean').checked;
    const showUnstaged = document.getElementById('showUnstaged').checked;
    const collapseClean = document.getElementById('collapseClean').checked;
    const colorMode = document.querySelector('input[name="colorMode"]:checked').value;

    // Calculate Date Range for Age Mode
    let timeScale = null;
    if (colorMode === 'age') {
        const maxTime = Date.now();
        const thresholdDays = parseInt(document.getElementById('ageThreshold').value);
        const minTime = maxTime - (thresholdDays * 24 * 60 * 60 * 1000);

        timeScale = d3.scaleLinear()
            .domain([minTime, maxTime])
            .range(["#3b82f6", "#f97316"]) // Blue-500 to Orange-500
            .interpolate(d3.interpolateRgb)
            .clamp(true);
    }

    // Calculate Activity Scale for Activity Mode
    let activityScale = null;
    let activityMap = null;
    if (colorMode === 'activity') {
        const activityDays = parseInt(document.getElementById('activityThreshold').value);

        // Fetch activity data if not already loaded or if days changed
        activityMap = await fetchActivityData(activityDays);
        setActivityData(activityMap);

        // Find max activity count for scaling
        const activityCounts = Object.values(activityMap);
        const maxActivity = activityCounts.length > 0 ? Math.max(...activityCounts) : 1;

        activityScale = d3.scaleLinear()
            .domain([0, maxActivity])
            .range(["#3b82f6", "#f97316"]) // Blue-500 (low activity) to Orange-500 (high activity)
            .interpolate(d3.interpolateRgb)
            .clamp(true);
    }

    // FILTER AND TRANSFORM DATA
    // When in activity mode, override the sizing mode to use activity-based sizing
    const effectiveMode = colorMode === 'activity' ? 'activity' : mode;

    const filteredData = filterNode(rawData, '', {
        mode: effectiveMode,
        hideClean,
        showUnstaged,
        collapseClean,
        sortMode,
        foldersFirst,
        activityMap: activityMap // Pass activity data for sizing
    });

    // Count files by status
    function countFiles(node) {
        let counts = { total: 0, modified: 0, created: 0, deleted: 0 };

        if (node.type === 'file') {
            counts.total = 1;
            if (node.git_status === 'modified') counts.modified = 1;
            else if (node.git_status === 'created') counts.created = 1;
            else if (node.git_status === 'deleted') counts.deleted = 1;
        } else if (node.children) {
            node.children.forEach(child => {
                const childCounts = countFiles(child);
                counts.total += childCounts.total;
                counts.modified += childCounts.modified;
                counts.created += childCounts.created;
                counts.deleted += childCounts.deleted;
            });
        }

        return counts;
    }

    const fileCounts = countFiles(filteredData);
    updateFileCount(fileCounts.total, fileCounts.modified, fileCounts.created, fileCounts.deleted);

    // Check if empty
    if (filteredData.value === 0 && hideClean) {
        // Clear existing SVG
        d3.select("#canvas svg").remove();
        const msg = document.createElement('div');
        msg.className = 'loading';
        msg.innerText = 'All files are clean! (Great job)';
        container.appendChild(msg);
        return;
    }

    // Remove any loading messages
    const loadingMsg = container.querySelector('.loading');
    if (loadingMsg) loadingMsg.remove();

    // D3 LAYOUT
    const root = d3.hierarchy(filteredData).sum(d => {
        // Only count values for leaves (files) or collapsed folders
        // Expanded folders should contribute 0 intrinsic value, 
        // their total comes purely from children.
        return (d.children && d.children.length > 0) ? 0 : d.value;
    });

    // Note: We do NOT use root.sort() here anymore because we handle 
    // all sorting (Size, Alpha, Folders First) inside filterNode() 
    // to insure the order is exactly as requested.

    d3.partition().size([width, height])(root);

    const collapsedFolders = getCollapsedFolders();

    // Helper function to calculate fill color
    const getFillColor = (d) => {
        const isCollapsed = collapsedFolders.has(d.data.path) || (collapseClean && d.data.aggregateStatus === 'clean' && d.data.type === 'folder');

        if (isCollapsed) {
            if (d.data.collapsedStatus === 'created') return '#047857'; // Darker Emerald
            if (d.data.collapsedStatus === 'modified') return '#b45309'; // Darker Amber
            return '#94a3b8'; // Slate 400 for clean collapsed
        }

        if (d.data.type === 'folder') {
            // Darker color for folders containing changes
            if (colorMode === 'git' && d.data.aggregateStatus !== 'clean') {
                return '#cbd5e1';
            }
        }

        if (colorMode === 'age') {
            if (d.data.last_modified) {
                return timeScale(new Date(d.data.last_modified).getTime());
            }
            return '#e2e8f0';
        }

        if (colorMode === 'activity') {
            if (d.data.type === 'file' && activityMap) {
                // Build the full path for this file
                const pathParts = [];
                let current = d;
                while (current.parent) {
                    pathParts.unshift(current.data.name);
                    current = current.parent;
                }
                const fullPath = pathParts.join('/');

                const activityCount = activityMap[fullPath] || 0;
                if (activityCount > 0) {
                    return activityScale(activityCount);
                }
            }
            return '#e2e8f0'; // Default light gray for no activity
        }

        return COLORS[d.data.git_status] || '#cbd5e1';
    };

    // Select or create SVG
    let svg = d3.select("#canvas svg");
    if (svg.empty()) {
        svg = d3.select("#canvas").append("svg");
        // Ensure tooltip and controls are on top
        if (tooltip) container.appendChild(tooltip);
        if (controls) container.appendChild(controls);
    }

    svg.attr("width", width).attr("height", height);

    // Helper function to create a stable key for each node
    const getNodeKey = (d) => {
        // Build full path by traversing up the tree
        const pathParts = [];
        let current = d;
        while (current) {
            if (current.data.name) {
                pathParts.unshift(current.data.name);
            }
            current = current.parent;
        }
        return pathParts.join('/') || 'root';
    };

    // DATA JOIN with key function (use full path as unique identifier)
    const nodes = svg.selectAll("g.node")
        .data(root.descendants(), getNodeKey);

    // ENTER: New nodes (fade in)
    const nodesEnter = nodes.enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .style("opacity", 0);

    // Add rectangles to entering nodes
    nodesEnter.append("rect")
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0))
        .attr("rx", 0)
        .attr("ry", 6)
        .attr("fill", getFillColor)
        .attr("stroke", "#fafafa")
        .attr("stroke-width", 2)
        .style("cursor", d => d.data.type === 'folder' ? 'pointer' : 'default');

    // Add text labels to entering nodes
    nodesEnter.append("text")
        .attr("class", "node-label")
        .text(d => d.data.name);

    // Add event handlers to entering nodes
    nodesEnter.select("rect")
        .on("click", (e, d) => {
            if (d.data.type === 'folder' && d.data.path) {
                if (e.shiftKey) {
                    focusFolder(d);
                } else {
                    toggleCollapse(d.data.path);
                }
            }
        })
        .on("mousemove", (e, d) => showTooltip(e, d))
        .on("mouseout", () => tooltip.style.opacity = 0);

    // UPDATE: Existing nodes (transition)
    const nodesMerge = nodesEnter.merge(nodes);

    // Ensure event handlers are attached to all nodes (new and updated)
    nodesMerge.select("rect")
        .on("click", (e, d) => {
            if (d.data.type === 'folder' && d.data.path) {
                if (e.shiftKey) {
                    focusFolder(d);
                } else {
                    toggleCollapse(d.data.path);
                }
            }
        })
        .on("mousemove", (e, d) => showTooltip(e, d))
        .on("mouseout", () => tooltip.style.opacity = 0);

    // Transition groups (position)
    nodesMerge
        .interrupt() // Cancel any ongoing transitions
        .transition()
        .duration(400)
        .ease(d3.easeCubicInOut)
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .style("opacity", 1);

    // Transition rectangles (size and color)
    nodesMerge.select("rect")
        .interrupt() // Cancel any ongoing transitions
        .transition()
        .duration(400)
        .ease(d3.easeCubicInOut)
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0))
        .attr("fill", getFillColor)
        .style("cursor", d => d.data.type === 'folder' ? 'pointer' : 'default');

    // Update text labels (position and visibility)
    nodesMerge.select("text")
        .text(d => d.data.name)
        .interrupt() // Cancel any ongoing transitions
        .transition()
        .duration(400)
        .ease(d3.easeCubicInOut)
        .attr("x", d => collapsedFolders.has(d.data.path) ? (d.x1 - d.x0) / 2 : 4)
        .attr("y", d => collapsedFolders.has(d.data.path) ? (d.y1 - d.y0) / 2 : 14)
        .attr("transform", d => {
            if (collapsedFolders.has(d.data.path)) {
                return `rotate(90, ${(d.x1 - d.x0) / 2}, ${(d.y1 - d.y0) / 2})`;
            }
            return "";
        })
        .style("text-anchor", d => collapsedFolders.has(d.data.path) ? "middle" : "start")
        .style("dominant-baseline", d => collapsedFolders.has(d.data.path) ? "middle" : "auto")
        .style("display", d => {
            const w = d.x1 - d.x0;
            const h = d.y1 - d.y0;

            if (collapsedFolders.has(d.data.path)) {
                return h > 20 ? "block" : "none"; // Show vertical text if enough height
            }

            return (w > 35 && h > 15) ? "block" : "none";
        });

    // EXIT: Removed nodes (fade out)
    nodes.exit()
        .interrupt() // Cancel any ongoing transitions
        .transition()
        .duration(300)
        .ease(d3.easeCubicOut)
        .style("opacity", 0)
        .remove();
}

/**
 * Show tooltip on hover
 */
export function showTooltip(event, d) {
    const tooltip = document.getElementById("tooltip");
    const canvas = document.getElementById("canvas");
    const canvasRect = canvas.getBoundingClientRect();
    const collapsedFolders = getCollapsedFolders();

    // Build tooltip content FIRST (before positioning)
    const isCollapsed = collapsedFolders.has(d.data.path);
    let collapsedLabel = '';
    if (isCollapsed) collapsedLabel = '<br/><em>(Click to expand)</em><br/><em>(Shift+Click to focus)</em>';
    else if (d.data.type === 'folder') collapsedLabel = '<br/><em>(Click to collapse)</em><br/><em>(Shift+Click to focus)</em>';

    const statusText = (d.data.git_status || 'clean').toUpperCase();

    let details = '';
    if (d.data.type === 'file') {
        const fullPath = d.data.path;
        let timeString = 'History Mode';

        if (d.data.last_modified) {
            const diffTime = new Date() - new Date(d.data.last_modified);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            timeString = diffDays <= 0 ? 'Today' : (diffDays === 1 ? '1 day ago' : `${diffDays} days ago`);
        }

        // Check if we're in activity mode and get activity count
        const colorMode = document.querySelector('input[name="colorMode"]:checked')?.value;
        const activityData = getActivityData();
        let activityInfo = '';

        if (colorMode === 'activity' && activityData) {
            const activityCount = activityData[fullPath] || 0;
            const activityDays = parseInt(document.getElementById('activityThreshold').value);
            activityInfo = `<span style="display:inline-block; margin-top:2px;">Activity: ${activityCount} change${activityCount !== 1 ? 's' : ''} in last ${activityDays} days</span><br/>`;
        }

        details = `<div style="margin-top:6px; font-size:12px; opacity:0.85; line-height:1.4em; border-top:1px solid rgba(0,0,0,0.1); padding-top:6px;">
            <span style="font-family:monospace; font-size:11px; word-break:break-all; overflow-wrap:break-word;">${fullPath}</span><br/>
            ${activityInfo}
            <span style="display:inline-block; margin-top:2px;">Last edited: ${timeString}</span>
        </div>`;
    } else {
        const valLabel = document.querySelector('input[name="mode"]:checked').value === 'size' ? 'Size' : 'Weight';
        details = `${valLabel}: ${d.value}`;
    }

    // Set content first so we can measure accurate dimensions
    tooltip.innerHTML = `<strong>${d.data.name}</strong><br/><span style="font-size:11px; font-weight:500">${statusText}</span><br/>${details}${collapsedLabel}`;

    // Make visible but off-screen to measure
    tooltip.style.opacity = 1;
    tooltip.style.left = '-9999px';
    tooltip.style.top = '-9999px';

    // Force a reflow to get accurate measurements
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    // Mouse position relative to canvas
    const mouseX = event.clientX - canvasRect.left;
    const mouseY = event.clientY - canvasRect.top;

    // Offset from cursor
    const offset = 15;
    const padding = 10; // Padding from edges

    // Try different positions in order of preference:
    // 1. Right-bottom (default)
    // 2. Left-bottom
    // 3. Right-top
    // 4. Left-top

    let left, top;
    let positioned = false;

    // Try right-bottom
    left = mouseX + offset;
    top = mouseY + offset;
    if (left + tooltipWidth + padding <= canvasRect.width &&
        top + tooltipHeight + padding <= canvasRect.height) {
        positioned = true;
    }

    // Try left-bottom
    if (!positioned) {
        left = mouseX - tooltipWidth - offset;
        top = mouseY + offset;
        if (left >= padding &&
            top + tooltipHeight + padding <= canvasRect.height) {
            positioned = true;
        }
    }

    // Try right-top
    if (!positioned) {
        left = mouseX + offset;
        top = mouseY - tooltipHeight - offset;
        if (left + tooltipWidth + padding <= canvasRect.width &&
            top >= padding) {
            positioned = true;
        }
    }

    // Try left-top
    if (!positioned) {
        left = mouseX - tooltipWidth - offset;
        top = mouseY - tooltipHeight - offset;
        if (left >= padding && top >= padding) {
            positioned = true;
        }
    }

    // If none of the quadrants work, clamp to viewport (fallback)
    if (!positioned) {
        left = mouseX + offset;
        top = mouseY + offset;
    }

    // Final clamping to ensure tooltip stays within bounds
    left = Math.max(padding, Math.min(left, canvasRect.width - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, canvasRect.height - tooltipHeight - padding));

    // Apply final position
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
}
