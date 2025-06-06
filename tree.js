// tree.js
// New modular entry point - imports and coordinates all tree functionality

import { treeCore } from './tree-core.js';

// Re-export functions that other modules expect
export function pushUndoState() {
  treeCore.undo?.pushState();
}

export function generateAllConnections() {
  treeCore.connections?.generateAll();
}

// The tree-core.js module handles all initialization via DOMContentLoaded
// No additional initialization needed here