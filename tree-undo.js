// tree-undo.js
// Handles undo/redo functionality

export class UndoManager {
  constructor(svg, treeCore) {
    this.svg = svg;
    this.treeCore = treeCore;
    this.undoStack = [];
    this.redoStack = [];
    this.maxStackSize = 50;
  }

  pushState() {
    if (!this.svg) return;
    
    const mainGroup = document.getElementById('mainGroup');
    const state = {
      svgInner: mainGroup ? mainGroup.innerHTML : this.svg.innerHTML,
      coreState: this.treeCore.getState(),
      panZoom: this.treeCore.panZoom.getTransform(),
      selection: this.treeCore.selection.getSelectionData()
    };
    
    this.undoStack.push(state);
    
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    
    this.redoStack = [];
    console.log(`Undo state pushed. Stack size: ${this.undoStack.length}`);
  }

  undo() {
    if (this.undoStack.length < 2) {
      console.log('Nothing to undo');
      return;
    }
    
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    const previous = this.undoStack[this.undoStack.length - 1];
    this.restoreState(previous);
    console.log(`Undo performed. Stack size: ${this.undoStack.length}`);
  }

  redo() {
    if (this.redoStack.length === 0) {
      console.log('Nothing to redo');
      return;
    }
    
    const next = this.redoStack.pop();
    this.undoStack.push(next);
    this.restoreState(next);
    console.log(`Redo performed. Stack size: ${this.undoStack.length}`);
  }

  restoreState(state) {
    if (!this.svg) return;
    
    // Restore SVG content
    const mainGroup = document.getElementById('mainGroup');
    if (mainGroup) {
      mainGroup.innerHTML = state.svgInner;
    } else {
      this.svg.innerHTML = state.svgInner;
    }
    
    // Restore core state
    this.treeCore.setState(state.coreState);
    
    // Restore pan/zoom
    if (state.panZoom) {
      this.treeCore.panZoom.setTransform(
        state.panZoom.panX, 
        state.panZoom.panY, 
        state.panZoom.scale
      );
    }
    
    // Restore selection
    this.treeCore.selection.restoreSelection(state.selection || [], this.svg);
    
    // Re-wire interactions for all circles
    this.rewireInteractions();
    
    // Redraw grid and table
    this.treeCore.grid.draw();
    
    // Trigger table rebuild
    if (typeof rebuildTableView === 'function') {
      import('../table.js').then(mod => {
        if (mod.rebuildTableView) {
          mod.rebuildTableView();
        }
      });
    }
  }

  rewireInteractions() {
    // Clean up existing drag handlers
    this.treeCore.drag.cleanup();
    
    // Setup interactions for all circles
    this.svg.querySelectorAll('g[data-id]').forEach(group => {
      const circle = group.querySelector('circle.person');
      if (circle) {
        const personId = group.getAttribute('data-id');
        
        // Validate and fix coordinates if needed
        let cx = parseFloat(circle.getAttribute('cx'));
        let cy = parseFloat(circle.getAttribute('cy'));
        
        if (isNaN(cx) || isNaN(cy)) {
          console.warn('Invalid coordinates detected, fixing...', personId);
          cx = 600 + Math.random() * 200 - 100;
          cy = 400 + Math.random() * 200 - 100;
          circle.setAttribute('cx', cx);
          circle.setAttribute('cy', cy);
          
          // Fix text positions for new format (inside circle)
          this.fixTextPositions(group, cx, cy);
        }
        
        // Setup interactions
        this.treeCore.interactions.setupCircleInteractions(group, circle, personId);
      }
    });
  }

  fixTextPositions(group, cx, cy) {
    // Update all text elements to be positioned correctly inside the circle
    const nameTexts = group.querySelectorAll('text.name');
    const birthNameTexts = group.querySelectorAll('text.birth-name');
    const dobText = group.querySelector('text.dob');
    
    // Update name text elements (stacked above center)
    nameTexts.forEach((nameText, index) => {
      nameText.setAttribute('x', cx);
      nameText.setAttribute('y', cy - 20 + (index * 12));
      nameText.setAttribute('text-anchor', 'middle');
      nameText.setAttribute('dominant-baseline', 'middle');
      nameText.setAttribute('pointer-events', 'none');
    });
    
    // Update birth name texts (below center)
    birthNameTexts.forEach((birthNameText, index) => {
      birthNameText.setAttribute('x', cx);
      birthNameText.setAttribute('y', cy + 5 + (index * 10));
      birthNameText.setAttribute('text-anchor', 'middle');
      birthNameText.setAttribute('dominant-baseline', 'middle');
      birthNameText.setAttribute('pointer-events', 'none');
    });
    
    // Update DOB text (well below center)
    if (dobText) {
      dobText.setAttribute('x', cx);
      dobText.setAttribute('y', cy + 25);
      dobText.setAttribute('text-anchor', 'middle');
      dobText.setAttribute('dominant-baseline', 'middle');
      dobText.setAttribute('pointer-events', 'none');
    }
  }

  canUndo() {
    return this.undoStack.length > 1;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    console.log('Undo history cleared');
  }

  getStackSize() {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length
    };
  }
}