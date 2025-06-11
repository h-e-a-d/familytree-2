// tree.js
// Entry point - now using Canvas-based implementation

// Import the canvas-based tree core instead of the SVG-based one
import { treeCore, pushUndoState, generateAllConnections } from './tree-core-canvas.js';

// Re-export functions that other modules expect
export { pushUndoState, generateAllConnections };

// The tree-core-canvas.js module handles all initialization via DOMContentLoaded
// No additional initialization needed here